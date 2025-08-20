#!/usr/bin/env python3
"""
Simple script to create placeholder icon files for the DukuAI browser extension.
You can replace these with actual designed icons later.
"""

from PIL import Image, ImageDraw, ImageFont
import os

def create_icon(size, filename):
    # Create a square image with DukuAI colors
    img = Image.new('RGBA', (size, size), (26, 26, 46, 255))  # Dark background
    draw = ImageDraw.Draw(img)
    
    # Draw a border
    border_width = max(1, size // 32)
    draw.rectangle([0, 0, size-1, size-1], outline=(0, 255, 136, 255), width=border_width)
    
    # Draw a simple icon - magnifying glass or comparison symbol
    center = size // 2
    
    if size >= 48:
        # Draw comparison arrows for larger icons
        arrow_size = size // 4
        
        # Left arrow
        left_start = center - arrow_size
        draw.polygon([
            (left_start - arrow_size//2, center),
            (left_start + arrow_size//2, center - arrow_size//3),
            (left_start + arrow_size//2, center + arrow_size//3)
        ], fill=(0, 255, 136, 255))
        
        # Right arrow
        right_start = center + arrow_size
        draw.polygon([
            (right_start + arrow_size//2, center),
            (right_start - arrow_size//2, center - arrow_size//3),
            (right_start - arrow_size//2, center + arrow_size//3)
        ], fill=(0, 255, 136, 255))
        
        # Center dot
        dot_size = size // 16
        draw.ellipse([
            center - dot_size, center - dot_size,
            center + dot_size, center + dot_size
        ], fill=(0, 255, 136, 255))
    else:
        # Simple dot for small icons
        dot_size = size // 4
        draw.ellipse([
            center - dot_size, center - dot_size,
            center + dot_size, center + dot_size
        ], fill=(0, 255, 136, 255))
    
    img.save(filename)
    print(f"Created {filename} ({size}x{size})")

def main():
    # Create icons directory if it doesn't exist
    os.makedirs('icons', exist_ok=True)
    
    # Create different sized icons
    sizes = [16, 48, 128]
    
    for size in sizes:
        filename = f'icons/icon{size}.png'
        create_icon(size, filename)
    
    print("\nIcon files created successfully!")
    print("You can replace these with professionally designed icons later.")

if __name__ == "__main__":
    main()
