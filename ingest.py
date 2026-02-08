#!/usr/bin/env python3
"""Ingest jmail_threads.jsonl into SQLite with FTS5 for full-text search."""

import json
import sqlite3
import sys
import time
from pathlib import Path

JSONL_PATH = Path(__file__).parent.parent / "jmail_threads.jsonl"
DB_PATH = Path(__file__).parent / "jmail.db"


def create_schema(conn: sqlite3.Connection):
    conn.executescript("""
        -- Core tables
        CREATE TABLE IF NOT EXISTS threads (
            doc_id TEXT PRIMARY KEY,
            subject TEXT,
            message_count INTEGER,
            latest_date TEXT,
            preview TEXT,
            is_sent INTEGER DEFAULT 0,
            star_count INTEGER DEFAULT 0,
            has_redactions INTEGER DEFAULT 0,
            attachment_count INTEGER DEFAULT 0
        );

        CREATE TABLE IF NOT EXISTS messages (
            id TEXT PRIMARY KEY,
            doc_id TEXT NOT NULL,
            message_index INTEGER,
            sender TEXT,
            sender_name TEXT,
            sender_email TEXT,
            subject TEXT,
            sent_at TEXT,
            content_markdown TEXT,
            content_html TEXT,
            attachment_count INTEGER DEFAULT 0,
            is_from_epstein INTEGER DEFAULT 0,
            preview TEXT,
            account_email TEXT,
            FOREIGN KEY (doc_id) REFERENCES threads(doc_id)
        );

        CREATE TABLE IF NOT EXISTS recipients (
            message_id TEXT NOT NULL,
            address TEXT NOT NULL,
            name TEXT,
            type TEXT NOT NULL,  -- 'to', 'cc', 'bcc'
            FOREIGN KEY (message_id) REFERENCES messages(id)
        );

        -- Entity tables for the graph
        CREATE TABLE IF NOT EXISTS entities (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            email TEXT UNIQUE,
            name TEXT,
            message_count INTEGER DEFAULT 0,
            is_epstein INTEGER DEFAULT 0
        );

        CREATE TABLE IF NOT EXISTS edges (
            source_email TEXT NOT NULL,
            target_email TEXT NOT NULL,
            weight INTEGER DEFAULT 1,
            PRIMARY KEY (source_email, target_email)
        );

        -- Timeline aggregation
        CREATE TABLE IF NOT EXISTS timeline (
            month TEXT PRIMARY KEY,  -- YYYY-MM
            message_count INTEGER DEFAULT 0
        );

        -- FTS5 for full-text search
        CREATE VIRTUAL TABLE IF NOT EXISTS messages_fts USING fts5(
            doc_id,
            message_id,
            sender_name,
            sender_email,
            subject,
            content,
            sent_at,
            tokenize='porter unicode61'
        );

        -- Indexes
        CREATE INDEX IF NOT EXISTS idx_messages_doc_id ON messages(doc_id);
        CREATE INDEX IF NOT EXISTS idx_messages_sent_at ON messages(sent_at);
        CREATE INDEX IF NOT EXISTS idx_messages_sender_email ON messages(sender_email);
        CREATE INDEX IF NOT EXISTS idx_recipients_message_id ON recipients(message_id);
        CREATE INDEX IF NOT EXISTS idx_recipients_address ON recipients(address);
        CREATE INDEX IF NOT EXISTS idx_entities_email ON entities(email);
        CREATE INDEX IF NOT EXISTS idx_edges_source ON edges(source_email);
        CREATE INDEX IF NOT EXISTS idx_edges_target ON edges(target_email);
    """)


import re

_EMAIL_RE = re.compile(r"<([^>]+)>")
_NAME_RE = re.compile(r"^([^<]+)<")


def parse_recipient(raw) -> tuple[str, str]:
    """Parse 'Name <email>' or '<email>' or dict with address/name keys."""
    if isinstance(raw, dict):
        return (
            raw.get("address", "").strip().lower(),
            raw.get("name", "").strip(),
        )
    if not isinstance(raw, str) or not raw.strip():
        return ("", "")
    s = raw.strip()
    email_match = _EMAIL_RE.search(s)
    email = email_match.group(1).strip().lower() if email_match else s.strip().lower()
    name_match = _NAME_RE.search(s)
    name = name_match.group(1).strip() if name_match else ""
    return (email, name)


def normalize_email(email: str) -> str:
    if not email:
        return ""
    return email.strip().lower()


def normalize_name(name: str) -> str:
    if not name:
        return ""
    return name.strip()


def ingest(jsonl_path: Path, db_path: Path):
    if db_path.exists():
        db_path.unlink()
        print(f"Removed existing {db_path}")

    conn = sqlite3.connect(str(db_path))
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA synchronous=NORMAL")
    conn.execute("PRAGMA cache_size=-64000")

    create_schema(conn)

    entity_counts: dict[str, dict] = {}
    edge_counts: dict[tuple[str, str], int] = {}
    timeline_counts: dict[str, int] = {}

    t0 = time.time()
    thread_count = 0
    message_count = 0

    with open(jsonl_path, "r", encoding="utf-8") as f:
        for line_num, line in enumerate(f, 1):
            try:
                data = json.loads(line)
            except json.JSONDecodeError as e:
                print(f"  Skipping line {line_num}: {e}")
                continue

            thread = data["thread"]
            doc_id = thread["doc_id"]
            messages = thread.get("messages", [])

            
            conn.execute(
                "INSERT OR IGNORE INTO threads VALUES (?,?,?,?,?,?,?,?,?)",
                (
                    doc_id,
                    thread.get("subject", ""),
                    thread.get("count", len(messages)),
                    thread.get("latest_date", ""),
                    thread.get("preview", ""),
                    1 if thread.get("isSent") else 0,
                    thread.get("starCount", 0),
                    1 if data.get("hasRedactions") else 0,
                    thread.get("attachments", 0),
                ),
            )
            thread_count += 1

            for msg in messages:
                msg_id = msg.get("id", f"{doc_id}_{msg.get('message_index', 0)}")
                sender_email = normalize_email(msg.get("sender_email", ""))
                sender_name = normalize_name(msg.get("sender_name", ""))
                is_epstein = 1 if msg.get("is_from_epstein") else 0
                sent_at = msg.get("sent_at", "")
                content_md = msg.get("content_markdown", "")
                content_html = msg.get("content_html", "")
                subject = msg.get("subject", "")

                
                conn.execute(
                    "INSERT OR IGNORE INTO messages VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)",
                    (
                        msg_id,
                        doc_id,
                        msg.get("message_index", 0),
                        msg.get("sender", ""),
                        sender_name,
                        sender_email,
                        subject,
                        sent_at,
                        content_md,
                        content_html,
                        msg.get("attachments", 0),
                        is_epstein,
                        msg.get("preview", ""),
                        msg.get("account_email", ""),
                    ),
                )

                
                conn.execute(
                    "INSERT INTO messages_fts VALUES (?,?,?,?,?,?,?)",
                    (
                        doc_id,
                        msg_id,
                        sender_name,
                        sender_email,
                        subject,
                        content_md,
                        sent_at,
                    ),
                )

                
                all_recipients = []
                for rtype in ("to", "cc", "bcc"):
                    for r in msg.get(f"{rtype}_recipients", []):
                        addr, name = parse_recipient(r)
                        if addr:
                            conn.execute(
                                "INSERT INTO recipients VALUES (?,?,?,?)",
                                (msg_id, addr, name, rtype),
                            )
                            all_recipients.append((addr, name))

                
                if sender_email:
                    if sender_email not in entity_counts:
                        entity_counts[sender_email] = {
                            "name": sender_name,
                            "count": 0,
                            "is_epstein": is_epstein,
                        }
                    entity_counts[sender_email]["count"] += 1
                    
                    if len(sender_name) > len(entity_counts[sender_email]["name"]):
                        entity_counts[sender_email]["name"] = sender_name
                    if is_epstein:
                        entity_counts[sender_email]["is_epstein"] = 1

                
                for addr, name in all_recipients:
                    if addr not in entity_counts:
                        entity_counts[addr] = {
                            "name": name,
                            "count": 0,
                            "is_epstein": 0,
                        }
                    entity_counts[addr]["count"] += 1
                    if len(name) > len(entity_counts[addr]["name"]):
                        entity_counts[addr]["name"] = name

                
                if sender_email:
                    for addr, _ in all_recipients:
                        key = (sender_email, addr)
                        edge_counts[key] = edge_counts.get(key, 0) + 1

                
                if sent_at and len(sent_at) >= 7:
                    month = sent_at[:7]
                    timeline_counts[month] = timeline_counts.get(month, 0) + 1

                message_count += 1

            if thread_count % 500 == 0:
                conn.commit()
                elapsed = time.time() - t0
                print(
                    f"  {thread_count} threads, {message_count} messages ({elapsed:.1f}s)"
                )

    print(f"  Inserting {len(entity_counts)} entities...")
    conn.executemany(
        "INSERT OR IGNORE INTO entities (email, name, message_count, is_epstein) VALUES (?,?,?,?)",
        [
            (email, d["name"], d["count"], d["is_epstein"])
            for email, d in entity_counts.items()
        ],
    )

    print(f"  Inserting {len(edge_counts)} edges...")
    conn.executemany(
        "INSERT OR IGNORE INTO edges VALUES (?,?,?)",
        [(src, dst, w) for (src, dst), w in edge_counts.items()],
    )

    print(f"  Inserting {len(timeline_counts)} timeline entries...")
    conn.executemany(
        "INSERT OR IGNORE INTO timeline VALUES (?,?)",
        list(timeline_counts.items()),
    )

    conn.commit()

    elapsed = time.time() - t0
    db_size = db_path.stat().st_size / (1024 * 1024)
    print(f"\nDone in {elapsed:.1f}s")
    print(f"  {thread_count} threads, {message_count} messages")
    print(f"  {len(entity_counts)} entities, {len(edge_counts)} edges")
    print(f"  {len(timeline_counts)} timeline months")
    print(f"  DB size: {db_size:.1f} MB")

    conn.close()


if __name__ == "__main__":
    jsonl = Path(sys.argv[1]) if len(sys.argv) > 1 else JSONL_PATH
    if not jsonl.exists():
        print(f"Error: {jsonl} not found")
        sys.exit(1)
    print(f"Ingesting {jsonl} -> {DB_PATH}")
    ingest(jsonl, DB_PATH)
