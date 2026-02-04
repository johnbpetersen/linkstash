#!/usr/bin/env node
/**
 * LinkStash Processor
 * Reads URLs from input.txt, fetches metadata, and appends to links.json
 */

const fs = require('fs');
const path = require('path');
const { extractMetadata } = require('./src/metadata-extractor');
const { createLinkObject, isDuplicate, isValidUrl } = require('./src/link-model');

const DEFAULT_INPUT_PATH = path.join(__dirname, 'input.txt');
const DEFAULT_LINKS_PATH = path.join(__dirname, 'links.json');

/**
 * Read URLs from input file
 * @param {string} filePath - Path to input file
 * @returns {string[]} Array of URLs (one per line, comments and empty lines filtered)
 */
function readInputFile(filePath = DEFAULT_INPUT_PATH) {
  try {
    if (!fs.existsSync(filePath)) {
      return [];
    }
    
    const content = fs.readFileSync(filePath, 'utf8');
    
    return content
      .split('\n')
      .map(line => line.trim())
      .filter(line => line && !line.startsWith('#'));
  } catch (error) {
    console.error(`Error reading input file: ${error.message}`);
    return [];
  }
}

/**
 * Read existing links from JSON file
 * @param {string} filePath - Path to links.json
 * @returns {Object[]} Array of link objects
 */
function readLinksFile(filePath = DEFAULT_LINKS_PATH) {
  try {
    if (!fs.existsSync(filePath)) {
      return [];
    }
    
    const content = fs.readFileSync(filePath, 'utf8').trim();
    
    if (!content) {
      return [];
    }
    
    const links = JSON.parse(content);
    
    if (!Array.isArray(links)) {
      throw new Error('links.json must contain an array');
    }
    
    return links;
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new Error(`Invalid JSON in links.json: ${error.message}`);
    }
    throw error;
  }
}

/**
 * Write links array to JSON file
 * @param {string} filePath - Path to links.json
 * @param {Object[]} links - Array of link objects
 */
function writeLinksFile(filePath = DEFAULT_LINKS_PATH, links) {
  try {
    const content = JSON.stringify(links, null, 2);
    fs.writeFileSync(filePath, content, 'utf8');
  } catch (error) {
    throw new Error(`Failed to write links.json: ${error.message}`);
  }
}

/**
 * Clear the input file after processing
 * @param {string} filePath - Path to input file
 */
function clearInputFile(filePath = DEFAULT_INPUT_PATH) {
  try {
    fs.writeFileSync(filePath, '', 'utf8');
  } catch (error) {
    console.warn(`Warning: Failed to clear input file: ${error.message}`);
  }
}

/**
 * Process a single URL: validate, check duplicate, fetch metadata, create link
 * @param {string} url - URL to process
 * @param {Object[]} existingLinks - Existing links for dedup check
 * @returns {Promise<{status: string, link?: Object, reason?: string}>}
 */
async function processUrl(url, existingLinks) {
  // Validate URL
  if (!isValidUrl(url)) {
    return { status: 'skipped', reason: 'invalid URL' };
  }
  
  // Check for duplicate
  if (isDuplicate(url, existingLinks)) {
    return { status: 'skipped', reason: 'duplicate' };
  }
  
  // Fetch metadata
  const metadata = await extractMetadata(url);
  
  // Create link object
  const link = createLinkObject(url, metadata);
  
  return { status: 'added', link };
}

/**
 * Main processing function
 * Orchestrates the full pipeline: read → process → write → clear
 * @param {Object} options - Processing options
 * @param {string} [options.inputPath] - Path to input file
 * @param {string} [options.linksPath] - Path to links file
 * @returns {Promise<{added: number, skipped: number, failed: number}>}
 */
async function processLinks(options = {}) {
  const inputPath = options.inputPath || DEFAULT_INPUT_PATH;
  const linksPath = options.linksPath || DEFAULT_LINKS_PATH;
  
  // Read input URLs
  const urls = readInputFile(inputPath);
  
  if (urls.length === 0) {
    console.log('No URLs to process');
    return { added: 0, skipped: 0, failed: 0 };
  }
  
  console.log(`Processing ${urls.length} URL(s)...`);
  
  // Read existing links
  const existingLinks = readLinksFile(linksPath);
  const newLinks = [...existingLinks];
  
  let added = 0;
  let skipped = 0;
  let failed = 0;
  
  // Process each URL
  for (const url of urls) {
    try {
      const result = await processUrl(url, newLinks);
      
      if (result.status === 'added') {
        newLinks.push(result.link);
        added++;
        console.log(`Added: ${url}`);
      } else if (result.status === 'skipped') {
        skipped++;
        console.log(`Skipped: ${url} (${result.reason})`);
      }
    } catch (error) {
      failed++;
      console.error(`Failed: ${url} - ${error.message}`);
    }
  }
  
  // Write updated links if any were added
  if (added > 0) {
    writeLinksFile(linksPath, newLinks);
  }
  
  // Clear input file
  clearInputFile(inputPath);
  
  // Log summary
  console.log(`\nSummary: ${added} added, ${skipped} skipped, ${failed} failed`);
  
  return { added, skipped, failed };
}

// Export for testing
module.exports = {
  readInputFile,
  readLinksFile,
  writeLinksFile,
  clearInputFile,
  processUrl,
  processLinks,
  DEFAULT_INPUT_PATH,
  DEFAULT_LINKS_PATH
};

// Run if called directly
if (require.main === module) {
  processLinks()
    .then(({ added, skipped, failed }) => {
      if (failed > 0) {
        process.exit(1);
      }
    })
    .catch(error => {
      console.error('Fatal error:', error.message);
      process.exit(1);
    });
}
