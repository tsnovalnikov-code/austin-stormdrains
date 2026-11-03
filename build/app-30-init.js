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
