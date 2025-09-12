import { useRef, useEffect, useState, useCallback } from "react";
import { ZoomIn, ZoomOut, RotateCcw, Move, Square, Grid3X3, MousePointer2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface FloorPlan {
  id: string;
  buildingName: string;
  floorName: string;
  imagePath: string;
  scale?: number;
}

interface RoomPolygon {
  id: string;
  roomId: string;
  points: { x: number; y: number }[];
  color: string;
  roomData?: any;
}

interface PanoMarker {
  id: string;
  panoId: string;
  x: number;
  y: number;
  roomId?: string;
  panoData?: any;
}

interface FloorPlanCanvasProps {
  floorPlan: FloorPlan;
  activeTool: "select" | "draw" | "dropPano";
  roomPolygons: RoomPolygon[];
  panoMarkers: PanoMarker[];
  onAddPolygon: (points: { x: number; y: number }[]) => void;
  onAddPanoMarker: (x: number, y: number) => void;
  onRoomClick: (roomId: string) => void;
  onPanoClick: (panoId: string) => void;
  onUpdatePolygon: (polygonId: string, points: { x: number; y: number }[]) => void;
  snapToGrid: boolean;
  gridSize: number;
  interactionFilter: "rooms" | "panos" | "both";
  selectedRoomId: string;
  selectedPanoId: string;
  hoveredItemId: string;
  onHoverItem: (itemId: string) => void;
}

export const FloorPlanCanvas = ({
  floorPlan,
  activeTool,
  roomPolygons,
  panoMarkers,
  onAddPolygon,
  onAddPanoMarker,
  onRoomClick,
  onPanoClick,
  onUpdatePolygon,
  snapToGrid,
  gridSize,
  interactionFilter,
  selectedRoomId,
  selectedPanoId,
  hoveredItemId,
  onHoverItem
}: FloorPlanCanvasProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [ctx, setCtx] = useState<CanvasRenderingContext2D | null>(null);
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [currentPolygon, setCurrentPolygon] = useState<{ x: number; y: number }[]>([]);
  const [mousePos, setMousePos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isEditingPolygon, setIsEditingPolygon] = useState<string | null>(null);
  const [dragVertex, setDragVertex] = useState<{ polygonId: string; vertexIndex: number } | null>(null);
  const [imageNaturalSize, setImageNaturalSize] = useState<{ width: number; height: number }>({ width: 0, height: 0 });
  const [loadError, setLoadError] = useState(false);

  // Initialize canvas and load image
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const context = canvas.getContext("2d");
    if (!context) return;

    setCtx(context);
    // Ensure initial canvas size matches container
    const initContainer = containerRef.current;
    if (initContainer) {
      canvas.width = initContainer.clientWidth;
      canvas.height = initContainer.clientHeight;
    }

    // Load floor plan image
    const img = new Image();
    setLoadError(false);
    const fallbackTimer = window.setTimeout(() => setLoadError(true), 7000);
    img.onload = () => {
      window.clearTimeout(fallbackTimer);
      console.log("Image loaded successfully:", img.width, "x", img.height);
      setImage(img);
      setImageNaturalSize({ width: img.naturalWidth, height: img.naturalHeight });
      
      // Fit image to canvas
      const container = containerRef.current;
      if (container) {
        canvas.width = container.clientWidth;
        canvas.height = container.clientHeight;
        fitToScreen(img, canvas);
      }
    };
    
    img.onerror = (error) => {
      window.clearTimeout(fallbackTimer);
      setLoadError(true);
      console.error("Failed to load image:", error, floorPlan.imagePath);
    };
    
    img.crossOrigin = "anonymous"; // Handle CORS if needed
    img.src = floorPlan.imagePath || "/placeholder.svg"; // Use uploaded floor plan or fallback
    
    console.log("Loading image from:", floorPlan.imagePath);
  }, [floorPlan.imagePath]);

  // Render canvas content
  const render = useCallback(() => {
    if (!ctx) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Save context
    ctx.save();

    // Apply pan and zoom
    ctx.translate(pan.x, pan.y);
    ctx.scale(zoom, zoom);

    // Draw floor plan image or fallback background
    if (image) {
      ctx.drawImage(image, 0, 0);
    } else {
      // Subtle background when no image loaded
      const w = canvas.width / zoom;
      const h = canvas.height / zoom;
      const grad = ctx.createLinearGradient(0, 0, 0, h);
      grad.addColorStop(0, "#f8fafc");
      grad.addColorStop(1, "#eef2f7");
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);
    }

    // Draw room polygons (only if visible based on filter)
    if (interactionFilter === 'rooms' || interactionFilter === 'both') {
      roomPolygons.forEach(polygon => {
        if (polygon.points.length > 2) {
          const isSelected = selectedRoomId === polygon.roomId;
          const isHovered = hoveredItemId === polygon.id;
          
          ctx.beginPath();
          ctx.moveTo(polygon.points[0].x, polygon.points[0].y);
          polygon.points.slice(1).forEach(point => {
            ctx.lineTo(point.x, point.y);
          });
          ctx.closePath();
          
          // Brand-friendly polygon styling
          if (isSelected) {
            // Selected: clear fill, solid stroke with glow
            ctx.fillStyle = "#2563eb"; // Blue-600 with transparency
            ctx.globalAlpha = 0.28;
            ctx.fill();
            ctx.globalAlpha = 1;
            
            // Glow effect
            ctx.shadowColor = "#2563eb";
            ctx.shadowBlur = 8 / zoom;
            ctx.strokeStyle = "#1d4ed8"; // Blue-700
            ctx.lineWidth = 3 / zoom;
            ctx.stroke();
            ctx.shadowBlur = 0;
            
            // Selection label chip at centroid
            const centerX = polygon.points.reduce((sum, p) => sum + p.x, 0) / polygon.points.length;
            const centerY = polygon.points.reduce((sum, p) => sum + p.y, 0) / polygon.points.length;
            
            // Count panos in this room
            const panoCount = panoMarkers.filter(m => m.roomId === polygon.roomId).length;
            
            ctx.fillStyle = "#1d4ed8";
            ctx.font = `${10 / zoom}px system-ui`;
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            
            const labelText = `Room: ${polygon.roomId}${panoCount > 0 ? ` · ${panoCount} panos` : ''}`;
            const textWidth = ctx.measureText(labelText).width;
            const chipWidth = Math.max(textWidth + 16 / zoom, 60 / zoom);
            
            // Rounded chip background
            const chipX = centerX - chipWidth / 2;
            const chipY = centerY - 8 / zoom;
            ctx.beginPath();
            ctx.roundRect(chipX, chipY, chipWidth, 16 / zoom, 8 / zoom);
            ctx.fill();
            
            ctx.fillStyle = "#ffffff";
            ctx.fillText(labelText, centerX, centerY);
          } else if (isHovered) {
            // Hovered: slightly more fill, dashed stroke
            ctx.fillStyle = "#93c5fd"; // Blue-300
            ctx.globalAlpha = 0.22;
            ctx.fill();
            ctx.globalAlpha = 1;
            
            ctx.shadowColor = "#2563eb";
            ctx.shadowBlur = 6 / zoom;
            ctx.strokeStyle = "#2563eb";
            ctx.lineWidth = 3 / zoom;
            ctx.setLineDash([4 / zoom, 2 / zoom]);
            ctx.stroke();
            ctx.setLineDash([]);
            ctx.shadowBlur = 0;
          } else {
            // Default: faint brand-friendly fill
            ctx.fillStyle = "#93c5fd"; // Blue-300
            ctx.globalAlpha = 0.15;
            ctx.fill();
            ctx.globalAlpha = 1;
            
            ctx.strokeStyle = "#2563eb"; // Blue-600
            ctx.globalAlpha = 0.8;
            ctx.lineWidth = 2 / zoom;
            ctx.stroke();
            ctx.globalAlpha = 1;
          }
        }
      });
    }

    // Draw grid if enabled
    if (snapToGrid && gridSize > 0) {
      ctx.strokeStyle = "#e5e5e5";
      ctx.lineWidth = 1 / zoom;
      ctx.globalAlpha = 0.3;
      
      const canvas = canvasRef.current;
      const baseW = image ? image.width : (canvas ? canvas.width / zoom : 0);
      const baseH = image ? image.height : (canvas ? canvas.height / zoom : 0);
      
      for (let x = 0; x <= baseW; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, baseH);
        ctx.stroke();
      }
      
      for (let y = 0; y <= baseH; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(baseW, y);
        ctx.stroke();
      }
      
      ctx.globalAlpha = 1;
    }

    // Draw current polygon being drawn
    if (currentPolygon.length > 0) {
      ctx.beginPath();
      ctx.moveTo(currentPolygon[0].x, currentPolygon[0].y);
      currentPolygon.slice(1).forEach(point => {
        ctx.lineTo(point.x, point.y);
      });
      
      // Draw rubber band line to mouse
      if (activeTool === "draw" && currentPolygon.length > 0) {
        const snappedMouse = snapPoint(mousePos);
        ctx.lineTo(snappedMouse.x, snappedMouse.y);
      }
      
      ctx.strokeStyle = "#007acc";
      ctx.lineWidth = 2 / zoom;
      ctx.stroke();
      
      // Draw vertices
      currentPolygon.forEach((point, index) => {
        ctx.beginPath();
        ctx.arc(point.x, point.y, 6 / zoom, 0, Math.PI * 2);
        ctx.fillStyle = "#007acc";
        ctx.fill();
        ctx.strokeStyle = "#ffffff";
        ctx.lineWidth = 2 / zoom;
        ctx.stroke();
      });
    }

    // Draw editing handles for selected polygon
    if (isEditingPolygon) {
      const editPolygon = roomPolygons.find(p => p.id === isEditingPolygon);
      if (editPolygon) {
        editPolygon.points.forEach((point, index) => {
          ctx.beginPath();
          ctx.arc(point.x, point.y, 8 / zoom, 0, Math.PI * 2);
          ctx.fillStyle = "#ff6b35";
          ctx.fill();
          ctx.strokeStyle = "#ffffff";
          ctx.lineWidth = 2 / zoom;
          ctx.stroke();
        });
      }
    }

    // Draw panorama markers (only if visible based on filter)
    if (interactionFilter === 'panos' || interactionFilter === 'both') {
      panoMarkers.forEach(marker => {
        const isSelected = selectedPanoId === marker.panoId;
        const isHovered = hoveredItemId === marker.id;
        
        // Enhanced marker styling with distinct secondary color
        if (isSelected) {
          // Selected: larger size, ring, chip
          ctx.beginPath();
          ctx.arc(marker.x, marker.y, 12 / zoom, 0, Math.PI * 2);
          ctx.fillStyle = "#f59e0b"; // Amber-500 for distinction
          ctx.fill();
          
          // Selection ring
          ctx.beginPath();
          ctx.arc(marker.x, marker.y, 16 / zoom, 0, Math.PI * 2);
          ctx.strokeStyle = "#92400e"; // Amber-800
          ctx.lineWidth = 3 / zoom;
          ctx.stroke();
          
          // Selection chip above marker
          ctx.fillStyle = "#f59e0b";
          ctx.font = `${9 / zoom}px system-ui`;
          ctx.textAlign = "center";
          ctx.textBaseline = "bottom";
          const chipY = marker.y - 25 / zoom;
          
          // Get timestamp or short ID
          const labelText = `Pano: ${marker.panoData?.title || marker.panoId.slice(-6)}`;
          const textWidth = ctx.measureText(labelText).width;
          const chipWidth = Math.max(textWidth + 12 / zoom, 50 / zoom);
          
          // Rounded chip background
          ctx.beginPath();
          ctx.roundRect(marker.x - chipWidth / 2, chipY - 12 / zoom, chipWidth, 14 / zoom, 6 / zoom);
          ctx.fill();
          
          ctx.fillStyle = "#ffffff";
          ctx.fillText(labelText, marker.x, chipY);
        } else if (isHovered) {
          // Hovered: slightly larger, glow
          ctx.shadowColor = "#f59e0b";
          ctx.shadowBlur = 6 / zoom;
          ctx.beginPath();
          ctx.arc(marker.x, marker.y, 10 / zoom, 0, Math.PI * 2);
          ctx.fillStyle = "#f59e0b";
          ctx.fill();
          ctx.shadowBlur = 0;
          
          ctx.strokeStyle = "#92400e";
          ctx.lineWidth = 2 / zoom;
          ctx.stroke();
        } else {
          // Default: standard marker
          ctx.beginPath();
          ctx.arc(marker.x, marker.y, 8 / zoom, 0, Math.PI * 2);
          ctx.fillStyle = "#f59e0b"; // Amber-500
          ctx.fill();
          
          ctx.strokeStyle = "#92400e"; // Amber-800
          ctx.lineWidth = 2 / zoom;
          ctx.stroke();
        }
        
        // Inner dot
        ctx.beginPath();
        ctx.arc(marker.x, marker.y, 3 / zoom, 0, Math.PI * 2);
        ctx.fillStyle = "#92400e";
        ctx.fill();
      });
    }

    // Restore context
    ctx.restore();
  }, [ctx, image, pan, zoom, roomPolygons, panoMarkers, currentPolygon, selectedRoomId, selectedPanoId, hoveredItemId, snapToGrid, gridSize]);

  // Render when dependencies change
  useEffect(() => {
    render();
  }, [render]);

  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      const canvas = canvasRef.current;
      const container = containerRef.current;
      if (!canvas || !container) return;

      canvas.width = container.clientWidth;
      canvas.height = container.clientHeight;
      render();
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [render]);

  // Fit image to screen
  const fitToScreen = useCallback((img?: HTMLImageElement, canvas?: HTMLCanvasElement) => {
    const imageToUse = img || image;
    const canvasToUse = canvas || canvasRef.current;
    if (!imageToUse || !canvasToUse) return;

    const scaleX = canvasToUse.width / imageToUse.width;
    const scaleY = canvasToUse.height / imageToUse.height;
    const newZoom = Math.min(scaleX, scaleY);
    
    setZoom(newZoom);
    setPan({
      x: (canvasToUse.width - imageToUse.width * newZoom) / 2,
      y: (canvasToUse.height - imageToUse.height * newZoom) / 2
    });
  }, [image]);

  // Convert screen coordinates to canvas coordinates with high precision
  const screenToCanvas = useCallback((screenX: number, screenY: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };

    const rect = canvas.getBoundingClientRect();
    // Account for device pixel ratio and precise positioning
    const dpr = window.devicePixelRatio || 1;
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    
    const canvasX = (screenX - rect.left) * scaleX;
    const canvasY = (screenY - rect.top) * scaleY;
    
    const x = (canvasX - pan.x) / zoom;
    const y = (canvasY - pan.y) / zoom;
    
    return { x, y };
  }, [pan, zoom]);

  // Snap point to grid if enabled
  const snapPoint = useCallback((point: { x: number; y: number }) => {
    // Vertex snapping to existing polygon vertices (6–8 px tolerance)
    const tolerance = 8 / zoom;
    let snapped = point;

    for (const poly of roomPolygons) {
      for (const v of poly.points) {
        const dx = point.x - v.x;
        const dy = point.y - v.y;
        if (Math.hypot(dx, dy) <= tolerance) {
          snapped = { x: v.x, y: v.y };
          break;
        }
      }
    }

    if (!snapToGrid) return snapped;

    return {
      x: Math.round(snapped.x / gridSize) * gridSize,
      y: Math.round(snapped.y / gridSize) * gridSize
    };
  }, [snapToGrid, gridSize, zoom, roomPolygons]);

  // Get zoom limits
  const getZoomLimits = useCallback(() => {
    if (!image) return { min: 0.1, max: 8 };
    
    const canvas = canvasRef.current;
    if (!canvas) return { min: 0.1, max: 8 };
    
    const scaleX = canvas.width / image.width;
    const scaleY = canvas.height / image.height;
    const fitZoom = Math.min(scaleX, scaleY);
    
    return {
      min: fitZoom,
      max: 8
    };
  }, [image]);

  // Handle mouse events
  const handleMouseDown = useCallback((event: React.MouseEvent) => {
    const rawPos = screenToCanvas(event.clientX, event.clientY);
    const { x, y } = snapPoint(rawPos);

    if (activeTool === "dropPano") {
      // In drop pano mode, only place pano markers, ignore polygon interactions
      event.stopPropagation();
      onAddPanoMarker(x, y);
      return;
    }

    if (activeTool === "select") {
      // Check for vertex dragging first
      if (isEditingPolygon) {
        const editPolygon = roomPolygons.find(p => p.id === isEditingPolygon);
        if (editPolygon) {
          for (let i = 0; i < editPolygon.points.length; i++) {
            const vertex = editPolygon.points[i];
            const distance = Math.sqrt((rawPos.x - vertex.x) ** 2 + (rawPos.y - vertex.y) ** 2);
            if (distance <= 8) {
              setDragVertex({ polygonId: isEditingPolygon, vertexIndex: i });
              return;
            }
          }
        }
      }
      
      // Apply interaction filtering
      const canClickPanos = interactionFilter === "panos" || interactionFilter === "both";
      const canClickRooms = interactionFilter === "rooms" || interactionFilter === "both";
      
      // Check if clicking on a panorama marker (higher priority than polygons)
      if (canClickPanos) {
        for (const marker of panoMarkers) {
          const distance = Math.sqrt((rawPos.x - marker.x) ** 2 + (rawPos.y - marker.y) ** 2);
          if (distance <= (selectedPanoId === marker.panoId ? 16 : 12)) {
            onPanoClick(marker.panoId);
            return;
          }
        }
      }
      
      // Check if clicking on a room polygon
      if (canClickRooms) {
        for (const polygon of roomPolygons) {
          if (isPointInPolygon(rawPos, polygon.points)) {
            if (isEditingPolygon === polygon.id) {
              setIsEditingPolygon(null); // Exit edit mode
            } else {
              setIsEditingPolygon(polygon.id); // Enter edit mode
              onRoomClick(polygon.roomId);
            }
            return;
          }
        }
      }
      
      // Exit edit mode if clicking empty space
      setIsEditingPolygon(null);
      
      // Start panning
      setIsPanning(true);
      setPanStart({ x: event.clientX - pan.x, y: event.clientY - pan.y });
    } else if (activeTool === "draw") {
      setCurrentPolygon(prev => [...prev, { x, y }]);
    }
  }, [activeTool, screenToCanvas, snapPoint, pan, roomPolygons, panoMarkers, isEditingPolygon, onRoomClick, onPanoClick, onAddPanoMarker, interactionFilter, selectedPanoId]);
  
  // Point in polygon test
  const isPointInPolygon = (point: { x: number; y: number }, polygon: { x: number; y: number }[]) => {
    let inside = false;
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
      if (((polygon[i].y > point.y) !== (polygon[j].y > point.y)) &&
          (point.x < (polygon[j].x - polygon[i].x) * (point.y - polygon[i].y) / (polygon[j].y - polygon[i].y) + polygon[i].x)) {
        inside = !inside;
      }
    }
    return inside;
  };

  const handleMouseMove = useCallback((event: React.MouseEvent) => {
    // Update mouse position for rubber band drawing
    const mouseCanvasPos = screenToCanvas(event.clientX, event.clientY);
    setMousePos(mouseCanvasPos);
    
    // Handle hover detection
    let hoveredId = "";
    
    // Check pano markers first (higher z-index)
    for (const marker of panoMarkers) {
      const distance = Math.sqrt((mouseCanvasPos.x - marker.x) ** 2 + (mouseCanvasPos.y - marker.y) ** 2);
      if (distance <= 12) {
        hoveredId = marker.id;
        break;
      }
    }
    
    // Check room polygons if no marker hovered
    if (!hoveredId) {
      for (const polygon of roomPolygons) {
        if (isPointInPolygon(mouseCanvasPos, polygon.points)) {
          hoveredId = polygon.id;
          break;
        }
      }
    }
    
    onHoverItem(hoveredId);
    
    if (isPanning) {
      const newPan = {
        x: event.clientX - panStart.x,
        y: event.clientY - panStart.y
      };
      
      // Clamp panning to keep image visible
      if (image) {
        const canvas = canvasRef.current;
        if (canvas) {
          const imageW = image.width * zoom;
          const imageH = image.height * zoom;
          
          if (imageW <= canvas.width) {
            newPan.x = (canvas.width - imageW) / 2;
          } else {
            newPan.x = Math.min(0, Math.max(canvas.width - imageW, newPan.x));
          }
          
          if (imageH <= canvas.height) {
            newPan.y = (canvas.height - imageH) / 2;
          } else {
            newPan.y = Math.min(0, Math.max(canvas.height - imageH, newPan.y));
          }
        }
      }
      
      setPan(newPan);
    } else if (dragVertex) {
      // Handle vertex dragging
      const snapped = snapPoint(mouseCanvasPos);
      onUpdatePolygon(dragVertex.polygonId, 
        roomPolygons.find(p => p.id === dragVertex.polygonId)?.points.map((point, index) => 
          index === dragVertex.vertexIndex ? snapped : point
        ) || []
      );
    }
  }, [isPanning, panStart, screenToCanvas, snapPoint, zoom, image, dragVertex]);

  const handleMouseUp = useCallback((event: React.MouseEvent) => {
    if (isPanning) {
      setIsPanning(false);
    } else if (dragVertex) {
      setDragVertex(null);
    }
  }, [isPanning, dragVertex]);

  const handleDoubleClick = useCallback(() => {
    if (activeTool === "draw" && currentPolygon.length >= 3) {
      onAddPolygon([...currentPolygon]);
      setCurrentPolygon([]);
    }
  }, [activeTool, currentPolygon, onAddPolygon]);

  // Handle keyboard shortcuts
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (activeTool === "draw") {
      if (event.key === "Escape") {
        setCurrentPolygon([]);
      } else if (event.key === "Backspace" && currentPolygon.length > 0) {
        setCurrentPolygon(prev => prev.slice(0, -1));
        event.preventDefault();
      }
    }
  }, [activeTool, currentPolygon]);

  // Keyboard event listener
  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  // Handle wheel zoom (zoom to cursor)
  const handleWheel = useCallback((event: WheelEvent) => {
    event.preventDefault();
    
    const canvas = canvasRef.current;
    if (!canvas || !image) return;
    
    const rect = canvas.getBoundingClientRect();
    const mouseX = event.clientX - rect.left;
    const mouseY = event.clientY - rect.top;
    
    const { min, max } = getZoomLimits();
    const zoomFactor = event.deltaY > 0 ? 0.9 : 1.1;
    const newZoom = Math.max(min, Math.min(max, zoom * zoomFactor));
    
    if (newZoom !== zoom) {
      // Zoom towards cursor
      const zoomChange = newZoom / zoom;
      const newPan = {
        x: mouseX - (mouseX - pan.x) * zoomChange,
        y: mouseY - (mouseY - pan.y) * zoomChange
      };
      
      // Clamp pan so image stays in view
      const canvasEl = canvasRef.current;
      if (canvasEl) {
        const imageW = image.width * newZoom;
        const imageH = image.height * newZoom;
        if (imageW <= canvasEl.width) {
          newPan.x = (canvasEl.width - imageW) / 2;
        } else {
          newPan.x = Math.min(0, Math.max(canvasEl.width - imageW, newPan.x));
        }
        if (imageH <= canvasEl.height) {
          newPan.y = (canvasEl.height - imageH) / 2;
        } else {
          newPan.y = Math.min(0, Math.max(canvasEl.height - imageH, newPan.y));
        }
      }
      
      setZoom(newZoom);
      setPan(newPan);
    }
  }, [zoom, pan, image, getZoomLimits]);

  const handleZoom = useCallback((delta: number) => {
    const { min, max } = getZoomLimits();
    const newZoom = Math.max(min, Math.min(max, zoom + delta));
    setZoom(newZoom);
  }, [zoom, getZoomLimits]);

  const handleReset = useCallback(() => {
    if (!image) return;
    fitToScreen();
  }, [fitToScreen]);

  const handleZoom100 = useCallback(() => {
    if (!image) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    setZoom(1);
    setPan({
      x: (canvas.width - image.width) / 2,
      y: (canvas.height - image.height) / 2
    });
  }, [image]);

  // Mouse wheel listener
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    canvas.addEventListener('wheel', handleWheel, { passive: false });
    return () => canvas.removeEventListener('wheel', handleWheel);
  }, [handleWheel]);


  return (
    <div className="relative w-full h-full" ref={containerRef}>
      {/* Loading indicator */}
      {floorPlan.imagePath && !image && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/80">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
            <p className="text-sm text-muted-foreground">Loading floor plan...</p>
          </div>
        </div>
      )}
      
      {/* Toolbar - Moved to FloorPlanInterface */}
      {(!floorPlan.imagePath || loadError) && (
        <div className="absolute top-4 left-4 bg-amber-50 text-amber-900 border border-amber-200 rounded px-3 py-1 shadow z-10">
          <span className="text-xs font-medium">Draft mode — no floor plan. You can still draw rooms.</span>
        </div>
      )}


      {/* Canvas Controls */}
      <div className="absolute top-4 right-4 space-y-2 z-10">
        <div className="bg-background/95 backdrop-blur-sm rounded-lg p-2 border shadow-lg space-y-1">
          <Button size="sm" variant="outline" onClick={() => handleZoom(0.2)} disabled={!image}>
            <ZoomIn className="h-4 w-4" />
          </Button>
          <Button size="sm" variant="outline" onClick={() => handleZoom(-0.2)} disabled={!image}>
            <ZoomOut className="h-4 w-4" />
          </Button>
          <Button size="sm" variant="outline" onClick={handleReset} disabled={!image} title="Fit to Screen">
            <RotateCcw className="h-4 w-4" />
          </Button>
          <Button size="sm" variant="outline" onClick={handleZoom100} disabled={!image} title="100%">
            1:1
          </Button>
        </div>
        
        <div className="bg-background/95 backdrop-blur-sm rounded-lg px-3 py-2 border shadow-lg">
          <p className="text-xs font-mono text-muted-foreground">Zoom</p>
          <p className="text-sm font-medium">{(zoom * 100).toFixed(0)}%</p>
        </div>
        
        {image && (
          <div className="bg-background/95 backdrop-blur-sm rounded-lg px-3 py-2 border shadow-lg">
            <p className="text-xs font-mono text-muted-foreground">Image</p>
            <p className="text-sm font-medium">{image.width} × {image.height}</p>
          </div>
        )}
      </div>

      {/* Instructions */}
      {activeTool === "draw" && (
        <div className="absolute bottom-4 left-4 bg-primary/10 border-primary rounded-lg px-3 py-2 border shadow-lg">
          <p className="text-xs font-medium text-primary">Draw Room Mode</p>
          <p className="text-xs text-muted-foreground">
            Click to add vertices, double-click to close polygon, ESC to cancel, Backspace to undo
          </p>
        </div>
      )}
      
      {activeTool === "select" && isEditingPolygon && (
        <div className="absolute bottom-4 left-4 bg-accent/10 border-accent rounded-lg px-3 py-2 border shadow-lg">
          <p className="text-xs font-medium text-accent">Edit Mode</p>
          <p className="text-xs text-muted-foreground">
            Drag vertices to reshape, click outside to finish
          </p>
        </div>
      )}

      {/* Grid controls */}
      {snapToGrid && (
        <div className="absolute bottom-4 right-4 bg-background/95 backdrop-blur-sm rounded-lg px-3 py-2 border shadow-lg">
          <p className="text-xs font-medium">Grid: {gridSize}px</p>
        </div>
      )}

       {/* Canvas */}
       <canvas
         ref={canvasRef}
         className="w-full h-full"
         onMouseDown={handleMouseDown}
         onMouseMove={handleMouseMove}
         onMouseUp={handleMouseUp}
         onDoubleClick={handleDoubleClick}
         style={{
           cursor: activeTool === "select" ? 
             (isPanning ? "grabbing" : dragVertex ? "grabbing" : isEditingPolygon ? "pointer" : "grab") : 
             activeTool === "dropPano" ? "crosshair" :
             "crosshair"
         }}
       />

       {/* Status for drop pano mode */}
       {activeTool === "dropPano" && (
         <div className="absolute bottom-4 left-4 bg-green-100 text-green-800 px-3 py-2 rounded-lg shadow-lg border border-green-300">
           📍 Click to place panorama
         </div>
       )}
    </div>
  );
};