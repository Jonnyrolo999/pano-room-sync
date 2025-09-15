import { useState, useEffect } from "react";
import { Header } from "@/components/layout/Header";
import { ImportInterface } from "@/components/import/ImportInterface";
import { RoomsTable } from "@/components/rooms/RoomsTable";
import { AssignmentInterface } from "@/components/assign/AssignmentInterface";
import { ViewerPanel } from "@/components/viewer/ViewerPanel";
import { PanoramasManager } from "@/components/panoramas/PanoramasManager";
import { PanoramaViewer } from "@/components/panorama/PanoramaViewer";
import { FloorPlanCanvas } from "@/components/floorplan/FloorPlanCanvas";
import { FloorPlanEditor } from "@/components/editor/FloorPlanEditor";
import { ThreePaneViewer } from "@/components/viewer/ThreePaneViewer";
import { RoomDataAssignmentInterface } from "@/components/assignment/RoomDataAssignmentInterface";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Play, RotateCcw } from "lucide-react";
import { parse as exifrParse } from "exifr";
import { toast } from "sonner";

interface Room {
  id: string;
  data: any[];
}

interface Assignment {
  roomId: string;
  panoramaIds: string[];
}

interface Panorama {
  nodeId: string;
  title: string;
  floor?: string;
  fileName?: string;
  imageUrl?: string;
  width?: number;
  height?: number;
  yawOffset?: number;
  pitchOffset?: number;
  rollOffset?: number;
  metadata?: any;
  roomId?: string;
}

interface FloorPlan {
  id: string;
  imageUrl: string;
  width: number;
  height: number;
  rooms: FloorPlanRoom[];
}

interface FloorPlanRoom {
  id: string;
  name: string;
  polygon: { x: number; y: number }[];
  level?: string;
  rag?: 'Minimal' | 'Minor' | 'Significant';
  notes?: string;
  panoramas?: Panorama[];
  panoramaCount?: number;
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
  const [floorPlan, setFloorPlan] = useState<FloorPlan | null>(null);

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

  const handleRoomUpdate = (roomId: string, data: any[]) => {
    setRooms(prev => prev.map(room => 
      room.id === roomId ? { ...room, data } : room
    ));
  };

  const handleRoomSelect = (roomId: string) => {
    setSelectedRoomId(roomId);
    setActiveTab("viewer");
  };

  const handleFloorPlanUpload = async (file: File) => {
    if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
      try {
        // Load PDF.js from CDN
        if (typeof window !== 'undefined' && !(window as any).pdfjsLib) {
          const script = document.createElement('script');
          script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
          document.head.appendChild(script);
          
          await new Promise((resolve, reject) => {
            script.onload = resolve;
            script.onerror = reject;
          });

          // Set worker
          (window as any).pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
        }

        const pdfjsLib = (window as any).pdfjsLib;
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        const page = await pdf.getPage(1);
        const dpi = 200; // ~200 DPI
        const viewport = page.getViewport({ scale: dpi / 72 });
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) throw new Error('Canvas not supported');
        canvas.width = Math.floor(viewport.width);
        canvas.height = Math.floor(viewport.height);
        await page.render({ canvas, canvasContext: ctx, viewport }).promise;
        const blob: Blob = await new Promise((resolve) => canvas.toBlob((b) => resolve(b as Blob), 'image/png')!);
        const imageUrl = URL.createObjectURL(blob);
        const newFloorPlan: FloorPlan = {
          id: `fp-${Date.now()}`,
          imageUrl,
          width: canvas.width,
          height: canvas.height,
          rooms: []
        };
        setFloorPlan(newFloorPlan);
      } catch (e) {
        console.error('Failed to rasterize PDF', e);
      }
      return;
    }

    // Fallback: image file
    const imageUrl = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const newFloorPlan: FloorPlan = {
        id: `fp-${Date.now()}`,
        imageUrl,
        width: img.width,
        height: img.height,
        rooms: []
      };
      setFloorPlan(newFloorPlan);
    };
    img.src = imageUrl;
  };

  const handleRoomsUpdate = (rooms: FloorPlanRoom[]) => {
    if (floorPlan) {
      setFloorPlan({ ...floorPlan, rooms });
    }
  };

  const handleFloorPlanRoomSelect = (roomId: string | null) => {
    setSelectedRoomId(roomId);
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
          <RoomsTable
            rooms={rooms}
            headers={headers}
            onRoomUpdate={handleRoomUpdate}
            onRoomSelect={handleRoomSelect}
          />
        );
      
      case "floorplan":
        return (
          <FloorPlanEditor
            floorPlan={floorPlan}
            onFloorPlanUpload={handleFloorPlanUpload}
            onRoomUpdate={handleRoomsUpdate}
            selectedRoomId={selectedRoomId}
            onRoomSelect={handleFloorPlanRoomSelect}
            onPanoramaUpload={async (roomId, files) => {
              // Handle panorama upload with 2:1 validation
              const validFiles: File[] = [];
              
              for (const file of Array.from(files)) {
                try {
                  const img = new Image();
                  img.crossOrigin = 'anonymous';
                  
                  await new Promise((resolve, reject) => {
                    img.onload = () => {
                      const aspectRatio = img.width / img.height;
                      if (Math.abs(aspectRatio - 2) > 0.1) {
                        reject(new Error(`Invalid aspect ratio: ${aspectRatio.toFixed(2)}. Expected ~2:1 for equirectangular panoramas.`));
                        return;
                      }
                      resolve(img);
                    };
                    img.onerror = () => reject(new Error('Failed to load image'));
                    img.src = URL.createObjectURL(file);
                  });
                  
                  validFiles.push(file);
                } catch (e) {
                  console.error('Invalid panorama file:', file.name, e);
                }
              }
              
              if (validFiles.length > 0) {
                // Create panoramas and add to room
                const newPanos = validFiles.map(file => ({
                  nodeId: `${roomId}-pano-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                  title: file.name.replace(/\.[^/.]+$/, ""),
                  imageUrl: URL.createObjectURL(file),
                  width: 0, // Will be set after load
                  height: 0,
                  yawOffset: 0,
                  pitchOffset: 0,
                  rollOffset: 0,
                  roomId: roomId
                }));
                
                // Update room panorama count
                if (floorPlan) {
                  const updatedRooms = floorPlan.rooms.map(room => 
                    room.id === roomId 
                      ? { ...room, panoramaCount: (room.panoramaCount || 0) + validFiles.length }
                      : room
                  );
                  setFloorPlan({ ...floorPlan, rooms: updatedRooms });
                }
                
                // Add to global panoramas list
                setPanoramas(prev => {
                  const updated = [...prev, ...newPanos];
                  // Set current node to the first of the new uploads
                  setCurrentNodeId(newPanos[0].nodeId);
                  return updated;
                });
                
                const roomName = floorPlan?.rooms.find(r => r.id === roomId)?.name || roomId;
                toast.success(`${validFiles.length} panorama${validFiles.length > 1 ? 's' : ''} uploaded and assigned to ${roomName}`);
                console.log(`Uploaded ${validFiles.length} valid panoramas to room ${roomId}`);
              }
            }}
          />
        );
      
      case "room-assignment":
        return (
          <RoomDataAssignmentInterface
            rooms={rooms}
            headers={headers}
            floorPlan={floorPlan}
            onFloorPlanRoomsUpdate={handleRoomsUpdate}
          />
        );

      case "panoramas":
        return (
          <PanoramasManager
            panoramas={panoramas}
            onChange={setPanoramas}
            rooms={rooms.map(r => ({ id: r.id, name: r.data[1] || r.data[0] || r.id }))}
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
          <AssignmentInterface
            rooms={rooms}
            headers={headers}
            assignments={assignments}
            panoramas={panoramas}
            onAssignmentUpdate={setAssignments}
            onRequestUpload={() => setActiveTab("panoramas")}
          />
        );
      
      case "viewer":
        return (
          <ThreePaneViewer
            floorPlan={floorPlan}
            rooms={rooms}
            headers={headers}
            panoramas={panoramas}
            selectedRoomId={selectedRoomId}
            currentNodeId={currentNodeId}
            onRoomSelect={handleFloorPlanRoomSelect}
            onPanoramaChange={setCurrentNodeId}
          />
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
