import { useEffect } from "react";
import { IVectorLayer } from "../types/interfaces";

interface UseKeyboardShortcutsProps {
  featureDetailsPanelOpen: boolean;
  setFeatureDetailsPanelOpen: (open: boolean) => void;
  setSelectedFeature: (feature: any) => void;
  selectedFeaturesForMove: {
    layerId: string | null;
    indexes: number[];
  };
  setSelectedFeaturesForMove: (selection: {
    layerId: string | null;
    indexes: number[];
  }) => void;
  editMode: string;
  editableLayerId: string | null;
  selectedEditFeatureIndexes: number[];
  setSelectedEditFeatureIndexes: (indexes: number[]) => void;
  layers: IVectorLayer[];
  setLayers: (layers: IVectorLayer[]) => void;
  incrementLayerUpdateCounter: () => void;
}

export function useKeyboardShortcuts({
  featureDetailsPanelOpen,
  setFeatureDetailsPanelOpen,
  setSelectedFeature,
  selectedFeaturesForMove,
  setSelectedFeaturesForMove,
  editMode,
  editableLayerId,
  selectedEditFeatureIndexes,
  setSelectedEditFeatureIndexes,
  layers,
  setLayers,
  incrementLayerUpdateCounter,
}: UseKeyboardShortcutsProps) {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Escape key to close feature details or cancel selection
      if (event.key === "Escape") {
        if (featureDetailsPanelOpen) {
          setFeatureDetailsPanelOpen(false);
          setSelectedFeature(null);
        } else if (selectedFeaturesForMove.indexes.length > 0) {
          // Clear basic tool selections
          setSelectedFeaturesForMove({ layerId: null, indexes: [] });
        } else if (selectedEditFeatureIndexes.length > 0) {
          setSelectedEditFeatureIndexes([]);
        }
        return;
      }

      // Delete key to remove selected features (only in edit mode)
      if (
        (event.key === "Delete" || event.key === "Backspace") &&
        editMode !== "view" &&
        editableLayerId &&
        selectedEditFeatureIndexes.length > 0
      ) {
        event.preventDefault();

        // Confirm deletion
        const confirmDelete = window.confirm(
          `Delete ${selectedEditFeatureIndexes.length} selected feature${
            selectedEditFeatureIndexes.length > 1 ? "s" : ""
          }?`
        );

        if (confirmDelete) {
          const layer = layers.find((l) => l.id === editableLayerId);
          if (layer && layer.data) {
            const updatedData = { ...layer.data };
            const newFeatures = updatedData.features.filter(
              (_: any, index: number) =>
                !selectedEditFeatureIndexes.includes(index)
            );
            updatedData.features = newFeatures;

            const updatedLayers = layers.map((l) => {
              if (l.id === editableLayerId) {
                return { ...l, data: updatedData };
              }
              return l;
            });

            setLayers(updatedLayers);
            incrementLayerUpdateCounter();
            setSelectedEditFeatureIndexes([]);
            console.log(
              `🗑️ Deleted ${selectedEditFeatureIndexes.length} feature(s)`
            );
          }
        }
        return;
      }

      // Arrow key nudging for precise positioning (only in translate mode with selection)
      if (
        editMode === "translate" &&
        editableLayerId &&
        selectedEditFeatureIndexes.length > 0 &&
        ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(event.key)
      ) {
        event.preventDefault();

        const nudgeDistance = event.shiftKey ? 0.001 : 0.0001; // Shift for larger nudge
        let dx = 0,
          dy = 0;

        switch (event.key) {
          case "ArrowUp":
            dy = nudgeDistance;
            break;
          case "ArrowDown":
            dy = -nudgeDistance;
            break;
          case "ArrowLeft":
            dx = -nudgeDistance;
            break;
          case "ArrowRight":
            dx = nudgeDistance;
            break;
        }

        const layer = layers.find((l) => l.id === editableLayerId);
        if (layer && layer.data) {
          const updatedData = JSON.parse(JSON.stringify(layer.data));

          selectedEditFeatureIndexes.forEach((index) => {
            const feature = updatedData.features[index];
            if (!feature) return;

            const nudgeCoordinates = (coords: any): any => {
              if (typeof coords[0] === "number") {
                return [coords[0] + dx, coords[1] + dy];
              }
              return coords.map(nudgeCoordinates);
            };

            if (feature.geometry && feature.geometry.coordinates) {
              feature.geometry.coordinates = nudgeCoordinates(
                feature.geometry.coordinates
              );
            }
          });

          const updatedLayers = layers.map((l) => {
            if (l.id === editableLayerId) {
              return { ...l, data: updatedData };
            }
            return l;
          });

          setLayers(updatedLayers);
          incrementLayerUpdateCounter();
          console.log(`⬆️ Nudged feature(s) by ${nudgeDistance} degrees`);
        }
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [
    featureDetailsPanelOpen,
    setFeatureDetailsPanelOpen,
    setSelectedFeature,
    selectedFeaturesForMove,
    setSelectedFeaturesForMove,
    editMode,
    editableLayerId,
    selectedEditFeatureIndexes,
    setSelectedEditFeatureIndexes,
    layers,
    setLayers,
    incrementLayerUpdateCounter,
  ]);
}
