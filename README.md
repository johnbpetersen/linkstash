# LinkStash 📚

A zero-friction personal link bookmarking system. Paste URLs into a text file, run the processor, and search your collection through a clean static website.

**No tags. No categories. No AI. Just URLs in, searchable links out.**

## Quick Start

```bash
# Install dependencies
npm install

# Add URLs to input.txt (one per line)
echo "https://github.com" >> input.txt
echo "https://news.ycombinator.com" >> input.txt

# Process the URLs
npm run dev

# Open the site in your browser
open index.html  # macOS
xdg-open index.html  # Linux
start index.html  # Windows
```

## How It Works

1. **Add URLs** — Paste URLs into `input.txt`, one per line
2. **Process** — Run `npm run dev` (or `node process.js`)
3. **Browse** — Open `index.html` to see your links as searchable cards
4. **Search** — Type keywords to filter cards instantly

```
input.txt → process.js → links.json → index.html
```

## Features

- **Zero-effort input**: Just paste URLs. No tagging, no categorizing.
- **Automatic metadata**: Extracts titles, descriptions, and images from pages
- **Twitter/X support**: Uses fxtwitter API for tweet text and media
- **Duplicate detection**: Skip URLs you've already saved
- **Instant search**: Client-side filtering across title, description, URL, and author
- **Dark mode**: Automatic based on system preference
- **Static site**: No backend needed. Deploy anywhere.

## Input Format

`input.txt` accepts:
- One URL per line
- Comments starting with `#`
- Empty lines (ignored)

```text
# News articles
https://example.com/article1
https://example.com/article2

# Social media
https://twitter.com/user/status/123456
https://x.com/user/status/789012
```

## Commands

| Command | Description |
|---------|-------------|
| `npm run dev` | Process URLs from input.txt |
| `npm test` | Run test suite |
| `node process.js` | Same as npm run dev |

## Deploy to GitHub Pages

1. Push your repo to GitHub
2. Go to Settings → Pages
3. Select "Deploy from branch" → main → root
4. Your site is live at `https://[username].github.io/linkstash`

```bash
git add index.html links.json
git commit -m "Update links"
git push origin main
```

## Project Structure

```
linkstash/
├── process.js          # Main processor script
├── index.html          # Frontend (HTML + CSS + JS)
├── links.json          # Your saved links (JSON array)
├── input.txt           # URLs to process (cleared after each run)
├── src/
│   ├── metadata-extractor.js  # Fetch og:tags and Twitter data
│   └── link-model.js          # Link creation and deduplication
├── tests/              # Jest test suite
├── decisions/          # Architecture Decision Records
└── package.json        # Dependencies and scripts
```

## Data Schema

Each link in `links.json`:

```json
{
  "id": "uuid-v4",
  "url": "https://example.com/article",
  "title": "Article Title",
  "description": "Article description...",
  "image": "https://example.com/image.jpg",
  "author": "Author Name",
  "added": "2024-01-15T10:30:00.000Z",
  "source": "web"
}
```

**Source types**: `twitter`, `youtube`, `github`, `web`

## Configuration

No configuration needed. The system works out of the box.

**File locations** (relative to project root):
- Input: `input.txt`
- Storage: `links.json`
- Frontend: `index.html`

## Error Handling

| Scenario | Behavior |
|----------|----------|
| Invalid URL | Skipped with warning, other URLs processed |
| Duplicate URL | Silently skipped |
| Fetch failure | Link saved with URL as title |
| Empty input | No changes, clean exit |

## Architecture

See [ARCHITECTURE.md](ARCHITECTURE.md) for technical details and decisions.

## Testing

```bash
# Run all tests
npm test

# Run with verbose output
npx jest --verbose

# Run specific test file
npx jest tests/integration.test.js
```

## License

MIT
