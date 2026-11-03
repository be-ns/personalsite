'use strict';

// Housing as an API call, the case study in 01 Work. Three things hold it:
//
//   1. The address stays masked, in the page's own source: it says
//      "1xx Hobart Ave" and "034-382-xxx", and no file in the repo, tracked
//      or not, carries the street number, the whole parcel number or the
//      name of the listing site the draft linked. Those strings are built
//      from pieces below, so this file never carries them itself.
//   2. The numbers are the model's. The page's own deal math, the inline
//      script between its /* MODEL START and /* MODEL END */ comments, runs
//      here in node:vm on the case and gives every figure the page prints:
//      in its prose, tables and tiles, and in its JSON plates.
//   3. The home page's 01 Work links it, under the same title, and llms.txt
//      describes it.
//
// Until the page lands these fail; none of them skips.

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const { ROOT, readPage, inlineScripts } = require('./helpers');
const { parseHtml, findAll, textContent } = require('../build-pages');

const PAGE = 'housing-as-an-api-call.html';
const TITLE = 'Housing as an API call';

const STREET = ['123', 'Hobart'].join(' ');
const APN = ['034', '382', '030'].join('-');
const LISTING = new RegExp(['red', 'fin'].join(''), 'i');

const flat = (el) => textContent(el, (e) => e.tag === 'script' || e.tag === 'style').replace(/\s+/g, ' ').trim();

// The page itself: a missing page fails the test that asks for it.
function page() {
  assert.ok(fs.existsSync(path.join(ROOT, PAGE)), `${PAGE} exists`);
  return readPage(PAGE);
}

// What the page shows in <main>: no scripts, styles or hidden elements.
function shown() {
  const main = findAll(parseHtml(page()), (el) => el.tag === 'main')[0];
  assert.ok(main, `${PAGE} has a <main>`);
  return textContent(main, (e) => ['script', 'style', 'template'].includes(e.tag) || 'hidden' in e.attrs).replace(/\s+/g, ' ');
}

// ------------------------------------------------------------- masked ----

// Every file under the repo root but .git and node_modules, tracked or not.
function repoFiles(dir = ROOT, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === '.git' || entry.name === 'node_modules') continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) repoFiles(full, out);
    else if (entry.isFile()) out.push(full);
  }
  return out;
}

// Git's test for a binary file: a NUL byte in the first 8,000.
const binary = (buf) => buf.subarray(0, 8000).includes(0);

test('no file in the repo names the street number, the whole parcel number or the listing site', () => {
  const files = repoFiles();
  assert.ok(files.includes(path.join(ROOT, PAGE)), `${PAGE} is in the repo, so the check reaches it`);
  let read = 0;
  for (const file of files) {
    const buf = fs.readFileSync(file);
    if (binary(buf)) continue;
    read += 1;
    const text = buf.toString('utf8');
    const name = path.relative(ROOT, file);
    assert.ok(!text.includes(STREET), `${name} gives the street number`);
    assert.ok(!text.includes(APN), `${name} gives the whole parcel number`);
    assert.ok(!LISTING.test(text), `${name} names the listing site`);
  }
  assert.ok(read > 50, `${read} text files read`);
});

test('the page masks the address in its source, not at run time', () => {
  const html = page();
  assert.ok(html.includes('1xx Hobart Ave'), 'the street number is written 1xx');
  assert.ok(html.includes('034-382-xxx'), 'the parcel number ends in xxx');
  assert.doesNotMatch(html, /MASK_ADDRESS|maskPage/, 'no mask left to run');
});

// -------------------------------------------------------------- model ----

// The page's deal math, alone: its inline script from the /* MODEL START
// comment up to /* MODEL END */, with module-style access to what it defines.
function model() {
  const script = inlineScripts(page()).find((s) => s.includes('/* MODEL START'));
  assert.ok(script, `${PAGE} has an inline script with a /* MODEL START comment`);
  const from = script.indexOf('/* MODEL START');
  const to = script.indexOf('/* MODEL END */', from);
  assert.ok(to > from, 'the model closes with /* MODEL END */');
  const sandbox = { module: { exports: {} } };
  vm.runInNewContext(`'use strict';\n${script.slice(from, to)}\nmodule.exports = { underwrite, ownerNet, raiseModel };\n`, sandbox, { filename: `${PAGE} (model)` });
  return sandbox.module.exports;
}

// The case: bought at $1.58M, rents at $4.50 a sq ft a month, sold at a 5%
// cap, built at the estimate.
const CASE = { price: 1580000, rent: 4.5, cap: 0.05, cost: 1 };

const round = (x, places) => Math.round(x * 10 ** places) / 10 ** places;

// The price at which f(price) crosses zero, by bisection.
function solve(f, lo = 500000, hi = 4000000) {
  for (let i = 0; i < 200; i++) {
    const mid = (lo + hi) / 2;
    if (f(lo) * f(mid) <= 0) hi = mid;
    else lo = mid;
  }
  return (lo + hi) / 2;
}

// Everything the tests read from the model, on the case.
function figures() {
  const { underwrite, ownerNet, raiseModel } = model();
  const u = underwrite(CASE);
  return {
    u,
    r: raiseModel(CASE),
    own: ownerNet(CASE),
    yield75: solve((price) => underwrite({ ...CASE, price }).yoc - 0.075),
    zero: solve((price) => underwrite({ ...CASE, price }).created),
    raiseModel,
  };
}

// The page's own formats.
const commas = (n) => String(Math.round(Math.abs(n))).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
const usd = (n) => `${n < 0 ? '−' : ''}$${commas(n)}`;
const usdK = (n) => `$${Math.round(n / 1000)}k`;
const usdM = (n) => `$${(n / 1e6).toFixed(2)}M`;
const pct = (x) => `${(x * 100).toFixed(1)}%`;

test('the page\'s model gives the case\'s figures', () => {
  const { u, r, own, yield75, zero, raiseModel } = figures();
  assert.equal(Math.round(u.noi), 196344, 'net operating income');
  assert.equal(Math.round(u.allIn), 3061200, 'all-in cost');
  assert.equal(round(u.yoc, 4), 0.0641, 'yield on cost');
  assert.equal(Math.round(u.value), 3926886, 'value at a 5% cap');
  assert.equal(Math.round(u.created), 865686, 'value created');
  assert.equal(round(r.dealIrr, 4), 0.1725, 'deal IRR');
  assert.equal(round(r.lpIrr, 4), 0.1455, 'LP net IRR');
  assert.equal(round(r.lpMult, 2), 1.31, 'LP multiple');
  assert.equal(Math.round(r.gpTake), 236640, 'GP take');
  assert.equal(Math.round(r.refiGap), -78524, 'refinance gap');
  assert.equal(Math.round(own), 6138, 'owner-occupant, monthly');
  assert.equal(Math.round(yield75), 1205521, 'purchase price for a 7.5% yield');
  assert.equal(Math.round(zero), 2262681, 'purchase price for zero value created');
  // The capital stack and where it breaks.
  assert.equal(Math.round(r.total), 3481377, 'total project');
  assert.equal(Math.round(r.commit), 2262895, 'construction loan');
  assert.equal(Math.round(r.equity * 0.9), 1096634, 'LP equity');
  assert.equal(Math.round(r.equity * 0.1), 121848, 'GP equity');
  assert.equal(usdK(r.profit), '$457k', 'profit at sale');
  assert.equal(usdM(r.perm), '$2.02M', 'the permanent loan');
  assert.equal(usdM(r.loan), '$2.10M', 'the construction payoff');
  assert.equal(pct(raiseModel({ ...CASE, cap: 0.055 }).dealIrr), '4.6%', 'deal IRR at a 5.5% exit cap');
  assert.ok(raiseModel({ ...CASE, rent: 4 }).profit < 0, '$4.00 rents turn the profit into a loss');
  assert.equal(Math.round(raiseModel({ ...CASE, price: 1400000 }).lpIrr * 100), 22, 'LP net IRR at $1.40M');
});

test('the page prints the model\'s figures', () => {
  const { u, r, own, yield75, zero } = figures();
  const text = shown();
  const printed = [
    ['net operating income', usd(u.noi), '$196,344'],
    ['all-in cost', usd(u.allIn), '$3,061,200'],
    ['yield on cost', pct(u.yoc), '6.4%'],
    ['value created', usdK(u.created), '$866k'],
    ['deal IRR', pct(r.dealIrr), '17.2%'],
    ['LP net IRR', pct(r.lpIrr), '14.6%'],
    ['GP take', usdK(r.gpTake), '$237k'],
    ['owner-occupant cost a month', usd(own), '$6,138'],
    ['price for a 7.5% yield', usdM(yield75), '$1.21M'],
    ['price for zero value created', usdM(zero), '$2.26M'],
  ];
  for (const [what, made, want] of printed) {
    assert.equal(made, want, `the model gives ${what} as ${made}`);
    assert.ok(text.includes(want), `the page prints ${what} as ${want}`);
  }
});

test('the JSON plates print the model\'s numbers, to the places they show', () => {
  const { u, r, own, yield75, zero } = figures();
  const KEYS = {
    gross_rent: u.egi / 0.95, noi: u.noi, all_in_cost: u.allIn, yield_on_cost: u.yoc, value_at_5_cap: u.value,
    value_created: u.created, price_for_7_5_yield: yield75, price_for_zero_value: zero, total_project: r.total,
    deal_irr: r.dealIrr, lp_irr: r.lpIrr, lp_multiple: r.lpMult, gp_take: r.gpTake, refi_gap: r.refiGap,
    owner_occupant_monthly: own,
  };
  const seen = new Set();
  for (const [, key, num] of shown().matchAll(/"([a-z0-9_]+)":\s*(-?\d+(?:\.\d+)?)/g)) {
    if (!(key in KEYS)) continue;
    seen.add(key);
    const places = (num.split('.')[1] || '').length;
    assert.equal(Number(num), round(KEYS[key], places), `"${key}": ${num}, where the model gives ${round(KEYS[key], places)}`);
  }
  for (const key of ['noi', 'all_in_cost', 'yield_on_cost', 'value_created', 'deal_irr', 'lp_irr', 'gp_take', 'refi_gap', 'owner_occupant_monthly']) {
    assert.ok(seen.has(key), `a JSON plate prints "${key}"`);
  }
});

// ------------------------------------------------------------ the way in ----

test('the home page\'s 01 Work links the case study, under the page\'s own title', () => {
  const work = findAll(parseHtml(readPage('index.html')), (el) => el.attrs.id === 'work')[0];
  assert.ok(work, 'index.html has #work');
  const links = findAll(work, (el) => el.tag === 'a' && el.attrs.href === PAGE);
  assert.ok(links.length, `01 Work links ${PAGE}`);
  assert.ok(links.some((a) => flat(a).includes(TITLE)), 'the link names the case study, for a screen reader too');
  assert.ok(findAll(work, (el) => el.tag === 'h3').some((h) => flat(h) === TITLE), `01 Work titles it "${TITLE}"`);
  const h1 = findAll(parseHtml(page()), (el) => el.tag === 'h1')[0];
  assert.ok(h1, `${PAGE} has an h1`);
  assert.equal(flat(h1).replace(/\s+/g, ''), TITLE.replace(/\s+/g, ''), 'the page\'s h1 is the same title');
});

test('llms.txt describes the case study under About', () => {
  const llms = fs.readFileSync(path.join(ROOT, 'llms.txt'), 'utf8');
  const at = llms.indexOf('\n## About\n');
  assert.ok(at >= 0, 'llms.txt has ## About');
  const about = llms.slice(at, llms.indexOf('\n## ', at + 1));
  assert.ok(about.includes(`](https://bensiverly.com/${PAGE}): `), `a bullet under About links ${PAGE}`);
});
