import { useEffect, useMemo, useRef, useState } from "react";
import { Stage, Layer, Line, Text, Group, Image as KonvaImage } from "react-konva";

interface Point { x: number; y: number }
interface Room { id: string; name: string; polygon: Point[]; level?: string }
interface FloorPlan { id: string; imageUrl: string; width: number; height: number; rooms: Room[] }

interface FloorPlanViewProps {
  floorPlan: FloorPlan | null;
  selectedRoomId?: string | null;
  onRoomSelect?: (roomId: string | null) => void;
  showLabels?: boolean;
}

const DEFAULT_ROOM_COLOR = "#10b981";

export const FloorPlanView = ({ floorPlan, selectedRoomId, onRoomSelect, showLabels = true }: FloorPlanViewProps) => {
  const stageRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [bgImage, setBgImage] = useState<HTMLImageElement | null>(null);
  const [containerWidth, setContainerWidth] = useState<number>(0);

  // Load background image reliably
  useEffect(() => {
    if (!floorPlan?.imageUrl) return;
    const img = new Image();
    img.onload = () => setBgImage(img);
    img.src = floorPlan.imageUrl;
    return () => {
      setBgImage(null);
    };
  }, [floorPlan?.imageUrl]);

  // Track container width for responsive scaling
  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setContainerWidth(entry.contentRect.width);
      }
    });
    observer.observe(containerRef.current);
    setContainerWidth(containerRef.current.clientWidth);
    return () => observer.disconnect();
  }, []);

  if (!floorPlan) return (
    <div className="h-full rounded-lg border bg-muted/20 flex items-center justify-center">
      <p className="text-sm text-muted-foreground">No floor plan available</p>
    </div>
  );

  const aspect = floorPlan.height / floorPlan.width;
  const targetWidth = Math.max(280, Math.min(containerWidth || window.innerWidth / 3, floorPlan.width));
  const stageWidth = targetWidth;
  const stageHeight = targetWidth * aspect;
  const scale = stageWidth / floorPlan.width;

  const renderPolygon = (points: Point[], color: string = DEFAULT_ROOM_COLOR, isSelected: boolean = false) => {
    const flatPoints = points.flatMap(p => [p.x * scale, p.y * scale]);
    return (
      <>
        <Line
          points={flatPoints}
          closed
          fill={color}
          stroke={isSelected ? '#3b82f6' : '#64748b'}
          strokeWidth={isSelected ? 3 : 2}
          opacity={0.25}
        />
        <Line
          points={flatPoints}
          closed
          stroke={isSelected ? '#3b82f6' : '#64748b'}
          strokeWidth={isSelected ? 3 : 2}
        />
      </>
    );
  };

  return (
    <div ref={containerRef} className="h-full border rounded-lg overflow-hidden bg-gray-50">
      <Stage
        ref={stageRef}
        width={stageWidth}
        height={stageHeight}
      >
        <Layer>
          {bgImage && (
            <KonvaImage
              image={bgImage}
              x={0}
              y={0}
              width={floorPlan.width * scale}
              height={floorPlan.height * scale}
            />
          )}

          {floorPlan.rooms.map(room => (
            <Group key={room.id} onClick={() => onRoomSelect?.(room.id === selectedRoomId ? null : room.id)} onMouseEnter={(e) => { const c = e.target.getStage()?.container(); if (c) c.style.cursor = 'pointer'; }} onMouseLeave={(e) => { const c = e.target.getStage()?.container(); if (c) c.style.cursor = 'default'; }}>
              {renderPolygon(room.polygon, DEFAULT_ROOM_COLOR, selectedRoomId === room.id)}
              {showLabels && room.polygon[0] && (
                <Text
                  x={room.polygon[0].x * scale}
                  y={room.polygon[0].y * scale - 18}
                  text={room.name}
                  fontSize={12}
                  fill="#000"
                />
              )}
            </Group>
          ))}
        </Layer>
      </Stage>
    </div>
  );
};
