/**
 * Metadata extraction for LinkStash
 * Handles Twitter/X URLs via fxtwitter API and web URLs via og:tags
 */

const cheerio = require('cheerio');

/**
 * Check if a URL is a Twitter or X.com URL
 * @param {string} url - URL to check
 * @returns {boolean} True if URL is from Twitter/X
 */
function isTwitterUrl(url) {
  if (!url || typeof url !== 'string') {
    return false;
  }
  try {
    const parsed = new URL(url);
    const hostname = parsed.hostname.toLowerCase();
    return hostname === 'twitter.com' || 
           hostname === 'www.twitter.com' || 
           hostname === 'x.com' || 
           hostname === 'www.x.com' ||
           hostname === 'mobile.twitter.com' ||
           hostname === 'mobile.x.com';
  } catch {
    return false;
  }
}

/**
 * Convert a Twitter/X URL to fxtwitter format for API access
 * @param {string} url - Twitter URL
 * @returns {string} fxtwitter API URL
 */
function toFxTwitterUrl(url) {
  const parsed = new URL(url);
  return `https://api.fxtwitter.com${parsed.pathname}`;
}

/**
 * Extract metadata from a Twitter/X URL using fxtwitter API
 * @param {string} url - Twitter URL
 * @param {Function} [fetchFn] - Optional fetch function for testing
 * @returns {Promise<{title: string, description: string, author: string, image: string}>}
 */
async function extractFromTwitter(url, fetchFn = null) {
  const defaultResult = { title: url, description: '', author: '', image: '' };
  
  if (!isTwitterUrl(url)) {
    return defaultResult;
  }
  
  try {
    const apiUrl = toFxTwitterUrl(url);
    const fetch = fetchFn || (await import('node-fetch')).default;
    
    const response = await fetch(apiUrl, {
      headers: {
        'User-Agent': 'LinkStash/1.0'
      },
      timeout: 10000
    });
    
    if (!response.ok) {
      return defaultResult;
    }
    
    const data = await response.json();
    
    if (!data.tweet) {
      return defaultResult;
    }
    
    const tweet = data.tweet;
    const text = tweet.text || '';
    const title = text.length > 100 ? text.substring(0, 97) + '...' : text;
    const author = tweet.author?.name || tweet.author?.screen_name || '';
    
    // Get first media image if available
    let image = '';
    if (tweet.media?.photos && tweet.media.photos.length > 0) {
      image = tweet.media.photos[0].url || '';
    } else if (tweet.media?.videos && tweet.media.videos.length > 0) {
      image = tweet.media.videos[0].thumbnail_url || '';
    }
    
    return {
      title: title || url,
      description: text,
      author,
      image
    };
  } catch (error) {
    return defaultResult;
  }
}

/**
 * Extract metadata from a web URL using og:tags and HTML parsing
 * @param {string} url - Web URL
 * @param {Function} [fetchFn] - Optional fetch function for testing
 * @returns {Promise<{title: string, description: string, author: string, image: string}>}
 */
async function extractFromWeb(url, fetchFn = null) {
  const defaultResult = { title: url, description: '', author: '', image: '' };
  
  try {
    const fetch = fetchFn || (await import('node-fetch')).default;
    
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; LinkStash/1.0; +https://github.com/linkstash)'
      },
      timeout: 10000,
      redirect: 'follow'
    });
    
    if (!response.ok) {
      return defaultResult;
    }
    
    const contentType = response.headers.get('content-type') || '';
    if (!contentType.includes('text/html')) {
      return defaultResult;
    }
    
    const html = await response.text();
    const $ = cheerio.load(html);
    
    // Extract og:tags with fallbacks
    const title = $('meta[property="og:title"]').attr('content') ||
                  $('meta[name="twitter:title"]').attr('content') ||
                  $('title').text() ||
                  url;
    
    const description = $('meta[property="og:description"]').attr('content') ||
                        $('meta[name="twitter:description"]').attr('content') ||
                        $('meta[name="description"]').attr('content') ||
                        '';
    
    const image = $('meta[property="og:image"]').attr('content') ||
                  $('meta[name="twitter:image"]').attr('content') ||
                  '';
    
    const author = $('meta[property="og:article:author"]').attr('content') ||
                   $('meta[name="author"]').attr('content') ||
                   $('meta[property="article:author"]').attr('content') ||
                   '';
    
    return {
      title: title.trim() || url,
      description: description.trim(),
      author: author.trim(),
      image: image.trim()
    };
  } catch (error) {
    return defaultResult;
  }
}

/**
 * Extract metadata from any URL (auto-detects Twitter vs web)
 * @param {string} url - Any URL
 * @param {Function} [fetchFn] - Optional fetch function for testing
 * @returns {Promise<{title: string, description: string, author: string, image: string}>}
 */
async function extractMetadata(url, fetchFn = null) {
  if (isTwitterUrl(url)) {
    return extractFromTwitter(url, fetchFn);
  }
  return extractFromWeb(url, fetchFn);
}

module.exports = {
  isTwitterUrl,
  toFxTwitterUrl,
  extractFromTwitter,
  extractFromWeb,
  extractMetadata
};
