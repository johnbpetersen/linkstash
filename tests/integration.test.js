/**
 * Integration tests for LinkStash end-to-end workflow
 */

const fs = require('fs');
const path = require('path');
const { processLinks } = require('../process');

// Test fixtures directory
const FIXTURES_DIR = path.join(__dirname, 'fixtures');
const TEST_INPUT = path.join(FIXTURES_DIR, 'integration-input.txt');
const TEST_LINKS = path.join(FIXTURES_DIR, 'integration-links.json');

// Setup and teardown
beforeAll(() => {
  if (!fs.existsSync(FIXTURES_DIR)) {
    fs.mkdirSync(FIXTURES_DIR, { recursive: true });
  }
});

beforeEach(() => {
  // Reset test files before each test
  if (fs.existsSync(TEST_INPUT)) fs.unlinkSync(TEST_INPUT);
  if (fs.existsSync(TEST_LINKS)) fs.unlinkSync(TEST_LINKS);
});

afterAll(() => {
  // Clean up test files
  [TEST_INPUT, TEST_LINKS].forEach(file => {
    if (fs.existsSync(file)) {
      fs.unlinkSync(file);
    }
  });
  // Remove fixtures directory if empty
  if (fs.existsSync(FIXTURES_DIR) && fs.readdirSync(FIXTURES_DIR).length === 0) {
    fs.rmdirSync(FIXTURES_DIR);
  }
});

describe('Full Pipeline Integration', () => {
  test('processes multiple URLs and creates links with all required fields', async () => {
    // Setup: 3 URLs in input file
    fs.writeFileSync(TEST_INPUT, [
      'https://example.com/article1',
      'https://example.com/article2',
      'https://example.com/article3'
    ].join('\n'));
    fs.writeFileSync(TEST_LINKS, '[]');

    // Run processor
    const result = await processLinks({
      inputPath: TEST_INPUT,
      linksPath: TEST_LINKS
    });

    // Verify results
    expect(result.added).toBe(3);
    expect(result.skipped).toBe(0);
    expect(result.failed).toBe(0);

    // Verify links.json has 3 entries with all required fields
    const links = JSON.parse(fs.readFileSync(TEST_LINKS, 'utf8'));
    expect(links.length).toBe(3);

    links.forEach((link, index) => {
      expect(link.id).toBeDefined();
      expect(link.id).toMatch(/^[0-9a-f-]{36}$/i); // UUID format
      expect(link.url).toBe(`https://example.com/article${index + 1}`);
      expect(link.title).toBeDefined();
      expect(typeof link.title).toBe('string');
      expect(link.added).toBeDefined();
      expect(link.added).toMatch(/^\d{4}-\d{2}-\d{2}T/); // ISO date
      expect(link.source).toBe('web');
    });

    // Verify input.txt is cleared
    expect(fs.readFileSync(TEST_INPUT, 'utf8')).toBe('');
  });

  test('metadata extraction populates title field', async () => {
    fs.writeFileSync(TEST_INPUT, 'https://example.com\n');
    fs.writeFileSync(TEST_LINKS, '[]');

    await processLinks({
      inputPath: TEST_INPUT,
      linksPath: TEST_LINKS
    });

    const links = JSON.parse(fs.readFileSync(TEST_LINKS, 'utf8'));
    expect(links.length).toBe(1);
    // Title should be non-empty (either extracted or fallback to URL)
    expect(links[0].title).toBeTruthy();
  });
});

describe('Duplicate Detection', () => {
  test('skips duplicate URLs and logs appropriately', async () => {
    // Setup: links.json already has one URL
    const existingLinks = [
      { 
        id: 'existing-id', 
        url: 'https://example.com', 
        title: 'Existing Link',
        added: '2024-01-01T00:00:00.000Z',
        source: 'web'
      }
    ];
    fs.writeFileSync(TEST_INPUT, 'https://example.com\n');
    fs.writeFileSync(TEST_LINKS, JSON.stringify(existingLinks));

    // Capture console output
    const consoleSpy = jest.spyOn(console, 'log');

    // Run processor
    const result = await processLinks({
      inputPath: TEST_INPUT,
      linksPath: TEST_LINKS
    });

    // Verify duplicate was skipped
    expect(result.added).toBe(0);
    expect(result.skipped).toBe(1);

    // Verify console logged the skip
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('Skipped: https://example.com (duplicate)')
    );

    // Verify links.json still has only 1 entry
    const links = JSON.parse(fs.readFileSync(TEST_LINKS, 'utf8'));
    expect(links.length).toBe(1);
    expect(links[0].id).toBe('existing-id');

    consoleSpy.mockRestore();
  });

  test('handles case-insensitive duplicate detection', async () => {
    const existingLinks = [{ url: 'https://example.com/Page' }];
    fs.writeFileSync(TEST_INPUT, 'https://EXAMPLE.COM/Page\n');
    fs.writeFileSync(TEST_LINKS, JSON.stringify(existingLinks));

    const result = await processLinks({
      inputPath: TEST_INPUT,
      linksPath: TEST_LINKS
    });

    expect(result.skipped).toBe(1);
    expect(result.added).toBe(0);
  });

  test('handles trailing slash variations', async () => {
    const existingLinks = [{ url: 'https://example.com/path' }];
    fs.writeFileSync(TEST_INPUT, 'https://example.com/path/\n');
    fs.writeFileSync(TEST_LINKS, JSON.stringify(existingLinks));

    const result = await processLinks({
      inputPath: TEST_INPUT,
      linksPath: TEST_LINKS
    });

    expect(result.skipped).toBe(1);
    expect(result.added).toBe(0);
  });
});

describe('Error Handling', () => {
  test('skips invalid URLs with warning and continues processing', async () => {
    fs.writeFileSync(TEST_INPUT, [
      'not-a-valid-url',
      'https://valid.com',
      'another-invalid',
      'https://also-valid.com'
    ].join('\n'));
    fs.writeFileSync(TEST_LINKS, '[]');

    const consoleSpy = jest.spyOn(console, 'log');

    const result = await processLinks({
      inputPath: TEST_INPUT,
      linksPath: TEST_LINKS
    });

    // 2 valid, 2 invalid
    expect(result.added).toBe(2);
    expect(result.skipped).toBe(2);
    expect(result.failed).toBe(0);

    // Verify warnings were logged for invalid URLs
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('Skipped: not-a-valid-url (invalid URL)')
    );
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('Skipped: another-invalid (invalid URL)')
    );

    // Verify valid URLs were added
    const links = JSON.parse(fs.readFileSync(TEST_LINKS, 'utf8'));
    expect(links.length).toBe(2);
    expect(links[0].url).toBe('https://valid.com');
    expect(links[1].url).toBe('https://also-valid.com');

    consoleSpy.mockRestore();
  });

  test('handles empty input file gracefully', async () => {
    fs.writeFileSync(TEST_INPUT, '');
    fs.writeFileSync(TEST_LINKS, '[]');

    const consoleSpy = jest.spyOn(console, 'log');

    const result = await processLinks({
      inputPath: TEST_INPUT,
      linksPath: TEST_LINKS
    });

    expect(result.added).toBe(0);
    expect(result.skipped).toBe(0);
    expect(result.failed).toBe(0);
    expect(consoleSpy).toHaveBeenCalledWith('No URLs to process');

    consoleSpy.mockRestore();
  });

  test('handles missing input file gracefully', async () => {
    // Don't create input file
    fs.writeFileSync(TEST_LINKS, '[]');

    const result = await processLinks({
      inputPath: TEST_INPUT,
      linksPath: TEST_LINKS
    });

    expect(result.added).toBe(0);
    expect(result.skipped).toBe(0);
    expect(result.failed).toBe(0);
  });

  test('handles input with only comments and blank lines', async () => {
    fs.writeFileSync(TEST_INPUT, [
      '# This is a comment',
      '',
      '# Another comment',
      '   ',
      '# Final comment'
    ].join('\n'));
    fs.writeFileSync(TEST_LINKS, '[]');

    const result = await processLinks({
      inputPath: TEST_INPUT,
      linksPath: TEST_LINKS
    });

    expect(result.added).toBe(0);
    expect(result.skipped).toBe(0);
  });
});

describe('Source Detection', () => {
  test('detects Twitter source for twitter.com URLs', async () => {
    fs.writeFileSync(TEST_INPUT, 'https://twitter.com/user/status/123\n');
    fs.writeFileSync(TEST_LINKS, '[]');

    await processLinks({
      inputPath: TEST_INPUT,
      linksPath: TEST_LINKS
    });

    const links = JSON.parse(fs.readFileSync(TEST_LINKS, 'utf8'));
    expect(links[0].source).toBe('twitter');
  });

  test('detects Twitter source for x.com URLs', async () => {
    fs.writeFileSync(TEST_INPUT, 'https://x.com/user/status/456\n');
    fs.writeFileSync(TEST_LINKS, '[]');

    await processLinks({
      inputPath: TEST_INPUT,
      linksPath: TEST_LINKS
    });

    const links = JSON.parse(fs.readFileSync(TEST_LINKS, 'utf8'));
    expect(links[0].source).toBe('twitter');
  });

  test('detects web source for regular URLs', async () => {
    fs.writeFileSync(TEST_INPUT, 'https://medium.com/article\n');
    fs.writeFileSync(TEST_LINKS, '[]');

    await processLinks({
      inputPath: TEST_INPUT,
      linksPath: TEST_LINKS
    });

    const links = JSON.parse(fs.readFileSync(TEST_LINKS, 'utf8'));
    expect(links[0].source).toBe('web');
  });

  test('detects GitHub source', async () => {
    fs.writeFileSync(TEST_INPUT, 'https://github.com/user/repo\n');
    fs.writeFileSync(TEST_LINKS, '[]');

    await processLinks({
      inputPath: TEST_INPUT,
      linksPath: TEST_LINKS
    });

    const links = JSON.parse(fs.readFileSync(TEST_LINKS, 'utf8'));
    expect(links[0].source).toBe('github');
  });

  test('detects YouTube source', async () => {
    fs.writeFileSync(TEST_INPUT, 'https://youtube.com/watch?v=abc\n');
    fs.writeFileSync(TEST_LINKS, '[]');

    await processLinks({
      inputPath: TEST_INPUT,
      linksPath: TEST_LINKS
    });

    const links = JSON.parse(fs.readFileSync(TEST_LINKS, 'utf8'));
    expect(links[0].source).toBe('youtube');
  });
});

describe('Data Integrity', () => {
  test('preserves existing links when adding new ones', async () => {
    const existingLinks = [
      { 
        id: 'old-1', 
        url: 'https://old1.com', 
        title: 'Old Link 1',
        description: 'Old description',
        added: '2024-01-01T00:00:00.000Z',
        source: 'web'
      },
      { 
        id: 'old-2', 
        url: 'https://old2.com', 
        title: 'Old Link 2',
        added: '2024-01-02T00:00:00.000Z',
        source: 'web'
      }
    ];
    fs.writeFileSync(TEST_INPUT, 'https://new.com\n');
    fs.writeFileSync(TEST_LINKS, JSON.stringify(existingLinks));

    await processLinks({
      inputPath: TEST_INPUT,
      linksPath: TEST_LINKS
    });

    const links = JSON.parse(fs.readFileSync(TEST_LINKS, 'utf8'));
    expect(links.length).toBe(3);
    
    // Verify existing links are unchanged
    expect(links[0].id).toBe('old-1');
    expect(links[0].title).toBe('Old Link 1');
    expect(links[0].description).toBe('Old description');
    
    expect(links[1].id).toBe('old-2');
    expect(links[1].title).toBe('Old Link 2');
    
    // Verify new link was added
    expect(links[2].url).toBe('https://new.com');
  });

  test('generates unique IDs for each new link', async () => {
    fs.writeFileSync(TEST_INPUT, [
      'https://a.com',
      'https://b.com',
      'https://c.com'
    ].join('\n'));
    fs.writeFileSync(TEST_LINKS, '[]');

    await processLinks({
      inputPath: TEST_INPUT,
      linksPath: TEST_LINKS
    });

    const links = JSON.parse(fs.readFileSync(TEST_LINKS, 'utf8'));
    const ids = links.map(l => l.id);
    const uniqueIds = new Set(ids);
    
    expect(uniqueIds.size).toBe(3);
  });

  test('timestamps are in correct order for batch processing', async () => {
    fs.writeFileSync(TEST_INPUT, [
      'https://first.com',
      'https://second.com',
      'https://third.com'
    ].join('\n'));
    fs.writeFileSync(TEST_LINKS, '[]');

    await processLinks({
      inputPath: TEST_INPUT,
      linksPath: TEST_LINKS
    });

    const links = JSON.parse(fs.readFileSync(TEST_LINKS, 'utf8'));
    
    // All timestamps should be recent (within last minute)
    const now = new Date();
    links.forEach(link => {
      const linkDate = new Date(link.added);
      const diffMs = now - linkDate;
      expect(diffMs).toBeLessThan(60000); // Less than 1 minute
    });

    // Order should be preserved (first processed first)
    const dates = links.map(l => new Date(l.added).getTime());
    expect(dates[0]).toBeLessThanOrEqual(dates[1]);
    expect(dates[1]).toBeLessThanOrEqual(dates[2]);
  });
});

describe('JSON File Format', () => {
  test('writes properly formatted JSON', async () => {
    fs.writeFileSync(TEST_INPUT, 'https://example.com\n');
    fs.writeFileSync(TEST_LINKS, '[]');

    await processLinks({
      inputPath: TEST_INPUT,
      linksPath: TEST_LINKS
    });

    const content = fs.readFileSync(TEST_LINKS, 'utf8');
    
    // Should be pretty-printed (contains newlines and indentation)
    expect(content).toContain('\n');
    expect(content).toMatch(/^\[\n/);
    expect(content).toMatch(/\n]$/);
    
    // Should be valid JSON
    expect(() => JSON.parse(content)).not.toThrow();
  });

  test('creates valid links.json if it does not exist', async () => {
    fs.writeFileSync(TEST_INPUT, 'https://example.com\n');
    // Don't create TEST_LINKS

    await processLinks({
      inputPath: TEST_INPUT,
      linksPath: TEST_LINKS
    });

    expect(fs.existsSync(TEST_LINKS)).toBe(true);
    const links = JSON.parse(fs.readFileSync(TEST_LINKS, 'utf8'));
    expect(Array.isArray(links)).toBe(true);
    expect(links.length).toBe(1);
  });
});
