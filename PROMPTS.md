# PROMPTS: LinkStash

Execute these prompts in order. Each builds on the previous. Check off in `TODO.md` as you complete each.

---

## Prompt 1: Project Setup & Dependencies

**Time Estimate**: 15 minutes

```text
Initialize a new Node.js project for LinkStash.

1. Create package.json with:
   - name: "linkstash"
   - description: "Personal link bookmarking system"
   - main: "process.js"
   - scripts: { "test": "jest", "dev": "node process.js" }
   - dependencies: "node-fetch" (v3+), "cheerio" (for HTML parsing), "uuid"
   - devDependencies: "jest" (for testing)

2. Run `npm install` to install all dependencies.

3. Create project structure:
   - process.js (stub: empty, will fill in next prompts)
   - index.html (stub: empty, will fill in later)
   - links.json (empty array: [])
   - input.txt (empty, user will add URLs here)
   - tests/ (create directory)
   - decisions/ (already exists, contains ADRs)

4. Create a simple health check test:
   - File: tests/health.test.js
   - Test: Verify package.json exists and has required fields
   - Test: Verify all required files exist (process.js, index.html, links.json)
   - Run: npm test (should pass)

5. Verify:
   - `npm test` runs without errors
   - All files created
   - Node version >=16 available (check: node --version)

**Acceptance Criteria:**
- package.json has all dependencies
- npm install succeeds
- npm test passes (health checks pass)
- File structure matches ARCHITECTURE.md
```

---

## Prompt 2: Metadata Extractor (Twitter + og:tags)

**Time Estimate**: 30 minutes

```text
Create the metadata extraction logic (core of the processor).

File: src/metadata-extractor.js (or just a section in process.js if keeping it minimal)

Implement three functions:

1. extractFromTwitter(url)
   - Input: Twitter URL like "https://twitter.com/[user]/status/[id]"
   - Output: { title, description, author, image }
   - Logic: Convert URL to fxtwitter format, fetch JSON, extract fields:
     * title: Use first ~100 chars of tweet text
     * description: Full tweet text
     * image: Use first media thumbnail
     * author: Tweet author name
   - Error handling: If fetch fails, return { title: url, description: "", image: "", author: "" }

2. extractFromWeb(url)
   - Input: Any non-Twitter URL
   - Output: { title, description, image, author }
   - Logic: Fetch HTML, parse with cheerio, extract og:tags:
     * title: og:title OR <title> tag
     * description: og:description
     * image: og:image
     * author: og:author OR og:article:author
   - Error handling: If fetch fails, return { title: url, description: "", image: "", author: "" }

3. isTwitterUrl(url)
   - Input: URL string
   - Output: boolean
   - Logic: Return true if URL contains twitter.com or x.com

**Tests** (tests/metadata-extractor.test.js):
- Test isTwitterUrl() with:
  * "https://twitter.com/user/status/123" → true
  * "https://x.com/user/status/456" → true
  * "https://example.com" → false
  * "twitter.com" (no protocol) → false
  
- Test extractFromWeb() with:
  * Valid URL with og:tags → extracts title, description, image
  * Valid URL without og:tags → falls back to <title> tag
  * Invalid URL (404) → returns { title: url, description: "" }
  
- Test extractFromTwitter() with:
  * Valid Twitter URL → extracts tweet text, author, media
  * Invalid/deleted tweet → returns { title: url, description: "" }

**Acceptance Criteria:**
- isTwitterUrl() correctly identifies Twitter/X URLs
- extractFromWeb() fetches HTML and parses og:tags
- extractFromTwitter() fetches from fxtwitter API
- Both gracefully degrade on error (return minimal data, don't throw)
- All tests pass
- No actual API calls in test mode (use mocks for HTTP)
```

---

## Prompt 3: Link Deduplication & Object Creation

**Time Estimate**: 20 minutes

```text
Create the link object factory and deduplication logic.

File: src/link-model.js (or in process.js)

Implement:

1. createLinkObject(url, metadata)
   - Input:
     * url: string (the original URL)
     * metadata: { title, description, image, author }
   - Output: { id, url, title, description, image, author, added, source }
   - Logic:
     * id: Generate UUID v4
     * url: Use input URL
     * title, description, image, author: Use metadata (or defaults)
     * added: Current ISO timestamp (new Date().toISOString())
     * source: Infer from URL ("twitter" if Twitter URL, else "web")
   - Validation: Throw error if URL is empty or invalid

2. isDuplicate(url, links)
   - Input:
     * url: string (candidate URL)
     * links: array of existing link objects
   - Output: boolean
   - Logic: Scan links array, check if any link.url === url (case-insensitive)

3. normalizeUrl(url)
   - Input: URL string
   - Output: Normalized URL for comparison
   - Logic: 
     * Remove trailing slashes
     * Lowercase domain
     * Return canonical form
   - Note: Use this in isDuplicate() for robust comparison

**Tests** (tests/link-model.test.js):
- Test createLinkObject():
  * Creates link with all fields
  * Generates unique UUID
  * Timestamp is recent (within last 5 seconds)
  * source is "twitter" for Twitter URLs, "web" otherwise
  
- Test isDuplicate():
  * Same URL → true (even with trailing slash variation)
  * Different URL → false
  * Case-insensitive match → true
  * Empty links array → false
  
- Test normalizeUrl():
  * "https://example.com/" → "https://example.com" (remove trailing slash)
  * "HTTPS://EXAMPLE.COM" → "https://example.com" (lowercase)

**Acceptance Criteria:**
- createLinkObject() returns valid link with all required fields
- isDuplicate() correctly identifies duplicates
- normalizeUrl() handles edge cases
- All tests pass
- No external dependencies for core logic (just uuid module)
```

---

## Prompt 4: File I/O & Processor Pipeline

**Time Estimate**: 25 minutes

```text
Create the main processor script that ties everything together.

File: process.js

Implement:

1. readInputFile(path)
   - Input: File path (default: "input.txt")
   - Output: Array of URLs (one per line)
   - Logic:
     * Read file as text
     * Split by newline
     * Filter out empty lines and comments (lines starting with #)
     * Trim whitespace from each URL
     * Return array of URLs
   - Error handling: If file doesn't exist or is empty, return []

2. readLinksFile(path)
   - Input: File path (default: "links.json")
   - Output: Array of link objects
   - Logic:
     * Read file as JSON
     * Return array (or [] if file is empty)
   - Error handling: If file missing, return []

3. writeLinksFile(path, links)
   - Input:
     * path: File path (default: "links.json")
     * links: Array of link objects
   - Logic:
     * Write array as JSON (pretty-printed, 2-space indent)
     * Preserve order (array order is append order)
   - Error handling: Throw error with descriptive message if write fails

4. clearInputFile(path)
   - Input: File path (default: "input.txt")
   - Logic: Overwrite file with empty string
   - Error handling: Log warning if clear fails, don't crash

5. processLinks() [MAIN FUNCTION]
   - Logic (orchestrates full pipeline):
     a. Read input.txt → urls array
     b. If urls is empty, log "No URLs to process" and exit
     c. Read links.json → existing links array
     d. For each URL in urls:
        i. If isDuplicate(url, existing links) → log "Skipped: [url] (duplicate)", continue
        ii. Fetch metadata (cascade: Twitter → web)
        iii. Create link object
        iv. Append to links array
     e. Write updated links array to links.json
     f. Clear input.txt
     g. Log summary: "[X] links added, [Y] skipped, [Z] failed"

6. Main execution:
   - Call processLinks() and handle any thrown errors
   - Log final summary

**Tests** (tests/process.test.js):
- Test readInputFile():
  * Single URL → [url]
  * Multiple URLs → [url1, url2, ...]
  * Empty lines are ignored → correct count
  * Comments (# prefix) are ignored
  * Missing file → []
  
- Test readLinksFile():
  * Valid JSON → parsed array
  * Empty file → []
  * Invalid JSON → throw error
  
- Test writeLinksFile():
  * Write links → read back successfully
  * File is pretty-printed JSON
  * Order is preserved
  
- Test clearInputFile():
  * File becomes empty after clear
  
- Integration test:
  * Full pipeline: input.txt with 3 URLs → process → links.json has 3 new entries, input.txt is cleared
  * Duplicate handling: input.txt has 2 URLs, 1 is duplicate → only 1 added, 1 skipped

**Acceptance Criteria:**
- process.js successfully reads input.txt
- Metadata is fetched for each URL
- Duplicates are detected and skipped
- links.json is updated correctly
- input.txt is cleared after processing
- All tests pass
- Run `node process.js` successfully
```

---

## Prompt 5: Frontend — HTML Structure & CSS Styling

**Time Estimate**: 25 minutes

```text
Create the HTML structure and styling for the frontend.

File: index.html

Requirements:

1. HTML Structure:
   - DOCTYPE and semantic HTML5
   - Head: title, meta tags, embedded CSS
   - Body: 
     * Header with site title (e.g., "LinkStash")
     * Search input field (id="search", placeholder="Search links...")
     * Container div for cards (id="cards")
   - Footer with simple info (optional)

2. CSS Styling (embedded in <style> tag):
   - Responsive layout:
     * Desktop (default): 3-4 columns of cards
     * Tablet: 2 columns
     * Mobile: 1 column
   - Card styling:
     * Image at top (with max-height, aspect-ratio preserved)
     * Title as heading
     * Description text
     * Source/date small text at bottom
     * Hover effect (subtle shadow or scale)
     * Cursor: pointer
   - Search bar:
     * Full-width input at top
     * Padding, rounded corners, border
     * Focus state (outline or background change)
   - General:
     * Clean, minimalist design
     * Good contrast for readability
     * Mobile-friendly
     * No external CSS files (embedded only)

3. Sample Card HTML (template for JS to replicate):
   ```html
   <div class="card" onclick="openLink('URL')">
     <img src="IMAGE_URL" alt="TITLE" class="card-image">
     <h3 class="card-title">TITLE</h3>
     <p class="card-description">DESCRIPTION</p>
     <p class="card-meta">Added: DATE | Source: SOURCE</p>
   </div>
   ```

4. Testing (Manual):
   - Open index.html in browser (no server needed, use file:// protocol)
   - Verify layout looks good
   - Search input is visible and functional (will add JS next)
   - Responsive: test on desktop, tablet, mobile (use browser dev tools)

**Acceptance Criteria:**
- HTML is valid and semantic
- CSS is responsive (looks good on 320px, 768px, 1920px widths)
- Card layout is clear and readable
- Search bar is prominent
- No external files (CSS embedded)
- index.html can be opened directly in browser (file:// protocol)
```

---

## Prompt 6: Frontend — JavaScript (Load, Render, Search, Sort)

**Time Estimate**: 30 minutes

```text
Implement the JavaScript logic for loading, rendering, searching, and sorting.

File: index.html (add JavaScript in <script> section)

Implement:

1. loadLinks()
   - Fetch links.json via fetch() API
   - Parse JSON
   - Call renderCards(links)
   - Error handling: If fetch fails, display "Failed to load links" message

2. renderCards(links)
   - Input: Array of link objects
   - Logic:
     a. Get element with id="cards"
     b. Clear previous cards (innerHTML = "")
     c. If links is empty, display "No links yet"
     d. For each link in links:
        i. Create card HTML (using template from Prompt 5)
        ii. Set image src, title, description, meta
        iii. Append to cards container
   - Use onclick handlers to open links

3. sortByDate(links)
   - Input: Array of links
   - Output: Sorted array (newest first)
   - Logic: Sort by added field, descending

4. filterLinks(query)
   - Input: Search query string (e.g., "python")
   - Output: Filtered array of links matching query
   - Logic:
     a. If query is empty, return all links
     b. Lowercase query
     c. For each link, check if query appears in:
        - title (case-insensitive)
        - description (case-insensitive)
        - url (case-insensitive)
        - author (case-insensitive)
     d. Return only matching links
   - Note: Simple substring match (not fuzzy, not regex)

5. openLink(url)
   - Input: URL
   - Logic: window.open(url, "_blank") — open in new tab

6. setupSearch()
   - Attach event listener to search input (id="search")
   - On input change:
     a. Get current query from input.value
     b. Filter links: filtered = filterLinks(query)
     c. Sort: filtered = sortByDate(filtered)
     d. Render: renderCards(filtered)

7. Initialize on page load:
   - Document.DOMContentLoaded event:
     a. loadLinks() → fetch and store links in global variable
     b. Call renderCards(links)
     c. Call setupSearch()

**Tests** (Manual or Jest):
- Test filterLinks():
  * "python" matches "Python Tutorial" → included
  * "python" does not match "JavaScript Guide" → excluded
  * "" (empty) returns all links
  * Case-insensitive matching works
  
- Test sortByDate():
  * Links sorted newest first
  * Date ordering is correct
  
- Test renderCards():
  * Loads all links when called
  * Displays correct number of cards
  * Card content matches data
  * Empty array shows "No links yet"

**Acceptance Criteria:**
- Page loads links.json successfully
- Cards render with images, titles, descriptions
- Search filters in real-time as user types
- Results sorted newest first
- Clicking card opens link in new tab
- All interactive features work
- No console errors
```

---

## Prompt 7: Integration Testing & End-to-End Workflow

**Time Estimate**: 20 minutes

```text
Write comprehensive tests for the full end-to-end workflow.

Files: tests/integration.test.js

Test scenarios:

1. Full Pipeline Test:
   - Setup: Create input.txt with 3 test URLs
   - Run: node process.js
   - Verify:
     * links.json now has 3 entries
     * Each entry has required fields (id, url, title, description, added, source)
     * input.txt is now empty
     * Metadata was extracted (titles are not empty)

2. Duplicate Detection Test:
   - Setup: links.json already has URL "https://example.com"
   - Input: input.txt with "https://example.com"
   - Run: node process.js
   - Verify:
     * links.json still has only 1 entry (duplicate was skipped)
     * Console logs "Skipped: https://example.com (duplicate)"

3. Error Handling Test:
   - Setup: input.txt with invalid URLs (malformed, non-existent, etc.)
   - Run: node process.js
   - Verify:
     * Invalid URLs are logged with warning
     * Valid URLs in same batch are still processed
     * Script doesn't crash

4. Metadata Extraction Test:
   - Setup: input.txt with:
     * 1 Twitter URL
     * 1 web URL with og:tags
     * 1 web URL without og:tags
   - Run: node process.js
   - Verify:
     * Twitter URL has tweet text in description
     * Web URL with og:tags has extracted metadata
     * Web URL without og:tags has fallback (title = URL or <title> tag)

5. Frontend Integration Test (Manual):
   - Add entries to links.json (or use existing from processor)
   - Open index.html in browser
   - Verify:
     * All links display as cards
     * Search filters results
     * Newest first sort is correct
     * Clicking a card opens the link

**Acceptance Criteria:**
- All integration tests pass
- Full pipeline works end-to-end (input → process → output → display)
- Error cases handled gracefully
- Frontend and processor work together
- No manual intervention needed (automated tests)
```

---

## Prompt 8: Polish, Documentation & Deployment Setup

**Time Estimate**: 30 minutes

```text
Clean up code, add documentation, and prepare for deployment.

Files to create/update:
- README.md
- .gitignore
- package.json (optional: add deploy script)

1. Create README.md with:
   - Project overview (1-2 sentences)
   - Quick start:
     * npm install
     * Add URLs to input.txt
     * npm run dev
     * Open index.html in browser
   - How to deploy to GitHub Pages:
     * Commit index.html, links.json
     * Push to main branch
     * Site auto-available at https://[username].github.io/linkstash
   - Architecture overview (link to ARCHITECTURE.md)
   - Contributing / reporting issues

2. Create .gitignore:
   - node_modules/
   - .DS_Store
   - *.log
   - (Keep links.json and input.txt in repo, they're data)

3. Code cleanup:
   - Remove all console.log statements except user-facing output
   - Add JSDoc comments to all functions
   - Remove TODO/FIXME comments
   - Ensure consistent indentation (2 spaces)
   - Run npm test one final time (all pass)

4. Update package.json:
   - scripts:
     * "test": "jest"
     * "dev": "node process.js"
     * "lint": "eslint ." (optional, for future)
   - add repository, author, license fields

5. Final verification checklist:
   - [ ] npm install succeeds
   - [ ] npm test passes
   - [ ] npm run dev (or node process.js) works without errors
   - [ ] index.html opens in browser
   - [ ] All features work (search, sort, link open)
   - [ ] Code is clean (no console spam, good comments)
   - [ ] README is helpful and complete
   - [ ] .gitignore prevents committing node_modules
   - [ ] All files documented

6. Deployment verification:
   - Push to GitHub
   - Enable GitHub Pages in repo settings
   - Verify site loads at GitHub Pages URL
   - Test search and link opening on live site

**Acceptance Criteria:**
- Code is clean and well-documented
- README provides clear setup/usage/deploy instructions
- npm test passes
- Can push to GitHub and auto-deploy
- All features verified working
- Ready for public use
```

---

## Final Prompt: Full System Test & Demo

**Time Estimate**: 15 minutes

```text
Run end-to-end system test with real data and verify all acceptance criteria from SPEC.

Test Workflow:

1. Reset and start fresh:
   - Delete links.json (or backup it)
   - Create fresh links.json with []
   - Clear input.txt

2. Add batch of test URLs to input.txt:
   - Include: 1 Twitter URL, 3 web URLs, 1 duplicate
   - Example:
     ```
     https://twitter.com/username/status/1234567890
     https://github.com/user/repo
     https://news.ycombinator.com/item?id=123
     https://twitter.com/username/status/1234567890
     https://blog.example.com/article
     ```

3. Run processor:
   - node process.js
   - Verify: Links added, duplicate skipped, input.txt cleared

4. Test frontend:
   - Open index.html in browser
   - Verify all links display (should be 4, not 5)
   - Search test: Type "twitter" → only Twitter card shows
   - Search test: Type "github" → GitHub card shows
   - Sort test: Verify newest added at top
   - Click test: Click card → opens original link in new tab

5. Verify spec acceptance criteria:
   - [ ] Can add links via input.txt
   - [ ] Script extracts metadata (titles, descriptions visible)
   - [ ] Duplicate links skipped silently
   - [ ] input.txt cleared after processing
   - [ ] Website displays cards with image, title, description
   - [ ] Search filters in real-time
   - [ ] Sorted newest first
   - [ ] All tests pass
   - [ ] Site deployable to GitHub Pages

**Acceptance Criteria:**
- All spec requirements met
- No errors or warnings in console
- Full workflow (input → process → display → search) works perfectly
- Ready for handoff to user

---

## Prompt Checklist

Execute in order:
1. [ ] Project Setup & Dependencies
2. [ ] Metadata Extractor (Twitter + og:tags)
3. [ ] Link Deduplication & Object Creation
4. [ ] File I/O & Processor Pipeline
5. [ ] Frontend HTML & CSS
6. [ ] Frontend JavaScript
7. [ ] Integration Testing
8. [ ] Polish & Documentation
9. [ ] Full System Test & Demo

**Total Estimated Time**: ~180 minutes (3 hours) for full implementation

Each prompt should leave the project in a working state with passing tests. Complete them sequentially.
```
