import { useRef, Suspense, useState, useCallback } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, useTexture } from "@react-three/drei";
import * as THREE from "three";
import { Loader2, Settings } from "lucide-react";
import { PanoramaHotspot } from "./PanoramaHotspot";
import { HotspotCreationInterface } from "./HotspotCreationInterface";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface PanoramaSphereProps {
  imageUrl: string;
  isPlacementMode?: boolean;
  onPlace?: (point: THREE.Vector3) => void;
}

function PanoramaSphere({ imageUrl, isPlacementMode, onPlace }: PanoramaSphereProps) {
  const texture = useTexture(imageUrl);
  texture.flipY = false; // prevent vertical inversion

  return (
    <mesh
      scale={[1, -1, 1]}
      name="panorama-sphere"
      onClick={(e: any) => {
        if (!isPlacementMode || !onPlace) return;
        e.stopPropagation();
        const point = e.point.clone().setLength(49);
        onPlace(point);
      }}
    >
      <sphereGeometry args={[50, 60, 40]} />
      <meshBasicMaterial 
        map={texture} 
        side={THREE.BackSide}
        toneMapped={false}
      />
    </mesh>
  );
}

interface HotspotData {
  id: string;
  fieldCode: string;
  fieldLabel: string;
  position: { x: number; y: number; z: number };
  icon: string;
  color: string;
}

interface PanoramaViewerProps {
  imageUrl: string;
  nodeId: string;
  roomData?: any[];
  headers?: { row1: string[]; row2: string[] };
  onHotspotClick?: (fieldCode: string) => void;
  highlightedField?: string | null;
}

export const PanoramaViewer = ({ imageUrl, nodeId, roomData, headers, onHotspotClick, highlightedField }: PanoramaViewerProps) => {
  const controlsRef = useRef<any>();
  const [hotspots, setHotspots] = useState<HotspotData[]>([]);
  const [showHotspotInterface, setShowHotspotInterface] = useState(false);
  const [isPlacementMode, setIsPlacementMode] = useState(false);
  const [selectedField, setSelectedField] = useState<{ code: string; label: string } | null>(null);
  const [selectedIcon] = useState("target");

  const handleAddHotspot = useCallback((hotspotData: Omit<HotspotData, 'id'>) => {
    const newHotspot: HotspotData = {
      ...hotspotData,
      id: `hotspot_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    };
    setHotspots(prev => [...prev, newHotspot]);
    toast.success(`Hotspot created for "${hotspotData.fieldLabel}"`);
  }, []);

  const handleRemoveHotspot = useCallback((id: string) => {
    setHotspots(prev => prev.filter(h => h.id !== id));
    toast.success("Hotspot removed");
  }, []);

  const handlePlaceHotspot = useCallback((position: { x: number; y: number; z: number }) => {
    if (!selectedField) return;
    
    const iconData = [
      { name: "target", color: "#007acc" },
      { name: "flame", color: "#ff6b35" },
      { name: "plug", color: "#10b981" },
      { name: "shield", color: "#ef4444" },
      { name: "settings", color: "#8b5cf6" },
      { name: "wrench", color: "#f59e0b" },
      { name: "zap", color: "#eab308" },
    ].find(icon => icon.name === selectedIcon) || { name: "target", color: "#007acc" };

    handleAddHotspot({
      fieldCode: selectedField.code,
      fieldLabel: selectedField.label,
      position,
      icon: selectedIcon,
      color: iconData.color,
    });

    setIsPlacementMode(false);
    setSelectedField(null);
  }, [selectedField, selectedIcon, handleAddHotspot]);

  const handleTogglePlacementMode = useCallback(() => {
    if (isPlacementMode) {
      setIsPlacementMode(false);
      setSelectedField(null);
    } else {
      setIsPlacementMode(true);
    }
  }, [isPlacementMode]);

  return (
    <div className="relative w-full h-full bg-background">
      <Canvas
        camera={{
          fov: 75,
          position: [0, 0, 0.1],
        }}
        gl={{
          antialias: true,
          toneMapping: THREE.NoToneMapping,
        }}
      >
        <Suspense fallback={null}>
          <PanoramaSphere 
            imageUrl={imageUrl} 
            isPlacementMode={isPlacementMode && selectedField !== null} 
            onPlace={(point) => handlePlaceHotspot({ x: point.x, y: point.y, z: point.z })} 
          />
          
          {/* Hotspots */}
          {hotspots.map(hotspot => {
            const position = new THREE.Vector3(hotspot.position.x, hotspot.position.y, hotspot.position.z);
            const isHighlighted = highlightedField === hotspot.fieldCode;
            
            return (
              <PanoramaHotspot
                key={hotspot.id}
                position={position}
                label={hotspot.fieldLabel}
                description={roomData && headers ? (() => {
                  const fieldIndex = headers.row2.findIndex(code => code === hotspot.fieldCode);
                  const value = fieldIndex >= 0 ? roomData[fieldIndex] : null;
                  return value || 'No data available';
                })() : undefined}
                onClick={() => {
                  onHotspotClick?.(hotspot.fieldCode);
                  if (roomData && headers) {
                    const fieldIndex = headers.row2.findIndex(code => code === hotspot.fieldCode);
                    if (fieldIndex >= 0) {
                      const value = roomData[fieldIndex];
                      toast.info(`${hotspot.fieldLabel}: ${value || 'No data'}`);
                    }
                  }
                }}
                isHighlighted={isHighlighted}
              />
            );
          })}
        </Suspense>
        
        <OrbitControls
          ref={controlsRef}
          enablePan={false}
          enableZoom={true}
          enableDamping={true}
          dampingFactor={0.1}
          rotateSpeed={0.5}
          minDistance={0.1}
          maxDistance={0.1}
          minPolarAngle={0}
          maxPolarAngle={Math.PI}
          enabled={!isPlacementMode}
        />
      </Canvas>
      
      {/* Loading overlay */}
      <Suspense fallback={
        <div className="absolute inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center">
          <div className="flex flex-col items-center gap-2 text-muted-foreground">
            <Loader2 className="h-6 w-6 animate-spin" />
            <p className="text-sm">Loading panorama...</p>
          </div>
        </div>
      }>
        <div />
      </Suspense>

      {/* Controls */}
      <div className="absolute top-4 left-4 space-y-2">
        <div className="bg-background/80 backdrop-blur-sm rounded-lg px-3 py-2 border">
          <p className="text-xs font-mono text-muted-foreground">Node ID</p>
          <p className="text-sm font-medium">{nodeId}</p>
        </div>
        
        <Button
          variant={showHotspotInterface ? "default" : "outline"}
          size="sm"
          onClick={() => setShowHotspotInterface(!showHotspotInterface)}
          className="bg-background/80 backdrop-blur-sm"
        >
          <Settings className="h-4 w-4 mr-1" />
          {showHotspotInterface ? "Hide" : "Manage"} Hotspots
        </Button>
        
        {hotspots.length > 0 && (
          <div className="bg-background/80 backdrop-blur-sm rounded-lg px-3 py-2 border">
            <p className="text-xs font-mono text-muted-foreground">Active Hotspots</p>
            <p className="text-sm font-medium">{hotspots.length}</p>
          </div>
        )}

        {isPlacementMode && (
          <div className="bg-primary/10 border-primary rounded-lg px-3 py-2 border">
            <p className="text-xs font-medium text-primary">Click on panorama to place hotspot</p>
            <p className="text-xs text-muted-foreground">
              {selectedField?.label || 'No field selected'}
            </p>
          </div>
        )}
      </div>

      {/* Hotspot Creation Interface */}
      {showHotspotInterface && headers && (
        <div className="absolute top-4 right-4">
          <HotspotCreationInterface
            headers={headers}
            hotspots={hotspots}
            onAddHotspot={handleAddHotspot}
            onRemoveHotspot={handleRemoveHotspot}
            isPlacementMode={isPlacementMode}
            onTogglePlacementMode={handleTogglePlacementMode}
            selectedField={selectedField}
            onFieldSelect={setSelectedField}
          />
        </div>
      )}
    </div>
  );
};