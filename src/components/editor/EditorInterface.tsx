import { FloorPlanCanvas } from "@/components/floorplan/FloorPlanCanvas";
import { ToolsPanel } from "./ToolsPanel";
import { useBuildingStore } from "@/stores/buildingStore";
import { useFloorplanStore } from "@/stores/floorplanStore";

export const EditorInterface = () => {
  const { getActiveFloor } = useBuildingStore();
  const { 
    rooms, 
    panos, 
    mode,
    preferences,
    visibilityFilter,
    selectedRoomId,
    selectedPanoId,
    setSelectedRoom,
    setSelectedPano,
    addRoom,
    updateRoom
  } = useFloorplanStore();
  
  const activeFloor = getActiveFloor();

  if (!activeFloor) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="text-lg font-medium text-muted-foreground">
            No active floor selected
          </div>
          <p className="text-sm text-muted-foreground">
            Select or create a floor to start editing
          </p>
        </div>
      </div>
    );
  }

  // Convert data to format expected by FloorPlanCanvas
  const floorPlan = {
    id: activeFloor.id,
    buildingName: "Building", // TODO: Get from building store
    floorName: activeFloor.name,
    imagePath: activeFloor.planImageUrl || "",
    scale: activeFloor.calibrationJson?.pixelsPerMeter || 1
  };

  const roomPolygons = rooms.map(room => ({
    id: room.id,
    roomId: room.id,
    points: room.polygon?.map(([x, y]) => ({ x, y })) || [],
    color: "#3b82f6",
    roomData: room
  }));

  const panoMarkers = panos
    .filter(pano => pano.floorId === activeFloor.id)
    .map(pano => ({
      id: pano.id,
      panoId: pano.nodeId,
      x: pano.metadataJson?.x || 0,
      y: pano.metadataJson?.y || 0,
      roomId: pano.roomId,
      panoData: pano
    }));

  const handleAddPolygon = (points: { x: number; y: number }[]) => {
    const newRoom = {
      id: `room-${Date.now()}`,
      floorId: activeFloor.id,
      name: `Room ${rooms.length + 1}`,
      polygon: points.map(p => [p.x, p.y] as [number, number]),
      propertiesJson: {},
      createdAt: new Date(),
      updatedAt: new Date()
    };
    addRoom(newRoom);
  };

  const handleAddPanoMarker = (x: number, y: number) => {
    console.log('Add pano marker at:', x, y);
    // TODO: Implement pano marker placement
  };

  const handleRoomClick = (roomId: string) => {
    setSelectedRoom(roomId === selectedRoomId ? null : roomId);
  };

  const handlePanoClick = (panoId: string) => {
    const pano = panos.find(p => p.nodeId === panoId);
    if (pano) {
      setSelectedPano(pano.id === selectedPanoId ? null : pano.id);
    }
  };

  const handleUpdatePolygon = (polygonId: string, points: { x: number; y: number }[]) => {
    updateRoom(polygonId, {
      polygon: points.map(p => [p.x, p.y] as [number, number])
    });
  };

  return (
    <div className="h-full flex min-h-0">
      {/* Left: Canvas */}
      <div className="flex-1 min-w-0">
        <FloorPlanCanvas
          floorPlan={floorPlan}
          activeTool={mode === 'edit' ? 'select' : mode === 'dropPano' ? 'dropPano' : mode as "select" | "draw" | "dropPano"}
          roomPolygons={roomPolygons}
          panoMarkers={panoMarkers}
          onAddPolygon={handleAddPolygon}
          onAddPanoMarker={handleAddPanoMarker}
          onRoomClick={handleRoomClick}
          onPanoClick={handlePanoClick}
          onUpdatePolygon={handleUpdatePolygon}
          snapToGrid={preferences.snap}
          gridSize={20}
          interactionFilter={visibilityFilter}
          selectedRoomId={selectedRoomId || ""}
          selectedPanoId={selectedPanoId || ""}
          hoveredItemId=""
          onHoverItem={() => {}}
        />
      </div>
      
      {/* Right: Tools & Data Panel */}
      <div className="w-80 min-w-0 border-l bg-card">
        <ToolsPanel />
      </div>
    </div>
  );
};