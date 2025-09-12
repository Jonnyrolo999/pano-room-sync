import { useState } from "react";
import { MapPin, Upload, Search } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { useFloorplanStore } from "@/stores/floorplanStore";
import { Pano } from "@/types/building";

export const UnassignedPanosList = () => {
  const { 
    getUnassignedPanos,
    selectedRoomId,
    getSelectedRoom,
    assignPanoToRoom,
    setSelectedPano 
  } = useFloorplanStore();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPanos, setSelectedPanos] = useState<string[]>([]);
  
  const unassignedPanos = getUnassignedPanos();
  const selectedRoom = getSelectedRoom();
  
  const filteredPanos = unassignedPanos.filter(pano => 
    pano.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    pano.nodeId.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handlePanoSelect = (panoId: string, checked: boolean) => {
    if (checked) {
      setSelectedPanos(prev => [...prev, panoId]);
    } else {
      setSelectedPanos(prev => prev.filter(id => id !== panoId));
    }
  };

  const handleAssignSelected = () => {
    if (selectedRoomId && selectedPanos.length > 0) {
      selectedPanos.forEach(panoId => {
        assignPanoToRoom(panoId, selectedRoomId);
      });
      setSelectedPanos([]);
    }
  };

  const handlePanoClick = (pano: Pano) => {
    setSelectedPano(pano.id);
  };

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm">Unassigned Panoramas</CardTitle>
          <Badge variant="secondary" className="text-xs">
            {unassignedPanos.length}
          </Badge>
        </div>
        
        <Input
          placeholder="Search panoramas..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="h-8 text-sm"
        />
        
        {selectedPanos.length > 0 && selectedRoom && (
          <div className="flex items-center justify-between p-2 bg-accent rounded">
            <span className="text-xs">
              {selectedPanos.length} selected
            </span>
            <Button size="sm" onClick={handleAssignSelected}>
              Assign to {selectedRoom.name}
            </Button>
          </div>
        )}
      </CardHeader>
      
      <CardContent className="flex-1 overflow-auto space-y-2 p-3">
        {filteredPanos.length === 0 ? (
          <div className="text-center py-6 text-muted-foreground">
            <div className="text-sm">
              {searchTerm ? 'No panoramas match your search' : 
               unassignedPanos.length === 0 ? 'All panoramas are assigned' : 'No unassigned panoramas'}
            </div>
            {unassignedPanos.length === 0 && (
              <Button variant="outline" size="sm" className="mt-2">
                <Upload className="h-3 w-3 mr-1" />
                Upload Panoramas
              </Button>
            )}
          </div>
        ) : (
          filteredPanos.map((pano) => (
            <div
              key={pano.id}
              className="p-2 border rounded-lg cursor-pointer transition-colors hover:bg-accent/50"
              onClick={() => handlePanoClick(pano)}
            >
              <div className="flex items-center gap-2">
                <Checkbox
                  checked={selectedPanos.includes(pano.id)}
                  onCheckedChange={(checked) => handlePanoSelect(pano.id, checked as boolean)}
                  onClick={(e) => e.stopPropagation()}
                />
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium truncate">
                      {pano.title}
                    </span>
                    <Badge variant="outline" className="text-xs">
                      {pano.nodeId}
                    </Badge>
                  </div>
                  
                  <div className="text-xs text-muted-foreground mt-1">
                    {pano.metadataJson?.fileName || 'No filename'}
                  </div>
                </div>
                
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-6 w-6 p-0"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (selectedRoomId) {
                      assignPanoToRoom(pano.id, selectedRoomId);
                    }
                  }}
                  disabled={!selectedRoomId}
                  title={selectedRoomId ? `Assign to ${selectedRoom?.name}` : 'Select a room first'}
                >
                  <MapPin className="h-3 w-3" />
                </Button>
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
};