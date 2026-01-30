const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

// OG image dimensions (standard)
const WIDTH = 1200;
const HEIGHT = 630;

// Seed random for reproducibility
let seed = 12345;
function seededRandom() {
  seed = (seed * 9301 + 49297) % 233280;
  return seed / 233280;
}

function resetSeed(newSeed) {
  seed = newSeed;
}

// Parse hex color to RGB
function hexToRgb(hex) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : { r: 0, g: 0, b: 0 };
}

// Color palettes inspired by de Kooning
const palettes = {
  // Deep ocean blues with earth tones - like "A Tree in Naples"
  ocean: {
    primary: ['#1a5f7a', '#2d7d9a', '#0f4c5c', '#186a8a', '#0d3d4d'],
    accent: ['#8b4513', '#6b3a0f', '#a0522d', '#cd853f'],
    highlight: ['#f5f5dc', '#faebd7', '#87ceeb'],
    background: '#0a2f3a',
  },
  // Soft pastels with bold strokes - like "Woman"
  pastel: {
    primary: ['#f4a6a0', '#e8b4b8', '#d4a5a5', '#ffb7b2'],
    accent: ['#2e4a87', '#3d5a99', '#6b88c9', '#1e3a6e'],
    highlight: ['#fff8dc', '#fffaf0', '#ffefd5', '#f0e68c'],
    background: '#faf6f0',
  },
  // Cobalt and warmth - for analytical tools
  cobalt: {
    primary: ['#0047AB', '#1e5bc6', '#0a3d91', '#2d6fd3', '#003d8f'],
    accent: ['#FFE227', '#ffd700', '#f4d03f', '#ffce00'],
    highlight: ['#faf9f7', '#ffffff', '#f0f0f0'],
    background: '#f8f7f5',
  },
  // Teal and earth - contemplative
  teal: {
    primary: ['#0D7377', '#0a5c5f', '#11898d', '#087f83', '#065a5d'],
    accent: ['#d4a574', '#c9986b', '#deb887', '#b8956c'],
    highlight: ['#faf9f7', '#e8e4df', '#f5f0eb'],
    background: '#f5f3f0',
  },
  // Earth and green - natural
  earth: {
    primary: ['#2d5a27', '#3a6f35', '#1e4620', '#4a8544', '#2b5025'],
    accent: ['#8b6914', '#a67c00', '#c49102', '#daa520'],
    highlight: ['#f5f5dc', '#fffaf0', '#faebd7'],
    background: '#f7f5f0',
  },
  // Warm literary tones - for writings
  literary: {
    primary: ['#2c1810', '#3d2317', '#4a2c1c', '#5c3a28'],
    accent: ['#c9a959', '#b8973f', '#d4b86a', '#e8ca7a'],
    highlight: ['#f4ece0', '#fff8f0', '#faf6f0', '#eee8dc'],
    background: '#f8f4ec',
  },
};

// Utility to pick random from array
function pick(arr) {
  return arr[Math.floor(seededRandom() * arr.length)];
}

// Create a raw pixel buffer with abstract expressionist brushstrokes
function createAbstractBuffer(palette, config = {}) {
  const { density = 15, direction = 'mixed' } = config;
  const bgColor = hexToRgb(palette.background);

  // Create RGBA buffer initialized with background
  const buffer = Buffer.alloc(WIDTH * HEIGHT * 4);
  for (let i = 0; i < WIDTH * HEIGHT; i++) {
    buffer[i * 4] = bgColor.r;
    buffer[i * 4 + 1] = bgColor.g;
    buffer[i * 4 + 2] = bgColor.b;
    buffer[i * 4 + 3] = 255;
  }

  // Helper to draw a soft ellipse/blob
  function drawSoftBlob(cx, cy, radiusX, radiusY, color, alpha) {
    const rgb = hexToRgb(color);
    const minX = Math.max(0, Math.floor(cx - radiusX - 20));
    const maxX = Math.min(WIDTH - 1, Math.ceil(cx + radiusX + 20));
    const minY = Math.max(0, Math.floor(cy - radiusY - 20));
    const maxY = Math.min(HEIGHT - 1, Math.ceil(cy + radiusY + 20));

    for (let y = minY; y <= maxY; y++) {
      for (let x = minX; x <= maxX; x++) {
        const dx = (x - cx) / radiusX;
        const dy = (y - cy) / radiusY;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < 1.3) {
          // Soft falloff
          const strength = Math.max(0, 1 - dist) * alpha;
          const noise = (seededRandom() - 0.5) * 0.15;
          const finalAlpha = Math.max(0, Math.min(1, strength + noise));

          const idx = (y * WIDTH + x) * 4;
          buffer[idx] = Math.round(buffer[idx] * (1 - finalAlpha) + rgb.r * finalAlpha);
          buffer[idx + 1] = Math.round(buffer[idx + 1] * (1 - finalAlpha) + rgb.g * finalAlpha);
          buffer[idx + 2] = Math.round(buffer[idx + 2] * (1 - finalAlpha) + rgb.b * finalAlpha);
        }
      }
    }
  }

  // Helper to draw a brushstroke (series of overlapping ellipses)
  function drawBrushstroke(x1, y1, x2, y2, color, width, alpha) {
    const dx = x2 - x1;
    const dy = y2 - y1;
    const length = Math.sqrt(dx * dx + dy * dy);
    const steps = Math.max(10, Math.floor(length / 8));

    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      // Add some waviness
      const perpX = -dy / length;
      const perpY = dx / length;
      const wave = Math.sin(t * Math.PI * 2) * width * 0.3;

      const cx = x1 + dx * t + perpX * wave + (seededRandom() - 0.5) * 10;
      const cy = y1 + dy * t + perpY * wave + (seededRandom() - 0.5) * 10;

      // Taper at ends
      const taper = Math.sin(t * Math.PI);
      const radiusX = width * (0.4 + taper * 0.6) * (0.8 + seededRandom() * 0.4);
      const radiusY = width * 0.6 * (0.4 + taper * 0.6) * (0.8 + seededRandom() * 0.4);

      drawSoftBlob(cx, cy, radiusX, radiusY, color, alpha * (0.7 + seededRandom() * 0.3));
    }
  }

  // Layer 1: Large bold swaths
  const swathCount = config.swathCount || 4;
  for (let i = 0; i < swathCount; i++) {
    const color = pick(palette.primary);
    const cx = seededRandom() * WIDTH;
    const cy = seededRandom() * HEIGHT;
    const rx = 150 + seededRandom() * 250;
    const ry = 100 + seededRandom() * 200;
    drawSoftBlob(cx, cy, rx, ry, color, 0.6 + seededRandom() * 0.3);
  }

  // Layer 2: Gestural brushstrokes
  const colors = [...palette.primary, ...palette.accent];
  for (let i = 0; i < density; i++) {
    const color = pick(colors);
    let x1, y1, x2, y2;

    if (direction === 'horizontal') {
      x1 = -50 + seededRandom() * (WIDTH + 100);
      y1 = seededRandom() * HEIGHT;
      x2 = x1 + 200 + seededRandom() * 400;
      y2 = y1 + (seededRandom() - 0.5) * 150;
    } else if (direction === 'vertical') {
      x1 = seededRandom() * WIDTH;
      y1 = -50 + seededRandom() * (HEIGHT + 100);
      x2 = x1 + (seededRandom() - 0.5) * 150;
      y2 = y1 + 200 + seededRandom() * 300;
    } else {
      x1 = seededRandom() * WIDTH;
      y1 = seededRandom() * HEIGHT;
      const angle = seededRandom() * Math.PI * 2;
      const len = 150 + seededRandom() * 350;
      x2 = x1 + Math.cos(angle) * len;
      y2 = y1 + Math.sin(angle) * len;
    }

    const width = 20 + seededRandom() * 50;
    drawBrushstroke(x1, y1, x2, y2, color, width, 0.4 + seededRandom() * 0.4);
  }

  // Layer 3: Smaller accent strokes
  for (let i = 0; i < Math.floor(density / 2); i++) {
    const color = pick(colors);
    const x1 = seededRandom() * WIDTH;
    const y1 = seededRandom() * HEIGHT;
    const angle = seededRandom() * Math.PI * 2;
    const len = 80 + seededRandom() * 200;
    const x2 = x1 + Math.cos(angle) * len;
    const y2 = y1 + Math.sin(angle) * len;
    drawBrushstroke(x1, y1, x2, y2, color, 10 + seededRandom() * 25, 0.3 + seededRandom() * 0.4);
  }

  // Layer 4: Highlight marks
  for (let i = 0; i < 6 + Math.floor(seededRandom() * 6); i++) {
    const color = pick(palette.highlight);
    const x1 = seededRandom() * WIDTH;
    const y1 = seededRandom() * HEIGHT;
    const angle = seededRandom() * Math.PI * 2;
    const len = 40 + seededRandom() * 120;
    const x2 = x1 + Math.cos(angle) * len;
    const y2 = y1 + Math.sin(angle) * len;
    drawBrushstroke(x1, y1, x2, y2, color, 5 + seededRandom() * 12, 0.4 + seededRandom() * 0.4);
  }

  // Layer 5: Accent splashes
  for (let i = 0; i < 3 + Math.floor(seededRandom() * 4); i++) {
    const color = pick(palette.accent);
    const cx = seededRandom() * WIDTH;
    const cy = seededRandom() * HEIGHT;
    const r = 15 + seededRandom() * 45;
    drawSoftBlob(cx, cy, r, r, color, 0.5 + seededRandom() * 0.4);
  }

  // Add subtle grain
  for (let i = 0; i < buffer.length; i += 4) {
    const noise = (seededRandom() - 0.5) * 15;
    buffer[i] = Math.max(0, Math.min(255, buffer[i] + noise));
    buffer[i + 1] = Math.max(0, Math.min(255, buffer[i + 1] + noise));
    buffer[i + 2] = Math.max(0, Math.min(255, buffer[i + 2] + noise));
  }

  return buffer;
}

// Create SVG overlay for text
function createTextOverlay(config, palette) {
  const isDark = palette.background.match(/^#[0-4]/);
  const textColor = isDark ? '#ffffff' : '#1a1a1a';
  const subtitleColor = isDark ? 'rgba(255,255,255,0.7)' : 'rgba(26,26,26,0.6)';
  const bgColor = palette.background;
  const accentColor = pick(palette.accent);

  const titleSize = config.titleSize || 72;
  const backdropY = config.textPosition === 'bottom' ? HEIGHT - 200 : 80;
  const titleY = backdropY + 50 + titleSize * 0.4;
  const subtitleY = titleY + titleSize * 0.6 + 20;
  const domainY = config.textPosition === 'bottom' ? 50 : HEIGHT - 55;

  // Escape HTML entities in text
  const escapeHtml = (text) => text.replace(/[&<>"']/g, (char) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[char]));

  const svg = `
    <svg width="${WIDTH}" height="${HEIGHT}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
          <feMerge>
            <feMergeNode in="coloredBlur"/>
            <feMergeNode in="SourceGraphic"/>
          </feMerge>
        </filter>
      </defs>

      <!-- Semi-transparent backdrop for text -->
      <rect x="50" y="${backdropY}" width="${WIDTH - 100}" height="${config.subtitle ? 160 : 120}"
            fill="${bgColor}" fill-opacity="0.75" rx="8"/>

      <!-- Title with subtle glow -->
      <text x="80" y="${titleY}"
            font-family="system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif"
            font-size="${titleSize}" font-weight="bold" fill="${textColor}"
            filter="url(#glow)">
        ${escapeHtml(config.title)}
      </text>

      ${config.subtitle ? `
      <text x="80" y="${subtitleY}"
            font-family="system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif"
            font-size="32" fill="${subtitleColor}">
        ${escapeHtml(config.subtitle)}
      </text>
      ` : ''}

      <!-- Domain with accent circle -->
      <circle cx="60" cy="${domainY}" r="8" fill="${accentColor}"/>
      <text x="80" y="${domainY + 8}"
            font-family="system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif"
            font-size="24" fill="${subtitleColor}">
        bensiverly.com
      </text>
    </svg>
  `;

  return Buffer.from(svg);
}

// Generate OG image for a page
async function generateOGImage(config) {
  resetSeed(config.seed || 12345);

  const palette = palettes[config.palette] || palettes.ocean;

  // Create abstract background
  const abstractBuffer = createAbstractBuffer(palette, {
    density: config.density || 18,
    swathCount: config.swathCount || 4,
    direction: config.direction || 'mixed',
  });

  // Create text overlay
  const textOverlay = createTextOverlay(config, palette);

  // Compose final image
  await sharp(abstractBuffer, { raw: { width: WIDTH, height: HEIGHT, channels: 4 } })
    .composite([{
      input: textOverlay,
      top: 0,
      left: 0,
    }])
    .png()
    .toFile(config.outputPath);

  console.log(`  Generated: ${config.outputPath}`);
}

// Page configurations
const pages = [
  {
    title: 'Ben Siverly',
    subtitle: 'Product Manager, Builder, Gardener',
    palette: 'ocean',
    seed: 42,
    density: 20,
    swathCount: 5,
    direction: 'horizontal',
    titleSize: 84,
    textPosition: 'top',
    outputPath: './images/og-home.png',
  },
  {
    title: 'Decision Assist',
    subtitle: 'Weighted criteria for clearer choices',
    palette: 'pastel',
    seed: 123,
    density: 16,
    swathCount: 4,
    direction: 'mixed',
    titleSize: 72,
    textPosition: 'top',
    outputPath: './images/og-decision-assist.png',
  },
  {
    title: 'Life Strategy Matrix',
    subtitle: 'Score life areas. See where to invest.',
    palette: 'cobalt',
    seed: 456,
    density: 18,
    swathCount: 4,
    direction: 'horizontal',
    titleSize: 68,
    textPosition: 'top',
    outputPath: './images/og-life-strategy.png',
  },
  {
    title: 'Memorial Pamphlet',
    subtitle: 'Create a dignified memorial pamphlet',
    palette: 'teal',
    seed: 789,
    density: 14,
    swathCount: 3,
    direction: 'vertical',
    titleSize: 68,
    textPosition: 'top',
    outputPath: './images/og-memorial-pamphlet.png',
  },
  {
    title: 'Native Plant Finder',
    subtitle: 'Find plants tailored to your region',
    palette: 'earth',
    seed: 1011,
    density: 16,
    swathCount: 4,
    direction: 'mixed',
    titleSize: 68,
    textPosition: 'top',
    outputPath: './images/og-native-plant-finder.png',
  },
  {
    title: 'Service of Life Builder',
    subtitle: 'Build a liturgy for a memorial',
    palette: 'cobalt',
    seed: 1213,
    density: 14,
    swathCount: 3,
    direction: 'horizontal',
    titleSize: 60,
    textPosition: 'top',
    outputPath: './images/og-service-of-life.png',
  },
  {
    title: 'Writings',
    subtitle: 'Poetry and prose',
    palette: 'literary',
    seed: 1415,
    density: 12,
    swathCount: 3,
    direction: 'mixed',
    titleSize: 84,
    textPosition: 'top',
    outputPath: './images/og-writings.png',
  },
];

// Create images directory if it doesn't exist
if (!fs.existsSync('./images')) {
  fs.mkdirSync('./images');
}

// Generate all images
async function main() {
  console.log('\n  Generating abstract expressionist OG images...\n');

  for (const config of pages) {
    await generateOGImage(config);
  }

  console.log('\n  All OG images generated.\n');
}

main().catch(console.error);
