#!/usr/bin/env python3
from PIL import Image, ImageDraw, ImageFont, ImageFilter
import random
import math
import os

# Brand colors (RGB) - vibrant versions
colors = {
    'yellow': (255, 226, 39),
    'yellow_bright': (255, 240, 80),
    'dark': (26, 26, 26),
    'white': (255, 255, 255),
    'cobalt': (0, 71, 171),
    'cobalt_bright': (60, 120, 255),
    'teal': (13, 115, 119),
    'teal_bright': (0, 220, 220),
    'purple': (140, 80, 255),
    'magenta': (255, 60, 180),
    'cyan': (0, 240, 255),
    'orange': (255, 140, 50),
    'pink': (255, 120, 200),
    'green': (80, 255, 150),
}

# OG image dimensions
WIDTH = 1200
HEIGHT = 630

def create_mesh_gradient(width, height, gradient_points):
    """Create a smooth mesh gradient with multiple color points"""
    img = Image.new('RGB', (width, height))
    pixels = img.load()

    for y in range(height):
        for x in range(width):
            # Blend colors from all gradient points
            total_weight = 0
            r_sum, g_sum, b_sum = 0, 0, 0

            for gp in gradient_points:
                # Calculate distance from this gradient point
                dx = x - gp['x']
                dy = y - gp['y']
                distance = math.sqrt(dx * dx + dy * dy)

                # Use inverse distance for weighting (closer = more influence)
                # Add a minimum distance to avoid division by zero
                weight = 1.0 / (distance + gp.get('radius', 300))

                r_sum += gp['color'][0] * weight
                g_sum += gp['color'][1] * weight
                b_sum += gp['color'][2] * weight
                total_weight += weight

            # Normalize by total weight
            r = int(r_sum / total_weight)
            g = int(g_sum / total_weight)
            b = int(b_sum / total_weight)

            pixels[x, y] = (r, g, b)

    return img

def add_heavy_grain_texture(img, intensity=0.15):
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

def add_text_overlay(img, title, subtitle=None):
    """Add text overlay with clean typography"""
    # Create RGBA layer for text
    text_layer = Image.new('RGBA', (WIDTH, HEIGHT), (0, 0, 0, 0))
    draw = ImageDraw.Draw(text_layer)

    # Load fonts
    try:
        title_font = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf', 84)
        subtitle_font = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf', 40)
        domain_font = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf', 32)
    except:
        title_font = ImageFont.load_default()
        subtitle_font = ImageFont.load_default()
        domain_font = ImageFont.load_default()

    # Draw title (white with stronger shadow)
    title_y = 200
    # Shadow
    draw.text((84, title_y + 4), title, fill=(0, 0, 0, 120), font=title_font)
    # Main text
    draw.text((80, title_y), title, fill=(255, 255, 255, 255), font=title_font)

    # Draw subtitle if provided
    if subtitle:
        subtitle_y = title_y + 100
        # Shadow
        draw.text((82, subtitle_y + 2), subtitle, fill=(0, 0, 0, 100), font=subtitle_font)
        # Main text
        draw.text((80, subtitle_y), subtitle, fill=(255, 255, 255, 230), font=subtitle_font)

    # Draw domain in bottom left
    domain_y = HEIGHT - 80
    # Shadow
    draw.text((82, domain_y + 2), 'bensiverly.com', fill=(0, 0, 0, 100), font=domain_font)
    # Main text
    draw.text((80, domain_y), 'bensiverly.com', fill=(255, 255, 255, 200), font=domain_font)

    # Composite text layer onto image
    img = img.convert('RGBA')
    img = Image.alpha_composite(img, text_layer)
    return img.convert('RGB')

def generate_og_image(config):
    """Generate an OG image with smooth mesh gradient and grain"""
    # Create mesh gradient background
    img = create_mesh_gradient(WIDTH, HEIGHT, config['gradient_points'])

    # Apply heavy blur for that soft, dreamy look
    img = img.filter(ImageFilter.GaussianBlur(radius=80))

    # Add grain texture
    img = add_heavy_grain_texture(img, intensity=0.15)

    # Add text overlay
    img = add_text_overlay(img, config['title'], config.get('subtitle'))

    # Save image
    img.save(config['output_path'], 'PNG', quality=95)
    print(f"✓ Generated: {config['output_path']}")

# Configuration for all pages with unique mesh gradients
pages = [
    {
        'title': 'Ben Siverly',
        'subtitle': 'Product Manager, Builder, Gardener',
        'gradient_points': [
            {'x': 0, 'y': 0, 'color': colors['yellow_bright'], 'radius': 250},
            {'x': WIDTH, 'y': 0, 'color': colors['orange'], 'radius': 250},
            {'x': WIDTH//2, 'y': HEIGHT, 'color': colors['cobalt_bright'], 'radius': 300},
            {'x': WIDTH, 'y': HEIGHT, 'color': colors['purple'], 'radius': 250},
        ],
        'output_path': './images/og-home.png',
    },
    {
        'title': 'Life Strategy Matrix',
        'subtitle': 'Score life areas. See where to invest.',
        'gradient_points': [
            {'x': 0, 'y': 0, 'color': colors['cobalt_bright'], 'radius': 250},
            {'x': WIDTH, 'y': 0, 'color': colors['purple'], 'radius': 250},
            {'x': 0, 'y': HEIGHT, 'color': colors['teal_bright'], 'radius': 300},
            {'x': WIDTH, 'y': HEIGHT, 'color': colors['cyan'], 'radius': 250},
        ],
        'output_path': './images/og-life-strategy.png',
    },
    {
        'title': 'Memorial Pamphlet',
        'subtitle': 'Create a dignified memorial pamphlet.',
        'gradient_points': [
            {'x': 0, 'y': HEIGHT//2, 'color': colors['teal_bright'], 'radius': 250},
            {'x': WIDTH//2, 'y': 0, 'color': colors['cobalt_bright'], 'radius': 300},
            {'x': WIDTH, 'y': HEIGHT//2, 'color': colors['purple'], 'radius': 250},
            {'x': WIDTH//2, 'y': HEIGHT, 'color': (40, 40, 80), 'radius': 350},
        ],
        'output_path': './images/og-memorial-pamphlet.png',
    },
    {
        'title': 'Native Plant Finder',
        'subtitle': 'Find plants tailored to your region.',
        'gradient_points': [
            {'x': 0, 'y': 0, 'color': colors['green'], 'radius': 250},
            {'x': WIDTH, 'y': 0, 'color': colors['yellow_bright'], 'radius': 250},
            {'x': 0, 'y': HEIGHT, 'color': colors['teal_bright'], 'radius': 300},
            {'x': WIDTH, 'y': HEIGHT, 'color': colors['cyan'], 'radius': 250},
        ],
        'output_path': './images/og-native-plant-finder.png',
    },
    {
        'title': 'Service of Life Builder',
        'subtitle': 'Build a liturgy for a memorial.',
        'gradient_points': [
            {'x': 0, 'y': HEIGHT//2, 'color': colors['purple'], 'radius': 250},
            {'x': WIDTH//3, 'y': 0, 'color': colors['magenta'], 'radius': 300},
            {'x': WIDTH*2//3, 'y': HEIGHT, 'color': colors['cobalt_bright'], 'radius': 250},
            {'x': WIDTH, 'y': HEIGHT//2, 'color': (40, 40, 100), 'radius': 350},
        ],
        'output_path': './images/og-service-of-life.png',
    },
]

if __name__ == '__main__':
    # Create images directory if it doesn't exist
    os.makedirs('./images', exist_ok=True)

    print('Generating OG images with smooth mesh gradients and grain...\n')
    for config in pages:
        generate_og_image(config)
    print('\n✨ All OG images generated successfully!')
