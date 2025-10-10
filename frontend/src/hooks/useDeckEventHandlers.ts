import { useCallback } from "react";
import { useEditingState } from "./useEditingState";
import { useDrawingState } from "./useDrawingState";
import { useFeatureSelection, useUI } from "./useMapLayers";
import { IVectorLayer } from "../types/interfaces";
import { calculateDistance } from "../utils/mapUtils";

interface UseDeckEventHandlersProps {
  layers: IVectorLayer[];
  setLayers: (layers: IVectorLayer[]) => void;
}

export function useDeckEventHandlers({
  layers,
  setLayers,
}: UseDeckEventHandlersProps) {
  const {
    editMode,
    basicTool,
    editableLayerId,
    selectedEditFeatureIndexes,
    setSelectedEditFeatureIndexes,
    selectedFeaturesForMove,
    setSelectedFeaturesForMove,
    dragStartPosition,
    setDragStartPosition,
    setDragDistance,
    incrementLayerUpdateCounter,
  } = useEditingState();

  const {
    isDrawingBounds,
    isSelectingExtrudePoints,
    isSelectingForGeometryTool,
    selectedExtrudePoints,
    setSelectedExtrudePoints,
    selectedGeometryFeatures,
    setSelectedGeometryFeatures,
  } = useDrawingState();

  const { setSelectedFeature, setHoveredFeature } = useFeatureSelection();
  const { setCursor } = useUI();

  /**
   * Handle deck.gl feature click
   */
  const handleDeckFeatureClick = useCallback(
    (info: any, event: any) => {
      // Handle bounds drawing mode
      if (isDrawingBounds) {
        return;
      }

      // Handle basic tool rectangle selection
      if (basicTool === "selectByArea" && editMode === "view") {
        return;
      }

      // Handle basic tool modes (always active when not in edit mode)
      if (basicTool === "view" && editMode === "view") {
        // View mode - select feature (panel opening is managed in App.tsx)
        if (info.object) {
          setSelectedFeature(info.object);
          console.log("Feature clicked:", info);
        } else {
          setSelectedFeature(null);
        }
        return;
      }

      if (basicTool === "select" && editMode === "view") {
        // Select mode - select/deselect features
        if (info.object && info.index !== undefined && info.layer) {
          const clickedLayerId = info.layer.id.replace(/-\d+$/, "");
          const isShiftPressed = event.srcEvent?.shiftKey;

          const prev = selectedFeaturesForMove;
          let newSelection: { layerId: string | null; indexes: number[] };

          if (
            prev.layerId &&
            prev.layerId !== clickedLayerId &&
            !isShiftPressed
          ) {
            newSelection = { layerId: clickedLayerId, indexes: [info.index] };
          } else if (isShiftPressed && prev.layerId === clickedLayerId) {
            if (prev.indexes.includes(info.index)) {
              newSelection = {
                layerId: prev.indexes.length > 1 ? clickedLayerId : null,
                indexes: prev.indexes.filter((i: number) => i !== info.index),
              };
            } else {
              newSelection = {
                layerId: clickedLayerId,
                indexes: [...prev.indexes, info.index],
              };
            }
          } else {
            if (
              prev.indexes.length === 1 &&
              prev.indexes[0] === info.index &&
              prev.layerId === clickedLayerId
            ) {
              newSelection = { layerId: null, indexes: [] };
            } else {
              newSelection = { layerId: clickedLayerId, indexes: [info.index] };
            }
          }

          setSelectedFeaturesForMove(newSelection);

          console.log(
            `👆 Selected feature at index: ${info.index} from layer: ${clickedLayerId}`
          );
        } else {
          setSelectedFeaturesForMove({ layerId: null, indexes: [] });
        }
        return;
      }

      // Handle simple select mode in edit mode
      if (editMode === "select" && editableLayerId) {
        if (info.object && info.index !== undefined) {
          const isShiftPressed = event.srcEvent?.shiftKey;

          const prev = selectedEditFeatureIndexes;
          let newIndexes: number[];

          if (isShiftPressed) {
            if (prev.includes(info.index)) {
              newIndexes = prev.filter((i: number) => i !== info.index);
            } else {
              newIndexes = [...prev, info.index];
            }
          } else {
            if (prev.length === 1 && prev[0] === info.index) {
              newIndexes = [];
            } else {
              newIndexes = [info.index];
            }
          }

          setSelectedEditFeatureIndexes(newIndexes);

          console.log(`👆 Selected feature at index: ${info.index}`);
        } else {
          setSelectedEditFeatureIndexes([]);
        }
        return;
      }

      // Handle point selection for extrude tool
      if (
        isSelectingExtrudePoints &&
        editableLayerId &&
        selectedEditFeatureIndexes.length > 0
      ) {
        const layer = layers.find((l) => l.id === editableLayerId);
        if (!layer) return;

        const feature = layer.data?.features?.[selectedEditFeatureIndexes[0]];
        if (!feature || feature.geometry?.type !== "Polygon") return;

        const clickCoord = info.coordinate;
        if (!clickCoord) return;

        const coordinates = feature.geometry.coordinates[0];
        let closestIndex = -1;
        let minDistance = Infinity;
        const SELECTION_THRESHOLD = 0.01;

        coordinates.forEach((coord: number[], index: number) => {
          const dx = coord[0] - clickCoord[0];
          const dy = coord[1] - clickCoord[1];
          const distance = Math.sqrt(dx * dx + dy * dy);

          if (distance < minDistance) {
            minDistance = distance;
            closestIndex = index;
          }
        });

        if (closestIndex >= 0 && minDistance < SELECTION_THRESHOLD) {
          const prev = selectedExtrudePoints;
          let newPoints: number[];

          if (prev.includes(closestIndex)) {
            newPoints = prev.filter((i: number) => i !== closestIndex);
          } else {
            newPoints = [...prev, closestIndex];
          }

          setSelectedExtrudePoints(newPoints);
          console.log("Selected vertex index:", closestIndex);
        }
        return;
      }

      // Handle feature selection for geometry tools
      if (isSelectingForGeometryTool && info.object) {
        const prev = selectedGeometryFeatures;
        const isAlreadySelected = prev.some((f: any) => f === info.object);
        let newFeatures: any[];

        if (isAlreadySelected) {
          newFeatures = prev.filter((f: any) => f !== info.object);
        } else {
          newFeatures = [...prev, info.object];
        }

        setSelectedGeometryFeatures(newFeatures);
        console.log("Geometry tool feature selection:", info.object);
        return;
      }

      // Default edit mode handling
      if (editMode !== "view") {
        if (info.object && info.index !== undefined) {
          console.log("🎯 Selecting feature for editing at index:", info.index);
          setSelectedEditFeatureIndexes([info.index]);
        } else {
          setSelectedEditFeatureIndexes([]);
        }
        return;
      }

      // Default view handling
      if (info.object) {
        setSelectedFeature(info.object);
        console.log("Feature clicked:", info);
      } else {
        setSelectedFeature(null);
      }
    },
    [
      basicTool,
      editMode,
      isDrawingBounds,
      isSelectingExtrudePoints,
      isSelectingForGeometryTool,
      editableLayerId,
      layers,
      selectedEditFeatureIndexes,
      setSelectedFeature,
      setSelectedEditFeatureIndexes,
      setSelectedFeaturesForMove,
      setSelectedExtrudePoints,
      setSelectedGeometryFeatures,
    ]
  );

  /**
   * Handle deck.gl feature hover
   */
  const handleDeckFeatureHover = useCallback(
    (info: any) => {
      if (info.object) {
        setHoveredFeature(info.object);

        if (editMode === "view") {
          if (basicTool === "view") {
            setCursor("pointer");
          } else if (basicTool === "select") {
            setCursor("pointer");
          } else if (basicTool === "selectByArea") {
            setCursor("crosshair");
          } else if (basicTool === "move") {
            setCursor("grab");
          } else {
            setCursor("pointer");
          }
        } else if (editMode === "modify") {
          setCursor("move");
        } else if (
          ["transform", "scale", "translate", "rotate"].includes(editMode)
        ) {
          setCursor("grab");
        } else {
          setCursor("crosshair");
        }
      } else {
        setHoveredFeature(null);

        if (editMode === "view") {
          if (basicTool === "selectByArea") {
            setCursor("crosshair");
          } else if (
            basicTool === "move" &&
            selectedFeaturesForMove.indexes.length > 0
          ) {
            setCursor("auto");
          } else {
            setCursor("auto");
          }
        } else if (editMode === "modify") {
          setCursor("auto");
        } else if (
          ["transform", "scale", "translate", "rotate"].includes(editMode)
        ) {
          setCursor("auto");
        } else {
          setCursor("crosshair");
        }
      }
    },
    [
      editMode,
      basicTool,
      selectedFeaturesForMove.indexes.length,
      setHoveredFeature,
      setCursor,
    ]
  );

  /**
   * Handle edit events from EditableGeoJsonLayer
   */
  const handleEditEvent = useCallback(
    (info: any, layer: IVectorLayer) => {
      const {
        editType,
        updatedData,
        selectedFeatureIndexes,
        editContext,
      } = info;

      // Calculate drag distance for movePosition events
      if (editType === "movePosition" && editContext?.position) {
        const currentPos = editContext.position as [number, number];

        if (!dragStartPosition) {
          setDragStartPosition(currentPos);
          setDragDistance(0);
        } else {
          const distance = calculateDistance(
            dragStartPosition[0],
            dragStartPosition[1],
            currentPos[0],
            currentPos[1]
          );
          setDragDistance(distance);
        }
      }

      // Reset drag tracking
      if (
        ["finishMovePosition", "select", "deselect"].includes(editType)
      ) {
        setDragStartPosition(null);
        setDragDistance(null);
      }

      // Update layer data for completed operations
      const shouldUpdateLayerData = [
        "addFeature",
        "removeFeature",
        "finishMovePosition",
        "movePosition",
        "translated",
        "scaled",
        "rotated",
        "addPosition",
        "removePosition",
        "extruded",
        "split",
        "edit",
      ].includes(editType);

      if (shouldUpdateLayerData && updatedData) {
        const updatedLayers = layers.map((l) => {
          if (l.id === layer.id) {
            return { ...l, data: updatedData };
          }
          return l;
        });
        setLayers(updatedLayers);
        incrementLayerUpdateCounter();
        console.log(`📝 Layer data updated for ${editType}`);
      }

      // Handle feature selection updates
      if (
        editType === "select" ||
        editType === "deselect" ||
        editContext?.selectedFeatureIndexes !== undefined
      ) {
        const newSelectedIndexes =
          editContext?.selectedFeatureIndexes || selectedFeatureIndexes || [];
        setSelectedEditFeatureIndexes(newSelectedIndexes);
        console.log("🎯 Selected feature indexes updated:", newSelectedIndexes);
      }

      if (selectedFeatureIndexes !== undefined) {
        setSelectedEditFeatureIndexes(selectedFeatureIndexes);
      }

      console.log(`Edit event: ${editType}`, info);
    },
    [
      dragStartPosition,
      layers,
      setLayers,
      setDragStartPosition,
      setDragDistance,
      setSelectedEditFeatureIndexes,
      incrementLayerUpdateCounter,
    ]
  );

  /**
   * Handle basic move tool edit events
   */
  const handleBasicMoveEdit = useCallback(
    (info: any) => {
      const { editType, updatedData, editContext } = info;

      console.log("🚚 Basic move edit event:", editType, info);

      if (!selectedFeaturesForMove.layerId) {
        console.warn("⚠️ No selected layer for move");
        return;
      }

      // Update layer data for both movePosition (live updates) and finishMovePosition (final)
      if (
        (editType === "finishMovePosition" || editType === "movePosition" || editType === "translated") &&
        updatedData
      ) {
        console.log(
          `🚚 Updating layer data for ${editType}, features:`,
          updatedData.features?.length
        );

        const updatedLayers = layers.map((l) => {
          if (l.id === selectedFeaturesForMove.layerId) {
            return { ...l, data: updatedData };
          }
          return l;
        });
        setLayers(updatedLayers);
        incrementLayerUpdateCounter();

        if (editType === "finishMovePosition") {
          console.log(
            `✅ Finished moving ${selectedFeaturesForMove.indexes.length} feature(s)`
          );
        }
      }
    },
    [
      selectedFeaturesForMove,
      layers,
      setLayers,
      incrementLayerUpdateCounter,
    ]
  );

  return {
    handleDeckFeatureClick,
    handleDeckFeatureHover,
    handleEditEvent,
    handleBasicMoveEdit,
  };
}
