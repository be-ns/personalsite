'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const { ROOT, htmlPages, readPage } = require('./helpers');

function internalTargets(html) {
  const markup = html.replace(/<script[\s\S]*?<\/script>/g, '');
  const targets = [];
  const re = /(?:href|src)="([^"#]+)(?:#[^"]*)?"/g;
  let m;
  while ((m = re.exec(markup)) !== null) {
    const url = m[1];
    if (/^(https?:|mailto:|data:|tel:)/.test(url)) continue;
    targets.push(url);
  }
  return targets;
}

for (const page of htmlPages()) {
  test(`${page} internal links resolve to real files`, () => {
    for (const target of internalTargets(readPage(page))) {
      const file = path.join(ROOT, target.replace(/^\//, '').split('?')[0]);
      assert.ok(fs.existsSync(file), `${target} should exist`);
    }
  });
}

test('sitemap.xml lists every page and nothing else', () => {
  const sitemap = fs.readFileSync(path.join(ROOT, 'sitemap.xml'), 'utf8');
  const listed = [...sitemap.matchAll(/<loc>https:\/\/bensiverly\.com\/([^<]*)<\/loc>/g)]
    .map((m) => m[1] || 'index.html')
    .sort();
  assert.deepEqual(listed, htmlPages());
});

test('robots.txt points at the sitemap', () => {
  const robots = fs.readFileSync(path.join(ROOT, 'robots.txt'), 'utf8');
  assert.match(robots, /Sitemap: https:\/\/bensiverly\.com\/sitemap\.xml/);
});
