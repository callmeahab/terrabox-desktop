# Land Outline Query Support

Your app now supports generating queries to retrieve land outlines and boundaries! Here's what's been implemented:

## New Query Templates Available

### 1. Administrative Boundaries
- **Description**: Countries, states, counties, cities, and other administrative boundaries
- **Query**: Searches for `boundary=administrative` and `admin_level` 2-8
- **Use Case**: Getting political/administrative borders

### 2. Land Use Boundaries
- **Description**: Residential, commercial, industrial, and other land use areas
- **Query**: Searches for `landuse` tags on ways and relations
- **Use Case**: Zoning and land use mapping

### 3. Country/State Outlines
- **Description**: Major political boundaries (countries, states, provinces)
- **Query**: Administrative boundaries with levels 2-4
- **Use Case**: Large-scale political maps

### 4. City/County Boundaries
- **Description**: Local administrative boundaries (cities, counties, municipalities)
- **Query**: Administrative boundaries with levels 5-8
- **Use Case**: Local government boundaries

### 5. Postal Code Areas
- **Description**: ZIP codes, postal districts, and mailing areas
- **Query**: Searches for `boundary=postal_code` and `postal_code` tags
- **Use Case**: Mail delivery zones

### 6. Protected Areas
- **Description**: National parks, nature reserves, and protected land
- **Query**: Searches for protected areas and national parks
- **Use Case**: Conservation and protected area mapping

### 7. Coastlines and Water Boundaries
- **Description**: Shorelines, lake boundaries, and water body outlines
- **Query**: Searches for coastlines, water bodies, and riverbanks
- **Use Case**: Coastal and hydrographic mapping

## AI Assistant Enhancement

The AI Assistant now recognizes requests for:
- "administrative boundaries"
- "land outlines"
- "borders"
- "coastlines"
- "water boundaries"
- "land use areas"
- "protected areas"
- "postal codes"

## Example AI Prompts That Now Work

Try these in the AI Assistant tab:
1. "Get administrative boundaries and land outlines"
2. "Show city and county boundaries"
3. "Find coastlines and water boundaries"
4. "Get land use areas and zoning"
5. "Show country and state borders"

## How to Use

1. **Via Templates**: Go to the "Templates" tab and look for the new "boundaries" category
2. **Via AI Assistant**: Use the "AI Assistant" tab with natural language requests
3. **Manual Queries**: Use the Query Editor with proper Overpass QL syntax

## Technical Details

- All queries use `[out:json]` format
- Geometry is included with `out geom;`
- Timeouts are set appropriately for complex boundary queries
- Both ways and relations are searched where applicable

Your land outline queries should now work perfectly! 🗺️