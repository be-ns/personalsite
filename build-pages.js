// Page press: stamps the shared chrome into every page between markers.
//
// The site has no build step. Every page is a complete HTML file, committed
// exactly as it is served, and view-source shows what runs. What plain HTML
// cannot share between pages (the head links, the masthead and menu sheet,
// the colophon, the chrome script and the engravings) is written into each
// page between markers by this script, the way build-tokens.js writes
// tokens.css. Edit site.json, theme.json or this file, then run
// `npm run pages`. `node build-pages.js --check` exits non-zero when a page is
// stale; the test suite runs the same comparison.
//
// Markers: <!-- chrome:NAME {json} --> ... <!-- /chrome:NAME -->
//
//   head      inside <head>: theme-color, icon, manifest, the pre-paint
//             edition script, font preloads, tokens.css and site.css.
//   top       first in <body>: skip link, icons, masthead, menu sheet.
//   art       in <body>, after top and before <main>: the engravings the
//             page names (generate-kit-art.js draws them).
//   colophon  in <body>, after <main>.
//   script    last in <body>: the one chrome script.
//
// The {json} is optional and its keys are a closed list, each on one region:
//   root      head      "" (default) or "/". Only 404.html, which GitHub Pages
//                       serves at any missing path, uses "/" so every chrome
//                       URL is root-absolute.
//   dept      top       a department id from site.json, or "none" (default).
//                       Marks that department's links aria-current.
//   colophon  colophon  "standard" (default) or "home". Home also carries
//                       site.json's home note, Outside work line and
//                       contact line. Every colophon carries the consulting
//                       line while site.json turns consulting on.
//   art       art       drawing names, e.g. ["marigold"].
//
// The press refuses unknown regions and keys, a region in the wrong place,
// a marker inside a script or style, an h1 inside a region, and an id that
// a region and the page both use. A page with top, colophon or script must
// have all three plus head; a page may carry head alone (orale.html).
//
// It also writes reading times: an element with data-read="ID" gets the
// minutes to read the element with that id on the same page,
// data-read="page.html" the minutes for that page's <main> and
// data-read="page.html#ID" for the element with that id on that page, at 230
// words a minute, at least 1. Hidden copy (aria-hidden, svg, script, style and the
// phone-only .fold-short lines) is not counted.
//
// And it makes the 05 Consulting pages from Markdown: each file in
// content/consulting/ becomes a whole page at the site root (consulting.md
// makes consulting.html), written over whatever was there, with the chrome
// stamped like any other page. Their front matter also writes the
// consulting block of sitemap.xml and the Consulting section of llms.txt.
// The grammar is under "Markdown (step 5)" below; --check covers all of it.

const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const SITE = path.join(ROOT, 'site.json');
const WPM = 230;

// ---------------------------------------------------------------- HTML ----
// A small, tolerant tree builder: enough for the press and the tests to find
// elements, ids and text. It is not a validator (htmlhint is).

const VOID = new Set(['area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'source', 'track', 'wbr']);
const RAW = new Set(['script', 'style']);

function parseHtml(html) {
  const doc = { type: 'root', tag: '#root', attrs: {}, children: [], start: 0, end: html.length };
  const stack = [doc];
  const top = () => stack[stack.length - 1];
  const add = (node) => { node.parent = top(); top().children.push(node); return node; };
  const text = (a, b) => { if (b > a) add({ type: 'text', value: html.slice(a, b), start: a, end: b }); };
  const lower = html.toLowerCase();
  let i = 0;
  while (i < html.length) {
    const lt = html.indexOf('<', i);
    if (lt < 0) { text(i, html.length); break; }
    text(i, lt);
    if (html.startsWith('<!--', lt)) {
      const end = html.indexOf('-->', lt + 4);
      const stop = end < 0 ? html.length : end + 3;
      add({ type: 'comment', value: html.slice(lt + 4, end < 0 ? html.length : end), start: lt, end: stop });
      i = stop;
      continue;
    }
    if (html.startsWith('<!', lt) || html.startsWith('<?', lt)) {
      i = html.indexOf('>', lt) + 1 || html.length;
      continue;
    }
    if (html[lt + 1] === '/') {
      const end = html.indexOf('>', lt);
      const tag = html.slice(lt + 2, end).trim().toLowerCase();
      for (let s = stack.length - 1; s > 0; s--) {
        if (stack[s].tag === tag) {
          stack[s].close = lt;
          stack[s].end = end + 1;
          stack.length = s;
          break;
        }
      }
      i = end + 1;
      continue;
    }
    const m = /^<([a-zA-Z][\w:-]*)/.exec(html.slice(lt, lt + 64));
    if (!m) { text(lt, lt + 1); i = lt + 1; continue; }
    const tag = m[1].toLowerCase();
    const attrs = {};
    let j = lt + m[0].length;
    let selfClose = false;
    for (;;) {
      while (/\s/.test(html[j] || '')) j++;
      if (j >= html.length) break;
      if (html[j] === '>') { j++; break; }
      if (html.startsWith('/>', j)) { selfClose = true; j += 2; break; }
      const name = /^[^\s=/>]+/.exec(html.slice(j, j + 256));
      if (!name) { j++; continue; }
      j += name[0].length;
      while (/\s/.test(html[j] || '')) j++;
      let value = '';
      if (html[j] === '=') {
        j++;
        while (/\s/.test(html[j] || '')) j++;
        const q = html[j];
        if (q === '"' || q === "'") {
          const close = html.indexOf(q, j + 1);
          value = html.slice(j + 1, close);
          j = close + 1;
        } else {
          const v = /^[^\s>]*/.exec(html.slice(j, j + 1024))[0];
          value = v;
          j += v.length;
        }
      }
      attrs[name[0].toLowerCase()] = decodeEntities(value);
    }
    const el = add({ type: 'element', tag, attrs, children: [], start: lt, openEnd: j });
    if (RAW.has(tag)) {
      const close = lower.indexOf(`</${tag}`, j);
      const stop = close < 0 ? html.length : close;
      if (stop > j) el.children.push({ type: 'text', raw: true, value: html.slice(j, stop), start: j, end: stop, parent: el });
      el.close = stop;
      el.end = close < 0 ? html.length : html.indexOf('>', close) + 1;
      i = el.end;
      continue;
    }
    if (VOID.has(tag) || selfClose) { el.end = j; i = j; continue; }
    stack.push(el);
    i = j;
  }
  return doc;
}

const ENTITIES = {
  amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', middot: '·', times: '×',
  rsquo: '’', lsquo: '‘', rdquo: '”', ldquo: '“', sbquo: '‚', bdquo: '„',
  ndash: '–', mdash: '—', hellip: '…', bull: '•', copy: '©', reg: '®',
  trade: '™', deg: '°', rarr: '→', larr: '←', uarr: '↑', darr: '↓',
  thinsp: ' ', ensp: ' ', emsp: ' ', shy: '­', eacute: 'é', egrave: 'è',
  aacute: 'á', iacute: 'í', oacute: 'ó', uacute: 'ú', ntilde: 'ñ', uuml: 'ü',
  iexcl: '¡', iquest: '¿', laquo: '«', raquo: '»', prime: '′', Prime: '″',
  minus: '−', frac12: '½', para: '¶', sect: '§', dagger: '†', euro: '€',
};

function decodeEntities(s) {
  return s.replace(/&(#x[0-9a-f]+|#[0-9]+|[a-z][a-z0-9]*);/gi, (all, e) => {
    if (e[0] === '#') {
      const cp = e[1] === 'x' || e[1] === 'X' ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10);
      return Number.isFinite(cp) ? String.fromCodePoint(cp) : all;
    }
    return Object.prototype.hasOwnProperty.call(ENTITIES, e) ? ENTITIES[e] : all;
  });
}

// Every element under node, in document order, for which test(el) is true.
function findAll(node, test, out = []) {
  for (const child of node.children || []) {
    if (child.type !== 'element') continue;
    if (test(child)) out.push(child);
    findAll(child, test, out);
  }
  return out;
}

const hasClass = (el, name) => (el.attrs.class || '').split(/\s+/).includes(name);

// textContent, decoded, leaving out any subtree skip(el) rejects.
function textContent(node, skip = () => false) {
  if (node.type === 'text') return node.raw ? node.value : decodeEntities(node.value);
  if (node.type === 'comment') return '';
  if (node.type === 'element' && skip(node)) return '';
  return (node.children || []).map((c) => textContent(c, skip)).join('');
}

// ------------------------------------------------------------ reading ----

const HIDDEN = (el) => el.attrs['aria-hidden'] === 'true' || el.tag === 'svg' || el.tag === 'script' || el.tag === 'style' || hasClass(el, 'fold-short');

function words(node) {
  return textContent(node, HIDDEN).split(/\s+/).filter((w) => /[\p{L}\p{N}]/u.test(w)).length;
}

function readingMinutes(node) {
  return Math.max(1, Math.round(words(node) / WPM));
}

// ------------------------------------------------------------- config ----

function loadSite() {
  return JSON.parse(fs.readFileSync(SITE, 'utf8'));
}

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const REGIONS = ['head', 'top', 'art', 'colophon', 'script'];
const PARAMS = { root: 'head', dept: 'top', colophon: 'colophon', art: 'art' };
const COLOPHONS = ['standard', 'home'];
const MARKER = /<!-- (\/?)chrome:([a-z]+)(?: (\{.*?\}))? -->/g;

// ------------------------------------------------------------ regions ----

function head(ctx) {
  const { root, theme } = ctx;
  const { resolve } = require('./build-tokens');
  const night = resolve(theme, theme.editions[theme.meta.defaultEdition].ground.$value);
  const faces = theme.font.faces.$value;
  const preload = ['fraunces-roman', 'newsreader-roman', 'instrument-sans'].map((name) => {
    const face = faces.find((f) => path.basename(f.file, '.woff2') === name);
    if (!face) throw new Error(`theme.json has no font face ${name}.woff2 to preload`);
    return `<link rel="preload" href="${root}${face.file}" as="font" type="font/woff2" crossorigin>`;
  });
  return [
    `<meta name="theme-color" content="${night}">`,
    `<link rel="icon" type="image/svg+xml" href="${root}favicon.svg">`,
    `<link rel="manifest" href="${root}site.webmanifest">`,
    '<script>',
    '  // Apply a saved edition before first paint. Night is the default on every device.',
    '  (function () {',
    "    document.documentElement.classList.add('js');",
    '    try {',
    "      const saved = localStorage.getItem('edition');",
    "      if (saved === 'day' || saved === 'night') document.documentElement.dataset.edition = saved;",
    '    } catch (err) { /* storage blocked: stay on Night */ }',
    '  })();',
    '</script>',
    ...preload,
    `<link rel="stylesheet" href="${root}tokens.css">`,
    `<link rel="stylesheet" href="${root}site.css">`,
  ];
}

const ICONS = [
  '<symbol id="i-arrow" viewBox="0 0 18 10"><path d="M0 5h16.5M12.5 1l4 4-4 4" fill="none" stroke="currentColor" stroke-width="1.2"/></symbol>',
  '<symbol id="i-menu" viewBox="0 0 22 22"><path d="M3 7h16M3 11h16M3 15h10" fill="none" stroke="currentColor" stroke-width="1.3"/></symbol>',
  '<symbol id="i-close" viewBox="0 0 22 22"><path d="M5 5l12 12M17 5L5 17" fill="none" stroke="currentColor" stroke-width="1.3"/></symbol>',
  '<symbol id="i-chev" viewBox="0 0 22 22"><path d="M6 9l5 5 5-5" fill="none" stroke="currentColor" stroke-width="1.4"/></symbol>',
];

// Where a department link goes: in the page when the page carries that
// department (the issue), otherwise to the issue's section.
function deptHref(ctx, d) {
  if (ctx.ids.has(d.id)) return `#${d.id}`;
  return ctx.root === '/' ? `/#${d.id}` : `index.html#${d.id}`;
}

function current(ctx, d) {
  return ctx.dept === d.id ? ' aria-current="true"' : '';
}

function editionWords() {
  return '<div class="edition-words" role="group" aria-label="Edition">\n' +
    '  <button type="button" data-edition-choice="night" aria-pressed="true">Night</button><span aria-hidden="true">/</span><button type="button" data-edition-choice="day" aria-pressed="false">Day</button>\n' +
    '</div>';
}

function topRegion(ctx) {
  const { site, root } = ctx;
  const home = root === '/' ? '/' : 'index.html';
  const issue = `Issue ${esc(site.issue.number)}`;
  const nav = site.departments.map((d) => `      <li><a href="${deptHref(ctx, d)}"${current(ctx, d)}><span>${esc(d.num)}</span>${esc(d.name)}</a></li>`);
  const sheet = site.departments.map((d) => `      <li><a href="${deptHref(ctx, d)}"${current(ctx, d)}><span class="n">${esc(d.num)}</span><span class="name">${esc(d.name)}</span><svg class="ico" aria-hidden="true"><use href="#i-arrow"/></svg></a></li>`);
  const indent = (block, n) => block.split('\n').map((l) => ' '.repeat(n) + l);
  return [
    '<a class="skip-link" href="#main">Skip to content</a>',
    '<svg class="art-defs" width="0" height="0" aria-hidden="true" focusable="false">',
    '  <defs>',
    ...ICONS.map((s) => `    ${s}`),
    '  </defs>',
    '</svg>',
    '<header class="masthead">',
    '  <div class="wrap masthead-row">',
    // The name is always in the link's accessible name, even while the
    // visible wordmark waits for a cover to scroll away (site.css).
    `    <a class="wordmark" href="${home}"><span class="visually-hidden">${esc(site.name)}</span><b aria-hidden="true">${esc(site.name)}</b><span class="t-folio">${issue}<span class="folio-season"> &middot; ${esc(site.issue.season)}</span></span></a>`,
    '    <nav class="masthead-nav" aria-label="Departments">',
    '      <ol>',
    ...nav.map((l) => `  ${l}`),
    '      </ol>',
    '    </nav>',
    '    <div class="masthead-actions">',
    ...indent(editionWords(), 6),
    `      <a class="btn btn--outlined btn--sm" href="${root}${esc(site.resume.page)}">Résumé</a>`,
    '      <button class="btn menu-btn" type="button" aria-haspopup="dialog" aria-expanded="false" aria-controls="menu" data-menu-open><svg aria-hidden="true"><use href="#i-menu"/></svg>Menu</button>',
    '    </div>',
    '  </div>',
    '</header>',
    '<dialog class="menu-sheet" id="menu" aria-label="Menu">',
    '  <div class="sheet-handle" aria-hidden="true"></div>',
    '  <div class="sheet-head">',
    '    <span class="t-folio">In this issue</span>',
    '    <button class="icon-btn" type="button" aria-label="Close menu" data-menu-close><svg aria-hidden="true"><use href="#i-close"/></svg></button>',
    '  </div>',
    '  <nav aria-label="In this issue">',
    '    <ol class="sheet-list">',
    ...sheet,
    '    </ol>',
    '  </nav>',
    '  <div class="sheet-foot">',
    '    <div class="sheet-edition">',
    '      <span class="t-folio" aria-hidden="true">Edition</span>',
    ...indent(editionWords(), 6),
    '    </div>',
    `    <a class="btn btn--filled" href="${root}${esc(site.resume.page)}">Résumé</a>`,
    '  </div>',
    '</dialog>',
  ];
}

function artRegion(ctx) {
  const { symbols } = require('./generate-kit-art');
  return symbols(ctx.art).svg.split('\n');
}

function colophon(ctx) {
  const { site, root, page, variant } = ctx;
  const consulting = site.consulting && site.consulting.enabled;
  if (consulting && !fs.existsSync(path.join(ROOT, site.consulting.page)) && !fs.existsSync(path.join(CONTENT, site.consulting.page.replace(/\.html$/, '.md')))) {
    throw new Error(`site.json turns consulting on, but neither ${site.consulting.page} nor its Markdown exists`);
  }
  const also = site.departments.map((d) => `<li><a href="${deptHref(ctx, d)}"${current(ctx, d)}><span class="num-o">${esc(d.num)}</span>${esc(d.name)}</a></li>`);
  also.push(`<li><a href="${root}kit.html"${page === 'kit.html' ? ' aria-current="page"' : ''}>How this issue is made</a></li>`);
  const home = variant === 'home';
  if (home) {
    const h = site.home || {};
    const strings = (list) => Array.isArray(list) && list.length && list.every((s) => typeof s === 'string' && s.trim());
    const items = Array.isArray(h.outside) && h.outside.length && h.outside.every((i) => (typeof i === 'string' && i.trim()) || (i && typeof i.text === 'string' && typeof i.href === 'string'));
    if (!strings(h.note) || !items || typeof h.contact !== 'string') throw new Error(`${page}: the home colophon needs site.json home.note (paragraphs), home.outside (items) and home.contact`);
  }
  // The Outside work line: one sentence per item, an item with an href a link.
  const outside = () => site.home.outside.map((i) => (typeof i === 'string' ? esc(i) : `<a href="${root}${esc(i.href)}">${esc(i.text)}</a>`)).join('. ') + '.';
  const lines = [
    '<footer class="colophon">',
    '  <div class="checker" aria-hidden="true"></div>',
    '  <div class="wrap colophon-grid">',
    '    <div>',
    `      <h2>${esc(site.name)}</h2>`,
    `      <p class="t-small t-quiet">Issue ${esc(site.issue.number)} &middot; ${esc(site.issue.season)}. Set in Fraunces, Newsreader and Instrument Sans.</p>`,
  ];
  // The home colophon carries the old home page's intro and what it said
  // about Ben outside the work, under the ids its Elsewhere and Contact
  // sections had.
  if (home) {
    lines.push(
      ...site.home.note.map((p) => `      <p class="t-small colophon-note">${esc(p)}</p>`),
      `      <p class="t-small colophon-note"><span class="t-folio" id="elsewhere-heading">Outside work</span>${outside()}</p>`,
    );
  }
  // The consulting line, on every page while site.json turns it on.
  if (consulting) lines.push(`      <p class="t-small colophon-consulting">${esc(site.consulting.name)}: <a href="${root}${esc(site.consulting.page)}"${page === site.consulting.page ? ' aria-current="page"' : ''}>${esc(site.consulting.line)}</a>.</p>`);
  lines.push(
    '    </div>',
    '    <div class="write">',
    `      <span class="t-folio"${home ? ' id="contact-heading"' : ''}>Write to me</span>`,
    ...(home ? [`      <p class="t-small">${esc(site.home.contact)}</p>`] : []),
    `      <button class="btn btn--outlined btn--sm" type="button" data-email="${esc(site.contact.email)}" data-copy-email><span data-copy-label>Copy my email</span></button>`,
    `      <a class="nojs-only btn btn--outlined btn--sm" href="${esc(site.contact.linkedin)}" rel="noopener">Message me on LinkedIn</a>`,
    '      <span class="copy-status t-note" aria-live="polite" aria-atomic="true"></span>',
    `      <p class="t-small">For agents: <a href="${root}llms.txt">llms.txt</a></p>`,
    '    </div>',
    `    <div><span class="t-folio">Elsewhere</span><ul class="t-small"><li><a href="${esc(site.contact.linkedin)}" rel="noopener">LinkedIn</a></li><li><a href="${esc(site.contact.github)}" rel="noopener">GitHub</a></li><li><a href="${root}${esc(site.resume.pdf)}">Résumé, PDF</a></li></ul></div>`,
    `    <div><span class="t-folio">Also</span><ul class="t-small">${also.join('')}</ul></div>`,
    '  </div>',
    '</footer>',
  );
  return lines;
}

// The one chrome script. Plain ES2017, no globals; every part checks that its
// markup is on the page, so the same bytes run everywhere.
const CHROME_SCRIPT = `<script>
  // Chrome: the Night and Day words, the menu sheet, the phone disclosures,
  // the copy-email button and the masthead wordmark. Stamped by build-pages.js.
  (function () {
    const root = document.documentElement;

    // Edition. Paper inserts turn charcoal in Day through tokens.css, not here.
    const choices = document.querySelectorAll('[data-edition-choice]');
    const themeColor = document.querySelector('meta[name="theme-color"]');
    const apply = (edition) => {
      root.dataset.edition = edition;
      choices.forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.editionChoice === edition)));
      const ground = getComputedStyle(root).getPropertyValue('--ground').trim();
      if (themeColor && ground) themeColor.setAttribute('content', ground);
    };
    apply(root.dataset.edition === 'day' ? 'day' : 'night');
    choices.forEach((b) => b.addEventListener('click', () => {
      apply(b.dataset.editionChoice);
      try { localStorage.setItem('edition', b.dataset.editionChoice); } catch (err) { /* storage blocked */ }
    }));

    // Menu sheet: a native modal dialog. Escape, the close button and a tap on
    // the scrim close it, and focus goes back to Menu. A link closes it too;
    // when the link is to a section of this page, focus moves to that section
    // once the sheet has closed, so the next Tab carries on from there.
    const sheet = document.getElementById('menu');
    const opener = document.querySelector('[data-menu-open]');
    if (sheet && opener && typeof sheet.showModal === 'function') {
      let target = null;
      opener.addEventListener('click', () => { sheet.showModal(); opener.setAttribute('aria-expanded', 'true'); });
      sheet.addEventListener('close', () => {
        opener.setAttribute('aria-expanded', 'false');
        const to = target;
        target = null;
        if (to) {
          // Focusable for this one visit, without a ring around the section.
          if (!to.hasAttribute('tabindex')) {
            to.setAttribute('tabindex', '-1');
            to.setAttribute('data-sheet-target', '');
            to.addEventListener('blur', () => { to.removeAttribute('tabindex'); to.removeAttribute('data-sheet-target'); }, { once: true });
          }
          to.focus({ preventScroll: true });
          return;
        }
        if (document.activeElement === document.body || sheet.contains(document.activeElement)) opener.focus({ preventScroll: true });
      });
      // A tap on the sheet's own padding lands on the dialog too, so test the point.
      sheet.addEventListener('click', (e) => {
        const r = sheet.getBoundingClientRect();
        const outside = e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom;
        const link = e.target.closest('a');
        if (link && !e.defaultPrevented && (link.getAttribute('href') || '').startsWith('#')) target = document.getElementById(decodeURIComponent(link.hash.slice(1)));
        if ((e.target === sheet && outside) || link || e.target.closest('[data-menu-close]')) sheet.close();
      });
    }

    // Phones: each [data-fold] block closes into a list row. Its title gets a
    // disclosure button; from 600px up the button is taken out again.
    const phone = window.matchMedia('(max-width: 599px)');
    const folds = [...document.querySelectorAll('[data-fold]')];
    const setOpen = (block, open) => {
      block.querySelector('.fold-btn').setAttribute('aria-expanded', String(open));
      block.classList.toggle('is-closed', !open);
      block.querySelector('[data-fold-body]').hidden = !open;
    };
    const fold = () => folds.forEach((block, i) => {
      const title = block.querySelector('.fold-head h3');
      const body = block.querySelector('[data-fold-body]');
      if (!title || !body) return;
      let button = title.querySelector('.fold-btn');
      if (phone.matches && !button) {
        if (!body.id) body.id = \`fold-\${i + 1}\`;
        button = document.createElement('button');
        button.type = 'button';
        button.className = 'fold-btn';
        button.setAttribute('aria-controls', body.id);
        button.append(...title.childNodes);
        button.insertAdjacentHTML('beforeend', '<svg class="fold-chev" aria-hidden="true"><use href="#i-chev"/></svg>');
        button.addEventListener('click', () => setOpen(block, button.getAttribute('aria-expanded') !== 'true'));
        title.append(button);
        setOpen(block, false);
      } else if (!phone.matches && button) {
        button.querySelector('.fold-chev').remove();
        title.append(...button.childNodes);
        button.remove();
        block.classList.remove('is-closed');
        body.hidden = false;
      }
    });
    fold();
    phone.addEventListener('change', fold);

    // Copy email: the address sits base64-encoded in data-email. A page can
    // carry more than one button (the colophon's, a page's own ask); each
    // reports in the status line beside it.
    document.querySelectorAll('[data-copy-email]').forEach((copyButton) => {
      const label = copyButton.querySelector('[data-copy-label]');
      const original = label.textContent;
      const status = copyButton.parentElement.querySelector('.copy-status');
      const say = (message) => { if (status) status.textContent = message; };
      let reset = 0;
      const copied = (email) => {
        clearTimeout(reset);
        label.textContent = 'Copied';
        reset = setTimeout(() => { label.textContent = original; }, 2000);
        say(\`\${email} is ready to paste.\`);
      };
      copyButton.addEventListener('click', () => {
        let email = '';
        try { email = atob(copyButton.dataset.email || ''); } catch (err) { email = ''; }
        if (!email) { say('Couldn\\u2019t find the email address.'); return; }
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(email).then(() => copied(email), () => say(\`Copy didn\\u2019t work. The address is \${email}.\`));
          return;
        }
        say(\`The address is \${email}.\`);
      });
    });

    // On a page with a cover, the masthead wordmark waits for the nameplate
    // to scroll away.
    const masthead = document.querySelector('.masthead');
    const nameplate = document.querySelector('.nameplate');
    if (masthead && nameplate && 'IntersectionObserver' in window) {
      new IntersectionObserver(([entry]) => {
        masthead.toggleAttribute('data-cover-gone', !entry.isIntersecting);
      }, { rootMargin: '-56px 0px 0px 0px' }).observe(nameplate);
    }
  })();
</script>`;

function scriptRegion() {
  return CHROME_SCRIPT.split('\n');
}

// ------------------------------------------------------------- stamping ----

function fail(page, message) {
  throw new Error(`${page}: ${message}`);
}

// The markers in a page, paired and checked against the closed grammar.
function regionsOf(page, html) {
  const found = {};
  const order = [];
  let open = null;
  for (const m of html.matchAll(MARKER)) {
    const [text, slash, name, json] = m;
    if (!REGIONS.includes(name)) fail(page, `unknown chrome region "${name}"`);
    if (!slash) {
      if (open) fail(page, `chrome:${name} opens inside chrome:${open.name}`);
      if (found[name]) fail(page, `chrome:${name} appears twice`);
      let params = {};
      if (json) {
        try { params = JSON.parse(json); } catch (err) { fail(page, `chrome:${name} has invalid JSON: ${json}`); }
        if (!params || typeof params !== 'object' || Array.isArray(params)) fail(page, `chrome:${name} parameters must be an object`);
      }
      for (const key of Object.keys(params)) {
        if (!(key in PARAMS)) fail(page, `chrome:${name} has unknown parameter "${key}" (known: ${Object.keys(PARAMS).join(', ')})`);
        if (PARAMS[key] !== name) fail(page, `"${key}" belongs on chrome:${PARAMS[key]}, not chrome:${name}`);
      }
      open = { name, params, start: m.index, openEnd: m.index + text.length };
    } else {
      if (!open || open.name !== name) fail(page, `/chrome:${name} closes nothing`);
      open.close = m.index;
      open.end = m.index + text.length;
      found[name] = open;
      order.push(open);
      open = null;
    }
  }
  if (open) fail(page, `chrome:${open.name} is never closed`);
  // Every comment that looks like a marker must be one.
  for (const m of html.matchAll(/<!--\s*\/?\s*chrome:[\s\S]*?-->/g)) {
    if (!new RegExp(MARKER.source).test(m[0]) || m[0] !== m[0].match(new RegExp(MARKER.source))[0]) fail(page, `malformed chrome marker: ${m[0].slice(0, 80)}`);
  }
  return { found, order };
}

function pageParams(page, found, site) {
  const p = (name, key, fallback) => (found[name] && key in found[name].params ? found[name].params[key] : fallback);
  const root = p('head', 'root', '');
  if (root !== '' && root !== '/') fail(page, `root must be "" or "/", not ${JSON.stringify(root)}`);
  if (root === '/' && page !== '404.html') fail(page, 'only 404.html takes root "/"');
  const dept = p('top', 'dept', 'none');
  const depts = site.departments.map((d) => d.id);
  if (dept !== 'none' && !depts.includes(dept)) fail(page, `dept must be one of ${[...depts, 'none'].join(', ')}, not ${JSON.stringify(dept)}`);
  const variant = p('colophon', 'colophon', 'standard');
  if (!COLOPHONS.includes(variant)) fail(page, `colophon must be one of ${COLOPHONS.join(', ')}, not ${JSON.stringify(variant)}`);
  const art = p('art', 'art', []);
  const { NAMES } = require('./generate-kit-art');
  if (!Array.isArray(art) || !art.length || art.some((a) => !NAMES.includes(a)) || new Set(art).size !== art.length) {
    if (found.art) fail(page, `art must list one or more of ${NAMES.join(', ')}, each once`);
  }
  return { root, dept, variant, art };
}

// The page with every region emptied: what the author wrote.
function blankRegions(html, order) {
  let out = '';
  let at = 0;
  for (const r of [...order].sort((a, b) => a.start - b.start)) {
    out += html.slice(at, r.openEnd);
    at = r.close;
  }
  return out + html.slice(at);
}

function idsIn(html) {
  return findAll(parseHtml(html), (el) => 'id' in el.attrs).map((el) => el.attrs.id);
}

function indentOf(html, index) {
  const lineStart = html.lastIndexOf('\n', index - 1) + 1;
  const lead = html.slice(lineStart, index);
  return /^\s*$/.test(lead) ? lead : '';
}

// sources: pages the press is about to write (the consulting pages), read
// from memory before the disk, so a page can time a page made in the same run.
function writeReadingTimes(page, html, sources = new Map()) {
  const doc = parseHtml(html);
  const cache = new Map();
  const minutes = (target) => {
    if (cache.has(target)) return cache.get(target);
    let node;
    if (/\.html(#|$)/.test(target)) {
      const [name, id] = target.split('#');
      const file = path.join(ROOT, name);
      if (!sources.has(name) && !fs.existsSync(file)) fail(page, `data-read="${target}": no such page`);
      const other = parseHtml(sources.has(name) ? sources.get(name) : fs.readFileSync(file, 'utf8'));
      node = findAll(other, (el) => (id ? el.attrs.id === id : el.tag === 'main'))[0];
      if (!node) fail(page, `data-read="${target}": that page has no ${id ? `element with id "${id}"` : '<main>'}`);
    } else {
      node = findAll(doc, (el) => el.attrs.id === target)[0];
      if (!node) fail(page, `data-read="${target}": no element with that id`);
    }
    const n = readingMinutes(node);
    cache.set(target, n);
    return n;
  };
  const edits = findAll(doc, (el) => 'data-read' in el.attrs).map((el) => {
    if (el.children.some((c) => c.type !== 'text')) fail(page, `data-read="${el.attrs['data-read']}" must hold only the number`);
    return { from: el.openEnd, to: el.close, text: String(minutes(el.attrs['data-read'])) };
  });
  let out = html;
  for (const e of edits.reverse()) out = out.slice(0, e.from) + e.text + out.slice(e.to);
  return out;
}

// Checks the stamped page: placement, markers inside scripts, h1s, ids.
function validate(page, html) {
  const { found, order } = regionsOf(page, html);
  const names = Object.keys(found);
  const doc = parseHtml(html);
  const comments = [];
  (function walk(node) {
    for (const c of node.children || []) {
      if (c.type === 'comment') comments.push(c);
      if (c.type === 'element') walk(c);
    }
  }(doc));
  const markers = comments.filter((c) => new RegExp(`^${MARKER.source.slice(4, -3)}$`).test(c.value));
  if (markers.length !== order.length * 2) fail(page, 'a chrome marker sits inside a script, a style or another comment');
  const markerFor = (name, closing) => markers.find((c) => c.value.startsWith(` ${closing ? '/' : ''}chrome:${name}`));
  const significant = (node) => (node.children || []).filter((c) => c.type === 'element' || c.type === 'comment' || (c.type === 'text' && c.value.trim()));
  const body = findAll(doc, (el) => el.tag === 'body')[0];
  const mainEl = body && findAll(body, (el) => el.tag === 'main')[0];
  for (const name of names) {
    const open = markerFor(name, false);
    const close = markerFor(name, true);
    const parent = open.parent.tag;
    if (close.parent !== open.parent) fail(page, `chrome:${name} opens and closes in different elements`);
    const want = name === 'head' ? 'head' : 'body';
    if (parent !== want) fail(page, `chrome:${name} belongs in <${want}>, not <${parent}>`);
    if (name === 'top' && significant(body)[0] !== open) fail(page, 'chrome:top must come first in <body>');
    if (name === 'script' && significant(body).slice(-1)[0] !== close) fail(page, 'chrome:script must come last in <body>');
    if (name === 'colophon' && !(mainEl && mainEl.parent === body && mainEl.end <= open.start)) fail(page, 'chrome:colophon must come after <main>');
    if (name === 'art') {
      if (!mainEl || mainEl.parent !== body || close.end > mainEl.start) fail(page, 'chrome:art must come before <main>');
      if (found.top && open.start < found.top.end) fail(page, 'chrome:art must come after chrome:top');
    }
    if (/<h1[\s>]/i.test(html.slice(found[name].openEnd, found[name].close))) fail(page, `chrome:${name} contains an h1`);
  }
  if (names.length) {
    if (!found.head) fail(page, 'a page with chrome needs chrome:head');
    const shell = ['top', 'colophon', 'script'].filter((n) => found[n]);
    if (shell.length && shell.length !== 3) fail(page, 'chrome:top, chrome:colophon and chrome:script come together');
    if (found.art && !found.top) fail(page, 'chrome:art needs chrome:top');
  }
  // Ids: none shared between the regions and the page, none repeated.
  const inRegions = order.flatMap((r) => idsIn(html.slice(r.openEnd, r.close)));
  const authored = idsIn(blankRegions(html, order));
  const clash = inRegions.filter((id) => authored.includes(id));
  if (clash.length) fail(page, `ids used by both the chrome and the page: ${[...new Set(clash)].join(', ')}`);
  const all = [...inRegions, ...authored];
  const dup = all.filter((id, i) => all.indexOf(id) !== i);
  if (dup.length) fail(page, `repeated ids: ${[...new Set(dup)].join(', ')}`);
  // Art: every drawing the page shows is declared, and every declared one shown.
  const art = found.art ? found.art.params.art : [];
  const used = new Set([...blankRegions(html, order).matchAll(/(?:href="#|url\(#)art-([a-z-]+)/g)].map((m) => m[1]));
  const { NAMES } = require('./generate-kit-art');
  for (const name of used) {
    if (NAMES.includes(name) && !art.includes(name)) fail(page, `uses #art-${name} but its chrome:art does not name "${name}"`);
    if (!NAMES.includes(name) && !found.art) fail(page, `uses #art-${name}, which only a chrome:art region provides`);
  }
  for (const name of art) if (!used.has(name)) fail(page, `chrome:art names "${name}" but the page never shows it`);
}

// The page as the press would write it.
function stamp(page, html, { site = loadSite(), theme = require('./build-tokens').loadTheme(), sources } = {}) {
  const { found, order } = regionsOf(page, html);
  if (!order.length) return html;
  const params = pageParams(page, found, site);
  const ids = new Set(idsIn(blankRegions(html, order)));
  const ctx = { ...params, page, site, theme, ids };
  const make = { head, top: topRegion, art: artRegion, colophon, script: scriptRegion };
  let out = '';
  let at = 0;
  for (const r of [...order].sort((a, b) => a.start - b.start)) {
    const indent = indentOf(html, r.start);
    const body = make[r.name](ctx).map((l) => (l ? indent + l : l)).join('\n');
    out += `${html.slice(at, r.openEnd)}\n${body}\n${indent}`;
    at = r.close;
  }
  out += html.slice(at);
  out = writeReadingTimes(page, out, sources);
  validate(page, out);
  return out;
}

// ------------------------------------------------- Markdown (step 5) ----
// The consulting pages are written as Markdown in content/consulting/, one
// file per page, named for the page it makes (consulting-rates.md makes
// consulting-rates.html). markdownPages() renders each into a whole page
// that carries the chrome markers, so it goes through stamp() like every
// hand-written page and is written whole, over whatever was there. The
// sources are served as they are too (bensiverly.com/content/consulting/...),
// so agents can read clean Markdown; that is why links in them are written
// root-absolute (/resume.html), and why nothing private goes in them.
//
// Front matter: "key: value" lines between two --- lines, plus one list form
// ("key:" and then "  - name: value" items with "    name: value" lines).
// Nothing else: no quoting, comments or blank lines. Which keys a page takes
// depends on its template (FIELDS below); an unknown key is an error.
//
// The body is a small, safe subset of Markdown:
//   paragraphs; ## and ### headings; "-" and "1." lists; **bold**, *italic*;
//   [links](/root-absolute.html) or https:// links; one > blockquote (the
//   pull quote); footnotes ([^1] in the text, "[^1]: ..." on its own line),
//   which become the circled source notes.
//   A "-" list whose every item opens with **a term** becomes a list of
//   terms and descriptions (a <dl>), the At a glance style.
// Anything else stops the build with the file and line: raw HTML, entities,
// images, code, tables, rules, underlined (=== or ---) headings, _ and __
// emphasis, ~~strikethrough~~, backslash escapes, other list markers (+, *,
// 1)), a hard line break (two trailing spaces or a backslash), and em
// dashes (my-voice.md). A link goes to https://, to #an-id on the page, or
// to a file in the repo by a root-absolute path with no segment starting
// with a dot (no /.., no /.git); no link may carry a quote, an angle
// bracket, a backslash or a space. Straight quotes become curly ones and
// three dots an ellipsis; the text is escaped.

const CONTENT = path.join(ROOT, 'content', 'consulting');
const SITE_URL = 'https://bensiverly.com/';

function mdFail(file, line, message) {
  throw new Error(`${file}${line ? `:${line}` : ''}: ${message}`);
}

// Front matter: { data, body, bodyLine } where bodyLine is the body's first line number.
function parseFrontMatter(file, src) {
  const lines = src.replace(/\r\n/g, '\n').split('\n');
  if (lines[0] !== '---') mdFail(file, 1, 'a page starts with front matter between two --- lines');
  const end = lines.indexOf('---', 1);
  if (end < 0) mdFail(file, 1, 'the front matter is never closed with ---');
  const data = {};
  let list = null;
  let item = null;
  for (let i = 1; i < end; i++) {
    const n = i + 1;
    const line = lines[i];
    if (!line.trim()) mdFail(file, n, 'no blank lines in the front matter');
    if (/\t/.test(line)) mdFail(file, n, 'no tabs in the front matter');
    if (/\s$/.test(line)) mdFail(file, n, 'trailing space');
    let m = /^([a-z][a-z_]*):(?: (.+))?$/.exec(line);
    if (m) {
      const [, key, value] = m;
      if (key in data) mdFail(file, n, `"${key}" is set twice`);
      if (value === undefined) {
        data[key] = [];
        list = { key, items: data[key], line: n };
        item = null;
      } else {
        data[key] = value;
        list = null;
        item = null;
      }
      continue;
    }
    m = /^ {2}- ([a-z][a-z_]*): (.+)$/.exec(line);
    if (m && list) {
      item = { [m[1]]: m[2] };
      list.items.push(item);
      continue;
    }
    m = /^ {4}([a-z][a-z_]*): (.+)$/.exec(line);
    if (m && item) {
      if (m[1] in item) mdFail(file, n, `"${m[1]}" is set twice in one item`);
      item[m[1]] = m[2];
      continue;
    }
    mdFail(file, n, `front matter takes "key: value" lines and one list form ("key:", then "  - name: value" items); cannot read ${JSON.stringify(line)}`);
  }
  for (const [key, value] of Object.entries(data)) if (Array.isArray(value) && !value.length) mdFail(file, 0, `"${key}" is an empty list`);
  return { data, body: lines.slice(end + 1).join('\n'), bodyLine: end + 2 };
}

// The checks every line of text gets, front matter and body alike.
function checkText(file, line, text) {
  if (/—|&mdash;|--/.test(text)) mdFail(file, line, 'no em dashes (my-voice.md): use a spaced hyphen, a comma or parentheses');
  if (/<[A-Za-z!/?]/.test(text)) mdFail(file, line, 'no raw HTML');
  if (/&[#A-Za-z0-9]+;/.test(text)) mdFail(file, line, 'no HTML entities: type the character itself');
  if (/`/.test(text)) mdFail(file, line, 'no code');
  if (/!\[/.test(text)) mdFail(file, line, 'no images');
  if (/\\/.test(text)) mdFail(file, line, 'no backslash escapes: the subset has nothing to escape');
  if (/~~/.test(text)) mdFail(file, line, 'no ~~strikethrough~~');
  // _ and __ emphasis; an underscore inside a word or a link target is left alone.
  const prose = text.replace(/\]\([^()\s]*\)/g, ']()');
  if (/(^|[^A-Za-z0-9])_+[^\s_]|[^\s_]_+($|[^A-Za-z0-9])/.test(prose)) mdFail(file, line, 'no _ or __ emphasis: write *italic* and **bold**');
}

// Curly quotes: a quote mark opens after a space, an opening bracket, a dash
// or another opening quote, and closes everywhere else.
function curly(text) {
  let out = '';
  for (const c of text) {
    const prev = out ? out[out.length - 1] : '';
    const opens = !prev || /[\s([‘“*–-]/.test(prev);
    if (c === '"') out += opens ? '“' : '”';
    else if (c === "'") out += opens ? '‘' : '’';
    else out += c;
  }
  return out;
}

// Where a link in a source goes, written for a page at the site root.
function linkHref(file, line, url, ctx) {
  if (/["'<>\\`\s]/.test(url)) mdFail(file, line, `a link cannot carry a quote, an angle bracket, a backslash or a space: ${url}`);
  if (/^https:\/\/[^/?#]/.test(url)) return url;
  if (url.startsWith('#')) {
    if (!/^#[A-Za-z0-9-]+$/.test(url)) mdFail(file, line, `a link on the page is # and then an id: ${url}`);
    return url;
  }
  if (url.startsWith('//')) mdFail(file, line, `no protocol-relative links: write https:// for another site, or one / for this one: ${url}`);
  if (!url.startsWith('/')) mdFail(file, line, `write links root-absolute (/${url}) or as https:// URLs, so the raw Markdown works too: ${url}`);
  const local = url.slice(1);
  const target = local.split('#')[0];
  if (target.split('/').some((seg) => seg.startsWith('.'))) mdFail(file, line, `no path segment may start with a dot (/.., /.git): ${url}`);
  if (target && !ctx.exists(target)) mdFail(file, line, `${url} links to a file that does not exist`);
  return local === '' ? 'index.html' : local.replace(/^#/, 'index.html#');
}

// One line of text to HTML. ctx.notes numbers the footnotes in the order
// they are first referred to; refs: false leaves them out (front matter,
// note text).
function inline(file, line, text, ctx, { refs = true } = {}) {
  checkText(file, line, text);
  const urls = [];
  // Hold link targets and footnote references aside while the text is
  // typeset, so their characters are left alone.
  let s = text.replace(/\]\(([^()\s]*)\)/g, (all, url) => { urls.push(url); return `]\u0001${urls.length - 1}\u0001`; });
  s = s.replace(/\[\^([a-z0-9-]+)\]/g, (all, id) => {
    if (!refs) mdFail(file, line, `a footnote reference [^${id}] cannot go here`);
    return `\u0002${id}\u0002`;
  });
  s = curly(s).replace(/\.\.\./g, '…');
  s = s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  s = s.replace(/\*\*(?=\S)([^*]+?)\*\*/g, '<strong>$1</strong>').replace(/\*(?=\S)([^*]+?)\*/g, '<em>$1</em>');
  if (s.includes('*')) mdFail(file, line, 'an * that opens no **bold** or *italic*');
  s = s.replace(/\[([^\]\u0001]+)\]\u0001(\d+)\u0001/g, (all, label, k) => `<a href="${esc(linkHref(file, line, urls[Number(k)], ctx))}">${label}</a>`);
  if (/[[\]\u0001]/.test(s)) mdFail(file, line, 'a [ or ] that is not part of a [link](/page.html)');
  s = s.replace(/\u0002([a-z0-9-]+)\u0002/g, (all, id) => {
    let n = ctx.notes.order.indexOf(id) + 1;
    const first = !n;
    if (first) { ctx.notes.order.push(id); n = ctx.notes.order.length; ctx.notes.lines.set(id, line); }
    return `<a class="ref" href="#note-${n}"${first ? ` id="ref-${n}"` : ''} aria-label="Note ${n}">${n}</a>`;
  });
  return s;
}

const BLOCK_START = /^(#{1,6} |- |\d+\. |> |\[\^[a-z0-9-]+\]: )/;

// The body as blocks: { type, line, html } for p, h2, h3 and quote; { type,
// line, items } for ul, ol and dl (dl items are { term, html }). Footnote
// definitions come back separately, numbered in the order the text refers to them.
function parseMarkdown(file, src, { firstLine = 1, exists = () => true } = {}) {
  const lines = src.replace(/\r\n/g, '\n').split('\n');
  const ctx = { exists, notes: { order: [], lines: new Map() } };
  const blocks = [];
  const defs = new Map();
  const at = (k) => firstLine + k;
  for (let k = 0; k < lines.length; k++) {
    const raw = lines[k];
    if (/\t/.test(raw)) mdFail(file, at(k), 'no tabs');
    if (/ {2,}$/.test(raw) || /\\$/.test(raw)) mdFail(file, at(k), 'no hard line breaks (two trailing spaces or a backslash): start a new paragraph');
    if (/ $/.test(raw)) mdFail(file, at(k), 'trailing space');
    // Checked on every line, since a paragraph's next line could otherwise
    // carry them in as plain text.
    if (/^ {0,3}(=+|-+)$/.test(raw)) mdFail(file, at(k), 'no horizontal rules or underlined headings (a line of = or -): use ## or ###');
    if (/^ {0,3}([*+] |\d+\) )/.test(raw)) mdFail(file, at(k), 'write list items with "- " and numbered items with "1. "');
  }
  // Gathers a block's lines: the first, then continuation lines (indented
  // for list items and notes) until a blank line or the next block.
  const gather = (k, indent) => {
    const out = [lines[k]];
    let j = k + 1;
    while (j < lines.length && lines[j].trim() && !BLOCK_START.test(lines[j]) && (indent === null || lines[j].startsWith(indent))) {
      out.push(lines[j].trim());
      j++;
    }
    return { text: out.join(' '), next: j };
  };
  let k = 0;
  while (k < lines.length) {
    const line = lines[k];
    const n = at(k);
    if (!line.trim()) { k++; continue; }
    if (/^ /.test(line)) mdFail(file, n, 'an indented line outside a list item or note (indented code is not allowed)');
    if (/^(```|~~~)/.test(line)) mdFail(file, n, 'no code');
    if (/^\|/.test(line) || /\|\s*$/.test(line)) mdFail(file, n, 'no tables');
    if (/^([-*_])( ?\1){2,}\s*$/.test(line)) mdFail(file, n, 'no horizontal rules');
    if (/^[*+] /.test(line)) mdFail(file, n, 'write list items with "- "');
    let m = /^(#{1,6}) (.+)$/.exec(line);
    if (m) {
      if (m[1].length !== 2 && m[1].length !== 3) mdFail(file, n, `only ## and ### headings (the h1 is the front matter's title)`);
      blocks.push({ type: `h${m[1].length}`, line: n, html: inline(file, n, m[2], ctx, { refs: false }), text: m[2] });
      k++;
      continue;
    }
    m = /^\[\^([a-z0-9-]+)\]: (.+)$/.exec(line);
    if (m) {
      const { text, next } = gather(k, '  ');
      if (defs.has(m[1])) mdFail(file, n, `footnote [^${m[1]}] is defined twice`);
      defs.set(m[1], { line: n, text: text.replace(/^\[\^[a-z0-9-]+\]: /, '') });
      k = next;
      continue;
    }
    if (/^(- |\d+\. )/.test(line)) {
      const ordered = /^\d/.test(line);
      const items = [];
      while (k < lines.length && (ordered ? /^\d+\. /.test(lines[k]) : /^- /.test(lines[k]))) {
        const start = at(k);
        if (ordered && Number(/^\d+/.exec(lines[k])[0]) !== items.length + 1) mdFail(file, start, `number the list 1, 2, 3 in order`);
        const { text, next } = gather(k, ordered ? '   ' : '  ');
        items.push({ line: start, src: text.replace(/^(- |\d+\. )/, '') });
        k = next;
      }
      if (k < lines.length && lines[k].trim() && /^(- |\d+\. )/.test(lines[k])) mdFail(file, at(k), 'one list, one marker: do not mix "-" and "1."');
      const terms = !ordered && items.every((it) => /^\*\*[^*]+\*\* \S/.test(it.src));
      if (terms) {
        blocks.push({ type: 'dl', line: items[0].line, items: items.map((it) => {
          const [, term, rest] = /^\*\*([^*]+)\*\* (.+)$/.exec(it.src);
          return { term: inline(file, it.line, term.replace(/[:.]$/, ''), ctx, { refs: false }), html: inline(file, it.line, rest, ctx) };
        }) });
      } else {
        blocks.push({ type: ordered ? 'ol' : 'ul', line: items[0].line, items: items.map((it) => ({ html: inline(file, it.line, it.src, ctx) })) });
      }
      continue;
    }
    if (/^>/.test(line)) {
      const quoted = [];
      while (k < lines.length && /^>/.test(lines[k])) {
        if (!/^> \S/.test(lines[k])) mdFail(file, at(k), 'a quote line is "> " and then the text');
        quoted.push(lines[k].slice(2));
        k++;
      }
      if (blocks.some((b) => b.type === 'quote')) mdFail(file, n, 'one pull quote (>) a page');
      blocks.push({ type: 'quote', line: n, html: inline(file, n, quoted.join(' '), ctx) });
      continue;
    }
    const { text, next } = gather(k, null);
    blocks.push({ type: 'p', line: n, html: inline(file, n, text, ctx) });
    k = next;
  }
  // Every reference has a note, every note a reference.
  const notes = ctx.notes.order.map((id, i) => {
    const def = defs.get(id);
    if (!def) mdFail(file, ctx.notes.lines.get(id), `[^${id}] has no "[^${id}]: ..." note`);
    return { n: i + 1, id, html: inline(file, def.line, def.text, ctx, { refs: false }) };
  });
  for (const [id, def] of defs) if (!ctx.notes.order.includes(id)) mdFail(file, def.line, `note [^${id}] is never referred to`);
  return { blocks, notes };
}

// An id for a heading: its words, lower case, hyphenated.
function slugify(text) {
  return text.toLowerCase().replace(/['’]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

// The plain rendering of blocks, the one the golden fixtures pin. Templates
// lay the same blocks out their own way, through the same helpers.
function renderBlock(block) {
  switch (block.type) {
    case 'p': return `<p>${block.html}</p>`;
    case 'h2': case 'h3': return `<${block.type} id="${slugify(block.text)}">${block.html}</${block.type}>`;
    case 'quote': return `<blockquote class="pull"><p>${block.html}</p></blockquote>`;
    case 'ul': case 'ol': return [`<${block.type}>`, ...block.items.map((it) => `  <li>${it.html}</li>`), `</${block.type}>`].join('\n');
    case 'dl': return ['<dl>', ...block.items.map((it) => `  <div><dt>${it.term}</dt><dd>${it.html}</dd></div>`), '</dl>'].join('\n');
    default: throw new Error(`no rendering for a ${block.type} block`);
  }
}

function renderNotes(notes, { start = 1 } = {}) {
  if (!notes.length) return '';
  const reset = start > 1 ? ` style="counter-reset: note ${start - 1}"` : '';
  return [`<ol class="notes"${reset}>`, ...notes.map((note) => `  <li id="note-${note.n}" class="t-note">${note.html}</li>`), '</ol>'].join('\n');
}

function renderMarkdown(file, src, options) {
  const { blocks, notes } = parseMarkdown(file, src, options);
  return [...blocks.map(renderBlock), renderNotes(notes)].filter(Boolean).join('\n') + '\n';
}

// The last paragraph of a piece carries the orange end mark.
function withEndMark(html) {
  const i = html.lastIndexOf('</p>');
  if (i < 0) throw new Error('a piece needs a closing paragraph for its end mark');
  return `${html.slice(0, i)}<span class="end-mark" aria-hidden="true"></span>${html.slice(i)}`;
}

// ---------------------------------------------- the consulting pages ----
// Each source names its template. All four share the shell (head tags, the
// chrome markers, WebPage JSON-LD), the running head and opener of 05
// Consulting, and the way on: the front page's teasers, the other pages'
// contents box. Shared rules are in site.css under :where(.consult); a rule
// only one template uses stays in that page's <style>, below.

const TEMPLATES = ['front', 'rate-card', 'numbered', 'essay'];
const FIELDS = {
  all: { required: ['title', 'template', 'order', 'kicker', 'description', 'teaser', 'updated'], optional: ['headline', 'deck', 'index', 'art', 'art_alt', 'llms'] },
  front: { required: ['service', 'cta'], optional: [] },
  'rate-card': { required: ['rate', 'currency', 'unit_code', 'unit_text', 'card_no', 'seal_value', 'seal_label', 'cta', 'small_print', 'lines'], optional: [] },
  numbered: { required: ['close'], optional: [] },
  essay: { required: ['close'], optional: [] },
};
const LISTS = { lines: { required: ['name', 'terms'], optional: ['note'] } };

// The engravings' own sizes, read from the generator, for <use width height>.
const artSizes = new Map();
function artSize(name) {
  if (!artSizes.has(name)) {
    const { symbols } = require('./generate-kit-art');
    const m = /viewBox="0 0 (\d+) (\d+)"/.exec(symbols([name]).svg.split('\n')[1]);
    artSizes.set(name, [Number(m[1]), Number(m[2])]);
  }
  return artSizes.get(name);
}

// Checks a source's front matter against its template and returns the page's model.
function readSource(name) {
  const file = `content/consulting/${name}`;
  if (!/^consulting(-[a-z]+)*\.md$/.test(name)) mdFail(file, 0, 'a source is named for the page it makes: consulting.md or consulting-<name>.md');
  const src = fs.readFileSync(path.join(CONTENT, name), 'utf8');
  if (!src.endsWith('\n') || src.endsWith('\n\n')) mdFail(file, 0, 'end the file with exactly one newline');
  const { data, body, bodyLine } = parseFrontMatter(file, src);
  if (!TEMPLATES.includes(data.template)) mdFail(file, 0, `template must be one of ${TEMPLATES.join(', ')}, not ${JSON.stringify(data.template)}`);
  const spec = FIELDS[data.template];
  const required = [...FIELDS.all.required, ...spec.required];
  const known = [...required, ...FIELDS.all.optional, ...spec.optional];
  for (const key of required) if (!(key in data)) mdFail(file, 0, `front matter needs "${key}"`);
  for (const key of Object.keys(data)) {
    if (!known.includes(key)) mdFail(file, 0, `"${key}" is not a front matter key for the ${data.template} template (known: ${known.join(', ')})`);
    if (Array.isArray(data[key]) !== (key in LISTS)) mdFail(file, 0, `"${key}" ${key in LISTS ? 'is a list' : 'takes one value, not a list'}`);
  }
  for (const [key, items] of Object.entries(data).filter(([k]) => k in LISTS)) {
    for (const item of items) {
      for (const k of LISTS[key].required) if (!(k in item)) mdFail(file, 0, `each of "${key}" needs "${k}"`);
      for (const k of Object.keys(item)) if (![...LISTS[key].required, ...LISTS[key].optional].includes(k)) mdFail(file, 0, `"${k}" is not a key for "${key}"`);
    }
  }
  if (!/^[1-9]\d*$/.test(data.order)) mdFail(file, 0, 'order is a whole number from 1');
  if (data.description.length > 160) mdFail(file, 0, `the description is ${data.description.length} characters; 160 at most`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(data.updated) || Number.isNaN(Date.parse(data.updated))) mdFail(file, 0, 'updated is a date, YYYY-MM-DD');
  if ('index' in data && !['true', 'false'].includes(data.index)) mdFail(file, 0, 'index is true or false');
  let art = null;
  if (data.art) {
    const m = /^([a-z-]+) (-?\d+) (-?\d+) (\d+) (\d+)$/.exec(data.art);
    const { NAMES } = require('./generate-kit-art');
    if (!m || !NAMES.includes(m[1])) mdFail(file, 0, `art is a drawing (${NAMES.join(', ')}) and its crop, "marigold 0 0 160 150"`);
    art = { name: m[1], box: m.slice(2).join(' '), alt: data.art_alt || '' };
  }
  if (data.template === 'rate-card') {
    if (!/^[1-9]\d*$/.test(data.rate)) mdFail(file, 0, 'rate is a whole number');
    if (!/^[A-Z]{3}$/.test(data.currency)) mdFail(file, 0, 'currency is a three-letter code, USD');
    if (!/^[A-Z0-9]{3}$/.test(data.unit_code)) mdFail(file, 0, 'unit_code is a UN/CEFACT code, HUR for an hour');
  }
  // Every text value takes the same checks as body text.
  for (const value of Object.values(data)) {
    for (const v of Array.isArray(value) ? value.flatMap((i) => Object.values(i)) : [value]) checkText(file, 0, v);
  }
  return {
    file, name, page: name.replace(/\.md$/, '.html'), data, body, bodyLine, art,
    order: Number(data.order), index: data.index !== 'false',
    url: `${SITE_URL}${name.replace(/\.md$/, '.html')}`,
    md: `${SITE_URL}content/consulting/${name}`,
  };
}

function loadSources() {
  if (!fs.existsSync(CONTENT)) return [];
  const names = fs.readdirSync(CONTENT).filter((f) => f.endsWith('.md')).sort();
  const others = fs.readdirSync(CONTENT).filter((f) => !f.endsWith('.md'));
  if (others.length) throw new Error(`content/consulting/ holds only the pages' Markdown, not ${others.join(', ')}`);
  const pages = names.map(readSource).sort((a, b) => a.order - b.order);
  pages.forEach((p, i) => { if (p.order !== i + 1) mdFail(p.file, 0, `order ${p.order}: the pages are numbered 1 to ${pages.length}, each once`); });
  if (pages.length && pages[0].page !== 'consulting.html') throw new Error('content/consulting/consulting.md, the front page, is order 1');
  if (pages.length && pages[0].data.template !== 'front') mdFail(pages[0].file, 0, 'the front page takes the front template');
  if (pages.filter((p) => p.data.template === 'rate-card').length > 1) throw new Error('one rate card');
  return pages;
}

// Front matter text as HTML: typeset and escaped, links allowed, no notes.
function fmHtml(model, value) {
  return inline(model.file, 0, value, model.ctx, { refs: false });
}
// ... and as plain text for attributes and <title>.
function fmText(value) {
  return curly(value).replace(/\.\.\./g, '…');
}

const ICO = '<svg class="ico" aria-hidden="true"><use href="#i-arrow"/></svg>';
const PUB = (site) => `${esc(site.name)} &middot; Issue ${esc(site.issue.number)} &middot; ${esc(site.issue.season)}`;

function artFigure(art, cls) {
  const [w, h] = artSize(art.name);
  const label = art.alt ? ` role="img" aria-label="${esc(art.alt)}"` : '';
  return `<figure class="${cls}"${art.alt ? '' : ' aria-hidden="true"'}><div class="art"><svg viewBox="${art.box}" preserveAspectRatio="xMidYMid slice"${label}><use href="#art-${art.name}" width="${w}" height="${h}"/></svg></div></figure>`;
}

function copyButton(site, label, cls) {
  return [
    `<button class="btn ${cls}" type="button" data-email="${esc(site.contact.email)}" data-copy-email><span data-copy-label>${label}</span></button>`,
    `<a class="nojs-only btn ${cls}" href="${esc(site.contact.linkedin)}" rel="noopener">Message me on LinkedIn</a>`,
    '<span class="copy-status t-note" aria-live="polite" aria-atomic="true"></span>',
  ];
}

function runningHead(model, site) {
  const dept = site.consulting;
  const front = model.page === dept.page;
  const title = front ? esc(dept.name) : `<a href="${esc(dept.page)}">${esc(dept.name)}</a><span aria-hidden="true"> &middot; </span>${esc(fmText(model.data.title))}`;
  return `<div class="rh rh--verso t-folio"><span class="rh-pg">${esc(dept.num)}</span><span class="rh-title">${title}</span><span class="rh-pub">${PUB(site)}</span></div>`;
}

// The opener: kicker with the reading time, the headline, the deck, the
// front page's one orange button, and the engraving in its frame.
function opener(model, site, { cta = null, art = true } = {}) {
  const d = model.data;
  const lines = [
    '<header class="opener c-opener">',
    '  <div class="opener-copy">',
    `    <p class="t-kicker">${fmHtml(model, d.kicker)} &middot; <span data-read="consult-body">1</span> min read</p>`,
    `    <h1 class="opener-title">${fmHtml(model, d.headline || d.title)}</h1>`,
  ];
  if (d.deck) lines.push(`    <p class="t-deck">${fmHtml(model, d.deck)}</p>`);
  if (cta) lines.push('    <div class="c-ask">', ...copyButton(site, fmHtml(model, cta), 'btn--spot').map((l) => `      ${l}`), '    </div>');
  lines.push('  </div>');
  if (art && model.art) lines.push(`  ${artFigure(model.art, 'opener-art')}`);
  lines.push('</header>');
  return lines;
}

// Under each page but the front: the department's pages, with dot leaders
// and minutes to read, this one marked.
function contentsBox(model, all, site) {
  const rows = all.map((p) => {
    const here = p.page === model.page ? ' aria-current="page"' : '';
    return `    <li><a href="${esc(p.page)}"${here}><span class="row"><span class="name">${fmHtml(p, p.data.title)}</span><span class="lead"></span><span class="rt"><span data-read="${esc(p.page)}#consult-body">1</span> min</span></span><span class="desc t-small">${fmHtml(p, p.data.teaser)}</span></a></li>`;
  });
  const label = `In ${esc(site.consulting.num)} ${esc(site.consulting.name)}`;
  return ['<nav class="c-contents" aria-labelledby="c-contents-title">', `  <h2 class="t-kicker" id="c-contents-title">${label}</h2>`, '  <ol class="c-toc">', ...rows, '  </ol>', '</nav>'];
}

// The front page's way on: a teaser for each of the other pages.
function teasers(model, all) {
  const items = all.filter((p) => p.page !== model.page).map((p) => {
    const art = p.art ? `<div class="art" aria-hidden="true"><svg viewBox="${teaserCrop(p.art)}" preserveAspectRatio="xMidYMid slice"><use href="#art-${p.art.name}" width="${artSize(p.art.name)[0]}" height="${artSize(p.art.name)[1]}"/></svg></div>` : '';
    return `    <li class="teaser">${art}<span class="t-kicker">${fmHtml(p, p.data.kicker)} &middot; <span data-read="${esc(p.page)}#consult-body">1</span> min</span><h3 class="teaser-title">${fmHtml(p, p.data.title)}</h3><p class="t-small t-quiet">${fmHtml(p, p.data.teaser)}</p><a class="btn btn--text" href="${esc(p.page)}">Read<span class="visually-hidden"> ${fmHtml(p, p.data.title)}</span> ${ICO}</a></li>`;
  });
  return ['<section class="c-more" aria-labelledby="c-more-title">', '  <h2 class="t-kicker" id="c-more-title">Also in Consulting</h2>', '  <ul class="teasers">', ...items, '  </ul>', '</section>'];
}

// A teaser shows the page's own crop at 4:3, widened or heightened about its centre.
function teaserCrop(art) {
  const [x, y, w, h] = art.box.split(' ').map(Number);
  const cx = x + w / 2;
  const cy = y + h / 2;
  const [tw, th] = w / h > 4 / 3 ? [w, w * 3 / 4] : [h * 4 / 3, h];
  return [cx - tw / 2, cy - th / 2, tw, th].map((v) => Math.round(v)).join(' ');
}

// The blocks before the first ## and each ## with the blocks under it.
function sections(blocks) {
  const intro = [];
  const parts = [];
  for (const b of blocks) {
    if (b.type === 'h2') parts.push({ head: b, blocks: [] });
    else if (parts.length) parts[parts.length - 1].blocks.push(b);
    else intro.push(b);
  }
  return { intro, parts };
}

const indentLines = (lines, n) => lines.flatMap((l) => l.split('\n')).map((l) => (l ? ' '.repeat(n) + l : l));
const notesIn = (html) => [...html.matchAll(/href="#note-(\d+)"/g)].map((m) => Number(m[1]));

function frontMain(model, all, site) {
  const { intro, parts } = sections(model.doc.blocks);
  if (!intro.length || intro.some((b) => b.type !== 'p')) mdFail(model.file, model.bodyLine, 'the front page opens with its paragraphs, before any ##');
  const body = [`<div class="c-text">`, ...intro.map((b, i) => `  <p${i ? '' : ' class="dropcap"'}>${b.html}</p>`), '</div>'];
  for (const part of parts) {
    const id = slugify(part.head.text);
    const only = part.blocks.length === 1 ? part.blocks[0].type : null;
    if (only === 'dl') {
      body.push(`<aside class="c-glance" aria-labelledby="${id}">`, `  <h2 class="t-kicker" id="${id}">${part.head.html}</h2>`, '  <dl>', ...part.blocks[0].items.map((it) => `    <div><dt class="t-folio">${it.term}</dt><dd>${it.html}</dd></div>`), '  </dl>', '</aside>');
    } else if (only === 'ol') {
      body.push(`<section class="c-steps" aria-labelledby="${id}">`, `  <h2 class="c-h2" id="${id}">${part.head.html}</h2>`, '  <ol>', ...part.blocks[0].items.map((it, i) => `    <li><span class="n" aria-hidden="true">${String(i + 1).padStart(2, '0')}</span><p>${it.html}</p></li>`), '  </ol>', '</section>');
    } else {
      body.push(`<section class="c-sec" aria-labelledby="${id}">`, `  <h2 class="c-h2" id="${id}">${part.head.html}</h2>`, ...indentLines(part.blocks.map(renderBlock), 2), '</section>');
    }
  }
  const html = withEndMark(body.join('\n'));
  return [
    '<div class="wrap">',
    `  ${runningHead(model, site)}`,
    ...indentLines(opener(model, site, { cta: model.data.cta }), 2),
    '  <div class="c-body c-body--front" id="consult-body">',
    ...indentLines([html], 4),
    '  </div>',
    ...indentLines(teasers(model, all), 2),
    '</div>',
  ];
}

function rateCardMain(model, all, site) {
  const d = model.data;
  const rate = esc(d.rate);
  if (!model.art || model.art.name !== 'marigold') mdFail(model.file, 0, 'the rate card shows the marigold plate, e.g. art: marigold 10 -14 140 175');
  if (d.currency !== 'USD') mdFail(model.file, 0, 'the card prints a dollar sign, so the currency is USD');
  const [w, h] = artSize('marigold');
  const label = model.art.alt ? ` role="img" aria-label="${esc(model.art.alt)}"` : ' aria-hidden="true"';
  const rows = d.lines.map((line) => `        <div class="rc-row"><dt>${fmHtml(model, line.name)}</dt><dd class="rc-terms"><span>${fmHtml(model, line.terms)}</span></dd>${line.note ? `<dd class="rc-note">${fmHtml(model, line.note)}</dd>` : ''}</div>`);
  const card = [
    '<section class="rate-card insert" data-edition="day" data-insert aria-labelledby="rc-name">',
    `  <div class="rc-top"><h2 class="t-folio" id="rc-name">${fmHtml(model, d.title)}</h2><span class="t-folio">No. ${esc(d.card_no)} &middot; ${esc(site.issue.season)}</span></div>`,
    '  <div class="rc-grid">',
    '    <figure class="rc-plate">',
    `      <div class="rc-frame"><div class="art"><svg viewBox="${model.art.box}" preserveAspectRatio="xMidYMid meet"${label}><use href="#art-marigold" width="${w}" height="${h}"/></svg></div><span class="xh xh--tl" aria-hidden="true"></span><span class="xh xh--tr" aria-hidden="true"></span><span class="xh xh--bl" aria-hidden="true"></span><span class="xh xh--br" aria-hidden="true"></span></div>`,
    `      <p class="rc-seal"><span class="seal-in"><b>${fmHtml(model, d.seal_value)}</b> <small>${fmHtml(model, d.seal_label)}</small></span></p>`,
    '    </figure>',
    '    <div class="rc-price">',
    '      <p class="t-kicker">The rate</p>',
    `      <p class="rc-rate"><span class="rc-cur">$</span>${rate}<span class="rc-unit"> ${fmHtml(model, d.unit_text)}</span></p>`,
    '      <dl class="rc-list">',
    ...rows,
    '      </dl>',
    '    </div>',
    '  </div>',
    '  <div class="rc-foot">',
    '    <div class="c-ask">',
    ...copyButton(site, fmHtml(model, d.cta), 'btn--spot').map((l) => `      ${l}`),
    '    </div>',
    `    <p class="rc-url t-note">${esc(model.url.replace('https://', ''))}</p>`,
    `    <p class="rc-small t-note">${fmHtml(model, d.small_print)}</p>`,
    '  </div>',
    '</section>',
  ];
  const { intro, parts } = sections(model.doc.blocks);
  const below = [...intro.map(renderBlock)];
  for (const part of parts) below.push(`<h2 class="c-h2" id="${slugify(part.head.text)}">${part.head.html}</h2>`, ...part.blocks.map(renderBlock));
  return [
    '<div class="wrap">',
    `  ${runningHead(model, site)}`,
    ...indentLines(opener(model, site, { art: false }), 2),
    '</div>',
    '<div id="consult-body">',
    // The scallop the seal is cut from (the cover's, kit.html).
    '  <svg class="art-defs" width="0" height="0" aria-hidden="true" focusable="false"><defs><clipPath id="scallop" clipPathUnits="objectBoundingBox"><path d="M0.5 0 L0.56 0.07 L0.64 0.03 L0.69 0.11 L0.78 0.1 L0.8 0.19 L0.89 0.21 L0.88 0.3 L0.96 0.35 L0.92 0.43 L1 0.5 L0.92 0.57 L0.96 0.65 L0.88 0.7 L0.89 0.79 L0.8 0.81 L0.78 0.9 L0.69 0.89 L0.64 0.97 L0.56 0.93 L0.5 1 L0.44 0.93 L0.36 0.97 L0.31 0.89 L0.22 0.9 L0.2 0.81 L0.11 0.79 L0.12 0.7 L0.04 0.65 L0.08 0.57 L0 0.5 L0.08 0.43 L0.04 0.35 L0.12 0.3 L0.11 0.21 L0.2 0.19 L0.22 0.1 L0.31 0.11 L0.36 0.03 L0.44 0.07 Z"/></clipPath></defs></svg>',
    '  <div class="wrap rc-wrap">',
    ...indentLines(card, 4),
    '  </div>',
    '  <div class="wrap c-text c-after">',
    ...indentLines([withEndMark(below.join('\n'))], 4),
    '  </div>',
    '</div>',
    '<div class="wrap">',
    ...indentLines(contentsBox(model, all, site), 2),
    '</div>',
  ];
}

function numberedMain(model, all, site) {
  const { intro, parts } = sections(model.doc.blocks);
  if (!parts.length) mdFail(model.file, model.bodyLine, 'the numbered template makes an entry of each ##');
  const entries = parts.map((part, i) => {
    const [scene, ...record] = part.blocks;
    if (!scene || scene.type !== 'p' || !record.some((b) => b.type === 'p')) mdFail(model.file, part.head.line, 'each entry is a scene paragraph, then the record');
    const text = [`<p class="entry-scene">${scene.html}</p>`, '<div class="entry-record">', ...indentLines(record.map(renderBlock), 2), '</div>'];
    const own = notesIn(text.join('\n'));
    const notes = model.doc.notes.filter((nt) => own.includes(nt.n));
    const n = String(i + 1).padStart(2, '0');
    return [
      `<li class="entry" id="${slugify(part.head.text)}">`,
      `  <span class="entry-n" aria-hidden="true">${n}</span>`,
      `  <h2 class="entry-title">${part.head.html}</h2>`,
      '  <div class="entry-text">',
      ...indentLines(text, 4),
      '  </div>',
      ...(notes.length ? [`  <aside class="entry-notes" aria-label="Sources for ${n}">`, ...indentLines([renderNotes(notes, { start: notes[0].n })], 4), '  </aside>'] : []),
      '</li>',
    ];
  });
  return [
    '<div class="wrap">',
    `  ${runningHead(model, site)}`,
    ...indentLines(opener(model, site), 2),
    '  <div class="c-body" id="consult-body">',
    ...indentLines(intro.map(renderBlock), 4),
    '    <ol class="entries">',
    ...indentLines(entries.flat(), 6),
    '    </ol>',
    `    ${closing(model)}`,
    '  </div>',
    ...indentLines(wayOn(model, all, site), 2),
    '</div>',
  ];
}

// The closing line, with the end mark.
function closing(model) {
  return withEndMark(`<p class="c-close">${fmHtml(model, model.data.close)}</p>`);
}

// After the piece: a text button to the rate card, then the contents box.
function wayOn(model, all, site) {
  const card = all.find((p) => p.data.template === 'rate-card');
  const button = card && card !== model ? [`<p class="c-on"><a class="btn btn--text" href="${esc(card.page)}">${fmHtml(card, card.data.title)} ${ICO}</a></p>`] : [];
  return [...button, ...contentsBox(model, all, site)];
}

function essayMain(model, all, site) {
  const blocks = model.doc.blocks;
  const firstH2 = blocks.findIndex((b) => b.type === 'h2');
  const essay = firstH2 < 0 ? blocks : blocks.slice(0, firstH2);
  const rest = firstH2 < 0 ? [] : blocks.slice(firstH2);
  const parts = [];
  let first = true;
  for (const b of essay) {
    if (b.type === 'h2') continue;
    if (b.type === 'h3') {
      parts.push([`<section class="c-part" aria-labelledby="${slugify(b.text)}">`, `  <h2 class="t-kicker" id="${slugify(b.text)}">${b.html}</h2>`]);
      continue;
    }
    if (!parts.length) parts.push(['<section class="c-part">']);
    const html = b.type === 'p' && first ? `<p class="dropcap">${b.html}</p>` : renderBlock(b);
    if (b.type === 'p') first = false;
    parts[parts.length - 1].push(...indentLines([html], 2));
  }
  parts.forEach((p) => p.push('</section>'));
  const after = [];
  for (const part of sections(rest).parts) {
    const id = slugify(part.head.text);
    const only = part.blocks.length === 1 && part.blocks[0].type === 'dl' ? part.blocks[0] : null;
    if (only) {
      after.push(`<section class="c-work" aria-labelledby="${id}">`, `  <h2 class="c-h2" id="${id}">${part.head.html}</h2>`, '  <dl class="c-worklist">', ...only.items.map((it) => `    <div><dt>${it.term}</dt><dd>${it.html}</dd></div>`), '  </dl>', '</section>');
    } else {
      after.push(`<section class="c-sec" aria-labelledby="${id}">`, `  <h2 class="c-h2" id="${id}">${part.head.html}</h2>`, ...indentLines(part.blocks.map(renderBlock), 2), '</section>');
    }
  }
  return [
    '<div class="wrap">',
    `  ${runningHead(model, site)}`,
    ...indentLines(opener(model, site), 2),
    '  <div class="c-body" id="consult-body">',
    '    <div class="c-parts">',
    ...indentLines(parts.flat(), 6),
    '    </div>',
    ...indentLines(after, 4),
    `    ${closing(model)}`,
    '  </div>',
    ...indentLines(wayOn(model, all, site), 2),
    '</div>',
  ];
}

const MAINS = { front: frontMain, 'rate-card': rateCardMain, numbered: numberedMain, essay: essayMain };

// Each template's own rules, written into its page's <style>. What two or
// more of the pages share is in site.css (05 Consulting).
const PAGE_CSS = {
  front: `
/* The front page: the text, and beside it what was tried first; how it
   starts, numbered; then the other three pages as teasers. */
.c-body--front { display: grid; gap: var(--space-6); padding-block: var(--space-6) var(--space-7); }
.c-glance dl { display: grid; margin-top: var(--space-2); border-top: 1px solid var(--ink-quiet); }
.c-glance dl > div { display: grid; gap: 0.2rem; padding-block: var(--space-3); border-bottom: var(--rule-hairline) solid var(--rule); }
.c-glance dt { color: var(--ink); }
.c-glance dd { font: var(--type-sidenote-weight) var(--type-sidenote-size) / var(--type-sidenote-line) var(--type-sidenote-family); text-wrap: pretty; }
.c-steps ol { list-style: none; display: grid; margin-top: var(--space-4); border-top: 1px solid var(--ink-quiet); }
.c-steps li { display: grid; grid-template-columns: 2.75rem minmax(0, 1fr); gap: var(--space-3); padding-block: var(--space-4); border-bottom: var(--rule-hairline) solid var(--rule); }
.c-steps .n { font: 300 2.25rem / 0.85 var(--font-display); font-variation-settings: 'SOFT' 100; font-feature-settings: 'lnum' 1; letter-spacing: -0.04em; color: var(--spot-large); }
.c-steps p { max-width: 30em; text-wrap: pretty; }
.c-steps strong { display: block; margin-bottom: var(--space-1); font: 480 1.25rem / 1.15 var(--font-display); font-variation-settings: 'SOFT' 30; letter-spacing: -0.01em; }
@media (min-width: 840px) {
  .c-steps ol { grid-template-columns: repeat(3, minmax(0, 1fr)); border-bottom: var(--rule-hairline) solid var(--rule); }
  .c-steps li { grid-template-columns: minmax(0, 1fr); align-content: start; padding: var(--space-4) var(--space-5) var(--space-5) 0; border-bottom: 0; }
  .c-steps li + li { padding-left: var(--space-5); border-left: var(--rule-hairline) solid var(--rule); }
}
@media (min-width: 1024px) {
  .c-body--front { grid-template-columns: repeat(12, minmax(0, 1fr)); column-gap: var(--layout-column-gap); row-gap: var(--space-8); }
  .c-body--front .c-text { grid-column: 1 / span 7; }
  .c-glance { grid-column: 9 / span 4; align-self: start; padding-left: var(--layout-column-gap); border-left: var(--rule-hairline) solid var(--rule); }
  .c-steps { grid-column: 1 / -1; }
}
`,
  'rate-card': `
/* The rate card: a seed-catalog price list on the paper stock (an insert,
   so paper in the Night edition and charcoal in the Day), one engraved
   plate with the free first conversation's seal on its corner, one number,
   four shapes on dot leaders, and the page's one orange button. */
.consult--rate-card .c-opener { padding-bottom: var(--space-5); }
.rc-wrap { padding-block: var(--space-6) var(--space-7); }
.rate-card { isolation: isolate; max-width: 64rem; margin-inline: auto; padding: var(--space-3) clamp(1.25rem, 4vw, 3rem) clamp(1.25rem, 3.5vw, 2.5rem); border-top: var(--rule-double) var(--ink); overflow: visible; }
.rate-card::after { z-index: -1; }
.rc-top { display: flex; align-items: baseline; justify-content: space-between; gap: var(--space-3); padding-block: var(--space-2); border-bottom: var(--rule-hairline) solid var(--ink); }
.rc-top .t-folio { color: var(--ink); }
.rc-top h2 { font-weight: 600; }
.rc-grid { display: grid; gap: var(--space-7); padding-block: var(--space-6) var(--space-6); }

/* The plate: the marigold on its dark ground, in a hairline frame with a
   crosshair at each corner, the way a catalog engraves one bloom. */
.rc-plate { position: relative; align-self: start; padding: 0.75rem; }
.rc-frame { position: relative; padding: 5px; border: 1px solid var(--ink); color: var(--ink); }
.rc-frame .art { aspect-ratio: 4 / 3; background: var(--art-ground); print-color-adjust: exact; -webkit-print-color-adjust: exact; }
.rc-frame svg { width: 100%; height: 100%; padding: 6% 8%; }
.rc-frame .xh--tl { left: -0.75rem; top: -0.75rem; } .rc-frame .xh--tr { left: calc(100% + 0.75rem); top: -0.75rem; }
.rc-frame .xh--bl { left: -0.75rem; top: calc(100% + 0.75rem); } .rc-frame .xh--br { left: calc(100% + 0.75rem); top: calc(100% + 0.75rem); }
.rc-frame .xh { print-color-adjust: exact; -webkit-print-color-adjust: exact; }

/* The seal: the cover's scallop (orange rim, green face, dashed ring),
   carrying the free first conversation. It bites the plate's corner. Its
   label never drops under 12px and stays inside the ring. */
.rc-seal { position: absolute; right: -1.25rem; bottom: -2.75rem; z-index: 3; width: 8rem; aspect-ratio: 1; container-type: inline-size; display: grid; place-items: center; text-align: center; color: var(--palette-char); transform: rotate(-9deg); print-color-adjust: exact; -webkit-print-color-adjust: exact; }
.rc-seal::before, .rc-seal::after { content: ""; position: absolute; clip-path: url(#scallop); z-index: -1; }
.rc-seal::before { inset: -5%; background: var(--palette-toxic-orange); }
.rc-seal::after { inset: 0; background: var(--palette-goody-gumdrop); }
.rc-seal .seal-in { display: grid; place-items: center; align-content: center; gap: 0.2em; width: 84%; aspect-ratio: 1; border-radius: 50%; border: 1px dashed currentColor; }
.rc-seal b { font: 600 calc(26cqi - 2px) / 0.9 var(--font-display); font-variation-settings: 'SOFT' 100; letter-spacing: -0.03em; }
.rc-seal small { max-width: 74%; font: 600 max(0.75rem, 9.6cqi) / 1.1 var(--font-label); letter-spacing: 0.04em; text-transform: uppercase; font-stretch: 82%; }

/* The one number, its dollar sign raised like a menu card's, its unit small. */
.rc-price { display: grid; align-content: start; justify-items: start; min-width: 0; }
.rc-rate { margin-top: var(--space-3); font: 300 clamp(5rem, 10vw, 8.5rem) / 0.86 var(--font-display); font-variation-settings: 'SOFT' 0; font-feature-settings: 'lnum' 1; letter-spacing: -0.04em; white-space: nowrap; }
.rc-cur { font-size: 0.42em; letter-spacing: 0; vertical-align: 0.95em; margin-right: 0.04em; }
.rc-unit { font: 420 0.3em / 1 var(--font-display); font-variation-settings: 'SOFT' 50; letter-spacing: 0; color: var(--spot); }

/* The price list: a real list of terms, in reading order, on dot leaders.
   A shape whose name and terms will not share a line puts its terms on the
   next one, still on a leader, still flush right. */
.rc-list { width: 100%; margin-top: var(--space-5); border-top: 1px solid var(--ink); }
.rc-row { display: flex; flex-wrap: wrap; align-items: baseline; padding-block: var(--space-3); border-bottom: var(--rule-hairline) solid var(--rule); }
.rc-row dt { flex: 0 1 auto; font: 400 1.3125rem / 1.2 var(--font-display); font-variation-settings: 'SOFT' 30; letter-spacing: -0.01em; text-wrap: balance; }
.rc-terms { flex: 1 1 auto; display: flex; align-items: baseline; min-width: 0; }
.rc-terms::before { content: ""; flex: 1 1 1rem; min-width: 1rem; margin-inline: 0.5rem; border-bottom: 2px dotted var(--ink-quiet); }
.rc-terms span { flex: 0 1 auto; text-align: right; font: 600 0.75rem / 1.35 var(--font-label); letter-spacing: 0.1em; text-transform: uppercase; font-stretch: 85%; text-wrap: balance; }
.rc-note { flex-basis: 100%; margin-top: 0.25rem; font: var(--type-sidenote-weight) var(--type-sidenote-size) / var(--type-sidenote-line) var(--type-sidenote-family); color: var(--ink-quiet); text-wrap: pretty; }

/* The foot: the button, and the small print. */
.rc-foot { display: grid; gap: var(--space-3) var(--space-5); padding-top: var(--space-4); border-top: var(--rule-hairline) solid var(--ink); }
.rc-foot .c-ask { margin-top: 0; }
.rc-small { color: var(--ink); }
.rc-url { display: none; }

@media (min-width: 600px) {
  .rc-grid { grid-template-columns: minmax(0, 5fr) minmax(0, 7fr); column-gap: clamp(2.5rem, 6vw, 4.5rem); }
  .rc-frame .art { aspect-ratio: 4 / 5; }
  .rc-seal { width: clamp(8rem, 15vw, 9.5rem); right: -2.25rem; bottom: -2.25rem; }
  .rc-price { padding-left: clamp(1.25rem, 3vw, 2.25rem); border-left: var(--rule-hairline) solid var(--rule); }
  .rc-foot { grid-template-columns: auto minmax(0, 1fr); align-items: center; }
  .rc-small { justify-self: end; text-align: right; }
}
@media (min-width: 600px) and (max-width: 839px) { .rc-rate { font-size: 4.5rem; } }
@media (max-width: 599px) {
  .rc-plate { padding-inline: 0.75rem; }
  .rc-seal { right: -0.25rem; bottom: -2.25rem; }
  /* The bloom sits left of centre, so the seal bites the ground, not the flower. */
  .rc-frame svg { padding: 6% 20% 6% 4%; }
  .rc-price { margin-top: var(--space-5); }
  .rc-foot .btn { width: 100%; min-inline-size: 0; }
}
@media (max-width: 359px) { .rc-rate { font-size: 4.25rem; } }

/* Print: the card alone, on one Letter page, in Day ink on paper. The
   button gives way to the page's address. */
@media print {
  @page { size: Letter; margin: 0.6in; }
  main.consult { padding: 0; }
  .consult--rate-card .rh, .consult--rate-card .c-opener, .c-after, .c-contents, .c-on, .rc-foot .c-ask { display: none !important; }
  .rc-wrap { width: auto; padding: 0; }
  .rate-card { max-width: none; padding: 0; break-inside: avoid; }
  .rc-grid { grid-template-columns: minmax(0, 5fr) minmax(0, 7fr); column-gap: 0.5in; }
  /* The card meets the page margin, which print clips: the left crosshairs
     keep their whole arms on the card. */
  .rc-plate { padding-left: 1.25rem; }
  .rc-frame .art { aspect-ratio: 4 / 5; }
  .rc-seal { width: 1.35in; right: -0.35in; bottom: -0.35in; }
  .rc-price { padding-left: 0.3in; border-left: var(--rule-hairline) solid var(--rule); }
  .rc-rate { font-size: 76pt; }
  .rc-foot { grid-template-columns: auto minmax(0, 1fr); align-items: baseline; }
  .rc-url { display: block; color: var(--ink); }
}
`,
  numbered: `
/* What to call me about: each ## an entry with a soft numeral; the scene,
   then the record, its source in the margin (after the text on phones). */
.entries { list-style: none; border-top: var(--rule-double) var(--rule); }
.entry { display: grid; grid-template-columns: 2.75rem minmax(0, 1fr); column-gap: var(--space-4); row-gap: var(--space-3); padding-block: var(--space-5) var(--space-6); border-bottom: var(--rule-hairline) solid var(--rule); }
.entry > * { grid-column: 2; }
.entry .entry-n { grid-column: 1; grid-row: 1 / span 2; font: 300 clamp(2.25rem, 4vw, 3.25rem) / 0.85 var(--font-display); font-variation-settings: 'SOFT' 100; font-feature-settings: 'lnum' 1; letter-spacing: -0.04em; color: var(--spot-large); }
.entry-title { font: 360 clamp(1.5rem, 2.4vw, 2rem) / 1.08 var(--font-display); font-variation-settings: 'SOFT' 50; letter-spacing: -0.02em; text-wrap: balance; }
.entry-text { display: grid; gap: var(--space-3); }
.entry-text p { max-width: 34em; hyphens: auto; -webkit-hyphens: auto; hyphenate-limit-chars: 7 3 3; text-wrap: pretty; }
.entry-scene { font: italic var(--type-deck-weight) var(--type-deck-size) / var(--type-deck-line) var(--font-text); }
.entry-record { display: grid; gap: 0.75em; }
.entry-record strong { font-weight: 600; color: var(--spot); white-space: nowrap; }
.entry .pull { margin: var(--space-2) 0 0; }
.entry .pull p { font-size: clamp(1.375rem, 2.2vw, 1.75rem); }
.entry-notes { padding-top: var(--space-2); }
.entry-notes .notes li { grid-template-columns: 1.6rem minmax(0, 1fr); }
@media (min-width: 840px) {
  .entry-text { grid-template-columns: minmax(0, 5fr) minmax(0, 7fr); column-gap: var(--layout-text-columns-gap); align-items: start; }
  .entry .pull { grid-column: 1 / -1; }
}
@media (min-width: 1024px) {
  .entry { grid-template-columns: repeat(12, minmax(0, 1fr)); column-gap: var(--layout-column-gap); }
  .entry > * { grid-column: 2 / span 8; }
  .entry .entry-n { grid-column: 1; }
  .entry .entry-notes { grid-column: 10 / span 3; grid-row: 1 / span 2; padding: 0 0 0 var(--layout-column-gap); border-left: var(--rule-hairline) solid var(--rule); }
}
`,
  essay: `
/* Where I'm from: short sections under kicker titles in two ragged
   columns, then the selected work in the At a glance style. */
.c-parts { padding-block: var(--space-5) var(--space-6); }
.c-part { break-inside: avoid; padding-bottom: var(--space-5); }
.c-part h2 { margin-bottom: var(--space-2); }
.c-work { padding-top: var(--space-6); border-top: var(--rule-double) var(--rule); }
.c-worklist { margin-top: var(--space-4); border-top: 1px solid var(--ink-quiet); }
.c-worklist > div { display: grid; grid-template-columns: minmax(0, 1fr); gap: 0.15rem; padding-block: var(--space-3); border-bottom: var(--rule-hairline) solid var(--rule); }
.c-worklist dt { font: 480 1.1875rem / 1.2 var(--font-display); font-variation-settings: 'SOFT' 30; letter-spacing: -0.01em; }
.c-worklist dd { font: var(--type-body-sm-weight) var(--type-body-sm-size) / var(--type-body-sm-line) var(--type-body-sm-family); text-wrap: pretty; }
@media (min-width: 600px) { .c-worklist > div { grid-template-columns: 10rem minmax(0, 1fr); gap: var(--space-4); align-items: baseline; } }
@media (min-width: 840px) { .c-parts { columns: 2; column-gap: calc(2 * var(--layout-text-columns-gap)); column-rule: var(--rule-hairline) solid var(--rule); } }
@media (min-width: 1024px) { .c-worklist { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); column-gap: var(--space-7); } }
`,
};

// The practice, as structured data: who offers it and the two prices on
// the card, both read from the rate card's front matter.
function serviceNode(all, site) {
  const front = all.find((p) => p.page === site.consulting.page);
  const card = all.find((p) => p.data.template === 'rate-card');
  if (!front || !card) return null;
  const ben = { '@id': `${SITE_URL}#ben` };
  const free = card.data.lines.find((l) => /^free$/i.test(l.terms));
  const offers = [];
  if (free) offers.push({ '@type': 'Offer', name: fmText(free.name), price: 0, priceCurrency: card.data.currency, itemOffered: { '@type': 'Service', name: fmText(free.name), provider: ben } });
  offers.push({
    '@type': 'Offer', name: `${fmText(front.data.service)}, by the hour`,
    priceSpecification: { '@type': 'UnitPriceSpecification', price: Number(card.data.rate), priceCurrency: card.data.currency, unitCode: card.data.unit_code, unitText: fmText(card.data.unit_text).replace(/^an? /, '') },
    itemOffered: { '@type': 'Service', name: fmText(front.data.service), serviceType: fmText(front.data.service), provider: ben },
  });
  return {
    '@type': 'ProfessionalService',
    '@id': `${front.url}#service`,
    name: `${site.name} · ${site.consulting.name}`,
    url: front.url,
    description: fmText(front.data.description),
    founder: ben,
    currenciesAccepted: card.data.currency,
    makesOffer: offers,
  };
}

function jsonLd(model, all, site) {
  const page = {
    '@type': 'WebPage',
    '@id': `${model.url}#page`,
    url: model.url,
    name: fmText(model.data.title),
    headline: fmText(model.data.headline || model.data.title),
    description: fmText(model.data.description),
    inLanguage: 'en',
    dateModified: model.data.updated,
    isPartOf: { '@id': `${SITE_URL}#website` },
    author: { '@id': `${SITE_URL}#ben` },
  };
  const service = serviceNode(all, site);
  if (service) page.about = { '@id': service['@id'] };
  const graph = [page];
  if (service && (model.page === site.consulting.page || model.data.template === 'rate-card')) graph.push(service);
  return JSON.stringify({ '@context': 'https://schema.org', '@graph': graph }, null, 2).split('\n');
}

// The page's share card, from generate-og-images.js (npm run generate-og).
// Every consulting page has one; its alt text is the card's own.
function shareCard(model) {
  const { CARDS, ALT, W, H } = require('./generate-og-images');
  const card = CARDS.find((c) => c.page === model.page);
  if (!card) mdFail(model.file, 0, `${model.page} has no share card; add one to CARDS in generate-og-images.js and run npm run generate-og`);
  return { url: `${SITE_URL}images/${card.file}`, width: W, height: H, alt: ALT(card) };
}

function pageTitle(model, site) {
  const title = fmText(model.data.title);
  return model.page === site.consulting.page ? `${title} · ${site.name}` : `${title} · ${site.consulting.name} · ${site.name}`;
}

// A whole page: the shell, the markers the press fills, and the template's main.
function renderPage(model, all, site) {
  const d = model.data;
  const title = esc(pageTitle(model, site));
  const description = esc(fmText(d.description));
  const art = [...new Set([model.art && model.art.name, ...(d.template === 'front' ? all.filter((p) => p !== model && p.art).map((p) => p.art.name) : [])].filter(Boolean))];
  const css = PAGE_CSS[d.template].trim().split('\n');
  const main = MAINS[d.template](model, all, site);
  const card = shareCard(model);
  return [
    '<!DOCTYPE html>',
    '<html lang="en">',
    '<head>',
    '  <meta charset="UTF-8">',
    '  <meta name="viewport" content="width=device-width, initial-scale=1.0">',
    `  <!-- Made by build-pages.js from ${model.file}. Edit the Markdown, then run \`npm run pages\`. -->`,
    `  <title>${title}</title>`,
    `  <meta name="description" content="${description}">`,
    ...(model.index ? [] : ['  <meta name="robots" content="noindex">']),
    '',
    '  <!-- Open Graph -->',
    `  <meta property="og:title" content="${title}">`,
    `  <meta property="og:description" content="${description}">`,
    '  <meta property="og:type" content="website">',
    `  <meta property="og:url" content="${model.url}">`,
    `  <meta property="og:image" content="${card.url}">`,
    `  <meta property="og:image:width" content="${card.width}">`,
    `  <meta property="og:image:height" content="${card.height}">`,
    `  <meta property="og:image:alt" content="${esc(card.alt)}">`,
    '',
    '  <!-- Twitter Card -->',
    '  <meta name="twitter:card" content="summary_large_image">',
    `  <meta name="twitter:title" content="${title}">`,
    `  <meta name="twitter:description" content="${description}">`,
    `  <meta name="twitter:image" content="${card.url}">`,
    '',
    `  <link rel="canonical" href="${model.url}">`,
    `  <link rel="alternate" type="text/markdown" href="content/consulting/${model.name}">`,
    '  <!-- chrome:head -->',
    '  <!-- /chrome:head -->',
    '',
    '  <script type="application/ld+json">',
    ...jsonLd(model, all, site).map((l) => `  ${l}`),
    '  </script>',
    '  <style>',
    ...css.map((l) => (l ? `    ${l}` : l)),
    '  </style>',
    '</head>',
    '<body>',
    '  <!-- chrome:top -->',
    '  <!-- /chrome:top -->',
    `  <!-- chrome:art ${JSON.stringify({ art })} -->`,
    '  <!-- /chrome:art -->',
    '',
    `  <main id="main" class="consult consult--${d.template}">`,
    ...indentLines(main, 4),
    '  </main>',
    '',
    '  <!-- chrome:colophon -->',
    '  <!-- /chrome:colophon -->',
    '  <!-- chrome:script -->',
    '  <!-- /chrome:script -->',
    '</body>',
    '</html>',
    '',
  ].join('\n');
}

// Every consulting page, rendered: [{ page, html, model }].
function markdownPages() {
  const site = loadSite();
  const all = loadSources();
  if (!all.length) return [];
  const pages = new Set(all.map((p) => p.page));
  const exists = (target) => pages.has(target) || fs.existsSync(path.join(ROOT, target));
  for (const model of all) {
    model.ctx = { exists, notes: { order: [], lines: new Map() } };
    model.doc = parseMarkdown(model.file, model.body, { firstLine: model.bodyLine, exists });
  }
  return all.map((model) => ({ page: model.page, html: renderPage(model, all, site), model }));
}

// ------------------------------------------------------------------ CLI ----

function chromePages() {
  return fs.readdirSync(ROOT).filter((f) => f.endsWith('.html')).sort()
    .filter((f) => /<!-- chrome:[a-z]+/.test(fs.readFileSync(path.join(ROOT, f), 'utf8')));
}

// The consulting pages also own one block of sitemap.xml and one section of
// llms.txt, written from their front matter; a page with "index: false" is
// left out of both (and carries noindex).
const SITEMAP_START = '  <!-- consulting:start (written by build-pages.js from content/consulting) -->';
const SITEMAP_END = '  <!-- consulting:end -->';

function withSitemap(xml, models) {
  const at = xml.indexOf(SITEMAP_START);
  let out = xml;
  if (at >= 0) {
    const end = xml.indexOf(SITEMAP_END, at);
    if (end < 0) throw new Error('sitemap.xml: the consulting block is never closed');
    out = xml.slice(0, at) + xml.slice(end + SITEMAP_END.length + 1);
  }
  const listed = models.filter((m) => m.index);
  if (!listed.length) return out;
  if (!out.includes('</urlset>')) throw new Error('sitemap.xml has no </urlset>');
  const urls = listed.map((m) => ['  <url>', `    <loc>${m.url}</loc>`, `    <lastmod>${m.data.updated}</lastmod>`, '    <changefreq>monthly</changefreq>', `    <priority>${m.order === 1 ? '0.8' : '0.6'}</priority>`, '  </url>']);
  return out.replace('</urlset>', [SITEMAP_START, ...urls.flat(), SITEMAP_END, '</urlset>'].join('\n'));
}

function withLlms(text, models, site) {
  const head = `## ${site.consulting.name}`;
  const out = text.replace(new RegExp(`\n${head}\n[\\s\\S]*?(?=\n## |$)`), '');
  const listed = models.filter((m) => m.index);
  if (!listed.length) return out;
  const at = out.indexOf('\n## Optional');
  if (at < 0) throw new Error('llms.txt: the Consulting section goes before ## Optional, and there is none');
  const lines = listed.map((m) => `- [${fmText(m.data.title)}](${m.url}): ${fmText(m.data.llms || m.data.description)} Markdown: ${m.md}`);
  const section = [head, '', fmText(site.consulting.summary), '', ...lines, ''].join('\n');
  return `${out.slice(0, at + 1)}${section}\n${out.slice(at + 1)}`;
}

// Every file the press owns, as it would write it: { page, current, next }.
// next is null for a consulting page whose Markdown is gone: it is deleted.
function plan() {
  const site = loadSite();
  const theme = require('./build-tokens').loadTheme();
  const rendered = markdownPages();
  const sources = new Map(rendered.map((r) => [r.page, r.html]));
  const read = (file) => (fs.existsSync(path.join(ROOT, file)) ? fs.readFileSync(path.join(ROOT, file), 'utf8') : '');
  const out = rendered.map(({ page, html }) => ({ page, current: read(page), next: stamp(page, html, { site, theme, sources }) }));
  for (const page of chromePages()) {
    if (sources.has(page)) continue;
    const current = read(page);
    if (/^consulting(-[a-z]+)*\.html$/.test(page) && current.includes('Made by build-pages.js from content/consulting/')) {
      out.push({ page, current, next: null });
      continue;
    }
    out.push({ page, current, next: stamp(page, current, { site, theme, sources }) });
  }
  const models = rendered.map((r) => r.model);
  for (const [file, make] of [['sitemap.xml', (t) => withSitemap(t, models)], ['llms.txt', (t) => withLlms(t, models, site)]]) {
    const current = read(file);
    out.push({ page: file, current, next: make(current) });
  }
  return out;
}

// Files whose committed bytes differ from what the press would write.
function check() {
  return plan().filter((p) => p.current !== p.next).map((p) => p.page);
}

function main(argv = process.argv.slice(2)) {
  const pages = plan();
  const stale = pages.filter((p) => p.current !== p.next);
  if (argv.includes('--check')) {
    if (stale.length) {
      process.stderr.write(`Stale: ${stale.map((p) => p.page).join(', ')}. Run \`npm run pages\`.\n`);
      process.exitCode = 1;
    }
    return;
  }
  for (const p of stale) {
    if (p.next === null) fs.unlinkSync(path.join(ROOT, p.page));
    else fs.writeFileSync(path.join(ROOT, p.page), p.next);
  }
  process.stdout.write(stale.length ? `Wrote ${stale.map((p) => `${p.page}${p.next === null ? ' (deleted)' : ''}`).join(', ')}\n` : `${pages.length} files up to date\n`);
}

module.exports = {
  parseHtml, decodeEntities, findAll, hasClass, textContent, words, readingMinutes,
  loadSite, stamp, check, plan, chromePages, regionsOf, blankRegions, validate, main,
  parseFrontMatter, parseMarkdown, renderMarkdown, markdownPages, loadSources, curly,
  REGIONS, PARAMS, COLOPHONS, WPM, CONTENT,
};

if (require.main === module) {
  try {
    main();
  } catch (err) {
    process.stderr.write(`${err.message}\n`);
    process.exitCode = 1;
  }
}
