import React, { useState, useCallback, useRef } from "react";
import {
  Box,
  Typography,
  List,
  ListItem,
  IconButton,
  TextField,
  InputAdornment,
  Chip,
  Tooltip,
  Button,
  Menu,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Paper,
} from "@mui/material";
import {
  Search,
  Folder,
  InsertDriveFile,
  Map,
  ChevronLeft,
  ChevronRight,
  Visibility,
  Refresh,
  Add,
  Info,
  CloudUpload,
  MoreVert,
} from "@mui/icons-material";
import {
  useMapLayers,
  useFileManagement,
  useLayerVisibility,
  useUI,
} from "../hooks/useMapLayers";
import { GeoFileIndex, IVectorLayer } from "../types/interfaces";
import { FeatureCollection } from "geojson";
import IndexingDialog from "./IndexingDialog";
import proj4 from "proj4";
import { ShapefileLoader } from "@loaders.gl/shapefile";
// import { GeoPackageLoader } from '@loaders.gl/geopackage'; // Commented out due to build issues
import { KMLLoader } from "@loaders.gl/kml";
import { load } from "@loaders.gl/core";
import JSZip from "jszip";

interface FilePanelProps {
  open: boolean;
  onToggle: (isOpen: boolean) => void;
  width: number;
  drawnBounds?: [number, number, number, number] | null;
  onZoomToBounds?: (bounds: { minLng: number; minLat: number; maxLng: number; maxLat: number }) => void;
  onCalculateBounds?: (geojsonData: FeatureCollection) => { minLng: number; minLat: number; maxLng: number; maxLat: number } | null;
}

const FilePanel: React.FC<FilePanelProps> = ({
  open,
  onToggle,
  width,
  drawnBounds,
  onZoomToBounds,
  onCalculateBounds,
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedFolder, setSelectedFolder] = useState<string>("/");
  const [indexingDialogOpen, setIndexingDialogOpen] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [panelWidth, setPanelWidth] = useState(width);
  const resizeRef = useRef<HTMLDivElement>(null);
  const [contextMenu, setContextMenu] = useState<{
    mouseX: number;
    mouseY: number;
    file: GeoFileIndex | null;
  } | null>(null);
  const [propertiesDialog, setPropertiesDialog] = useState<{
    open: boolean;
    file: GeoFileIndex | null;
  }>({ open: false, file: null });
  const [isDragOver, setIsDragOver] = useState(false);

  const { addLayer, layers } = useMapLayers();
  const { indexedFiles, selectedFiles, setSelectedFiles } = useFileManagement();
  const { layerVisibility, toggleLayerVisibility } = useLayerVisibility();
  const { setPanelWidth: setContextPanelWidth } = useUI();

  const filteredFiles = (indexedFiles || []).filter(
    (file) =>
      file.file_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      file.file_type.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleFileSelect = (file: GeoFileIndex) => {
    console.log("File selected:", file.file_name);
    const currentSelected = selectedFiles || [];
    const isSelected = currentSelected.find((f) => f.id === file.id);

    if (isSelected) {
      const newSelection = currentSelected.filter((f) => f.id !== file.id);
      console.log("Deselecting file. New selection:", newSelection);
      setSelectedFiles(newSelection);
    } else {
      const newSelection = [...currentSelected, file];
      console.log("Selecting file. New selection:", newSelection);
      setSelectedFiles(newSelection);
    }
  };

  const handleContextMenu = (event: React.MouseEvent, file: GeoFileIndex) => {
    event.preventDefault();
    setContextMenu({
      mouseX: event.clientX - 2,
      mouseY: event.clientY - 4,
      file,
    });
  };

  const handleContextMenuClose = () => {
    setContextMenu(null);
  };

  const handleShowProperties = (file: GeoFileIndex) => {
    setPropertiesDialog({ open: true, file });
    setContextMenu(null);
  };

  const handleDragOver = (event: React.DragEvent) => {
    event.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (event: React.DragEvent) => {
    event.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = async (event: React.DragEvent) => {
    event.preventDefault();
    setIsDragOver(false);

    const files = Array.from(event.dataTransfer.files);
    const supportedExtensions = ["geojson", "json", "csv", "kml", "shp", "kmz"]; // 'gpkg' temporarily removed

    for (const file of files) {
      const ext = file.name.toLowerCase().split(".").pop();
      if (ext && supportedExtensions.includes(ext)) {
        try {
          // Create a temporary file object to simulate indexed file structure
          const tempFile: GeoFileIndex = {
            id: Date.now(),
            file_name: file.name,
            layer_name: file.name,
            file_path: URL.createObjectURL(file),
            file_extension: ext,
            file_type: "vector",
            file_size: file.size,
            crs: "EPSG:4326",
            bbox: "",
            metadata: "",
            num_features: 0,
            num_bands: 0,
            resolution: 0,
            bbox_geom: "",
            centroid_geom: "",
            created_at: Math.floor(Date.now() / 1000),
            modified_at: Math.floor(Date.now() / 1000),
          };

          // For dropped files, we need to read the file content
          const text = await file.text();
          const blob = new Blob([text], { type: "text/plain" });
          const url = URL.createObjectURL(blob);

          // Update the temp file path to use the blob URL
          tempFile.file_path = url;

          // Load the layer directly
          await handleLoadLayer(tempFile);

          console.log(`✅ Successfully loaded dropped file: ${file.name}`);
        } catch (error) {
          console.error("Error loading dropped file:", error);
        }
      }
    }
  };

  const isValidCoordinate = (lng: number, lat: number): boolean => {
    return (
      !isNaN(lng) &&
      !isNaN(lat) &&
      lng >= -180 &&
      lng <= 180 &&
      lat >= -90 &&
      lat <= 90
    );
  };

  const clampCoordinate = (value: number, min: number, max: number): number => {
    return Math.min(Math.max(value, min), max);
  };

  // Define common CRS transformations
  const initializeProjections = () => {
    // Define common projections
    proj4.defs("EPSG:4326", "+proj=longlat +datum=WGS84 +no_defs");
    proj4.defs(
      "EPSG:3857",
      "+proj=merc +a=6378137 +b=6378137 +lat_ts=0.0 +lon_0=0.0 +x_0=0.0 +y_0=0 +k=1.0 +units=m +nadgrids=@null +wktext +no_defs"
    );
    proj4.defs(
      "EPSG:2154",
      "+proj=lcc +lat_1=49 +lat_2=44 +lat_0=46.5 +lon_0=3 +x_0=700000 +y_0=6600000 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs"
    );
    proj4.defs(
      "EPSG:32633",
      "+proj=utm +zone=33 +datum=WGS84 +units=m +no_defs"
    );
    proj4.defs(
      "EPSG:25832",
      "+proj=utm +zone=32 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs"
    );
  };

  const transformCoordinates = (
    coordinates: number[],
    fromCRS: string
  ): number[] => {
    if (!fromCRS || fromCRS === "EPSG:4326" || fromCRS === "WGS84") {
      return coordinates;
    }

    try {
      initializeProjections();

      // Handle different CRS formats
      let sourceCRS = fromCRS;
      if (fromCRS.startsWith("EPSG:")) {
        sourceCRS = fromCRS;
      } else if (fromCRS.includes("WGS 84")) {
        return coordinates; // Already in WGS84
      } else {
        console.warn(`Unknown CRS format: ${fromCRS}, assuming WGS84`);
        return coordinates;
      }

      const transform = proj4(sourceCRS, "EPSG:4326");
      const transformed = transform.forward(coordinates);

      // Validate transformed coordinates
      if (isValidCoordinate(transformed[0], transformed[1])) {
        return transformed;
      } else {
        console.warn(
          `Invalid transformed coordinates: [${transformed[0]}, ${transformed[1]}] from ${fromCRS}`
        );
        return coordinates; // Return original if transformation fails
      }
    } catch (error) {
      console.warn(`Failed to transform coordinates from ${fromCRS}:`, error);
      return coordinates; // Return original coordinates if transformation fails
    }
  };

  const transformGeometry = (geometry: any, fromCRS: string): any => {
    if (!geometry || !geometry.coordinates || fromCRS === "EPSG:4326") {
      return geometry;
    }

    const transformCoordArray = (coords: any): any => {
      if (Array.isArray(coords) && coords.length > 0) {
        if (typeof coords[0] === "number") {
          // This is a coordinate pair [lng, lat]
          return transformCoordinates(coords, fromCRS);
        } else {
          // This is an array of coordinates or arrays
          return coords.map(transformCoordArray);
        }
      }
      return coords;
    };

    return {
      ...geometry,
      coordinates: transformCoordArray(geometry.coordinates),
    };
  };

  const calculateBounds = (geojsonData: any) => {
    if (
      !geojsonData ||
      !geojsonData.features ||
      geojsonData.features.length === 0
    ) {
      return null;
    }

    let minLng = Infinity,
      minLat = Infinity,
      maxLng = -Infinity,
      maxLat = -Infinity;

    geojsonData.features.forEach((feature: any) => {
      if (feature.geometry) {
        const flattenCoordinates = (coords: any[]): void => {
          if (Array.isArray(coords) && coords.length > 0) {
            if (typeof coords[0] === "number") {
              // This is a coordinate pair [lng, lat]
              const [lng, lat] = coords;

              // Validate coordinates before using them
              if (isValidCoordinate(lng, lat)) {
                minLng = Math.min(minLng, lng);
                maxLng = Math.max(maxLng, lng);
                minLat = Math.min(minLat, lat);
                maxLat = Math.max(maxLat, lat);
              } else {
                console.warn("Invalid coordinate found:", [lng, lat]);
              }
            } else {
              // This is an array of coordinates or arrays
              coords.forEach(flattenCoordinates);
            }
          }
        };

        flattenCoordinates(feature.geometry.coordinates);
      }
    });

    if (minLng === Infinity) return null;

    // Add some padding but ensure we don't exceed valid bounds
    const lngPadding = Math.min((maxLng - minLng) * 0.1, 10); // Max 10 degrees padding
    const latPadding = Math.min((maxLat - minLat) * 0.1, 10); // Max 10 degrees padding

    return {
      minLng: clampCoordinate(minLng - lngPadding, -180, 180),
      minLat: clampCoordinate(minLat - latPadding, -90, 90),
      maxLng: clampCoordinate(maxLng + lngPadding, -180, 180),
      maxLat: clampCoordinate(maxLat + latPadding, -90, 90),
    };
  };

  const zoomToBounds = (bounds: any) => {
    if (!bounds) return;

    const centerLng = (bounds.minLng + bounds.maxLng) / 2;
    const centerLat = (bounds.minLat + bounds.maxLat) / 2;

    // Validate center coordinates
    if (!isValidCoordinate(centerLng, centerLat)) {
      console.error("Invalid center coordinates calculated:", {
        centerLng,
        centerLat,
        bounds,
      });
      return;
    }

    // Calculate zoom level based on bounds
    const lngDiff = bounds.maxLng - bounds.minLng;
    const latDiff = bounds.maxLat - bounds.minLat;
    const maxDiff = Math.max(lngDiff, latDiff);

    let zoom = 10;
    if (maxDiff < 0.01) zoom = 16;
    else if (maxDiff < 0.1) zoom = 13;
    else if (maxDiff < 1) zoom = 10;
    else if (maxDiff < 10) zoom = 7;
    else zoom = 4;

    // Clamp zoom between reasonable values
    zoom = Math.min(Math.max(zoom, 0), 18);

    // Note: Zoom to bounds functionality would need to be implemented
    // through a different mechanism since we're no longer managing view state externally
    console.log("Zoom to bounds requested:", {
      longitude: clampCoordinate(centerLng, -180, 180),
      latitude: clampCoordinate(centerLat, -90, 90),
      zoom: zoom,
      pitch: 0,
      bearing: 0,
    });
  };

  const parseKMLContent = async (
    content: string
  ): Promise<FeatureCollection> => {
    try {
      // Use loaders.gl KML parser for proper KML support including polygons and polylines
      const data = await load(content, KMLLoader, {
        kml: {
          normalize: true, // Normalize the output to GeoJSON format
        },
      });

      return data as FeatureCollection;
    } catch (error) {
      console.error("Error parsing KML with loaders.gl:", error);

      // Fallback to basic parsing for simple points only
      const features: any[] = [];
      const placemarksRegex = /<Placemark>(.*?)<\/Placemark>/gs;
      const nameRegex = /<name>(.*?)<\/name>/i;
      const coordsRegex = /<coordinates>(.*?)<\/coordinates>/i;

      let match;
      while ((match = placemarksRegex.exec(content)) !== null) {
        const placemark = match[1];
        const nameMatch = nameRegex.exec(placemark);
        const coordsMatch = coordsRegex.exec(placemark);

        if (coordsMatch) {
          const coords = coordsMatch[1].trim().split(/[\s,]+/);
          if (coords.length >= 2) {
            const lng = parseFloat(coords[0]);
            const lat = parseFloat(coords[1]);

            if (isValidCoordinate(lng, lat)) {
              features.push({
                type: "Feature",
                geometry: {
                  type: "Point",
                  coordinates: [lng, lat],
                },
                properties: {
                  name: nameMatch ? nameMatch[1] : "Unnamed",
                },
              });
            } else {
              console.warn("Invalid KML coordinate found:", [lng, lat]);
            }
          }
        }
      }

      return {
        type: "FeatureCollection",
        features,
      };
    }
  };

  const parseKMZContent = async (
    arrayBuffer: ArrayBuffer
  ): Promise<FeatureCollection> => {
    try {
      const zip = await JSZip.loadAsync(arrayBuffer);

      // Look for KML files in the archive
      let kmlContent = "";
      const kmlFiles = Object.keys(zip.files).filter(
        (name) => name.toLowerCase().endsWith(".kml") && !zip.files[name].dir
      );

      if (kmlFiles.length === 0) {
        throw new Error("No KML files found in KMZ archive");
      }

      // Use the first KML file found
      const kmlFile = zip.files[kmlFiles[0]];
      kmlContent = await kmlFile.async("text");

      return await parseKMLContent(kmlContent);
    } catch (error) {
      console.error("Error parsing KMZ file:", error);
      throw new Error("Failed to extract KML from KMZ file");
    }
  };

  const parseShapefileContent = async (
    arrayBuffer: ArrayBuffer,
    crs?: string
  ): Promise<FeatureCollection> => {
    try {
      const data = (await load(arrayBuffer, ShapefileLoader)) as any;

      // Transform coordinates if CRS is provided and not WGS84
      if (crs && crs !== "EPSG:4326" && data && data.features) {
        data.features = data.features.map((feature: any) => ({
          ...feature,
          geometry: transformGeometry(feature.geometry, crs),
        }));
      }

      return data as FeatureCollection;
    } catch (error) {
      console.error("Error parsing shapefile:", error);
      throw new Error("Failed to parse shapefile");
    }
  };

  // const parseGeoPackageContent = async (arrayBuffer: ArrayBuffer, crs?: string): Promise<FeatureCollection> => {
  //   // Temporarily commented out due to build issues with sql.js dependency
  //   throw new Error('GeoPackage support temporarily disabled due to build issues');
  // };

  const parseCSVContent = (content: string): FeatureCollection => {
    const lines = content.trim().split("\n");
    if (lines.length < 2) {
      throw new Error("CSV file must have at least a header and one data row");
    }

    const headers = lines[0].split(",").map((h) => h.trim().toLowerCase());
    const features: any[] = [];

    // Find coordinate columns
    const latIndex = headers.findIndex(
      (h) => h.includes("lat") || h.includes("y") || h === "latitude"
    );
    const lngIndex = headers.findIndex(
      (h) =>
        h.includes("lng") ||
        h.includes("lon") ||
        h.includes("x") ||
        h === "longitude"
    );

    if (latIndex === -1 || lngIndex === -1) {
      throw new Error("CSV file must contain latitude and longitude columns");
    }

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(",").map((v) => v.trim());
      if (values.length !== headers.length) continue;

      const lat = parseFloat(values[latIndex]);
      const lng = parseFloat(values[lngIndex]);

      if (isValidCoordinate(lng, lat)) {
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
      } else {
        console.warn("Invalid CSV coordinate found:", [lng, lat]);
      }
    }

    return {
      type: "FeatureCollection",
      features,
    };
  };

  const loadGeospatialFile = async (
    filePath: string,
    crs?: string
  ): Promise<FeatureCollection> => {
    try {
      const ext = filePath.toLowerCase().split(".").pop();

      // For filesystem files (indexed files), use the UNIFIED BACKEND LOADER
      if (!filePath.startsWith("blob:")) {
        const { LoadGeospatialFile } = await import("../../wailsjs/go/main/App");
        const geojsonData = await LoadGeospatialFile(filePath);

        // The backend already handles CSV lat/lng detection and GDAL conversion
        // CRS transformation is also handled by GDAL on the backend
        return geojsonData as FeatureCollection;
      }

      // FALLBACK: For blob URLs (from drag & drop), use client-side loaders.gl
      // This is a temporary solution until we implement server-side temp file handling
      console.log("Using client-side loaders.gl fallback for blob URL:", filePath);

      // For binary files (shapefiles, KMZ), we need to read as ArrayBuffer
      if (ext === "shp" || ext === "kmz") {
        const response = await fetch(filePath);
        const arrayBuffer = await response.arrayBuffer();

        if (ext === "shp") {
          return await parseShapefileContent(arrayBuffer, crs);
        }

        if (ext === "kmz") {
          return await parseKMZContent(arrayBuffer);
        }
      }

      // For text-based files
      const response = await fetch(filePath);
      const fileContent = await response.text();

      if (ext === "geojson" || ext === "json") {
        const geojson = JSON.parse(fileContent);

        // Transform coordinates if CRS is provided and not WGS84
        if (crs && crs !== "EPSG:4326" && geojson.features) {
          geojson.features = geojson.features.map((feature: any) => ({
            ...feature,
            geometry: transformGeometry(feature.geometry, crs),
          }));
        }

        return geojson as FeatureCollection;
      }

      if (ext === "csv") {
        const csvData = parseCSVContent(fileContent);

        // Transform coordinates if CRS is provided
        if (crs && crs !== "EPSG:4326" && csvData.features) {
          csvData.features = csvData.features.map((feature: any) => ({
            ...feature,
            geometry: transformGeometry(feature.geometry, crs),
          }));
        }

        return csvData;
      }

      if (ext === "kml") {
        const kmlData = await parseKMLContent(fileContent);

        // KML is typically in WGS84, but transform if specified otherwise
        if (crs && crs !== "EPSG:4326" && kmlData.features) {
          kmlData.features = kmlData.features.map((feature: any) => ({
            ...feature,
            geometry: transformGeometry(feature.geometry, crs),
          }));
        }

        return kmlData;
      }

      throw new Error(`Unsupported file format: ${ext}`);
    } catch (error) {
      console.error("Error loading geospatial file:", error);
      throw error;
    }
  };

  const generateLayerColor = (
    fileType: string,
    index: number
  ): [number, number, number] => {
    // Predefined colors for better visibility and contrast
    const colors = [
      [33, 150, 243], // Blue
      [255, 152, 0], // Orange
      [76, 175, 80], // Green
      [233, 30, 99], // Pink
      [156, 39, 176], // Purple
      [255, 235, 59], // Yellow
      [121, 85, 72], // Brown
      [96, 125, 139], // Blue Grey
      [255, 87, 34], // Deep Orange
      [139, 195, 74], // Light Green
    ];

    // Use predefined colors based on layer index, cycling through them
    const colorIndex = index % colors.length;
    const baseColor = colors[colorIndex];

    // Adjust color based on file type for consistency
    switch (fileType) {
      case "point":
        return baseColor as [number, number, number];
      case "polygon":
        return [baseColor[0] * 0.8, baseColor[1] * 0.8, baseColor[2] * 0.8] as [
          number,
          number,
          number
        ];
      case "line":
        return [baseColor[0] * 1.2, baseColor[1] * 1.2, baseColor[2] * 1.2].map(
          (c) => Math.min(c, 255)
        ) as [number, number, number];
      default:
        return baseColor as [number, number, number];
    }
  };

  const handleLoadLayer = async (file: GeoFileIndex) => {
    try {
      console.log("Loading geospatial file:", file.file_path);

      // Load the actual geospatial data using custom parsers with CRS transformation
      const geojsonData = await loadGeospatialFile(file.file_path, file.crs);

      console.log("Loaded GeoJSON data:", geojsonData);

      const newLayer: IVectorLayer = {
        id: `layer_${file.id}`,
        data: geojsonData,
        file_name: file.file_name,
        file_path: file.file_path,
        color: generateLayerColor(file.file_type, layers.length),
        type: file.file_type,
        labelField: "",
        showLabels: false,
      };

      addLayer(newLayer);

      // Calculate bounds and zoom to the layer
      if (onCalculateBounds && onZoomToBounds) {
        const bounds = onCalculateBounds(geojsonData);
        if (bounds) {
          onZoomToBounds(bounds);
        }
      } else {
        // Fallback to local calculation if props not provided
        const bounds = calculateBounds(geojsonData);
        if (bounds) {
          zoomToBounds(bounds);
        }
      }
    } catch (error) {
      console.error("Error loading layer:", error);

      // Fallback to empty layer if loading fails
      const fallbackLayer: IVectorLayer = {
        id: `layer_${file.id}`,
        data: {
          type: "FeatureCollection" as const,
          features: [],
        } as FeatureCollection,
        file_name: file.file_name,
        file_path: file.file_path,
        color: generateLayerColor(file.file_type, layers.length),
        type: file.file_type,
        labelField: "",
        showLabels: false,
      };

      addLayer(fallbackLayer);
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const getFileTypeColor = (fileType: string): string => {
    const colors: { [key: string]: string } = {
      vector: "#4caf50",
      raster: "#ff9800",
      point_cloud: "#2196f3",
      database: "#9c27b0",
    };
    return colors[fileType] || "#757575";
  };

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    setIsResizing(true);
    e.preventDefault();
  }, []);

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!isResizing) return;
      const newWidth = Math.max(250, Math.min(800, e.clientX));
      setPanelWidth(newWidth);
      if (setContextPanelWidth) {
        setContextPanelWidth(newWidth);
      }
    },
    [isResizing, setContextPanelWidth]
  );

  const handleMouseUp = useCallback(() => {
    setIsResizing(false);
  }, []);

  React.useEffect(() => {
    if (isResizing) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "ew-resize";
      document.body.style.userSelect = "none";
    } else {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    }

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
  }, [isResizing, handleMouseMove, handleMouseUp]);

  React.useEffect(() => {
    setPanelWidth(width);
  }, [width]);

  return (
    <Paper
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={() => !open && onToggle(true)}
      sx={{
        position: "fixed",
        left: open ? 0 : -panelWidth + 40,
        top: 0,
        bottom: 0,
        width: panelWidth,
        background: open ? "rgba(15, 23, 42, 0.85)" : "rgba(15, 23, 42, 0.95)",
        backdropFilter: open ? "blur(10px)" : "blur(5px)",
        borderRight: open
          ? "1px solid rgba(255, 255, 255, 0.2)"
          : "1px solid rgba(255, 255, 255, 0.1)",
        cursor: !open ? "pointer" : "default",
        "&:hover": !open
          ? {
              borderRight: "2px solid rgba(16, 185, 129, 0.5)",
              transform: "translateX(2px)",
              boxShadow:
                "6px 0 24px rgba(16, 185, 129, 0.3), inset -1px 0 0 rgba(255, 255, 255, 0.15)",
              background: "rgba(15, 23, 42, 0.98)",
              "& .expand-icon": {
                color: "#10b981",
                transform: "scale(1.1)",
                filter: "drop-shadow(0 0 8px rgba(16, 185, 129, 0.5))",
              },
            }
          : {},
        borderLeft: "none",
        boxShadow: open
          ? "8px 0 32px rgba(0, 0, 0, 0.3), inset -1px 0 0 rgba(255, 255, 255, 0.1)"
          : "4px 0 16px rgba(0, 0, 0, 0.2), inset -1px 0 0 rgba(255, 255, 255, 0.05)",
        display: "flex",
        flexDirection: "column",
        zIndex: 1200,
        overflow: "hidden",
        transition:
          "left 0.3s ease, transform 0.2s ease, box-shadow 0.2s ease, background 0.2s ease",
        "@keyframes pulse": {
          "0%, 100%": {
            opacity: 0.6,
            transform: "scale(1)",
          },
          "50%": {
            opacity: 1,
            transform: "scale(1.1)",
          },
        },
        ...(isDragOver && {
          background: "rgba(16, 185, 129, 0.1)",
          borderRight: "2px solid #10b981",
        }),
      }}
    >
      {/* Expand Icon - Always visible on the edge when collapsed */}
      {!open && (
        <Box
          sx={{
            position: "absolute",
            right: 0,
            top: 0,
            bottom: 0,
            width: 40,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            pointerEvents: "none", // Let parent handle the click
            zIndex: 1201,
          }}
        >
          <Box
            sx={{
              width: "100%",
              height: "100%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background:
                "linear-gradient(90deg, rgba(15, 23, 42, 0) 0%, rgba(15, 23, 42, 0.6) 50%, rgba(15, 23, 42, 0.8) 100%)",
              borderRadius: "0 12px 12px 0",
            }}
          >
            <ChevronRight
              className="expand-icon"
              sx={{
                color: "#ffffff",
                fontSize: 32,
                fontWeight: "bold",
                opacity: 0.9,
                transition: "all 0.2s ease",
                filter: "drop-shadow(0 0 4px rgba(255, 255, 255, 0.3))",
              }}
            />
          </Box>
        </Box>
      )}

      {/* Header Bar */}
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          px: 2,
          py: 1,
          minHeight: 48,
          borderBottom: "1px solid rgba(255, 255, 255, 0.1)",
          background: "rgba(255, 255, 255, 0.05)",
          visibility: open ? "visible" : "hidden", // Hide when collapsed but maintain layout
        }}
      >
        {open && (
          <>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <Folder color="primary" />
              <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                Files
              </Typography>
              <Chip
                label={`${filteredFiles.length} items`}
                size="small"
                variant="outlined"
                sx={{
                  background: "rgba(52, 168, 83, 0.1)",
                  border: "1px solid rgba(52, 168, 83, 0.3)",
                  color: "#34a853",
                }}
              />
            </Box>
            <IconButton
              size="small"
              onClick={() => onToggle(false)}
              sx={{
                color: "rgba(255, 255, 255, 0.7)",
                "&:hover": { color: "white" },
              }}
            >
              <ChevronLeft />
            </IconButton>
          </>
        )}
      </Box>

      {open && (
        <Box
          sx={{
            p: 1.5,
            flex: 1,
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
          }}
        >
          <TextField
            fullWidth
            size="small"
            placeholder="Search files..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Search sx={{ fontSize: 18 }} />
                </InputAdornment>
              ),
            }}
            sx={{
              mb: 1.5,
              "& .MuiOutlinedInput-root": {
                backgroundColor: "rgba(0, 0, 0, 0.2)",
                height: 36,
                "& fieldset": {
                  borderColor: "rgba(255, 255, 255, 0.2)",
                },
                "&:hover fieldset": {
                  borderColor: "rgba(255, 255, 255, 0.3)",
                },
                "&.Mui-focused fieldset": {
                  borderColor: "#10b981",
                },
              },
              "& .MuiInputBase-input": {
                color: "#ffffff",
                fontSize: "0.875rem",
              },
            }}
          />

          {/* Drag & Drop Zone */}
          {isDragOver && (
            <Paper
              sx={{
                p: 3,
                mb: 2,
                textAlign: "center",
                border: "2px dashed #10b981",
                bgcolor: "rgba(16, 185, 129, 0.1)",
                backgroundColor: "rgba(16, 185, 129, 0.1)",
              }}
            >
              <CloudUpload sx={{ fontSize: 48, color: "#10b981", mb: 1 }} />
              <Typography variant="h6" sx={{ color: "#10b981" }}>
                Drop files here to load
              </Typography>
              <Typography
                variant="caption"
                sx={{ color: "rgba(255, 255, 255, 0.7)" }}
              >
                Supports: GeoJSON, CSV, KML, KMZ, Shapefile
              </Typography>
            </Paper>
          )}

          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              mb: 1,
              py: 0.5,
            }}
          >
            <Typography
              variant="caption"
              sx={{ color: "rgba(255, 255, 255, 0.6)", fontSize: "0.75rem" }}
            >
              {filteredFiles.length} files
              {(selectedFiles || []).length > 0 &&
                ` • ${(selectedFiles || []).length} selected`}
            </Typography>
            <Box sx={{ display: "flex", gap: 0.5 }}>
              <Tooltip title="Refresh">
                <IconButton
                  size="small"
                  onClick={() => window.location.reload()}
                  sx={{
                    color: "rgba(255, 255, 255, 0.7)",
                    "&:hover": { color: "white" },
                    p: 0.5,
                  }}
                >
                  <Refresh sx={{ fontSize: 16 }} />
                </IconButton>
              </Tooltip>
              <Tooltip title="Add Files">
                <IconButton
                  size="small"
                  onClick={() => setIndexingDialogOpen(true)}
                  sx={{
                    color: "rgba(255, 255, 255, 0.7)",
                    "&:hover": { color: "#10b981" },
                    p: 0.5,
                  }}
                >
                  <Add sx={{ fontSize: 16 }} />
                </IconButton>
              </Tooltip>
            </Box>
          </Box>

          {/* File List */}
          <Box sx={{ flex: 1, overflow: "auto" }}>
            <List dense>
              {filteredFiles.map((file) => (
                <ListItem
                  key={file.id}
                  onClick={() => handleFileSelect(file)}
                  onContextMenu={(e) => handleContextMenu(e, file)}
                  sx={{
                    py: 0.5,
                    px: 1.5,
                    cursor: "pointer",
                    minHeight: 32,
                    borderRadius: 1,
                    mb: 0.5,
                    backgroundColor: (selectedFiles || []).some(
                      (f) => f.id === file.id
                    )
                      ? "rgba(16, 185, 129, 0.2)"
                      : "transparent",
                    color: "inherit",
                    "&:hover": {
                      backgroundColor: (selectedFiles || []).some(
                        (f) => f.id === file.id
                      )
                        ? "rgba(16, 185, 129, 0.3)"
                        : "rgba(16, 185, 129, 0.08)",
                    },
                  }}
                >
                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      width: "100%",
                      overflow: "hidden",
                    }}
                  >
                    <Box
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        gap: 1,
                        flex: 1,
                        overflow: "hidden",
                      }}
                    >
                      <Typography
                        variant="caption"
                        sx={{
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                          fontWeight: 500,
                          flex: 1,
                          fontSize: "0.8rem",
                        }}
                      >
                        {file.file_name}
                      </Typography>
                      <Chip
                        label={file.file_type}
                        size="small"
                        sx={{
                          height: 16,
                          fontSize: "0.6rem",
                          fontWeight: 600,
                          bgcolor: getFileTypeColor(file.file_type),
                          color: "white",
                          flexShrink: 0,
                        }}
                      />
                      <Typography
                        variant="caption"
                        color="text.secondary"
                        sx={{
                          flexShrink: 0,
                          whiteSpace: "nowrap",
                          fontSize: "0.65rem",
                        }}
                      >
                        {formatFileSize(file.file_size)}
                        {file.num_features > 0 && ` • ${file.num_features}`}
                      </Typography>
                    </Box>
                    <IconButton
                      size="small"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleContextMenu(e, file);
                      }}
                      sx={{
                        ml: 1,
                        flexShrink: 0,
                        background: "rgba(255, 255, 255, 0.05)",
                        backdropFilter: "blur(10px)",
                      }}
                    >
                      <MoreVert fontSize="small" />
                    </IconButton>
                  </Box>
                </ListItem>
              ))}
            </List>

            {filteredFiles.length === 0 && (
              <Box
                sx={{
                  p: 4,
                  textAlign: "center",
                  color: "text.secondary",
                }}
              >
                <Typography variant="body2">
                  No geospatial files found
                </Typography>
                <Typography variant="caption">
                  {searchQuery
                    ? "Try adjusting your search query"
                    : "Add some geospatial files to get started"}
                </Typography>
              </Box>
            )}
          </Box>

          {/* Context Menu */}
          <Menu
            open={contextMenu !== null}
            onClose={handleContextMenuClose}
            anchorReference="anchorPosition"
            anchorPosition={
              contextMenu !== null
                ? { top: contextMenu.mouseY, left: contextMenu.mouseX }
                : undefined
            }
            PaperProps={{
              sx: {
                bgcolor: "rgba(30, 30, 30, 0.9)",
                backdropFilter: "blur(10px)",
                border: "1px solid rgba(255, 255, 255, 0.1)",
              },
            }}
          >
            <MenuItem
              onClick={() => {
                if (contextMenu?.file) {
                  handleLoadLayer(contextMenu.file);
                }
                handleContextMenuClose();
              }}
            >
              <Visibility sx={{ mr: 1 }} />
              Load as Layer
            </MenuItem>
            <MenuItem
              onClick={() => {
                if (contextMenu?.file) {
                  handleShowProperties(contextMenu.file);
                }
              }}
            >
              <Info sx={{ mr: 1 }} />
              Properties
            </MenuItem>
          </Menu>

          {/* Properties Dialog */}
          <Dialog
            open={propertiesDialog.open}
            onClose={() => setPropertiesDialog({ open: false, file: null })}
            maxWidth="sm"
            fullWidth
            PaperProps={{
              sx: {
                bgcolor: "rgba(30, 30, 30, 0.9)",
                backdropFilter: "blur(10px)",
                border: "1px solid rgba(255, 255, 255, 0.1)",
              },
            }}
          >
            <DialogTitle>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <Map />
                File Properties
              </Box>
            </DialogTitle>
            <DialogContent>
              {propertiesDialog.file && (
                <Paper sx={{ p: 2, bgcolor: "rgba(255, 255, 255, 0.05)" }}>
                  <Typography variant="h6" gutterBottom>
                    {propertiesDialog.file.file_name}
                  </Typography>
                  <Box
                    sx={{
                      display: "grid",
                      gridTemplateColumns: "1fr 1fr",
                      gap: 2,
                      mb: 2,
                    }}
                  >
                    <Box>
                      <Typography variant="caption" color="text.secondary">
                        Type
                      </Typography>
                      <Typography variant="body2">
                        {propertiesDialog.file.file_type}
                      </Typography>
                    </Box>
                    <Box>
                      <Typography variant="caption" color="text.secondary">
                        Size
                      </Typography>
                      <Typography variant="body2">
                        {formatFileSize(propertiesDialog.file.file_size)}
                      </Typography>
                    </Box>
                    <Box>
                      <Typography variant="caption" color="text.secondary">
                        CRS
                      </Typography>
                      <Typography variant="body2">
                        {propertiesDialog.file.crs}
                      </Typography>
                    </Box>
                    <Box>
                      <Typography variant="caption" color="text.secondary">
                        Features
                      </Typography>
                      <Typography variant="body2">
                        {propertiesDialog.file.num_features}
                      </Typography>
                    </Box>
                    <Box>
                      <Typography variant="caption" color="text.secondary">
                        Created
                      </Typography>
                      <Typography variant="body2">
                        {new Date(
                          propertiesDialog.file.created_at * 1000
                        ).toLocaleDateString()}
                      </Typography>
                    </Box>
                    <Box>
                      <Typography variant="caption" color="text.secondary">
                        Modified
                      </Typography>
                      <Typography variant="body2">
                        {new Date(
                          propertiesDialog.file.modified_at * 1000
                        ).toLocaleDateString()}
                      </Typography>
                    </Box>
                  </Box>
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="caption" color="text.secondary">
                      Path
                    </Typography>
                    <Typography variant="body2" sx={{ wordBreak: "break-all" }}>
                      {propertiesDialog.file.file_path}
                    </Typography>
                  </Box>
                  {propertiesDialog.file.bbox && (
                    <Box>
                      <Typography variant="caption" color="text.secondary">
                        Bounds
                      </Typography>
                      <Typography
                        variant="body2"
                        sx={{ fontFamily: "monospace" }}
                      >
                        {propertiesDialog.file.bbox}
                      </Typography>
                    </Box>
                  )}
                </Paper>
              )}
            </DialogContent>
            <DialogActions
              sx={{
                justifyContent: "center",
                padding: 2,
                gap: 1,
              }}
            >
              <Button
                onClick={() => setPropertiesDialog({ open: false, file: null })}
              >
                Close
              </Button>
              {propertiesDialog.file && (
                <Button
                  variant="contained"
                  onClick={() => {
                    handleLoadLayer(propertiesDialog.file!);
                    setPropertiesDialog({ open: false, file: null });
                  }}
                >
                  Load as Layer
                </Button>
              )}
            </DialogActions>
          </Dialog>

          {/* Indexing Dialog */}
          <IndexingDialog
            open={indexingDialogOpen}
            onClose={() => setIndexingDialogOpen(false)}
          />
        </Box>
      )}

      {/* Resize Handle */}
      {open && (
        <Box
          ref={resizeRef}
          onMouseDown={handleMouseDown}
          sx={{
            position: "absolute",
            top: 0,
            right: 0,
            width: 4,
            height: "100%",
            cursor: "ew-resize",
            bgcolor: "transparent",
            "&:hover": {
              bgcolor: "#10b981",
              opacity: 0.5,
            },
            zIndex: 1000,
          }}
        />
      )}
    </Paper>
  );
};

export default FilePanel;
