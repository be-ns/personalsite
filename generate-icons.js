// Site icons, drawn from favicon.svg (npm run generate-icons).
//
// favicon.svg is the source and the icon most browsers use: "BS" in the
// nameplate's display cut (assets/fonts/fraunces-display.woff2, Fraunces at
// optical size 144, weight 800), outlined as paths with fontTools so no font
// loads, Char on a Toxic Orange square, the cover at 16 pixels. This script
// rasterizes it for the places that want a PNG:
//
//   apple-touch-icon.png           180  iOS home screen (full bleed; iOS
//                                       rounds the corners itself)
//   images/icon-32.png              32  browsers that take no SVG icon
//   images/icon-192.png            192  the web app manifest
//   images/icon-512.png            512  the web app manifest
//   images/icon-maskable-512.png   512  the manifest's maskable icon: the
//                                       mark drawn smaller, inside the central
//                                       circle Android may crop the square to
//
// The mark is paths, so sharp (a devDependency, librsvg underneath) draws it
// the same everywhere. Run it after changing favicon.svg.

const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const SOURCE = path.join(ROOT, 'favicon.svg');

const ICONS = [
  { file: 'apple-touch-icon.png', size: 180 },
  { file: 'images/icon-32.png', size: 32 },
  { file: 'images/icon-192.png', size: 192 },
  { file: 'images/icon-512.png', size: 512 },
  { file: 'images/icon-maskable-512.png', size: 512, maskable: true },
];

// A maskable icon keeps what matters inside a circle of 80% of its width,
// centred. The mark spans 84 of the 100 units across; at 0.72 its corners sit
// 35 units from the centre, inside the circle's 40.
const MASKABLE_SCALE = 0.72;

function maskable(svg) {
  const out = svg.replace(/<g id="mark"([^>]*)>/, `<g id="mark"$1 transform="translate(50 50) scale(${MASKABLE_SCALE}) translate(-50 -50)">`);
  if (out === svg) throw new Error('favicon.svg has no <g id="mark"> to draw the maskable icon from');
  return out;
}

async function main() {
  const sharp = require('sharp');
  const svg = fs.readFileSync(SOURCE, 'utf8');
  for (const icon of ICONS) {
    const src = Buffer.from(icon.maskable ? maskable(svg) : svg);
    const out = path.join(ROOT, icon.file);
    await sharp(src, { density: Math.ceil((72 * icon.size) / 100) * 2 })
      .resize(icon.size, icon.size)
      .flatten({ background: '#FE5F35' })
      .png({ compressionLevel: 9, palette: icon.size <= 192 })
      .toFile(out);
    console.log(`  ${icon.file}  ${icon.size}x${icon.size}  ${(fs.statSync(out).size / 1024).toFixed(1)} KB`);
  }
}

module.exports = { ICONS, MASKABLE_SCALE };

if (require.main === module) {
  main().catch((err) => { console.error(err); process.exit(1); });
}
