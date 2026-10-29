// Theme compiler: theme.json -> tokens.css.
//
// theme.json is the source of truth; tokens.css is generated and committed so
// the site still runs with no build step. Run `npm run tokens` after editing
// the theme. `node build-tokens.js --check` exits non-zero when tokens.css is
// stale (the test suite runs the same comparison).
//
// Naming: a token's path joined with dashes. Two groups are flattened:
// editions.<name>.ground -> --ground (scoped to that edition) and
// component.button.height -> --button-height. Aliases like {shape.full}
// become var(--shape-full), so relationships stay visible in devtools.

const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const THEME = path.join(ROOT, 'theme.json');
const OUT = path.join(ROOT, 'tokens.css');

const ALIAS = /\{([a-z0-9.-]+)\}/gi;

function loadTheme() {
  return JSON.parse(fs.readFileSync(THEME, 'utf8'));
}

function lookup(theme, ref) {
  const node = ref.split('.').reduce((n, key) => (n && n[key]), theme);
  if (!node || !('$value' in node)) throw new Error(`Unknown token reference {${ref}}`);
  return node;
}

function varName(ref) {
  const parts = ref.split('.');
  if (parts[0] === 'editions') parts.splice(0, 2);
  if (parts[0] === 'component') parts.shift();
  return `--${parts.join('-')}`;
}

// Literal value with every alias followed to the end (for tests and math).
function resolve(theme, value) {
  if (typeof value === 'string') {
    const whole = value.match(/^\{([a-z0-9.-]+)\}$/i);
    if (whole) return resolve(theme, lookup(theme, whole[1]).$value);
    return value.replace(ALIAS, (_, ref) => resolve(theme, lookup(theme, ref).$value));
  }
  if (Array.isArray(value)) return value.map((v) => resolve(theme, v));
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, resolve(theme, v)]));
  }
  return value;
}

// CSS value: aliases become var() references; everything else is literal.
function css(theme, token) {
  const { $value: value, $type: type } = token;
  if (type === 'cubicBezier') return `cubic-bezier(${value.join(', ')})`;
  if (typeof value === 'string') {
    return value.replace(ALIAS, (_, ref) => (lookup(theme, ref), `var(${varName(ref)})`));
  }
  return String(value);
}

function tokensIn(node, trail = []) {
  const out = [];
  for (const [key, child] of Object.entries(node)) {
    if (key.startsWith('$') || !child || typeof child !== 'object') continue;
    if ('$value' in child) out.push([[...trail, key], child]);
    else out.push(...tokensIn(child, [...trail, key]));
  }
  return out;
}

const TYPE_PROPS = [
  ['family', 'fontFamily', null],
  ['size', 'fontSize', null],
  ['weight', 'fontWeight', null],
  ['line', 'lineHeight', null],
  ['tracking', 'letterSpacing', '0'],
  ['case', 'textTransform', 'none'],
  ['style', 'fontStyle', 'normal'],
  ['stretch', 'fontStretch', 'normal'],
  ['axes', 'fontVariationSettings', 'normal'],
  ['features', 'fontFeatureSettings', 'normal'],
];

function typeLines(theme) {
  const lines = [];
  for (const [[, role], token] of tokensIn(theme.type, ['type'])) {
    for (const [suffix, key, fallback] of TYPE_PROPS) {
      const raw = token.$value[key] ?? fallback;
      if (raw === null) throw new Error(`type.${role} is missing ${key}`);
      lines.push(`--type-${role}-${suffix}: ${css(theme, { $value: raw })};`);
    }
  }
  return lines;
}

// Grain: one tile of light and dark specks. Two thresholds on independent
// noise channels, so the tile shows on charcoal (light specks) and on paper or
// colour fields (dark specks). gain sets how hard the speck edges are;
// threshold sets how far from mid-grey the noise must be to leave a speck.
// lightGain and lightThreshold tune the light channel on its own (they default
// to gain and threshold): soft light specks read as film grain on charcoal,
// hard ones as dust.
function grainImage(theme) {
  const { baseFrequency, octaves, tile, gain, threshold, light, dark } = theme.texture.grain.$value;
  const { lightGain = gain, lightThreshold = threshold } = theme.texture.grain.$value;
  const rgb = (hex) => [1, 3, 5].map((i) => (parseInt(hex.slice(i, i + 2), 16) / 255).toFixed(3));
  const [lr, lg, lb] = rgb(light);
  const [dr, dg, db] = rgb(dark);
  const lightBias = (-(0.5 + lightThreshold) * lightGain).toFixed(3);
  const darkBias = ((0.5 - threshold) * gain).toFixed(3);
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='${tile}' height='${tile}'>` +
    `<filter id='g' x='0' y='0' width='100%' height='100%' color-interpolation-filters='sRGB'>` +
    `<feTurbulence type='fractalNoise' baseFrequency='${baseFrequency}' numOctaves='${octaves}' seed='7' stitchTiles='stitch' result='n'/>` +
    `<feColorMatrix in='n' type='matrix' values='0 0 0 0 ${lr} 0 0 0 0 ${lg} 0 0 0 0 ${lb} ${lightGain} 0 0 0 ${lightBias}' result='l'/>` +
    `<feColorMatrix in='n' type='matrix' values='0 0 0 0 ${dr} 0 0 0 0 ${dg} 0 0 0 0 ${db} 0 -${gain} 0 0 ${darkBias}' result='d'/>` +
    `<feMerge><feMergeNode in='d'/><feMergeNode in='l'/></feMerge></filter>` +
    `<rect width='100%' height='100%' filter='url(%23g)'/></svg>`;
  return `url("data:image/svg+xml,${svg.replace(/</g, '%3C').replace(/>/g, '%3E')}")`;
}

// Scalars that read an edition role (body weight reads --text-weight) are
// re-declared inside each edition block, so a nested data-edition section
// recomputes them instead of inheriting the outer edition's value.
function editionDependents(theme, scalars) {
  const roles = new Set(tokensIn(theme.editions[theme.meta.defaultEdition])
    .map(([trail]) => `--${trail[trail.length - 1]}`));
  return scalars.filter((line) => [...line.matchAll(/var\((--[a-z0-9-]+)\)/g)].some((m) => roles.has(m[1])));
}

function editionLines(theme, name, dependents = []) {
  const lines = [];
  for (const [trail, token] of tokensIn(theme.editions[name], ['editions', name])) {
    const key = trail[trail.length - 1];
    if (key === 'color-scheme') lines.push(`color-scheme: ${token.$value};`);
    else lines.push(`${varName(trail.join('.'))}: ${css(theme, token)};`);
  }
  return [...lines, ...dependents];
}

function block(selector, lines) {
  return `${selector} {\n${lines.map((l) => `  ${l}`).join('\n')}\n}\n`;
}

function build(theme = loadTheme()) {
  const faces = theme.font.faces.$value.map((f) => block('@font-face', [
    `font-family: '${f.family}';`,
    `src: url('${f.file}') format('woff2');`,
    `font-weight: ${f.weight};`,
    `font-style: ${f.style};`,
    ...(f.stretch ? [`font-stretch: ${f.stretch};`] : []),
    'font-display: swap;',
  ]));

  const scalars = [];
  for (const group of ['palette', 'font', 'space', 'layout', 'shape', 'rule', 'state', 'motion', 'component']) {
    for (const [trail, token] of tokensIn(theme[group], [group])) {
      if (trail.join('.') === 'font.faces') continue;
      const value = trail[0] === 'rule' && trail[1] === 'terminal' ? JSON.stringify(token.$value) : css(theme, token);
      scalars.push(`${varName(trail.join('.'))}: ${value};`);
    }
  }
  scalars.push(...typeLines(theme));
  scalars.push(`--texture-grain: ${grainImage(theme)};`);
  scalars.push(`--texture-grain-tile: ${theme.texture.grain.$value.tile}px;`);
  for (const [key, value] of Object.entries(theme.texture.photo.$value)) {
    scalars.push(`--texture-photo-${key.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`)}: ${css(theme, { $value: value })};`);
  }

  const def = theme.meta.defaultEdition;
  const deps = editionDependents(theme, scalars);
  const other = Object.keys(theme.editions).filter((k) => !k.startsWith('$') && k !== def);

  return [
    '/* Generated from theme.json by build-tokens.js. Do not edit by hand. */\n',
    ...faces,
    block(':root', scalars),
    `/* ${def[0].toUpperCase() + def.slice(1)} edition: the default on every device. */\n` +
      block(`:root, [data-edition="${def}"]`, editionLines(theme, def, deps)),
    ...other.map((name) => block(`[data-edition="${name}"]`, editionLines(theme, name, deps))),
    // Inserts are printed on the other stock: paper in the markup
    // (data-edition="day" data-insert), so they are right before any script
    // runs, and charcoal when the reader picks Day. Screen only; print is Day.
    // :root[data-edition="day"] [data-insert] (0,3,0) beats [data-edition="day"].
    '/* Inserts: paper inside Night, charcoal inside Day. On screen only. */\n' +
      `@media screen {\n${block(`:root[data-edition="day"] [data-insert]`, editionLines(theme, def, deps)).replace(/^/gm, '  ').trimEnd()}\n}\n`,
    '/* Print is always the Day edition. */\n' +
      `@media print {\n${block(':root, [data-edition]', editionLines(theme, 'day', deps)).replace(/^/gm, '  ').trimEnd()}\n}\n`,
  ].join('\n');
}

function luminance(hex) {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
    .map((v) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrast(a, b) {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

module.exports = { loadTheme, resolve, build, contrast, OUT };

if (require.main === module) {
  const output = build();
  if (process.argv.includes('--check')) {
    const current = fs.existsSync(OUT) ? fs.readFileSync(OUT, 'utf8') : '';
    if (current !== output) {
      process.stderr.write('tokens.css is stale. Run `npm run tokens`.\n');
      process.exit(1);
    }
  } else {
    fs.writeFileSync(OUT, output);
    process.stdout.write(`Wrote ${path.relative(ROOT, OUT)}\n`);
  }
}
