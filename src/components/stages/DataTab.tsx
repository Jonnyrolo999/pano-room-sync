import { FullRoomsTable } from "@/components/rooms/FullRoomsTable";
import { RoomsImporter } from "@/components/editor/RoomsImporter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Database, Upload, Download, Grid3X3, FileSpreadsheet, Plus } from "lucide-react";
import { useBuildingStore } from "@/stores/buildingStore";
import { useFloorplanStore } from "@/stores/floorplanStore";

export const DataTab = () => {
  const { getActiveFloor } = useBuildingStore();
  const { rooms, unsavedChanges } = useFloorplanStore();
  const activeFloor = getActiveFloor();

  const handleExportCSV = () => {
    // TODO: Implement CSV export
    console.log("Exporting CSV...");
  };

  const handleExportXLSX = () => {
    // TODO: Implement XLSX export
    console.log("Exporting XLSX...");
  };

  const handleAddRoom = () => {
    // TODO: Implement add room
    console.log("Adding room...");
  };

  if (!activeFloor) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center text-muted-foreground">
          <Database className="h-16 w-16 mx-auto mb-4 opacity-50" />
          <h3 className="text-lg font-medium mb-2">No Floor Selected</h3>
          <p>Please select or add a floor to manage room data.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header with Actions */}
      <div className="border-b bg-card px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold mb-1">Room Data Management</h2>
            <p className="text-sm text-muted-foreground">
              View, edit, import and export room information for {activeFloor.name}
            </p>
          </div>
          
          <div className="flex items-center gap-3">
            {/* Status */}
            <div className="flex items-center gap-2 text-sm">
              <Badge variant="secondary" className="gap-1">
                <Grid3X3 className="h-3 w-3" />
                {rooms.length} Rooms
              </Badge>
              {unsavedChanges && (
                <Badge variant="destructive" className="text-xs">
                  Unsaved Changes
                </Badge>
              )}
            </div>

            <Separator orientation="vertical" className="h-8" />

            {/* Actions */}
            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={handleAddRoom} className="gap-2">
                <Plus className="h-4 w-4" />
                Add Room
              </Button>
              
              <Button variant="outline" onClick={handleExportCSV} className="gap-2">
                <Download className="h-4 w-4" />
                Export CSV
              </Button>
              
              <Button variant="outline" onClick={handleExportXLSX} className="gap-2">
                <FileSpreadsheet className="h-4 w-4" />
                Export XLSX
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Table Area */}
        <div className="flex-1 flex flex-col">
          <FullRoomsTable />
        </div>

        {/* Side Panel - Import/Export Tools */}
        <div className="w-80 border-l bg-card flex flex-col">
          <div className="p-4 border-b">
            <h3 className="font-semibold text-lg mb-1">Data Tools</h3>
            <p className="text-sm text-muted-foreground">
              Import and export room data
            </p>
          </div>

          <div className="flex-1 overflow-auto p-4 space-y-4">
            {/* Import Section */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Upload className="h-4 w-4" />
                  Import Rooms
                </CardTitle>
                <CardDescription>
                  Upload CSV or XLSX files with room data
                </CardDescription>
              </CardHeader>
              <CardContent>
                <RoomsImporter />
              </CardContent>
            </Card>

            {/* Export Section */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Download className="h-4 w-4" />
                  Export Data
                </CardTitle>
                <CardDescription>
                  Download current room data
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button 
                  variant="outline" 
                  className="w-full justify-start gap-2"
                  onClick={handleExportCSV}
                >
                  <Download className="h-4 w-4" />
                  Export as CSV
                </Button>
                
                <Button 
                  variant="outline" 
                  className="w-full justify-start gap-2"
                  onClick={handleExportXLSX}
                >
                  <FileSpreadsheet className="h-4 w-4" />
                  Export as XLSX
                </Button>

                <div className="text-xs text-muted-foreground">
                  Exports include all visible columns and room polygons in GeoJSON format
                </div>
              </CardContent>
            </Card>

            {/* Column Management */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Column Schema</CardTitle>
                <CardDescription>
                  Manage table columns and data types
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button variant="outline" className="w-full justify-start gap-2">
                  <Plus className="h-4 w-4" />
                  Add Column
                </Button>
                
                <Button variant="outline" className="w-full justify-start gap-2">
                  <Grid3X3 className="h-4 w-4" />
                  Edit Headers
                </Button>

                <div className="text-xs text-muted-foreground">
                  Customize the table structure to match your data needs
                </div>
              </CardContent>
            </Card>

            {/* Data Stats */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Statistics</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Total Rooms:</span>
                  <span className="font-medium">{rooms.length}</span>
                </div>
                
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">With Polygons:</span>
                  <span className="font-medium">
                    {rooms.filter(r => r.polygon.length > 0).length}
                  </span>
                </div>
                
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Total Area:</span>
                  <span className="font-medium">
                    {rooms.reduce((sum, room) => {
                      // Calculate area from polygon if available
                      // TODO: Implement proper polygon area calculation
                      return sum + (room.polygon.length > 0 ? 100 : 0);
                    }, 0).toFixed(1)} m²
                  </span>
                </div>

                {unsavedChanges && (
                  <>
                    <Separator className="my-2" />
                    <div className="text-xs text-warning">
                      You have unsaved changes. Remember to save your work.
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            {/* Help */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Import Format</CardTitle>
              </CardHeader>
              <CardContent className="text-xs text-muted-foreground space-y-2">
                <p><strong>Required columns:</strong> Room Name or Room ID</p>
                <p><strong>Optional columns:</strong> Notes, Tags, Area, Polygon (GeoJSON or WKT)</p>
                <p><strong>Polygon format:</strong> [[x1,y1],[x2,y2],...] or WKT POLYGON</p>
                <p><strong>Tags format:</strong> Comma or semicolon separated</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};