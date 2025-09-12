import { useRef, Suspense, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, useTexture } from "@react-three/drei";
import * as THREE from "three";
import { Loader2, Plus } from "lucide-react";
import { PanoramaHotspot } from "./PanoramaHotspot";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface PanoramaSphereProps {
  imageUrl: string;
}

function PanoramaSphere({ imageUrl }: PanoramaSphereProps) {
  const texture = useTexture(imageUrl);
  
  // Configure texture for equirectangular mapping
  texture.mapping = THREE.EquirectangularReflectionMapping;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.flipY = true; // Fix upside-down panorama

  return (
    <mesh scale={[1, -1, 1]}>
      <sphereGeometry args={[50, 60, 40]} />
      <meshBasicMaterial 
        map={texture} 
        side={THREE.BackSide}
        toneMapped={false}
      />
    </mesh>
  );
}

interface Hotspot {
  id: string;
  position: THREE.Vector3;
  label: string;
  description?: string;
  fieldCode?: string;
}

interface PanoramaViewerProps {
  imageUrl: string;
  nodeId: string;
  roomData?: any[];
  headers?: { row1: string[]; row2: string[] };
}

export const PanoramaViewer = ({ imageUrl, nodeId, roomData, headers }: PanoramaViewerProps) => {
  const controlsRef = useRef<any>();
  const [hotspots, setHotspots] = useState<Hotspot[]>([]);
  const [addingHotspot, setAddingHotspot] = useState(false);

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
          <PanoramaSphere imageUrl={imageUrl} />
          
          {/* Hotspots */}
          {hotspots.map(hotspot => (
            <PanoramaHotspot
              key={hotspot.id}
              position={hotspot.position}
              label={hotspot.label}
              description={hotspot.description}
              onClick={() => {
                if (hotspot.fieldCode && roomData && headers) {
                  const fieldIndex = headers.row2.findIndex(code => code === hotspot.fieldCode);
                  if (fieldIndex >= 0) {
                    const value = roomData[fieldIndex];
                    toast.info(`${hotspot.label}: ${value || 'No data'}`);
                  }
                }
              }}
            />
          ))}
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
          variant={addingHotspot ? "default" : "outline"}
          size="sm"
          onClick={() => setAddingHotspot(!addingHotspot)}
          className="bg-background/80 backdrop-blur-sm"
        >
          <Plus className="h-4 w-4 mr-1" />
          {addingHotspot ? "Cancel" : "Add Hotspot"}
        </Button>
        
        {hotspots.length > 0 && (
          <div className="bg-background/80 backdrop-blur-sm rounded-lg px-3 py-2 border">
            <p className="text-xs font-mono text-muted-foreground">Hotspots</p>
            <p className="text-sm font-medium">{hotspots.length}</p>
          </div>
        )}
      </div>
    </div>
  );
};