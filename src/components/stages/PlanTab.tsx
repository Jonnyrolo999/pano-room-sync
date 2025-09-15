import { useState } from "react";
import { FloorPlanUploader } from "@/components/editor/FloorPlanUploader";
import { FloorPlanCanvas } from "@/components/floorplan/FloorPlanCanvas";
import { CalibrationTool } from "@/components/measure/CalibrationTool";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FileImage, Upload, Settings, Info } from "lucide-react";
import { useBuildingStore } from "@/stores/buildingStore";
import { useFloorplanStore } from "@/stores/floorplanStore";
import { toast } from "sonner";
import { FloorPlanStatusPanel } from "@/components/floorplan/FloorPlanStatusPanel";

export const PlanTab = () => {
  const { getActiveFloor, updateFloor } = useBuildingStore();
  const { rooms, panos } = useFloorplanStore();
  const [showUploader, setShowUploader] = useState(false);
  const [isCalibrating, setIsCalibrating] = useState(false);
  const [calibrationPoints, setCalibrationPoints] = useState<{
    p1: { x: number; y: number };
    p2: { x: number; y: number };
    pxLength: number;
  } | null>(null);
  const activeFloor = getActiveFloor();

  const hasFloorPlan = activeFloor?.planImageUrl;

  // Handle calibration
  const handleToggleCalibration = () => {
    setIsCalibrating(!isCalibrating);
    setCalibrationPoints(null);
  };

  const handleCanvasClick = (point: { x: number; y: number }) => {
    if (!isCalibrating) return;
    
    if (!calibrationPoints) {
      // First point
      setCalibrationPoints({
        p1: point,
        p2: point,
        pxLength: 0
      });
    } else if (calibrationPoints.pxLength === 0) {
      // Second point - calculate distance
      const dx = point.x - calibrationPoints.p1.x;
      const dy = point.y - calibrationPoints.p1.y;
      const pxLength = Math.sqrt(dx * dx + dy * dy);
      
      setCalibrationPoints({
        ...calibrationPoints,
        p2: point,
        pxLength
      });
    }
  };

  const handleCompleteCalibration = (distance: number, unit: 'meters' | 'feet') => {
    if (!calibrationPoints || !activeFloor) return;
    
    // Convert to meters if needed
    const distanceInMeters = unit === 'feet' ? distance / 3.28084 : distance;
    const pixelsPerMeter = calibrationPoints.pxLength / distanceInMeters;
    
    const calibrationJson = {
      pixelsPerMeter,
      metersPerPixel: 1 / pixelsPerMeter,
      segments: [{
        p1: calibrationPoints.p1,
        p2: calibrationPoints.p2,
        pxLength: calibrationPoints.pxLength,
        meters: distanceInMeters,
        unit
      }],
      rotation: activeFloor.calibrationJson?.rotation || 0,
      originX: activeFloor.calibrationJson?.originX || 0,
      originY: activeFloor.calibrationJson?.originY || 0
    };
    
    updateFloor(activeFloor.id, { calibrationJson });
    setIsCalibrating(false);
    setCalibrationPoints(null);
    toast.success(`Scale calibrated: ${pixelsPerMeter.toFixed(2)} px/m`);
  };

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
            onCanvasClick={handleCanvasClick}
            snapToGrid={false}
            gridSize={20}
            interactionFilter="both"
            selectedRoomId=""
            selectedPanoId=""
            hoveredItemId=""
            onHoverItem={() => {}}
            calibrationPoints={calibrationPoints}
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
        {hasFloorPlan && activeFloor && (
          <FloorPlanStatusPanel
            projectId={`${activeFloor.buildingId || 'default'}:${activeFloor.id}`}
            widthPx={activeFloor.widthPx}
            heightPx={activeFloor.heightPx}
            dpi={activeFloor.dpi}
            onReplacePlan={() => setShowUploader(true)}
            onCalibrate={handleToggleCalibration}
          />
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

          {/* Calibration Tool */}
          {hasFloorPlan && (
            <CalibrationTool
              isActive={isCalibrating}
              onToggle={handleToggleCalibration}
              currentCalibration={calibrationPoints}
              onCompleteCalibration={handleCompleteCalibration}
            />
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

    </div>
  );
};