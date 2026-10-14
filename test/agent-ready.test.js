'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const { ROOT, readPage, inlineScripts } = require('./helpers');

// The public tools. Each one must be usable by someone's agent, not only by a
// person with a mouse: described in llms.txt, self-describing in JSON-LD, and
// callable over WebMCP where the browser supports it.
const TOOLS = [
  'life-strategy.html',
  'native-plant-finder.html',
  'memorial-pamphlet.html',
  'service-of-life.html',
  'memorial-preferences.html',
  'decision-assist.html',
];

function jsonLd(html) {
  const blocks = [];
  const re = /<script type="application\/ld\+json">([\s\S]*?)<\/script>/g;
  let m;
  while ((m = re.exec(html)) !== null) blocks.push(JSON.parse(m[1]));
  return blocks.flatMap((b) => (b['@graph'] ? b['@graph'] : [b]));
}

const llms = fs.readFileSync(path.join(ROOT, 'llms.txt'), 'utf8');

test('llms.txt opens with an H1 and a summary blockquote', () => {
  assert.match(llms, /^# .+\n\n> .+/);
});

for (const page of TOOLS) {
  test(`${page} is listed in llms.txt with its canonical URL`, () => {
    assert.ok(llms.includes(`https://bensiverly.com/${page}`));
  });

  test(`${page} describes itself as a WebApplication with a URL template`, () => {
    const app = jsonLd(readPage(page)).find((n) => [].concat(n['@type']).includes('WebApplication'));
    assert.ok(app, 'has a WebApplication node');
    assert.equal(app.url, `https://bensiverly.com/${page}`);
    const actions = [].concat(app.potentialAction || []);
    assert.ok(actions.length, 'has a potentialAction');
    for (const a of actions) {
      const tpl = (a.target && a.target.urlTemplate) || '';
      assert.ok(tpl.startsWith(`https://bensiverly.com/${page}?`), `urlTemplate points at this page: ${tpl}`);
    }
  });

  test(`${page} registers WebMCP tools behind a feature check`, () => {
    const js = inlineScripts(readPage(page)).join('\n');
    assert.match(js, /document\.modelContext\s*\|\|\s*navigator\.modelContext/);
    assert.match(js, /\.registerTool\(/);
  });
}
