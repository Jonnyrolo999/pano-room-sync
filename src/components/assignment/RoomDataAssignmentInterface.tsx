import { useState, useMemo } from "react";
import { Search, Link2, MapPin, Database, Eye, Check, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";

interface Room {
  id: string;
  data: any[];
}

interface FloorPlanRoom {
  id: string;
  name: string;
  polygon: { x: number; y: number }[];
  level?: string;
  rag?: 'Minimal' | 'Minor' | 'Significant';
  notes?: string;
  panoramas?: any[];
  panoramaCount?: number;
  assignedDataId?: string; // Link to imported room data
}

interface FloorPlan {
  id: string;
  imageUrl: string;
  width: number;
  height: number;
  rooms: FloorPlanRoom[];
}

interface RoomDataAssignmentProps {
  rooms: Room[];
  headers: { row1: string[]; row2: string[] };
  floorPlan: FloorPlan | null;
  onFloorPlanRoomsUpdate: (rooms: FloorPlanRoom[]) => void;
}

export const RoomDataAssignmentInterface = ({
  rooms,
  headers,
  floorPlan,
  onFloorPlanRoomsUpdate
}: RoomDataAssignmentProps) => {
  const [selectedDataRoom, setSelectedDataRoom] = useState<string | null>(null);
  const [selectedFloorPlanRoom, setSelectedFloorPlanRoom] = useState<string | null>(null);
  const [dataSearch, setDataSearch] = useState("");
  const [floorPlanSearch, setFloorPlanSearch] = useState("");

  const filteredDataRooms = useMemo(() => {
    return rooms.filter(room => {
      if (!dataSearch) return true;
      const searchTerm = dataSearch.toLowerCase();
      return room.data.some(field => 
        field && field.toString().toLowerCase().includes(searchTerm)
      );
    });
  }, [rooms, dataSearch]);

  const filteredFloorPlanRooms = useMemo(() => {
    if (!floorPlan) return [];
    return floorPlan.rooms.filter(room => {
      if (!floorPlanSearch) return true;
      const searchTerm = floorPlanSearch.toLowerCase();
      return room.name.toLowerCase().includes(searchTerm) || 
             room.id.toLowerCase().includes(searchTerm);
    });
  }, [floorPlan, floorPlanSearch]);

  const assignedDataIds = useMemo(() => {
    if (!floorPlan) return new Set();
    return new Set(floorPlan.rooms.map(room => room.assignedDataId).filter(Boolean));
  }, [floorPlan]);

  const handleAssignRoom = () => {
    if (!selectedDataRoom || !selectedFloorPlanRoom || !floorPlan) {
      toast.error("Please select both a data room and a floor plan room");
      return;
    }

    const dataRoom = rooms.find(r => r.id === selectedDataRoom);
    const roomName = dataRoom?.data[1] || dataRoom?.data[0] || selectedDataRoom;

    const updatedRooms = floorPlan.rooms.map(room => 
      room.id === selectedFloorPlanRoom 
        ? { ...room, assignedDataId: selectedDataRoom, name: roomName }
        : room
    );

    onFloorPlanRoomsUpdate(updatedRooms);
    toast.success(`Assigned "${roomName}" to floor plan room`);
    setSelectedDataRoom(null);
    setSelectedFloorPlanRoom(null);
  };

  const handleUnassignRoom = (floorPlanRoomId: string) => {
    if (!floorPlan) return;

    const updatedRooms = floorPlan.rooms.map(room => 
      room.id === floorPlanRoomId 
        ? { ...room, assignedDataId: undefined }
        : room
    );

    onFloorPlanRoomsUpdate(updatedRooms);
    toast.success("Room assignment removed");
  };

  const getAssignedDataRoom = (floorPlanRoom: FloorPlanRoom) => {
    if (!floorPlanRoom.assignedDataId) return null;
    return rooms.find(r => r.id === floorPlanRoom.assignedDataId);
  };

  const getRoomDisplayName = (room: Room) => {
    return room.data[1] || room.data[0] || room.id;
  };

  const getRoomPreview = (room: Room) => {
    const preview = room.data.slice(0, 4).filter(Boolean);
    return preview.length > 0 ? preview.join(" • ") : "No data available";
  };

  if (!floorPlan) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <MapPin className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">No Floor Plan Available</h3>
          <p className="text-muted-foreground mb-4">
            Please upload a floor plan first to assign room data to floor plan rooms.
          </p>
          <Button variant="outline" onClick={() => window.location.hash = '#floorplan'}>
            Go to Floor Plan Editor
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Room Data Assignment</h2>
          <p className="text-muted-foreground">
            Connect imported room data with floor plan polygons
          </p>
        </div>
        <div className="flex items-center gap-4">
          <Badge variant="outline">
            {rooms.length} Data Rooms
          </Badge>
          <Badge variant="outline">
            {floorPlan.rooms.length} Floor Plan Rooms
          </Badge>
          <Badge variant="secondary">
            {assignedDataIds.size} Assigned
          </Badge>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Imported Room Data */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Database className="h-5 w-5" />
                Imported Room Data
              </CardTitle>
              <Badge variant="outline">{filteredDataRooms.length} rooms</Badge>
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search room data..."
                value={dataSearch}
                onChange={(e) => setDataSearch(e.target.value)}
                className="pl-10"
              />
            </div>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-96">
              <div className="space-y-2">
                {filteredDataRooms.map((room) => {
                  const isAssigned = assignedDataIds.has(room.id);
                  return (
                    <div
                      key={room.id}
                      className={`p-3 rounded-lg border cursor-pointer transition-all ${
                        selectedDataRoom === room.id
                          ? 'border-primary bg-primary/5'
                          : isAssigned
                          ? 'border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950'
                          : 'border-border hover:border-muted-foreground hover:bg-muted/50'
                      }`}
                      onClick={() => setSelectedDataRoom(room.id)}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="font-medium truncate">
                              {getRoomDisplayName(room)}
                            </h4>
                            {isAssigned && (
                              <Badge variant="secondary" className="text-green-700 bg-green-100 dark:text-green-300 dark:bg-green-900">
                                <Check className="h-3 w-3 mr-1" />
                                Assigned
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground truncate">
                            {getRoomPreview(room)}
                          </p>
                        </div>
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <Eye className="h-4 w-4" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-2xl">
                            <DialogHeader>
                              <DialogTitle>{getRoomDisplayName(room)}</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4">
                              {room.data.map((value, index) => (
                                <div key={index} className="flex gap-4">
                                  <div className="w-32 text-sm font-medium text-muted-foreground">
                                    {headers.row1[index] || headers.row2[index] || `Field ${index + 1}`}
                                  </div>
                                  <div className="flex-1 text-sm">{value || "—"}</div>
                                </div>
                              ))}
                            </div>
                          </DialogContent>
                        </Dialog>
                      </div>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Floor Plan Rooms */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5" />
                Floor Plan Rooms
              </CardTitle>
              <Badge variant="outline">{filteredFloorPlanRooms.length} rooms</Badge>
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search floor plan rooms..."
                value={floorPlanSearch}
                onChange={(e) => setFloorPlanSearch(e.target.value)}
                className="pl-10"
              />
            </div>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-96">
              <div className="space-y-2">
                {filteredFloorPlanRooms.map((room) => {
                  const assignedData = getAssignedDataRoom(room);
                  return (
                    <div
                      key={room.id}
                      className={`p-3 rounded-lg border cursor-pointer transition-all ${
                        selectedFloorPlanRoom === room.id
                          ? 'border-primary bg-primary/5'
                          : assignedData
                          ? 'border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950'
                          : 'border-border hover:border-muted-foreground hover:bg-muted/50'
                      }`}
                      onClick={() => setSelectedFloorPlanRoom(room.id)}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="font-medium truncate">{room.name}</h4>
                            {assignedData && (
                              <Badge variant="secondary" className="text-green-700 bg-green-100 dark:text-green-300 dark:bg-green-900">
                                <Check className="h-3 w-3 mr-1" />
                                Assigned
                              </Badge>
                            )}
                            {room.panoramaCount && room.panoramaCount > 0 && (
                              <Badge variant="secondary">
                                {room.panoramaCount} panos
                              </Badge>
                            )}
                          </div>
                          {assignedData ? (
                            <p className="text-sm text-muted-foreground truncate">
                              → {getRoomDisplayName(assignedData)}
                            </p>
                          ) : (
                            <p className="text-sm text-muted-foreground">
                              No data assigned
                            </p>
                          )}
                        </div>
                        {assignedData && (
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleUnassignRoom(room.id);
                            }}
                          >
                            Unassign
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>

      {/* Assignment Action */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              {selectedDataRoom && (
                <div className="flex items-center gap-2">
                  <Database className="h-4 w-4 text-primary" />
                  <span className="font-medium">
                    {getRoomDisplayName(rooms.find(r => r.id === selectedDataRoom)!)}
                  </span>
                </div>
              )}
              {selectedDataRoom && selectedFloorPlanRoom && (
                <Link2 className="h-4 w-4 text-muted-foreground" />
              )}
              {selectedFloorPlanRoom && (
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-primary" />
                  <span className="font-medium">
                    {floorPlan.rooms.find(r => r.id === selectedFloorPlanRoom)?.name}
                  </span>
                </div>
              )}
            </div>
            <Button 
              onClick={handleAssignRoom}
              disabled={!selectedDataRoom || !selectedFloorPlanRoom}
              className="min-w-32"
            >
              <Link2 className="h-4 w-4 mr-2" />
              Assign Rooms
            </Button>
          </div>
          {(!selectedDataRoom || !selectedFloorPlanRoom) && (
            <p className="text-sm text-muted-foreground mt-2">
              Select both a data room and a floor plan room to create an assignment
            </p>
          )}
        </CardContent>
      </Card>

      {/* Assignment Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Assignment Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center p-4 bg-muted rounded-lg">
              <div className="text-2xl font-bold text-primary">{assignedDataIds.size}</div>
              <div className="text-sm text-muted-foreground">Rooms Assigned</div>
            </div>
            <div className="text-center p-4 bg-muted rounded-lg">
              <div className="text-2xl font-bold text-orange-500">{rooms.length - assignedDataIds.size}</div>
              <div className="text-sm text-muted-foreground">Data Rooms Unassigned</div>
            </div>
            <div className="text-center p-4 bg-muted rounded-lg">
              <div className="text-2xl font-bold text-red-500">
                {floorPlan.rooms.filter(r => !r.assignedDataId).length}
              </div>
              <div className="text-sm text-muted-foreground">Floor Plan Rooms Unassigned</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};