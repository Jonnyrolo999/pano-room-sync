import { useRef, useEffect, useState, useCallback } from "react";
import { ZoomIn, ZoomOut, RotateCcw, Move } from "lucide-react";
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
  activeTool: "select" | "polygon" | "rectangle" | "pano";
  roomPolygons: RoomPolygon[];
  panoMarkers: PanoMarker[];
  onAddPolygon: (points: { x: number; y: number }[]) => void;
  onAddPanoMarker: (x: number, y: number) => void;
  onRoomClick: (roomId: string) => void;
  onPanoClick: (panoId: string) => void;
}

export const FloorPlanCanvas = ({
  floorPlan,
  activeTool,
  roomPolygons,
  panoMarkers,
  onAddPolygon,
  onAddPanoMarker,
  onRoomClick,
  onPanoClick
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
  const [isDrawingRect, setIsDrawingRect] = useState(false);
  const [rectStart, setRectStart] = useState<{ x: number; y: number } | null>(null);

  // Initialize canvas and load image
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const context = canvas.getContext("2d");
    if (!context) return;

    setCtx(context);

    // Load floor plan image
    const img = new Image();
    img.onload = () => {
      console.log("Image loaded successfully:", img.width, "x", img.height);
      setImage(img);
      
      // Fit image to canvas
      const container = containerRef.current;
      if (container) {
        canvas.width = container.clientWidth;
        canvas.height = container.clientHeight;
        
        // Calculate initial zoom to fit image
        const scaleX = canvas.width / img.width;
        const scaleY = canvas.height / img.height;
        const initialZoom = Math.min(scaleX, scaleY) * 0.9;
        setZoom(initialZoom);
        
        // Center the image
        setPan({
          x: (canvas.width - img.width * initialZoom) / 2,
          y: (canvas.height - img.height * initialZoom) / 2
        });
      }
    };
    
    img.onerror = (error) => {
      console.error("Failed to load image:", error, floorPlan.imagePath);
    };
    
    img.crossOrigin = "anonymous"; // Handle CORS if needed
    img.src = floorPlan.imagePath;
    
    console.log("Loading image from:", floorPlan.imagePath);
  }, [floorPlan.imagePath]);

  // Render canvas content
  const render = useCallback(() => {
    if (!ctx || !image) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Save context
    ctx.save();

    // Apply pan and zoom
    ctx.translate(pan.x, pan.y);
    ctx.scale(zoom, zoom);

    // Draw floor plan image
    ctx.drawImage(image, 0, 0);

    // Draw room polygons
    roomPolygons.forEach(polygon => {
      if (polygon.points.length > 2) {
        ctx.beginPath();
        ctx.moveTo(polygon.points[0].x, polygon.points[0].y);
        polygon.points.slice(1).forEach(point => {
          ctx.lineTo(point.x, point.y);
        });
        ctx.closePath();
        
        // Fill with semi-transparent color
        ctx.fillStyle = polygon.color + "40";
        ctx.fill();
        
        // Stroke with solid color
        ctx.strokeStyle = polygon.color;
        ctx.lineWidth = 2 / zoom;
        ctx.stroke();
      }
    });

    // Draw current polygon being drawn
    if (currentPolygon.length > 0) {
      ctx.beginPath();
      ctx.moveTo(currentPolygon[0].x, currentPolygon[0].y);
      currentPolygon.slice(1).forEach(point => {
        ctx.lineTo(point.x, point.y);
      });
      ctx.strokeStyle = "#007acc";
      ctx.lineWidth = 2 / zoom;
      ctx.stroke();
      
      // Draw points
      currentPolygon.forEach(point => {
        ctx.beginPath();
        ctx.arc(point.x, point.y, 4 / zoom, 0, Math.PI * 2);
        ctx.fillStyle = "#007acc";
        ctx.fill();
      });
    }

    // Draw panorama markers
    panoMarkers.forEach(marker => {
      ctx.beginPath();
      ctx.arc(marker.x, marker.y, 8 / zoom, 0, Math.PI * 2);
      ctx.fillStyle = "#ff6b35";
      ctx.fill();
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 2 / zoom;
      ctx.stroke();
      
      // Draw marker icon
      ctx.fillStyle = "#ffffff";
      ctx.font = `${12 / zoom}px Arial`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("📷", marker.x, marker.y);
    });

    // Restore context
    ctx.restore();
  }, [ctx, image, pan, zoom, roomPolygons, panoMarkers, currentPolygon]);

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

  // Convert screen coordinates to canvas coordinates
  const screenToCanvas = useCallback((screenX: number, screenY: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };

    const rect = canvas.getBoundingClientRect();
    const x = (screenX - rect.left - pan.x) / zoom;
    const y = (screenY - rect.top - pan.y) / zoom;
    
    return { x, y };
  }, [pan, zoom]);

  // Handle mouse events
  const handleMouseDown = useCallback((event: React.MouseEvent) => {
    const { x, y } = screenToCanvas(event.clientX, event.clientY);

    if (activeTool === "select") {
      // Check if clicking on a room polygon
      for (const polygon of roomPolygons) {
        if (isPointInPolygon({ x, y }, polygon.points)) {
          onRoomClick(polygon.roomId);
          return;
        }
      }
      
      // Check if clicking on a panorama marker
      for (const marker of panoMarkers) {
        const distance = Math.sqrt((x - marker.x) ** 2 + (y - marker.y) ** 2);
        if (distance <= 8) {
          onPanoClick(marker.panoId);
          return;
        }
      }
      
      // Start panning
      setIsPanning(true);
      setPanStart({ x: event.clientX - pan.x, y: event.clientY - pan.y });
    } else if (activeTool === "polygon") {
      setCurrentPolygon(prev => [...prev, { x, y }]);
    } else if (activeTool === "rectangle") {
      setIsDrawingRect(true);
      setRectStart({ x, y });
    } else if (activeTool === "pano") {
      onAddPanoMarker(x, y);
    }
  }, [activeTool, screenToCanvas, pan, roomPolygons, panoMarkers, onRoomClick, onPanoClick, onAddPanoMarker]);

  const handleMouseMove = useCallback((event: React.MouseEvent) => {
    if (isPanning) {
      setPan({
        x: event.clientX - panStart.x,
        y: event.clientY - panStart.y
      });
    }
  }, [isPanning, panStart]);

  const handleMouseUp = useCallback((event: React.MouseEvent) => {
    if (isPanning) {
      setIsPanning(false);
    } else if (isDrawingRect && rectStart) {
      const { x, y } = screenToCanvas(event.clientX, event.clientY);
      
      // Create rectangle polygon
      const rectPoints = [
        { x: rectStart.x, y: rectStart.y },
        { x: x, y: rectStart.y },
        { x: x, y: y },
        { x: rectStart.x, y: y }
      ];
      
      onAddPolygon(rectPoints);
      setIsDrawingRect(false);
      setRectStart(null);
    }
  }, [isPanning, isDrawingRect, rectStart, screenToCanvas, onAddPolygon]);

  const handleDoubleClick = useCallback(() => {
    if (activeTool === "polygon" && currentPolygon.length >= 3) {
      onAddPolygon([...currentPolygon]);
      setCurrentPolygon([]);
    }
  }, [activeTool, currentPolygon, onAddPolygon]);

  const handleZoom = useCallback((delta: number) => {
    const newZoom = Math.max(0.1, Math.min(5, zoom + delta));
    setZoom(newZoom);
  }, [zoom]);

  const handleReset = useCallback(() => {
    if (!image) return;
    
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const scaleX = canvas.width / image.width;
    const scaleY = canvas.height / image.height;
    const initialZoom = Math.min(scaleX, scaleY) * 0.9;
    
    setZoom(initialZoom);
    setPan({
      x: (canvas.width - image.width * initialZoom) / 2,
      y: (canvas.height - image.height * initialZoom) / 2
    });
  }, [image]);

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

  return (
    <div className="relative w-full h-full" ref={containerRef}>
      {/* Loading indicator */}
      {!image && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/80">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
            <p className="text-sm text-muted-foreground">Loading floor plan...</p>
          </div>
        </div>
      )}
      
      {/* Canvas Controls */}
      <div className="absolute top-4 right-4 space-y-2 z-10">
        <div className="bg-background/80 backdrop-blur-sm rounded-lg p-2 border space-y-1">
          <Button size="sm" variant="outline" onClick={() => handleZoom(0.2)} disabled={!image}>
            <ZoomIn className="h-4 w-4" />
          </Button>
          <Button size="sm" variant="outline" onClick={() => handleZoom(-0.2)} disabled={!image}>
            <ZoomOut className="h-4 w-4" />
          </Button>
          <Button size="sm" variant="outline" onClick={handleReset} disabled={!image}>
            <RotateCcw className="h-4 w-4" />
          </Button>
        </div>
        
        <div className="bg-background/80 backdrop-blur-sm rounded-lg px-3 py-2 border">
          <p className="text-xs font-mono text-muted-foreground">Zoom</p>
          <p className="text-sm font-medium">{(zoom * 100).toFixed(0)}%</p>
        </div>
        
        {image && (
          <div className="bg-background/80 backdrop-blur-sm rounded-lg px-3 py-2 border">
            <p className="text-xs font-mono text-muted-foreground">Image</p>
            <p className="text-sm font-medium">{image.width} × {image.height}</p>
          </div>
        )}
      </div>

      {/* Instructions */}
      {activeTool === "polygon" && (
        <div className="absolute top-4 left-4 bg-primary/10 border-primary rounded-lg px-3 py-2 border">
          <p className="text-xs font-medium text-primary">Polygon Mode</p>
          <p className="text-xs text-muted-foreground">
            Click to add points, double-click to finish
          </p>
        </div>
      )}
      
      {activeTool === "rectangle" && (
        <div className="absolute top-4 left-4 bg-primary/10 border-primary rounded-lg px-3 py-2 border">
          <p className="text-xs font-medium text-primary">Rectangle Mode</p>
          <p className="text-xs text-muted-foreground">
            Click and drag to create rectangle
          </p>
        </div>
      )}
      
      {activeTool === "pano" && (
        <div className="absolute top-4 left-4 bg-primary/10 border-primary rounded-lg px-3 py-2 border">
          <p className="text-xs font-medium text-primary">Panorama Mode</p>
          <p className="text-xs text-muted-foreground">
            Click to place panorama marker
          </p>
        </div>
      )}

      {/* Canvas */}
      <canvas
        ref={canvasRef}
        className="w-full h-full cursor-crosshair"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onDoubleClick={handleDoubleClick}
        style={{
          cursor: activeTool === "select" ? (isPanning ? "grabbing" : "grab") : "crosshair"
        }}
      />
    </div>
  );
};