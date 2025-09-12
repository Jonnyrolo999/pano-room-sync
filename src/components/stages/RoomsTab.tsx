import { useState } from "react";
import { FloorPlanCanvas } from "@/components/floorplan/FloorPlanCanvas";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { 
  MousePointer2, 
  Square, 
  Edit3, 
  Grid3X3, 
  Save, 
  Undo, 
  Redo,
  Lock,
  Eye,
  EyeOff
} from "lucide-react";
import { useBuildingStore } from "@/stores/buildingStore";
import { useFloorplanStore } from "@/stores/floorplanStore";

export const RoomsTab = () => {
  const { getActiveFloor } = useBuildingStore();
  const { 
    rooms, 
    panos, 
    mode, 
    setMode, 
    preferences, 
    updatePreferences,
    selectedRoomId, 
    setSelectedRoom,
    lockedSelection,
    setLockedSelection,
    unsavedChanges,
    visibilityFilter,
    setVisibilityFilter
  } = useFloorplanStore();
  
  const activeFloor = getActiveFloor();
  const [hoveredItemId, setHoveredItemId] = useState("");

  // Prepare floor plan data for canvas
  const floorPlan = activeFloor ? {
    id: activeFloor.id,
    buildingName: "Demo Building", 
    floorName: activeFloor.name,
    imagePath: activeFloor.planImageUrl || "/placeholder.svg",
    scale: 1
  } : null;

  // Convert rooms to polygons
  const roomPolygons = rooms.map(room => ({
    id: room.id,
    roomId: room.id,
    points: room.polygon.map(([x, y]) => ({ x, y })),
    color: "#93c5fd",
    roomData: room
  }));

  // Convert panos to markers (faint when rooms-only filter)
  const panoMarkers = panos.map(pano => ({
    id: pano.id,
    panoId: pano.id,
    x: Math.random() * 800 + 100,
    y: Math.random() * 600 + 100,
    roomId: pano.roomId,
    panoData: pano
  }));

  const handleAddPolygon = (points: { x: number; y: number }[]) => {
    // TODO: Add room polygon
    console.log("Add polygon:", points);
  };

  const handleUpdatePolygon = (polygonId: string, points: { x: number; y: number }[]) => {
    // TODO: Update room polygon
    console.log("Update polygon:", polygonId, points);
  };

  const handleRoomClick = (roomId: string) => {
    if (!lockedSelection) {
      setSelectedRoom(roomId === selectedRoomId ? null : roomId);
    }
  };

  const handleSave = () => {
    // TODO: Implement save
    console.log("Saving rooms...");
  };

  const tools = [
    { id: "select", label: "Select", icon: MousePointer2, description: "Select and move rooms" },
    { id: "draw", label: "Draw", icon: Square, description: "Draw new room polygon" },
    { id: "edit", label: "Edit", icon: Edit3, description: "Edit room vertices" }
  ];

  if (!activeFloor) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center text-muted-foreground">
          <Grid3X3 className="h-16 w-16 mx-auto mb-4 opacity-50" />
          <h3 className="text-lg font-medium mb-2">No Floor Selected</h3>
          <p>Please select or add a floor to begin drawing rooms.</p>
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
            onAddPolygon={handleAddPolygon}
            onAddPanoMarker={() => {}}
            onRoomClick={handleRoomClick}
            onPanoClick={() => {}}
            onUpdatePolygon={handleUpdatePolygon}
            snapToGrid={preferences.snap}
            gridSize={20}
            interactionFilter={visibilityFilter}
            selectedRoomId={selectedRoomId || ""}
            selectedPanoId=""
            hoveredItemId={hoveredItemId}
            onHoverItem={setHoveredItemId}
          />
        ) : (
          <div className="h-full flex items-center justify-center bg-muted/10">
            <div className="text-center">
              <Grid3X3 className="h-24 w-24 mx-auto mb-6 text-muted-foreground/50" />
              <h3 className="text-2xl font-semibold mb-3">No Floor Plan</h3>
              <p className="text-muted-foreground mb-6">
                Upload a floor plan in the Plan tab first, then return here to draw rooms.
              </p>
            </div>
          </div>
        )}

        {/* Tool Status Overlay */}
        <div className="absolute top-4 left-4 z-10">
          <Card className="w-72">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm">Room Editor</CardTitle>
                {unsavedChanges && (
                  <Badge variant="secondary" className="text-xs">
                    Unsaved
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-2 text-sm">
                <div className="text-muted-foreground">Active Tool:</div>
                <Badge variant="outline" className="capitalize">
                  {mode}
                </Badge>
              </div>
              
              {selectedRoomId && (
                <div className="flex items-center gap-2 text-sm">
                  <div className="text-muted-foreground">Selected:</div>
                  <Badge className="gap-1">
                    Room: {selectedRoomId}
                    {lockedSelection && <Lock className="h-3 w-3" />}
                  </Badge>
                </div>
              )}

              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={handleSave} disabled={!unsavedChanges}>
                  <Save className="h-3 w-3 mr-1" />
                  Save
                </Button>
                <Button variant="outline" size="sm">
                  <Undo className="h-3 w-3" />
                </Button>
                <Button variant="outline" size="sm">
                  <Redo className="h-3 w-3" />
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Right Panel - Room Tools */}
      <div className="w-80 border-l bg-card flex flex-col">
        <div className="p-4 border-b">
          <h3 className="font-semibold text-lg mb-1">Room Editor</h3>
          <p className="text-sm text-muted-foreground">
            Draw and edit room polygons
          </p>
        </div>

        <div className="flex-1 overflow-auto p-4 space-y-4">
          {/* Drawing Tools */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Drawing Tools</CardTitle>
              <CardDescription>
                Select your drawing mode
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {tools.map((tool) => {
                const Icon = tool.icon;
                const isActive = mode === tool.id;
                
                return (
                  <Button
                    key={tool.id}
                    variant={isActive ? "default" : "ghost"}
                    className="w-full justify-start gap-3"
                    onClick={() => setMode(tool.id as any)}
                  >
                    <Icon className="h-4 w-4" />
                    <div className="text-left">
                      <div className="font-medium">{tool.label}</div>
                      <div className="text-xs opacity-70">{tool.description}</div>
                    </div>
                  </Button>
                );
              })}
            </CardContent>
          </Card>

          {/* Visibility & Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Display Options</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Visibility Filter */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">Layer Visibility</Label>
                <div className="grid grid-cols-3 gap-1">
                  {[
                    { id: 'rooms', label: 'Rooms', icon: Grid3X3 },
                    { id: 'panos', label: 'Panos', icon: Eye },
                    { id: 'both', label: 'Both', icon: Eye }
                  ].map((option) => {
                    const Icon = option.icon;
                    const isActive = visibilityFilter === option.id;
                    
                    return (
                      <Button
                        key={option.id}
                        variant={isActive ? "default" : "outline"}
                        size="sm"
                        onClick={() => setVisibilityFilter(option.id as any)}
                        className="gap-1"
                      >
                        <Icon className="h-3 w-3" />
                        {option.label}
                      </Button>
                    );
                  })}
                </div>
              </div>

              {/* Grid & Snap */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label htmlFor="snap" className="text-sm">Snap to grid</Label>
                  <Switch
                    id="snap"
                    checked={preferences.snap}
                    onCheckedChange={(checked) => updatePreferences({ snap: checked })}
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <Label htmlFor="grid" className="text-sm">Show grid</Label>
                  <Switch
                    id="grid"
                    checked={preferences.grid}
                    onCheckedChange={(checked) => updatePreferences({ grid: checked })}
                  />
                </div>
              </div>

              {/* Selection Lock */}
              <div className="flex items-center justify-between">
                <Label htmlFor="lock" className="text-sm">Lock selection</Label>
                <Switch
                  id="lock"
                  checked={lockedSelection}
                  onCheckedChange={setLockedSelection}
                />
              </div>
            </CardContent>
          </Card>

          {/* Room List */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Rooms ({rooms.length})</CardTitle>
            </CardHeader>
            <CardContent>
              {rooms.length === 0 ? (
                <div className="text-center text-muted-foreground py-4">
                  <Grid3X3 className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <div className="text-sm">No rooms drawn yet</div>
                </div>
              ) : (
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {rooms.map((room) => (
                    <div
                      key={room.id}
                      className={`
                        p-2 rounded border cursor-pointer transition-colors
                        ${selectedRoomId === room.id 
                          ? 'bg-primary text-primary-foreground' 
                          : 'hover:bg-muted'
                        }
                      `}
                      onClick={() => handleRoomClick(room.id)}
                    >
                      <div className="text-sm font-medium">{room.name}</div>
                      <div className="text-xs opacity-70">
                        {room.polygon.length} vertices
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};