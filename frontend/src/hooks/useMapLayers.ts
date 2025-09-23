import { useMapStore } from '../store/mapStore';

// Hook for components that only need layer data
export const useMapLayers = () => {
  const layers = useMapStore((state) => state.layers);
  const setLayers = useMapStore((state) => state.setLayers);
  const addLayer = useMapStore((state) => state.addLayer);
  const selectedLayer = useMapStore((state) => state.selectedLayer);
  const setSelectedLayer = useMapStore((state) => state.setSelectedLayer);
  const rasterLayers = useMapStore((state) => state.rasterLayers);
  const setRasterLayers = useMapStore((state) => state.setRasterLayers);

  return {
    layers,
    setLayers,
    addLayer,
    selectedLayer,
    setSelectedLayer,
    rasterLayers,
    setRasterLayers,
  };
};

// Hook for layer visibility controls
export const useLayerVisibility = () => {
  const layerVisibility = useMapStore((state) => state.layerVisibility);
  const toggleLayerVisibility = useMapStore((state) => state.toggleLayerVisibility);
  const allLayersVisible = useMapStore((state) => state.allLayersVisible);
  const toggleAllLayers = useMapStore((state) => state.toggleAllLayers);

  return {
    layerVisibility,
    toggleLayerVisibility,
    allLayersVisible,
    toggleAllLayers,
  };
};

// Hook for file management
export const useFileManagement = () => {
  const selectedFiles = useMapStore((state) => state.selectedFiles);
  const setSelectedFiles = useMapStore((state) => state.setSelectedFiles);
  const indexedFiles = useMapStore((state) => state.indexedFiles);
  const setIndexedFiles = useMapStore((state) => state.setIndexedFiles);
  const filePath = useMapStore((state) => state.filePath);
  const setFilePath = useMapStore((state) => state.setFilePath);

  return {
    selectedFiles,
    setSelectedFiles,
    indexedFiles,
    setIndexedFiles,
    filePath,
    setFilePath,
  };
};

// Hook for UI state
export const useUI = () => {
  const cursor = useMapStore((state) => state.cursor);
  const setCursor = useMapStore((state) => state.setCursor);
  const isPanelOpen = useMapStore((state) => state.isPanelOpen);
  const setIsPanelOpen = useMapStore((state) => state.setIsPanelOpen);
  const panelWidth = useMapStore((state) => state.panelWidth);
  const setPanelWidth = useMapStore((state) => state.setPanelWidth);
  const isLoading = useMapStore((state) => state.isLoading);
  const setIsLoading = useMapStore((state) => state.setIsLoading);
  const errorMessage = useMapStore((state) => state.errorMessage);
  const setErrorMessage = useMapStore((state) => state.setErrorMessage);

  return {
    cursor,
    setCursor,
    isPanelOpen,
    setIsPanelOpen,
    panelWidth,
    setPanelWidth,
    isLoading,
    setIsLoading,
    errorMessage,
    setErrorMessage,
  };
};

// Hook for feature selection
export const useFeatureSelection = () => {
  const selectedFeature = useMapStore((state) => state.selectedFeature);
  const setSelectedFeature = useMapStore((state) => state.setSelectedFeature);
  const hoveredFeature = useMapStore((state) => state.hoveredFeature);
  const setHoveredFeature = useMapStore((state) => state.setHoveredFeature);

  return {
    selectedFeature,
    setSelectedFeature,
    hoveredFeature,
    setHoveredFeature,
  };
};

// Hook for search functionality
export const useSearch = () => {
  const searchData = useMapStore((state) => state.searchData);
  const setSearchData = useMapStore((state) => state.setSearchData);
  const searchGeometry = useMapStore((state) => state.searchGeometry);
  const setSearchGeometry = useMapStore((state) => state.setSearchGeometry);
  const geoSearchQuery = useMapStore((state) => state.geoSearchQuery);
  const setGeoSearchQuery = useMapStore((state) => state.setGeoSearchQuery);

  return {
    searchData,
    setSearchData,
    searchGeometry,
    setSearchGeometry,
    geoSearchQuery,
    setGeoSearchQuery,
  };
};

// Hook for map viewport state
export const useMapViewport = () => {
  const viewState = useMapStore((state) => state.viewState);
  const setViewState = useMapStore((state) => state.setViewState);

  return {
    viewState,
    setViewState,
  };
};

// Hook for only setting viewport (no re-renders on viewport changes)
export const useMapViewportSetter = () => {
  const setViewState = useMapStore((state) => state.setViewState);
  return { setViewState };
};