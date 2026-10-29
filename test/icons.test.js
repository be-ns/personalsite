'use strict';

// The site icon (favicon.svg, generate-icons.js) and the web app manifest:
// a mark drawn as paths in the palette, its PNGs at the sizes they claim,
// and every page linking them.

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { ROOT, htmlPages, readPage } = require('./helpers');
const { ICONS } = require('../generate-icons');

const tokens = fs.readFileSync(path.join(ROOT, 'tokens.css'), 'utf8');
const palette = (name) => new RegExp(`--palette-${name}: (#[0-9A-F]{6});`, 'i').exec(tokens)[1].toUpperCase();
function pngSize(file) {
  const b = fs.readFileSync(file);
  assert.equal(b.toString('latin1', 1, 4), 'PNG', `${file} is a PNG`);
  return [b.readUInt32BE(16), b.readUInt32BE(20)];
}

test('favicon.svg is the mark: paths, no live font, Char on Toxic Orange', () => {
  const svg = fs.readFileSync(path.join(ROOT, 'favicon.svg'), 'utf8');
  assert.match(svg, /viewBox="0 0 100 100"/, 'a square');
  assert.doesNotMatch(svg, /<text|font-family|@font-face|<image/, 'drawn as paths, so it never waits on a font');
  assert.match(svg, /<g id="mark"/, 'the mark is one group generate-icons.js can scale');
  const colours = [...new Set([...svg.matchAll(/(?:fill|stroke)="(#[0-9A-Fa-f]{6})"/g)].map((m) => m[1].toUpperCase()))].sort();
  assert.deepEqual(colours, [palette('char'), palette('toxic-orange')].sort(), 'Char on Toxic Orange, nothing else');
  assert.doesNotMatch(svg, /#0047AB|#FFD200|Georgia/i, 'none of the old mark');
});

test('every PNG icon exists at the size it claims', () => {
  assert.ok(ICONS.some((i) => i.file === 'apple-touch-icon.png' && i.size === 180), 'the Apple touch icon, 180');
  for (const icon of ICONS) assert.deepEqual(pngSize(path.join(ROOT, icon.file)), [icon.size, icon.size], icon.file);
});

test('the manifest names the site in the new palette and lists real icons', () => {
  const m = JSON.parse(fs.readFileSync(path.join(ROOT, 'site.webmanifest'), 'utf8'));
  assert.equal(m.name, 'Ben Siverly');
  assert.equal(m.theme_color.toUpperCase(), palette('gondola'), 'theme colour is Gondola, the Night page');
  assert.equal(m.background_color.toUpperCase(), palette('gondola'), 'the splash is the Night page too');
  assert.doesNotMatch(m.description, /—/, 'no em dashes (my-voice.md)');
  for (const icon of m.icons) {
    const file = path.join(ROOT, icon.src.replace(/^\//, ''));
    assert.ok(fs.existsSync(file), `${icon.src} exists`);
    if (icon.type === 'image/png') assert.equal(pngSize(file).join('x'), icon.sizes, `${icon.src} is ${icon.sizes}`);
  }
  assert.ok(m.icons.some((i) => i.src === '/favicon.svg'), 'the SVG mark');
  assert.ok(m.icons.some((i) => i.sizes === '192x192' && i.purpose === 'any'), 'a 192 icon');
  assert.ok(m.icons.some((i) => i.sizes === '512x512' && i.purpose === 'any'), 'a 512 icon');
  assert.ok(m.icons.some((i) => i.sizes === '512x512' && i.purpose === 'maskable'), 'a maskable icon of its own');
});

test('every page links the icons and the manifest (the frozen case study aside)', () => {
  for (const page of htmlPages()) {
    if (page === 'cmp-case-study.html') continue;
    const html = readPage(page);
    const root = /href="\/favicon\.svg"/.test(html) ? '/' : '';
    for (const link of [
      `<link rel="icon" type="image/svg+xml" href="${root}favicon.svg">`,
      `<link rel="icon" type="image/png" sizes="32x32" href="${root}images/icon-32.png">`,
      `<link rel="apple-touch-icon" href="${root}apple-touch-icon.png">`,
      `<link rel="manifest" href="${root}site.webmanifest">`,
    ]) assert.ok(html.includes(link), `${page}: ${link}`);
    if (html.includes('<!-- chrome:head')) assert.ok(html.includes(`<meta name="theme-color" content="${palette('gondola')}">`), `${page}: theme-color is Gondola`);
  }
});
