import { create } from 'zustand';
import { Room, Pano, VisibilityFilter, InteractionMode } from '@/types/building';

interface FloorplanState {
  rooms: Room[];
  panos: Pano[];
  visibilityFilter: VisibilityFilter;
  selectedRoomId: string | null;
  selectedPanoId: string | null;
  lockedSelection: boolean;
  mode: InteractionMode;
  unsavedChanges: boolean;
  
  // Preferences
  preferences: {
    snap: boolean;
    grid: boolean;
    filter: VisibilityFilter;
  };
  
  // Actions
  setRooms: (rooms: Room[]) => void;
  setPanos: (panos: Pano[]) => void;
  setVisibilityFilter: (filter: VisibilityFilter) => void;
  setSelectedRoom: (roomId: string | null) => void;
  setSelectedPano: (panoId: string | null) => void;
  setLockedSelection: (locked: boolean) => void;
  setMode: (mode: InteractionMode) => void;
  setUnsavedChanges: (hasChanges: boolean) => void;
  updatePreferences: (preferences: Partial<FloorplanState['preferences']>) => void;
  
  // Room operations
  addRoom: (room: Room) => void;
  updateRoom: (roomId: string, updates: Partial<Room>) => void;
  deleteRoom: (roomId: string) => void;
  
  // Pano operations
  assignPanoToRoom: (panoId: string, roomId: string) => void;
  unassignPano: (panoId: string) => void;
  
  // Computed
  getUnassignedPanos: () => Pano[];
  getRoomPanos: (roomId: string) => Pano[];
  getSelectedRoom: () => Room | null;
  getSelectedPano: () => Pano | null;
}

export const useFloorplanStore = create<FloorplanState>((set, get) => ({
  rooms: [],
  panos: [],
  visibilityFilter: 'both',
  selectedRoomId: null,
  selectedPanoId: null,
  lockedSelection: false,
  mode: 'select',
  unsavedChanges: false,
  
  preferences: {
    snap: true,
    grid: false,
    filter: 'both'
  },
  
  setRooms: (rooms) => set({ rooms }),
  setPanos: (panos) => set({ panos }),
  setVisibilityFilter: (filter) => set({ visibilityFilter: filter }),
  setSelectedRoom: (roomId) => set({ selectedRoomId: roomId }),
  setSelectedPano: (panoId) => set({ selectedPanoId: panoId }),
  setLockedSelection: (locked) => set({ lockedSelection: locked }),
  setMode: (mode) => set({ mode }),
  setUnsavedChanges: (hasChanges) => set({ unsavedChanges: hasChanges }),
  updatePreferences: (preferences) => set((state) => ({
    preferences: { ...state.preferences, ...preferences }
  })),
  
  addRoom: (room) => set((state) => ({
    rooms: [...state.rooms, room],
    unsavedChanges: true
  })),
  
  updateRoom: (roomId, updates) => set((state) => ({
    rooms: state.rooms.map(room => 
      room.id === roomId ? { ...room, ...updates } : room
    ),
    unsavedChanges: true
  })),
  
  deleteRoom: (roomId) => set((state) => ({
    rooms: state.rooms.filter(room => room.id !== roomId),
    selectedRoomId: state.selectedRoomId === roomId ? null : state.selectedRoomId,
    unsavedChanges: true
  })),
  
  assignPanoToRoom: (panoId, roomId) => set((state) => ({
    panos: state.panos.map(pano => 
      pano.id === panoId ? { ...pano, roomId } : pano
    ),
    unsavedChanges: true
  })),
  
  unassignPano: (panoId) => set((state) => ({
    panos: state.panos.map(pano => 
      pano.id === panoId ? { ...pano, roomId: undefined } : pano
    ),
    unsavedChanges: true
  })),
  
  getUnassignedPanos: () => {
    const { panos } = get();
    return panos.filter(pano => !pano.roomId);
  },
  
  getRoomPanos: (roomId) => {
    const { panos } = get();
    return panos.filter(pano => pano.roomId === roomId);
  },
  
  getSelectedRoom: () => {
    const { rooms, selectedRoomId } = get();
    return rooms.find(room => room.id === selectedRoomId) || null;
  },
  
  getSelectedPano: () => {
    const { panos, selectedPanoId } = get();
    return panos.find(pano => pano.id === selectedPanoId) || null;
  }
}));