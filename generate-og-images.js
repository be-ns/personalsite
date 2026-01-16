const { createCanvas } = require('canvas');
const fs = require('fs');

// Brand colors
const colors = {
  yellow: '#FFE227',
  dark: '#1A1A1A',
  white: '#FFFFFF',
  warm: '#FAF9F7',
  cobalt: '#0047AB',
  teal: '#0D7377',
  yellowHover: '#FFD800',
};

// OG image dimensions (standard)
const WIDTH = 1200;
const HEIGHT = 630;

// Create a grainy texture overlay
function addGrainTexture(ctx, width, height, opacity = 0.08) {
  const imageData = ctx.getImageData(0, 0, width, height);
  const data = imageData.data;

  for (let i = 0; i < data.length; i += 4) {
    const noise = (Math.random() - 0.5) * 255 * opacity;
    data[i] += noise;     // R
    data[i + 1] += noise; // G
    data[i + 2] += noise; // B
  }

  ctx.putImageData(imageData, 0, 0);
}

// Add chromatic aberration effect to text
function drawChromaticText(ctx, text, x, y, fontSize, font, offsetAmount = 2) {
  ctx.font = `${fontSize}px ${font}`;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';

  // Red channel (offset left)
  ctx.fillStyle = `rgba(0, 71, 171, 0.3)`; // Cobalt with transparency
  ctx.fillText(text, x - offsetAmount, y);

  // Green channel (offset right)
  ctx.fillStyle = `rgba(255, 226, 39, 0.3)`; // Yellow with transparency
  ctx.fillText(text, x + offsetAmount, y);

  // Main text
  ctx.fillStyle = colors.dark;
  ctx.fillText(text, x, y);
}

// Draw mathematical grid pattern
function drawMathematicalPattern(ctx, width, height, primaryColor, secondaryColor) {
  ctx.strokeStyle = primaryColor;
  ctx.lineWidth = 1;
  ctx.globalAlpha = 0.15;

  // Grid lines
  const spacing = 40;
  for (let x = 0; x < width; x += spacing) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, height);
    ctx.stroke();
  }

  for (let y = 0; y < height; y += spacing) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(width, y);
    ctx.stroke();
  }

  ctx.globalAlpha = 1;
}

// Draw mathematical shapes and patterns
function drawMathematicalShapes(ctx, width, height, accentColor, pattern = 'circles') {
  ctx.strokeStyle = accentColor;
  ctx.lineWidth = 2;
  ctx.globalAlpha = 0.25;

  if (pattern === 'circles') {
    // Concentric circles in bottom right
    for (let r = 50; r < 400; r += 50) {
      ctx.beginPath();
      ctx.arc(width - 100, height - 100, r, 0, Math.PI * 2);
      ctx.stroke();
    }
  } else if (pattern === 'spiral') {
    // Fibonacci spiral
    ctx.beginPath();
    const centerX = width - 150;
    const centerY = height - 150;
    const maxRadius = 300;
    const spiralTightness = 0.15;

    for (let angle = 0; angle < Math.PI * 8; angle += 0.1) {
      const radius = spiralTightness * angle * 15;
      if (radius > maxRadius) break;
      const x = centerX + radius * Math.cos(angle);
      const y = centerY + radius * Math.sin(angle);

      if (angle === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    }
    ctx.stroke();
  } else if (pattern === 'waves') {
    // Sine waves
    for (let offset = 0; offset < 3; offset++) {
      ctx.beginPath();
      for (let x = 0; x < width; x += 5) {
        const y = height - 150 + Math.sin((x + offset * 100) / 60) * 80;
        if (x === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      }
      ctx.stroke();
    }
  } else if (pattern === 'geometric') {
    // Geometric shapes
    const size = 120;
    const startX = width - 250;
    const startY = height - 250;

    // Hexagon
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const angle = (Math.PI / 3) * i;
      const x = startX + size * Math.cos(angle);
      const y = startY + size * Math.sin(angle);
      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    }
    ctx.closePath();
    ctx.stroke();
  }

  ctx.globalAlpha = 1;
}

// Generate OG image for a page
function generateOGImage(config) {
  const canvas = createCanvas(WIDTH, HEIGHT);
  const ctx = canvas.getContext('2d');

  // Background
  ctx.fillStyle = config.backgroundColor || colors.warm;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  // Mathematical grid pattern
  drawMathematicalPattern(ctx, WIDTH, HEIGHT, colors.dark, colors.yellow);

  // Mathematical shapes
  drawMathematicalShapes(ctx, WIDTH, HEIGHT, config.accentColor || colors.yellow, config.pattern || 'circles');

  // Large accent bar (top)
  ctx.fillStyle = config.accentColor || colors.yellow;
  ctx.fillRect(0, 0, WIDTH, 8);

  // Title with chromatic aberration
  const titleSize = config.titleSize || 72;
  const title = config.title;
  const titleY = 120;

  drawChromaticText(ctx, title, 80, titleY, titleSize, 'bold sans-serif', 3);

  // Subtitle
  if (config.subtitle) {
    ctx.font = '36px sans-serif';
    ctx.fillStyle = colors.dark;
    ctx.globalAlpha = 0.6;
    ctx.fillText(config.subtitle, 80, titleY + titleSize + 30);
    ctx.globalAlpha = 1;
  }

  // Domain name with accent
  const domainY = HEIGHT - 100;
  ctx.font = '32px sans-serif';
  ctx.fillStyle = colors.dark;
  ctx.globalAlpha = 0.5;
  ctx.fillText('bensiverly.com', 80, domainY);
  ctx.globalAlpha = 1;

  // Small accent square next to domain
  ctx.fillStyle = config.accentColor || colors.yellow;
  ctx.fillRect(80, domainY - 45, 40, 40);

  // Add grain texture
  addGrainTexture(ctx, WIDTH, HEIGHT, 0.12);

  // Save to file
  const buffer = canvas.toBuffer('image/png');
  fs.writeFileSync(config.outputPath, buffer);
  console.log(`✓ Generated: ${config.outputPath}`);
}

// Generate all OG images
const pages = [
  {
    title: 'Ben Siverly',
    subtitle: 'Product Manager, Builder, Gardener',
    accentColor: colors.yellow,
    backgroundColor: colors.warm,
    pattern: 'circles',
    titleSize: 84,
    outputPath: './images/og-home.png',
  },
  {
    title: 'Life Strategy Matrix',
    subtitle: 'Score life areas. See where to invest.',
    accentColor: colors.cobalt,
    backgroundColor: colors.warm,
    pattern: 'geometric',
    titleSize: 72,
    outputPath: './images/og-life-strategy.png',
  },
  {
    title: 'Memorial Pamphlet',
    subtitle: 'Create a dignified memorial pamphlet.',
    accentColor: colors.teal,
    backgroundColor: colors.warm,
    pattern: 'waves',
    titleSize: 72,
    outputPath: './images/og-memorial-pamphlet.png',
  },
  {
    title: 'Native Plant Finder',
    subtitle: 'Find plants tailored to your region.',
    accentColor: colors.yellow,
    backgroundColor: colors.warm,
    pattern: 'spiral',
    titleSize: 72,
    outputPath: './images/og-native-plant-finder.png',
  },
  {
    title: 'Service of Life Builder',
    subtitle: 'Build a liturgy for a memorial.',
    accentColor: colors.cobalt,
    backgroundColor: colors.warm,
    pattern: 'waves',
    titleSize: 66,
    outputPath: './images/og-service-of-life.png',
  },
];

// Create images directory if it doesn't exist
if (!fs.existsSync('./images')) {
  fs.mkdirSync('./images');
}

// Generate all images
console.log('Generating OG images...\n');
pages.forEach(config => generateOGImage(config));
console.log('\n✨ All OG images generated successfully!');
