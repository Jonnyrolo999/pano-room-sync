import { useState, useMemo } from "react";
import { Search, Link2, Users, Eye, MapPin, Zap, Star, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

interface Room {
  id: string;
  data: any[];
  masterNodeId?: string;
}

interface Panorama {
  nodeId: string;
  title: string;
  floor?: string;
}

interface Assignment {
  roomId: string;
  panoramaIds: string[];
  masterNodeId?: string;
}

interface EnhancedAssignmentInterfaceProps {
  rooms: Room[];
  headers: { row1: string[]; row2: string[] };
  assignments: Assignment[];
  panoramas: Panorama[];
  onAssignmentUpdate: (assignments: Assignment[]) => void;
  onRoomUpdate: (roomId: string, data: any[], masterNodeId?: string) => void;
  onRequestUpload?: () => void;
}

export const EnhancedAssignmentInterface = ({ 
  rooms, 
  headers, 
  assignments, 
  panoramas,
  onAssignmentUpdate,
  onRoomUpdate,
  onRequestUpload,
}: EnhancedAssignmentInterfaceProps) => {
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
    if (!panoSearch) return panoramas;
    return panoramas.filter(pano => 
      pano.title.toLowerCase().includes(panoSearch.toLowerCase()) ||
      pano.nodeId.toLowerCase().includes(panoSearch.toLowerCase())
    );
  }, [panoSearch, panoramas]);

  const getAssignmentInfo = (roomId: string) => {
    const assignment = assignments.find(a => a.roomId === roomId);
    return {
      count: assignment?.panoramaIds.length || 0,
      panoramas: assignment?.panoramaIds || [],
      masterNodeId: assignment?.masterNodeId
    };
  };

  const getAssignedPanoramas = (roomId: string) => {
    const assignment = assignments.find(a => a.roomId === roomId);
    if (!assignment) return [];
    
    return assignment.panoramaIds.map(panoId => 
      panoramas.find(p => p.nodeId === panoId)
    ).filter(Boolean);
  };

  const autoMatch = () => {
    const newAssignments: Assignment[] = [...assignments];
    let matchCount = 0;

    rooms.forEach(room => {
      const roomId = room.id;
      const roomCode = room.data[0]?.toString().toUpperCase() || '';
      
      const matchingPanos = panoramas.filter(pano => {
        const nodeId = pano.nodeId.toUpperCase();
        return nodeId.includes(roomCode) || roomCode.includes((nodeId.split('-')[1] || ''));
      });

      if (matchingPanos.length > 0) {
        const existingIndex = newAssignments.findIndex(a => a.roomId === roomId);
        const masterNodeId = matchingPanos[0]?.nodeId; // First match becomes master
        
        if (existingIndex >= 0) {
          newAssignments[existingIndex].panoramaIds = matchingPanos.map(p => p.nodeId);
          newAssignments[existingIndex].masterNodeId = masterNodeId;
        } else {
          newAssignments.push({
            roomId,
            panoramaIds: matchingPanos.map(p => p.nodeId),
            masterNodeId
          });
        }
        
        // Update room master node
        onRoomUpdate(roomId, room.data, masterNodeId);
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
      const masterNodeId = selectedPanoramas[0]; // First selected becomes master
      
      if (existingIndex >= 0) {
        const existing = new Set(newAssignments[existingIndex].panoramaIds);
        selectedPanoramas.forEach(panoId => existing.add(panoId));
        newAssignments[existingIndex].panoramaIds = Array.from(existing);
        newAssignments[existingIndex].masterNodeId = masterNodeId;
      } else {
        newAssignments.push({
          roomId,
          panoramaIds: [...selectedPanoramas],
          masterNodeId
        });
      }
      
      // Update room master node
      const room = rooms.find(r => r.id === roomId);
      if (room) {
        onRoomUpdate(roomId, room.data, masterNodeId);
      }
    });

    onAssignmentUpdate(newAssignments);
    setSelectedRooms([]);
    setSelectedPanoramas([]);
    toast.success(`Assigned ${selectedPanoramas.length} panoramas to ${selectedRooms.length} rooms`);
  };

  const setMasterNode = (roomId: string, nodeId: string) => {
    const newAssignments = assignments.map(assignment => {
      if (assignment.roomId === roomId) {
        return { ...assignment, masterNodeId: nodeId };
      }
      return assignment;
    });
    
    onAssignmentUpdate(newAssignments);
    
    const room = rooms.find(r => r.id === roomId);
    if (room) {
      onRoomUpdate(roomId, room.data, nodeId);
    }
    
    toast.success(`Master node set to ${nodeId}`);
  };

  const removeAssignment = (roomId: string, panoId: string) => {
    const newAssignments = assignments.map(assignment => {
      if (assignment.roomId === roomId) {
        const newPanoIds = assignment.panoramaIds.filter(id => id !== panoId);
        const newMasterNodeId = assignment.masterNodeId === panoId ? newPanoIds[0] : assignment.masterNodeId;
        
        return {
          ...assignment,
          panoramaIds: newPanoIds,
          masterNodeId: newMasterNodeId
        };
      }
      return assignment;
    }).filter(assignment => assignment.panoramaIds.length > 0);
    
    onAssignmentUpdate(newAssignments);
    toast.success("Assignment removed");
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold">Assign Panoramas</h2>
          <p className="text-muted-foreground">
            Map rooms to panoramic views and set master nodes for viewer experience
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
                const assignmentInfo = getAssignmentInfo(room.id);
                const assignedPanoramas = getAssignedPanoramas(room.id);
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
                      {assignmentInfo.count > 0 && (
                        <div className="mt-1 space-y-1">
                          {assignedPanoramas.slice(0, 2).map(pano => (
                            <div key={pano?.nodeId} className="text-xs flex items-center space-x-1">
                              {assignmentInfo.masterNodeId === pano?.nodeId && (
                                <Star className="h-2.5 w-2.5 text-yellow-500 fill-current" />
                              )}
                              <span>{pano?.nodeId}</span>
                            </div>
                          ))}
                          {assignmentInfo.count > 2 && (
                            <div className="text-xs text-muted-foreground">
                              +{assignmentInfo.count - 2} more
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center space-x-2">
                      {assignmentInfo.count > 0 && (
                        <Badge variant="secondary" className="text-xs">
                          {assignmentInfo.count} pano{assignmentInfo.count !== 1 ? 's' : ''}
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
                const assignedToRooms = assignments.filter(a => a.panoramaIds.includes(pano.nodeId));
                
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
                      {assignedToRooms.length > 0 && (
                        <div className="mt-1 text-xs text-muted-foreground">
                          Assigned to {assignedToRooms.length} room{assignedToRooms.length !== 1 ? 's' : ''}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center space-x-2">
                      {pano.floor && (
                        <Badge variant="outline" className="text-xs">
                          {pano.floor}
                        </Badge>
                      )}
                      {assignedToRooms.some(a => a.masterNodeId === pano.nodeId) && (
                        <Star className="h-3 w-3 text-yellow-500 fill-current" />
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Enhanced Assignment Summary */}
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
                    
                    {/* Master Node Selection */}
                    <div className="mb-3">
                      <label className="text-xs font-medium text-muted-foreground mb-1 block">
                        Master Node
                      </label>
                      <Select
                        value={assignment.masterNodeId || ""}
                        onValueChange={(nodeId) => setMasterNode(assignment.roomId, nodeId)}
                      >
                        <SelectTrigger className="h-7 text-xs">
                          <SelectValue placeholder="Select master" />
                        </SelectTrigger>
                        <SelectContent>
                          {assignment.panoramaIds.map(panoId => {
                            const pano = panoramas.find(p => p.nodeId === panoId);
                            return (
                              <SelectItem key={panoId} value={panoId} className="text-xs">
                                {pano?.nodeId || panoId}
                              </SelectItem>
                            );
                          })}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    {/* Assigned Panoramas */}
                    <div className="space-y-1">
                      {assignment.panoramaIds.slice(0, 3).map(panoId => {
                        const pano = panoramas.find(p => p.nodeId === panoId);
                        const isMaster = assignment.masterNodeId === panoId;
                        
                        return (
                          <div key={panoId} className="text-xs flex items-center justify-between">
                            <div className="flex items-center space-x-1">
                              {isMaster && (
                                <Star className="h-2.5 w-2.5 text-yellow-500 fill-current" />
                              )}
                              <span>{pano?.nodeId || panoId}</span>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => removeAssignment(assignment.roomId, panoId)}
                              className="h-4 w-4 p-0 hover:bg-destructive hover:text-destructive-foreground"
                            >
                              <Trash2 className="h-2.5 w-2.5" />
                            </Button>
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