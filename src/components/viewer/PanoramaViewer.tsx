import { useRef, Suspense } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, useTexture } from "@react-three/drei";
import * as THREE from "three";
import { Loader2 } from "lucide-react";

interface PanoramaSphereProps {
  imageUrl: string;
}

function PanoramaSphere({ imageUrl }: PanoramaSphereProps) {
  const texture = useTexture(imageUrl);
  
  // Configure texture for equirectangular mapping
  texture.mapping = THREE.EquirectangularReflectionMapping;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.flipY = false;

  return (
    <mesh>
      <sphereGeometry args={[50, 60, 40]} />
      <meshBasicMaterial 
        map={texture} 
        side={THREE.BackSide}
        toneMapped={false}
      />
    </mesh>
  );
}

interface PanoramaViewerProps {
  imageUrl: string;
  nodeId: string;
}

export const PanoramaViewer = ({ imageUrl, nodeId }: PanoramaViewerProps) => {
  const controlsRef = useRef<any>();

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

      {/* Node ID indicator */}
      <div className="absolute top-4 left-4 bg-background/80 backdrop-blur-sm rounded-lg px-3 py-2 border">
        <p className="text-xs font-mono text-muted-foreground">Node ID</p>
        <p className="text-sm font-medium">{nodeId}</p>
      </div>
    </div>
  );
};