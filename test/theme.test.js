'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const { ROOT } = require('./helpers');
const { loadTheme, resolve, build, contrast, OUT } = require('../build-tokens');

const theme = loadTheme();
const HEX = /^#[0-9A-F]{6}$/i;

test('tokens.css is in sync with theme.json (run `npm run tokens`)', () => {
  assert.equal(fs.readFileSync(OUT, 'utf8'), build(theme));
});

test('every font face in the theme is vendored with its license', () => {
  for (const face of theme.font.faces.$value) {
    assert.ok(fs.existsSync(path.join(ROOT, face.file)), `${face.file} exists`);
  }
  for (const license of ['OFL-Fraunces.txt', 'OFL-Newsreader.txt', 'OFL-InstrumentSans.txt']) {
    assert.ok(fs.existsSync(path.join(ROOT, 'assets', 'fonts', license)), `${license} exists`);
  }
});

test('the palette has no pure black or pure white', () => {
  for (const [name, token] of Object.entries(theme.palette)) {
    if (name.startsWith('$')) continue;
    assert.match(token.$value, HEX, `${name} is a hex color`);
    assert.ok(!/^#(000000|FFFFFF)$/i.test(token.$value), `${name} is not pure black or white`);
  }
});

for (const [edition, pairs] of Object.entries(theme.contrast)) {
  if (edition.startsWith('$')) continue;
  test(`${edition} edition color pairs meet WCAG AA`, () => {
    const roles = theme.editions[edition];
    for (const [fg, bg, min] of pairs) {
      const a = resolve(theme, roles[fg].$value);
      const b = resolve(theme, roles[bg].$value);
      assert.match(a, HEX, `${edition}.${fg} resolves to hex`);
      assert.match(b, HEX, `${edition}.${bg} resolves to hex`);
      const ratio = contrast(a, b);
      assert.ok(ratio >= min, `${fg} on ${bg}: ${ratio.toFixed(2)} < ${min}`);
    }
  });
}

test('every edition defines the same roles as the default edition', () => {
  const keys = (e) => Object.keys(theme.editions[e]).filter((k) => !k.startsWith('$')).sort();
  for (const edition of Object.keys(theme.editions).filter((k) => !k.startsWith('$'))) {
    assert.deepEqual(keys(edition), keys(theme.meta.defaultEdition), `${edition} matches`);
  }
});

test('kit.html only reads custom properties that tokens.css or the page defines', () => {
  const kit = fs.readFileSync(path.join(ROOT, 'kit.html'), 'utf8');
  const tokens = fs.readFileSync(OUT, 'utf8');
  const defined = new Set([...`${tokens}\n${kit}`.matchAll(/(--[a-z0-9-]+)\s*:/g)].map((m) => m[1]));
  // var(--name, fallback) may be undefined on purpose; a bare var(--name) may not.
  const bare = [...kit.matchAll(/var\((--[a-z0-9-]+)\)/g)].map((m) => m[1]);
  const missing = [...new Set(bare.filter((name) => !defined.has(name)))];
  assert.deepEqual(missing, [], `undefined custom properties: ${missing.join(', ')}`);
});

test('kit.html copy has no em dashes (my-voice.md)', () => {
  const kit = fs.readFileSync(path.join(ROOT, 'kit.html'), 'utf8');
  assert.doesNotMatch(kit, /—|&mdash;|&#8212;|&#x2014;/i);
});
