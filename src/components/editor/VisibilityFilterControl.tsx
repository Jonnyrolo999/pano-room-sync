import { Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useFloorplanStore } from "@/stores/floorplanStore";
import { VisibilityFilter } from "@/types/building";

const FILTER_OPTIONS: Array<{ value: VisibilityFilter; label: string; icon: string }> = [
  { value: 'both', label: 'Both', icon: '◐' },
  { value: 'rooms', label: 'Rooms', icon: '▢' },
  { value: 'panos', label: 'Panos', icon: '●' }
];

export const VisibilityFilterControl = () => {
  const { visibilityFilter, setVisibilityFilter } = useFloorplanStore();

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">Layer Visibility</span>
        <div className="flex items-center gap-1">
          {FILTER_OPTIONS.map(option => (
            <Button
              key={option.value}
              size="sm"
              variant={visibilityFilter === option.value ? "default" : "ghost"}
              className="h-7 px-2 text-xs"
              onClick={() => setVisibilityFilter(option.value)}
            >
              <span className="mr-1">{option.icon}</span>
              {option.label}
            </Button>
          ))}
        </div>
      </div>
      
      <div className="text-xs text-muted-foreground">
        {visibilityFilter === 'both' && "Showing rooms and panorama pins"}
        {visibilityFilter === 'rooms' && "Showing rooms only (pano pins hidden)"}
        {visibilityFilter === 'panos' && "Showing pano pins only (rooms hidden)"}
      </div>
    </div>
  );
};