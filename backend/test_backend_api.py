"""
API integration tests for the image comparison backend

This file tests the REST API endpoints, including request/response handling,
error cases, and end-to-end workflows.
"""

import pytest
import io
import asyncio
from fastapi.testclient import TestClient
from PIL import Image, ImageDraw
import tempfile
import os
from unittest.mock import AsyncMock, patch

# Import the FastAPI app
from main import app
from services.database import db_service


class TestAPI:
    """Test suite for API endpoints"""
    
    @pytest.fixture
    def client(self):
        """Create a test client"""
        return TestClient(app)
    
    @pytest.fixture
    def sample_image_files(self):
        """Create sample image files for testing"""
        def create_image_file(color, size=(100, 100), format='PNG'):
            img = Image.new('RGB', size, color=color)
            buffer = io.BytesIO()
            img.save(buffer, format=format)
            buffer.seek(0)
            return buffer
        
        def create_image_with_difference(base_color, diff_color, size=(100, 100)):
            img = Image.new('RGB', size, color=base_color)
            draw = ImageDraw.Draw(img)
            # Add a different colored rectangle
            draw.rectangle([25, 25, 75, 75], fill=diff_color)
            buffer = io.BytesIO()
            img.save(buffer, format='PNG')
            buffer.seek(0)
            return buffer
        
        return {
            'red_image': create_image_file('red'),
            'red_image_copy': create_image_file('red'),
            'blue_image': create_image_file('blue'),
            'red_with_blue_square': create_image_with_difference('red', 'blue'),
            'large_image': create_image_file('green', size=(500, 500)),
            'jpeg_image': create_image_file('yellow', format='JPEG')
        }
    
    def test_root_endpoint(self, client):
        """Test the root endpoint"""
        response = client.get("/")
        assert response.status_code == 200
        data = response.json()
        assert "message" in data
        assert "version" in data
        assert data["version"] == "2.0.0"
        assert "endpoints" in data
    
    def test_health_endpoint(self, client):
        """Test the health check endpoint"""
        response = client.get("/health")
        assert response.status_code == 200
        data = response.json()
        assert "status" in data
        assert "message" in data
        assert "version" in data
        assert data["version"] == "2.0.0"
    
    @patch('services.database.db_service.store_comparison_result')
    @patch('services.database.db_service.init_database')
    def test_comparison_endpoint_identical_images(self, mock_init_db, mock_store, client, sample_image_files):
        """Test comparison endpoint with identical images"""
        mock_store.return_value = "test-comparison-id-123"
        
        files = {
            'image1': ('before.png', sample_image_files['red_image'], 'image/png'),
            'image2': ('after.png', sample_image_files['red_image_copy'], 'image/png')
        }
        data = {
            'image1_name': 'before.png',
            'image2_name': 'after.png',
            'include_visualizations': True
        }
        
        response = client.post("/comparison", files=files, data=data)
        assert response.status_code == 200
        
        result = response.json()
        assert 'id' in result
        assert 'difference_score' in result
        assert 'metrics' in result
        assert 'visualizations' in result
        assert 'image_info' in result
        
        # Identical images should have low difference score
        assert result['difference_score'] < 10.0
        assert result['metrics']['ssim'] > 0.9
        assert result['status'] == 'completed'
    
    @patch('services.database.db_service.store_comparison_result')
    def test_comparison_endpoint_different_images(self, mock_store, client, sample_image_files):
        """Test comparison endpoint with different images"""
        mock_store.return_value = "test-comparison-id-456"
        
        files = {
            'image1': ('red.png', sample_image_files['red_image'], 'image/png'),
            'image2': ('blue.png', sample_image_files['blue_image'], 'image/png')
        }
        
        response = client.post("/comparison", files=files)
        assert response.status_code == 200
        
        result = response.json()
        assert result['difference_score'] > 50.0  # Should be significantly different
        assert result['metrics']['ssim'] < 0.7
        assert 'heatmap' in result['visualizations']
        assert 'overlay' in result['visualizations']
    
    @patch('services.database.db_service.store_comparison_result')
    def test_comparison_endpoint_partial_differences(self, mock_store, client, sample_image_files):
        """Test comparison endpoint with partially different images"""
        mock_store.return_value = "test-comparison-id-789"
        
        files = {
            'image1': ('red.png', sample_image_files['red_image'], 'image/png'),
            'image2': ('red_modified.png', sample_image_files['red_with_blue_square'], 'image/png')
        }
        
        response = client.post("/comparison", files=files)
        assert response.status_code == 200
        
        result = response.json()
        # Should have moderate differences
        assert 10.0 < result['difference_score'] < 50.0
        assert 0.5 < result['metrics']['ssim'] < 0.9
    
    def test_comparison_endpoint_without_visualizations(self, client, sample_image_files):
        """Test comparison endpoint without visualizations"""
        files = {
            'image1': ('test1.png', sample_image_files['red_image'], 'image/png'),
            'image2': ('test2.png', sample_image_files['blue_image'], 'image/png')
        }
        data = {'include_visualizations': False}
        
        with patch('services.database.db_service.store_comparison_result') as mock_store:
            mock_store.return_value = "test-id"
            response = client.post("/comparison", files=files, data=data)
        
        assert response.status_code == 200
        result = response.json()
        assert result['visualizations'] is None
    
    def test_comparison_endpoint_different_formats(self, client, sample_image_files):
        """Test comparison endpoint with different image formats"""
        files = {
            'image1': ('test.png', sample_image_files['red_image'], 'image/png'),
            'image2': ('test.jpg', sample_image_files['jpeg_image'], 'image/jpeg')
        }
        
        with patch('services.database.db_service.store_comparison_result') as mock_store:
            mock_store.return_value = "test-id"
            response = client.post("/comparison", files=files)
        
        assert response.status_code == 200
    
    def test_comparison_endpoint_invalid_file_type(self, client):
        """Test comparison endpoint with invalid file type"""
        text_file = io.BytesIO(b"This is not an image")
        files = {
            'image1': ('test.txt', text_file, 'text/plain'),
            'image2': ('test.png', io.BytesIO(b"fake png"), 'image/png')
        }
        
        response = client.post("/comparison", files=files)
        assert response.status_code == 400
        assert "Unsupported image1 format" in response.json()['detail']
    
    def test_comparison_endpoint_file_too_large(self, client):
        """Test comparison endpoint with file too large"""
        # Create a very large fake file (simulate 11MB)
        large_data = b"x" * (11 * 1024 * 1024)
        large_file = io.BytesIO(large_data)
        small_file = io.BytesIO(b"small")
        
        files = {
            'image1': ('large.png', large_file, 'image/png'),
            'image2': ('small.png', small_file, 'image/png')
        }
        
        response = client.post("/comparison", files=files)
        assert response.status_code == 400
        assert "file too large" in response.json()['detail']
    
    def test_comparison_endpoint_missing_files(self, client):
        """Test comparison endpoint with missing files"""
        response = client.post("/comparison")
        assert response.status_code == 422  # Validation error
    
    @patch('services.database.db_service.get_comparison_result')
    def test_get_comparison_endpoint(self, mock_get, client):
        """Test retrieving a comparison result"""
        from models.comparison import ComparisonResult
        from datetime import datetime
        
        # Mock database result
        mock_comparison = ComparisonResult(
            id="test-123",
            difference_score=25.5,
            mse=0.05,
            ssim=0.85,
            difference_percentage=25.0,
            changed_pixels=2500,
            total_pixels=10000,
            image_dimensions="100x100",
            heatmap_data="fake_heatmap_data",
            overlay_data="fake_overlay_data",
            processing_time_ms=150.0,
            created_at=datetime.utcnow(),
            status="completed"
        )
        mock_get.return_value = mock_comparison
        
        response = client.get("/comparison/test-123")
        assert response.status_code == 200
        
        result = response.json()
        assert result['id'] == "test-123"
        assert result['difference_score'] == 25.5
        assert result['metrics']['ssim'] == 0.85
        assert result['visualizations']['heatmap'] == "fake_heatmap_data"
    
    @patch('services.database.db_service.get_comparison_result')
    def test_get_comparison_not_found(self, mock_get, client):
        """Test retrieving a non-existent comparison"""
        mock_get.return_value = None
        
        response = client.get("/comparison/nonexistent")
        assert response.status_code == 404
        assert "not found" in response.json()['detail']
    
    @patch('services.database.db_service.list_comparison_results')
    def test_list_comparisons_endpoint(self, mock_list, client):
        """Test listing comparisons"""
        from models.comparison import ComparisonResult
        from datetime import datetime
        
        # Mock database results
        mock_comparisons = [
            ComparisonResult(
                id="test-1",
                difference_score=15.0,
                mse=0.02,
                ssim=0.95,
                difference_percentage=10.0,
                changed_pixels=1000,
                total_pixels=10000,
                image_dimensions="100x100",
                created_at=datetime.utcnow(),
                status="completed"
            ),
            ComparisonResult(
                id="test-2",
                difference_score=45.0,
                mse=0.15,
                ssim=0.65,
                difference_percentage=40.0,
                changed_pixels=4000,
                total_pixels=10000,
                image_dimensions="150x150",
                created_at=datetime.utcnow(),
                status="completed"
            )
        ]
        mock_list.return_value = mock_comparisons
        
        response = client.get("/comparisons")
        assert response.status_code == 200
        
        results = response.json()
        assert len(results) == 2
        assert results[0]['id'] == "test-1"
        assert results[1]['id'] == "test-2"
    
    def test_list_comparisons_with_pagination(self, client):
        """Test listing comparisons with pagination parameters"""
        with patch('services.database.db_service.list_comparison_results') as mock_list:
            mock_list.return_value = []
            
            response = client.get("/comparisons?limit=10&offset=20")
            assert response.status_code == 200
            
            # Verify pagination parameters were passed
            mock_list.assert_called_once_with(limit=10, offset=20)
    
    def test_list_comparisons_limit_exceeded(self, client):
        """Test listing comparisons with limit too high"""
        response = client.get("/comparisons?limit=200")
        assert response.status_code == 400
        assert "exceed 100" in response.json()['detail']
    
    @patch('services.database.db_service.get_comparison_statistics')
    def test_comparison_statistics_endpoint(self, mock_stats, client):
        """Test getting comparison statistics"""
        mock_stats.return_value = {
            'total_comparisons': 42,
            'average_difference_score': 35.7,
            'highest_difference_score': 89.2,
            'lowest_difference_score': 2.1,
            'most_recent_comparison': None
        }
        
        response = client.get("/comparisons/stats")
        assert response.status_code == 200
        
        stats = response.json()
        assert stats['total_comparisons'] == 42
        assert stats['average_difference_score'] == 35.7
        assert stats['highest_difference_score'] == 89.2
    
    @patch('services.database.db_service.delete_comparison_result')
    def test_delete_comparison_endpoint(self, mock_delete, client):
        """Test deleting a comparison"""
        mock_delete.return_value = True
        
        response = client.delete("/comparison/test-123")
        assert response.status_code == 200
        assert "deleted successfully" in response.json()['message']
    
    @patch('services.database.db_service.delete_comparison_result')
    def test_delete_comparison_not_found(self, mock_delete, client):
        """Test deleting a non-existent comparison"""
        mock_delete.return_value = False
        
        response = client.delete("/comparison/nonexistent")
        assert response.status_code == 404
        assert "not found" in response.json()['detail']


class TestAPIErrorHandling:
    """Test suite for API error handling"""
    
    @pytest.fixture
    def client(self):
        return TestClient(app)
    
    def test_database_error_handling(self, client, sample_image_files):
        """Test handling of database errors"""
        files = {
            'image1': ('test1.png', sample_image_files['red_image'], 'image/png'),
            'image2': ('test2.png', sample_image_files['blue_image'], 'image/png')
        }
        
        with patch('services.database.db_service.store_comparison_result') as mock_store:
            mock_store.side_effect = Exception("Database connection failed")
            
            response = client.post("/comparison", files=files)
            assert response.status_code == 500
    
    def test_image_processing_error_handling(self, client):
        """Test handling of image processing errors"""
        # Create invalid image data that will pass initial validation but fail processing
        invalid_image = io.BytesIO(b"fake image data that might pass initial checks")
        
        files = {
            'image1': ('test1.png', invalid_image, 'image/png'),
            'image2': ('test2.png', invalid_image, 'image/png')
        }
        
        response = client.post("/comparison", files=files)
        assert response.status_code in [400, 500]  # Should handle the error gracefully


class TestAPIPerformance:
    """Test suite for API performance characteristics"""
    
    @pytest.fixture
    def client(self):
        return TestClient(app)
    
    def test_comparison_performance_small_images(self, client, sample_image_files):
        """Test comparison performance with small images"""
        files = {
            'image1': ('small1.png', sample_image_files['red_image'], 'image/png'),
            'image2': ('small2.png', sample_image_files['blue_image'], 'image/png')
        }
        
        with patch('services.database.db_service.store_comparison_result') as mock_store:
            mock_store.return_value = "test-id"
            
            import time
            start_time = time.time()
            response = client.post("/comparison", files=files)
            end_time = time.time()
            
            assert response.status_code == 200
            processing_time = (end_time - start_time) * 1000  # Convert to ms
            
            # Should complete reasonably quickly (adjust threshold as needed)
            assert processing_time < 5000  # 5 seconds
    
    def test_comparison_performance_large_images(self, client, sample_image_files):
        """Test comparison performance with larger images"""
        files = {
            'image1': ('large1.png', sample_image_files['large_image'], 'image/png'),
            'image2': ('large2.png', sample_image_files['large_image'], 'image/png')
        }
        
        with patch('services.database.db_service.store_comparison_result') as mock_store:
            mock_store.return_value = "test-id"
            
            import time
            start_time = time.time()
            response = client.post("/comparison", files=files)
            end_time = time.time()
            
            assert response.status_code == 200
            processing_time = (end_time - start_time) * 1000
            
            # Larger images should still complete within reasonable time
            assert processing_time < 10000  # 10 seconds


if __name__ == "__main__":
    # Run tests
    pytest.main([__file__, "-v", "--tb=short"])
