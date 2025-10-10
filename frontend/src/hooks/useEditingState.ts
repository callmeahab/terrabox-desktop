import { create } from "zustand";

interface EditingState {
  // Edit mode
  editMode: string;
  setEditMode: (mode: string) => void;

  // Editable layer
  editableLayerId: string | null;
  setEditableLayerId: (id: string | null) => void;

  // Selected features for editing
  selectedEditFeatureIndexes: number[];
  setSelectedEditFeatureIndexes: (indexes: number[]) => void;

  // Basic tool (view, select, selectByArea, move)
  basicTool: string;
  setBasicTool: (tool: string) => void;

  // Selected features for basic tools
  selectedFeaturesForMove: {
    layerId: string | null;
    indexes: number[];
  };
  setSelectedFeaturesForMove: (selection: {
    layerId: string | null;
    indexes: number[];
  }) => void;

  // Drag distance tracking
  dragDistance: number | null;
  setDragDistance: (distance: number | null) => void;
  dragStartPosition: [number, number] | null;
  setDragStartPosition: (position: [number, number] | null) => void;

  // Layer update counter for forcing re-renders
  layerUpdateCounter: number;
  incrementLayerUpdateCounter: () => void;
}

export const useEditingState = create<EditingState>((set) => ({
  // Edit mode
  editMode: "view",
  setEditMode: (mode) => set({ editMode: mode }),

  // Editable layer
  editableLayerId: null,
  setEditableLayerId: (id) => set({ editableLayerId: id }),

  // Selected features for editing
  selectedEditFeatureIndexes: [],
  setSelectedEditFeatureIndexes: (indexes) =>
    set({ selectedEditFeatureIndexes: indexes }),

  // Basic tool
  basicTool: "view",
  setBasicTool: (tool) => set({ basicTool: tool }),

  // Selected features for basic tools
  selectedFeaturesForMove: { layerId: null, indexes: [] },
  setSelectedFeaturesForMove: (selection) =>
    set({ selectedFeaturesForMove: selection }),

  // Drag distance tracking
  dragDistance: null,
  setDragDistance: (distance) => set({ dragDistance: distance }),
  dragStartPosition: null,
  setDragStartPosition: (position) => set({ dragStartPosition: position }),

  // Layer update counter
  layerUpdateCounter: 0,
  incrementLayerUpdateCounter: () =>
    set((state) => ({ layerUpdateCounter: state.layerUpdateCounter + 1 })),
}));
