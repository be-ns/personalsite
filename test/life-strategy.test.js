'use strict';

// Life Strategy Matrix on the new design (redesign-plan.md, step 2). The agent
// contract has its own tests; these hold what the restyle promised besides:
// the one-page plan prints the same words, the tool's keys leave the menu
// sheet alone, and the page makes no promise the chrome would break.

const test = require('node:test');
const assert = require('node:assert/strict');

const { readPage, inlineScripts } = require('./helpers');

const html = readPage('life-strategy.html');
const js = inlineScripts(html).join('\n');

// The source of one function in the page's script, up to the next one.
function fn(name) {
  const at = js.indexOf(`function ${name}(`);
  assert.ok(at >= 0, `the page defines ${name}()`);
  const next = js.indexOf('\n      function ', at + 1);
  return js.slice(at, next < 0 ? js.length : next);
}

test('the one-page plan prints the same words as before the restyle', () => {
  const print = fn('renderPrint');
  for (const words of [
    'Life Strategy Matrix', 'Where to invest your energy', 'Date:', "Today\\'s date",
    'Your priority this month', 'Your Scores', 'Category', 'Importance', 'Satisfaction', 'Action',
    "buildQuadrantBlock('Maintain', buckets.maintain)", "buildQuadrantBlock('Invest', buckets.invest)",
    "buildQuadrantBlock('Rebalance', buckets.rebalance)", "buildQuadrantBlock('Release', buckets.release)",
    'Print PDF', 'window.print()',
  ]) {
    assert.ok(print.includes(words) || fn('attachPrintListeners').includes(words), `the plan still has ${words}`);
  }
  // On paper whatever the edition, and only the plan prints.
  assert.match(print, /class="proof plan" data-edition="day"/);
  assert.doesNotMatch(print, /data-insert/, 'a proof never flips to charcoal');
});

test('keys pressed in the menu sheet are the sheet\'s', () => {
  const at = js.indexOf("document.addEventListener('keydown'");
  assert.ok(at >= 0, 'the page has its keyboard shortcuts');
  const handler = js.slice(at, js.indexOf('});', at));
  // Any open dialog, not only a key whose target is in one: with focus fallen
  // to the body inside the open sheet, the Enter check would take it as Next.
  const guard = handler.search(/if \(document\.querySelector\('dialog\[open\]'\)[^\n]*\) return;/);
  assert.ok(guard >= 0, 'the handler returns while a dialog is open');
  assert.ok(guard < handler.indexOf("'Escape'") && guard < handler.indexOf("'Enter'"), 'before it looks at Enter or Escape');
});

test('the privacy line says what is true now that the edition is remembered', () => {
  assert.ok(!html.includes('Nothing is saved'), 'the edition is saved, so "Nothing is saved" is not true any more');
  assert.match(html, /Nothing you enter is saved/);
});

test('the opener shows the Workshop marigold, and the work surface no fields', () => {
  assert.match(fn('renderIntro'), /<use href="#art-marigold"/);
  for (const name of ['renderScoring', 'renderResults', 'renderPrint']) {
    assert.doesNotMatch(fn(name), /field-spot|field-leaf|class="[^"]*\b(rim|fade|seal)\b/, `${name} keeps the surface calm`);
  }
});
