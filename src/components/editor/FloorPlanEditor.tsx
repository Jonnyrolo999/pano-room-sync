import { useRef, useState, useCallback, useEffect } from "react";
import { Stage, Layer, Line, Circle, Rect, Text } from "react-konva";
import { Upload, Download, Trash2, Move, Edit3, Save, X, Plus, Image as ImageIcon } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

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
  panoramaCount?: number;
}

interface FloorPlan {
  id: string;
  imageUrl: string;
  width: number;
  height: number;
  rooms: Room[];
}

interface FloorPlanEditorProps {
  floorPlan: FloorPlan | null;
  onFloorPlanUpload: (file: File) => void;
  onRoomUpdate: (rooms: Room[]) => void;
  selectedRoomId?: string;
  onRoomSelect?: (roomId: string | null) => void;
  onPanoramaUpload?: (roomId: string, files: FileList) => void;
}

type DrawMode = 'select' | 'draw' | 'edit';

export const FloorPlanEditor = ({ 
  floorPlan, 
  onFloorPlanUpload, 
  onRoomUpdate,
  selectedRoomId,
  onRoomSelect,
  onPanoramaUpload
}: FloorPlanEditorProps) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const panoInputRef = useRef<HTMLInputElement>(null);
  const stageRef = useRef<any>(null);
  
  const [mode, setMode] = useState<DrawMode>('select');
  const [currentPolygon, setCurrentPolygon] = useState<Point[]>([]);
  const [isDrawing, setIsDrawing] = useState(false);
  const [showRoomForm, setShowRoomForm] = useState(false);
  const [newRoomData, setNewRoomData] = useState({ name: '', level: '', rag: 'Minimal' as const, notes: '' });
  const [scale, setScale] = useState(1);
  const [stagePos, setStagePos] = useState({ x: 0, y: 0 });

  const rooms = floorPlan?.rooms || [];
  const selectedRoom = rooms.find(r => r.id === selectedRoomId);

  // Handle file upload
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      onFloorPlanUpload(file);
    }
  };

  // Handle panorama upload for room
  const handlePanoramaUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files && selectedRoomId && onPanoramaUpload) {
      onPanoramaUpload(selectedRoomId, files);
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
      notes: newRoomData.notes.trim() || undefined,
      panoramaCount: 0
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
      <div className="h-full flex">
        {/* Left Toolbox */}
        <div className="w-80 border-r bg-card">
          <Card className="h-full border-0 rounded-none">
            <CardHeader>
              <CardTitle>Floor Plan Upload</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-center space-y-4">
                <div className="w-24 h-24 border-2 border-dashed border-muted-foreground rounded-lg flex items-center justify-center mx-auto">
                  <Upload className="h-8 w-8 text-muted-foreground" />
                </div>
                <div className="space-y-2">
                  <p className="font-medium">Upload Floor Plan</p>
                  <p className="text-sm text-muted-foreground">PDF or image file (PNG, JPG)</p>
                </div>
                <Button onClick={() => fileInputRef.current?.click()} className="w-full">
                  <Upload className="h-4 w-4 mr-2" />
                  Choose File
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Canvas Area */}
        <div className="flex-1 bg-muted/20 flex items-center justify-center">
          <div className="text-center space-y-4">
            <ImageIcon className="h-16 w-16 text-muted-foreground mx-auto" />
            <div>
              <h3 className="text-lg font-medium">No Floor Plan</h3>
              <p className="text-muted-foreground">Upload a floor plan to get started</p>
            </div>
          </div>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.png,.jpg,.jpeg"
          className="hidden"
          onChange={handleFileUpload}
        />
      </div>
    );
  }

  return (
    <div className="h-full flex">
      {/* Left Toolbox */}
      <div className="w-80 border-r bg-card">
        <Card className="h-full border-0 rounded-none">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg">Floor Plan Editor</CardTitle>
            <div className="flex items-center space-x-4">
              <Badge variant="outline">
                {rooms.length} room{rooms.length !== 1 ? 's' : ''}
              </Badge>
              <Badge variant={mode === 'select' ? 'default' : 'secondary'}>
                {mode === 'draw' ? 'Drawing' : mode === 'edit' ? 'Editing' : 'Select'}
              </Badge>
            </div>
          </CardHeader>

          <CardContent className="space-y-4 flex-1 overflow-y-auto">
            {/* Drawing Controls */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Drawing Tools</Label>
              <div className="flex flex-col space-y-2">
                {mode === 'draw' && (
                  <>
                    <Button variant="outline" size="sm" onClick={cancelDrawing}>
                      <X className="h-4 w-4 mr-1" />
                      Cancel
                    </Button>
                    <Button variant="default" size="sm" onClick={finishDrawing} disabled={currentPolygon.length < 3}>
                      <Save className="h-4 w-4 mr-1" />
                      Finish ({currentPolygon.length} points)
                    </Button>
                  </>
                )}
                {(mode === 'select' || mode === 'edit') && (
                  <>
                    <Button 
                      variant={mode === 'edit' ? 'default' : 'outline'} 
                      size="sm" 
                      onClick={() => setMode(mode === 'edit' ? 'select' : 'edit')}
                      className="w-full"
                    >
                      <Edit3 className="h-4 w-4 mr-1" />
                      {mode === 'edit' ? 'Select Mode' : 'Edit Mode'}
                    </Button>
                    {mode === 'select' && (
                      <Button variant="default" size="sm" onClick={startDrawing} className="w-full">
                        <Plus className="h-4 w-4 mr-1" />
                        Draw Room
                      </Button>
                    )}
                  </>
                )}
              </div>
            </div>

            {/* Room List */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium">Rooms</Label>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload className="h-3 w-3 mr-1" />
                  New Plan
                </Button>
              </div>
              
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {rooms.map(room => (
                  <div 
                    key={room.id}
                    className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                      selectedRoomId === room.id 
                        ? 'bg-primary/10 border-primary' 
                        : 'bg-card border-border hover:bg-muted/50'
                    }`}
                    onClick={() => handleRoomClick(room.id)}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-sm">{room.name}</span>
                      <div className="flex items-center space-x-1">
                        <Badge 
                          variant="secondary" 
                          className="text-xs"
                          style={{ backgroundColor: getRoomColor(room.rag) + '20' }}
                        >
                          {room.rag}
                        </Badge>
                        {room.panoramaCount !== undefined && (
                          <Badge variant="outline" className="text-xs">
                            {room.panoramaCount} panos
                          </Badge>
                        )}
                      </div>
                    </div>
                    {room.level && (
                      <p className="text-xs text-muted-foreground mt-1">{room.level}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Selected Room Details */}
            {selectedRoom && (
              <div className="space-y-3 border-t pt-4">
                <Label className="text-sm font-medium">Selected Room</Label>
                <div className="bg-muted/30 rounded-lg p-3 space-y-3">
                  <div>
                    <h4 className="font-medium">{selectedRoom.name}</h4>
                    {selectedRoom.level && (
                      <p className="text-sm text-muted-foreground">{selectedRoom.level}</p>
                    )}
                  </div>
                  
                  {selectedRoom.notes && (
                    <div>
                      <Label className="text-xs">Notes</Label>
                      <p className="text-sm mt-1">{selectedRoom.notes}</p>
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label className="text-xs">Panoramas</Label>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => panoInputRef.current?.click()}
                      className="w-full"
                    >
                      <ImageIcon className="h-4 w-4 mr-2" />
                      Upload Panoramas ({selectedRoom.panoramaCount || 0})
                    </Button>
                  </div>

                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => deleteRoom(selectedRoom.id)}
                    className="w-full text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete Room
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Main Canvas */}
      <div className="flex-1 bg-muted/20">
        <div className="h-full border rounded-lg overflow-hidden bg-gray-50 m-4">
          <Stage
            ref={stageRef}
            width={window.innerWidth - 320 - 64} // Account for toolbox and margins
            height={window.innerHeight - 160} // Account for header and margins
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
      </div>

      {/* Hidden Inputs */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,.png,.jpg,.jpeg"
        className="hidden"
        onChange={handleFileUpload}
      />
      <input
        ref={panoInputRef}
        type="file"
        accept=".jpg,.jpeg,.png"
        multiple
        className="hidden"
        onChange={handlePanoramaUpload}
      />

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
                <Textarea
                  id="room-notes"
                  value={newRoomData.notes}
                  onChange={(e) => setNewRoomData(prev => ({ ...prev, notes: e.target.value }))}
                  placeholder="Optional notes"
                  rows={3}
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
    </div>
  );
};