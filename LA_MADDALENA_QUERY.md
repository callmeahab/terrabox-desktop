# La Maddalena Archipelago Query Guide

For La Maddalena specifically, try this optimized query:

## Option 1: Coastline-focused (Most likely to work)
```sql
[out:json][timeout:30];
(
  way["natural"="coastline"](41.185865,11.177899,41.315612,11.321702);
);
out geom;
```

## Option 2: Place-based (If islands are properly tagged)
```sql
[out:json][timeout:30];
(
  relation["place"="island"]["name"~"Maddalena",i](41.185865,11.177899,41.315612,11.321702);
  relation["place"="archipelago"]["name"~"Maddalena",i](41.185865,11.177899,41.315612,11.321702);
  way["place"="island"](41.185865,11.177899,41.315612,11.321702);
);
out geom;
```

## Option 3: Combined approach (Best results)
```sql
[out:json][timeout:30];
(
  way["natural"="coastline"](41.185865,11.177899,41.315612,11.321702);
  relation["place"="island"](41.185865,11.177899,41.315612,11.321702);
  way["place"="island"](41.185865,11.177899,41.315612,11.321702);
);
out geom;
```

## Why the original query failed:
1. **Too many query types**: The AI generated queries for admin boundaries, land use, protected areas, etc. all at once
2. **Wrong tags**: Administrative boundaries don't work well for small islands
3. **Coastlines are key**: For islands, `natural=coastline` is the most reliable tag

## Recommended approach:
Start with **Option 1** (coastline only) - this is most likely to return results for island outlines.