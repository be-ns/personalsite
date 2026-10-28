'use strict';

// The agent contract: what someone's agent relies on to find and run the
// tools. Captured in test/fixtures/agent-contract.json from the committed
// pages before any tool was restyled, so a restyle that renames a parameter,
// changes a WebMCP tool or its input schema, drops a storage key or a label
// llms.txt quotes fails here.
//
// The pages' own scripts run in node (test/page-sandbox.js), so these checks
// see what the page actually registers and reads, not what its source happens
// to mention. check-browser.js runs the pages in Chrome for the rest: the
// tools' outputs, and what each prefilled link shows.

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const { ROOT, readPage, inlineScripts } = require('./helpers');
const { runPage } = require('./page-sandbox');
const { parseHtml, findAll, hasClass, textContent, chromePages } = require('../build-pages');

const contract = JSON.parse(fs.readFileSync(path.join(__dirname, 'fixtures', 'agent-contract.json'), 'utf8'));
const llms = fs.readFileSync(path.join(ROOT, 'llms.txt'), 'utf8');

// The llms.txt section for a page: from its canonical URL to the next "## ".
function llmsSection(page) {
  const at = llms.indexOf(`https://bensiverly.com/${page}`);
  assert.ok(at >= 0, `llms.txt lists ${page}`);
  const next = llms.indexOf('\n## ', at);
  return llms.slice(at, next < 0 ? llms.length : next);
}

// The example links llms.txt gives for a page, as site-relative paths.
const llmsExamples = (page) => [...llmsSection(page).matchAll(/Example: https:\/\/bensiverly\.com\/(\S+)/g)].map((m) => m[1]);

// One sandbox run per address, shared by the tests below.
const runs = new Map();
function run(url, options) {
  const key = JSON.stringify([url, options || null]);
  if (!runs.has(key)) runs.set(key, runPage(readPage(url.split('?')[0]), url, options));
  return runs.get(key);
}
async function clean(url, options) {
  const result = await run(url, options);
  assert.deepEqual(result.errors, [], `${url} runs without errors in the sandbox`);
  return result;
}

function potentialActions(html) {
  const out = [];
  for (const m of html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)) {
    const data = JSON.parse(m[1]);
    for (const n of (data['@graph'] || [data])) {
      if ([].concat(n['@type']).includes('WebApplication')) out.push(...[].concat(n.potentialAction || []));
    }
  }
  return out.map((a) => ({ '@type': a['@type'], urlTemplate: a.target.urlTemplate, params: [...a.target.urlTemplate.matchAll(/\{([a-z_]+)\}/g)].map((x) => x[1]) }));
}

for (const [page, spec] of Object.entries(contract.pages)) {
  test(`${page}: URL templates are unchanged`, () => {
    assert.deepEqual(potentialActions(readPage(page)), spec.urlTemplates);
  });

  test(`${page}: every URL parameter is documented in llms.txt`, () => {
    const section = llmsSection(page);
    const notes = spec.urlParamNotes || {};
    for (const param of spec.urlParams) {
      if (notes[param]) continue;
      assert.ok(section.includes(`\`${param}\``) || section.includes(`?${param}=`) || section.includes(`&${param}=`), `llms.txt documents ${param}`);
    }
    for (const param of Object.keys(notes)) assert.ok(spec.urlParams.includes(param), `${param} has a note but is not a URL parameter`);
  });

  test(`${page}: reads exactly the contract's URL parameters from the query string`, async () => {
    // The bare page, then every link llms.txt and the contract give: some
    // parameters are read only once another one is present.
    const urls = [...new Set([page, ...llmsExamples(page), ...spec.examples.map((e) => e.url), ...spec.prefilled.map((p) => p.url)])];
    const read = new Set();
    for (const url of urls) for (const p of (await clean(url)).params) read.add(p);
    assert.deepEqual([...read].sort(), [...spec.urlParams].sort());
  });

  test(`${page}: registers the contract's WebMCP tools exactly`, async () => {
    const { tools } = await clean(page);
    assert.deepEqual(tools, spec.webmcp);
    const section = llmsSection(page);
    for (const tool of spec.webmcp) assert.ok(section.includes(`\`${tool.name}\``), `llms.txt lists ${tool.name}`);
  });

  test(`${page}: the labels llms.txt quotes are still on the page`, () => {
    const html = readPage(page);
    for (const label of spec.labels) {
      assert.ok(llms.includes(label), `llms.txt quotes "${label}"`);
      assert.ok(html.includes(label), `${page} still says "${label}"`);
    }
  });

  for (const link of spec.prefilled.filter((p) => 'prints' in p)) {
    test(`${page}: ${link.url} ${link.prints ? 'opens' : 'does not open'} the print dialog, and the bare page does not`, async () => {
      assert.equal((await clean(link.url)).printed, link.prints);
      assert.equal((await clean(page)).printed, false);
    });
  }
}

test('storage keys are unchanged', async () => {
  for (const [key, spec] of Object.entries(contract.storage)) {
    // The edition key belongs to the chrome, so every page that carries it uses it too.
    const pages = key === 'edition' ? [...new Set([...spec.pages, ...chromePages().filter((p) => readPage(p).includes('<!-- chrome:head'))])] : spec.pages;
    for (const page of pages) {
      // A draft that fails to parse is set aside under KEY_unreadable.
      const options = key.endsWith('_unreadable') ? { saved: { [key.replace(/_unreadable$/, '')]: '{not json' } } : undefined;
      const { storage } = await clean(page, options);
      assert.ok(storage.includes(key), `${page} uses the storage key ${key} (touched: ${storage.join(', ') || 'none'})`);
    }
  }
});

test('the Memorial Preferences Worksheet still prints the same eight sections', () => {
  // The same reading the page's own WebMCP tool does, done on the markup.
  const doc = parseHtml(readPage(contract.worksheet.page));
  const text = (el) => (el ? textContent(el).replace(/\s+/g, ' ').trim() : '');
  const sheet = findAll(doc, (el) => hasClass(el, 'mpw-sheet'))[0];
  assert.ok(sheet, 'has the printable sheet');
  const sections = findAll(sheet, (el) => hasClass(el, 'mpw-section')).map((section) => ({
    heading: text(findAll(section, (el) => el.tag === 'h3')[0]),
    hint: text(findAll(section, (el) => hasClass(el, 'mpw-hint'))[0]) || null,
    checkboxes: findAll(section, (el) => hasClass(el, 'mpw-check')).map(text),
    fields: findAll(section, (el) => hasClass(el, 'mpw-field-label')).map(text),
    blank_lines: section.children.filter((c) => c.type === 'element' && hasClass(c, 'mpw-line')).length,
  }));
  assert.equal(sections.length, 8);
  assert.deepEqual(sections, contract.worksheet.sections);
  assert.equal(text(findAll(sheet, (el) => hasClass(el, 'mpw-sheet-title'))[0]), contract.worksheet.title);
  assert.equal(text(findAll(sheet, (el) => hasClass(el, 'mpw-sheet-intro'))[0]), contract.worksheet.intro);
  const idRow = findAll(sheet, (el) => hasClass(el, 'mpw-id-row'))[0];
  assert.deepEqual(findAll(idRow, (el) => hasClass(el, 'mpw-field-label')).map(text), contract.worksheet.header_fields);
  const foot = findAll(sheet, (el) => hasClass(el, 'mpw-sheet-foot'))[0];
  assert.deepEqual(findAll(foot, (el) => el.tag === 'p').map(text), contract.worksheet.closing);
});

test('the résumé keeps its version parameters and PDF files', async () => {
  const { page, urlParams, versions } = contract.resume;
  assert.deepEqual((await clean(page)).params, [...urlParams].sort(), `${page} reads ?${urlParams.join('= and ?')}=`);
  const js = inlineScripts(readPage(page)).join('\n');
  for (const [version, pdf] of Object.entries(versions)) {
    assert.ok(fs.existsSync(path.join(ROOT, pdf)), `${pdf} exists`);
    assert.ok(new RegExp(`'${version}':\\s*\\{[^}]*pdf:\\s*'${pdf.replace(/\./g, '\\.')}'`).test(js), `version ${version} offers ${pdf}`);
  }
});
