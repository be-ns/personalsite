'use strict';

// No client names (redesign-plan.md, QA every step). Prospective clients are
// never named on the site. Their names live only in a local list,
// .client-names at the repo root, which .gitignore keeps out of the repo:
// one name a line, blank lines and lines starting with # ignored. When the
// list is here, every page, every Markdown file (the consulting sources are
// published as they are), llms.txt, sitemap.xml and the latest commit
// message are checked against it, case aside, as whole words. Without the
// list (CI, a fresh clone) the test skips.

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

const { ROOT, htmlPages, readPage } = require('./helpers');

const LIST = path.join(ROOT, '.client-names');

function names() {
  return fs.readFileSync(LIST, 'utf8').split('\n').map((l) => l.trim()).filter((l) => l && !l.startsWith('#'));
}

function markdownFiles(dir = ROOT, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name.startsWith('.') || entry.name === 'node_modules') continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) markdownFiles(full, out);
    else if (entry.name.endsWith('.md')) out.push(path.relative(ROOT, full));
  }
  return out.sort();
}

const pattern = (name) => new RegExp(`(^|[^\\p{L}\\p{N}])${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\s+/g, '\\s+')}(?=$|[^\\p{L}\\p{N}])`, 'iu');

test('.client-names is kept out of the repo', () => {
  const ignore = fs.readFileSync(path.join(ROOT, '.gitignore'), 'utf8').split('\n').map((l) => l.trim());
  assert.ok(ignore.includes('.client-names'), '.gitignore lists .client-names');
});

test('no prospective client is named on the site, in its Markdown or in the last commit message', (t) => {
  if (!fs.existsSync(LIST)) {
    t.skip('no local .client-names list here; nothing to check against');
    return;
  }
  const list = names();
  const texts = [
    ...htmlPages().map((page) => [page, readPage(page)]),
    ...markdownFiles().map((file) => [file, fs.readFileSync(path.join(ROOT, file), 'utf8')]),
    ...['llms.txt', 'sitemap.xml'].map((file) => [file, readPage(file)]),
  ];
  try {
    texts.push(['the latest commit message', execFileSync('git', ['log', '-1', '--format=%B'], { cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] })]);
  } catch {
    // Not a git checkout: the files are still checked.
  }
  const found = [];
  for (const name of list) {
    const re = pattern(name);
    for (const [where, text] of texts) if (re.test(text)) found.push(`${where} names a client from .client-names`);
  }
  // The names themselves stay out of the report, which CI logs keep.
  assert.deepEqual(found, []);
});

test('the client-name match is whole words, case aside', () => {
  assert.ok(pattern('Acme Rentals').test('We helped acme  rentals last year.'));
  assert.ok(!pattern('Acme').test('Acmes and acmeville'));
  assert.ok(pattern('Acme').test('(Acme)'));
});
