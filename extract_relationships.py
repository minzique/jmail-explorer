#!/usr/bin/env python3
"""
Phase 1: Structural relationship extraction.

Three extraction layers (zero new dependencies):
  1. Entity dedup — merge aliases, fix malformed entries
  2. Thread co-participation — SQL over existing tables → ~9K edges
  3. Forwarded header parsing — regex on email bodies → ~500-1K new edges

Creates tables: entity_aliases, relationships, entity_mentions, entity_profiles
"""

import re
import sqlite3
import time
from collections import defaultdict
from pathlib import Path

DB_PATH = Path(__file__).parent / "jmail.db"

# ─── Entity Alias Mappings ────────────────────────────────────────────────────
# Manually curated from DB inspection. canonical_email is the primary address.

MANUAL_ALIASES = {
    # Epstein accounts
    "jjeevacation@gmail.com": "jeevacation@gmail.com",
    "jeevacation@gmail.com\u2588": "jeevacation@gmail.com",  # encoding artifact
    "j [jeevacation@gmail.com]": "jeevacation@gmail.com",
    "jeffrey e.": "jeevacation@gmail.com",
    "jeffrey epstein": "jeevacation@gmail.com",
    "jeffrey": "jeevacation@gmail.com",
    "jeevacation": "jeevacation@gmail.com",
    "j": "jeevacation@gmail.com",
    "jeeproject@yahoo.com": "jeevacation@gmail.com",  # merge both Epstein accounts to one canonical

    # Ehud Barak
    "ehud.barak@hyperion-eb.com": "ehbarak1@gmail.com",
    "ehudbarak.997e4c9@m.evernote.com": "ehbarak1@gmail.com",
    "ehud barak": "ehbarak1@gmail.com",
    "barak@barak-associates.com": "ehbarak1@gmail.com",
    "barak & associates": "ehbarak1@gmail.com",
    "l.l.c. barak": "ehbarak1@gmail.com",

    # Ghislaine Maxwell
    "gmax1@mindspring.com": "gmax1@ellmax.com",
    "g maxwell": "gmax1@ellmax.com",
    "gmax": "gmax1@ellmax.com",
    "gmax2@ellmax.com": "gmax1@ellmax.com",
    "gmax@askari.uuplus.com": "gmax1@ellmax.com",

    # Darren Indyke
    "darren indyke": "dkiesq@aol.com",
    "dindyke@nysgmail.com": "dkiesq@aol.com",

    # Lesley Groff
    "lesley groff": "lesley@nysgllc.com",
    "lgroff@nysgmail.com": "lesley@nysgllc.com",
    "lesley.jee@gmail.com": "lesley@nysgllc.com",
    "epslgroff@nysgmail.com": "lesley@nysgllc.com",
    "lesley groff \u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588": "lesley@nysgllc.com",

    # Sarah Kellen
    "skellen2@nysgmail.com": "kellens@earthlink.net",

    # Glenn Dubin — redacted emails map to known account
    "glenn.dubin@hcmny.com": "glenn.dubin@dubinandco.com",

    # Martin Weinberg
    "martin weinberg": "\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588",  # keep redacted as canonical if that's the high-count one

    # Weingarten
    "weingarten, reid": "weingarten, reid",  # name-only, keep as-is (already canonical)

    # Lawrence Summers
    "lhs": "\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588",  # "Lawrence H. Summers" redacted

    # Lawrence Krauss
    "lawrence krauss": "lawkrauss",
    "lawkrauss": "lawkrauss",

    # Kathy Ruemmler
    "kathy ruemmler": "\u2588\u2588\u2588",  # redacted

    # Boris Nikolic
    "boris nikolic": "boris nikolic",

    # Peggy Siegal
    "peggy siegal": "peggy siegal",

    # Steve Bannon
    "steve bannon": "steve bannon",

    # Etienne Binant
    "etienne binant": "etienne binant",

    # Michael Wolff
    "michael wolff": "michael wolff",

    # Dangene & Jennie — merge all redacted-length variants
    "\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588": "\u2588",  # 22-char → single █
    "\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588": "\u2588",  # 23-char → single █
    "\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588": "\u2588",  # 32-char → single █

    # Ingram, David (Reuters) — merge different redacted lengths
    "\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588": "\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588",  # Ingram Reuters 26→21

    # Forrest Miller — merge the two redacted lengths
    "\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588": "\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588",  # 24→10 Forrest Miller

    # No-reply addresses — map to the person who used them
    "no-reply@dropbox.com": "dkiesq@aol.com",  # "Darren Indyke via Dropbox"
}

# Canonical names for known entities
CANONICAL_NAMES = {
    "jeevacation@gmail.com": "Jeffrey Epstein",
    "jeeproject@yahoo.com": "Jeffrey Epstein",
    "ehbarak1@gmail.com": "Ehud Barak",
    "gmax1@ellmax.com": "Ghislaine Maxwell",
    "dkiesq@aol.com": "Darren Indyke",
    "lesley@nysgllc.com": "Lesley Groff",
    "kellens@earthlink.net": "Sarah Kellen",
    "glenn.dubin@dubinandco.com": "Glenn Dubin",
    "evadubin@hotmail.com": "Eva Dubin",
    "nilipriell@gmail.com": "Nili Priell Barak",
}

# Role classifications for well-known entities
ENTITY_ROLES = {
    "jeevacation@gmail.com": "principal",
    "jeeproject@yahoo.com": "principal",
    "ehbarak1@gmail.com": "political",
    "gmax1@ellmax.com": "inner_circle",
    "dkiesq@aol.com": "legal",
    "lesley@nysgllc.com": "inner_circle",
    "kellens@earthlink.net": "inner_circle",
    "evadubin@hotmail.com": "social",
    "nilipriell@gmail.com": "political",
}

# Epstein canonical emails
EPSTEIN_EMAILS = {"jeevacation@gmail.com", "jeeproject@yahoo.com"}


def resolve_canonical(email: str) -> str:
    """Resolve an email to its canonical form via alias chain."""
    seen = set()
    current = email
    while current in MANUAL_ALIASES and current not in seen:
        seen.add(current)
        current = MANUAL_ALIASES[current]
    return current


def is_epstein(email: str) -> bool:
    """Check if email resolves to any Epstein account."""
    canonical = resolve_canonical(email)
    return canonical in EPSTEIN_EMAILS


# ─── Forwarded Header Regex ──────────────────────────────────────────────────

# Match "From: Name <email>" or "From: email" patterns in body text
_FWD_FROM = re.compile(
    r"(?:^|\n)\s*From:\s*(?:\"?([^\"<\n]+?)\"?\s*)?<?(\S+@\S+\.\S+)>?",
    re.IGNORECASE | re.MULTILINE,
)
_FWD_TO = re.compile(
    r"(?:^|\n)\s*To:\s*(.+?)(?:\n|$)",
    re.IGNORECASE | re.MULTILINE,
)
_FWD_CC = re.compile(
    r"(?:^|\n)\s*Cc:\s*(.+?)(?:\n|$)",
    re.IGNORECASE | re.MULTILINE,
)
_EMAIL_EXTRACT = re.compile(r"[\w.+-]+@[\w.-]+\.\w+")


def extract_forwarded_participants(body: str) -> list[tuple[str, str]]:
    """Extract (email, name) pairs from forwarded headers in body text."""
    if not body:
        return []

    participants = []

    # Extract From: addresses
    for match in _FWD_FROM.finditer(body):
        name = (match.group(1) or "").strip().strip('"').strip("'")
        email = match.group(2).strip().lower().rstrip(">").rstrip(".")
        if email and "@" in email and not email.startswith("no-reply"):
            participants.append((email, name))

    # Extract To: and Cc: — may contain multiple addresses
    for pattern in (_FWD_TO, _FWD_CC):
        for match in pattern.finditer(body):
            line = match.group(1)
            emails = _EMAIL_EXTRACT.findall(line)
            for email in emails:
                email = email.lower().rstrip(".")
                if not email.startswith("no-reply"):
                    participants.append((email, ""))

    return participants


# ─── Schema Creation ─────────────────────────────────────────────────────────

def create_new_tables(conn: sqlite3.Connection):
    """Create the new relationship tables."""
    conn.executescript("""
        -- Entity alias resolution
        CREATE TABLE IF NOT EXISTS entity_aliases (
            alias_email TEXT PRIMARY KEY,
            canonical_email TEXT NOT NULL,
            alias_name TEXT,
            canonical_name TEXT
        );

        -- Unified relationship table
        CREATE TABLE IF NOT EXISTS relationships (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            entity_a TEXT NOT NULL,
            entity_b TEXT NOT NULL,
            relationship_type TEXT NOT NULL,
            weight INTEGER DEFAULT 1,
            first_seen TEXT,
            last_seen TEXT,
            sample_doc_id TEXT,
            context TEXT
        );

        -- Track where entities are mentioned
        CREATE TABLE IF NOT EXISTS entity_mentions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            entity_email TEXT NOT NULL,
            message_id TEXT NOT NULL,
            mention_type TEXT NOT NULL,
            context TEXT
        );

        -- Unified entity profiles
        CREATE TABLE IF NOT EXISTS entity_profiles (
            email TEXT PRIMARY KEY,
            canonical_name TEXT,
            all_names TEXT,       -- JSON array
            all_emails TEXT,      -- JSON array
            role TEXT DEFAULT 'unknown',
            first_active TEXT,
            last_active TEXT,
            total_messages INTEGER DEFAULT 0,
            total_threads INTEGER DEFAULT 0,
            total_connections INTEGER DEFAULT 0,
            is_epstein INTEGER DEFAULT 0
        );

        -- Indexes
        CREATE INDEX IF NOT EXISTS idx_rel_a ON relationships(entity_a);
        CREATE INDEX IF NOT EXISTS idx_rel_b ON relationships(entity_b);
        CREATE INDEX IF NOT EXISTS idx_rel_type ON relationships(relationship_type);
        CREATE INDEX IF NOT EXISTS idx_mentions_entity ON entity_mentions(entity_email);
        CREATE INDEX IF NOT EXISTS idx_mentions_msg ON entity_mentions(message_id);
        CREATE INDEX IF NOT EXISTS idx_aliases_canonical ON entity_aliases(canonical_email);
    """);


def drop_new_tables(conn: sqlite3.Connection):
    """Drop and recreate for idempotent reruns."""
    conn.executescript("""
        DROP TABLE IF EXISTS entity_aliases;
        DROP TABLE IF EXISTS relationships;
        DROP TABLE IF EXISTS entity_mentions;
        DROP TABLE IF EXISTS entity_profiles;
    """)


# ─── Step 1: Entity Dedup ────────────────────────────────────────────────────

def step1_entity_dedup(conn: sqlite3.Connection):
    """Populate entity_aliases table from manual mappings."""
    print("\n[Step 1] Entity dedup...")

    # Get all entities for name resolution
    entities = {row[0]: row[1] for row in conn.execute("SELECT email, name FROM entities").fetchall()}

    alias_rows = []
    for alias_email, canonical_email in MANUAL_ALIASES.items():
        canonical = resolve_canonical(alias_email)
        alias_name = entities.get(alias_email, "")
        canonical_name = CANONICAL_NAMES.get(canonical, entities.get(canonical, ""))
        alias_rows.append((alias_email, canonical, alias_name, canonical_name))

    conn.executemany(
        "INSERT OR REPLACE INTO entity_aliases VALUES (?,?,?,?)",
        alias_rows,
    )
    conn.commit()
    print(f"  Inserted {len(alias_rows)} alias mappings")


# ─── Step 2: Co-participation Extraction ─────────────────────────────────────

def step2_co_participation(conn: sqlite3.Connection):
    """Extract co-participant relationships from thread membership."""
    print("\n[Step 2] Thread co-participation extraction...")

    # For each thread, collect all participants (senders + recipients)
    # Then for each pair, create a relationship
    t0 = time.time()

    # Get all thread participants in one query
    rows = conn.execute("""
        SELECT doc_id, email, MIN(sent_at) as first_date, MAX(sent_at) as last_date
        FROM (
            SELECT m.doc_id, m.sender_email as email, m.sent_at
            FROM messages m
            WHERE m.sender_email != '' AND m.sender_email IS NOT NULL
            UNION ALL
            SELECT m.doc_id, r.address as email, m.sent_at
            FROM messages m
            JOIN recipients r ON m.id = r.message_id
            WHERE r.address != '' AND r.address IS NOT NULL
        )
        GROUP BY doc_id, email
    """).fetchall()

    # Group by thread
    thread_participants: dict[str, list[tuple[str, str, str]]] = defaultdict(list)
    for doc_id, email, first_date, last_date in rows:
        canonical = resolve_canonical(email)
        thread_participants[doc_id].append((canonical, first_date or "", last_date or ""))

    # Generate pairs
    pair_data: dict[tuple[str, str], dict] = {}
    for doc_id, participants in thread_participants.items():
        # Deduplicate within thread (after canonical resolution)
        unique = {}
        for email, first_d, last_d in participants:
            if email not in unique:
                unique[email] = {"first": first_d, "last": last_d}
            else:
                if first_d and (not unique[email]["first"] or first_d < unique[email]["first"]):
                    unique[email]["first"] = first_d
                if last_d and (not unique[email]["last"] or last_d > unique[email]["last"]):
                    unique[email]["last"] = last_d

        emails = list(unique.keys())
        if len(emails) < 2:
            continue

        # Skip pairs where both are Epstein
        for i in range(len(emails)):
            for j in range(i + 1, len(emails)):
                a, b = sorted([emails[i], emails[j]])
                # Skip if both are Epstein
                if is_epstein(a) and is_epstein(b):
                    continue

                key = (a, b)
                if key not in pair_data:
                    pair_data[key] = {
                        "weight": 0,
                        "first_seen": "",
                        "last_seen": "",
                        "sample_doc_id": doc_id,
                    }
                pair_data[key]["weight"] += 1
                # Update date range
                earliest = min(unique[emails[i]]["first"], unique[emails[j]]["first"]) if unique[emails[i]]["first"] and unique[emails[j]]["first"] else (unique[emails[i]]["first"] or unique[emails[j]]["first"])
                latest = max(unique[emails[i]]["last"], unique[emails[j]]["last"]) if unique[emails[i]]["last"] and unique[emails[j]]["last"] else (unique[emails[i]]["last"] or unique[emails[j]]["last"])

                if earliest and (not pair_data[key]["first_seen"] or earliest < pair_data[key]["first_seen"]):
                    pair_data[key]["first_seen"] = earliest
                if latest and (not pair_data[key]["last_seen"] or latest > pair_data[key]["last_seen"]):
                    pair_data[key]["last_seen"] = latest

    # Insert relationships
    rel_rows = [
        (a, b, "co-participant", data["weight"], data["first_seen"], data["last_seen"], data["sample_doc_id"], None)
        for (a, b), data in pair_data.items()
    ]
    conn.executemany(
        "INSERT INTO relationships (entity_a, entity_b, relationship_type, weight, first_seen, last_seen, sample_doc_id, context) VALUES (?,?,?,?,?,?,?,?)",
        rel_rows,
    )
    conn.commit()
    elapsed = time.time() - t0
    print(f"  Extracted {len(rel_rows)} co-participant edges in {elapsed:.1f}s")
    print(f"  Threads processed: {len(thread_participants)}")


# ─── Step 3: Forwarded Header Extraction ─────────────────────────────────────

def step3_forwarded_headers(conn: sqlite3.Connection):
    """Parse forwarded headers from email body text."""
    print("\n[Step 3] Forwarded header parsing...")
    t0 = time.time()

    # Get all messages with body content
    messages = conn.execute("""
        SELECT id, doc_id, sender_email, content_markdown, sent_at
        FROM messages
        WHERE content_markdown IS NOT NULL AND content_markdown != ''
    """).fetchall()

    mention_rows = []
    fwd_pair_data: dict[tuple[str, str], dict] = {}
    total_fwd_messages = 0
    total_extracted = 0

    for msg_id, doc_id, sender_email, body, sent_at in messages:
        participants = extract_forwarded_participants(body)
        if not participants:
            continue

        total_fwd_messages += 1
        sender_canonical = resolve_canonical(sender_email) if sender_email else ""

        # Record mentions
        for email, name in participants:
            canonical = resolve_canonical(email)
            mention_rows.append((canonical, msg_id, "forwarded_header", f"Extracted from forwarded header in {doc_id}"))
            total_extracted += 1

            # Create edge between sender and forwarded participant
            if sender_canonical and sender_canonical != canonical:
                if not (is_epstein(sender_canonical) and is_epstein(canonical)):
                    a, b = sorted([sender_canonical, canonical])
                    key = (a, b)
                    if key not in fwd_pair_data:
                        fwd_pair_data[key] = {
                            "weight": 0,
                            "first_seen": sent_at or "",
                            "last_seen": sent_at or "",
                            "sample_doc_id": doc_id,
                        }
                    fwd_pair_data[key]["weight"] += 1
                    if sent_at:
                        if not fwd_pair_data[key]["first_seen"] or sent_at < fwd_pair_data[key]["first_seen"]:
                            fwd_pair_data[key]["first_seen"] = sent_at
                        if not fwd_pair_data[key]["last_seen"] or sent_at > fwd_pair_data[key]["last_seen"]:
                            fwd_pair_data[key]["last_seen"] = sent_at

        # Create edges between forwarded participants themselves
        canonical_participants = list(set(resolve_canonical(e) for e, _ in participants))
        for i in range(len(canonical_participants)):
            for j in range(i + 1, len(canonical_participants)):
                a, b = sorted([canonical_participants[i], canonical_participants[j]])
                if is_epstein(a) and is_epstein(b):
                    continue
                key = (a, b)
                if key not in fwd_pair_data:
                    fwd_pair_data[key] = {
                        "weight": 0,
                        "first_seen": sent_at or "",
                        "last_seen": sent_at or "",
                        "sample_doc_id": doc_id,
                    }
                fwd_pair_data[key]["weight"] += 1

    # Insert mentions
    conn.executemany(
        "INSERT INTO entity_mentions (entity_email, message_id, mention_type, context) VALUES (?,?,?,?)",
        mention_rows,
    )

    # Insert forwarded relationships
    fwd_rows = [
        (a, b, "forwarded", data["weight"], data["first_seen"], data["last_seen"], data["sample_doc_id"], None)
        for (a, b), data in fwd_pair_data.items()
    ]
    conn.executemany(
        "INSERT INTO relationships (entity_a, entity_b, relationship_type, weight, first_seen, last_seen, sample_doc_id, context) VALUES (?,?,?,?,?,?,?,?)",
        fwd_rows,
    )
    conn.commit()
    elapsed = time.time() - t0
    print(f"  Messages with forwarded headers: {total_fwd_messages}")
    print(f"  Entity mentions extracted: {total_extracted}")
    print(f"  Forwarded edges created: {len(fwd_rows)}")
    print(f"  Done in {elapsed:.1f}s")


# ─── Step 4: Also insert direct email edges as relationships ────────────────

def step4_direct_email_relationships(conn: sqlite3.Connection):
    """Copy existing edges table into unified relationships with canonical resolution."""
    print("\n[Step 4] Migrating direct email edges to relationships table...")

    edges = conn.execute("SELECT source_email, target_email, weight FROM edges").fetchall()

    pair_data: dict[tuple[str, str], int] = {}
    for src, dst, weight in edges:
        src_c = resolve_canonical(src)
        dst_c = resolve_canonical(dst)
        if src_c == dst_c:
            continue
        a, b = sorted([src_c, dst_c])
        key = (a, b)
        pair_data[key] = pair_data.get(key, 0) + weight

    # Get date ranges from messages for these direct edges
    direct_rows = []
    for (a, b), weight in pair_data.items():
        # Quick date range lookup
        date_row = conn.execute("""
            SELECT MIN(m.sent_at) as first_seen, MAX(m.sent_at) as last_seen, m.doc_id
            FROM messages m
            JOIN recipients r ON m.id = r.message_id
            WHERE (m.sender_email IN (SELECT alias_email FROM entity_aliases WHERE canonical_email = ? UNION SELECT ?)
                AND r.address IN (SELECT alias_email FROM entity_aliases WHERE canonical_email = ? UNION SELECT ?))
            OR (m.sender_email IN (SELECT alias_email FROM entity_aliases WHERE canonical_email = ? UNION SELECT ?)
                AND r.address IN (SELECT alias_email FROM entity_aliases WHERE canonical_email = ? UNION SELECT ?))
            LIMIT 1
        """, (a, a, b, b, b, b, a, a)).fetchone()

        first_seen = date_row[0] if date_row and date_row[0] else ""
        last_seen = date_row[1] if date_row and date_row[1] else ""
        sample_doc = date_row[2] if date_row and date_row[2] else ""

        direct_rows.append((a, b, "direct_email", weight, first_seen, last_seen, sample_doc, None))

    conn.executemany(
        "INSERT INTO relationships (entity_a, entity_b, relationship_type, weight, first_seen, last_seen, sample_doc_id, context) VALUES (?,?,?,?,?,?,?,?)",
        direct_rows,
    )
    conn.commit()
    print(f"  Migrated {len(direct_rows)} direct email edges (canonical-resolved)")


# ─── Step 5: Build Entity Profiles ──────────────────────────────────────────

def step5_entity_profiles(conn: sqlite3.Connection):
    """Build unified entity profiles with canonical resolution."""
    print("\n[Step 5] Building entity profiles...")
    t0 = time.time()

    import json

    # Get all entities
    entities = conn.execute("SELECT email, name, message_count, is_epstein FROM entities").fetchall()

    # Group by canonical email
    canonical_data: dict[str, dict] = {}
    for email, name, msg_count, is_ep in entities:
        canonical = resolve_canonical(email)
        if canonical not in canonical_data:
            canonical_data[canonical] = {
                "names": set(),
                "emails": set(),
                "total_messages": 0,
                "is_epstein": 0,
            }
        if name:
            canonical_data[canonical]["names"].add(name)
        canonical_data[canonical]["emails"].add(email)
        canonical_data[canonical]["total_messages"] += msg_count
        if is_ep:
            canonical_data[canonical]["is_epstein"] = 1

    # Get thread counts and date ranges per canonical email
    for canonical, data in canonical_data.items():
        all_emails = list(data["emails"])
        placeholders = ",".join("?" * len(all_emails))

        # Thread count (as sender or recipient)
        thread_row = conn.execute(f"""
            SELECT COUNT(DISTINCT doc_id) FROM (
                SELECT doc_id FROM messages WHERE sender_email IN ({placeholders})
                UNION
                SELECT m.doc_id FROM messages m JOIN recipients r ON m.id = r.message_id WHERE r.address IN ({placeholders})
            )
        """, all_emails + all_emails).fetchone()
        data["total_threads"] = thread_row[0] if thread_row else 0

        # Date range
        date_row = conn.execute(f"""
            SELECT MIN(sent_at), MAX(sent_at) FROM messages
            WHERE sender_email IN ({placeholders})
            AND sent_at IS NOT NULL AND sent_at != ''
        """, all_emails).fetchone()
        data["first_active"] = date_row[0] if date_row and date_row[0] else ""
        data["last_active"] = date_row[1] if date_row and date_row[1] else ""

        # Also check recipient dates
        recv_date = conn.execute(f"""
            SELECT MIN(m.sent_at), MAX(m.sent_at) FROM messages m
            JOIN recipients r ON m.id = r.message_id
            WHERE r.address IN ({placeholders})
            AND m.sent_at IS NOT NULL AND m.sent_at != ''
        """, all_emails).fetchone()
        if recv_date and recv_date[0]:
            if not data["first_active"] or recv_date[0] < data["first_active"]:
                data["first_active"] = recv_date[0]
            if not data["last_active"] or recv_date[1] > data["last_active"]:
                data["last_active"] = recv_date[1]

        # Connection count from relationships table
        conn_row = conn.execute("""
            SELECT COUNT(DISTINCT CASE WHEN entity_a = ? THEN entity_b ELSE entity_a END)
            FROM relationships WHERE entity_a = ? OR entity_b = ?
        """, (canonical, canonical, canonical)).fetchone()
        data["total_connections"] = conn_row[0] if conn_row else 0

    # Insert profiles
    profile_rows = []
    for canonical, data in canonical_data.items():
        canonical_name = CANONICAL_NAMES.get(canonical, "")
        if not canonical_name:
            # Pick the longest name as canonical
            names = sorted(data["names"], key=len, reverse=True)
            canonical_name = names[0] if names else canonical

        role = ENTITY_ROLES.get(canonical, "unknown")

        profile_rows.append((
            canonical,
            canonical_name,
            json.dumps(sorted(data["names"])),
            json.dumps(sorted(data["emails"])),
            role,
            data["first_active"],
            data["last_active"],
            data["total_messages"],
            data["total_threads"],
            data["total_connections"],
            data["is_epstein"] or (1 if canonical in EPSTEIN_EMAILS else 0),
        ))

    conn.executemany(
        "INSERT OR REPLACE INTO entity_profiles VALUES (?,?,?,?,?,?,?,?,?,?,?)",
        profile_rows,
    )
    conn.commit()
    elapsed = time.time() - t0
    print(f"  Built {len(profile_rows)} entity profiles in {elapsed:.1f}s")
    print(f"  Aliases resolved: {sum(len(d['emails']) for d in canonical_data.values() if len(d['emails']) > 1)} emails → {sum(1 for d in canonical_data.values() if len(d['emails']) > 1)} canonical entities")


# ─── Summary Stats ───────────────────────────────────────────────────────────

def print_summary(conn: sqlite3.Connection):
    """Print extraction summary."""
    print("\n" + "=" * 60)
    print("EXTRACTION SUMMARY")
    print("=" * 60)

    # Relationships by type
    for row in conn.execute("""
        SELECT relationship_type, COUNT(*) as cnt, SUM(weight) as total_weight
        FROM relationships GROUP BY relationship_type ORDER BY cnt DESC
    """).fetchall():
        print(f"  {row[0]:20s}: {row[1]:>6,} edges, total weight {row[2]:>8,}")

    total_rel = conn.execute("SELECT COUNT(*) FROM relationships").fetchone()[0]
    total_profiles = conn.execute("SELECT COUNT(*) FROM entity_profiles").fetchone()[0]
    total_aliases = conn.execute("SELECT COUNT(*) FROM entity_aliases").fetchone()[0]
    total_mentions = conn.execute("SELECT COUNT(*) FROM entity_mentions").fetchone()[0]

    print(f"\n  Total relationships:  {total_rel:>6,}")
    print(f"  Entity profiles:      {total_profiles:>6,}")
    print(f"  Alias mappings:       {total_aliases:>6,}")
    print(f"  Entity mentions:      {total_mentions:>6,}")

    # Top connected non-Epstein entities
    print("\n  Top 15 connected entities (excluding Epstein):")
    for row in conn.execute("""
        SELECT email, canonical_name, total_connections, total_messages, role
        FROM entity_profiles
        WHERE is_epstein = 0
        ORDER BY total_connections DESC LIMIT 15
    """).fetchall():
        print(f"    {row[1]:35s} connections={row[2]:>4} msgs={row[3]:>5} role={row[4]}")

    print()


# ─── Main ────────────────────────────────────────────────────────────────────

def main():
    print(f"Opening {DB_PATH}...")
    conn = sqlite3.connect(str(DB_PATH))
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA cache_size=-64000")
    conn.execute("PRAGMA synchronous=NORMAL")

    # Drop and recreate for idempotent runs
    drop_new_tables(conn)
    create_new_tables(conn)

    step1_entity_dedup(conn)
    step2_co_participation(conn)
    step3_forwarded_headers(conn)
    step4_direct_email_relationships(conn)
    step5_entity_profiles(conn)
    print_summary(conn)

    conn.close()
    print("Done.")


if __name__ == "__main__":
    main()
