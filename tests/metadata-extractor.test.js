/**
 * Tests for metadata extraction functions
 */

const {
  isTwitterUrl,
  toFxTwitterUrl,
  extractFromTwitter,
  extractFromWeb,
  extractMetadata
} = require('../src/metadata-extractor');

describe('isTwitterUrl', () => {
  test('identifies twitter.com URLs', () => {
    expect(isTwitterUrl('https://twitter.com/user/status/123')).toBe(true);
    expect(isTwitterUrl('https://www.twitter.com/user/status/456')).toBe(true);
    expect(isTwitterUrl('http://twitter.com/user/status/789')).toBe(true);
  });

  test('identifies x.com URLs', () => {
    expect(isTwitterUrl('https://x.com/user/status/123')).toBe(true);
    expect(isTwitterUrl('https://www.x.com/user/status/456')).toBe(true);
  });

  test('identifies mobile Twitter URLs', () => {
    expect(isTwitterUrl('https://mobile.twitter.com/user/status/123')).toBe(true);
    expect(isTwitterUrl('https://mobile.x.com/user/status/456')).toBe(true);
  });

  test('rejects non-Twitter URLs', () => {
    expect(isTwitterUrl('https://example.com')).toBe(false);
    expect(isTwitterUrl('https://github.com/user/repo')).toBe(false);
    expect(isTwitterUrl('https://fxtwitter.com/user/status/123')).toBe(false);
  });

  test('rejects invalid inputs', () => {
    expect(isTwitterUrl('twitter.com')).toBe(false); // No protocol
    expect(isTwitterUrl('not a url')).toBe(false);
    expect(isTwitterUrl('')).toBe(false);
    expect(isTwitterUrl(null)).toBe(false);
    expect(isTwitterUrl(undefined)).toBe(false);
  });
});

describe('toFxTwitterUrl', () => {
  test('converts twitter.com to fxtwitter API URL', () => {
    expect(toFxTwitterUrl('https://twitter.com/user/status/123'))
      .toBe('https://api.fxtwitter.com/user/status/123');
  });

  test('converts x.com to fxtwitter API URL', () => {
    expect(toFxTwitterUrl('https://x.com/user/status/456'))
      .toBe('https://api.fxtwitter.com/user/status/456');
  });

  test('preserves path components', () => {
    expect(toFxTwitterUrl('https://twitter.com/someuser/status/987654321'))
      .toBe('https://api.fxtwitter.com/someuser/status/987654321');
  });
});

describe('extractFromTwitter', () => {
  test('extracts tweet data from valid response', async () => {
    const mockFetch = jest.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        tweet: {
          text: 'This is a test tweet with some content',
          author: {
            name: 'Test User',
            screen_name: 'testuser'
          },
          media: {
            photos: [{ url: 'https://pbs.twimg.com/media/test.jpg' }]
          }
        }
      })
    });

    const result = await extractFromTwitter('https://twitter.com/testuser/status/123', mockFetch);

    expect(result.title).toBe('This is a test tweet with some content');
    expect(result.description).toBe('This is a test tweet with some content');
    expect(result.author).toBe('Test User');
    expect(result.image).toBe('https://pbs.twimg.com/media/test.jpg');
  });

  test('truncates long tweet text for title', async () => {
    const longText = 'A'.repeat(150);
    const mockFetch = jest.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        tweet: {
          text: longText,
          author: { name: 'User' }
        }
      })
    });

    const result = await extractFromTwitter('https://twitter.com/user/status/123', mockFetch);

    expect(result.title.length).toBe(100);
    expect(result.title.endsWith('...')).toBe(true);
    expect(result.description).toBe(longText);
  });

  test('handles video media for thumbnail', async () => {
    const mockFetch = jest.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        tweet: {
          text: 'Video tweet',
          author: { name: 'User' },
          media: {
            videos: [{ thumbnail_url: 'https://pbs.twimg.com/media/video-thumb.jpg' }]
          }
        }
      })
    });

    const result = await extractFromTwitter('https://twitter.com/user/status/123', mockFetch);
    expect(result.image).toBe('https://pbs.twimg.com/media/video-thumb.jpg');
  });

  test('returns default on fetch failure', async () => {
    const mockFetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 404
    });

    const result = await extractFromTwitter('https://twitter.com/user/status/123', mockFetch);

    expect(result.title).toBe('https://twitter.com/user/status/123');
    expect(result.description).toBe('');
    expect(result.author).toBe('');
    expect(result.image).toBe('');
  });

  test('returns default on network error', async () => {
    const mockFetch = jest.fn().mockRejectedValue(new Error('Network error'));

    const result = await extractFromTwitter('https://twitter.com/user/status/123', mockFetch);

    expect(result.title).toBe('https://twitter.com/user/status/123');
    expect(result.description).toBe('');
  });

  test('returns default for non-Twitter URL', async () => {
    const mockFetch = jest.fn();
    const result = await extractFromTwitter('https://example.com', mockFetch);

    expect(result.title).toBe('https://example.com');
    expect(mockFetch).not.toHaveBeenCalled();
  });
});

describe('extractFromWeb', () => {
  test('extracts og:tags from valid HTML', async () => {
    const mockHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta property="og:title" content="Test Article Title">
        <meta property="og:description" content="This is the article description">
        <meta property="og:image" content="https://example.com/image.jpg">
        <meta property="og:article:author" content="John Doe">
        <title>Fallback Title</title>
      </head>
      <body></body>
      </html>
    `;

    const mockFetch = jest.fn().mockResolvedValue({
      ok: true,
      headers: { get: () => 'text/html; charset=utf-8' },
      text: () => Promise.resolve(mockHtml)
    });

    const result = await extractFromWeb('https://example.com/article', mockFetch);

    expect(result.title).toBe('Test Article Title');
    expect(result.description).toBe('This is the article description');
    expect(result.image).toBe('https://example.com/image.jpg');
    expect(result.author).toBe('John Doe');
  });

  test('falls back to <title> tag when og:title missing', async () => {
    const mockHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Page Title From HTML</title>
        <meta name="description" content="Meta description">
      </head>
      <body></body>
      </html>
    `;

    const mockFetch = jest.fn().mockResolvedValue({
      ok: true,
      headers: { get: () => 'text/html' },
      text: () => Promise.resolve(mockHtml)
    });

    const result = await extractFromWeb('https://example.com/page', mockFetch);

    expect(result.title).toBe('Page Title From HTML');
    expect(result.description).toBe('Meta description');
  });

  test('uses twitter:card tags as fallback', async () => {
    const mockHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta name="twitter:title" content="Twitter Card Title">
        <meta name="twitter:description" content="Twitter description">
        <meta name="twitter:image" content="https://example.com/twitter-image.jpg">
      </head>
      <body></body>
      </html>
    `;

    const mockFetch = jest.fn().mockResolvedValue({
      ok: true,
      headers: { get: () => 'text/html' },
      text: () => Promise.resolve(mockHtml)
    });

    const result = await extractFromWeb('https://example.com/page', mockFetch);

    expect(result.title).toBe('Twitter Card Title');
    expect(result.description).toBe('Twitter description');
    expect(result.image).toBe('https://example.com/twitter-image.jpg');
  });

  test('returns URL as title when no metadata available', async () => {
    const mockHtml = `
      <!DOCTYPE html>
      <html>
      <head></head>
      <body>No metadata here</body>
      </html>
    `;

    const mockFetch = jest.fn().mockResolvedValue({
      ok: true,
      headers: { get: () => 'text/html' },
      text: () => Promise.resolve(mockHtml)
    });

    const result = await extractFromWeb('https://example.com/bare', mockFetch);

    expect(result.title).toBe('https://example.com/bare');
    expect(result.description).toBe('');
  });

  test('returns default on 404', async () => {
    const mockFetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 404
    });

    const result = await extractFromWeb('https://example.com/not-found', mockFetch);

    expect(result.title).toBe('https://example.com/not-found');
    expect(result.description).toBe('');
  });

  test('returns default on network error', async () => {
    const mockFetch = jest.fn().mockRejectedValue(new Error('ECONNREFUSED'));

    const result = await extractFromWeb('https://example.com/timeout', mockFetch);

    expect(result.title).toBe('https://example.com/timeout');
    expect(result.description).toBe('');
  });

  test('returns default for non-HTML content', async () => {
    const mockFetch = jest.fn().mockResolvedValue({
      ok: true,
      headers: { get: () => 'application/json' },
      text: () => Promise.resolve('{"data": "json"}')
    });

    const result = await extractFromWeb('https://api.example.com/data', mockFetch);

    expect(result.title).toBe('https://api.example.com/data');
  });
});

describe('extractMetadata', () => {
  test('routes Twitter URLs to extractFromTwitter', async () => {
    const mockFetch = jest.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        tweet: {
          text: 'Tweet content',
          author: { name: 'Author' }
        }
      })
    });

    const result = await extractMetadata('https://twitter.com/user/status/123', mockFetch);
    
    expect(result.description).toBe('Tweet content');
    expect(mockFetch).toHaveBeenCalledWith(
      'https://api.fxtwitter.com/user/status/123',
      expect.any(Object)
    );
  });

  test('routes non-Twitter URLs to extractFromWeb', async () => {
    const mockHtml = `
      <html>
      <head><meta property="og:title" content="Web Page"></head>
      </html>
    `;

    const mockFetch = jest.fn().mockResolvedValue({
      ok: true,
      headers: { get: () => 'text/html' },
      text: () => Promise.resolve(mockHtml)
    });

    const result = await extractMetadata('https://example.com/page', mockFetch);
    
    expect(result.title).toBe('Web Page');
    expect(mockFetch).toHaveBeenCalledWith(
      'https://example.com/page',
      expect.any(Object)
    );
  });
});
