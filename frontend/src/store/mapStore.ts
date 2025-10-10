import { create } from "zustand";
import { FeatureCollection, Feature } from "geojson";
import { GeoFileIndex, IVectorLayer, MediaMetadata } from "../types/interfaces";

interface MapState {
  // Layer management
  layers: IVectorLayer[];
  setLayers: (layers: IVectorLayer[]) => void;
  addLayer: (layer: IVectorLayer) => void;
  selectedLayer: number;
  setSelectedLayer: (index: number) => void;

  // Raster layers
  rasterLayers: any[];
  setRasterLayers: (layers: any[]) => void;

  // Layer visibility
  layerVisibility: { [key: string]: boolean };
  toggleLayerVisibility: (layerId: string) => void;
  allLayersVisible: boolean;
  toggleAllLayers: () => void;

  // Search and geometry
  searchGeometry: any[];
  setSearchGeometry: (geometry: any[]) => void;
  searchData: FeatureCollection;
  setSearchData: (data: FeatureCollection) => void;
  geoSearchQuery: string;
  setGeoSearchQuery: (query: string) => void;

  // File management
  selectedFiles: GeoFileIndex[];
  setSelectedFiles: (files: GeoFileIndex[]) => void;
  indexedFiles: GeoFileIndex[];
  setIndexedFiles: (files: GeoFileIndex[]) => void;
  filePath: string;
  setFilePath: (path: string) => void;
  selectedBboxFeature: GeoFileIndex | null;
  setSelectedBboxFeature: (feature: GeoFileIndex | null) => void;

  // UI state
  cursor: string;
  setCursor: (cursor: string) => void;
  isPanelOpen: boolean;
  setIsPanelOpen: (open: boolean) => void;
  panelWidth: number;
  setPanelWidth: (width: number) => void;

  // Loading and errors
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
  errorMessage: string | null;
  setErrorMessage: (message: string | null) => void;

  // Metadata and analysis
  metadata: MediaMetadata | null;
  setMetadata: (metadata: MediaMetadata | null) => void;
  dateRange: any;
  setDateRange: (range: any) => void;
  analysisTileData: { tile_url: string; extent: number[] } | null;
  setAnalysisTileData: (
    data: { tile_url: string; extent: number[] } | null
  ) => void;

  // Feature selection
  selectedFeature: Feature | null;
  setSelectedFeature: (feature: Feature | null) => void;
  hoveredFeature: Feature | null;
  setHoveredFeature: (feature: Feature | null) => void;

  // Map viewport state
  viewState: any;
  setViewState: (viewState: any) => void;
}

export const useMapStore = create<MapState>((set, get) => ({
  // Layer management
  layers: [],
  setLayers: (layers) => set({ layers }),
  addLayer: (layer) => set((state) => ({
    layers: [...state.layers, layer],
    layerVisibility: { ...state.layerVisibility, [layer.id]: true }
  })),
  selectedLayer: -1,
  setSelectedLayer: (selectedLayer) => set({ selectedLayer }),

  // Raster layers
  rasterLayers: [],
  setRasterLayers: (rasterLayers) => set({ rasterLayers }),

  // Layer visibility
  layerVisibility: {},
  toggleLayerVisibility: (layerId) =>
    set((state) => ({
      layerVisibility: {
        ...state.layerVisibility,
        [layerId]: !state.layerVisibility[layerId],
      },
    })),
  allLayersVisible: true,
  toggleAllLayers: () =>
    set((state) => {
      const newVisible = !state.allLayersVisible;
      const newVisibility: { [key: string]: boolean } = {};
      state.layers.forEach((layer) => {
        newVisibility[layer.id] = newVisible;
      });
      return {
        allLayersVisible: newVisible,
        layerVisibility: newVisibility,
      };
    }),

  // Search and geometry
  searchGeometry: [],
  setSearchGeometry: (searchGeometry) => set({ searchGeometry }),
  searchData: { type: "FeatureCollection", features: [] },
  setSearchData: (searchData) => set({ searchData }),
  geoSearchQuery: "",
  setGeoSearchQuery: (geoSearchQuery) => set({ geoSearchQuery }),

  // File management
  selectedFiles: [],
  setSelectedFiles: (selectedFiles) => set({ selectedFiles }),
  indexedFiles: [],
  setIndexedFiles: (indexedFiles) => set({ indexedFiles }),
  filePath: "/",
  setFilePath: (filePath) => set({ filePath }),
  selectedBboxFeature: null,
  setSelectedBboxFeature: (selectedBboxFeature) => set({ selectedBboxFeature }),

  // UI state
  cursor: "auto",
  setCursor: (cursor) => set({ cursor }),
  isPanelOpen: false,
  setIsPanelOpen: (isPanelOpen) => set({ isPanelOpen }),
  panelWidth: 350,
  setPanelWidth: (panelWidth) => set({ panelWidth }),

  // Loading and errors
  isLoading: false,
  setIsLoading: (isLoading) => set({ isLoading }),
  errorMessage: null,
  setErrorMessage: (errorMessage) => set({ errorMessage }),

  // Metadata and analysis
  metadata: null,
  setMetadata: (metadata) => set({ metadata }),
  dateRange: null,
  setDateRange: (dateRange) => set({ dateRange }),
  analysisTileData: null,
  setAnalysisTileData: (analysisTileData) => set({ analysisTileData }),

  // Feature selection
  selectedFeature: null,
  setSelectedFeature: (selectedFeature) => set({ selectedFeature }),
  hoveredFeature: null,
  setHoveredFeature: (hoveredFeature) => set({ hoveredFeature }),

  // Map viewport state
  viewState: { longitude: -105.4, latitude: 40.8, zoom: 4 },
  setViewState: (viewState) => set({ viewState }),
}));
