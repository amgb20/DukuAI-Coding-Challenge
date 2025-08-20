"""
Image Comparison Service

This module handles the core image comparison logic including:
1. Image preprocessing and validation
2. Pixel-level difference calculation
3. Difference visualization generation
4. Similarity scoring algorithms
"""

import numpy as np
import cv2
from PIL import Image, ImageChops, ImageFilter, ImageEnhance
from skimage.metrics import structural_similarity as ssim
from skimage.util import img_as_float
from skimage.feature import local_binary_pattern
from skimage.color import rgb2gray
from scipy.spatial.distance import cosine
import io
import base64
from typing import Tuple, Dict, Optional, List
import logging
import json

logger = logging.getLogger(__name__)


class ImageComparisonService:
    """Service class for comparing two images and generating difference analysis"""
    
    def __init__(self):
        self.supported_formats = {'.jpg', '.jpeg', '.png', '.bmp', '.tiff', '.webp'}
        self.max_dimension = 2048  # Maximum width/height for processing
        
    def validate_image(self, image_data: bytes) -> bool:
        """Validate if the provided data is a valid image"""
        try:
            image = Image.open(io.BytesIO(image_data))
            image.verify()
            return True
        except Exception as e:
            logger.error(f"Image validation failed: {str(e)}")
            return False
    
    def preprocess_image(self, image_data: bytes) -> np.ndarray:
        """
        Preprocess image for comparison:
        1. Load and convert to RGB
        2. Resize if too large
        3. Convert to numpy array
        """
        try:
            # Load image
            image = Image.open(io.BytesIO(image_data))
            
            # Convert to RGB (handle RGBA, grayscale, etc.)
            if image.mode != 'RGB':
                image = image.convert('RGB')
            
            # Resize if too large (maintain aspect ratio)
            width, height = image.size
            if max(width, height) > self.max_dimension:
                ratio = self.max_dimension / max(width, height)
                new_width = int(width * ratio)
                new_height = int(height * ratio)
                image = image.resize((new_width, new_height), Image.Resampling.LANCZOS)
                logger.info(f"Resized image from {width}x{height} to {new_width}x{new_height}")
            
            # Convert to numpy array
            return np.array(image)
            
        except Exception as e:
            logger.error(f"Image preprocessing failed: {str(e)}")
            raise ValueError(f"Failed to preprocess image: {str(e)}")
    
    def resize_images_to_match(self, img1: np.ndarray, img2: np.ndarray) -> Tuple[np.ndarray, np.ndarray]:
        """Resize images to have the same dimensions"""
        h1, w1 = img1.shape[:2]
        h2, w2 = img2.shape[:2]
        
        if (h1, w1) == (h2, w2):
            return img1, img2
        
        # Use the smaller dimensions to avoid upscaling
        target_height = min(h1, h2)
        target_width = min(w1, w2)
        
        logger.info(f"Resizing images to {target_width}x{target_height}")
        
        img1_resized = cv2.resize(img1, (target_width, target_height), interpolation=cv2.INTER_LANCZOS4)
        img2_resized = cv2.resize(img2, (target_width, target_height), interpolation=cv2.INTER_LANCZOS4)
        
        return img1_resized, img2_resized
    
    def calculate_perceptual_similarity(self, img1: np.ndarray, img2: np.ndarray) -> Dict:
        """
        Calculate advanced perceptual similarity metrics beyond basic SSIM
        
        Returns:
            Dict containing various perceptual similarity measures
        """
        try:
            # Convert to grayscale for some metrics
            gray1 = rgb2gray(img1)
            gray2 = rgb2gray(img2)
            
            # 1. Local Binary Pattern (LBP) similarity for texture analysis
            radius = 3
            n_points = 8 * radius
            lbp1 = local_binary_pattern(gray1, n_points, radius, method='uniform')
            lbp2 = local_binary_pattern(gray2, n_points, radius, method='uniform')
            
            # Calculate LBP histogram similarity
            hist1, _ = np.histogram(lbp1.ravel(), bins=50, range=(0, 50))
            hist2, _ = np.histogram(lbp2.ravel(), bins=50, range=(0, 50))
            hist1 = hist1 / np.sum(hist1)  # Normalize
            hist2 = hist2 / np.sum(hist2)  # Normalize
            
            # Bhattacharyya distance for histogram comparison
            bhattacharyya = -np.log(np.sum(np.sqrt(hist1 * hist2)))
            texture_similarity = max(0, 1 - bhattacharyya / 5)  # Normalize to 0-1
            
            # 2. Color histogram similarity
            color_similarity = self._calculate_color_similarity(img1, img2)
            
            # 3. Edge-based similarity
            edge_similarity = self._calculate_edge_similarity(gray1, gray2)
            
            # 4. Perceptual hash similarity
            phash_similarity = self._calculate_phash_similarity(gray1, gray2)
            
            return {
                'texture_similarity': float(texture_similarity),
                'color_similarity': float(color_similarity),
                'edge_similarity': float(edge_similarity),
                'phash_similarity': float(phash_similarity),
                'overall_perceptual': float(np.mean([texture_similarity, color_similarity, edge_similarity, phash_similarity]))
            }
            
        except Exception as e:
            logger.error(f"Error calculating perceptual similarity: {str(e)}")
            return {
                'texture_similarity': 0.0,
                'color_similarity': 0.0,
                'edge_similarity': 0.0,
                'phash_similarity': 0.0,
                'overall_perceptual': 0.0
            }
    
    def _calculate_color_similarity(self, img1: np.ndarray, img2: np.ndarray) -> float:
        """Calculate color distribution similarity using histogram comparison"""
        try:
            # Calculate color histograms for each channel
            similarities = []
            for channel in range(3):  # R, G, B
                hist1 = cv2.calcHist([img1], [channel], None, [256], [0, 256])
                hist2 = cv2.calcHist([img2], [channel], None, [256], [0, 256])
                
                # Normalize histograms
                hist1 = hist1 / np.sum(hist1)
                hist2 = hist2 / np.sum(hist2)
                
                # Calculate correlation
                correlation = cv2.compareHist(hist1.flatten(), hist2.flatten(), cv2.HISTCMP_CORREL)
                similarities.append(max(0, correlation))
            
            return np.mean(similarities)
        except:
            return 0.0
    
    def _calculate_edge_similarity(self, gray1: np.ndarray, gray2: np.ndarray) -> float:
        """Calculate edge-based similarity using Canny edge detection"""
        try:
            # Apply Gaussian blur to reduce noise
            gray1_blur = cv2.GaussianBlur((gray1 * 255).astype(np.uint8), (5, 5), 0)
            gray2_blur = cv2.GaussianBlur((gray2 * 255).astype(np.uint8), (5, 5), 0)
            
            # Detect edges
            edges1 = cv2.Canny(gray1_blur, 50, 150)
            edges2 = cv2.Canny(gray2_blur, 50, 150)
            
            # Calculate edge overlap
            intersection = np.sum(np.logical_and(edges1, edges2))
            union = np.sum(np.logical_or(edges1, edges2))
            
            if union == 0:
                return 1.0  # Both images have no edges
            
            return intersection / union
        except:
            return 0.0
    
    def _calculate_phash_similarity(self, gray1: np.ndarray, gray2: np.ndarray) -> float:
        """Calculate perceptual hash similarity"""
        try:
            def phash(img):
                # Resize to 32x32
                resized = cv2.resize((img * 255).astype(np.uint8), (32, 32))
                # Apply DCT
                dct = cv2.dct(np.float32(resized))
                # Keep only top-left 8x8 corner
                dct_low = dct[0:8, 0:8]
                # Calculate median
                median = np.median(dct_low)
                # Create hash
                return dct_low > median
            
            hash1 = phash(gray1)
            hash2 = phash(gray2)
            
            # Calculate Hamming distance
            hamming_distance = np.sum(hash1 != hash2)
            # Convert to similarity (0-1 scale)
            similarity = 1 - (hamming_distance / 64.0)
            
            return max(0, similarity)
        except:
            return 0.0
    
    def extract_difference_regions(self, img1: np.ndarray, img2: np.ndarray, sensitivity: float = 50.0) -> Dict:
        """
        Extract specific different regions using ImageChops-style analysis
        
        Returns information about different objects/regions found
        """
        try:
            # Convert numpy arrays to PIL Images for ImageChops
            pil_img1 = Image.fromarray(img1)
            pil_img2 = Image.fromarray(img2)
            
            # 1. Basic difference using ImageChops
            diff_image = ImageChops.difference(pil_img1, pil_img2)
            
            # 2. Get bounding box of differences
            bbox = diff_image.getbbox()
            has_differences = bbox is not None
            
            # 3. Enhanced difference detection
            enhanced_diff = self._enhance_differences(pil_img1, pil_img2)
            
            # 4. Find contours of different regions
            diff_regions = self._find_difference_contours(np.array(enhanced_diff))
            
            # 5. Analyze types of changes
            change_analysis = self._analyze_change_types(img1, img2, diff_regions)
            
            # 6. Extract changed objects on black background
            changed_objects = self._extract_changed_objects(pil_img1, pil_img2, diff_image, sensitivity)

            return {
                'has_differences': has_differences,
                'difference_bbox': bbox,
                'num_different_regions': len(diff_regions),
                'different_regions': diff_regions,
                'change_analysis': change_analysis,
                'enhanced_diff_b64': self._pil_to_base64(enhanced_diff),
                'raw_diff_b64': self._pil_to_base64(diff_image),
                'changed_objects_b64': self._pil_to_base64(changed_objects)
            }
            
        except Exception as e:
            logger.error(f"Error extracting difference regions: {str(e)}")
            return {
                'has_differences': False,
                'difference_bbox': None,
                'num_different_regions': 0,
                'different_regions': [],
                'change_analysis': {},
                'enhanced_diff_b64': '',
                'raw_diff_b64': '',
                'changed_objects_b64': ''
            }
    
    def _enhance_differences(self, img1: Image.Image, img2: Image.Image) -> Image.Image:
        """Enhance differences using multiple ImageChops operations"""
        try:
            # Basic difference
            diff = ImageChops.difference(img1, img2)
            
            # Enhance contrast to make differences more visible
            enhancer = ImageEnhance.Contrast(diff)
            enhanced = enhancer.enhance(2.0)
            
            # Apply edge enhancement
            enhanced = enhanced.filter(ImageFilter.EDGE_ENHANCE_MORE)
            
            # Convert to grayscale and back to RGB for consistency
            gray = enhanced.convert('L')
            
            # Threshold to create binary mask
            threshold = 30
            binary = gray.point(lambda x: 255 if x > threshold else 0, mode='1')
            
            # Convert back to RGB
            return binary.convert('RGB')
            
        except Exception as e:
            logger.error(f"Error enhancing differences: {str(e)}")
            return ImageChops.difference(img1, img2)
    
    def _find_difference_contours(self, diff_array: np.ndarray) -> List[Dict]:
        """Find contours of different regions"""
        try:
            # Convert to grayscale
            gray = cv2.cvtColor(diff_array, cv2.COLOR_RGB2GRAY)
            
            # Find contours
            contours, _ = cv2.findContours(gray, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
            
            regions = []
            for i, contour in enumerate(contours):
                area = cv2.contourArea(contour)
                if area > 100:  # Filter out very small regions
                    x, y, w, h = cv2.boundingRect(contour)
                    regions.append({
                        'id': i,
                        'area': float(area),
                        'bbox': [int(x), int(y), int(w), int(h)],
                        'center': [float(x + w/2), float(y + h/2)],
                        'perimeter': float(cv2.arcLength(contour, True))
                    })
            
            # Sort by area (largest first)
            regions.sort(key=lambda x: x['area'], reverse=True)
            
            return regions[:10]  # Return top 10 largest regions
            
        except Exception as e:
            logger.error(f"Error finding contours: {str(e)}")
            return []
    
    def _analyze_change_types(self, img1: np.ndarray, img2: np.ndarray, regions: List[Dict]) -> Dict:
        """Analyze types of changes in different regions"""
        try:
            analysis = {
                'color_changes': 0,
                'new_objects': 0,
                'removed_objects': 0,
                'moved_objects': 0,
                'size_changes': 0
            }
            
            for region in regions[:5]:  # Analyze top 5 regions
                x, y, w, h = region['bbox']
                
                # Extract region from both images
                region1 = img1[y:y+h, x:x+w]
                region2 = img2[y:y+h, x:x+w]
                
                # Calculate average colors
                avg_color1 = np.mean(region1, axis=(0, 1))
                avg_color2 = np.mean(region2, axis=(0, 1))
                
                # Determine change type based on color difference
                color_diff = np.linalg.norm(avg_color1 - avg_color2)
                
                if color_diff > 50:
                    analysis['color_changes'] += 1
                
                # Check for brightness changes (could indicate new/removed objects)
                brightness1 = np.mean(avg_color1)
                brightness2 = np.mean(avg_color2)
                brightness_diff = abs(brightness1 - brightness2)
                
                if brightness_diff > 30:
                    if brightness2 > brightness1:
                        analysis['new_objects'] += 1
                    else:
                        analysis['removed_objects'] += 1
            
            return analysis
            
        except Exception as e:
            logger.error(f"Error analyzing change types: {str(e)}")
            return {
                'color_changes': 0,
                'new_objects': 0,
                'removed_objects': 0,
                'moved_objects': 0,
                'size_changes': 0
            }
    
    def _pil_to_base64(self, pil_image: Image.Image) -> str:
        """Convert PIL image to base64 string"""
        try:
            buffer = io.BytesIO()
            pil_image.save(buffer, format='PNG')
            return base64.b64encode(buffer.getvalue()).decode()
        except:
            return ""
    
    def apply_ignore_mask(self, image: Image.Image, ignore_regions: List[Dict]) -> Image.Image:
        """
        Apply ignore mask to an image by blacking out specified regions
        
        Args:
            image: PIL Image to apply mask to
            ignore_regions: List of region dictionaries (rectangle or freeform)
            
        Returns:
            PIL Image with ignored regions masked out (set to black)
        """
        try:
            # Create a copy of the image to avoid modifying the original
            masked_image = image.copy()
            
            # Get image dimensions
            img_width, img_height = image.size
            
            # Create a black patch for masking
            from PIL import ImageDraw
            draw = ImageDraw.Draw(masked_image)
            
            for region in ignore_regions:
                region_type = region.get('type', 'rectangle')
                
                if region_type == 'rectangle':
                    # Handle rectangle regions
                    x = int(region.get('x', 0))
                    y = int(region.get('y', 0))
                    width = int(region.get('width', 0))
                    height = int(region.get('height', 0))
                    
                    # Ensure coordinates are within image bounds
                    x = max(0, min(x, img_width - 1))
                    y = max(0, min(y, img_height - 1))
                    width = max(0, min(width, img_width - x))
                    height = max(0, min(height, img_height - y))
                    
                    # Draw black rectangle over the ignore region
                    draw.rectangle(
                        [(x, y), (x + width, y + height)],
                        fill=(0, 0, 0)  # Black color
                    )
                    
                    logger.info(f"Applied rectangle ignore mask at: ({x}, {y}, {width}, {height})")
                    
                elif region_type == 'freeform':
                    # Handle freeform regions
                    path = region.get('path', [])
                    if len(path) >= 3:  # Need at least 3 points for a polygon
                        # Convert path to PIL polygon format
                        polygon_points = []
                        for point in path:
                            x = max(0, min(int(point.get('x', 0)), img_width - 1))
                            y = max(0, min(int(point.get('y', 0)), img_height - 1))
                            polygon_points.extend([x, y])
                        
                        # Draw filled polygon
                        draw.polygon(polygon_points, fill=(0, 0, 0))  # Black color
                        
                        logger.info(f"Applied freeform ignore mask with {len(path)} points")
            
            return masked_image
            
        except Exception as e:
            logger.error(f"Error applying ignore mask: {str(e)}")
            # Return original image if masking fails
            return image

    def _extract_changed_objects(self, img1: Image.Image, img2: Image.Image, diff_image: Image.Image, sensitivity: float = 50.0) -> Image.Image:
        """
        Extract changed objects/features on a black background
        Shows only the new/changed parts from img2 where differences exist
        """
        try:
            # Convert to numpy arrays for processing
            img1_np = np.array(img1)
            img2_np = np.array(img2)
            diff_np = np.array(diff_image.convert('L'))  # Convert to grayscale
            
            # Create a threshold mask for significant differences
            # Convert sensitivity (1-100) to threshold (1-255)
            # Higher sensitivity = lower threshold = more sensitive to small changes
            threshold = int(255 - (sensitivity / 100.0) * 254)  # Maps 1-100 to 254-1
            threshold = max(1, min(threshold, 254))  # Ensure valid range
            mask = diff_np > threshold
            
            # Create morphological operations to clean up the mask
            kernel = np.ones((3, 3), np.uint8)
            mask = cv2.morphologyEx(mask.astype(np.uint8), cv2.MORPH_CLOSE, kernel)
            mask = cv2.morphologyEx(mask, cv2.MORPH_OPEN, kernel)
            
            # Create the result image with black background
            result = np.zeros_like(img2_np)
            
            # Copy pixels from img2 where differences exist
            if len(img2_np.shape) == 3:  # Color image
                for channel in range(3):
                    result[:, :, channel] = np.where(mask, img2_np[:, :, channel], 0)
            else:  # Grayscale image
                result = np.where(mask, img2_np, 0)
            
            # Optional: Apply some edge enhancement to make objects clearer
            if len(result.shape) == 3:
                # Convert to grayscale for edge detection
                gray = cv2.cvtColor(result, cv2.COLOR_RGB2GRAY)
                edges = cv2.Canny(gray, 50, 150)
                
                # Combine edges with the original result
                edges_3d = np.stack([edges, edges, edges], axis=2)
                result = np.maximum(result, edges_3d)
            
            return Image.fromarray(result.astype(np.uint8))
            
        except Exception as e:
            logger.error(f"Error extracting changed objects: {str(e)}")
            # Return a black image of the same size as a fallback
            return Image.new('RGB', img1.size, (0, 0, 0))

    def calculate_pixel_differences(self, img1: np.ndarray, img2: np.ndarray, sensitivity: float = 50.0) -> Dict:
        """
        Calculate various types of pixel-level differences between two images
        
        Returns:
            Dict containing different difference metrics and visualizations
        """
        try:
            # Ensure images are the same size
            img1, img2 = self.resize_images_to_match(img1, img2)
            
            # Convert to float for calculations
            img1_float = img_as_float(img1)
            img2_float = img_as_float(img2)
            
            # 1. Mean Squared Error (MSE)
            mse = np.mean((img1_float - img2_float) ** 2)
            
            # 2. Structural Similarity Index (SSIM)
            ssim_score, ssim_diff = ssim(img1_float, img2_float, 
                                       multichannel=True, full=True, channel_axis=2, data_range=1.0)
            
            # 3. Absolute pixel difference
            abs_diff = np.abs(img1.astype(float) - img2.astype(float))
            
            # 4. Create binary mask for changed regions (threshold-based)
            # Convert sensitivity (1-100) to threshold (1-255)
            # Higher sensitivity = lower threshold = more sensitive to small changes
            threshold = int(255 - (sensitivity / 100.0) * 254)  # Maps 1-100 to 254-1
            threshold = max(1, min(threshold, 254))  # Ensure valid range
            gray_diff = cv2.cvtColor(abs_diff.astype(np.uint8), cv2.COLOR_RGB2GRAY)
            _, binary_mask = cv2.threshold(gray_diff, threshold, 255, cv2.THRESH_BINARY)
            
            # 5. Calculate difference percentage
            total_pixels = img1.shape[0] * img1.shape[1]
            changed_pixels = np.sum(binary_mask > 0)
            difference_percentage = (changed_pixels / total_pixels) * 100
            
            # 6. Create heatmap visualization
            heatmap = self._create_heatmap(abs_diff)
            
            # 7. Create overlay visualization
            overlay = self._create_overlay(img1, img2, binary_mask)
            
            return {
                'mse': float(mse),
                'ssim': float(ssim_score),
                'difference_percentage': float(difference_percentage),
                'changed_pixels': int(changed_pixels),
                'total_pixels': int(total_pixels),
                'heatmap': heatmap,
                'overlay': overlay,
                'binary_mask': binary_mask,
                'abs_diff': abs_diff
            }
            
        except Exception as e:
            logger.error(f"Error calculating pixel differences: {str(e)}")
            raise
    
    def _create_heatmap(self, abs_diff: np.ndarray) -> str:
        """Create a heatmap visualization of differences"""
        try:
            # Convert to grayscale and normalize
            gray_diff = cv2.cvtColor(abs_diff.astype(np.uint8), cv2.COLOR_RGB2GRAY)
            
            # Apply color map (red for high differences)
            heatmap = cv2.applyColorMap(gray_diff, cv2.COLORMAP_JET)
            heatmap_rgb = cv2.cvtColor(heatmap, cv2.COLOR_BGR2RGB)
            
            # Convert to base64 for API response
            heatmap_pil = Image.fromarray(heatmap_rgb)
            buffer = io.BytesIO()
            heatmap_pil.save(buffer, format='PNG')
            heatmap_b64 = base64.b64encode(buffer.getvalue()).decode()
            
            return heatmap_b64
            
        except Exception as e:
            logger.error(f"Error creating heatmap: {str(e)}")
            return ""
    
    def _create_overlay(self, img1: np.ndarray, img2: np.ndarray, mask: np.ndarray) -> str:
        """Create an overlay visualization showing differences on the original image"""
        try:
            # Create overlay on the first image
            overlay = img1.copy()
            
            # Highlight changed regions in red
            red_overlay = np.zeros_like(img1)
            red_overlay[:, :, 0] = 255  # Red channel
            
            # Apply mask
            mask_3channel = np.stack([mask, mask, mask], axis=2) / 255
            overlay = overlay * (1 - mask_3channel * 0.5) + red_overlay * mask_3channel * 0.5
            
            # Convert to base64
            overlay_pil = Image.fromarray(overlay.astype(np.uint8))
            buffer = io.BytesIO()
            overlay_pil.save(buffer, format='PNG')
            overlay_b64 = base64.b64encode(buffer.getvalue()).decode()
            
            return overlay_b64
            
        except Exception as e:
            logger.error(f"Error creating overlay: {str(e)}")
            return ""
    
    def calculate_difference_score(self, comparison_result: Dict, perceptual_result: Dict = None) -> float:
        """
        Calculate a comprehensive difference score (0-100%) using enhanced metrics
        
        Combines multiple metrics:
        - Pixel difference percentage (40% weight)
        - SSIM score (25% weight)
        - Perceptual similarity (25% weight)
        - MSE score (10% weight)
        """
        try:
            pixel_diff_score = comparison_result['difference_percentage']
            ssim_score = (1 - comparison_result['ssim']) * 100  # Invert SSIM (higher = more different)
            mse_score = min(comparison_result['mse'] * 1000, 100)  # Scale and cap MSE
            
            # Include perceptual similarity if available
            perceptual_score = 0
            if perceptual_result:
                # Invert perceptual similarity (higher similarity = lower difference)
                perceptual_score = (1 - perceptual_result.get('overall_perceptual', 0)) * 100
            
            # Enhanced weighted combination
            if perceptual_result:
                final_score = (
                    pixel_diff_score * 0.4 +
                    ssim_score * 0.25 +
                    perceptual_score * 0.25 +
                    mse_score * 0.1
                )
            else:
                # Fallback to original weights if no perceptual data
                final_score = (
                pixel_diff_score * 0.6 +
                ssim_score * 0.3 +
                mse_score * 0.1
            )
            
            return min(max(final_score, 0), 100)  # Ensure 0-100 range
            
        except Exception as e:
            logger.error(f"Error calculating difference score: {str(e)}")
            return 0.0
    
    def compare_images(self, image1_data: bytes, image2_data: bytes, sensitivity: float = 50.0, ignore_regions: List[Dict] = None) -> Dict:
        """
        Enhanced main method to compare two images with advanced perceptual analysis
        
        Args:
            image1_data: Bytes of the first image
            image2_data: Bytes of the second image
            sensitivity: Sensitivity threshold (1-100), higher = more sensitive to small changes
            ignore_regions: List of regions to ignore during comparison
            
        Returns:
            Dictionary containing comprehensive comparison results
        """
        try:
            # Validate images
            if not self.validate_image(image1_data):
                raise ValueError("Invalid first image")
            if not self.validate_image(image2_data):
                raise ValueError("Invalid second image")
            
            logger.info("Starting enhanced image comparison")
            
            # Preprocess images
            img1 = self.preprocess_image(image1_data)
            img2 = self.preprocess_image(image2_data)
            
            logger.info(f"Preprocessed images - img1: {img1.shape}, img2: {img2.shape}")
            
            # Ensure images are same size for all analyses
            img1, img2 = self.resize_images_to_match(img1, img2)
            
            # Apply ignore masks if provided
            if ignore_regions:
                pil_img1 = Image.fromarray(img1)
                pil_img2 = Image.fromarray(img2)
                img1 = np.array(self.apply_ignore_mask(pil_img1, ignore_regions))
                img2 = np.array(self.apply_ignore_mask(pil_img2, ignore_regions))
            
            # 1. Calculate basic pixel differences
            diff_result = self.calculate_pixel_differences(img1, img2, sensitivity)
            
            # 2. Calculate enhanced perceptual similarity
            perceptual_result = self.calculate_perceptual_similarity(img1, img2)
            
            # 3. Extract difference regions using ImageChops-style analysis
            difference_regions = self.extract_difference_regions(img1, img2, sensitivity)
            
            # 4. Calculate enhanced final score
            difference_score = self.calculate_difference_score(diff_result, perceptual_result)
            
            # Prepare comprehensive result
            result = {
                'difference_score': difference_score,
                'metrics': {
                    'mse': diff_result['mse'],
                    'ssim': diff_result['ssim'],
                    'difference_percentage': diff_result['difference_percentage'],
                    'changed_pixels': diff_result['changed_pixels'],
                    'total_pixels': diff_result['total_pixels'],
                    # Enhanced perceptual metrics
                    'texture_similarity': perceptual_result['texture_similarity'],
                    'color_similarity': perceptual_result['color_similarity'],
                    'edge_similarity': perceptual_result['edge_similarity'],
                    'phash_similarity': perceptual_result['phash_similarity'],
                    'overall_perceptual': perceptual_result['overall_perceptual']
                },
                'visualizations': {
                    'heatmap': diff_result['heatmap'],
                    'overlay': diff_result['overlay'],
                    'enhanced_diff': difference_regions['enhanced_diff_b64'],
                    'raw_diff': difference_regions['raw_diff_b64'],
                    'changed_objects': difference_regions['changed_objects_b64']
                },
                'difference_analysis': {
                    'has_differences': difference_regions['has_differences'],
                    'num_different_regions': difference_regions['num_different_regions'],
                    'different_regions': difference_regions['different_regions'],
                    'change_types': difference_regions['change_analysis'],
                    'difference_bbox': difference_regions['difference_bbox']
                },
                'image_info': {
                    'dimensions': f"{img1.shape[1]}x{img1.shape[0]}",
                    'processed': True
                }
            }
            
            logger.info(f"Enhanced comparison completed - Score: {difference_score:.2f}%, "
                       f"Regions: {difference_regions['num_different_regions']}, "
                       f"Perceptual: {perceptual_result['overall_perceptual']:.3f}")
            return result
            
        except Exception as e:
            logger.error(f"Enhanced image comparison failed: {str(e)}")
            raise
