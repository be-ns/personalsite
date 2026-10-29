'use strict';

// The résumé on proof stock (redesign-plan.md, step 3). The redesign
// retypeset it and changed none of its words: test/fixtures/resume-content.json
// holds the text, links, emphasis, AppFolio lines and versions captured from
// the page before the move, plus the Proptech sheet added since, and this
// file holds the page to them. Two sheets share the markup: Proptech, the
// default, and Payments, which the Payments, AI-Native and General versions
// print. The four PDFs are checked as files here (one Letter page, the site's faces only);
// render-resume-pdf.js checks them again as it writes them, with their
// reading order, and check-browser.js prints every version.

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const { ROOT, readPage, inlineScripts } = require('./helpers');
const { parseHtml, findAll, hasClass, textContent, loadSite } = require('../build-pages');
const { inspect, fills, VERSIONS: RENDERED, FACES } = require('../render-resume-pdf');

const fixture = JSON.parse(fs.readFileSync(path.join(__dirname, 'fixtures', 'resume-content.json'), 'utf8'));
const contract = JSON.parse(fs.readFileSync(path.join(__dirname, 'fixtures', 'agent-contract.json'), 'utf8')).resume;

const html = readPage('resume.html');
const doc = parseHtml(html);
const sheets = findAll(doc, (el) => hasClass(el, 'resume-sheet'));
const sheet = sheets[0];
const flat = (el) => textContent(el, (e) => e.tag === 'script' || e.tag === 'style').replace(/\s+/g, ' ').trim();

// The page script's VERSIONS map and default, read the way the page reads them.
function script() {
  const js = inlineScripts(html).find((s) => s.includes('const VERSIONS'));
  assert.ok(js, 'resume.html has its version script');
  const literal = /const VERSIONS = (\{[\s\S]*?\n {6}\});/.exec(js);
  assert.ok(literal, 'the VERSIONS map is where the script keeps it');
  // Through JSON, so the map's arrays are this realm's, not the vm's.
  return { versions: JSON.parse(JSON.stringify(vm.runInNewContext(`(${literal[1]})`))), default: /const DEFAULT = '([a-z-]+)'/.exec(js)[1], js };
}

// Whether an element prints in a version: no ancestor (or itself) belongs to
// the other sheet, and an AppFolio line is one the version lists.
function shows(el, v) {
  for (let e = el; e; e = e.parent) {
    if (e.attrs && 'data-sheet' in e.attrs && e.attrs['data-sheet'] !== v.sheet) return false;
    if (e.attrs && 'data-bullet' in e.attrs && !v.bulletOrder.includes(e.attrs['data-bullet'])) return false;
  }
  return true;
}
const hiddenInMarkup = (el) => { for (let e = el; e; e = e.parent) if (e.attrs && 'hidden' in e.attrs) return true; return false; };

test('the résumé is one sheet of proof stock, renamed from .sheet', () => {
  assert.equal(sheets.length, 1, 'one .resume-sheet');
  assert.equal(sheet.attrs['data-edition'], 'day', 'paper in either edition (data-edition="day")');
  assert.ok(!('data-insert' in sheet.attrs), 'proof stock, not an insert: it never flips');
  assert.ok(hasClass(sheet, 'proof'), 'it takes the paper proof styles');
  assert.equal(findAll(doc, (el) => hasClass(el, 'sheet')).length, 0, 'no element keeps the old .sheet class, which the menu sheet would fight in print');
  const main = findAll(doc, (el) => el.tag === 'main')[0];
  assert.ok(findAll(main, (el) => el === sheet).length, 'the sheet is in <main>');
});

test('the words did not change: same text, same order', () => {
  assert.equal(flat(sheet), fixture.text);
});

test('the links, the emphasis and the AppFolio lines did not change', () => {
  assert.deepEqual(findAll(sheet, (el) => el.tag === 'a').map((a) => ({ href: a.attrs.href, text: flat(a) })), fixture.links);
  assert.deepEqual(findAll(sheet, (el) => el.tag === 'strong').map(flat), fixture.strong);
  const bullets = findAll(sheet, (el) => 'data-bullet' in el.attrs);
  assert.deepEqual(Object.fromEntries(bullets.map((li) => [li.attrs['data-bullet'], flat(li)])), fixture.bullets);
  assert.ok(bullets.every((li) => li.parent.attrs.id === 'appfolioBullets'), 'every keyed line is in #appfolioBullets, where the script reorders them');
});

test('the versions did not change: titles, line orders, PDFs and the default', () => {
  const { versions, default: fallback, js } = script();
  assert.deepEqual(versions, fixture.versions);
  assert.equal(fallback, fixture.default);
  assert.equal(fallback, contract.default);
  const sheetNames = [...new Set(findAll(sheet, (el) => 'data-sheet' in el.attrs).map((el) => el.attrs['data-sheet']))].sort();
  for (const [key, v] of Object.entries(versions)) {
    assert.equal(v.pdf, contract.versions[key], `${key} offers the contract's PDF`);
    assert.ok(sheetNames.includes(v.sheet), `${key} prints a sheet the markup has (${v.sheet})`);
    assert.equal(new Set(v.bulletOrder).size, v.bulletOrder.length, `${key} lists each AppFolio line once`);
    assert.ok(v.bulletOrder.every((b) => b in fixture.bullets), `${key} lists only AppFolio lines that exist`);
  }
  assert.deepEqual([...new Set(Object.values(versions).flatMap((v) => v.bulletOrder))].sort(), Object.keys(fixture.bullets).sort(), 'every AppFolio line prints in some version');
  // ?version= first, then its alias ?role=; anything else falls back.
  assert.match(js, /params\.get\('version'\) \|\| params\.get\('role'\)/);
  for (const id of ['roleTitle', 'appfolioBullets', 'dlLink', 'printBtn']) assert.ok(findAll(doc, (el) => el.attrs.id === id).length === 1, `#${id} is on the page`);
  assert.equal(flat(findAll(doc, (el) => el.attrs.id === 'roleTitle')[0]), versions[fallback].title, 'without script the sheet shows the default title');
  const order = findAll(sheet, (el) => 'data-bullet' in el.attrs && !('hidden' in el.attrs)).map((li) => li.attrs['data-bullet']);
  assert.deepEqual(order, versions[fallback].bulletOrder, 'without script the default’s lines show, in its order');
  const wrong = findAll(sheet, (el) => ('data-sheet' in el.attrs || 'data-bullet' in el.attrs) && hiddenInMarkup(el) === shows(el, versions[fallback]));
  assert.deepEqual(wrong.map((el) => flat(el).slice(0, 40)), [], 'without script the default’s sheet shows and the other is [hidden]');
});

test('the public résumé is the default version, Proptech, and the page offers it', () => {
  const site = loadSite();
  assert.equal(contract.default, 'proptech');
  assert.equal(site.resume.pdf, contract.versions[contract.default]);
  const dl = findAll(doc, (el) => el.attrs.id === 'dlLink')[0];
  assert.equal(dl.attrs.href, site.resume.pdf, 'Download PDF offers the public PDF before the script runs');
  const offered = findAll(findAll(doc, (el) => hasClass(el, 'versions'))[0], (el) => el.tag === 'a').map((a) => a.attrs.href);
  assert.deepEqual(offered, [site.resume.pdf], 'the download line offers the public PDF');
});

test('the sheet reads the palette from tokens: no colour of its own, no highlighter', () => {
  const css = findAll(doc, (el) => el.tag === 'style').map((el) => textContent(el)).join('\n');
  assert.doesNotMatch(css, /#[0-9a-f]{3,8}\b|rgba?\(/i, 'every colour is a token');
  assert.doesNotMatch(html, /class="[^"]*\bmark\b/, 'the old yellow highlighter is gone');
  // Toxic Orange (the fill role) marks the sheet once, at its end.
  assert.equal((css.match(/var\(--spot-fill\)/g) || []).length, 1);
});

test('render-resume-pdf.js renders every version the page has', () => {
  const { versions } = script();
  assert.deepEqual(Object.fromEntries(RENDERED.map((v) => [v.q, v.out])), Object.fromEntries(Object.entries(versions).map(([k, v]) => [k, v.pdf])));
});

for (const { q, out } of RENDERED) {
  test(`${out}: one Letter page, set in the site's three faces, tagged`, () => {
    const pdf = fs.readFileSync(path.join(ROOT, out));
    assert.equal(pdf.toString('latin1', 0, 5), '%PDF-', `${out} is a PDF`);
    const info = inspect(pdf);
    assert.equal(info.pages, 1, `${out} (${q}) is one page`);
    assert.ok(info.boxes.length && info.boxes.every((b) => Math.round(b[2] - b[0]) === 612 && Math.round(b[3] - b[1]) === 792), `${out} is Letter: ${JSON.stringify(info.boxes)}`);
    for (const face of FACES) assert.ok(info.fonts.some((f) => face.pdf.test(f)), `${out} embeds ${face.family}`);
    assert.deepEqual(info.fonts.filter((f) => !FACES.some((face) => face.pdf.test(f))), [], `${out} embeds no other font (a fallback means a missing glyph)`);
    assert.ok(info.embedded >= info.fonts.length, `${out} embeds every font it names`);
    assert.ok(info.tagged, `${out} is tagged`);
  });

  // The line markers (Burnt Orange) and the end mark (Toxic Orange) are drawn
  // as backgrounds; a print that dropped them paints white in their place.
  test(`${out}: the line markers and the end mark are printed`, () => {
    const { palette } = JSON.parse(fs.readFileSync(path.join(ROOT, 'theme.json'), 'utf8'));
    const inked = fills(fs.readFileSync(path.join(ROOT, out)));
    const markers = findAll(sheet, (el) => el.tag === 'li' && hasClass(el.parent, 'bullets') && shows(el, script().versions[q])).length;
    // The version's title is Burnt Orange too, so one more than the lines.
    assert.ok(inked[palette['burnt-orange'].$value.toUpperCase()] >= markers + 1, `${out} paints ${markers} line markers in Burnt Orange: ${JSON.stringify(inked)}`);
    assert.equal(inked[palette['toxic-orange'].$value.toUpperCase()], 1, `${out} paints the end mark once in Toxic Orange: ${JSON.stringify(inked)}`);
    assert.ok(!inked['#FFFFFF'], `${out} paints nothing white on white paper: ${JSON.stringify(inked)}`);
  });
}
