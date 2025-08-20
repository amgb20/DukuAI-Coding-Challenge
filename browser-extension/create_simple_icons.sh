#!/bin/bash

# Create simple PNG icons for the DukuAI browser extension
# This script creates basic colored square icons with the DukuAI theme

# Create icons directory
mkdir -p icons

# Function to create a simple colored PNG using printf and basic tools
create_icon() {
    local size=$1
    local filename=$2
    
    # Create a simple SVG first
    cat > temp_icon.svg << EOF
<svg width="$size" height="$size" xmlns="http://www.w3.org/2000/svg">
  <rect width="$size" height="$size" fill="#1a1a2e"/>
  <rect x="2" y="2" width="$(($size-4))" height="$(($size-4))" fill="none" stroke="#00ff88" stroke-width="2"/>
  <circle cx="$(($size/2))" cy="$(($size/2))" r="$(($size/6))" fill="#00ff88"/>
</svg>
EOF

    # Try to convert using available tools
    if command -v rsvg-convert >/dev/null 2>&1; then
        rsvg-convert -w $size -h $size temp_icon.svg > "$filename"
    elif command -v inkscape >/dev/null 2>&1; then
        inkscape --export-width=$size --export-height=$size --export-filename="$filename" temp_icon.svg
    elif command -v convert >/dev/null 2>&1; then
        convert temp_icon.svg -resize ${size}x${size} "$filename"
    else
        echo "No SVG converter found. Creating placeholder..."
        # Create a very basic PNG using base64 (minimal 1x1 pixel)
        echo "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==" | base64 -d > "$filename"
    fi
    
    rm -f temp_icon.svg
    echo "Created $filename"
}

# Create the three required icon sizes
create_icon 16 "icons/icon16.png"
create_icon 48 "icons/icon48.png"
create_icon 128 "icons/icon128.png"

echo "Icon creation complete!"
