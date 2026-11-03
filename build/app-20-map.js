/* ==========================================================================
   Map: canvas line rendering, hit testing and selection
   ========================================================================== */

let basemapLayer = null;
let satelliteLayer = null;
let streetLayer = null;
let headerMarkers = null;
let manholeMarkers = null;

// The canvas is drawn larger than the viewport so pans can be handled with a
// cheap CSS translation instead of repainting 59k lines on every move event.
const OVERSCAN = 240;
let drawPaneX = 0;
let drawPaneY = 0;

function initMap() {
  if (typeof L === 'undefined') {
    showMapError('The map library could not load. Check your internet connection and reload the page. The filters and table below still work.');
    return;
  }

  const pad = 0.2;
  map = L.map('map', {
    zoomControl: true,
    minZoom: 9,
    maxZoom: 19,
    maxBounds: [
      [META.bounds[0] - pad, META.bounds[1] - pad],
      [META.bounds[2] + pad, META.bounds[3] + pad],
    ],
    maxBoundsViscosity: 0.8,
    attributionControl: true,
  });

  satelliteLayer = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
    maxZoom: 19,
    attribution: 'Tiles &copy; Esri &mdash; Source: Esri, Maxar, Earthstar Geographics, and the GIS User Community',
  });
  streetLayer = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}', {
    maxNativeZoom: 17,
    maxZoom: 19,
    attribution: 'Tiles &copy; Esri &mdash; Esri, DeLorme, NAVTEQ, TomTom, Intermap, iPC, USGS, FAO, NPS, NRCAN, GeoBase, Kadaster NL, Ordnance Survey, Esri Japan, METI, Esri China (Hong Kong), and the GIS User Community',
  });
  basemapLayer = satelliteLayer.addTo(map);

  const dataBounds = L.latLngBounds(
    [[META.bounds[0], META.bounds[1]], [META.bounds[2], META.bounds[3]]]
  );
  // The map can be created before the CSS grid has given the container its
  // final size. Refresh the cached size first, then fit; a deferred refit below
  // covers the case where layout is still settling on the first paint.
  map.invalidateSize({ animate: false, pan: false });
  map.fitBounds(dataBounds, { padding: [24, 24], animate: false });

  canvas = L.DomUtil.create('canvas', 'pipe-canvas');
  map.getContainer().appendChild(canvas);
  ctx = canvas.getContext('2d');
  resizeCanvas();

  map.on('move', translateCanvas);
  map.on('moveend', scheduleDraw);
  map.on('viewreset', scheduleDraw);
  map.on('resize', () => {
    resizeCanvas();
    scheduleDraw();
  });
  map.on('zoomstart', () => {
    if (canvas) canvas.style.display = 'none';
  });
  map.on('zoomend', () => {
    if (canvas) canvas.style.display = '';
    resizeCanvas();
    scheduleDraw();
  });
  map.on('click', onMapClick);

  const basemap = $('#basemap');
  if (basemap) {
    basemap.value = 'satellite';
    basemap.addEventListener('change', () => {
      if (!map) return;
      if (basemapLayer) map.removeLayer(basemapLayer);
      basemapLayer = basemap.value === 'street' ? streetLayer : satelliteLayer;
      basemapLayer.addTo(map);
    });
  }

  // Header / Manhole point layer toggles
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

  const settleInitialView = () => {
    if (!map) return;
    map.invalidateSize({ animate: false, pan: false });
    map.fitBounds(dataBounds, { padding: [24, 24], animate: false });
    resizeCanvas();
    scheduleDraw();
  };
  requestAnimationFrame(settleInitialView);
  setTimeout(settleInitialView, 140);
}

function showMapError(message) {
  const element = $('#map');
  if (!element) return;
  element.innerHTML = `<div class="map-error"><div><b>Map unavailable</b><br>${escapeHtml(message)}</div></div>`;
  const basemap = $('#basemap');
  if (basemap) basemap.disabled = true;
}

function resizeCanvas() {
  if (!map || !canvas) return;
  const size = map.getSize();
  if (!size.x || !size.y) return;
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const cssWidth = size.x + OVERSCAN * 2;
  const cssHeight = size.y + OVERSCAN * 2;
  const width = Math.max(1, Math.round(cssWidth * dpr));
  const height = Math.max(1, Math.round(cssHeight * dpr));
  if (canvas.width !== width || canvas.height !== height) {
    canvas.width = width;
    canvas.height = height;
  }
  canvas.style.width = `${cssWidth}px`;
  canvas.style.height = `${cssHeight}px`;
  canvas.style.left = `${-OVERSCAN}px`;
  canvas.style.top = `${-OVERSCAN}px`;
}

function translateCanvas() {
  if (!map || !canvas || !ctx) return;
  if (canvas.style.display === 'none') return;
  const pane = map.layerPointToContainerPoint([0, 0]);
  const dx = pane.x - drawPaneX;
  const dy = pane.y - drawPaneY;
  if (!dx && !dy) {
    canvas.style.transform = 'none';
    return;
  }
  // If the pan is larger than the overscan buffer, repaint before the edge of
  // the canvas becomes visible.
  if (Math.abs(dx) > OVERSCAN * 0.8 || Math.abs(dy) > OVERSCAN * 0.8) {
    scheduleDraw();
    return;
  }
  canvas.style.transform = `translate(${dx}px, ${dy}px)`;
}

function scheduleDraw() {
  if (!map || !canvas) return;
  if (drawRaf) return;
  drawRaf = requestAnimationFrame(() => {
    drawRaf = 0;
    drawMap();
  });
}

function addPath(context, feature, worldSize, offsetX, offsetY) {
  const geometry = feature.geom;
  let x = geometry[0] * worldSize - offsetX;
  let y = geometry[1] * worldSize - offsetY;
  context.moveTo(x, y);
  for (let i = 2; i < geometry.length; i += 2) {
    x = geometry[i] * worldSize - offsetX;
    y = geometry[i + 1] * worldSize - offsetY;
    context.lineTo(x, y);
  }
}

function drawMap() {
  if (!map || !canvas || !ctx) return;
  if (canvas.style.display === 'none') return;

  canvas.style.transform = 'none';
  resizeCanvas();
  const size = map.getSize();
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  const zoom = map.getZoom();
  const worldSize = 256 * Math.pow(2, zoom);
  const origin = map.getPixelOrigin();
  const pane = map.layerPointToContainerPoint([0, 0]);
  const offsetX = origin.x - pane.x;
  const offsetY = origin.y - pane.y;
  drawPaneX = pane.x;
  drawPaneY = pane.y;

  if (!filtered.length) return;

  ctx.setTransform(dpr, 0, 0, dpr, OVERSCAN * dpr, OVERSCAN * dpr);
  const baseWidth = zoom >= 16 ? 3.2 : zoom >= 14 ? 2.6 : zoom >= 12 ? 2.1 : 1.7;

  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  // A single dark pass under every line keeps the colours legible on busy tiles.
  ctx.beginPath();
  for (const feature of filtered) addPath(ctx, feature, worldSize, offsetX, offsetY);
  ctx.strokeStyle = 'rgba(15, 23, 42, 0.32)';
  ctx.lineWidth = baseWidth + 1.6;
  ctx.stroke();

  const groups = new Map();
  for (const feature of filtered) {
    const color = getColorInfo(feature).color;
    let group = groups.get(color);
    if (!group) {
      group = [];
      groups.set(color, group);
    }
    group.push(feature);
  }

  for (const [color, features] of groups) {
    ctx.beginPath();
    for (const feature of features) addPath(ctx, feature, worldSize, offsetX, offsetY);
    ctx.strokeStyle = color;
    ctx.lineWidth = baseWidth;
    ctx.stroke();
  }

  if (selected) {
    ctx.beginPath();
    addPath(ctx, selected, worldSize, offsetX, offsetY);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.95)';
    ctx.lineWidth = baseWidth + 5;
    ctx.stroke();

    ctx.beginPath();
    addPath(ctx, selected, worldSize, offsetX, offsetY);
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = baseWidth + 2.5;
    ctx.stroke();

    ctx.beginPath();
    addPath(ctx, selected, worldSize, offsetX, offsetY);
    ctx.strokeStyle = '#22d3ee';
    ctx.lineWidth = baseWidth + 0.5;
    ctx.stroke();
  }
}

function segmentDistanceSq(px, py, x1, y1, x2, y2) {
  let dx = x2 - x1;
  let dy = y2 - y1;
  if (dx === 0 && dy === 0) {
    dx = px - x1;
    dy = py - y1;
    return dx * dx + dy * dy;
  }
  let t = ((px - x1) * dx + (py - y1) * dy) / (dx * dx + dy * dy);
  t = Math.max(0, Math.min(1, t));
  const x = x1 + t * dx;
  const y = y1 + t * dy;
  dx = px - x;
  dy = py - y;
  return dx * dx + dy * dy;
}

function findNearest(point, threshold) {
  if (!map || !filtered.length) return null;

  const zoom = map.getZoom();
  const worldSize = 256 * Math.pow(2, zoom);
  const origin = map.getPixelOrigin();
  const pane = map.layerPointToContainerPoint([0, 0]);
  const offsetX = origin.x - pane.x;
  const offsetY = origin.y - pane.y;
  const px = point.x;
  const py = point.y;
  const limit = threshold * threshold;
  let best = null;
  let bestDistance = limit;

  for (const feature of filtered) {
    const geometry = feature.geom;
    let x1 = geometry[0] * worldSize - offsetX;
    let y1 = geometry[1] * worldSize - offsetY;
    for (let i = 2; i < geometry.length; i += 2) {
      const x2 = geometry[i] * worldSize - offsetX;
      const y2 = geometry[i + 1] * worldSize - offsetY;
      const distance = segmentDistanceSq(px, py, x1, y1, x2, y2);
      if (distance < bestDistance) {
        bestDistance = distance;
        best = feature;
      }
      x1 = x2;
      y1 = y2;
    }
  }

  return best;
}

function onMapClick(event) {
  if (!filtered.length) return;
  const pointerType = event.originalEvent && event.originalEvent.pointerType;
  const threshold = pointerType === 'touch' ? 14 : 8;
  const hit = findNearest(event.containerPoint, threshold);
  if (hit) selectFeature(hit, { fromMap: true });
  else clearSelection();
}

function selectFeature(feature, options) {
  const opts = options || {};
  selected = feature;
  state.selectedId = feature.id;

  if (opts.fromMap) {
    const index = filtered.indexOf(feature);
    if (index >= 0) {
      const page = Math.floor(index / state.pageSize) + 1;
      if (page !== state.page) state.page = page;
    }
  }

  updateDetail();
  renderTable();
  syncSelectionMarker();
  scheduleDraw();
  if (opts.fromTable && window.matchMedia('(max-width: 980px)').matches) {
    const mapCard = $('.map-card');
    if (mapCard) mapCard.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
  if (opts.zoom) fitFeature(feature);
}

function clearSelection() {
  selected = null;
  state.selectedId = null;
  syncSelectionMarker();
  updateDetail();
  renderTable();
  scheduleDraw();
}

function syncSelectionMarker() {
  if (!map) return;
  if (selectionMarker) {
    map.removeLayer(selectionMarker);
    selectionMarker = null;
  }
  if (!selected) return;
  selectionMarker = L.circleMarker([selected.midLat, selected.midLon], {
    pane: 'markerPane',
    radius: 5,
    color: '#0f172a',
    weight: 2,
    fillColor: '#22d3ee',
    fillOpacity: 1,
    interactive: false,
  }).addTo(map);
}

function fitFeature(feature) {
  if (!map) {
    toast('Map is not available');
    return;
  }
  const bounds = feature.bounds;
  let paddingTopLeft = [60, 60];
  let paddingBottomRight = [60, 60];
  if (window.matchMedia('(max-width: 980px)').matches) {
    const size = map.getSize();
    const card = $('#detailCard');
    const cardHeight = card && !card.hidden ? card.getBoundingClientRect().height : 0;
    const bottom = Math.max(180, Math.min(cardHeight + 24, size.y - 90));
    paddingTopLeft = [30, 70];
    paddingBottomRight = [30, bottom];
  }
  map.fitBounds(
    [[bounds[0], bounds[1]], [bounds[2], bounds[3]]],
    { paddingTopLeft, paddingBottomRight, maxZoom: 18, animate: true }
  );
}

function fitFiltered() {
  if (!map) {
    toast('Map is not available');
    return;
  }
  if (!filtered.length) {
    toast('No segments to fit');
    return;
  }

  let minLat = Infinity;
  let minLon = Infinity;
  let maxLat = -Infinity;
  let maxLon = -Infinity;
  for (const feature of filtered) {
    const bounds = feature.bounds;
    if (bounds[0] < minLat) minLat = bounds[0];
    if (bounds[1] < minLon) minLon = bounds[1];
    if (bounds[2] > maxLat) maxLat = bounds[2];
    if (bounds[3] > maxLon) maxLon = bounds[3];
  }

  if (minLat === maxLat && minLon === maxLon) {
    map.setView([minLat, minLon], 16, { animate: true });
    return;
  }

  map.fitBounds(
    [[minLat, minLon], [maxLat, maxLon]],
    { padding: [30, 30], maxZoom: 17, animate: true }
  );
}

function resetMapView() {
  if (!map) {
    toast('Map is not available');
    return;
  }
  map.fitBounds(
    [[META.bounds[0], META.bounds[1]], [META.bounds[2], META.bounds[3]]],
    { padding: [24, 24], animate: true }
  );
}


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
    }).bindPopup(`<b>Header</b><br>Drainage ID: ${f.properties.DRAINAGE_ID || '-'}`);
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
    }).bindPopup(`<b>Manhole</b><br>Drainage ID: ${f.properties.DRAINAGE_ID || '-'}`);
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
