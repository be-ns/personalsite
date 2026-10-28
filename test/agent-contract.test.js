'use strict';

// The agent contract: what someone's agent relies on to find and run the
// tools. Captured in test/fixtures/agent-contract.json from the committed
// pages before any tool was restyled, so a restyle that renames a parameter,
// a WebMCP tool, a storage key or a label llms.txt quotes fails here.
// These checks read the files; check-browser.js runs the pages and compares
// the WebMCP schemas and outputs themselves.

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const { ROOT, readPage, inlineScripts } = require('./helpers');
const { parseHtml, findAll, hasClass, textContent, chromePages } = require('../build-pages');

const contract = JSON.parse(fs.readFileSync(path.join(__dirname, 'fixtures', 'agent-contract.json'), 'utf8'));
const llms = fs.readFileSync(path.join(ROOT, 'llms.txt'), 'utf8');

// Inline scripts with string escapes undone, so a description written as
// 'person\'s' in the source compares equal to the captured text.
const scriptsOf = (page) => inlineScripts(readPage(page)).join('\n');
const unescaped = (js) => js.replace(/\\(['"\\])/g, '$1');
const quoted = (js, word) => new RegExp(`(['"\`])${word}\\1|\\b${word}\\s*:`).test(js);

// The llms.txt section for a page: from its canonical URL to the next "## ".
function llmsSection(page) {
  const at = llms.indexOf(`https://bensiverly.com/${page}`);
  assert.ok(at >= 0, `llms.txt lists ${page}`);
  const next = llms.indexOf('\n## ', at);
  return llms.slice(at, next < 0 ? llms.length : next);
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

  test(`${page}: every URL parameter is documented and read`, () => {
    const section = llmsSection(page);
    const js = scriptsOf(page);
    for (const param of spec.urlParams) {
      assert.ok(section.includes(`\`${param}\``) || section.includes(`?${param}=`) || section.includes(`&${param}=`), `llms.txt documents ${param}`);
      assert.ok(quoted(js, param), `${page} reads the ${param} parameter`);
    }
  });

  test(`${page}: WebMCP tools keep their names, descriptions and inputs`, () => {
    const section = llmsSection(page);
    const js = scriptsOf(page);
    const plain = unescaped(js);
    for (const tool of spec.webmcp) {
      assert.match(js, new RegExp(`name:\\s*'${tool.name}'`), `${page} registers ${tool.name}`);
      assert.ok(section.includes(`\`${tool.name}\``), `llms.txt lists ${tool.name}`);
      assert.ok(plain.includes(tool.description), `${tool.name} keeps its description`);
      for (const prop of Object.keys(tool.inputSchema.properties || {})) {
        assert.ok(quoted(js, prop), `${tool.name} still names its ${prop} input`);
      }
      for (const key of tool.inputSchema.required || []) assert.ok(quoted(js, key), `${tool.name} still requires ${key}`);
    }
  });

  test(`${page}: the labels llms.txt quotes are still on the page`, () => {
    const html = readPage(page);
    for (const label of spec.labels) {
      assert.ok(llms.includes(label), `llms.txt quotes "${label}"`);
      assert.ok(html.includes(label), `${page} still says "${label}"`);
    }
  });
}

test('storage keys are unchanged', () => {
  for (const [key, spec] of Object.entries(contract.storage)) {
    // The edition key belongs to the chrome, so every page that carries it uses it too.
    const pages = key === 'edition' ? [...new Set([...spec.pages, ...chromePages().filter((p) => readPage(p).includes('<!-- chrome:head'))])] : spec.pages;
    for (const page of pages) {
      const js = inlineScripts(readPage(page)).join('\n');
      if (key.endsWith('_unreadable')) {
        // Built as STORAGE_KEY + '_unreadable' from the draft key.
        assert.ok(js.includes(`'${key.replace(/_unreadable$/, '')}'`) && js.includes("'_unreadable'"), `${page} keeps ${key}`);
      } else {
        assert.ok(js.includes(`'${key}'`), `${page} uses the storage key ${key}`);
      }
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

test('the résumé keeps its version parameters and PDF files', () => {
  const { page, urlParams, versions } = contract.resume;
  const js = inlineScripts(readPage(page)).join('\n');
  for (const param of urlParams) assert.ok(js.includes(`params.get('${param}')`), `resume.html reads ?${param}=`);
  for (const [version, pdf] of Object.entries(versions)) {
    assert.ok(fs.existsSync(path.join(ROOT, pdf)), `${pdf} exists`);
    assert.ok(new RegExp(`'${version}':\\s*\\{[^}]*pdf:\\s*'${pdf.replace(/\./g, '\\.')}'`).test(js), `version ${version} offers ${pdf}`);
  }
});
