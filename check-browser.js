// Browser checks: the things only a real browser can tell us.
//
//   node check-browser.js                  every group (npm run check-browser)
//   node check-browser.js agent-contract   just the named groups
//
// Serves the checkout the way GitHub Pages does (404.html for any missing
// path), opens it in headless Chrome through Puppeteer (a devDependency, so
// run `npm install` first; set PUPPETEER_EXECUTABLE_PATH to use another
// Chrome), and checks only deterministic results:
//
//   - no horizontal overflow at 320, 390, 768, 1024, 1280x720, 1366x768, 1440
//     on every page that carries the chrome, in Night and Day, and on the
//     screens a tool renders after load (a question, the results, the plan)
//   - first-screen bounding boxes: on the home page the positioning, the
//     seal and both buttons with 24px of air at 1024 to 1440 wide, and the
//     cover rows on phones; the kit's cover the same way; the 404's headline
//     and way home; Life Strategy's Begin, and its Next on a question
//   - the menu sheet from the keyboard: Enter opens it, Escape closes it,
//     focus goes back to Menu; on the issue, a sheet link leaves focus in
//     the section it names, so the next Tab stays there
//   - the tools' own keys: on each tool on the chrome, Enter and Escape
//     pressed in the menu sheet leave the tool where it was (Life Strategy
//     advances on Enter), also with focus fallen to the page body while the
//     sheet is open, and focus returns to Menu
//   - forced colours: controls keep a real edge
//   - more contrast: quiet ink and hairlines at full strength, inserts too
//   - print page counts: each résumé version, the worksheet and the Life
//     Strategy plan on one page; the résumé and a tool print their paper
//     alone, without the chrome, in Day ink on white; the résumé's marks
//     still print with the dialog's Background graphics box off
//   - the résumé's ?version= and ?role= links: the title, the order of the
//     AppFolio lines and the PDF each version offers, in the tool bar and
//     under the sheet
//   - the agent contract (test/fixtures/agent-contract.json): every WebMCP
//     tool's schema and read-only output, the llms.txt example outputs, each
//     example link showing what the tool shows for the same input and the
//     answer the contract's summary names (Life Strategy's priority Health,
//     with its quadrants), and what each prefilled link loads (a draft) or
//     does (the print dialog)
//   - no script errors
//
// Every page opens in its own browser context, so nothing one page saves in
// localStorage reaches the next. It exits non-zero on any failure. In CI the
// agent contract is a required job and the other groups are advisory; the
// node test job stays dependency-free.

const fs = require('fs');
const http = require('http');
const path = require('path');
const crypto = require('crypto');
const { isDeepStrictEqual } = require('util');
const { chromePages } = require('./build-pages');
const { fills } = require('./render-resume-pdf');

const ROOT = __dirname;
const SIZES = [[320, 640], [390, 844], [768, 1024], [1024, 768], [1280, 720], [1366, 768], [1440, 900]];
const TYPES = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.json': 'application/json', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.png': 'image/png', '.jpg': 'image/jpeg', '.txt': 'text/plain; charset=utf-8', '.pdf': 'application/pdf', '.webmanifest': 'application/manifest+json' };

function serve() {
  const server = http.createServer((req, res) => {
    let p = decodeURIComponent(req.url.split('?')[0].split('#')[0]);
    if (p.endsWith('/')) p += 'index.html';
    const file = path.join(ROOT, p);
    if (file.startsWith(ROOT) && fs.existsSync(file) && fs.statSync(file).isFile()) {
      res.writeHead(200, { 'content-type': TYPES[path.extname(file)] || 'application/octet-stream' });
      fs.createReadStream(file).pipe(res);
      return;
    }
    res.writeHead(404, { 'content-type': TYPES['.html'] });
    fs.createReadStream(path.join(ROOT, '404.html')).pipe(res);
  });
  return new Promise((resolve) => server.listen(0, '127.0.0.1', () => resolve(server)));
}

const failures = [];
let passes = 0;
function check(ok, message) {
  if (ok) passes++;
  else failures.push(message);
}

async function open(browser, url, { width = 1280, height = 900, edition = 'night', modelContext = false } = {}) {
  const context = await browser.createBrowserContext();
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  // Our own files must load; third-party hosts (jsPDF's CDN, Google Fonts on
  // pages still pending) may be unreachable from a sandbox, and that is not ours.
  const origin = new URL(url).origin;
  page.on('console', (m) => { if (m.type() === 'error' && !/status of 404|Failed to load resource: net::/.test(m.text())) errors.push(m.text()); });
  page.on('requestfailed', (r) => { if (r.url().startsWith(origin)) errors.push(`${r.url()} failed to load`); });
  page.on('response', (r) => { if (r.url().startsWith(origin) && r.status() >= 400 && r.url() !== url && r.request().resourceType() !== 'document') errors.push(`${r.url()} returned ${r.status()}`); });
  await page.setViewport({ width, height });
  await page.evaluateOnNewDocument((ed, mc) => {
    try { localStorage.setItem('edition', ed); } catch (err) { /* storage blocked */ }
    if (mc) {
      window.__tools = [];
      window.__printed = 0;
      window.print = () => { window.__printed += 1; };
      Object.defineProperty(document, 'modelContext', { value: { registerTool(t) { window.__tools.push(t); } }, configurable: true });
    }
  }, edition, modelContext);
  await page.goto(url, { waitUntil: 'networkidle0' });
  await page.evaluate(() => document.fonts.ready);
  return { page, errors, close: () => context.close() };
}

// The words a reader sees in <main>, once they stop changing.
async function shown(page) {
  let before = null;
  for (let i = 0; i < 20; i++) {
    await page.waitForNetworkIdle({ idleTime: 150, timeout: 5000 }).catch(() => {});
    const now = await page.evaluate(() => (document.querySelector('main') || document.body).innerText);
    if (now === before) return now;
    before = now;
    await new Promise((r) => setTimeout(r, 150));
  }
  return before;
}

const bottom = (page, selector) => page.evaluate((s) => {
  const el = [...document.querySelectorAll(s)].filter((e) => e.getClientRects().length).pop();
  return el ? el.getBoundingClientRect().bottom : null;
}, selector);

// The screens a tool renders after load, which the overflow check visits too.
const LS_EXAMPLE = 'life-strategy.html?health=6,2&work=5,5&family=6,5&spirituality=3,3&creativity=2,5&relationships=4,4&financial=5,2&rest=3,2';
const SCREENS = {
  'life-strategy.html': [
    { name: 'a question', url: 'life-strategy.html', click: '#intro-begin', wait: '#slider-input' },
    { name: 'the results', url: LS_EXAMPLE, wait: '.results' },
    { name: 'the plan', url: LS_EXAMPLE, click: '#nav-print', wait: '.plan' },
  ],
};

async function overflow(browser, base) {
  for (const [file, screens] of Object.entries(SCREENS)) {
    if (!chromePages().includes(file)) continue;
    for (const screen of screens) {
      for (const [width, height] of SIZES) {
        for (const edition of ['night', 'day']) {
          const { page, errors, close } = await open(browser, `${base}${screen.url}`, { width, height, edition });
          if (screen.click) await page.click(screen.click);
          await page.waitForSelector(screen.wait);
          await new Promise((r) => setTimeout(r, 250));
          const over = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
          check(over <= 0, `${file}, ${screen.name}: overflows by ${over}px at ${width}x${height} (${edition})`);
          check(!errors.length, `${file}, ${screen.name} at ${width}x${height}: ${errors.join('; ')}`);
          await close();
        }
      }
    }
  }
  for (const file of chromePages()) {
    const url = file === '404.html' ? `${base}some/missing/path` : `${base}${file}`;
    for (const [width, height] of SIZES) {
      for (const edition of ['night', 'day']) {
        const { page, errors, close } = await open(browser, url, { width, height, edition });
        const over = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
        check(over <= 0, `${file} overflows by ${over}px at ${width}x${height} (${edition})`);
        check(!errors.length, `${file} at ${width}x${height}: ${errors.join('; ')}`);
        await close();
      }
    }
  }
}

async function firstScreen(browser, base) {
  // The home page, which a hiring manager opens first: on desktop the
  // positioning (the editor's note), the 44% to 70% seal and both buttons end
  // at least 24px above the fold, in both editions; on phones the cover, its
  // four rows included, is the whole first screen.
  for (const [width, height] of [[1280, 900], [1366, 768], [1440, 900], [1280, 720], [1024, 768]]) {
    for (const edition of ['night', 'day']) {
      const { page, close } = await open(browser, `${base}index.html`, { width, height, edition });
      for (const [what, selector] of [['the positioning', '.editor .t-deck'], ['the 44% to 70% seal', '.seal'], ['the buttons', '.cta-row']]) {
        const b = await bottom(page, selector);
        check(b !== null && b <= height - 24, `index.html: ${what} ends at ${b}, want 24px of air at ${width}x${height} (${edition})`);
      }
      await close();
    }
  }
  for (const [width, height] of [[390, 844], [375, 812], [320, 640]]) {
    const { page, close } = await open(browser, `${base}index.html`, { width, height });
    // The smallest phones get the standfirst and the seal; the rows run on.
    const parts = width > 320 ? [['the last cover row', '.cover-lines li:last-child']] : [['the standfirst', '.cover-standfirst'], ['the seal', '.seal']];
    for (const [what, selector] of parts) {
      const b = await bottom(page, selector);
      check(b !== null && b <= height, `index.html: ${what} ends at ${b} on a ${width}x${height} phone`);
    }
    await close();
  }
  // The kit's cover: on phones the five cover rows fit the first screen; on
  // desktop the buttons sit at least 24px above the fold at 1280x900.
  for (const [width, height] of [[390, 844], [375, 812]]) {
    const { page, close } = await open(browser, `${base}kit.html`, { width, height });
    const b = await bottom(page, '.cover-lines li:last-child');
    check(b !== null && b <= height, `kit.html: the last cover row ends at ${b} on a ${width}x${height} phone`);
    await close();
  }
  for (const [width, height] of [[1280, 900], [1440, 900]]) {
    const { page, close } = await open(browser, `${base}kit.html`, { width, height });
    const b = await bottom(page, '.cta-row');
    check(b !== null && b <= height - 24, `kit.html: the buttons end at ${b}, want 24px of air at ${width}x${height}`);
    await close();
  }
  // Life Strategy: Begin on the first screen everywhere; on a question, the
  // slider and Next too, from a 390x844 phone up.
  for (const [width, height] of SIZES.concat([[375, 812]])) {
    for (const edition of ['night', 'day']) {
      const { page, close } = await open(browser, `${base}life-strategy.html`, { width, height, edition });
      const begin = await bottom(page, '#intro-begin');
      check(begin !== null && begin <= height, `life-strategy.html: Begin ends at ${begin} at ${width}x${height} (${edition})`);
      if (width >= 390 && height >= 720) {
        await page.click('#intro-begin');
        await page.waitForSelector('#nav-next');
        const next = await bottom(page, '#nav-next');
        const slider = await bottom(page, '.slider-scale');
        check(next !== null && next <= height, `life-strategy.html: Next ends at ${next} at ${width}x${height} (${edition})`);
        check(slider !== null && slider <= height, `life-strategy.html: the slider ends at ${slider} at ${width}x${height} (${edition})`);
      }
      await close();
    }
  }
  for (const [width, height] of SIZES.concat([[375, 812]])) {
    const { page, close } = await open(browser, `${base}some/missing/path`, { width, height });
    const h1 = await bottom(page, 'h1');
    const home = await bottom(page, '.nf-copy .btn');
    check(h1 !== null && h1 <= height, `404: the headline ends at ${h1} at ${width}x${height}`);
    check(home !== null && home <= height, `404: Back home ends at ${home} at ${width}x${height}`);
    await close();
  }
}

async function menu(browser, base) {
  for (const file of chromePages()) {
    const url = file === '404.html' ? `${base}some/missing/path` : `${base}${file}`;
    const { page, close } = await open(browser, url, { width: 390, height: 844 });
    if (!(await page.$('[data-menu-open]'))) { await close(); continue; }
    await page.focus('[data-menu-open]');
    await page.keyboard.press('Enter');
    const opened = await page.evaluate(() => ({ open: document.getElementById('menu').open, expanded: document.querySelector('[data-menu-open]').getAttribute('aria-expanded'), inside: document.getElementById('menu').contains(document.activeElement) }));
    check(opened.open && opened.expanded === 'true' && opened.inside, `${file}: Enter on Menu opens the sheet and moves focus into it (${JSON.stringify(opened)})`);
    await page.keyboard.press('Escape');
    // The dialog's close event is queued, so give it a moment.
    await page.waitForFunction(() => !document.getElementById('menu').open && document.querySelector('[data-menu-open]').getAttribute('aria-expanded') === 'false', { timeout: 2000 }).catch(() => {});
    const closed = await page.evaluate(() => ({ open: document.getElementById('menu').open, expanded: document.querySelector('[data-menu-open]').getAttribute('aria-expanded'), back: document.activeElement === document.querySelector('[data-menu-open]') }));
    check(!closed.open && closed.expanded === 'false' && closed.back, `${file}: Escape closes the sheet and focus returns to Menu (${JSON.stringify(closed)})`);
    // On a page that carries the departments (the issue), following a sheet
    // link from the keyboard leaves focus in that section, so the next Tab
    // reaches the section's first control, not the cover.
    const inPage = await page.evaluate(() => [...document.querySelectorAll('#menu .sheet-list a')].map((a) => a.getAttribute('href')).filter((h) => h.startsWith('#')));
    if (inPage.length) {
      const href = inPage.includes('#workshop') ? '#workshop' : inPage[inPage.length - 1];
      await page.focus('[data-menu-open]');
      await page.keyboard.press('Enter');
      for (let i = 0; i < 12 && !(await page.evaluate((h) => document.activeElement.matches(`#menu a[href="${h}"]`), href)); i++) await page.keyboard.press('Tab');
      await page.keyboard.press('Enter');
      await page.waitForFunction(() => !document.getElementById('menu').open && document.querySelector('[data-menu-open]').getAttribute('aria-expanded') === 'false', { timeout: 2000 }).catch(() => {});
      await new Promise((r) => setTimeout(r, 100));
      const landed = await page.evaluate((h) => ({ hash: location.hash, inside: document.querySelector(h).contains(document.activeElement) }), href);
      check(landed.hash === href && landed.inside, `${file}: a sheet link to ${href} closes the sheet and leaves focus in that section (${JSON.stringify(landed)})`);
      await page.keyboard.press('Tab');
      const next = await page.evaluate((h) => ({ inside: document.querySelector(h).contains(document.activeElement), active: document.activeElement.textContent.trim().slice(0, 40) }), href);
      check(next.inside, `${file}: after the sheet link to ${href}, Tab lands inside that section, not on ${JSON.stringify(next.active)}`);
    }
    // A department link closes the sheet too (navigation held back, since on
    // most pages it leaves for the home page).
    await page.evaluate(() => document.addEventListener('click', (e) => { if (e.target.closest('#menu a')) e.preventDefault(); }, true));
    await page.click('[data-menu-open]');
    await page.click('#menu .sheet-list a');
    check(!(await page.evaluate(() => document.getElementById('menu').open)), `${file}: a link in the sheet closes it`);
    await close();
  }
}

// The tools' own document-level keys must not fight the menu sheet. For each
// tool on the chrome: bring it to a state, open the sheet from the keyboard,
// press Enter (on whatever the sheet focused first) and Escape, and check the
// tool is where it was and focus is back on Menu. Then once more with focus
// fallen to the page body inside the open sheet, as a tap on the sheet's text
// leaves it in Safari: the tool's own Enter takes the body for itself, so only
// its guard for an open dialog keeps that Enter from the tool.
const TOOL_KEYS = {
  'life-strategy.html': [
    {
      // A question, the slider moved: Enter would advance to the next one.
      name: 'a question',
      url: 'life-strategy.html',
      async setup(page) {
        await page.click('#intro-begin');
        await page.waitForSelector('#slider-input');
        await page.focus('#slider-input');
        await page.keyboard.press('ArrowRight');
      },
      state: () => JSON.stringify({
        heading: (document.querySelector('#tool h1') || {}).textContent,
        progress: (document.querySelector('.progress-head') || {}).textContent,
        value: (document.getElementById('slider-input') || {}).value,
        next: !!document.getElementById('nav-next'),
      }),
    },
  ],
};

async function toolKeys(browser, base) {
  const presses = [
    { what: 'Enter', keys: ['Enter'] },
    { what: 'Escape', keys: ['Escape'] },
    { what: 'Enter with focus on the page body, then Escape', blur: true, keys: ['Enter', 'Escape'] },
  ];
  for (const [file, screens] of Object.entries(TOOL_KEYS)) {
    if (!chromePages().includes(file)) continue;
    for (const tool of screens) {
      for (const [width, height] of [[390, 844], [1024, 768]]) {
        const { page, errors, close } = await open(browser, `${base}${tool.url}`, { width, height });
        await tool.setup(page);
        await new Promise((r) => setTimeout(r, 300));
        const before = await page.evaluate(tool.state);
        for (const press of presses) {
          await page.focus('[data-menu-open]');
          await page.keyboard.press('Enter');
          await page.waitForFunction(() => document.getElementById('menu').open, { timeout: 2000 }).catch(() => {});
          if (press.blur) {
            const body = await page.evaluate(() => { document.activeElement.blur(); return document.activeElement === document.body && document.getElementById('menu').open; });
            check(body, `${file}, ${tool.name}, at ${width}x${height}: could not leave focus on the body with the sheet open`);
          }
          for (const key of press.keys) {
            await page.keyboard.press(key);
            await new Promise((r) => setTimeout(r, 200));
          }
          await page.waitForFunction(() => !document.getElementById('menu').open, { timeout: 2000 }).catch(() => {});
          await new Promise((r) => setTimeout(r, 400));
          const after = await page.evaluate(tool.state);
          const where = await page.evaluate(() => ({ open: document.getElementById('menu').open, back: document.activeElement === document.querySelector('[data-menu-open]') }));
          check(after === before, `${file}, ${tool.name}, at ${width}x${height}: ${press.what} in the menu sheet changed the tool (${before} became ${after})`);
          check(!where.open && where.back, `${file}, ${tool.name}, at ${width}x${height}: after ${press.what} in the sheet, the sheet is closed and focus is on Menu (${JSON.stringify(where)})`);
        }
        check(!errors.length, `${file}, ${tool.name}: ${errors.join('; ')}`);
        await close();
      }
    }
  }
}

async function forcedColors(browser, base) {
  const { page, close } = await open(browser, `${base}kit.html`, { width: 1280, height: 900 });
  // Puppeteer's emulateMediaFeatures has no forced-colors; the protocol does.
  const cdp = await page.createCDPSession();
  await cdp.send('Emulation.setEmulatedMedia', { features: [{ name: 'forced-colors', value: 'active' }] });
  const edges = await page.evaluate(() => ['.btn--outlined', '.chip', '.segmented', '.field-box'].map((s) => {
    const cs = getComputedStyle(document.querySelector(s));
    return [s, cs.outlineStyle !== 'none' || cs.borderBottomStyle !== 'none'];
  }));
  for (const [s, ok] of edges) check(ok, `kit.html: ${s} keeps an edge in forced colours`);
  // The slider draws its own track and handle in system colours; each step keeps its bar.
  const tools = await page.evaluate(() => ({
    slider: getComputedStyle(document.querySelector('.slider input')).forcedColorAdjust,
    bars: [...document.querySelectorAll('.steps .step')].every((b) => getComputedStyle(b, '::before').backgroundColor !== 'rgba(0, 0, 0, 0)'),
  }));
  check(tools.slider === 'none', `kit.html: the slider keeps its own drawing in forced colours (${tools.slider})`);
  check(tools.bars, 'kit.html: every progress step keeps its bar in forced colours');
  await close();
}

async function moreContrast(browser, base) {
  // prefers-contrast: more lifts quiet ink and hairlines to full strength,
  // inserts included, in both editions.
  for (const edition of ['night', 'day']) {
    const { page, close } = await open(browser, `${base}kit.html`, { width: 1280, height: 900, edition });
    const cdp = await page.createCDPSession();
    await cdp.send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-contrast', value: 'more' }] });
    const quiet = await page.evaluate(() => [document.body, ...document.querySelectorAll('[data-insert]')].map((el) => {
      const cs = getComputedStyle(el);
      const v = (n) => cs.getPropertyValue(n).trim();
      return [el.id || el.tagName.toLowerCase(), v('--ink-quiet') === v('--ink') && v('--rule') === v('--outline')];
    }));
    for (const [where, ok] of quiet) check(ok, `kit.html (${edition}): ${where} keeps quiet ink or faint rules with more contrast`);
    await close();
  }
}

async function printCounts(browser, base) {
  const pages = (pdf) => (Buffer.from(pdf).toString('latin1').match(/\/Type\s*\/Page[^s]/g) || []).length;
  // The résumé: each version on one Letter page from either edition, the
  // sheet alone, Day ink on white paper (render-resume-pdf.js checks the
  // committed PDFs the same way, and their fonts and reading order). The
  // print dialog opens with Background graphics off, and the line markers
  // and end mark are drawn as backgrounds: printed with the box off, the
  // page must paint the same colours as with it on, marks included.
  for (const version of ['payments', 'ai-native', 'general']) {
    for (const edition of ['night', 'day']) {
      const { page, close } = await open(browser, `${base}resume.html?version=${version}`, { edition });
      const plain = Buffer.from(await page.pdf({ printBackground: false, preferCSSPageSize: true }));
      const full = Buffer.from(await page.pdf({ printBackground: true, preferCSSPageSize: true }));
      for (const [pdf, how] of [[plain, 'Background graphics off'], [full, 'Background graphics on']]) {
        const n = pages(pdf);
        check(n === 1, `resume.html?version=${version} prints on ${n} pages (${edition}, ${how}), want 1`);
      }
      const off = fills(plain);
      const on = fills(full);
      check(isDeepStrictEqual(off, on), `resume.html?version=${version}: printed with Background graphics off it paints ${JSON.stringify(off)}, with them on ${JSON.stringify(on)} (${edition}); a mark drawn as a background needs print-color-adjust: exact`);
      await page.emulateMediaType('print');
      const marks = await page.evaluate(() => {
        const rgb = (css) => `#${(css.match(/\d+/g) || []).slice(0, 3).map((n) => Number(n).toString(16).padStart(2, '0')).join('').toUpperCase()}`;
        return [...document.querySelectorAll('.resume-sheet .bullets li')].map((li) => getComputedStyle(li, '::before').backgroundColor)
          .concat(getComputedStyle(document.querySelector('.resume-end')).backgroundColor).map(rgb);
      });
      const missed = [...new Set(marks)].filter((c) => !off[c]);
      check(!missed.length, `resume.html?version=${version}: the marks in ${missed.join(', ')} are missing with Background graphics off (${edition})`);
      const shown = await page.evaluate(() => {
        const hidden = ['.masthead', '.menu-sheet', '.colophon', '.toolbar', '.versions'].filter((sel) => {
          const el = document.querySelector(sel);
          return el && getComputedStyle(el).display !== 'none';
        });
        const sheet = document.querySelector('.resume-sheet');
        const grounds = [document.documentElement, document.body, sheet].map((el) => getComputedStyle(el).backgroundColor).filter((c) => c !== 'rgba(0, 0, 0, 0)');
        return { hidden, grounds, ink: getComputedStyle(sheet).color, grain: getComputedStyle(sheet, '::after').display };
      });
      check(!shown.hidden.length, `resume.html?version=${version}: ${shown.hidden.join(', ')} still print (${edition})`);
      check(!shown.grounds.length, `resume.html?version=${version}: print paints a ground, ${shown.grounds.join(', ')} (${edition})`);
      check(shown.ink === 'rgb(52, 48, 47)', `resume.html?version=${version}: the sheet prints in ${shown.ink}, not the Day ink, Gondola (${edition})`);
      check(shown.grain === 'none', `resume.html?version=${version}: the sheet prints its grain (${edition})`);
      await close();
    }
  }
  for (const [file, formats] of [['memorial-preferences.html', ['Letter', 'A4']]]) {
    const { page, close } = await open(browser, `${base}${file}`);
    for (const format of formats) {
      const n = pages(await page.pdf({ format, printBackground: true, preferCSSPageSize: true }));
      check(n === 1, `${file} prints on ${n} ${format} pages, want 1`);
    }
    await close();
  }
  // The Life Strategy plan: the llms.txt example, Print plan, one Letter page,
  // in either edition, with the date filled in. Only the proof prints.
  for (const edition of ['night', 'day']) {
    const { page, close } = await open(browser, `${base}${LS_EXAMPLE}`, { edition });
    await page.click('#nav-print');
    await page.waitForSelector('.plan');
    await page.type('#print-date', 'October 28, 2026');
    const n = pages(await page.pdf({ format: 'Letter', printBackground: true, preferCSSPageSize: true }));
    check(n === 1, `life-strategy.html: the plan prints on ${n} Letter pages (${edition}), want 1`);
    await page.emulateMediaType('print');
    const shown = await page.evaluate(() => {
      const hidden = ['.masthead', '.colophon', '.toolbar', '.tool-nav', '.tool-note', '.print-date-input'].filter((s) => {
        const el = document.querySelector(s);
        return el && getComputedStyle(el).display !== 'none';
      });
      const paper = getComputedStyle(document.querySelector('.plan')).backgroundImage === 'none' && getComputedStyle(document.querySelector('.plan')).backgroundColor === 'rgba(0, 0, 0, 0)';
      const ink = getComputedStyle(document.querySelector('.print-title')).color;
      return { hidden, paper, ink, date: document.getElementById('print-date-output').textContent };
    });
    check(!shown.hidden.length, `life-strategy.html: ${shown.hidden.join(', ')} still print (${edition})`);
    check(shown.paper, `life-strategy.html: the plan paints a background in print (${edition})`);
    check(shown.ink === 'rgb(52, 48, 47)', `life-strategy.html: the plan prints in Day ink, Gondola, not ${shown.ink} (${edition})`);
    check(shown.date === 'October 28, 2026', `life-strategy.html: the plan prints the date typed in (${JSON.stringify(shown.date)})`);
    await close();
  }
}

// The answer an llms.txt example link puts on the screen, read the way a
// person reads it. Comparing the link with the tool alone would pass a
// regression both share (they render through the same code), so each example
// with a summary in the contract is read here against fixed values:
//   - answer(out): the tool's output, whose hash the contract pins, in the
//     summary's shape; it must equal the summary (what llms.txt promises,
//     e.g. "(priority: Health)")
//   - shown(): run in the page, what the link shows
//   - want(summary, out): what it must show
// Every example with a summary needs an entry.
const ANSWERS = {
  'life-strategy.html': {
    answer: (out) => ({ priority: out.priority.area }),
    shown: () => {
      const t = (el) => (el ? el.textContent.trim() : null);
      const quadrants = {};
      for (const block of document.querySelectorAll('#results .quadrant-block')) {
        quadrants[t(block.querySelector('.quadrant-block-title')).toLowerCase()] = [...block.querySelectorAll('.quadrant-block-list li:not(.is-empty)')].map(t);
      }
      return { priority: t(document.querySelector('#results .focus-category')), quadrants };
    },
    want: (summary, out) => ({ priority: summary.priority, quadrants: out.quadrants }),
  },
  'decision-assist.html': {
    answer: (out) => ({ top_choice: out.top_choice, ranking: out.ranking.map((r) => [r.option, r.percentage]) }),
    shown: () => {
      const t = (el) => (el ? el.textContent.trim() : null);
      return {
        top_choice: t(document.querySelector('#results .winner-name')),
        ranking: [...document.querySelectorAll('#results .ranked-item')].map((item) => [t(item.querySelector('.ranked-name')), parseInt(t(item.querySelector('.ranked-score')), 10)]),
      };
    },
    want: (summary) => ({ top_choice: summary.top_choice, ranking: summary.ranking }),
  },
  'native-plant-finder.html': {
    // The page groups plants by layer, so it shows the tool's plants in another order.
    answer: (out) => ({ plants: out.plant_count, nurseries: out.nurseries.length, first: out.plants[0].common_name }),
    shown: () => {
      const t = (el) => el.textContent.trim();
      return {
        plants: [...document.querySelectorAll('.plant-card .plant-name')].map(t).sort(),
        nurseries: [...document.querySelectorAll('.nursery-item .nursery-name')].map(t).sort(),
      };
    },
    want: (summary, out) => ({ plants: out.plants.map((p) => p.common_name).sort(), nurseries: out.nurseries.map((n) => n.name).sort() }),
  },
};

async function agentContract(browser, base) {
  const contract = JSON.parse(fs.readFileSync(path.join(ROOT, 'test', 'fixtures', 'agent-contract.json'), 'utf8'));
  const sha = (s) => crypto.createHash('sha256').update(s).digest('hex');
  const run = (page, tool, input) => page.evaluate(async (t, i) => (await window.__tools.find((x) => x.name === t).execute(i)).content[0].text, tool, input);
  for (const [file, spec] of Object.entries(contract.pages)) {
    const { page, errors, close } = await open(browser, `${base}${file}`, { modelContext: true });
    const tools = await page.evaluate(() => window.__tools.map((t) => ({ name: t.name, description: t.description, inputSchema: JSON.parse(JSON.stringify(t.inputSchema)), annotations: t.annotations ? JSON.parse(JSON.stringify(t.annotations)) : null })));
    check(JSON.stringify(tools) === JSON.stringify(spec.webmcp), `${file}: WebMCP tools differ from the contract`);
    for (const [name, want] of Object.entries(spec.readOnlyOutputs)) {
      const got = JSON.parse(await run(page, name, {}));
      check(JSON.stringify(got) === JSON.stringify(want), `${file}: ${name} returns something new`);
    }
    check(await page.evaluate(() => window.__printed) === 0, `${file}: the bare page opens the print dialog`);
    check(!errors.length, `${file}: ${errors.join('; ')}`);
    await close();

    // Each llms.txt example twice: the tool on a fresh page (its output must
    // hash the same), and the prefilled link (it must show what the tool
    // showed, and the answer the summary names).
    for (const ex of spec.examples) {
      const byTool = await open(browser, `${base}${file}`, { modelContext: true });
      const bare = await shown(byTool.page);
      const out = await run(byTool.page, ex.tool, ex.input);
      check(sha(out) === ex.sha256, `${file}: ${ex.tool} on the llms.txt example returns something new`);
      const afterTool = await shown(byTool.page);
      await byTool.close();
      const byLink = await open(browser, `${base}${ex.url}`, { modelContext: true });
      const afterLink = await shown(byLink.page);
      check(afterLink !== bare, `${file}: the prefilled link ${ex.url} leaves the page as it was`);
      check(afterLink === afterTool, `${file}: the prefilled link ${ex.url} shows something other than ${ex.tool} on the same input`);
      if (ex.summary) {
        const answers = ANSWERS[file];
        check(!!answers, `${file}: the llms.txt example has a summary but check-browser.js has no reader for the page's answer`);
        if (answers) {
          const output = JSON.parse(out);
          const said = answers.answer(output);
          check(isDeepStrictEqual(said, ex.summary), `${file}: ${ex.tool} answers ${JSON.stringify(said)}, but the contract's summary (what llms.txt promises) is ${JSON.stringify(ex.summary)}`);
          const got = await byLink.page.evaluate(answers.shown);
          const want = answers.want(ex.summary, output);
          check(isDeepStrictEqual(got, want), `${file}: the prefilled link ${ex.url} shows ${JSON.stringify(got)}, want ${JSON.stringify(want)}`);
        }
      }
      check(!byLink.errors.length, `${ex.url}: ${byLink.errors.join('; ')}`);
      await byLink.close();
    }

    // Links whose result is a draft the page reports, or an action.
    for (const link of spec.prefilled) {
      const { page: p, errors: errs, close: done } = await open(browser, `${base}${link.url}`, { modelContext: true });
      await shown(p);
      for (const [name, want] of Object.entries(link.readOnly || {})) {
        const got = JSON.parse(await run(p, name, {}));
        check(JSON.stringify(got) === JSON.stringify(want), `${link.url}: ${name} reports a different draft`);
      }
      if ('prints' in link) {
        const printed = await p.evaluate(() => window.__printed);
        check(printed === (link.prints ? 1 : 0), `${link.url}: opened the print dialog ${printed} times`);
      }
      check(!errs.length, `${link.url}: ${errs.join('; ')}`);
      await done();
    }
  }

  // The résumé's links: ?version= and its alias ?role= pick the title, the
  // order of the AppFolio lines and the PDF on offer (test/fixtures/
  // resume-content.json); no value, or one it does not know, gives the default.
  const resume = JSON.parse(fs.readFileSync(path.join(ROOT, 'test', 'fixtures', 'resume-content.json'), 'utf8'));
  const links = [['resume.html', resume.default], ['resume.html?version=nope', resume.default], ['resume.html?role=', resume.default]];
  for (const version of Object.keys(resume.versions)) links.push([`resume.html?version=${version}`, version], [`resume.html?role=${version}`, version]);
  links.push(['resume.html?version=general&role=ai-native', 'general'], ['resume.html?version=nope&role=ai-native', 'payments'], ['resume.html?version=toString', 'payments']);
  for (const [url, version] of links) {
    const { page, errors, close } = await open(browser, `${base}${url}`);
    const got = await page.evaluate(() => ({
      title: document.getElementById('roleTitle').textContent,
      bulletOrder: [...document.querySelectorAll('#appfolioBullets [data-bullet]')].map((li) => li.dataset.bullet),
      pdf: document.getElementById('dlLink').getAttribute('href'),
    }));
    const foot = await page.evaluate(() => document.getElementById('versionLink').getAttribute('href'));
    check(isDeepStrictEqual(got, resume.versions[version]), `${url}: shows ${JSON.stringify(got)}, want the ${version} version ${JSON.stringify(resume.versions[version])}`);
    check(isDeepStrictEqual(got.pdf, contract.resume.versions[version]), `${url}: offers ${got.pdf}, the contract says ${contract.resume.versions[version]}`);
    check(foot === got.pdf, `${url}: the download line under the sheet offers ${foot}, the tool bar ${got.pdf}`);
    check(!errors.length, `${url}: ${errors.join('; ')}`);
    await close();
  }
}

const GROUPS = { overflow, 'first-screen': firstScreen, menu, 'tool-keys': toolKeys, 'forced-colors': forcedColors, 'more-contrast': moreContrast, print: printCounts, 'agent-contract': agentContract };

async function main(argv = process.argv.slice(2)) {
  const unknown = argv.filter((name) => !GROUPS[name]);
  if (unknown.length) {
    process.stderr.write(`check-browser.js: no group ${unknown.join(', ')}. Groups: ${Object.keys(GROUPS).join(', ')}.\n`);
    process.exit(2);
  }
  let puppeteer;
  try { puppeteer = require('puppeteer'); } catch (err) {
    // Puppeteer is an ES module: on a Node that cannot require one it fails
    // with ERR_REQUIRE_ESM, which is not a missing install.
    let wants = '';
    try { wants = ` Puppeteer asks for Node ${JSON.parse(fs.readFileSync(path.join(ROOT, 'node_modules', 'puppeteer', 'package.json'), 'utf8')).engines.node}; this is ${process.version}.`; } catch (e) { /* not installed */ }
    process.stderr.write(`check-browser.js could not load Puppeteer: ${err && err.code ? `${err.code} ` : ''}${err && err.message}\n`);
    process.stderr.write(err && err.code === 'MODULE_NOT_FOUND' ? 'Run `npm install` first.\n' : `${wants.trim()}\n`);
    process.exit(2);
  }
  const server = await serve();
  const base = `http://127.0.0.1:${server.address().port}/`;
  // Chrome refuses its sandbox as root (CI containers); the pages are our own.
  const root = process.getuid && process.getuid() === 0;
  const browser = await puppeteer.launch({ args: process.env.CI || root ? ['--no-sandbox'] : [] });
  try {
    for (const [name, run] of Object.entries(GROUPS).filter(([n]) => !argv.length || argv.includes(n))) {
      const before = failures.length;
      await run(browser, base);
      process.stdout.write(`${failures.length === before ? 'ok  ' : 'FAIL'} ${name}\n`);
    }
  } finally {
    await browser.close();
    server.close();
  }
  for (const f of failures) process.stdout.write(`  - ${f}\n`);
  process.stdout.write(`${passes} passed, ${failures.length} failed\n`);
  process.exitCode = failures.length ? 1 : 0;
}

if (require.main === module) main();
