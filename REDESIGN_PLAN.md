# EXHIBIT A — JMail Explorer Frontend Redesign Plan

## Concept

**"EXHIBIT A"** — A leaked classified archive viewer. The interface feels like you've gained unauthorized access to a government evidence database. Every surface communicates: *this data was never meant to be seen*.

**Visual language sources:**
- Redacted government documents (black bars, stamp marks, heavy censorship)
- Evidence room filing systems (manila, evidence tags, case numbers)
- Surveillance camera feeds (timestamps, low-res grain, green/amber tints)
- Netflix "Filthy Rich" color palette (oppressive blacks, sickly yellows, blood reds)
- Court exhibit labels (stamped text, monospace, bureaucratic typography)

---

## Tech Stack

- **Vite 6** + **React 19** + **TypeScript**
- **D3.js v7** (imported as ESM, used in custom hooks)
- **No UI library** — all custom CSS, no Tailwind, no shadcn (would fight the aesthetic)
- **Plain CSS files** (no CSS-in-JS, no CSS modules — keep it simple for this custom work)
- **Google Fonts**: Special Elite (typewriter), IBM Plex Mono (data), Crimson Pro (serif body)

---

## Design System Tokens

### Colors

| Token | Value | Purpose |
|-------|-------|---------|
| `--bg-void` | `#050505` | Deepest background — the void |
| `--bg-surface` | `#0a0a0a` | Card/panel surfaces |
| `--bg-paper` | `#0f0e0c` | "Document" surfaces with warmth |
| `--bg-manila` | `#1a1610` | Manila folder tint for hover states |
| `--bg-elevated` | `#1c1a15` | Elevated panels, controls |
| `--border` | `#2a2520` | Default borders — warm dark |
| `--border-subtle` | `#1a1815` | Subtle dividers |
| `--blood` | `#8b0000` | Epstein markers, danger, key accents |
| `--blood-bright` | `#cc1100` | Active states, critical badges |
| `--blood-glow` | `rgba(139,0,0,0.15)` | Red glow for hover/emphasis |
| `--evidence-yellow` | `#c4a000` | Evidence tags, timestamps, metadata |
| `--evidence-yellow-dim` | `#8a7a20` | Dimmed yellow for secondary |
| `--bone` | `#c8b89a` | Primary text — aged paper tone |
| `--bone-dim` | `#8a7e6a` | Secondary text |
| `--bone-muted` | `#5a5347` | Tertiary/disabled text |
| `--redact-black` | `#111` | Redaction bar color |
| `--stamp-red` | `#991111` | "CLASSIFIED" stamp overlays |
| `--grid-green` | `#1a3a1a` | Surveillance monitor tint |
| `--highlight` | `rgba(196,160,0,0.2)` | Search highlight — highlighter yellow on paper |

### Typography

| Token | Value | Usage |
|-------|-------|-------|
| `--font-typewriter` | `'Special Elite', cursive` | Headers, labels, stamps, nav tabs |
| `--font-mono` | `'IBM Plex Mono', monospace` | Data, emails, metadata, tables |
| `--font-serif` | `'Crimson Pro', serif` | Email body text for readability |

### Spacing / Radius

| Token | Value |
|-------|-------|
| `--radius` | `2px` | Sharp, institutional — no friendly rounded corners |
| `--radius-sm` | `1px` |
| `--space-xs` | `4px` |
| `--space-sm` | `8px` |
| `--space-md` | `16px` |
| `--space-lg` | `24px` |
| `--space-xl` | `32px` |

---

## Atmospheric Effects (CSS-only)

1. **Film grain** — SVG `<feTurbulence>` filter as `::after` on body, animated with CSS, low opacity, `pointer-events: none`
2. **Scanlines** — Repeating linear gradient (2px transparent, 1px rgba(0,0,0,0.06)) on `::before` of main content
3. **Glitch on hover** — `clip-path` animation that briefly displaces element content with red/cyan color shift
4. **Flicker** — Subtle opacity oscillation (0.97 to 1.0) on the surveillance clock
5. **Redaction reveal** — Black bars that "lift" on hover to show text beneath (used on certain decorative elements)
6. **Page entry** — Documents fade in with slight upward translate, staggered by index
7. **Vignette** — Radial gradient darkening corners of the main viewport
8. **CRT glow** — Very subtle text-shadow on key elements mimicking phosphor glow

---

## File Structure

```
jmail_explorer/
├── frontend/
│   ├── index.html                     ← entry point, loads fonts
│   ├── vite.config.ts                 ← proxy /api to localhost:8000
│   ├── tsconfig.json
│   ├── package.json
│   ├── public/
│   │   └── (empty — noise generated in CSS)
│   └── src/
│       ├── main.tsx                   ← ReactDOM.createRoot entry
│       ├── App.tsx                    ← router/view state, keyboard shortcuts
│       ├── api.ts                     ← typed fetch wrapper for all /api/* endpoints
│       ├── types.ts                   ← TypeScript interfaces matching API responses
│       ├── utils.ts                   ← avatarColor, initials, fmtDate, escHtml
│       ├── styles/
│       │   ├── global.css             ← CSS variables, resets, scrollbars, base
│       │   ├── effects.css            ← grain, scanlines, glitch, flicker, vignette keyframes
│       │   └── typography.css         ← font imports, typewriter/stamp/redacted classes
│       ├── components/
│       │   ├── Layout/
│       │   │   ├── Shell.tsx          ← outer wrapper: grain overlay + scanlines + vignette
│       │   │   ├── Sidebar.tsx        ← vertical case-file tab nav
│       │   │   └── SurveillanceClock.tsx ← ticking timestamp in sidebar footer
│       │   ├── ui/
│       │   │   ├── EvidenceTag.tsx    ← "EXHIBIT A-xxx" numbered tag
│       │   │   ├── ClassifiedBadge.tsx← red EPSTEIN / CLASSIFIED badge
│       │   │   ├── Spinner.tsx        ← loading indicator with surveillance feel
│       │   │   ├── Pagination.tsx     ← prev/next with exhibit numbering
│       │   │   └── EmptyState.tsx     ← "NO RECORDS FOUND" bureaucratic message
│       │   ├── Search/
│       │   │   ├── SearchView.tsx     ← search input + results list + pagination
│       │   │   └── ResultCard.tsx     ← individual search result card
│       │   ├── Thread/
│       │   │   ├── ThreadOverlay.tsx  ← full-screen evidence overlay modal
│       │   │   ├── ThreadHeader.tsx   ← case file cover: subject + metadata
│       │   │   └── MessageCard.tsx    ← individual email message in thread
│       │   ├── Network/
│       │   │   ├── NetworkView.tsx    ← graph container + surveillance controls
│       │   │   └── useForceGraph.ts   ← D3 force simulation hook
│       │   ├── Entities/
│       │   │   ├── EntitiesView.tsx   ← government database table + search
│       │   │   └── EntityDetail.tsx   ← dossier panel with connections + messages
│       │   ├── Timeline/
│       │   │   ├── TimelineView.tsx   ← temporal analysis container
│       │   │   └── useTimeline.ts     ← D3 bar chart hook
│       │   └── Stats/
│       │       └── StatsView.tsx      ← classified briefing dashboard
│       └── hooks/
│           ├── useDebounce.ts         ← debounce input values
│           └── useApi.ts              ← generic async fetch with loading/error
├── server.py                          ← FastAPI backend (updated to serve frontend/dist)
├── jmail.db                           ← SQLite database (137MB)
├── ingest.py                          ← JSONL → SQLite ingestion script
├── SCRAPING.md                        ← How the scraping was done
└── REDESIGN_PLAN.md                   ← THIS FILE
```

---

## Component Architecture

```
<App>                                  ← view state, keyboard shortcuts, thread state
  <Shell>                              ← grain overlay, scanlines, vignette
    <Sidebar                           ← "CASE FILE" tabs + surveillance clock
      activeView, onViewChange
    />
    <main>
      {view === 'search'   && <SearchView onOpenThread={...} />}
      {view === 'network'  && <NetworkView onViewEntity={...} />}
      {view === 'entities' && <EntitiesView onOpenThread={...} onViewNetwork={...} />}
      {view === 'timeline' && <TimelineView onSearch={...} />}
      {view === 'stats'    && <StatsView />}
    </main>
  </Shell>
  {threadId && <ThreadOverlay docId={threadId} onClose={...} />}
</App>
```

---

## API Layer (api.ts)

All functions are typed and hit the existing FastAPI endpoints unchanged:

```typescript
// Types from types.ts
interface SearchResult { message_id: string; doc_id: string; sender_name: string; sender_email: string; subject: string; snippet: string; sent_at: string; }
interface SearchResponse { results: SearchResult[]; total: number; page: number; limit: number; error?: string; }
interface Thread { doc_id: string; subject: string; message_count: number; latest_date: string; preview: string; is_sent: number; star_count: number; has_redactions: number; attachment_count: number; }
interface Message { id: string; doc_id: string; message_index: number; sender: string; sender_name: string; sender_email: string; subject: string; sent_at: string; content_markdown: string; content_html: string; attachment_count: number; is_from_epstein: number; preview: string; account_email: string; recipients: Recipient[]; }
interface Recipient { address: string; name: string; type: 'to' | 'cc' | 'bcc'; }
interface Entity { id: number; email: string; name: string; message_count: number; is_epstein: number; }
interface EntityDetail { entity: Entity; connections: Connection[]; recent_messages: RecentMessage[]; }
interface Connection { email: string; name: string; message_count: number; is_epstein: number; connection_weight: number; }
interface GraphData { nodes: GraphNode[]; links: GraphLink[]; }
interface GraphNode { id: string; name: string; email: string; count: number; is_epstein: number; }
interface GraphLink { source: string; target: string; weight: number; }
interface TimelineEntry { month: string; message_count: number; }
interface Stats { threads: number; messages: number; entities: number; edges: number; min_date: string; max_date: string; top_senders: TopSender[]; top_domains: TopDomain[]; }

// API functions
search(q: string, page: number, limit: number): Promise<SearchResponse>
getThread(docId: string): Promise<{ thread: Thread; messages: Message[] }>
getEntities(page: number, limit: number, sort: string, order: string, search: string): Promise<{ entities: Entity[]; total: number; page: number; limit: number }>
getEntity(email: string): Promise<EntityDetail>
getGraph(minWeight: number, limit: number): Promise<GraphData>
getEgoGraph(email: string, depth: number): Promise<GraphData>
getTimeline(): Promise<{ timeline: TimelineEntry[] }>
getStats(): Promise<Stats>
```

---

## View-by-View Design Specification

### Sidebar

- Looks like a vertical **filing cabinet index**
- Tabs are physical-looking case file dividers with typewriter text
- Active tab has a red left border (evidence seal)
- Logo area: "EXHIBIT A" stamped in Special Elite font, "JMAIL ARCHIVE // DEPT. OF JUSTICE" in tiny IBM Plex Mono caps
- Footer: `SurveillanceClock` component showing ticking timestamp `2026-02-08 17:42:31 UTC` with flicker effect
- Navigation labels:
  - SEARCH → "QUERY DATABASE"
  - NETWORK → "NETWORK ANALYSIS"  
  - ENTITIES → "SUBJECT FILES"
  - TIMELINE → "TEMPORAL ANALYSIS"
  - STATS → "CLASSIFIED BRIEFING"

### Search View

- Header: "QUERY DATABASE" in typewriter font, small "FULL-TEXT SEARCH // 7,545 THREADS" subtitle in mono
- Input styled like government form field: label above, sharp corners, bone-colored border, evidence-yellow focus ring
- Result count shown as: `RESULTS: 2,188 RECORDS MATCHED // PAGE 1 OF 110`
- Each `ResultCard`:
  - Left edge: thin vertical line (gray default, blood-red if Epstein)
  - Top line: sender name (mono, bone) + date (evidence-yellow, mono)
  - Subject line: slightly larger, bone color
  - Snippet: bone-dim, `<mark>` highlights use `--highlight` yellow background
  - Small evidence tag in corner: `A-001`, `A-002`...
  - On hover: background shifts to `--bg-manila`, slight left-translate
- Pagination: `◀ PREV | EXHIBIT A-001 THROUGH A-020 OF 2,188 | NEXT ▶`

### Thread Reader (ThreadOverlay)

- Full-screen overlay with **heavy black vignette** and blur backdrop
- `ThreadHeader`: looks like a case file cover page
  - "THREAD EXHIBIT // [doc_id]" stamped in typewriter
  - Subject in Crimson Pro serif, large
  - Meta: message count, date range, attachment count — all in mono
  - Close button: "✕ CLOSE FILE" in typewriter
- Each `MessageCard`:
  - Background: `--bg-paper` with very subtle paper texture
  - Sender line: avatar circle (colored) + name (mono bold) + email (mono dim) + date (evidence-yellow)
  - If from Epstein: red top border + "⚠ FROM: JEFFREY EPSTEIN" red badge bar
  - TO:/CC: lines in typewriter font, evidence-yellow labels
  - Body: HTML emails in slightly warm-tinted iframe, markdown in `--font-serif`
  - Attachment badge: amber with paperclip icon

### Network Graph (NetworkView)

- Background: faint `--grid-green` grid lines (surveillance monitor aesthetic)
- Control panel: top-left, looks like a **surveillance system control box**
  - Dark background, mono text, range sliders with custom styling
  - Labels: "MIN EDGE WEIGHT" / "MAX SUBJECTS" in typewriter
  - "RELOAD SCAN" button
- Graph rendering:
  - Links: thin, `rgba(200,184,154,0.15)` — ghostly connection lines
  - Nodes: circles, fill `--bone-dim` default
  - Epstein nodes: fill `--blood`, larger, pulsing red glow (`box-shadow` animation)
  - Node labels: mono, tiny, bone-muted
  - On hover: node brightens, tooltip appears as "SUBJECT FILE" card
- Tooltip: dark bg, "SUBJECT: [name]" / "EMAIL: [email]" / "MESSAGES: [n]" in mono
- Click node → navigates to entities view for that email

### Entities View (EntitiesView)

- Header: "SUBJECT FILES" in typewriter, subtitle "KNOWN ENTITIES IN ARCHIVE"
- Search input: same government form field style as search view
- Table: government database printout aesthetic
  - Headers: typewriter, uppercase, evidence-yellow underline
  - Rows: mono text, alternating `--bg-surface` / `--bg-paper` very subtly
  - Epstein rows: blood-red left border + CLASSIFIED badge
  - On hover: `--bg-manila` tint
  - Click → loads EntityDetail below
- `EntityDetail` panel:
  - Opens as a "DOSSIER" document
  - Header: "DOSSIER // [name]" in typewriter, email in mono, message count
  - "VIEW NETWORK" button styled as evidence tag
  - "KNOWN ASSOCIATES" section: grid of mini cards
    - Each card: name (mono bold) + email (mono dim) + connection weight (evidence-yellow)
    - Click navigates to that entity's dossier
  - "RECENT COMMUNICATIONS" section: compact message list
    - Each row: subject + date, click opens thread

### Timeline View (TimelineView)

- Header: "TEMPORAL ANALYSIS" in typewriter, subtitle "MESSAGE VOLUME BY MONTH"
- Chart background: very faint horizontal ruled lines (notebook feel)
- Bars: `--blood` fill with slight glow on hover
- X-axis labels: typewriter font, rotated, every 12th month
- Y-axis labels: mono, bone-muted
- Tooltip: evidence-tag styled — "1997-03 // 142 MESSAGES"
- Click bar → switches to search view with that month as query

### Stats View (StatsView)

- Header: "CLASSIFIED BRIEFING" in typewriter
- Faint diagonal "CONFIDENTIAL" watermark at 15° angle across view
- Stat cards grid: 6 cards
  - Each card: sharp borders, `--bg-paper` background
  - Label above in tiny mono caps (evidence-yellow): "THREADS", "MESSAGES", etc.
  - Value in large IBM Plex Mono bold: bone color
  - Subtle blood-red bottom border on each card
- "TOP 10 SENDERS" section:
  - Table with rank numbers as evidence tags (01, 02, 03...)
  - Bar fills: blood-red, sharp ends
  - Name in mono, email in mono-dim
- "TOP 10 DOMAINS" section: same table style

---

## Backend Changes (server.py)

Minimal changes:
1. Update static file serving to point to `frontend/dist` after build
2. Keep all `/api/*` routes exactly as they are
3. Vite dev server handles proxying during development

```python
# In server.py, update the static mount:
STATIC_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "frontend", "dist")

# Update root route to serve from dist:
@app.get("/")
async def root():
    return FileResponse(os.path.join(STATIC_DIR, "index.html"))

# Mount static assets from dist:
app.mount("/assets", StaticFiles(directory=os.path.join(STATIC_DIR, "assets")), name="assets")
```

Vite config for dev:
```typescript
// vite.config.ts
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': 'http://localhost:8000'
    }
  }
})
```

---

## Build & Deploy

```bash
# Development
cd frontend && npm run dev    # Vite dev server on :5173, proxies /api to :8000
cd .. && python -m uvicorn server:app --port 8000  # backend

# Production build
cd frontend && npm run build  # outputs to frontend/dist/
cd .. && python -m uvicorn server:app --port 8000  # serves everything
```

---

## Implementation Order

1. Scaffold Vite + React + TS project ✅
2. Design system: global.css, effects.css, typography.css, CSS variables
3. Types + API layer: types.ts, api.ts, utils.ts
4. Shell + Sidebar + SurveillanceClock (layout skeleton)
5. SearchView + ResultCard (most-used view)
6. ThreadOverlay + ThreadHeader + MessageCard (critical for email reading)
7. NetworkView + useForceGraph (D3 integration)
8. EntitiesView + EntityDetail
9. TimelineView + useTimeline
10. StatsView
11. Atmospheric polish: grain, scanlines, vignette, glitch, transitions
12. Backend wiring: vite proxy config, server.py update
13. Build + full browser verification

---

## Keyboard Shortcuts (preserved from v1)

- `⌘K` or `/` → focus search input, switch to search view
- `Escape` → close thread overlay
- Window resize → reload graph and timeline

---

## Existing API Endpoints (DO NOT CHANGE)

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/` | Serve index.html |
| GET | `/api/search?q=&page=&limit=` | FTS5 search with snippets |
| GET | `/api/threads/{doc_id}` | Full thread with messages + recipients |
| GET | `/api/entities?page=&limit=&sort=&order=&search=` | Paginated entity list |
| GET | `/api/entities/{email}` | Entity detail + connections + recent messages |
| GET | `/api/graph?min_weight=&limit=` | Network graph nodes + links |
| GET | `/api/graph/ego/{email}?depth=` | Ego network for entity |
| GET | `/api/timeline` | Monthly message counts |
| GET | `/api/stats` | Totals + top senders + top domains |

---

## Database Schema (reference)

```sql
threads: doc_id (PK), subject, message_count, latest_date, preview, is_sent, star_count, has_redactions, attachment_count
messages: id (PK), doc_id (FK), message_index, sender, sender_name, sender_email, subject, sent_at, content_markdown, content_html, attachment_count, is_from_epstein, preview, account_email
recipients: message_id (FK), address, name, type ('to'|'cc'|'bcc')
entities: id, email (unique), name, message_count, is_epstein
edges: source_email, target_email, weight (PK: source+target)
timeline: month (PK, 'YYYY-MM'), message_count
messages_fts: FTS5 virtual table on (doc_id, message_id, sender_name, sender_email, subject, content, sent_at)
```
