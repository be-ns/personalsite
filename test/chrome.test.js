'use strict';

// The shared chrome: build-pages.js stamps it, this file holds the ratchet.
// Every page either carries the chrome, waits in PENDING, or is EXEMPT with a
// written reason. PENDING may only shrink, and must end empty.

const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

const { ROOT, htmlPages, readPage } = require('./helpers');
const press = require('../build-pages');

// The pages still on the old design when the chrome arrived (step 0 of
// redesign-plan.md). Frozen: a new page is born with the chrome.
const ORIGINAL_PENDING = [
  'building-things-worth-losing.html', 'come-down.html', 'decision-assist.html', 'hot-pig-summer.html',
  'index.html', 'life-strategy.html', 'memorial-pamphlet.html', 'memorial-preferences.html', 'milk.html',
  'native-plant-finder.html', 'nobody-claps.html', 'orale.html', 'resume.html', 'serotiny.html',
  'service-of-life.html', 'the-room-love-needs-to-breathe.html', 'writings.html',
];

// Not migrated yet. Take a page off this list in the commit that stamps it.
const PENDING = [
  'building-things-worth-losing.html', 'come-down.html', 'decision-assist.html', 'hot-pig-summer.html',
  'memorial-pamphlet.html', 'memorial-preferences.html', 'milk.html',
  'native-plant-finder.html', 'nobody-claps.html', 'orale.html', 'serotiny.html',
  'service-of-life.html', 'the-room-love-needs-to-breathe.html', 'writings.html',
];

// Pages that never take the whole chrome, and the regions they do take.
const EXEMPT = {
  'cmp-case-study.html': {
    regions: [],
    reason: 'A frozen hiring submission: noindex, linked from nowhere, kept exactly as it was sent.',
  },
  'orale.html': {
    regions: ['head'],
    reason: 'A private single-user practice app with its own controls: it takes the head (fonts, tokens, edition) and keeps its own screens.',
  },
};

const FULL = ['head', 'top', 'colophon', 'script'];
const regions = (page) => Object.keys(press.regionsOf(page, readPage(page)).found);

test('PENDING only shrinks', () => {
  for (const page of PENDING) assert.ok(ORIGINAL_PENDING.includes(page), `${page} was not pending at step 0; new pages carry the chrome from the start`);
  assert.equal(new Set(PENDING).size, PENDING.length, 'no page is listed twice');
});

test('every exemption has a reason', () => {
  for (const [page, { reason, regions: allowed }] of Object.entries(EXEMPT)) {
    assert.ok(fs.existsSync(path.join(ROOT, page)), `${page} exists`);
    assert.ok(reason && reason.length > 20, `${page} says why it is exempt`);
    assert.ok(allowed.every((r) => press.REGIONS.includes(r)), `${page} names real regions`);
  }
});

for (const page of htmlPages()) {
  test(`${page} carries the chrome it should`, () => {
    const has = regions(page).filter((r) => r !== 'art').sort();
    if (PENDING.includes(page)) {
      assert.deepEqual(has, [], `${page} is PENDING, so it carries no chrome yet; take it off PENDING when you stamp it`);
      return;
    }
    const want = (EXEMPT[page] ? EXEMPT[page].regions : FULL).slice().sort();
    assert.deepEqual(has, want, `${page} carries ${want.join(', ') || 'no chrome regions'}`);
  });
}

const stamped = () => htmlPages().filter((p) => regions(p).length);

test('every stamped page is in sync with build-pages.js and site.json (run `npm run pages`)', () => {
  assert.deepEqual(press.check(), []);
});

test('stamping is idempotent', () => {
  for (const page of stamped()) {
    const once = readPage(page);
    assert.equal(press.stamp(page, once), once, `${page} is stable`);
  }
});

test('pages on the new chrome leave the old design system behind', () => {
  for (const page of stamped().filter((p) => regions(p).includes('top'))) {
    const html = readPage(page);
    assert.doesNotMatch(html, /fonts\.googleapis\.com|fonts\.gstatic\.com/, `${page} loads no Google Fonts`);
    assert.doesNotMatch(html, /href="\/?styles\.css"/, `${page} does not load styles.css`);
    assert.match(html, /href="\/?site\.css"/, `${page} loads site.css`);
  }
});

test('copy on the new chrome has no em dashes (my-voice.md)', () => {
  for (const file of [...stamped(), 'site.css', 'site.json']) {
    assert.doesNotMatch(fs.readFileSync(path.join(ROOT, file), 'utf8'), /—|&mdash;|&#8212;|&#x2014;/i, `${file}`);
  }
});

test('404.html links root-absolute, so it works at any missing path', () => {
  const doc = press.parseHtml(readPage('404.html'));
  for (const el of press.findAll(doc, (e) => 'href' in e.attrs || 'src' in e.attrs)) {
    const url = el.attrs.href || el.attrs.src;
    assert.match(url, /^(\/|#|https:|mailto:)/, `${url} is root-absolute`);
  }
  assert.match(readPage('404.html'), /<meta name="robots" content="noindex">/);
});

test('site.json keeps the facts the chrome needs', () => {
  const site = press.loadSite();
  assert.equal(site.issue.season, 'Autumn 2026');
  assert.deepEqual(site.departments.map((d) => d.num), ['01', '02', '03', '04']);
  assert.ok(fs.existsSync(path.join(ROOT, site.resume.pdf)), 'the public résumé PDF exists');
  assert.ok(readPage(site.resume.page).includes(`href="${site.resume.pdf}"`), 'resume.html offers the same PDF');
  // The same base64 address the home page uses.
  assert.ok(readPage('index.html').includes(`data-email="${site.contact.email}"`));
});

test('consulting stays off until its pages exist (redesign-plan.md, step 5)', () => {
  const site = press.loadSite();
  assert.equal(site.consulting.enabled, false);
  for (const page of htmlPages()) {
    const html = readPage(page);
    assert.doesNotMatch(html, /href="\/?consulting[^"]*\.html/, `${page} links no consulting page`);
    if (!page.startsWith('consulting')) assert.ok(!html.includes('$250'), `${page} shows no rate`);
  }
});

test('the press refuses what the grammar does not allow', () => {
  const page = 'example.html';
  const shell = (headJson = '', topJson = '') => `<!DOCTYPE html>\n<html lang="en">\n<head>\n  <!-- chrome:head${headJson} -->\n  <!-- /chrome:head -->\n</head>\n<body>\n  <!-- chrome:top${topJson} -->\n  <!-- /chrome:top -->\n  <main id="main"><h1>Hi</h1></main>\n  <!-- chrome:colophon -->\n  <!-- /chrome:colophon -->\n  <!-- chrome:script -->\n  <!-- /chrome:script -->\n</body>\n</html>\n`;
  assert.doesNotThrow(() => press.stamp(page, shell()));
  assert.throws(() => press.stamp(page, shell(' {"colour":"red"}')), /unknown parameter "colour"/);
  assert.throws(() => press.stamp(page, shell(' {"dept":"work"}')), /"dept" belongs on chrome:top/);
  assert.throws(() => press.stamp(page, shell('', ' {"dept":"kitchen"}')), /dept must be one of/);
  assert.throws(() => press.stamp(page, shell(' {"root":"/"}')), /only 404.html takes root/);
  assert.throws(() => press.stamp(page, shell().replace('<main id="main">', '<main id="menu">')), /ids used by both the chrome and the page: menu/);
  assert.throws(() => press.stamp(page, shell().replace('  <!-- chrome:script -->\n  <!-- /chrome:script -->\n', '')), /come together/);
  assert.throws(() => press.stamp(page, shell().replace('<body>\n', '<body>\n  <p>first</p>\n')), /chrome:top must come first/);
  assert.throws(() => press.stamp(page, shell().replace('<!-- chrome:colophon -->\n  <!-- /chrome:colophon -->', '<script>/* <!-- chrome:colophon --> */</script>')), /never closed|closes nothing|opens inside|inside a script|come together/);
  assert.throws(() => press.stamp(page, shell().replace('<main id="main"><h1>Hi</h1></main>', '<main id="main"><svg><use href="#art-marigold"/></svg></main>')), /does not name "marigold"|only a chrome:art region/);
});

// ---------------------------------------------------------------- freeze ----
// The chrome froze once the home page and Life Strategy shipped (step 2 of
// redesign-plan.md). From here on every page's masthead, menu sheet, head
// links, colophon and chrome script come from the one set of partials in
// build-pages.js, with no per-page hand edits:
//
//   1. On each frozen page, emptying the regions and stamping again gives
//      back the committed bytes, region by region.
//   2. Take out the per-page parameters (the root, the current department,
//      links to sections the issue itself carries, the home colophon's own
//      lines) and every page carries the same chrome, byte for byte.
//   3. That chrome matches the fingerprint in test/fixtures/chrome-freeze.json.
//      Changing the chrome after the freeze is a deliberate act: change
//      build-pages.js or site.json, run `npm run pages`, and update the
//      fixture in the same commit, saying why.
const FROZEN = ['index.html', 'kit.html', '404.html', 'life-strategy.html'];
const SHARED = ['head', 'top', 'colophon', 'script'];
const freeze = JSON.parse(fs.readFileSync(path.join(__dirname, 'fixtures', 'chrome-freeze.json'), 'utf8'));
const sha = (text) => crypto.createHash('sha256').update(text).digest('hex');

// A region's markup as committed: the text between its markers.
function regionText(page, html, name) {
  const r = press.regionsOf(page, html).found[name];
  return r ? html.slice(r.openEnd, r.close) : null;
}

// The region with the page's own parameters taken out, and its indentation.
function normalized(name, text) {
  const site = press.loadSite();
  const esc = (v) => String(v).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const depts = site.departments.map((d) => d.id).join('|');
  let lines = text.split('\n').map((l) => l.trim()).filter(Boolean);
  if (name === 'colophon') {
    const contact = `<p class="t-small">${esc(site.home.contact)}</p>`;
    lines = lines.filter((l) => !l.startsWith('<p class="t-small colophon-note">') && l !== contact);
  }
  return lines.join('\n')
    .replace(/ aria-current="(true|page)"/g, '')
    .replace(/ id="contact-heading"/g, '')
    .replace(/href="\/#/g, 'href="index.html#')
    .replace(/href="\/"/g, 'href="index.html"')
    .replace(/(href|src)="\/(?!\/)/g, '$1="')
    .replace(new RegExp(`href="#(${depts})"`, 'g'), 'href="index.html#$1"');
}

const shelled = () => stamped().filter((p) => regions(p).includes('top'));

test('the frozen pages carry the whole chrome', () => {
  for (const page of FROZEN) assert.deepEqual(regions(page).filter((r) => r !== 'art').sort(), FULL.slice().sort(), `${page} carries ${FULL.join(', ')}`);
  assert.deepEqual(freeze.pages, FROZEN, 'the fixture names the same pages');
});

for (const page of FROZEN) {
  test(`${page}: every chrome region is the press's own output, no hand edits`, () => {
    const html = readPage(page);
    const { found, order } = press.regionsOf(page, html);
    const again = press.stamp(page, press.blankRegions(html, order));
    for (const name of Object.keys(found)) {
      assert.equal(regionText(page, html, name), regionText(page, again, name), `${page}: chrome:${name} differs from what build-pages.js writes`);
    }
    assert.equal(html, again, `${page} restamps to the same bytes`);
  });
}

test('every page with the chrome carries the same partials, once its parameters are taken out', () => {
  const pages = shelled();
  for (const page of FROZEN) assert.ok(pages.includes(page), `${page} is stamped`);
  for (const name of SHARED) {
    const want = normalized(name, regionText(FROZEN[0], readPage(FROZEN[0]), name));
    for (const page of pages) {
      assert.equal(normalized(name, regionText(page, readPage(page), name)), want, `${page}: chrome:${name} is not the frozen ${name} (compared with ${FROZEN[0]})`);
    }
  }
  // Pages that take the head alone (orale.html, when it moves) share it too.
  for (const page of stamped().filter((p) => !pages.includes(p))) {
    assert.equal(normalized('head', regionText(page, readPage(page), 'head')), normalized('head', regionText(FROZEN[0], readPage(FROZEN[0]), 'head')), `${page}: chrome:head`);
  }
});

test('every engraving is drawn the same on every page that shows it', () => {
  const drawings = new Map();
  for (const page of stamped()) {
    const art = regionText(page, readPage(page), 'art');
    if (!art) continue;
    for (const m of art.matchAll(/<symbol id="(art-[a-z-]+)"[\s\S]*?<\/symbol>/g)) {
      if (!drawings.has(m[1])) drawings.set(m[1], { page, svg: m[0] });
      else assert.equal(m[0], drawings.get(m[1]).svg, `${page}: #${m[1]} differs from ${drawings.get(m[1]).page}`);
    }
  }
  assert.ok(drawings.has('art-marigold'), 'the marigold is shown');
});

test('the chrome matches the freeze (test/fixtures/chrome-freeze.json)', () => {
  const got = Object.fromEntries(SHARED.map((name) => [name, sha(normalized(name, regionText(FROZEN[0], readPage(FROZEN[0]), name)))]));
  assert.deepEqual(got, freeze.regions, 'The frozen chrome changed. If that is on purpose, put these fingerprints in test/fixtures/chrome-freeze.json in the same commit and say why in its message.');
});
