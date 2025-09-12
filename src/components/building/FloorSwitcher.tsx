import { useState } from "react";
import { Plus, Settings, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { useBuildingStore } from "@/stores/buildingStore";
import { AddFloorDialog } from "./AddFloorDialog";
import { ManageFloorsDialog } from "./ManageFloorsDialog";

export const FloorSwitcher = () => {
  const { floors, activeFloorId, getActiveFloor, setActiveFloor } = useBuildingStore();
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showManageDialog, setShowManageDialog] = useState(false);
  
  const activeFloor = getActiveFloor();
  
  return (
    <div className="flex items-center gap-2">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="gap-2">
            <span className="font-medium">
              {activeFloor ? activeFloor.name : "Select Floor"}
            </span>
            {floors.length > 0 && (
              <Badge variant="secondary" className="text-xs px-1.5 py-0.5">
                {floors.length}
              </Badge>
            )}
            <ChevronDown className="h-3 w-3" />
          </Button>
        </DropdownMenuTrigger>
        
        <DropdownMenuContent align="start" className="w-48">
          {floors.length === 0 ? (
            <DropdownMenuItem disabled>No floors created</DropdownMenuItem>
          ) : (
            floors.map((floor) => (
              <DropdownMenuItem
                key={floor.id}
                onClick={() => setActiveFloor(floor.id)}
                className={`flex items-center justify-between ${
                  floor.id === activeFloorId ? 'bg-accent' : ''
                }`}
              >
                <span>{floor.name}</span>
                {floor.id === activeFloorId && (
                  <Badge variant="outline">Active</Badge>
                )}
              </DropdownMenuItem>
            ))
          )}
          
          <DropdownMenuSeparator />
          
          <DropdownMenuItem onClick={() => setShowAddDialog(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Floor
          </DropdownMenuItem>
          
          {floors.length > 0 && (
            <DropdownMenuItem onClick={() => setShowManageDialog(true)}>
              <Settings className="h-4 w-4 mr-2" />
              Manage Floors
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
      
      <AddFloorDialog 
        open={showAddDialog} 
        onOpenChange={setShowAddDialog}
      />
      
      <ManageFloorsDialog
        open={showManageDialog}
        onOpenChange={setShowManageDialog}
      />
    </div>
  );
};