/**
 * Tests for process.js (file I/O and processor pipeline)
 */

const fs = require('fs');
const path = require('path');
const {
  readInputFile,
  readLinksFile,
  writeLinksFile,
  clearInputFile,
  processUrl,
  processLinks
} = require('../process');

// Test fixtures directory
const FIXTURES_DIR = path.join(__dirname, 'fixtures');
const TEST_INPUT = path.join(FIXTURES_DIR, 'test-input.txt');
const TEST_LINKS = path.join(FIXTURES_DIR, 'test-links.json');

// Setup and teardown
beforeAll(() => {
  if (!fs.existsSync(FIXTURES_DIR)) {
    fs.mkdirSync(FIXTURES_DIR, { recursive: true });
  }
});

afterEach(() => {
  // Clean up test files
  [TEST_INPUT, TEST_LINKS].forEach(file => {
    if (fs.existsSync(file)) {
      fs.unlinkSync(file);
    }
  });
});

afterAll(() => {
  // Remove fixtures directory if empty
  if (fs.existsSync(FIXTURES_DIR) && fs.readdirSync(FIXTURES_DIR).length === 0) {
    fs.rmdirSync(FIXTURES_DIR);
  }
});

describe('readInputFile', () => {
  test('reads single URL', () => {
    fs.writeFileSync(TEST_INPUT, 'https://example.com\n');
    const urls = readInputFile(TEST_INPUT);
    expect(urls).toEqual(['https://example.com']);
  });

  test('reads multiple URLs', () => {
    fs.writeFileSync(TEST_INPUT, 'https://example.com\nhttps://github.com\nhttps://twitter.com\n');
    const urls = readInputFile(TEST_INPUT);
    expect(urls).toEqual(['https://example.com', 'https://github.com', 'https://twitter.com']);
  });

  test('ignores empty lines', () => {
    fs.writeFileSync(TEST_INPUT, 'https://example.com\n\n\nhttps://github.com\n');
    const urls = readInputFile(TEST_INPUT);
    expect(urls).toEqual(['https://example.com', 'https://github.com']);
  });

  test('ignores comment lines', () => {
    fs.writeFileSync(TEST_INPUT, '# This is a comment\nhttps://example.com\n# Another comment\n');
    const urls = readInputFile(TEST_INPUT);
    expect(urls).toEqual(['https://example.com']);
  });

  test('trims whitespace from URLs', () => {
    fs.writeFileSync(TEST_INPUT, '  https://example.com  \n\thttps://github.com\t\n');
    const urls = readInputFile(TEST_INPUT);
    expect(urls).toEqual(['https://example.com', 'https://github.com']);
  });

  test('returns empty array for missing file', () => {
    const urls = readInputFile('/nonexistent/path/input.txt');
    expect(urls).toEqual([]);
  });

  test('returns empty array for empty file', () => {
    fs.writeFileSync(TEST_INPUT, '');
    const urls = readInputFile(TEST_INPUT);
    expect(urls).toEqual([]);
  });
});

describe('readLinksFile', () => {
  test('reads valid JSON array', () => {
    const testLinks = [
      { id: '1', url: 'https://example.com', title: 'Example' }
    ];
    fs.writeFileSync(TEST_LINKS, JSON.stringify(testLinks));
    
    const links = readLinksFile(TEST_LINKS);
    expect(links).toEqual(testLinks);
  });

  test('returns empty array for missing file', () => {
    const links = readLinksFile('/nonexistent/links.json');
    expect(links).toEqual([]);
  });

  test('returns empty array for empty file', () => {
    fs.writeFileSync(TEST_LINKS, '');
    const links = readLinksFile(TEST_LINKS);
    expect(links).toEqual([]);
  });

  test('returns empty array for whitespace-only file', () => {
    fs.writeFileSync(TEST_LINKS, '  \n  ');
    const links = readLinksFile(TEST_LINKS);
    expect(links).toEqual([]);
  });

  test('throws error for invalid JSON', () => {
    fs.writeFileSync(TEST_LINKS, 'not valid json');
    expect(() => readLinksFile(TEST_LINKS)).toThrow('Invalid JSON');
  });

  test('throws error for non-array JSON', () => {
    fs.writeFileSync(TEST_LINKS, '{"not": "an array"}');
    expect(() => readLinksFile(TEST_LINKS)).toThrow('must contain an array');
  });
});

describe('writeLinksFile', () => {
  test('writes links array as pretty-printed JSON', () => {
    const testLinks = [
      { id: '1', url: 'https://example.com', title: 'Example' }
    ];
    
    writeLinksFile(TEST_LINKS, testLinks);
    
    const content = fs.readFileSync(TEST_LINKS, 'utf8');
    expect(content).toContain('"id": "1"');
    expect(content).toContain('"url": "https://example.com"');
    expect(JSON.parse(content)).toEqual(testLinks);
  });

  test('preserves order of links', () => {
    const testLinks = [
      { id: '1', title: 'First' },
      { id: '2', title: 'Second' },
      { id: '3', title: 'Third' }
    ];
    
    writeLinksFile(TEST_LINKS, testLinks);
    const parsed = JSON.parse(fs.readFileSync(TEST_LINKS, 'utf8'));
    
    expect(parsed[0].title).toBe('First');
    expect(parsed[1].title).toBe('Second');
    expect(parsed[2].title).toBe('Third');
  });

  test('creates file if it does not exist', () => {
    expect(fs.existsSync(TEST_LINKS)).toBe(false);
    writeLinksFile(TEST_LINKS, []);
    expect(fs.existsSync(TEST_LINKS)).toBe(true);
  });
});

describe('clearInputFile', () => {
  test('clears file content', () => {
    fs.writeFileSync(TEST_INPUT, 'https://example.com\nhttps://github.com\n');
    expect(fs.readFileSync(TEST_INPUT, 'utf8').length).toBeGreaterThan(0);
    
    clearInputFile(TEST_INPUT);
    
    expect(fs.readFileSync(TEST_INPUT, 'utf8')).toBe('');
  });

  test('does not throw for missing file', () => {
    expect(() => clearInputFile('/nonexistent/input.txt')).not.toThrow();
  });
});

describe('processUrl', () => {
  test('skips invalid URLs', async () => {
    const result = await processUrl('not a url', []);
    expect(result.status).toBe('skipped');
    expect(result.reason).toBe('invalid URL');
  });

  test('skips duplicate URLs', async () => {
    const existingLinks = [{ url: 'https://example.com' }];
    const result = await processUrl('https://example.com', existingLinks);
    expect(result.status).toBe('skipped');
    expect(result.reason).toBe('duplicate');
  });

  test('processes valid non-duplicate URL', async () => {
    const result = await processUrl('https://example.com', []);
    expect(result.status).toBe('added');
    expect(result.link).toBeDefined();
    expect(result.link.url).toBe('https://example.com');
    expect(result.link.id).toBeDefined();
    expect(result.link.added).toBeDefined();
  });
});

describe('processLinks (integration)', () => {
  // Mock fetch for integration tests
  const originalFetch = global.fetch;
  
  beforeEach(() => {
    // Mock the dynamic import of node-fetch
    jest.mock('node-fetch', () => jest.fn().mockResolvedValue({
      ok: true,
      headers: { get: () => 'text/html' },
      text: () => Promise.resolve('<html><head><title>Test Page</title></head></html>')
    }));
  });

  afterEach(() => {
    jest.resetModules();
  });

  test('processes input file and updates links.json', async () => {
    fs.writeFileSync(TEST_INPUT, 'https://example.com\nhttps://github.com\n');
    fs.writeFileSync(TEST_LINKS, '[]');

    const result = await processLinks({
      inputPath: TEST_INPUT,
      linksPath: TEST_LINKS
    });

    expect(result.added).toBe(2);
    expect(result.skipped).toBe(0);
    
    const links = JSON.parse(fs.readFileSync(TEST_LINKS, 'utf8'));
    expect(links.length).toBe(2);
    expect(links[0].url).toBe('https://example.com');
    expect(links[1].url).toBe('https://github.com');
  });

  test('clears input file after processing', async () => {
    fs.writeFileSync(TEST_INPUT, 'https://example.com\n');
    fs.writeFileSync(TEST_LINKS, '[]');

    await processLinks({
      inputPath: TEST_INPUT,
      linksPath: TEST_LINKS
    });

    expect(fs.readFileSync(TEST_INPUT, 'utf8')).toBe('');
  });

  test('skips duplicates and reports correctly', async () => {
    fs.writeFileSync(TEST_INPUT, 'https://example.com\nhttps://newsite.com\n');
    fs.writeFileSync(TEST_LINKS, JSON.stringify([{ url: 'https://example.com' }]));

    const result = await processLinks({
      inputPath: TEST_INPUT,
      linksPath: TEST_LINKS
    });

    expect(result.added).toBe(1);
    expect(result.skipped).toBe(1);
    
    const links = JSON.parse(fs.readFileSync(TEST_LINKS, 'utf8'));
    expect(links.length).toBe(2);
  });

  test('handles empty input file gracefully', async () => {
    fs.writeFileSync(TEST_INPUT, '');
    fs.writeFileSync(TEST_LINKS, '[]');

    const result = await processLinks({
      inputPath: TEST_INPUT,
      linksPath: TEST_LINKS
    });

    expect(result.added).toBe(0);
    expect(result.skipped).toBe(0);
    expect(result.failed).toBe(0);
  });

  test('preserves existing links when adding new ones', async () => {
    const existingLinks = [
      { id: 'existing-1', url: 'https://old.com', title: 'Old Link' }
    ];
    fs.writeFileSync(TEST_INPUT, 'https://new.com\n');
    fs.writeFileSync(TEST_LINKS, JSON.stringify(existingLinks));

    await processLinks({
      inputPath: TEST_INPUT,
      linksPath: TEST_LINKS
    });

    const links = JSON.parse(fs.readFileSync(TEST_LINKS, 'utf8'));
    expect(links.length).toBe(2);
    expect(links[0].id).toBe('existing-1');
    expect(links[0].title).toBe('Old Link');
  });

  test('skips invalid URLs and continues processing', async () => {
    fs.writeFileSync(TEST_INPUT, 'not-a-url\nhttps://valid.com\n');
    fs.writeFileSync(TEST_LINKS, '[]');

    const result = await processLinks({
      inputPath: TEST_INPUT,
      linksPath: TEST_LINKS
    });

    expect(result.added).toBe(1);
    expect(result.skipped).toBe(1);
    
    const links = JSON.parse(fs.readFileSync(TEST_LINKS, 'utf8'));
    expect(links.length).toBe(1);
    expect(links[0].url).toBe('https://valid.com');
  });
});
