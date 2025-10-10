import { create } from "zustand";
import { DrawRectangleMode, ViewMode } from "@deck.gl-community/editable-layers";

interface DrawingState {
  // Bounds drawing
  isDrawingBounds: boolean;
  setIsDrawingBounds: (isDrawing: boolean) => void;
  drawnBounds: [number, number, number, number] | null;
  setDrawnBounds: (bounds: [number, number, number, number] | null) => void;
  boundsFeatureCollection: any;
  setBoundsFeatureCollection: (data: any) => void;
  boundsDrawingMode: any;
  setBoundsDrawingMode: (mode: any) => void;

  // Selection drawing
  isDrawingBasicSelection: boolean;
  setIsDrawingBasicSelection: (isDrawing: boolean) => void;
  selectionFeatureCollection: any;
  setSelectionFeatureCollection: (data: any) => void;
  selectionDrawingMode: any;
  setSelectionDrawingMode: (mode: any) => void;

  // Geometry tools
  geometryToolsOpen: boolean;
  setGeometryToolsOpen: (isOpen: boolean) => void;
  isSelectingForGeometryTool: boolean;
  setIsSelectingForGeometryTool: (isSelecting: boolean) => void;
  activeGeometryTool: string | null;
  setActiveGeometryTool: (tool: string | null) => void;
  selectedGeometryFeatures: any[];
  setSelectedGeometryFeatures: (features: any[]) => void;
  selectedExtrudePoints: number[];
  setSelectedExtrudePoints: (points: number[]) => void;
  isSelectingExtrudePoints: boolean;
  setIsSelectingExtrudePoints: (isSelecting: boolean) => void;

  // Helper methods
  startBoundsDrawing: () => void;
  finishBoundsDrawing: () => void;
  cancelBoundsDrawing: () => void;
}

export const useDrawingState = create<DrawingState>((set) => ({
  // Bounds drawing
  isDrawingBounds: false,
  setIsDrawingBounds: (isDrawing) => set({ isDrawingBounds: isDrawing }),
  drawnBounds: null,
  setDrawnBounds: (bounds) => set({ drawnBounds: bounds }),
  boundsFeatureCollection: { type: "FeatureCollection", features: [] },
  setBoundsFeatureCollection: (data) => set({ boundsFeatureCollection: data }),
  boundsDrawingMode: new DrawRectangleMode(),
  setBoundsDrawingMode: (mode) => set({ boundsDrawingMode: mode }),

  // Selection drawing
  isDrawingBasicSelection: false,
  setIsDrawingBasicSelection: (isDrawing) =>
    set({ isDrawingBasicSelection: isDrawing }),
  selectionFeatureCollection: { type: "FeatureCollection", features: [] },
  setSelectionFeatureCollection: (data) =>
    set({ selectionFeatureCollection: data }),
  selectionDrawingMode: new ViewMode(),
  setSelectionDrawingMode: (mode) => set({ selectionDrawingMode: mode }),

  // Geometry tools
  geometryToolsOpen: false,
  setGeometryToolsOpen: (isOpen) => set({ geometryToolsOpen: isOpen }),
  isSelectingForGeometryTool: false,
  setIsSelectingForGeometryTool: (isSelecting) =>
    set({ isSelectingForGeometryTool: isSelecting }),
  activeGeometryTool: null,
  setActiveGeometryTool: (tool) => set({ activeGeometryTool: tool }),
  selectedGeometryFeatures: [],
  setSelectedGeometryFeatures: (features) =>
    set({ selectedGeometryFeatures: features }),
  selectedExtrudePoints: [],
  setSelectedExtrudePoints: (points) => set({ selectedExtrudePoints: points }),
  isSelectingExtrudePoints: false,
  setIsSelectingExtrudePoints: (isSelecting) =>
    set({ isSelectingExtrudePoints: isSelecting }),

  // Helper methods
  startBoundsDrawing: () =>
    set({
      isDrawingBounds: true,
      drawnBounds: null,
      boundsFeatureCollection: { type: "FeatureCollection", features: [] },
      boundsDrawingMode: new DrawRectangleMode(),
    }),

  finishBoundsDrawing: () =>
    set({
      isDrawingBounds: false,
    }),

  cancelBoundsDrawing: () =>
    set({
      isDrawingBounds: false,
      drawnBounds: null,
      boundsFeatureCollection: { type: "FeatureCollection", features: [] },
      boundsDrawingMode: new DrawRectangleMode(),
    }),
}));
