import { useCallback, useState } from "react";
import { FeatureCollection } from "geojson";
import { IVectorLayer } from "../types/interfaces";
import { calculateBoundsFromGeojson } from "../utils/mapUtils";

interface UseFileDropHandlerProps {
  layers: IVectorLayer[];
  addLayer: (layer: IVectorLayer) => void;
  setIsLoading: (loading: boolean) => void;
  setErrorMessage: (message: string | null) => void;
  zoomToBounds: (bounds: {
    minLng: number;
    minLat: number;
    maxLng: number;
    maxLat: number;
  }) => void;
}

const LAYER_COLORS = [
  [33, 150, 243],
  [255, 152, 0],
  [76, 175, 80],
  [233, 30, 99],
  [156, 39, 176],
  [255, 235, 59],
  [121, 85, 72],
  [96, 125, 139],
] as const;

const SUPPORTED_EXTENSIONS = [
  "geojson",
  "json",
  "csv",
  "kml",
  "shp",
  "kmz",
];

export function useFileDropHandler({
  layers,
  addLayer,
  setIsLoading,
  setErrorMessage,
  zoomToBounds,
}: UseFileDropHandlerProps) {
  const [isGlobalDragOver, setIsGlobalDragOver] = useState(false);

  const handleDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.stopPropagation();
    setIsGlobalDragOver(true);
  }, []);

  const handleDragLeave = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.stopPropagation();
    // Only set to false if we're leaving the window entirely
    if (event.currentTarget === event.target) {
      setIsGlobalDragOver(false);
    }
  }, []);

  const processGeospatialFile = async (
    file: File,
    ext: string
  ): Promise<FeatureCollection | null> => {
    // USE UNIFIED BACKEND GDAL LOADER
    // Save the dropped file to a temp location and use the backend's unified loader
    try {
      const { WriteFile, LoadGeospatialFile } = await import(
        "../../wailsjs/go/main/App"
      );

      // Read file as base64 for binary-safe transfer
      const arrayBuffer = await file.arrayBuffer();
      const bytes = new Uint8Array(arrayBuffer);
      const binaryString = Array.from(bytes, (byte) =>
        String.fromCharCode(byte)
      ).join("");
      const base64Data = btoa(binaryString);

      // Create a temporary file path
      const tempPath = `/tmp/terrabox_drop_${Date.now()}_${file.name}`;

      // Write the file to temp location
      // Note: WriteFile expects the data as a string, so we'll write base64
      // and decode it on the backend if needed, or we can write the raw content
      // For now, let's write the raw file content
      const fileContent = new TextDecoder().decode(arrayBuffer);

      // For binary files (shp, kmz), we need special handling
      if (ext === "shp" || ext === "kmz") {
        // For binary files, we'll keep using the temp path approach
        // but we need to ensure binary data is preserved
        // Since WriteFile might not handle binary well, let's fall back
        // to client-side processing for now for these formats
        console.log(
          `Using client-side fallback for binary format: ${ext}`
        );
        return await processGeospatialFileClientSide(file, ext, arrayBuffer);
      }

      // For text-based formats (geojson, csv, kml), write as text
      await WriteFile(tempPath, fileContent);

      // Use the unified backend loader
      const geojsonData = await LoadGeospatialFile(tempPath);

      return geojsonData as FeatureCollection;
    } catch (error) {
      console.error("Error using backend loader, falling back:", error);
      // Fallback to client-side processing if backend fails
      return await processGeospatialFileClientSide(file, ext, await file.arrayBuffer());
    }
  };

  // Client-side fallback for binary formats (Shapefile, KMZ)
  const processGeospatialFileClientSide = async (
    file: File,
    ext: string,
    arrayBuffer: ArrayBuffer
  ): Promise<FeatureCollection | null> => {
    if (ext === "shp") {
      const { load } = await import("@loaders.gl/core");
      const { ShapefileLoader } = await import("@loaders.gl/shapefile");
      return (await load(arrayBuffer, ShapefileLoader)) as FeatureCollection;
    }

    if (ext === "kmz") {
      const JSZip = (await import("jszip")).default;
      const { KMLLoader } = await import("@loaders.gl/kml");
      const { load } = await import("@loaders.gl/core");

      const zip = await JSZip.loadAsync(arrayBuffer);
      const kmlFiles = Object.keys(zip.files).filter(
        (name) =>
          name.toLowerCase().endsWith(".kml") && !zip.files[name].dir
      );

      if (kmlFiles.length > 0) {
        const kmlContent = await zip.files[kmlFiles[0]].async("text");
        return (await load(kmlContent, KMLLoader)) as FeatureCollection;
      } else {
        throw new Error("No KML files found in KMZ archive");
      }
    }

    // For other formats, try text-based parsing
    const text = new TextDecoder().decode(arrayBuffer);

    if (ext === "kml") {
      const { KMLLoader } = await import("@loaders.gl/kml");
      const { load } = await import("@loaders.gl/core");
      return (await load(text, KMLLoader)) as FeatureCollection;
    }

    if (ext === "geojson" || ext === "json") {
      return JSON.parse(text);
    }

    if (ext === "csv") {
      // CSV parsing is now handled by the backend via GDAL
      // This shouldn't be reached, but keep as ultimate fallback
      const lines = text.trim().split("\n");
      if (lines.length < 2) {
        throw new Error(
          "CSV file must have at least a header and one data row"
        );
      }

      const headers = lines[0]
        .split(",")
        .map((h) => h.trim().toLowerCase());
      const features: any[] = [];

      const latIndex = headers.findIndex(
        (h) =>
          h.includes("lat") || h.includes("y") || h === "latitude"
      );
      const lngIndex = headers.findIndex(
        (h) =>
          h.includes("lng") ||
          h.includes("lon") ||
          h.includes("x") ||
          h === "longitude"
      );

      if (latIndex === -1 || lngIndex === -1) {
        throw new Error(
          "CSV file must contain latitude and longitude columns"
        );
      }

      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(",").map((v) => v.trim());
        if (values.length !== headers.length) continue;

        const lat = parseFloat(values[latIndex]);
        const lng = parseFloat(values[lngIndex]);

        if (
          !isNaN(lng) &&
          !isNaN(lat) &&
          lng >= -180 &&
          lng <= 180 &&
          lat >= -90 &&
          lat <= 90
        ) {
          const properties: any = {};
          headers.forEach((header, index) => {
            if (index !== latIndex && index !== lngIndex) {
              properties[header] = values[index];
            }
          });

          features.push({
            type: "Feature",
            geometry: {
              type: "Point",
              coordinates: [lng, lat],
            },
            properties,
          });
        }
      }

      return {
        type: "FeatureCollection",
        features,
      };
    }

    return null;
  };

  const handleDrop = useCallback(
    async (event: React.DragEvent) => {
      event.preventDefault();
      event.stopPropagation();
      setIsGlobalDragOver(false);

      const files = Array.from(event.dataTransfer.files);
      setIsLoading(true);

      try {
        for (const file of files) {
          const ext = file.name.toLowerCase().split(".").pop();
          if (ext && SUPPORTED_EXTENSIONS.includes(ext)) {
            try {
              console.log("Loading dropped file:", file.name);

              const geojsonData = await processGeospatialFile(file, ext);

              if (geojsonData && geojsonData.features) {
                // Create a temporary file path using blob URL
                const arrayBuffer = await file.arrayBuffer();
                const blob = new Blob([arrayBuffer], { type: file.type });
                const url = URL.createObjectURL(blob);

                // Generate a layer color
                const colorIndex = layers.length % LAYER_COLORS.length;

                const newLayer: IVectorLayer = {
                  id: `layer_${Date.now()}_${Math.random()}`,
                  data: geojsonData as FeatureCollection,
                  file_name: file.name,
                  file_path: url,
                  color: LAYER_COLORS[colorIndex] as [number, number, number],
                  type: "vector",
                  labelField: "",
                  showLabels: false,
                };

                addLayer(newLayer);
                console.log(`✅ Successfully loaded: ${file.name}`);

                // Calculate bounds and zoom to the layer
                const bounds = calculateBoundsFromGeojson(
                  geojsonData as FeatureCollection
                );
                if (bounds) {
                  zoomToBounds(bounds);
                }
              }
            } catch (error) {
              console.error(`Error loading file ${file.name}:`, error);
              setErrorMessage(`Failed to load ${file.name}: ${error}`);
            }
          } else {
            console.warn(`Unsupported file format: ${file.name}`);
            setErrorMessage(
              `Unsupported file format: ${file.name}. Supported formats: GeoJSON, KML, KMZ, Shapefile, CSV`
            );
          }
        }
      } finally {
        setIsLoading(false);
      }
    },
    [layers, addLayer, setIsLoading, setErrorMessage, zoomToBounds]
  );

  return {
    isGlobalDragOver,
    handleDragOver,
    handleDragLeave,
    handleDrop,
  };
}
