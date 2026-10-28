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
//   colophon  colophon  "standard" (default), "home" or "supplement". Home
//                       and supplement carry the consulting line when
//                       site.json turns consulting on. Home also carries
//                       site.json's home note, Outside work line and
//                       contact line.
//   art       art       drawing names, e.g. ["marigold"].
//
// The press refuses unknown regions and keys, a region in the wrong place,
// a marker inside a script or style, an h1 inside a region, and an id that
// a region and the page both use. A page with top, colophon or script must
// have all three plus head; a page may carry head alone (orale.html).
//
// It also writes reading times: an element with data-read="ID" gets the
// minutes to read the element with that id on the same page, and
// data-read="page.html" the minutes for that page's <main>, at 230 words a
// minute, at least 1. Hidden copy (aria-hidden, svg, script, style and the
// phone-only .fold-short lines) is not counted.

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
const COLOPHONS = ['standard', 'home', 'supplement'];
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
  const consulting = site.consulting && site.consulting.enabled && (variant === 'home' || variant === 'supplement');
  if (consulting && !fs.existsSync(path.join(ROOT, site.consulting.page))) {
    throw new Error(`site.json turns consulting on, but ${site.consulting.page} does not exist`);
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
  // The consulting line: the home page and the consulting supplement only,
  // never the résumé, the tools or the writing.
  if (consulting) lines.push(`      <p class="t-small">Consulting: <a href="${root}${esc(site.consulting.page)}">strategy and operations for small companies</a>.</p>`);
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

    // Copy email: the address sits base64-encoded in data-email.
    const copyButton = document.querySelector('[data-copy-email]');
    if (copyButton) {
      const label = copyButton.querySelector('[data-copy-label]');
      const original = label.textContent;
      const status = document.querySelector('.copy-status');
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
    }

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

function writeReadingTimes(page, html) {
  const doc = parseHtml(html);
  const cache = new Map();
  const minutes = (target) => {
    if (cache.has(target)) return cache.get(target);
    let node;
    if (target.endsWith('.html')) {
      const file = path.join(ROOT, target);
      if (!fs.existsSync(file)) fail(page, `data-read="${target}": no such page`);
      node = findAll(parseHtml(fs.readFileSync(file, 'utf8')), (el) => el.tag === 'main')[0];
      if (!node) fail(page, `data-read="${target}": that page has no <main>`);
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
function stamp(page, html, { site = loadSite(), theme = require('./build-tokens').loadTheme() } = {}) {
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
  out = writeReadingTimes(page, out);
  validate(page, out);
  return out;
}

// ------------------------------------------------- Markdown (step 5) ----
// The consulting pages arrive as Markdown in content/consulting/ and render
// to flat root pages (consulting.html, consulting-<slug>.html) that carry the
// same markers, so they go through stamp() like every hand-written page. The
// renderer plugs in here: markdownPages() returns [{ page, html }] for each
// source, already wrapped in the resource template. Until then there are none.
function markdownPages() {
  return [];
}

// ------------------------------------------------------------------ CLI ----

function chromePages() {
  return fs.readdirSync(ROOT).filter((f) => f.endsWith('.html')).sort()
    .filter((f) => /<!-- chrome:[a-z]+/.test(fs.readFileSync(path.join(ROOT, f), 'utf8')));
}

// Every page the press owns, as it would write it: { page, current, next }.
function plan() {
  const site = loadSite();
  const theme = require('./build-tokens').loadTheme();
  const rendered = markdownPages();
  const out = rendered.map(({ page, html }) => {
    const file = path.join(ROOT, page);
    return { page, current: fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : '', next: stamp(page, html, { site, theme }) };
  });
  for (const page of chromePages()) {
    if (rendered.some((r) => r.page === page)) continue;
    const current = fs.readFileSync(path.join(ROOT, page), 'utf8');
    out.push({ page, current, next: stamp(page, current, { site, theme }) });
  }
  return out;
}

// Pages whose committed bytes differ from what the press would write.
function check() {
  return plan().filter((p) => p.current !== p.next).map((p) => p.page);
}

function main(argv = process.argv.slice(2)) {
  const pages = plan();
  const stale = pages.filter((p) => p.current !== p.next);
  if (argv.includes('--check')) {
    if (stale.length) {
      process.stderr.write(`Stale chrome in ${stale.map((p) => p.page).join(', ')}. Run \`npm run pages\`.\n`);
      process.exitCode = 1;
    }
    return;
  }
  for (const p of stale) fs.writeFileSync(path.join(ROOT, p.page), p.next);
  process.stdout.write(stale.length ? `Stamped ${stale.map((p) => p.page).join(', ')}\n` : `${pages.length} pages up to date\n`);
}

module.exports = {
  parseHtml, decodeEntities, findAll, hasClass, textContent, words, readingMinutes,
  loadSite, stamp, check, plan, chromePages, regionsOf, blankRegions, validate, main,
  REGIONS, PARAMS, COLOPHONS, WPM,
};

if (require.main === module) {
  try {
    main();
  } catch (err) {
    process.stderr.write(`${err.message}\n`);
    process.exitCode = 1;
  }
}
