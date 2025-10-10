import { FeatureCollection } from "geojson";

/**
 * Calculate bounds from GeoJSON data
 */
export function calculateBoundsFromGeojson(
  geojsonData: FeatureCollection
): {
  minLng: number;
  minLat: number;
  maxLng: number;
  maxLat: number;
} | null {
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

  const processCoordinates = (coords: any): void => {
    if (Array.isArray(coords) && coords.length > 0) {
      if (typeof coords[0] === "number") {
        // This is a coordinate pair [lng, lat]
        const [lng, lat] = coords;
        if (
          !isNaN(lng) &&
          !isNaN(lat) &&
          lng >= -180 &&
          lng <= 180 &&
          lat >= -90 &&
          lat <= 90
        ) {
          minLng = Math.min(minLng, lng);
          maxLng = Math.max(maxLng, lng);
          minLat = Math.min(minLat, lat);
          maxLat = Math.max(maxLat, lat);
        }
      } else {
        // This is an array of coordinates or arrays
        coords.forEach(processCoordinates);
      }
    }
  };

  geojsonData.features.forEach((feature: any) => {
    if (feature.geometry && feature.geometry.coordinates) {
      processCoordinates(feature.geometry.coordinates);
    }
  });

  if (minLng === Infinity) return null;

  // Add some padding
  const lngPadding = Math.min((maxLng - minLng) * 0.1, 10);
  const latPadding = Math.min((maxLat - minLat) * 0.1, 10);

  return {
    minLng: Math.max(minLng - lngPadding, -180),
    minLat: Math.max(minLat - latPadding, -90),
    maxLng: Math.min(maxLng + lngPadding, 180),
    maxLat: Math.min(maxLat + latPadding, 90),
  };
}

/**
 * Calculate zoom target from bounds
 */
export function calculateZoomTarget(bounds: {
  minLng: number;
  minLat: number;
  maxLng: number;
  maxLat: number;
}): {
  longitude: number;
  latitude: number;
  zoom: number;
  pitch: number;
  bearing: number;
} {
  const centerLng = (bounds.minLng + bounds.maxLng) / 2;
  const centerLat = (bounds.minLat + bounds.maxLat) / 2;

  // Calculate zoom level based on bounds
  const lngDiff = bounds.maxLng - bounds.minLng;
  const latDiff = bounds.maxLat - bounds.minLat;
  const maxDiff = Math.max(lngDiff, latDiff);

  let zoom = 10;
  if (maxDiff < 0.01) zoom = 16;
  else if (maxDiff < 0.1) zoom = 13;
  else if (maxDiff < 1) zoom = 10;
  else if (maxDiff < 10) zoom = 7;
  else if (maxDiff < 50) zoom = 5;
  else zoom = 3;

  // Clamp zoom between reasonable values
  zoom = Math.min(Math.max(zoom, 0), 18);

  return {
    longitude: centerLng,
    latitude: centerLat,
    zoom: zoom,
    pitch: 0,
    bearing: 0,
  };
}

/**
 * Check if a feature is within bounds
 */
export function checkFeatureInBounds(
  feature: any,
  minLng: number,
  minLat: number,
  maxLng: number,
  maxLat: number
): boolean {
  const coords = feature.geometry.coordinates;
  const type = feature.geometry.type;

  const isPointInBounds = (coord: number[]): boolean => {
    const [lng, lat] = coord;
    return lng >= minLng && lng <= maxLng && lat >= minLat && lat <= maxLat;
  };

  const checkCoords = (coordinates: any): boolean => {
    if (type === "Point") {
      return isPointInBounds(coordinates);
    } else if (type === "LineString") {
      return coordinates.some((coord: number[]) => isPointInBounds(coord));
    } else if (type === "Polygon") {
      return coordinates[0].some((coord: number[]) => isPointInBounds(coord));
    } else if (type === "MultiPoint") {
      return coordinates.some((coord: number[]) => isPointInBounds(coord));
    } else if (type === "MultiLineString") {
      return coordinates.some((line: number[][]) =>
        line.some((coord: number[]) => isPointInBounds(coord))
      );
    } else if (type === "MultiPolygon") {
      return coordinates.some((polygon: number[][][]) =>
        polygon[0].some((coord: number[]) => isPointInBounds(coord))
      );
    }
    return false;
  };

  return checkCoords(coords);
}

/**
 * Calculate distance between two geographic coordinates using Haversine formula
 */
export function calculateDistance(
  lon1: number,
  lat1: number,
  lon2: number,
  lat2: number
): number {
  const R = 6371000; // Earth's radius in meters
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c; // Distance in meters
}
