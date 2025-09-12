import { useState, useRef } from "react";
import { Upload, Download, FileSpreadsheet, Loader2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import { useFloorplanStore } from "@/stores/floorplanStore";
import { useBuildingStore } from "@/stores/buildingStore";
import { Room } from "@/types/building";
import Papa from "papaparse";
import * as XLSX from "xlsx";

interface ImportPreview {
  action: 'create' | 'update' | 'skip';
  room: Partial<Room>;
  errors: string[];
  rowIndex: number;
}

export const RoomsImporter = () => {
  const { rooms, addRoom, updateRoom } = useFloorplanStore();
  const { getActiveFloor } = useBuildingStore();
  const [isImporting, setIsImporting] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [importPreview, setImportPreview] = useState<ImportPreview[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const activeFloor = getActiveFloor();

  const parsePolygon = (polygonStr: string): Array<[number, number]> | null => {
    try {
      // Try parsing as JSON array first
      const parsed = JSON.parse(polygonStr);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed.map(point => {
          if (Array.isArray(point) && point.length >= 2) {
            return [parseFloat(point[0]), parseFloat(point[1])];
          }
          throw new Error('Invalid point format');
        });
      }
    } catch {
      // Try parsing as simple coordinate pairs (x1,y1;x2,y2;...)
      try {
        const pairs = polygonStr.split(';').map(pair => {
          const coords = pair.trim().split(',').map(c => parseFloat(c.trim()));
          if (coords.length !== 2 || coords.some(isNaN)) {
            throw new Error('Invalid coordinate pair');
          }
          return coords as [number, number];
        });
        return pairs;
      } catch {
        return null;
      }
    }
    return null;
  };

  const processCSVData = (data: any[]): ImportPreview[] => {
    if (!activeFloor) return [];
    
    return data.map((row, index) => {
      const preview: ImportPreview = {
        action: 'create',
        room: {},
        errors: [],
        rowIndex: index + 1
      };

      // Extract room data from CSV row
      const name = row.name || row.room_name || row.title || '';
      const id = row.id || row.room_id || '';
      const polygonStr = row.polygon || row.coordinates || row.geometry || '';
      
      if (!name.trim()) {
        preview.errors.push('Missing room name');
      }

      // Parse polygon if provided
      let polygon: Array<[number, number]> | undefined;
      if (polygonStr) {
        const parsed = parsePolygon(polygonStr);
        if (parsed) {
          polygon = parsed;
        } else {
          preview.errors.push('Invalid polygon format. Use JSON array or x1,y1;x2,y2;x3,y3 format');
        }
      }

      // Check if room already exists (by name or id)
      const existingRoom = rooms.find(r => 
        (id && r.id === id) || r.name === name.trim()
      );

      if (existingRoom) {
        preview.action = 'update';
        preview.room = {
          ...existingRoom,
          name: name.trim(),
          polygon: polygon || existingRoom.polygon,
          propertiesJson: {
            ...existingRoom.propertiesJson,
            ...Object.fromEntries(
              Object.entries(row).filter(([key]) => 
                !['name', 'room_name', 'title', 'id', 'room_id', 'polygon', 'coordinates', 'geometry'].includes(key)
              )
            )
          }
        };
      } else {
        preview.room = {
          id: `room-${Date.now()}-${index}`,
          floorId: activeFloor.id,
          name: name.trim(),
          polygon: polygon || [],
          propertiesJson: Object.fromEntries(
            Object.entries(row).filter(([key]) => 
              !['name', 'room_name', 'title', 'id', 'room_id', 'polygon', 'coordinates', 'geometry'].includes(key)
            )
          ),
          createdAt: new Date(),
          updatedAt: new Date()
        };
      }

      if (preview.errors.length === 0 && !polygon && preview.action === 'create') {
        preview.action = 'skip';
        preview.errors.push('No polygon coordinates provided');
      }

      return preview;
    });
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const name = file.name.toLowerCase();

    setIsImporting(true);
    
    try {
      if (name.endsWith('.csv')) {
        Papa.parse(file, {
          header: true,
          skipEmptyLines: true,
          complete: (results) => {
            if (results.errors.length > 0) {
              toast.error(`CSV parsing errors: ${results.errors.map(e => e.message).join(', ')}`);
              setIsImporting(false);
              return;
            }

            const preview = processCSVData(results.data as any[]);
            setImportPreview(preview);
            setShowPreview(true);
            setIsImporting(false);
          },
          error: (error) => {
            toast.error(`Failed to parse CSV: ${error.message}`);
            setIsImporting(false);
          }
        });
      } else if (name.endsWith('.xlsx') || name.endsWith('.xls')) {
        const buffer = await file.arrayBuffer();
        const workbook = XLSX.read(buffer);
        const worksheet = workbook.Sheets[workbook.SheetNames[0]];
        const json = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

        const preview = processCSVData(json as any[]);
        setImportPreview(preview);
        setShowPreview(true);
        setIsImporting(false);
      } else {
        toast.error('Unsupported file format. Please upload CSV or Excel files.');
        setIsImporting(false);
      }
    } catch (error) {
      toast.error('Failed to read file');
      setIsImporting(false);
    }

    // Clear input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleConfirmImport = () => {
    const toCreate = importPreview.filter(p => p.action === 'create' && p.errors.length === 0);
    const toUpdate = importPreview.filter(p => p.action === 'update' && p.errors.length === 0);

    toCreate.forEach(item => {
      if (item.room.id) {
        addRoom(item.room as Room);
      }
    });

    toUpdate.forEach(item => {
      if (item.room.id) {
        updateRoom(item.room.id, item.room);
      }
    });

    toast.success(`Import complete: ${toCreate.length} created, ${toUpdate.length} updated`);
    setShowPreview(false);
    setImportPreview([]);
  };

  const handleExportCSV = () => {
    if (rooms.length === 0) {
      toast.error('No rooms to export');
      return;
    }

    const csvData = rooms.map(room => ({
      id: room.id,
      name: room.name,
      polygon: JSON.stringify(room.polygon),
      ...room.propertiesJson
    }));

    const csv = Papa.unparse(csvData);
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `${activeFloor?.name || 'floor'}-rooms.csv`;
    a.click();
    
    URL.revokeObjectURL(url);
    toast.success('Rooms exported to CSV');
  };

  const createCount = importPreview.filter(p => p.action === 'create' && p.errors.length === 0).length;
  const updateCount = importPreview.filter(p => p.action === 'update' && p.errors.length === 0).length;
  const errorCount = importPreview.filter(p => p.errors.length > 0).length;

  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Import/Export Rooms</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => fileInputRef.current?.click()}
              disabled={isImporting}
              className="flex-1"
            >
              {isImporting ? (
                <>
                  <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <Upload className="h-3 w-3 mr-1" />
                  Import CSV
                </>
              )}
            </Button>
            
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleExportCSV}
              disabled={rooms.length === 0}
            >
              <Download className="h-3 w-3 mr-1" />
              Export CSV
            </Button>
          </div>
          
          <p className="text-xs text-muted-foreground">
            CSV format: name, polygon (JSON or x1,y1;x2,y2), custom fields...
          </p>

          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,.xlsx,.xls"
            onChange={handleFileUpload}
            className="hidden"
          />
        </CardContent>
      </Card>

      {/* Import Preview Dialog */}
      <Dialog open={showPreview} onOpenChange={setShowPreview}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>Import Preview</DialogTitle>
            <DialogDescription>
              Review the changes before importing
            </DialogDescription>
          </DialogHeader>

          <div className="flex gap-2 mb-4">
            <Badge variant="default" className="gap-1">
              <span className="w-2 h-2 bg-green-500 rounded-full"></span>
              Create: {createCount}
            </Badge>
            <Badge variant="secondary" className="gap-1">
              <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
              Update: {updateCount}
            </Badge>
            {errorCount > 0 && (
              <Badge variant="destructive" className="gap-1">
                <AlertCircle className="h-3 w-3" />
                Errors: {errorCount}
              </Badge>
            )}
          </div>

          <div className="flex-1 overflow-auto border rounded">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Row</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Room Name</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {importPreview.map((item, index) => (
                  <TableRow key={index}>
                    <TableCell>{item.rowIndex}</TableCell>
                    <TableCell>
                      <Badge 
                        variant={item.action === 'create' ? 'default' : item.action === 'update' ? 'secondary' : 'outline'}
                      >
                        {item.action}
                      </Badge>
                    </TableCell>
                    <TableCell>{item.room.name}</TableCell>
                    <TableCell>
                      {item.errors.length > 0 ? (
                        <div className="flex items-center gap-1 text-destructive">
                          <AlertCircle className="h-3 w-3" />
                          <span className="text-xs">{item.errors.join(', ')}</span>
                        </div>
                      ) : (
                        <span className="text-xs text-green-600">Ready</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button variant="outline" onClick={() => setShowPreview(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleConfirmImport}
              disabled={createCount + updateCount === 0}
            >
              Import {createCount + updateCount} Rooms
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};