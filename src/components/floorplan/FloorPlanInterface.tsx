import { useState, useRef, useCallback, useEffect } from "react";
import { Upload, Square, MapPin, Save, Trash2, ZoomIn, ZoomOut, RotateCcw, MousePointer2, Grid3X3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { FloorPlanCanvas } from "./FloorPlanCanvas";

interface Room {
  id: string;
  data: any[];
  masterNodeId?: string;
}

interface Panorama {
  nodeId: string;
  title: string;
  floor?: string;
  fileName?: string;
  imageUrl?: string;
}

interface RoomPolygon {
  id: string;
  roomId: string;
  points: { x: number; y: number }[];
  color: string;
  roomData?: Room;
}

interface PanoMarker {
  id: string;
  panoId: string;
  x: number;
  y: number;
  roomId?: string;
  panoData?: Panorama;
}

interface FloorPlan {
  id: string;
  buildingName: string;
  floorName: string;
  imagePath: string;
  scale?: number;
}

interface FloorPlanInterfaceProps {
  rooms: Room[];
  panoramas: Panorama[];
  onRoomSelect?: (roomId: string) => void;
  onPanoSelect?: (panoId: string) => void;
}

export const FloorPlanInterface = ({ rooms, panoramas, onRoomSelect, onPanoSelect }: FloorPlanInterfaceProps) => {
  const [floorPlan, setFloorPlan] = useState<FloorPlan | null>(null);
  const [buildingName, setBuildingName] = useState("");
  const [floorName, setFloorName] = useState("");
  const [scale, setScale] = useState<number | undefined>();
  const [activeTool, setActiveTool] = useState<"select" | "draw" | "dropPano">("select");
  const [roomPolygons, setRoomPolygons] = useState<RoomPolygon[]>([]);
  const [panoMarkers, setPanoMarkers] = useState<PanoMarker[]>([]);
  const [selectedRoomId, setSelectedRoomId] = useState<string>("");
  const [selectedPanoId, setSelectedPanoId] = useState<string>("");
  const [isUploading, setIsUploading] = useState(false);
  const [snapToGrid, setSnapToGrid] = useState(false);
  const [gridSize, setGridSize] = useState(25);
  const [showPanoViewer, setShowPanoViewer] = useState(false);
  const [currentPanoId, setCurrentPanoId] = useState<string>("");
  const [showPolygonConfirm, setShowPolygonConfirm] = useState(false);
  const [pendingPolygon, setPendingPolygon] = useState<{ x: number; y: number }[]>([]);
  const [unsavedChanges, setUnsavedChanges] = useState(false);

  // Load state from localStorage on mount
  useEffect(() => {
    const savedState = localStorage.getItem('floorplan-editor-state');
    if (savedState) {
      try {
        const state = JSON.parse(savedState);
        if (state.floorPlan) setFloorPlan(state.floorPlan);
        if (state.roomPolygons) setRoomPolygons(state.roomPolygons);
        if (state.panoMarkers) setPanoMarkers(state.panoMarkers);
        if (state.buildingName) setBuildingName(state.buildingName);
        if (state.floorName) setFloorName(state.floorName);
        if (state.scale) setScale(state.scale);
        if (state.unsavedChanges) setUnsavedChanges(state.unsavedChanges);
      } catch (error) {
        console.warn('Failed to load saved state:', error);
      }
    }
  }, []);

  // Save state to localStorage when it changes
  useEffect(() => {
    const state = {
      floorPlan,
      roomPolygons,
      panoMarkers,
      buildingName,
      floorName,
      scale,
      unsavedChanges
    };
    localStorage.setItem('floorplan-editor-state', JSON.stringify(state));
  }, [floorPlan, roomPolygons, panoMarkers, buildingName, floorName, scale, unsavedChanges]);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.match(/(image\/.*|application\/pdf)/)) {
      toast.error("Please upload an image (JPG, PNG) or PDF file");
      return;
    }

    setIsUploading(true);
    try {
      let imageUrl: string;
      
      if (file.type === 'application/pdf') {
        // Handle PDF files - convert first page to image
        const arrayBuffer = await file.arrayBuffer();
        imageUrl = await convertPdfToImage(arrayBuffer);
      } else {
        // Handle image files directly
        imageUrl = URL.createObjectURL(file);
      }
      
      const newFloorPlan: FloorPlan = {
        id: `floor_${Date.now()}`,
        buildingName: buildingName || "Unnamed Building",
        floorName: floorName || "Ground Floor",
        imagePath: imageUrl,
        scale: scale
      };
      
      setFloorPlan(newFloorPlan);
      toast.success("Floor plan uploaded successfully");
    } catch (error) {
      console.error("Upload error:", error);
      toast.error("Failed to upload floor plan: " + (error instanceof Error ? error.message : "Unknown error"));
    } finally {
      setIsUploading(false);
    }
  }, [buildingName, floorName, scale]);

  const convertPdfToImage = async (arrayBuffer: ArrayBuffer): Promise<string> => {
    try {
      const pdfjsLib = await import('pdfjs-dist');
      
      // Use bundled worker to match API version
      const workerUrl = await import('pdfjs-dist/build/pdf.worker.min.js?url');
      (pdfjsLib as any).GlobalWorkerOptions.workerSrc = workerUrl.default;

      const pdf = await pdfjsLib.getDocument({
        data: arrayBuffer,
        useSystemFonts: true,
      }).promise;

      const page = await pdf.getPage(1); // Get first page

      // Higher DPI for crisp rendering
      const scale = 2.0; // ~150–200 DPI
      const viewport = page.getViewport({ scale });
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');

      if (!context) throw new Error('Could not get canvas context');

      canvas.width = Math.floor(viewport.width);
      canvas.height = Math.floor(viewport.height);

      // White background for better contrast
      context.fillStyle = '#ffffff';
      context.fillRect(0, 0, canvas.width, canvas.height);

      await page.render({
        canvasContext: context,
        viewport,
        canvas,
      }).promise;

      console.info(`PDF rendered successfully: ${canvas.width}x${canvas.height} at ${scale}x scale`);
      return canvas.toDataURL('image/png', 0.95);
    } catch (error) {
      console.error('PDF conversion error:', error);
      throw new Error('Failed to convert PDF to image. Please try uploading as JPG/PNG instead.');
    }
  };

  const handleAddPolygon = useCallback((points: { x: number; y: number }[]) => {
    // Store pending polygon and show confirmation
    setPendingPolygon(points);
    setShowPolygonConfirm(true);
    setUnsavedChanges(true);
  }, []);

  const confirmPolygon = useCallback(() => {
    if (!selectedRoomId || pendingPolygon.length < 3) {
      toast.error("Please select a room to assign this polygon");
      return;
    }

    const roomData = rooms.find(r => r.id === selectedRoomId);
    
    const newPolygon: RoomPolygon = {
      id: `polygon_${Date.now()}`,
      roomId: selectedRoomId,
      points: pendingPolygon, // Keep in canvas coordinates for now
      color: getStatusColor(roomData),
      roomData
    };

    setRoomPolygons(prev => [...prev, newPolygon]);
    setShowPolygonConfirm(false);
    setPendingPolygon([]);
    setSelectedRoomId("");
    toast.success(`Room polygon assigned to ${roomData?.id || selectedRoomId}`);
  }, [selectedRoomId, pendingPolygon, rooms]);

  const cancelPolygon = useCallback(() => {
    setShowPolygonConfirm(false);
    setPendingPolygon([]);
  }, []);

  const handleAddPanoMarker = useCallback((x: number, y: number) => {
    if (!selectedPanoId) {
      toast.error("Please select a panorama to place");
      return;
    }

    const panoData = panoramas.find(p => p.nodeId === selectedPanoId);
    
    // Auto-assign to room if marker is inside a polygon
    let assignedRoomId = undefined;
    for (const polygon of roomPolygons) {
      if (isPointInPolygon({ x, y }, polygon.points)) {
        assignedRoomId = polygon.roomId;
        break;
      }
    }

    const newMarker: PanoMarker = {
      id: `marker_${Date.now()}`,
      panoId: selectedPanoId,
      x,
      y,
      roomId: assignedRoomId,
      panoData
    };

    setPanoMarkers(prev => [...prev, newMarker]);
    setActiveTool("select"); // Exit drop mode after placing
    setSelectedPanoId(""); // Clear selection
    toast.success(`Panorama marker placed${assignedRoomId ? ` in room ${assignedRoomId}` : ""}`);
  }, [selectedPanoId, panoramas, roomPolygons]);

  const handleRoomClick = useCallback((roomId: string) => {
    onRoomSelect?.(roomId);
    toast.info(`Opened room ${roomId}`);
  }, [onRoomSelect]);

  const handlePanoClick = useCallback((panoId: string) => {
    setCurrentPanoId(panoId);
    setShowPanoViewer(true);
    onPanoSelect?.(panoId); // Still call the original handler for room data
    toast.info(`Viewing panorama ${panoId}`);
  }, [onPanoSelect]);

  const handleUpdatePolygon = useCallback((polygonId: string, points: { x: number; y: number }[]) => {
    setRoomPolygons(prev => prev.map(polygon => 
      polygon.id === polygonId ? { ...polygon, points } : polygon
    ));
  }, []);

  const handleDeletePolygon = useCallback((id: string) => {
    setRoomPolygons(prev => prev.filter(p => p.id !== id));
    toast.success("Room polygon deleted");
  }, []);

  const handleDeleteMarker = useCallback((id: string) => {
    setPanoMarkers(prev => prev.filter(m => m.id !== id));
    toast.success("Panorama marker deleted");
  }, []);

  const autoAssignPanoramas = useCallback(() => {
    let assignedCount = 0;
    const newMarkers: PanoMarker[] = [];

    panoramas.forEach(pano => {
      // Check if panorama already has a marker
      if (panoMarkers.some(m => m.panoId === pano.nodeId)) return;

      // Try to match with room based on nodeId or filename
      const matchingRoom = rooms.find(room => 
        pano.nodeId.includes(room.id) || 
        pano.fileName?.includes(room.id) ||
        room.id.includes(pano.nodeId)
      );

      if (matchingRoom) {
        const roomPolygon = roomPolygons.find(p => p.roomId === matchingRoom.id);
        if (roomPolygon && roomPolygon.points.length > 0) {
          // Place marker at center of room polygon
          const centerX = roomPolygon.points.reduce((sum, p) => sum + p.x, 0) / roomPolygon.points.length;
          const centerY = roomPolygon.points.reduce((sum, p) => sum + p.y, 0) / roomPolygon.points.length;

          newMarkers.push({
            id: `auto_marker_${Date.now()}_${assignedCount}`,
            panoId: pano.nodeId,
            x: centerX,
            y: centerY,
            roomId: matchingRoom.id,
            panoData: pano
          });
          assignedCount++;
        }
      }
    });

    if (newMarkers.length > 0) {
      setPanoMarkers(prev => [...prev, ...newMarkers]);
      toast.success(`Auto-assigned ${assignedCount} panoramas to rooms`);
    } else {
      toast.info("No panoramas could be auto-assigned");
    }
  }, [panoramas, panoMarkers, rooms, roomPolygons]);

  const getStatusColor = (roomData?: Room) => {
    if (!roomData?.data || roomData.data.length === 0) return "#ef4444"; // Red for missing data
    
    // Check data completeness (simplified)
    const emptyFields = roomData.data.filter(field => !field || field === "" || field === "No Data Provided").length;
    const totalFields = roomData.data.length;
    
    if (emptyFields === 0) return "#10b981"; // Green for complete
    if (emptyFields / totalFields > 0.5) return "#f59e0b"; // Amber for incomplete
    return "#6b7280"; // Grey for partial
  };

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

  if (!floorPlan) {
    return (
      <div className="h-full p-6 space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Upload Floor Plan</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="building">Building Name</Label>
                <Input
                  id="building"
                  value={buildingName}
                  onChange={(e) => setBuildingName(e.target.value)}
                  placeholder="Building A"
                />
              </div>
              <div>
                <Label htmlFor="floor">Floor Name</Label>
                <Input
                  id="floor"
                  value={floorName}
                  onChange={(e) => setFloorName(e.target.value)}
                  placeholder="Ground Floor"
                />
              </div>
            </div>
            
            <div>
              <Label htmlFor="scale">Scale (pixels per meter)</Label>
              <Input
                id="scale"
                type="number"
                step="0.1"
                min="0.1"
                value={scale || ""}
                onChange={(e) => setScale(e.target.value ? parseFloat(e.target.value) : undefined)}
                placeholder="e.g., 10 (10 pixels = 1 meter)"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Optional: Set how many pixels represent 1 meter for measurements
              </p>
            </div>

            <div className="border-2 border-dashed border-muted rounded-lg p-8 text-center">
              <Upload className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-sm text-muted-foreground mb-4">
                Drop your floor plan here or click to browse
              </p>
              <Button 
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
              >
                {isUploading ? "Uploading..." : "Choose File"}
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,.pdf"
                onChange={handleFileUpload}
                className="hidden"
              />
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="h-full flex">
      {/* Split Screen Layout */}
      <div className="flex-1 flex flex-col">
        {/* Toolbar */}
        <div className="flex items-center justify-between p-4 border-b bg-background">
          <div className="flex items-center gap-2">
            <Button
              variant={activeTool === "select" ? "default" : "outline"}
              size="sm"
              onClick={() => setActiveTool("select")}
              title="Select and edit polygons"
            >
              <MousePointer2 className="h-4 w-4 mr-1" />
              Select
            </Button>
            <Button
              variant={activeTool === "draw" ? "default" : "outline"}
              size="sm"
              onClick={() => setActiveTool("draw")}
              title="Draw room polygons"
            >
              ⬟ Draw Room
            </Button>
            <Button
              variant={activeTool === "dropPano" ? "default" : "outline"}
              size="sm"
              onClick={() => setActiveTool("dropPano")}
              title="Drop panorama markers"
            >
              <MapPin className="h-4 w-4 mr-1" />
              Drop Pano
            </Button>
            
            <div className="h-6 w-px bg-border mx-2" />
            
            <Button
              size="sm"
              variant={snapToGrid ? "default" : "outline"}
              onClick={() => setSnapToGrid(!snapToGrid)}
              title="Toggle grid snapping"
            >
              <Grid3X3 className="h-4 w-4" />
            </Button>
            {snapToGrid && (
              <Select value={gridSize.toString()} onValueChange={(v) => setGridSize(parseInt(v))}>
                <SelectTrigger className="w-20">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="10">10px</SelectItem>
                  <SelectItem value="25">25px</SelectItem>
                  <SelectItem value="50">50px</SelectItem>
                </SelectContent>
              </Select>
            )}
          </div>
          
          <div className="flex items-center gap-2">
            <Badge variant={unsavedChanges ? "destructive" : "secondary"}>
              {unsavedChanges ? "Unsaved" : "Saved"}
            </Badge>
            <Button onClick={() => setUnsavedChanges(false)} disabled={!unsavedChanges}>
              <Save className="h-4 w-4 mr-1" />
              Save
            </Button>
          </div>
        </div>

        {/* Canvas Area */}
        <div className="flex-1 relative min-h-0">
          <FloorPlanCanvas
            floorPlan={floorPlan}
            activeTool={activeTool}
            roomPolygons={roomPolygons}
            panoMarkers={panoMarkers}
            onAddPolygon={handleAddPolygon}
            onAddPanoMarker={handleAddPanoMarker}
            onRoomClick={handleRoomClick}
            onPanoClick={handlePanoClick}
            onUpdatePolygon={handleUpdatePolygon}
            snapToGrid={snapToGrid}
            gridSize={gridSize}
          />
        </div>
      </div>

      {/* Right Panel */}
      <div className="w-96 border-l bg-background flex flex-col min-h-0">
        {showPanoViewer ? (
          <div className="flex-1 flex flex-col min-h-0">
            <div className="p-4 border-b flex items-center justify-between">
              <h3 className="font-semibold">Panorama Viewer</h3>
              <Button variant="ghost" size="sm" onClick={() => setShowPanoViewer(false)}>
                ✕
              </Button>
            </div>
            <div className="flex-1 bg-muted flex items-center justify-center min-h-0">
              <p className="text-muted-foreground">Panorama viewer for {currentPanoId}</p>
            </div>
          </div>
        ) : (
          <div className="p-4 space-y-4 overflow-y-auto min-h-0">
            {activeTool === "draw" && (
              <div>
                <Label htmlFor="room-select">Room to Assign</Label>
                <Select value={selectedRoomId} onValueChange={setSelectedRoomId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select room for polygon" />
                  </SelectTrigger>
                  <SelectContent>
                    {rooms.map(room => (
                      <SelectItem key={room.id} value={room.id}>
                        {room.id}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground mt-1">
                  Click to place vertices, double-click to close
                </p>
              </div>
            )}

            <div>
              <h4 className="font-medium mb-2">
                {activeTool === "dropPano" ? "Select Panorama to Place" : "Available Panoramas"}
              </h4>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {panoramas.map(pano => (
                  <div key={pano.nodeId} className="flex items-center justify-between p-2 border rounded">
                    <div className="flex flex-col">
                      <span className="text-sm font-medium">{pano.title || pano.nodeId}</span>
                      <span className="text-xs text-muted-foreground">{pano.floor}</span>
                    </div>
                    <Button
                      size="sm"
                      variant={selectedPanoId === pano.nodeId ? "default" : "outline"}
                      onClick={() => {
                        setSelectedPanoId(pano.nodeId);
                        if (activeTool !== "dropPano") {
                          setActiveTool("dropPano");
                        }
                      }}
                    >
                      {selectedPanoId === pano.nodeId ? "Selected" : "Select"}
                    </Button>
                  </div>
                ))}
              </div>
              {selectedPanoId && activeTool === "dropPano" && (
                <p className="text-xs text-blue-600 mt-2 p-2 bg-blue-50 rounded">
                  📍 Click on floor plan to place {panoramas.find(p => p.nodeId === selectedPanoId)?.title}
                </p>
              )}
            </div>

            <div>
              <Button onClick={autoAssignPanoramas} className="w-full" variant="outline">
                Auto-Assign Panoramas
              </Button>
            </div>

        <div className="space-y-2">
          <h4 className="font-medium">Room Polygons ({roomPolygons.length})</h4>
          {roomPolygons.map(polygon => (
            <div key={polygon.id} className="flex items-center justify-between p-2 border rounded">
              <div className="flex items-center gap-2">
                <div 
                  className="w-3 h-3 rounded-full" 
                  style={{ backgroundColor: polygon.color }}
                />
                <span className="text-sm">{polygon.roomId}</span>
              </div>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => handleDeletePolygon(polygon.id)}
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
          ))}
        </div>

        <div className="space-y-2">
          <h4 className="font-medium">Panorama Markers ({panoMarkers.length})</h4>
          {panoMarkers.map(marker => (
            <div key={marker.id} className="flex items-center justify-between p-2 border rounded">
              <div className="flex flex-col">
                <span className="text-sm font-medium">{marker.panoData?.title || marker.panoId}</span>
                {marker.roomId && (
                  <span className="text-xs text-muted-foreground">Room: {marker.roomId}</span>
                )}
              </div>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => handleDeleteMarker(marker.id)}
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
          ))}
        </div>

        <div className="space-y-2">
          <h4 className="font-medium">Legend</h4>
          <div className="space-y-1 text-xs">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded bg-green-500" />
              <span>Complete Data</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded bg-amber-500" />
              <span>Incomplete Data</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded bg-red-500" />
              <span>Missing Data</span>
            </div>
          </div>
        </div>
          </div>
        )}
      </div>

      {/* Polygon Confirmation Modal */}
      {showPolygonConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-background p-6 rounded-lg border max-w-md">
            <h3 className="font-semibold mb-4">Close Polygon</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Polygon closed with {pendingPolygon.length} vertices. 
              {selectedRoomId ? ` Assign to room ${selectedRoomId}?` : " Please select a room to assign this polygon."}
            </p>
            
            {!selectedRoomId && (
              <div className="mb-4">
                <Label>Select Room</Label>
                <Select value={selectedRoomId} onValueChange={setSelectedRoomId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose room" />
                  </SelectTrigger>
                  <SelectContent>
                    {rooms.map(room => (
                      <SelectItem key={room.id} value={room.id}>
                        {room.id}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={cancelPolygon}>
                Cancel
              </Button>
              <Button onClick={confirmPolygon} disabled={!selectedRoomId}>
                Assign to Room
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};