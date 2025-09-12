import { useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Save, Edit3, MapPin, Camera, Plus, FileText } from "lucide-react";
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
  fileName?: string;
  imageUrl?: string;
}

interface ContextInfoCardProps {
  selectedRoomId: string;
  selectedPanoId: string;
  rooms: Room[];
  panoramas: Panorama[];
  panoMarkers: any[];
}

export const ContextInfoCard = ({
  selectedRoomId,
  selectedPanoId,
  rooms,
  panoramas,
  panoMarkers
}: ContextInfoCardProps) => {
  const [roomNotes, setRoomNotes] = useState("");
  const [panoNotes, setPanoNotes] = useState("");
  const [roomTags, setRoomTags] = useState("");
  const [panoTags, setPanoTags] = useState("");
  const [saveStatus, setSaveStatus] = useState<"saved" | "saving" | "error">("saved");

  const selectedRoom = rooms.find(r => r.id === selectedRoomId);
  const selectedPano = panoramas.find(p => p.nodeId === selectedPanoId);
  const roomPanos = panoMarkers.filter(m => m.roomId === selectedRoomId);

  const handleSave = useCallback(async () => {
    setSaveStatus("saving");
    try {
      // Simulate save operation
      await new Promise(resolve => setTimeout(resolve, 500));
      setSaveStatus("saved");
      toast.success("Changes saved successfully");
    } catch (error) {
      setSaveStatus("error");
      toast.error("Failed to save changes");
    }
  }, []);

  const calculateCompleteness = (roomData?: Room) => {
    if (!roomData?.data || roomData.data.length === 0) return 0;
    
    const validFields = roomData.data.filter(field => 
      field && field !== "" && field !== "No Data Provided"
    ).length;
    
    return Math.round((validFields / roomData.data.length) * 100);
  };

  const getCompletenessColor = (percentage: number) => {
    if (percentage >= 80) return "bg-green-500";
    if (percentage >= 60) return "bg-yellow-500";
    if (percentage >= 40) return "bg-orange-500";
    return "bg-red-500";
  };

  if (!selectedRoom && !selectedPano) {
    return (
      <Card className="w-full">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Context Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center text-muted-foreground py-8">
            <div className="text-2xl mb-2">📋</div>
            <p className="text-sm">Select a room or panorama</p>
            <p className="text-xs mt-1">to view detailed information</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm">Context Information</CardTitle>
          <Badge 
            variant={saveStatus === "saved" ? "secondary" : saveStatus === "saving" ? "outline" : "destructive"}
            className="text-xs"
          >
            {saveStatus === "saved" && "Saved"}
            {saveStatus === "saving" && "Saving..."}
            {saveStatus === "error" && "Error"}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {selectedRoom && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-muted-foreground" />
              <h3 className="font-medium text-sm">Room Information</h3>
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Room ID:</span>
                <span className="text-xs font-mono">{selectedRoom.id}</span>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Data Completeness:</span>
                <div className="flex items-center gap-2">
                  <div className="w-16 h-2 bg-muted rounded-full overflow-hidden">
                    <div 
                      className={`h-full transition-all ${getCompletenessColor(calculateCompleteness(selectedRoom))}`}
                      style={{ width: `${calculateCompleteness(selectedRoom)}%` }}
                    />
                  </div>
                  <span className="text-xs">{calculateCompleteness(selectedRoom)}%</span>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Panoramas:</span>
                <span className="text-xs">{roomPanos.length} assigned</span>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs text-muted-foreground">Tags:</label>
              <Input 
                value={roomTags}
                onChange={(e) => setRoomTags(e.target.value)}
                placeholder="room, office, meeting"
                className="text-xs"
                onBlur={handleSave}
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs text-muted-foreground">Notes:</label>
              <Textarea 
                value={roomNotes}
                onChange={(e) => setRoomNotes(e.target.value)}
                placeholder="Add notes about this room..."
                className="text-xs min-h-16"
                onBlur={handleSave}
              />
            </div>
          </div>
        )}

        {selectedRoom && selectedPano && <Separator />}

        {selectedPano && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Camera className="h-4 w-4 text-muted-foreground" />
              <h3 className="font-medium text-sm">Panorama Information</h3>
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Pano ID:</span>
                <span className="text-xs font-mono">{selectedPano.nodeId.slice(-8)}</span>
              </div>
              
              {selectedPano.fileName && (
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Filename:</span>
                  <span className="text-xs truncate max-w-24" title={selectedPano.fileName}>
                    {selectedPano.fileName}
                  </span>
                </div>
              )}

              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Status:</span>
                <Badge variant="outline" className="text-xs">
                  {selectedPano.imageUrl ? "Ready" : "Processing"}
                </Badge>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs text-muted-foreground">Tags:</label>
              <Input 
                value={panoTags}
                onChange={(e) => setPanoTags(e.target.value)}
                placeholder="360, entrance, lobby"
                className="text-xs"
                onBlur={handleSave}
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs text-muted-foreground">Notes:</label>
              <Textarea 
                value={panoNotes}
                onChange={(e) => setPanoNotes(e.target.value)}
                placeholder="Add notes about this panorama..."
                className="text-xs min-h-16"
                onBlur={handleSave}
              />
            </div>
          </div>
        )}

        <Separator />

        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-muted-foreground" />
            <h3 className="font-medium text-sm">Linked Assets</h3>
          </div>
          
          <div className="grid grid-cols-3 gap-2">
            {/* Placeholder for asset thumbnails */}
            <div className="aspect-square bg-muted rounded border-2 border-dashed border-muted-foreground/30 flex items-center justify-center">
              <Plus className="h-4 w-4 text-muted-foreground" />
            </div>
          </div>
          
          <Button size="sm" variant="outline" className="w-full text-xs">
            <Plus className="h-3 w-3 mr-1" />
            Add Asset
          </Button>
        </div>

        <div className="flex gap-2">
          <Button size="sm" variant="outline" className="flex-1 text-xs" onClick={handleSave}>
            <Save className="h-3 w-3 mr-1" />
            Save All
          </Button>
          <Button size="sm" variant="outline" className="flex-1 text-xs">
            <Edit3 className="h-3 w-3 mr-1" />
            Edit Fields
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};