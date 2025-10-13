import * as turf from "@turf/turf";
import { OverpassTemplate } from "./types";

export const calculateBounds = (geojsonData: any) => {
  if (!geojsonData?.features || geojsonData.features.length === 0)
    return null;

  let minLng = Infinity,
    maxLng = -Infinity,
    minLat = Infinity,
    maxLat = -Infinity;

  geojsonData.features.forEach((feature: any) => {
    if (feature.geometry) {
      const processCoordinates = (coords: any) => {
        if (typeof coords[0] === "number") {
          const [lng, lat] = coords;
          minLng = Math.min(minLng, lng);
          maxLng = Math.max(maxLng, lng);
          minLat = Math.min(minLat, lat);
          maxLat = Math.max(maxLat, lat);
        } else {
          coords.forEach((coord: any) => processCoordinates(coord));
        }
      };

      if (feature.geometry.type === "Point") {
        processCoordinates(feature.geometry.coordinates);
      } else if (feature.geometry.type === "LineString") {
        feature.geometry.coordinates.forEach((coord: any) =>
          processCoordinates(coord)
        );
      } else if (feature.geometry.type === "Polygon") {
        feature.geometry.coordinates.forEach((ring: any) => {
          ring.forEach((coord: any) => processCoordinates(coord));
        });
      } else if (feature.geometry.type === "MultiPolygon") {
        feature.geometry.coordinates.forEach((polygon: any) => {
          polygon.forEach((ring: any) => {
            ring.forEach((coord: any) => processCoordinates(coord));
          });
        });
      }
    }
  });

  if (minLng === Infinity) return null;
  return { minLng, maxLng, minLat, maxLat };
};

export const calculateZoomLevel = (bounds: {
  minLng: number;
  maxLng: number;
  minLat: number;
  maxLat: number;
}) => {
  return Math.max(
    Math.log2(360 / Math.abs(bounds.maxLng - bounds.minLng)) - 1,
    Math.log2(180 / Math.abs(bounds.maxLat - bounds.minLat)) - 1
  );
};

export const getBboxString = (
  viewState: { longitude: number; latitude: number },
  drawnBounds?: [number, number, number, number] | null
): string => {
  if (drawnBounds) {
    // Use custom drawn bounds: [west, south, east, north] -> (south, west, north, east)
    return `${drawnBounds[1]},${drawnBounds[0]},${drawnBounds[3]},${drawnBounds[2]}`;
  } else {
    // Generate bbox from current view
    const center = turf.point([viewState.longitude, viewState.latitude]);
    const radius = 10;
    const circle = turf.circle(center, radius, { units: "miles" });
    const bboxArray = turf.bbox(circle);
    return `${bboxArray[1]},${bboxArray[0]},${bboxArray[3]},${bboxArray[2]}`;
  }
};

export const getBboxArray = (
  viewState: { longitude: number; latitude: number },
  drawnBounds?: [number, number, number, number] | null
): number[] => {
  if (drawnBounds) {
    return drawnBounds;
  } else {
    const center = turf.point([viewState.longitude, viewState.latitude]);
    const radius = 10;
    const circle = turf.circle(center, radius, { units: "miles" });
    return turf.bbox(circle);
  }
};

export const insertTextAtCursor = (
  textarea: HTMLTextAreaElement,
  currentText: string,
  textToInsert: string
): { newText: string; newCursorPosition: number } => {
  const start = textarea.selectionStart ?? currentText.length;
  const end = textarea.selectionEnd ?? currentText.length;
  const newText =
    currentText.substring(0, start) + textToInsert + currentText.substring(end);
  const newCursorPosition = start + textToInsert.length;

  return { newText, newCursorPosition };
};

export const applyTemplateQuery = (
  template: OverpassTemplate,
  viewState: { longitude: number; latitude: number },
  drawnBounds?: [number, number, number, number] | null
): string => {
  const bbox = getBboxString(viewState, drawnBounds);
  return template.query.replace(/{{bbox}}/g, bbox);
};

export const groupTemplatesByCategory = (
  templates: OverpassTemplate[]
): Record<string, OverpassTemplate[]> => {
  return templates.reduce((groups, template) => {
    const category = template.category || "Other";
    if (!groups[category]) {
      groups[category] = [];
    }
    groups[category].push(template);
    return groups;
  }, {} as Record<string, OverpassTemplate[]>);
};

export const updateBboxInQuery = (
  query: string,
  drawnBounds: [number, number, number, number]
): string => {
  // Convert drawnBounds [west, south, east, north] to Overpass format (south, west, north, east)
  const bbox = `${drawnBounds[1]},${drawnBounds[0]},${drawnBounds[3]},${drawnBounds[2]}`;

  // Look for existing bbox patterns in the query and replace them
  // Pattern matches coordinates in parentheses like (51.7,-0.1,51.8,0.1)
  const bboxPattern = /\([\d\.\-,\s]+\)/g;
  const matches = query.match(bboxPattern);

  if (matches && matches.length > 0) {
    // Replace all bbox coordinate patterns with the new bbox
    return query.replace(bboxPattern, `(${bbox})`);
  }

  return query;
};
