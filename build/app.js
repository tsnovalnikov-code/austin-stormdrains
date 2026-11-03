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


/* ==========================================================================
   UI: filters, table, statistics
   ========================================================================== */

const ranges = {};
const multiSelects = new Map();
const multiSelectInstances = [];

const RANGE_CONFIG = {
  year: {
    minKey: 'yearMin',
    maxKey: 'yearMax',
    sliderMin: META.yearMin,
    sliderMax: META.yearMax,
    hardMin: META.yearMin,
    hardMax: META.yearMax,
    suffix: '',
  },
  width: {
    minKey: 'widthMin',
    maxKey: 'widthMax',
    sliderMin: 0,
    sliderMax: 120,
    hardMin: 0,
    hardMax: META.widthMax,
    suffix: '"',
  },
  height: {
    minKey: 'heightMin',
    maxKey: 'heightMax',
    sliderMin: 0,
    sliderMax: 96,
    hardMin: 0,
    hardMax: META.heightMax,
    suffix: '"',
  },
  length: {
    minKey: 'lengthMin',
    maxKey: 'lengthMax',
    sliderMin: 0,
    sliderMax: 500,
    hardMin: 0,
    hardMax: Math.ceil(META.maxLengthFt),
    suffix: ' ft',
  },
};

function buildRange(key) {
  const config = RANGE_CONFIG[key];
  const container = document.getElementById(`${key}Range`);
  if (!container) return null;

  const endMin = `${fmtNum(config.sliderMin, 0)}${config.suffix}`;
  const endMax = `${fmtNum(config.sliderMax, 0)}${config.suffix}${config.hardMax > config.sliderMax ? '+' : ''}`;

  container.innerHTML = `
    <div class="range-values">
      <input type="number" class="range-num range-num-min" min="${config.hardMin}" max="${config.hardMax}" step="1" aria-label="${key} minimum">
      <span class="range-to">to</span>
      <input type="number" class="range-num range-num-max" min="${config.hardMin}" max="${config.hardMax}" step="1" aria-label="${key} maximum">
    </div>
    <div class="range-track">
      <div class="range-fill"></div>
      <input type="range" class="range-input range-input-min" min="${config.sliderMin}" max="${config.sliderMax}" step="1" aria-label="${key} minimum slider">
      <input type="range" class="range-input range-input-max" min="${config.sliderMin}" max="${config.sliderMax}" step="1" aria-label="${key} maximum slider">
    </div>
    <div class="range-ends"><span>${endMin}</span><span>${endMax}</span></div>
  `;

  const numMin = $('.range-num-min', container);
  const numMax = $('.range-num-max', container);
  const sliderMin = $('.range-input-min', container);
  const sliderMax = $('.range-input-max', container);
  const fill = $('.range-fill', container);

  function updateFill() {
    const low = clamp(Number(state[config.minKey]), config.sliderMin, config.sliderMax);
    const high = clamp(Number(state[config.maxKey]), config.sliderMin, config.sliderMax);
    const span = config.sliderMax - config.sliderMin || 1;
    const left = ((low - config.sliderMin) / span) * 100;
    const right = ((high - config.sliderMin) / span) * 100;
    fill.style.left = `${left}%`;
    fill.style.width = `${Math.max(0, right - left)}%`;
  }

  function sync() {
    const low = state[config.minKey];
    const high = state[config.maxKey];
    numMin.value = low;
    numMax.value = high;
    sliderMin.value = clamp(low, config.sliderMin, config.sliderMax);
    sliderMax.value = clamp(high, config.sliderMin, config.sliderMax);
    updateFill();
  }

  function readNumbers() {
    let low = numMin.value === '' ? config.hardMin : Number(numMin.value);
    let high = numMax.value === '' ? config.hardMax : Number(numMax.value);
    if (!Number.isFinite(low)) low = config.hardMin;
    if (!Number.isFinite(high)) high = config.hardMax;
    low = clamp(Math.round(low), config.hardMin, config.hardMax);
    high = clamp(Math.round(high), config.hardMin, config.hardMax);
    if (low > high) {
      if (document.activeElement === numMin) high = low;
      else low = high;
    }
    state[config.minKey] = low;
    state[config.maxKey] = high;
    numMin.value = low;
    numMax.value = high;
    sync();
    scheduleApply(140);
  }

  function readSliders() {
    let low = Number(sliderMin.value);
    let high = Number(sliderMax.value);
    if (low > high) {
      if (document.activeElement === sliderMin) high = low;
      else low = high;
    }
    if (document.activeElement === sliderMax && high === config.sliderMax && config.hardMax > config.sliderMax) {
      high = config.hardMax;
    }
    state[config.minKey] = low;
    state[config.maxKey] = high;
    numMin.value = low;
    numMax.value = high;
    sync();
    scheduleApply(100);
  }

  numMin.addEventListener('change', readNumbers);
  numMax.addEventListener('change', readNumbers);
  sliderMin.addEventListener('input', readSliders);
  sliderMax.addEventListener('input', readSliders);

  const component = { sync, config, container };
  ranges[key] = component;
  return component;
}

function buildMultiSelect(config) {
  const container = document.getElementById(config.container);
  if (!container) return null;

  const values = DICT[config.dict] || [];
  const wrap = document.createElement('div');
  wrap.className = 'ms';
  wrap.innerHTML = `
    <button type="button" class="ms-toggle" aria-expanded="false" aria-haspopup="listbox">
      <span class="ms-label">All</span>
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M6 9l6 6 6-6" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>
    </button>
  `;
  container.appendChild(wrap);

  const toggle = $('.ms-toggle', wrap);
  const toggleLabel = $('.ms-label', wrap);

  const panel = document.createElement('div');
  panel.className = 'ms-panel';
  panel.hidden = true;
  panel.setAttribute('role', 'listbox');
  panel.innerHTML = `
    <div class="ms-search"><input type="search" placeholder="Search ${escapeHtml(config.label.toLowerCase())}…" aria-label="Search ${escapeHtml(config.label)}"></div>
    <div class="ms-actions">
      <button type="button" data-act="all">Select all</button>
      <button type="button" data-act="none">Clear</button>
      <span class="ms-total">${values.length} options</span>
    </div>
    <div class="ms-options"></div>
  `;
  document.body.appendChild(panel);

  const search = $('.ms-search input', panel);
  const optionsWrap = $('.ms-options', panel);

  optionsWrap.innerHTML = values.map((value) => {
    const count = VALUE_COUNTS[config.key].get(value) || 0;
    const display = displayCategory(config, value);
    return `
      <label class="ms-option" data-value="${escapeHtml(value)}">
        <input type="checkbox" value="${escapeHtml(value)}" checked>
        <span class="ms-name" title="${escapeHtml(value)}">${escapeHtml(display)}</span>
        <span class="ms-count">${fmtInt(count)}</span>
      </label>
    `;
  }).join('');

  function updateLabel() {
    const selectedValues = state[config.key];
    const total = values.length;
    if (selectedValues.size === total) {
      toggleLabel.textContent = 'All';
    } else if (selectedValues.size === 0) {
      toggleLabel.textContent = 'None';
    } else if (selectedValues.size === 1) {
      toggleLabel.textContent = displayCategory(config, selectedValues.values().next().value);
    } else {
      toggleLabel.textContent = `${selectedValues.size} selected`;
    }
  }

  function sync() {
    const selectedValues = state[config.key];
    $all('input[type="checkbox"]', optionsWrap).forEach((checkbox) => {
      checkbox.checked = selectedValues.has(checkbox.value);
    });
    updateLabel();
  }

  function close() {
    panel.hidden = true;
    toggle.setAttribute('aria-expanded', 'false');
  }

  function positionPanel() {
    const rect = toggle.getBoundingClientRect();
    const width = Math.min(Math.max(rect.width, 276), window.innerWidth - 16);
    let left = rect.left;
    if (left + width > window.innerWidth - 8) left = window.innerWidth - width - 8;
    left = Math.max(8, left);

    let top = rect.bottom + 4;
    let maxHeight = Math.min(340, window.innerHeight - top - 10);
    if (maxHeight < 190) {
      top = Math.max(8, rect.top - 344);
      maxHeight = Math.min(340, rect.bottom - top - 8);
    }

    panel.style.width = `${width}px`;
    panel.style.left = `${left}px`;
    panel.style.top = `${top}px`;
    panel.style.maxHeight = `${Math.max(180, maxHeight)}px`;
  }

  function open() {
    closeAllMultiSelects();
    positionPanel();
    panel.hidden = false;
    toggle.setAttribute('aria-expanded', 'true');
    search.value = '';
    $all('.ms-option', panel).forEach((option) => { option.hidden = false; });
  }

  toggle.addEventListener('click', (event) => {
    event.stopPropagation();
    if (panel.hidden) open();
    else close();
  });

  panel.addEventListener('click', (event) => {
    event.stopPropagation();
    const action = event.target.closest('[data-act]');
    if (!action) return;
    if (action.dataset.act === 'all') {
      state[config.key] = new Set(values);
      $all('input[type="checkbox"]', optionsWrap).forEach((checkbox) => { checkbox.checked = true; });
    } else {
      state[config.key] = new Set();
      $all('input[type="checkbox"]', optionsWrap).forEach((checkbox) => { checkbox.checked = false; });
    }
    updateLabel();
    scheduleApply(100);
  });

  panel.addEventListener('change', (event) => {
    const checkbox = event.target.closest('input[type="checkbox"]');
    if (!checkbox) return;
    if (checkbox.checked) state[config.key].add(checkbox.value);
    else state[config.key].delete(checkbox.value);
    updateLabel();
    scheduleApply(100);
  });

  search.addEventListener('input', () => {
    const query = search.value.trim().toLowerCase();
    $all('.ms-option', panel).forEach((option) => {
      option.hidden = Boolean(query) && !option.textContent.toLowerCase().includes(query);
    });
  });

  const instance = { config, sync, close, panel, toggle };
  multiSelects.set(config.key, instance);
  multiSelectInstances.push(instance);
  return instance;
}

function closeAllMultiSelects() {
  for (const instance of multiSelectInstances) instance.close();
}

function buildFilterUI() {
  buildRange('year');
  buildRange('width');
  buildRange('height');
  buildRange('length');
  for (const config of CAT_CONFIG) buildMultiSelect(config);
}

function syncUI() {
  const search = $('#searchInput');
  if (search) search.value = state.search;

  for (const key of Object.keys(ranges)) ranges[key].sync();
  for (const instance of multiSelectInstances) instance.sync();

  const yearUnknown = $('#yearUnknown');
  if (yearUnknown) yearUnknown.checked = state.yearUnknown;
  const widthUnknown = $('#widthUnknown');
  if (widthUnknown) widthUnknown.checked = state.widthUnknown;
  const heightUnknown = $('#heightUnknown');
  if (heightUnknown) heightUnknown.checked = state.heightUnknown;
  const commentsOnly = $('#commentsOnly');
  if (commentsOnly) commentsOnly.checked = state.commentsOnly;

  const createdFrom = $('#createdFrom');
  if (createdFrom) createdFrom.value = state.createdFrom;
  const createdTo = $('#createdTo');
  if (createdTo) createdTo.value = state.createdTo;
  const modifiedFrom = $('#modifiedFrom');
  if (modifiedFrom) modifiedFrom.value = state.modifiedFrom;
  const modifiedTo = $('#modifiedTo');
  if (modifiedTo) modifiedTo.value = state.modifiedTo;

  const colorBy = $('#colorBy');
  if (colorBy) colorBy.value = state.colorBy;
  const sortKey = $('#sortKey');
  if (sortKey) sortKey.value = state.sortKey;
  const sortDir = $('#sortDir');
  if (sortDir) {
    sortDir.textContent = state.sortDir === 'asc' ? '↑' : '↓';
    sortDir.title = state.sortDir === 'asc' ? 'Ascending' : 'Descending';
    sortDir.setAttribute('aria-label', state.sortDir === 'asc' ? 'Sort ascending' : 'Sort descending');
  }
  const pageSize = $('#pageSize');
  if (pageSize) pageSize.value = String(state.pageSize);

  updateQuickChips();
}

/* -------------------------------------------------------------------------- */
/* Quick filter chips                                                         */
/* -------------------------------------------------------------------------- */

function isQuickActive(key) {
  if (key === 'pre1970') {
    return state.yearMin === META.yearMin
      && state.yearMax === Math.min(1969, META.yearMax)
      && !state.yearUnknown;
  }
  if (key === 'since2010') {
    return state.yearMin === Math.max(2010, META.yearMin)
      && state.yearMax === META.yearMax
      && !state.yearUnknown;
  }
  if (key === 'wide36') {
    return state.widthMin === 36 && state.widthMax >= META.widthMax;
  }
  if (key === 'long200') {
    return state.lengthMin === 200 && state.lengthMax >= Math.ceil(META.maxLengthFt);
  }
  if (key === 'culvert') {
    return state.subtypes.size === 1 && state.subtypes.has('Culvert');
  }
  if (key === 'txdot') {
    return state.maintenance.size === 1 && state.maintenance.has('TxDOT');
  }
  return false;
}

function applyQuick(key) {
  if (key === 'pre1970') {
    state.yearMin = META.yearMin;
    state.yearMax = Math.min(1969, META.yearMax);
    state.yearUnknown = false;
  } else if (key === 'since2010') {
    state.yearMin = Math.max(2010, META.yearMin);
    state.yearMax = META.yearMax;
    state.yearUnknown = false;
  } else if (key === 'wide36') {
    state.widthMin = 36;
    state.widthMax = META.widthMax;
    state.widthUnknown = false;
  } else if (key === 'long200') {
    state.lengthMin = 200;
    state.lengthMax = Math.ceil(META.maxLengthFt);
  } else if (key === 'culvert') {
    state.subtypes = new Set(['Culvert']);
  } else if (key === 'txdot') {
    state.maintenance = new Set(['TxDOT']);
  }
}

function resetQuick(key) {
  if (key === 'pre1970' || key === 'since2010') {
    state.yearMin = META.yearMin;
    state.yearMax = META.yearMax;
    state.yearUnknown = false;
  } else if (key === 'wide36') {
    state.widthMin = 0;
    state.widthMax = META.widthMax;
    state.widthUnknown = false;
  } else if (key === 'long200') {
    state.lengthMin = 0;
    state.lengthMax = Math.ceil(META.maxLengthFt);
  } else if (key === 'culvert') {
    state.subtypes = new Set(DICT.subtype);
  } else if (key === 'txdot') {
    state.maintenance = new Set(DICT.maintenance);
  }
}

function updateQuickChips() {
  $all('.quick-chip').forEach((chip) => {
    chip.classList.toggle('active', isQuickActive(chip.dataset.quick));
  });
}

/* -------------------------------------------------------------------------- */
/* Statistics                                                                 */
/* -------------------------------------------------------------------------- */

function updateStats() {
  let totalLength = 0;
  let minYear = Infinity;
  let maxYear = -Infinity;
  let knownYears = 0;

  for (const feature of filtered) {
    if (feature.length != null) totalLength += feature.length;
    if (feature.year != null) {
      knownYears += 1;
      if (feature.year < minYear) minYear = feature.year;
      if (feature.year > maxYear) maxYear = feature.year;
    }
  }

  const average = filtered.length ? totalLength / filtered.length : 0;
  const parts = [`<b>${fmtInt(filtered.length)}</b> of <b>${fmtInt(META.count)}</b> segments`];
  if (filtered.length) {
    parts.push(`<b>${fmtMiles(totalLength)}</b>`);
    parts.push(`avg <b>${fmtNum(average, 0)} ft</b>`);
    if (knownYears) parts.push(`built <b>${minYear}–${maxYear}</b>`);
  }
  const summary = $('#resultSummary');
  if (summary) summary.innerHTML = parts.join(' · ');

  const mapStatus = $('#mapStatus');
  if (mapStatus) mapStatus.textContent = `${fmtInt(filtered.length)} shown`;
}

/* -------------------------------------------------------------------------- */
/* Table                                                                      */
/* -------------------------------------------------------------------------- */

function updateSortIndicators() {
  $all('th[data-sort]').forEach((th) => {
    const active = th.dataset.sort === state.sortKey;
    th.setAttribute('aria-sort', active ? (state.sortDir === 'asc' ? 'ascending' : 'descending') : 'none');
    const arrow = $('.arrow', th);
    if (arrow) arrow.textContent = active ? (state.sortDir === 'asc' ? '▲' : '▼') : '';
  });
}

function updateSortUI() {
  const sortKey = $('#sortKey');
  if (sortKey) sortKey.value = state.sortKey;
  const sortDir = $('#sortDir');
  if (sortDir) {
    sortDir.textContent = state.sortDir === 'asc' ? '↑' : '↓';
    sortDir.title = state.sortDir === 'asc' ? 'Ascending' : 'Descending';
    sortDir.setAttribute('aria-label', state.sortDir === 'asc' ? 'Sort ascending' : 'Sort descending');
  }
}

function renderTable() {
  const tbody = $('#tableBody');
  if (!tbody) return;

  const total = filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / state.pageSize));
  if (state.page > totalPages) state.page = totalPages;
  const start = (state.page - 1) * state.pageSize;
  const end = Math.min(start + state.pageSize, total);
  const pageRows = filtered.slice(start, end);

  if (!pageRows.length) {
    tbody.innerHTML = `
      <tr>
        <td colspan="10" class="empty">
          <b>No segments match these filters.</b><br>
          <button type="button" class="link-btn" data-action="reset-filters">Reset filters</button>
        </td>
      </tr>
    `;
  } else {
    tbody.innerHTML = pageRows.map((feature) => {
      const info = getColorInfo(feature);
      return `
        <tr data-id="${feature.id}" class="${feature.id === state.selectedId ? 'selected' : ''}">
          <td class="col-id"><span class="dot" style="background:${info.color}" title="${escapeHtml(info.label)}"></span>${feature.id}</td>
          <td>${feature.year == null ? '—' : feature.year}</td>
          <td>${escapeHtml(feature.subtype)}</td>
          <td class="num">${feature.width == null ? '—' : fmtNum(feature.width, 0)}</td>
          <td class="num">${feature.height == null ? '—' : fmtNum(feature.height, 0)}</td>
          <td class="num">${feature.length == null ? '—' : fmtNum(feature.length, 1)}</td>
          <td title="${escapeHtml(feature.material)}">${escapeHtml(materialShort(feature.material))}</td>
          <td>${escapeHtml(feature.watershed)}</td>
          <td title="${escapeHtml(feature.maintenance)}">${escapeHtml(maintenanceShort(feature.maintenance))}</td>
          <td>${feature.dateBuilt || '—'}</td>
        </tr>
      `;
    }).join('');
  }

  const pageInfo = $('#pageInfo');
  if (pageInfo) {
    pageInfo.textContent = total
      ? `Showing ${fmtInt(start + 1)}–${fmtInt(end)} of ${fmtInt(total)} · Page ${state.page} of ${totalPages}`
      : 'No results';
  }

  const firstPage = $('#firstPage');
  const prevPage = $('#prevPage');
  const nextPage = $('#nextPage');
  const lastPage = $('#lastPage');
  if (firstPage) firstPage.disabled = state.page <= 1;
  if (prevPage) prevPage.disabled = state.page <= 1;
  if (nextPage) nextPage.disabled = state.page >= totalPages;
  if (lastPage) lastPage.disabled = state.page >= totalPages;

  updateSortIndicators();
}

function scheduleApply(delay) {
  if (applyTimer) clearTimeout(applyTimer);
  applyTimer = setTimeout(() => {
    applyTimer = 0;
    applyFilters();
  }, delay == null ? 140 : delay);
}


/* ==========================================================================
   UI: legend, detail panel, export, toast
   ========================================================================== */

let legendCollapsed = window.matchMedia('(max-width: 640px)').matches;

function setColorMode(value) {
  if (!COLOR_MODES.some((mode) => mode.value === value)) return;
  state.colorBy = value;
  const toolbar = $('#colorBy');
  if (toolbar) toolbar.value = value;
  updateLegend();
  renderTable();
  scheduleDraw();
}

function updateLegend() {
  const legend = $('#legend');
  if (!legend) return;

  const items = legendItems();
  const options = COLOR_MODES.map((mode) => (
    `<option value="${mode.value}"${mode.value === state.colorBy ? ' selected' : ''}>${escapeHtml(mode.label)}</option>`
  )).join('');
  legend.classList.toggle('collapsed', legendCollapsed);

  legend.innerHTML = `
    <div class="legend-head">
      <span class="legend-title">Legend</span>
      <select id="legendMode" class="legend-mode-select" aria-label="Legend category" title="Change map colors and legend">${options}</select>
      <button type="button" class="legend-toggle" id="legendToggle" aria-expanded="${!legendCollapsed}" aria-label="${legendCollapsed ? 'Expand legend' : 'Collapse legend'}">${legendCollapsed ? '▸' : '▾'}</button>
    </div>
    <div class="legend-list">
      ${items.length ? items.map((item) => `
        <div class="legend-item${item.count === 0 ? ' zero' : ''}" title="${escapeHtml(item.label)}">
          <span class="swatch" style="background:${item.color}"></span>
          <span class="legend-label">${escapeHtml(item.label)}</span>
          <span class="legend-count">${fmtInt(item.count)}</span>
        </div>
      `).join('') : '<div class="legend-empty">No segments match the current filters.</div>'}
    </div>
  `;

  const modeSelect = $('#legendMode');
  if (modeSelect) {
    modeSelect.addEventListener('change', () => setColorMode(modeSelect.value));
  }

  const toggle = $('#legendToggle');
  if (toggle) {
    toggle.addEventListener('click', () => {
      legendCollapsed = !legendCollapsed;
      legend.classList.toggle('collapsed', legendCollapsed);
      toggle.setAttribute('aria-expanded', String(!legendCollapsed));
      toggle.setAttribute('aria-label', legendCollapsed ? 'Expand legend' : 'Collapse legend');
      toggle.textContent = legendCollapsed ? '▸' : '▾';
    });
  }
}

function updateDetail() {
  const card = $('#detailCard');
  if (!card) return;

  if (!selected) {
    card.hidden = true;
    card.innerHTML = '';
    return;
  }

  const feature = selected;
  const size = fmtSize(feature);
  const yearText = feature.year == null ? 'Year unknown' : `Built ${feature.year}`;
  const comments = feature.comments
    ? `<div class="detail-comment"><span>Comments</span><p>${escapeHtml(feature.comments).replace(/\n/g, '<br>')}</p></div>`
    : '';

  card.hidden = false;
  card.innerHTML = `
    <div class="detail-head">
      <div>
        <div class="detail-kicker">Drainage ID</div>
        <h2>${feature.id}</h2>
      </div>
      <button type="button" class="icon-btn" id="detailClose" aria-label="Close details">&times;</button>
    </div>
    <div class="detail-chips">
      <span class="chip accent">${escapeHtml(yearText)}</span>
      <span class="chip">${escapeHtml(size)}</span>
      <span class="chip">${fmtNum(feature.length, 1)} ft</span>
      <span class="chip">${escapeHtml(materialShort(feature.material))}</span>
    </div>
    <div class="detail-actions">
      <button type="button" class="btn primary" id="detailZoom">Zoom to segment</button>
      <button type="button" class="btn" id="detailCopy">Copy ID</button>
    </div>
    <div class="detail-grid">
      <div><span>Type</span><b>${escapeHtml(feature.subtype)}</b></div>
      <div><span>Structure</span><b>${escapeHtml(feature.shape)}</b></div>
      <div><span>Material</span><b>${escapeHtml(feature.material)}</b></div>
      <div><span>Watershed</span><b>${escapeHtml(feature.watershed)}</b></div>
      <div><span>Maintenance</span><b>${escapeHtml(feature.maintenance)}</b></div>
      <div><span>Width / height</span><b>${feature.width == null && feature.height == null ? '—' : `${fmtInches(feature.width)} / ${fmtInches(feature.height)}`}</b></div>
      <div><span>Year built</span><b>${feature.year == null ? '—' : feature.year}</b></div>
      <div><span>Date built</span><b>${fmtDate(feature.dateBuilt)}</b></div>
      <div><span>Record created</span><b>${fmtDate(feature.created)}</b></div>
      <div><span>Last modified</span><b>${fmtDate(feature.modified)}</b></div>
      <div><span>Up node</span><b>${feature.upNode == null ? '—' : `${feature.upNode} · ${escapeHtml(feature.upNodeType)}`}</b></div>
      <div><span>Down node</span><b>${feature.dnNode == null ? '—' : `${feature.dnNode} · ${escapeHtml(feature.dnNodeType)}`}</b></div>
    </div>
    ${comments}
    <details class="detail-more">
      <summary>Coordinates &amp; sources</summary>
      <div class="detail-grid">
        <div><span>Location source</span><b>${escapeHtml(feature.locSource)}</b></div>
        <div><span>Dimension source</span><b>${escapeHtml(feature.dimSource)}</b></div>
        <div><span>Start (lon, lat)</span><b>${feature.startLon.toFixed(6)}, ${feature.startLat.toFixed(6)}</b></div>
        <div><span>End (lon, lat)</span><b>${feature.endLon.toFixed(6)}, ${feature.endLat.toFixed(6)}</b></div>
      </div>
    </details>
  `;

  const close = $('#detailClose');
  if (close) close.addEventListener('click', clearSelection);
  const zoom = $('#detailZoom');
  if (zoom) zoom.addEventListener('click', () => fitFeature(feature));
  const copy = $('#detailCopy');
  if (copy) copy.addEventListener('click', () => copyText(String(feature.id), 'Drainage ID copied'));
}

/* -------------------------------------------------------------------------- */
/* Toast and clipboard                                                        */
/* -------------------------------------------------------------------------- */

function toast(message) {
  const element = $('#toast');
  if (!element) return;
  element.textContent = message;
  element.classList.add('show');
  if (toastTimer) clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    element.classList.remove('show');
    toastTimer = 0;
  }, 2600);
}

async function copyText(text, message) {
  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(text);
      toast(message);
      return;
    }
    throw new Error('Clipboard API unavailable');
  } catch (error) {
    const area = document.createElement('textarea');
    area.value = text;
    area.style.position = 'fixed';
    area.style.opacity = '0';
    document.body.appendChild(area);
    area.select();
    try {
      document.execCommand('copy');
      toast(message);
    } catch (copyError) {
      toast('Could not copy to clipboard');
    }
    area.remove();
  }
}

/* -------------------------------------------------------------------------- */
/* CSV export                                                                 */
/* -------------------------------------------------------------------------- */

function exportCsv() {
  if (!filtered.length) {
    toast('No segments to export');
    return;
  }

  toast(`Preparing ${fmtInt(filtered.length)} rows…`);

  setTimeout(() => {
    const headers = [
      'OBJECTID', 'DRAINAGE_ID', 'SUBTYPE', 'YEAR_BUILT', 'DATE_BUILT', 'WIDTH_in', 'HEIGHT_in',
      'SHAPE_LEN_ft', 'MATERIAL', 'STRUCT_SHAPE', 'WATERSHED', 'MAINTENANCE', 'CREATED_DATE',
      'MODIFIED_DATE', 'UP_NODE_ID', 'DN_NODE_ID', 'UP_NODE_TYPE', 'DN_NODE_TYPE',
      'LOCATION_SOURCE', 'DIMEN_SOURCE', 'COMMENTS', 'START_LON', 'START_LAT', 'END_LON', 'END_LAT',
    ];
    const lines = [headers.join(',')];

    for (const feature of filtered) {
      const row = [
        feature.oid,
        feature.id,
        feature.subtype,
        feature.year == null ? '' : feature.year,
        feature.dateBuilt || '',
        feature.width == null ? '' : feature.width,
        feature.height == null ? '' : feature.height,
        feature.length == null ? '' : feature.length,
        feature.material,
        feature.shape,
        feature.watershed,
        feature.maintenance,
        feature.created || '',
        feature.modified || '',
        feature.upNode == null ? '' : feature.upNode,
        feature.dnNode == null ? '' : feature.dnNode,
        feature.upNodeType,
        feature.dnNodeType,
        feature.locSource,
        feature.dimSource,
        feature.comments || '',
        feature.startLon.toFixed(6),
        feature.startLat.toFixed(6),
        feature.endLon.toFixed(6),
        feature.endLat.toFixed(6),
      ];
      lines.push(row.map(csvEscape).join(','));
    }

    const blob = new Blob([`\ufeff${lines.join('\r\n')}`], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const now = new Date();
    const pad = (value) => String(value).padStart(2, '0');
    link.href = url;
    link.download = `austin_private_pipes_filtered_${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}_${pad(now.getHours())}${pad(now.getMinutes())}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 5000);
    toast(`Exported ${fmtInt(filtered.length)} segments`);
  }, 40);
}


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


/* ==========================================================================
   Bootstrap and event wiring
   ========================================================================== */

function setHeaderStats() {
  const statCount = $('#statCount');
  if (statCount) statCount.textContent = fmtInt(META.count);
  const statMiles = $('#statMiles');
  if (statMiles) statMiles.textContent = fmtNum(META.totalLengthMiles, 1);
  const statYears = $('#statYears');
  if (statYears) statYears.textContent = `${META.yearMin}–${META.yearMax}`;
  const footerStats = $('#footerStats');
  if (footerStats) footerStats.textContent = `${fmtInt(META.count)} segments · ${fmtMiles(META.totalLengthFt)} total`;
  const aboutCount = $('#aboutCount');
  if (aboutCount) aboutCount.textContent = fmtInt(META.count);
  const aboutMiles = $('#aboutMiles');
  if (aboutMiles) aboutMiles.textContent = fmtNum(META.totalLengthMiles, 2);
  const aboutPulled = $('#aboutPulled');
  if (aboutPulled) aboutPulled.textContent = META.pulledAtLocal || '—';
}

function buildStaticSelects() {
  const colorBy = $('#colorBy');
  if (colorBy) {
    colorBy.innerHTML = COLOR_MODES.map((mode) => `<option value="${mode.value}">${mode.label}</option>`).join('');
  }
  const sortKey = $('#sortKey');
  if (sortKey) {
    sortKey.innerHTML = SORT_OPTIONS.map((option) => `<option value="${option.value}">${option.label}</option>`).join('');
  }
}

function pageCount() {
  return Math.max(1, Math.ceil(filtered.length / state.pageSize));
}

function scrollTableTop() {
  const wrap = $('.table-wrap');
  if (wrap) wrap.scrollTop = 0;
}

function resetFilters() {
  resetStateValues();
  selected = null;
  syncSelectionMarker();
  syncUI();
  applyFilters();
  toast('Filters reset');
}

function setDateBounds(fromId, toId, min, max) {
  const from = document.getElementById(fromId);
  const to = document.getElementById(toId);
  const minDate = min ? min.slice(0, 10) : '';
  const maxDate = max ? max.slice(0, 10) : '';
  if (from) {
    from.min = minDate;
    from.max = maxDate;
  }
  if (to) {
    to.min = minDate;
    to.max = maxDate;
  }
}

function wireDateRange(fromId, toId, fromKey, toKey) {
  const from = document.getElementById(fromId);
  const to = document.getElementById(toId);
  if (!from || !to) return;

  const handler = () => {
    let start = from.value;
    let end = to.value;
    if (start && end && start > end) {
      if (document.activeElement === from) end = start;
      else start = end;
      from.value = start;
      to.value = end;
    }
    state[fromKey] = start;
    state[toKey] = end;
    scheduleApply(140);
  };

  from.addEventListener('change', handler);
  to.addEventListener('change', handler);
}

function updateBodyLock() {
  const modal = $('#aboutBackdrop');
  const sidebar = $('#sidebar');
  const modalOpen = modal && !modal.hidden;
  const sidebarOpen = sidebar && sidebar.classList.contains('open');
  document.body.classList.toggle('no-scroll', Boolean(modalOpen || sidebarOpen));
}

function openAbout() {
  const modal = $('#aboutBackdrop');
  if (!modal) return;
  modal.hidden = false;
  updateBodyLock();
  const close = $('#aboutClose');
  if (close) close.focus();
}

function closeAbout() {
  const modal = $('#aboutBackdrop');
  if (!modal) return;
  modal.hidden = true;
  updateBodyLock();
  const button = $('#aboutBtn');
  if (button) button.focus();
}

function openSidebar() {
  const sidebar = $('#sidebar');
  const backdrop = $('#sidebarBackdrop');
  if (!sidebar || !backdrop) return;
  sidebar.classList.add('open');
  backdrop.hidden = false;
  updateBodyLock();
}

function closeSidebar() {
  const sidebar = $('#sidebar');
  const backdrop = $('#sidebarBackdrop');
  if (!sidebar || !backdrop) return;
  sidebar.classList.remove('open');
  backdrop.hidden = true;
  updateBodyLock();
}

function wireStaticEvents() {
  const search = $('#searchInput');
  if (search) {
    search.addEventListener('input', () => {
      state.search = search.value;
      scheduleApply(180);
    });
  }

  const yearUnknown = $('#yearUnknown');
  if (yearUnknown) {
    yearUnknown.addEventListener('change', () => {
      state.yearUnknown = yearUnknown.checked;
      scheduleApply(100);
    });
  }
  const widthUnknown = $('#widthUnknown');
  if (widthUnknown) {
    widthUnknown.addEventListener('change', () => {
      state.widthUnknown = widthUnknown.checked;
      scheduleApply(100);
    });
  }
  const heightUnknown = $('#heightUnknown');
  if (heightUnknown) {
    heightUnknown.addEventListener('change', () => {
      state.heightUnknown = heightUnknown.checked;
      scheduleApply(100);
    });
  }
  const commentsOnly = $('#commentsOnly');
  if (commentsOnly) {
    commentsOnly.addEventListener('change', () => {
      state.commentsOnly = commentsOnly.checked;
      scheduleApply(100);
    });
  }

  setDateBounds('createdFrom', 'createdTo', META.createdMin, META.createdMax);
  setDateBounds('modifiedFrom', 'modifiedTo', META.modifiedMin, META.modifiedMax);
  wireDateRange('createdFrom', 'createdTo', 'createdFrom', 'createdTo');
  wireDateRange('modifiedFrom', 'modifiedTo', 'modifiedFrom', 'modifiedTo');

  const colorBy = $('#colorBy');
  if (colorBy) {
    colorBy.addEventListener('change', () => setColorMode(colorBy.value));
  }

  const sortKey = $('#sortKey');
  if (sortKey) {
    sortKey.addEventListener('change', () => {
      state.sortKey = sortKey.value;
      state.sortDir = defaultSortDir(state.sortKey);
      state.page = 1;
      updateSortUI();
      resortAndRender();
    });
  }

  const sortDir = $('#sortDir');
  if (sortDir) {
    sortDir.addEventListener('click', () => {
      state.sortDir = state.sortDir === 'asc' ? 'desc' : 'asc';
      state.page = 1;
      updateSortUI();
      resortAndRender();
    });
  }

  const pageSize = $('#pageSize');
  if (pageSize) {
    pageSize.addEventListener('change', () => {
      state.pageSize = Number(pageSize.value) || 50;
      state.page = 1;
      renderTable();
      scrollTableTop();
    });
  }

  const resetFiltersButton = $('#resetFilters');
  if (resetFiltersButton) resetFiltersButton.addEventListener('click', resetFilters);

  const resetView = $('#resetView');
  if (resetView) resetView.addEventListener('click', resetMapView);
  const fitFilteredButton = $('#fitFiltered');
  if (fitFilteredButton) fitFilteredButton.addEventListener('click', fitFiltered);

  for (const id of ['exportBtn', 'exportBtn2']) {
    const button = document.getElementById(id);
    if (button) button.addEventListener('click', exportCsv);
  }

  $all('.quick-chip').forEach((chip) => {
    chip.addEventListener('click', () => {
      const key = chip.dataset.quick;
      if (isQuickActive(key)) resetQuick(key);
      else applyQuick(key);
      syncUI();
      applyFilters();
    });
  });

  $all('th[data-sort]').forEach((th) => {
    th.addEventListener('click', () => {
      const key = th.dataset.sort;
      if (state.sortKey === key) {
        state.sortDir = state.sortDir === 'asc' ? 'desc' : 'asc';
      } else {
        state.sortKey = key;
        state.sortDir = defaultSortDir(key);
      }
      state.page = 1;
      updateSortUI();
      resortAndRender();
    });
  });

  const tbody = $('#tableBody');
  if (tbody) {
    tbody.addEventListener('click', (event) => {
      const reset = event.target.closest('[data-action="reset-filters"]');
      if (reset) {
        resetFilters();
        return;
      }
      const row = event.target.closest('tr[data-id]');
      if (!row) return;
      const feature = BY_ID.get(Number(row.dataset.id));
      if (feature) selectFeature(feature, { zoom: true, fromTable: true });
    });
  }

  const firstPage = $('#firstPage');
  if (firstPage) {
    firstPage.addEventListener('click', () => {
      state.page = 1;
      renderTable();
      scrollTableTop();
    });
  }
  const prevPage = $('#prevPage');
  if (prevPage) {
    prevPage.addEventListener('click', () => {
      state.page = Math.max(1, state.page - 1);
      renderTable();
      scrollTableTop();
    });
  }
  const nextPage = $('#nextPage');
  if (nextPage) {
    nextPage.addEventListener('click', () => {
      state.page = Math.min(pageCount(), state.page + 1);
      renderTable();
      scrollTableTop();
    });
  }
  const lastPage = $('#lastPage');
  if (lastPage) {
    lastPage.addEventListener('click', () => {
      state.page = pageCount();
      renderTable();
      scrollTableTop();
    });
  }

  const aboutButton = $('#aboutBtn');
  if (aboutButton) aboutButton.addEventListener('click', openAbout);
  const aboutClose = $('#aboutClose');
  if (aboutClose) aboutClose.addEventListener('click', closeAbout);
  const aboutBackdrop = $('#aboutBackdrop');
  if (aboutBackdrop) {
    aboutBackdrop.addEventListener('click', (event) => {
      if (event.target === aboutBackdrop) closeAbout();
    });
  }

  const mobileFilters = $('#mobileFilters');
  if (mobileFilters) mobileFilters.addEventListener('click', openSidebar);
  const closeSidebarButton = $('#closeSidebar');
  if (closeSidebarButton) closeSidebarButton.addEventListener('click', closeSidebar);
  const sidebarBackdrop = $('#sidebarBackdrop');
  if (sidebarBackdrop) sidebarBackdrop.addEventListener('click', closeSidebar);

  document.addEventListener('click', (event) => {
    if (event.target.closest('.ms-panel') || event.target.closest('.ms-toggle')) return;
    closeAllMultiSelects();
  });

  document.addEventListener('scroll', (event) => {
    const target = event.target;
    if (target && target.closest && target.closest('.ms-panel')) return;
    closeAllMultiSelects();
  }, true);

  window.addEventListener('resize', closeAllMultiSelects);

  document.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape') return;
    const modal = $('#aboutBackdrop');
    if (modal && !modal.hidden) {
      closeAbout();
      return;
    }
    if (multiSelectInstances.some((instance) => !instance.panel.hidden)) {
      closeAllMultiSelects();
      return;
    }
    const sidebar = $('#sidebar');
    if (sidebar && sidebar.classList.contains('open')) {
      closeSidebar();
      return;
    }
    if (state.selectedId != null) clearSelection();
  });
}

function hideLoading() {
  const loading = $('#loading');
  if (!loading) return;
  loading.classList.add('done');
  setTimeout(() => loading.remove(), 400);
}

function showFatalError(error) {
  console.error(error);
  const loading = $('#loading');
  if (!loading) return;
  loading.innerHTML = `
    <div class="loading-error">
      <b>Could not build the explorer.</b>
      <p>${escapeHtml(error && error.message ? error.message : String(error))}</p>
      <p class="muted">Open the browser console for details.</p>
    </div>
  `;
}

function init() {
  try {
    if (typeof PIPE_DATA === 'undefined') throw new Error('Embedded pipe data was not found.');
    setHeaderStats();
    buildFeatures();
    buildStaticSelects();
    buildFilterUI();
    syncUI();
    wireStaticEvents();
    initMap();
    applyFilters();
    // Give the map one layout pass to settle before revealing the page.
    setTimeout(hideLoading, 260);
  } catch (error) {
    showFatalError(error);
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
