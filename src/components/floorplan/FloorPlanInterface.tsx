import { useState, useRef, useCallback } from "react";
import { Upload, Square, MapPin, Save, Trash2, ZoomIn, ZoomOut, RotateCcw } from "lucide-react";
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
  const [activeTool, setActiveTool] = useState<"select" | "polygon" | "rectangle" | "pano">("select");
  const [roomPolygons, setRoomPolygons] = useState<RoomPolygon[]>([]);
  const [panoMarkers, setPanoMarkers] = useState<PanoMarker[]>([]);
  const [selectedRoomId, setSelectedRoomId] = useState<string>("");
  const [selectedPanoId, setSelectedPanoId] = useState<string>("");
  const [isUploading, setIsUploading] = useState(false);
  
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
      // Dynamic import to handle PDF.js
      const pdfjsLib = await import('pdfjs-dist');
      
      // Set worker path
      pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;
      
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      const page = await pdf.getPage(1); // Get first page
      
      const viewport = page.getViewport({ scale: 2.0 });
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');
      
      if (!context) throw new Error("Could not get canvas context");
      
      canvas.height = viewport.height;
      canvas.width = viewport.width;
      
      await page.render({
        canvasContext: context,
        viewport: viewport,
        canvas: canvas
      }).promise;
      
      return canvas.toDataURL('image/png');
    } catch (error) {
      console.error("PDF conversion error:", error);
      throw new Error("Failed to convert PDF to image");
    }
  };

  const handleAddPolygon = useCallback((points: { x: number; y: number }[]) => {
    if (!selectedRoomId) {
      toast.error("Please select a room to assign this polygon");
      return;
    }

    const roomData = rooms.find(r => r.id === selectedRoomId);
    const newPolygon: RoomPolygon = {
      id: `polygon_${Date.now()}`,
      roomId: selectedRoomId,
      points,
      color: getStatusColor(roomData),
      roomData
    };

    setRoomPolygons(prev => [...prev, newPolygon]);
    toast.success(`Room polygon created for ${roomData?.id || selectedRoomId}`);
  }, [selectedRoomId, rooms]);

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
    toast.success(`Panorama marker placed${assignedRoomId ? ` in room ${assignedRoomId}` : ""}`);
  }, [selectedPanoId, panoramas, roomPolygons]);

  const handleRoomClick = useCallback((roomId: string) => {
    onRoomSelect?.(roomId);
    toast.info(`Opened room ${roomId}`);
  }, [onRoomSelect]);

  const handlePanoClick = useCallback((panoId: string) => {
    onPanoSelect?.(panoId);
    toast.info(`Opened panorama ${panoId}`);
  }, [onPanoSelect]);

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
      {/* Tools Panel */}
      <div className="w-80 border-r bg-background p-4 space-y-4 overflow-y-auto">
        <div>
          <h3 className="font-semibold mb-2">Floor Plan Tools</h3>
          <div className="grid grid-cols-2 gap-2">
            <Button
              variant={activeTool === "select" ? "default" : "outline"}
              size="sm"
              onClick={() => setActiveTool("select")}
            >
              Select
            </Button>
            <Button
              variant={activeTool === "polygon" ? "default" : "outline"}
              size="sm"
              onClick={() => setActiveTool("polygon")}
            >
              ⬟ Polygon
            </Button>
            <Button
              variant={activeTool === "rectangle" ? "default" : "outline"}
              size="sm"
              onClick={() => setActiveTool("rectangle")}
            >
              <Square className="h-4 w-4 mr-1" />
              Rectangle
            </Button>
            <Button
              variant={activeTool === "pano" ? "default" : "outline"}
              size="sm"
              onClick={() => setActiveTool("pano")}
            >
              <MapPin className="h-4 w-4 mr-1" />
              Panorama
            </Button>
          </div>
        </div>

        {activeTool === "polygon" || activeTool === "rectangle" ? (
          <div>
            <Label htmlFor="room-select">Assign to Room</Label>
            <Select value={selectedRoomId} onValueChange={setSelectedRoomId}>
              <SelectTrigger>
                <SelectValue placeholder="Select room" />
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
        ) : null}

        {activeTool === "pano" ? (
          <div>
            <Label htmlFor="pano-select">Select Panorama</Label>
            <Select value={selectedPanoId} onValueChange={setSelectedPanoId}>
              <SelectTrigger>
                <SelectValue placeholder="Select panorama" />
              </SelectTrigger>
              <SelectContent>
                {panoramas.map(pano => (
                  <SelectItem key={pano.nodeId} value={pano.nodeId}>
                    {pano.title || pano.nodeId}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ) : null}

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

      {/* Canvas Area */}
      <div className="flex-1">
        <FloorPlanCanvas
          floorPlan={floorPlan}
          activeTool={activeTool}
          roomPolygons={roomPolygons}
          panoMarkers={panoMarkers}
          onAddPolygon={handleAddPolygon}
          onAddPanoMarker={handleAddPanoMarker}
          onRoomClick={handleRoomClick}
          onPanoClick={handlePanoClick}
        />
      </div>
    </div>
  );
};