import { useState, useMemo } from "react";
import { Search, Filter, Download, Edit3, ChevronDown, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

interface Room {
  id: string;
  data: any[];
}

interface RoomsTableProps {
  rooms: Room[];
  headers: { row1: string[]; row2: string[] };
  onRoomUpdate: (roomId: string, data: any[]) => void;
  onRoomSelect: (roomId: string) => void;
}

const CATEGORIES = {
  basic: { name: "Basic Info", color: "bg-primary" },
  fabric: { name: "Fabric & Finishes", color: "bg-vue-green" },
  fittings: { name: "Fittings & Equipment", color: "bg-sync-blue" },
  services: { name: "Services (M&E)", color: "bg-sync-blue" },
  protection: { name: "Protection & Alarms", color: "bg-destructive" },
  misc: { name: "Miscellaneous", color: "bg-purple" },
};

export const RoomsTable = ({ rooms, headers, onRoomUpdate, onRoomSelect }: RoomsTableProps) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({
    basic: true,
  });
  const [editingCell, setEditingCell] = useState<{ roomId: string; colIndex: number } | null>(null);

  const categorizeColumns = useMemo(() => {
    const categorized: Record<string, number[]> = {
      basic: [],
      fabric: [],
      fittings: [],
      services: [],
      protection: [],
      misc: [],
    };

    headers.row2.forEach((code, index) => {
      const codeUpper = code?.toString().toUpperCase() || '';
      
      if (codeUpper.includes('ROOM') || codeUpper.includes('REF') || codeUpper.includes('DATE') || codeUpper.includes('Q0') && !codeUpper.includes('BU_') && !codeUpper.includes('SE_')) {
        categorized.basic.push(index);
      } else if (codeUpper.includes('BU_')) {
        categorized.fabric.push(index);
      } else if (codeUpper.includes('FE_') || codeUpper.includes('ASSET')) {
        categorized.fittings.push(index);
      } else if (codeUpper.includes('SE_') && (codeUpper.includes('WA') || codeUpper.includes('GS') || codeUpper.includes('GP') || codeUpper.includes('RT') || codeUpper.includes('SP') || codeUpper.includes('SN') || codeUpper.includes('ST') || codeUpper.includes('VC') || codeUpper.includes('LS') || codeUpper.includes('TP') || codeUpper.includes('AV') || codeUpper.includes('CO') || codeUpper.includes('P3') || codeUpper.includes('PH') || codeUpper.includes('SL') || codeUpper.includes('EL'))) {
        categorized.services.push(index);
      } else if (codeUpper.includes('SE_') && (codeUpper.includes('FP') || codeUpper.includes('FA') || codeUpper.includes('SH') || codeUpper.includes('SI') || codeUpper.includes('AS') || codeUpper.includes('ES') || codeUpper.includes('CP') || codeUpper.includes('DA'))) {
        categorized.protection.push(index);
      } else {
        categorized.misc.push(index);
      }
    });

    return categorized;
  }, [headers.row2]);

  const filteredRooms = useMemo(() => {
    if (!searchTerm) return rooms;
    
    return rooms.filter(room => {
      const roomName = room.data[1]?.toString().toLowerCase() || '';
      const roomId = room.data[0]?.toString().toLowerCase() || '';
      return roomName.includes(searchTerm.toLowerCase()) || roomId.includes(searchTerm.toLowerCase());
    });
  }, [rooms, searchTerm]);

  const handleCellEdit = (roomId: string, colIndex: number, value: string) => {
    const room = rooms.find(r => r.id === roomId);
    if (room) {
      const newData = [...room.data];
      newData[colIndex] = value;
      onRoomUpdate(roomId, newData);
    }
    setEditingCell(null);
  };

  const toggleCategory = (category: string) => {
    setExpandedCategories(prev => ({
      ...prev,
      [category]: !prev[category],
    }));
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold">Rooms Table</h2>
          <p className="text-muted-foreground">
            {filteredRooms.length} rooms • Organized by categories
          </p>
        </div>
        
        <div className="flex items-center space-x-2">
          <Button variant="outline" size="sm">
            <Download className="mr-2 h-4 w-4" />
            Export CSV
          </Button>
          <Button variant="outline" size="sm">
            <Filter className="mr-2 h-4 w-4" />
            Filter
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center space-x-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search rooms..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex space-x-2">
              {Object.entries(CATEGORIES).map(([key, category]) => (
                <Badge
                  key={key}
                  variant="secondary"
                  className={`${category.color} text-white`}
                >
                  {category.name}
                </Badge>
              ))}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {Object.entries(categorizeColumns).map(([categoryKey, columnIndices]) => {
              if (columnIndices.length === 0) return null;
              
              const category = CATEGORIES[categoryKey as keyof typeof CATEGORIES];
              const isExpanded = expandedCategories[categoryKey];
              
              return (
                <Collapsible
                  key={categoryKey}
                  open={isExpanded}
                  onOpenChange={() => toggleCategory(categoryKey)}
                >
                  <CollapsibleTrigger asChild>
                    <Button
                      variant="ghost"
                      className="w-full justify-between p-0 h-auto font-medium"
                    >
                      <div className="flex items-center space-x-2">
                        <div className={`w-3 h-3 rounded ${category.color}`}></div>
                        <span>{category.name}</span>
                        <Badge variant="secondary">{columnIndices.length} columns</Badge>
                      </div>
                      {isExpanded ? (
                        <ChevronDown className="h-4 w-4" />
                      ) : (
                        <ChevronRight className="h-4 w-4" />
                      )}
                    </Button>
                  </CollapsibleTrigger>
                  
                  <CollapsibleContent className="space-y-2 mt-4">
                    <div className="overflow-x-auto">
                      <table className="w-full border-collapse">
                        <thead>
                          <tr className="border-b">
                            <th className="sticky left-0 bg-card text-left p-2 font-medium min-w-32">
                              Room ID
                            </th>
                            <th className="sticky left-32 bg-card text-left p-2 font-medium min-w-48">
                              Room Name
                            </th>
                            {columnIndices.map(colIndex => (
                              <th key={colIndex} className="text-left p-2 font-medium min-w-32">
                                <div className="space-y-1">
                                  <div className="text-xs text-muted-foreground">
                                    {headers.row1[colIndex]}
                                  </div>
                                  <div className="text-sm font-mono">
                                    {headers.row2[colIndex]}
                                  </div>
                                </div>
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {filteredRooms.map(room => (
                            <tr 
                              key={room.id} 
                              className="border-b hover:bg-muted/5 cursor-pointer transition-smooth"
                              onClick={() => onRoomSelect(room.id)}
                            >
                              <td className="sticky left-0 bg-card p-2 font-mono text-sm">
                                {room.data[0]}
                              </td>
                              <td className="sticky left-32 bg-card p-2 font-medium">
                                {room.data[1]}
                              </td>
                              {columnIndices.map(colIndex => (
                                <td key={colIndex} className="p-2 text-sm">
                                  {editingCell?.roomId === room.id && editingCell?.colIndex === colIndex ? (
                                    <Input
                                      defaultValue={room.data[colIndex] || ''}
                                      onBlur={(e) => handleCellEdit(room.id, colIndex, e.target.value)}
                                      onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                          handleCellEdit(room.id, colIndex, e.currentTarget.value);
                                        }
                                        if (e.key === 'Escape') {
                                          setEditingCell(null);
                                        }
                                      }}
                                      className="h-8"
                                      autoFocus
                                    />
                                  ) : (
                                    <div 
                                      className="min-h-6 flex items-center group relative"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setEditingCell({ roomId: room.id, colIndex });
                                      }}
                                    >
                                      <span className={room.data[colIndex] ? '' : 'text-muted-foreground italic'}>
                                        {room.data[colIndex] || 'No data'}
                                      </span>
                                      <Edit3 className="h-3 w-3 ml-2 opacity-0 group-hover:opacity-50 transition-smooth" />
                                    </div>
                                  )}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};