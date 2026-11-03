with open(r'C:\Users\Tim S\Downloads\the\floodpro_private_pipes\build\app-20-map.js', 'r') as f:
    content = f.read()

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

if old_layers in content:
    content = content.replace(old_layers, new_layers)
    print('Tile layers updated')
else:
    print('Could not find old tile layers')

# Replace basemap default value
content = content.replace(
    "    basemap.value = 'osm';",
    "    basemap.value = 'satellite';"
)

# Replace basemap change handler
content = content.replace(
    "      basemapLayer = basemap.value === 'light' ? lightLayer : osmLayer;",
    "      basemapLayer = basemap.value === 'street' ? streetLayer : satelliteLayer;"
)

# Add header/manhole toggle listeners before settleInitialView
old_settle = """  const settleInitialView = () => {"""
new_settle = """  // Header / Manhole point layer toggles
  const showHeaders = $('#showHeaders');
  const showManholes = $('#showManholes');
  if (showHeaders) {
    showHeaders.addEventListener('change', () => {
      if (showHeaders.checked) addHeaderMarkers();
      else removeHeaderMarkers();
    });
  }
  if (showManholes) {
    showManholes.addEventListener('change', () => {
      if (showManholes.checked) addManholeMarkers();
      else removeManholeMarkers();
    });
  }

  const settleInitialView = () => {"""

if old_settle in content:
    content = content.replace(old_settle, new_settle)
    print('Toggle listeners added')
else:
    print('Could not find settleInitialView')

# Append point marker functions at the end
point_funcs = '''

/* -------------------------------------------------------------------------- */
/* Header / Manhole point markers                                             */
/* -------------------------------------------------------------------------- */

function addHeaderMarkers() {
  if (!map || headerMarkers) return;
  const headers = PIPE_DATA.headers || [];
  const markers = [];
  for (const f of headers) {
    const g = f.geometry || {};
    const coords = g.coordinates || [];
    if (coords.length < 2) continue;
    const latlng = [coords[1], coords[0]];
    const marker = L.circleMarker(latlng, {
      radius: 4,
      color: '#dc2626',
      fillColor: '#dc2626',
      fillOpacity: 0.8,
      weight: 1,
    }).bindPopup(`<b>Header</b><br>Drainage ID: ${f.properties.DRAINAGE_ID || '—'}`);
    markers.push(marker.addTo(map));
  }
  headerMarkers = L.layerGroup(markers).addTo(map);
}

function removeHeaderMarkers() {
  if (headerMarkers) {
    map.removeLayer(headerMarkers);
    headerMarkers = null;
  }
}

function addManholeMarkers() {
  if (!map || manholeMarkers) return;
  const manholes = PIPE_DATA.manholes || [];
  const markers = [];
  for (const f of manholes) {
    const g = f.geometry || {};
    const coords = g.coordinates || [];
    if (coords.length < 2) continue;
    const latlng = [coords[1], coords[0]];
    const marker = L.circleMarker(latlng, {
      radius: 4,
      color: '#2563eb',
      fillColor: '#2563eb',
      fillOpacity: 0.8,
      weight: 1,
    }).bindPopup(`<b>Manhole</b><br>Drainage ID: ${f.properties.DRAINAGE_ID || '—'}`);
    markers.push(marker.addTo(map));
  }
  manholeMarkers = L.layerGroup(markers).addTo(map);
}

function removeManholeMarkers() {
  if (manholeMarkers) {
    map.removeLayer(manholeMarkers);
    manholeMarkers = null;
  }
}
'''

content = content.rstrip() + '\n' + point_funcs

with open(r'C:\Users\Tim S\Downloads\the\floodpro_private_pipes\build\app-20-map.js', 'w') as f:
    f.write(content)
print('Done')
