import { useState, useEffect } from "react";
import { ChevronLeft, ChevronRight, Maximize2, Minimize2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FloorPlanView } from "@/components/viewer/FloorPlanView";
import { PanoramaViewer } from "@/components/panorama/PanoramaViewer";
import { ViewerPanel } from "@/components/viewer/ViewerPanel";

interface Room {
  id: string;
  data: any[];
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
}

interface ThreePaneViewerProps {
  floorPlan: FloorPlan | null;
  rooms: Room[];
  headers: { row1: string[]; row2: string[] };
  panoramas: Panorama[];
  selectedRoomId?: string | null;
  currentNodeId: string;
  onRoomSelect: (roomId: string | null) => void;
  onPanoramaChange: (nodeId: string) => void;
}

type PaneState = 'collapsed' | 'normal' | 'expanded';

interface ViewerState {
  leftPane: PaneState;
  centerPane: PaneState;
  rightPane: PaneState;
}

export const ThreePaneViewer = ({
  floorPlan,
  rooms,
  headers,
  panoramas,
  selectedRoomId,
  currentNodeId,
  onRoomSelect,
  onPanoramaChange
}: ThreePaneViewerProps) => {
  const [viewerState, setViewerState] = useState<ViewerState>(() => {
    // Load from localStorage or use defaults
    const saved = localStorage.getItem('viewer-state');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.warn('Failed to load viewer state from localStorage');
      }
    }
    return {
      leftPane: 'normal',
      centerPane: 'normal',
      rightPane: 'normal'
    };
  });

  // Save state to localStorage
  useEffect(() => {
    localStorage.setItem('viewer-state', JSON.stringify(viewerState));
  }, [viewerState]);

  const togglePane = (pane: keyof ViewerState) => {
    setViewerState(prev => ({
      ...prev,
      [pane]: prev[pane] === 'collapsed' ? 'normal' : 'collapsed'
    }));
  };

  const expandPane = (pane: keyof ViewerState) => {
    setViewerState({
      leftPane: 'collapsed',
      centerPane: 'collapsed',
      rightPane: 'collapsed',
      [pane]: 'expanded'
    });
  };

  const resetLayout = () => {
    setViewerState({
      leftPane: 'normal',
      centerPane: 'normal',
      rightPane: 'normal'
    });
  };

  const getCurrentRoom = (): Room | null => {
    if (selectedRoomId) {
      return rooms.find(room => room.id === selectedRoomId) || null;
    }
    return null;
  };

  const getSelectedRoomPanoramas = (): Panorama[] => {
    if (!selectedRoomId || !floorPlan) return [];
    
    const floorPlanRoom = floorPlan.rooms.find(r => r.id === selectedRoomId);
    return floorPlanRoom?.panoramas || [];
  };

  const getGridCols = () => {
    const { leftPane, centerPane, rightPane } = viewerState;
    
    if (leftPane === 'expanded') return 'grid-cols-[1fr_0_0]';
    if (centerPane === 'expanded') return 'grid-cols-[0_1fr_0]';
    if (rightPane === 'expanded') return 'grid-cols-[0_0_1fr]';
    
    // Calculate normal state columns
    const leftWidth = leftPane === 'collapsed' ? '0' : 'minmax(280px,32%)';
    const centerWidth = centerPane === 'collapsed' ? '0' : 'minmax(360px,1fr)';
    const rightWidth = rightPane === 'collapsed' ? '0' : 'minmax(300px,34%)';
    
    return `grid-cols-[${leftWidth}_${centerWidth}_${rightWidth}]`;
  };

  return (
    <div className={`h-[calc(100vh-8rem)] grid gap-4 ${getGridCols()} transition-all duration-300`}>
      {/* Left Pane - Floor Plan */}
      {viewerState.leftPane !== 'collapsed' && (
        <Card className="h-full flex flex-col">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Floor Plan</CardTitle>
              <div className="flex items-center space-x-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => expandPane('leftPane')}
                  disabled={viewerState.leftPane === 'expanded'}
                >
                  <Maximize2 className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => togglePane('leftPane')}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
              </div>
            </div>
            {floorPlan && (
              <div className="flex items-center space-x-2">
                <Badge variant="outline">{floorPlan.rooms.length} rooms</Badge>
                {selectedRoomId && (
                  <Badge variant="default">
                    {floorPlan.rooms.find(r => r.id === selectedRoomId)?.name || 'Selected'}
                  </Badge>
                )}
              </div>
            )}
          </CardHeader>
          <CardContent className="flex-1 p-0">
            <div className="h-full">
              <FloorPlanView
                floorPlan={floorPlan}
                selectedRoomId={selectedRoomId}
                onRoomSelect={onRoomSelect}
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Center Pane - Panorama Viewer */}
      {viewerState.centerPane !== 'collapsed' && (
        <Card className="h-full flex flex-col">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Panorama Viewer</CardTitle>
              <div className="flex items-center space-x-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => expandPane('centerPane')}
                  disabled={viewerState.centerPane === 'expanded'}
                >
                  <Maximize2 className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => togglePane('centerPane')}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
            
            {selectedRoomId && (
              <div className="flex items-center space-x-2">
                <Select
                  value={currentNodeId}
                  onValueChange={onPanoramaChange}
                >
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="Select panorama" />
                  </SelectTrigger>
                  <SelectContent>
                    {getSelectedRoomPanoramas().map(pano => (
                      <SelectItem key={pano.nodeId} value={pano.nodeId}>
                        {pano.title || pano.nodeId}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Badge variant="outline">
                  {getSelectedRoomPanoramas().length} panoramas
                </Badge>
              </div>
            )}
          </CardHeader>
          <CardContent className="flex-1 p-0">
            <div className="h-full">
              <PanoramaViewer
                panoramas={selectedRoomId ? getSelectedRoomPanoramas() : panoramas}
                currentNodeId={currentNodeId}
                onPanoramaChange={onPanoramaChange}
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Right Pane - Room Data */}
      {viewerState.rightPane !== 'collapsed' && (
        <div className="h-full flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">Room Data</h3>
            <div className="flex items-center space-x-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => expandPane('rightPane')}
                disabled={viewerState.rightPane === 'expanded'}
              >
                <Maximize2 className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => togglePane('rightPane')}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
          
          <div className="flex-1">
            <ViewerPanel
              room={getCurrentRoom()}
              headers={headers}
              currentNodeId={currentNodeId}
            />
          </div>
        </div>
      )}

      {/* Floating Reset Button */}
      {Object.values(viewerState).some(state => state !== 'normal') && (
        <Button
          variant="outline"
          size="sm"
          className="fixed bottom-6 right-6 z-50 shadow-lg"
          onClick={resetLayout}
        >
          <Minimize2 className="h-4 w-4 mr-2" />
          Reset Layout
        </Button>
      )}

      {/* Collapsed Pane Indicators */}
      {viewerState.leftPane === 'collapsed' && (
        <Button
          variant="ghost"
          size="sm"
          className="fixed left-4 top-1/2 -translate-y-1/2 z-40 rotate-90 whitespace-nowrap"
          onClick={() => togglePane('leftPane')}
        >
          Floor Plan
        </Button>
      )}
      
      {viewerState.centerPane === 'collapsed' && (
        <Button
          variant="ghost"
          size="sm"
          className="fixed left-1/2 top-1/2 -translate-y-1/2 -translate-x-1/2 z-40 rotate-90 whitespace-nowrap"
          onClick={() => togglePane('centerPane')}
        >
          Panorama
        </Button>
      )}
      
      {viewerState.rightPane === 'collapsed' && (
        <Button
          variant="ghost"
          size="sm"
          className="fixed right-4 top-1/2 -translate-y-1/2 z-40 rotate-90 whitespace-nowrap"
          onClick={() => togglePane('rightPane')}
        >
          Room Data
        </Button>
      )}
    </div>
  );
};