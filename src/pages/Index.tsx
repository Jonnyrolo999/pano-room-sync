import { useState, useEffect } from "react";
import { FloorSwitcher } from "@/components/building/FloorSwitcher";
import { EditorInterface } from "@/components/editor/EditorInterface";
import { ViewerInterface } from "@/components/viewer/ViewerInterface";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Edit, Eye } from "lucide-react";
import { AppTab } from "@/types/building";
import { useBuildingStore } from "@/stores/buildingStore";
import { useFloorplanStore } from "@/stores/floorplanStore";

const Index = () => {
  const [activeTab, setActiveTab] = useState<AppTab>("editor");
  const { building, setBuilding } = useBuildingStore();

  // Initialize with a mock building if none exists
  useEffect(() => {
    if (!building) {
      setBuilding({
        id: 'building-1',
        name: 'Demo Building',
        address: '123 Demo Street',
        createdAt: new Date(),
        updatedAt: new Date()
      });
    }
  }, [building, setBuilding]);



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
          </div>
          
          <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as AppTab)}>
            <TabsList>
              <TabsTrigger value="editor" className="gap-2">
                <Edit className="h-4 w-4" />
                Edit Floorplan
              </TabsTrigger>
              <TabsTrigger value="viewer" className="gap-2">
                <Eye className="h-4 w-4" />
                Viewer
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-hidden">
        <Tabs value={activeTab} onValueChange={() => {}} className="h-full">
          <TabsContent value="editor" className="h-full m-0">
            <EditorInterface />
          </TabsContent>
          <TabsContent value="viewer" className="h-full m-0">
            <ViewerInterface />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default Index;
