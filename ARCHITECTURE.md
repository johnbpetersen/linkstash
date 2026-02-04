# ARCHITECTURE: LinkStash

## Technical Summary

LinkStash is a zero-friction personal link bookmarking system consisting of three layers: **(1) processor** — a Node.js script that reads URLs from `input.txt`, fetches metadata (via fxtwitter for Twitter links, og:tags for others), and appends to `links.json`; **(2) storage** — a single JSON array of link objects sorted by date; **(3) frontend** — a vanilla HTML/CSS/JavaScript single-page site that displays cards and filters by keyword search. No backend, no AI, no complexity — just durable, searchable bookmarks.

## Stack

| Component | Choice | Why |
|-----------|--------|-----|
| **Language (Processor)** | Node.js + JavaScript | Simple, fast, no build step; reuses npm ecosystem |
| **Storage** | JSON array (`links.json`) | Portable, human-readable, append-only, sufficient for ~1000 items |
| **Metadata Source** | fxtwitter API + og:tags | Twitter-native support; standard metadata fallback |
| **Frontend** | Vanilla HTML/CSS/JS | Zero build step, minimal load time, no framework overhead |
| **Search** | Client-side filtering | Instant, no backend needed, works offline |
| **Hosting** | GitHub Pages (static) | Free, simple, static-site friendly |

## System Overview

```
┌─────────────────────────────────────────────────────────────┐
│  USER                                                       │
├─────────────────────────────────────────────────────────────┤
│
│  Workflow 1: Add Links (Processor)
│  ┌─────────────────────────────────────────────────────┐
│  │  input.txt  →  process.js  →  links.json            │
│  │  (URLs)        (Node.js)      (storage)             │
│  │                                                     │
│  │  1. Read input.txt (line by line)                   │
│  │  2. For each URL: fetch metadata                    │
│  │     - Twitter → fxtwitter API                       │
│  │     - Other   → og:tags (HTML parse)               │
│  │  3. Dedup check (skip if URL exists)                │
│  │  4. Append to links.json                            │
│  │  5. Clear input.txt                                 │
│  └─────────────────────────────────────────────────────┘
│
│  Workflow 2: Browse & Search (Frontend)
│  ┌─────────────────────────────────────────────────────┐
│  │  index.html (Browser)                               │
│  │                                                     │
│  │  1. Load links.json on startup                      │
│  │  2. Render cards (image, title, desc)               │
│  │  3. Sort newest first                               │
│  │  4. Filter on search input (real-time)              │
│  │  5. Click card → open original link                 │
│  └─────────────────────────────────────────────────────┘
│
└─────────────────────────────────────────────────────────────┘

GitHub Pages (Static Hosting)
  ├── index.html (with embedded CSS + JS)
  ├── links.json (link data)
  └── [optional] images/ (for cached thumbnails, future)
```

## Data Model

### links.json Schema

```json
[
  {
    "id": "uuid-v4-string",
    "url": "https://example.com/article",
    "title": "Article Title",
    "description": "Short description or article preview",
    "image": "https://example.com/image.jpg",
    "author": "Author Name (optional)",
    "added": "2026-02-03T10:30:00Z",
    "source": "twitter|web|other"
  },
  ...
]
```

**Field Details:**
- `id`: Unique identifier (UUID v4) for each link
- `url`: Original URL (used for dedup detection and opening link)
- `title`: Extracted from og:title or Twitter API; falls back to URL if unavailable
- `description`: Extracted from og:description or Twitter text; may be empty
- `image`: Extracted from og:image or Twitter media_url; may be empty
- `author`: Extracted from og:author or Twitter author name; optional
- `added`: ISO 8601 timestamp when link was imported (used for sorting)
- `source`: Where metadata came from (twitter/web/other) — for debugging/stats

**Sorting**: Array stored in insertion order; frontend sorts by `added` (newest first).

**Dedup Key**: `url` field — if a URL already exists in links.json, skip it silently.

## Key Files

```
linkstash/
├── package.json                    # npm dependencies (node-fetch, cheerio, uuid)
├── process.js                      # Main processor script (100-150 lines)
├── index.html                      # Single-page frontend (with embedded CSS + JS)
├── input.txt                       # User-pasted URLs (not in repo)
├── links.json                      # Link storage (grows with each import)
├── tests/
│   ├── process.test.js            # Processor unit + integration tests
│   └── metadata-extractor.test.js # Metadata extraction tests
├── decisions/
│   ├── ADR-001.md                 # Node.js choice
│   ├── ADR-002.md                 # Array-based storage
│   ├── ADR-003.md                 # Metadata cascade approach
│   ├── ADR-004.md                 # Client-side search
│   └── ADR-005.md                 # Vanilla frontend
└── README.md                       # User guide (how to add links, deploy)
```

## Component Breakdown

### 1. Processor (process.js)

**Responsibility**: Read URLs → fetch metadata → deduplicate → append to links.json → clear input.txt

**Pseudo-code**:
```
function processLinks():
  1. Read input.txt
  2. Parse each line as URL
  3. For each URL:
     a. If URL exists in links.json → skip (log dedup)
     b. Fetch metadata (cascade: Twitter → og:tags → minimal)
     c. Create link object with uuid, timestamp, extracted fields
     d. Append to links.json
  4. Write links.json (maintaining order)
  5. Clear input.txt
  6. Report results (X added, Y skipped, Z failed)
```

**Dependencies**:
- `node-fetch` (or built-in fetch in Node 18+) — HTTP requests
- `cheerio` — Parse HTML og:tags
- `uuid` — Generate link IDs

**Error Handling**:
- Malformed URL → log warning, skip, continue
- Fetch timeout/404 → save with URL as title, empty description
- Duplicate URL → silent skip (no error, just don't re-add)
- Invalid input.txt → exit gracefully with message

### 2. Storage (links.json)

**Responsibility**: Persistent, append-only record of all links

**Operations**:
- **Read**: Load entire array at startup (processor and frontend)
- **Append**: Add new link object (processor only)
- **Check dedup**: Scan array for URL match (processor)
- **Query**: Filter/search by keyword (frontend)
- **Sort**: By `added` timestamp (frontend, client-side)

**Format**: JSON array, human-readable, can be manually edited if needed

**Growth**: Starts empty; grows ~10-25 links/week (expected ~1000+ in year 1)

### 3. Frontend (index.html)

**Responsibility**: Display cards, provide real-time search, sort newest first

**Structure**:
```html
<!DOCTYPE html>
<html>
<head>
  <style> /* embedded CSS */ </style>
</head>
<body>
  <div id="app">
    <input id="search" placeholder="Search...">
    <div id="cards">
      <!-- cards rendered here -->
    </div>
  </div>
  <script> /* embedded JS */ </script>
</body>
</html>
```

**JavaScript Responsibilities**:
- `loadLinks()` — fetch links.json, parse JSON
- `renderCards(links)` — create DOM elements for each link
- `filterLinks(query)` — substring match across title, description, URL, author
- `sortByDate()` — sort by `added` field, newest first
- `setupSearch()` — attach event listener to search input
- `openLink(url)` — window.open(url) on card click

**User Interactions**:
1. Page loads → fetch links.json → renderCards()
2. User types in search box → filterLinks() → re-render visible cards
3. User clicks card → open original link in new tab

## Risks & Mitigations

| Risk | Mitigation |
|------|-----------|
| **fxtwitter API becomes unavailable** | Graceful fallback to generic HTML fetch for Twitter URLs; saved data remains intact |
| **Site blocked from fetching URLs (403/429)** | Log error, save link with URL only; user can manually fix metadata later (future feature) |
| **Large links.json causes frontend lag** | At 1000 items, still sub-100ms search time; optimize if grows beyond 5000 |
| **Duplicate URLs cause data corruption** | Dedup detection prevents re-import; processor logs skips for transparency |
| **GitHub Pages deployment issues** | Keep process simple (just copy files); use GitHub Actions for automation (optional, future) |
| **User accidentally clears links.json** | Recommend git version control + backups; not in-app responsibility (v1) |
| **Input.txt not cleared after processing** | Script clears it explicitly; idempotent (safe to run multiple times) |
| **Search performance at scale** | Design supports up to ~5000 items before needing server-side search; acceptable for spec scope |

## ADRs

- **ADR-001**: Node.js + JavaScript for processor — Simple, no build step, reuses npm ecosystem
- **ADR-002**: JSON array storage — Natural insertion order, easy sort/search, O(n) dedup acceptable
- **ADR-003**: Cascade metadata extraction — Twitter API + og:tags fallback + graceful degradation
- **ADR-004**: Client-side search only — Instant, no backend, works offline, sufficient for 1000 items
- **ADR-005**: Vanilla HTML/CSS/JS frontend — Zero build step, minimal load time, no framework bloat

## Implementation Constraints

- ✅ **No AI**: All processing is deterministic (HTML parsing, API calls)
- ✅ **Token efficient**: No model calls in hot path
- ✅ **Zero-effort input**: Just paste URLs; no manual tagging
- ✅ **Single-page static site**: Deployable to GitHub Pages
- ✅ **Open source friendly**: Plain JavaScript, no proprietary tools
- ⚠️ **Must-have for v1**: Dedup detection, metadata extraction, search, sort
- 📋 **Out of scope v1**: Browser extension, CLI, fuzzy search, health checks, auth, mobile app

## Deployment Strategy

1. **Local Development**:
   ```bash
   npm install
   node process.js              # Add links
   npm test                     # Run tests
   open index.html              # Browse locally
   ```

2. **GitHub Pages Deployment**:
   ```bash
   git add index.html links.json
   git commit -m "Update links"
   git push origin main          # Auto-deploys to GitHub Pages
   ```

3. **Optional GitHub Actions** (future):
   - Auto-run process.js on push to main
   - Auto-commit updated links.json
   - Auto-deploy to GitHub Pages

## Testing Strategy

**Unit Tests** (Processor):
- Metadata extraction: Twitter API call, og:tags parsing, fallback behavior
- Dedup detection: Same URL returns no duplication
- UUID generation: Each link gets unique ID
- File I/O: input.txt read, links.json append, clear input.txt

**Integration Tests**:
- Full pipeline: Read input.txt → process → update links.json → clear input.txt
- Error scenarios: Malformed URL, timeout, blocked request, duplicate
- Edge cases: Empty input, single URL, batch URLs, special characters

**Frontend Tests** (Manual for v1):
- Load links.json and render cards
- Search filters correctly (substring match)
- Sort order is newest first
- Click card opens link
- Works with 0, 10, 100, 1000 items

---

## Next Steps

See `PROMPTS.md` for sequential implementation tasks.
See `TODO.md` for progress tracking.
