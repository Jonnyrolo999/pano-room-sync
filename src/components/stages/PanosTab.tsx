import { useState, useRef } from "react";
import { FloorPlanCanvas } from "@/components/floorplan/FloorPlanCanvas";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Camera, 
  Upload, 
  Search, 
  MapPin, 
  Link2,
  Filter,
  Grid3X3
} from "lucide-react";
import { useBuildingStore } from "@/stores/buildingStore";
import { useFloorplanStore } from "@/stores/floorplanStore";
import { toast } from "sonner";

export const PanosTab = () => {
  const { getActiveFloor } = useBuildingStore();
  const { 
    rooms, 
    panos, 
    setPanos,
    mode, 
    setMode,
    selectedRoomId,
    setSelectedRoom,
    selectedPanoId,
    setSelectedPano,
    assignPanoToRoom,
    unassignPano,
    getUnassignedPanos
  } = useFloorplanStore();
  
  const activeFloor = getActiveFloor();
  const panoInputRef = useRef<HTMLInputElement>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [uploading, setUploading] = useState(false);
  const [hoveredItemId, setHoveredItemId] = useState("");
  const [showUnassignedOnly, setShowUnassignedOnly] = useState(false);

  // Prepare floor plan data for canvas
  const floorPlan = activeFloor ? {
    id: activeFloor.id,
    buildingName: "Demo Building",
    floorName: activeFloor.name,
    imagePath: activeFloor.planImageUrl || "/placeholder.svg",
    scale: 1
  } : null;

  // Convert rooms to polygons (faint when panos-only)
  const roomPolygons = rooms.map(room => ({
    id: room.id,
    roomId: room.id,
    points: room.polygon.map(([x, y]) => ({ x, y })),
    color: "#93c5fd",
    roomData: room
  }));

  // Convert panos to markers
  const panoMarkers = panos.map(pano => ({
    id: pano.id,
    panoId: pano.id,
    x: Math.random() * 800 + 100, // TODO: Use actual coordinates from pano metadata
    y: Math.random() * 600 + 100,
    roomId: pano.roomId,
    panoData: pano
  }));

  const handlePanoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    
    try {
      // Simulate upload process
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        
        // Create mock pano object
        const newPano = {
          id: `pano-${Date.now()}-${i}`,
          buildingId: activeFloor?.buildingId || 'building-1',
          floorId: activeFloor?.id,
          nodeId: `node-${Date.now()}-${i}`,
          title: file.name.replace(/\.[^/.]+$/, ""), // Remove extension
          fileUrl: URL.createObjectURL(file), // Temporary URL for demo
          imageUrl: URL.createObjectURL(file),
          capturedAt: new Date(),
          metadataJson: {
            filename: file.name,
            size: file.size,
            type: file.type
          },
          createdAt: new Date(),
          updatedAt: new Date()
        };

        // Add to store
        setPanos([...panos, newPano]);
      }

      toast.success(`Uploaded ${files.length} panorama(s) successfully`);
    } catch (error) {
      console.error("Upload failed:", error);
      toast.error("Failed to upload panoramas");
    } finally {
      setUploading(false);
      if (panoInputRef.current) {
        panoInputRef.current.value = '';
      }
    }
  };

  const handleAddPanoMarker = (x: number, y: number) => {
    if (mode === 'dropPano') {
      // TODO: Place selected pano at coordinates
      console.log("Drop pano at:", x, y);
      toast.success("Panorama placed on floor plan");
    }
  };

  const handlePanoClick = (panoId: string) => {
    setSelectedPano(panoId === selectedPanoId ? null : panoId);
  };

  const handleRoomClick = (roomId: string) => {
    setSelectedRoom(roomId === selectedRoomId ? null : roomId);
  };

  const handleAssignToRoom = (panoId: string) => {
    if (selectedRoomId) {
      assignPanoToRoom(panoId, selectedRoomId);
      toast.success("Panorama assigned to room");
    } else {
      toast.error("Please select a room first");
    }
  };

  const unassignedPanos = getUnassignedPanos();
  const displayPanos = showUnassignedOnly ? unassignedPanos : panos;
  const filteredPanos = displayPanos.filter(pano => 
    pano.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    pano.nodeId.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (!activeFloor) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center text-muted-foreground">
          <Camera className="h-16 w-16 mx-auto mb-4 opacity-50" />
          <h3 className="text-lg font-medium mb-2">No Floor Selected</h3>
          <p>Please select or add a floor to manage panoramas.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex">
      {/* Main Canvas Area */}
      <div className="flex-1 relative">
        {floorPlan ? (
          <FloorPlanCanvas
            floorPlan={floorPlan}
            activeTool={mode as "select" | "draw" | "dropPano"}
            roomPolygons={roomPolygons}
            panoMarkers={panoMarkers}
            onAddPolygon={() => {}}
            onAddPanoMarker={handleAddPanoMarker}
            onRoomClick={handleRoomClick}
            onPanoClick={handlePanoClick}
            onUpdatePolygon={() => {}}
            snapToGrid={false}
            gridSize={20}
            interactionFilter="both" // Show both rooms and panos
            selectedRoomId={selectedRoomId || ""}
            selectedPanoId={selectedPanoId || ""}
            hoveredItemId={hoveredItemId}
            onHoverItem={setHoveredItemId}
          />
        ) : (
          <div className="h-full flex items-center justify-center bg-muted/10">
            <div className="text-center">
              <Camera className="h-24 w-24 mx-auto mb-6 text-muted-foreground/50" />
              <h3 className="text-2xl font-semibold mb-3">No Floor Plan</h3>
              <p className="text-muted-foreground mb-6">
                Upload a floor plan in the Plan tab first, then return here to place panoramas.
              </p>
            </div>
          </div>
        )}

        {/* Mode Status Overlay */}
        <div className="absolute top-4 left-4 z-10">
          <Card className="w-72">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Panorama Manager</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-2 text-sm">
                <div className="text-muted-foreground">Mode:</div>
                <Badge variant={mode === 'dropPano' ? 'default' : 'outline'} className="capitalize">
                  {mode === 'dropPano' ? 'Drop Pano' : 'Select'}
                </Badge>
              </div>
              
              {selectedRoomId && (
                <div className="flex items-center gap-2 text-sm">
                  <div className="text-muted-foreground">Selected Room:</div>
                  <Badge>{selectedRoomId}</Badge>
                </div>
              )}

              {selectedPanoId && (
                <div className="flex items-center gap-2 text-sm">
                  <div className="text-muted-foreground">Selected Pano:</div>
                  <Badge className="gap-1">
                    <Camera className="h-3 w-3" />
                    {panos.find(p => p.id === selectedPanoId)?.title || selectedPanoId}
                  </Badge>
                </div>
              )}

              <div className="text-xs text-muted-foreground">
                {mode === 'dropPano' 
                  ? 'Click on the floor plan to place panoramas'
                  : 'Click panoramas and rooms to select them'
                }
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Right Panel - Pano Tools */}
      <div className="w-80 border-l bg-card flex flex-col">
        <div className="p-4 border-b">
          <h3 className="font-semibold text-lg mb-1">Panoramas</h3>
          <p className="text-sm text-muted-foreground">
            Upload and manage 360° panoramas
          </p>
        </div>

        <div className="flex-1 overflow-auto p-4 space-y-4">
          {/* Upload Section */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Upload Panoramas</CardTitle>
              <CardDescription>
                Add 360° images to your floor
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button 
                onClick={() => panoInputRef.current?.click()}
                disabled={uploading}
                className="w-full gap-2"
              >
                <Upload className="h-4 w-4" />
                {uploading ? 'Uploading...' : 'Upload Panoramas'}
              </Button>
              <input
                ref={panoInputRef}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={handlePanoUpload}
              />
              <div className="text-xs text-muted-foreground mt-2">
                Supports JPG, PNG. Multiple files allowed.
              </div>
            </CardContent>
          </Card>

          {/* Mode Toggle */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Placement Mode</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button
                variant={mode === 'select' ? 'default' : 'outline'}
                className="w-full justify-start gap-2"
                onClick={() => setMode('select')}
              >
                <MapPin className="h-4 w-4" />
                Select Mode
              </Button>
              <Button
                variant={mode === 'dropPano' ? 'default' : 'outline'}
                className="w-full justify-start gap-2"
                onClick={() => setMode('dropPano')}
              >
                <Camera className="h-4 w-4" />
                Drop Pano Mode
              </Button>
            </CardContent>
          </Card>

          {/* Assignment Actions */}
          {selectedPanoId && selectedRoomId && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Quick Actions</CardTitle>
              </CardHeader>
              <CardContent>
                <Button
                  onClick={() => handleAssignToRoom(selectedPanoId)}
                  className="w-full gap-2"
                >
                  <Link2 className="h-4 w-4" />
                  Assign to Selected Room
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Panorama List */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">
                  Panoramas ({filteredPanos.length})
                </CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowUnassignedOnly(!showUnassignedOnly)}
                  className="gap-1"
                >
                  <Filter className="h-3 w-3" />
                  {showUnassignedOnly ? 'All' : 'Unassigned'}
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search panoramas..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8"
                />
              </div>

              {/* Unassigned Count */}
              {unassignedPanos.length > 0 && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Unassigned:</span>
                  <Badge variant="secondary">{unassignedPanos.length}</Badge>
                </div>
              )}

              {/* Pano List */}
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {filteredPanos.length === 0 ? (
                  <div className="text-center text-muted-foreground py-8">
                    <Camera className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <div className="text-sm">
                      {panos.length === 0 ? 'No panoramas uploaded' : 'No matches found'}
                    </div>
                  </div>
                ) : (
                  filteredPanos.map((pano) => (
                    <div
                      key={pano.id}
                      className={`
                        p-3 rounded border cursor-pointer transition-colors
                        ${selectedPanoId === pano.id 
                          ? 'bg-primary text-primary-foreground' 
                          : 'hover:bg-muted'
                        }
                      `}
                      onClick={() => handlePanoClick(pano.id)}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="text-sm font-medium truncate">
                            {pano.title}
                          </div>
                          <div className="text-xs opacity-70 mt-1">
                            {pano.nodeId}
                          </div>
                          {pano.roomId && (
                            <div className="flex items-center gap-1 mt-1">
                              <Grid3X3 className="h-3 w-3" />
                              <span className="text-xs">
                                Room: {rooms.find(r => r.id === pano.roomId)?.name || pano.roomId}
                              </span>
                            </div>
                          )}
                        </div>
                        
                        <div className="flex flex-col gap-1">
                          {!pano.roomId && (
                            <Badge variant="outline" className="text-xs">
                              Unassigned
                            </Badge>
                          )}
                          {selectedRoomId && !pano.roomId && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleAssignToRoom(pano.id);
                              }}
                              className="h-6 px-2 text-xs"
                            >
                              Assign
                            </Button>
                          )}
                          {pano.roomId && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={(e) => {
                                e.stopPropagation();
                                unassignPano(pano.id);
                                toast.success("Panorama unassigned");
                              }}
                              className="h-6 px-2 text-xs"
                            >
                              Unassign
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};