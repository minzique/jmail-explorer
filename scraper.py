#!/usr/bin/env python3
"""
jmail.world full scraper — collects all threads with complete email bodies.

Phase 1: Enumerate all doc_ids via RSC pagination (inbox + sent)
Phase 2: Fetch full thread data via /api/threads/{doc_id} concurrently
Output:  ~/Downloads/jmail_threads.jsonl  (one JSON object per line)
"""

import asyncio
import json
import re
import time
import sys
from pathlib import Path

import aiohttp

# ── Config ──────────────────────────────────────────────────────────────────
CONCURRENCY_PAGES = 10       # parallel page fetches (phase 1)
CONCURRENCY_THREADS = 40     # parallel thread fetches (phase 2)
RETRY_LIMIT = 3
RETRY_DELAY = 2.0
OUTPUT_DIR = Path.home() / "Downloads"
OUTPUT_FILE = OUTPUT_DIR / "jmail_threads.jsonl"
PROGRESS_EVERY = 50          # print progress every N threads

COOKIE = "jmail_anim_suppress=1; jsuite_user_id=anon_97b5d48d-52be-4452-96aa-46c79aaacd06"
HEADERS_RSC = {
    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:149.0) Gecko/20100101 Firefox/149.0",
    "Accept": "text/x-component",
    "RSC": "1",
    "Cookie": COOKIE,
}
HEADERS_API = {
    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:149.0) Gecko/20100101 Firefox/149.0",
    "Accept": "*/*",
    "Cookie": COOKIE,
}

BASE = "https://jmail.world"


# ── Phase 1: collect doc_ids ────────────────────────────────────────────────

async def fetch_page_ids(session: aiohttp.ClientSession, path: str, sem: asyncio.Semaphore) -> list[str]:
    """Fetch a single RSC page and extract doc_ids."""
    url = f"{BASE}{path}"
    headers = {**HEADERS_RSC, "Next-Url": path}
    for attempt in range(RETRY_LIMIT):
        try:
            async with sem:
                async with session.get(url, headers=headers, params={"_rsc": "1"}) as resp:
                    raw = await resp.read()
                    text = raw.decode("utf-8", errors="replace")
                    ids = re.findall(r'"doc_id":"([^"]+)"', text)
                    return ids
        except Exception as e:
            if attempt < RETRY_LIMIT - 1:
                await asyncio.sleep(RETRY_DELAY * (attempt + 1))
            else:
                print(f"  WARN: failed {path}: {e}", file=sys.stderr)
                return []


async def collect_all_ids(session: aiohttp.ClientSession) -> list[str]:
    """Enumerate all pages for inbox + sent and return deduplicated doc_ids."""
    sem = asyncio.Semaphore(CONCURRENCY_PAGES)

    # First, get page 1 of inbox to learn totalPages
    print("Phase 1: discovering page counts...")
    inbox_p1 = await fetch_page_ids(session, "/", sem)
    # Fetch counts
    async with session.get(f"{BASE}/api/thread-counts", headers=HEADERS_API,
                           params={"source": "all", "newReleasesOnly": "false"}) as resp:
        counts = await resp.json()
    
    inbox_total = counts.get("inbox", 7545)
    sent_total = counts.get("sent", 4340)
    inbox_pages = (inbox_total + 99) // 100
    sent_pages = (sent_total + 99) // 100

    print(f"  Inbox: {inbox_total} threads across {inbox_pages} pages")
    print(f"  Sent:  {sent_total} threads across {sent_pages} pages")

    # Build all page paths
    paths = []
    # Inbox: / for page 1, /page/2 .. /page/N
    for p in range(2, inbox_pages + 1):
        paths.append(f"/page/{p}")
    # Sent: /sent for page 1, /sent/page/2 .. /sent/page/N
    paths.append("/sent")
    for p in range(2, sent_pages + 1):
        paths.append(f"/sent/page/{p}")

    print(f"  Fetching {len(paths) + 1} pages in parallel (concurrency={CONCURRENCY_PAGES})...")

    tasks = [fetch_page_ids(session, path, sem) for path in paths]
    results = await asyncio.gather(*tasks)

    all_ids = set(inbox_p1)
    for ids in results:
        all_ids.update(ids)

    print(f"  Collected {len(all_ids)} unique doc_ids")
    return sorted(all_ids)


# ── Phase 2: fetch full threads ─────────────────────────────────────────────

async def fetch_thread(session: aiohttp.ClientSession, doc_id: str,
                       sem: asyncio.Semaphore, stats: dict) -> dict | None:
    """Fetch full thread data including email bodies."""
    url = f"{BASE}/api/threads/{doc_id}"
    for attempt in range(RETRY_LIMIT):
        try:
            async with sem:
                async with session.get(url, headers=HEADERS_API) as resp:
                    if resp.status == 200:
                        data = await resp.json()
                        stats["ok"] += 1
                        return data
                    elif resp.status == 404:
                        stats["not_found"] += 1
                        return None
                    else:
                        stats["errors"] += 1
                        if attempt < RETRY_LIMIT - 1:
                            await asyncio.sleep(RETRY_DELAY * (attempt + 1))
                        else:
                            print(f"  WARN: {doc_id} returned {resp.status}", file=sys.stderr)
                            return None
        except Exception as e:
            stats["errors"] += 1
            if attempt < RETRY_LIMIT - 1:
                await asyncio.sleep(RETRY_DELAY * (attempt + 1))
            else:
                print(f"  WARN: {doc_id} exception: {e}", file=sys.stderr)
                return None


async def fetch_all_threads(session: aiohttp.ClientSession, doc_ids: list[str]) -> None:
    """Fetch all threads concurrently and stream to JSONL file."""
    sem = asyncio.Semaphore(CONCURRENCY_THREADS)
    stats = {"ok": 0, "not_found": 0, "errors": 0}

    already_fetched: set[str] = set()
    mode = "w"
    if OUTPUT_FILE.exists() and OUTPUT_FILE.stat().st_size > 0:
        with open(OUTPUT_FILE, "r") as existing:
            for raw_line in existing:
                try:
                    obj = json.loads(raw_line)
                    did = obj.get("thread", {}).get("doc_id")
                    if did:
                        already_fetched.add(did)
                except json.JSONDecodeError:
                    pass
        if already_fetched:
            print(f"  Resuming: {len(already_fetched)} threads already on disk, skipping them")
            mode = "a"
            doc_ids = [d for d in doc_ids if d not in already_fetched]

    total = len(doc_ids)
    t0 = time.time()

    print(f"Phase 2: fetching {total} full threads (concurrency={CONCURRENCY_THREADS})...")

    with open(OUTPUT_FILE, mode) as f:
        # Process in batches to avoid unbounded memory
        batch_size = 200
        for batch_start in range(0, total, batch_size):
            batch = doc_ids[batch_start:batch_start + batch_size]
            tasks = [fetch_thread(session, did, sem, stats) for did in batch]
            results = await asyncio.gather(*tasks)

            for data in results:
                if data is not None:
                    line = json.dumps(data, ensure_ascii=False)
                    line = line.encode("utf-8", errors="surrogatepass").decode("utf-8", errors="replace")
                    f.write(line + "\n")

            done = min(batch_start + batch_size, total)
            elapsed = time.time() - t0
            rate = done / elapsed if elapsed > 0 else 0
            eta = (total - done) / rate if rate > 0 else 0
            print(f"  {done}/{total} ({stats['ok']} ok, {stats['not_found']} 404, "
                  f"{stats['errors']} err) — {rate:.1f} req/s, ETA {eta:.0f}s")

    elapsed = time.time() - t0
    print(f"\nDone! {stats['ok']} threads saved to {OUTPUT_FILE}")
    print(f"  {stats['not_found']} not found, {stats['errors']} errors")
    print(f"  Total time: {elapsed:.1f}s ({stats['ok']/elapsed:.1f} threads/s)")
    print(f"  File size: {OUTPUT_FILE.stat().st_size / 1024 / 1024:.1f} MB")


# ── Main ─────────────────────────────────────────────────────────────────────

async def main():
    connector = aiohttp.TCPConnector(limit=60, limit_per_host=60)
    timeout = aiohttp.ClientTimeout(total=30)
    async with aiohttp.ClientSession(connector=connector, timeout=timeout) as session:
        doc_ids = await collect_all_ids(session)
        await fetch_all_threads(session, doc_ids)


if __name__ == "__main__":
    print(f"jmail.world scraper — output: {OUTPUT_FILE}\n")
    asyncio.run(main())
