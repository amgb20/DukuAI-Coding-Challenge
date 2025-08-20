import React, { useState, useCallback } from 'react';
import styled from 'styled-components';
import { apiService, ComparisonResponse } from '../services/api';
import RegionDrawer, { IgnoreRegion } from './RegionDrawer';

const Container = styled.div`
  max-width: 100%;
  margin: 0;
  padding: 0;
  font-family: 'Courier New', monospace;
`;

const Title = styled.h1`
  display: none; // Hide the title since it's already in the parent component
`;

const UploadSection = styled.div`
  background: #0f1419;
  border: 1px solid #333;
  border-radius: 8px;
  padding: 30px;
  margin-bottom: 30px;
  position: relative;
  
  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 3px;
    background: linear-gradient(90deg, #00ff88, #0070f3);
  }
`;

const UploadGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 30px;
  margin-bottom: 20px;

  @media (max-width: 768px) {
    grid-template-columns: 1fr;
  }
`;

const UploadBox = styled.div<{ $isDragOver: boolean }>`
  border: 2px dashed ${props => props.$isDragOver ? '#0070f3' : '#333'};
  border-radius: 8px;
  padding: 40px 20px;
  text-align: center;
  transition: all 0.3s ease;
  background: ${props => props.$isDragOver ? '#1a1d3a' : '#0a0e27'};
  cursor: pointer;

  &:hover {
    border-color: #0070f3;
    background: #1a1d3a;
  }
`;

const UploadInput = styled.input`
  display: none;
`;

const UploadLabel = styled.label`
  display: block;
  cursor: pointer;
`;

const UploadText = styled.p`
  margin: 10px 0;
  color: #8892b0;
  font-size: 16px;
`;

const PreviewImage = styled.img`
  max-width: 100%;
  max-height: 200px;
  border-radius: 4px;
  margin-top: 10px;
  border: 1px solid #333;
`;

const CompareButton = styled.button`
  background: linear-gradient(135deg, #00ff88, #0070f3);
  color: #0a0e27;
  border: none;
  padding: 15px 40px;
  border-radius: 4px;
  font-size: 18px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  display: block;
  margin: 0 auto;
  font-family: 'Courier New', monospace;

  &:hover {
    transform: translateY(-2px);
    background: linear-gradient(135deg, #0070f3, #7928ca);
    color: white;
  }

  &:disabled {
    background: #333;
    color: #666;
    cursor: not-allowed;
    transform: none;
    box-shadow: none;
  }
`;

const LoadingSpinner = styled.div`
  display: inline-block;
  width: 20px;
  height: 20px;
  border: 3px solid rgba(255, 255, 255, 0.3);
  border-radius: 50%;
  border-top-color: white;
  animation: spin 1s ease-in-out infinite;
  margin-right: 10px;

  @keyframes spin {
    to { transform: rotate(360deg); }
  }
`;

const ResultsSection = styled.div`
  background: #0f1419;
  border: 1px solid #333;
  border-radius: 8px;
  padding: 30px;
  position: relative;
  
  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 3px;
    background: linear-gradient(90deg, #7928ca, #ff0080);
  }
`;

const ScoreDisplay = styled.div`
  background: linear-gradient(135deg, #1a1d3a, #2d3561);
  color: #e1e5f2;
  padding: 20px;
  border: 1px solid #333;
  border-radius: 8px;
  text-align: center;
  margin-bottom: 30px;
`;

const ScoreValue = styled.div`
  font-size: 3rem;
  font-weight: bold;
  margin-bottom: 10px;
  color: #00ff88;
`;

const ScoreLabel = styled.div`
  font-size: 1.2rem;
  opacity: 0.9;
  color: #8892b0;
`;

const MetricsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 20px;
  margin-bottom: 30px;
`;

const MetricCard = styled.div`
  background: #1a1d3a;
  border: 1px solid #333;
  padding: 20px;
  border-radius: 8px;
  text-align: center;
`;

const MetricValue = styled.div`
  font-size: 1.8rem;
  font-weight: bold;
  color: #0070f3;
  margin-bottom: 5px;
`;

const MetricLabel = styled.div`
  font-size: 0.9rem;
  color: #8892b0;
  text-transform: uppercase;
  letter-spacing: 1px;
`;

const ImagesGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 20px;
  margin-bottom: 30px;
`;

const ImageContainer = styled.div`
  text-align: center;
`;

const ImageTitle = styled.h3`
  margin-bottom: 15px;
  color: #00ff88;
  font-size: 1.2rem;
`;

const ComparisonImage = styled.img`
  width: 100%;
  max-width: 400px;
  border-radius: 8px;
  border: 1px solid #333;
`;

const SensitivitySlider = styled.div`
  margin-bottom: 30px;
`;

const SensitivityLabel = styled.label`
  display: block;
  margin-bottom: 10px;
  font-weight: 600;
  color: #e1e5f2;
`;

const Slider = styled.input`
  width: 100%;
  height: 8px;
  border-radius: 4px;
  background: #333;
  outline: none;
  opacity: 0.7;
  transition: opacity 0.2s;

  &:hover {
    opacity: 1;
  }

  &::-webkit-slider-thumb {
    appearance: none;
    width: 20px;
    height: 20px;
    border-radius: 50%;
    background: #0070f3;
    cursor: pointer;
  }

  &::-moz-range-thumb {
    width: 20px;
    height: 20px;
    border-radius: 50%;
    background: #0070f3;
    cursor: pointer;
  }
`;

const SliderValue = styled.span`
  float: right;
  color: #0070f3;
  font-weight: bold;
`;

const ErrorMessage = styled.div`
  background: #2d1618;
  color: #ff6b6b;
  padding: 15px;
  border-radius: 8px;
  margin-bottom: 20px;
  border: 1px solid #ff6b6b;
  text-align: center;
  font-weight: 500;
`;

// Before/After Slider Styles
const SliderContainer = styled.div`
  position: relative;
  width: 100%;
  max-width: 600px;
  margin: 0 auto;
  border-radius: 8px;
  overflow: hidden;
  border: 1px solid #333;
  background: #0f1419;
`;

const SliderWrapper = styled.div`
  position: relative;
  width: 100%;
  height: 400px;
  cursor: col-resize;
  user-select: none;
`;

const BeforeImage = styled.img`
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  object-fit: contain;
  background: #0f1419;
`;

const AfterImage = styled.img<{ $clipWidth: number }>`
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  object-fit: contain;
  clip-path: ${props => `inset(0 ${100 - props.$clipWidth}% 0 0)`};
  background: #0f1419;
`;

const SliderHandle = styled.div<{ $position: number }>`
  position: absolute;
  top: 0;
  left: ${props => props.$position}%;
  width: 4px;
  height: 100%;
  background: #00ff88;
  cursor: col-resize;
  z-index: 10;
  
  &::before {
    content: '';
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: 30px;
    height: 30px;
    background: #00ff88;
    border: 2px solid #0a0e27;
    border-radius: 50%;
    box-shadow: 0 2px 8px rgba(0, 255, 136, 0.3);
  }
  
  &::after {
    content: '⟷';
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    color: #0a0e27;
    font-size: 12px;
    font-weight: bold;
  }
`;

const SliderLabels = styled.div`
  display: flex;
  justify-content: space-between;
  margin-top: 10px;
  font-size: 0.9rem;
`;

const SliderLabel = styled.div<{ $isActive: boolean }>`
  color: ${props => props.$isActive ? '#00ff88' : '#8892b0'};
  font-weight: ${props => props.$isActive ? 'bold' : 'normal'};
  transition: color 0.3s ease;
`;

// Image Interpretation Styles
const ImageInterpretation = styled.div`
  margin-top: 10px;
  padding: 12px;
  background: rgba(0, 10, 39, 0.6);
  border: 1px solid #1a2332;
  border-radius: 6px;
  font-size: 0.85rem;
  line-height: 1.4;
  color: #8892b0;
`;

const InterpretationTitle = styled.div`
  color: #00ff88;
  font-weight: 600;
  margin-bottom: 4px;
  font-size: 0.9rem;
`;

const InterpretationText = styled.div`
  color: #a8b2d1;
`;

const InterpretationTip = styled.div`
  color: #64748b;
  font-style: italic;
  margin-top: 6px;
  font-size: 0.8rem;
`;

interface ImageComparisonProps {
  onComparisonComplete?: (comparison: ComparisonResponse) => void;
  onImagesSelected?: (image1: File, image2: File, image1Name?: string, image2Name?: string) => void;
}

// Before/After Slider Component
const BeforeAfterSlider: React.FC<{
  beforeImage: string;
  afterImage: string;
  beforeLabel: string;
  afterLabel: string;
}> = ({ beforeImage, afterImage, beforeLabel, afterLabel }) => {
  const [sliderPosition, setSliderPosition] = useState(50);
  const [isDragging, setIsDragging] = useState(false);
  const sliderRef = React.useRef<HTMLDivElement>(null);

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
    updateSliderPosition(e);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    e.preventDefault();
    setIsDragging(true);
    updateSliderPositionTouch(e);
  };

  const handleMouseMove = React.useCallback((e: MouseEvent) => {
    if (isDragging) {
      updateSliderPosition(e);
    }
  }, [isDragging]);

  const handleTouchMove = React.useCallback((e: TouchEvent) => {
    if (isDragging) {
      e.preventDefault();
      updateSliderPositionTouch(e);
    }
  }, [isDragging]);

  const handleMouseUp = React.useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleTouchEnd = React.useCallback(() => {
    setIsDragging(false);
  }, []);

  const updateSliderPosition = (e: MouseEvent | React.MouseEvent) => {
    if (sliderRef.current) {
      const rect = sliderRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const percentage = Math.max(0, Math.min(100, (x / rect.width) * 100));
      setSliderPosition(percentage);
    }
  };

  const updateSliderPositionTouch = (e: TouchEvent | React.TouchEvent) => {
    if (sliderRef.current && e.touches.length > 0) {
      const rect = sliderRef.current.getBoundingClientRect();
      const x = e.touches[0].clientX - rect.left;
      const percentage = Math.max(0, Math.min(100, (x / rect.width) * 100));
      setSliderPosition(percentage);
    }
  };

  React.useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.addEventListener('touchmove', handleTouchMove, { passive: false });
      document.addEventListener('touchend', handleTouchEnd);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
        document.removeEventListener('touchmove', handleTouchMove);
        document.removeEventListener('touchend', handleTouchEnd);
      };
    }
  }, [isDragging, handleMouseMove, handleMouseUp, handleTouchMove, handleTouchEnd]);

  return (
    <SliderContainer>
      <SliderWrapper
        ref={sliderRef}
        onMouseDown={handleMouseDown}
        onTouchStart={handleTouchStart}
      >
        <BeforeImage src={beforeImage} alt="Before" />
        <AfterImage src={afterImage} alt="After" $clipWidth={sliderPosition} />
        <SliderHandle $position={sliderPosition} />
      </SliderWrapper>
      <SliderLabels>
        <SliderLabel $isActive={sliderPosition < 50}>{beforeLabel}</SliderLabel>
        <SliderLabel $isActive={sliderPosition >= 50}>{afterLabel}</SliderLabel>
      </SliderLabels>
    </SliderContainer>
  );
};

const ImageComparison: React.FC<ImageComparisonProps> = ({ onComparisonComplete, onImagesSelected }) => {
  const [image1, setImage1] = useState<File | null>(null);
  const [image2, setImage2] = useState<File | null>(null);
  const [image1Preview, setImage1Preview] = useState<string | null>(null);
  const [image2Preview, setImage2Preview] = useState<string | null>(null);
  const [dragOver1, setDragOver1] = useState(false);
  const [dragOver2, setDragOver2] = useState(false);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<ComparisonResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sensitivity, setSensitivity] = useState(50);
  const [ignoreRegions1, setIgnoreRegions1] = useState<IgnoreRegion[]>([]);
  const [ignoreRegions2, setIgnoreRegions2] = useState<IgnoreRegion[]>([]);
  const [drawingMode, setDrawingMode] = useState(false);

  const handleImageUpload = useCallback((file: File, imageNumber: 1 | 2) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const preview = e.target?.result as string;
      if (imageNumber === 1) {
        setImage1(file);
        setImage1Preview(preview);
        // Check if both images are now selected
        if (image2 && onImagesSelected) {
          onImagesSelected(file, image2, file.name, image2.name);
        }
      } else {
        setImage2(file);
        setImage2Preview(preview);
        // Check if both images are now selected
        if (image1 && onImagesSelected) {
          onImagesSelected(image1, file, image1.name, file.name);
        }
      }
    };
    reader.readAsDataURL(file);
  }, [image1, image2, onImagesSelected]);

  const handleDrop = useCallback((e: React.DragEvent, imageNumber: 1 | 2) => {
    e.preventDefault();
    if (imageNumber === 1) setDragOver1(false);
    else setDragOver2(false);

    const files = Array.from(e.dataTransfer.files);
    const imageFile = files.find(file => file.type.startsWith('image/'));
    if (imageFile) {
      handleImageUpload(imageFile, imageNumber);
    }
  }, [handleImageUpload]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
  }, []);

  const handleDragEnter = useCallback((e: React.DragEvent, imageNumber: 1 | 2) => {
    e.preventDefault();
    if (imageNumber === 1) setDragOver1(true);
    else setDragOver2(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent, imageNumber: 1 | 2) => {
    e.preventDefault();
    if (imageNumber === 1) setDragOver1(false);
    else setDragOver2(false);
  }, []);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>, imageNumber: 1 | 2) => {
    const file = e.target.files?.[0];
    if (file) {
      handleImageUpload(file, imageNumber);
    }
  }, [handleImageUpload]);

  const handleCompare = async () => {
    if (!image1 || !image2) return;

    setLoading(true);
    setError(null);
    setResults(null);
    
    try {
      const response = await apiService.compareImages(
        image1,
        image2,
        'Before Image',
        'After Image',
        true,
        sensitivity,
        [...ignoreRegions1, ...ignoreRegions2]
      );
      
      // Log the response for debugging
      console.log('API Response:', response);
      
      // Validate the response has all required properties
      if (response && 
          typeof response.difference_score === 'number' &&
          response.metrics &&
          typeof response.metrics.ssim === 'number' &&
          typeof response.metrics.mse === 'number' &&
          typeof response.metrics.changed_pixels === 'number' &&
          typeof response.processing_time_ms === 'number') {
        setResults(response);
        // Notify parent component of the new comparison
        if (onComparisonComplete) {
          onComparisonComplete(response);
        }
      } else {
        console.error('Invalid response structure:', {
          response,
          difference_score: typeof response?.difference_score,
          metrics: response?.metrics,
          processing_time_ms: typeof response?.processing_time_ms
        });
        throw new Error(`Invalid response format from server. Got: ${JSON.stringify(response)}`);
      }
    } catch (error) {
      console.error('Error comparing images:', error);
      setError(error instanceof Error ? error.message : 'Failed to compare images. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const canCompare = image1 && image2 && !loading;

  return (
    <Container>
      <Title>🔍 Image Comparison Tool</Title>
      
      <UploadSection>
        <UploadGrid>
          <div>
            {image1Preview ? (
              <RegionDrawer
                imageUrl={image1Preview}
                onRegionsChange={setIgnoreRegions1}
                isDrawingMode={drawingMode}
                onToggleDrawingMode={() => setDrawingMode(!drawingMode)}
                disabled={loading}
              />
            ) : (
              <UploadBox
                $isDragOver={dragOver1}
                onDrop={(e) => handleDrop(e, 1)}
                onDragOver={handleDragOver}
                onDragEnter={(e) => handleDragEnter(e, 1)}
                onDragLeave={(e) => handleDragLeave(e, 1)}
              >
                <UploadLabel htmlFor="image1">
                  <UploadText>
                    📷 <strong>Before Image</strong><br />
                    Drag & drop or click to upload
                  </UploadText>
                </UploadLabel>
                <UploadInput
                  id="image1"
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleFileSelect(e, 1)}
                />
              </UploadBox>
            )}
          </div>

          <div>
            {image2Preview ? (
              <RegionDrawer
                imageUrl={image2Preview}
                onRegionsChange={setIgnoreRegions2}
                isDrawingMode={drawingMode}
                onToggleDrawingMode={() => setDrawingMode(!drawingMode)}
                disabled={loading}
              />
            ) : (
              <UploadBox
                $isDragOver={dragOver2}
                onDrop={(e) => handleDrop(e, 2)}
                onDragOver={handleDragOver}
                onDragEnter={(e) => handleDragEnter(e, 2)}
                onDragLeave={(e) => handleDragLeave(e, 2)}
              >
                <UploadLabel htmlFor="image2">
                  <UploadText>
                    📷 <strong>After Image</strong><br />
                    Drag & drop or click to upload
                  </UploadText>
                </UploadLabel>
                <UploadInput
                  id="image2"
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleFileSelect(e, 2)}
                />
              </UploadBox>
            )}
          </div>
        </UploadGrid>

        <SensitivitySlider>
          <SensitivityLabel>
            Sensitivity Threshold
            <SliderValue>{sensitivity}%</SliderValue>
          </SensitivityLabel>
          <Slider
            type="range"
            min="0"
            max="100"
            value={sensitivity}
            onChange={(e) => setSensitivity(Number(e.target.value))}
          />
        </SensitivitySlider>

        <CompareButton onClick={handleCompare} disabled={!canCompare}>
          {loading && <LoadingSpinner />}
          {loading ? 'Analyzing Images...' : 'Compare Images'}
        </CompareButton>
        
        {error && (
          <ErrorMessage>
            ⚠️ {error}
          </ErrorMessage>
        )}
      </UploadSection>

      {results && (
        <ResultsSection>
          <ScoreDisplay>
            <ScoreValue>{(results.difference_score ?? 0).toFixed(1)}%</ScoreValue>
            <ScoreLabel>Difference Score</ScoreLabel>
          </ScoreDisplay>

          <MetricsGrid>
            <MetricCard>
              <MetricValue>{(results.metrics?.ssim ?? 0).toFixed(3)}</MetricValue>
              <MetricLabel>SSIM Score</MetricLabel>
            </MetricCard>
            <MetricCard>
              <MetricValue>{(results.metrics?.mse ?? 0).toFixed(4)}</MetricValue>
              <MetricLabel>MSE</MetricLabel>
            </MetricCard>
            <MetricCard>
              <MetricValue>{(results.metrics?.changed_pixels ?? 0).toLocaleString()}</MetricValue>
              <MetricLabel>Changed Pixels</MetricLabel>
            </MetricCard>
            <MetricCard>
              <MetricValue>{(results.processing_time_ms ?? 0).toFixed(0)}ms</MetricValue>
              <MetricLabel>Processing Time</MetricLabel>
            </MetricCard>
          </MetricsGrid>

          {/* Interactive Before/After Slider */}
          {image1Preview && image2Preview && (
            <ImageContainer style={{ gridColumn: '1 / -1', marginBottom: '30px' }}>
              <ImageTitle>Interactive Before/After Comparison</ImageTitle>
              <BeforeAfterSlider
                beforeImage={image1Preview}
                afterImage={image2Preview}
                beforeLabel="Before Image"
                afterLabel="After Image"
              />
              <ImageInterpretation>
                <InterpretationTitle>How to use:</InterpretationTitle>
                <InterpretationText>
                  Drag the green slider handle left and right to reveal different portions of the before and after images. 
                  This interactive comparison helps you spot differences by quickly switching between the two states.
                </InterpretationText>
                <InterpretationTip>
                  🖱️ Click and drag the green handle | 📱 Touch-friendly on mobile devices
                </InterpretationTip>
              </ImageInterpretation>
            </ImageContainer>
          )}

          <ImagesGrid>
            <ImageContainer>
              <ImageTitle>Before Image</ImageTitle>
              {image1Preview && <ComparisonImage src={image1Preview} alt="Before" />}
            </ImageContainer>
            <ImageContainer>
              <ImageTitle>After Image</ImageTitle>
              {image2Preview && <ComparisonImage src={image2Preview} alt="After" />}
            </ImageContainer>
            {results.visualizations?.changed_objects && (
              <ImageContainer>
                <ImageTitle>🎯 Changed Objects Only</ImageTitle>
                <ComparisonImage src={`data:image/png;base64,${results.visualizations.changed_objects}`} alt="Changed Objects" />
                <ImageInterpretation>
                  <InterpretationTitle>What you're seeing:</InterpretationTitle>
                  <InterpretationText>
                    Only the objects/features that changed between the two images, isolated on a black background. 
                    This helps you quickly identify what was added, moved, or modified.
                  </InterpretationText>
                  <InterpretationTip>
                    💡 Tip: If nothing appears, try increasing the sensitivity slider to detect subtler changes.
                  </InterpretationTip>
                </ImageInterpretation>
              </ImageContainer>
            )}
            {results.visualizations?.heatmap && (
              <ImageContainer>
                <ImageTitle>Difference Heatmap</ImageTitle>
                <ComparisonImage src={`data:image/png;base64,${results.visualizations.heatmap}`} alt="Heatmap" />
                <ImageInterpretation>
                  <InterpretationTitle>What you're seeing:</InterpretationTitle>
                  <InterpretationText>
                    A thermal-style visualization where warmer colors (red/yellow) indicate areas with the most differences, 
                    and cooler colors (blue/black) show areas that remained unchanged.
                  </InterpretationText>
                  <InterpretationTip>
                    🔥 Red = Major differences | 🟡 Yellow = Moderate differences | 🔵 Blue = Minor/No differences
                  </InterpretationTip>
                </ImageInterpretation>
              </ImageContainer>
            )}
            {results.visualizations?.overlay && (
              <ImageContainer>
                <ImageTitle>Difference Overlay</ImageTitle>
                <ComparisonImage src={`data:image/png;base64,${results.visualizations.overlay}`} alt="Overlay" />
                <ImageInterpretation>
                  <InterpretationTitle>What you're seeing:</InterpretationTitle>
                  <InterpretationText>
                    The original "Before" image with changed areas highlighted in red. 
                    This provides context by showing differences overlaid on the original content.
                  </InterpretationText>
                  <InterpretationTip>
                    🔴 Red highlights = Areas that changed from the original image
                  </InterpretationTip>
                </ImageInterpretation>
              </ImageContainer>
            )}
            {results.visualizations?.raw_diff && (
              <ImageContainer>
                <ImageTitle>ImageChops Difference</ImageTitle>
                <ComparisonImage src={`data:image/png;base64,${results.visualizations.raw_diff}`} alt="Raw Difference" />
                <ImageInterpretation>
                  <InterpretationTitle>What you're seeing:</InterpretationTitle>
                  <InterpretationText>
                    Raw pixel-by-pixel differences computed using PIL's ImageChops.difference(). 
                    Pure mathematical difference where black = identical pixels, and brighter pixels = more difference.
                  </InterpretationText>
                  <InterpretationTip>
                    ⚫ Black = No difference | ⚪ White/Bright = Maximum difference | 🔗 Technical baseline for all other analyses
                  </InterpretationTip>
                </ImageInterpretation>
              </ImageContainer>
            )}
            {results.visualizations?.enhanced_diff && (
              <ImageContainer>
                <ImageTitle>Enhanced Difference</ImageTitle>
                <ComparisonImage src={`data:image/png;base64,${results.visualizations.enhanced_diff}`} alt="Enhanced Difference" />
                <ImageInterpretation>
                  <InterpretationTitle>What you're seeing:</InterpretationTitle>
                  <InterpretationText>
                    The raw difference enhanced with contrast adjustment, edge detection, and morphological operations. 
                    This makes subtle differences more visible and reduces noise for clearer analysis.
                  </InterpretationText>
                  <InterpretationTip>
                    ✨ Enhanced processing makes small changes more visible | 🔍 Better for detecting fine details
                  </InterpretationTip>
                </ImageInterpretation>
              </ImageContainer>
            )}
          </ImagesGrid>
        </ResultsSection>
      )}
    </Container>
  );
};

export default ImageComparison;
