"""
Unit tests for the image comparison backend logic

This file tests the core image processing algorithms and business logic
without involving API endpoints or external dependencies.
"""

import pytest
import numpy as np
import io
from PIL import Image, ImageDraw
import base64
import tempfile
import os

# Import the modules to test
from services.image_comparison import ImageComparisonService
from models.comparison import ComparisonRequest, ComparisonResponse


class TestImageComparisonService:
    """Test suite for ImageComparisonService"""
    
    @pytest.fixture
    def service(self):
        """Create an ImageComparisonService instance for testing"""
        return ImageComparisonService()
    
    @pytest.fixture
    def sample_images(self):
        """Create sample test images"""
        # Create identical images
        img1 = Image.new('RGB', (100, 100), color='red')
        img2 = Image.new('RGB', (100, 100), color='red')
        
        # Create different images
        img3 = Image.new('RGB', (100, 100), color='blue')
        
        # Create image with partial differences
        img4 = Image.new('RGB', (100, 100), color='red')
        draw = ImageDraw.Draw(img4)
        draw.rectangle([25, 25, 75, 75], fill='blue')
        
        def img_to_bytes(img):
            buffer = io.BytesIO()
            img.save(buffer, format='PNG')
            return buffer.getvalue()
        
        return {
            'identical1': img_to_bytes(img1),
            'identical2': img_to_bytes(img2),
            'different': img_to_bytes(img3),
            'partial_diff': img_to_bytes(img4)
        }
    
    def test_validate_image_valid(self, service, sample_images):
        """Test image validation with valid images"""
        assert service.validate_image(sample_images['identical1']) == True
        assert service.validate_image(sample_images['different']) == True
    
    def test_validate_image_invalid(self, service):
        """Test image validation with invalid data"""
        invalid_data = b"not an image"
        assert service.validate_image(invalid_data) == False
    
    def test_preprocess_image(self, service, sample_images):
        """Test image preprocessing"""
        processed = service.preprocess_image(sample_images['identical1'])
        
        # Should be numpy array
        assert isinstance(processed, np.ndarray)
        # Should be RGB (3 channels)
        assert processed.shape[2] == 3
        # Should have correct dimensions
        assert processed.shape[:2] == (100, 100)
    
    def test_preprocess_image_resize_large(self, service):
        """Test that large images are resized"""
        # Create a large image (larger than max_dimension)
        large_img = Image.new('RGB', (3000, 2000), color='red')
        buffer = io.BytesIO()
        large_img.save(buffer, format='PNG')
        large_data = buffer.getvalue()
        
        processed = service.preprocess_image(large_data)
        
        # Should be resized
        max_dimension = max(processed.shape[:2])
        assert max_dimension <= service.max_dimension
    
    def test_resize_images_to_match_same_size(self, service):
        """Test resizing when images are already the same size"""
        img1 = np.random.randint(0, 255, (100, 100, 3), dtype=np.uint8)
        img2 = np.random.randint(0, 255, (100, 100, 3), dtype=np.uint8)
        
        resized1, resized2 = service.resize_images_to_match(img1, img2)
        
        # Should remain unchanged
        np.testing.assert_array_equal(resized1, img1)
        np.testing.assert_array_equal(resized2, img2)
    
    def test_resize_images_to_match_different_sizes(self, service):
        """Test resizing when images have different sizes"""
        img1 = np.random.randint(0, 255, (100, 150, 3), dtype=np.uint8)
        img2 = np.random.randint(0, 255, (120, 100, 3), dtype=np.uint8)
        
        resized1, resized2 = service.resize_images_to_match(img1, img2)
        
        # Should have same dimensions (the smaller ones)
        assert resized1.shape[:2] == resized2.shape[:2]
        assert resized1.shape[:2] == (100, 100)
    
    def test_calculate_pixel_differences_identical(self, service, sample_images):
        """Test pixel difference calculation with identical images"""
        img1 = service.preprocess_image(sample_images['identical1'])
        img2 = service.preprocess_image(sample_images['identical2'])
        
        result = service.calculate_pixel_differences(img1, img2)
        
        # Should have minimal differences
        assert result['mse'] < 0.001
        assert result['ssim'] > 0.99
        assert result['difference_percentage'] < 1.0
        assert result['changed_pixels'] < 100  # Very few changed pixels
    
    def test_calculate_pixel_differences_completely_different(self, service, sample_images):
        """Test pixel difference calculation with completely different images"""
        img1 = service.preprocess_image(sample_images['identical1'])  # Red
        img2 = service.preprocess_image(sample_images['different'])   # Blue
        
        result = service.calculate_pixel_differences(img1, img2)
        
        # Should have significant differences
        assert result['mse'] > 0.1
        assert result['ssim'] < 0.5
        assert result['difference_percentage'] > 50.0
        assert 'heatmap' in result
        assert 'overlay' in result
    
    def test_calculate_pixel_differences_partial(self, service, sample_images):
        """Test pixel difference calculation with partially different images"""
        img1 = service.preprocess_image(sample_images['identical1'])  # Red
        img2 = service.preprocess_image(sample_images['partial_diff'])  # Red with blue square
        
        result = service.calculate_pixel_differences(img1, img2)
        
        # Should have moderate differences
        assert 0.01 < result['mse'] < 0.5
        assert 0.3 < result['ssim'] < 0.9
        assert 10.0 < result['difference_percentage'] < 40.0
    
    def test_create_heatmap(self, service):
        """Test heatmap creation"""
        # Create a simple difference array
        diff = np.zeros((50, 50, 3), dtype=np.uint8)
        diff[10:20, 10:20] = 255  # White square
        
        heatmap_b64 = service._create_heatmap(diff)
        
        # Should return base64 string
        assert isinstance(heatmap_b64, str)
        assert len(heatmap_b64) > 0
        
        # Should be valid base64
        try:
            base64.b64decode(heatmap_b64)
        except Exception:
            pytest.fail("Heatmap is not valid base64")
    
    def test_create_overlay(self, service):
        """Test overlay creation"""
        # Create sample images and mask
        img1 = np.random.randint(0, 255, (50, 50, 3), dtype=np.uint8)
        img2 = np.random.randint(0, 255, (50, 50, 3), dtype=np.uint8)
        mask = np.zeros((50, 50), dtype=np.uint8)
        mask[10:20, 10:20] = 255  # Changed region
        
        overlay_b64 = service._create_overlay(img1, img2, mask)
        
        # Should return base64 string
        assert isinstance(overlay_b64, str)
        assert len(overlay_b64) > 0
        
        # Should be valid base64
        try:
            base64.b64decode(overlay_b64)
        except Exception:
            pytest.fail("Overlay is not valid base64")
    
    def test_calculate_difference_score(self, service):
        """Test difference score calculation"""
        # Mock comparison result
        comparison_result = {
            'difference_percentage': 25.0,
            'ssim': 0.7,  # 70% similar, so 30% different
            'mse': 0.05
        }
        
        score = service.calculate_difference_score(comparison_result)
        
        # Should be between 0 and 100
        assert 0 <= score <= 100
        assert isinstance(score, float)
    
    def test_calculate_difference_score_edge_cases(self, service):
        """Test difference score calculation with edge cases"""
        # Perfect match
        perfect_match = {
            'difference_percentage': 0.0,
            'ssim': 1.0,
            'mse': 0.0
        }
        score = service.calculate_difference_score(perfect_match)
        assert score < 5.0  # Should be very low
        
        # Complete difference
        complete_diff = {
            'difference_percentage': 100.0,
            'ssim': 0.0,
            'mse': 1.0
        }
        score = service.calculate_difference_score(complete_diff)
        assert score > 90.0  # Should be very high
    
    def test_compare_images_identical(self, service, sample_images):
        """Test complete image comparison with identical images"""
        result = service.compare_images(
            sample_images['identical1'], 
            sample_images['identical2']
        )
        
        # Check structure
        assert 'difference_score' in result
        assert 'metrics' in result
        assert 'visualizations' in result
        assert 'image_info' in result
        
        # Check values for identical images
        assert result['difference_score'] < 5.0
        assert result['metrics']['ssim'] > 0.95
        assert result['image_info']['processed'] == True
    
    def test_compare_images_different(self, service, sample_images):
        """Test complete image comparison with different images"""
        result = service.compare_images(
            sample_images['identical1'], 
            sample_images['different']
        )
        
        # Check structure
        assert 'difference_score' in result
        assert 'metrics' in result
        assert 'visualizations' in result
        
        # Check values for different images
        assert result['difference_score'] > 50.0
        assert result['metrics']['ssim'] < 0.7
        assert len(result['visualizations']['heatmap']) > 0
        assert len(result['visualizations']['overlay']) > 0
    
    def test_compare_images_invalid_first(self, service, sample_images):
        """Test comparison with invalid first image"""
        with pytest.raises(ValueError, match="Invalid first image"):
            service.compare_images(b"invalid", sample_images['identical1'])
    
    def test_compare_images_invalid_second(self, service, sample_images):
        """Test comparison with invalid second image"""
        with pytest.raises(ValueError, match="Invalid second image"):
            service.compare_images(sample_images['identical1'], b"invalid")
    
    def test_compare_images_different_formats(self, service):
        """Test comparison with different image formats"""
        # Create JPEG and PNG versions of the same image
        img = Image.new('RGB', (100, 100), color='green')
        
        # Save as JPEG
        jpeg_buffer = io.BytesIO()
        img.save(jpeg_buffer, format='JPEG')
        jpeg_data = jpeg_buffer.getvalue()
        
        # Save as PNG
        png_buffer = io.BytesIO()
        img.save(png_buffer, format='PNG')
        png_data = png_buffer.getvalue()
        
        # Should work despite different formats
        result = service.compare_images(jpeg_data, png_data)
        assert result['difference_score'] < 10.0  # Should be very similar


class TestComparisonModels:
    """Test suite for Pydantic models"""
    
    def test_comparison_request_validation(self):
        """Test ComparisonRequest model validation"""
        # Valid request
        valid_request = ComparisonRequest(
            image1_name="before.png",
            image2_name="after.png",
            sensitivity=50.0,
            include_visualizations=True
        )
        assert valid_request.sensitivity == 50.0
        
        # Invalid sensitivity (too low)
        with pytest.raises(ValueError):
            ComparisonRequest(sensitivity=0.5)
        
        # Invalid sensitivity (too high)
        with pytest.raises(ValueError):
            ComparisonRequest(sensitivity=150.0)
    
    def test_comparison_response_structure(self):
        """Test ComparisonResponse model structure"""
        from datetime import datetime
        from models.comparison import ComparisonMetrics, ComparisonImageInfo
        
        response_data = {
            'id': 'test-123',
            'difference_score': 25.5,
            'metrics': ComparisonMetrics(
                mse=0.05,
                ssim=0.85,
                difference_percentage=25.0,
                changed_pixels=2500,
                total_pixels=10000
            ),
            'image_info': ComparisonImageInfo(
                dimensions='100x100',
                processed=True
            ),
            'created_at': datetime.utcnow(),
            'status': 'completed'
        }
        
        response = ComparisonResponse(**response_data)
        assert response.difference_score == 25.5
        assert response.metrics.ssim == 0.85
        assert response.status == 'completed'


if __name__ == "__main__":
    # Run tests
    pytest.main([__file__, "-v"])
