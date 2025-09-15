import { useRef, useState, useCallback, useEffect } from "react";
import { Stage, Layer, Line, Circle, Rect, Text } from "react-konva";
import { Upload, Download, Trash2, Move, Edit3, Save, X, Plus } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface Point {
  x: number;
  y: number;
}

interface Room {
  id: string;
  name: string;
  polygon: Point[];
  level?: string;
  rag?: 'Minimal' | 'Minor' | 'Significant';
  notes?: string;
}

interface FloorPlan {
  id: string;
  imageUrl: string;
  width: number;
  height: number;
  rooms: Room[];
}

interface FloorPlanCanvasProps {
  floorPlan: FloorPlan | null;
  onFloorPlanUpload: (file: File) => void;
  onRoomUpdate: (rooms: Room[]) => void;
  selectedRoomId?: string;
  onRoomSelect?: (roomId: string | null) => void;
}

type DrawMode = 'select' | 'draw' | 'edit';

export const FloorPlanCanvas = ({ 
  floorPlan, 
  onFloorPlanUpload, 
  onRoomUpdate,
  selectedRoomId,
  onRoomSelect 
}: FloorPlanCanvasProps) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const stageRef = useRef<any>(null);
  
  const [mode, setMode] = useState<DrawMode>('select');
  const [currentPolygon, setCurrentPolygon] = useState<Point[]>([]);
  const [isDrawing, setIsDrawing] = useState(false);
  const [draggedVertex, setDraggedVertex] = useState<{ roomId: string; vertexIndex: number } | null>(null);
  const [showRoomForm, setShowRoomForm] = useState(false);
  const [newRoomData, setNewRoomData] = useState({ name: '', level: '', rag: 'Minimal' as const, notes: '' });
  const [scale, setScale] = useState(1);
  const [stagePos, setStagePos] = useState({ x: 0, y: 0 });

  const rooms = floorPlan?.rooms || [];

  // Handle file upload
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      onFloorPlanUpload(file);
    }
  };

  // Start drawing polygon
  const startDrawing = () => {
    setMode('draw');
    setCurrentPolygon([]);
    setIsDrawing(true);
  };

  // Handle stage click for drawing
  const handleStageClick = (e: any) => {
    if (mode !== 'draw' || !isDrawing || !stageRef.current) return;

    const stage = stageRef.current;
    const pos = stage.getRelativePointerPosition();
    
    if (!pos) return;

    const newPoint = { 
      x: (pos.x - stagePos.x) / scale, 
      y: (pos.y - stagePos.y) / scale 
    };

    // Check if we're closing the polygon (click near first point)
    if (currentPolygon.length > 2) {
      const firstPoint = currentPolygon[0];
      const distance = Math.sqrt(
        Math.pow(newPoint.x - firstPoint.x, 2) + Math.pow(newPoint.y - firstPoint.y, 2)
      );
      
      if (distance < 10 / scale) {
        // Close polygon and show form
        finishDrawing();
        return;
      }
    }

    setCurrentPolygon(prev => [...prev, newPoint]);
  };

  // Finish drawing and show room form
  const finishDrawing = () => {
    if (currentPolygon.length >= 3) {
      setShowRoomForm(true);
    }
    setIsDrawing(false);
  };

  // Save new room
  const saveNewRoom = () => {
    if (!newRoomData.name.trim() || currentPolygon.length < 3) return;

    const newRoom: Room = {
      id: `room-${Date.now()}`,
      name: newRoomData.name.trim(),
      polygon: [...currentPolygon],
      level: newRoomData.level.trim() || undefined,
      rag: newRoomData.rag,
      notes: newRoomData.notes.trim() || undefined
    };

    onRoomUpdate([...rooms, newRoom]);
    
    // Reset state
    setCurrentPolygon([]);
    setShowRoomForm(false);
    setNewRoomData({ name: '', level: '', rag: 'Minimal', notes: '' });
    setMode('select');
  };

  // Cancel drawing
  const cancelDrawing = () => {
    setCurrentPolygon([]);
    setShowRoomForm(false);
    setIsDrawing(false);
    setMode('select');
    setNewRoomData({ name: '', level: '', rag: 'Minimal', notes: '' });
  };

  // Handle room polygon click
  const handleRoomClick = (roomId: string) => {
    if (mode === 'select') {
      onRoomSelect?.(roomId === selectedRoomId ? null : roomId);
    }
  };

  // Delete room
  const deleteRoom = (roomId: string) => {
    onRoomUpdate(rooms.filter(room => room.id !== roomId));
    if (selectedRoomId === roomId) {
      onRoomSelect?.(null);
    }
  };

  // Handle vertex drag
  const handleVertexDrag = (roomId: string, vertexIndex: number, newPos: Point) => {
    const updatedRooms = rooms.map(room => {
      if (room.id === roomId) {
        const newPolygon = [...room.polygon];
        newPolygon[vertexIndex] = {
          x: (newPos.x - stagePos.x) / scale,
          y: (newPos.y - stagePos.y) / scale
        };
        return { ...room, polygon: newPolygon };
      }
      return room;
    });
    onRoomUpdate(updatedRooms);
  };

  // Render polygon
  const renderPolygon = (points: Point[], color: string, isSelected: boolean = false) => {
    const flatPoints = points.flatMap(p => [p.x * scale + stagePos.x, p.y * scale + stagePos.y]);
    
    return (
      <>
        <Line
          points={flatPoints}
          closed
          fill={color}
          stroke={isSelected ? '#3b82f6' : '#64748b'}
          strokeWidth={isSelected ? 3 : 2}
          opacity={0.3}
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

  // Render room vertices for editing
  const renderVertices = (room: Room) => {
    if (mode !== 'edit' || selectedRoomId !== room.id) return null;

    return room.polygon.map((point, index) => (
      <Circle
        key={index}
        x={point.x * scale + stagePos.x}
        y={point.y * scale + stagePos.y}
        radius={6}
        fill="#3b82f6"
        stroke="#ffffff"
        strokeWidth={2}
        draggable
        onDragMove={(e) => {
          const pos = { x: e.target.x(), y: e.target.y() };
          handleVertexDrag(room.id, index, pos);
        }}
      />
    ));
  };

  const getRoomColor = (rag?: string) => {
    switch (rag) {
      case 'Significant': return '#ef4444';
      case 'Minor': return '#f59e0b';
      default: return '#10b981';
    }
  };

  if (!floorPlan) {
    return (
      <Card className="h-full">
        <CardHeader>
          <CardTitle>Floor Plan Upload</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col items-center justify-center h-full space-y-4">
          <div className="w-24 h-24 border-2 border-dashed border-muted-foreground rounded-lg flex items-center justify-center">
            <Upload className="h-8 w-8 text-muted-foreground" />
          </div>
          <div className="text-center space-y-2">
            <p className="font-medium">Upload Floor Plan</p>
            <p className="text-sm text-muted-foreground">PDF or image file (PNG, JPG)</p>
          </div>
          <Button onClick={() => fileInputRef.current?.click()}>
            <Upload className="h-4 w-4 mr-2" />
            Choose File
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.png,.jpg,.jpeg"
            className="hidden"
            onChange={handleFileUpload}
          />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Floor Plan Editor</CardTitle>
          <div className="flex items-center space-x-2">
            {mode === 'draw' && (
              <>
                <Button variant="outline" size="sm" onClick={cancelDrawing}>
                  <X className="h-4 w-4 mr-1" />
                  Cancel
                </Button>
                <Button variant="default" size="sm" onClick={finishDrawing} disabled={currentPolygon.length < 3}>
                  <Save className="h-4 w-4 mr-1" />
                  Finish
                </Button>
              </>
            )}
            {(mode === 'select' || mode === 'edit') && (
              <>
                <Button 
                  variant={mode === 'edit' ? 'default' : 'outline'} 
                  size="sm" 
                  onClick={() => setMode(mode === 'edit' ? 'select' : 'edit')}
                >
                  <Edit3 className="h-4 w-4 mr-1" />
                  {mode === 'edit' ? 'Select' : 'Edit'}
                </Button>
                {mode === 'select' && (
                  <Button variant="default" size="sm" onClick={startDrawing}>
                    <Plus className="h-4 w-4 mr-1" />
                    Draw Room
                  </Button>
                )}
              </>
            )}
          </div>
        </div>
        
        <div className="flex items-center space-x-4">
          <Badge variant="outline">
            {rooms.length} room{rooms.length !== 1 ? 's' : ''}
          </Badge>
          <Badge variant={mode === 'select' ? 'default' : 'secondary'}>
            {mode === 'draw' ? 'Drawing' : mode === 'edit' ? 'Editing' : 'Select'}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="flex-1 flex flex-col space-y-4">
        {/* Canvas Container */}
        <div className="flex-1 border rounded-lg overflow-hidden bg-gray-50">
          <Stage
            ref={stageRef}
            width={800}
            height={600}
            scaleX={scale}
            scaleY={scale}
            x={stagePos.x}
            y={stagePos.y}
            draggable={mode === 'select'}
            onClick={handleStageClick}
            onDragEnd={(e) => setStagePos({ x: e.target.x(), y: e.target.y() })}
          >
            <Layer>
              {/* Background image */}
              <Rect
                width={floorPlan.width}
                height={floorPlan.height}
                fillPatternImage={(() => {
                  const img = new window.Image();
                  img.src = floorPlan.imageUrl;
                  return img;
                })()}
              />
              
              {/* Room polygons */}
              {rooms.map(room => (
                <g key={room.id}>
                  {renderPolygon(
                    room.polygon, 
                    getRoomColor(room.rag), 
                    selectedRoomId === room.id
                  )}
                  {renderVertices(room)}
                  {/* Room label */}
                  {room.polygon.length > 0 && (
                    <Text
                      x={room.polygon[0].x * scale + stagePos.x}
                      y={room.polygon[0].y * scale + stagePos.y - 20}
                      text={room.name}
                      fontSize={12}
                      fill="#000"
                      onClick={() => handleRoomClick(room.id)}
                    />
                  )}
                </g>
              ))}
              
              {/* Current drawing polygon */}
              {currentPolygon.length > 0 && renderPolygon(currentPolygon, '#3b82f6')}
              
              {/* Current drawing vertices */}
              {currentPolygon.map((point, index) => (
                <Circle
                  key={index}
                  x={point.x * scale + stagePos.x}
                  y={point.y * scale + stagePos.y}
                  radius={4}
                  fill="#3b82f6"
                />
              ))}
            </Layer>
          </Stage>
        </div>

        {/* Room Form Modal */}
        {showRoomForm && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <Card className="w-96 max-w-[90vw]">
              <CardHeader>
                <CardTitle>Create Room</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="room-name">Room Name *</Label>
                  <Input
                    id="room-name"
                    value={newRoomData.name}
                    onChange={(e) => setNewRoomData(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="e.g., Living Room"
                  />
                </div>
                
                <div>
                  <Label htmlFor="room-level">Level</Label>
                  <Input
                    id="room-level"
                    value={newRoomData.level}
                    onChange={(e) => setNewRoomData(prev => ({ ...prev, level: e.target.value }))}
                    placeholder="e.g., Ground Floor"
                  />
                </div>
                
                <div>
                  <Label htmlFor="room-rag">RAG Status</Label>
                  <Select value={newRoomData.rag} onValueChange={(value: any) => setNewRoomData(prev => ({ ...prev, rag: value }))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Minimal">Minimal</SelectItem>
                      <SelectItem value="Minor">Minor</SelectItem>
                      <SelectItem value="Significant">Significant</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label htmlFor="room-notes">Notes</Label>
                  <Input
                    id="room-notes"
                    value={newRoomData.notes}
                    onChange={(e) => setNewRoomData(prev => ({ ...prev, notes: e.target.value }))}
                    placeholder="Optional notes"
                  />
                </div>
                
                <div className="flex justify-end space-x-2">
                  <Button variant="outline" onClick={cancelDrawing}>
                    Cancel
                  </Button>
                  <Button onClick={saveNewRoom} disabled={!newRoomData.name.trim()}>
                    Create Room
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </CardContent>
    </Card>
  );
};