'use strict';

// The home page is the issue (redesign-plan.md, step 1): the cover and
// contents, In brief, the departments and the colophon. These tests hold what
// had to survive the move and the facts it carries: the old section links,
// the Person node the tool pages point at, AppFolio in the past tense, and
// figures that match the résumé.

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const { ROOT, readPage } = require('./helpers');
const { parseHtml, findAll, hasClass, textContent } = require('../build-pages');

const html = readPage('index.html');
const doc = parseHtml(html);
const ids = new Set(findAll(doc, (el) => 'id' in el.attrs).map((el) => el.attrs.id));
const flat = (el) => textContent(el, (e) => e.tag === 'script' || e.tag === 'style').replace(/\s+/g, ' ').trim();
const body = flat(findAll(doc, (el) => el.tag === 'body')[0]);
const resume = flat(findAll(parseHtml(readPage('resume.html')), (el) => el.tag === 'body')[0]);

function graph(page) {
  const out = [];
  for (const m of readPage(page).matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)) {
    const data = JSON.parse(m[1]);
    out.push(...(data['@graph'] || [data]));
  }
  return out;
}

test('the old home page links still land, and so do the departments', () => {
  // The old sections' heading ids, kept as aliases on the new headings and in
  // the home colophon, plus the issue's own sections.
  for (const id of ['hero-heading', 'work-heading', 'tools-heading', 'skills-heading', 'elsewhere-heading', 'contact-heading', 'contents', 'work', 'method', 'workshop', 'writing']) {
    assert.ok(ids.has(id), `index.html has id="${id}"`);
  }
  assert.ok(findAll(doc, (el) => el.tag === 'h1' && el.attrs.id === 'hero-heading').length === 1, 'the nameplate is the h1 and carries #hero-heading');
});

test('JSON-LD keeps Person #ben, with no employer, and the nodes beside it', () => {
  const nodes = graph('index.html');
  const person = nodes.find((n) => n['@id'] === 'https://bensiverly.com/#ben');
  assert.ok(person, 'Person https://bensiverly.com/#ben');
  assert.equal(person['@type'], 'Person');
  assert.equal(person.name, 'Ben Siverly');
  assert.equal(person.url, 'https://bensiverly.com/');
  assert.equal(typeof person.jobTitle, 'string');
  assert.ok(!('worksFor' in person), 'Ben left AppFolio in October 2026: no worksFor');
  assert.deepEqual(person.sameAs, ['https://www.linkedin.com/in/be-ns/', 'https://github.com/be-ns']);

  const brava = nodes.find((n) => n['@id'] === 'https://bravamade.com/#org');
  assert.equal(brava && brava['@type'], 'Organization');
  assert.deepEqual(brava.founder, { '@id': 'https://bensiverly.com/#ben' });
  const claw = nodes.find((n) => n['@id'] === 'https://github.com/be-ns/AbiertoClaw#code');
  assert.equal(claw && claw['@type'], 'SoftwareSourceCode');
  assert.ok(nodes.some((n) => n['@id'] === 'https://bensiverly.com/#website' && n['@type'] === 'WebSite'));

  const tools = nodes.find((n) => n['@id'] === 'https://bensiverly.com/#tools');
  assert.deepEqual(tools.itemListElement.map((i) => i.url), [
    'https://bensiverly.com/life-strategy.html',
    'https://bensiverly.com/native-plant-finder.html',
    'https://bensiverly.com/memorial-pamphlet.html',
    'https://bensiverly.com/service-of-life.html',
    'https://bensiverly.com/memorial-preferences.html',
    'https://bensiverly.com/decision-assist.html',
  ]);
  // Every tool in the list is also in the Workshop.
  for (const item of tools.itemListElement) {
    const page = item.url.replace('https://bensiverly.com/', '');
    assert.ok(findAll(doc, (el) => el.tag === 'a' && el.attrs.href === page).length, `the Workshop links ${page}`);
  }
});

test('every page that points at #ben finds it on the home page', () => {
  for (const page of fs.readdirSync(ROOT).filter((f) => f.endsWith('.html'))) {
    if (!readPage(page).includes('https://bensiverly.com/#ben') || page === 'index.html') continue;
    assert.ok(graph('index.html').some((n) => n['@id'] === 'https://bensiverly.com/#ben'), `${page} points at a Person that exists`);
  }
});

test('AppFolio is in the past tense, with the résumé\'s dates', () => {
  const metas = [...html.matchAll(/<meta (?:name|property)="(?:description|og:description|twitter:description)" content="([^"]*)"/g)].map((m) => m[1]);
  assert.equal(metas.length, 3);
  for (const text of [body, ...metas]) {
    assert.doesNotMatch(text, /\b(currently|now)\b[^.]{0,60}\bAppFolio\b/i, 'nothing says Ben is at AppFolio now');
    assert.doesNotMatch(text, /\bAppFolio\b[^.]{0,60}\b(currently|now)\b/i, 'nothing says Ben is at AppFolio now');
  }
  // The résumé's AppFolio dates, written the way the page writes them.
  const m = /AppFolio · [^·]*?(\w{3}) (\d{4}) – (\w{3}) (\d{4})/.exec(resume);
  assert.ok(m, 'resume.html dates the AppFolio role');
  const [, fromMonth, fromYear, toMonth, toYear] = m;
  assert.ok(body.includes(`AppFolio, ${fromMonth} ${fromYear} to ${toMonth} ${toYear}`), 'At a glance gives the résumé\'s months');
  assert.ok(body.includes(`AppFolio · ${fromYear} to ${toYear}`), 'the Work kicker gives the résumé\'s years');
  for (const text of metas.slice(0, 1)) assert.ok(text.includes(`${fromYear} to ${toYear}`), 'the description dates AppFolio');
  const llms = fs.readFileSync(path.join(ROOT, 'llms.txt'), 'utf8');
  assert.ok(llms.split('\n')[2].includes(`AppFolio from ${fromYear} to ${toYear}`), 'llms.txt\'s summary dates AppFolio');
  assert.doesNotMatch(html, /"worksFor"/);
});

test('In brief shows five figures, each one the résumé\'s or the tool count', () => {
  const briefs = findAll(doc, (el) => hasClass(el, 'brief'));
  assert.equal(briefs.length, 5);
  const figs = briefs.map((b) => flat(findAll(b, (el) => hasClass(el, 'fig'))[0]));
  // How the résumé writes each figure the page sets in display type.
  const onResume = { '44 to 70%': '44% to 70%', '3.4days': '3.4 days', '99.1%': '99.1%', '$50M+': '$50M+' };
  for (const fig of figs.slice(0, 4)) {
    assert.ok(fig in onResume, `In brief figure "${fig}" is one this test knows; add how resume.html writes it`);
    assert.ok(resume.includes(onResume[fig]), `resume.html says ${onResume[fig]}`);
  }
  const tools = graph('index.html').find((n) => n['@id'] === 'https://bensiverly.com/#tools').itemListElement.length;
  assert.equal(figs[4], `${tools}tools`, 'the tools figure counts the tool list');
  const llms = fs.readFileSync(path.join(ROOT, 'llms.txt'), 'utf8');
  assert.equal((llms.match(/^## /gm) || []).length - 3, tools, 'llms.txt has a section per tool (plus Projects, About and Optional)');
  // The story's figures are the résumé's too.
  for (const figure of ['44% to 70%', '3.4 days']) assert.ok(body.includes(figure) && resume.includes(figure), figure);
});

test('no consulting on the home page until its pages exist (step 5)', () => {
  assert.doesNotMatch(html, /consult/i);
  assert.ok(!html.includes('$250'));
});

test('the old motion is gone: no scroll reveal, cursor glow or progress bar', () => {
  assert.doesNotMatch(html, /scroll-progress|animate-on-scroll|tool-featured|--mx|styles\.css/);
});
