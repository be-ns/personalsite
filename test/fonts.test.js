'use strict';

// The vendored faces are Latin subsets (theme.json). A character outside them
// falls back to some other font, on screen and in the résumé PDF, so pages on
// the new chrome and site.css may only use characters every face carries.

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const zlib = require('node:zlib');

const { ROOT, readPage } = require('./helpers');
const { loadTheme } = require('../build-tokens');
const { parseHtml, findAll, textContent, chromePages } = require('../build-pages');

// ---- a minimal WOFF2 reader: enough to pull out the cmap table ----
const KNOWN = ['cmap', 'head', 'hhea', 'hmtx', 'maxp', 'name', 'OS/2', 'post', 'cvt ', 'fpgm', 'glyf', 'loca', 'prep', 'CFF ', 'VORG', 'EBDT', 'EBLC', 'gasp', 'hdmx', 'kern', 'LTSH', 'PCLT', 'VDMX', 'vhea', 'vmtx', 'BASE', 'GDEF', 'GPOS', 'GSUB', 'EBSC', 'JSTF', 'MATH', 'CBDT', 'CBLC', 'COLR', 'CPAL', 'SVG ', 'sbix', 'acnt', 'avar', 'bdat', 'bloc', 'bsln', 'cvar', 'fdsc', 'feat', 'fmtx', 'fvar', 'gvar', 'hsty', 'just', 'lcar', 'mort', 'morx', 'opbd', 'prop', 'trak', 'Zapf', 'Silf', 'Glat', 'Gloc', 'Feat', 'Sill'];

function base128(buf, at) {
  let value = 0;
  for (let i = 0; i < 5; i++) {
    const byte = buf[at.pos++];
    value = value * 128 + (byte & 0x7f);
    if (!(byte & 0x80)) return value;
  }
  throw new Error('bad UIntBase128');
}

function woff2Tables(file) {
  const buf = fs.readFileSync(file);
  assert.equal(buf.toString('latin1', 0, 4), 'wOF2', `${file} is WOFF2`);
  const numTables = buf.readUInt16BE(12);
  const compressed = buf.readUInt32BE(20);
  const at = { pos: 48 };
  const dir = [];
  for (let i = 0; i < numTables; i++) {
    const flags = buf[at.pos++];
    let tag = KNOWN[flags & 0x3f];
    if ((flags & 0x3f) === 63) { tag = buf.toString('latin1', at.pos, at.pos + 4); at.pos += 4; }
    const version = flags >> 6;
    const origLength = base128(buf, at);
    const transformed = tag === 'glyf' || tag === 'loca' ? version !== 3 : version !== 0;
    const length = transformed ? base128(buf, at) : origLength;
    dir.push({ tag, length });
  }
  const data = zlib.brotliDecompressSync(buf.subarray(at.pos, at.pos + compressed));
  const tables = {};
  let offset = 0;
  for (const t of dir) { tables[t.tag] = data.subarray(offset, offset + t.length); offset += t.length; }
  return tables;
}

// Every code point the cmap maps to a real glyph.
function cmapCodepoints(cmap) {
  const n = cmap.readUInt16BE(2);
  const records = [];
  for (let i = 0; i < n; i++) records.push({ platform: cmap.readUInt16BE(4 + i * 8), encoding: cmap.readUInt16BE(6 + i * 8), offset: cmap.readUInt32BE(8 + i * 8) });
  const pick = records.find((r) => r.platform === 3 && r.encoding === 10) || records.find((r) => r.platform === 3 && r.encoding === 1) || records.find((r) => r.platform === 0);
  const t = cmap.subarray(pick.offset);
  const format = t.readUInt16BE(0);
  const out = new Set();
  if (format === 12) {
    const groups = t.readUInt32BE(12);
    for (let g = 0; g < groups; g++) {
      const start = t.readUInt32BE(16 + g * 12);
      const end = t.readUInt32BE(20 + g * 12);
      const glyph = t.readUInt32BE(24 + g * 12);
      for (let c = start; c <= end; c++) if (glyph + (c - start)) out.add(c);
    }
    return out;
  }
  assert.equal(format, 4, 'cmap format 4 or 12');
  const segs = t.readUInt16BE(6) / 2;
  const ends = 14;
  const starts = ends + segs * 2 + 2;
  const deltas = starts + segs * 2;
  const ranges = deltas + segs * 2;
  for (let s = 0; s < segs; s++) {
    const end = t.readUInt16BE(ends + s * 2);
    const start = t.readUInt16BE(starts + s * 2);
    const delta = t.readInt16BE(deltas + s * 2);
    const range = t.readUInt16BE(ranges + s * 2);
    for (let c = start; c <= end && c !== 0xffff; c++) {
      let glyph;
      if (range === 0) glyph = (c + delta) & 0xffff;
      else {
        const g = t.readUInt16BE(ranges + s * 2 + range + (c - start) * 2);
        glyph = g ? (g + delta) & 0xffff : 0;
      }
      if (glyph) out.add(c);
    }
  }
  return out;
}

const faces = loadTheme().font.faces.$value.map((f) => f.file);
const coverage = Object.fromEntries(faces.map((f) => [f, cmapCodepoints(woff2Tables(path.join(ROOT, f)).cmap)]));
const common = [...coverage[faces[0]]].filter((c) => faces.every((f) => coverage[f].has(c)));
const COMMON = new Set(common);
const hex = (c) => `U+${c.toString(16).toUpperCase().padStart(4, '0')}`;

test('every face carries the thin space, the four-per-em space and the arrows', () => {
  for (const f of faces) {
    for (const c of [0x2005, 0x2009, 0x2190, 0x2192]) assert.ok(coverage[f].has(c), `${f} has ${hex(c)}`);
  }
});

// The characters a reader sees: page text outside scripts and styles,
// placeholders, and CSS generated content.
function visibleText(html) {
  const doc = parseHtml(html);
  const skip = (el) => el.tag === 'script' || el.tag === 'style';
  const body = findAll(doc, (el) => el.tag === 'body')[0];
  const title = findAll(doc, (el) => el.tag === 'title')[0];
  const placeholders = findAll(doc, (el) => 'placeholder' in el.attrs).map((el) => el.attrs.placeholder);
  const styles = findAll(doc, (el) => el.tag === 'style').map((el) => textContent(el));
  return [textContent(body, skip), title ? textContent(title) : '', ...placeholders, ...styles.map(cssContent)].join('\n');
}

function cssContent(css) {
  return [...css.matchAll(/content:\s*(["'])(.*?)\1/g)].map((m) => m[2].replace(/\\([0-9a-f]{1,6})\s?/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))).join('');
}

function outside(text) {
  return [...new Set([...text].map((ch) => ch.codePointAt(0)))].filter((c) => c > 0x7e && !COMMON.has(c)).map(hex);
}

for (const page of chromePages()) {
  test(`${page} uses only characters every face carries`, () => {
    assert.deepEqual(outside(visibleText(readPage(page))), []);
  });
}

test('site.css uses only characters every face carries', () => {
  assert.deepEqual(outside(fs.readFileSync(path.join(ROOT, 'site.css'), 'utf8')), []);
});

// The wizard tools render their screens from script, so the characters in
// their inline scripts reach the page too.
for (const page of chromePages()) {
  test(`${page}: what its scripts render uses only characters every face carries`, () => {
    const { inlineScripts } = require('./helpers');
    assert.deepEqual(outside(inlineScripts(readPage(page)).join('\n')), []);
  });
}
