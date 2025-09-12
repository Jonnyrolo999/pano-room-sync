import { MiniMapCard } from "@/components/floorplan/MiniMapCard";
import { PanoViewerCard } from "@/components/floorplan/PanoViewerCard";
import { ContextInfoCard } from "@/components/floorplan/ContextInfoCard";
import { useBuildingStore } from "@/stores/buildingStore";
import { useFloorplanStore } from "@/stores/floorplanStore";

export const ViewerInterface = () => {
  const { getActiveFloor } = useBuildingStore();
  const { 
    panos, 
    selectedPanoId, 
    setSelectedPano,
    getSelectedRoom,
    getSelectedPano 
  } = useFloorplanStore();
  
  const activeFloor = getActiveFloor();
  const selectedRoom = getSelectedRoom();
  const selectedPano = getSelectedPano();

  if (!activeFloor) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="text-lg font-medium text-muted-foreground">
            No active floor selected
          </div>
          <p className="text-sm text-muted-foreground">
            Select a floor to view panoramas
          </p>
        </div>
      </div>
    );
  }

  const floorPanos = panos.filter(pano => pano.floorId === activeFloor.id);

  return (
    <div className="h-full flex min-h-0">
      {/* Left: Floor Map */}
      <div className="flex-1 min-w-0 p-3">
        <div className="h-full bg-card rounded-lg border p-4">
          <h3 className="text-lg font-semibold mb-4">Floor Map</h3>
          <div className="flex items-center justify-center h-64 bg-muted rounded border-2 border-dashed">
            <p className="text-muted-foreground">Mini-map will be implemented here</p>
          </div>
        </div>
      </div>
      
      {/* Right: Viewer Panel */}
      <div className="w-96 min-w-0 flex flex-col gap-3 p-3 bg-card/50">
        {/* Pano Viewer */}
        <PanoViewerCard
          selectedPanoId={selectedPanoId || ""}
          panoramas={floorPanos.map(pano => ({
            nodeId: pano.nodeId,
            title: pano.title,
            floor: activeFloor.name,
            fileName: pano.metadataJson?.fileName,
            imageUrl: pano.imageUrl
          }))}
          onPanoSelect={(nodeId) => {
            const pano = panos.find(p => p.nodeId === nodeId);
            if (pano) {
              setSelectedPano(pano.id);
            }
          }}
        />
        
        {/* Context Info */}
        <div className="bg-card rounded-lg border p-4">
          <h3 className="text-lg font-semibold mb-4">Context Info</h3>
          <div className="space-y-2 text-sm text-muted-foreground">
            <p>Room: {selectedRoom?.name || "None selected"}</p>
            <p>Panorama: {selectedPano?.title || "None selected"}</p>
          </div>
        </div>
      </div>
    </div>
  );
};