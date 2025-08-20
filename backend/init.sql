-- Initialize database schema for DukuAI Image Comparison Application

-- Create comparison_results table for storing image comparison data
CREATE TABLE IF NOT EXISTS comparison_results (
    id VARCHAR(255) PRIMARY KEY,
    
    -- Comparison metrics
    difference_score FLOAT NOT NULL,
    mse FLOAT NOT NULL,
    ssim FLOAT NOT NULL,
    difference_percentage FLOAT NOT NULL,
    changed_pixels INTEGER NOT NULL,
    total_pixels INTEGER NOT NULL,
    
    -- Image information
    image1_filename VARCHAR(255),
    image2_filename VARCHAR(255),
    image_dimensions VARCHAR(50) NOT NULL,
    
    -- Visualization data (base64 encoded)
    heatmap_data TEXT,
    overlay_data TEXT,
    
    -- Processing metadata
    processing_time_ms FLOAT,
    algorithm_version VARCHAR(50) DEFAULT '1.0',
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Status tracking
    status VARCHAR(50) DEFAULT 'completed',
    error_message TEXT
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_comparison_results_created_at ON comparison_results(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_comparison_results_status ON comparison_results(status);
CREATE INDEX IF NOT EXISTS idx_comparison_results_difference_score ON comparison_results(difference_score);
CREATE INDEX IF NOT EXISTS idx_comparison_results_image_dims ON comparison_results(image_dimensions);

-- Create a trigger to automatically update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_comparison_results_updated_at 
    BEFORE UPDATE ON comparison_results 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Insert sample comparison data for testing
INSERT INTO comparison_results (
    id, 
    difference_score, 
    mse, 
    ssim, 
    difference_percentage, 
    changed_pixels, 
    total_pixels,
    image1_filename,
    image2_filename,
    image_dimensions,
    processing_time_ms,
    status
) VALUES 
    (
        'sample-comparison-1',
        15.5,
        0.025,
        0.94,
        12.3,
        1230,
        10000,
        'before_screenshot.png',
        'after_screenshot.png',
        '100x100',
        250.0,
        'completed'
    ),
    (
        'sample-comparison-2',
        67.8,
        0.156,
        0.45,
        65.2,
        6520,
        10000,
        'ui_before.png',
        'ui_after.png',
        '200x150',
        340.0,
        'completed'
    ),
    (
        'sample-comparison-3',
        2.1,
        0.003,
        0.998,
        1.8,
        180,
        10000,
        'identical_1.png',
        'identical_2.png',
        '100x100',
        180.0,
        'completed'
    )
ON CONFLICT (id) DO NOTHING;

-- Create a view for summary statistics
CREATE OR REPLACE VIEW comparison_summary AS
SELECT 
    COUNT(*) as total_comparisons,
    AVG(difference_score) as avg_difference_score,
    MIN(difference_score) as min_difference_score,
    MAX(difference_score) as max_difference_score,
    AVG(processing_time_ms) as avg_processing_time_ms,
    COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_comparisons,
    COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed_comparisons
FROM comparison_results;
