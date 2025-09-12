import { useState, useMemo } from "react";
import { Search, Link2, Users, Eye, MapPin, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";

interface Room {
  id: string;
  data: any[];
}

interface Panorama {
  nodeId: string;
  title: string;
  floor?: string;
}

interface Assignment {
  roomId: string;
  panoramaIds: string[];
}

interface AssignmentInterfaceProps {
  rooms: Room[];
  headers: { row1: string[]; row2: string[] };
  assignments: Assignment[];
  onAssignmentUpdate: (assignments: Assignment[]) => void;
}

// Mock panorama data
const MOCK_PANORAMAS: Panorama[] = [
  { nodeId: "G-101", title: "Ground Floor - Entrance Hall", floor: "Ground" },
  { nodeId: "G-102", title: "Ground Floor - Reception", floor: "Ground" },
  { nodeId: "G-103", title: "Ground Floor - Waiting Area", floor: "Ground" },
  { nodeId: "G-104", title: "Ground Floor - Office 1", floor: "Ground" },
  { nodeId: "G-105", title: "Ground Floor - Office 2", floor: "Ground" },
  { nodeId: "F1-201", title: "First Floor - Conference Room", floor: "First" },
  { nodeId: "F1-202", title: "First Floor - Meeting Room A", floor: "First" },
  { nodeId: "F1-203", title: "First Floor - Meeting Room B", floor: "First" },
  { nodeId: "F1-204", title: "First Floor - Kitchen", floor: "First" },
  { nodeId: "F1-205", title: "First Floor - Storage", floor: "First" },
  { nodeId: "F2-301", title: "Second Floor - Executive Office", floor: "Second" },
  { nodeId: "F2-302", title: "Second Floor - Boardroom", floor: "Second" },
  { nodeId: "F2-303", title: "Second Floor - Break Room", floor: "Second" },
];

export const AssignmentInterface = ({ 
  rooms, 
  headers, 
  assignments, 
  onAssignmentUpdate 
}: AssignmentInterfaceProps) => {
  const [selectedRooms, setSelectedRooms] = useState<string[]>([]);
  const [selectedPanoramas, setSelectedPanoramas] = useState<string[]>([]);
  const [roomSearch, setRoomSearch] = useState("");
  const [panoSearch, setPanoSearch] = useState("");

  const filteredRooms = useMemo(() => {
    if (!roomSearch) return rooms;
    return rooms.filter(room => {
      const roomName = room.data[1]?.toString().toLowerCase() || '';
      const roomId = room.data[0]?.toString().toLowerCase() || '';
      return roomName.includes(roomSearch.toLowerCase()) || roomId.includes(roomSearch.toLowerCase());
    });
  }, [rooms, roomSearch]);

  const filteredPanoramas = useMemo(() => {
    if (!panoSearch) return MOCK_PANORAMAS;
    return MOCK_PANORAMAS.filter(pano => 
      pano.title.toLowerCase().includes(panoSearch.toLowerCase()) ||
      pano.nodeId.toLowerCase().includes(panoSearch.toLowerCase())
    );
  }, [panoSearch]);

  const getAssignmentCount = (roomId: string) => {
    const assignment = assignments.find(a => a.roomId === roomId);
    return assignment?.panoramaIds.length || 0;
  };

  const autoMatch = () => {
    const newAssignments: Assignment[] = [...assignments];
    let matchCount = 0;

    rooms.forEach(room => {
      const roomId = room.id;
      const roomCode = room.data[0]?.toString().toUpperCase() || '';
      
      // Find matching panoramas
      const matchingPanos = MOCK_PANORAMAS.filter(pano => {
        const nodeId = pano.nodeId.toUpperCase();
        return nodeId.includes(roomCode) || roomCode.includes(nodeId.split('-')[1] || '');
      });

      if (matchingPanos.length > 0) {
        const existingIndex = newAssignments.findIndex(a => a.roomId === roomId);
        if (existingIndex >= 0) {
          newAssignments[existingIndex].panoramaIds = matchingPanos.map(p => p.nodeId);
        } else {
          newAssignments.push({
            roomId,
            panoramaIds: matchingPanos.map(p => p.nodeId),
          });
        }
        matchCount++;
      }
    });

    onAssignmentUpdate(newAssignments);
    toast.success(`Auto-matched ${matchCount} rooms to panoramas`);
  };

  const bulkAssign = () => {
    if (selectedRooms.length === 0 || selectedPanoramas.length === 0) {
      toast.error("Please select both rooms and panoramas to assign");
      return;
    }

    const newAssignments = [...assignments];
    
    selectedRooms.forEach(roomId => {
      const existingIndex = newAssignments.findIndex(a => a.roomId === roomId);
      if (existingIndex >= 0) {
        // Merge with existing assignments
        const existing = new Set(newAssignments[existingIndex].panoramaIds);
        selectedPanoramas.forEach(panoId => existing.add(panoId));
        newAssignments[existingIndex].panoramaIds = Array.from(existing);
      } else {
        newAssignments.push({
          roomId,
          panoramaIds: [...selectedPanoramas],
        });
      }
    });

    onAssignmentUpdate(newAssignments);
    setSelectedRooms([]);
    setSelectedPanoramas([]);
    toast.success(`Assigned ${selectedPanoramas.length} panoramas to ${selectedRooms.length} rooms`);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold">Assign Panoramas</h2>
          <p className="text-muted-foreground">
            Map rooms to panoramic views for the viewer experience
          </p>
        </div>
        
        <div className="flex items-center space-x-2">
          <Button onClick={autoMatch} variant="outline" size="sm">
            <Zap className="mr-2 h-4 w-4" />
            Auto Match
          </Button>
          <Button 
            onClick={bulkAssign}
            disabled={selectedRooms.length === 0 || selectedPanoramas.length === 0}
            size="sm"
          >
            <Link2 className="mr-2 h-4 w-4" />
            Bulk Assign ({selectedRooms.length} → {selectedPanoramas.length})
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Rooms Panel */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Users className="h-5 w-5" />
              <span>Rooms ({filteredRooms.length})</span>
            </CardTitle>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search rooms..."
                value={roomSearch}
                onChange={(e) => setRoomSearch(e.target.value)}
                className="pl-10"
              />
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-80 overflow-y-auto">
              {filteredRooms.map(room => {
                const assignmentCount = getAssignmentCount(room.id);
                const isSelected = selectedRooms.includes(room.id);
                
                return (
                  <div
                    key={room.id}
                    className={`flex items-center space-x-3 p-3 rounded-lg border transition-smooth cursor-pointer ${
                      isSelected ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'
                    }`}
                    onClick={() => {
                      setSelectedRooms(prev => 
                        prev.includes(room.id) 
                          ? prev.filter(id => id !== room.id)
                          : [...prev, room.id]
                      );
                    }}
                  >
                    <Checkbox checked={isSelected} />
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm truncate">
                        {room.data[1] || 'Unnamed Room'}
                      </div>
                      <div className="text-xs text-muted-foreground font-mono">
                        {room.data[0]}
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      {assignmentCount > 0 && (
                        <Badge variant="secondary" className="text-xs">
                          {assignmentCount} pano{assignmentCount !== 1 ? 's' : ''}
                        </Badge>
                      )}
                      <MapPin className="h-4 w-4 text-muted-foreground" />
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Panoramas Panel */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Eye className="h-5 w-5" />
              <span>Panoramas ({filteredPanoramas.length})</span>
            </CardTitle>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search panoramas..."
                value={panoSearch}
                onChange={(e) => setPanoSearch(e.target.value)}
                className="pl-10"
              />
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-80 overflow-y-auto">
              {filteredPanoramas.map(pano => {
                const isSelected = selectedPanoramas.includes(pano.nodeId);
                
                return (
                  <div
                    key={pano.nodeId}
                    className={`flex items-center space-x-3 p-3 rounded-lg border transition-smooth cursor-pointer ${
                      isSelected ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'
                    }`}
                    onClick={() => {
                      setSelectedPanoramas(prev => 
                        prev.includes(pano.nodeId) 
                          ? prev.filter(id => id !== pano.nodeId)
                          : [...prev, pano.nodeId]
                      );
                    }}
                  >
                    <Checkbox checked={isSelected} />
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm truncate">
                        {pano.title}
                      </div>
                      <div className="text-xs text-muted-foreground font-mono">
                        {pano.nodeId}
                      </div>
                    </div>
                    {pano.floor && (
                      <Badge variant="outline" className="text-xs">
                        {pano.floor}
                      </Badge>
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Assignment Summary */}
      {assignments.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Assignment Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {assignments.slice(0, 6).map(assignment => {
                const room = rooms.find(r => r.id === assignment.roomId);
                if (!room) return null;
                
                return (
                  <div key={assignment.roomId} className="border rounded-lg p-3">
                    <div className="font-medium text-sm mb-2">
                      {room.data[1] || 'Unnamed Room'}
                    </div>
                    <div className="text-xs text-muted-foreground mb-2 font-mono">
                      {room.data[0]}
                    </div>
                    <Separator className="my-2" />
                    <div className="space-y-1">
                      {assignment.panoramaIds.slice(0, 3).map(panoId => {
                        const pano = MOCK_PANORAMAS.find(p => p.nodeId === panoId);
                        return (
                          <div key={panoId} className="text-xs">
                            {pano?.title || panoId}
                          </div>
                        );
                      })}
                      {assignment.panoramaIds.length > 3 && (
                        <div className="text-xs text-muted-foreground">
                          +{assignment.panoramaIds.length - 3} more
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
              {assignments.length > 6 && (
                <div className="border rounded-lg p-3 flex items-center justify-center text-muted-foreground">
                  +{assignments.length - 6} more assignments
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};