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
