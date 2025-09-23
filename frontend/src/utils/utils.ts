import { GeoFileIndex } from '../types/interfaces';

export const MAP_STYLES = [
  {
    name: 'Dark',
    url: 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json',
  },
  {
    name: 'Light',
    url: 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json',
  },
  {
    name: 'Streets',
    url: 'https://api.maptiler.com/maps/streets/style.json',
  },
  {
    name: 'Satellite',
    url: 'https://api.maptiler.com/maps/satellite/style.json',
  },
];

export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

export const formatDate = (timestamp: number): string => {
  return new Date(timestamp * 1000).toLocaleDateString();
};

export const getFileTypeColor = (fileType: string): string => {
  const colors: { [key: string]: string } = {
    'vector': '#4caf50',
    'raster': '#ff9800',
    'point_cloud': '#2196f3',
    'database': '#9c27b0',
    'shapefile': '#4caf50',
    'geotiff': '#ff9800',
    'kml': '#9c27b0',
    'gpx': '#f44336',
    'las': '#2196f3',
    'csv': '#795548',
  };
  return colors[fileType.toLowerCase()] || '#757575';
};

export const generateRandomColor = (): [number, number, number] => {
  return [
    Math.floor(Math.random() * 255),
    Math.floor(Math.random() * 255),
    Math.floor(Math.random() * 255),
  ];
};

export const parseBoundingBox = (bboxString: string): number[] | null => {
  try {
    return JSON.parse(bboxString);
  } catch {
    return null;
  }
};

export const createLayerFromFile = (file: GeoFileIndex): any => {
  return {
    id: `layer_${file.id}_${Date.now()}`,
    data: {
      type: 'FeatureCollection',
      features: [],
    },
    file_name: file.file_name,
    file_path: file.file_path,
    color: generateRandomColor(),
    type: file.file_type,
    labelField: '',
    showLabels: false,
  };
};

// Function to list indexed files using Wails backend
export const listIndexedFiles = async (): Promise<GeoFileIndex[]> => {
  try {
    // Import Wails runtime functions dynamically to avoid build issues
    const { ListIndexedFiles } = await import('../../wailsjs/go/main/App');
    return await ListIndexedFiles();
  } catch (error) {
    console.error('Error loading indexed files:', error);

    // Fallback to mock data if Wails is not available (e.g., during development)
    return [
      {
        id: 1,
        file_name: 'counties.shp',
        layer_name: 'US Counties',
        file_path: '/data/counties.shp',
        file_extension: '.shp',
        file_size: 2048576,
        created_at: Date.now() / 1000,
        file_type: 'vector',
        crs: 'EPSG:4326',
        bbox: '[-180, -90, 180, 90]',
        metadata: '{}',
        modified_at: Date.now() / 1000,
        num_bands: 0,
        num_features: 3142,
        resolution: 0,
        bbox_geom: '',
        centroid_geom: '',
      },
      {
        id: 2,
        file_name: 'elevation.tif',
        layer_name: 'Elevation Data',
        file_path: '/data/elevation.tif',
        file_extension: '.tif',
        file_size: 10485760,
        created_at: Date.now() / 1000,
        file_type: 'raster',
        crs: 'EPSG:3857',
        bbox: '[-180, -90, 180, 90]',
        metadata: '{}',
        modified_at: Date.now() / 1000,
        num_bands: 1,
        num_features: 0,
        resolution: 30,
        bbox_geom: '',
        centroid_geom: '',
      },
      {
        id: 3,
        file_name: 'points.las',
        layer_name: 'LiDAR Points',
        file_path: '/data/points.las',
        file_extension: '.las',
        file_size: 52428800,
        created_at: Date.now() / 1000,
        file_type: 'point_cloud',
        crs: 'EPSG:4326',
        bbox: '[-105.5, 40.5, -105.3, 40.9]',
        metadata: '{}',
        modified_at: Date.now() / 1000,
        num_bands: 0,
        num_features: 1000000,
        resolution: 0,
        bbox_geom: '',
        centroid_geom: '',
      },
    ];
  }
};

// Function to get home directory using Wails backend
export const getHomeDirectory = async (): Promise<string> => {
  try {
    const { GetHomeDirectory } = await import('../../wailsjs/go/main/App');
    return await GetHomeDirectory();
  } catch (error) {
    console.error('Error getting home directory:', error);
    return '/';
  }
};

// Function to list directory contents using Wails backend
export const listDirectory = async (dirPath: string): Promise<any[]> => {
  try {
    const { ListDirectory } = await import('../../wailsjs/go/main/App');
    return await ListDirectory(dirPath);
  } catch (error) {
    console.error('Error listing directory:', error);
    return [];
  }
};

// Function to create an index using Wails backend
export const createIndex = async (path: string, includeImages: boolean, includeCSV: boolean): Promise<void> => {
  try {
    const { CreateIndex } = await import('../../wailsjs/go/main/App');
    return await CreateIndex(path, includeImages, includeCSV);
  } catch (error) {
    console.error('Error creating index:', error);
    throw error;
  }
};

// Function to create index progress using Wails backend
export const createIndexProgress = async (): Promise<number> => {
  try {
    const { CreateIndexProgress } = await import('../../wailsjs/go/main/App');
    return await CreateIndexProgress();
  } catch (error) {
    console.error('Error creating index progress:', error);
    throw error;
  }
};

// Function to get index progress using Wails backend
export const getIndexProgress = async (progressId: number): Promise<any> => {
  try {
    const { GetIndexProgress } = await import('../../wailsjs/go/main/App');
    return await GetIndexProgress(progressId);
  } catch (error) {
    console.error('Error getting index progress:', error);
    throw error;
  }
};