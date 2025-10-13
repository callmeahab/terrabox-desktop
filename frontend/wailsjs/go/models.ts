export namespace main {
	
	export class DuckDBTableInfo {
	    table_name: string;
	    file_name: string;
	    file_path: string;
	    file_type: string;
	    loaded_at: string;
	    row_count: number;
	    geom_type: string;
	    srid: number;
	
	    static createFrom(source: any = {}) {
	        return new DuckDBTableInfo(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.table_name = source["table_name"];
	        this.file_name = source["file_name"];
	        this.file_path = source["file_path"];
	        this.file_type = source["file_type"];
	        this.loaded_at = source["loaded_at"];
	        this.row_count = source["row_count"];
	        this.geom_type = source["geom_type"];
	        this.srid = source["srid"];
	    }
	}
	export class GeoFileIndex {
	    id: number;
	    file_name: string;
	    layer_name: string;
	    file_path: string;
	    file_extension: string;
	    file_size: number;
	    created_at: number;
	    file_type: string;
	    crs: string;
	    bbox: string;
	    metadata: string;
	    modified_at: number;
	    num_bands: number;
	    num_features: number;
	    resolution: number;
	    bbox_geom: string;
	    centroid_geom: string;
	
	    static createFrom(source: any = {}) {
	        return new GeoFileIndex(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.id = source["id"];
	        this.file_name = source["file_name"];
	        this.layer_name = source["layer_name"];
	        this.file_path = source["file_path"];
	        this.file_extension = source["file_extension"];
	        this.file_size = source["file_size"];
	        this.created_at = source["created_at"];
	        this.file_type = source["file_type"];
	        this.crs = source["crs"];
	        this.bbox = source["bbox"];
	        this.metadata = source["metadata"];
	        this.modified_at = source["modified_at"];
	        this.num_bands = source["num_bands"];
	        this.num_features = source["num_features"];
	        this.resolution = source["resolution"];
	        this.bbox_geom = source["bbox_geom"];
	        this.centroid_geom = source["centroid_geom"];
	    }
	}
	export class IndexProgress {
	    id: number;
	    start_time: string;
	    end_time: string;
	    total_files: number;
	    processed_files: number;
	    status: string;
	
	    static createFrom(source: any = {}) {
	        return new IndexProgress(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.id = source["id"];
	        this.start_time = source["start_time"];
	        this.end_time = source["end_time"];
	        this.total_files = source["total_files"];
	        this.processed_files = source["processed_files"];
	        this.status = source["status"];
	    }
	}
	export class OverpassResponse {
	    success: boolean;
	    data?: Record<string, any>;
	    error?: string;
	    metadata?: Record<string, any>;
	
	    static createFrom(source: any = {}) {
	        return new OverpassResponse(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.success = source["success"];
	        this.data = source["data"];
	        this.error = source["error"];
	        this.metadata = source["metadata"];
	    }
	}

}

