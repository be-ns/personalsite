// Browser checks: the things only a real browser can tell us.
//
//   node check-browser.js        (npm run check-browser)
//
// Serves the checkout the way GitHub Pages does (404.html for any missing
// path), opens it in headless Chrome through Puppeteer (a devDependency, so
// run `npm install` first; set PUPPETEER_EXECUTABLE_PATH to use another
// Chrome), and checks only deterministic results:
//
//   - no horizontal overflow at 320, 390, 768, 1024, 1280x720, 1366x768, 1440
//     on every page that carries the chrome, in Night and Day
//   - first-screen bounding boxes: the cover rows on phones, the buttons on
//     desktop, the 404's headline and way home
//   - the menu sheet from the keyboard: Enter opens it, Escape closes it,
//     focus goes back to Menu
//   - forced colours: controls keep a real edge
//   - print page counts: the résumé and the worksheet on one page
//   - the agent contract: every WebMCP tool's schema and outputs match
//     test/fixtures/agent-contract.json
//   - no script errors
//
// It exits non-zero on any failure. CI runs it as a non-blocking job; the
// node test job stays dependency-free.

const fs = require('fs');
const http = require('http');
const path = require('path');
const crypto = require('crypto');
const { chromePages } = require('./build-pages');

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
  const page = await browser.newPage();
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
      Object.defineProperty(document, 'modelContext', { value: { registerTool(t) { window.__tools.push(t); } }, configurable: true });
    }
  }, edition, modelContext);
  await page.goto(url, { waitUntil: 'networkidle0' });
  await page.evaluate(() => document.fonts.ready);
  return { page, errors };
}

const bottom = (page, selector) => page.evaluate((s) => {
  const el = [...document.querySelectorAll(s)].filter((e) => e.getClientRects().length).pop();
  return el ? el.getBoundingClientRect().bottom : null;
}, selector);

async function overflow(browser, base) {
  for (const file of chromePages()) {
    const url = file === '404.html' ? `${base}some/missing/path` : `${base}${file}`;
    for (const [width, height] of SIZES) {
      for (const edition of ['night', 'day']) {
        const { page, errors } = await open(browser, url, { width, height, edition });
        const over = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
        check(over <= 0, `${file} overflows by ${over}px at ${width}x${height} (${edition})`);
        check(!errors.length, `${file} at ${width}x${height}: ${errors.join('; ')}`);
        await page.close();
      }
    }
  }
}

async function firstScreen(browser, base) {
  // The kit's cover: on phones the five cover rows fit the first screen; on
  // desktop the buttons sit at least 24px above the fold at 1280x900.
  for (const [width, height] of [[390, 844], [375, 812]]) {
    const { page } = await open(browser, `${base}kit.html`, { width, height });
    const b = await bottom(page, '.cover-lines li:last-child');
    check(b !== null && b <= height, `kit.html: the last cover row ends at ${b} on a ${width}x${height} phone`);
    await page.close();
  }
  for (const [width, height] of [[1280, 900], [1440, 900]]) {
    const { page } = await open(browser, `${base}kit.html`, { width, height });
    const b = await bottom(page, '.cta-row');
    check(b !== null && b <= height - 24, `kit.html: the buttons end at ${b}, want 24px of air at ${width}x${height}`);
    await page.close();
  }
  for (const [width, height] of SIZES.concat([[375, 812]])) {
    const { page } = await open(browser, `${base}some/missing/path`, { width, height });
    const h1 = await bottom(page, 'h1');
    const home = await bottom(page, '.nf-copy .btn');
    check(h1 !== null && h1 <= height, `404: the headline ends at ${h1} at ${width}x${height}`);
    check(home !== null && home <= height, `404: Back home ends at ${home} at ${width}x${height}`);
    await page.close();
  }
}

async function menu(browser, base) {
  for (const file of chromePages()) {
    const url = file === '404.html' ? `${base}some/missing/path` : `${base}${file}`;
    const { page } = await open(browser, url, { width: 390, height: 844 });
    if (!(await page.$('[data-menu-open]'))) { await page.close(); continue; }
    await page.focus('[data-menu-open]');
    await page.keyboard.press('Enter');
    const opened = await page.evaluate(() => ({ open: document.getElementById('menu').open, expanded: document.querySelector('[data-menu-open]').getAttribute('aria-expanded'), inside: document.getElementById('menu').contains(document.activeElement) }));
    check(opened.open && opened.expanded === 'true' && opened.inside, `${file}: Enter on Menu opens the sheet and moves focus into it (${JSON.stringify(opened)})`);
    await page.keyboard.press('Escape');
    // The dialog's close event is queued, so give it a moment.
    await page.waitForFunction(() => !document.getElementById('menu').open && document.querySelector('[data-menu-open]').getAttribute('aria-expanded') === 'false', { timeout: 2000 }).catch(() => {});
    const closed = await page.evaluate(() => ({ open: document.getElementById('menu').open, expanded: document.querySelector('[data-menu-open]').getAttribute('aria-expanded'), back: document.activeElement === document.querySelector('[data-menu-open]') }));
    check(!closed.open && closed.expanded === 'false' && closed.back, `${file}: Escape closes the sheet and focus returns to Menu (${JSON.stringify(closed)})`);
    // A department link closes the sheet too (navigation held back, since on
    // most pages it leaves for the home page).
    await page.evaluate(() => document.addEventListener('click', (e) => { if (e.target.closest('#menu a')) e.preventDefault(); }, true));
    await page.click('[data-menu-open]');
    await page.click('#menu .sheet-list a');
    check(!(await page.evaluate(() => document.getElementById('menu').open)), `${file}: a link in the sheet closes it`);
    await page.close();
  }
}

async function forcedColors(browser, base) {
  const { page } = await open(browser, `${base}kit.html`, { width: 1280, height: 900 });
  // Puppeteer's emulateMediaFeatures has no forced-colors; the protocol does.
  const cdp = await page.createCDPSession();
  await cdp.send('Emulation.setEmulatedMedia', { features: [{ name: 'forced-colors', value: 'active' }] });
  const edges = await page.evaluate(() => ['.btn--outlined', '.chip', '.segmented', '.field-box'].map((s) => {
    const cs = getComputedStyle(document.querySelector(s));
    return [s, cs.outlineStyle !== 'none' || cs.borderBottomStyle !== 'none'];
  }));
  for (const [s, ok] of edges) check(ok, `kit.html: ${s} keeps an edge in forced colours`);
  await page.close();
}

async function printCounts(browser, base) {
  const pages = (pdf) => (Buffer.from(pdf).toString('latin1').match(/\/Type\s*\/Page[^s]/g) || []).length;
  for (const [file, formats] of [['resume.html', ['Letter']], ['memorial-preferences.html', ['Letter', 'A4']]]) {
    const { page } = await open(browser, `${base}${file}`);
    for (const format of formats) {
      const n = pages(await page.pdf({ format, printBackground: true, preferCSSPageSize: true }));
      check(n === 1, `${file} prints on ${n} ${format} pages, want 1`);
    }
    await page.close();
  }
}

async function agentContract(browser, base) {
  const contract = JSON.parse(fs.readFileSync(path.join(ROOT, 'test', 'fixtures', 'agent-contract.json'), 'utf8'));
  const sha = (s) => crypto.createHash('sha256').update(s).digest('hex');
  for (const [file, spec] of Object.entries(contract.pages)) {
    const { page, errors } = await open(browser, `${base}${file}`, { modelContext: true });
    const tools = await page.evaluate(() => window.__tools.map((t) => ({ name: t.name, description: t.description, inputSchema: JSON.parse(JSON.stringify(t.inputSchema)), annotations: t.annotations ? JSON.parse(JSON.stringify(t.annotations)) : null })));
    check(JSON.stringify(tools) === JSON.stringify(spec.webmcp), `${file}: WebMCP tools differ from the contract`);
    for (const [name, want] of Object.entries(spec.readOnlyOutputs)) {
      const got = await page.evaluate(async (n) => JSON.parse((await window.__tools.find((t) => t.name === n).execute({})).content[0].text), name);
      check(JSON.stringify(got) === JSON.stringify(want), `${file}: ${name} returns something new`);
    }
    for (const ex of spec.examples) {
      const text = await page.evaluate(async ({ tool, input }) => (await window.__tools.find((t) => t.name === tool).execute(input)).content[0].text, ex);
      check(sha(text) === ex.sha256, `${file}: ${ex.tool} on the llms.txt example returns something new`);
    }
    check(!errors.length, `${file}: ${errors.join('; ')}`);
    await page.close();
  }
}

async function main() {
  let puppeteer;
  try { puppeteer = require('puppeteer'); } catch (err) {
    process.stderr.write('check-browser.js needs Puppeteer: run `npm install` first.\n');
    process.exit(2);
  }
  const server = await serve();
  const base = `http://127.0.0.1:${server.address().port}/`;
  // Chrome refuses its sandbox as root (CI containers); the pages are our own.
  const root = process.getuid && process.getuid() === 0;
  const browser = await puppeteer.launch({ args: process.env.CI || root ? ['--no-sandbox'] : [] });
  try {
    for (const [name, run] of [['overflow', overflow], ['first screen', firstScreen], ['menu', menu], ['forced colours', forcedColors], ['print', printCounts], ['agent contract', agentContract]]) {
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
