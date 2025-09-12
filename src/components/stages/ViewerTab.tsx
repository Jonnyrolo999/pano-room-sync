import { useState } from "react";
import { FloorPlanCanvas } from "@/components/floorplan/FloorPlanCanvas";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Eye, 
  Maximize2, 
  Camera, 
  Grid3X3, 
  Share, 
  MapPin,
  Clock,
  Tag
} from "lucide-react";
import { useBuildingStore } from "@/stores/buildingStore";
import { useFloorplanStore } from "@/stores/floorplanStore";

export const ViewerTab = () => {
  const { getActiveFloor } = useBuildingStore();
  const { rooms, panos } = useFloorplanStore();
  const activeFloor = getActiveFloor();
  
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);
  const [selectedPanoId, setSelectedPanoId] = useState<string | null>(null);
  const [hoveredItemId, setHoveredItemId] = useState("");

  // Prepare floor plan data for canvas (read-only)
  const floorPlan = activeFloor ? {
    id: activeFloor.id,
    buildingName: "Demo Building",
    floorName: activeFloor.name,
    imagePath: activeFloor.planImageUrl || "/placeholder.svg",
    scale: 1
  } : null;

  // Convert rooms to polygons (faint, read-only)
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
    x: Number((pano as any).metadataJson?.canvasX ?? 0),
    y: Number((pano as any).metadataJson?.canvasY ?? 0),
    roomId: pano.roomId,
    panoData: pano
  }));

  const handleRoomClick = (roomId: string) => {
    setSelectedRoomId(roomId === selectedRoomId ? null : roomId);
    // Filter panos to show only those in selected room
    if (roomId) {
      const roomPanos = panos.filter(p => p.roomId === roomId);
      if (roomPanos.length > 0) {
        setSelectedPanoId(roomPanos[0].id);
      }
    }
  };

  const handlePanoClick = (panoId: string) => {
    setSelectedPanoId(panoId === selectedPanoId ? null : panoId);
  };

  const selectedRoom = selectedRoomId ? rooms.find(r => r.id === selectedRoomId) : null;
  const selectedPano = selectedPanoId ? panos.find(p => p.id === selectedPanoId) : null;
  const roomPanos = selectedRoomId ? panos.filter(p => p.roomId === selectedRoomId) : [];

  const handleDeepLink = () => {
    const params = new URLSearchParams();
    if (activeFloor?.buildingId) params.set('building', activeFloor.buildingId);
    if (activeFloor?.id) params.set('floor', activeFloor.id);
    if (selectedRoomId) params.set('room', selectedRoomId);
    if (selectedPanoId) params.set('pano', selectedPanoId);
    
    const url = `${window.location.origin}/?${params.toString()}`;
    navigator.clipboard.writeText(url);
    // TODO: Show toast
  };

  if (!activeFloor) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center text-muted-foreground">
          <Eye className="h-16 w-16 mx-auto mb-4 opacity-50" />
          <h3 className="text-lg font-medium mb-2">No Floor Selected</h3>
          <p>Please select or add a floor to view the results.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex">
      {/* Main Viewer Area */}
      <div className="flex-1 flex flex-col">
        {/* Floor Map */}
        <div className="flex-1 relative">
          {floorPlan ? (
            <FloorPlanCanvas
              floorPlan={floorPlan}
              activeTool="select"
              roomPolygons={roomPolygons}
              panoMarkers={panoMarkers}
              onAddPolygon={() => {}} // Read-only
              onAddPanoMarker={() => {}} // Read-only
              onRoomClick={handleRoomClick}
              onPanoClick={handlePanoClick}
              onUpdatePolygon={() => {}} // Read-only
              snapToGrid={false}
              gridSize={20}
              interactionFilter="both"
              selectedRoomId={selectedRoomId || ""}
              selectedPanoId={selectedPanoId || ""}
              hoveredItemId={hoveredItemId}
              onHoverItem={setHoveredItemId}
            />
          ) : (
            <div className="h-full flex items-center justify-center bg-muted/10">
              <div className="text-center">
                <Eye className="h-24 w-24 mx-auto mb-6 text-muted-foreground/50" />
                <h3 className="text-2xl font-semibold mb-3">No Floor Plan</h3>
                <p className="text-muted-foreground">
                  No floor plan available for viewing. Upload one in the Plan tab.
                </p>
              </div>
            </div>
          )}

          {/* Navigation Info Overlay */}
          <div className="absolute top-4 left-4 z-10">
            <Card className="w-80">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Eye className="h-4 w-4" />
                    Navigation
                  </CardTitle>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={handleDeepLink}
                    className="gap-1"
                  >
                    <Share className="h-3 w-3" />
                    Share Link
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <div className="text-muted-foreground">Rooms</div>
                    <div className="font-medium">{rooms.length}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">Panoramas</div>
                    <div className="font-medium">{panos.length}</div>
                  </div>
                </div>

                {(selectedRoom || selectedPano) && (
                  <div className="space-y-2">
                    {selectedRoom && (
                      <Badge className="gap-1">
                        <Grid3X3 className="h-3 w-3" />
                        Room: {selectedRoom.name}
                      </Badge>
                    )}
                    {selectedPano && (
                      <Badge variant="secondary" className="gap-1">
                        <Camera className="h-3 w-3" />
                        {selectedPano.title}
                      </Badge>
                    )}
                  </div>
                )}
                
                <div className="text-xs text-muted-foreground">
                  Click rooms and panoramas to explore. Use the panels on the right for detailed information.
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* 360° Viewer (Bottom Panel) */}
        {selectedPano && (
          <div className="h-80 border-t bg-card p-4">
            <div className="h-full relative bg-muted rounded-lg overflow-hidden">
              {/* Placeholder for 360° viewer */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center">
                  <Camera className="h-16 w-16 mx-auto mb-4 text-muted-foreground/50" />
                  <h3 className="text-lg font-semibold mb-2">{selectedPano.title}</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    360° Panorama Viewer
                  </p>
                  <div className="flex items-center justify-center gap-2">
                    <Button variant="outline" size="sm" className="gap-1">
                      <Maximize2 className="h-3 w-3" />
                      Fullscreen
                    </Button>
                    <Button variant="outline" size="sm" className="gap-1">
                      <Share className="h-3 w-3" />
                      Share
                    </Button>
                  </div>
                </div>
              </div>
              
              {/* TODO: Integrate Pannellum or Marzipano here */}
                  <img 
                    src={selectedPano.imageUrl || '/placeholder.svg'} 
                    alt={selectedPano.title}
                    className="w-full h-full object-cover opacity-30"
                  />
            </div>
          </div>
        )}
      </div>

      {/* Right Panel - Context Information */}
      <div className="w-80 border-l bg-card flex flex-col">
        <div className="p-4 border-b">
          <h3 className="font-semibold text-lg mb-1">Details</h3>
          <p className="text-sm text-muted-foreground">
            Information about selected items
          </p>
        </div>

        <div className="flex-1 overflow-auto p-4 space-y-4">
          {/* Room Information */}
          {selectedRoom ? (
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Grid3X3 className="h-4 w-4" />
                  Room Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <div className="text-sm text-muted-foreground">Name</div>
                  <div className="font-medium">{selectedRoom.name}</div>
                </div>

                <div>
                  <div className="text-sm text-muted-foreground">Room ID</div>
                  <div className="font-medium">{selectedRoom.id}</div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <div className="text-sm text-muted-foreground">Area</div>
                    <div className="font-medium">
                      {/* TODO: Calculate from polygon */}
                      {selectedRoom.polygon.length > 0 ? '125.4 m²' : 'N/A'}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">Perimeter</div>
                    <div className="font-medium">
                      {selectedRoom.polygon.length > 0 ? '45.2 m' : 'N/A'}
                    </div>
                  </div>
                </div>

                <div>
                  <div className="text-sm text-muted-foreground">Panoramas</div>
                  <div className="font-medium">{roomPanos.length} assigned</div>
                </div>

                {/* Room Panos List */}
                {roomPanos.length > 0 && (
                  <div className="space-y-1">
                    <div className="text-sm text-muted-foreground">Panoramas in this room:</div>
                    {roomPanos.map(pano => (
                      <Button
                        key={pano.id}
                        variant={selectedPanoId === pano.id ? "default" : "ghost"}
                        size="sm"
                        className="w-full justify-start gap-2"
                        onClick={() => setSelectedPanoId(pano.id)}
                      >
                        <Camera className="h-3 w-3" />
                        {pano.title}
                      </Button>
                    ))}
                  </div>
                )}

                {/* Room Properties */}
                {selectedRoom.propertiesJson && Object.keys(selectedRoom.propertiesJson).length > 0 && (
                  <div>
                    <div className="text-sm text-muted-foreground mb-2">Properties</div>
                    <div className="space-y-1 text-xs">
                      {Object.entries(selectedRoom.propertiesJson).map(([key, value]) => (
                        <div key={key} className="flex justify-between">
                          <span className="text-muted-foreground">{key}:</span>
                          <span>{String(value)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="text-center py-8">
                <Grid3X3 className="h-12 w-12 mx-auto mb-3 text-muted-foreground/50" />
                <div className="text-sm text-muted-foreground">
                  Click on a room to view details
                </div>
              </CardContent>
            </Card>
          )}

          {/* Panorama Information */}
          {selectedPano ? (
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Camera className="h-4 w-4" />
                  Panorama Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <div className="text-sm text-muted-foreground">Title</div>
                  <div className="font-medium">{selectedPano.title}</div>
                </div>

                <div>
                  <div className="text-sm text-muted-foreground">Node ID</div>
                  <div className="font-medium text-xs">{selectedPano.nodeId}</div>
                </div>

                {selectedPano.capturedAt && (
                  <div className="flex items-center gap-2">
                    <Clock className="h-3 w-3 text-muted-foreground" />
                    <div>
                      <div className="text-sm text-muted-foreground">Captured</div>
                      <div className="text-sm font-medium">
                        {selectedPano.capturedAt.toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                )}

                {selectedPano.roomId && (
                  <div className="flex items-center gap-2">
                    <MapPin className="h-3 w-3 text-muted-foreground" />
                    <div>
                      <div className="text-sm text-muted-foreground">Located in</div>
                      <div className="text-sm font-medium">
                        {rooms.find(r => r.id === selectedPano.roomId)?.name || selectedPano.roomId}
                      </div>
                    </div>
                  </div>
                )}

                {/* Metadata */}
                {selectedPano.metadataJson && Object.keys(selectedPano.metadataJson).length > 0 && (
                  <div>
                    <div className="text-sm text-muted-foreground mb-2 flex items-center gap-1">
                      <Tag className="h-3 w-3" />
                      Metadata
                    </div>
                    <div className="space-y-1 text-xs">
                      {Object.entries(selectedPano.metadataJson).map(([key, value]) => (
                        <div key={key} className="flex justify-between">
                          <span className="text-muted-foreground">{key}:</span>
                          <span className="truncate ml-2">{String(value)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="text-center py-8">
                <Camera className="h-12 w-12 mx-auto mb-3 text-muted-foreground/50" />
                <div className="text-sm text-muted-foreground">
                  Click on a panorama to view details
                </div>
              </CardContent>
            </Card>
          )}

          {/* Navigation Help */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Navigation Tips</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground space-y-2">
              <p>• Click rooms to see assigned panoramas</p>
              <p>• Click panorama pins to view 360° images</p>
              <p>• Use Share Link to create bookmarks</p>
              <p>• All data is read-only in viewer mode</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};