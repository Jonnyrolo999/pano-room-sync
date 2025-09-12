import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ExternalLink, Copy, Star, Calendar } from "lucide-react";
import { PanoramaViewer } from "../viewer/PanoramaViewer";
import { toast } from "sonner";

interface Panorama {
  nodeId: string;
  title: string;
  floor?: string;
  fileName?: string;
  imageUrl?: string;
}

interface PanoViewerCardProps {
  selectedPanoId: string;
  panoramas: Panorama[];
  onPanoSelect?: (panoId: string) => void;
}

export const PanoViewerCard = ({ selectedPanoId, panoramas, onPanoSelect }: PanoViewerCardProps) => {
  const selectedPano = panoramas.find(p => p.nodeId === selectedPanoId);

  const handleCopyLink = () => {
    if (selectedPano) {
      const deepLink = `${window.location.origin}${window.location.pathname}?pano=${selectedPano.nodeId}`;
      navigator.clipboard.writeText(deepLink);
      toast.success("Deep link copied to clipboard");
    }
  };

  const handleOpenFull = () => {
    if (selectedPano?.imageUrl) {
      window.open(selectedPano.imageUrl, '_blank');
    }
  };

  if (!selectedPano) {
    return (
      <Card className="w-full">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">360° Panorama Viewer</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-48 bg-muted/30 rounded-lg border-2 border-dashed border-muted">
            <div className="text-center text-muted-foreground">
              <div className="text-2xl mb-2">🏠</div>
              <p className="text-sm">Select a panorama to view</p>
              <p className="text-xs mt-1">Click a pano pin on the floor plan</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm">360° Panorama Viewer</CardTitle>
          <Badge variant="secondary" className="text-xs">
            <Calendar className="h-3 w-3 mr-1" />
            Live
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="font-medium text-sm">{selectedPano.title || selectedPano.nodeId}</h3>
            <div className="flex gap-1">
              <Button size="sm" variant="ghost" onClick={handleOpenFull} title="Open in full screen">
                <ExternalLink className="h-3 w-3" />
              </Button>
              <Button size="sm" variant="ghost" onClick={handleCopyLink} title="Copy deep link">
                <Copy className="h-3 w-3" />
              </Button>
              <Button size="sm" variant="ghost" title="Set as room default">
                <Star className="h-3 w-3" />
              </Button>
            </div>
          </div>
          
          {selectedPano.fileName && (
            <p className="text-xs text-muted-foreground">
              File: {selectedPano.fileName}
            </p>
          )}
        </div>

        <div className="aspect-video bg-muted rounded-lg overflow-hidden">
          {selectedPano.imageUrl ? (
            <PanoramaViewer
              imageUrl={selectedPano.imageUrl}
              nodeId={selectedPano.nodeId}
              roomData={null}
              headers={{ row1: [], row2: [] }}
              onHotspotClick={() => {}}
              highlightedField=""
            />
          ) : (
            <div className="flex items-center justify-center h-full text-muted-foreground">
              <div className="text-center">
                <div className="text-xl mb-2">📷</div>
                <p className="text-sm">No image available</p>
              </div>
            </div>
          )}
        </div>

        <div className="flex gap-2 text-xs">
          <Button size="sm" variant="outline" className="flex-1">
            Assign to Room
          </Button>
          <Button size="sm" variant="outline" className="flex-1">
            Add Hotspots
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};