'use strict';

const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');

function htmlPages() {
  return fs.readdirSync(ROOT).filter((f) => f.endsWith('.html')).sort();
}

function readPage(name) {
  return fs.readFileSync(path.join(ROOT, name), 'utf8');
}

// Inline script bodies, excluding JSON-LD and external scripts.
function inlineScripts(html) {
  const blocks = [];
  const re = /<script([^>]*)>([\s\S]*?)<\/script>/g;
  let m;
  while ((m = re.exec(html)) !== null) {
    const attrs = m[1];
    if (/src=/.test(attrs) || /application\/ld\+json/.test(attrs)) continue;
    if (m[2].trim()) blocks.push(m[2]);
  }
  return blocks;
}

module.exports = { ROOT, htmlPages, readPage, inlineScripts };
