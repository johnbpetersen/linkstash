# LinkStash Project Index

## Read These First

1. **SPEC.md** — Original product requirements (from PM)
2. **HANDOFF.md** — This phase is complete; what was delivered
3. **ARCHITECTURE.md** — Technical design and system overview

## Implementation Files

**For the Coder Agent:**
- **PROMPTS.md** — 9 sequential implementation tasks (START HERE for coding)
- **TODO.md** — Progress tracker (check off as you complete each prompt)

## Decision Records

Read these to understand *why* certain choices were made:
- **decisions/ADR-001.md** — Why Node.js for the processor
- **decisions/ADR-002.md** — Why JSON array storage (not object map)
- **decisions/ADR-003.md** — Why cascade metadata extraction
- **decisions/ADR-004.md** — Why client-side search (no backend)
- **decisions/ADR-005.md** — Why vanilla frontend (no framework)

## Quick Reference

### What This Project Does
- User adds links to `input.txt` (one per line)
- Runs `npm run dev` to process them
- Script fetches metadata (title, description, image)
- Frontend lets you search and browse all saved links

### Architecture in One Picture
```
input.txt → process.js → links.json → index.html (browser)
(URLs)    (Node.js)     (storage)    (search + display)
```

### Tech Stack
- **Language**: Node.js + Vanilla JS (no framework)
- **Storage**: JSON file
- **Frontend**: Single HTML file (embedded CSS + JS)
- **Metadata**: fxtwitter API (Twitter) + og:tags (web)
- **Search**: Client-side (no backend)

### Implementation Path
1. Read PROMPTS.md
2. Execute prompts 1-9 in order
3. Each prompt produces working code with tests
4. Update TODO.md as you go
5. All 9 prompts ≈ 3 hours total

## Key Decision Principles

- **Start simple** — Add complexity only when needed
- **Deterministic** — No AI, no magic, just code
- **Token efficient** — No LLM calls in the hot path
- **Zero effort input** — Just paste URLs, that's it
- **Works offline** — Frontend is static, search is client-side

## Status

✅ **ARCHITECTURE COMPLETE** — Ready for implementation

See HANDOFF.md for full summary.

---

**Next**: Coder Agent should start with Prompt 1 in PROMPTS.md
