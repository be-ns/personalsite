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

(async () => {
  await new Promise(r => server.listen(PORT, r));
  const browser = await puppeteer.launch({ args: ['--no-sandbox'] });
  for (const v of VERSIONS) {
    const page = await browser.newPage();
    await page.goto(`http://localhost:${PORT}/resume.html?version=${v.q}`, { waitUntil: 'networkidle0' });
    await page.emulateMediaType('print');
    // Neutralize the stylesheet's @page margin so it can't stack with the
    // margins we set here (double margins were forcing a 2nd page).
    await page.addStyleTag({ content: '@page { margin: 0 !important; }' });
    await page.pdf({ path: path.join(ROOT, v.out), format: 'Letter', printBackground: true, margin: { top: '0.4in', bottom: '0.4in', left: '0.4in', right: '0.4in' } });
    await page.close();
    console.log('wrote', v.out);
  }
  await browser.close();
  server.close();
})();
