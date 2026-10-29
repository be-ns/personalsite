'use strict';

// 05 Consulting (redesign-plan.md, step 5): four pages made by build-pages.js
// from Markdown in content/consulting/. This file pins the Markdown seam (the
// front matter, the safe renderer and what it refuses, against golden
// fixtures) and what the pages must say: one rate, the same in the card,
// the structured data and llms.txt; every number on the problems page
// sourced to the résumé word for word; the home page's 05 department and
// every colophon pointing in.

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const { ROOT, htmlPages, readPage } = require('./helpers');
const press = require('../build-pages');

const { parseHtml, findAll, hasClass, textContent } = press;
const FIX = path.join(__dirname, 'fixtures', 'markdown');
const exists = (f) => ['resume.html', 'index.html'].includes(f);
const render = (src) => press.renderMarkdown('test.md', src, { exists });
const flat = (el) => textContent(el, (e) => e.tag === 'script' || e.tag === 'style').replace(/\s+/g, ' ').trim();
const site = press.loadSite();
const sources = press.loadSources();
const PAGES = sources.map((s) => s.page);
const bySource = Object.fromEntries(sources.map((s) => [s.data.template, s]));

function jsonLd(page) {
  return [...readPage(page).matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)]
    .flatMap((m) => { const d = JSON.parse(m[1]); return d['@graph'] || [d]; });
}
const resume = flat(findAll(parseHtml(readPage('resume.html')), (el) => el.tag === 'main')[0]);
const home = flat(findAll(parseHtml(readPage('index.html')), (el) => el.tag === 'body')[0]);

// ------------------------------------------------------------ the seam ----

test('the renderer matches its golden fixture', () => {
  const src = fs.readFileSync(path.join(FIX, 'golden.md'), 'utf8');
  assert.equal(render(src), fs.readFileSync(path.join(FIX, 'golden.html'), 'utf8'));
});

test('front matter: key: value lines and one list form, nothing else', () => {
  const { data, body, bodyLine } = press.parseFrontMatter('t.md', '---\ntitle: A "title": with a colon\norder: 2\nlines:\n  - name: One\n    terms: Free\n  - name: Two\n    terms: $250\n    note: A note.\n---\n\nBody.\n');
  assert.deepEqual(data, { title: 'A "title": with a colon', order: '2', lines: [{ name: 'One', terms: 'Free' }, { name: 'Two', terms: '$250', note: 'A note.' }] });
  assert.equal(body, '\nBody.\n');
  assert.equal(bodyLine, 11);
  const refuse = [
    ['title: x\n---\n', /starts with front matter/],
    ['---\ntitle: x\n', /never closed/],
    ['---\ntitle: x\n\norder: 1\n---\n', /t\.md:3: no blank lines/],
    ['---\ntitle: x\ntitle: y\n---\n', /t\.md:3: "title" is set twice/],
    ['---\nTitle: x\n---\n', /cannot read/],
    ['---\nlines:\n - name: x\n---\n', /cannot read/],
    ['---\ntitle: x \n---\n', /trailing space/],
    ['---\nlines:\n---\n', /"lines" is an empty list/],
  ];
  for (const [src, message] of refuse) assert.throws(() => press.parseFrontMatter('t.md', src), message, JSON.stringify(src));
});

test('the renderer refuses what the subset leaves out, with the file and line', () => {
  const refuse = [
    ['A <b>bold</b> word.', /test\.md:1: no raw HTML/],
    ['Para.\n\nA dash — here.', /test\.md:3: no em dashes/],
    ['Two -- hyphens.', /no em dashes/],
    ['A hard  \nbreak.', /test\.md:1: no hard line breaks/],
    ['A hard\\\nbreak.', /no hard line breaks/],
    ['A trailing space. ', /trailing space/],
    ['![an image](/a.png)', /no images/],
    ['Some `code`.', /no code/],
    ['```\ncode\n```', /no code/],
    ['    indented code', /indented line/],
    ['| a | b |', /no tables/],
    ['---', /no horizontal rules/],
    ['# A title', /only ## and ###/],
    ['#### Deep', /only ## and ###/],
    ['* item', /write list items with "- "/],
    ['An &amp; entity.', /no HTML entities/],
    ['[relative](resume.html)', /root-absolute/],
    ['[missing](/nope.html)', /does not exist/],
    ['A stray * star.', /an \* that opens/],
    ['A [bracket] alone.', /not part of a \[link\]/],
    ['A ref.[^1]', /\[\^1\] has no/],
    ['Text.\n\n[^1]: Never used.', /note \[\^1\] is never referred to/],
    ['> One.\n\n> Two.', /one pull quote/],
    ['1. One\n3. Three', /number the list/],
    ['Tab\there.', /no tabs/],
    ['## A heading[^1]\n\n[^1]: Note.', /cannot go here/],
  ];
  for (const [src, message] of refuse) assert.throws(() => render(src), message, JSON.stringify(src));
});

test('a source names its page, and its front matter fits its template', () => {
  const files = fs.readdirSync(press.CONTENT).sort();
  assert.deepEqual(files, ['consulting-perspective.md', 'consulting-problems.md', 'consulting-rates.md', 'consulting.md']);
  assert.deepEqual(sources.map((s) => s.data.template), ['front', 'rate-card', 'numbered', 'essay']);
  assert.deepEqual(PAGES, ['consulting.html', 'consulting-rates.html', 'consulting-problems.html', 'consulting-perspective.html']);
  for (const s of sources) assert.ok(s.data.description.length <= 160, `${s.file}: description of ${s.data.description.length} characters`);
});

test('every page is the press\'s own output, written whole', () => {
  const made = press.markdownPages();
  for (const { page } of made) {
    const html = readPage(page);
    assert.ok(html.includes(`Made by build-pages.js from content/consulting/${page.replace('.html', '.md')}`), `${page} says where it comes from`);
  }
  assert.deepEqual(press.check(), [], 'run `npm run pages`');
});

test('no em dashes, raw HTML or relative links in the sources', () => {
  for (const s of sources) {
    const src = fs.readFileSync(path.join(press.CONTENT, s.name), 'utf8');
    assert.doesNotMatch(src, /—|&mdash;|<[a-z]/i, s.file);
    for (const m of src.matchAll(/\]\(([^)]+)\)/g)) assert.match(m[1], /^(\/|https:\/\/|#)/, `${s.file}: ${m[1]} is root-absolute`);
  }
});

// ----------------------------------------------------------- the pages ----

for (const page of PAGES) {
  test(`${page}: titles agree, it is indexed, and its JSON-LD names Ben as author`, () => {
    const html = readPage(page);
    const title = /<title>([^<]*)<\/title>/.exec(html)[1];
    for (const tag of ['og:title', 'twitter:title']) assert.ok(html.includes(`content="${title}"`), `${tag} is the <title>`);
    assert.ok(title.endsWith(' · Ben Siverly'));
    assert.doesNotMatch(html, /noindex/);
    const web = jsonLd(page).find((n) => n['@type'] === 'WebPage');
    assert.equal(web.url, `https://bensiverly.com/${page}`);
    assert.ok(title.startsWith(web.name), 'the WebPage name opens the <title>');
    assert.deepEqual(web.author, { '@id': 'https://bensiverly.com/#ben' });
    assert.ok(html.includes(`<link rel="canonical" href="https://bensiverly.com/${page}">`));
    const doc = parseHtml(html);
    const spot = findAll(doc, (el) => hasClass(el, 'btn--spot') && !hasClass(el, 'nojs-only'));
    assert.ok(spot.length <= 1, 'one orange button at most');
    for (const b of spot) assert.equal(b.attrs['data-email'], site.contact.email, 'the orange button copies the email address');
    const rh = findAll(doc, (el) => hasClass(el, 'rh'))[0];
    assert.match(flat(rh), /^05\s*Consulting/, 'the running head names 05 Consulting');
  });
}

test('the front page: the headline, the positioning, and how it starts', () => {
  const doc = parseHtml(readPage('consulting.html'));
  assert.equal(flat(findAll(doc, (el) => el.tag === 'h1')[0]), 'New tools, tried on real work first.');
  const text = flat(findAll(doc, (el) => el.tag === 'main')[0]);
  for (const line of ['small and mid-size companies and startups', 'strategy and operations', 'Product management is one way I get the work done', 'Up to an hour, by video.', 'Before any paid hour']) assert.ok(text.includes(line), line);
  const teasers = findAll(doc, (el) => hasClass(el, 'teaser')).map((t) => flat(findAll(t, (el) => el.tag === 'h3')[0]));
  assert.deepEqual(teasers, sources.slice(1).map((s) => press.curly(s.data.title)));
});

test('the rate card: one rate, the same on the card, in the JSON-LD and in llms.txt', () => {
  const card = bySource['rate-card'];
  const rate = Number(card.data.rate);
  const doc = parseHtml(readPage(card.page));
  assert.equal(flat(findAll(doc, (el) => hasClass(el, 'rc-rate'))[0]), `$${rate} an hour`, 'the number reads as one phrase');
  assert.ok(flat(findAll(doc, (el) => hasClass(el, 'rate-card'))[0]).includes('I have taste and I know what good looks like.'));
  const rows = findAll(doc, (el) => hasClass(el, 'rc-row')).map((r) => [flat(findAll(r, (el) => el.tag === 'dt')[0]), flat(findAll(r, (el) => hasClass(el, 'rc-terms'))[0])]);
  assert.deepEqual(rows, [
    ['First conversation', 'Free'],
    ['By the hour', `$${rate}`],
    ['A block of hours each week', `$${rate} an hour, month to month`],
    ['Around an outcome', 'Result written down, hours agreed first'],
  ]);
  assert.ok(flat(findAll(doc, (el) => hasClass(el, 'rate-card'))[0]).includes('An estimate with a cap.'));
  const seals = findAll(doc, (el) => hasClass(el, 'rc-seal'));
  assert.equal(seals.length, 1, 'one seal');
  assert.equal(flat(seals[0]), 'Free First conversation');
  assert.ok(flat(findAll(doc, (el) => hasClass(el, 'rc-small'))[0]).includes('US dollars'));
  const section = findAll(doc, (el) => hasClass(el, 'rate-card'))[0];
  assert.ok('data-insert' in section.attrs && section.attrs['data-edition'] === 'day', 'the card is on the paper stock');
  for (const page of ['consulting.html', card.page]) {
    const service = jsonLd(page).find((n) => n['@type'] === 'ProfessionalService');
    assert.ok(service, `${page} carries the ProfessionalService`);
    assert.deepEqual(service.founder, { '@id': 'https://bensiverly.com/#ben' });
    const hourly = service.makesOffer.find((o) => o.priceSpecification);
    assert.deepEqual(hourly.priceSpecification, { '@type': 'UnitPriceSpecification', price: rate, priceCurrency: 'USD', unitCode: 'HUR', unitText: 'hour' });
    assert.deepEqual(hourly.itemOffered.provider, { '@id': 'https://bensiverly.com/#ben' });
    const free = service.makesOffer.find((o) => o.price === 0);
    assert.equal(free && free.name, 'First conversation');
  }
  const llms = fs.readFileSync(path.join(ROOT, 'llms.txt'), 'utf8');
  const line = llms.split('\n').find((l) => l.startsWith('- [Rate card]('));
  assert.ok(line.includes(`$${rate} an hour`), 'llms.txt gives the same rate');
});

test('the price is on the consulting pages and nowhere else', () => {
  for (const page of htmlPages()) {
    if (PAGES.includes(page)) continue;
    assert.ok(!readPage(page).includes('$250'), `${page} shows no rate`);
  }
});

test('the problems page: seven, each a scene, the record and one number sourced to the résumé word for word', () => {
  const page = bySource.numbered.page;
  const doc = parseHtml(readPage(page));
  const entries = findAll(doc, (el) => hasClass(el, 'entry'));
  assert.equal(entries.length, 7);
  for (const entry of entries) {
    const title = flat(findAll(entry, (el) => hasClass(el, 'entry-title'))[0]);
    assert.equal(findAll(entry, (el) => hasClass(el, 'entry-scene')).length, 1, `${title}: a scene`);
    const figures = findAll(entry, (el) => el.tag === 'strong').map(flat);
    assert.equal(figures.length, 1, `${title}: one number`);
    const notes = findAll(entry, (el) => el.tag === 'li' && /^note-\d+$/.test(el.attrs.id || ''));
    assert.equal(notes.length, 1, `${title}: one source note`);
    const quote = /“(.+)”/.exec(flat(notes[0]));
    assert.ok(quote, `${title}: the note quotes the résumé`);
    assert.ok(resume.includes(quote[1]), `${title}: "${quote[1]}" is on resume.html word for word`);
    assert.ok(quote[1].toLowerCase().includes(figures[0].toLowerCase()), `${title}: ${figures[0]} is in the quote`);
    // Every sentence with a digit in the record carries the note.
    const record = flat(findAll(entry, (el) => hasClass(el, 'entry-record'))[0]);
    for (const sentence of record.split(/(?<=[.!?]\d{0,2})\s+(?=[A-Z])/)) {
      if (/\d/.test(sentence.replace(/\d+$/, ''))) assert.match(sentence, /\.\d+$|\d$/, `${title}: "${sentence}" carries its note`);
    }
  }
});

test('the perspective page: the home page\'s words for the Choctaw Nation, and selected work that matches the record', () => {
  const page = bySource.essay.page;
  const text = flat(findAll(parseHtml(readPage(page)), (el) => el.tag === 'main')[0]);
  assert.ok(text.includes('Proud future ancestor of the Choctaw Nation of Oklahoma.'));
  assert.ok(home.includes('Proud future ancestor of the Choctaw Nation of Oklahoma.'));
  for (const figure of ['44% to 70%', '99.1%', '$50M+', '15–30 minutes']) {
    assert.ok(text.includes(figure), figure);
    assert.ok(resume.includes(figure), `${figure} is on the résumé`);
  }
  assert.ok(home.includes('hundreds of evaluations'), 'Oracle\'s evaluations are the home page\'s');
});

// ------------------------------------------------------- the way in ----

test('the home page carries 05 Consulting: a contents line and the department, no price', () => {
  const doc = parseHtml(readPage('index.html'));
  const toc = findAll(doc, (el) => hasClass(el, 'toc'))[0];
  assert.deepEqual(findAll(toc, (el) => el.tag === 'a').map((a) => a.attrs.href), ['#work', '#method', '#workshop', '#writing', '#consulting']);
  const dept = findAll(doc, (el) => el.attrs.id === 'consulting')[0];
  assert.ok(dept, 'index.html has #consulting');
  assert.equal(flat(findAll(dept, (el) => el.tag === 'h2')[0]), 'Consulting');
  const teasers = findAll(dept, (el) => hasClass(el, 'teaser'));
  assert.deepEqual(teasers.map((t) => findAll(t, (el) => el.tag === 'a')[0].attrs.href), PAGES);
  // The teasers say what each page says about itself.
  const front = sources[0];
  const want = [[front.data.headline, front.data.deck], ...sources.slice(1).map((s) => [s.data.title, s.data.teaser])].map((pair) => pair.map(press.curly));
  assert.deepEqual(teasers.map((t) => [flat(findAll(t, (el) => el.tag === 'h3')[0]), flat(findAll(t, (el) => el.tag === 'p')[0])]), want);
  // Off the cover and the In brief numbers, so the first screen still answers a hiring manager.
  const cover = findAll(doc, (el) => hasClass(el, 'cover'))[0];
  assert.doesNotMatch(flat(cover), /consult/i);
  assert.doesNotMatch(flat(findAll(doc, (el) => hasClass(el, 'briefing'))[0]), /consult/i);
});

test('every colophon carries the consulting line', () => {
  for (const page of press.chromePages().filter((p) => press.regionsOf(p, readPage(p)).found.colophon)) {
    const doc = parseHtml(readPage(page));
    const line = findAll(doc, (el) => hasClass(el, 'colophon-consulting'));
    assert.equal(line.length, 1, page);
    const link = findAll(line[0], (el) => el.tag === 'a')[0];
    assert.match(link.attrs.href, /^\/?consulting\.html$/, page);
  }
});

test('sitemap.xml and llms.txt list each page, from the front matter', () => {
  const sitemap = fs.readFileSync(path.join(ROOT, 'sitemap.xml'), 'utf8');
  const llms = fs.readFileSync(path.join(ROOT, 'llms.txt'), 'utf8');
  const section = llms.slice(llms.indexOf('\n## Consulting\n'), llms.indexOf('\n## Optional'));
  assert.ok(section.length > 20, 'llms.txt has a Consulting section before Optional');
  for (const s of sources) {
    assert.ok(sitemap.includes(`<loc>https://bensiverly.com/${s.page}</loc>\n    <lastmod>${s.data.updated}</lastmod>`), `the sitemap lists ${s.page}`);
    assert.ok(section.includes(`](https://bensiverly.com/${s.page}): `), `llms.txt lists ${s.page}`);
    assert.ok(section.includes(`Markdown: https://bensiverly.com/content/consulting/${s.name}`), `llms.txt points at ${s.name}`);
  }
});
