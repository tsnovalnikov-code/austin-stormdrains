with open(r'C:\Users\Tim S\Downloads\the\floodpro_private_pipes\build\app-20-map.js', 'r') as f:
    content = f.read()

# Replace variable declarations
content = content.replace(
    'let basemapLayer = null;\nlet osmLayer = null;\nlet lightLayer = null;',
    'let basemapLayer = null;\nlet satelliteLayer = null;\nlet streetLayer = null;'
)

# Replace tile layer definitions
old_layers = """  osmLayer = L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a> contributors',
  });
  lightLayer = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}', {
    maxNativeZoom: 16,
    maxZoom: 19,
    attribution: 'Tiles &copy; Esri &mdash; Esri, HERE, Garmin, &copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a> contributors',
  });
  basemapLayer = osmLayer.addTo(map);"""

new_layers = """  satelliteLayer = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
    maxZoom: 19,
    attribution: 'Tiles &copy; Esri &mdash; Source: Esri, Maxar, Earthstar Geographics, and the GIS User Community',
  });
  streetLayer = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}', {
    maxNativeZoom: 17,
    maxZoom: 19,
    attribution: 'Tiles &copy; Esri &mdash; Esri, DeLorme, NAVTEQ, TomTom, Intermap, iPC, USGS, FAO, NPS, NRCAN, GeoBase, Kadaster NL, Ordnance Survey, Esri Japan, METI, Esri China (Hong Kong), and the GIS User Community',
  });
  basemapLayer = satelliteLayer.addTo(map);"""

content = content.replace(old_layers, new_layers)

# Replace basemap default value and change handler
content = content.replace(
    "    basemap.value = 'osm';",
    "    basemap.value = 'satellite';"
)
content = content.replace(
    "      basemapLayer = basemap.value === 'light' ? lightLayer : osmLayer;",
    "      basemapLayer = basemap.value === 'street' ? streetLayer : satelliteLayer;"
)

with open(r'C:\Users\Tim S\Downloads\the\floodpro_private_pipes\build\app-20-map.js', 'w') as f:
    f.write(content)
print('Done')
