'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const { ROOT, htmlPages, readPage } = require('./helpers');
const { parseHtml, findAll } = require('../build-pages');

// Department sections that index.html gains when it becomes the issue (step 1
// of redesign-plan.md). The chrome on kit.html and 404.html already links to
// them. Remove an entry once index.html carries that id; the last test below
// fails until you do.
const FORWARD = { 'index.html': ['work', 'method', 'workshop', 'writing'] };

// Every internal URL in the static markup (scripts aside): href, src and srcset.
function urls(html) {
  const doc = parseHtml(html);
  const out = [];
  for (const el of findAll(doc, (e) => e.tag !== 'script')) {
    for (const attr of ['href', 'src']) if (attr in el.attrs) out.push(el.attrs[attr]);
    if ('srcset' in el.attrs) out.push(...el.attrs.srcset.split(',').map((s) => s.trim().split(/\s+/)[0]).filter(Boolean));
  }
  return out.filter((u) => !/^(https?:|mailto:|data:|tel:|javascript:)/.test(u));
}

// The page a URL points at, relative to the site root ('' means this page).
function targetFile(url, page) {
  const file = url.split('#')[0].split('?')[0];
  if (file === '') return page;
  if (file === '/') return 'index.html';
  return file.replace(/^\//, '');
}

const idCache = new Map();
function idsOf(file) {
  if (!idCache.has(file)) {
    const doc = parseHtml(fs.readFileSync(path.join(ROOT, file), 'utf8'));
    idCache.set(file, new Set(findAll(doc, (el) => 'id' in el.attrs).map((el) => el.attrs.id)));
  }
  return idCache.get(file);
}

for (const page of htmlPages()) {
  test(`${page} internal links resolve to real files`, () => {
    for (const url of urls(readPage(page))) {
      const file = targetFile(url, page);
      assert.ok(fs.existsSync(path.join(ROOT, file)), `${url} should exist`);
    }
  });

  test(`${page} #fragments point at real ids`, () => {
    for (const url of urls(readPage(page))) {
      const hash = url.indexOf('#');
      if (hash < 0) continue;
      const frag = decodeURIComponent(url.slice(hash + 1));
      if (frag === '' || frag === 'top') continue;
      const file = targetFile(url, page);
      if (!file.endsWith('.html')) continue;
      if ((FORWARD[file] || []).includes(frag)) continue;
      assert.ok(idsOf(file).has(frag), `${url} on ${page}: ${file} has no id="${frag}"`);
    }
  });
}

test('forward links are still forward (drop them from FORWARD once they land)', () => {
  for (const [file, frags] of Object.entries(FORWARD)) {
    for (const frag of frags) assert.ok(!idsOf(file).has(frag), `${file} now has #${frag}: remove it from FORWARD in links.test.js`);
  }
});

test('sitemap.xml lists every page and nothing else', () => {
  const sitemap = fs.readFileSync(path.join(ROOT, 'sitemap.xml'), 'utf8');
  const listed = [...sitemap.matchAll(/<loc>https:\/\/bensiverly\.com\/([^<]*)<\/loc>/g)]
    .map((m) => m[1] || 'index.html')
    .sort();
  // Pages marked noindex (the 404 error page, private tools) stay out of the sitemap.
  const indexable = htmlPages().filter((p) => !/<meta name="robots" content="noindex/.test(readPage(p)));
  assert.deepEqual(listed, indexable);
});

test('robots.txt points at the sitemap', () => {
  const robots = fs.readFileSync(path.join(ROOT, 'robots.txt'), 'utf8');
  assert.match(robots, /Sitemap: https:\/\/bensiverly\.com\/sitemap\.xml/);
});
