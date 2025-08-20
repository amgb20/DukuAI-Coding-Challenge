"""
Database models for image comparison system
"""

from sqlalchemy import Column, String, Float, Integer, DateTime, Text, Boolean
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.sql import func
from pydantic import BaseModel, Field
from typing import Optional, Dict, Any
from datetime import datetime
import uuid

Base = declarative_base()


class ComparisonResult(Base):
    """SQLAlchemy model for storing comparison results"""
    __tablename__ = "comparison_results"
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    
    # Comparison metrics
    difference_score = Column(Float, nullable=False)
    mse = Column(Float, nullable=False)
    ssim = Column(Float, nullable=False)
    difference_percentage = Column(Float, nullable=False)
    changed_pixels = Column(Integer, nullable=False)
    total_pixels = Column(Integer, nullable=False)
    
    # Image information
    image1_filename = Column(String, nullable=True)
    image2_filename = Column(String, nullable=True)
    image_dimensions = Column(String, nullable=False)  # e.g., "1920x1080"
    
    # Visualization data (base64 encoded)
    heatmap_data = Column(Text, nullable=True)
    overlay_data = Column(Text, nullable=True)
    
    # Processing metadata
    processing_time_ms = Column(Float, nullable=True)
    algorithm_version = Column(String, default="1.0")
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Status tracking
    status = Column(String, default="completed")  # pending, processing, completed, failed
    error_message = Column(Text, nullable=True)


# Pydantic models for API request/response

class ComparisonRequest(BaseModel):
    """Request model for image comparison"""
    image1_name: Optional[str] = Field(None, description="Optional name for the first image")
    image2_name: Optional[str] = Field(None, description="Optional name for the second image")
    sensitivity: Optional[float] = Field(30.0, ge=1.0, le=100.0, description="Sensitivity threshold (1-100)")
    include_visualizations: Optional[bool] = Field(True, description="Whether to include heatmap and overlay")


class ComparisonMetrics(BaseModel):
    """Metrics from image comparison"""
    mse: float = Field(..., description="Mean Squared Error")
    ssim: float = Field(..., description="Structural Similarity Index")
    difference_percentage: float = Field(..., description="Percentage of pixels that changed")
    changed_pixels: int = Field(..., description="Number of pixels that changed")
    total_pixels: int = Field(..., description="Total number of pixels")
    # Enhanced perceptual metrics
    texture_similarity: Optional[float] = Field(None, description="Local Binary Pattern texture similarity")
    color_similarity: Optional[float] = Field(None, description="Color histogram similarity")
    edge_similarity: Optional[float] = Field(None, description="Canny edge-based similarity")
    phash_similarity: Optional[float] = Field(None, description="Perceptual hash similarity")
    overall_perceptual: Optional[float] = Field(None, description="Overall perceptual similarity score")


class ComparisonVisualizations(BaseModel):
    """Visualization data from comparison"""
    heatmap: Optional[str] = Field(None, description="Base64 encoded heatmap image")
    overlay: Optional[str] = Field(None, description="Base64 encoded overlay image")
    enhanced_diff: Optional[str] = Field(None, description="Base64 encoded enhanced difference image")
    raw_diff: Optional[str] = Field(None, description="Base64 encoded raw ImageChops difference")
    changed_objects: Optional[str] = Field(None, description="Base64 encoded changed objects on black background")


class ComparisonImageInfo(BaseModel):
    """Information about processed images"""
    dimensions: str = Field(..., description="Image dimensions (WxH)")
    processed: bool = Field(..., description="Whether images were processed/resized")
    image1_name: Optional[str] = Field(None, description="Name of first image")
    image2_name: Optional[str] = Field(None, description="Name of second image")


class DifferenceAnalysis(BaseModel):
    """Analysis of different regions and changes"""
    has_differences: bool = Field(..., description="Whether differences were detected")
    num_different_regions: int = Field(..., description="Number of different regions found")
    different_regions: list = Field(..., description="List of different regions with coordinates")
    change_types: Dict[str, Any] = Field(..., description="Analysis of types of changes detected")
    difference_bbox: Optional[list] = Field(None, description="Bounding box of all differences")


class ComparisonResponse(BaseModel):
    """Response model for image comparison"""
    id: str = Field(..., description="Unique identifier for this comparison")
    difference_score: float = Field(..., ge=0.0, le=100.0, description="Overall difference score (0-100%)")
    metrics: ComparisonMetrics = Field(..., description="Detailed comparison metrics")
    visualizations: Optional[ComparisonVisualizations] = Field(None, description="Visual representations of differences")
    difference_analysis: Optional[DifferenceAnalysis] = Field(None, description="Analysis of different regions and changes")
    image_info: ComparisonImageInfo = Field(..., description="Information about the processed images")
    processing_time_ms: Optional[float] = Field(None, description="Time taken to process in milliseconds")
    created_at: datetime = Field(..., description="When the comparison was created")
    status: str = Field(..., description="Status of the comparison")


class ComparisonListResponse(BaseModel):
    """Response model for listing comparisons"""
    id: str
    difference_score: float
    image_info: ComparisonImageInfo
    created_at: datetime
    status: str


class ComparisonSummary(BaseModel):
    """Summary statistics for comparisons"""
    total_comparisons: int
    average_difference_score: float
    highest_difference_score: float
    lowest_difference_score: float
    most_recent_comparison: Optional[datetime]


class ErrorResponse(BaseModel):
    """Error response model"""
    error: str = Field(..., description="Error message")
    details: Optional[str] = Field(None, description="Additional error details")
    timestamp: datetime = Field(default_factory=datetime.utcnow)


class HealthResponse(BaseModel):
    """Health check response"""
    status: str = Field(..., description="Service status")
    message: str = Field(..., description="Status message")
    version: str = Field(..., description="API version")
    uptime: Optional[str] = Field(None, description="Service uptime")
    database_connected: bool = Field(..., description="Database connection status")
    redis_connected: bool = Field(..., description="Redis connection status")
