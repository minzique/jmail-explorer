import sqlite3
import os
from contextlib import contextmanager
from fastapi import FastAPI, HTTPException, Query
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, JSONResponse
from fastapi.middleware.cors import CORSMiddleware

DB_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "jmail.db")
STATIC_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "static")

app = FastAPI(title="JMail Explorer")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@contextmanager
def get_db():
    conn = sqlite3.connect(DB_PATH, check_same_thread=False)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA cache_size=-64000")
    try:
        yield conn
    finally:
        conn.close()


def rows_to_dicts(rows):
    return [dict(r) for r in rows]


@app.get("/")
async def root():
    return FileResponse(os.path.join(STATIC_DIR, "index.html"))


@app.get("/api/search")
async def search(q: str = "", page: int = Query(1, ge=1), limit: int = Query(20, ge=1, le=100)):
    if not q.strip():
        return {"results": [], "total": 0, "page": page, "limit": limit}
    offset = (page - 1) * limit
    with get_db() as conn:
        safe_q = q.replace('"', '""')
        fts_query = f'"{safe_q}"'
        try:
            count_row = conn.execute(
                "SELECT COUNT(*) as cnt FROM messages_fts WHERE messages_fts MATCH ?",
                (fts_query,)
            ).fetchone()
            total = count_row["cnt"] if count_row else 0
            rows = conn.execute(
                """SELECT message_id, doc_id, sender_name, sender_email, subject,
                          snippet(messages_fts, 5, '<mark>', '</mark>', '...', 40) as snippet,
                          sent_at
                   FROM messages_fts WHERE messages_fts MATCH ?
                   ORDER BY rank
                   LIMIT ? OFFSET ?""",
                (fts_query, limit, offset)
            ).fetchall()
        except Exception:
            return {"results": [], "total": 0, "page": page, "limit": limit, "error": "Invalid search query"}
    return {"results": rows_to_dicts(rows), "total": total, "page": page, "limit": limit}


@app.get("/api/threads/{doc_id}")
async def get_thread(doc_id: str):
    with get_db() as conn:
        thread = conn.execute("SELECT * FROM threads WHERE doc_id = ?", (doc_id,)).fetchone()
        if not thread:
            raise HTTPException(status_code=404, detail="Thread not found")
        messages = conn.execute(
            "SELECT * FROM messages WHERE doc_id = ? ORDER BY message_index ASC, sent_at ASC",
            (doc_id,)
        ).fetchall()
        msgs = []
        for m in messages:
            md = dict(m)
            recipients = conn.execute(
                "SELECT address, name, type FROM recipients WHERE message_id = ?",
                (md["id"],)
            ).fetchall()
            md["recipients"] = rows_to_dicts(recipients)
            msgs.append(md)
    return {"thread": dict(thread), "messages": msgs}


@app.get("/api/entities")
async def list_entities(
    page: int = Query(1, ge=1),
    limit: int = Query(50, ge=1, le=200),
    sort: str = Query("message_count"),
    order: str = Query("desc"),
    search: str = Query("")
):
    allowed_sorts = {"name", "email", "message_count", "is_epstein"}
    if sort not in allowed_sorts:
        sort = "message_count"
    if order not in ("asc", "desc"):
        order = "desc"
    offset = (page - 1) * limit
    with get_db() as conn:
        where = ""
        params: list = []
        if search.strip():
            where = "WHERE name LIKE ? OR email LIKE ?"
            params = [f"%{search}%", f"%{search}%"]
        count_row = conn.execute(f"SELECT COUNT(*) as cnt FROM entities {where}", params).fetchone()
        total = count_row["cnt"] if count_row else 0
        rows = conn.execute(
            f"SELECT * FROM entities {where} ORDER BY {sort} {order} LIMIT ? OFFSET ?",
            params + [limit, offset]
        ).fetchall()
    return {"entities": rows_to_dicts(rows), "total": total, "page": page, "limit": limit}


@app.get("/api/entities/{email:path}")
async def get_entity(email: str):
    with get_db() as conn:
        entity = conn.execute("SELECT * FROM entities WHERE email = ?", (email,)).fetchone()
        if not entity:
            raise HTTPException(status_code=404, detail="Entity not found")
        connections = conn.execute(
            """SELECT e.email, e.name, e.message_count, e.is_epstein,
                      COALESCE(ed1.weight, 0) + COALESCE(ed2.weight, 0) as connection_weight
               FROM entities e
               LEFT JOIN edges ed1 ON ed1.source_email = ? AND ed1.target_email = e.email
               LEFT JOIN edges ed2 ON ed2.target_email = ? AND ed2.source_email = e.email
               WHERE ed1.weight IS NOT NULL OR ed2.weight IS NOT NULL
               ORDER BY connection_weight DESC
               LIMIT 20""",
            (email, email)
        ).fetchall()
        recent = conn.execute(
            """SELECT id, doc_id, subject, sent_at, preview, is_from_epstein
               FROM messages WHERE sender_email = ?
               ORDER BY sent_at DESC LIMIT 20""",
            (email,)
        ).fetchall()
    return {
        "entity": dict(entity),
        "connections": rows_to_dicts(connections),
        "recent_messages": rows_to_dicts(recent)
    }


@app.get("/api/graph")
async def get_graph(min_weight: int = Query(10, ge=1), limit: int = Query(100, ge=10, le=500)):
    with get_db() as conn:
        edges = conn.execute(
            "SELECT source_email, target_email, weight FROM edges WHERE weight >= ? ORDER BY weight DESC",
            (min_weight,)
        ).fetchall()
        edge_list = rows_to_dicts(edges)
        node_emails = set()
        for e in edge_list:
            node_emails.add(e["source_email"])
            node_emails.add(e["target_email"])
        if len(node_emails) > limit:
            email_weights: dict = {}
            for e in edge_list:
                email_weights[e["source_email"]] = email_weights.get(e["source_email"], 0) + e["weight"]
                email_weights[e["target_email"]] = email_weights.get(e["target_email"], 0) + e["weight"]
            top_emails = sorted(email_weights, key=email_weights.get, reverse=True)[:limit]
            node_emails = set(top_emails)
            edge_list = [e for e in edge_list if e["source_email"] in node_emails and e["target_email"] in node_emails]
        if node_emails:
            placeholders = ",".join("?" * len(node_emails))
            entities = conn.execute(
                f"SELECT email, name, message_count, is_epstein FROM entities WHERE email IN ({placeholders})",
                list(node_emails)
            ).fetchall()
        else:
            entities = []
        nodes = [{"id": dict(e)["email"], "name": dict(e)["name"], "email": dict(e)["email"],
                  "count": dict(e)["message_count"], "is_epstein": dict(e)["is_epstein"]} for e in entities]
        links = [{"source": e["source_email"], "target": e["target_email"], "weight": e["weight"]} for e in edge_list]
    return {"nodes": nodes, "links": links}


@app.get("/api/graph/ego/{email:path}")
async def get_ego_graph(email: str, depth: int = Query(1, ge=1, le=2)):
    with get_db() as conn:
        entity = conn.execute("SELECT * FROM entities WHERE email = ?", (email,)).fetchone()
        if not entity:
            raise HTTPException(status_code=404, detail="Entity not found")
        visited = {email}
        frontier = {email}
        all_edges = []
        for _ in range(depth):
            if not frontier:
                break
            placeholders = ",".join("?" * len(frontier))
            edges = conn.execute(
                f"""SELECT source_email, target_email, weight FROM edges
                    WHERE source_email IN ({placeholders}) OR target_email IN ({placeholders})""",
                list(frontier) + list(frontier)
            ).fetchall()
            new_frontier = set()
            for e in edges:
                ed = dict(e)
                all_edges.append(ed)
                for addr in (ed["source_email"], ed["target_email"]):
                    if addr not in visited:
                        new_frontier.add(addr)
                        visited.add(addr)
            frontier = new_frontier
        seen_edges = set()
        unique_edges = []
        for e in all_edges:
            key = (e["source_email"], e["target_email"])
            if key not in seen_edges:
                seen_edges.add(key)
                unique_edges.append(e)
        if visited:
            placeholders = ",".join("?" * len(visited))
            entities = conn.execute(
                f"SELECT email, name, message_count, is_epstein FROM entities WHERE email IN ({placeholders})",
                list(visited)
            ).fetchall()
        else:
            entities = []
        nodes = [{"id": dict(e)["email"], "name": dict(e)["name"], "email": dict(e)["email"],
                  "count": dict(e)["message_count"], "is_epstein": dict(e)["is_epstein"]} for e in entities]
        links = [{"source": e["source_email"], "target": e["target_email"], "weight": e["weight"]} for e in unique_edges]
    return {"nodes": nodes, "links": links}


@app.get("/api/timeline")
async def get_timeline():
    with get_db() as conn:
        rows = conn.execute("SELECT month, message_count FROM timeline ORDER BY month ASC").fetchall()
    return {"timeline": rows_to_dicts(rows)}


@app.get("/api/stats")
async def get_stats():
    with get_db() as conn:
        threads = conn.execute("SELECT COUNT(*) as cnt FROM threads").fetchone()["cnt"]
        messages = conn.execute("SELECT COUNT(*) as cnt FROM messages").fetchone()["cnt"]
        entities = conn.execute("SELECT COUNT(*) as cnt FROM entities").fetchone()["cnt"]
        edges = conn.execute("SELECT COUNT(*) as cnt FROM edges").fetchone()["cnt"]
        date_range = conn.execute(
            "SELECT MIN(sent_at) as min_date, MAX(sent_at) as max_date FROM messages WHERE sent_at IS NOT NULL"
        ).fetchone()
        top_senders = conn.execute(
            """SELECT sender_email, sender_name, COUNT(*) as cnt
               FROM messages WHERE sender_email IS NOT NULL AND sender_email != ''
               GROUP BY sender_email ORDER BY cnt DESC LIMIT 10"""
        ).fetchall()
        top_domains = conn.execute(
            """SELECT SUBSTR(sender_email, INSTR(sender_email, '@') + 1) as domain, COUNT(*) as cnt
               FROM messages WHERE sender_email LIKE '%@%'
               GROUP BY domain ORDER BY cnt DESC LIMIT 10"""
        ).fetchall()
    return {
        "threads": threads,
        "messages": messages,
        "entities": entities,
        "edges": edges,
        "min_date": dict(date_range)["min_date"] if date_range else None,
        "max_date": dict(date_range)["max_date"] if date_range else None,
        "top_senders": rows_to_dicts(top_senders),
        "top_domains": rows_to_dicts(top_domains),
    }


app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")
