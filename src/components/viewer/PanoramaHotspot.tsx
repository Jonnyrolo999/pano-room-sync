import { useRef, useState } from "react";
import { Text } from "@react-three/drei";
import { Vector3, Color } from "three";
import { useFrame, ThreeEvent } from "@react-three/fiber";

interface HotspotProps {
  position: Vector3;
  label: string;
  description?: string;
  onClick?: () => void;
  isHighlighted?: boolean;
}

export const PanoramaHotspot = ({ position, label, description, onClick, isHighlighted = false }: HotspotProps) => {
  const meshRef = useRef<any>();
  const [hovered, setHovered] = useState(false);
  const [clicked, setClicked] = useState(false);

  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.lookAt(state.camera.position);
      const baseScale = isHighlighted ? 1.3 : 1;
      meshRef.current.scale.setScalar(hovered ? baseScale * 1.2 : baseScale);
    }
  });

  const handleClick = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    setClicked(true);
    setTimeout(() => setClicked(false), 200);
    onClick?.();
  };

  return (
    <group position={position}>
      {/* Hotspot Marker */}
      <mesh
        ref={meshRef}
        onPointerEnter={() => setHovered(true)}
        onPointerLeave={() => setHovered(false)}
        onClick={handleClick}
      >
        <sphereGeometry args={[0.3, 16, 16]} />
        <meshBasicMaterial 
          color={new Color(
            isHighlighted 
              ? "#ff6b35" 
              : hovered 
              ? "#ff6b35" 
              : "#007acc"
          )}
          transparent
          opacity={clicked ? 0.8 : hovered || isHighlighted ? 0.9 : 0.7}
        />
      </mesh>

      {/* Pulsing Ring Effect */}
      <mesh scale={isHighlighted || hovered ? [2.5, 2.5, 2.5] : [1.5, 1.5, 1.5]}>
        <ringGeometry args={[0.8, 1, 32]} />
        <meshBasicMaterial 
          color={isHighlighted ? "#ff6b35" : "#007acc"}
          transparent
          opacity={isHighlighted ? 0.4 : hovered ? 0.3 : 0.1}
        />
      </mesh>

      {/* Label */}
      {hovered && (
        <Text
          position={[0, 1, 0]}
          fontSize={0.8}
          color="white"
          anchorX="center"
          anchorY="bottom"
          outlineColor="black"
          outlineWidth={0.1}
        >
          {label}
          {description && (
            <Text
              position={[0, -0.6, 0]}
              fontSize={0.4}
              color="#cccccc"
              anchorX="center"
              anchorY="top"
              outlineColor="black"
              outlineWidth={0.05}
            >
              {description}
            </Text>
          )}
        </Text>
      )}
    </group>
  );
};