# jmail-explorer

Scraper and web UI for the [jmail.world](https://jmail.world) Epstein email archive.

Scrapes all 7,545 threads (15,188 messages) with full email bodies, indexes them into SQLite with FTS5, and serves a single-page web app for searching and exploring the data.

## Requirements

Python 3.10+, `aiohttp`, `fastapi`, `uvicorn`. No JS build tools.

```
pip install aiohttp fastapi uvicorn
```

## Usage

```
# 1. scrape (~60s, writes ~/Downloads/jmail_threads.jsonl, 106MB)
python scraper.py

# 2. ingest into sqlite (~3s, writes jmail.db, 137MB)
python ingest.py

# 3. serve
uvicorn server:app --host 0.0.0.0 --port 8000
```

The scraper supports resume — re-run it after a crash and it picks up where it left off.

## Architecture

```
scraper.py    aiohttp async scraper, 40 concurrent requests
                |
                v
        jmail_threads.jsonl     one JSON object per thread per line
                |
                v
ingest.py     reads JSONL -> SQLite (FTS5 + entity graph + timeline)
                |
                v
            jmail.db            137MB, 6 tables + 1 FTS virtual table
                |
                v
server.py     FastAPI, 9 endpoints, serves static/index.html
                |
                v
static/
  index.html  single-file SPA, vanilla JS + D3.js v7 from CDN
```

## Database schema

```sql
threads    (doc_id PK, subject, message_count, latest_date, preview, is_sent, star_count, has_redactions, attachment_count)
messages   (id PK, doc_id FK, message_index, sender, sender_name, sender_email, subject, sent_at, content_markdown, content_html, attachment_count, is_from_epstein, preview, account_email)
recipients (message_id FK, address, name, type)        -- type: to/cc/bcc
entities   (id PK, email UNIQUE, name, message_count, is_epstein)
edges      (source_email, target_email, weight)         -- PK: source+target
timeline   (month PK, message_count)                    -- month: YYYY-MM

messages_fts  FTS5 virtual table on (doc_id, message_id, sender_name, sender_email, subject, content, sent_at)
              tokenizer: porter unicode61
```

## API

```
GET /api/search?q=&page=&limit=          FTS5 search with snippet highlighting
GET /api/threads/{doc_id}                 full thread with messages and recipients
GET /api/entities?page=&limit=&sort=&order=&search=
GET /api/entities/{email}                 entity detail + connections + recent messages
GET /api/graph?min_weight=&limit=         network graph nodes+links for D3
GET /api/graph/ego/{email}?depth=         ego network centered on one person
GET /api/timeline                         message count per month
GET /api/stats                            aggregate counts, top senders, top domains
```

## Frontend

Single HTML file, no build step. Dark theme. D3.js for the network graph and timeline chart, everything else is vanilla JS.

Views: search (FTS5 with highlighted snippets), thread reader (renders HTML email bodies in sandboxed iframes), network graph (force-directed, filterable by edge weight and node count), entity explorer (sortable table with drill-down), timeline (bar chart by month), stats dashboard.

Keyboard: `⌘K` or `/` to focus search, `Esc` to close thread modal.

## How the scraper works

See [SCRAPING.md](SCRAPING.md).

Short version: jmail.world is a Next.js app. Thread listings come from React Server Components (requires `Accept: text/x-component` + `RSC: 1` headers). Doc IDs are extracted with regex from the RSC stream. Full thread JSON comes from `/api/threads/{doc_id}`.

## Numbers

| | |
|---|---|
| threads | 7,545 |
| messages | 15,188 |
| entities | 1,134 |
| edges | 2,232 |
| date range | 2002-12 to 2019-08 |
| scrape time | ~60s |
| ingest time | ~3s |
| JSONL size | 106 MB |
| DB size | 137 MB |
| total code | 1,523 lines |
