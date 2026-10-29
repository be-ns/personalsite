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

test('the Workshop tools\' slider, steps and chart wash are specified with contrast pairs in both editions', () => {
  for (const name of ['slider', 'steps']) {
    assert.ok(theme.component[name] && theme.component[name].$description, `component.${name} is specified`);
  }
  for (const [edition, pairs] of Object.entries(theme.contrast)) {
    if (edition.startsWith('$')) continue;
    const named = (prefix) => pairs.filter((p) => typeof p[3] === 'string' && p[3].startsWith(prefix));
    for (const [prefix, want] of [['slider:', 3], ['steps:', 3], ['chart wash:', 4]]) {
      assert.ok(named(prefix).length >= want, `${edition}: ${prefix} has its contrast pairs`);
    }
    for (const p of pairs) assert.ok(p.length === 3 || (p.length === 4 && typeof p[3] === 'string'), `${edition}: ${JSON.stringify(p)} is [fg, bg, min] or [fg, bg, min, control]`);
  }
});

test('every edition defines the same roles as the default edition', () => {
  const keys = (e) => Object.keys(theme.editions[e]).filter((k) => !k.startsWith('$')).sort();
  for (const edition of Object.keys(theme.editions).filter((k) => !k.startsWith('$'))) {
    assert.deepEqual(keys(edition), keys(theme.meta.defaultEdition), `${edition} matches`);
  }
});

test('kit.html only reads custom properties that tokens.css or the page defines', () => {
  const kit = fs.readFileSync(path.join(ROOT, 'kit.html'), 'utf8');
  const tokens = fs.readFileSync(OUT, 'utf8');
  const site = fs.readFileSync(path.join(ROOT, 'site.css'), 'utf8');
  const defined = new Set([...`${tokens}\n${site}\n${kit}`.matchAll(/(--[a-z0-9-]+)\s*:/g)].map((m) => m[1]));
  // var(--name, fallback) may be undefined on purpose; a bare var(--name) may not.
  const bare = [...kit.matchAll(/var\((--[a-z0-9-]+)\)/g)].map((m) => m[1]);
  const missing = [...new Set(bare.filter((name) => !defined.has(name)))];
  assert.deepEqual(missing, [], `undefined custom properties: ${missing.join(', ')}`);
});

test('kit.html copy has no em dashes (my-voice.md)', () => {
  const kit = fs.readFileSync(path.join(ROOT, 'kit.html'), 'utf8');
  assert.doesNotMatch(kit, /—|&mdash;|&#8212;|&#x2014;/i);
});

test('the art generator draws the same symbols every run', () => {
  const { symbols, NAMES } = require('../generate-kit-art');
  assert.deepEqual(NAMES, ['still-life', 'street', 'marigold', 'poppy', 'can', 'balance', 'candle', 'trowel']);
  for (const name of NAMES) assert.equal(symbols([name]).svg, symbols([name]).svg, name);
  // Seeded, not random: a fresh process draws the same plates.
  const { execFileSync } = require('child_process');
  const again = execFileSync(process.execPath, ['-e', "process.stdout.write(require('./generate-kit-art').symbols(['poppy', 'can', 'balance', 'candle', 'trowel']).svg)"], { cwd: ROOT, maxBuffer: 1 << 26 }).toString();
  assert.equal(again, symbols(['poppy', 'can', 'balance', 'candle', 'trowel']).svg);
});

test('kit.html and site.css only read custom properties that tokens.css or they define', () => {
  const tokens = fs.readFileSync(OUT, 'utf8');
  const site = fs.readFileSync(path.join(ROOT, 'site.css'), 'utf8');
  for (const [name, text] of [['site.css', site], ['404.html', fs.readFileSync(path.join(ROOT, '404.html'), 'utf8')]]) {
    const defined = new Set([...`${tokens}\n${site}\n${text}`.matchAll(/(--[a-z0-9-]+)\s*:/g)].map((m) => m[1]));
    const bare = [...text.matchAll(/var\((--[a-z0-9-]+)\)/g)].map((m) => m[1]);
    const missing = [...new Set(bare.filter((v) => !defined.has(v)))];
    assert.deepEqual(missing, [], `${name}: undefined custom properties: ${missing.join(', ')}`);
  }
});

test('the Day rule turns paper inserts charcoal on screen, before any script', () => {
  const tokens = fs.readFileSync(OUT, 'utf8');
  assert.match(tokens, /@media screen \{\n {2}:root\[data-edition="day"\] \[data-insert\] \{/);
});
