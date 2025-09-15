import { Upload, Database, Link2, Play, Image as ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

interface HeaderProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

export const Header = ({ activeTab, onTabChange }: HeaderProps) => {
  const tabs = [
    { id: "import", label: "Import Room Data", icon: Upload },
    { id: "rooms", label: "Rooms Table", icon: Database },
    { id: "panoramas", label: "Panoramas", icon: ImageIcon },
    { id: "assign", label: "Assign Panoramas", icon: Link2 },
    { id: "viewer", label: "Viewer", icon: Play },
  ];

  return (
    <header className="border-b bg-card shadow-card">
      <div className="flex h-16 items-center justify-between px-6">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <div className="h-8 w-8 rounded-lg bg-gradient-vue"></div>
            <h1 className="text-xl font-bold bg-gradient-vue bg-clip-text text-transparent">
              VueSync
            </h1>
          </div>
          <div className="h-6 w-px bg-border"></div>
          <span className="text-sm text-muted-foreground">Room Data Management Demo</span>
        </div>
        
        <nav className="flex items-center space-x-1">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <Button
                key={tab.id}
                variant={activeTab === tab.id ? "default" : "ghost"}
                size="sm"
                onClick={() => onTabChange(tab.id)}
                className="transition-smooth"
              >
                <Icon className="mr-2 h-4 w-4" />
                {tab.label}
              </Button>
            );
          })}
        </nav>
      </div>
    </header>
  );
};