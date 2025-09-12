import { useState } from "react";
import { Edit, Trash2, Move, Save, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useBuildingStore } from "@/stores/buildingStore";
import { Floor } from "@/types/building";

interface ManageFloorsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const ManageFloorsDialog = ({ open, onOpenChange }: ManageFloorsDialogProps) => {
  const { floors, activeFloorId, updateFloor, deleteFloor } = useBuildingStore();
  const [editingFloor, setEditingFloor] = useState<string | null>(null);
  const [editName, setEditName] = useState('');

  const sortedFloors = [...floors].sort((a, b) => a.orderIndex - b.orderIndex);

  const handleStartEdit = (floor: Floor) => {
    setEditingFloor(floor.id);
    setEditName(floor.name);
  };

  const handleSaveEdit = () => {
    if (editingFloor && editName.trim()) {
      updateFloor(editingFloor, { name: editName.trim() });
      setEditingFloor(null);
      setEditName('');
    }
  };

  const handleCancelEdit = () => {
    setEditingFloor(null);
    setEditName('');
  };

  const handleDelete = (floorId: string) => {
    if (confirm('Are you sure you want to delete this floor? This will also remove all rooms and assignments on this floor.')) {
      deleteFloor(floorId);
    }
  };

  const handleReorder = (floorId: string, direction: 'up' | 'down') => {
    const floor = floors.find(f => f.id === floorId);
    if (!floor) return;

    const newOrderIndex = direction === 'up' ? floor.orderIndex - 1 : floor.orderIndex + 1;
    const conflictingFloor = floors.find(f => f.orderIndex === newOrderIndex);

    if (conflictingFloor) {
      // Swap order indices
      updateFloor(floor.id, { orderIndex: newOrderIndex });
      updateFloor(conflictingFloor.id, { orderIndex: floor.orderIndex });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Manage Floors</DialogTitle>
          <DialogDescription>
            Rename, reorder, or delete floors
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 max-h-96 overflow-y-auto">
          {sortedFloors.length === 0 ? (
            <div className="text-center py-6 text-muted-foreground">
              No floors created yet
            </div>
          ) : (
            sortedFloors.map((floor, index) => (
              <div
                key={floor.id}
                className="flex items-center gap-2 p-3 border rounded-lg bg-card"
              >
                <div className="flex items-center gap-2 flex-1">
                  <Badge variant="outline" className="text-xs px-2">
                    {floor.orderIndex}
                  </Badge>
                  
                  {editingFloor === floor.id ? (
                    <div className="flex items-center gap-2 flex-1">
                      <Input
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className="flex-1"
                        autoFocus
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleSaveEdit();
                          if (e.key === 'Escape') handleCancelEdit();
                        }}
                      />
                      <Button size="sm" variant="ghost" onClick={handleSaveEdit}>
                        <Save className="h-3 w-3" />
                      </Button>
                      <Button size="sm" variant="ghost" onClick={handleCancelEdit}>
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 flex-1">
                      <span className="font-medium">{floor.name}</span>
                      {floor.id === activeFloorId && (
                        <Badge variant="default" className="text-xs">Active</Badge>
                      )}
                    </div>
                  )}
                </div>

                {editingFloor !== floor.id && (
                  <div className="flex items-center gap-1">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleReorder(floor.id, 'up')}
                      disabled={index === 0}
                      title="Move up"
                    >
                      <Move className="h-3 w-3 rotate-180" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleReorder(floor.id, 'down')}
                      disabled={index === sortedFloors.length - 1}
                      title="Move down"
                    >
                      <Move className="h-3 w-3" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleStartEdit(floor)}
                      title="Rename floor"
                    >
                      <Edit className="h-3 w-3" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleDelete(floor.id)}
                      className="text-destructive hover:text-destructive"
                      title="Delete floor"
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        <div className="flex justify-end">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};