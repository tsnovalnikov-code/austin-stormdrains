/* ==========================================================================
   Core: data, helpers, state, filtering and sorting
   ========================================================================== */

const DATA = PIPE_DATA;
const META = DATA.meta;
const DICT = DATA.dict;

const R = {
  oid: 0, id: 1, subtype: 2, maintenance: 3, watershed: 4, material: 5, shape: 6,
  width: 7, height: 8, length: 9, year: 10, dateBuilt: 11, created: 12, modified: 13,
  upNode: 14, dnNode: 15, upNodeType: 16, dnNodeType: 17, locSource: 18,
  dimSource: 19, comments: 20, geom: 21,
};

const CAT_CONFIG = [
  { key: 'subtypes', dict: 'subtype', container: 'subtypeFilter', label: 'Subtype' },
  { key: 'materials', dict: 'material', container: 'materialFilter', label: 'Material' },
  { key: 'shapes', dict: 'shape', container: 'shapeFilter', label: 'Structure shape' },
  { key: 'maintenance', dict: 'maintenance', container: 'maintenanceFilter', label: 'Maintenance' },
  { key: 'watersheds', dict: 'watershed', container: 'watershedFilter', label: 'Watershed' },
];

const COLOR_MODES = [
  { value: 'year', label: 'Year built' },
  { value: 'width', label: 'Pipe width' },
  { value: 'height', label: 'Pipe height' },
  { value: 'length', label: 'Segment length' },
  { value: 'subtype', label: 'Subtype' },
  { value: 'material', label: 'Material' },
  { value: 'shape', label: 'Structure shape' },
  { value: 'maintenance', label: 'Maintenance' },
  { value: 'watershed', label: 'Watershed' },
];

const SORT_OPTIONS = [
  { value: 'year', label: 'Year built' },
  { value: 'dateBuilt', label: 'Date built' },
  { value: 'width', label: 'Pipe width' },
  { value: 'height', label: 'Pipe height' },
  { value: 'length', label: 'Segment length' },
  { value: 'created', label: 'Record created' },
  { value: 'modified', label: 'Last modified' },
  { value: 'id', label: 'Drainage ID' },
  { value: 'oid', label: 'OBJECTID' },
  { value: 'subtype', label: 'Subtype' },
  { value: 'material', label: 'Material' },
  { value: 'shape', label: 'Structure shape' },
  { value: 'watershed', label: 'Watershed' },
  { value: 'maintenance', label: 'Maintenance' },
];

const YEAR_BINS = [
  { max: 1949, label: '1915–1949', color: '#0d0887', key: 'y0' },
  { max: 1959, label: '1950–1959', color: '#46039f', key: 'y1' },
  { max: 1969, label: '1960–1969', color: '#7201a8', key: 'y2' },
  { max: 1979, label: '1970–1979', color: '#9c179e', key: 'y3' },
  { max: 1989, label: '1980–1989', color: '#bd3786', key: 'y4' },
  { max: 1999, label: '1990–1999', color: '#d8576b', key: 'y5' },
  { max: 2009, label: '2000–2009', color: '#ed7953', key: 'y6' },
  { max: 2019, label: '2010–2019', color: '#fb9f3a', key: 'y7' },
  { max: 2025, label: '2020–2025', color: '#f0f921', key: 'y8' },
];

const WIDTH_BINS = [
  { max: 11.999, label: '0–11"', color: '#fde725', key: 'w0' },
  { max: 17.999, label: '12–17"', color: '#d9ed56', key: 'w1' },
  { max: 23.999, label: '18–23"', color: '#a8db4c', key: 'w2' },
  { max: 29.999, label: '24–29"', color: '#6ece58', key: 'w3' },
  { max: 35.999, label: '30–35"', color: '#35b779', key: 'w4' },
  { max: 47.999, label: '36–47"', color: '#1f9e89', key: 'w5' },
  { max: 59.999, label: '48–59"', color: '#26828e', key: 'w6' },
  { max: 95.999, label: '60–95"', color: '#31688e', key: 'w7' },
  { max: Infinity, label: '96"+', color: '#482878', key: 'w8' },
];

const HEIGHT_BINS = [
  { max: 11.999, label: '0–11"', color: '#dbeafe', key: 'h0' },
  { max: 17.999, label: '12–17"', color: '#bfdbfe', key: 'h1' },
  { max: 23.999, label: '18–23"', color: '#93c5fd', key: 'h2' },
  { max: 29.999, label: '24–29"', color: '#60a5fa', key: 'h3' },
  { max: 35.999, label: '30–35"', color: '#3b82f6', key: 'h4' },
  { max: 47.999, label: '36–47"', color: '#2563eb', key: 'h5' },
  { max: 59.999, label: '48–59"', color: '#1d4ed8', key: 'h6' },
  { max: 95.999, label: '60–95"', color: '#1e40af', key: 'h7' },
  { max: Infinity, label: '96"+', color: '#172554', key: 'h8' },
];

const LENGTH_BINS = [
  { max: 24.999, label: '<25 ft', color: '#feedde', key: 'l0' },
  { max: 49.999, label: '25–49 ft', color: '#fdbe85', key: 'l1' },
  { max: 99.999, label: '50–99 ft', color: '#fd8d3c', key: 'l2' },
  { max: 199.999, label: '100–199 ft', color: '#e6550d', key: 'l3' },
  { max: 499.999, label: '200–499 ft', color: '#a63603', key: 'l4' },
  { max: Infinity, label: '500+ ft', color: '#7f2704', key: 'l5' },
];

const UNKNOWN_COLOR = '#94a3b8';

const MATERIAL_COLORS = {
  'Reinforced Concrete Pipe (RCP)': '#2563eb',
  'Corrugated Galvanized Metal Pipe (CGMP)': '#f59e0b',
  'Concrete': '#10b981',
  'High-density Polyethylene (HDPE)': '#8b5cf6',
  'PVC': '#ec4899',
  'Cast Iron (CI)': '#ef4444',
  'Ductile Iron (DI)': '#f97316',
  'Steel': '#06b6d4',
  'Clay': '#a16207',
  'Tin': '#64748b',
  'Brick/Concrete': '#84cc16',
  'Brick': '#b91c1c',
  'No Data': UNKNOWN_COLOR,
};

const MATERIAL_SHORT = {
  'Reinforced Concrete Pipe (RCP)': 'RCP',
  'Corrugated Galvanized Metal Pipe (CGMP)': 'CGMP',
  'High-density Polyethylene (HDPE)': 'HDPE',
  'Cast Iron (CI)': 'Cast Iron',
  'Ductile Iron (DI)': 'Ductile Iron',
};

const SUBTYPE_COLORS = {
  'Storm Drain': '#2563eb',
  'Culvert': '#f59e0b',
  'Lateral': '#10b981',
};

const SHAPE_COLORS = {
  'Circular': '#2563eb',
  'Rectangular (Box)': '#f59e0b',
  'Pipe-arch': '#8b5cf6',
  'Elliptical': '#10b981',
  'Cone': '#ec4899',
  'No Data': UNKNOWN_COLOR,
};

const MAINTENANCE_COLORS = {
  'Other': '#64748b',
  'TxDOT': '#dc2626',
  'City of Austin': '#2563eb',
};

const WATERSHED_COLORS = {};
DICT.watershed.forEach((name, i) => {
  WATERSHED_COLORS[name] = `hsl(${Math.round((i * 137.508) % 360)}, 65%, 45%)`;
});

const CATEGORY_COLORS = {
  subtype: SUBTYPE_COLORS,
  material: MATERIAL_COLORS,
  shape: SHAPE_COLORS,
  maintenance: MAINTENANCE_COLORS,
  watershed: WATERSHED_COLORS,
};

const ALL = [];
const BY_ID = new Map();
const VALUE_COUNTS = {};

let filtered = [];
let selected = null;
let map = null;
let canvas = null;
let ctx = null;
let selectionMarker = null;
let drawRaf = 0;
let applyTimer = 0;
let toastTimer = 0;

/* -------------------------------------------------------------------------- */
/* Small helpers                                                              */
/* -------------------------------------------------------------------------- */

const HTML_ESCAPES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };

function $(selector, root) {
  return (root || document).querySelector(selector);
}

function $all(selector, root) {
  return Array.from((root || document).querySelectorAll(selector));
}

function escapeHtml(value) {
  return String(value == null ? '' : value).replace(/[&<>"']/g, (c) => HTML_ESCAPES[c]);
}

function fmtNum(value, digits) {
  if (value == null || value === '' || !Number.isFinite(Number(value))) return '—';
  return Number(value).toLocaleString('en-US', {
    maximumFractionDigits: digits == null ? 0 : digits,
    minimumFractionDigits: 0,
  });
}

function fmtInt(value) {
  return fmtNum(value, 0);
}

function fmtMiles(feet) {
  const miles = Number(feet || 0) / 5280;
  return miles.toLocaleString('en-US', {
    maximumFractionDigits: miles < 10 ? 2 : 1,
    minimumFractionDigits: 0,
  }) + ' mi';
}

function fmtInches(value) {
  return value == null ? '—' : `${fmtNum(value, 1)}"`;
}

function fmtSize(f) {
  const w = f.width;
  const h = f.height;
  if (w != null && h != null) {
    if (f.shape === 'Circular' || w === h) return fmtInches(w);
    return `${fmtNum(w, 1)}" × ${fmtNum(h, 1)}"`;
  }
  if (w != null) return fmtInches(w);
  if (h != null) return fmtInches(h);
  return '—';
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function fmtDate(value) {
  if (!value) return '—';
  const match = /^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{2}):(\d{2}))?/.exec(String(value));
  if (!match) return String(value);
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  let out = `${MONTHS[month - 1] || match[2]} ${day}, ${year}`;
  if (match[4] != null) {
    let hour = Number(match[4]);
    const suffix = hour >= 12 ? 'PM' : 'AM';
    hour = hour % 12 || 12;
    out += `, ${hour}:${match[5]} ${suffix}`;
  }
  return out;
}

function materialShort(value) {
  return MATERIAL_SHORT[value] || value || '—';
}

function maintenanceShort(value) {
  return value === 'City of Austin' ? 'City' : (value || '—');
}

function displayCategory(config, value) {
  if (config.dict === 'material') return materialShort(value);
  if (config.dict === 'maintenance') return maintenanceShort(value);
  return value;
}

function categoryColor(mode, value) {
  if (value == null || value === '' || value === 'No Data' || value === '—') return UNKNOWN_COLOR;
  const table = CATEGORY_COLORS[mode];
  if (table && table[value]) return table[value];
  return UNKNOWN_COLOR;
}

function csvEscape(value) {
  const text = String(value == null ? '' : value);
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

/* -------------------------------------------------------------------------- */
/* Geometry                                                                   */
/* -------------------------------------------------------------------------- */

function mercatorY(lat) {
  const safe = Math.max(-85.05112878, Math.min(85.05112878, lat));
  const sin = Math.sin((safe * Math.PI) / 180);
  return 0.5 - Math.log((1 + sin) / (1 - sin)) / (4 * Math.PI);
}

function decodeGeometry(encoded) {
  const parts = encoded.split(',');
  const count = parts.length >> 1;
  const norm = new Float64Array(count * 2);
  let x = 0;
  let y = 0;
  let startLon = 0;
  let startLat = 0;
  let midLon = 0;
  let midLat = 0;
  let minLat = Infinity;
  let minLon = Infinity;
  let maxLat = -Infinity;
  let maxLon = -Infinity;
  const midIndex = count >> 1;

  for (let i = 0; i < count; i += 1) {
    x += parseInt(parts[i * 2], 36);
    y += parseInt(parts[i * 2 + 1], 36);
    const lon = x / 100000;
    const lat = y / 100000;
    if (i === 0) {
      startLon = lon;
      startLat = lat;
    }
    if (i === midIndex) {
      midLon = lon;
      midLat = lat;
    }
    if (lat < minLat) minLat = lat;
    if (lat > maxLat) maxLat = lat;
    if (lon < minLon) minLon = lon;
    if (lon > maxLon) maxLon = lon;
    norm[i * 2] = (lon + 180) / 360;
    norm[i * 2 + 1] = mercatorY(lat);
  }

  return {
    norm,
    startLon,
    startLat,
    endLon: x / 100000,
    endLat: y / 100000,
    midLon,
    midLat,
    bounds: [minLat, minLon, maxLat, maxLon],
  };
}

/* -------------------------------------------------------------------------- */
/* Features                                                                   */
/* -------------------------------------------------------------------------- */

function buildFeatures() {
  for (const row of DATA.rows) {
    const geometry = decodeGeometry(row[R.geom]);
    const subtype = DICT.subtype[row[R.subtype]] || '—';
    const maintenance = DICT.maintenance[row[R.maintenance]] || '—';
    const watershed = DICT.watershed[row[R.watershed]] || '—';
    const material = DICT.material[row[R.material]] || '—';
    const shape = DICT.shape[row[R.shape]] || '—';
    const upNodeType = DICT.upNodeType[row[R.upNodeType]] || '—';
    const dnNodeType = DICT.dnNodeType[row[R.dnNodeType]] || '—';
    const locSource = DICT.locSource[row[R.locSource]] || '—';
    const dimSource = DICT.dimSource[row[R.dimSource]] || '—';

    const feature = {
      oid: row[R.oid],
      id: row[R.id],
      subtype,
      maintenance,
      watershed,
      material,
      shape,
      width: row[R.width],
      height: row[R.height],
      length: row[R.length],
      year: row[R.year],
      dateBuilt: row[R.dateBuilt],
      created: row[R.created],
      modified: row[R.modified],
      upNode: row[R.upNode],
      dnNode: row[R.dnNode],
      upNodeType,
      dnNodeType,
      locSource,
      dimSource,
      comments: row[R.comments],
      geom: geometry.norm,
      startLon: geometry.startLon,
      startLat: geometry.startLat,
      endLon: geometry.endLon,
      endLat: geometry.endLat,
      midLon: geometry.midLon,
      midLat: geometry.midLat,
      bounds: geometry.bounds,
      search: '',
    };

    feature.search = [
      feature.id, feature.oid, feature.subtype, feature.maintenance, feature.watershed,
      feature.material, feature.shape, feature.year, feature.dateBuilt, feature.upNode,
      feature.dnNode, feature.upNodeType, feature.dnNodeType, feature.locSource,
      feature.dimSource, feature.comments,
    ].filter((value) => value != null && value !== '').join(' ').toLowerCase();

    ALL.push(feature);
    BY_ID.set(feature.id, feature);
  }

  for (const config of CAT_CONFIG) {
    const counts = new Map();
    for (const feature of ALL) {
      const value = feature[config.dict];
      counts.set(value, (counts.get(value) || 0) + 1);
    }
    VALUE_COUNTS[config.key] = counts;
  }
}

/* -------------------------------------------------------------------------- */
/* State                                                                      */
/* -------------------------------------------------------------------------- */

function defaultState() {
  return {
    search: '',
    subtypes: new Set(DICT.subtype),
    materials: new Set(DICT.material),
    shapes: new Set(DICT.shape),
    maintenance: new Set(DICT.maintenance),
    watersheds: new Set(DICT.watershed),
    yearMin: META.yearMin,
    yearMax: META.yearMax,
    yearUnknown: false,
    widthMin: 0,
    widthMax: META.widthMax,
    widthUnknown: false,
    heightMin: 0,
    heightMax: META.heightMax,
    heightUnknown: false,
    lengthMin: 0,
    lengthMax: Math.ceil(META.maxLengthFt),
    createdFrom: '',
    createdTo: '',
    modifiedFrom: '',
    modifiedTo: '',
    commentsOnly: false,
    colorBy: 'year',
    sortKey: 'year',
    sortDir: 'desc',
    page: 1,
    pageSize: 50,
    selectedId: null,
  };
}

const state = defaultState();

function resetStateValues() {
  const fresh = defaultState();
  state.search = fresh.search;
  state.subtypes = fresh.subtypes;
  state.materials = fresh.materials;
  state.shapes = fresh.shapes;
  state.maintenance = fresh.maintenance;
  state.watersheds = fresh.watersheds;
  state.yearMin = fresh.yearMin;
  state.yearMax = fresh.yearMax;
  state.yearUnknown = fresh.yearUnknown;
  state.widthMin = fresh.widthMin;
  state.widthMax = fresh.widthMax;
  state.widthUnknown = fresh.widthUnknown;
  state.heightMin = fresh.heightMin;
  state.heightMax = fresh.heightMax;
  state.heightUnknown = fresh.heightUnknown;
  state.lengthMin = fresh.lengthMin;
  state.lengthMax = fresh.lengthMax;
  state.createdFrom = fresh.createdFrom;
  state.createdTo = fresh.createdTo;
  state.modifiedFrom = fresh.modifiedFrom;
  state.modifiedTo = fresh.modifiedTo;
  state.commentsOnly = fresh.commentsOnly;
  state.sortKey = fresh.sortKey;
  state.sortDir = fresh.sortDir;
  state.page = 1;
  state.selectedId = null;
}

/* -------------------------------------------------------------------------- */
/* Filtering and sorting                                                      */
/* -------------------------------------------------------------------------- */

function passesFilter(feature, terms) {
  for (const term of terms) {
    if (!feature.search.includes(term)) return false;
  }

  if (state.subtypes.size !== DICT.subtype.length && !state.subtypes.has(feature.subtype)) return false;
  if (state.materials.size !== DICT.material.length && !state.materials.has(feature.material)) return false;
  if (state.shapes.size !== DICT.shape.length && !state.shapes.has(feature.shape)) return false;
  if (state.maintenance.size !== DICT.maintenance.length && !state.maintenance.has(feature.maintenance)) return false;
  if (state.watersheds.size !== DICT.watershed.length && !state.watersheds.has(feature.watershed)) return false;

  const yearActive = state.yearMin > META.yearMin || state.yearMax < META.yearMax;
  if (yearActive) {
    if (feature.year == null) {
      if (!state.yearUnknown) return false;
    } else if (feature.year < state.yearMin || feature.year > state.yearMax) {
      return false;
    }
  }

  const widthActive = state.widthMin > 0 || state.widthMax < META.widthMax;
  if (widthActive) {
    if (feature.width == null) {
      if (!state.widthUnknown) return false;
    } else if (feature.width < state.widthMin || feature.width > state.widthMax) {
      return false;
    }
  }

  const heightActive = state.heightMin > 0 || state.heightMax < META.heightMax;
  if (heightActive) {
    if (feature.height == null) {
      if (!state.heightUnknown) return false;
    } else if (feature.height < state.heightMin || feature.height > state.heightMax) {
      return false;
    }
  }

  const lengthMax = Math.ceil(META.maxLengthFt);
  if (state.lengthMin > 0 || state.lengthMax < lengthMax) {
    if (feature.length == null) return false;
    if (feature.length < state.lengthMin || feature.length > state.lengthMax) return false;
  }

  if (state.createdFrom || state.createdTo) {
    if (!feature.created) return false;
    const created = feature.created.slice(0, 10);
    if (state.createdFrom && created < state.createdFrom) return false;
    if (state.createdTo && created > state.createdTo) return false;
  }

  if (state.modifiedFrom || state.modifiedTo) {
    if (!feature.modified) return false;
    const modified = feature.modified.slice(0, 10);
    if (state.modifiedFrom && modified < state.modifiedFrom) return false;
    if (state.modifiedTo && modified > state.modifiedTo) return false;
  }

  if (state.commentsOnly && !feature.comments) return false;

  return true;
}

function sortValue(feature, key) {
  switch (key) {
    case 'id': return feature.id;
    case 'oid': return feature.oid;
    case 'year': return feature.year;
    case 'dateBuilt': return feature.dateBuilt;
    case 'width': return feature.width;
    case 'height': return feature.height;
    case 'length': return feature.length;
    case 'created': return feature.created;
    case 'modified': return feature.modified;
    case 'subtype': return feature.subtype;
    case 'material': return feature.material;
    case 'shape': return feature.shape;
    case 'watershed': return feature.watershed;
    case 'maintenance': return feature.maintenance;
    default: return feature.id;
  }
}

function sortFiltered() {
  const key = state.sortKey;
  const direction = state.sortDir === 'asc' ? 1 : -1;
  filtered.sort((a, b) => {
    const av = sortValue(a, key);
    const bv = sortValue(b, key);
    if (av == null && bv == null) return a.id - b.id;
    if (av == null) return 1;
    if (bv == null) return -1;
    if (typeof av === 'string' || typeof bv === 'string') {
      const cmp = String(av).localeCompare(String(bv), undefined, { numeric: true, sensitivity: 'base' });
      if (cmp) return cmp * direction;
    } else {
      if (av < bv) return -1 * direction;
      if (av > bv) return 1 * direction;
    }
    return a.id - b.id;
  });
}

function applyFilters(options) {
  const opts = options || {};
  const terms = state.search.trim().toLowerCase().split(/\s+/).filter(Boolean);
  filtered = ALL.filter((feature) => passesFilter(feature, terms));
  sortFiltered();

  if (state.selectedId != null) {
    const stillVisible = filtered.find((feature) => feature.id === state.selectedId);
    if (stillVisible) {
      selected = stillVisible;
    } else {
      selected = null;
      state.selectedId = null;
    }
  } else {
    selected = null;
  }

  if (opts.resetPage !== false) state.page = 1;
  const totalPages = Math.max(1, Math.ceil(filtered.length / state.pageSize));
  if (state.page > totalPages) state.page = totalPages;

  updateStats();
  renderTable();
  updateLegend();
  updateQuickChips();
  updateDetail();
  syncSelectionMarker();
  scheduleDraw();
}

function resortAndRender() {
  sortFiltered();
  state.page = 1;
  updateSortUI();
  renderTable();
}

function defaultSortDir(key) {
  return ['year', 'dateBuilt', 'width', 'height', 'length', 'created', 'modified'].includes(key) ? 'desc' : 'asc';
}

/* -------------------------------------------------------------------------- */
/* Map colours and legend                                                     */
/* -------------------------------------------------------------------------- */

function getColorInfo(feature) {
  const mode = state.colorBy;

  if (mode === 'year') {
    if (feature.year == null) return { color: UNKNOWN_COLOR, label: 'Unknown', key: 'unknown' };
    const bin = YEAR_BINS.find((entry) => feature.year <= entry.max) || YEAR_BINS[YEAR_BINS.length - 1];
    return { color: bin.color, label: bin.label, key: bin.key };
  }

  if (mode === 'width') {
    if (feature.width == null) return { color: UNKNOWN_COLOR, label: 'Unknown', key: 'unknown' };
    const bin = WIDTH_BINS.find((entry) => feature.width <= entry.max) || WIDTH_BINS[WIDTH_BINS.length - 1];
    return { color: bin.color, label: bin.label, key: bin.key };
  }

  if (mode === 'height') {
    if (feature.height == null) return { color: UNKNOWN_COLOR, label: 'Unknown', key: 'unknown' };
    const bin = HEIGHT_BINS.find((entry) => feature.height <= entry.max) || HEIGHT_BINS[HEIGHT_BINS.length - 1];
    return { color: bin.color, label: bin.label, key: bin.key };
  }

  if (mode === 'length') {
    if (feature.length == null) return { color: UNKNOWN_COLOR, label: 'Unknown', key: 'unknown' };
    const bin = LENGTH_BINS.find((entry) => feature.length <= entry.max) || LENGTH_BINS[LENGTH_BINS.length - 1];
    return { color: bin.color, label: bin.label, key: bin.key };
  }

  const value = feature[mode];
  return {
    color: categoryColor(mode, value),
    label: displayCategory({ dict: mode }, value),
    key: value == null ? '—' : value,
  };
}

function colorModeLabel() {
  const found = COLOR_MODES.find((mode) => mode.value === state.colorBy);
  return found ? found.label : state.colorBy;
}

function legendItems() {
  const mode = state.colorBy;

  if (mode === 'year' || mode === 'width' || mode === 'height' || mode === 'length') {
    const bins = mode === 'year' ? YEAR_BINS : mode === 'width' ? WIDTH_BINS : mode === 'height' ? HEIGHT_BINS : LENGTH_BINS;
    const items = bins.map((bin) => ({
      key: bin.key,
      label: bin.label,
      color: bin.color,
      count: 0,
    }));
    const byKey = new Map(items.map((item) => [item.key, item]));
    let unknown = 0;
    for (const feature of filtered) {
      const info = getColorInfo(feature);
      if (info.key === 'unknown') {
        unknown += 1;
      } else {
        const item = byKey.get(info.key);
        if (item) item.count += 1;
      }
    }
    if (unknown > 0) {
      items.push({ key: 'unknown', label: 'Unknown', color: UNKNOWN_COLOR, count: unknown });
    }
    return items;
  }

  const counts = new Map();
  for (const feature of filtered) {
    const info = getColorInfo(feature);
    const item = counts.get(info.key);
    if (item) {
      item.count += 1;
    } else {
      counts.set(info.key, {
        key: info.key,
        label: info.label,
        color: info.color,
        count: 1,
      });
    }
  }

  const items = Array.from(counts.values());
  items.sort((a, b) => {
    const aUnknown = a.key === 'No Data' || a.key === '—';
    const bUnknown = b.key === 'No Data' || b.key === '—';
    if (aUnknown && !bUnknown) return 1;
    if (bUnknown && !aUnknown) return -1;
    return b.count - a.count || String(a.label).localeCompare(String(b.label));
  });
  return items;
}
