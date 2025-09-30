package main

import (
	"context"
	"database/sql"
	"encoding/base64"
	"encoding/json"
	"encoding/xml"
	"fmt"
	"io"
	"net/http"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"sync"
	"time"

	"github.com/paulmach/osm"
	"github.com/paulmach/osm/osmgeojson"
	"github.com/sashabaranov/go-openai"
	"github.com/wailsapp/wails/v2/pkg/runtime"
	_ "github.com/mattn/go-sqlite3"
)

// App struct
type App struct {
	ctx context.Context
	db  *sql.DB
	mu  sync.RWMutex
}

// NewApp creates a new App application struct
func NewApp() *App {
	return &App{}
}

// startup is called when the app starts. The context is saved
// so we can call the runtime methods
func (a *App) startup(ctx context.Context) {
	a.ctx = ctx
	a.initDatabase()
}

// initDatabase initializes the SQLite database
func (a *App) initDatabase() error {
	homeDir, err := os.UserHomeDir()
	if err != nil {
		return err
	}

	dbDir := filepath.Join(homeDir, ".terrabox")
	if err := os.MkdirAll(dbDir, 0755); err != nil {
		return err
	}

	dbPath := filepath.Join(dbDir, "terrabox.db")
	db, err := sql.Open("sqlite3", dbPath+"?_foreign_keys=on")
	if err != nil {
		return err
	}

	a.db = db

	// Create tables
	createTables := `
	CREATE TABLE IF NOT EXISTS geo_file_index (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		file_path TEXT NOT NULL,
		file_name TEXT NOT NULL,
		file_extension TEXT NOT NULL,
		file_size INTEGER NOT NULL,
		created_at INTEGER,
		modified_at INTEGER,
		file_type TEXT NOT NULL,
		layer_name TEXT NOT NULL,
		crs TEXT,
		bbox TEXT,
		num_features INTEGER,
		num_bands INTEGER,
		resolution REAL,
		metadata TEXT,
		bbox_geom TEXT,
		centroid_geom TEXT,
		UNIQUE(file_path, layer_name)
	);

	CREATE TABLE IF NOT EXISTS index_progress (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		start_time TEXT NOT NULL,
		end_time TEXT,
		total_files INTEGER DEFAULT 0,
		processed_files INTEGER DEFAULT 0,
		status TEXT NOT NULL
	);
	`

	_, err = db.Exec(createTables)
	return err
}

// Greet returns a greeting for the given name
func (a *App) Greet(name string) string {
	return fmt.Sprintf("Hello %s, It's show time!", name)
}

// GeoFileIndex represents a geospatial file record
type GeoFileIndex struct {
	ID           int     `json:"id"`
	FileName     string  `json:"file_name"`
	LayerName    string  `json:"layer_name"`
	FilePath     string  `json:"file_path"`
	FileExt      string  `json:"file_extension"`
	FileSize     int64   `json:"file_size"`
	CreatedAt    int64   `json:"created_at"`
	FileType     string  `json:"file_type"`
	CRS          string  `json:"crs"`
	BBox         string  `json:"bbox"`
	Metadata     string  `json:"metadata"`
	ModifiedAt   int64   `json:"modified_at"`
	NumBands     int     `json:"num_bands"`
	NumFeatures  int     `json:"num_features"`
	Resolution   float64 `json:"resolution"`
	BBoxGeom     string  `json:"bbox_geom"`
	CentroidGeom string  `json:"centroid_geom"`
}

// ListIndexedFiles returns a list of indexed geospatial files
func (a *App) ListIndexedFiles() ([]GeoFileIndex, error) {
	if a.db == nil {
		return []GeoFileIndex{}, fmt.Errorf("database not initialized")
	}

	a.mu.RLock()
	defer a.mu.RUnlock()

	query := `
		SELECT id, file_name, layer_name, file_path, file_extension, file_size,
		       created_at, file_type, crs, bbox, metadata, modified_at,
		       num_bands, num_features, resolution, bbox_geom, centroid_geom
		FROM geo_file_index
		ORDER BY modified_at DESC
	`

	rows, err := a.db.Query(query)
	if err != nil {
		return []GeoFileIndex{}, err
	}
	defer rows.Close()

	var files []GeoFileIndex
	for rows.Next() {
		var file GeoFileIndex
		var createdAt, modifiedAt sql.NullInt64
		var crs, bbox, metadata, bboxGeom, centroidGeom sql.NullString
		var numBands, numFeatures sql.NullInt64
		var resolution sql.NullFloat64

		err := rows.Scan(
			&file.ID, &file.FileName, &file.LayerName, &file.FilePath,
			&file.FileExt, &file.FileSize, &createdAt, &file.FileType,
			&crs, &bbox, &metadata, &modifiedAt, &numBands, &numFeatures,
			&resolution, &bboxGeom, &centroidGeom,
		)
		if err != nil {
			continue
		}

		if createdAt.Valid {
			file.CreatedAt = createdAt.Int64
		}
		if modifiedAt.Valid {
			file.ModifiedAt = modifiedAt.Int64
		}
		if crs.Valid {
			file.CRS = crs.String
		}
		if bbox.Valid {
			file.BBox = bbox.String
		}
		if metadata.Valid {
			file.Metadata = metadata.String
		}
		if bboxGeom.Valid {
			file.BBoxGeom = bboxGeom.String
		}
		if centroidGeom.Valid {
			file.CentroidGeom = centroidGeom.String
		}
		if numBands.Valid {
			file.NumBands = int(numBands.Int64)
		}
		if numFeatures.Valid {
			file.NumFeatures = int(numFeatures.Int64)
		}
		if resolution.Valid {
			file.Resolution = resolution.Float64
		}

		files = append(files, file)
	}

	return files, nil
}

// GetFileInfo returns information about a specific file
func (a *App) GetFileInfo(filePath string) (map[string]interface{}, error) {
	info, err := os.Stat(filePath)
	if err != nil {
		return nil, err
	}

	result := map[string]interface{}{
		"name":        info.Name(),
		"path":        filePath,
		"is_dir":      info.IsDir(),
		"size":        info.Size(),
		"created":     info.ModTime().Unix(),
		"modified":    info.ModTime().Unix(),
		"permissions": info.Mode().String(),
	}

	return result, nil
}

// ListDirectory returns the contents of a directory
func (a *App) ListDirectory(dirPath string) ([]map[string]interface{}, error) {
	entries, err := os.ReadDir(dirPath)
	if err != nil {
		return nil, err
	}

	var results []map[string]interface{}
	for _, entry := range entries {
		info, err := entry.Info()
		if err != nil {
			continue
		}

		fullPath := filepath.Join(dirPath, entry.Name())
		result := map[string]interface{}{
			"name":        entry.Name(),
			"path":        fullPath,
			"is_dir":      entry.IsDir(),
			"size":        info.Size(),
			"created":     info.ModTime().Unix(),
			"modified":    info.ModTime().Unix(),
			"permissions": info.Mode().String(),
		}
		results = append(results, result)
	}

	return results, nil
}

// GetHomeDirectory returns the user's home directory
func (a *App) GetHomeDirectory() (string, error) {
	homeDir, err := os.UserHomeDir()
	if err != nil {
		return "", err
	}
	return homeDir, nil
}

// WriteFile writes content to a file
func (a *App) WriteFile(filePath string, content string) error {
	return os.WriteFile(filePath, []byte(content), 0644)
}

// ReadFile reads content from a file
func (a *App) ReadFile(filePath string) (string, error) {
	content, err := os.ReadFile(filePath)
	if err != nil {
		return "", err
	}
	return string(content), nil
}

// ReadFileAsBase64 reads a file and returns base64-encoded content for binary formats
func (a *App) ReadFileAsBase64(filePath string) (string, error) {
	content, err := os.ReadFile(filePath)
	if err != nil {
		return "", err
	}

	// Check if file is likely binary based on extension
	ext := strings.ToLower(filepath.Ext(filePath))
	isBinary := ext == ".shp" || ext == ".dbf" || ext == ".shx" || ext == ".gpkg" || ext == ".kmz"

	if isBinary {
		// Return base64 encoded for binary files
		return base64.StdEncoding.EncodeToString(content), nil
	}

	// Return as string for text files
	return string(content), nil
}

// SearchFiles searches for files with a given pattern
func (a *App) SearchFiles(pattern string, directory string) ([]string, error) {
	var matches []string

	err := filepath.Walk(directory, func(path string, info os.FileInfo, err error) error {
		if err != nil {
			return nil // Continue walking even if there's an error
		}

		matched, err := filepath.Match(pattern, info.Name())
		if err != nil {
			return nil
		}

		if matched {
			matches = append(matches, path)
		}

		return nil
	})

	return matches, err
}

// FileMetadata represents extracted file metadata
type FileMetadata struct {
	FileSize    int64               `json:"file_size"`
	CreatedAt   int64               `json:"created_at"`
	ModifiedAt  int64               `json:"modified_at"`
	FileType    string              `json:"file_type"`
	CRS         string              `json:"crs"`
	BBox        []float64           `json:"bbox"`
	NumFeatures int                 `json:"num_features"`
	NumBands    int                 `json:"num_bands"`
	Resolution  float64             `json:"resolution"`
	Metadata    map[string]interface{} `json:"metadata"`
}

// extractFileMetadata extracts metadata from a geospatial file
func (a *App) extractFileMetadata(filePath string) (*FileMetadata, error) {
	info, err := os.Stat(filePath)
	if err != nil {
		return nil, err
	}

	ext := strings.ToLower(filepath.Ext(filePath))
	fileType := a.determineFileType(ext)

	metadata := &FileMetadata{
		FileSize:   info.Size(),
		CreatedAt:  info.ModTime().Unix(),
		ModifiedAt: info.ModTime().Unix(),
		FileType:   fileType,
		CRS:        "EPSG:4326", // Default CRS
		BBox:       []float64{-180, -90, 180, 90}, // Default global bbox
		Metadata:   make(map[string]interface{}),
	}

	// Enhanced metadata extraction based on file type
	switch fileType {
	case "vector":
		if err := a.extractVectorMetadata(filePath, metadata); err != nil {
			// Log error but continue with basic metadata
			metadata.Metadata["extraction_error"] = err.Error()
		}
	case "raster":
		if err := a.extractRasterMetadata(filePath, metadata); err != nil {
			// Log error but continue with basic metadata
			metadata.Metadata["extraction_error"] = err.Error()
		}
	case "point_cloud":
		if err := a.extractPointCloudMetadata(filePath, metadata); err != nil {
			// Log error but continue with basic metadata
			metadata.Metadata["extraction_error"] = err.Error()
		}
	}

	return metadata, nil
}

// extractVectorMetadata extracts metadata from vector files
func (a *App) extractVectorMetadata(filePath string, metadata *FileMetadata) error {
	ext := strings.ToLower(filepath.Ext(filePath))

	switch ext {
	case ".geojson":
		return a.extractGeoJSONMetadata(filePath, metadata)
	case ".shp":
		return a.extractShapefileMetadata(filePath, metadata)
	case ".kml":
		return a.extractKMLMetadata(filePath, metadata)
	default:
		// For unsupported vector formats, use basic detection
		metadata.NumFeatures = 1 // Placeholder
		metadata.Metadata["format"] = "vector"
	}

	return nil
}

// extractGeoJSONMetadata extracts metadata from GeoJSON files
func (a *App) extractGeoJSONMetadata(filePath string, metadata *FileMetadata) error {
	// Read and parse GeoJSON file (simplified implementation)
	content, err := os.ReadFile(filePath)
	if err != nil {
		return err
	}

	// Basic GeoJSON parsing (in a real implementation, use a proper GeoJSON library)
	metadata.NumFeatures = strings.Count(string(content), "Feature") + strings.Count(string(content), "feature")
	metadata.Metadata["format"] = "GeoJSON"

	// Try to extract CRS if present
	if strings.Contains(string(content), "EPSG") {
		// Simple CRS extraction
		metadata.CRS = "EPSG:4326" // Default, would need proper parsing
	}

	return nil
}

// extractShapefileMetadata extracts metadata from Shapefile
func (a *App) extractShapefileMetadata(filePath string, metadata *FileMetadata) error {
	// In a real implementation, you would use a proper shapefile library
	// For now, set placeholder values
	metadata.NumFeatures = 100 // Placeholder
	metadata.Metadata["format"] = "Shapefile"
	metadata.CRS = "EPSG:4326"

	return nil
}

// extractKMLMetadata extracts metadata from KML files
func (a *App) extractKMLMetadata(filePath string, metadata *FileMetadata) error {
	// Read KML file
	content, err := os.ReadFile(filePath)
	if err != nil {
		return err
	}

	// Count placemarks (simplified)
	metadata.NumFeatures = strings.Count(string(content), "<Placemark")
	metadata.Metadata["format"] = "KML"

	return nil
}

// extractRasterMetadata extracts metadata from raster files
func (a *App) extractRasterMetadata(filePath string, metadata *FileMetadata) error {
	ext := strings.ToLower(filepath.Ext(filePath))

	switch ext {
	case ".tif", ".tiff":
		return a.extractGeoTIFFMetadata(filePath, metadata)
	default:
		// For other raster formats, use basic metadata
		metadata.NumBands = 3 // Placeholder for RGB
		metadata.Resolution = 1.0 // Placeholder
		metadata.Metadata["format"] = "raster"
	}

	return nil
}

// extractGeoTIFFMetadata extracts metadata from GeoTIFF files
func (a *App) extractGeoTIFFMetadata(filePath string, metadata *FileMetadata) error {
	// In a real implementation, you would use GDAL bindings
	// For now, set placeholder values
	metadata.NumBands = 1
	metadata.Resolution = 30.0 // Placeholder resolution in meters
	metadata.Metadata["format"] = "GeoTIFF"

	return nil
}

// extractPointCloudMetadata extracts metadata from point cloud files
func (a *App) extractPointCloudMetadata(filePath string, metadata *FileMetadata) error {
	ext := strings.ToLower(filepath.Ext(filePath))

	switch ext {
	case ".las", ".laz":
		return a.extractLASMetadata(filePath, metadata)
	default:
		metadata.NumFeatures = 1000000 // Placeholder point count
		metadata.Metadata["format"] = "point_cloud"
	}

	return nil
}

// extractLASMetadata extracts metadata from LAS files
func (a *App) extractLASMetadata(filePath string, metadata *FileMetadata) error {
	// In a real implementation, you would use a LAS library
	metadata.NumFeatures = 1000000 // Placeholder point count
	metadata.Metadata["format"] = "LAS"

	return nil
}

// CreateIndex scans a directory for geospatial files and indexes them
func (a *App) CreateIndex(path string, includeImages bool, includeCSV bool) error {
	if a.db == nil {
		return fmt.Errorf("database not initialized")
	}

	a.mu.Lock()
	defer a.mu.Unlock()

	// Clear existing index
	_, err := a.db.Exec("DELETE FROM geo_file_index")
	if err != nil {
		return err
	}

	// Define supported extensions
	extensions := []string{
		".shp", ".geojson", ".kml", ".tif", ".tiff", ".gpkg", ".gdb",
		".las", ".laz", ".ply", ".xyz", ".asc", ".geopackage",
	}

	if includeImages {
		extensions = append(extensions, ".png", ".jpg", ".jpeg", ".gif", ".bmp", ".jp2")
	}

	if includeCSV {
		extensions = append(extensions, ".csv", ".xlsx", ".xls")
	}

	// Walk through directory
	return filepath.Walk(path, func(filePath string, info os.FileInfo, err error) error {
		if err != nil {
			return nil // Continue on errors
		}

		if info.IsDir() {
			return nil
		}

		// Check if file has supported extension
		ext := strings.ToLower(filepath.Ext(filePath))
		supported := false
		for _, supportedExt := range extensions {
			if ext == supportedExt {
				supported = true
				break
			}
		}

		if !supported {
			return nil
		}

		// Extract detailed metadata
		metadata, err := a.extractFileMetadata(filePath)
		if err != nil {
			// Continue with basic metadata if extraction fails
			metadata = &FileMetadata{
				FileSize:    info.Size(),
				CreatedAt:   info.ModTime().Unix(),
				ModifiedAt:  info.ModTime().Unix(),
				FileType:    a.determineFileType(ext),
				CRS:         "EPSG:4326",
				BBox:        []float64{-180, -90, 180, 90},
				NumFeatures: 0,
				NumBands:    0,
				Resolution:  0.0,
				Metadata:    map[string]interface{}{"extraction_error": err.Error()},
			}
		}

		fileName := info.Name()

		// Convert bbox to JSON string
		bboxJSON := fmt.Sprintf("[%f,%f,%f,%f]", metadata.BBox[0], metadata.BBox[1], metadata.BBox[2], metadata.BBox[3])

		// Convert metadata to JSON string
		metadataJSON := "{}"
		if len(metadata.Metadata) > 0 {
			// Simple JSON serialization (in production, use proper JSON marshaling)
			metadataJSON = fmt.Sprintf(`{"format":"%s"}`, metadata.Metadata["format"])
		}

		// Insert into database
		query := `
			INSERT INTO geo_file_index
			(file_path, file_name, file_extension, file_size, created_at, modified_at,
			 file_type, layer_name, crs, bbox, num_features, num_bands, resolution, metadata)
			VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
		`

		_, err = a.db.Exec(query,
			filePath, fileName, ext, metadata.FileSize, metadata.CreatedAt, metadata.ModifiedAt,
			metadata.FileType, fileName, metadata.CRS, bboxJSON, metadata.NumFeatures,
			metadata.NumBands, metadata.Resolution, metadataJSON,
		)

		return err
	})
}

// determineFileType determines the file type based on extension
func (a *App) determineFileType(ext string) string {
	vectorExts := []string{".shp", ".geojson", ".kml", ".gpkg", ".gdb", ".csv"}
	rasterExts := []string{".tif", ".tiff", ".png", ".jpg", ".jpeg", ".gif", ".bmp", ".jp2"}
	pointCloudExts := []string{".las", ".laz", ".ply", ".xyz", ".asc"}

	for _, vecExt := range vectorExts {
		if ext == vecExt {
			return "vector"
		}
	}

	for _, rasExt := range rasterExts {
		if ext == rasExt {
			return "raster"
		}
	}

	for _, pcExt := range pointCloudExts {
		if ext == pcExt {
			return "point_cloud"
		}
	}

	return "other"
}

// IndexProgress represents indexing progress
type IndexProgress struct {
	ID             int    `json:"id"`
	StartTime      string `json:"start_time"`
	EndTime        string `json:"end_time"`
	TotalFiles     int    `json:"total_files"`
	ProcessedFiles int    `json:"processed_files"`
	Status         string `json:"status"`
}

// GetIndexProgress returns indexing progress for a given ID
func (a *App) GetIndexProgress(progressID int) (*IndexProgress, error) {
	if a.db == nil {
		return nil, fmt.Errorf("database not initialized")
	}

	a.mu.RLock()
	defer a.mu.RUnlock()

	query := `
		SELECT id, start_time, end_time, total_files, processed_files, status
		FROM index_progress
		WHERE id = ?
	`

	var progress IndexProgress
	var endTime sql.NullString

	err := a.db.QueryRow(query, progressID).Scan(
		&progress.ID, &progress.StartTime, &endTime,
		&progress.TotalFiles, &progress.ProcessedFiles, &progress.Status,
	)

	if err != nil {
		return nil, err
	}

	if endTime.Valid {
		progress.EndTime = endTime.String
	}

	return &progress, nil
}

// CreateIndexProgress creates a new indexing progress record
func (a *App) CreateIndexProgress() (int, error) {
	if a.db == nil {
		return 0, fmt.Errorf("database not initialized")
	}

	a.mu.Lock()
	defer a.mu.Unlock()

	startTime := time.Now().Format(time.RFC3339)
	query := `
		INSERT INTO index_progress (start_time, status, total_files, processed_files)
		VALUES (?, ?, 0, 0)
	`

	result, err := a.db.Exec(query, startTime, "in_progress")
	if err != nil {
		return 0, err
	}

	id, err := result.LastInsertId()
	return int(id), err
}

// SelectDirectory opens a directory selection dialog
func (a *App) SelectDirectory() (string, error) {
	if a.ctx == nil {
		// Fallback if context is not available
		return os.UserHomeDir()
	}

	// Use Wails runtime to open directory dialog
	options := runtime.OpenDialogOptions{
		Title: "Select Directory to Index",
	}

	selectedPath, err := runtime.OpenDirectoryDialog(a.ctx, options)
	if err != nil {
		// If dialog fails, return home directory as fallback
		return os.UserHomeDir()
	}

	// If user cancelled, return home directory
	if selectedPath == "" {
		return os.UserHomeDir()
	}

	return selectedPath, nil
}

// LoadGeospatialFile loads a geospatial file and converts it to GeoJSON
func (a *App) LoadGeospatialFile(filePath string) (map[string]interface{}, error) {
	// Check if file exists
	if _, err := os.Stat(filePath); os.IsNotExist(err) {
		return nil, fmt.Errorf("file does not exist: %s", filePath)
	}

	// Try to use ogr2ogr to convert to GeoJSON
	cmd := exec.Command("ogr2ogr", "-f", "GeoJSON", "/dev/stdout", filePath)
	output, err := cmd.Output()
	if err != nil {
		// If ogr2ogr fails, try ogrinfo to get basic info
		return a.loadFileWithOgrInfo(filePath)
	}

	// Parse the GeoJSON output
	var geojson map[string]interface{}
	if err := json.Unmarshal(output, &geojson); err != nil {
		return nil, fmt.Errorf("failed to parse GeoJSON: %v", err)
	}

	return geojson, nil
}

// loadFileWithOgrInfo attempts to load file info using ogrinfo as fallback
func (a *App) loadFileWithOgrInfo(filePath string) (map[string]interface{}, error) {
	// Get file extension to determine type
	ext := strings.ToLower(filepath.Ext(filePath))

	// Create a basic GeoJSON structure for unsupported files
	result := map[string]interface{}{
		"type": "FeatureCollection",
		"features": []interface{}{},
		"properties": map[string]interface{}{
			"error": "Unable to load file with GDAL",
			"file_path": filePath,
			"file_type": ext,
		},
	}

	// Try to get basic info with ogrinfo
	cmd := exec.Command("ogrinfo", "-so", filePath)
	output, err := cmd.Output()
	if err == nil {
		// Add the ogrinfo output as metadata
		if props, ok := result["properties"].(map[string]interface{}); ok {
			props["ogrinfo"] = string(output)
		}
	}

	return result, nil
}

// OverpassQuery represents an Overpass API query
type OverpassQuery struct {
	Query string `json:"query"`
	Name  string `json:"name"`
}

// OverpassResponse represents the response from Overpass API
type OverpassResponse struct {
	Success  bool                   `json:"success"`
	Data     map[string]interface{} `json:"data,omitempty"`
	Error    string                 `json:"error,omitempty"`
	Metadata map[string]interface{} `json:"metadata,omitempty"`
}

// QueryOverpassAPI executes an Overpass Turbo query and returns GeoJSON
func (a *App) QueryOverpassAPI(query string) (*OverpassResponse, error) {
	// Overpass API endpoint
	url := "https://overpass-api.de/api/interpreter"

	// Create HTTP client with timeout
	client := &http.Client{
		Timeout: 30 * time.Second,
	}

	// Create request
	req, err := http.NewRequest("POST", url, strings.NewReader(query))
	if err != nil {
		return &OverpassResponse{
			Success: false,
			Error:   fmt.Sprintf("Failed to create request: %v", err),
		}, nil
	}

	// Set headers
	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")
	req.Header.Set("User-Agent", "Terrabox-Desktop/1.0")

	// Execute request
	resp, err := client.Do(req)
	if err != nil {
		return &OverpassResponse{
			Success: false,
			Error:   fmt.Sprintf("Failed to execute query: %v", err),
		}, nil
	}
	defer resp.Body.Close()

	// Read response
	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return &OverpassResponse{
			Success: false,
			Error:   fmt.Sprintf("Failed to read response: %v", err),
		}, nil
	}

	// Check for HTTP errors
	if resp.StatusCode != http.StatusOK {
		return &OverpassResponse{
			Success: false,
			Error:   fmt.Sprintf("HTTP error %d: %s", resp.StatusCode, string(body)),
		}, nil
	}

	// Check if response is JSON or XML based on content
	bodyStr := string(body)

	// Optional debug logging (can be removed in production)
	// fmt.Printf("Response body length: %d\n", len(body))
	// previewLen := 200
	// if len(bodyStr) < previewLen {
	// 	previewLen = len(bodyStr)
	// }
	// fmt.Printf("Response starts with: %s\n", bodyStr[:previewLen])

	// Better JSON detection - check if it starts with { and contains "elements"
	trimmed := strings.TrimSpace(bodyStr)
	isJSON := len(trimmed) > 0 && trimmed[0] == '{' && strings.Contains(bodyStr, `"elements"`)

	if isJSON {
		// For JSON responses, we'll convert directly to a simple GeoJSON structure
		// since the JSON format already includes geometry information
		var overpassJSON map[string]interface{}
		if err := json.Unmarshal(body, &overpassJSON); err != nil {
			return &OverpassResponse{
				Success: false,
				Error:   fmt.Sprintf("Failed to parse JSON response: %v", err),
			}, nil
		}

		// Create a simple GeoJSON FeatureCollection
		geojsonData := map[string]interface{}{
			"type":     "FeatureCollection",
			"features": []map[string]interface{}{},
		}

		if elements, ok := overpassJSON["elements"].([]interface{}); ok {
			features := []map[string]interface{}{}

			for _, element := range elements {
				if elemMap, ok := element.(map[string]interface{}); ok {
					elemType, _ := elemMap["type"].(string)

					// Create GeoJSON feature for each element
					feature := map[string]interface{}{
						"type": "Feature",
						"properties": map[string]interface{}{
							"id":   elemMap["id"],
							"type": elemType,
						},
					}

					// Add tags as properties
					if tags, ok := elemMap["tags"].(map[string]interface{}); ok {
						for k, v := range tags {
							feature["properties"].(map[string]interface{})[k] = v
						}
					}

					// Handle geometry based on type
					switch elemType {
					case "node":
						if lat, ok := elemMap["lat"].(float64); ok {
							if lon, ok := elemMap["lon"].(float64); ok {
								feature["geometry"] = map[string]interface{}{
									"type":        "Point",
									"coordinates": []float64{lon, lat},
								}
								features = append(features, feature)
							}
						}
					case "way":
						if geometry, ok := elemMap["geometry"].([]interface{}); ok {
							coordinates := [][]float64{}
							for _, geomPoint := range geometry {
								if gp, ok := geomPoint.(map[string]interface{}); ok {
									if lat, ok := gp["lat"].(float64); ok {
										if lon, ok := gp["lon"].(float64); ok {
											coordinates = append(coordinates, []float64{lon, lat})
										}
									}
								}
							}
							if len(coordinates) > 0 {
								// Determine if it's a line or polygon
								isPolygon := len(coordinates) > 2 &&
									coordinates[0][0] == coordinates[len(coordinates)-1][0] &&
									coordinates[0][1] == coordinates[len(coordinates)-1][1]

								if isPolygon {
									// Convert coordinates to interface slice for JSON
									coords := make([]interface{}, len(coordinates))
									for i, coord := range coordinates {
										coords[i] = coord
									}
									feature["geometry"] = map[string]interface{}{
										"type":        "Polygon",
										"coordinates": []interface{}{coords},
									}
								} else {
									feature["geometry"] = map[string]interface{}{
										"type":        "LineString",
										"coordinates": coordinates,
									}
								}
								features = append(features, feature)
							}
						}
					}
				}
			}
			geojsonData["features"] = features
		}

		// Convert to FeatureCollection format expected by the rest of the code
		geojsonBytes, err := json.Marshal(geojsonData)
		if err != nil {
			return &OverpassResponse{
				Success: false,
				Error:   fmt.Sprintf("Failed to marshal GeoJSON: %v", err),
			}, nil
		}

		var geojsonMap map[string]interface{}
		if err := json.Unmarshal(geojsonBytes, &geojsonMap); err != nil {
			return &OverpassResponse{
				Success: false,
				Error:   fmt.Sprintf("Failed to convert GeoJSON to map: %v", err),
			}, nil
		}

		// Create metadata
		metadata := map[string]interface{}{
			"query_time":    time.Now().Format(time.RFC3339),
			"feature_count": len(geojsonData["features"].([]map[string]interface{})),
			"query_length":  len(string(body)),
			"api_endpoint":  "https://overpass-api.de/api/interpreter",
			"format":        "json",
		}

		return &OverpassResponse{
			Success:  true,
			Data:     geojsonMap,
			Metadata: metadata,
		}, nil
	} else {
		// Handle XML response (fallback for older queries)
		osmData := &osm.OSM{}
		if err := xml.Unmarshal(body, osmData); err != nil {
			return &OverpassResponse{
				Success: false,
				Error:   fmt.Sprintf("Failed to parse OSM XML data: %v", err),
			}, nil
		}

		// Convert to GeoJSON
		fc, err := osmgeojson.Convert(osmData)
		if err != nil {
			return &OverpassResponse{
				Success: false,
				Error:   fmt.Sprintf("Failed to convert to GeoJSON: %v", err),
			}, nil
		}

		// Convert FeatureCollection to map for JSON response
		geojsonBytes, err := json.Marshal(fc)
		if err != nil {
			return &OverpassResponse{
				Success: false,
				Error:   fmt.Sprintf("Failed to marshal GeoJSON: %v", err),
			}, nil
		}

		var geojsonMap map[string]interface{}
		if err := json.Unmarshal(geojsonBytes, &geojsonMap); err != nil {
			return &OverpassResponse{
				Success: false,
				Error:   fmt.Sprintf("Failed to convert GeoJSON to map: %v", err),
			}, nil
		}

		// Create metadata
		metadata := map[string]interface{}{
			"query_time":    time.Now().Format(time.RFC3339),
			"feature_count": len(fc.Features),
			"query_length":  len(string(body)),
			"api_endpoint":  "https://overpass-api.de/api/interpreter",
			"format":        "xml",
		}

		return &OverpassResponse{
			Success:  true,
			Data:     geojsonMap,
			Metadata: metadata,
		}, nil
	}
}

// GetOverpassQueryTemplates returns common Overpass query templates
func (a *App) GetOverpassQueryTemplates() []map[string]interface{} {
	templates := []map[string]interface{}{
		{
			"name":        "Amenities in Area",
			"description": "Find amenities (restaurants, shops, etc.) in a bounding box",
			"category":    "amenities",
			"query": `[out:json][timeout:25];
(
  node["amenity"]({{bbox}});
  way["amenity"]({{bbox}});
  relation["amenity"]({{bbox}});
);
out geom;`,
		},
		{
			"name":        "Roads and Streets",
			"description": "Get all roads and streets in an area",
			"category":    "transportation",
			"query": `[out:json][timeout:25];
(
  way["highway"]({{bbox}});
  relation["highway"]({{bbox}});
);
out geom;`,
		},
		{
			"name":        "Buildings",
			"description": "Find all buildings in an area",
			"category":    "buildings",
			"query": `[out:json][timeout:25];
(
  way["building"]({{bbox}});
  relation["building"]({{bbox}});
);
out geom;`,
		},
		{
			"name":        "Public Transport",
			"description": "Bus stops, train stations, and other public transport",
			"category":    "transportation",
			"query": `[out:json][timeout:25];
(
  node["public_transport"]({{bbox}});
  node["railway"="station"]({{bbox}});
  node["highway"="bus_stop"]({{bbox}});
  way["public_transport"]({{bbox}});
  relation["public_transport"]({{bbox}});
);
out geom;`,
		},
		{
			"name":        "Natural Features",
			"description": "Parks, forests, water bodies, and other natural features",
			"category":    "natural",
			"query": `[out:json][timeout:25];
(
  way["natural"]({{bbox}});
  way["leisure"="park"]({{bbox}});
  way["landuse"="forest"]({{bbox}});
  relation["natural"]({{bbox}});
  relation["leisure"="park"]({{bbox}});
  relation["landuse"="forest"]({{bbox}});
);
out geom;`,
		},
		{
			"name":        "Shops and Commerce",
			"description": "Shops, markets, and commercial areas",
			"category":    "commerce",
			"query": `[out:json][timeout:25];
(
  node["shop"]({{bbox}});
  way["shop"]({{bbox}});
  way["landuse"="commercial"]({{bbox}});
  relation["shop"]({{bbox}});
  relation["landuse"="commercial"]({{bbox}});
);
out geom;`,
		},
		{
			"name":        "Educational Facilities",
			"description": "Schools, universities, and educational institutions",
			"category":    "education",
			"query": `[out:json][timeout:25];
(
  node["amenity"="school"]({{bbox}});
  node["amenity"="university"]({{bbox}});
  way["amenity"="school"]({{bbox}});
  way["amenity"="university"]({{bbox}});
  relation["amenity"="school"]({{bbox}});
  relation["amenity"="university"]({{bbox}});
);
out geom;`,
		},
		{
			"name":        "Healthcare Facilities",
			"description": "Hospitals, clinics, and healthcare services",
			"category":    "healthcare",
			"query": `[out:json][timeout:25];
(
  node["amenity"="hospital"]({{bbox}});
  node["amenity"="clinic"]({{bbox}});
  node["amenity"="pharmacy"]({{bbox}});
  way["amenity"="hospital"]({{bbox}});
  relation["amenity"="hospital"]({{bbox}});
);
out geom;`,
		},
		{
			"name":        "Administrative Boundaries",
			"description": "Countries, states, counties, cities, and other administrative boundaries",
			"category":    "boundaries",
			"query": `[out:json][timeout:25];
(
  relation["boundary"="administrative"]({{bbox}});
  relation["admin_level"~"^[2-8]$"]({{bbox}});
);
out geom;`,
		},
		{
			"name":        "Land Use Boundaries",
			"description": "Residential, commercial, industrial, and other land use areas",
			"category":    "boundaries",
			"query": `[out:json][timeout:25];
(
  way["landuse"]({{bbox}});
  relation["landuse"]({{bbox}});
);
out geom;`,
		},
		{
			"name":        "Country/State Outlines",
			"description": "Major political boundaries (countries, states, provinces)",
			"category":    "boundaries",
			"query": `[out:json][timeout:30];
(
  relation["boundary"="administrative"]["admin_level"~"^[2-4]$"]({{bbox}});
);
out geom;`,
		},
		{
			"name":        "City/County Boundaries",
			"description": "Local administrative boundaries (cities, counties, municipalities)",
			"category":    "boundaries",
			"query": `[out:json][timeout:25];
(
  relation["boundary"="administrative"]["admin_level"~"^[5-8]$"]({{bbox}});
);
out geom;`,
		},
		{
			"name":        "Postal Code Areas",
			"description": "ZIP codes, postal districts, and mailing areas",
			"category":    "boundaries",
			"query": `[out:json][timeout:25];
(
  relation["boundary"="postal_code"]({{bbox}});
  relation["postal_code"]({{bbox}});
);
out geom;`,
		},
		{
			"name":        "Protected Areas",
			"description": "National parks, nature reserves, and protected land",
			"category":    "boundaries",
			"query": `[out:json][timeout:25];
(
  relation["boundary"="protected_area"]({{bbox}});
  relation["boundary"="national_park"]({{bbox}});
  relation["leisure"="nature_reserve"]({{bbox}});
  way["boundary"="protected_area"]({{bbox}});
  way["boundary"="national_park"]({{bbox}});
);
out geom;`,
		},
		{
			"name":        "Coastlines and Water Boundaries",
			"description": "Shorelines, lake boundaries, and water body outlines",
			"category":    "boundaries",
			"query": `[out:json][timeout:25];
(
  way["natural"="coastline"]({{bbox}});
  way["natural"="water"]({{bbox}});
  relation["natural"="water"]({{bbox}});
  relation["waterway"="riverbank"]({{bbox}});
);
out geom;`,
		},
		{
			"name":        "Islands and Archipelagos",
			"description": "Island outlines, archipelagos, and island boundaries",
			"category":    "boundaries",
			"query": `[out:json][timeout:30];
(
  relation["place"="island"]({{bbox}});
  relation["place"="archipelago"]({{bbox}});
  way["place"="island"]({{bbox}});
  way["natural"="coastline"]({{bbox}});
  relation["boundary"="administrative"]["place"~"island|archipelago"]({{bbox}});
);
out geom;`,
		},
	}

	return templates
}

// GenerateOverpassQuery generates an AI-assisted Overpass query using OpenAI API for location detection
func (a *App) GenerateOverpassQuery(description string, bbox []float64) (string, error) {
	// Use OpenAI API to analyze the description and generate appropriate query
	locationData, err := a.getLocationFromOpenAI(description, bbox)
	if err != nil {
		// Fallback to map center if OpenAI fails
		return a.generateFallbackQuery(description, bbox)
	}

	// Generate Overpass query using detected location and categories
	query := a.buildOverpassQuery(locationData, description)
	return query, nil
}

// LocationData represents the parsed location and query information from OpenAI
type LocationData struct {
	BoundingBox [4]float64 `json:"bounding_box"` // [west, south, east, north] - actual format received
	Categories  []string   `json:"categories"`
	Location    string     `json:"location"`
}

// getLocationFromOpenAI uses OpenAI API to parse location and generate bounding box
func (a *App) getLocationFromOpenAI(description string, fallbackBbox []float64) (*LocationData, error) {
	// Get OpenAI API key from environment
	apiKey := os.Getenv("OPENAI_API_KEY")
	if apiKey == "" {
		return nil, fmt.Errorf("OPENAI_API_KEY environment variable not set")
	}

	client := openai.NewClient(apiKey)

	// Create prompt for location detection and category extraction
	prompt := fmt.Sprintf(`Analyze this query for OpenStreetMap data: "%s"

Extract the following information and return ONLY a valid JSON object:
{
  "location": "detected city/place name or 'current_map' if no specific location",
  "bounding_box": [west, south, east, north],
  "categories": ["category1", "category2"]
}

For bounding box:
- If a specific city/location is mentioned, provide its approximate bounds
- If no location is mentioned, use: [%.6f, %.6f, %.6f, %.6f]
- Format: [west, south, east, north] in decimal degrees
- IMPORTANT: Latitude (south/north) must be between -90 and 90, Longitude (west/east) must be between -180 and 180

For categories, extract relevant OpenStreetMap tags like:
- "restaurant", "cafe", "fast_food" for food
- "school", "university" for education
- "shop" for shopping
- "park", "leisure" for recreation
- "highway" for roads
- "amenity" for general amenities
- "boundary", "administrative" for land outlines, borders, boundaries
- "landuse", "land_use" for land use areas
- "coastline", "water" for shorelines and water boundaries
- "protected_area", "national_park" for protected areas
- "postal_code" for postal/zip code boundaries
- "island", "islands", "archipelago" for island outlines and archipelagos

Return only the JSON object, no other text.`, description, fallbackBbox[0], fallbackBbox[1], fallbackBbox[2], fallbackBbox[3])

	resp, err := client.CreateChatCompletion(
		context.Background(),
		openai.ChatCompletionRequest{
			Model: openai.GPT3Dot5Turbo,
			Messages: []openai.ChatCompletionMessage{
				{
					Role:    openai.ChatMessageRoleUser,
					Content: prompt,
				},
			},
			MaxTokens: 200,
		},
	)

	if err != nil {
		return nil, fmt.Errorf("OpenAI API error: %v", err)
	}

	if len(resp.Choices) == 0 {
		return nil, fmt.Errorf("no response from OpenAI")
	}

	// Parse JSON response
	var locationData LocationData
	content := strings.TrimSpace(resp.Choices[0].Message.Content)
	if err := json.Unmarshal([]byte(content), &locationData); err != nil {
		return nil, fmt.Errorf("failed to parse OpenAI response: %v", err)
	}

	return &locationData, nil
}

// generateFallbackQuery creates a query using map center when OpenAI fails
func (a *App) generateFallbackQuery(description string, bbox []float64) (string, error) {
	// bbox is assumed to be in [west, south, east, north] format from frontend
	// but we need to convert to proper lat/lon for calculation
	west := bbox[0]
	south := bbox[1]
	east := bbox[2]
	north := bbox[3]

	// Use map center
	centerLon := (west + east) / 2
	centerLat := (south + north) / 2

	// Create a reasonable area around the center (0.02 degrees ~ 2km)
	span := 0.02
	south = centerLat - span
	west = centerLon - span  // west should be smaller (more negative for negative longitudes)
	north = centerLat + span
	east = centerLon + span  // east should be larger (less negative for negative longitudes)

	// Ensure proper coordinate ordering: west < east, south < north
	if west > east {
		west, east = east, west
	}
	if south > north {
		south, north = north, south
	}

	description = strings.ToLower(description)

	// Simple keyword-based query generation with JSON output and relations
	if strings.Contains(description, "restaurant") || strings.Contains(description, "food") {
		return fmt.Sprintf(`[out:json][timeout:25];
(
  node["amenity"="restaurant"](%.6f,%.6f,%.6f,%.6f);
  node["amenity"="cafe"](%.6f,%.6f,%.6f,%.6f);
  node["amenity"="fast_food"](%.6f,%.6f,%.6f,%.6f);
  way["amenity"="restaurant"](%.6f,%.6f,%.6f,%.6f);
  way["amenity"="cafe"](%.6f,%.6f,%.6f,%.6f);
);
out geom;`, south, west, north, east, south, west, north, east, south, west, north, east, south, west, north, east, south, west, north, east), nil
	} else if strings.Contains(description, "school") || strings.Contains(description, "education") {
		return fmt.Sprintf(`[out:json][timeout:25];
(
  node["amenity"="school"](%.6f,%.6f,%.6f,%.6f);
  node["amenity"="university"](%.6f,%.6f,%.6f,%.6f);
  way["amenity"="school"](%.6f,%.6f,%.6f,%.6f);
  way["amenity"="university"](%.6f,%.6f,%.6f,%.6f);
  relation["amenity"="school"](%.6f,%.6f,%.6f,%.6f);
  relation["amenity"="university"](%.6f,%.6f,%.6f,%.6f);
);
out geom;`, south, west, north, east, south, west, north, east, south, west, north, east, south, west, north, east, south, west, north, east, south, west, north, east), nil
	} else if strings.Contains(description, "park") || strings.Contains(description, "recreation") {
		return fmt.Sprintf(`[out:json][timeout:25];
(
  way["leisure"="park"](%.6f,%.6f,%.6f,%.6f);
  relation["leisure"="park"](%.6f,%.6f,%.6f,%.6f);
  way["landuse"="recreation_ground"](%.6f,%.6f,%.6f,%.6f);
  relation["landuse"="recreation_ground"](%.6f,%.6f,%.6f,%.6f);
);
out geom;`, south, west, north, east, south, west, north, east, south, west, north, east, south, west, north, east), nil
	} else {
		// Default to amenities with comprehensive coverage
		return fmt.Sprintf(`[out:json][timeout:25];
(
  node["amenity"](%.6f,%.6f,%.6f,%.6f);
  way["amenity"](%.6f,%.6f,%.6f,%.6f);
  relation["amenity"](%.6f,%.6f,%.6f,%.6f);
);
out geom;`, south, west, north, east, south, west, north, east, south, west, north, east), nil
	}
}

// SaveEditedOSMData saves edited OSM data to a file
func (a *App) SaveEditedOSMData(geojsonData map[string]interface{}, filename string) error {
	// Create a directory for edited OSM data if it doesn't exist
	homeDir, err := os.UserHomeDir()
	if err != nil {
		return fmt.Errorf("failed to get home directory: %v", err)
	}

	osmDir := filepath.Join(homeDir, "TerraboxOSM")
	if err := os.MkdirAll(osmDir, 0755); err != nil {
		return fmt.Errorf("failed to create OSM directory: %v", err)
	}

	// Generate filename if not provided
	if filename == "" {
		filename = fmt.Sprintf("osm_edit_%s.geojson", time.Now().Format("20060102_150405"))
	}

	// Ensure .geojson extension
	if !strings.HasSuffix(filename, ".geojson") {
		filename += ".geojson"
	}

	filePath := filepath.Join(osmDir, filename)

	// Marshal the GeoJSON data
	jsonData, err := json.MarshalIndent(geojsonData, "", "  ")
	if err != nil {
		return fmt.Errorf("failed to marshal GeoJSON: %v", err)
	}

	// Write to file
	if err := os.WriteFile(filePath, jsonData, 0644); err != nil {
		return fmt.Errorf("failed to write file: %v", err)
	}

	// Log success
	runtime.LogInfo(a.ctx, fmt.Sprintf("Saved edited OSM data to: %s", filePath))

	return nil
}

// buildOverpassQuery constructs the Overpass query from OpenAI location data
func (a *App) buildOverpassQuery(locationData *LocationData, description string) string {
	bbox := locationData.BoundingBox
	// bbox comes as [west, south, east, north] format from turf.bbox()
	// but Overpass API expects (south, west, north, east)
	west, south, east, north := bbox[0], bbox[1], bbox[2], bbox[3]

	// Check if this is an island/archipelago request - prioritize coastline queries
	isIslandRequest := false
	for _, category := range locationData.Categories {
		if category == "island" || category == "islands" || category == "archipelago" || category == "isle" {
			isIslandRequest = true
			break
		}
	}

	// Build query based on detected categories with comprehensive coverage (nodes, ways, relations)
	var queries []string

	// For island requests, prioritize coastline and place tags
	if isIslandRequest {
		queries = append(queries, fmt.Sprintf(`  way["natural"="coastline"](%.6f,%.6f,%.6f,%.6f);`, south, west, north, east))
		queries = append(queries, fmt.Sprintf(`  relation["place"="island"](%.6f,%.6f,%.6f,%.6f);`, south, west, north, east))
		queries = append(queries, fmt.Sprintf(`  way["place"="island"](%.6f,%.6f,%.6f,%.6f);`, south, west, north, east))
		queries = append(queries, fmt.Sprintf(`  relation["place"="archipelago"](%.6f,%.6f,%.6f,%.6f);`, south, west, north, east))
	} else {
		// Regular category processing for non-island requests
		for _, category := range locationData.Categories {
			switch category {
		case "restaurant", "cafe", "fast_food":
			queries = append(queries, fmt.Sprintf(`  node["amenity"="%s"](%.6f,%.6f,%.6f,%.6f);`, category, south, west, north, east))
			queries = append(queries, fmt.Sprintf(`  way["amenity"="%s"](%.6f,%.6f,%.6f,%.6f);`, category, south, west, north, east))
		case "school", "university":
			queries = append(queries, fmt.Sprintf(`  node["amenity"="%s"](%.6f,%.6f,%.6f,%.6f);`, category, south, west, north, east))
			queries = append(queries, fmt.Sprintf(`  way["amenity"="%s"](%.6f,%.6f,%.6f,%.6f);`, category, south, west, north, east))
			queries = append(queries, fmt.Sprintf(`  relation["amenity"="%s"](%.6f,%.6f,%.6f,%.6f);`, category, south, west, north, east))
		case "shop":
			queries = append(queries, fmt.Sprintf(`  node["shop"](%.6f,%.6f,%.6f,%.6f);`, south, west, north, east))
			queries = append(queries, fmt.Sprintf(`  way["shop"](%.6f,%.6f,%.6f,%.6f);`, south, west, north, east))
			queries = append(queries, fmt.Sprintf(`  relation["shop"](%.6f,%.6f,%.6f,%.6f);`, south, west, north, east))
		case "park", "leisure":
			queries = append(queries, fmt.Sprintf(`  way["leisure"="park"](%.6f,%.6f,%.6f,%.6f);`, south, west, north, east))
			queries = append(queries, fmt.Sprintf(`  relation["leisure"="park"](%.6f,%.6f,%.6f,%.6f);`, south, west, north, east))
			queries = append(queries, fmt.Sprintf(`  way["landuse"="recreation_ground"](%.6f,%.6f,%.6f,%.6f);`, south, west, north, east))
			queries = append(queries, fmt.Sprintf(`  relation["landuse"="recreation_ground"](%.6f,%.6f,%.6f,%.6f);`, south, west, north, east))
		case "highway":
			queries = append(queries, fmt.Sprintf(`  way["highway"](%.6f,%.6f,%.6f,%.6f);`, south, west, north, east))
			queries = append(queries, fmt.Sprintf(`  relation["highway"](%.6f,%.6f,%.6f,%.6f);`, south, west, north, east))
		case "amenity":
			queries = append(queries, fmt.Sprintf(`  node["amenity"](%.6f,%.6f,%.6f,%.6f);`, south, west, north, east))
			queries = append(queries, fmt.Sprintf(`  way["amenity"](%.6f,%.6f,%.6f,%.6f);`, south, west, north, east))
			queries = append(queries, fmt.Sprintf(`  relation["amenity"](%.6f,%.6f,%.6f,%.6f);`, south, west, north, east))
		case "boundary", "administrative", "land_outline", "outline", "border":
			queries = append(queries, fmt.Sprintf(`  relation["boundary"="administrative"](%.6f,%.6f,%.6f,%.6f);`, south, west, north, east))
			queries = append(queries, fmt.Sprintf(`  relation["admin_level"~"^[2-8]$"](%.6f,%.6f,%.6f,%.6f);`, south, west, north, east))
		case "landuse", "land_use":
			queries = append(queries, fmt.Sprintf(`  way["landuse"](%.6f,%.6f,%.6f,%.6f);`, south, west, north, east))
			queries = append(queries, fmt.Sprintf(`  relation["landuse"](%.6f,%.6f,%.6f,%.6f);`, south, west, north, east))
		case "coastline", "coast", "water", "shoreline":
			queries = append(queries, fmt.Sprintf(`  way["natural"="coastline"](%.6f,%.6f,%.6f,%.6f);`, south, west, north, east))
			queries = append(queries, fmt.Sprintf(`  way["natural"="water"](%.6f,%.6f,%.6f,%.6f);`, south, west, north, east))
			queries = append(queries, fmt.Sprintf(`  relation["natural"="water"](%.6f,%.6f,%.6f,%.6f);`, south, west, north, east))
		case "protected_area", "national_park", "nature_reserve":
			queries = append(queries, fmt.Sprintf(`  relation["boundary"="protected_area"](%.6f,%.6f,%.6f,%.6f);`, south, west, north, east))
			queries = append(queries, fmt.Sprintf(`  relation["boundary"="national_park"](%.6f,%.6f,%.6f,%.6f);`, south, west, north, east))
			queries = append(queries, fmt.Sprintf(`  way["boundary"="protected_area"](%.6f,%.6f,%.6f,%.6f);`, south, west, north, east))
		case "postal_code", "zip_code":
			queries = append(queries, fmt.Sprintf(`  relation["boundary"="postal_code"](%.6f,%.6f,%.6f,%.6f);`, south, west, north, east))
			queries = append(queries, fmt.Sprintf(`  relation["postal_code"](%.6f,%.6f,%.6f,%.6f);`, south, west, north, east))
		case "island", "islands", "archipelago", "isle":
			queries = append(queries, fmt.Sprintf(`  relation["place"="island"](%.6f,%.6f,%.6f,%.6f);`, south, west, north, east))
			queries = append(queries, fmt.Sprintf(`  relation["place"="archipelago"](%.6f,%.6f,%.6f,%.6f);`, south, west, north, east))
			queries = append(queries, fmt.Sprintf(`  way["place"="island"](%.6f,%.6f,%.6f,%.6f);`, south, west, north, east))
			queries = append(queries, fmt.Sprintf(`  way["natural"="coastline"](%.6f,%.6f,%.6f,%.6f);`, south, west, north, east))
		}
		}
	}

	// If no specific categories detected, use general amenities with full coverage
	if len(queries) == 0 {
		queries = append(queries, fmt.Sprintf(`  node["amenity"](%.6f,%.6f,%.6f,%.6f);`, south, west, north, east))
		queries = append(queries, fmt.Sprintf(`  way["amenity"](%.6f,%.6f,%.6f,%.6f);`, south, west, north, east))
		queries = append(queries, fmt.Sprintf(`  relation["amenity"](%.6f,%.6f,%.6f,%.6f);`, south, west, north, east))
	}

	// Construct the final query with JSON output and full geometry
	query := fmt.Sprintf(`[out:json][timeout:25];
(
%s
);
out geom;`, strings.Join(queries, "\n"))

	return query
}

