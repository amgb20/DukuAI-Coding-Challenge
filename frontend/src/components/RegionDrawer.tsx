import React, { useState, useRef, useEffect, useCallback } from 'react';
import styled from 'styled-components';

// ==================== TYPES ====================
export interface IgnoreRegion {
  id: string;
  type: 'rectangle' | 'freeform';
  // For rectangles
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  // For freeform shapes
  path?: Array<{ x: number; y: number }>;
  // For both
  label?: string;
  boundingBox?: { x: number; y: number; width: number; height: number };
}

interface RegionDrawerProps {
  imageUrl: string;
  onRegionsChange: (regions: IgnoreRegion[]) => void;
  isDrawingMode: boolean;
  onToggleDrawingMode: () => void;
  disabled?: boolean;
}

interface DrawingState {
  isDrawing: boolean;
  startX: number;
  startY: number;
  currentX: number;
  currentY: number;
  currentPath: Array<{ x: number; y: number }>;
}

type DrawingTool = 'rectangle' | 'freeform';

// ==================== STYLED COMPONENTS ====================
const DrawerContainer = styled.div<{ $isDrawingMode: boolean }>`
  position: relative;
  width: 100%;
  background: #0f1419;
  border: 2px solid ${props => props.$isDrawingMode ? '#00ff88' : '#333'};
  border-radius: 8px;
  overflow: hidden;
  transition: border-color 0.3s ease;
  
  ${props => props.$isDrawingMode && `
    box-shadow: 0 0 20px rgba(0, 255, 136, 0.2);
  `}
`;

const ImageCanvas = styled.canvas`
  display: block;
  width: 100%;
  height: auto;
  max-height: 500px;
  cursor: ${props => props.style?.cursor || 'default'};
  background-color: #1a1d3a;
`;

const ControlPanel = styled.div<{ 
  $isMinimized: boolean; 
  $isDragging: boolean; 
  $position: { x: number; y: number } 
}>`
  position: absolute;
  top: ${props => props.$position.y}px;
  right: ${props => props.$position.x}px;
  background: rgba(0, 10, 39, 0.95);
  border: 1px solid #333;
  border-radius: 6px;
  padding: ${props => props.$isMinimized ? '8px' : '12px'};
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-width: ${props => props.$isMinimized ? '180px' : '240px'};
  max-width: 320px;
  backdrop-filter: blur(10px);
  transition: all 0.3s ease;
  cursor: ${props => props.$isDragging ? 'grabbing' : 'default'};
  z-index: 15;
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.4);
  
  &:hover {
    background: rgba(0, 10, 39, 0.98);
    border-color: #555;
    box-shadow: 0 8px 25px rgba(0, 0, 0, 0.5);
  }
`;

const PanelHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  cursor: grab;
  user-select: none;
  padding: 4px 0;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  margin-bottom: 8px;
  
  &:active {
    cursor: grabbing;
  }
`;

const DragHandle = styled.div`
  color: #888;
  font-size: 0.75rem;
  display: flex;
  align-items: center;
  gap: 6px;
  font-weight: 500;
  
  &::before {
    content: '⋮⋮';
    letter-spacing: -2px;
    font-size: 1rem;
    color: #666;
  }
  
  &:hover {
    color: #aaa;
    
    &::before {
      color: #888;
    }
  }
`;

const MinimizeButton = styled.button`
  background: rgba(45, 53, 97, 0.6);
  border: 1px solid #666;
  color: #ccc;
  font-size: 0.8rem;
  cursor: pointer;
  padding: 4px 8px;
  border-radius: 4px;
  transition: all 0.2s ease;
  font-weight: bold;
  
  &:hover {
    background: rgba(0, 112, 243, 0.8);
    border-color: #0070f3;
    color: white;
    transform: scale(1.05);
  }
`;

const CollapsibleContent = styled.div<{ $isMinimized: boolean }>`
  display: ${props => props.$isMinimized ? 'none' : 'flex'};
  flex-direction: column;
  gap: 10px;
  opacity: ${props => props.$isMinimized ? 0 : 1};
  transition: opacity 0.3s ease;
`;

const QuickModeIndicator = styled.div<{ 
  $isMinimized: boolean; 
  $drawingTool: DrawingTool;
  $isDrawing: boolean;
}>`
  display: ${props => props.$isMinimized ? 'flex' : 'none'};
  align-items: center;
  justify-content: center;
  gap: 8px;
  font-size: 0.8rem;
  color: ${props => props.$isDrawing ? '#00ff88' : '#0070f3'};
  text-align: center;
  font-weight: bold;
  padding: 6px 8px;
  background: rgba(0, 112, 243, 0.1);
  border-radius: 4px;
  border: 1px solid rgba(0, 112, 243, 0.3);
  
  ${props => props.$isDrawing && `
    background: rgba(0, 255, 136, 0.1);
    border-color: rgba(0, 255, 136, 0.3);
    animation: pulse 2s infinite;
  `}
  
  @keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.7; }
  }
`;

const ToggleButton = styled.button<{ $isActive: boolean }>`
  background: ${props => props.$isActive ? '#00ff88' : '#2d3561'};
  color: ${props => props.$isActive ? '#0a0e27' : '#e1e5f2'};
  border: 1px solid ${props => props.$isActive ? '#00ff88' : '#666'};
  border-radius: 4px;
  padding: 10px 14px;
  font-family: 'Courier New', monospace;
  font-size: 0.85rem;
  font-weight: bold;
  cursor: pointer;
  transition: all 0.3s ease;
  
  &:hover:not(:disabled) {
    background: ${props => props.$isActive ? '#00cc6a' : '#4a5568'};
    border-color: ${props => props.$isActive ? '#00cc6a' : '#999'};
    transform: translateY(-1px);
  }
  
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    transform: none;
  }
`;

const DrawingModeSelector = styled.div`
  display: flex;
  border: 1px solid #666;
  border-radius: 4px;
  overflow: hidden;
  background: rgba(45, 53, 97, 0.2);
`;

const ModeButton = styled.button<{ $isActive: boolean }>`
  flex: 1;
  background: ${props => props.$isActive ? '#0070f3' : 'transparent'};
  color: ${props => props.$isActive ? 'white' : '#a8b2d1'};
  border: none;
  padding: 8px 10px;
  font-family: 'Courier New', monospace;
  font-size: 0.75rem;
  font-weight: ${props => props.$isActive ? 'bold' : 'normal'};
  cursor: pointer;
  transition: all 0.3s ease;
  
  &:hover:not(:disabled) {
    background: ${props => props.$isActive ? '#0056b3' : 'rgba(74, 85, 104, 0.5)'};
    color: ${props => props.$isActive ? 'white' : '#e1e5f2'};
  }
  
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
  
  &:first-child {
    border-right: 1px solid #666;
  }
`;

const StatusText = styled.div<{ $isDrawing: boolean }>`
  font-size: 0.75rem;
  color: ${props => props.$isDrawing ? '#00ff88' : '#8892b0'};
  font-style: italic;
  padding: 6px 8px;
  background: rgba(0, 10, 39, 0.3);
  border-radius: 4px;
  border-left: 3px solid ${props => props.$isDrawing ? '#00ff88' : '#0070f3'};
  line-height: 1.3;
`;

const RegionsList = styled.div`
  max-height: 120px;
  overflow-y: auto;
  
  &::-webkit-scrollbar {
    width: 6px;
  }
  
  &::-webkit-scrollbar-track {
    background: rgba(26, 29, 58, 0.5);
    border-radius: 3px;
  }
  
  &::-webkit-scrollbar-thumb {
    background: #666;
    border-radius: 3px;
    
    &:hover {
      background: #888;
    }
  }
`;

const RegionItem = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 10px;
  background: rgba(45, 53, 97, 0.4);
  border: 1px solid #4a5568;
  border-radius: 4px;
  margin-bottom: 6px;
  font-size: 0.8rem;
  color: #a8b2d1;
  transition: all 0.2s ease;
  
  &:hover {
    background: rgba(45, 53, 97, 0.6);
    border-color: #666;
    transform: translateX(2px);
  }
`;

const RegionLabel = styled.span`
  flex: 1;
  font-weight: 600;
  color: #e1e5f2;
`;

const RegionCoords = styled.span`
  font-size: 0.7rem;
  color: #8892b0;
  margin-right: 8px;
  font-family: 'Courier New', monospace;
`;

const DeleteButton = styled.button`
  background: #ff6b6b;
  color: white;
  border: none;
  border-radius: 50%;
  width: 22px;
  height: 22px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  font-size: 12px;
  font-weight: bold;
  transition: all 0.2s ease;
  
  &:hover {
    background: #e55555;
    transform: scale(1.1);
  }
`;

const ClearAllButton = styled.button`
  background: linear-gradient(135deg, #ff9500, #ff7700);
  color: white;
  border: none;
  border-radius: 4px;
  padding: 8px 12px;
  font-family: 'Courier New', monospace;
  font-size: 0.8rem;
  font-weight: bold;
  cursor: pointer;
  transition: all 0.3s ease;
  
  &:hover:not(:disabled) {
    background: linear-gradient(135deg, #e6860d, #e66600);
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(255, 149, 0, 0.3);
  }
  
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    transform: none;
  }
`;

// ==================== MAIN COMPONENT ====================
const RegionDrawer: React.FC<RegionDrawerProps> = ({
  imageUrl,
  onRegionsChange,
  isDrawingMode,
  onToggleDrawingMode,
  disabled = false
}) => {
  // ==================== STATE ====================
  const [regions, setRegions] = useState<IgnoreRegion[]>([]);
  const [drawingTool, setDrawingTool] = useState<DrawingTool>('rectangle');
  const [drawingState, setDrawingState] = useState<DrawingState>({
    isDrawing: false,
    startX: 0,
    startY: 0,
    currentX: 0,
    currentY: 0,
    currentPath: []
  });
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageDimensions, setImageDimensions] = useState({ width: 0, height: 0 });
  const [loadedImage, setLoadedImage] = useState<HTMLImageElement | null>(null);
  
  // Panel state management
  const [isMinimized, setIsMinimized] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [panelPosition, setPanelPosition] = useState({ x: 15, y: 15 });
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  // Auto-minimize when drawing starts
  useEffect(() => {
    if (drawingState.isDrawing && !isMinimized) {
      setIsMinimized(true);
    }
  }, [drawingState.isDrawing, isMinimized]);

  // ==================== PANEL DRAG FUNCTIONALITY ====================
  const handlePanelMouseDown = useCallback((e: React.MouseEvent) => {
    // Only allow dragging from the header area
    if (e.target !== e.currentTarget && !(e.target as Element).closest('[data-drag-handle]')) return;
    
    setIsDragging(true);
    const rect = panelRef.current?.getBoundingClientRect();
    const containerRect = canvasRef.current?.getBoundingClientRect();
    
    if (rect && containerRect) {
      setDragOffset({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
      });
    }
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handlePanelMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging || !canvasRef.current) return;
    
    const containerRect = canvasRef.current.getBoundingClientRect();
    const panelWidth = isMinimized ? 180 : 240;
    const panelHeight = 200; // Approximate panel height
    
    if (containerRect) {
      // Calculate new position relative to canvas
      const newX = Math.max(5, Math.min(
        containerRect.width - panelWidth - 5,
        e.clientX - containerRect.left - dragOffset.x
      ));
      const newY = Math.max(5, Math.min(
        containerRect.height - panelHeight,
        e.clientY - containerRect.top - dragOffset.y
      ));
      
      // Convert to right-offset for CSS positioning
      setPanelPosition({ 
        x: containerRect.width - newX - panelWidth, 
        y: newY 
      });
    }
  }, [isDragging, dragOffset, isMinimized]);

  const handlePanelMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  // Add event listeners for dragging
  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handlePanelMouseMove);
      document.addEventListener('mouseup', handlePanelMouseUp);
      document.body.style.userSelect = 'none'; // Prevent text selection while dragging
      
      return () => {
        document.removeEventListener('mousemove', handlePanelMouseMove);
        document.removeEventListener('mouseup', handlePanelMouseUp);
        document.body.style.userSelect = '';
      };
    }
  }, [isDragging, handlePanelMouseMove, handlePanelMouseUp]);

  // ==================== UTILITY FUNCTIONS ====================
  const generateRegionId = () => `region_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  const getCanvasCoordinates = useCallback((event: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    return {
      x: (event.clientX - rect.left) * scaleX,
      y: (event.clientY - rect.top) * scaleY
    };
  }, []);

  const getTouchCoordinates = useCallback((event: React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas || !event.touches.length) return { x: 0, y: 0 };

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const touch = event.touches[0];

    return {
      x: (touch.clientX - rect.left) * scaleX,
      y: (touch.clientY - rect.top) * scaleY
    };
  }, []);

  // ==================== REGION MANAGEMENT ====================
  const addRectangleRegion = useCallback((x: number, y: number, width: number, height: number) => {
    // Ensure minimum size
    if (Math.abs(width) < 10 || Math.abs(height) < 10) return;

    // Normalize coordinates (handle negative width/height)
    const normalizedX = width < 0 ? x + width : x;
    const normalizedY = height < 0 ? y + height : y;
    const normalizedWidth = Math.abs(width);
    const normalizedHeight = Math.abs(height);

    const newRegion: IgnoreRegion = {
      id: generateRegionId(),
      type: 'rectangle',
      x: Math.max(0, Math.min(normalizedX, imageDimensions.width - 1)),
      y: Math.max(0, Math.min(normalizedY, imageDimensions.height - 1)),
      width: Math.min(normalizedWidth, imageDimensions.width - normalizedX),
      height: Math.min(normalizedHeight, imageDimensions.height - normalizedY),
      label: `Rectangle ${regions.filter(r => r.type === 'rectangle').length + 1}`
    };

    const updatedRegions = [...regions, newRegion];
    setRegions(updatedRegions);
    onRegionsChange(updatedRegions);
  }, [regions, imageDimensions, onRegionsChange]);

  const addFreeformRegion = useCallback((path: Array<{ x: number; y: number }>) => {
    // Ensure minimum path length
    if (path.length < 3) return;

    // Calculate bounding box
    const minX = Math.max(0, Math.min(...path.map(p => p.x)));
    const maxX = Math.min(imageDimensions.width, Math.max(...path.map(p => p.x)));
    const minY = Math.max(0, Math.min(...path.map(p => p.y)));
    const maxY = Math.min(imageDimensions.height, Math.max(...path.map(p => p.y)));

    const boundingBox = {
      x: minX,
      y: minY,
      width: maxX - minX,
      height: maxY - minY
    };

    // Ensure minimum bounding box size
    if (boundingBox.width < 10 || boundingBox.height < 10) return;

    const newRegion: IgnoreRegion = {
      id: generateRegionId(),
      type: 'freeform',
      path: path.map(p => ({
        x: Math.max(0, Math.min(p.x, imageDimensions.width)),
        y: Math.max(0, Math.min(p.y, imageDimensions.height))
      })),
      boundingBox,
      label: `Shape ${regions.filter(r => r.type === 'freeform').length + 1}`
    };

    const updatedRegions = [...regions, newRegion];
    setRegions(updatedRegions);
    onRegionsChange(updatedRegions);
  }, [regions, imageDimensions, onRegionsChange]);

  const deleteRegion = useCallback((regionId: string) => {
    const updatedRegions = regions.filter(region => region.id !== regionId);
    setRegions(updatedRegions);
    onRegionsChange(updatedRegions);
  }, [regions, onRegionsChange]);

  const clearAllRegions = useCallback(() => {
    setRegions([]);
    onRegionsChange([]);
  }, [onRegionsChange]);

  // ==================== DRAWING FUNCTIONS ====================
  const drawImage = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');

    if (!canvas || !loadedImage || !ctx || !imageLoaded) return;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw image
    ctx.drawImage(loadedImage, 0, 0, canvas.width, canvas.height);

    // Draw existing regions
    regions.forEach((region, index) => {
      if (region.type === 'rectangle' && region.x !== undefined && region.y !== undefined && 
          region.width !== undefined && region.height !== undefined) {
        // Draw rectangle
        ctx.fillStyle = 'rgba(255, 107, 107, 0.3)';
        ctx.fillRect(region.x, region.y, region.width, region.height);

        ctx.strokeStyle = '#ff6b6b';
        ctx.lineWidth = 2;
        ctx.strokeRect(region.x, region.y, region.width, region.height);

        // Label
        ctx.fillStyle = '#ff6b6b';
        ctx.font = 'bold 14px Courier New';
        ctx.fillText(
          region.label || `R${index + 1}`,
          region.x + 5,
          region.y + 20
        );
      } else if (region.type === 'freeform' && region.path && region.path.length > 0) {
        // Draw freeform shape
        ctx.beginPath();
        ctx.moveTo(region.path[0].x, region.path[0].y);
        
        for (let i = 1; i < region.path.length; i++) {
          ctx.lineTo(region.path[i].x, region.path[i].y);
        }
        ctx.closePath();

        // Fill
        ctx.fillStyle = 'rgba(255, 107, 107, 0.3)';
        ctx.fill();

        // Stroke
        ctx.strokeStyle = '#ff6b6b';
        ctx.lineWidth = 2;
        ctx.stroke();

        // Label at center of bounding box
        if (region.boundingBox) {
          ctx.fillStyle = '#ff6b6b';
          ctx.font = 'bold 14px Courier New';
          ctx.fillText(
            region.label || `S${index + 1}`,
            region.boundingBox.x + 5,
            region.boundingBox.y + 20
          );
        }
      }
    });

    // Draw current drawing preview
    if (drawingState.isDrawing && isDrawingMode) {
      ctx.strokeStyle = '#00ff88';
      ctx.lineWidth = 3;
      ctx.setLineDash([8, 4]);

      if (drawingTool === 'rectangle') {
        // Draw rectangle preview
        const width = drawingState.currentX - drawingState.startX;
        const height = drawingState.currentY - drawingState.startY;
        
        ctx.strokeRect(drawingState.startX, drawingState.startY, width, height);
        
        // Semi-transparent overlay
        ctx.fillStyle = 'rgba(0, 255, 136, 0.2)';
        ctx.fillRect(drawingState.startX, drawingState.startY, width, height);
      } else if (drawingTool === 'freeform' && drawingState.currentPath.length > 1) {
        // Draw freeform path preview
        ctx.beginPath();
        ctx.moveTo(drawingState.currentPath[0].x, drawingState.currentPath[0].y);
        
        for (let i = 1; i < drawingState.currentPath.length; i++) {
          ctx.lineTo(drawingState.currentPath[i].x, drawingState.currentPath[i].y);
        }
        
        // Connect to current position
        ctx.lineTo(drawingState.currentX, drawingState.currentY);
        ctx.stroke();
        
        // Draw path points
        ctx.fillStyle = '#00ff88';
        ctx.setLineDash([]);
        drawingState.currentPath.forEach(point => {
          ctx.beginPath();
          ctx.arc(point.x, point.y, 4, 0, 2 * Math.PI);
          ctx.fill();
        });
      }
      
      ctx.setLineDash([]);
    }
  }, [regions, drawingState, isDrawingMode, imageLoaded, loadedImage, drawingTool]);

  // ==================== EVENT HANDLERS ====================
  const handleMouseDown = useCallback((event: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawingMode || disabled) return;

    const coords = getCanvasCoordinates(event);
    
    if (drawingTool === 'rectangle') {
      setDrawingState({
        isDrawing: true,
        startX: coords.x,
        startY: coords.y,
        currentX: coords.x,
        currentY: coords.y,
        currentPath: []
      });
    } else if (drawingTool === 'freeform') {
      setDrawingState({
        isDrawing: true,
        startX: coords.x,
        startY: coords.y,
        currentX: coords.x,
        currentY: coords.y,
        currentPath: [coords]
      });
    }
  }, [isDrawingMode, disabled, drawingTool, getCanvasCoordinates]);

  const handleMouseMove = useCallback((event: React.MouseEvent<HTMLCanvasElement>) => {
    if (!drawingState.isDrawing || !isDrawingMode) return;

    const coords = getCanvasCoordinates(event);
    
    if (drawingTool === 'rectangle') {
      setDrawingState(prev => ({
        ...prev,
        currentX: coords.x,
        currentY: coords.y
      }));
    } else if (drawingTool === 'freeform') {
      // Add point to path if it's far enough from the last point (smoothing)
      const lastPoint = drawingState.currentPath[drawingState.currentPath.length - 1];
      const distance = Math.sqrt(
        Math.pow(coords.x - lastPoint.x, 2) + Math.pow(coords.y - lastPoint.y, 2)
      );
      
      if (distance > 3) { // Minimum distance threshold for smoother paths
        setDrawingState(prev => ({
          ...prev,
          currentX: coords.x,
          currentY: coords.y,
          currentPath: [...prev.currentPath, coords]
        }));
      } else {
        setDrawingState(prev => ({
          ...prev,
          currentX: coords.x,
          currentY: coords.y
        }));
      }
    }
  }, [drawingState.isDrawing, drawingState.currentPath, isDrawingMode, drawingTool, getCanvasCoordinates]);

  const handleMouseUp = useCallback(() => {
    if (!drawingState.isDrawing || !isDrawingMode) return;

    if (drawingTool === 'rectangle') {
      const width = drawingState.currentX - drawingState.startX;
      const height = drawingState.currentY - drawingState.startY;
      addRectangleRegion(drawingState.startX, drawingState.startY, width, height);
    } else if (drawingTool === 'freeform') {
      // Close the path and add the final point
      const finalPath = [...drawingState.currentPath, { x: drawingState.currentX, y: drawingState.currentY }];
      addFreeformRegion(finalPath);
    }

    setDrawingState({
      isDrawing: false,
      startX: 0,
      startY: 0,
      currentX: 0,
      currentY: 0,
      currentPath: []
    });

    // Restore panel after drawing completes (with a small delay)
    setTimeout(() => setIsMinimized(false), 500);
  }, [drawingState, isDrawingMode, drawingTool, addRectangleRegion, addFreeformRegion]);

  // Touch event handlers
  const handleTouchStart = useCallback((event: React.TouchEvent<HTMLCanvasElement>) => {
    event.preventDefault();
    if (!isDrawingMode || disabled) return;

    const coords = getTouchCoordinates(event);
    
    if (drawingTool === 'rectangle') {
      setDrawingState({
        isDrawing: true,
        startX: coords.x,
        startY: coords.y,
        currentX: coords.x,
        currentY: coords.y,
        currentPath: []
      });
    } else if (drawingTool === 'freeform') {
      setDrawingState({
        isDrawing: true,
        startX: coords.x,
        startY: coords.y,
        currentX: coords.x,
        currentY: coords.y,
        currentPath: [coords]
      });
    }
  }, [isDrawingMode, disabled, drawingTool, getTouchCoordinates]);

  const handleTouchMove = useCallback((event: React.TouchEvent<HTMLCanvasElement>) => {
    event.preventDefault();
    if (!drawingState.isDrawing || !isDrawingMode) return;

    const coords = getTouchCoordinates(event);
    
    if (drawingTool === 'rectangle') {
      setDrawingState(prev => ({
        ...prev,
        currentX: coords.x,
        currentY: coords.y
      }));
    } else if (drawingTool === 'freeform') {
      // Add point to path for touch (more sensitive than mouse)
      const lastPoint = drawingState.currentPath[drawingState.currentPath.length - 1];
      const distance = Math.sqrt(
        Math.pow(coords.x - lastPoint.x, 2) + Math.pow(coords.y - lastPoint.y, 2)
      );
      
      if (distance > 2) { // Smaller threshold for touch
        setDrawingState(prev => ({
          ...prev,
          currentX: coords.x,
          currentY: coords.y,
          currentPath: [...prev.currentPath, coords]
        }));
      } else {
        setDrawingState(prev => ({
          ...prev,
          currentX: coords.x,
          currentY: coords.y
        }));
      }
    }
  }, [drawingState.isDrawing, drawingState.currentPath, isDrawingMode, drawingTool, getTouchCoordinates]);

  const handleTouchEnd = useCallback((event: React.TouchEvent<HTMLCanvasElement>) => {
    event.preventDefault();
    handleMouseUp();
  }, [handleMouseUp]);

  // ==================== EFFECTS ====================
  useEffect(() => {
    const image = new Image();
    image.onload = () => {
      setImageLoaded(true);
      setImageDimensions({ width: image.width, height: image.height });
      setLoadedImage(image);

      const canvas = canvasRef.current;
      if (canvas) {
        canvas.width = image.width;
        canvas.height = image.height;
      }
    };
    image.src = imageUrl;
  }, [imageUrl]);

  useEffect(() => {
    drawImage();
  }, [drawImage]);

  // Cleanup drawing state when exiting drawing mode
  useEffect(() => {
    if (!isDrawingMode) {
      setDrawingState({
        isDrawing: false,
        startX: 0,
        startY: 0,
        currentX: 0,
        currentY: 0,
        currentPath: []
      });
      setIsMinimized(false); // Restore panel when exiting drawing mode
    }
  }, [isDrawingMode]);

  // ==================== RENDER ====================
  return (
    <DrawerContainer $isDrawingMode={isDrawingMode}>
      <ImageCanvas
        ref={canvasRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        style={{
          cursor: isDrawingMode && !disabled ? 'crosshair' : 'default'
        }}
      />

      <ControlPanel 
        ref={panelRef}
        $isMinimized={isMinimized} 
        $isDragging={isDragging}
        $position={panelPosition}
      >
        <PanelHeader onMouseDown={handlePanelMouseDown} data-drag-handle>
          <DragHandle data-drag-handle>Drag to move</DragHandle>
          <MinimizeButton 
            onClick={() => setIsMinimized(!isMinimized)}
            title={isMinimized ? "Expand panel" : "Minimize panel"}
          >
            {isMinimized ? '▲ Expand' : '▼ Minimize'}
          </MinimizeButton>
        </PanelHeader>

        <ToggleButton
          $isActive={isDrawingMode}
          onClick={onToggleDrawingMode}
          disabled={disabled}
        >
          {isDrawingMode ? '🎯 Exit Drawing' : '📐 Ignore Regions'}
        </ToggleButton>

        <QuickModeIndicator 
          $isMinimized={isMinimized} 
          $drawingTool={drawingTool}
          $isDrawing={drawingState.isDrawing}
        >
          {drawingState.isDrawing ? (
            <>
              <span>🎨</span>
              <span>Drawing {drawingTool === 'rectangle' ? 'Rectangle' : 'Shape'}...</span>
            </>
          ) : (
            <>
              <span>{drawingTool === 'rectangle' ? '🔳' : '✏️'}</span>
              <span>{drawingTool === 'rectangle' ? 'Rectangle Mode' : 'Freeform Mode'}</span>
            </>
          )}
        </QuickModeIndicator>

        <CollapsibleContent $isMinimized={isMinimized}>
          {isDrawingMode && (
            <>
              <DrawingModeSelector>
                <ModeButton
                  $isActive={drawingTool === 'rectangle'}
                  onClick={() => setDrawingTool('rectangle')}
                  disabled={disabled || drawingState.isDrawing}
                >
                  🔳 Rectangle
                </ModeButton>
                <ModeButton
                  $isActive={drawingTool === 'freeform'}
                  onClick={() => setDrawingTool('freeform')}
                  disabled={disabled || drawingState.isDrawing}
                >
                  ✏️ Freeform
                </ModeButton>
              </DrawingModeSelector>

              <StatusText $isDrawing={drawingState.isDrawing}>
                {drawingState.isDrawing 
                  ? (drawingTool === 'rectangle' ? 'Drawing rectangle... Release to create' : 'Drawing shape... Release to finish') 
                  : (drawingTool === 'rectangle' ? 'Click and drag to draw rectangles' : 'Click and drag to draw freeform shapes')}
              </StatusText>
            </>
          )}

          {regions.length > 0 && (
            <>
              <div style={{ 
                fontSize: '0.85rem', 
                color: '#e1e5f2', 
                fontWeight: 'bold',
                marginTop: '8px',
                padding: '4px 0',
                borderBottom: '1px solid rgba(255, 255, 255, 0.1)'
              }}>
                Ignore Regions ({regions.length})
              </div>

              <RegionsList>
                {regions.map((region, index) => (
                  <RegionItem key={region.id}>
                    <RegionLabel>{region.label}</RegionLabel>
                    <RegionCoords>
                      {region.type === 'rectangle' && region.x !== undefined && region.y !== undefined && 
                       region.width !== undefined && region.height !== undefined
                        ? `${Math.round(region.x)},${Math.round(region.y)} ${Math.round(region.width)}×${Math.round(region.height)}`
                        : region.boundingBox 
                          ? `${Math.round(region.boundingBox.x)},${Math.round(region.boundingBox.y)} ${Math.round(region.boundingBox.width)}×${Math.round(region.boundingBox.height)}`
                          : 'Shape'
                      }
                    </RegionCoords>
                    <DeleteButton
                      onClick={() => deleteRegion(region.id)}
                      title={`Delete ${region.label}`}
                    >
                      ×
                    </DeleteButton>
                  </RegionItem>
                ))}
              </RegionsList>

              <ClearAllButton
                onClick={clearAllRegions}
                disabled={disabled}
              >
                🗑️ Clear All ({regions.length})
              </ClearAllButton>
            </>
          )}
        </CollapsibleContent>
      </ControlPanel>
    </DrawerContainer>
  );
};

export default RegionDrawer;
