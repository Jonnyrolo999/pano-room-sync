// Building data model types
export interface Building {
  id: string;
  name: string;
  address?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Floor {
  id: string;
  buildingId: string;
  name: string;
  orderIndex: number;
  planImageUrl?: string;
  widthPx?: number;
  heightPx?: number;
  dpi?: number;
  calibrationJson?: {
    pixelsPerMeter: number;
    rotation: number;
    originX: number;
    originY: number;
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface Room {
  id: string;
  floorId: string;
  name: string;
  polygon: Array<[number, number]>;
  propertiesJson: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
  // Legacy compatibility
  data?: any[];
  masterNodeId?: string;
}

export interface Pano {
  id: string;
  buildingId: string;
  floorId?: string;
  roomId?: string;
  nodeId: string;
  title: string;
  fileUrl: string;
  imageUrl?: string;
  capturedAt?: Date;
  yaw?: number;
  pitch?: number;
  roll?: number;
  metadataJson: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
  // Legacy compatibility
  fileName?: string;
  floor?: string;
}

export interface Assignment {
  roomId: string;
  panoramaIds: string[];
  masterNodeId?: string;
}

export type VisibilityFilter = 'both' | 'rooms' | 'panos';
export type InteractionMode = 'select' | 'draw' | 'edit' | 'dropPano';
export type AppTab = 'editor' | 'viewer';