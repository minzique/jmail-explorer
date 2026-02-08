import json
import sqlite3
import os
from contextlib import contextmanager
from fastapi import FastAPI, HTTPException, Query
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, JSONResponse
from fastapi.middleware.cors import CORSMiddleware

DB_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "jmail.db")
FRONTEND_DIST = os.path.join(os.path.dirname(os.path.abspath(__file__)), "frontend", "dist")
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


def resolve_canonical(conn, email: str) -> str:
    row = conn.execute(
        "SELECT canonical_email FROM entity_aliases WHERE alias_email = ?", (email,)
    ).fetchone()
    return row["canonical_email"] if row else email


@app.get("/")
async def root():
    dist_index = os.path.join(FRONTEND_DIST, "index.html")
    if os.path.exists(dist_index):
        return FileResponse(dist_index)
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


@app.get("/api/person/{email:path}")
async def get_person(email: str):
    with get_db() as conn:
        canonical = resolve_canonical(conn, email)
        profile = conn.execute("SELECT * FROM entity_profiles WHERE email = ?", (canonical,)).fetchone()
        if not profile:
            raise HTTPException(status_code=404, detail="Person not found")

        profile_dict = dict(profile)
        profile_dict["all_names"] = json.loads(profile_dict.get("all_names") or "[]")
        profile_dict["all_emails"] = json.loads(profile_dict.get("all_emails") or "[]")

        relationships = conn.execute("""
            SELECT r.entity_a, r.entity_b, r.relationship_type, r.weight, r.first_seen, r.last_seen, r.sample_doc_id,
                   COALESCE(pa.canonical_name, r.entity_a) as name_a,
                   COALESCE(pb.canonical_name, r.entity_b) as name_b
            FROM relationships r
            LEFT JOIN entity_profiles pa ON pa.email = r.entity_a
            LEFT JOIN entity_profiles pb ON pb.email = r.entity_b
            WHERE r.entity_a = ? OR r.entity_b = ?
            ORDER BY r.weight DESC
            LIMIT 100
        """, (canonical, canonical)).fetchall()

        connections: dict = {}
        for row in relationships:
            rd = dict(row)
            other = rd["entity_b"] if rd["entity_a"] == canonical else rd["entity_a"]
            other_name = rd["name_b"] if rd["entity_a"] == canonical else rd["name_a"]
            if other not in connections:
                connections[other] = {
                    "email": other,
                    "name": other_name,
                    "types": {},
                    "total_weight": 0,
                    "first_seen": rd["first_seen"] or "",
                    "last_seen": rd["last_seen"] or "",
                }
            rtype = rd["relationship_type"]
            connections[other]["types"][rtype] = connections[other]["types"].get(rtype, 0) + rd["weight"]
            connections[other]["total_weight"] += rd["weight"]
            if rd["first_seen"] and (not connections[other]["first_seen"] or rd["first_seen"] < connections[other]["first_seen"]):
                connections[other]["first_seen"] = rd["first_seen"]
            if rd["last_seen"] and (not connections[other]["last_seen"] or rd["last_seen"] > connections[other]["last_seen"]):
                connections[other]["last_seen"] = rd["last_seen"]

        sorted_connections = sorted(connections.values(), key=lambda c: c["total_weight"], reverse=True)

        all_emails = profile_dict["all_emails"]
        placeholders = ",".join("?" * len(all_emails)) if all_emails else "?"
        email_params = all_emails if all_emails else [canonical]

        recent_sent = conn.execute(f"""
            SELECT id, doc_id, subject, sent_at, preview, is_from_epstein
            FROM messages WHERE sender_email IN ({placeholders})
            ORDER BY sent_at DESC LIMIT 20
        """, email_params).fetchall()

        recent_received = conn.execute(f"""
            SELECT DISTINCT m.id, m.doc_id, m.subject, m.sent_at, m.preview, m.is_from_epstein, m.sender_name
            FROM messages m JOIN recipients r ON m.id = r.message_id
            WHERE r.address IN ({placeholders})
            ORDER BY m.sent_at DESC LIMIT 20
        """, email_params).fetchall()

        activity_timeline = conn.execute(f"""
            SELECT SUBSTR(sent_at, 1, 7) as month, COUNT(*) as cnt
            FROM messages WHERE sender_email IN ({placeholders})
            AND sent_at IS NOT NULL AND sent_at != ''
            GROUP BY month ORDER BY month ASC
        """, email_params).fetchall()

        mentions = conn.execute("""
            SELECT em.mention_type, COUNT(*) as cnt
            FROM entity_mentions em
            WHERE em.entity_email = ?
            GROUP BY em.mention_type
        """, (canonical,)).fetchall()

    return {
        "profile": profile_dict,
        "connections": sorted_connections,
        "recent_sent": rows_to_dicts(recent_sent),
        "recent_received": rows_to_dicts(recent_received),
        "activity_timeline": rows_to_dicts(activity_timeline),
        "mention_summary": rows_to_dicts(mentions),
    }


@app.get("/api/relationship/{email_a:path}/{email_b:path}")
async def get_relationship(email_a: str, email_b: str):
    with get_db() as conn:
        canonical_a = resolve_canonical(conn, email_a)
        canonical_b = resolve_canonical(conn, email_b)
        a, b = sorted([canonical_a, canonical_b])

        rels = conn.execute("""
            SELECT relationship_type, weight, first_seen, last_seen, sample_doc_id, context
            FROM relationships
            WHERE (entity_a = ? AND entity_b = ?) OR (entity_a = ? AND entity_b = ?)
        """, (a, b, b, a)).fetchall()

        if not rels:
            raise HTTPException(status_code=404, detail="No relationship found")

        profile_a = conn.execute("SELECT * FROM entity_profiles WHERE email = ?", (canonical_a,)).fetchone()
        profile_b = conn.execute("SELECT * FROM entity_profiles WHERE email = ?", (canonical_b,)).fetchone()

        shared_threads = conn.execute("""
            SELECT DISTINCT t.doc_id, t.subject, t.latest_date, t.message_count
            FROM threads t
            WHERE t.doc_id IN (
                SELECT DISTINCT m.doc_id FROM messages m
                WHERE m.doc_id IN (
                    SELECT doc_id FROM messages WHERE sender_email IN (
                        SELECT alias_email FROM entity_aliases WHERE canonical_email = ?
                        UNION SELECT ?
                    )
                    UNION
                    SELECT m2.doc_id FROM messages m2 JOIN recipients r ON m2.id = r.message_id
                    WHERE r.address IN (
                        SELECT alias_email FROM entity_aliases WHERE canonical_email = ?
                        UNION SELECT ?
                    )
                )
                AND m.doc_id IN (
                    SELECT doc_id FROM messages WHERE sender_email IN (
                        SELECT alias_email FROM entity_aliases WHERE canonical_email = ?
                        UNION SELECT ?
                    )
                    UNION
                    SELECT m3.doc_id FROM messages m3 JOIN recipients r2 ON m3.id = r2.message_id
                    WHERE r2.address IN (
                        SELECT alias_email FROM entity_aliases WHERE canonical_email = ?
                        UNION SELECT ?
                    )
                )
            )
            ORDER BY t.latest_date DESC
            LIMIT 20
        """, (canonical_a, canonical_a, canonical_a, canonical_a,
              canonical_b, canonical_b, canonical_b, canonical_b)).fetchall()

        mutual = conn.execute("""
            SELECT DISTINCT
                CASE WHEN r1.entity_a = ? THEN r1.entity_b ELSE r1.entity_a END as mutual_email
            FROM relationships r1
            WHERE (r1.entity_a = ? OR r1.entity_b = ?)
            AND CASE WHEN r1.entity_a = ? THEN r1.entity_b ELSE r1.entity_a END IN (
                SELECT CASE WHEN r2.entity_a = ? THEN r2.entity_b ELSE r2.entity_a END
                FROM relationships r2
                WHERE r2.entity_a = ? OR r2.entity_b = ?
            )
            AND CASE WHEN r1.entity_a = ? THEN r1.entity_b ELSE r1.entity_a END NOT IN (?, ?)
            LIMIT 20
        """, (canonical_a, canonical_a, canonical_a, canonical_a,
              canonical_b, canonical_b, canonical_b,
              canonical_a, canonical_a, canonical_b)).fetchall()

        mutual_profiles = []
        for m in mutual:
            mp = conn.execute(
                "SELECT email, canonical_name, total_connections FROM entity_profiles WHERE email = ?",
                (m["mutual_email"],)
            ).fetchone()
            if mp:
                mutual_profiles.append(dict(mp))

    return {
        "entity_a": dict(profile_a) if profile_a else {"email": canonical_a},
        "entity_b": dict(profile_b) if profile_b else {"email": canonical_b},
        "relationships": rows_to_dicts(rels),
        "shared_threads": rows_to_dicts(shared_threads),
        "mutual_connections": mutual_profiles,
    }


@app.get("/api/graph/relationships")
async def get_relationship_graph(
    min_weight: int = Query(3, ge=1),
    limit: int = Query(150, ge=10, le=500),
    rel_type: str = Query(""),
):
    with get_db() as conn:
        type_filter = ""
        params: list = [min_weight]
        if rel_type and rel_type in ("co-participant", "forwarded", "direct_email"):
            type_filter = "AND r.relationship_type = ?"
            params.append(rel_type)

        edges = conn.execute(f"""
            SELECT r.entity_a, r.entity_b, r.relationship_type,
                   SUM(r.weight) as weight
            FROM relationships r
            WHERE r.weight >= ? {type_filter}
            GROUP BY r.entity_a, r.entity_b
            ORDER BY weight DESC
        """, params).fetchall()

        edge_list = rows_to_dicts(edges)

        node_emails = set()
        for e in edge_list:
            node_emails.add(e["entity_a"])
            node_emails.add(e["entity_b"])

        if len(node_emails) > limit:
            email_weights: dict = {}
            for e in edge_list:
                email_weights[e["entity_a"]] = email_weights.get(e["entity_a"], 0) + e["weight"]
                email_weights[e["entity_b"]] = email_weights.get(e["entity_b"], 0) + e["weight"]
            top_emails = sorted(email_weights, key=email_weights.get, reverse=True)[:limit]
            node_emails = set(top_emails)
            edge_list = [e for e in edge_list if e["entity_a"] in node_emails and e["entity_b"] in node_emails]

        if node_emails:
            placeholders = ",".join("?" * len(node_emails))
            profiles = conn.execute(
                f"SELECT email, canonical_name, total_messages, total_connections, is_epstein, role FROM entity_profiles WHERE email IN ({placeholders})",
                list(node_emails)
            ).fetchall()
        else:
            profiles = []

        profile_emails = set()
        nodes = []
        for p in profiles:
            pd = dict(p)
            profile_emails.add(pd["email"])
            nodes.append({
                "id": pd["email"],
                "name": pd["canonical_name"],
                "email": pd["email"],
                "count": pd["total_messages"],
                "connections": pd["total_connections"],
                "is_epstein": pd["is_epstein"],
                "role": pd["role"],
            })

        links = [{
            "source": e["entity_a"],
            "target": e["entity_b"],
            "weight": e["weight"],
            "type": e["relationship_type"],
        } for e in edge_list if e["entity_a"] in profile_emails and e["entity_b"] in profile_emails]

    return {"nodes": nodes, "links": links}


@app.get("/api/relationships/top")
async def get_top_relationships(
    limit: int = Query(50, ge=1, le=200),
    rel_type: str = Query(""),
    exclude_epstein: bool = Query(False),
):
    with get_db() as conn:
        where_parts = []
        params: list = []

        if rel_type and rel_type in ("co-participant", "forwarded", "direct_email"):
            where_parts.append("r.relationship_type = ?")
            params.append(rel_type)

        if exclude_epstein:
            where_parts.append("pa.is_epstein = 0 AND pb.is_epstein = 0")

        where_clause = ("WHERE " + " AND ".join(where_parts)) if where_parts else ""

        rows = conn.execute(f"""
            SELECT r.entity_a, r.entity_b, r.relationship_type, r.weight,
                   r.first_seen, r.last_seen, r.sample_doc_id,
                   COALESCE(pa.canonical_name, r.entity_a) as name_a,
                   COALESCE(pb.canonical_name, r.entity_b) as name_b,
                   COALESCE(pa.role, 'unknown') as role_a,
                   COALESCE(pb.role, 'unknown') as role_b
            FROM relationships r
            LEFT JOIN entity_profiles pa ON pa.email = r.entity_a
            LEFT JOIN entity_profiles pb ON pb.email = r.entity_b
            {where_clause}
            ORDER BY r.weight DESC
            LIMIT ?
        """, params + [limit]).fetchall()

    return {"relationships": rows_to_dicts(rows)}


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
        entity_emails = set()
        nodes = []
        for ent in entities:
            ed = dict(ent)
            entity_emails.add(ed["email"])
            nodes.append({"id": ed["email"], "name": ed["name"], "email": ed["email"],
                          "count": ed["message_count"], "is_epstein": ed["is_epstein"]})
        links = [{"source": e["source_email"], "target": e["target_email"], "weight": e["weight"]}
                 for e in edge_list if e["source_email"] in entity_emails and e["target_email"] in entity_emails]
    return {"nodes": nodes, "links": links}


@app.get("/api/graph/ego/{email:path}")
async def get_ego_graph(email: str, depth: int = Query(1, ge=1, le=2)):
    with get_db() as conn:
        canonical = resolve_canonical(conn, email)
        visited = {canonical}
        frontier = {canonical}
        all_edges = []
        for _ in range(depth):
            if not frontier:
                break
            placeholders = ",".join("?" * len(frontier))
            edges = conn.execute(
                f"""SELECT entity_a, entity_b, relationship_type, weight
                    FROM relationships
                    WHERE entity_a IN ({placeholders}) OR entity_b IN ({placeholders})""",
                list(frontier) + list(frontier)
            ).fetchall()
            new_frontier = set()
            for e in edges:
                ed = dict(e)
                all_edges.append(ed)
                for addr in (ed["entity_a"], ed["entity_b"]):
                    if addr not in visited:
                        new_frontier.add(addr)
                        visited.add(addr)
            frontier = new_frontier
        seen_edges = set()
        unique_edges = []
        for e in all_edges:
            key = (e["entity_a"], e["entity_b"])
            if key not in seen_edges:
                seen_edges.add(key)
                unique_edges.append(e)
        if visited:
            placeholders = ",".join("?" * len(visited))
            profiles = conn.execute(
                f"SELECT email, canonical_name, total_messages, total_connections, is_epstein, role FROM entity_profiles WHERE email IN ({placeholders})",
                list(visited)
            ).fetchall()
        else:
            profiles = []
        profile_emails = set()
        nodes = []
        for p in profiles:
            pd = dict(p)
            profile_emails.add(pd["email"])
            nodes.append({
                "id": pd["email"],
                "name": pd["canonical_name"],
                "email": pd["email"],
                "count": pd["total_messages"],
                "connections": pd["total_connections"],
                "is_epstein": pd["is_epstein"],
                "role": pd["role"],
            })
        links = [{
            "source": e["entity_a"],
            "target": e["entity_b"],
            "weight": e["weight"],
            "type": e["relationship_type"],
        } for e in unique_edges if e["entity_a"] in profile_emails and e["entity_b"] in profile_emails]
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
        relationships = conn.execute("SELECT COUNT(*) as cnt FROM relationships").fetchone()["cnt"]
        profiles = conn.execute("SELECT COUNT(*) as cnt FROM entity_profiles").fetchone()["cnt"]
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
        rel_by_type = conn.execute(
            """SELECT relationship_type, COUNT(*) as cnt, SUM(weight) as total_weight
               FROM relationships GROUP BY relationship_type ORDER BY cnt DESC"""
        ).fetchall()
        top_connected = conn.execute(
            """SELECT email, canonical_name, total_connections, total_messages, role
               FROM entity_profiles WHERE is_epstein = 0
               ORDER BY total_connections DESC LIMIT 10"""
        ).fetchall()
    return {
        "threads": threads,
        "messages": messages,
        "entities": entities,
        "edges": edges,
        "relationships": relationships,
        "profiles": profiles,
        "min_date": dict(date_range)["min_date"] if date_range else None,
        "max_date": dict(date_range)["max_date"] if date_range else None,
        "top_senders": rows_to_dicts(top_senders),
        "top_domains": rows_to_dicts(top_domains),
        "relationships_by_type": rows_to_dicts(rel_by_type),
        "top_connected": rows_to_dicts(top_connected),
    }


if os.path.exists(os.path.join(FRONTEND_DIST, "assets")):
    app.mount("/assets", StaticFiles(directory=os.path.join(FRONTEND_DIST, "assets")), name="assets")
app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")
