import { create } from 'zustand';
import { Building, Floor } from '@/types/building';

interface BuildingState {
  building: Building | null;
  floors: Floor[];
  activeFloorId: string | null;
  
  // Actions
  setBuilding: (building: Building) => void;
  setFloors: (floors: Floor[]) => void;
  addFloor: (floor: Floor) => void;
  updateFloor: (floorId: string, updates: Partial<Floor>) => void;
  deleteFloor: (floorId: string) => void;
  setActiveFloor: (floorId: string | null) => void;
  
  // Computed
  getActiveFloor: () => Floor | null;
  getFloorByOrder: (orderIndex: number) => Floor | null;
}

export const useBuildingStore = create<BuildingState>((set, get) => ({
  building: {
    id: 'building-1',
    name: 'Demo Building',
    address: '123 Demo Street',
    createdAt: new Date(),
    updatedAt: new Date()
  },
  floors: [
    {
      id: 'floor-1',
      buildingId: 'building-1', 
      name: 'Ground Floor',
      orderIndex: 0,
      planImageUrl: '/placeholder.svg',
      widthPx: 800,
      heightPx: 600,
      createdAt: new Date(),
      updatedAt: new Date()
    }
  ],
  activeFloorId: 'floor-1',
  
  setBuilding: (building) => set({ building }),
  
  setFloors: (floors) => set({ floors }),
  
  addFloor: (floor) => set((state) => ({
    floors: [...state.floors, floor].sort((a, b) => a.orderIndex - b.orderIndex)
  })),
  
  updateFloor: (floorId, updates) => set((state) => ({
    floors: state.floors.map(floor => 
      floor.id === floorId ? { ...floor, ...updates } : floor
    )
  })),
  
  deleteFloor: (floorId) => set((state) => ({
    floors: state.floors.filter(floor => floor.id !== floorId),
    activeFloorId: state.activeFloorId === floorId ? null : state.activeFloorId
  })),
  
  setActiveFloor: (floorId) => set({ activeFloorId: floorId }),
  
  getActiveFloor: () => {
    const { floors, activeFloorId } = get();
    return floors.find(floor => floor.id === activeFloorId) || null;
  },
  
  getFloorByOrder: (orderIndex) => {
    const { floors } = get();
    return floors.find(floor => floor.orderIndex === orderIndex) || null;
  }
}));