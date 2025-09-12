import { useState, useEffect } from "react";
import { FloorSwitcher } from "@/components/building/FloorSwitcher";
import { PlanTab } from "@/components/stages/PlanTab";
import { RoomsTab } from "@/components/stages/RoomsTab";
import { PanosTab } from "@/components/stages/PanosTab";
import { DataTab } from "@/components/stages/DataTab";
import { ViewerTab } from "@/components/stages/ViewerTab";
import { Button } from "@/components/ui/button";
import { FileImage, Grid3X3, Camera, Database, Eye } from "lucide-react";
import { useBuildingStore } from "@/stores/buildingStore";
import { useFloorplanStore } from "@/stores/floorplanStore";

type StageTab = "plan" | "rooms" | "panos" | "data" | "viewer";

const Index = () => {
  const [activeTab, setActiveTab] = useState<StageTab>("plan");
  const { 
    building, 
    floors, 
    setBuilding, 
    setFloors, 
    setActiveFloor 
  } = useBuildingStore();
  
  const { unsavedChanges } = useFloorplanStore();

  // Data is now initialized in stores - no need for effects

  const stageTabs = [
    { 
      id: "plan" as const, 
      label: "Plan", 
      icon: FileImage,
      description: "Upload & calibrate floor plans"
    },
    { 
      id: "rooms" as const, 
      label: "Rooms", 
      icon: Grid3X3,
      description: "Draw & edit room polygons"
    },
    { 
      id: "panos" as const, 
      label: "Panos", 
      icon: Camera,
      description: "Upload & place panoramas"
    },
    { 
      id: "data" as const, 
      label: "Data", 
      icon: Database,
      description: "Rooms table & import/export"
    },
    { 
      id: "viewer" as const, 
      label: "Viewer", 
      icon: Eye,
      description: "Navigate & view results"
    }
  ];

  const renderActiveTab = () => {
    switch (activeTab) {
      case "plan":
        return <PlanTab />;
      case "rooms":
        return <RoomsTab />;
      case "panos":
        return <PanosTab />;
      case "data":
        return <DataTab />;
      case "viewer":
        return <ViewerTab />;
      default:
        return <PlanTab />;
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="border-b bg-card shadow-sm">
        <div className="flex h-16 items-center justify-between px-6">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <div className="h-8 w-8 rounded-lg bg-gradient-primary"></div>
              <h1 className="text-xl font-bold text-foreground">
                Building Manager
              </h1>
            </div>
            <div className="h-6 w-px bg-border"></div>
            <FloorSwitcher />
            {unsavedChanges && (
              <div className="flex items-center space-x-2 text-warning text-sm">
                <div className="h-2 w-2 rounded-full bg-warning"></div>
                <span>Unsaved changes</span>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Stage Navigation - Large Primary Tabs */}
      <div className="border-b bg-card">
        <div className="px-6 py-4">
          <div className="flex space-x-2 overflow-x-auto">
            {stageTabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              
              return (
                <Button
                  key={tab.id}
                  variant={isActive ? "default" : "ghost"}
                  size="lg"
                  onClick={() => setActiveTab(tab.id)}
                  className={`
                    flex-shrink-0 h-auto py-4 px-6 rounded-lg
                    ${isActive 
                      ? 'bg-primary text-primary-foreground shadow-md' 
                      : 'hover:bg-muted text-muted-foreground hover:text-foreground'
                    }
                    transition-all duration-200
                  `}
                >
                  <div className="flex flex-col items-center space-y-2">
                    <Icon className="h-6 w-6" />
                    <div className="text-center">
                      <div className="font-semibold text-lg">{tab.label}</div>
                      <div className="text-xs opacity-80 max-w-[120px] leading-tight">
                        {tab.description}
                      </div>
                    </div>
                  </div>
                </Button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="flex-1 overflow-hidden">
        {renderActiveTab()}
      </main>
    </div>
  );
};

export default Index;