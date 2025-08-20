"""
Utility script to create sample test images for the image comparison API

This script generates various types of test images that can be used to validate
the image comparison functionality.
"""

from PIL import Image, ImageDraw, ImageFont
import os
import numpy as np


def create_test_images(output_dir="test_images"):
    """Create a set of test images for validation"""
    os.makedirs(output_dir, exist_ok=True)
    
    # 1. Identical images (red background)
    img1 = Image.new('RGB', (200, 200), color='red')
    img1.save(os.path.join(output_dir, "identical_1.png"))
    
    img2 = Image.new('RGB', (200, 200), color='red')
    img2.save(os.path.join(output_dir, "identical_2.png"))
    
    # 2. Completely different images
    img3 = Image.new('RGB', (200, 200), color='blue')
    img3.save(os.path.join(output_dir, "different_blue.png"))
    
    img4 = Image.new('RGB', (200, 200), color='green')
    img4.save(os.path.join(output_dir, "different_green.png"))
    
    # 3. Slightly different images (small change)
    img5 = Image.new('RGB', (200, 200), color='white')
    draw5 = ImageDraw.Draw(img5)
    draw5.rectangle([50, 50, 150, 150], fill='lightblue')
    img5.save(os.path.join(output_dir, "base_with_square.png"))
    
    img6 = Image.new('RGB', (200, 200), color='white')
    draw6 = ImageDraw.Draw(img6)
    draw6.rectangle([55, 55, 145, 145], fill='lightblue')  # Slightly different position
    img6.save(os.path.join(output_dir, "base_with_square_moved.png"))
    
    # 4. UI-like before/after simulation
    # Before: Simple UI layout
    ui_before = Image.new('RGB', (300, 400), color='white')
    draw_before = ImageDraw.Draw(ui_before)
    
    # Header
    draw_before.rectangle([0, 0, 300, 60], fill='navy')
    
    # Navigation buttons
    draw_before.rectangle([20, 80, 80, 110], fill='lightgray')
    draw_before.rectangle([100, 80, 160, 110], fill='lightgray')
    draw_before.rectangle([180, 80, 240, 110], fill='lightgray')
    
    # Content area
    draw_before.rectangle([20, 130, 280, 350], fill='lightblue')
    
    ui_before.save(os.path.join(output_dir, "ui_before.png"))
    
    # After: Modified UI layout
    ui_after = Image.new('RGB', (300, 400), color='white')
    draw_after = ImageDraw.Draw(ui_after)
    
    # Header (same)
    draw_after.rectangle([0, 0, 300, 60], fill='navy')
    
    # Navigation buttons (one button changed color)
    draw_after.rectangle([20, 80, 80, 110], fill='lightgray')
    draw_after.rectangle([100, 80, 160, 110], fill='orange')  # Changed color
    draw_after.rectangle([180, 80, 240, 110], fill='lightgray')
    
    # Content area (slightly different)
    draw_after.rectangle([20, 130, 280, 350], fill='lightgreen')  # Changed color
    
    # Added new element
    draw_after.rectangle([50, 160, 250, 200], fill='yellow')
    
    ui_after.save(os.path.join(output_dir, "ui_after.png"))
    
    # 5. Images with text changes
    text_before = Image.new('RGB', (250, 100), color='white')
    draw_text_before = ImageDraw.Draw(text_before)
    draw_text_before.text((10, 40), "Version 1.0", fill='black')
    text_before.save(os.path.join(output_dir, "text_before.png"))
    
    text_after = Image.new('RGB', (250, 100), color='white')
    draw_text_after = ImageDraw.Draw(text_after)
    draw_text_after.text((10, 40), "Version 2.0", fill='black')
    text_after.save(os.path.join(output_dir, "text_after.png"))
    
    # 6. Different sizes (will be resized by the service)
    large_img = Image.new('RGB', (800, 600), color='purple')
    draw_large = ImageDraw.Draw(large_img)
    draw_large.rectangle([100, 100, 700, 500], fill='yellow')
    large_img.save(os.path.join(output_dir, "large_image.png"))
    
    small_img = Image.new('RGB', (50, 50), color='purple')
    draw_small = ImageDraw.Draw(small_img)
    draw_small.rectangle([10, 10, 40, 40], fill='yellow')
    small_img.save(os.path.join(output_dir, "small_image.png"))
    
    # 7. Gradual changes (simulating animation frames)
    for i, alpha in enumerate([0, 0.3, 0.6, 1.0]):
        frame = Image.new('RGB', (150, 150), color='white')
        draw_frame = ImageDraw.Draw(frame)
        
        # Circle that gradually appears
        circle_color = tuple(int(255 * alpha) if c == 0 else 0 for c in (0, 1, 0))  # Red
        draw_frame.ellipse([50, 50, 100, 100], fill=circle_color)
        
        frame.save(os.path.join(output_dir, f"animation_frame_{i}.png"))
    
    print(f"Created test images in '{output_dir}' directory:")
    print("- identical_1.png, identical_2.png (should have ~0% difference)")
    print("- different_blue.png, different_green.png (should have ~100% difference)")
    print("- base_with_square.png, base_with_square_moved.png (should have ~5-15% difference)")
    print("- ui_before.png, ui_after.png (should have ~20-40% difference)")
    print("- text_before.png, text_after.png (should have ~10-20% difference)")
    print("- large_image.png, small_image.png (different sizes, will be resized)")
    print("- animation_frame_*.png (gradual changes for testing)")


def create_readme(output_dir="test_images"):
    """Create a README file explaining the test images"""
    readme_content = """# Test Images for DukuAI Image Comparison

This directory contains various test images designed to validate the image comparison API.

## Image Pairs and Expected Results:

### 1. Identical Images
- `identical_1.png` vs `identical_2.png`
- **Expected Difference Score**: ~0-2%
- **Purpose**: Test the baseline accuracy for identical images

### 2. Completely Different Images
- `different_blue.png` vs `different_green.png`
- **Expected Difference Score**: ~90-100%
- **Purpose**: Test maximum difference detection

### 3. Minor Changes
- `base_with_square.png` vs `base_with_square_moved.png`
- **Expected Difference Score**: ~5-15%
- **Purpose**: Test sensitivity to small positional changes

### 4. UI Changes
- `ui_before.png` vs `ui_after.png`
- **Expected Difference Score**: ~20-40%
- **Purpose**: Test realistic UI change detection (button color + content area changes)

### 5. Text Changes
- `text_before.png` vs `text_after.png`
- **Expected Difference Score**: ~10-20%
- **Purpose**: Test text change detection

### 6. Size Differences
- `large_image.png` vs `small_image.png`
- **Expected Difference Score**: Variable (tests resizing logic)
- **Purpose**: Validate image preprocessing and resizing

### 7. Animation Frames
- `animation_frame_0.png` through `animation_frame_3.png`
- **Expected Difference Score**: Gradually increasing
- **Purpose**: Test gradual change detection

## Usage Examples:

### Using curl:
```bash
# Test identical images
curl -X POST "http://localhost:8000/comparison" \\
  -F "image1=@test_images/identical_1.png" \\
  -F "image2=@test_images/identical_2.png"

# Test UI changes
curl -X POST "http://localhost:8000/comparison" \\
  -F "image1=@test_images/ui_before.png" \\
  -F "image2=@test_images/ui_after.png" \\
  -F "image1_name=UI Before" \\
  -F "image2_name=UI After"
```

### Using Python requests:
```python
import requests

# Test comparison
with open('test_images/ui_before.png', 'rb') as f1, \\
     open('test_images/ui_after.png', 'rb') as f2:
    
    files = {
        'image1': ('ui_before.png', f1, 'image/png'),
        'image2': ('ui_after.png', f2, 'image/png')
    }
    
    response = requests.post('http://localhost:8000/comparison', files=files)
    result = response.json()
    print(f"Difference Score: {result['difference_score']:.2f}%")
```
"""
    
    with open(os.path.join(output_dir, "README.md"), 'w') as f:
        f.write(readme_content)


if __name__ == "__main__":
    print("Creating test images for DukuAI Image Comparison API...")
    create_test_images()
    create_readme()
    print("\nTest images created successfully!")
    print("You can now use these images to test the API endpoints.")
