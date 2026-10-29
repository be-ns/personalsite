// Prints resume.html to the four downloadable PDFs (npm run generate-resume-pdf).
//
//   ?version=proptech   Ben-Siverly-Resume-Proptech.pdf   the public one (site.json)
//   ?version=payments   Ben-Siverly-Resume-Payments.pdf
//   ?version=ai-native  Ben-Siverly-Resume-AI-Native.pdf
//   ?version=general    Ben-Siverly-Resume.pdf
//
// Serves the checkout over http so the page's own script picks the version,
// then prints through the page's print CSS and its @page rule (Letter, the
// sheet's margins) with Background graphics off, as a browser's print dialog
// opens: the same path a browser takes when someone presses Print / Save as
// PDF, so the PDFs and a printout match. Print is always the Day edition
// (tokens.css), on white paper: no ground is painted. The line markers and
// the end mark are drawn as backgrounds and say print-color-adjust: exact,
// so they print either way; each version is printed with Background
// graphics on as well, and the two must paint the same colours.
//
// Nothing is written unless every version passes. Each PDF must be:
//   - exactly one Letter page (612 x 792 points)
//   - set in the site's three faces, Fraunces, Newsreader and Instrument
//     Sans, all embedded, with no other font (a fallback face means a
//     character the subsets lack)
//   - Day ink on white: no ground fill under the sheet
//   - the line markers in Burnt Orange and the end mark in Toxic Orange,
//     the same with Background graphics off or on
//   - tagged, so its text reads in the page's order; when pdftotext
//     (poppler) is installed, the extracted text is checked word for word
//     against the sheet.
//
// Puppeteer is a devDependency (npm install). Set PUPPETEER_EXECUTABLE_PATH
// to use another Chrome.

const http = require('http');
const fs = require('fs');
const os = require('os');
const path = require('path');
const zlib = require('zlib');
const { isDeepStrictEqual } = require('util');
const { execFileSync } = require('child_process');

const ROOT = __dirname;
const TYPES = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.woff2': 'font/woff2', '.webmanifest': 'application/manifest+json', '.txt': 'text/plain; charset=utf-8', '.pdf': 'application/pdf' };

const VERSIONS = [
  { q: 'proptech', out: 'Ben-Siverly-Resume-Proptech.pdf' },
  { q: 'payments', out: 'Ben-Siverly-Resume-Payments.pdf' },
  { q: 'ai-native', out: 'Ben-Siverly-Resume-AI-Native.pdf' },
  { q: 'general', out: 'Ben-Siverly-Resume.pdf' },
];

// The families the sheet is set in, as the page loads them and as the PDF
// names their embedded subsets.
const FACES = [
  { family: 'Fraunces', pdf: /^Fraunces/ },
  { family: 'Newsreader', pdf: /^Newsreader/ },
  { family: 'Instrument Sans', pdf: /^InstrumentSans/ },
];

function serve() {
  const server = http.createServer((req, res) => {
    const url = decodeURIComponent(req.url.split('?')[0].split('#')[0]);
    const file = path.join(ROOT, url === '/' ? 'index.html' : url);
    if (!file.startsWith(ROOT) || !fs.existsSync(file) || !fs.statSync(file).isFile()) { res.writeHead(404); res.end('not found'); return; }
    res.writeHead(200, { 'Content-Type': TYPES[path.extname(file)] || 'application/octet-stream' });
    fs.createReadStream(file).pipe(res);
  });
  return new Promise((resolve) => server.listen(0, '127.0.0.1', () => resolve(server)));
}

// What the PDF says about itself: its pages and their size, its fonts, and
// whether it is tagged. Chrome writes these dictionaries uncompressed.
function inspect(pdf) {
  const text = pdf.toString('latin1');
  const pages = (text.match(/\/Type\s*\/Page(?!s)/g) || []).length;
  const boxes = [...text.matchAll(/\/MediaBox\s*\[\s*([\d.\s-]+)\]/g)].map((m) => m[1].trim().split(/\s+/).map(Number));
  const fonts = [...new Set([...text.matchAll(/\/(?:FontName|BaseFont)\s*\/([A-Za-z0-9+_-]+)/g)].map((m) => m[1].replace(/^[A-Z]{6}\+/, '')))];
  const embedded = (text.match(/\/FontFile[23]?\b/g) || []).length + (text.match(/\/Subtype\s*\/Type3/g) || []).length;
  return { pages, boxes, fonts, embedded, tagged: /\/StructTreeRoot/.test(text) && /\/Marked\s+true/.test(text) };
}

// The colours a PDF fills with ('#RRGGBB' -> how many times the fill is
// set), read from its Flate-compressed content streams; embedded font
// programs and images are skipped. A mark dropped by the print dialog's
// Background graphics box shows up here as a missing colour or as white.
function fills(pdf) {
  const text = pdf.toString('latin1');
  const counts = {};
  for (const m of text.matchAll(/\d+ \d+ obj\s*(<<(?:(?!endobj)[\s\S])*?>>)\s*stream\r?\n/g)) {
    const dict = m[1];
    if (!/\/FlateDecode/.test(dict) || /\/Length[123]\b|\/Subtype/.test(dict)) continue;
    const start = m.index + m[0].length;
    const direct = /\/Length (\d+)(?! \d+ R)/.exec(dict);
    const end = direct ? start + Number(direct[1]) : text.indexOf('endstream', start);
    let body;
    try { body = zlib.inflateSync(pdf.subarray(start, end)).toString('latin1'); } catch (err) { continue; }
    for (const [, ...rgb] of body.matchAll(/(?<![\d.])([\d.]+) ([\d.]+) ([\d.]+) rg\b/g)) {
      const colour = `#${rgb.map((n) => Math.round(Number(n) * 255).toString(16).padStart(2, '0')).join('').toUpperCase()}`;
      counts[colour] = (counts[colour] || 0) + 1;
    }
  }
  return counts;
}

// 'rgb(182, 58, 20)' as '#B63A14'.
const hex = (css) => `#${(css.match(/\d+/g) || []).slice(0, 3).map((n) => Number(n).toString(16).padStart(2, '0')).join('').toUpperCase()}`;

const words = (s) => s.replace(/[\s ]+/g, ' ').trim().split(' ');

// pdftotext, when poppler is installed; null when it is not.
function extractText(pdf) {
  const file = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'site-pdf-')), 'page.pdf');
  fs.writeFileSync(file, pdf);
  try {
    return execFileSync('pdftotext', ['-enc', 'UTF-8', file, '-'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
  } catch (err) {
    if (err.code === 'ENOENT') return null;
    throw err;
  } finally {
    fs.rmSync(path.dirname(file), { recursive: true, force: true });
  }
}

async function render(browser, base, v) {
  const context = await browser.createBrowserContext();
  try {
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    page.on('requestfailed', (r) => errors.push(`${r.url()} failed to load`));
    await page.evaluateOnNewDocument(() => { try { localStorage.setItem('edition', 'day'); } catch (err) { /* storage blocked */ } });
    await page.goto(`${base}resume.html?version=${v.q}`, { waitUntil: 'networkidle0' });
    await page.emulateMediaType('print');
    const state = await page.evaluate(async () => {
      await document.fonts.ready;
      const sheet = document.querySelector('.resume-sheet');
      const bg = (el) => getComputedStyle(el).backgroundColor;
      return {
        loaded: [...document.fonts].filter((f) => f.status === 'loaded').map((f) => f.family.replace(/["']/g, '')),
        title: document.getElementById('roleTitle').textContent,
        grounds: [document.documentElement, document.body, sheet].map(bg),
        ink: getComputedStyle(sheet).color,
        // The marks drawn as backgrounds: the line markers and the end mark.
        marks: [getComputedStyle(sheet.querySelector('.bullets li'), '::before').backgroundColor, getComputedStyle(sheet.querySelector('.resume-end')).backgroundColor],
        // The sheet's words as a reader sees them, in order: what the PDF's text must say.
        text: sheet.innerText,
      };
    });
    if (errors.length) throw new Error(`${v.out}: ${errors.join('; ')}`);
    const missing = FACES.filter((f) => !state.loaded.includes(f.family)).map((f) => f.family);
    if (missing.length) throw new Error(`${v.out}: fonts did not load: ${missing.join(', ')}`);
    const painted = state.grounds.filter((g) => g !== 'rgba(0, 0, 0, 0)');
    if (painted.length) throw new Error(`${v.out}: the page paints a ground in print (${painted.join(', ')}); the PDF should be white paper`);
    if (state.ink !== 'rgb(52, 48, 47)') throw new Error(`${v.out}: the sheet prints in ${state.ink}, not the Day ink, Gondola`);

    // Background graphics off, as the print dialog opens; then on, to compare.
    const pdf = Buffer.from(await page.pdf({ preferCSSPageSize: true, printBackground: false, tagged: true }));
    const full = Buffer.from(await page.pdf({ preferCSSPageSize: true, printBackground: true, tagged: true }));
    const inked = fills(pdf);
    const missed = state.marks.map(hex).filter((c) => !inked[c]);
    if (missed.length) throw new Error(`${v.out}: the marks in ${missed.join(', ')} do not print with Background graphics off (fills: ${JSON.stringify(inked)})`);
    if (!isDeepStrictEqual(inked, fills(full))) throw new Error(`${v.out}: Background graphics off paints ${JSON.stringify(inked)}, on paints ${JSON.stringify(fills(full))}; a mark is drawn as a background without print-color-adjust: exact`);
    const info = inspect(pdf);
    if (info.pages !== 1) throw new Error(`${v.out}: rendered ${info.pages} pages, expected 1`);
    if (!info.boxes.length || info.boxes.some((b) => Math.round(b[2] - b[0]) !== 612 || Math.round(b[3] - b[1]) !== 792)) throw new Error(`${v.out}: the page is ${JSON.stringify(info.boxes)}, not Letter (612 x 792)`);
    const strangers = info.fonts.filter((f) => !FACES.some((face) => face.pdf.test(f)));
    if (strangers.length) throw new Error(`${v.out}: embeds fonts other than the site's three: ${strangers.join(', ')}`);
    const absent = FACES.filter((face) => !info.fonts.some((f) => face.pdf.test(f))).map((f) => f.family);
    if (absent.length) throw new Error(`${v.out}: ${absent.join(', ')} not embedded (fonts: ${info.fonts.join(', ')})`);
    if (info.embedded < info.fonts.length) throw new Error(`${v.out}: ${info.fonts.length} fonts named but only ${info.embedded} embedded`);
    if (!info.tagged) throw new Error(`${v.out}: the PDF is not tagged`);

    const extracted = extractText(pdf);
    let order = 'pdftotext not installed, reading order not checked';
    if (extracted !== null) {
      const want = words(state.text);
      const got = words(extracted);
      const at = want.findIndex((w, i) => w !== got[i]);
      if (at >= 0 || got.length !== want.length) {
        const i = at >= 0 ? at : Math.min(want.length, got.length);
        throw new Error(`${v.out}: the PDF's text leaves the sheet's order at word ${i}: want "${want.slice(i, i + 8).join(' ')}", got "${got.slice(i, i + 8).join(' ')}"`);
      }
      order = `${got.length} words in reading order`;
    }
    return { pdf, note: `${state.title}; 1 Letter page; ${info.fonts.join(', ')}; ${order}` };
  } finally {
    await context.close();
  }
}

async function main() {
  let puppeteer;
  try { puppeteer = require('puppeteer'); } catch (err) {
    process.stderr.write(`render-resume-pdf.js needs Puppeteer (npm install): ${err.message}\n`);
    process.exitCode = 2;
    return;
  }
  const server = await serve();
  const base = `http://127.0.0.1:${server.address().port}/`;
  // Chrome refuses its sandbox as root (CI containers); the pages are our own.
  const root = process.getuid && process.getuid() === 0;
  const browser = await puppeteer.launch({ args: process.env.CI || root ? ['--no-sandbox'] : [] });
  try {
    const done = [];
    for (const v of VERSIONS) done.push({ v, ...(await render(browser, base, v)) });
    for (const { v, pdf, note } of done) {
      fs.writeFileSync(path.join(ROOT, v.out), pdf);
      process.stdout.write(`wrote ${v.out}: ${note}\n`);
    }
  } catch (err) {
    process.stderr.write(`${err.message}\nNo PDF was written.\n`);
    process.exitCode = 1;
  } finally {
    await browser.close();
    server.close();
  }
}

if (require.main === module) {
  main().catch((err) => {
    process.stderr.write(`${err.message}\nNo PDF was written.\n`);
    process.exitCode = 1;
  });
}

module.exports = { inspect, fills, extractText, VERSIONS, FACES };
