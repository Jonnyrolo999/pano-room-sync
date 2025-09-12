import { useRef, useEffect, useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ZoomIn, Eye, Users } from "lucide-react";

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

interface FloorPlan {
  id: string;
  buildingName: string;
  floorName: string;
  imagePath: string;
  scale?: number;
}

interface MiniMapCardProps {
  floorPlan: FloorPlan;
  roomPolygons: RoomPolygon[];
  panoMarkers: PanoMarker[];
  selectedRoomId: string;
  selectedPanoId: string;
  onRoomClick: (roomId: string) => void;
  onPanoClick: (panoId: string) => void;
}

export const MiniMapCard = ({
  floorPlan,
  roomPolygons,
  panoMarkers,
  selectedRoomId,
  selectedPanoId,
  onRoomClick,
  onPanoClick
}: MiniMapCardProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [ctx, setCtx] = useState<CanvasRenderingContext2D | null>(null);
  const [image, setImage] = useState<HTMLImageElement | null>(null);

  // Initialize mini canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const context = canvas.getContext("2d");
    if (!context) return;

    setCtx(context);

    // Load floor plan image
    const img = new Image();
    img.onload = () => {
      setImage(img);
      
      // Set canvas size to maintain aspect ratio
      const maxSize = 200;
      const aspectRatio = img.width / img.height;
      
      if (aspectRatio > 1) {
        canvas.width = maxSize;
        canvas.height = maxSize / aspectRatio;
      } else {
        canvas.width = maxSize * aspectRatio;
        canvas.height = maxSize;
      }
    };
    
    img.crossOrigin = "anonymous";
    img.src = floorPlan.imagePath;
  }, [floorPlan.imagePath]);

  // Render mini map
  const render = useCallback(() => {
    if (!ctx || !image) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Calculate scale to fit image in canvas
    const scaleX = canvas.width / image.width;
    const scaleY = canvas.height / image.height;
    const scale = Math.min(scaleX, scaleY);

    // Save context
    ctx.save();
    ctx.scale(scale, scale);

    // Draw floor plan image
    ctx.drawImage(image, 0, 0);

    // Draw room polygons (always show both layers in mini-map)
    roomPolygons.forEach(polygon => {
      if (polygon.points.length > 2) {
        const isSelected = selectedRoomId === polygon.roomId;
        
        ctx.beginPath();
        ctx.moveTo(polygon.points[0].x, polygon.points[0].y);
        polygon.points.slice(1).forEach(point => {
          ctx.lineTo(point.x, point.y);
        });
        ctx.closePath();
        
        if (isSelected) {
          ctx.fillStyle = "#2563eb";
          ctx.globalAlpha = 0.3;
          ctx.fill();
          ctx.globalAlpha = 1;
          ctx.strokeStyle = "#1d4ed8";
          ctx.lineWidth = 2 / scale;
        } else {
          ctx.fillStyle = "#93c5fd";
          ctx.globalAlpha = 0.1;
          ctx.fill();
          ctx.globalAlpha = 1;
          ctx.strokeStyle = "#2563eb";
          ctx.globalAlpha = 0.5;
          ctx.lineWidth = 1 / scale;
        }
        ctx.stroke();
        ctx.globalAlpha = 1;
      }
    });

    // Draw panorama markers (always show both layers)
    panoMarkers.forEach(marker => {
      const isSelected = selectedPanoId === marker.panoId;
      
      ctx.beginPath();
      ctx.arc(marker.x, marker.y, isSelected ? 6 / scale : 4 / scale, 0, Math.PI * 2);
      ctx.fillStyle = isSelected ? "#f59e0b" : "#fbbf24";
      ctx.fill();
      
      ctx.strokeStyle = "#92400e";
      ctx.lineWidth = 1 / scale;
      ctx.stroke();
    });

    // Restore context
    ctx.restore();
  }, [ctx, image, roomPolygons, panoMarkers, selectedRoomId, selectedPanoId]);

  // Render when dependencies change
  useEffect(() => {
    render();
  }, [render]);

  // Handle clicks on mini-map
  const handleClick = useCallback((event: React.MouseEvent) => {
    const canvas = canvasRef.current;
    if (!canvas || !image) return;

    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    // Convert screen coordinates to image coordinates
    const scaleX = canvas.width / image.width;
    const scaleY = canvas.height / image.height;
    const scale = Math.min(scaleX, scaleY);
    
    const imageX = x / scale;
    const imageY = y / scale;

    // Check for pano markers first (higher priority)
    for (const marker of panoMarkers) {
      const distance = Math.sqrt((imageX - marker.x) ** 2 + (imageY - marker.y) ** 2);
      if (distance <= 8) {
        onPanoClick(marker.panoId);
        return;
      }
    }

    // Check for room polygons
    for (const polygon of roomPolygons) {
      if (isPointInPolygon({ x: imageX, y: imageY }, polygon.points)) {
        onRoomClick(polygon.roomId);
        return;
      }
    }
  }, [image, roomPolygons, panoMarkers, onRoomClick, onPanoClick]);

  // Point in polygon helper
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

  const totalRooms = roomPolygons.length;
  const totalPanos = panoMarkers.length;
  const assignedPanos = panoMarkers.filter(m => m.roomId).length;

  return (
    <Card className="w-full">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <Eye className="h-4 w-4" />
          Floor Plan Overview
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="relative">
          <canvas
            ref={canvasRef}
            onClick={handleClick}
            className="w-full border rounded-lg cursor-pointer hover:shadow-md transition-shadow"
            style={{ maxHeight: "200px" }}
          />
          <div className="absolute top-2 right-2 bg-background/80 backdrop-blur-sm rounded px-2 py-1 text-xs">
            {floorPlan.floorName}
          </div>
        </div>
        
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 bg-blue-500 rounded-sm opacity-60"></div>
            <span>{totalRooms} rooms</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 bg-amber-500 rounded-full"></div>
            <span>{totalPanos} panos</span>
          </div>
        </div>

        <div className="flex gap-2">
          <Button size="sm" variant="outline" className="flex-1 text-xs">
            <ZoomIn className="h-3 w-3 mr-1" />
            Zoom to Room
          </Button>
          <Button size="sm" variant="outline" className="flex-1 text-xs">
            <Users className="h-3 w-3 mr-1" />
            Show All
          </Button>
        </div>

        {assignedPanos < totalPanos && (
          <div className="text-xs text-amber-600 bg-amber-50 p-2 rounded">
            {totalPanos - assignedPanos} unassigned panos
          </div>
        )}
      </CardContent>
    </Card>
  );
};