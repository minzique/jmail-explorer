# Frontend Changes — Phase 1 Relationship Intelligence

## Overview

Add relationship intelligence to the EXHIBIT A frontend. The backend now has:
- 15,724 relationships (8,366 co-participant + 5,683 forwarded + 1,675 direct_email)
- 1,095 entity profiles with canonical names, aliases, roles
- 46 entity alias mappings
- 7,616 entity mentions

New API endpoints available:
- `GET /api/person/{email}` — full profile + connections + timeline + mentions
- `GET /api/relationship/{email_a}/{email_b}` — relationship detail between two people
- `GET /api/graph/relationships?min_weight=&limit=&rel_type=` — relationship graph with type filtering
- `GET /api/relationships/top?limit=&rel_type=&exclude_epstein=` — top relationships
- Updated `GET /api/graph/ego/{email}` — now uses relationships table, returns role + type
- Updated `GET /api/stats` — now includes relationships, profiles, rel_by_type, top_connected

---

## File Changes

### 1. `src/types.ts` — DONE (already edited)

Added: `PersonProfile`, `PersonConnection`, `PersonActivityEntry`, `MentionSummary`, `PersonResponse`, `RelationshipDetail`, `TopRelationship`, `RelTypeCount`, `TopConnected`

Updated: `GraphNode` (added `connections?`, `role?`), `GraphLink` (added `type?`)

Need to add: `ViewName` update to include `'person'`

### 2. `src/types.ts` — ViewName update

```diff
- export type ViewName = 'search' | 'network' | 'entities' | 'timeline' | 'stats'
+ export type ViewName = 'search' | 'network' | 'entities' | 'person' | 'timeline' | 'stats'
```

### 3. `src/api.ts` — New API functions

Add these functions:

```typescript
import type { PersonResponse, GraphData, TopRelationship } from './types'

export function getPerson(email: string): Promise<PersonResponse> {
  return fetchJson(`/api/person/${encodeURIComponent(email)}`)
}

export function getRelationshipGraph(
  minWeight = 3, limit = 150, relType = ''
): Promise<GraphData> {
  const params = `min_weight=${minWeight}&limit=${limit}&rel_type=${encodeURIComponent(relType)}`
  return fetchJson(`/api/graph/relationships?${params}`)
}

export function getTopRelationships(
  limit = 50, relType = '', excludeEpstein = false
): Promise<{ relationships: TopRelationship[] }> {
  const params = `limit=${limit}&rel_type=${encodeURIComponent(relType)}&exclude_epstein=${excludeEpstein}`
  return fetchJson(`/api/relationships/top?${params}`)
}
```

Update existing imports at top of api.ts to include new types.

### 4. `src/components/Layout/Sidebar.tsx` — Add person view

Add to NAV_ITEMS array (after 'entities'):
```typescript
{ view: 'person', label: 'PERSON DOSSIER', icon: '⊡' },
```

### 5. `src/App.tsx` — Wire in PersonView

Changes:
- Import PersonView
- Add `personEmail` state (string | null)
- Add `handleViewPerson` callback that sets personEmail and switches to 'person' view
- Pass `onViewPerson` to EntitiesView, NetworkView, StatsView
- Render `<PersonView>` when view === 'person'
- Update handleViewEntity to navigate to person view instead

### 6. `src/components/Person/PersonView.tsx` — NEW FILE (main deliverable)

The person dossier page. Design spec:

**Layout:**
- Header: "DOSSIER // {NAME}" in typewriter, stamped red
- Profile card: canonical name, all aliases/emails, role badge, date range, message counts
- Activity sparkline: tiny bar chart of messages per month (inline SVG, no D3 needed)
- Connection cards: grid of top connections with relationship type pills (co-participant=dashed border, direct=solid, forwarded=dotted)
- Each connection shows: name, email, total weight, type breakdown, date range
- Click connection → navigate to that person's dossier
- "VIEW EGO NETWORK" button → switches to network view with ego filter

**Relationship type color coding:**
- `direct_email` → var(--blood) (red)
- `co-participant` → var(--evidence-yellow) (yellow)  
- `forwarded` → var(--bone-dim) (muted)

**Role badges:**
- `inner_circle` → blood red bg
- `legal` → blue-ish
- `political` → dark gold
- `financial` → green-ish
- `social` → purple-ish
- `principal` → bright red
- `unknown` → bone-muted

**Recent messages:** Two sections — "SENT" and "RECEIVED", each showing last 20 messages with subject, date, click to open thread.

**Search within person:** Input at top that filters connections by name.

### 7. `src/components/Person/PersonSearch.tsx` — NEW FILE

A search/autocomplete input that searches entity profiles and navigates to person view.
- Fetches from `/api/entities?search=...&limit=10` on debounced input
- Shows dropdown with name + email + message count
- Click item → navigate to person dossier
- Used as the main entry point for the person view

### 8. `src/components/Network/NetworkView.tsx` — Update

Changes:
- Add `relType` state ('' | 'co-participant' | 'forwarded' | 'direct_email')
- Add a relationship type dropdown/radio in surveillance controls
- When relType is set, call `getRelationshipGraph(minWeight, maxNodes, relType)` instead of `getGraph`
- Default behavior: use `getRelationshipGraph` (richer data) instead of `getGraph`
- Add `onViewPerson` prop — clicking a node opens person dossier
- Color edges by relationship type in useForceGraph

### 9. `src/components/Network/useForceGraph.ts` — Update

Changes:
- Color links by `type` field:
  - `direct_email` → rgba(139,0,0,0.4) (blood red)
  - `co-participant` → rgba(196,160,0,0.3) (evidence yellow)
  - `forwarded` → rgba(138,126,106,0.25) (bone dim)
  - default → rgba(200,184,154,0.15)
- Style links:
  - `co-participant` → dashed stroke
  - `forwarded` → dotted stroke
  - `direct_email` → solid stroke
- Node color by role if available (use role-based color from PersonView)

### 10. `src/components/Stats/StatsView.tsx` — Update

Changes:
- Stats type already has new fields from backend: `relationships`, `profiles`, `relationships_by_type`, `top_connected`
- Update Stats interface in types.ts to include these
- Add stat cards: RELATIONSHIPS (15,724), PROFILES (1,095)
- Add "RELATIONSHIPS BY TYPE" section showing counts per type with bar fills
- Add "TOP CONNECTED ENTITIES" section showing top 10 by connection count
- Click entity name → navigate to person view (needs `onViewPerson` prop)

### 11. `src/types.ts` — Update Stats interface

```diff
export interface Stats {
  threads: number
  messages: number
  entities: number
  edges: number
+ relationships: number
+ profiles: number
  min_date: string | null
  max_date: string | null
  top_senders: TopSender[]
  top_domains: TopDomain[]
+ relationships_by_type: RelTypeCount[]
+ top_connected: TopConnected[]
}
```

---

## Implementation Order

1. types.ts — finish updating (ViewName + Stats interface)
2. api.ts — add new functions
3. Sidebar.tsx — add person nav item
4. PersonSearch.tsx — create search component
5. PersonView.tsx — create dossier page (biggest piece)
6. NetworkView.tsx + useForceGraph.ts — update for relationship types
7. StatsView.tsx — update with relationship data
8. App.tsx — wire everything together
9. Build + verify

---

## Design Notes

The person dossier should feel like opening a classified personnel file:
- Top section: "DOSSIER" stamp in typewriter, blood red
- Profile summary: institutional form layout, labeled fields
- The activity sparkline should use inline SVG bars, max height ~40px, blood-colored bars
- Connection type pills: tiny capsule badges next to each connection
- The whole page scrolls vertically (not fixed height)
- Staggered page-enter animation on sections
- Section dividers use existing `.section-divider` class

Color per relationship type is crucial for visual distinction in both the person view and network graph.
