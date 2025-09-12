import { useState, useEffect } from "react";
import { Header } from "@/components/layout/Header";
import { ImportInterface } from "@/components/import/ImportInterface";
import { EditableRoomsTable } from "@/components/rooms/EditableRoomsTable";
import { EnhancedAssignmentInterface } from "@/components/assign/EnhancedAssignmentInterface";
import { ViewerPanel } from "@/components/viewer/ViewerPanel";
import { PanoramaViewer } from "@/components/viewer/PanoramaViewer";
import { PanoramasManager } from "@/components/panoramas/PanoramasManager";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Play, RotateCcw } from "lucide-react";

interface Room {
  id: string;
  data: any[];
  masterNodeId?: string;
}

interface Assignment {
  roomId: string;
  panoramaIds: string[];
  masterNodeId?: string;
}

interface Panorama {
  nodeId: string;
  title: string;
  floor?: string;
  fileName?: string;
  imageUrl?: string;
}

const MOCK_NODES = ["G-101", "G-102", "G-103", "F1-201", "F1-202", "F2-301"];

const Index = () => {
  const [activeTab, setActiveTab] = useState("import");
  const [rooms, setRooms] = useState<Room[]>([]);
  const [headers, setHeaders] = useState<{ row1: string[]; row2: string[] }>({ row1: [], row2: [] });
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [panoramas, setPanoramas] = useState<Panorama[]>([]);
  const [currentNodeId, setCurrentNodeId] = useState("G-101");
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);
  const [highlightedField, setHighlightedField] = useState<string | null>(null);

  useEffect(() => {
    // Keep current node valid if panoramas list changes
    if (panoramas.length > 0) {
      const ids = panoramas.map(p => p.nodeId);
      if (!ids.includes(currentNodeId)) {
        setCurrentNodeId(ids[0]);
      }
    }
  }, [panoramas]);

  const handleImportComplete = (data: any[][], importHeaders: { row1: string[]; row2: string[] }) => {
    const processedRooms: Room[] = data.map((row, index) => ({
      id: `room-${index}`,
      data: row,
    }));
    
    setRooms(processedRooms);
    setHeaders(importHeaders);
    setActiveTab("rooms");
  };

  const handleRoomUpdate = (roomId: string, data: any[], masterNodeId?: string) => {
    setRooms(prev => prev.map(room => 
      room.id === roomId ? { ...room, data, masterNodeId } : room
    ));
  };

  const handleHeadersUpdate = (newHeaders: { row1: string[]; row2: string[] }) => {
    setHeaders(newHeaders);
  };

  const handleRoomSelect = (roomId: string) => {
    setSelectedRoomId(roomId);
    setActiveTab("viewer");
  };

  const getCurrentRoom = (): Room | null => {
    if (selectedRoomId) {
      return rooms.find(room => room.id === selectedRoomId) || null;
    }

    // Auto-detect based on current panorama
    const assignment = assignments.find(a => a.panoramaIds.includes(currentNodeId));
    if (assignment) {
      return rooms.find(room => room.id === assignment.roomId) || null;
    }
    
    return null;
  };

  const renderContent = () => {
    switch (activeTab) {
      case "import":
        return <ImportInterface onImportComplete={handleImportComplete} />;
      
      case "rooms":
        if (rooms.length === 0) {
          return (
            <div className="text-center py-12">
              <div className="text-muted-foreground mb-4">No room data imported yet</div>
              <Button onClick={() => setActiveTab("import")}>
                Import Room Data
              </Button>
            </div>
          );
        }
        return (
          <EditableRoomsTable
            rooms={rooms}
            headers={headers}
            onRoomUpdate={handleRoomUpdate}
            onRoomSelect={handleRoomSelect}
            onHeadersUpdate={handleHeadersUpdate}
            availableNodes={panoramas.map(p => p.nodeId)}
          />
        );
      
      case "panoramas":
        return (
          <PanoramasManager
            panoramas={panoramas}
            onChange={setPanoramas}
          />
        );

      case "assign":
        if (rooms.length === 0) {
          return (
            <div className="text-center py-12">
              <div className="text-muted-foreground mb-4">Import room data first to assign panoramas</div>
              <Button onClick={() => setActiveTab("import")}>
                Import Room Data
              </Button>
            </div>
          );
        }
        return (
          <EnhancedAssignmentInterface
            rooms={rooms}
            headers={headers}
            assignments={assignments}
            panoramas={panoramas}
            onAssignmentUpdate={setAssignments}
            onRoomUpdate={handleRoomUpdate}
            onRequestUpload={() => setActiveTab("panoramas")}
          />
        );
      
      case "viewer":
        const nodeOptions = panoramas.length > 0 ? panoramas.map(p => p.nodeId) : MOCK_NODES;
        return (
          <div className="flex gap-6 h-[calc(100vh-8rem)]">
            {/* Viewer Area */}
            <div className="flex-1">
              <Card className="h-full">
                <CardContent className="p-6 h-full flex flex-col">
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center space-x-4">
                      <h3 className="text-xl font-semibold">Panorama Viewer</h3>
                      <Badge variant="outline" className="font-mono">
                        {currentNodeId}
                      </Badge>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <Select value={currentNodeId} onValueChange={setCurrentNodeId}>
                        <SelectTrigger className="w-48">
                          <SelectValue placeholder="Select node" />
                        </SelectTrigger>
                        <SelectContent>
                          {nodeOptions.map(nodeId => (
                            <SelectItem key={nodeId} value={nodeId}>
                              {nodeId}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  
                  {/* Panorama Viewer */}
                  <div className="flex-1 rounded-lg overflow-hidden">
                    {(() => {
                      const currentPanorama = panoramas.find(p => p.nodeId === currentNodeId);
                      if (currentPanorama && currentPanorama.imageUrl) {
                        return (
                          <PanoramaViewer 
                            imageUrl={currentPanorama.imageUrl}
                            nodeId={currentPanorama.nodeId}
                            roomData={getCurrentRoom()?.data}
                            headers={headers}
                            onHotspotClick={setHighlightedField}
                            highlightedField={highlightedField}
                          />
                        );
                      } else {
                        return (
                          <div className="h-full bg-gradient-subtle rounded-lg border-2 border-dashed border-border flex items-center justify-center">
                            <div className="text-center space-y-4">
                              <div className="w-16 h-16 mx-auto rounded-full bg-primary/10 flex items-center justify-center">
                                <Play className="h-8 w-8 text-primary" />
                              </div>
                              <div>
                                <h4 className="font-medium">No Panorama Available</h4>
                                <p className="text-sm text-muted-foreground">
                                  Upload panoramas in the Panoramas tab to view here
                                </p>
                              </div>
                              <Button variant="outline" size="sm" onClick={() => setActiveTab("panoramas")}>
                                Upload Panoramas
                              </Button>
                            </div>
                          </div>
                        );
                      }
                    })()}
                  </div>
                </CardContent>
              </Card>
            </div>
            
            {/* Room Info Panel */}
            <ViewerPanel
              room={getCurrentRoom()}
              headers={headers}
              currentNodeId={currentNodeId}
              highlightedField={highlightedField}
              onFieldClick={setHighlightedField}
            />
          </div>
        );
      
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header activeTab={activeTab} onTabChange={setActiveTab} />
      <main className="p-6">
        {renderContent()}
      </main>
    </div>
  );
};

export default Index;
