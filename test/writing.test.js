'use strict';

// The Writing supplement (redesign-plan.md, step 4): writings.html as the
// 04 Writing index, the two essays as features, the four poems and Serotiny
// as the long read, all on the paper insert stock. The move retypeset them
// and changed none of their words: test/fixtures/writing-content.json holds
// every paragraph, chapter and machine line, every poem's lines and stanza
// breaks, every index entry and every head tag as they were at 561e4c4, and
// lists the only text the move was allowed to change. This file holds the
// pages to it, and to the way through them: each piece links back to the
// index and to its neighbours in the index's order.

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const { ROOT, readPage } = require('./helpers');
const press = require('../build-pages');

const { parseHtml, findAll, hasClass, textContent } = press;
const fixture = JSON.parse(fs.readFileSync(path.join(__dirname, 'fixtures', 'writing-content.json'), 'utf8'));

const INDEX = 'writings.html';
const PIECES = Object.keys(fixture.pieces);
const PAGES = [INDEX, ...PIECES];
const ESSAYS = PIECES.filter((p) => fixture.pieces[p].blocks && !fixture.pieces[p].feedback);
const POEMS = PIECES.filter((p) => fixture.pieces[p].stanzas);
const LONG_READ = 'serotiny.html';

// The reading order is the index's: group by group, entry by entry.
const ORDER = fixture.index.groups.flatMap((g) => g.items.filter((i) => i.href).map((i) => ({ href: i.href, title: i.title })));

// The allowed changes, applied to the old text: the title separator and the
// separator in Serotiny's date label, and the two named lines of its feedback box.
const change = (where) => fixture.allowedChanges.find((c) => c.where.includes(where));
const TITLE = change('<title>');
const DATE = change('date label');
const NOTE = change('feedback note');
const LINK = change('feedback link');
const sep = (s) => s.split(TITLE.from).join(TITLE.to);
const date = (s) => s.split(DATE.from).join(DATE.to);

const flat = (el) => textContent(el, (e) => e.tag === 'script' || e.tag === 'style').replace(/\s+/g, ' ').trim();
const docs = new Map();
const doc = (page) => {
  if (!docs.has(page)) docs.set(page, parseHtml(readPage(page)));
  return docs.get(page);
};
const all = (page, testEl) => findAll(doc(page), testEl);
function one(page, testEl, what) {
  const found = all(page, testEl);
  assert.equal(found.length, 1, `${page} has one ${what}`);
  return found[0];
}
const byId = (page, id) => one(page, (el) => el.attrs.id === id, `#${id}`);
const kids = (el) => el.children.filter((c) => c.type === 'element');

function jsonLd(page) {
  return [...readPage(page).matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map((m) => JSON.parse(m[1]));
}

test('the fixture names the eight Writing pages and the changes it allows', () => {
  assert.deepEqual(PAGES.slice().sort(), ['building-things-worth-losing.html', 'come-down.html', 'hot-pig-summer.html', 'milk.html', 'nobody-claps.html', 'serotiny.html', 'the-room-love-needs-to-breathe.html', 'writings.html']);
  assert.deepEqual(ESSAYS, ['nobody-claps.html', 'building-things-worth-losing.html']);
  assert.equal(POEMS.length, 4);
  assert.equal(fixture.allowedChanges.length, 4, 'four allowed changes, each with its reason');
  for (const c of fixture.allowedChanges) assert.ok(c.where && c.from && typeof c.to === 'string' && c.why, JSON.stringify(c));
});

for (const page of PAGES) {
  test(`${page} is set on the paper insert, in the 04 Writing department`, () => {
    const main = one(page, (el) => el.tag === 'main', '<main>');
    assert.ok(hasClass(main, 'writing') && hasClass(main, 'insert'), 'main is .writing.insert');
    assert.equal(main.attrs['data-edition'], 'day', 'paper in the Night edition');
    assert.ok('data-insert' in main.attrs, 'an insert, so the Day edition turns it charcoal (tokens.css)');
    const { found } = press.regionsOf(page, readPage(page));
    assert.equal(found.top.params.dept, 'writing', 'the masthead marks 04 Writing as current');
    assert.ok(all(page, (el) => hasClass(el, 'fade') && el.parent === main).length === 1, 'the insert fades into the colophon');
  });

  test(`${page}: head tags as they were, titles with " · " and agreeing with the JSON-LD`, () => {
    const was = page === INDEX ? fixture.index : fixture.pieces[page];
    const html = readPage(page);
    assert.equal(flat(one(page, (el) => el.tag === 'title', '<title>')), sep(was.title));
    for (const [key, content] of Object.entries(was.meta)) {
      const tag = one(page, (el) => el.tag === 'meta' && (el.attrs.property === key || el.attrs.name === key), `meta ${key}`);
      const want = ['og:title', 'twitter:title', 'og:image:alt'].includes(key) ? sep(content) : content;
      assert.equal(tag.attrs.content, want, `${key}`);
    }
    assert.ok(html.includes(`<link rel="canonical" href="${was.canonical}">`), 'the canonical URL');
    const ld = jsonLd(page);
    assert.equal(ld.length, 1, 'one JSON-LD block');
    const want = JSON.parse(sep(JSON.stringify(was.jsonld)));
    assert.deepEqual(ld[0], want, 'the JSON-LD, with only the title separator changed');
    // The title, og:title and the JSON-LD name the piece by the same words.
    const name = ld[0].headline || ld[0].name;
    assert.ok(sep(was.title).startsWith(name.split(' · ')[0]), `the title starts with the JSON-LD name ${name}`);
    assert.doesNotMatch(html, /—|&mdash;/, 'no em dashes');
  });
}

for (const page of ESSAYS) {
  test(`${page}: the essay's words did not change`, () => {
    const was = fixture.pieces[page];
    const body = byId(page, 'piece-body');
    assert.ok(hasClass(body, 'prose'));
    assert.deepEqual(kids(body).map((p) => (assert.equal(p.tag, 'p'), { p: flat(p) })), was.blocks);
    assert.equal(flat(one(page, (el) => el.tag === 'h1', 'h1')), was.h1);
    assert.equal(flat(one(page, (el) => hasClass(el, 'piece-form'), 'kicker')), was.eyebrow);
    assert.equal(flat(one(page, (el) => hasClass(el, 'piece-date'), 'date')), was.date);
    assert.equal(flat(one(page, (el) => hasClass(el, 'piece-deck'), 'deck')), was.meta['og:description'], 'the deck is the page\'s own Open Graph description');
    assert.ok(hasClass(kids(body)[0], 'dropcap'), 'the first paragraph takes the drop cap');
  });
}

test(`${LONG_READ}: the story's words did not change, eleven chapters and the machine's lines included`, () => {
  const was = fixture.pieces[LONG_READ];
  const body = byId(LONG_READ, 'piece-body');
  const blocks = kids(body).map((el) => {
    if (el.tag === 'h2') return { chapter: flat(el), label: el.attrs['aria-label'] };
    if (el.tag === 'p') return { p: flat(el) };
    assert.ok(hasClass(el, 'machine'), `a block is a chapter, a paragraph or the machine, not ${el.tag}.${el.attrs.class}`);
    return { machine: kids(el).map((p) => ({ [hasClass(p, 'prompt') ? 'prompt' : 'response']: flat(p) })) };
  });
  assert.deepEqual(blocks, was.blocks);
  const chapters = blocks.filter((b) => b.chapter);
  assert.deepEqual(chapters.map((c) => c.chapter), ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11']);
  assert.equal(flat(one(LONG_READ, (el) => el.tag === 'h1', 'h1')), was.h1);
  assert.equal(flat(one(LONG_READ, (el) => hasClass(el, 'piece-form'), 'kicker')), was.eyebrow);
  assert.equal(flat(one(LONG_READ, (el) => hasClass(el, 'piece-date'), 'date')), date(was.date));
  // Each chapter can be reached from the list of chapters.
  const links = findAll(one(LONG_READ, (el) => hasClass(el, 'chapters'), 'chapter list'), (el) => el.tag === 'a');
  assert.deepEqual(links.map((a) => a.attrs.href), chapters.map((c) => `#chapter-${c.chapter}`));
  assert.deepEqual(kids(body).filter((el) => el.tag === 'h2').map((h) => h.attrs.id), chapters.map((c) => `chapter-${c.chapter}`));
});

test(`${LONG_READ}: the feedback box is kept, with only the allowed changes`, () => {
  const was = fixture.pieces[LONG_READ].feedback;
  const box = one(LONG_READ, (el) => hasClass(el, 'feedback'), 'feedback box');
  const [note] = findAll(box, (el) => el.tag === 'p');
  const [link] = findAll(box, (el) => el.tag === 'a');
  assert.ok(was.note.includes(NOTE.from), 'the fixture still has the old note');
  assert.equal(flat(note), was.note.replace(NOTE.from, NOTE.to));
  assert.equal(link.attrs.href, was.href, 'the same address and subject');
  assert.equal(flat(link), was.label.replace(LINK.from, LINK.to));
});

for (const page of POEMS) {
  test(`${page}: every line and stanza break as written`, () => {
    const was = fixture.pieces[page];
    const verse = byId(page, 'piece-body');
    assert.ok(hasClass(verse, 'verse'));
    const stanzas = kids(verse);
    for (const s of stanzas) {
      assert.ok(s.tag === 'p' && hasClass(s, 'stanza'), 'the verse is stanzas only');
      const lines = kids(s);
      // <span class="ln">line</span><br><span class="ln">line</span>: nothing else.
      lines.forEach((el, i) => assert.equal(el.tag, i % 2 ? 'br' : 'span', `${page}: lines and breaks alternate`));
      assert.ok(s.children.every((c) => c.type === 'element' || !c.value.trim()), `${page}: no loose text in a stanza`);
    }
    const got = stanzas.map((s) => kids(s).filter((el) => hasClass(el, 'ln')).map((el) => textContent(el)));
    assert.deepEqual(got, was.stanzas, 'lines verbatim, stanza by stanza');
    assert.equal(flat(one(page, (el) => el.tag === 'h1', 'h1')), was.h1, 'the title as written, lowercase');
    assert.equal(flat(one(page, (el) => hasClass(el, 'piece-form'), 'kicker')), was.eyebrow);
    assert.equal(flat(one(page, (el) => hasClass(el, 'piece-date'), 'date')), was.date);
    assert.equal(all(page, (el) => hasClass(el, 'dropcap')).length, 0, 'no drop cap on a poem');
  });
}

test('poems take no transforms, drop caps, hyphens or justification (site.css)', () => {
  const css = fs.readFileSync(path.join(ROOT, 'site.css'), 'utf8');
  const rules = [...css.matchAll(/([^{}]*\.(?:poem|verse|stanza|ln)\b[^{}]*)\{([^}]*)\}/g)];
  assert.ok(rules.length >= 5, 'site.css sets the poem');
  for (const [, selector, body] of rules) {
    assert.doesNotMatch(body, /text-transform|initial-letter|text-align:\s*justify|hyphens:\s*auto|text-wrap:\s*(pretty|balance)/, `${selector.trim()}`);
  }
});

test('writings.html lists every piece in its three groups, with the words it had', () => {
  const was = fixture.index;
  assert.equal(flat(one(INDEX, (el) => el.tag === 'h1', 'h1')), was.h1);
  assert.equal(flat(one(INDEX, (el) => hasClass(el, 'dept-intro'), 'intro')), was.intro);
  const shelves = all(INDEX, (el) => hasClass(el, 'shelf'));
  const got = shelves.map((shelf) => ({
    name: flat(findAll(shelf, (el) => el.tag === 'h2')[0]),
    items: findAll(shelf, (el) => hasClass(el, 'entry')).map((li) => {
      const h = findAll(li, (el) => el.tag === 'h3')[0];
      const a = findAll(h, (el) => el.tag === 'a')[0];
      const item = { title: flat(h), href: a ? a.attrs.href : null, date: flat(findAll(li, (el) => hasClass(el, 'entry-date'))[0]) };
      const lines = findAll(li, (el) => hasClass(el, 'ln'));
      if (lines.length) item.lines = lines.map((el) => textContent(el));
      else item.excerpt = flat(findAll(li, (el) => hasClass(el, 'entry-excerpt'))[0]);
      return item;
    }),
  }));
  const want = was.groups.map((g) => ({ ...g, items: g.items.map((i) => ({ ...i, date: date(i.date) })) }));
  assert.deepEqual(got, want);
  // Every link on an entry is its title: one link a piece, nothing hidden behind script.
  for (const li of all(INDEX, (el) => hasClass(el, 'entry'))) assert.ok(findAll(li, (el) => el.tag === 'a').length <= 1);
  const html = readPage(INDEX);
  const authored = press.blankRegions(html, press.regionsOf(INDEX, html).order);
  assert.doesNotMatch(authored, /<script(?! type="application\/ld\+json")/, 'the index needs no script of its own');
});

// Every word in <main>, around the piece's own body as well as in it. The
// tests above hold each body, title, kicker, date and deck; this one holds
// the rest, so no sentence can be added anywhere on the page (in the feature
// column, after a poem, by the feedback box, in an index entry) without a
// test failing. Each text node in <main> outside #piece-body is listed in
// order and must be one of the strings below: the fixture's own words, the
// neighbours' titles, the reading times the press writes, and the labels the
// new template set around them. FRAME is that whole list of new labels.
const SITE = press.loadSite();
const PUB = `${SITE.name} · Issue ${SITE.issue.number} · ${SITE.issue.season}`;
const FRAME = {
  rights: '© 2026 Ben Siverly',
  byline: 'By Ben Siverly',
  indexKicker: 'Two essays, four poems and a story in draft',
  prev: 'Previous', next: 'Next', dept: '04 Writing', all: 'All writing',
  chapters: 'Chapters', min: 'min', minRead: 'min read',
};
function leaves(node, skip, out = []) {
  for (const c of node.children || []) {
    if (c.type === 'text') {
      const t = press.decodeEntities(c.value).replace(/\s+/g, ' ').trim();
      if (t) out.push(t);
    } else if (c.type === 'element' && c.tag !== 'script' && c.tag !== 'style' && !skip(c)) {
      leaves(c, skip, out);
    }
  }
  return out;
}
const minutes = (page) => String(press.readingMinutes(byId(page, 'piece-body')));
const runningHead = (title) => ['04', 'Writing', '·', title, PUB];
function wayOn(page) {
  const i = ORDER.findIndex((o) => o.href === page);
  return [
    ...(i > 0 ? [FRAME.prev, ORDER[i - 1].title] : []),
    FRAME.dept, FRAME.all,
    ...(ORDER[i + 1] ? [FRAME.next, ORDER[i + 1].title] : []),
  ];
}
function frameOf(page) {
  const was = fixture.pieces[page];
  const byline = (when) => [`${FRAME.byline} ·`, when, '·', minutes(page), FRAME.minRead];
  if (page === LONG_READ) {
    return [
      was.eyebrow, was.h1, was.meta['og:description'], ...byline(date(was.date)),
      ...runningHead(was.h1),
      FRAME.chapters, ...was.blocks.filter((b) => b.chapter).map((b) => b.chapter),
      FRAME.chapters,
      was.feedback.note.replace(NOTE.from, NOTE.to), was.feedback.label.replace(LINK.from, LINK.to),
      ...wayOn(page), FRAME.rights,
    ];
  }
  if (POEMS.includes(page)) {
    return [...runningHead(was.h1), was.eyebrow, was.h1, FRAME.byline, was.date, ...wayOn(page), FRAME.rights];
  }
  return [...runningHead(was.h1), was.eyebrow, was.h1, was.meta['og:description'], ...byline(was.date), ...wayOn(page), FRAME.rights];
}

for (const page of PIECES) {
  test(`${page}: no words around the piece but its own and the template's labels`, () => {
    const main = one(page, (el) => el.tag === 'main', '<main>');
    assert.deepEqual(leaves(main, (el) => el.attrs.id === 'piece-body'), frameOf(page));
  });
}

test('writings.html: no words on the index but its entries and the template\'s labels', () => {
  const was = fixture.index;
  const want = ['04', 'Writing', PUB, '04', FRAME.indexKicker, was.h1, was.intro];
  for (const g of was.groups) {
    want.push(g.name);
    for (const item of g.items) {
      want.push(item.title, date(item.date));
      if (item.href && !item.lines) want.push('·', minutes(item.href), FRAME.min);
      want.push(...(item.lines || [item.excerpt]));
    }
  }
  want.push(FRAME.rights);
  assert.deepEqual(leaves(one(INDEX, (el) => el.tag === 'main', '<main>'), () => false), want);
});

test('each piece links back to the index and to its neighbours, in the index\'s order', () => {
  assert.deepEqual(ORDER.map((o) => o.href).sort(), PIECES.slice().sort(), 'the index orders every piece');
  ORDER.forEach(({ href }, i) => {
    const nav = one(href, (el) => el.tag === 'nav' && hasClass(el, 'piece-nav'), 'piece nav');
    const links = findAll(nav, (el) => el.tag === 'a');
    const index = links.find((a) => hasClass(a, 'pn--index'));
    assert.equal(index && index.attrs.href, INDEX, `${href} links back to the index`);
    const prev = links.find((a) => a.attrs.rel === 'prev');
    const next = links.find((a) => a.attrs.rel === 'next');
    assert.equal(prev ? prev.attrs.href : null, i ? ORDER[i - 1].href : null, `${href}: the previous piece`);
    assert.equal(next ? next.attrs.href : null, ORDER[i + 1] ? ORDER[i + 1].href : null, `${href}: the next piece`);
    if (prev) assert.equal(flat(findAll(prev, (el) => hasClass(el, 'pn-title'))[0]), ORDER[i - 1].title);
    if (next) assert.equal(flat(findAll(next, (el) => hasClass(el, 'pn-title'))[0]), ORDER[i + 1].title);
    // The running head names the department and links to the index too.
    const rh = one(href, (el) => hasClass(el, 'rh'), 'running head');
    assert.ok(findAll(rh, (el) => el.tag === 'a' && el.attrs.href === INDEX).length === 1, `${href}: the running head links to the index`);
  });
});

test('reading times agree: the index counts each piece\'s own text, as its byline does', () => {
  for (const el of all(INDEX, (e) => 'data-read' in e.attrs)) {
    const [page, id] = el.attrs['data-read'].split('#');
    assert.equal(id, 'piece-body', `${page}: the index counts the piece, not its page`);
    const own = all(page, (e) => e.attrs['data-read'] === 'piece-body');
    assert.equal(own.length, 1, `${page} shows its reading time`);
    assert.equal(flat(el), flat(own[0]), `${page}: the index and the byline agree`);
  }
});

test('the Writing pages show existing drawings only: the marigold and the still life', () => {
  for (const page of PAGES) {
    const { found } = press.regionsOf(page, readPage(page));
    const art = found.art.params.art;
    assert.ok(art.every((a) => ['marigold', 'still-life'].includes(a)), `${page} draws ${art.join(', ')}`);
    if (page !== INDEX && page !== LONG_READ) assert.deepEqual(art, ['marigold'], `${page} carries only the 7 KB marigold`);
  }
});

test('the sitemap still lists every Writing page', () => {
  const sitemap = fs.readFileSync(path.join(ROOT, 'sitemap.xml'), 'utf8');
  for (const page of PAGES) assert.match(sitemap, new RegExp(`<loc>https://bensiverly\\.com/${page.replace('.', '\\.')}</loc>`));
});
