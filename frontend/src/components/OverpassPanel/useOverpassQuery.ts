import { useState, useCallback } from "react";
import { FeatureCollection } from "geojson";
import * as App from "../../../wailsjs/go/main/App";
import { main } from "../../../wailsjs/go/models";
import { calculateBounds, calculateZoomLevel, getBboxArray, getBboxString } from "./utils";
import { SAMPLE_TEMPLATES } from "./constants";
import { OverpassTemplate } from "./types";

interface UseOverpassQueryProps {
  addLayer: (layer: any) => void;
  setViewState: (state: any) => void;
  viewState: any;
  drawnBounds?: [number, number, number, number] | null;
}

export const useOverpassQuery = ({
  addLayer,
  setViewState,
  viewState,
  drawnBounds,
}: UseOverpassQueryProps) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);

  const zoomToBounds = useCallback(
    (bounds: {
      minLng: number;
      maxLng: number;
      minLat: number;
      maxLat: number;
    }) => {
      const centerLng = (bounds.minLng + bounds.maxLng) / 2;
      const centerLat = (bounds.minLat + bounds.maxLat) / 2;
      const zoom = calculateZoomLevel(bounds);

      setViewState({
        longitude: centerLng,
        latitude: centerLat,
        zoom: Math.min(zoom, 15),
      });
    },
    [setViewState]
  );

  const executeQuery = useCallback(
    async (query: string) => {
      if (!query.trim()) {
        setError("Please enter a query");
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const response: main.OverpassResponse = await App.QueryOverpassAPI(
          query
        );
        if (!response || response.success === false) {
          setError(
            'Query returned no features. Try:\n1. Use [out:json] instead of [out:xml]\n2. Check if the coordinates are correct\n3. Try broader search terms\n4. Include relations: rel["leisure"="park"]'
          );
          return;
        }

        // Check if features exist
        if (!response.data?.features || response.data.features.length === 0) {
          setError(
            'Query returned no features. Try:\n1. Use [out:json] instead of [out:xml]\n2. Check if the coordinates are correct\n3. Try broader search terms\n4. Include relations: rel["leisure"="park"]'
          );
          return;
        }

        const layerName = `Overpass Query - ${new Date().toLocaleTimeString()}`;
        const newLayer = {
          id: `overpass-${Date.now()}`,
          data: response.data as FeatureCollection,
          file_name: layerName,
          file_path: "",
          color: [52, 168, 83] as number[],
          type: "overpass",
          labelField: "name",
        } as const;

        addLayer(newLayer);

        // Calculate bounds and zoom to data
        const bounds = calculateBounds(response.data);
        if (bounds) {
          zoomToBounds(bounds);
        }

        console.log("Overpass query executed successfully");
      } catch (err) {
        console.error("Failed to execute query:", err);
        setError(
          err instanceof Error ? err.message : "Failed to execute query"
        );
      } finally {
        setLoading(false);
      }
    },
    [addLayer, zoomToBounds]
  );

  const generateAIQuery = useCallback(
    async (aiDescription: string): Promise<string | null> => {
      if (!aiDescription.trim()) {
        setError("Please enter a description for what you want to find");
        return null;
      }

      setAiLoading(true);
      setError(null);

      try {
        const bboxArray = getBboxArray(viewState, drawnBounds);
        const bbox = getBboxString(viewState, drawnBounds);

        console.log(
          "Generating AI query with description and bbox:",
          aiDescription,
          bboxArray
        );

        let generatedQuery: string;

        try {
          // Use numeric bbox array as required by backend API
          const numericBbox = drawnBounds ? drawnBounds : bboxArray;
          generatedQuery = await App.GenerateOverpassQuery(
            aiDescription,
            numericBbox
          );
          console.log("AI query response:", generatedQuery);

          // Validate that the response is not empty or malformed
          if (
            !generatedQuery ||
            typeof generatedQuery !== "string" ||
            generatedQuery.trim().length === 0
          ) {
            throw new Error("Empty or invalid response from AI service");
          }
        } catch (aiError) {
          console.warn(
            "Backend AI generation failed, using template-based fallback:",
            aiError
          );

          // Show user that we're falling back to templates
          setError(
            "AI generation temporarily unavailable. Using template-based fallback."
          );

          // Simple template-based fallback
          generatedQuery = getTemplateFallback(aiDescription, bbox);

          if (generatedQuery) {
            console.log("Using template-based fallback query");
          }
        }

        if (generatedQuery && generatedQuery.trim()) {
          console.log("Successfully generated and applied AI query");

          // Clear any previous error since we succeeded (even with fallback)
          setTimeout(() => setError(null), 3000); // Clear fallback message after 3 seconds
          return generatedQuery;
        } else {
          setError(
            "Failed to generate query. Please try using the Templates tab instead."
          );
          return null;
        }
      } catch (err) {
        console.error("Failed to generate AI query:", err);
        setError(
          err instanceof Error
            ? err.message
            : "Failed to generate query. Please check the console for details."
        );
        return null;
      } finally {
        setAiLoading(false);
      }
    },
    [viewState, drawnBounds]
  );

  return {
    loading,
    error,
    aiLoading,
    setError,
    executeQuery,
    generateAIQuery,
  };
};

function getTemplateFallback(description: string, bbox: string): string {
  const lowerDesc = description.toLowerCase();
  let template: OverpassTemplate | undefined;

  if (lowerDesc.includes("restaurant") || lowerDesc.includes("food")) {
    template = SAMPLE_TEMPLATES.find((t) => t.name === "Restaurants");
  } else if (lowerDesc.includes("cafe") || lowerDesc.includes("coffee")) {
    template = SAMPLE_TEMPLATES.find((t) => t.name === "Cafes and Coffee Shops");
  } else if (lowerDesc.includes("park") || lowerDesc.includes("green")) {
    template = SAMPLE_TEMPLATES.find((t) => t.name === "Parks and Green Spaces");
  } else if (lowerDesc.includes("boundary") || lowerDesc.includes("border")) {
    template = SAMPLE_TEMPLATES.find((t) => t.name === "Administrative Boundaries");
  } else if (
    lowerDesc.includes("water") ||
    lowerDesc.includes("coast") ||
    lowerDesc.includes("river")
  ) {
    template = SAMPLE_TEMPLATES.find((t) => t.name === "Coastlines and Water Bodies");
  } else if (lowerDesc.includes("road") || lowerDesc.includes("highway")) {
    template = SAMPLE_TEMPLATES.find((t) => t.name === "Roads and Highways");
  } else {
    // Default to restaurants as fallback
    template = SAMPLE_TEMPLATES.find((t) => t.name === "Restaurants");
  }

  if (template) {
    return template.query.replace(/{{bbox}}/g, bbox);
  }

  return "";
}
