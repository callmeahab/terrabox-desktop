# Manual Bounds Drawing Feature

You now have the ability to manually draw custom bounds for your Overpass queries! This gives you precise control over the query area instead of using the default circular bounding box.

## 🎯 How to Use Manual Bounds Drawing

### 1. **Activate Drawing Mode**
- Look for the purple **"Draw Custom Query Bounds"** button (with crop icon) on the right side of the screen
- Click it to enter bounds drawing mode

### 2. **Draw Your Area**
- Click and drag on the map to draw a rectangular area
- You'll see a purple rectangle appear as you drag
- The rectangle shows your custom query bounds in real-time

### 3. **Confirm or Cancel**
- **"Use This Area"** button: Confirms your drawn area
- **"Cancel"** button: Exits drawing mode without saving
- The drawn area coordinates are displayed for reference

### 4. **Use in Queries**
Once you've drawn custom bounds, they will be automatically used in:

#### **Templates Tab**
- All query templates will use your drawn area instead of the default circular area
- Look for boundary templates like "Administrative Boundaries", "Islands and Archipelagos", etc.

#### **AI Assistant Tab**
- Shows a purple notification: "🎯 Using Custom Drawn Area"
- All AI-generated queries will use your precise bounds
- Try queries like:
  - "Get island outlines and archipelagos"
  - "Find administrative boundaries"
  - "Show coastlines and water boundaries"

#### **Manual Queries**
- Your drawn bounds are automatically inserted into `{{bbox}}` placeholders
- Coordinates are properly formatted for Overpass API: `(south,west,north,east)`

## 🔧 **Visual Features**

### **Bounds Visualization**
- Purple outline shows your drawn area on the map
- Semi-transparent purple fill for clear visibility
- Remains visible while bounds are active

### **Smart Integration**
- Works with all existing query methods (Templates, AI, Manual)
- Automatically replaces default circular bounds
- Proper coordinate transformation for Overpass API

### **Clear Feedback**
- Real-time coordinate display while drawing
- Visual confirmation of selected area
- Clear indicators when custom bounds are active

## 📍 **Use Cases**

### **Precise Geographic Areas**
- Draw exact city boundaries
- Target specific neighborhoods
- Focus on particular islands or coastlines

### **Custom Shapes**
- Rectangular areas around points of interest
- Specific regions for data analysis
- Custom study areas for research

### **Better Query Results**
- More relevant data by targeting exact areas
- Reduced query size for faster results
- Precise geographic scope for your analysis

## 🎨 **Tips for Best Results**

1. **Draw Appropriate Sizes**: Very small areas might return no results, very large ones might timeout
2. **Check Coordinates**: The displayed coordinates help verify your selected area
3. **Combine with Right Queries**: Use boundary/coastline queries for geographic outlines
4. **Clear When Done**: Cancel drawing mode when you want to return to default behavior

Your manual bounds drawing feature is now fully integrated and ready to use! 🗺️