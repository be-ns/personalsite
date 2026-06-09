'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const { htmlPages, readPage, inlineScripts } = require('./helpers');

for (const page of htmlPages()) {
  test(`${page} inline scripts parse as valid JavaScript`, () => {
    inlineScripts(readPage(page)).forEach((script, i) => {
      assert.doesNotThrow(() => new Function(script), `script block ${i} should parse`);
    });
  });

  test(`${page} JSON-LD blocks parse as valid JSON`, () => {
    const html = readPage(page);
    const re = /<script type="application\/ld\+json">([\s\S]*?)<\/script>/g;
    let m;
    while ((m = re.exec(html)) !== null) {
      assert.doesNotThrow(() => JSON.parse(m[1]));
    }
  });
}
