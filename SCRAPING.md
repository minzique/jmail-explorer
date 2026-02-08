# Scraping jmail.world

## What is jmail.world

jmail.world is a public archive of Jeffrey Epstein's emails, built as a Next.js application. It hosts ~7,500 inbox threads and ~4,300 sent threads with full email bodies, attachments metadata, and recipient information.

## Reverse engineering the API

The site has no public API documentation. These endpoints were discovered by inspecting network requests in browser devtools.

### Thread counts

```
GET https://jmail.world/api/thread-counts?source=all&newReleasesOnly=false
```

Returns:
```json
{"inbox": 7545, "sent": 4340, "starred": 9298}
```

### Paginated thread listing (RSC)

The site uses React Server Components. Thread lists are fetched via RSC streaming, not a JSON API. Each page returns 100 thread summaries containing `doc_id` identifiers.

**Inbox pages:**
```
GET https://jmail.world/           → page 1
GET https://jmail.world/page/2     → page 2
GET https://jmail.world/page/3     → page 3
...
GET https://jmail.world/page/76    → page 76 (last)
```

**Sent pages:**
```
GET https://jmail.world/sent           → page 1
GET https://jmail.world/sent/page/2    → page 2
...
GET https://jmail.world/sent/page/44   → page 44 (last)
```

Required headers to get the RSC payload instead of HTML:
```
Accept: text/x-component
RSC: 1
Next-Url: /page/{n}           ← must match the path
Cookie: jmail_anim_suppress=1; jsuite_user_id=anon_<uuid>
```

The query parameter `?_rsc=1` is also required.

The response is a binary RSC stream, not JSON. `doc_id` values are extracted via regex:

```python
ids = re.findall(r'"doc_id":"([^"]+)"', text)
```

### Full thread data

Once you have a `doc_id`, the full thread with email bodies is available at:

```
GET https://jmail.world/api/threads/{doc_id}
```

This is a standard JSON endpoint. No special headers beyond a cookie and user-agent are needed.

Response structure:
```json
{
  "thread": {
    "doc_id": "HOUSE_OVERSIGHT_030001",
    "messages": [
      {
        "id": "3733",
        "sender_name": "J. Epstein",
        "sender_email": "jeeproject@yahoo.com",
        "subject": "Re: something",
        "to_recipients": ["Name <email@example.com>"],
        "cc_recipients": [],
        "sent_at": "2015-08-06T00:41:00.000Z",
        "content_markdown": "full email body in markdown",
        "content_html": "<div>full email body in HTML</div>",
        "is_from_epstein": true,
        "attachments": 0
      }
    ],
    "count": 3,
    "subject": "Re: something",
    "isSent": false,
    "starCount": 2,
    "participants": ["Name <email>"]
  },
  "starCounts": {"3733": 2},
  "annotations": {},
  "hasRedactions": false
}
```

Recipients are plain strings in `"Name <email>"` format, not objects.

## Scraper architecture

The scraper (`jmail_scraper.py`) runs in two phases:

### Phase 1: Enumerate doc_ids

1. Fetch `/api/thread-counts` to learn how many pages exist (inbox_total / 100, sent_total / 100)
2. Build a list of all page paths (`/`, `/page/2`, ..., `/page/76`, `/sent`, `/sent/page/2`, ..., `/sent/page/44`)
3. Fetch all pages concurrently (10 parallel requests)
4. Extract `doc_id` values from each RSC response with regex
5. Deduplicate (inbox and sent share some threads)

Result: 7,545 unique doc_ids.

### Phase 2: Fetch full threads

1. Check if output file already exists. If so, parse existing doc_ids to enable resume
2. Skip already-fetched threads
3. Fetch remaining threads via `/api/threads/{doc_id}` at 40 concurrency
4. Process in batches of 200 to bound memory
5. Write each thread as a single JSON line to the output JSONL file
6. Handle surrogate unicode characters with `encode("utf-8", errors="surrogatepass").decode("utf-8", errors="replace")`

### Concurrency settings

```
Page fetches:    10 parallel (phase 1)
Thread fetches:  40 parallel (phase 2)
TCP connections: 60 max, 60 per host
Timeout:         30s per request
Retry:           3 attempts with linear backoff (2s, 4s, 6s)
Batch size:      200 threads per gather round
```

### Performance

| Metric | Value |
|--------|-------|
| Total threads | 7,545 |
| Total messages | 15,188 |
| Phase 1 time | ~5s |
| Phase 2 time | ~45s |
| Throughput | ~150-250 req/s |
| Output file | 106 MB JSONL |

### Resume support

If the script crashes or is interrupted, re-running it will:
1. Read the existing JSONL file
2. Parse each line to extract already-fetched `doc_id` values
3. Skip those threads
4. Append new threads to the file

The first run crashed at ~3,700 threads due to a surrogate unicode character (`\ud83d`) in an email body. After adding the surrogatepass encoding fix, the second run resumed from where it left off and completed the remaining ~3,800 threads.

## Output format

One JSON object per line in `jmail_threads.jsonl`. Each line contains the full API response for one thread, including all messages with their complete HTML and markdown bodies.

To count threads: `wc -l jmail_threads.jsonl`

To read a specific thread:
```python
import json
with open("jmail_threads.jsonl") as f:
    for line in f:
        data = json.loads(line)
        thread = data["thread"]
        for msg in thread["messages"]:
            print(f'{msg["sender_name"]}: {msg["subject"]}')
            print(msg["content_markdown"][:200])
```

## Running the scraper

```bash
pip3 install aiohttp
python3 jmail_scraper.py
```

Output goes to `~/Downloads/jmail_threads.jsonl`. Takes under 60 seconds on a decent connection.
