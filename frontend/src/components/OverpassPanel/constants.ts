import { OverpassTemplate } from "./types";

export const SAMPLE_TEMPLATES: OverpassTemplate[] = [
  {
    name: "Restaurants",
    description: "Find all restaurants in the area",
    category: "Food & Dining",
    query: `[out:json][timeout:25];
(
  node["amenity"="restaurant"]({{bbox}});
  way["amenity"="restaurant"]({{bbox}});
  relation["amenity"="restaurant"]({{bbox}});
);
out geom;`,
  },
  {
    name: "Cafes and Coffee Shops",
    description: "Find cafes and coffee shops",
    category: "Food & Dining",
    query: `[out:json][timeout:25];
(
  node["amenity"="cafe"]({{bbox}});
  way["amenity"="cafe"]({{bbox}});
  relation["amenity"="cafe"]({{bbox}});
);
out geom;`,
  },
  {
    name: "Parks and Green Spaces",
    description: "Find parks, gardens, and recreational areas",
    category: "Recreation",
    query: `[out:json][timeout:25];
(
  node["leisure"~"^(park|garden|playground)$"]({{bbox}});
  way["leisure"~"^(park|garden|playground)$"]({{bbox}});
  relation["leisure"~"^(park|garden|playground)$"]({{bbox}});
);
out geom;`,
  },
  {
    name: "Administrative Boundaries",
    description: "Find administrative boundaries and borders",
    category: "Boundaries",
    query: `[out:json][timeout:25];
(
  relation["boundary"="administrative"]({{bbox}});
);
out geom;`,
  },
  {
    name: "Coastlines and Water Bodies",
    description: "Find coastlines, rivers, and water features",
    category: "Geography",
    query: `[out:json][timeout:25];
(
  way["natural"="coastline"]({{bbox}});
  way["waterway"]({{bbox}});
  way["natural"="water"]({{bbox}});
  relation["natural"="water"]({{bbox}});
);
out geom;`,
  },
  {
    name: "Roads and Highways",
    description: "Find major roads and highways",
    category: "Transportation",
    query: `[out:json][timeout:25];
(
  way["highway"~"^(motorway|trunk|primary|secondary)$"]({{bbox}});
);
out geom;`,
  },
];

export const AI_EXAMPLE_PROMPTS = [
  "Find all restaurants and cafes",
  "Show me parks and green spaces",
  "Get public transportation stops",
  "Find schools and universities",
  "Show administrative boundaries",
  "Get coastlines and water bodies",
];
