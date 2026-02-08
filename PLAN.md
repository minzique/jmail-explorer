# jmail-explorer: Relationship Intelligence System — Plan

## Current State

### What exists
- 7,545 threads, 15,188 messages, full HTML/markdown bodies
- SQLite with FTS5 search, basic entity table (1,134 entities), sender→recipient edges (2,232)
- Web UI with search, network graph, timeline, entity explorer

### What the current graph misses
The graph only has sender→recipient edges from email headers. It's pure hub-and-spoke through Epstein. No relationships between other people are visible. Maxwell, Barak, Dershowitz, Summers — they all appear as isolated spokes even though the email *content* reveals they knew each other, met, traveled together, and were discussed together.

---

## Raw Data: What We Measured

### Dataset stats
```
Total messages:          15,188
With markdown body:      15,055
With HTML body:          15,063
Avg body length:         ~500 chars
Date range:              2002-12 to 2019-08
Unique sender emails:    541
Unique recipient addrs:  2,146
Unique entities:         1,134
```

### Content signals (sampled 2,000 messages)
```
Contains "From:" header (forwards):     18.7%  (2,837 msgs total)
Contains "Original Message":            12.7%  (1,926 msgs)
Contains "wrote:":                       8.5%  (1,284 msgs)
Contains "Sent from":                   14.3%  (2,166 msgs)
```

### Relationship-indicating phrases (2,000 sample)
```
legal terms (attorney, court, plea):    25.2%
phone_call (called, spoke, talked):     19.6%
schedule (calendar, available):         12.7%
travel/flight (flew, jet, island):      10.5%
financial (wire, transfer, fund):        7.8%
introduction (introduce, connect):       6.3%
visit (came by, staying at):             4.2%
meeting/dinner:                          2.4%
```

### Location mentions (full corpus)
```
New York:              2,079
457 Madison Ave:         486   (Epstein's office)
Paris:                   389
London:                  341
Palm Beach:              259
St. Thomas:              243
575 Lexington Ave:       161   (NYSG LLC office)
Little St. James:         40
Zorro Ranch / NM:         21
```

### Name mentions in body text (full corpus)
```
Trump:      1,731 messages
Clinton:      522
Ghislaine:    190
Maxwell:      138
Barak:        122
Dershowitz:   115
Gates:        109
Wexner:       102
```

### Thread co-participation (structural)
```
Threads with 1 participant:     44
Threads with 2 participants:  6,027
Threads with 3+ participants: 1,474
Threads with 5+ participants:   327
Threads with 10+:               40

Unique non-Epstein co-participant pairs:  7,748
Pairs appearing in 2+ shared threads:     1,197
Pairs appearing in 5+ shared threads:       253
Pairs appearing in 10+ shared threads:      129
```

### Top co-participant pairs (excluding Epstein)
```
37  Glenn Dubin          <-> Lajcak Miroslav
33  Dangene/Jennie       <-> Lajcak Miroslav
32  Dangene/Jennie       <-> Eisenberg, Marshall
32  Dangene/Jennie       <-> Glenn Dubin
30  Eisenberg, Marshall  <-> Glenn Dubin
30  Eisenberg, Marshall  <-> Lajcak Miroslav
29  Ariane de Rothschild <-> Glenn Dubin
29  Martin Weinberg      <-> Sidney Hillman Foundation
28  Sidney Hillman       <-> Jeffrey Greenberg
28  Lajcak Miroslav      <-> David Ingram (Reuters)
27  Dangene/Jennie       <-> Lawrence Summers
```

### Network topology (co-participation graph)
```
Total nodes:    1,129
Total edges:    9,010   (4x the current sender→recipient graph)

Degree distribution:
  1:       252 nodes
  2-5:     333
  6-10:    136
  11-20:   159
  21-50:   152
  50+:      97

Top connectors (non-Epstein, by unique connections):
  193  Dangene/Jennie Enterprise
  179  David Ingram (Reuters)
  149  Jeffrey Greenberg
  142  Martin Weinberg
  140  Armando Fernandez
  135  Dangene/Jennie (alt)
  133  Sidney Hillman Foundation
  130  Glenn Dubin
  126  Forrest Miller
  121  Lajcak Miroslav
  114  Ariane de Rothschild
  110  Marshall Eisenberg
   89  Lawrence Summers
   89  Robert Lawrence Kuhn
   80  Lesley Groff
```

### Temporal activity patterns (key entities)
```
Lesley Groff:       2005-10 → 2008-08  (disappears after arrest)
Ghislaine Maxwell:  2007-06 → 2015-10  (burst in 2008, sporadic after)
Darren Indyke:      2005-10 → 2019-03  (heavy 2007-08, then quiet)
Glenn Dubin:        2008-07 → 2019-06  (consistent, peaks 2016-18)
Lawrence Summers:   2009-10 → 2019-06  (late arrival, peaks 2016-18)
Weingarten, Reid:   2011-11 → 2019-07  (peaks 2019 — legal defense)
Ehud Barak:         2013-04 → 2019-06  (concentrated burst)
```

### Content characteristics
```
Casual tone:          96.5% of messages
Formal/legal:          3.5%
Phone numbers in body: 14.7% (2,231 msgs)
Physical addresses:     7.5% (1,133 msgs)
Forwarded chain depth:
  1 level:  1,143 msgs
  2 levels:   188 msgs
  10+ levels:  22 msgs (contain hidden third-party conversations)
```

### Epstein entity aliases (need dedup)
```
jeeproject@yahoo.com        — primary
jeevacation@gmail.com       — primary
littlestjeff@yahoo.com      — alias
jeffrey e.                  — malformed
j [jeevacation@gmail.com]   — malformed
jjeevacation@gmail.com      — typo
jeevacation@gmail.com█      — encoding artifact
```

### Entity dedup problem (broader)
```
Ghislaine Maxwell appears as:
  gmax1@ellmax.com       (425 msgs, "mme maxwelle")
  gmax1@mindspring.com   (275 msgs, "Gmax")
  G Maxwell, Ghislaine, gmax — in body text

Darren Indyke appears as:
  dkiesq@aol.com         (657 msgs)
  darren indyke          (malformed)

Lesley Groff appears as:
  lesley@nysgllc.com     (725 msgs)
  lesley groff           (malformed)
```

---

## Extraction Strategy: Three Layers

### Layer 1: Thread Co-Participation (structural, zero NLP needed)

Already proven above. Pure SQL over existing tables.

For every thread, collect all participants (senders + recipients). For every pair of non-Epstein participants in the same thread, create a weighted edge. Weight = number of shared threads.

This alone gives us 9,010 edges vs the current 2,232. It's the single highest-ROI extraction.

**Implementation**: SQL query, ~2 seconds. Store in new `co_participation` table.

### Layer 2: Forwarded Header Parsing (regex, high precision)

18.7% of messages contain forwarded email headers with explicit From/To/Cc fields embedded in the body. These name people who participated in conversations that were then forwarded to Epstein — people who may not appear in the outer email headers at all.

**Regex pattern**:
```
From: "?Name"?\s*<?email@domain>?
To: "?Name"?\s*<?email@domain>?
Cc: "?Name"?\s*<?email@domain>?
```

**Edge creation**: Connect people found in the same forwarded header block. Also connect forwarded participants to the outer email sender (who forwarded it).

**Estimated yield**: 2,837 messages × ~2 extracted addresses = ~5,000 new participant-email pairs. After dedup, probably 500-1,000 new edges.

### Layer 3: Body Name Mentions (NER + entity linking)

This is where it gets interesting and where we have options.

#### Option A: Curated dictionary matching (fast, no deps)
Build a curated list of ~200 known person names from the entities table (filtered: no services, no newsletters, no short names). Do case-insensitive substring matching on email bodies.

**Pros**: Fast (seconds), no dependencies, no false positives on known names.
**Cons**: Misses people not in the entity table. Can't extract relationship types.

#### Option B: spaCy NER (medium, one pip install)
spaCy `en_core_web_sm` model runs on CPU, processes ~10K docs/min. Extracts PERSON entities from free text. Then link extracted names back to known entities via fuzzy matching.

**Pros**: Finds names not in our entity table. Handles "Bill Clinton", "Secretary Clinton", "Clinton" as the same person.
**Cons**: ~200MB model download. Some false positives. Can't extract relationship types.

#### Option C: LLM-based structured extraction (slow, rich)
Use ollama with llama3/phi3 locally, or Anthropic/OpenAI API, to extract structured data per message:
```json
{
  "people_mentioned": ["Bill Clinton", "Alan Dershowitz"],
  "relationships": [
    {"person_a": "Epstein", "person_b": "Clinton", "type": "social", "context": "dinner invitation"},
    {"person_a": "Epstein", "person_b": "Dershowitz", "type": "legal", "context": "defense attorney"}
  ],
  "locations": ["Palm Beach", "New York"],
  "topics": ["legal", "social"],
  "sentiment": "casual"
}
```

**Pros**: Extracts relationship types, context, topics. Understands nuance.
**Cons**: Slow. Local LLM: ~2-5 msgs/sec = 1-2 hours for 15K. API: ~$5-15 for 15K messages with a cheap model. Hallucination risk.

#### Recommended: A + B + C (tiered)
1. Run Layer 1 (co-participation) and Layer 2 (forwarded headers) immediately — zero cost, high value.
2. Run Option A (dictionary matching) for instant body mention edges.
3. Run Option B (spaCy) to discover names not in our dictionary.
4. Run Option C (LLM) only on "interesting" messages — those with 2+ co-mentions, or from key people, or containing relationship-indicating phrases. ~2,000-3,000 messages instead of 15K. Cost: ~$1-3 or 20 min local.

---

## Entity Resolution / Deduplication

Before any extraction, we need to merge aliases. Current entity table has duplicates.

### Approach
1. **Email normalization**: lowercase, strip whitespace, fix encoding artifacts (`█` chars)
2. **Email clustering**: Group emails that share the same domain + similar local part (`gmax1@ellmax.com` and `gmax1@mindspring.com` are NOT the same — both are Ghislaine but different addresses)
3. **Name clustering**: Fuzzy match on entity names. Use Jaro-Winkler distance or similar. "Lesley Groff" and "'lesley@nysgllc.com'" are the same person.
4. **Manual aliases file**: For the top 50 entities, manually define canonical mappings. This is a 30-minute task that eliminates 80% of the dedup problem.

### Data structure
```sql
CREATE TABLE entity_aliases (
    alias_email TEXT PRIMARY KEY,
    canonical_email TEXT NOT NULL,
    alias_name TEXT,
    canonical_name TEXT,
    FOREIGN KEY (canonical_email) REFERENCES entities(email)
);
```

---

## Unified Relationship Model

### New tables

```sql
CREATE TABLE relationships (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    entity_a TEXT NOT NULL,        -- canonical email
    entity_b TEXT NOT NULL,        -- canonical email
    relationship_type TEXT,        -- 'co-participant', 'forwarded', 'mentioned', 'llm-extracted'
    weight INTEGER DEFAULT 1,
    first_seen TEXT,               -- earliest date
    last_seen TEXT,                -- latest date
    sample_doc_id TEXT,            -- example thread
    context TEXT                   -- LLM-extracted context or null
);

CREATE TABLE entity_mentions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    entity_email TEXT NOT NULL,    -- who was mentioned
    message_id TEXT NOT NULL,      -- where
    mention_type TEXT,             -- 'header', 'body_name', 'body_email', 'forwarded_header'
    context TEXT,                  -- surrounding text snippet
    FOREIGN KEY (message_id) REFERENCES messages(id)
);

CREATE TABLE entity_profiles (
    email TEXT PRIMARY KEY,
    canonical_name TEXT,
    all_names TEXT,                -- JSON array of all known names
    all_emails TEXT,               -- JSON array of all known emails
    role TEXT,                     -- 'inner_circle', 'legal', 'financial', 'media', 'social', 'unknown'
    first_active TEXT,
    last_active TEXT,
    total_messages INTEGER,
    total_threads INTEGER,
    total_connections INTEGER,
    is_epstein INTEGER DEFAULT 0
);
```

### Relationship types and weights

```
co-participant (same thread CC):  weight = shared_thread_count
forwarded_header:                 weight = number of forwarded blocks sharing both
body_co_mention:                  weight = messages where both names appear
llm_extracted:                    weight = 1 per extraction, but carries typed context
direct_email (existing):          weight = email count between them
```

### Unified score
```
relationship_score = 
    direct_email_weight * 3.0 +
    co_participant_weight * 2.0 +
    forwarded_header_weight * 1.5 +
    body_co_mention_weight * 1.0 +
    llm_extracted_weight * 2.0
```

---

## New Features for the Web UI

### 1. Person Profile Page
Search by person → see everything about them:
- All known aliases / email addresses
- Activity timeline (sparkline of messages per month)
- Role classification (legal, financial, social, media)
- Top connections with relationship type breakdown
- All threads they participated in
- Key quotes / mentions of them by others
- Locations associated with them

### 2. Relationship Explorer
Click an edge between two people → see:
- How they're connected (co-participant, mentioned together, forwarded chain, direct email)
- Timeline of their relationship (when did they first appear together? when most active?)
- Sample messages showing the connection
- Shared connections (mutual contacts)

### 3. Enhanced Network Graph
- Color edges by relationship type (direct=solid, co-participant=dashed, mention=dotted)
- Filter by relationship type
- Filter by time period (slider: "show network as of 2008" vs "show network as of 2019")
- Community detection highlighting (Louvain clusters colored differently)
- "Shortest path" between any two people

### 4. Cluster / Community View
- Auto-detected communities using Louvain algorithm on the co-participation graph
- Show clusters: legal team, financial advisors, social circle, media contacts
- Identify bridge nodes (people who connect otherwise-separate clusters)

### 5. Timeline Correlation
- Side-by-side timeline of two or more entities
- Highlight periods where they were both active
- Overlay with known events (arrest dates, trial dates, news events)

### 6. Location Network
- Map view showing locations mentioned in emails
- Which people are associated with which locations
- Travel patterns (who went where when)

### 7. Topic Analysis
- Cluster messages by topic (legal, travel, financial, social, media)
- Show which topics each person is associated with
- Topic evolution over time

---

## Graph Algorithms to Run

### Community Detection (Louvain)
Partition the co-participation graph into communities. Expected clusters:
- Legal team (Indyke, Weinberg, Weingarten, Eisenberg)
- Financial circle (Dubin, Summers, Wexner)
- Social circle (Maxwell, Brunel, Marcinkova, models)
- Media contacts (Ingram/Reuters, Farrell/Bloomberg, Wolff)
- Political contacts (Barak, Mandelson, Rothschild)

### Betweenness Centrality
Find bridge nodes — people who connect otherwise-separate clusters. Already measured: Ariane de Rothschild (114 connections, 250 bridges) and Lawrence Summers (80 connections, 203 bridges) are high-bridge entities.

### PageRank
Rank entities by "importance" in the network. Differs from raw message count — a person with few messages but connections to many clusters ranks higher.

### Temporal Network Analysis
Build the graph at different time slices:
- Pre-2008 (before first arrest)
- 2008-2013 (post-arrest, quiet period)
- 2014-2019 (resurgence)
Who appears? Who disappears? Who is new?

---

## Implementation Phases

### Phase 1: Structural Extraction (no new deps, ~1 hour)
1. Entity dedup — create aliases file, merge duplicates
2. Thread co-participation extraction → `relationships` table
3. Forwarded header parsing → more edges
4. Rebuild entity_profiles with merged data
5. New API endpoints: `/api/person/{email}`, `/api/relationship/{a}/{b}`
6. Update frontend: person profile page, enhanced graph

### Phase 2: NLP Extraction (spaCy, ~2 hours)
1. `pip install spacy && python -m spacy download en_core_web_sm`
2. Batch NER over all 15K messages — extract PERSON entities
3. Link extracted names to known entities (fuzzy match)
4. Discover new entities not in the DB
5. Build body co-mention edges
6. Update graph with new edges

### Phase 3: LLM Enrichment (ollama or API, ~3 hours)
1. Select ~2,000 "interesting" messages (multi-person, relationship phrases)
2. Run structured extraction via LLM
3. Extract typed relationships (legal, social, financial, travel)
4. Extract locations per message
5. Topic classification per thread
6. Store in relationships table with context

### Phase 4: Graph Analytics (networkx, ~2 hours)
1. `pip install networkx python-louvain`
2. Run Louvain community detection
3. Compute betweenness centrality, PageRank
4. Build temporal graph slices
5. Store computed metrics in entity_profiles
6. Frontend: community view, temporal slider, shortest path

### Phase 5: Advanced UI (~3 hours)
1. Person profile page with full relationship breakdown
2. Relationship explorer (click any edge)
3. Temporal network animation
4. Location view
5. Topic clusters view
6. Export capabilities (CSV, GraphML)

---

## Dependencies

```
Phase 1: none (pure Python + sqlite3)
Phase 2: spacy, en_core_web_sm
Phase 3: ollama (local) OR anthropic/openai SDK
Phase 4: networkx, python-louvain (or cdlib)
Frontend: D3.js (already have it)
```

---

## Open Questions

1. Should we use ollama locally or an API for LLM extraction? Local is free but slower. API is fast but costs ~$5.
2. How to handle redacted entities (█ blocks)? Treat as unknown? Try to infer from context?
3. Should we build a separate extraction pipeline script or integrate into the ingest script?
4. Do we want to support incremental updates (new data from jmail.world) or is this a one-shot analysis?
5. How much manual curation is acceptable? The entity aliases probably need 30 minutes of human review for the top 50.
