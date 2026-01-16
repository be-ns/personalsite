#!/usr/bin/env python3
from PIL import Image, ImageDraw, ImageFont, ImageFilter
import random
import math
import os

# Brand colors (RGB)
colors = {
    'yellow': (255, 226, 39),
    'yellow_hover': (255, 216, 0),
    'dark': (26, 26, 26),
    'white': (255, 255, 255),
    'warm': (250, 249, 247),
    'cobalt': (0, 71, 171),
    'teal': (13, 115, 119),
}

# OG image dimensions
WIDTH = 1200
HEIGHT = 630

def add_grain_texture(img, intensity=0.12):
    """Add grainy texture to the image"""
    pixels = img.load()
    for y in range(img.height):
        for x in range(img.width):
            r, g, b = pixels[x, y][:3]
            noise = int((random.random() - 0.5) * 255 * intensity)
            r = max(0, min(255, r + noise))
            g = max(0, min(255, g + noise))
            b = max(0, min(255, b + noise))
            pixels[x, y] = (r, g, b)
    return img

def draw_chromatic_text(draw, text, x, y, font, accent_color):
    """Draw text with chromatic aberration effect"""
    offset = 3

    # Blue channel (offset left)
    cobalt_transparent = colors['cobalt'] + (80,)
    draw.text((x - offset, y), text, fill=cobalt_transparent, font=font)

    # Yellow channel (offset right)
    yellow_transparent = accent_color + (80,)
    draw.text((x + offset, y), text, fill=yellow_transparent, font=font)

    # Main text
    draw.text((x, y), text, fill=colors['dark'], font=font)

def draw_mathematical_grid(draw, width, height, opacity=20):
    """Draw mathematical grid pattern"""
    spacing = 40
    grid_color = colors['dark'] + (opacity,)

    # Vertical lines
    for x in range(0, width, spacing):
        draw.line([(x, 0), (x, height)], fill=grid_color, width=1)

    # Horizontal lines
    for y in range(0, height, spacing):
        draw.line([(0, y), (width, y)], fill=grid_color, width=1)

def draw_mathematical_pattern(draw, width, height, accent_color, pattern='circles'):
    """Draw mathematical shapes and patterns"""
    line_color = accent_color + (60,)

    if pattern == 'circles':
        # Concentric circles in bottom right
        center_x, center_y = width - 100, height - 100
        for r in range(50, 400, 50):
            draw.ellipse([center_x - r, center_y - r, center_x + r, center_y + r],
                        outline=line_color, width=2)

    elif pattern == 'spiral':
        # Fibonacci spiral
        center_x, center_y = width - 150, height - 150
        max_radius = 300
        spiral_tightness = 0.15
        points = []

        angle = 0
        while angle < math.pi * 8:
            radius = spiral_tightness * angle * 15
            if radius > max_radius:
                break
            x = center_x + radius * math.cos(angle)
            y = center_y + radius * math.sin(angle)
            points.append((x, y))
            angle += 0.1

        if len(points) > 1:
            draw.line(points, fill=line_color, width=2)

    elif pattern == 'waves':
        # Sine waves
        for offset_mult in range(3):
            points = []
            for x in range(0, width, 5):
                y = height - 150 + math.sin((x + offset_mult * 100) / 60) * 80
                points.append((x, y))
            if len(points) > 1:
                draw.line(points, fill=line_color, width=2)

    elif pattern == 'geometric':
        # Hexagon
        center_x, center_y = width - 250, height - 250
        size = 120
        points = []
        for i in range(7):  # 7 to close the shape
            angle = (math.pi / 3) * i
            x = center_x + size * math.cos(angle)
            y = center_y + size * math.sin(angle)
            points.append((x, y))
        draw.line(points, fill=line_color, width=2)

def generate_og_image(config):
    """Generate an OG image based on configuration"""
    # Create image with background color
    img = Image.new('RGB', (WIDTH, HEIGHT), config['background_color'])

    # Create drawing layer with alpha for overlays
    overlay = Image.new('RGBA', (WIDTH, HEIGHT), (0, 0, 0, 0))
    draw_overlay = ImageDraw.Draw(overlay)

    # Draw mathematical grid
    draw_mathematical_grid(draw_overlay, WIDTH, HEIGHT)

    # Draw mathematical pattern
    draw_mathematical_pattern(draw_overlay, WIDTH, HEIGHT,
                              config['accent_color'], config['pattern'])

    # Composite overlay onto base image
    img = Image.alpha_composite(img.convert('RGBA'), overlay).convert('RGB')

    # Create main drawing context
    draw = ImageDraw.Draw(img)

    # Top accent bar
    draw.rectangle([0, 0, WIDTH, 8], fill=config['accent_color'])

    # Load fonts (use default if custom not available)
    try:
        title_font = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf',
                                       config['title_size'])
        subtitle_font = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf', 36)
        domain_font = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf', 32)
    except:
        # Fallback to default font
        title_font = ImageFont.load_default()
        subtitle_font = ImageFont.load_default()
        domain_font = ImageFont.load_default()

    # Draw title with chromatic aberration
    title_y = 120
    # Create separate layer for chromatic text
    text_layer = Image.new('RGBA', (WIDTH, HEIGHT), (0, 0, 0, 0))
    text_draw = ImageDraw.Draw(text_layer)
    draw_chromatic_text(text_draw, config['title'], 80, title_y, title_font,
                       config['accent_color'])
    img = Image.alpha_composite(img.convert('RGBA'), text_layer).convert('RGB')

    # Draw subtitle
    if config.get('subtitle'):
        subtitle_y = title_y + config['title_size'] + 30
        subtitle_color = colors['dark'] + (150,)  # Semi-transparent
        subtitle_layer = Image.new('RGBA', (WIDTH, HEIGHT), (0, 0, 0, 0))
        subtitle_draw = ImageDraw.Draw(subtitle_layer)
        subtitle_draw.text((80, subtitle_y), config['subtitle'],
                          fill=subtitle_color, font=subtitle_font)
        img = Image.alpha_composite(img.convert('RGBA'), subtitle_layer).convert('RGB')

    # Small accent square next to domain
    domain_y = HEIGHT - 100
    draw.rectangle([80, domain_y - 45, 120, domain_y - 5], fill=config['accent_color'])

    # Draw domain name
    domain_color = colors['dark'] + (130,)
    domain_layer = Image.new('RGBA', (WIDTH, HEIGHT), (0, 0, 0, 0))
    domain_draw = ImageDraw.Draw(domain_layer)
    domain_draw.text((80, domain_y), 'bensiverly.com', fill=domain_color, font=domain_font)
    img = Image.alpha_composite(img.convert('RGBA'), domain_layer).convert('RGB')

    # Add grain texture
    img = add_grain_texture(img, intensity=0.12)

    # Save image
    img.save(config['output_path'], 'PNG', quality=95)
    print(f"✓ Generated: {config['output_path']}")

# Configuration for all pages
pages = [
    {
        'title': 'Ben Siverly',
        'subtitle': 'Product Manager, Builder, Gardener',
        'accent_color': colors['yellow'],
        'background_color': colors['warm'],
        'pattern': 'circles',
        'title_size': 84,
        'output_path': './images/og-home.png',
    },
    {
        'title': 'Life Strategy Matrix',
        'subtitle': 'Score life areas. See where to invest.',
        'accent_color': colors['cobalt'],
        'background_color': colors['warm'],
        'pattern': 'geometric',
        'title_size': 72,
        'output_path': './images/og-life-strategy.png',
    },
    {
        'title': 'Memorial Pamphlet',
        'subtitle': 'Create a dignified memorial pamphlet.',
        'accent_color': colors['teal'],
        'background_color': colors['warm'],
        'pattern': 'waves',
        'title_size': 72,
        'output_path': './images/og-memorial-pamphlet.png',
    },
    {
        'title': 'Native Plant Finder',
        'subtitle': 'Find plants tailored to your region.',
        'accent_color': colors['yellow'],
        'background_color': colors['warm'],
        'pattern': 'spiral',
        'title_size': 72,
        'output_path': './images/og-native-plant-finder.png',
    },
    {
        'title': 'Service of Life Builder',
        'subtitle': 'Build a liturgy for a memorial.',
        'accent_color': colors['cobalt'],
        'background_color': colors['warm'],
        'pattern': 'waves',
        'title_size': 66,
        'output_path': './images/og-service-of-life.png',
    },
]

if __name__ == '__main__':
    # Create images directory if it doesn't exist
    os.makedirs('./images', exist_ok=True)

    print('Generating OG images...\n')
    for config in pages:
        generate_og_image(config)
    print('\n✨ All OG images generated successfully!')
