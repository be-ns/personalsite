'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const { htmlPages, readPage, inlineScripts } = require('./helpers');

for (const page of htmlPages()) {
  test(`${page} has the document basics`, () => {
    const html = readPage(page);
    assert.match(html, /^<!DOCTYPE html>/i, 'starts with an HTML5 doctype');
    assert.match(html, /<html lang="en">/, 'declares a language');
    assert.match(html, /<meta charset="UTF-8">/i, 'declares a charset');
    assert.match(html, /<meta name="viewport"/, 'has a viewport');
    assert.match(html, /<title>[^<]+<\/title>/, 'has a non-empty title');
    assert.match(html, /<meta name="description" content="[^"]+"/, 'has a meta description');
    assert.match(html, /<link rel="canonical" href="https:\/\/bensiverly\.com\//, 'has a canonical URL');
  });

  // The wizard-style tools render their h1 per screen from JS; everything else
  // must carry exactly one in static markup.
  test(`${page} has a single h1 (static or script-rendered)`, () => {
    const html = readPage(page);
    const markup = html.replace(/<script[\s\S]*?<\/script>/g, '');
    const staticCount = (markup.match(/<h1[\s>]/g) || []).length;
    assert.ok(staticCount <= 1, 'at most one h1 in static markup');
    if (staticCount === 0) {
      assert.ok(inlineScripts(html).some((s) => s.includes('<h1')),
        'a script must render the h1 when the markup has none');
    }
  });

  test(`${page} scripts are free of debug logging and var declarations`, () => {
    for (const script of inlineScripts(readPage(page))) {
      assert.doesNotMatch(script, /console\.log\(/, 'no console.log left behind');
      assert.doesNotMatch(script, /\bvar /, 'uses const/let, not var');
    }
  });
}
