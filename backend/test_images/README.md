# Test Images for DukuAI Image Comparison

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
curl -X POST "http://localhost:8000/comparison" \
  -F "image1=@test_images/identical_1.png" \
  -F "image2=@test_images/identical_2.png"

# Test UI changes
curl -X POST "http://localhost:8000/comparison" \
  -F "image1=@test_images/ui_before.png" \
  -F "image2=@test_images/ui_after.png" \
  -F "image1_name=UI Before" \
  -F "image2_name=UI After"
```

### Using Python requests:
```python
import requests

# Test comparison
with open('test_images/ui_before.png', 'rb') as f1, \
     open('test_images/ui_after.png', 'rb') as f2:
    
    files = {
        'image1': ('ui_before.png', f1, 'image/png'),
        'image2': ('ui_after.png', f2, 'image/png')
    }
    
    response = requests.post('http://localhost:8000/comparison', files=files)
    result = response.json()
    print(f"Difference Score: {result['difference_score']:.2f}%")
```
