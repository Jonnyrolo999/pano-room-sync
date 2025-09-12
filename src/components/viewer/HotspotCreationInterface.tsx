import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Trash2, Target, Zap, Flame, Plug, Shield, Settings, Wrench } from "lucide-react";
import { toast } from "sonner";

interface HotspotData {
  id: string;
  fieldCode: string;
  fieldLabel: string;
  position: { x: number; y: number; z: number };
  icon: string;
  color: string;
}

interface HotspotCreationInterfaceProps {
  headers: { row1: string[]; row2: string[] };
  hotspots: HotspotData[];
  onAddHotspot: (hotspot: Omit<HotspotData, 'id'>) => void;
  onRemoveHotspot: (id: string) => void;
  isPlacementMode: boolean;
  onTogglePlacementMode: () => void;
  selectedField: { code: string; label: string } | null;
  onFieldSelect: (field: { code: string; label: string } | null) => void;
}

const HOTSPOT_ICONS = [
  { name: "target", icon: Target, color: "#007acc" },
  { name: "flame", icon: Flame, color: "#ff6b35" },
  { name: "plug", icon: Plug, color: "#10b981" },
  { name: "shield", icon: Shield, color: "#ef4444" },
  { name: "settings", icon: Settings, color: "#8b5cf6" },
  { name: "wrench", icon: Wrench, color: "#f59e0b" },
  { name: "zap", icon: Zap, color: "#eab308" },
];

export const HotspotCreationInterface = ({
  headers,
  hotspots,
  onAddHotspot,
  onRemoveHotspot,
  isPlacementMode,
  onTogglePlacementMode,
  selectedField,
  onFieldSelect,
}: HotspotCreationInterfaceProps) => {
  const [selectedIcon, setSelectedIcon] = useState("target");

  // Create field options from headers
  const fieldOptions = headers.row2.map((code, index) => ({
    code,
    label: headers.row1[index] || code,
  })).filter(field => field.code && field.code.trim() !== '');

  // Group fields by category
  const categorizeFields = () => {
    const categories = {
      "Basic Info": [] as typeof fieldOptions,
      "Fabric & Finishes": [] as typeof fieldOptions,
      "Fittings & Equipment": [] as typeof fieldOptions,
      "Services (M&E)": [] as typeof fieldOptions,
      "Protection & Alarms": [] as typeof fieldOptions,
      "Miscellaneous": [] as typeof fieldOptions,
    };

    fieldOptions.forEach(field => {
      const codeUpper = field.code.toUpperCase();
      
      if (codeUpper.includes('ROOM') || codeUpper.includes('REF') || codeUpper.includes('DATE') || (codeUpper.includes('Q0') && !codeUpper.includes('BU_') && !codeUpper.includes('SE_'))) {
        categories["Basic Info"].push(field);
      } else if (codeUpper.includes('BU_')) {
        categories["Fabric & Finishes"].push(field);
      } else if (codeUpper.includes('FE_') || codeUpper.includes('ASSET')) {
        categories["Fittings & Equipment"].push(field);
      } else if (codeUpper.includes('SE_') && (codeUpper.includes('WA') || codeUpper.includes('GS') || codeUpper.includes('GP') || codeUpper.includes('RT') || codeUpper.includes('SP') || codeUpper.includes('SN') || codeUpper.includes('ST') || codeUpper.includes('VC') || codeUpper.includes('LS') || codeUpper.includes('TP') || codeUpper.includes('AV') || codeUpper.includes('CO') || codeUpper.includes('P3') || codeUpper.includes('PH') || codeUpper.includes('SL') || codeUpper.includes('EL'))) {
        categories["Services (M&E)"].push(field);
      } else if (codeUpper.includes('SE_') && (codeUpper.includes('FP') || codeUpper.includes('FA') || codeUpper.includes('SH') || codeUpper.includes('SI') || codeUpper.includes('AS') || codeUpper.includes('ES') || codeUpper.includes('CP') || codeUpper.includes('DA'))) {
        categories["Protection & Alarms"].push(field);
      } else {
        categories["Miscellaneous"].push(field);
      }
    });

    return categories;
  };

  const categorizedFields = categorizeFields();
  const selectedIconData = HOTSPOT_ICONS.find(icon => icon.name === selectedIcon);

  const handleCreateHotspot = () => {
    if (!selectedField) {
      toast.error("Please select a field to link to this hotspot");
      return;
    }

    onTogglePlacementMode();
    toast.info("Click on the panorama to place the hotspot");
  };

  const getHotspotFieldLabel = (fieldCode: string) => {
    const field = fieldOptions.find(f => f.code === fieldCode);
    return field?.label || fieldCode;
  };

  return (
    <Card className="w-80">
      <CardHeader>
        <CardTitle className="text-lg">Hotspot Manager</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Field Selection */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Link to Data Field</label>
          <Select
            value={selectedField?.code || ""}
            onValueChange={(value) => {
              const field = fieldOptions.find(f => f.code === value);
              onFieldSelect(field || null);
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select a field..." />
            </SelectTrigger>
            <SelectContent className="max-h-60">
              {Object.entries(categorizedFields).map(([category, fields]) => (
                fields.length > 0 && (
                  <div key={category}>
                    <div className="px-2 py-1 text-xs font-semibold text-muted-foreground bg-muted/50">
                      {category}
                    </div>
                    {fields.map((field) => (
                      <SelectItem key={field.code} value={field.code}>
                        <div className="flex flex-col">
                          <span className="text-sm">{field.label}</span>
                          <span className="text-xs text-muted-foreground font-mono">{field.code}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </div>
                )
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Icon Selection */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Hotspot Icon</label>
          <div className="grid grid-cols-4 gap-2">
            {HOTSPOT_ICONS.map((iconData) => {
              const IconComponent = iconData.icon;
              return (
                <Button
                  key={iconData.name}
                  variant={selectedIcon === iconData.name ? "default" : "outline"}
                  size="sm"
                  className="h-10 w-10 p-0"
                  onClick={() => setSelectedIcon(iconData.name)}
                >
                  <IconComponent className="h-4 w-4" style={{ color: selectedIcon === iconData.name ? "currentColor" : iconData.color }} />
                </Button>
              );
            })}
          </div>
        </div>

        {/* Create Hotspot Button */}
        <Button
          onClick={handleCreateHotspot}
          disabled={!selectedField}
          className="w-full"
          variant={isPlacementMode ? "destructive" : "default"}
        >
          {isPlacementMode ? "Cancel Placement" : "Create Hotspot"}
        </Button>

        {/* Existing Hotspots */}
        {hotspots.length > 0 && (
          <div className="space-y-2">
            <label className="text-sm font-medium">
              Existing Hotspots ({hotspots.length})
            </label>
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {hotspots.map((hotspot) => {
                const IconComponent = HOTSPOT_ICONS.find(icon => icon.name === hotspot.icon)?.icon || Target;
                return (
                  <div
                    key={hotspot.id}
                    className="flex items-center justify-between p-2 bg-muted/50 rounded-md"
                  >
                    <div className="flex items-center space-x-2 flex-1 min-w-0">
                      <IconComponent className="h-4 w-4 flex-shrink-0" style={{ color: hotspot.color }} />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium truncate">
                          {hotspot.fieldLabel}
                        </div>
                        <div className="text-xs text-muted-foreground font-mono">
                          {hotspot.fieldCode}
                        </div>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onRemoveHotspot(hotspot.id)}
                      className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Instructions */}
        <div className="text-xs text-muted-foreground bg-muted/30 p-3 rounded-md">
          <strong>Instructions:</strong>
          <br />1. Select a data field to link
          <br />2. Choose an icon style
          <br />3. Click "Create Hotspot"
          <br />4. Click on the panorama to place
        </div>
      </CardContent>
    </Card>
  );
};
