"""
Database service for image comparison system
"""

from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from sqlalchemy.orm import Session
from sqlalchemy import create_engine, select, desc, func
from models.comparison import ComparisonResult, Base
from typing import List, Optional, Dict, Any
import logging
import os
from contextlib import asynccontextmanager
import time

logger = logging.getLogger(__name__)


class DatabaseService:
    """Service for database operations"""
    
    def __init__(self):
        self.database_url = os.getenv("DATABASE_URL", "postgresql://dukuai_user:dukuai_password@db:5432/dukuai_db")
        # Convert to async URL for async operations
        self.async_database_url = self.database_url.replace("postgresql://", "postgresql+asyncpg://")
        
        # Create engines
        self.engine = create_engine(self.database_url)
        self.async_engine = create_async_engine(self.async_database_url)
        
        # Create session makers
        self.SessionLocal = async_sessionmaker(
            self.async_engine, 
            class_=AsyncSession, 
            expire_on_commit=False
        )
        
    async def init_database(self):
        """Initialize database tables"""
        try:
            async with self.async_engine.begin() as conn:
                await conn.run_sync(Base.metadata.create_all)
            logger.info("Database tables initialized successfully")
        except Exception as e:
            logger.error(f"Failed to initialize database: {str(e)}")
            raise
    
    @asynccontextmanager
    async def get_session(self):
        """Get async database session"""
        async with self.SessionLocal() as session:
            try:
                yield session
                await session.commit()
            except Exception:
                await session.rollback()
                raise
            finally:
                await session.close()
    
    async def store_comparison_result(self, comparison_data: Dict[str, Any]) -> str:
        """
        Store comparison result in database
        
        Args:
            comparison_data: Dictionary containing comparison results
            
        Returns:
            The ID of the stored comparison
        """
        try:
            async with self.get_session() as session:
                comparison = ComparisonResult(
                    difference_score=comparison_data.get('difference_score', 0.0),
                    mse=comparison_data.get('metrics', {}).get('mse', 0.0),
                    ssim=comparison_data.get('metrics', {}).get('ssim', 0.0),
                    difference_percentage=comparison_data.get('metrics', {}).get('difference_percentage', 0.0),
                    changed_pixels=comparison_data.get('metrics', {}).get('changed_pixels', 0),
                    total_pixels=comparison_data.get('metrics', {}).get('total_pixels', 0),
                    image1_filename=comparison_data.get('image_info', {}).get('image1_name'),
                    image2_filename=comparison_data.get('image_info', {}).get('image2_name'),
                    image_dimensions=comparison_data.get('image_info', {}).get('dimensions', ''),
                    heatmap_data=comparison_data.get('visualizations', {}).get('heatmap'),
                    overlay_data=comparison_data.get('visualizations', {}).get('overlay'),
                    processing_time_ms=comparison_data.get('processing_time_ms'),
                    status=comparison_data.get('status', 'completed'),
                    error_message=comparison_data.get('error_message')
                )
                
                session.add(comparison)
                await session.flush()  # Get the ID
                comparison_id = comparison.id
                
                logger.info(f"Stored comparison result with ID: {comparison_id}")
                return comparison_id
                
        except Exception as e:
            logger.error(f"Failed to store comparison result: {str(e)}")
            raise
    
    async def get_comparison_result(self, comparison_id: str) -> Optional[ComparisonResult]:
        """
        Retrieve comparison result by ID
        
        Args:
            comparison_id: The ID of the comparison to retrieve
            
        Returns:
            ComparisonResult object or None if not found
        """
        try:
            async with self.get_session() as session:
                result = await session.execute(
                    select(ComparisonResult).where(ComparisonResult.id == comparison_id)
                )
                comparison = result.scalar_one_or_none()
                
                if comparison:
                    logger.info(f"Retrieved comparison result: {comparison_id}")
                else:
                    logger.warning(f"Comparison not found: {comparison_id}")
                
                return comparison
                
        except Exception as e:
            logger.error(f"Failed to retrieve comparison result {comparison_id}: {str(e)}")
            raise
    
    async def list_comparison_results(self, limit: int = 50, offset: int = 0) -> List[ComparisonResult]:
        """
        List comparison results with pagination
        
        Args:
            limit: Maximum number of results to return
            offset: Number of results to skip
            
        Returns:
            List of ComparisonResult objects
        """
        try:
            async with self.get_session() as session:
                result = await session.execute(
                    select(ComparisonResult)
                    .order_by(desc(ComparisonResult.created_at))
                    .limit(limit)
                    .offset(offset)
                )
                comparisons = result.scalars().all()
                
                logger.info(f"Retrieved {len(comparisons)} comparison results")
                return list(comparisons)
                
        except Exception as e:
            logger.error(f"Failed to list comparison results: {str(e)}")
            raise
    
    async def delete_comparison_result(self, comparison_id: str) -> bool:
        """
        Delete comparison result by ID
        
        Args:
            comparison_id: The ID of the comparison to delete
            
        Returns:
            True if deleted, False if not found
        """
        try:
            async with self.get_session() as session:
                result = await session.execute(
                    select(ComparisonResult).where(ComparisonResult.id == comparison_id)
                )
                comparison = result.scalar_one_or_none()
                
                if comparison:
                    await session.delete(comparison)
                    logger.info(f"Deleted comparison result: {comparison_id}")
                    return True
                else:
                    logger.warning(f"Comparison not found for deletion: {comparison_id}")
                    return False
                    
        except Exception as e:
            logger.error(f"Failed to delete comparison result {comparison_id}: {str(e)}")
            raise
    
    async def get_comparison_statistics(self) -> Dict[str, Any]:
        """
        Get summary statistics for all comparisons
        
        Returns:
            Dictionary containing summary statistics
        """
        try:
            async with self.get_session() as session:
                # Count total comparisons
                count_result = await session.execute(
                    select(func.count(ComparisonResult.id))
                )
                total_count = count_result.scalar()
                
                if total_count == 0:
                    return {
                        'total_comparisons': 0,
                        'average_difference_score': 0.0,
                        'highest_difference_score': 0.0,
                        'lowest_difference_score': 0.0,
                        'most_recent_comparison': None
                    }
                
                # Get statistics
                stats_result = await session.execute(
                    select(
                        func.avg(ComparisonResult.difference_score),
                        func.max(ComparisonResult.difference_score),
                        func.min(ComparisonResult.difference_score),
                        func.max(ComparisonResult.created_at)
                    )
                )
                avg_score, max_score, min_score, latest_date = stats_result.first()
                
                return {
                    'total_comparisons': total_count,
                    'average_difference_score': float(avg_score or 0.0),
                    'highest_difference_score': float(max_score or 0.0),
                    'lowest_difference_score': float(min_score or 0.0),
                    'most_recent_comparison': latest_date
                }
                
        except Exception as e:
            logger.error(f"Failed to get comparison statistics: {str(e)}")
            raise
    
    async def health_check(self) -> bool:
        """
        Check if database connection is healthy
        
        Returns:
            True if database is accessible, False otherwise
        """
        try:
            async with self.get_session() as session:
                await session.execute(select(1))
                return True
        except Exception as e:
            logger.error(f"Database health check failed: {str(e)}")
            return False


# Global database service instance
db_service = DatabaseService()
