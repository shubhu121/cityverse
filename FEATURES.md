# New Billboard Navigation Features

## Overview
Two new interactive features have been added to help users locate and navigate to project billboards in the cityverse:

## 1. Billboard Radar Minimap
A radar-style minimap displays in the bottom-right corner when the game is active.

### Features:
- **Real-time tracking**: Shows all nearby project billboards within 400m radius
- **Distance-based coloring**:
  - Red/Pink (close): < 100m
  - Magenta (medium): 100-200m  
  - Purple (far): 200-400m
- **Pulsing indicators**: Billboards within 50m pulse to draw attention
- **Mouse-based rotation**: Minimap rotates with mouse look direction (camera rotation), not just body rotation
- **Range circles**: Visual indicators for distance estimation
- **Crosshair overlay**: Shows cardinal directions

### Location:
Bottom-right corner of screen (200x200px)

## 2. 3D Billboard Indicators
Animated floating markers appear above buildings with project billboards.

### Features:
- **Animated arrow**: Large cone-shaped arrow (8 unit radius, 20 unit height) pointing down at the billboard
- **Pulsing ring**: Glowing ring (10-14 unit radius) that pulses for visibility
- **Color-coded**:
  - Arrow: Magenta (#ff00ff) with high emissive intensity
  - Ring: Cyan (#00fff7) with glow effect
- **Smart positioning**: Indicators positioned 40 units above actual building height
  - Small buildings: ~160-200 units high
  - Large buildings: ~250-375 units high
- **Proximity-based visibility**: Only shows indicators within 300m
- **Performance optimized**: Visibility checks run every 10 frames

### Animations:
- Arrow bobs up and down (5 unit range)
- Ring pulses in size and opacity
- Arrow slowly rotates for visual interest

### Debug Logging:
- Console logs when indicators are created
- Shows project name and position for each indicator
- Helps verify indicators are being spawned correctly

## Implementation Details

### New Files Created:
1. **`src/classes/Minimap.js`** - Minimap radar system
2. **`src/classes/BillboardIndicator.js`** - 3D arrow and ring indicators

### Modified Files:
1. **`src/index.js`**
   - Imported new classes
   - Initialized minimap and indicator manager
   - Added update calls in animation loop
   - Show/hide minimap on controls lock/unlock

2. **`src/classes/GeneratorItem_CityBlock.js`**
   - Added indicator creation when billboards spawn

3. **`index.html`**
   - Updated to use new build hash

## How to Use

1. **Start the game** by clicking the Launch button
2. **Minimap appears** automatically in bottom-right corner
3. **Look for**:
   - Colored dots on minimap showing billboard positions
   - Floating arrows and rings above buildings in 3D view
4. **Navigate** toward the indicators to find project billboards
5. **Click** on billboards (using crosshair) to open project links

## Performance Considerations

- Indicator visibility updates every 10 frames (not every frame)
- Proximity detector updates every 30 frames
- Minimap updates every frame but uses optimized canvas rendering
- Maximum 300m visibility range for 3D indicators

## Technical Specs

### Minimap:
- Canvas-based 2D rendering
- 200x200px fixed size
- 400m detection radius
- Rotates with player orientation
- Semi-transparent background with scanline effect

### 3D Indicators:
- Three.js Cone geometry (arrow)
- Three.js Ring geometry (pulsing ring)
- MeshBasicMaterial with emissive properties
- Grouped objects for easy management
- Automatically cleaned up when out of range

## Future Enhancements (Optional)

- Toggle minimap on/off with keyboard shortcut
- Adjustable minimap size
- Click on minimap dots to set waypoint
- Distance display on hover
- Filter billboards by project category
- Minimap zoom levels
