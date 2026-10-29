'use strict';

// Share cards (generate-og-images.js, npm run generate-og): every indexed
// page shows one, at its public filename, with the card's own alt text; the
// cards are the new design's, never the old palette's or fonts.

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { ROOT, htmlPages, readPage } = require('./helpers');
const { CARDS, ALT, SAFE, W, H, DEPTS, ART } = require('../generate-og-images');
const { NAMES } = require('../generate-kit-art');

const SITE = 'https://bensiverly.com/';
const decode = (s) => s.replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
const meta = (html, key) => {
  const m = new RegExp(`<meta (?:property|name)="${key.replace(/:/g, '\\:')}" content="([^"]*)"`).exec(html);
  return m ? decode(m[1]) : null;
};
// A PNG's size, from its IHDR chunk.
function pngSize(file) {
  const b = fs.readFileSync(file);
  assert.equal(b.toString('latin1', 1, 4), 'PNG', `${file} is a PNG`);
  return [b.readUInt32BE(16), b.readUInt32BE(20)];
}

test('every card is a 1200x630 PNG at its public filename', () => {
  assert.deepEqual([W, H], [1200, 630]);
  const files = CARDS.map((c) => c.file);
  assert.equal(new Set(files).size, files.length, 'one card a file');
  for (const card of CARDS) {
    const file = path.join(ROOT, 'images', card.file);
    assert.ok(fs.existsSync(file), `${card.file} exists (npm run generate-og)`);
    assert.deepEqual(pngSize(file), [W, H], `${card.file} is ${W}x${H}`);
  }
  // No card left behind: every og-*.png in images/ is one of the cards.
  const onDisk = fs.readdirSync(path.join(ROOT, 'images')).filter((f) => /^og-.*\.png$/.test(f)).sort();
  assert.deepEqual(onDisk, [...files].sort());
});

test('the sixteen filenames other sites already link to are all still cards', () => {
  const kept = ['home', 'decision-assist', 'life-strategy', 'memorial-pamphlet', 'native-plant-finder', 'service-of-life', 'memorial-preferences', 'resume', 'writings', 'building-things-worth-losing', 'serotiny', 'nobody-claps', 'come-down', 'hot-pig-summer', 'the-room-love-needs-to-breathe', 'milk'];
  for (const name of kept) assert.ok(CARDS.some((c) => c.file === `og-${name}.png`), `og-${name}.png`);
});

test('every indexed page carries its card, with the card\'s alt text', () => {
  const sitemap = fs.readFileSync(path.join(ROOT, 'sitemap.xml'), 'utf8');
  const indexed = [...sitemap.matchAll(/<loc>https:\/\/bensiverly\.com\/([^<]*)<\/loc>/g)].map((m) => m[1] || 'index.html');
  for (const page of indexed) assert.ok(CARDS.some((c) => c.page === page), `${page} has a share card`);
  for (const card of CARDS) {
    const html = readPage(card.page);
    const url = `${SITE}images/${card.file}`;
    assert.equal(meta(html, 'og:image'), url, `${card.page} og:image`);
    assert.equal(meta(html, 'twitter:image'), url, `${card.page} twitter:image`);
    assert.equal(meta(html, 'twitter:card'), 'summary_large_image', `${card.page} twitter:card`);
    assert.equal(meta(html, 'og:image:width'), String(W), `${card.page} og:image:width`);
    assert.equal(meta(html, 'og:image:height'), String(H), `${card.page} og:image:height`);
    assert.equal(meta(html, 'og:image:alt'), ALT(card), `${card.page} og:image:alt`);
  }
  // No page points at an image that is not a card.
  for (const page of htmlPages()) {
    const img = meta(readPage(page), 'og:image');
    if (img) assert.ok(CARDS.some((c) => `${SITE}images/${c.file}` === img), `${page}: ${img} is a card`);
  }
});

test('each card is a department of the issue, set in its words and art', () => {
  for (const card of CARDS) {
    assert.ok(DEPTS[card.dept], `${card.file}: department ${card.dept}`);
    assert.ok(NAMES.includes(card.art[0]) && ART[card.art[0]], `${card.file}: art ${card.art[0]}`);
    assert.match(card.art[1], /^-?\d+ -?\d+ \d+ \d+$/, `${card.file}: a crop "x y w h"`);
    for (const text of [card.kicker, card.title, card.line, card.what, ALT(card)]) {
      assert.doesNotMatch(text, /—|&mdash;/, `${card.file}: no em dashes (my-voice.md)`);
      assert.ok(text.trim().length, `${card.file}: no empty words`);
    }
  }
  assert.deepEqual(SAFE, [300, 900], 'the words stay in the middle a square crop keeps');
  // The Workshop tools and Consulting have plates of their own.
  const art = (page) => CARDS.find((c) => c.page === page).art[0];
  assert.equal(art('native-plant-finder.html'), 'poppy');
  assert.equal(art('consulting.html'), 'trowel');
});

test('the cards leave the old design behind: no old palette, no old fonts', () => {
  const src = fs.readFileSync(path.join(ROOT, 'generate-og-images.js'), 'utf8');
  for (const old of [/Zilla/i, /\bInter\b/, /JetBrains/i, /#0047AB/i, /#FFE227/i, /#0D7377/i, /#FAF9F7/i, /cobalt/i, /styles\.css/]) {
    assert.doesNotMatch(src, old, `generate-og-images.js mentions ${old}`);
  }
  assert.match(src, /tokens\.css/, 'set with the site\'s own tokens');
  assert.match(src, /site\.css/, 'and the site\'s own CSS');
});
