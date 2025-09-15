import { useRef } from "react";
import { Stage, Layer, Line, Rect, Text, Group } from "react-konva";

interface Point { x: number; y: number }
interface Room { id: string; name: string; polygon: Point[]; level?: string; rag?: 'Minimal' | 'Minor' | 'Significant' }
interface FloorPlan { id: string; imageUrl: string; width: number; height: number; rooms: Room[] }

interface FloorPlanViewProps {
  floorPlan: FloorPlan | null;
  selectedRoomId?: string | null;
  onRoomSelect?: (roomId: string | null) => void;
  showLabels?: boolean;
}

const getRoomColor = (rag?: string) => {
  switch (rag) {
    case 'Significant': return '#ef4444';
    case 'Minor': return '#f59e0b';
    default: return '#10b981';
  }
};

export const FloorPlanView = ({ floorPlan, selectedRoomId, onRoomSelect, showLabels = true }: FloorPlanViewProps) => {
  const stageRef = useRef<any>(null);
  const scale = 1; // simple view for now

  if (!floorPlan) return (
    <div className="h-full rounded-lg border bg-muted/20 flex items-center justify-center">
      <p className="text-sm text-muted-foreground">No floor plan available</p>
    </div>
  );

  const renderPolygon = (points: Point[], color: string, isSelected: boolean = false) => {
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
          onClick={() => {}}
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
    <div className="h-full border rounded-lg overflow-hidden bg-gray-50">
      <Stage
        ref={stageRef}
        width={window.innerWidth / 3}
        height={window.innerHeight - 160}
      >
        <Layer>
          <Rect
            width={floorPlan.width}
            height={floorPlan.height}
            fillPatternImage={(() => {
              const img = new Image();
              img.src = floorPlan.imageUrl;
              return img;
            })()}
          />

          {floorPlan.rooms.map(room => (
            <Group key={room.id} onClick={() => onRoomSelect?.(room.id === selectedRoomId ? null : room.id)}>
              {renderPolygon(room.polygon, getRoomColor(room.rag), selectedRoomId === room.id)}
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
