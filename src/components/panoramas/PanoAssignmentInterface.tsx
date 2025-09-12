import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { Camera, MapPin, Star, Search, Users } from 'lucide-react';
import { useFloorplanStore } from '@/stores/floorplanStore';
import { useBuildingStore } from '@/stores/buildingStore';
import { toast } from 'sonner';

export const PanoAssignmentInterface = () => {
  const { 
    rooms, 
    panos, 
    assignPanoToRoom, 
    unassignPano,
    setMasterPano 
  } = useFloorplanStore();
  const { getActiveFloor } = useBuildingStore();
  const activeFloor = getActiveFloor();
  
  const [selectedRoomId, setSelectedRoomId] = useState<string>('');
  const [selectedPanoIds, setSelectedPanoIds] = useState<Set<string>>(new Set());
  const [searchTerm, setSearchTerm] = useState('');
  const [filterAssignment, setFilterAssignment] = useState<'all' | 'assigned' | 'unassigned'>('all');

  // Filter panos based on search and assignment status
  const filteredPanos = panos.filter(pano => {
    const matchesSearch = pano.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      pano.fileName.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesFilter = filterAssignment === 'all' || 
      (filterAssignment === 'assigned' && pano.roomId) ||
      (filterAssignment === 'unassigned' && !pano.roomId);
    
    return matchesSearch && matchesFilter;
  });

  // Group panos by room
  const panosByRoom = rooms.reduce((acc, room) => {
    acc[room.id] = panos.filter(pano => pano.roomId === room.id);
    return acc;
  }, {} as Record<string, typeof panos>);

  const handlePanoSelection = (panoId: string, checked: boolean) => {
    setSelectedPanoIds(prev => {
      const newSet = new Set(prev);
      if (checked) {
        newSet.add(panoId);
      } else {
        newSet.delete(panoId);
      }
      return newSet;
    });
  };

  const handleBulkAssign = () => {
    if (!selectedRoomId || selectedPanoIds.size === 0) {
      toast.error('Please select a room and at least one panorama');
      return;
    }

    const room = rooms.find(r => r.id === selectedRoomId);
    if (!room) return;

    selectedPanoIds.forEach(panoId => {
      assignPanoToRoom(panoId, selectedRoomId);
    });

    toast.success(`Assigned ${selectedPanoIds.size} panorama${selectedPanoIds.size > 1 ? 's' : ''} to ${room.name}`);
    
    // Clear selections
    setSelectedPanoIds(new Set());
    setSelectedRoomId('');
  };

  const handleUnassign = (panoId: string) => {
    unassignPano(panoId);
    toast.success('Panorama unassigned');
  };

  const handleSetMaster = (panoId: string, roomId: string) => {
    setMasterPano(roomId, panoId);
    toast.success('Master panorama updated');
  };

  const unassignedCount = panos.filter(p => !p.roomId).length;
  const assignedCount = panos.filter(p => p.roomId).length;

  return (
    <div className="space-y-4">
      {/* Assignment Stats */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Users className="h-4 w-4" />
            Assignment Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold text-primary">{panos.length}</div>
              <div className="text-xs text-muted-foreground">Total</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-vue-green">{assignedCount}</div>
              <div className="text-xs text-muted-foreground">Assigned</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-warning">{unassignedCount}</div>
              <div className="text-xs text-muted-foreground">Unassigned</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Bulk Assignment */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Bulk Assignment</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Filters */}
          <div className="flex gap-2">
            <div className="flex-1">
              <Input
                placeholder="Search panoramas..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="text-sm"
              />
            </div>
            <Select value={filterAssignment} onValueChange={(value: any) => setFilterAssignment(value)}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="assigned">Assigned</SelectItem>
                <SelectItem value="unassigned">Unassigned</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Panorama List */}
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {filteredPanos.map((pano) => {
              const isSelected = selectedPanoIds.has(pano.id);
              const assignedRoom = pano.roomId ? rooms.find(r => r.id === pano.roomId) : null;
              
              return (
                <div key={pano.id} className="flex items-center space-x-2 p-2 border rounded-md">
                  <Checkbox
                    checked={isSelected}
                    onCheckedChange={(checked) => handlePanoSelection(pano.id, checked as boolean)}
                  />
                  
                  <div className="w-12 h-6 bg-muted rounded overflow-hidden">
                    <img 
                      src={pano.imageUrl} 
                      alt={pano.title}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">{pano.title}</div>
                    <div className="text-xs text-muted-foreground">{pano.fileName}</div>
                  </div>
                  
                  {assignedRoom && (
                    <Badge variant="secondary" className="text-xs">
                      {assignedRoom.name}
                    </Badge>
                  )}
                  
                  {pano.metadataJson?.isMaster && (
                    <Star className="h-3 w-3 text-warning fill-current" />
                  )}
                </div>
              );
            })}
            
            {filteredPanos.length === 0 && (
              <div className="text-center text-muted-foreground py-8">
                <Camera className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No panoramas found</p>
              </div>
            )}
          </div>

          {/* Assignment Controls */}
          <div className="flex gap-2">
            <Select value={selectedRoomId} onValueChange={setSelectedRoomId}>
              <SelectTrigger className="flex-1">
                <SelectValue placeholder="Select target room..." />
              </SelectTrigger>
              <SelectContent>
                {rooms.map((room) => (
                  <SelectItem key={room.id} value={room.id}>
                    <div className="flex items-center justify-between w-full">
                      <span>{room.name}</span>
                      <Badge variant="outline" className="ml-2 text-xs">
                        {panosByRoom[room.id]?.length || 0}
                      </Badge>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <Button 
              onClick={handleBulkAssign}
              disabled={!selectedRoomId || selectedPanoIds.size === 0}
            >
              Assign ({selectedPanoIds.size})
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Room-based View */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">By Room</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {rooms.map((room) => {
            const roomPanos = panosByRoom[room.id] || [];
            const masterPano = roomPanos.find(p => p.metadataJson?.isMaster);
            
            return (
              <div key={room.id} className="border rounded-lg p-3">
                <div className="flex items-center justify-between mb-2">
                  <div className="font-medium">{room.name}</div>
                  <Badge variant="outline">
                    {roomPanos.length} pano{roomPanos.length !== 1 ? 's' : ''}
                  </Badge>
                </div>
                
                {roomPanos.length > 0 ? (
                  <div className="space-y-1">
                    {roomPanos.map((pano) => (
                      <div key={pano.id} className="flex items-center justify-between text-sm p-1">
                        <div className="flex items-center gap-2">
                          {pano.metadataJson?.isMaster && (
                            <Star className="h-3 w-3 text-warning fill-current" />
                          )}
                          <span className="truncate">{pano.title}</span>
                        </div>
                        
                        <div className="flex gap-1">
                          {!pano.metadataJson?.isMaster && roomPanos.length > 1 && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleSetMaster(pano.id, room.id)}
                              className="h-6 px-2 text-xs"
                            >
                              Set Master
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleUnassign(pano.id)}
                            className="h-6 px-2 text-xs text-destructive hover:text-destructive"
                          >
                            Unassign
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-xs text-muted-foreground italic">
                    No panoramas assigned
                  </div>
                )}
              </div>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
};