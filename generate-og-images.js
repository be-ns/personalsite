// Share cards: the 1200x630 picture a link to this site shows on LinkedIn,
// Slack, iMessage and the rest (npm run generate-og).
//
// One card system, not twenty one-offs. Every card is a page of the issue in
// miniature, set with the site's own tokens.css and site.css and drawn by
// headless Chromium from the HTML template below, so the fonts, colours and
// grain are the real ones:
//
//   - a bold colour field per department, in Ben's palette: Toxic Orange for
//     the cover (the home page) and any piece that opens on an orange band,
//     Goody Gumdrop for the Workshop tools, paper for Writing and the
//     résumé, charcoal with a ruffled orange rim for Consulting (the
//     nudibranch: dark ground, orange rim, a pale green line on it)
//   - a running head in Instrument Sans folio caps between hairlines, and a
//     foot with the address on a hairline running to a crosshair each end
//   - the department's numeral, large and soft, in the left wing
//   - the words in the middle: a kicker, the title (the nameplate cut for
//     the cover, the display caps on a colour field, a light headline or the
//     poem's own italic on paper), and one line a person scrolling on a
//     phone can read
//   - an engraving in a hairline frame with crosshair corners in the right
//     wing, drawn by generate-kit-art.js (a plate per tool, one for
//     Consulting, crops of the still life for Writing)
//
// The words stay inside x 300 to 900, so a square crop of the middle (some
// apps show 630x630) keeps all of them; the wings may go. The script fits
// each title to its column and refuses to write any card whose words leave
// the safe column, whose text overflows, or that is set in anything but
// Fraunces, Newsreader and Instrument Sans.
//
// The filenames are public URLs (og:image on every page), so they never
// change. Each card's alt text is ALT(card); the pages' og:image:alt must
// match it (test/og.test.js), and build-pages.js writes the Consulting
// pages' image tags from CARDS.
//
// Puppeteer and sharp are devDependencies (npm install). Set
// PUPPETEER_EXECUTABLE_PATH to use another Chrome. This file's top level
// needs neither, so build-pages.js and the tests can read CARDS.

const fs = require('fs');
const path = require('path');
const http = require('http');

const ROOT = __dirname;
const W = 1200;
const H = 630;
// A square crop of the middle keeps x 285 to 915; the words keep 15px clear.
const SAFE = [300, 900];
const SITE_URL = 'https://bensiverly.com';

// Departments: the field, its edition and its numeral.
const DEPTS = {
  cover: { field: 'field-spot', edition: 'night', num: '', name: 'The issue' },
  workshop: { field: 'field-leaf', edition: 'night', num: '03', name: 'Workshop' },
  writing: { field: 'paper', edition: 'day', num: '04', name: 'Writing' },
  band: { field: 'field-spot', edition: 'night', num: '04', name: 'Writing' },
  proof: { field: 'paper', edition: 'day', num: '', name: 'Résumé' },
  consulting: { field: 'charcoal', edition: 'night', num: '05', name: 'Consulting' },
};

// What each engraving shows, for the alt text.
const ART = {
  'still-life': 'marigolds and hanging amaranth in a stoneware jar',
  street: 'a street of apartment buildings with one window lit orange',
  marigold: 'a single marigold',
  poppy: 'California poppies',
  can: 'an orange watering can over a seedling',
  balance: 'a balance weighing a marigold against two weights',
  candle: 'a lit candle in a stoneware holder, a marigold laid beside it',
  trowel: 'a trowel left in the dirt beside a marigold seedling',
};

// The cards. page: the page that shows it. dept: a DEPTS key. kicker, title,
// line: the words (line may carry <br> where a poem breaks). title style:
// nameplate, display (caps), light, italic, name (the résumé's) or rate.
// art: [drawing, crop "x y w h"]; artAlt says what a crop shows. seal: [figure, second figure, label], the
// page's one seal, on the plate's corner (sealAt). rail: cover lines up the
// left wing. what: how the alt text names the page.
const CARDS = [
  {
    file: 'og-home.png', page: 'index.html', dept: 'cover', style: 'nameplate',
    kicker: 'Product, data and AI', title: 'Ben Siverly',
    line: 'Product manager, data scientist first.',
    art: ['still-life', '40 0 520 690'], seal: ['44%', '70%', 'Applications submitted'], sealAt: 'right: -24px; bottom: -46px',
    rail: ['The application nobody could finish', '44% to 70%'],
    what: 'the cover of Ben Siverly’s site, Issue 01, Autumn 2026',
  },
  {
    file: 'og-resume.png', page: 'resume.html', dept: 'proof', style: 'name',
    kicker: 'Résumé · one page · PDF', title: 'Ben Siverly',
    line: 'Product manager · Payments & money movement',
    art: ['street', '150 30 230 240'], artAlt: 'an apartment building with one window lit orange',
    rail: ['AppFolio', 'Lively', 'Oracle'],
    what: 'Ben Siverly’s résumé',
  },
  {
    file: 'og-native-plant-finder.png', page: 'native-plant-finder.html', dept: 'workshop', style: 'display',
    kicker: 'Free tool · no account', title: 'Native Plant Finder',
    line: 'Find native plants for your garden, by location and sun.',
    art: ['poppy', '0 0 200 240'], what: 'a free tool by Ben Siverly',
  },
  {
    file: 'og-life-strategy.png', page: 'life-strategy.html', dept: 'workshop', style: 'display',
    kicker: 'Free tool · no account', title: 'Life Strategy Matrix',
    line: 'See where your life is out of balance.',
    art: ['can', '0 0 240 200'], what: 'a free tool by Ben Siverly',
  },
  {
    file: 'og-decision-assist.png', page: 'decision-assist.html', dept: 'workshop', style: 'display',
    kicker: 'Free tool · no account', title: 'Decision Assist',
    line: 'Score your choices against what matters most.',
    art: ['balance', '0 0 220 220'], what: 'a free tool by Ben Siverly',
  },
  {
    file: 'og-memorial-pamphlet.png', page: 'memorial-pamphlet.html', dept: 'workshop', style: 'display',
    kicker: 'Free tool · no account', title: 'Memorial Pamphlet Creator',
    line: 'A simple, dignified pamphlet for a memorial service.',
    art: ['candle', '0 0 160 240'], what: 'a free tool by Ben Siverly',
  },
  {
    file: 'og-service-of-life.png', page: 'service-of-life.html', dept: 'workshop', style: 'display',
    kicker: 'Free tool · no account', title: 'Service of Life Builder',
    line: 'Build a liturgy for a memorial or celebration of life.',
    art: ['candle', '0 0 160 240'], what: 'a free tool by Ben Siverly',
  },
  {
    file: 'og-memorial-preferences.png', page: 'memorial-preferences.html', dept: 'workshop', style: 'display',
    kicker: 'Free tool · print and write', title: 'Memorial Preferences Worksheet',
    line: 'One page to print and fill out by hand.',
    art: ['candle', '0 0 160 240'], what: 'a free worksheet by Ben Siverly',
  },
  {
    file: 'og-writings.png', page: 'writings.html', dept: 'writing', style: 'light',
    kicker: 'Poetry, prose, a story', title: 'Writings',
    line: 'Two essays, four poems and a story in draft.',
    art: ['still-life', '150 300 300 460'], artAlt: 'marigolds and hanging amaranth over a stoneware jar', what: 'Ben Siverly’s writing',
  },
  {
    file: 'og-nobody-claps.png', page: 'nobody-claps.html', dept: 'writing', style: 'light',
    kicker: 'Essay · June 2026', title: 'Nobody Claps',
    line: 'Nobody claps. That’s how I know it’s working.',
    art: ['marigold', '10 -14 140 175'], what: 'an essay by Ben Siverly',
  },
  {
    file: 'og-building-things-worth-losing.png', page: 'building-things-worth-losing.html', dept: 'writing', style: 'light',
    kicker: 'Essay · June 2026', title: 'On Building Things Worth Losing',
    line: 'Build the bread with total seriousness. Don’t mistake it for the feast.',
    art: ['still-life', '170 420 260 340'], artAlt: 'amaranth hanging over the lip of a stoneware jar', what: 'an essay by Ben Siverly',
  },
  {
    file: 'og-milk.png', page: 'milk.html', dept: 'writing', style: 'italic',
    kicker: 'Poem · 2026', title: 'milk',
    line: 'The deal is three hours.<br>She sleeps. I take the kids.',
    art: ['still-life', '60 0 260 340'], artAlt: 'marigold heads and buds', what: 'a poem by Ben Siverly',
  },
  {
    file: 'og-hot-pig-summer.png', page: 'hot-pig-summer.html', dept: 'writing', style: 'italic',
    kicker: 'Poem · 2026', title: 'hot pig summer',
    line: 'Straw goes up fast.',
    art: ['still-life', '300 150 260 340'], artAlt: 'marigold heads', what: 'a poem by Ben Siverly',
  },
  {
    file: 'og-the-room-love-needs-to-breathe.png', page: 'the-room-love-needs-to-breathe.html', dept: 'writing', style: 'italic',
    kicker: 'Poem · 2025', title: 'the room love needs to breathe',
    line: 'listen,<br>I am not naturally a person who leaves space.',
    art: ['marigold', '10 -14 140 175'], what: 'a poem by Ben Siverly',
  },
  {
    file: 'og-come-down.png', page: 'come-down.html', dept: 'writing', style: 'italic',
    kicker: 'Poem · 2025', title: 'come down',
    line: 'I was high for years<br>High-performer. High-potential.',
    art: ['still-life', '180 440 250 320'], artAlt: 'amaranth hanging down from a stoneware jar', what: 'a poem by Ben Siverly',
  },
  {
    file: 'og-serotiny.png', page: 'serotiny.html', dept: 'band', style: 'display',
    kicker: 'Short story · draft', title: 'Serotiny',
    line: 'A father loads a dying phone with everything he knows, for a daughter who is leaving.',
    art: ['still-life', '40 0 520 690'], what: 'a short story in draft by Ben Siverly',
  },
  {
    file: 'og-consulting.png', page: 'consulting.html', dept: 'consulting', style: 'light',
    kicker: 'A few clients at a time', title: 'New tools, tried on real work first.',
    line: 'Strategy and operations for small and mid-size companies and startups.',
    art: ['trowel', '0 0 220 220'], what: 'Ben Siverly’s consulting page',
  },
  {
    file: 'og-consulting-rates.png', page: 'consulting-rates.html', dept: 'consulting', style: 'rate',
    kicker: 'Rate card', title: '$250 an hour',
    line: 'One rate, four ways to work together. The first conversation is free.',
    art: ['marigold', '10 -14 140 175'], seal: ['Free', '', 'First conversation'], sealAt: 'right: -24px; bottom: -46px',
    what: 'Ben Siverly’s consulting rate card',
  },
  {
    file: 'og-consulting-problems.png', page: 'consulting-problems.html', dept: 'consulting', style: 'light',
    kicker: 'Consulting · problems', title: 'What to call me about',
    line: 'Seven problems I’ve worked on, where, and one fact for each.',
    art: ['street', '128 7 260 260'], artAlt: 'an apartment building with one window lit orange', what: 'a consulting page by Ben Siverly',
  },
  {
    file: 'og-consulting-perspective.png', page: 'consulting-perspective.html', dept: 'consulting', style: 'light',
    kicker: 'Consulting · perspective', title: 'Where I’m from',
    line: 'Rural life, a job I left over the data, and why I take a few clients at a time.',
    art: ['still-life', '130 460 300 300'], artAlt: 'amaranth hanging over the lip of a stoneware jar', what: 'a consulting page by Ben Siverly',
  },
];

const plain = (s) => s.replace(/<br>/g, ' ').replace(/\s+/g, ' ').trim();

// The alt text the page's og:image:alt carries: whose page it is, what the
// card says, then what the engraving shows.
function ALT(card) {
  const sentence = (t) => (/[.!?]$/.test(t) ? t : `${t}.`);
  const what = card.what[0].toUpperCase() + card.what.slice(1);
  const seal = !card.seal ? '' : card.seal[1]
    ? `, with a seal reading ${card.seal[0]} to ${card.seal[1]} ${card.seal[2].toLowerCase()}`
    : `, with a seal reading ${card.seal[0]}, ${card.seal[2].toLowerCase()}`;
  const line = card.line.replace(/<br>/g, ' / ');
  return `${what}: ${sentence(plain(card.title))} ${sentence(plain(line))} Engraving of ${card.artAlt || ART[card.art[0]]}${seal}.`;
}

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
// Words may carry <br> (a poem's line break); everything else is escaped.
const words = (s) => s.split('<br>').map((l) => esc(l).replace(/(\S+-\S+)/g, '<span class="nw">$1</span>')).join('<br>');

function site() {
  return JSON.parse(fs.readFileSync(path.join(ROOT, 'site.json'), 'utf8'));
}

// The nameplate path, as the cover draws it.
function nameplate() {
  const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
  const d = /<path id="np-path" d="([^"]+)"/.exec(html);
  const box = /viewBox: ([-\d ]+)\./.exec(html);
  if (!d || !box) throw new Error('index.html has no #np-path nameplate to set the cover card with');
  return { d: d[1], box: box[1] };
}

const CSS = `
html, body { width: ${W}px; height: ${H}px; overflow: hidden; }
body::after { content: none; }
.og { position: absolute; inset: 0; display: grid; grid-template-rows: auto 1fr auto; padding: 30px 40px 26px; overflow: hidden; isolation: isolate; }
.og.field-spot, .og.field-leaf { position: absolute; z-index: auto; }
.og.paper, .og.charcoal { background: var(--ground); color: var(--ink); }
.og.paper::after, .og.charcoal::after { content: ""; position: absolute; inset: 0; z-index: -1; pointer-events: none; background-image: var(--texture-grain); background-size: var(--texture-grain-tile); opacity: var(--grain-opacity); mix-blend-mode: var(--grain-blend); }
.og.paper::before { content: ""; position: absolute; inset: 0; z-index: -2; background: radial-gradient(60% 50% at 12% 0%, rgb(255 252 244 / 0.7), transparent 70%), radial-gradient(50% 60% at 100% 100%, rgb(160 120 90 / 0.12), transparent 70%); }
.og.charcoal::before { content: ""; position: absolute; inset: 0; z-index: -2; background: radial-gradient(48% 60% at 92% 30%, var(--leak-orange), transparent 70%), radial-gradient(40% 50% at 8% 90%, var(--leak-green), transparent 70%); }

/* Running head: folio caps between hairlines. */
.og-rh { display: flex; justify-content: space-between; align-items: center; gap: 24px; padding-block: 10px; border-block: 1px solid currentColor; font: 600 17px / 1 var(--font-label); letter-spacing: 0.14em; text-transform: uppercase; font-stretch: 82%; white-space: nowrap; }
.og-rh b { font-weight: 600; color: var(--og-num); }

/* The foot: the address on a hairline that runs to a crosshair at each end. */
.og-foot { position: relative; display: flex; align-items: center; gap: 18px; padding-inline: 22px; height: 34px; font: 400 21px / 1 var(--font-text); }
.og-foot .run { flex: 1; height: 1px; background: currentColor; }
.og-foot .xh { top: 50%; width: 17px; height: 17px; }
.og-foot .xh--l { left: 0; } .og-foot .xh--r { left: 100%; }

.og-main { position: relative; display: grid; grid-template-columns: 260px 584px 1fr; align-items: center; min-height: 0; }
.og-wing { justify-self: start; font: 300 250px / 0.8 var(--font-display); font-variation-settings: 'SOFT' 100; letter-spacing: -0.05em; color: var(--og-num); margin-left: -10px; }
.og-words { display: flex; flex-direction: column; gap: 16px; min-width: 0; max-height: 100%; }
.og-kicker { font: 600 22px / 1.1 var(--font-label); letter-spacing: 0.14em; text-transform: uppercase; font-stretch: 85%; color: var(--og-kicker); }
.og-title { overflow-wrap: normal; word-break: keep-all; hyphens: none; text-wrap: balance; }
.og-title--display { font: 640 104px / 0.92 var(--font-display); font-variation-settings: 'SOFT' 100; letter-spacing: -0.012em; text-transform: uppercase; }
.og-title--light { font: 360 92px / 1.0 var(--font-display); font-variation-settings: 'SOFT' 50; letter-spacing: -0.024em; }
.og-title--italic { font: italic 380 104px / 1.0 var(--font-display); font-variation-settings: 'SOFT' 100; letter-spacing: -0.02em; }
.og-title--name { font: 300 120px / 0.95 var(--font-display); letter-spacing: -0.03em; }
.og-title--rate { font: 300 150px / 0.86 var(--font-display); font-variation-settings: 'SOFT' 0; font-feature-settings: 'lnum' 1; letter-spacing: -0.04em; white-space: nowrap; }
.og-title--rate .cur { font-size: 0.42em; vertical-align: 0.95em; margin-right: 0.04em; letter-spacing: 0; }
.og-title--rate .unit { font: 420 0.3em / 1 var(--font-display); font-variation-settings: 'SOFT' 50; letter-spacing: 0; color: var(--og-num); }
.og-title--nameplate { line-height: 0; }
.og-title--nameplate svg { width: 100%; height: auto; fill: currentColor; overflow: visible; }
.og-issue { display: flex; align-items: center; justify-content: center; gap: 14px; padding-block: 9px; border-block: 1px solid currentColor; font: 400 22px / 1.2 var(--font-text); white-space: nowrap; }
.og-issue .dash { width: 40px; height: 1px; background: currentColor; }
.og-line { font: italic 400 34px / 1.24 var(--font-text); text-wrap: pretty; }
.og-line .nw { white-space: nowrap; }
.og-title--name + .og-rules + .og-line { font: 600 20px / 1.3 var(--font-label); letter-spacing: 0.1em; text-transform: uppercase; font-stretch: 88%; color: var(--og-num); }
.og-rules { height: 7px; border-block: 2px solid currentColor; }

/* The engraving: a dark plate in a hairline frame with crosshair corners. */
.og-plate { position: relative; justify-self: end; width: 236px; }
.og-art { position: relative; isolation: isolate; overflow: hidden; color: var(--palette-newsprint); background: radial-gradient(70% 60% at 50% 40%, #4C423B, #342D2A 50%, #1F1B1A); box-shadow: 0 0 0 1.5px var(--og-frame); }
.og-art::after { content: ""; position: absolute; inset: 0; pointer-events: none; background-image: var(--texture-grain); background-size: var(--texture-grain-tile); opacity: 0.28; }
.og-art svg { display: block; width: 100%; height: auto; }
.og-plate .xh { color: var(--og-frame); width: 17px; height: 17px; }
.og-plate .xh--tl { left: -12px; top: -12px; } .og-plate .xh--tr { left: calc(100% + 12px); top: -12px; }
.og-plate .xh--bl { left: -12px; top: calc(100% + 12px); } .og-plate .xh--br { left: calc(100% + 12px); top: calc(100% + 12px); }

/* The one seal: the cover's scallop, orange rim, green face, dashed ring. */
.og-seal { position: absolute; z-index: 3; width: 150px; aspect-ratio: 1; display: grid; place-items: center; text-align: center; color: var(--palette-char); transform: rotate(-9deg); }
.og-seal::before, .og-seal::after { content: ""; position: absolute; clip-path: url(#scallop); z-index: -1; }
.og-seal::before { inset: -5%; background: var(--palette-toxic-orange); }
.og-seal::after { inset: 0; background: var(--palette-goody-gumdrop); }
.og-seal .in { display: grid; place-items: center; align-content: center; gap: 2px; width: 84%; aspect-ratio: 1; border-radius: 50%; border: 1px dashed currentColor; }
.og-seal b { font: 600 34px / 0.9 var(--font-display); font-variation-settings: 'SOFT' 100; letter-spacing: -0.03em; white-space: nowrap; }
.og-seal b i { font-style: normal; font-size: 0.6em; }
.og-seal b.pair { font-size: 26px; }
.og-seal small { max-width: 80%; font: 600 13px / 1.1 var(--font-label); letter-spacing: 0.04em; text-transform: uppercase; font-stretch: 82%; }

/* A rail of cover lines up the left wing, as on the cover. */
.og-rail { position: absolute; left: 44px; top: 50%; width: max-content; translate: -50% -50%; rotate: -90deg; display: flex; align-items: center; gap: 12px; font: 400 18px / 1 var(--font-text); white-space: nowrap; }
.og-rail .run { flex: none; width: 44px; height: 1px; background: currentColor; }

/* Fields. */
.field-spot { --og-num: var(--palette-char); --og-kicker: var(--palette-char); --og-frame: var(--palette-char); }
.field-leaf { --og-num: var(--palette-char); --og-kicker: var(--palette-moss); --og-frame: var(--palette-char); }
.paper { --og-num: var(--spot); --og-kicker: var(--leaf); --og-frame: var(--ink); }
.charcoal { --og-num: var(--palette-toxic-orange); --og-kicker: var(--palette-goody-gumdrop); --og-frame: var(--palette-newsprint); }
.charcoal .rim { --rim-color: var(--palette-toxic-orange); --rim-fill: var(--palette-goody-gumdrop); height: 16px; }
.charcoal .rim--edge-top { top: 0; }
.charcoal .rim--edge-bottom { bottom: 0; transform: scaleY(-1); }

`;

function cardHtml(card, ctx) {
  const dept = DEPTS[card.dept];
  if (!dept) throw new Error(`${card.file}: unknown department ${card.dept}`);
  const { svg } = ctx.art([...new Set([card.art[0]])]);
  const cls = ['og', `og--${card.dept}`, dept.field].join(' ');
  const s = ctx.site;
  const deptName = dept.num ? `<b>${dept.num}</b>&ensp;${esc(dept.name)}` : esc(dept.name);
  const rh = `<header class="og-rh"><span>${esc(s.name)} · Issue ${esc(s.issue.number)} · ${esc(s.issue.season)}</span><span>${deptName}</span></header>`;
  const foot = `<footer class="og-foot"><span class="xh xh--l" aria-hidden="true"></span><span class="run"></span><span>bensiverly.com</span><span class="run"></span><span class="xh xh--r" aria-hidden="true"></span></footer>`;
  let title;
  if (card.style === 'nameplate') {
    title = `<h1 class="og-title og-title--nameplate" data-fit="none"><svg viewBox="${ctx.np.box}" aria-label="Ben Siverly"><path d="${ctx.np.d}"/></svg></h1>` +
      `<p class="og-issue">${esc(s.issue.season)}<span class="dash"></span>${esc(card.kicker)}<span class="dash"></span>Issue ${esc(s.issue.number)}</p>`;
  } else if (card.style === 'rate') {
    const m = /^\$(\d+) (.+)$/.exec(card.title);
    title = `<h1 class="og-title og-title--rate" data-fit="none"><span class="cur">$</span>${esc(m[1])}<span class="unit"> ${esc(m[2])}</span></h1>`;
  } else {
    title = `<h1 class="og-title og-title--${card.style}">${words(card.title)}</h1>`;
  }
  const kicker = card.style === 'nameplate' ? '' : `<p class="og-kicker">${esc(card.kicker)}</p>`;
  const rules = card.style === 'name' ? '<div class="og-rules"></div>' : '';
  const [name, box] = card.art;
  const [, , bw, bh] = box.split(' ').map(Number);
  const size = ctx.sizes[name];
  const seal = card.seal ? `<p class="og-seal" style="${card.sealAt || 'left: -62px; bottom: -40px'}"><span class="in">${card.seal[1] ? `<b class="pair">${esc(card.seal[0])}<i>→</i>${esc(card.seal[1])}</b>` : `<b>${esc(card.seal[0])}</b>`}<small>${esc(card.seal[2])}</small></span></p>` : '';
  const xh = ['tl', 'tr', 'bl', 'br'].map((c) => `<span class="xh xh--${c}" aria-hidden="true"></span>`).join('');
  const plate = `<figure class="og-plate"><div class="og-art"><svg viewBox="${box}" style="aspect-ratio: ${bw} / ${bh}"><use href="#art-${name}" width="${size[0]}" height="${size[1]}"/></svg></div>${xh}${seal}</figure>`;
  const rail = card.rail ? `<p class="og-rail" aria-hidden="true">${card.rail.map(esc).join('<span class="run"></span>')}</p>` : '';
  const rims = dept.field === 'charcoal' ? '<div class="rim rim--edge-top"></div><div class="rim rim--edge-bottom"></div>' : '';
  return `<!DOCTYPE html>
<html lang="en" data-edition="${dept.edition}">
<head>
<meta charset="UTF-8">
<title>${esc(card.file)}</title>
<link rel="stylesheet" href="/tokens.css">
<link rel="stylesheet" href="/site.css">
<style>${CSS}</style>
</head>
<body>
${svg}
<svg class="art-defs" width="0" height="0" aria-hidden="true"><defs><clipPath id="scallop" clipPathUnits="objectBoundingBox"><path d="${ctx.scallop}"/></clipPath></defs></svg>
<div class="${cls}">
${rims}
${rh}
<div class="og-main">
<div class="og-wing" aria-hidden="true">${dept.num}</div>${rail}
<div class="og-words" data-safe>${kicker}${title}${rules}<p class="og-line">${words(card.line)}</p></div>
${plate}
</div>
${foot}
</div>
</body>
</html>
`;
}

// The scallop the seals are cut from, as the cover draws it.
function scallop() {
  const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
  const m = /<clipPath id="scallop" clipPathUnits="objectBoundingBox">\s*<path d="([^"]+)"/.exec(html);
  if (!m) throw new Error('index.html has no #scallop clip path');
  return m[1];
}

const TYPES = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.svg': 'image/svg+xml', '.png': 'image/png', '.woff2': 'font/woff2' };

function serve(pages) {
  const server = http.createServer((req, res) => {
    const url = decodeURIComponent(req.url.split('?')[0]);
    if (pages.has(url)) { res.writeHead(200, { 'Content-Type': TYPES['.html'] }); res.end(pages.get(url)); return; }
    const file = path.join(ROOT, url);
    if (!file.startsWith(ROOT) || !fs.existsSync(file) || !fs.statSync(file).isFile()) { res.writeHead(404); res.end('not found'); return; }
    res.writeHead(200, { 'Content-Type': TYPES[path.extname(file)] || 'application/octet-stream' });
    fs.createReadStream(file).pipe(res);
  });
  return new Promise((resolve) => server.listen(0, '127.0.0.1', () => resolve(server)));
}

// In the page: fit the title to its column (largest size whose words all fit
// and whose lines stay within max), then report anything out of bounds.
function fitAndCheck(safe) {
  const problems = [];
  const words = document.querySelector('.og-words');
  const main = document.querySelector('.og-main');
  const title = document.querySelector('.og-title');
  if (title.dataset.fit !== 'none') {
    const start = parseFloat(getComputedStyle(title).fontSize);
    const lh = () => parseFloat(getComputedStyle(title).lineHeight);
    let size = start;
    for (; size >= 44; size -= 2) {
      title.style.fontSize = `${size}px`;
      const lines = Math.round(title.getBoundingClientRect().height / lh());
      if (title.scrollWidth <= title.clientWidth + 0.5 && lines <= 3 && words.scrollHeight <= main.clientHeight - 48) break;
    }
    if (size < 44) problems.push('the title does not fit its column at 44px');
  }
  for (const el of document.querySelectorAll('[data-safe], [data-safe] *')) {
    const r = el.getBoundingClientRect();
    if (!r.width) continue;
    if (r.left < safe[0] - 0.5 || r.right > safe[1] + 0.5) problems.push(`<${el.tagName.toLowerCase()} class="${el.getAttribute('class')}"> runs from x ${Math.round(r.left)} to ${Math.round(r.right)}, outside the safe column ${safe[0]} to ${safe[1]}`);
    if (el.scrollWidth > el.clientWidth + 1 && getComputedStyle(el).overflow !== 'visible') problems.push(`<${el.tagName.toLowerCase()}> overflows`);
  }
  if (words.scrollHeight > main.clientHeight - 47) problems.push('the words crowd the running head or the foot');
  // A seal's figures and label sit inside its dashed ring.
  // (Measured in the seal's own, unrotated layout.)
  for (const ring of document.querySelectorAll('.og-seal .in')) {
    const rad = ring.offsetWidth / 2;
    const cx = ring.offsetLeft + rad, cy = ring.offsetTop + ring.offsetHeight / 2;
    for (const t of ring.children) {
      const x0 = t.offsetLeft, y0 = t.offsetTop, x1 = x0 + t.offsetWidth, y1 = y0 + t.offsetHeight;
      const far = Math.max(...[[x0, y0], [x1, y0], [x0, y1], [x1, y1]].map(([x, y]) => Math.hypot(x - cx, y - cy)));
      if (far > rad + 1) problems.push(`the seal's "${t.textContent}" runs outside its ring (${far.toFixed(1)} from the centre, ring ${rad})`);
    }
  }
  // A rail of cover lines stays between the running head and the foot.
  const rail = document.querySelector('.og-rail');
  if (rail) {
    const r = rail.getBoundingClientRect(), m = main.getBoundingClientRect();
    if (r.top < m.top + 16 || r.bottom > m.bottom - 16) problems.push('the rail runs into the running head or the foot');
  }
  // Nothing leaves the card (the drawings inside a plate are clipped by it).
  for (const el of document.querySelectorAll('.og *')) {
    const r = el.getBoundingClientRect();
    if (el.closest('.rim') || (el.parentElement && el.parentElement.closest('svg')) || !r.width) continue;
    if (r.top < -0.5 || r.bottom > innerHeight + 0.5 || r.left < -0.5 || r.right > innerWidth + 0.5) problems.push(`<${el.tagName.toLowerCase()} class="${el.getAttribute('class')}"> leaves the card`);
  }
  return { problems, size: parseFloat(getComputedStyle(title).fontSize) };
}

// The families every glyph on the card was drawn in, as Chromium reports them.
async function usedFonts(page) {
  const cdp = await page.createCDPSession();
  await cdp.send('DOM.enable');
  await cdp.send('CSS.enable');
  const { root } = await cdp.send('DOM.getDocument', { depth: -1 });
  const { nodeIds } = await cdp.send('DOM.querySelectorAll', { nodeId: root.nodeId, selector: '.og *' });
  const fams = new Set();
  for (const nodeId of nodeIds) {
    const { fonts } = await cdp.send('CSS.getPlatformFontsForNode', { nodeId });
    for (const f of fonts) fams.add(f.familyName);
  }
  await cdp.detach();
  return [...fams];
}

const ALLOWED = /^(Fraunces|Newsreader|Instrument Sans)\b/;

async function main() {
  const puppeteer = require('puppeteer');
  const sharp = require('sharp');
  const art = require('./generate-kit-art');
  const only = process.argv.slice(2).filter((a) => !a.startsWith('-'));
  const outDir = (process.argv.find((a) => a.startsWith('--out=')) || '').slice(6) || path.join(ROOT, 'images');
  const cards = only.length ? CARDS.filter((c) => only.some((o) => c.file.includes(o))) : CARDS;
  const sizes = {};
  for (const name of art.NAMES) {
    const m = new RegExp(`id="art-${name}" viewBox="0 0 (\\d+) (\\d+)"`).exec(art.symbols([name]).svg);
    sizes[name] = [Number(m[1]), Number(m[2])];
  }
  const ctx = { site: site(), np: nameplate(), scallop: scallop(), art: art.symbols, sizes };
  const pages = new Map(cards.map((c) => [`/__og/${c.file.replace('.png', '.html')}`, cardHtml(c, ctx)]));
  const server = await serve(pages);
  const base = `http://127.0.0.1:${server.address().port}`;
  // Root (a container, CI) cannot use Chrome's sandbox.
  const root = typeof process.getuid === 'function' && process.getuid() === 0;
  const browser = await puppeteer.launch({ args: ['--font-render-hinting=none', ...(process.env.CI || root ? ['--no-sandbox'] : [])] });
  const failures = [];
  const rendered = [];
  try {
    for (const card of cards) {
      const page = await browser.newPage();
      await page.setViewport({ width: W, height: H, deviceScaleFactor: 1 });
      await page.goto(`${base}/__og/${card.file.replace('.png', '.html')}`, { waitUntil: 'networkidle0' });
      await page.evaluate(() => document.fonts.ready);
      const { problems, size } = await page.evaluate(fitAndCheck, SAFE);
      const fonts = await usedFonts(page);
      for (const f of fonts) if (!ALLOWED.test(f)) problems.push(`set in ${f}`);
      if (problems.length) failures.push(`${card.file}:\n  ${problems.join('\n  ')}`);
      const png = await page.screenshot({ type: 'png', clip: { x: 0, y: 0, width: W, height: H } });
      rendered.push({ card, png, size });
      await page.close();
    }
  } finally {
    await browser.close();
    server.close();
  }
  if (failures.length) {
    console.error(`\n  No share card written. Fix these first:\n\n${failures.join('\n')}\n`);
    process.exit(1);
  }
  fs.mkdirSync(outDir, { recursive: true });
  for (const { card, png, size } of rendered) {
    const out = path.join(outDir, card.file);
    await sharp(png).png({ compressionLevel: 9, palette: true, quality: 92, dither: 0.6 }).toFile(out);
    console.log(`  ${card.file}  title ${size}px  ${(fs.statSync(out).size / 1024).toFixed(0)} KB`);
  }
}

module.exports = { CARDS, ALT, SAFE, W, H, DEPTS, ART };

if (require.main === module) {
  main().catch((err) => { console.error(err); process.exit(1); });
}
