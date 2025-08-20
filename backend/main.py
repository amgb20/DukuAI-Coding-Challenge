from fastapi import FastAPI, HTTPException, UploadFile, File, Form, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from typing import List, Optional
import uvicorn
import os
import time
import logging
from datetime import datetime, timedelta
from contextlib import asynccontextmanager
from dotenv import load_dotenv

# Import our services and models
from services.image_comparison import ImageComparisonService
from services.database import db_service
from models.comparison import (
    ComparisonResponse, ComparisonRequest, HealthResponse, 
    ErrorResponse, ComparisonListResponse, ComparisonSummary
)

# Load environment variables
load_dotenv()

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Application startup/shutdown events
@asynccontextmanager
async def lifespan(app: FastAPI):
    """Handle application startup and shutdown"""
    # Startup
    logger.info("Starting DukuAI Image Comparison API...")
    try:
        await db_service.init_database()
        logger.info("Database initialized successfully")
    except Exception as e:
        logger.error(f"Failed to initialize database: {str(e)}")
        # Continue anyway for testing purposes
    
    # Store startup time
    app.state.startup_time = datetime.utcnow()
    
    yield
    
    # Shutdown
    logger.info("Shutting down DukuAI Image Comparison API...")

app = FastAPI(
    title="DukuAI Image Comparison API",
    description="Backend API for comparing before/after screenshots and detecting visual differences",
    version="2.0.0",
    lifespan=lifespan
)

# CORS configuration
origins = os.getenv("CORS_ORIGINS", "http://localhost:3000").split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize services
image_comparison_service = ImageComparisonService()

# Dependency for getting image comparison service
def get_image_comparison_service() -> ImageComparisonService:
    return image_comparison_service

@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "message": "Welcome to DukuAI Image Comparison API",
        "version": "2.0.0",
        "description": "Upload two images to detect and visualize differences",
        "endpoints": {
            "health": "/health",
            "compare": "/comparison",
            "get_result": "/comparison/{id}",
            "list_results": "/comparisons",
            "docs": "/docs"
        }
    }

@app.get("/health", response_model=HealthResponse)
async def health_check():
    """Enhanced health check endpoint"""
    try:
        # Check database connection
        db_healthy = await db_service.health_check()
        
        # Calculate uptime
        startup_time = getattr(app.state, 'startup_time', datetime.utcnow())
        uptime = datetime.utcnow() - startup_time
        uptime_str = str(uptime).split('.')[0]  # Remove microseconds
        
        # Check Redis (placeholder for now)
        redis_healthy = True  # TODO: Implement Redis health check
        
        status = "healthy" if db_healthy else "degraded"
        
        return HealthResponse(
            status=status,
            message="Image Comparison API is running successfully",
            version="2.0.0",
            uptime=uptime_str,
            database_connected=db_healthy,
            redis_connected=redis_healthy
        )
    except Exception as e:
        logger.error(f"Health check failed: {str(e)}")
        return HealthResponse(
            status="unhealthy",
            message=f"Health check failed: {str(e)}",
            version="2.0.0",
            database_connected=False,
            redis_connected=False
        )

@app.post("/comparison", response_model=ComparisonResponse)
async def create_comparison(
    image1: UploadFile = File(..., description="First image (before)"),
    image2: UploadFile = File(..., description="Second image (after)"),
    image1_name: Optional[str] = Form(None, description="Optional name for first image"),
    image2_name: Optional[str] = Form(None, description="Optional name for second image"),
    include_visualizations: bool = Form(True, description="Include heatmap and overlay visualizations"),
    sensitivity: float = Form(50.0, ge=1.0, le=100.0, description="Sensitivity threshold (1-100)"),
    comparison_service: ImageComparisonService = Depends(get_image_comparison_service)
):
    """
    Compare two images and detect visual differences
    
    This endpoint accepts two image files and returns:
    - Overall difference score (0-100%)
    - Detailed metrics (MSE, SSIM, pixel differences)
    - Visual representations (heatmap, overlay)
    - Unique ID for retrieving results later
    """
    start_time = time.time()
    
    try:
        logger.info(f"Starting image comparison - Image1: {image1.filename}, Image2: {image2.filename}")
        
        # Validate file types
        allowed_types = {'image/jpeg', 'image/png', 'image/bmp', 'image/tiff', 'image/webp'}
        if image1.content_type not in allowed_types:
            raise HTTPException(status_code=400, detail=f"Unsupported image1 format: {image1.content_type}")
        if image2.content_type not in allowed_types:
            raise HTTPException(status_code=400, detail=f"Unsupported image2 format: {image2.content_type}")
        
        # Read image data
        image1_data = await image1.read()
        image2_data = await image2.read()
        
        # Validate file sizes (max 10MB each)
        max_size = 10 * 1024 * 1024  # 10MB
        if len(image1_data) > max_size:
            raise HTTPException(status_code=400, detail="Image1 file too large (max 10MB)")
        if len(image2_data) > max_size:
            raise HTTPException(status_code=400, detail="Image2 file too large (max 10MB)")
        
        # Perform comparison
        comparison_result = comparison_service.compare_images(image1_data, image2_data, sensitivity)
        
        # Calculate processing time
        processing_time = (time.time() - start_time) * 1000  # Convert to milliseconds
        
        # Add metadata
        comparison_result['processing_time_ms'] = processing_time
        comparison_result['image_info']['image1_name'] = image1_name or image1.filename
        comparison_result['image_info']['image2_name'] = image2_name or image2.filename
        comparison_result['status'] = 'completed'
        
        # Remove visualizations if not requested
        if not include_visualizations:
            comparison_result['visualizations'] = None
        
        # Store in database
        comparison_id = await db_service.store_comparison_result(comparison_result)
        
        # Prepare response
        response = ComparisonResponse(
            id=comparison_id,
            difference_score=comparison_result['difference_score'],
            metrics=comparison_result['metrics'],
            visualizations=comparison_result.get('visualizations'),
            difference_analysis=comparison_result.get('difference_analysis'),
            image_info=comparison_result['image_info'],
            processing_time_ms=processing_time,
            created_at=datetime.utcnow(),
            status='completed'
        )
        
        logger.info(f"Comparison completed - ID: {comparison_id}, Score: {comparison_result['difference_score']:.2f}%")
        return response
        
    except HTTPException:
        raise
    except ValueError as e:
        logger.error(f"Validation error in comparison: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Unexpected error in comparison: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error during image comparison")

@app.get("/comparison/{comparison_id}", response_model=ComparisonResponse)
async def get_comparison(comparison_id: str):
    """
    Retrieve a previous comparison result by ID
    """
    try:
        logger.info(f"Retrieving comparison: {comparison_id}")
        
        # Get from database
        comparison = await db_service.get_comparison_result(comparison_id)
        
        if not comparison:
            raise HTTPException(status_code=404, detail="Comparison not found")
        
        # Convert to response model
        response = ComparisonResponse(
            id=comparison.id,
            difference_score=comparison.difference_score,
            metrics={
                'mse': comparison.mse,
                'ssim': comparison.ssim,
                'difference_percentage': comparison.difference_percentage,
                'changed_pixels': comparison.changed_pixels,
                'total_pixels': comparison.total_pixels
            },
            visualizations={
                'heatmap': comparison.heatmap_data,
                'overlay': comparison.overlay_data
            } if comparison.heatmap_data or comparison.overlay_data else None,
            image_info={
                'dimensions': comparison.image_dimensions,
                'processed': True,
                'image1_name': comparison.image1_filename,
                'image2_name': comparison.image2_filename
            },
            processing_time_ms=comparison.processing_time_ms,
            created_at=comparison.created_at,
            status=comparison.status
        )
        
        return response
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error retrieving comparison {comparison_id}: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")

@app.get("/comparisons", response_model=List[ComparisonListResponse])
async def list_comparisons(limit: int = 50, offset: int = 0):
    """
    List previous comparisons with pagination
    """
    try:
        logger.info(f"Listing comparisons - limit: {limit}, offset: {offset}")
        
        if limit > 100:
            raise HTTPException(status_code=400, detail="Limit cannot exceed 100")
        
        # Get from database
        comparisons = await db_service.list_comparison_results(limit=limit, offset=offset)
        
        # Convert to response models
        response = []
        for comp in comparisons:
            response.append(ComparisonListResponse(
                id=comp.id,
                difference_score=comp.difference_score,
                image_info={
                    'dimensions': comp.image_dimensions,
                    'processed': True,
                    'image1_name': comp.image1_filename,
                    'image2_name': comp.image2_filename
                },
                created_at=comp.created_at,
                status=comp.status
            ))
        
        return response
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error listing comparisons: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")

@app.get("/comparisons/stats", response_model=ComparisonSummary)
async def get_comparison_statistics():
    """
    Get summary statistics for all comparisons
    """
    try:
        logger.info("Retrieving comparison statistics")
        
        stats = await db_service.get_comparison_statistics()
        
        return ComparisonSummary(
            total_comparisons=stats['total_comparisons'],
            average_difference_score=stats['average_difference_score'],
            highest_difference_score=stats['highest_difference_score'],
            lowest_difference_score=stats['lowest_difference_score'],
            most_recent_comparison=stats['most_recent_comparison']
        )
        
    except Exception as e:
        logger.error(f"Error getting statistics: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")

@app.delete("/comparison/{comparison_id}")
async def delete_comparison(comparison_id: str):
    """
    Delete a comparison result
    """
    try:
        logger.info(f"Deleting comparison: {comparison_id}")
        
        deleted = await db_service.delete_comparison_result(comparison_id)
        
        if not deleted:
            raise HTTPException(status_code=404, detail="Comparison not found")
        
        return {"message": "Comparison deleted successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting comparison {comparison_id}: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")

@app.exception_handler(Exception)
async def global_exception_handler(request, exc):
    """Global exception handler"""
    logger.error(f"Unhandled exception: {str(exc)}")
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal server error", "error": str(exc)}
    )

if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=int(os.getenv("PORT", 8000)),
        reload=os.getenv("DEBUG", "false").lower() == "true"
    )
