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
const { parseHtml, decodeEntities, findAll, hasClass, textContent } = require('../build-pages');

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
  const names = 'underwrite, ownerNet, raiseModel, opex, pmt, SF, TAX_RATE, FIXED, BUILDS, LTC, LOAN_RATE, PERM_RATE, DEV_FEE, PREF, SPLIT, GPC, EXIT';
  vm.runInNewContext(`'use strict';\n${script.slice(from, to)}\nmodule.exports = { ${names} };\n`, sandbox, { filename: `${PAGE} (model)` });
  return sandbox.module.exports;
}

// The case: bought at $1.58M, rents at $4.50 a sq ft a month, sold at a 5%
// cap, built at the estimate.
const CASE = { price: 1580000, rent: 4.5, cap: 0.05, cost: 1 };
// The market the page measures it against: San Mateo cap rates, and the yield it aims for.
const CAP_RANGE = [0.04, 0.055], TARGET = 0.075;

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

// Everything the tests read from the model, on the case. The solves are slow, so it runs once.
let cached;
function figures() {
  if (!cached) cached = compute();
  return cached;
}
function compute() {
  const m = model();
  const { underwrite, ownerNet, raiseModel, opex, pmt, SF, TAX_RATE, PERM_RATE } = m;
  const u = underwrite(CASE);
  const r = raiseModel(CASE);
  const sfTotal = SF.reduce((a, b) => a + b, 0);
  const loanFee = 0.015 * r.commit;
  return {
    ...m,
    u,
    r,
    own: ownerNet(CASE),
    yield75: solve((price) => underwrite({ ...CASE, price }).yoc - TARGET),
    zero: solve((price) => underwrite({ ...CASE, price }).created),
    // The prices where the LPs fall under 15%, and where a refinance stops returning cash.
    lp15: solve((price) => raiseModel({ ...CASE, price }).lpIrr - 0.15, 1.4e6, 1.7e6),
    refi0: solve((price) => raiseModel({ ...CASE, price }).refiGap, 1.3e6, 1.6e6),
    loanFee,
    // What the total adds beyond the all-in cost, the fees and the interest: legal and setup.
    setup: r.total - u.allIn - r.fee - loanFee - r.interest,
    coEarned: r.gpProfit - r.promote,
    // Cash a year after the permanent loan's payments, on the equity.
    holdCash: (u.noi - 12 * pmt(r.perm, PERM_RATE)) / r.equity,
    // Unit 2 held to $5,000 a month, its loss spread over the rent per sq ft.
    unit2At5k: underwrite({ ...CASE, rent: CASE.rent - (SF[1] * CASE.rent - 5000) / sfTotal }).yoc,
    tax: TAX_RATE * (CASE.price + u.buildAll),
    fixed: Math.round(opex(CASE.price, u.egi, u.buildAll, false) - TAX_RATE * (CASE.price + u.buildAll)),
    // The raise at $1.40M, where the verdict draws its line, and sold at the top cap rate.
    at140: raiseModel({ ...CASE, price: 1400000 }),
    capTop: raiseModel({ ...CASE, cap: CAP_RANGE[1] }),
  };
}

// The highest $10k step at or under a price.
const step = (n) => Math.floor(n / 1e4) * 1e4;

// The page's own formats.
const commas = (n) => String(Math.round(Math.abs(n))).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
const usd = (n) => `${n < 0 ? '−' : ''}$${commas(n)}`;
const usdK = (n) => `$${Math.round(n / 1000)}k`;
const usdM = (n) => `$${(n / 1e6).toFixed(2)}M`;
const pct = (x) => `${(x * 100).toFixed(1)}%`;
const whole = (x) => String(round(x * 100, 2));   // a rate as the page writes it: 0.65 -> "65", 0.055 -> "5.5"

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
  assert.equal(pct(figures().capTop.dealIrr), '4.6%', 'deal IRR at a 5.5% exit cap');
  assert.ok(raiseModel({ ...CASE, rent: 4 }).profit < 0, '$4.00 rents turn the profit into a loss');
  assert.equal(Math.round(figures().at140.lpIrr * 100), 22, 'LP net IRR at $1.40M');
  // The solver's brackets hold the crossings the capital and verdict sections draw their lines at.
  const { lp15, refi0, coEarned } = figures();
  assert.ok(raiseModel({ ...CASE, price: step(lp15) }).lpIrr >= 0.15 && raiseModel({ ...CASE, price: step(lp15) + 1e4 }).lpIrr < 0.15, 'the 15% crossing is found, at a $10k step');
  assert.ok(raiseModel({ ...CASE, price: step(refi0) }).refiGap > 0 && raiseModel({ ...CASE, price: step(refi0) + 1e4 }).refiGap < 0, 'the refinance crossing is found, at a $10k step');
  // The GP's own money earns what the LPs' does: 10% of the profit the promote leaves.
  assert.ok(Math.abs(coEarned - 0.1 * (r.profit - r.promote)) < 1, 'the GP\'s co-invest earns pari passu with the LPs');
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
  // The same figures inside the sentences that carry them.
  const { lp15, refi0, loanFee, setup, coEarned, holdCash, unit2At5k, at140, capTop, raiseModel } = figures();
  const { LTC, LOAN_RATE, PREF, SPLIT, GPC, EXIT } = figures();
  const { interest, promote } = r;
  const terms = `A construction loan at ${whole(LTC)}% of cost and ${whole(LOAN_RATE)}%. Investors get an ${whole(PREF)}% preferred return first. After that they take ${whole(1 - SPLIT)}% of the profit, and the GP, who runs the deal, takes ${whole(SPLIT)}%. Sell at month ${EXIT}.`;
  const loss = raiseModel({ ...CASE, rent: 4 }).profit < 0 ? 'a loss' : 'a profit';
  const said = [
    ['the 15% line', usdM(step(lp15)), '$1.56M', `${usdM(step(lp15))} or less, and LPs clear the 15% bar`],
    ['the 15% line, in the verdict', usdM(step(lp15)), '$1.56M', `They clear 15% up to about ${usdM(step(lp15))}`],
    ['the refinance line', usdM(step(refi0)), '$1.49M', `past about ${usdM(step(refi0))} a refinance returns nothing`],
    ['the refinance shortfall', usdK(-r.refiGap), '$79k', `the new loan falls ${usdK(-r.refiGap)} short`],
    ['the GP adds at a refinance', usdK(-r.refiGap), '$79k', `The GP adds ${usdK(-r.refiGap)}`],
    ['legal and setup', usdK(setup), '$40k', `${usdK(setup)} of legal and setup, a ${usdK(loanFee)} loan fee`],
    ['the loan fee', usdK(loanFee), '$34k', `a ${usdK(loanFee)} loan fee, and ${usdK(interest)} of interest`],
    ['the interest', usdK(interest), '$224k', `and ${usdK(interest)} of interest`],
    ['the LP multiple', r.lpMult.toFixed(2), '1.31', `${r.lpMult.toFixed(2)}× means they get $${r.lpMult.toFixed(2)} back for every $1`],
    ['the GP take, exact', usd(r.gpTake), '$236,640', `The GP take, ${usd(r.gpTake)}, is a`],
    ['the developer fee', usdK(r.fee), '$122k', `is a ${usdK(r.fee)} developer fee`],
    ['the promote', usdK(promote), '$76k', `a ${usdK(promote)} promote (the GP’s 30% of the profit after the preferred return)`],
    ['the GP\'s co-invest earnings', usdK(coEarned), '$38k', `and ${usdK(coEarned)} earned on its own ${usdK(r.equity * 0.1)}`],
    ['the GP\'s co-invest', usdK(r.equity * GPC), '$122k', `Co-invest: ${usdK(r.equity * GPC)}, which is ${whole(GPC)}% of the equity`],
    ['the yield over the top cap rate', ((u.yoc - CAP_RANGE[1]) * 100).toFixed(1), '0.9', `${((u.yoc - CAP_RANGE[1]) * 100).toFixed(1)} points over the top cap rate`],
    ['the raise\'s terms, in the deck', terms, 'A construction loan at 65% of cost and 9%. Investors get an 8% preferred return first. After that they take 70% of the profit, and the GP, who runs the deal, takes 30%. Sell at month 24.', terms],
    ['the deal IRR at the top cap rate', pct(capTop.dealIrr), '4.6%', `A ${whole(CAP_RANGE[1])}% exit cap drops the deal IRR to ${pct(capTop.dealIrr)}`],
    ['$4.00 rents', loss, 'a loss', `Median rents, $4.00 per sq ft, turn the profit into ${loss}`],
    ['the refinance loan and the payoff', `${usdM(r.perm)} against ${usdM(r.loan)}`, '$2.02M against $2.10M', `the bank lends about ${usdM(r.perm)} against a ${usdM(r.loan)} construction payoff`],
    ['the deal IRR, in the verdict', `${Math.round(r.dealIrr * 100)}%`, '17%', `${Math.round(r.dealIrr * 100)}% deal IRR at ${usdM(CASE.price)}`],
    ['LPs at $1.40M, in the verdict', `${Math.round(at140.lpIrr * 100)}%`, '22%', `LPs net about ${Math.round(at140.lpIrr * 100)}% at ${usdM(1400000)}`],
    ['unit 2 held to $5,000', pct(unit2At5k), '6.1%', `the project earns ${pct(unit2At5k)} a year on its cost instead of ${pct(u.yoc)}`],
    ['the price over a year\'s net at a 5% cap', String(Math.round(u.value / u.noi)), '20', `at 5% a buyer pays ${Math.round(u.value / u.noi)} times what the building nets`],
    ['cash on a hold, in the capital lists', `${Math.round(holdCash * 100)}%`, '3%', `LPs earn about ${Math.round(holdCash * 100)}% cash`],
    ['cash on a hold, in the verdict', `${Math.round(holdCash * 100)}%`, '3%', `they earn about ${Math.round(holdCash * 100)}% a year in cash`],
  ];
  for (const [what, made, want, sentence] of said) {
    assert.equal(made, want, `the model gives ${what} as ${made}`);
    assert.ok(text.includes(sentence), `the page says ${what}: "${sentence}"`);
  }
});

test('Fig. 6\'s label gives the model\'s LP return at each price it names', () => {
  const { raiseModel } = figures();
  const fig = findAll(parseHtml(page()), (el) => el.attrs.id === 'priceFig')[0];
  assert.ok(fig, `${PAGE} has #priceFig`);
  const img = findAll(fig, (el) => el.attrs.role === 'img')[0];
  assert.ok(img && img.attrs['aria-label'], 'Fig. 6 has a labelled image');
  const label = decodeEntities(img.attrs['aria-label']);
  const bars = [...label.matchAll(/(−?\d+\.\d)% at \$(\d\.\d\d)M/g)];
  assert.equal(bars.length, 8, `the label names eight prices: ${label}`);
  for (const [, got, price] of bars) {
    const want = pct(raiseModel({ ...CASE, price: Number(price) * 1e6 }).lpIrr).replace('-', '−');
    assert.equal(`${got}%`, want, `LP net IRR at $${price}M`);
  }
  // The label's prices are the ones the chart script draws, in its order.
  const drawn = inlineScripts(page()).map((s) => s.match(/const prices\s*=\s*\[([^\]]*)\]/)).find(Boolean);
  assert.ok(drawn, 'the chart script lists its prices');
  const prices = vm.runInNewContext(`[${drawn[1]}]`);
  assert.deepEqual(bars.map(([, , price]) => `$${price}M`), [...prices].map(usdM), 'the label names the drawn prices');
});

// A table's rows by their header: what a reader sees on each line.
function rowsOf(root) {
  const rows = new Map();
  for (const tr of findAll(root, (el) => el.tag === 'tr')) {
    const th = findAll(tr, (el) => el.tag === 'th')[0];
    const td = findAll(tr, (el) => el.tag === 'td')[0];
    if (th && td) rows.set(flat(th), flat(td));
  }
  return rows;
}
const dollars = (s) => Number(String(s).replace(/[^\d]/g, ''));

test('the underwriting ledgers and Fig. 4 are the model\'s, line by line', () => {
  const { u, r, TAX_RATE, FIXED, BUILDS, LOAN_RATE, PERM_RATE, tax, fixed } = figures();
  const sec = findAll(parseHtml(page()), (el) => el.attrs.id === 'underwriting')[0];
  assert.ok(sec, `${PAGE} has #underwriting`);
  const rows = rowsOf(sec);
  const line = (label, value) => assert.equal(rows.get(label), usd(value), `${label}: the model gives ${usd(value)}`);
  // Income, a year.
  const gross = u.egi / 0.95, mgmt = 0.05 * u.egi;
  line('Gross rent', gross);
  line('Vacancy, 5%', -0.05 * gross);
  line('Effective income', u.egi);
  line(`Property tax, ${(TAX_RATE * 100).toFixed(2)}%`, -tax);
  line('Management, 5%', -mgmt);
  line('Net operating income (NOI)', u.noi);
  line('Insurance', -FIXED.insurance);
  line('Repairs', -FIXED.repairs);
  line('Water, sewer, trash', -FIXED.utilities);
  line('Reserves', -FIXED.reserves);
  assert.equal(FIXED.insurance + FIXED.repairs + FIXED.utilities + FIXED.reserves, fixed, 'the four fixed lines are all of the model\'s fixed costs');
  // The note under it: each line rounds on its own, so the column misses the NOI by a dollar or so.
  const gap = Math.round(u.egi) - Math.round(tax) - fixed - Math.round(mgmt) - Math.round(u.noi);
  assert.ok(gap > 0, `the rounded column adds to more than the NOI (${gap})`);
  assert.ok(flat(sec).includes(`the income column adds to $${gap} more than the NOI`), `the note gives the $${gap} gap`);
  // Cost, all in.
  const build = u.buildAll / 1.1;
  line('Purchase', CASE.price);
  line('Closing, 1.5%', 0.015 * CASE.price);
  line('Contingency, 10%', 0.1 * build);
  line('All-in cost', u.allIn);
  line('Garage ADU', BUILDS.garage);
  line('Two 2-story ADUs', BUILDS.adus);
  line('Refresh units 1 and 2', BUILDS.refresh);
  assert.equal(BUILDS.garage + BUILDS.adus + BUILDS.refresh, build, 'the three builds are all of the model\'s build cost');
  // Fig. 4: every row, in order, with its value and its mark on the 3% to 9.5% axis; the shaded band; and the label.
  const dots = findAll(sec, (el) => hasClass(el, 'cs-dots'))[0];
  assert.ok(dots && dots.attrs['aria-label'], 'Fig. 4 has a labelled chart');
  const chart = dotChart(dots);
  const at = (v) => (v - 0.03) / 0.065 * 100;
  const rate = (x, places) => `${(x * 100).toFixed(places)}%`;
  const caps = `${whole(CAP_RANGE[0])} to ${whole(CAP_RANGE[1])}%`;
  const want = [
    ['Cap rates, San Mateo', caps, CAP_RANGE[0], CAP_RANGE[1]],
    ['Yield on cost', pct(u.yoc), u.yoc],
    ['With fees and interest', pct(u.noi / r.total), u.noi / r.total],
    ['Permanent loan rate', rate(PERM_RATE, 2), PERM_RATE],
    ['Target yield', rate(TARGET, 1), TARGET],
    ['Construction loan', rate(LOAN_RATE, 1), LOAN_RATE],
  ];
  assert.deepEqual(chart.rows.map((row) => row.name), want.map(([name]) => name), 'Fig. 4 has its six rows, in order');
  want.forEach(([name, value, v, to], i) => {
    const row = chart.rows[i];
    assert.equal(row.value, value, `Fig. 4 gives ${name} as ${value}`);
    near(row.left, at(v), `Fig. 4's ${name} mark`);
    if (to !== undefined) near(row.left + row.width, at(to), `Fig. 4's ${name} band, right edge`);
  });
  near(chart.band[0], at(CAP_RANGE[0]), 'Fig. 4\'s shading, left edge');
  near(chart.band[1], at(CAP_RANGE[1]), 'Fig. 4\'s shading, right edge');
  for (const tick of chart.ticks) near(tick.left, at(parseFloat(tick.label) / 100), `Fig. 4's ${tick.label} tick`);
  const label = decodeEntities(dots.attrs['aria-label']).replace(/\s+/g, ' ');
  const said = `Yield on cost of ${pct(u.yoc)}, or ${pct(u.noi / r.total)} with fees and interest, sits above San Mateo cap rates of ${caps} and below a ${rate(PERM_RATE, 2)} permanent loan rate, a ${rate(TARGET, 1)} target yield and a ${rate(LOAN_RATE, 1)} construction loan.`;
  assert.equal(label, said, 'Fig. 4\'s label says what its rows show');
});

// A dot chart (Figs. 3 and 4): each row's name, printed value, and mark (left, and width for a band),
// in % of the axis; the axis ticks; and the shaded band's edges (--a and --b).
function dotChart(dots) {
  const pctOf = (style, prop) => Number((String(style || '').match(new RegExp(`(?:^|[;\\s])${prop}:\\s*(-?[\\d.]+)%`)) || [])[1]);
  const rows = findAll(dots, (el) => hasClass(el, 'cs-drow')).map((row) => {
    const mark = findAll(row, (el) => el.tag === 'i' || el.tag === 'b')[0] || { attrs: {} };
    return {
      name: flat(findAll(row, (el) => hasClass(el, 'cs-dl'))[0]),
      value: flat(findAll(row, (el) => hasClass(el, 'cs-dv'))[0]),
      left: pctOf(mark.attrs.style, 'left'),
      width: pctOf(mark.attrs.style, 'width'),
      ours: hasClass(row, 'is-ours'),
    };
  });
  const axis = findAll(dots, (el) => hasClass(el, 'cs-daxis'))[0];
  const ticks = findAll(axis, (el) => el.tag === 'span' && /left:/.test(el.attrs.style || '')).map((t) => ({ label: flat(t), left: pctOf(t.attrs.style, 'left') }));
  return { rows, ticks, band: [pctOf(dots.attrs.style, '--a'), pctOf(dots.attrs.style, '--b')] };
}
// Marks are written to a tenth of a percent, so each sits within half of that of where its value falls.
function near(got, want, what) {
  assert.ok(Math.abs(got - want) <= 0.05 + 1e-9, `${what} sits at ${want.toFixed(2)}%, not ${got}%`);
}

test('Fig. 3 puts these homes at the model\'s rents, and every mark at its value', () => {
  const { SF } = figures();
  const sec = findAll(parseHtml(page()), (el) => el.attrs.id === 'market')[0];
  assert.ok(sec, `${PAGE} has #market`);
  const dots = findAll(sec, (el) => hasClass(el, 'cs-dots'))[0];
  assert.ok(dots && dots.attrs['aria-label'], 'Fig. 3 has a labelled chart');
  const chart = dotChart(dots);
  const at = (v) => (v - 3000) / 3000 * 100;   // the $3k to $6k axis
  // These homes: each priced at the case's rent per sq ft. ADUs 3, 4 and 5 are one size.
  assert.ok(SF[2] === SF[3] && SF[3] === SF[4], 'ADUs 3, 4 and 5 are one size');
  const ours = [['ADUs 3, 4, 5', SF[2]], ['Unit 1', SF[0]], ['Unit 2', SF[1]]].map(([name, sf]) => [name, usd(sf * CASE.rent)]);
  assert.deepEqual(chart.rows.filter((row) => row.ours).map((row) => [row.name, row.value]), ours, 'Fig. 3 prices these homes at the case\'s rent');
  // Every mark sits at its printed value; the ticks at theirs; the shading spans the middle half.
  for (const row of chart.rows) near(row.left, at(dollars(row.value)), `Fig. 3's ${row.name} mark`);
  for (const tick of chart.ticks) near(tick.left, at(Number(tick.label.replace(/[$k]/g, '')) * 1000), `Fig. 3's ${tick.label} tick`);
  const quartile = (name) => chart.rows.find((row) => row.name === name);
  assert.ok(quartile('2-bed, 25th percentile') && quartile('2-bed, 75th percentile'), 'Fig. 3 has the 25th and 75th percentiles');
  near(chart.band[0], quartile('2-bed, 25th percentile').left, 'Fig. 3\'s shading, left edge');
  near(chart.band[1], quartile('2-bed, 75th percentile').left, 'Fig. 3\'s shading, right edge');
  // The label names every value the chart draws, and the takeaway gives unit 2's.
  const label = decodeEntities(dots.attrs['aria-label']).replace(/\s+/g, ' ');
  for (const row of chart.rows) assert.ok(label.includes(row.value), `Fig. 3's label gives ${row.name}, ${row.value}: ${label}`);
  assert.ok(label.includes(`These homes: ADUs 3, 4 and 5 at ${ours[0][1]} each, unit 1 at ${ours[1][1]}, and unit 2 at ${ours[2][1]}.`), `Fig. 3's label gives these homes: ${label}`);
  assert.ok(flat(sec).includes(`${ours[2][1]} for unit 2`), 'the takeaway gives unit 2\'s rent');
  assert.ok(flat(sec).includes(`$${CASE.rent.toFixed(2)} per sq ft a month`), 'the deck gives the case\'s rent per sq ft');
});

test('the tiles, Fig. 5 and the price table are the model\'s', () => {
  const { u, r, own, underwrite, setup, loanFee, DEV_FEE, GPC } = figures();
  const root = parseHtml(page());
  // Every tile on the page, by its label.
  const TILES = new Map([
    ['Yield on cost', pct(u.yoc)],
    [`Value at a ${whole(CASE.cap)}% cap`, usdM(u.value)],
    ['Value created', usdK(u.created)],
    ['Profit at sale', usdK(r.profit)],
    ['Deal IRR', pct(r.dealIrr)],
    [`LP net IRR, ${r.lpMult.toFixed(2)}×`, pct(r.lpIrr)],
    ['LP net IRR', pct(r.lpIrr)],
    ['GP take', usdK(r.gpTake)],
    ['Owner-occupant, monthly', usd(own)],
  ]);
  const tiles = findAll(root, (el) => hasClass(el, 'cs-figs')).flatMap((ul) => findAll(ul, (el) => el.tag === 'li'));
  assert.ok(tiles.length >= 11, `the page has its tiles (${tiles.length})`);
  for (const li of tiles) {
    const name = flat(findAll(li, (el) => hasClass(el, 't-folio'))[0]);
    const figure = flat(findAll(li, (el) => el.tag === 'b')[0]);
    assert.ok(TILES.has(name), `a tile the tests know: "${name}"`);
    assert.equal(figure, TILES.get(name), `the ${name} tile gives the model's ${TILES.get(name)}`);
  }
  // Fig. 5: the stack's label, its bars and their widths, and its key.
  const stack = findAll(root, (el) => hasClass(el, 'cs-stack'))[0];
  assert.ok(stack, `${PAGE} has the capital stack`);
  const lp = (1 - GPC) * r.equity, gp = GPC * r.equity;
  assert.equal(decodeEntities(stack.attrs['aria-label']), `Capital stack: loan ${usdM(r.commit)}, investor equity ${usdM(lp)}, sponsor equity ${usdK(gp)}, total ${usdM(r.total)}`, 'Fig. 5\'s label is the model\'s stack');
  const bar = (cls) => findAll(stack, (el) => hasClass(el, cls))[0];
  const share = (x) => `${round(x / r.total * 100, 1)}%`;
  for (const [cls, text, amount] of [['is-debt', `Loan ${usdM(r.commit)}`, r.commit], ['is-lp', `LPs ${usdM(lp)}`, lp], ['is-gp', '', gp]]) {
    assert.equal(flat(bar(cls)), text, `Fig. 5's ${cls} bar reads "${text}"`);
    assert.equal((bar(cls).attrs.style.match(/width:\s*([\d.]+%)/) || [])[1], share(amount), `Fig. 5's ${cls} bar is ${share(amount)} wide`);
  }
  const key = findAll(root, (el) => hasClass(el, 'cs-stack-key'))[0];
  const keyLines = findAll(key, (el) => el.tag === 'p').map((p) => {
    const figure = flat(findAll(p, (el) => el.tag === 'b')[0]);
    return [figure, flat(p).slice(figure.length).trim()];
  });
  assert.deepEqual(keyLines, [
    [usdM(r.total), `Total project, with a ${whole(DEV_FEE)}% developer fee, ${usdK(setup)} of legal and setup, a ${usdK(loanFee)} loan fee, and ${usdK(r.interest)} of interest`],
    [usdM(r.equity), `Equity: ${usdM(lp)} from LPs, ${usdK(gp)} from the GP`],
  ], 'Fig. 5\'s key is the model\'s');
  // What the price does: each row's all-in cost, NOI and yield at that price, starting from the case.
  const table = findAll(root, (el) => el.tag === 'table' && hasClass(el, 'cs-prices'))[0];
  assert.ok(table, `${PAGE} has the price table`);
  const body = findAll(table, (el) => el.tag === 'tbody')[0];
  const lines = findAll(body, (el) => el.tag === 'tr').map((tr) => findAll(tr, (el) => el.tag === 'td').map(flat));
  assert.ok(lines.length >= 3 && lines[0][0] === usdM(CASE.price), `the table starts at the case's ${usdM(CASE.price)}`);
  for (const [price, ...cells] of lines) {
    const at = underwrite({ ...CASE, price: Number(price.replace(/[$M]/g, '')) * 1e6 });
    assert.deepEqual(cells, [usdM(at.allIn), usdK(at.noi), pct(at.yoc)], `at ${price}, the model gives ${usdM(at.allIn)}, ${usdK(at.noi)} and ${pct(at.yoc)}`);
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
  // The capital plate, parsed, field by field: the loan, the equity and the raise's terms.
  const { LTC, LOAN_RATE, PREF, SPLIT, GPC, EXIT } = figures();
  const plates = findAll(parseHtml(page()), (el) => el.tag === 'code' && hasClass(el, 'json')).map(flat);
  const parsed = plates.map((t) => { try { return JSON.parse(t.startsWith('{') ? t : `{${t}}`); } catch (e) { return null; } });
  const c = (parsed.find((o) => o && o.capital) || {}).capital;
  assert.ok(c, 'a JSON plate prints the capital response');
  assert.deepEqual(
    { ltc: c.loan.ltc, rate: c.loan.rate, amount: c.loan.amount, lp: c.equity.lp, gp: c.equity.gp, pref: c.pref, split: c.split, exit: c.exit },
    { ltc: LTC, rate: LOAN_RATE, amount: Math.round(r.commit), lp: Math.round((1 - GPC) * r.equity), gp: Math.round(GPC * r.equity), pref: PREF, split: { lp: round(1 - SPLIT, 2), gp: SPLIT }, exit: { month: EXIT, cap: CASE.cap } },
    'the capital plate gives the model\'s loan, equity and terms');
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
