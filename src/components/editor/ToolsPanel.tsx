import { useState } from "react";
import { Settings, Database, Image, Grid, Save } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { VisibilityFilterControl } from "./VisibilityFilterControl";
import { RoomsList } from "./RoomsList";
import { UnassignedPanosList } from "./UnassignedPanosList";
import { FloorPlanUploader } from "./FloorPlanUploader";
import { RoomsImporter } from "./RoomsImporter";
import { useFloorplanStore } from "@/stores/floorplanStore";

export const ToolsPanel = () => {
  const { 
    unsavedChanges, 
    preferences, 
    updatePreferences,
    mode,
    setMode 
  } = useFloorplanStore();

  const handleSave = () => {
    // TODO: Implement save logic
    console.log('Saving changes...');
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header with save status */}
      <div className="p-4 border-b">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold">Edit Floorplan</h3>
          <div className="flex items-center gap-2">
            {unsavedChanges && (
              <Badge variant="secondary" className="text-xs">
                Unsaved changes
              </Badge>
            )}
            <Button size="sm" variant="outline" onClick={handleSave}>
              <Save className="h-3 w-3 mr-1" />
              Save
            </Button>
          </div>
        </div>
        
        <VisibilityFilterControl />
      </div>

      {/* Main content */}
      <div className="flex-1 overflow-hidden">
        <Tabs defaultValue="rooms" className="h-full flex flex-col">
          <TabsList className="grid w-full grid-cols-4 mx-4 mt-2">
            <TabsTrigger value="plan" className="text-xs">Plan</TabsTrigger>
            <TabsTrigger value="rooms" className="text-xs">Rooms</TabsTrigger>
            <TabsTrigger value="panos" className="text-xs">Panos</TabsTrigger>
            <TabsTrigger value="settings" className="text-xs">Settings</TabsTrigger>
          </TabsList>
          
          <TabsContent value="plan" className="flex-1 overflow-auto m-0 p-4 space-y-4">
            <FloorPlanUploader />
          </TabsContent>
          
          <TabsContent value="rooms" className="flex-1 overflow-hidden m-0 p-4 space-y-4">
            <RoomsImporter />
            <RoomsList />
          </TabsContent>
          
          <TabsContent value="panos" className="flex-1 overflow-hidden m-0 p-4">
            <UnassignedPanosList />
          </TabsContent>
          
          <TabsContent value="settings" className="flex-1 overflow-auto m-0 p-4">
            <div className="space-y-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">Drawing Settings</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="snap-mode" className="text-sm">Snap to grid</Label>
                    <Switch
                      id="snap-mode"
                      checked={preferences.snap}
                      onCheckedChange={(checked) => updatePreferences({ snap: checked })}
                    />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <Label htmlFor="show-grid" className="text-sm">Show grid</Label>
                    <Switch
                      id="show-grid"
                      checked={preferences.grid}
                      onCheckedChange={(checked) => updatePreferences({ grid: checked })}
                    />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">Interaction Mode</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {(['select', 'draw', 'edit', 'dropPano'] as const).map((modeOption) => (
                    <Button
                      key={modeOption}
                      variant={mode === modeOption ? "default" : "ghost"}
                      size="sm"
                      className="w-full justify-start"
                      onClick={() => setMode(modeOption)}
                    >
                      {modeOption.charAt(0).toUpperCase() + modeOption.slice(1)}
                    </Button>
                  ))}
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};