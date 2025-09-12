import { useState } from "react";
import { Edit, Trash2, Plus, MapPin } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useFloorplanStore } from "@/stores/floorplanStore";
import { Room } from "@/types/building";

export const RoomsList = () => {
  const { 
    rooms, 
    selectedRoomId, 
    setSelectedRoom, 
    updateRoom, 
    deleteRoom,
    getRoomPanos 
  } = useFloorplanStore();
  const [searchTerm, setSearchTerm] = useState('');

  const filteredRooms = rooms.filter(room => 
    room.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleRoomClick = (roomId: string) => {
    setSelectedRoom(selectedRoomId === roomId ? null : roomId);
  };

  const handleDelete = (roomId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('Are you sure you want to delete this room?')) {
      deleteRoom(roomId);
    }
  };

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm">Rooms</CardTitle>
          <Badge variant="secondary" className="text-xs">
            {rooms.length}
          </Badge>
        </div>
        
        <Input
          placeholder="Search rooms..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="h-8 text-sm"
        />
      </CardHeader>
      
      <CardContent className="flex-1 overflow-auto space-y-2 p-3">
        {filteredRooms.length === 0 ? (
          <div className="text-center py-6 text-muted-foreground">
            <div className="text-sm">
              {searchTerm ? 'No rooms match your search' : 'No rooms created yet'}
            </div>
            {!searchTerm && (
              <p className="text-xs mt-1">
                Switch to draw mode to create rooms
              </p>
            )}
          </div>
        ) : (
          filteredRooms.map((room) => {
            const roomPanos = getRoomPanos(room.id);
            const isSelected = selectedRoomId === room.id;
            
            return (
              <div
                key={room.id}
                className={`p-2 border rounded-lg cursor-pointer transition-colors ${
                  isSelected 
                    ? 'bg-accent border-accent-foreground/20' 
                    : 'bg-card hover:bg-accent/50'
                }`}
                onClick={() => handleRoomClick(room.id)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium truncate">
                        {room.name || `Room ${room.id.split('-').pop()}`}
                      </span>
                      {roomPanos.length > 0 && (
                        <Badge variant="outline" className="text-xs flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {roomPanos.length}
                        </Badge>
                      )}
                    </div>
                    
                    {room.propertiesJson?.area && (
                      <div className="text-xs text-muted-foreground mt-1">
                        Area: {room.propertiesJson.area}m²
                      </div>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-1">
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-6 w-6 p-0"
                      onClick={(e) => {
                        e.stopPropagation();
                        // TODO: Implement edit functionality
                      }}
                    >
                      <Edit className="h-3 w-3" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-6 w-6 p-0 text-destructive hover:text-destructive"
                      onClick={(e) => handleDelete(room.id, e)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </div>
            );
          })
        )}
        
        <Button variant="outline" size="sm" className="w-full mt-2">
          <Plus className="h-3 w-3 mr-1" />
          Add Room
        </Button>
      </CardContent>
    </Card>
  );
};