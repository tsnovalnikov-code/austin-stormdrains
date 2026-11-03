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
