import { useState } from "react";
import { FloorPlanUploader } from "@/components/editor/FloorPlanUploader";
import { FloorPlanCanvas } from "@/components/floorplan/FloorPlanCanvas";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { FileImage, Upload, Settings, Info } from "lucide-react";
import { useBuildingStore } from "@/stores/buildingStore";
import { useFloorplanStore } from "@/stores/floorplanStore";
import { toast } from "sonner";
import { toast } from "sonner";

export const PlanTab = () => {
  const { getActiveFloor, updateFloor } = useBuildingStore();
  const { rooms, panos } = useFloorplanStore();
  const [showUploader, setShowUploader] = useState(false);
  const [showCalibrate, setShowCalibrate] = useState(false);
  const [pixelsPerMeter, setPixelsPerMeter] = useState<number>(1);
  const activeFloor = getActiveFloor();

  const hasFloorPlan = activeFloor?.planImageUrl;

  // Prepare floor plan data for canvas
  const floorPlan = activeFloor ? {
    id: activeFloor.id,
    buildingName: "Demo Building",
    floorName: activeFloor.name,
    imagePath: activeFloor.planImageUrl || "",
    scale: 1
  } : null;

  // Convert rooms to polygons for display (read-only on plan tab)
  const roomPolygons = rooms.map(room => ({
    id: room.id,
    roomId: room.id,
    points: room.polygon.map(([x, y]) => ({ x, y })),
    color: "#93c5fd",
    roomData: room
  }));

  const panoMarkers = panos.map(pano => ({
    id: pano.id,
    panoId: pano.id,
    x: Number((pano as any).metadataJson?.canvasX ?? 0),
    y: Number((pano as any).metadataJson?.canvasY ?? 0),
    roomId: pano.roomId,
    panoData: pano
  }));

  if (!activeFloor) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center text-muted-foreground">
          <FileImage className="h-16 w-16 mx-auto mb-4 opacity-50" />
          <h3 className="text-lg font-medium mb-2">No Floor Selected</h3>
          <p>Please select or add a floor to begin.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex">
      {/* Main Canvas Area */}
      <div className="flex-1 relative">
        {floorPlan && hasFloorPlan ? (
          <FloorPlanCanvas
            floorPlan={floorPlan}
            activeTool="select"
            roomPolygons={roomPolygons}
            panoMarkers={panoMarkers}
            onAddPolygon={() => {}}
            onAddPanoMarker={() => {}}
            onRoomClick={() => {}}
            onPanoClick={() => {}}
            onUpdatePolygon={() => {}}
            snapToGrid={false}
            gridSize={20}
            interactionFilter="both"
            selectedRoomId=""
            selectedPanoId=""
            hoveredItemId=""
            onHoverItem={() => {}}
          />
        ) : (
          <div className="h-full flex items-center justify-center bg-muted/10">
            <div className="text-center">
              <FileImage className="h-24 w-24 mx-auto mb-6 text-muted-foreground/50" />
              <h3 className="text-2xl font-semibold mb-3">No Floor Plan</h3>
              <p className="text-muted-foreground mb-6 max-w-md">
                Upload a floor plan (PDF or image) to get started. This will serve as the base layer for drawing rooms and placing panoramas.
              </p>
              <Button 
                size="lg" 
                onClick={() => setShowUploader(true)}
                className="gap-2"
              >
                <Upload className="h-5 w-5" />
                Upload Floor Plan
              </Button>
            </div>
          </div>
        )}

        {/* Floor Plan Status Overlay */}
        {hasFloorPlan && (
          <div className="absolute top-4 left-4 z-10">
            <Card className="w-80">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <FileImage className="h-4 w-4" />
                    Floor Plan Status
                  </CardTitle>
                  <Badge variant="secondary" className="text-xs">
                    Active
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <div className="text-muted-foreground">Dimensions</div>
                    <div className="font-medium">
                      {activeFloor.widthPx || "Auto"} × {activeFloor.heightPx || "Auto"}
                    </div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">DPI</div>
                    <div className="font-medium">{activeFloor.dpi || "Default"}</div>
                  </div>
                </div>
                
                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => setShowUploader(true)}
                    className="gap-1"
                  >
                    <Upload className="h-3 w-3" />
                    Replace Plan
                  </Button>
                  <Button variant="outline" size="sm" className="gap-1" onClick={() => { setPixelsPerMeter(activeFloor?.calibrationJson?.pixelsPerMeter || 1); setShowCalibrate(true); }}>
                    <Settings className="h-3 w-3" />
                    Calibrate
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>

      {/* Right Panel - Plan Tools */}
      <div className="w-80 border-l bg-card flex flex-col">
        <div className="p-4 border-b">
          <h3 className="font-semibold text-lg mb-1">Floor Plan</h3>
          <p className="text-sm text-muted-foreground">
            Manage and configure your floor plan
          </p>
        </div>

        <div className="flex-1 overflow-auto p-4 space-y-4">
          {/* Upload Section */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Upload & Replace</CardTitle>
              <CardDescription>
                Add or replace the floor plan with PDF or image files
              </CardDescription>
            </CardHeader>
            <CardContent>
              <FloorPlanUploader />
            </CardContent>
          </Card>

          {/* Configuration */}
          {hasFloorPlan && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Configuration</CardTitle>
                <CardDescription>
                  Calibrate scale and adjust settings
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button variant="outline" className="w-full justify-start gap-2" onClick={() => { setPixelsPerMeter(activeFloor?.calibrationJson?.pixelsPerMeter || 1); setShowCalibrate(true); }}>
                  <Settings className="h-4 w-4" />
                  Calibrate Scale
                </Button>
                <div className="text-xs text-muted-foreground">
                  Set two points with known distance to establish accurate measurements
                </div>
              </CardContent>
            </Card>
          )}

          {/* Info */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Info className="h-4 w-4" />
                Tips
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground space-y-2">
              <p>• PDF files will be converted to images automatically</p>
              <p>• Use high-resolution images for best quality</p>
              <p>• Calibrate scale for accurate room measurements</p>
              <p>• Supported formats: PDF, PNG, JPG, WEBP</p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Upload Modal */}
      {showUploader && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-card rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">Upload Floor Plan</h3>
            <FloorPlanUploader />
            <Button 
              variant="outline" 
              onClick={() => setShowUploader(false)}
              className="mt-4 w-full"
            >
              Close
            </Button>
          </div>
        </div>
      )}

      {/* Calibrate Modal */}
      {showCalibrate && activeFloor && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-card rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-2">Calibrate Scale</h3>
            <p className="text-sm text-muted-foreground mb-4">Set pixels per meter for accurate measurements.</p>
            <div className="space-y-2">
              <label className="text-sm">Pixels per meter</label>
              <Input type="number" step="0.01" value={pixelsPerMeter} onChange={(e) => setPixelsPerMeter(parseFloat(e.target.value) || 1)} />
            </div>
            <div className="flex gap-2 mt-4">
              <Button 
                className="flex-1" 
                onClick={() => {
                  updateFloor(activeFloor.id, { calibrationJson: { ...(activeFloor.calibrationJson || { rotation: 0, originX: 0, originY: 0 }), pixelsPerMeter } });
                  toast.success('Calibration saved');
                  setShowCalibrate(false);
                }}
              >
                Save
              </Button>
              <Button variant="outline" className="flex-1" onClick={() => setShowCalibrate(false)}>Cancel</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};