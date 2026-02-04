# SPEC: LinkStash

## Overview
A personal link bookmarking system that collects URLs, extracts metadata, indexes them for keyword search, and displays them in a searchable single-page website. Optimized for minimal effort input (just paste URLs) and token-efficient batch processing (no AI in the hot path).

## User Story
As a knowledge worker who finds interesting links throughout the day, I want to save them with zero effort and search them later by keyword, so that I can resurface that tweet or article I vaguely remember without maintaining tags or categories.

## Requirements

### Functional (Must Have)
- [ ] **Bulk import**: Read URLs from a text file (one per line)
- [ ] **Auto-clear**: After successful import, clear the input file
- [ ] **Metadata extraction**: Fetch title, description, image, author from each URL
- [ ] **Twitter handling**: Use fxtwitter API for Twitter/X links to get tweet text + author + image
- [ ] **Duplicate detection**: Skip URLs that already exist in the index (silent skip)
- [ ] **Keyword search**: Search across URL + extracted text fields
- [ ] **Card display**: Show each link as a card with image, title, description, source
- [ ] **Sort order**: Newest first (by date added)
- [ ] **Static site**: Single HTML page that loads data from JSON

### Non-Functional
- **Performance**: No specific target, but search should feel instant for ~1000 links
- **Scale**: Start with ~100 links, expect ~10-25 new per week (~1000+ in first year)
- **Token efficiency**: No AI tokens used in import or search — all processing is deterministic
- **Hosting**: Static site deployable to GitHub Pages or Vercel

## Technical Decisions

| Decision | Choice | Reasoning |
|----------|--------|-----------|
| Storage | JSON file (`links.json`) | Simple, portable, sufficient for expected scale |
| Twitter metadata | fxtwitter.com API | Free, reliable, returns tweet text + author + media |
| Other metadata | og:tags via HTML fetch | Standard approach, best-effort extraction |
| Search | Client-side JS filter | No backend needed, instant for <5000 items |
| Frontend | Vanilla HTML/CSS/JS | No build step, dead simple, fast to load |
| Hosting | GitHub Pages | Free, static, easy deploy |

## User Flows

### 1. Adding Links (Happy Path)
1. User finds interesting link
2. User pastes URL into `input.txt` (one per line, can batch multiple)
3. User runs `./process.sh` (or npm script)
4. Script reads `input.txt`, fetches metadata for each URL
5. Script appends new entries to `links.json`
6. Script clears `input.txt`
7. User deploys updated site (or auto-deploys via GitHub Actions)

### 2. Searching Links (Happy Path)
1. User opens the website
2. User types keyword in search bar (e.g., "qmd")
3. Page filters cards in real-time to show matches
4. User clicks card to open original link

### 3. Error Path — Metadata Fetch Fails
1. Script attempts to fetch metadata
2. Fetch fails (timeout, 404, blocked)
3. Script saves link with URL only (title = URL, description = empty)
4. Link is still searchable by URL but may have poor discoverability
5. [FUTURE] Could flag these for manual review

## Edge Cases

| Scenario | Handling |
|----------|----------|
| Duplicate URL submitted | Skip silently, do not update existing entry |
| Twitter link | Use fxtwitter.com/[user]/status/[id] to fetch metadata |
| YouTube link | Fetch og:tags (title, thumbnail, channel in description) |
| Metadata fetch fails | Save with URL as title, empty description |
| Empty input file | Script exits cleanly, no changes |
| Malformed URL in input | Skip with warning in console, continue processing others |
| Link goes dead later | Keep showing with saved metadata (v1 behavior) |

## Open Questions (Resolved)

- **Q**: Should we support multiple input methods (CLI, browser extension, etc.)?  
  **A**: No — text file only for v1. Simplest possible. — 2026-02-03

- **Q**: Should search be fuzzy/semantic?  
  **A**: No — exact keyword match for v1. — 2026-02-03

- **Q**: Should we categorize or tag links?  
  **A**: No — zero-effort input means no manual tagging. Search is the only retrieval method. — 2026-02-03

- **Q**: Mobile support?  
  **A**: Don't care, but probably easy enough to make responsive. — 2026-02-03

## Assumptions

- `[ASSUMPTION]`: fxtwitter.com API will remain free and accessible
- `[ASSUMPTION]`: Most links will have reasonable og:tags for metadata extraction
- `[ASSUMPTION]`: ~1000 links is searchable client-side without performance issues
- `[ASSUMPTION]`: User will manually trigger deploys (or set up GitHub Actions separately)

## Out of Scope (v1)

- [ ] Browser extension for one-click save
- [ ] CLI command for adding single links
- [ ] Automatic categorization or tagging
- [ ] Semantic/fuzzy search
- [ ] Link health checking (detecting dead links)
- [ ] Authentication or private links
- [ ] Mobile app
- [ ] Real-time sync across devices
- [ ] AI-powered summarization of link content

## Acceptance Criteria

1. [ ] Can add links via `input.txt` and run processor script
2. [ ] Script extracts metadata from Twitter links via fxtwitter
3. [ ] Script extracts og:tags from non-Twitter links
4. [ ] Duplicate links are skipped silently
5. [ ] `input.txt` is cleared after successful processing
6. [ ] Website displays all links as cards (image, title, description)
7. [ ] Search bar filters cards by keyword in real-time
8. [ ] Cards sorted newest first
9. [ ] Site deployable to GitHub Pages
10. [ ] All tests pass
11. [ ] Code review approved

## Handoff Checklist

- [x] Core Functionality — defined (import → process → display → search)
- [x] Success Criteria — defined (importer works, search works)
- [x] Edge Cases — documented (duplicates, failed fetches, malformed URLs)
- [x] Scope Boundaries — clear (text file input only, keyword search only, static site)
- [x] Ready for architecture phase
