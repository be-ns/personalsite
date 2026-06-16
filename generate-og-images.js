// OG share-card generator.
//
// Cards mirror the site's design system (styles.css): a warm-white field
// with the hero's soft cobalt/yellow/teal washes behind the signature
// tool-card frame — 2px ink border, 16px-radius card, hard yellow offset
// shadow — with Zilla Slab headlines (marker-highlighted, like
// .hero-accent), Inter subtitles, and JetBrains Mono labels.
//
// Fonts are vendored in assets/fonts and registered via a private
// fontconfig file so rendering is reproducible on any machine.

const path = require('path');
const os = require('os');
const fs = require('fs');

// Point fontconfig at the repo's vendored fonts before sharp loads librsvg.
const FONT_DIR = path.join(__dirname, 'assets', 'fonts');
const fontConf = path.join(os.tmpdir(), 'og-fonts.conf');
fs.writeFileSync(fontConf, `<?xml version="1.0"?>
<!DOCTYPE fontconfig SYSTEM "fonts.dtd">
<fontconfig>
  <dir>${FONT_DIR}</dir>
  <cachedir>${path.join(os.tmpdir(), 'og-font-cache')}</cachedir>
</fontconfig>
`);
process.env.FONTCONFIG_FILE = fontConf;

const sharp = require('sharp');

// OG image dimensions (standard)
const WIDTH = 1200;
const HEIGHT = 630;

// Design tokens, mirrored from styles.css
const tokens = {
  bgWarm: '#FAF9F7',
  card: '#FFFFFF',
  ink: '#1A1A1A',
  muted: '#666666',
  accent: '#FFE227',
  cobalt: '#0047AB',
  teal: '#0D7377',
  // Native Plant Finder's own palette (native-plant-finder.html)
  bayDeep: '#1E3A2F',
  manzanita: '#E87B35',
  bloom: '#F4E6A1',
  // Literary golds (writings)
  gold: '#C9A959',
};

// Seeded random for reproducible wash placement
let seed = 12345;
function seededRandom() {
  seed = (seed * 9301 + 49297) % 233280;
  return seed / 233280;
}
function resetSeed(newSeed) {
  seed = newSeed;
}

function escapeXml(text) {
  return text.replace(/[&<>"']/g, (char) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[char]));
}

// ---------------------------------------------------------------------------
// Text measurement (heuristic per-glyph advance widths, in em)
// ---------------------------------------------------------------------------

function charWidthZilla(ch) {
  if (' '.includes(ch)) return 0.25;
  if ("ijl.,;:'’!".includes(ch)) return 0.28;
  if ('frt-()'.includes(ch)) return 0.38;
  if ('mw'.includes(ch)) return 0.84;
  if ('MW'.includes(ch)) return 0.95;
  if ('I'.includes(ch)) return 0.34;
  if ('J'.includes(ch)) return 0.5;
  if (ch >= 'A' && ch <= 'Z') return 0.68;
  if ('—'.includes(ch)) return 1.0;
  if ('&'.includes(ch)) return 0.72;
  return 0.55;
}

function charWidthInter(ch) {
  if (' '.includes(ch)) return 0.26;
  if ("ijl.,;:'’!".includes(ch)) return 0.24;
  if ('frt-'.includes(ch)) return 0.33;
  if ('mw'.includes(ch)) return 0.8;
  if ('MW'.includes(ch)) return 0.9;
  if ('I'.includes(ch)) return 0.28;
  if (ch >= 'A' && ch <= 'Z') return 0.64;
  return 0.51;
}

function measure(text, fontSize, widthFn) {
  let em = 0;
  for (const ch of text) em += widthFn(ch);
  return em * fontSize;
}

// JetBrains Mono: fixed 0.6em advance
function measureMono(text, fontSize, letterSpacing = 0) {
  return text.length * fontSize * 0.6 + Math.max(0, text.length - 1) * letterSpacing;
}

// Wrap a title into at most two visually balanced lines that fit maxWidth.
// Returns { lines, fontSize }.
function layoutTitle(title, maxWidth, baseSize = 88, minSize = 56) {
  if (measure(title, baseSize, charWidthZilla) <= maxWidth) {
    return { lines: [title], fontSize: baseSize };
  }

  // Find the word break closest to the midpoint
  const words = title.split(' ');
  let best = null;
  for (let i = 1; i < words.length; i++) {
    const a = words.slice(0, i).join(' ');
    const b = words.slice(i).join(' ');
    const widest = Math.max(
      measure(a, 100, charWidthZilla),
      measure(b, 100, charWidthZilla)
    );
    if (best === null || widest < best.widest) best = { a, b, widest };
  }

  const lines = [best.a, best.b];
  // Largest size (capped at 80 for two-liners) where both lines fit
  let fontSize = Math.min(80, Math.floor((maxWidth / best.widest) * 100));
  fontSize = Math.max(minSize, fontSize);
  return { lines, fontSize };
}

// ---------------------------------------------------------------------------
// SVG composition
// ---------------------------------------------------------------------------

// Soft radial washes behind the card, echoing the homepage hero backdrop.
function renderWashes(washes) {
  let defs = '';
  let shapes = '';
  washes.forEach((wash, i) => {
    const jx = (seededRandom() - 0.5) * 120;
    const jy = (seededRandom() - 0.5) * 80;
    defs += `
      <radialGradient id="wash${i}">
        <stop offset="0%" stop-color="${wash.color}" stop-opacity="${wash.opacity}"/>
        <stop offset="100%" stop-color="${wash.color}" stop-opacity="0"/>
      </radialGradient>`;
    shapes += `
      <ellipse cx="${wash.cx + jx}" cy="${wash.cy + jy}" rx="${wash.rx}" ry="${wash.ry}" fill="url(#wash${i})"/>`;
  });
  return { defs, shapes };
}

function renderCardSvg(config) {
  resetSeed(config.seed || 12345);

  const accent = config.accentColor || tokens.cobalt;

  // Card geometry: site tool-card translated to OG scale
  const card = { x: 84, y: 92, w: 1032, h: 430, r: 24 };
  const pad = 64;
  const contentX = card.x + pad;
  const maxTextWidth = card.w - pad * 2;

  const washes = renderWashes(config.washes);

  // --- Title block ---
  const { lines, fontSize } = layoutTitle(config.title, maxTextWidth, config.titleSize || 88);
  const lineHeight = fontSize * 1.12;
  const titleTop = config.eyebrow ? 200 : 216;
  const firstBaseline = titleTop + fontSize * 0.78;

  let titleSvg = '';
  lines.forEach((line, i) => {
    const baseline = firstBaseline + i * lineHeight;

    // Marker highlight, like .hero-accent on the homepage
    let hlStart = 0;
    let hlText = line;
    if (config.highlight) {
      const idx = line.indexOf(config.highlight);
      if (idx === -1) hlText = null;
      else {
        hlStart = measure(line.slice(0, idx), fontSize, charWidthZilla);
        hlText = config.highlight;
      }
    }
    if (hlText) {
      const hlWidth = measure(hlText, fontSize, charWidthZilla);
      titleSvg += `
      <rect x="${contentX + hlStart - 12}" y="${baseline - fontSize * 0.5}"
            width="${hlWidth + 24}" height="${fontSize * 0.64}"
            fill="${tokens.accent}"/>`;
    }
    titleSvg += `
      <text x="${contentX}" y="${baseline}" font-family="Zilla Slab" font-weight="700"
            font-size="${fontSize}" letter-spacing="${-fontSize * 0.02}" fill="${tokens.ink}">${escapeXml(line)}</text>`;
  });

  // --- Subtitle ---
  let subtitleSvg = '';
  if (config.subtitle) {
    const subBaseline = firstBaseline + (lines.length - 1) * lineHeight + 60;
    subtitleSvg = `
      <text x="${contentX}" y="${subBaseline}" font-family="Inter" font-weight="450"
            font-size="33" fill="${tokens.muted}">${escapeXml(config.subtitle)}</text>`;
  }

  // --- Eyebrow label (mono, uppercase, accent-colored) ---
  let eyebrowSvg = '';
  if (config.eyebrow) {
    eyebrowSvg = `
      <text x="${contentX}" y="${card.y + 78}" font-family="JetBrains Mono" font-weight="500"
            font-size="21" letter-spacing="3.5" fill="${accent}">${escapeXml(config.eyebrow.toUpperCase())}</text>`;
  }

  // --- LIVE badge (site .badge-live: cobalt pill, pulsing yellow dot) ---
  let badgeSvg = '';
  if (config.badge) {
    const label = config.badge.toUpperCase();
    const ls = 2;
    const textW = measureMono(label, 20, ls);
    const badgeW = textW + 18 * 2 + 10 + 10;
    const badgeX = card.x + card.w - pad - badgeW;
    const badgeY = card.y + 46;
    badgeSvg = `
      <rect x="${badgeX}" y="${badgeY}" width="${badgeW}" height="42" rx="21" fill="${tokens.cobalt}"/>
      <circle cx="${badgeX + 22}" cy="${badgeY + 21}" r="5" fill="${tokens.accent}"/>
      <text x="${badgeX + 36}" y="${badgeY + 28}" font-family="JetBrains Mono" font-weight="500"
            font-size="20" letter-spacing="${ls}" fill="#FFFFFF">${escapeXml(label)}</text>`;
  }

  // --- Domain row ---
  const domainBaseline = card.y + card.h - 50;
  const domainSvg = `
      <circle cx="${contentX + 7}" cy="${domainBaseline - 8}" r="7" fill="${accent}"/>
      <text x="${contentX + 28}" y="${domainBaseline}" font-family="JetBrains Mono" font-weight="400"
            font-size="23" fill="${tokens.muted}">bensiverly.com</text>`;

  return `
    <svg width="${WIDTH}" height="${HEIGHT}" xmlns="http://www.w3.org/2000/svg">
      <defs>${washes.defs}</defs>

      <rect width="${WIDTH}" height="${HEIGHT}" fill="${tokens.bgWarm}"/>
      ${washes.shapes}

      <!-- Hard accent offset shadow (tool-card hover state) -->
      <rect x="${card.x + 16}" y="${card.y + 16}" width="${card.w}" height="${card.h}"
            rx="${card.r}" fill="${tokens.accent}"/>

      <!-- Card frame -->
      <rect x="${card.x}" y="${card.y}" width="${card.w}" height="${card.h}"
            rx="${card.r}" fill="${tokens.card}" stroke="${tokens.ink}" stroke-width="3"/>

      ${eyebrowSvg}
      ${badgeSvg}
      ${titleSvg}
      ${subtitleSvg}
      ${domainSvg}
    </svg>`;
}

// Subtle film grain, matching the texture the site's imagery carries.
function createGrainOverlay() {
  resetSeed(777);
  const buffer = Buffer.alloc(WIDTH * HEIGHT * 4);
  for (let i = 0; i < WIDTH * HEIGHT; i++) {
    const v = seededRandom() < 0.5 ? 0 : 255;
    buffer[i * 4] = v;
    buffer[i * 4 + 1] = v;
    buffer[i * 4 + 2] = v;
    buffer[i * 4 + 3] = Math.floor(seededRandom() * 7);
  }
  return buffer;
}

// ---------------------------------------------------------------------------
// Page configurations
// ---------------------------------------------------------------------------

// Hero backdrop wash recipe (index.html hero::before), scaled to OG canvas
const brandWashes = [
  { color: tokens.cobalt, opacity: 0.10, cx: 170, cy: 90, rx: 430, ry: 310 },
  { color: tokens.accent, opacity: 0.20, cx: 1040, cy: 70, rx: 400, ry: 300 },
  { color: tokens.teal, opacity: 0.08, cx: 850, cy: 580, rx: 470, ry: 300 },
];

const tealWashes = [
  { color: tokens.teal, opacity: 0.12, cx: 170, cy: 90, rx: 430, ry: 310 },
  { color: tokens.accent, opacity: 0.20, cx: 1040, cy: 70, rx: 400, ry: 300 },
  { color: tokens.cobalt, opacity: 0.06, cx: 850, cy: 580, rx: 470, ry: 300 },
];

const earthWashes = [
  { color: tokens.bayDeep, opacity: 0.11, cx: 170, cy: 90, rx: 430, ry: 310 },
  { color: tokens.manzanita, opacity: 0.15, cx: 1040, cy: 70, rx: 400, ry: 300 },
  { color: tokens.bloom, opacity: 0.30, cx: 850, cy: 580, rx: 470, ry: 300 },
];

const literaryWashes = [
  { color: tokens.gold, opacity: 0.16, cx: 170, cy: 90, rx: 430, ry: 310 },
  { color: tokens.accent, opacity: 0.18, cx: 1040, cy: 70, rx: 400, ry: 300 },
  { color: tokens.teal, opacity: 0.07, cx: 850, cy: 580, rx: 470, ry: 300 },
];

const pages = [
  {
    // Mirrors the homepage hero headline, highlight and all
    title: 'Product manager. Builder. Gardener.',
    eyebrow: 'Ben Siverly',
    highlight: 'Gardener.',
    accentColor: tokens.cobalt,
    washes: brandWashes,
    seed: 42,
    outputPath: './images/og-home.png',
  },
  {
    title: 'Decision Assist',
    subtitle: 'Weighted criteria for clearer choices',
    eyebrow: 'Tool',
    badge: 'Live',
    accentColor: tokens.cobalt,
    washes: brandWashes,
    seed: 123,
    outputPath: './images/og-decision-assist.png',
  },
  {
    title: 'Life Strategy Matrix',
    subtitle: 'Score life areas. See where to invest.',
    eyebrow: 'Tool',
    badge: 'Live',
    accentColor: tokens.cobalt,
    washes: brandWashes,
    seed: 456,
    outputPath: './images/og-life-strategy.png',
  },
  {
    title: 'Memorial Pamphlet',
    subtitle: 'Create a dignified memorial pamphlet',
    eyebrow: 'Tool',
    badge: 'Live',
    accentColor: tokens.teal,
    washes: tealWashes,
    seed: 789,
    outputPath: './images/og-memorial-pamphlet.png',
  },
  {
    title: 'Native Plant Finder',
    subtitle: 'Find plants tailored to your region',
    eyebrow: 'Tool',
    badge: 'Live',
    accentColor: tokens.bayDeep,
    washes: earthWashes,
    seed: 1011,
    outputPath: './images/og-native-plant-finder.png',
  },
  {
    title: 'Service of Life Builder',
    subtitle: 'Build a liturgy for a memorial',
    eyebrow: 'Tool',
    badge: 'Live',
    accentColor: tokens.teal,
    washes: tealWashes,
    seed: 1213,
    outputPath: './images/og-service-of-life.png',
  },
  {
    title: 'Memorial Preferences Worksheet',
    subtitle: 'Record service wishes by hand, on paper',
    eyebrow: 'Tool',
    badge: 'Live',
    accentColor: tokens.teal,
    washes: tealWashes,
    seed: 3031,
    outputPath: './images/og-memorial-preferences.png',
  },
  {
    title: 'Ben Siverly',
    subtitle: 'AI Native Product Builder',
    eyebrow: 'Résumé',
    accentColor: tokens.cobalt,
    washes: brandWashes,
    seed: 2627,
    outputPath: './images/og-resume.png',
  },
  {
    title: 'Writings',
    subtitle: 'Words about life, memory, and paying attention',
    eyebrow: 'Poetry & Prose',
    accentColor: tokens.teal,
    washes: literaryWashes,
    seed: 1415,
    outputPath: './images/og-writings.png',
  },
  {
    title: 'On Building Things Worth Losing',
    subtitle: 'Why nothing physical truly lasts',
    eyebrow: 'Essay',
    accentColor: tokens.teal,
    washes: literaryWashes,
    seed: 1617,
    outputPath: './images/og-building-things-worth-losing.png',
  },
  {
    title: 'Nobody Claps',
    subtitle: 'The unglamorous work nobody claps for',
    eyebrow: 'Essay',
    accentColor: tokens.teal,
    washes: literaryWashes,
    seed: 1819,
    outputPath: './images/og-nobody-claps.png',
  },
  {
    title: 'come down',
    subtitle: 'Moving like water toward what can hold you',
    eyebrow: 'Poem',
    accentColor: tokens.teal,
    washes: literaryWashes,
    seed: 2021,
    outputPath: './images/og-come-down.png',
  },
  {
    title: 'hot pig summer',
    subtitle: 'Straw houses, a hard winter, the compost pile',
    eyebrow: 'Poem',
    accentColor: tokens.teal,
    washes: literaryWashes,
    seed: 2223,
    outputPath: './images/og-hot-pig-summer.png',
  },
  {
    title: 'the room love needs to breathe',
    subtitle: 'Love grows when you stop gripping it',
    eyebrow: 'Poem',
    accentColor: tokens.teal,
    washes: literaryWashes,
    seed: 2425,
    outputPath: './images/og-the-room-love-needs-to-breathe.png',
  },
  {
    title: 'milk',
    subtitle: 'Three borrowed hours, a kitchen full of kids',
    eyebrow: 'Poem',
    accentColor: tokens.teal,
    washes: literaryWashes,
    seed: 2829,
    outputPath: './images/og-milk.png',
  },
];

// ---------------------------------------------------------------------------

async function generateOGImage(config, grain) {
  const svg = Buffer.from(renderCardSvg(config));

  await sharp(svg)
    .composite([{
      input: grain,
      raw: { width: WIDTH, height: HEIGHT, channels: 4 },
      top: 0,
      left: 0,
    }])
    .png({ compressionLevel: 9 })
    .toFile(config.outputPath);

  console.log(`  Generated: ${config.outputPath}`);
}

if (!fs.existsSync('./images')) {
  fs.mkdirSync('./images');
}

async function main() {
  console.log('\n  Generating OG share cards...\n');

  const grain = createGrainOverlay();
  for (const config of pages) {
    await generateOGImage(config, grain);
  }

  console.log('\n  All OG images generated.\n');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
