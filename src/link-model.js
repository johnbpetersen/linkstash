/**
 * Link object creation and deduplication for LinkStash
 */

const { v4: uuidv4 } = require('uuid');

/**
 * Normalize a URL for comparison (deduplication)
 * @param {string} url - URL to normalize
 * @returns {string} Normalized URL
 */
function normalizeUrl(url) {
  if (!url || typeof url !== 'string') {
    throw new Error('URL must be a non-empty string');
  }
  
  try {
    const parsed = new URL(url);
    
    // Lowercase the protocol and hostname
    let normalized = `${parsed.protocol.toLowerCase()}//${parsed.hostname.toLowerCase()}`;
    
    // Add port if non-standard
    if (parsed.port) {
      normalized += `:${parsed.port}`;
    }
    
    // Add pathname, removing trailing slash unless it's just "/"
    let pathname = parsed.pathname;
    if (pathname.length > 1 && pathname.endsWith('/')) {
      pathname = pathname.slice(0, -1);
    }
    normalized += pathname;
    
    // Add query string if present (sorted for consistency)
    if (parsed.search) {
      const params = new URLSearchParams(parsed.search);
      params.sort();
      const sortedSearch = params.toString();
      if (sortedSearch) {
        normalized += `?${sortedSearch}`;
      }
    }
    
    // Ignore hash fragment for deduplication
    
    return normalized;
  } catch (error) {
    throw new Error(`Invalid URL: ${url}`);
  }
}

/**
 * Check if a URL already exists in the links array
 * @param {string} url - URL to check
 * @param {Array} links - Existing links array
 * @returns {boolean} True if URL is a duplicate
 */
function isDuplicate(url, links) {
  if (!Array.isArray(links) || links.length === 0) {
    return false;
  }
  
  try {
    const normalizedInput = normalizeUrl(url);
    
    return links.some(link => {
      try {
        const normalizedExisting = normalizeUrl(link.url);
        return normalizedInput === normalizedExisting;
      } catch {
        return false;
      }
    });
  } catch {
    return false;
  }
}

/**
 * Detect the source type from a URL
 * @param {string} url - URL to analyze
 * @returns {string} Source type ('twitter', 'youtube', 'github', 'web')
 */
function detectSource(url) {
  try {
    const hostname = new URL(url).hostname.toLowerCase();
    
    if (hostname.includes('twitter.com') || hostname.includes('x.com')) {
      return 'twitter';
    }
    if (hostname.includes('youtube.com') || hostname.includes('youtu.be')) {
      return 'youtube';
    }
    if (hostname.includes('github.com')) {
      return 'github';
    }
    
    return 'web';
  } catch {
    return 'web';
  }
}

/**
 * Create a link object from URL and metadata
 * @param {string} url - The original URL
 * @param {Object} metadata - Extracted metadata {title, description, image, author}
 * @returns {Object} Link object with all required fields
 */
function createLinkObject(url, metadata = {}) {
  if (!url || typeof url !== 'string') {
    throw new Error('URL is required and must be a string');
  }
  
  // Validate URL format
  try {
    new URL(url);
  } catch {
    throw new Error(`Invalid URL format: ${url}`);
  }
  
  const {
    title = url,
    description = '',
    image = '',
    author = ''
  } = metadata;
  
  return {
    id: uuidv4(),
    url: url.trim(),
    title: (title || url).trim(),
    description: (description || '').trim(),
    image: (image || '').trim(),
    author: (author || '').trim(),
    added: new Date().toISOString(),
    source: detectSource(url)
  };
}

/**
 * Validate a URL string
 * @param {string} url - URL to validate
 * @returns {boolean} True if URL is valid
 */
function isValidUrl(url) {
  if (!url || typeof url !== 'string') {
    return false;
  }
  
  try {
    const parsed = new URL(url.trim());
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

module.exports = {
  normalizeUrl,
  isDuplicate,
  detectSource,
  createLinkObject,
  isValidUrl
};
