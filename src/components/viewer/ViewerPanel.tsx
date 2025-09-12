import { useState } from "react";
import { ChevronDown, ChevronRight, Copy, ExternalLink, MapPin, Ruler, Users, Wrench, Shield, Settings } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";

interface Room {
  id: string;
  data: any[];
}

interface ViewerPanelProps {
  room: Room | null;
  headers: { row1: string[]; row2: string[] };
  currentNodeId: string;
}

interface FieldSection {
  title: string;
  icon: any;
  color: string;
  fields: { label: string; code: string; value: any; index: number }[];
}

export const ViewerPanel = ({ room, headers, currentNodeId }: ViewerPanelProps) => {
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    basic: true,
  });
  const [showEmpty, setShowEmpty] = useState(false);

  if (!room) {
    return (
      <Card className="w-80 h-full">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2 text-muted-foreground">
            <MapPin className="h-5 w-5" />
            <span>No Room Selected</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Navigate to a panorama with room data to see information here.
          </p>
          <div className="mt-4 p-4 border rounded-lg bg-muted/20">
            <div className="text-xs font-mono text-muted-foreground">
              Current Node: {currentNodeId || 'None'}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const categorizeFields = (): FieldSection[] => {
    const sections: FieldSection[] = [
      { title: "Basic Info", icon: MapPin, color: "text-primary", fields: [] },
      { title: "Fabric & Finishes", icon: Wrench, color: "text-vue-green", fields: [] },
      { title: "Fittings & Equipment", icon: Settings, color: "text-sync-blue", fields: [] },
      { title: "Services (M&E)", icon: Ruler, color: "text-amber-500", fields: [] },
      { title: "Protection & Alarms", icon: Shield, color: "text-red-500", fields: [] },
      { title: "Miscellaneous", icon: Users, color: "text-purple-500", fields: [] },
    ];

    headers.row2.forEach((code, index) => {
      const codeUpper = code?.toString().toUpperCase() || '';
      const label = headers.row1[index] || code || '';
      const value = room.data[index];

      const field = { label, code, value, index };

      if (codeUpper.includes('ROOM') || codeUpper.includes('REF') || codeUpper.includes('DATE') || (codeUpper.includes('Q0') && !codeUpper.includes('BU_') && !codeUpper.includes('SE_'))) {
        sections[0].fields.push(field);
      } else if (codeUpper.includes('BU_')) {
        sections[1].fields.push(field);
      } else if (codeUpper.includes('FE_') || codeUpper.includes('ASSET')) {
        sections[2].fields.push(field);
      } else if (codeUpper.includes('SE_') && (codeUpper.includes('WA') || codeUpper.includes('GS') || codeUpper.includes('GP') || codeUpper.includes('RT') || codeUpper.includes('SP') || codeUpper.includes('SN') || codeUpper.includes('ST') || codeUpper.includes('VC') || codeUpper.includes('LS') || codeUpper.includes('TP') || codeUpper.includes('AV') || codeUpper.includes('CO') || codeUpper.includes('P3') || codeUpper.includes('PH') || codeUpper.includes('SL') || codeUpper.includes('EL'))) {
        sections[3].fields.push(field);
      } else if (codeUpper.includes('SE_') && (codeUpper.includes('FP') || codeUpper.includes('FA') || codeUpper.includes('SH') || codeUpper.includes('SI') || codeUpper.includes('AS') || codeUpper.includes('ES') || codeUpper.includes('CP') || codeUpper.includes('DA'))) {
        sections[4].fields.push(field);
      } else {
        sections[5].fields.push(field);
      }
    });

    return sections.filter(section => section.fields.length > 0);
  };

  const sections = categorizeFields();
  const roomName = room.data[1] || 'Unnamed Room';
  const roomId = room.data[0] || 'No ID';
  const area = room.data.find((_, index) => headers.row2[index]?.includes('Q01')) || 'N/A';

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard');
  };

  const toggleSection = (sectionTitle: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [sectionTitle.toLowerCase().replace(/[^a-z]/g, '')]: !prev[sectionTitle.toLowerCase().replace(/[^a-z]/g, '')]
    }));
  };

  const hasValue = (value: any) => {
    return value !== null && value !== undefined && value !== '' && value !== 'No Data Provided';
  };

  return (
    <Card className="w-80 h-full flex flex-col">
      <CardHeader className="pb-4">
        <div className="space-y-3">
          <div className="flex items-start space-x-2">
            <MapPin className="h-5 w-5 text-primary mt-0.5" />
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-lg leading-tight">{roomName}</h3>
              <div className="flex items-center space-x-2 mt-1">
                <code 
                  className="text-xs bg-muted px-2 py-1 rounded cursor-pointer hover:bg-muted/80 transition-smooth"
                  onClick={() => copyToClipboard(roomId)}
                  title="Click to copy"
                >
                  {roomId}
                </code>
                <Copy className="h-3 w-3 text-muted-foreground" />
              </div>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <Badge variant="secondary" className="text-xs">
              <Ruler className="h-3 w-3 mr-1" />
              {area} m²
            </Badge>
            <Badge variant="outline" className="text-xs font-mono">
              {currentNodeId}
            </Badge>
          </div>
        </div>
        
        <Separator />
        
        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowEmpty(!showEmpty)}
            className="text-xs"
          >
            {showEmpty ? 'Hide Empty' : 'Show Empty'}
          </Button>
          <Button variant="ghost" size="sm" className="text-xs">
            <ExternalLink className="h-3 w-3 mr-1" />
            Open in Admin
          </Button>
        </div>
      </CardHeader>
      
      <CardContent className="flex-1 overflow-y-auto space-y-3">
        {sections.map((section) => {
          const sectionKey = section.title.toLowerCase().replace(/[^a-z]/g, '');
          const isExpanded = expandedSections[sectionKey];
          const fieldsToShow = showEmpty 
            ? section.fields 
            : section.fields.filter(field => hasValue(field.value));
          
          if (fieldsToShow.length === 0 && !showEmpty) {
            return null;
          }

          const SectionIcon = section.icon;
          
          return (
            <Collapsible
              key={section.title}
              open={isExpanded}
              onOpenChange={() => toggleSection(section.title)}
            >
              <CollapsibleTrigger asChild>
                <Button
                  variant="ghost"
                  className="w-full justify-between p-2 h-auto"
                >
                  <div className="flex items-center space-x-2">
                    <SectionIcon className={`h-4 w-4 ${section.color}`} />
                    <span className="font-medium text-sm">{section.title}</span>
                    <Badge variant="secondary" className="text-xs">
                      {fieldsToShow.length}
                    </Badge>
                  </div>
                  {isExpanded ? (
                    <ChevronDown className="h-4 w-4" />
                  ) : (
                    <ChevronRight className="h-4 w-4" />
                  )}
                </Button>
              </CollapsibleTrigger>
              
              <CollapsibleContent className="space-y-2 mt-2">
                {fieldsToShow.map((field) => (
                  <div
                    key={field.index}
                    className="bg-muted/30 rounded-md p-3 space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium leading-tight">
                        {field.label}
                      </span>
                      <code 
                        className="text-xs text-muted-foreground hover:text-foreground cursor-pointer transition-smooth"
                        title={`Internal code: ${field.code}\nClick to copy`}
                        onClick={() => copyToClipboard(field.code)}
                      >
                        {field.code}
                      </code>
                    </div>
                    <div className={`text-sm ${hasValue(field.value) ? '' : 'text-muted-foreground italic'}`}>
                      {hasValue(field.value) ? field.value : 'No Data Provided'}
                    </div>
                  </div>
                ))}
              </CollapsibleContent>
            </Collapsible>
          );
        })}
      </CardContent>
    </Card>
  );
};