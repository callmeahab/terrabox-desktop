import { BBox, FeatureCollection } from "geojson";

export interface FileInfo {
  name: string;
  path: string;
  is_dir: boolean;
  size: number;
  created: number;
  modified: number;
  permissions: string;
}

export interface MediaMetadata {
  roll_pitch_yaw: RollPitchYaw;
  coordinates: Coordinates;
  dates: Dates;
  image_orientation: number;
  format: string;
  raw: string;
}

export interface RollPitchYaw {
  roll?: number;
  pitch?: number;
  yaw?: number;
}

export interface Coordinates {
  longitude?: number;
  latitude?: number;
  altitude?: number;
}

export interface Dates {
  created_at?: number;
  updated_at?: number;
}

export interface GeoFileIndex {
  file_name: string;
  layer_name: string;
  file_path: string;
  file_extension: string;
  file_size: number;
  created_at: number;
  file_type: string;
  crs: string;
  bbox: string;
  id: number;
  metadata: string;
  modified_at: number;
  num_bands: number;
  num_features: number;
  resolution: number;
  bbox_geom: string;
  centroid_geom: string;
  centroid_geom_parsed?: string;
  bbox_geom_parsed?: string;
}

export interface IVectorLayer {
  id: string;
  data: FeatureCollection;
  file_name: string;
  file_path: string;
  color: number[];
  type: string;
  labelField: string;
  showLabels?: boolean;
}

export interface IRasterLayer {
  id: string;
  url: string;
  file_path: string;
  file_name: string;
  cog_path: string;
  bounds?: BBox;
}