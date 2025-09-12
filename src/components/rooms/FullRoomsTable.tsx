import { useState, useMemo, useRef, useCallback } from "react";
import { Search, Download, Upload, Plus, X, Edit2, Save, MoreHorizontal, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { Room } from "@/types/building";
import { useFloorplanStore } from "@/stores/floorplanStore";
import { useBuildingStore } from "@/stores/buildingStore";
import Papa from "papaparse";

interface ColumnDefinition {
  key: string;
  label: string;
  type: 'text' | 'number' | 'tags' | 'readonly';
  required?: boolean;
  width?: number;
}

interface ImportPreview {
  action: 'create' | 'update' | 'skip' | 'error';
  roomData: Partial<Room> & { _tempId?: string };
  errors: string[];
  originalIndex: number;
}

export const FullRoomsTable = () => {
  const { 
    rooms, 
    addRoom, 
    updateRoom, 
    deleteRoom,
    setUnsavedChanges 
  } = useFloorplanStore();
  
  const { getActiveFloor } = useBuildingStore();
  
  const [searchTerm, setSearchTerm] = useState("");
  const [sortColumn, setSortColumn] = useState<string>("");
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [editingCell, setEditingCell] = useState<{ roomId: string; column: string } | null>(null);
  const [editingValue, setEditingValue] = useState("");
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importPreview, setImportPreview] = useState<ImportPreview[]>([]);
  const [columnMapping, setColumnMapping] = useState<Record<string, string>>({});
  const [importStep, setImportStep] = useState<'upload' | 'mapping' | 'preview' | 'processing'>('upload');
  const [dryRun, setDryRun] = useState(true);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const activeFloor = getActiveFloor();

  // Default column definitions - can be extended
  const defaultColumns: ColumnDefinition[] = [
    { key: 'name', label: 'Room Name', type: 'text', required: true, width: 200 },
    { key: 'id', label: 'Room ID', type: 'text', width: 120 },
    { key: 'area', label: 'Area (m²)', type: 'readonly', width: 100 },
    { key: 'perimeter', label: 'Perimeter (m)', type: 'readonly', width: 120 },
    { key: 'notes', label: 'Notes', type: 'text', width: 250 },
    { key: 'tags', label: 'Tags', type: 'tags', width: 200 },
  ];

  // Get schema columns from floor or use defaults
  const columns = useMemo(() => {
    if (activeFloor?.calibrationJson) {
      // Extract schema from floor if available
      return defaultColumns;
    }
    return defaultColumns;
  }, [activeFloor]);

  // Filter and sort rooms
  const filteredAndSortedRooms = useMemo(() => {
    let filtered = rooms.filter(room => 
      room.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      room.id.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (sortColumn) {
      filtered.sort((a, b) => {
        let aVal = getValueForColumn(a, sortColumn);
        let bVal = getValueForColumn(b, sortColumn);
        
        if (typeof aVal === 'string') aVal = aVal.toLowerCase();
        if (typeof bVal === 'string') bVal = bVal.toLowerCase();
        
        if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
        if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
        return 0;
      });
    }

    return filtered;
  }, [rooms, searchTerm, sortColumn, sortDirection]);

  const getValueForColumn = (room: Room, columnKey: string): any => {
    switch (columnKey) {
      case 'name':
        return room.name;
      case 'id':
        return room.id;
      case 'area':
        return calculateArea(room.polygon) || 0;
      case 'perimeter':
        return calculatePerimeter(room.polygon) || 0;
      case 'notes':
        return room.propertiesJson?.notes || '';
      case 'tags':
        return room.propertiesJson?.tags || [];
      default:
        return room.propertiesJson?.[columnKey] || '';
    }
  };

  const calculateArea = (polygon: Array<[number, number]>): number => {
    if (!polygon || polygon.length < 3) return 0;
    
    let area = 0;
    for (let i = 0; i < polygon.length; i++) {
      const j = (i + 1) % polygon.length;
      area += polygon[i][0] * polygon[j][1];
      area -= polygon[j][0] * polygon[i][1];
    }
    return Math.abs(area) / 2;
  };

  const calculatePerimeter = (polygon: Array<[number, number]>): number => {
    if (!polygon || polygon.length < 2) return 0;
    
    let perimeter = 0;
    for (let i = 0; i < polygon.length; i++) {
      const j = (i + 1) % polygon.length;
      const dx = polygon[j][0] - polygon[i][0];
      const dy = polygon[j][1] - polygon[i][1];
      perimeter += Math.sqrt(dx * dx + dy * dy);
    }
    return perimeter;
  };

  const handleSort = (columnKey: string) => {
    if (sortColumn === columnKey) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(columnKey);
      setSortDirection('asc');
    }
  };

  const handleCellEdit = (roomId: string, columnKey: string, currentValue: any) => {
    setEditingCell({ roomId, column: columnKey });
    setEditingValue(Array.isArray(currentValue) ? currentValue.join(', ') : String(currentValue || ''));
  };

  const handleSaveCell = () => {
    if (!editingCell) return;

    const { roomId, column } = editingCell;
    let newValue: any = editingValue;

    // Parse value based on column type
    const columnDef = columns.find(c => c.key === column);
    if (columnDef?.type === 'tags') {
      newValue = editingValue.split(',').map(tag => tag.trim()).filter(Boolean);
    } else if (columnDef?.type === 'number') {
      newValue = parseFloat(editingValue) || 0;
    }

    // Update room
    const room = rooms.find(r => r.id === roomId);
    if (room) {
      if (column === 'name') {
        updateRoom(roomId, { name: newValue });
      } else {
        updateRoom(roomId, {
          propertiesJson: {
            ...room.propertiesJson,
            [column]: newValue
          }
        });
      }
    }

    setEditingCell(null);
    setUnsavedChanges(true);
  };

  const handleCancelEdit = () => {
    setEditingCell(null);
    setEditingValue("");
  };

  const handleRowSelect = (roomId: string, selected: boolean) => {
    const newSelected = new Set(selectedRows);
    if (selected) {
      newSelected.add(roomId);
    } else {
      newSelected.delete(roomId);
    }
    setSelectedRows(newSelected);
  };

  const handleSelectAll = () => {
    if (selectedRows.size === filteredAndSortedRooms.length) {
      setSelectedRows(new Set());
    } else {
      setSelectedRows(new Set(filteredAndSortedRooms.map(r => r.id)));
    }
  };

  const handleDeleteSelected = () => {
    if (selectedRows.size === 0) return;
    
    if (confirm(`Delete ${selectedRows.size} selected rooms?`)) {
      selectedRows.forEach(roomId => deleteRoom(roomId));
      setSelectedRows(new Set());
      toast.success(`Deleted ${selectedRows.size} rooms`);
    }
  };

  const handleAddRoom = () => {
    const newRoom: Room = {
      id: `room_${Date.now()}`,
      floorId: activeFloor?.id || '',
      name: `Room ${rooms.length + 1}`,
      polygon: [],
      propertiesJson: {},
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    addRoom(newRoom);
    toast.success("New room added");
  };

  // Import/Export functionality
  const handleImportClick = () => {
    setShowImportDialog(true);
    setImportStep('upload');
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.name.match(/\.(csv|xlsx?)$/i)) {
      toast.error("Please select a CSV or Excel file");
      return;
    }

    setImportFile(file);
    processImportFile(file);
  };

  const processImportFile = (file: File) => {
    if (file.name.match(/\.csv$/i)) {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          if (results.errors.length > 0) {
            toast.error("Error parsing CSV file");
            return;
          }
          setupColumnMapping(results.meta.fields || [], results.data);
        }
      });
    } else {
      toast.error("Excel files not yet supported, please use CSV");
    }
  };

  const setupColumnMapping = (fileHeaders: string[], fileData: any[]) => {
    // Auto-map common columns
    const mapping: Record<string, string> = {};
    
    fileHeaders.forEach(header => {
      const lowerHeader = header.toLowerCase();
      if (lowerHeader.includes('name') || lowerHeader.includes('room')) {
        mapping[header] = 'name';
      } else if (lowerHeader.includes('id')) {
        mapping[header] = 'id';
      } else if (lowerHeader.includes('note')) {
        mapping[header] = 'notes';
      } else if (lowerHeader.includes('tag')) {
        mapping[header] = 'tags';
      }
    });

    setColumnMapping(mapping);
    setImportStep('mapping');
    
    // Generate preview with mapped data
    generateImportPreview(fileData, mapping);
  };

  const generateImportPreview = (fileData: any[], mapping: Record<string, string>) => {
    const preview: ImportPreview[] = fileData.map((row, index) => {
      const roomData: Partial<Room> & { _tempId?: string } = {
        _tempId: `import_${index}`,
        propertiesJson: {}
      };

      const errors: string[] = [];

      // Map columns
      Object.entries(mapping).forEach(([fileColumn, roomColumn]) => {
        const value = row[fileColumn];
        if (roomColumn === 'name') {
          roomData.name = value;
        } else if (roomColumn === 'id') {
          roomData.id = value;
        } else if (roomColumn === 'tags') {
          roomData.propertiesJson![roomColumn] = value ? value.split(',').map((t: string) => t.trim()) : [];
        } else {
          roomData.propertiesJson![roomColumn] = value;
        }
      });

      // Validate required fields
      if (!roomData.name || roomData.name.trim() === '') {
        errors.push("Room name is required");
      }

      // Determine action
      let action: ImportPreview['action'] = 'create';
      if (errors.length > 0) {
        action = 'error';
      } else if (roomData.id && rooms.find(r => r.id === roomData.id)) {
        action = 'update';
      }

      return {
        action,
        roomData,
        errors,
        originalIndex: index
      };
    });

    setImportPreview(preview);
    setImportStep('preview');
  };

  const handleConfirmImport = async () => {
    if (dryRun) {
      setDryRun(false);
      toast.info("Dry run completed. Click again to commit changes.");
      return;
    }

    setImportStep('processing');

    let created = 0;
    let updated = 0;
    let skipped = 0;

    try {
      for (const item of importPreview) {
        if (item.action === 'error' || item.action === 'skip') {
          skipped++;
          continue;
        }

        const roomData = item.roomData;
        if (item.action === 'create') {
          const newRoom: Room = {
            id: roomData.id || `room_${Date.now()}_${created}`,
            floorId: activeFloor?.id || '',
            name: roomData.name || '',
            polygon: [],
            propertiesJson: roomData.propertiesJson || {},
            createdAt: new Date(),
            updatedAt: new Date()
          };
          addRoom(newRoom);
          created++;
        } else if (item.action === 'update' && roomData.id) {
          updateRoom(roomData.id, {
            name: roomData.name,
            propertiesJson: roomData.propertiesJson,
            updatedAt: new Date()
          });
          updated++;
        }
      }

      toast.success(`Import completed: ${created} created, ${updated} updated, ${skipped} skipped`);
      setShowImportDialog(false);
      resetImportState();
    } catch (error) {
      toast.error("Import failed: " + (error instanceof Error ? error.message : "Unknown error"));
    }
  };

  const resetImportState = () => {
    setImportFile(null);
    setImportPreview([]);
    setColumnMapping({});
    setImportStep('upload');
    setDryRun(true);
  };

  const handleExportCSV = () => {
    const exportData = filteredAndSortedRooms.map(room => {
      const data: Record<string, any> = {};
      columns.forEach(col => {
        data[col.label] = getValueForColumn(room, col.key);
      });
      return data;
    });

    const csv = Papa.unparse(exportData);
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `rooms_${activeFloor?.name || 'export'}_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    toast.success("Rooms exported to CSV");
  };

  const renderCell = (room: Room, column: ColumnDefinition) => {
    const value = getValueForColumn(room, column.key);
    const isEditing = editingCell?.roomId === room.id && editingCell?.column === column.key;

    if (isEditing) {
      return (
        <div className="flex items-center gap-1">
          <Input
            value={editingValue}
            onChange={(e) => setEditingValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSaveCell();
              if (e.key === 'Escape') handleCancelEdit();
            }}
            onBlur={handleSaveCell}
            className="h-7 text-xs"
            autoFocus
          />
        </div>
      );
    }

    if (column.type === 'tags' && Array.isArray(value)) {
      return (
        <div className="flex flex-wrap gap-1">
          {value.map((tag, i) => (
            <Badge key={i} variant="secondary" className="text-xs">
              {tag}
            </Badge>
          ))}
        </div>
      );
    }

    if (column.type === 'readonly') {
      return (
        <span className="text-xs text-muted-foreground">
          {typeof value === 'number' ? value.toFixed(2) : value}
        </span>
      );
    }

    return (
      <span 
        className="text-xs cursor-pointer hover:bg-accent/50 p-1 -m-1 rounded"
        onClick={() => handleCellEdit(room.id, column.key, value)}
      >
        {value || '-'}
      </span>
    );
  };

  return (
    <>
      <Card className="h-full flex flex-col">
        <CardHeader className="flex-shrink-0 pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CardTitle className="text-sm">Rooms</CardTitle>
              <Badge variant="outline" className="text-xs">
                {filteredAndSortedRooms.length} of {rooms.length}
              </Badge>
            </div>
            
            <div className="flex items-center gap-2">
              <Button size="sm" variant="outline" onClick={handleImportClick}>
                <Upload className="h-3 w-3 mr-1" />
                Import
              </Button>
              <Button size="sm" variant="outline" onClick={handleExportCSV}>
                <Download className="h-3 w-3 mr-1" />
                Export
              </Button>
              <Button size="sm" onClick={handleAddRoom}>
                <Plus className="h-3 w-3 mr-1" />
                Add Room
              </Button>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-3 w-3 text-muted-foreground" />
              <Input
                placeholder="Search rooms..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-7 h-8 text-xs"
              />
            </div>
            
            {selectedRows.size > 0 && (
              <Button size="sm" variant="destructive" onClick={handleDeleteSelected}>
                <Trash2 className="h-3 w-3 mr-1" />
                Delete ({selectedRows.size})
              </Button>
            )}
          </div>
        </CardHeader>

        <CardContent className="flex-1 overflow-hidden p-0">
          <div className="border rounded-lg mx-4 mb-4 overflow-hidden">
            <ScrollArea className="h-full w-full">
              <div className="min-w-max">
                <table className="w-full text-xs">
                  <thead className="bg-muted/50 sticky top-0 z-10">
                    <tr>
                      <th className="w-8 p-2 border-r">
                        <input
                          type="checkbox"
                          checked={filteredAndSortedRooms.length > 0 && selectedRows.size === filteredAndSortedRooms.length}
                          onChange={handleSelectAll}
                          className="rounded"
                        />
                      </th>
                      {columns.map(column => (
                        <th
                          key={column.key}
                          className="p-2 text-left border-r cursor-pointer hover:bg-muted/70"
                          style={{ width: column.width }}
                          onClick={() => handleSort(column.key)}
                        >
                          <div className="flex items-center gap-1">
                            <span>{column.label}</span>
                            {column.required && <span className="text-destructive">*</span>}
                            {sortColumn === column.key && (
                              <span className="text-xs">
                                {sortDirection === 'asc' ? '↑' : '↓'}
                              </span>
                            )}
                          </div>
                        </th>
                      ))}
                      <th className="w-8 p-2"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredAndSortedRooms.map((room, index) => (
                      <tr key={room.id} className={`border-b hover:bg-muted/20 ${selectedRows.has(room.id) ? 'bg-accent/30' : ''}`}>
                        <td className="p-2 border-r">
                          <input
                            type="checkbox"
                            checked={selectedRows.has(room.id)}
                            onChange={(e) => handleRowSelect(room.id, e.target.checked)}
                            className="rounded"
                          />
                        </td>
                        {columns.map(column => (
                          <td key={column.key} className="p-2 border-r">
                            {renderCell(room, column)}
                          </td>
                        ))}
                        <td className="p-2">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                                <MoreHorizontal className="h-3 w-3" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent>
                              <DropdownMenuItem onClick={() => handleCellEdit(room.id, 'name', room.name)}>
                                <Edit2 className="h-3 w-3 mr-1" />
                                Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem 
                                onClick={() => deleteRoom(room.id)}
                                className="text-destructive"
                              >
                                <Trash2 className="h-3 w-3 mr-1" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {filteredAndSortedRooms.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    {searchTerm ? 'No rooms match your search' : 'No rooms yet'}
                  </div>
                )}
              </div>
            </ScrollArea>
          </div>
        </CardContent>
      </Card>

      {/* Import Dialog */}
      <Dialog open={showImportDialog} onOpenChange={setShowImportDialog}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>Import Rooms</DialogTitle>
          </DialogHeader>

          <div className="flex-1 overflow-hidden">
            {importStep === 'upload' && (
              <div className="space-y-4">
                <div className="border-2 border-dashed border-muted rounded-lg p-8 text-center">
                  <Upload className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-sm text-muted-foreground mb-4">
                    Upload your rooms CSV file
                  </p>
                  <Button onClick={() => fileInputRef.current?.click()}>
                    Choose File
                  </Button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".csv,.xlsx,.xls"
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                </div>
              </div>
            )}

            {importStep === 'mapping' && importFile && (
              <div className="space-y-4">
                <h3 className="font-medium">Map Columns</h3>
                <p className="text-sm text-muted-foreground">
                  Map the columns from your file to room properties:
                </p>
                
                <div className="space-y-3 max-h-60 overflow-y-auto">
                  {Object.keys(columnMapping).map(fileColumn => (
                    <div key={fileColumn} className="flex items-center gap-4">
                      <span className="w-32 text-sm font-mono">{fileColumn}</span>
                      <span>→</span>
                      <Select
                        value={columnMapping[fileColumn]}
                        onValueChange={(value) => setColumnMapping(prev => ({ ...prev, [fileColumn]: value }))}
                      >
                        <SelectTrigger className="w-48">
                          <SelectValue placeholder="Select field" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="">Skip</SelectItem>
                          {columns.map(col => (
                            <SelectItem key={col.key} value={col.key}>
                              {col.label} {col.required && '*'}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {importStep === 'preview' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-medium">Import Preview</h3>
                  <div className="flex items-center gap-4 text-xs">
                    <Badge variant="secondary">
                      Create: {importPreview.filter(p => p.action === 'create').length}
                    </Badge>
                    <Badge variant="outline">
                      Update: {importPreview.filter(p => p.action === 'update').length}
                    </Badge>
                    <Badge variant="destructive">
                      Errors: {importPreview.filter(p => p.action === 'error').length}
                    </Badge>
                  </div>
                </div>

                <ScrollArea className="h-60 border rounded">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b">
                        <th className="p-2 text-left">Action</th>
                        <th className="p-2 text-left">Room Name</th>
                        <th className="p-2 text-left">ID</th>
                        <th className="p-2 text-left">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {importPreview.map((item, index) => (
                        <tr key={index} className="border-b">
                          <td className="p-2">
                            <Badge 
                              variant={
                                item.action === 'create' ? 'secondary' :
                                item.action === 'update' ? 'outline' :
                                item.action === 'error' ? 'destructive' : 'secondary'
                              }
                              className="text-xs"
                            >
                              {item.action}
                            </Badge>
                          </td>
                          <td className="p-2">{item.roomData.name}</td>
                          <td className="p-2">{item.roomData.id}</td>
                          <td className="p-2">
                            {item.errors.length > 0 ? (
                              <span className="text-destructive text-xs">
                                {item.errors.join(', ')}
                              </span>
                            ) : (
                              <span className="text-success text-xs">OK</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </ScrollArea>
              </div>
            )}
          </div>

          <DialogFooter className="flex-shrink-0">
            {importStep === 'upload' && (
              <Button variant="outline" onClick={() => setShowImportDialog(false)}>
                Cancel
              </Button>
            )}
            
            {importStep === 'mapping' && (
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setImportStep('upload')}>
                  Back
                </Button>
                <Button onClick={() => generateImportPreview([], columnMapping)}>
                  Preview
                </Button>
              </div>
            )}
            
            {importStep === 'preview' && (
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setImportStep('mapping')}>
                  Back
                </Button>
                <Button onClick={handleConfirmImport}>
                  {dryRun ? 'Dry Run' : 'Import'}
                </Button>
              </div>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};