#!/usr/bin/env node
/**
 * IndexNow Submission Helper for softcoverbooks.co.za
 * Sends an HTTP POST request to https://api.indexnow.org/IndexNow
 */

const fs = require('fs');
const path = require('path');

const HOST = 'www.softcoverbooks.co.za';
const KEY = 'e6b44d6766614ba9b455ea2a1eda494d';
const KEY_LOCATION = `https://${HOST}/e6b44d6766614ba9b455ea2a1eda494d.txt`;
const INDEXNOW_ENDPOINT = 'https://api.indexnow.org/IndexNow';

function normalizeUrl(url) {
  url = url.trim();
  if (!url) return '';
  if (url.startsWith('/')) {
    return `https://${HOST}${url}`;
  }
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    return `https://${HOST}/${url}`;
  }
  return url;
}

function loadUrlsFromSitemap(sitemapPath) {
  const resolved = path.resolve(sitemapPath);
  if (!fs.existsSync(resolved)) {
    console.error(`[!] Sitemap file not found at: ${resolved}`);
    return [];
  }
  const content = fs.readFileSync(resolved, 'utf-8');
  const urls = [];
  const regex = /<loc>(.*?)<\/loc>/g;
  let match;
  while ((match = regex.exec(content)) !== null) {
    if (match[1] && match[1].trim()) {
      urls.push(match[1].trim());
    }
  }
  return urls;
}

async function submitIndexNow(urls, dryRun = false) {
  // Deduplicate and normalize
  const cleanUrls = Array.from(
    new Set(urls.map(normalizeUrl).filter(Boolean))
  );

  if (cleanUrls.length === 0) {
    console.error('[!] No URLs provided to submit.');
    return false;
  }

  const payload = {
    host: HOST,
    key: KEY,
    keyLocation: KEY_LOCATION,
    urlList: cleanUrls
  };

  console.log(`[*] Preparing IndexNow submission:`);
  console.log(`    Host:         ${HOST}`);
  console.log(`    Key:          ${KEY}`);
  console.log(`    Key Location: ${KEY_LOCATION}`);
  console.log(`    URLs count:   ${cleanUrls.length}`);
  if (cleanUrls.length <= 10) {
    cleanUrls.forEach(u => console.log(`      - ${u}`));
  } else {
    cleanUrls.slice(0, 5).forEach(u => console.log(`      - ${u}`));
    console.log(`      ... and ${cleanUrls.length - 5} more`);
  }

  if (dryRun) {
    console.log('[*] Dry run mode enabled. Submission skipped.');
    return true;
  }

  try {
    const res = await fetch(INDEXNOW_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'User-Agent': 'IndexNow-Submit-Tool/1.0'
      },
      body: JSON.stringify(payload)
    });

    const status = res.status;
    const text = await res.text();

    if (status === 200) {
      console.log(`[+] SUCCESS (200 OK): URLs submitted and key validated.`);
      return true;
    } else if (status === 202) {
      console.log(`[+] ACCEPTED (202): URLs received by IndexNow. Key validation will be performed asynchronously.`);
      return true;
    } else {
      console.error(`[!] HTTP Error ${status}: ${res.statusText}`);
      if (status === 400) console.error('    Cause: Invalid format in payload.');
      if (status === 403) {
        console.error('    Cause: Key not valid, key file missing from web server, or host mismatch.');
        console.error(`    Ensure '${KEY_LOCATION}' is published live before submitting.`);
      }
      if (status === 422) console.error("    Cause: URLs do not belong to host or key does not match.");
      if (status === 429) console.error('    Cause: Too Many Requests (rate-limited).');
      if (text) console.error(`    Response: ${text}`);
      return false;
    }
  } catch (err) {
    console.error(`[!] Network or request error:`, err.message);
    return false;
  }
}

async function main() {
  const args = process.argv.slice(2);
  let dryRun = false;
  let sitemapFile = null;
  let inputFile = null;
  const directUrls = [];

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--dry-run') {
      dryRun = true;
    } else if (arg === '--sitemap' || arg === '-s') {
      sitemapFile = (args[i + 1] && !args[i + 1].startsWith('-')) ? args[++i] : 'sitemap.xml';
    } else if (arg === '--file' || arg === '-f') {
      inputFile = args[++i];
    } else if (arg.startsWith('--')) {
      console.warn(`[!] Unknown option: ${arg}`);
    } else {
      directUrls.push(arg);
    }
  }

  const collectedUrls = [...directUrls];

  if (inputFile) {
    const fullPath = path.resolve(inputFile);
    if (fs.existsSync(fullPath)) {
      const lines = fs.readFileSync(fullPath, 'utf-8').split(/\r?\n/);
      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed && !trimmed.startsWith('#')) {
          collectedUrls.push(trimmed);
        }
      }
    } else {
      console.error(`[!] File not found: ${fullPath}`);
      process.exit(1);
    }
  }

  if (sitemapFile) {
    let sPath = path.resolve(sitemapFile);
    if (!fs.existsSync(sPath)) {
      const altPath = path.resolve(__dirname, '..', sitemapFile);
      if (fs.existsSync(altPath)) sPath = altPath;
    }
    collectedUrls.push(...loadUrlsFromSitemap(sPath));
  }

  if (collectedUrls.length === 0) {
    console.log('[*] No URLs specified. Defaulting to homepage.');
    console.log('    Usage examples:');
    console.log('      node indexnow_submit.js https://www.softcoverbooks.co.za/artikels.html');
    console.log('      node indexnow_submit.js /artikels.html /soek%20boeke.html');
    console.log('      node indexnow_submit.js --sitemap');
    console.log('      node indexnow_submit.js --file urls.txt\n');
    collectedUrls.push(
      `https://${HOST}/`,
      `https://${HOST}/artikels.html`,
      `https://${HOST}/soek%20boeke.html`
    );
  }

  const success = await submitIndexNow(collectedUrls, dryRun);
  process.exit(success ? 0 : 1);
}

main();
