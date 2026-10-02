// One-off: render resume.html (both versions) to the downloadable PDFs.
// Serves the repo over http so the page's JS (?version=) runs, then
// prints with print CSS. Uses preferCSSPageSize so the @page rules in
// resume.html (Letter, 0.45in margins) drive the layout.
const http = require('http');
const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer');

const ROOT = __dirname;
const PORT = 8123;
const TYPES = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.svg': 'image/svg+xml', '.png': 'image/png', '.webmanifest': 'application/manifest+json' };

const server = http.createServer((req, res) => {
  const url = decodeURIComponent(req.url.split('?')[0]);
  const file = path.join(ROOT, url === '/' ? 'index.html' : url);
  fs.readFile(file, (err, data) => {
    if (err) { res.writeHead(404); res.end('not found'); return; }
    res.writeHead(200, { 'Content-Type': TYPES[path.extname(file)] || 'application/octet-stream' });
    res.end(data);
  });
});

const VERSIONS = [
  { q: 'ai-native', out: 'Ben-Siverly-Resume-AI-Native.pdf' },
  { q: 'general', out: 'Ben-Siverly-Resume.pdf' },
];

// Without these the browser silently substitutes system fonts and the PDF
// stops looking like the site, so a missing one fails the build.
const REQUIRED_FONTS = ['Inter', 'Zilla Slab', 'JetBrains Mono'];

function pageCount(pdf) {
  return (pdf.toString('latin1').match(/\/Type\s*\/Page(?!s)/g) || []).length;
}

(async () => {
  await new Promise(r => server.listen(PORT, r));
  const browser = await puppeteer.launch({ args: ['--no-sandbox'] });
  try {
    for (const v of VERSIONS) {
      const page = await browser.newPage();
      await page.goto(`http://localhost:${PORT}/resume.html?version=${v.q}`, { waitUntil: 'networkidle0' });
      await page.emulateMediaType('print');
      const loaded = await page.evaluate(async () => {
        await document.fonts.ready;
        return [...document.fonts].filter(f => f.status === 'loaded').map(f => f.family.replace(/["']/g, ''));
      });
      const missing = REQUIRED_FONTS.filter(f => !loaded.includes(f));
      if (missing.length) throw new Error(`${v.out}: fonts did not load: ${missing.join(', ')}`);
      // Use the page's own @page rules (size + margin) — the exact path a browser
      // takes when you Print / Save as PDF. Keeps the downloadable PDF identical to
      // what anyone gets printing the live page, so "one page" means one page there too.
      const pdf = Buffer.from(await page.pdf({ preferCSSPageSize: true, printBackground: true }));
      const pages = pageCount(pdf);
      if (pages !== 1) throw new Error(`${v.out}: rendered ${pages} pages, expected 1`);
      fs.writeFileSync(path.join(ROOT, v.out), pdf);
      await page.close();
      console.log('wrote', v.out);
    }
  } catch (err) {
    console.error(err.message);
    process.exitCode = 1;
  } finally {
    await browser.close();
    server.close();
  }
})();
