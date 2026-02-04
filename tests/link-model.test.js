/**
 * Tests for link model (deduplication and object creation)
 */

const {
  normalizeUrl,
  isDuplicate,
  detectSource,
  createLinkObject,
  isValidUrl
} = require('../src/link-model');

describe('normalizeUrl', () => {
  test('removes trailing slash from paths', () => {
    expect(normalizeUrl('https://example.com/path/')).toBe('https://example.com/path');
    expect(normalizeUrl('https://example.com/deep/path/')).toBe('https://example.com/deep/path');
  });

  test('normalizes root path consistently', () => {
    // Both with and without trailing slash normalize to the same thing
    const url1 = normalizeUrl('https://example.com');
    const url2 = normalizeUrl('https://example.com/');
    expect(url1).toBe(url2);
  });

  test('lowercases domain', () => {
    expect(normalizeUrl('HTTPS://EXAMPLE.COM/Path')).toBe('https://example.com/Path');
  });

  test('preserves path case', () => {
    expect(normalizeUrl('https://example.com/CamelCase')).toBe('https://example.com/CamelCase');
  });

  test('preserves query parameters', () => {
    expect(normalizeUrl('https://example.com/page?id=123')).toBe('https://example.com/page?id=123');
  });

  test('sorts query parameters', () => {
    expect(normalizeUrl('https://example.com/page?z=1&a=2'))
      .toBe('https://example.com/page?a=2&z=1');
  });

  test('ignores hash fragment', () => {
    const url1 = normalizeUrl('https://example.com/page#section1');
    const url2 = normalizeUrl('https://example.com/page#section2');
    expect(url1).toBe(url2);
  });

  test('throws on empty URL', () => {
    expect(() => normalizeUrl('')).toThrow('URL must be a non-empty string');
    expect(() => normalizeUrl(null)).toThrow('URL must be a non-empty string');
  });

  test('throws on invalid URL', () => {
    expect(() => normalizeUrl('not a url')).toThrow('Invalid URL');
  });
});

describe('isDuplicate', () => {
  const existingLinks = [
    { url: 'https://example.com/article' },
    { url: 'https://github.com/user/repo' },
    { url: 'https://twitter.com/user/status/123' }
  ];

  test('detects exact duplicate', () => {
    expect(isDuplicate('https://example.com/article', existingLinks)).toBe(true);
  });

  test('detects duplicate with trailing slash variation', () => {
    expect(isDuplicate('https://example.com/article/', existingLinks)).toBe(true);
  });

  test('detects duplicate case-insensitively (domain)', () => {
    expect(isDuplicate('HTTPS://EXAMPLE.COM/article', existingLinks)).toBe(true);
  });

  test('returns false for different URL', () => {
    expect(isDuplicate('https://different.com/page', existingLinks)).toBe(false);
  });

  test('returns false for empty links array', () => {
    expect(isDuplicate('https://example.com', [])).toBe(false);
  });

  test('returns false for null/undefined links', () => {
    expect(isDuplicate('https://example.com', null)).toBe(false);
    expect(isDuplicate('https://example.com', undefined)).toBe(false);
  });

  test('handles links with different paths', () => {
    expect(isDuplicate('https://example.com/other-article', existingLinks)).toBe(false);
  });

  test('handles invalid URL in input gracefully', () => {
    expect(isDuplicate('not a url', existingLinks)).toBe(false);
  });

  test('handles invalid URL in existing links gracefully', () => {
    const linksWithInvalid = [{ url: 'invalid' }, { url: 'https://valid.com' }];
    expect(isDuplicate('https://valid.com', linksWithInvalid)).toBe(true);
  });
});

describe('detectSource', () => {
  test('detects Twitter URLs', () => {
    expect(detectSource('https://twitter.com/user/status/123')).toBe('twitter');
    expect(detectSource('https://x.com/user/status/456')).toBe('twitter');
    expect(detectSource('https://mobile.twitter.com/user')).toBe('twitter');
  });

  test('detects YouTube URLs', () => {
    expect(detectSource('https://youtube.com/watch?v=abc')).toBe('youtube');
    expect(detectSource('https://www.youtube.com/watch?v=abc')).toBe('youtube');
    expect(detectSource('https://youtu.be/abc')).toBe('youtube');
  });

  test('detects GitHub URLs', () => {
    expect(detectSource('https://github.com/user/repo')).toBe('github');
    expect(detectSource('https://github.com/user/repo/issues/1')).toBe('github');
  });

  test('returns web for other URLs', () => {
    expect(detectSource('https://example.com')).toBe('web');
    expect(detectSource('https://news.ycombinator.com')).toBe('web');
    expect(detectSource('https://medium.com/article')).toBe('web');
  });

  test('returns web for invalid URLs', () => {
    expect(detectSource('not a url')).toBe('web');
    expect(detectSource('')).toBe('web');
  });
});

describe('createLinkObject', () => {
  test('creates link with all fields from metadata', () => {
    const metadata = {
      title: 'Test Article',
      description: 'Article description',
      image: 'https://example.com/image.jpg',
      author: 'John Doe'
    };

    const link = createLinkObject('https://example.com/article', metadata);

    expect(link.url).toBe('https://example.com/article');
    expect(link.title).toBe('Test Article');
    expect(link.description).toBe('Article description');
    expect(link.image).toBe('https://example.com/image.jpg');
    expect(link.author).toBe('John Doe');
    expect(link.source).toBe('web');
  });

  test('generates unique UUID', () => {
    const link1 = createLinkObject('https://example.com/1', {});
    const link2 = createLinkObject('https://example.com/2', {});

    expect(link1.id).toBeDefined();
    expect(link2.id).toBeDefined();
    expect(link1.id).not.toBe(link2.id);
    expect(link1.id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
  });

  test('generates recent timestamp', () => {
    const before = new Date();
    const link = createLinkObject('https://example.com', {});
    const after = new Date();

    const linkDate = new Date(link.added);
    expect(linkDate >= before).toBe(true);
    expect(linkDate <= after).toBe(true);
    expect(link.added).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
  });

  test('detects source as twitter for Twitter URLs', () => {
    const link = createLinkObject('https://twitter.com/user/status/123', {});
    expect(link.source).toBe('twitter');
  });

  test('detects source as web for regular URLs', () => {
    const link = createLinkObject('https://blog.example.com/post', {});
    expect(link.source).toBe('web');
  });

  test('uses URL as title when metadata missing', () => {
    const link = createLinkObject('https://example.com/page', {});
    expect(link.title).toBe('https://example.com/page');
  });

  test('handles empty metadata values', () => {
    const metadata = {
      title: '',
      description: null,
      image: undefined
    };

    const link = createLinkObject('https://example.com', metadata);

    expect(link.title).toBe('https://example.com');
    expect(link.description).toBe('');
    expect(link.image).toBe('');
  });

  test('trims whitespace from all fields', () => {
    const metadata = {
      title: '  Title with spaces  ',
      description: '\n\tDescription\n',
      author: '  Author  '
    };

    const link = createLinkObject('  https://example.com  ', metadata);

    expect(link.url).toBe('https://example.com');
    expect(link.title).toBe('Title with spaces');
    expect(link.description).toBe('Description');
    expect(link.author).toBe('Author');
  });

  test('throws error for empty URL', () => {
    expect(() => createLinkObject('', {})).toThrow('URL is required');
    expect(() => createLinkObject(null, {})).toThrow('URL is required');
  });

  test('throws error for invalid URL', () => {
    expect(() => createLinkObject('not a url', {})).toThrow('Invalid URL format');
  });
});

describe('isValidUrl', () => {
  test('accepts valid http URLs', () => {
    expect(isValidUrl('http://example.com')).toBe(true);
  });

  test('accepts valid https URLs', () => {
    expect(isValidUrl('https://example.com')).toBe(true);
    expect(isValidUrl('https://example.com/path?query=1')).toBe(true);
  });

  test('rejects non-http protocols', () => {
    expect(isValidUrl('ftp://example.com')).toBe(false);
    expect(isValidUrl('file:///path/to/file')).toBe(false);
    expect(isValidUrl('javascript:alert(1)')).toBe(false);
  });

  test('rejects invalid URLs', () => {
    expect(isValidUrl('not a url')).toBe(false);
    expect(isValidUrl('example.com')).toBe(false);
    expect(isValidUrl('')).toBe(false);
    expect(isValidUrl(null)).toBe(false);
    expect(isValidUrl(undefined)).toBe(false);
  });

  test('handles whitespace', () => {
    expect(isValidUrl('  https://example.com  ')).toBe(true);
  });
});
