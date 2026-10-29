import React, {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { createPortal } from 'react-dom';
import { useLocation, useNavigate } from 'react-router-dom';
import { useNotifications } from '../context/NotificationContext';
import { FeedbackState } from './FeedbackPrimitives';
import {
  FiArrowDown,
  FiArrowUp,
  FiCheck,
  FiChevronLeft,
  FiChevronRight,
  FiFilter,
  FiColumns,
  FiList,
  FiMoreHorizontal,
  FiPlus,
  FiSearch,
  FiX,
} from 'react-icons/fi';

const MEMORY_PREFIX = 'somane:unified-index';
const MEMORY_VERSION = 1;
const NAVIGATION_PAGE_KEY = 'somane:unified-index:last-page';
const NAVIGATION_CURRENT_PAGE_KEY = 'somane:navigation:current-page';
const NAVIGATION_PREVIOUS_PAGE_KEY = 'somane:navigation:previous-page';
const NAVIGATION_HISTORY_KEY = 'somane:navigation:history';
const NAVIGATION_CHANGED_EVENT = 'somane:navigation-history-changed';
const DEFAULT_COLUMN_WIDTH = 120;
const MIN_COLUMN_WIDTH = 56;
const SELECT_COLUMN_WIDTH = 44;
const ACTION_COLUMN_WIDTH = 32;
const DEFAULT_ROW_STRIPES = ['bg-white', 'bg-slate-50/70'];

const PAGE_ROUTE_LABELS = [
  ['/comptabilite/dashboard', 'Tableau de bord comptable'],
  ['/comptabilite/pieces', 'Pièces comptables'],
  ['/comptabilite/ecritures', 'Écritures comptables'],
  ['/comptabilite/paiements', 'Paiements'],
  ['/comptabilite/lettrage', 'Lettrage des comptes'],
  ['/comptabilite/journaux', 'Journaux'],
  ['/comptabilite/accounts', 'Comptes comptables'],
  ['/comptabilite/plan-comptable', 'Plan comptable'],
  ['/comptabilite/plans', 'Plans comptables'],
  ['/comptabilite/frameworks', 'Référentiels comptables'],
  ['/comptabilite/groups', 'Classes et groupes'],
  ['/comptabilite/types', 'Types de comptes'],
  ['/comptabilite/sequences', 'Séquences'],
  ['/comptabilite/taux-fiscaux', 'Taxes'],
  ['/comptabilite/withholding-taxes', 'Retenues à la source'],
  ['/partners', 'Partenaires'],
  ['/dashboard', 'Tableau de bord'],
];

const classNames = (...values) => values.filter(Boolean).join(' ');

const getPageLabelFromPath = (pathname) => {
  const match = PAGE_ROUTE_LABELS
    .filter(([route]) => pathname === route || pathname.startsWith(`${route}/`))
    .sort((left, right) => right[0].length - left[0].length)[0];
  if (match) return match[1];
  const segment = pathname.split('/').filter(Boolean).pop() || 'Accueil';
  if (/^\d+$/.test(segment)) return 'Détail';
  return segment
    .replace(/[-_]+/g, ' ')
    .replace(/^./, (letter) => letter.toUpperCase());
};

const readBrowserPreviousPages = () => {
  if (typeof window === 'undefined' || !window.navigation?.entries) return [];
  try {
    const currentIndex = window.navigation.currentEntry?.index;
    const entries = Array.from(window.navigation.entries() || []);
    if (!Number.isInteger(currentIndex) || entries.length === 0) return [];

    const pages = [];
    entries
      .filter((entry) => entry.index < currentIndex)
      .forEach((entry) => {
        const url = new URL(entry.url);
        const path = `${url.pathname}${url.search}`;
        if (pages[pages.length - 1]?.path === path) return;
        pages.push({ path, label: getPageLabelFromPath(url.pathname) });
      });
    return pages.slice(-2);
  } catch {
    return [];
  }
};

const readMemory = (key) => {
  if (!key || typeof window === 'undefined') return null;
  try {
    const parsed = JSON.parse(window.sessionStorage.getItem(`${MEMORY_PREFIX}:${key}`) || 'null');
    return parsed?.version === MEMORY_VERSION ? parsed.state : null;
  } catch {
    return null;
  }
};

const writeMemory = (key, state) => {
  if (!key || typeof window === 'undefined') return;
  try {
    window.sessionStorage.setItem(`${MEMORY_PREFIX}:${key}`, JSON.stringify({
      version: MEMORY_VERSION,
      savedAt: Date.now(),
      state,
    }));
  } catch (error) {
    console.warn(`[UnifiedIndexPage] Impossible de memoriser ${key}`, error);
  }
};

const clearMemory = (key) => {
  if (!key || typeof window === 'undefined') return;
  try {
    window.sessionStorage.removeItem(`${MEMORY_PREFIX}:${key}`);
  } catch {}
};

const readStoredPage = (key) => {
  if (typeof window === 'undefined') return null;
  try {
    return JSON.parse(window.sessionStorage.getItem(key) || 'null');
  } catch {
    return null;
  }
};

const writeLastPage = (page) => {
  if (typeof window === 'undefined' || !page?.path || !page?.label) return;
  try {
    const currentPage = readStoredPage(NAVIGATION_CURRENT_PAGE_KEY)
      || readStoredPage(NAVIGATION_PAGE_KEY);
    if (currentPage?.path && currentPage.path !== page.path) {
      window.sessionStorage.setItem(NAVIGATION_PREVIOUS_PAGE_KEY, JSON.stringify(currentPage));
    }
    const storedHistory = JSON.parse(
      window.sessionStorage.getItem(NAVIGATION_HISTORY_KEY) || '[]',
    );
    const history = Array.isArray(storedHistory) ? storedHistory : [];
    if (history[history.length - 1]?.path === page.path) {
      history[history.length - 1] = page;
    } else {
      history.push(page);
    }
    window.sessionStorage.setItem(NAVIGATION_HISTORY_KEY, JSON.stringify(history.slice(-20)));
    window.sessionStorage.setItem(NAVIGATION_CURRENT_PAGE_KEY, JSON.stringify(page));
    window.sessionStorage.setItem(NAVIGATION_PAGE_KEY, JSON.stringify(page));
    window.dispatchEvent(new CustomEvent(NAVIGATION_CHANGED_EVENT));
  } catch {}
};

const readPreviousPages = (currentPath) => {
  const storedHistory = readStoredPage(NAVIGATION_HISTORY_KEY);
  const history = (Array.isArray(storedHistory) ? storedHistory : [])
    .filter((page) => page?.path && page?.label);

  // La derniere entree est la page affichee. Une ancienne visite de cette meme
  // page reste dans l'historique et doit conserver sa vraie place chronologique.
  const visitsBeforeCurrent = history[history.length - 1]?.path === currentPath
    ? history.slice(0, -1)
    : history;

  return visitsBeforeCurrent.slice(-2);
};

const getValue = (row, column) => {
  if (typeof column.value === 'function') return column.value(row);
  return row?.[column.dataIndex || column.id];
};

const resolveRowKey = (row, rowKey) => (
  typeof rowKey === 'function' ? rowKey(row) : row?.[rowKey]
);

const resolveButtonClass = (variant = 'default') => ({
  primary: 'somane-btn--primary',
  success: 'somane-btn--success',
  danger: 'somane-btn--danger',
  warning: 'somane-btn--warning',
  default: 'somane-btn--secondary',
}[variant] || 'somane-btn--secondary');

/**
 * Moule visuel commun des pages index.
 * La page appelante garde ses API, ses filtres, ses regroupements et ses actions metier.
 */
export default function UnifiedIndexPage({
  title,
  rows = [],
  columns = [],
  rowKey = 'id',
  loading = false,
  error = '',
  success = '',
  messageDuration,
  onDismissError,
  onDismissSuccess,
  emptyText = 'Aucune donnee',
  loadingText = 'Chargement...',
  onRetry,
  onClearFilters,

  memoryKey,
  memoryState = {},
  onRestoreMemoryState,
  onMemoryReady,
  rememberSelection = true,

  searchValue,
  defaultSearchValue = '',
  onSearchChange,
  searchPlaceholder = 'Rechercher...',
  searchActions = [],
  renderToolbarExtension,
  filterChips = [],
  onRemoveFilterChip,
  renderFilters,
  onFiltersOpen,
  filterPanelWidth = 900,
  filterPanelCustomContent = false,
  groupByOptions,
  onGroupByChange,

  primaryAction,
  leadingActions = [],
  trailingActions = [],
  selectionActions = [],
  renderSelectionSummary,

  selectable = true,
  selectedRowKeys,
  defaultSelectedRowKeys = [],
  onSelectionChange,
  onRowOpen,
  onRowClick,
  onRowDoubleClick,
  getRowClassName,
  renderRow,
  renderBody,
  renderContent,
  renderCollectionCard,
  kanbanSummaryColumns = [],
  stripedRows = true,
  rowStripeClassNames = DEFAULT_ROW_STRIPES,

  page,
  defaultPage = 1,
  onPageChange,
  pageSize,
  defaultPageSize = 15,
  total,
  serverSide = false,
  visibleColumnIds,
  defaultVisibleColumnIds,
  onVisibleColumnsChange,
  columnWidths: controlledColumnWidths,
  onColumnWidthsChange,
  allowColumnResize = true,
  allowColumnVisibility = true,

  sortColumn: controlledSortColumn,
  sortDirection: controlledSortDirection,
  defaultSortColumn = null,
  defaultSortDirection = 'asc',
  onSortChange,
  allowColumnSort = true,

  onBack,
  showHistoryNavigation = true,
  previousPageLabel,
  previousPagePath,
  lockMainScroll = true,
  pullToHeader = 24,
  className = '',
  toolbarClassName = '',
  viewModes = ['list', 'kanban'],
  viewModeLabels = {},
  kanbanGroupBy,
  kanbanLayout = 'grid',
  disableGrouping = false,
  description,
  pageSummary = [],
}) {
  const { notify } = useNotifications();
  const navigate = useNavigate();
  const location = useLocation();
  const isAccountingModulePage = location.pathname.startsWith('/comptabilite/');
  const currentPagePath = `${location.pathname}${location.search}`;
  const resolvePreviousPages = useCallback(() => {
    const chronologicalPages = readPreviousPages(currentPagePath);
    if (chronologicalPages.length >= 2) return chronologicalPages;

    const statePages = Array.isArray(location.state?.previousPages)
      ? location.state.previousPages
      : [location.state?.previousPage || location.state?.fromPage].filter(Boolean);
    const explicitPage = previousPageLabel || previousPagePath
      ? [{ label: previousPageLabel || 'Page précédente', path: previousPagePath }]
      : [];
    const pages = [
      ...readBrowserPreviousPages(),
      ...chronologicalPages,
      ...statePages,
      ...explicitPage,
    ]
      .filter((page) => page?.path && page?.label);
    const orderedPages = [];
    pages.forEach((page) => {
      if (orderedPages[orderedPages.length - 1]?.path === page.path) return;
      orderedPages.push(page);
    });
    return orderedPages.slice(-2);
  }, [currentPagePath, location.state, previousPageLabel, previousPagePath]);
  const [previousPages, setPreviousPages] = useState(resolvePreviousPages);
  const rootRef = useRef(null);
  const tableScrollRef = useRef(null);
  const fixedHeaderScrollRef = useRef(null);
  const bodyTableRef = useRef(null);
  const filterButtonRef = useRef(null);
  const filterPanelRef = useRef(null);
  const columnsButtonRef = useRef(null);
  const columnsPanelRef = useRef(null);
  const saveTimerRef = useRef(null);
  const rowClickTimerRef = useRef(null);
  const restoreScrollRef = useRef(null);
  const stateSnapshotRef = useRef(null);
  const dismissErrorRef = useRef(onDismissError);
  const dismissSuccessRef = useRef(onDismissSuccess);
  dismissErrorRef.current = onDismissError;
  dismissSuccessRef.current = onDismissSuccess;

  const resolvedMemoryKey = useMemo(() => (
    memoryKey || `${location.pathname}${location.search}`
  ), [location.pathname, location.search, memoryKey]);
  const initialMemoryRef = useRef(readMemory(resolvedMemoryKey));
  const initialMemory = initialMemoryRef.current || {};

  useEffect(() => {
    writeLastPage({ label: title, path: currentPagePath });
  }, [currentPagePath, title]);

  useEffect(() => {
    const synchronizePreviousPages = () => setPreviousPages(resolvePreviousPages());
    window.addEventListener(NAVIGATION_CHANGED_EVENT, synchronizePreviousPages);
    synchronizePreviousPages();
    return () => window.removeEventListener(NAVIGATION_CHANGED_EVENT, synchronizePreviousPages);
  }, [resolvePreviousPages]);

  const [internalSearch, setInternalSearch] = useState(
    typeof initialMemory.search === 'string' ? initialMemory.search : defaultSearchValue,
  );
  const [internalSelectedKeys, setInternalSelectedKeys] = useState(() => (
    rememberSelection && Array.isArray(initialMemory.selectedRowKeys)
      ? initialMemory.selectedRowKeys
      : defaultSelectedRowKeys
  ));
  const [internalPage, setInternalPage] = useState(Number(initialMemory.page) || defaultPage);
  const [internalPageSize] = useState(Number(initialMemory.pageSize) || defaultPageSize);
  const [internalColumnWidths, setInternalColumnWidths] = useState(() => (
    initialMemory.columnWidths && typeof initialMemory.columnWidths === 'object'
      ? initialMemory.columnWidths
      : {}
  ));
  const [tableViewportWidth, setTableViewportWidth] = useState(0);
  const [internalVisibleIds, setInternalVisibleIds] = useState(() => {
    if (Array.isArray(initialMemory.visibleColumnIds)) return initialMemory.visibleColumnIds;
    if (Array.isArray(defaultVisibleColumnIds)) return defaultVisibleColumnIds;
    return columns.filter((column) => column.defaultVisible !== false).map((column) => column.id);
  });
  const [internalSortColumn, setInternalSortColumn] = useState(
    initialMemory.sortColumn || defaultSortColumn,
  );
  const [internalSortDirection, setInternalSortDirection] = useState(
    initialMemory.sortDirection || defaultSortDirection,
  );
  const [groupBy, setGroupBy] = useState(() => (
    Array.isArray(initialMemory.groupBy) ? initialMemory.groupBy : []
  ));
  const [viewMode, setViewMode] = useState(
    viewModes.includes(initialMemory.viewMode) ? initialMemory.viewMode : 'list',
  );
  const [showFilters, setShowFilters] = useState(false);
  const [showColumns, setShowColumns] = useState(false);
  const [filterPanelPosition, setFilterPanelPosition] = useState({ top: 0, left: 0 });
  const [columnsPanelPosition, setColumnsPanelPosition] = useState({ top: 0, left: 0 });
  const lastErrorRef = useRef('');
  const lastSuccessRef = useRef('');

  useEffect(() => {
    if (!error) { lastErrorRef.current = ''; return; }
    if (lastErrorRef.current === error) return;
    lastErrorRef.current = error;
    notify(error, { severity: 'error', duration: messageDuration, onDismiss: () => dismissErrorRef.current?.() });
  }, [error, messageDuration, notify]);

  useEffect(() => {
    if (!success) { lastSuccessRef.current = ''; return; }
    if (lastSuccessRef.current === success) return;
    lastSuccessRef.current = success;
    notify(success, { severity: 'success', duration: messageDuration, onDismiss: () => dismissSuccessRef.current?.() });
  }, [messageDuration, notify, success]);

  const currentSearch = searchValue !== undefined ? searchValue : internalSearch;
  const currentSelectedKeys = selectedRowKeys !== undefined ? selectedRowKeys : internalSelectedKeys;
  const currentPage = page !== undefined ? page : internalPage;
  const currentPageSize = pageSize !== undefined ? pageSize : internalPageSize;
  const currentVisibleIds = visibleColumnIds !== undefined ? visibleColumnIds : internalVisibleIds;
  const columnWidths = controlledColumnWidths !== undefined ? controlledColumnWidths : internalColumnWidths;
  const currentSortColumn = controlledSortColumn !== undefined ? controlledSortColumn : internalSortColumn;
  const currentSortDirection = controlledSortDirection !== undefined ? controlledSortDirection : internalSortDirection;
  const groupingOptions = useMemo(() => (
    groupByOptions || (renderBody ? [] : columns
      .filter((column) => column.groupable === true)
      .map((column) => ({ id: column.id, label: column.label || column.title || column.id })))
  ), [columns, groupByOptions, renderBody]);
  const activeSearchChips = [
    ...filterChips,
    ...(!filterPanelCustomContent && groupBy.length ? [{
      id: 'groupBy:chain',
      label: groupBy.map((id) => (
        groupingOptions.find((option) => (option.id || option.value) === id)?.label || id
      )).join('  >  '),
      kind: 'groupBy',
      value: groupBy,
    }] : []),
  ];
  const searchExtraWidth = Math.min(
    Math.max(activeSearchChips.length + Math.max(groupBy.length - 1, 0) - 1, 0) * 52,
    312,
  );

  const activeColumns = useMemo(() => (
    columns.filter((column) => currentVisibleIds.includes(column.id))
  ), [columns, currentVisibleIds]);

  useLayoutEffect(() => {
    if (viewMode !== 'list') return undefined;
    const container = tableScrollRef.current;
    if (!container) return undefined;
    const measure = () => setTableViewportWidth(container.clientWidth);
    measure();
    const observer = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(measure) : null;
    observer?.observe(container);
    window.addEventListener('resize', measure);
    return () => {
      observer?.disconnect();
      window.removeEventListener('resize', measure);
    };
  }, [activeColumns.length, viewMode]);

  const selectedKeySet = useMemo(() => new Set(currentSelectedKeys), [currentSelectedKeys]);
  const selectedRows = useMemo(() => (
    rows.filter((row) => selectedKeySet.has(resolveRowKey(row, rowKey)))
  ), [rowKey, rows, selectedKeySet]);

  const sortedRows = useMemo(() => {
    if (serverSide || !allowColumnSort || !currentSortColumn) return rows;
    const column = columns.find((item) => item.id === currentSortColumn);
    if (!column || column.sortable === false) return rows;

    const resolveSortValue = (row) => (
      typeof column.sortValue === 'function' ? column.sortValue(row) : getValue(row, column)
    );
    const normalize = (value) => {
      if (value === null || value === undefined) return '';
      if (column.numeric) {
        const numericValue = Number(String(value).replace(/\s/g, '').replace(',', '.'));
        return Number.isFinite(numericValue) ? numericValue : 0;
      }
      if (column.sortType === 'date' || /date/i.test(column.id)) {
        const timestamp = new Date(value).getTime();
        if (Number.isFinite(timestamp)) return timestamp;
      }
      return String(value).trim().toLocaleLowerCase('fr');
    };
    const direction = currentSortDirection === 'desc' ? -1 : 1;

    return [...rows].sort((first, second) => {
      const firstValue = normalize(resolveSortValue(first));
      const secondValue = normalize(resolveSortValue(second));
      if (typeof firstValue === 'number' && typeof secondValue === 'number') {
        return (firstValue - secondValue) * direction;
      }
      return String(firstValue).localeCompare(String(secondValue), 'fr', {
        numeric: true,
        sensitivity: 'base',
      }) * direction;
    });
  }, [allowColumnSort, columns, currentSortColumn, currentSortDirection, rows, serverSide]);

  const totalItems = Number(total ?? sortedRows.length);
  const totalPages = Math.max(1, Math.ceil(totalItems / Math.max(1, currentPageSize)));
  const safePage = Math.min(Math.max(1, currentPage), totalPages);
  const displayedRows = useMemo(() => {
    if (serverSide) return sortedRows;
    const start = (safePage - 1) * currentPageSize;
    return sortedRows.slice(start, start + currentPageSize);
  }, [currentPageSize, safePage, serverSide, sortedRows]);
  const displayedKeys = useMemo(() => (
    displayedRows.map((row) => resolveRowKey(row, rowKey)).filter((key) => key !== undefined && key !== null)
  ), [displayedRows, rowKey]);
  const allDisplayedSelected = displayedKeys.length > 0 && displayedKeys.every((key) => selectedKeySet.has(key));

  const getStripeClassName = useCallback((rowIndex) => {
    if (!stripedRows || !rowStripeClassNames.length) return 'bg-white';
    return rowStripeClassNames[rowIndex % rowStripeClassNames.length] || 'bg-white';
  }, [rowStripeClassNames, stripedRows]);

  const setSearch = useCallback((value) => {
    if (searchValue === undefined) setInternalSearch(value);
    onSearchChange?.(value);
  }, [onSearchChange, searchValue]);

  const setSelected = useCallback((keys) => {
    if (selectedRowKeys === undefined) setInternalSelectedKeys(keys);
    const keySet = new Set(keys);
    onSelectionChange?.(keys, rows.filter((row) => keySet.has(resolveRowKey(row, rowKey))));
  }, [onSelectionChange, rowKey, rows, selectedRowKeys]);

  const changePage = useCallback((nextPage) => {
    const normalized = Math.min(Math.max(1, Number(nextPage) || 1), totalPages);
    if (page === undefined) setInternalPage(normalized);
    onPageChange?.(normalized);
    if (tableScrollRef.current) tableScrollRef.current.scrollTop = 0;
  }, [onPageChange, page, totalPages]);

  const setVisibleIds = useCallback((ids) => {
    if (visibleColumnIds === undefined) setInternalVisibleIds(ids);
    onVisibleColumnsChange?.(ids);
  }, [onVisibleColumnsChange, visibleColumnIds]);

  const setColumnWidths = useCallback((nextValue) => {
    const next = typeof nextValue === 'function' ? nextValue(columnWidths) : nextValue;
    if (controlledColumnWidths === undefined) setInternalColumnWidths(next);
    onColumnWidthsChange?.(next);
  }, [columnWidths, controlledColumnWidths, onColumnWidthsChange]);

  const changeSort = useCallback((column) => {
    if (!allowColumnSort || column.sortable === false) return;
    const nextDirection = currentSortColumn === column.id && currentSortDirection === 'asc'
      ? 'desc'
      : 'asc';
    if (controlledSortColumn === undefined) setInternalSortColumn(column.id);
    if (controlledSortDirection === undefined) setInternalSortDirection(nextDirection);
    onSortChange?.(column.id, nextDirection, column);
    if (page === undefined) setInternalPage(1);
    onPageChange?.(1);
    if (tableScrollRef.current) tableScrollRef.current.scrollTop = 0;
  }, [
    allowColumnSort,
    controlledSortColumn,
    controlledSortDirection,
    currentSortColumn,
    currentSortDirection,
    onPageChange,
    onSortChange,
    page,
  ]);

  const renderPortal = useCallback((content) => (
    typeof document === 'undefined' ? content : createPortal(content, document.body)
  ), []);

  const buildMemoryState = useCallback(() => ({
    search: currentSearch,
    selectedRowKeys: rememberSelection ? currentSelectedKeys : [],
    page: safePage,
    pageSize: currentPageSize,
    visibleColumnIds: currentVisibleIds,
    columnWidths,
    sortColumn: currentSortColumn,
    sortDirection: currentSortDirection,
    viewMode,
    groupBy,
    tableScrollTop: tableScrollRef.current?.scrollTop || 0,
    tableScrollLeft: tableScrollRef.current?.scrollLeft || 0,
    custom: memoryState,
  }), [
    columnWidths,
    currentPageSize,
    currentSearch,
    currentSelectedKeys,
    currentSortColumn,
    currentSortDirection,
    currentVisibleIds,
    groupBy,
    memoryState,
    rememberSelection,
    safePage,
    viewMode,
  ]);

  stateSnapshotRef.current = buildMemoryState;

  const saveNow = useCallback(() => {
    writeMemory(resolvedMemoryKey, stateSnapshotRef.current?.() || {});
  }, [resolvedMemoryKey]);

  const toggleGroupBy = (id) => {
    const next = groupBy.includes(id)
      ? groupBy.filter((item) => item !== id)
      : [...groupBy, id];
    setGroupBy(next);
    onGroupByChange?.(next, groupingOptions);
    if (page === undefined) setInternalPage(1);
    onPageChange?.(1);
  };

  const clearGroupBy = () => {
    setGroupBy([]);
    onGroupByChange?.([], groupingOptions);
    if (page === undefined) setInternalPage(1);
    onPageChange?.(1);
  };

  const changeViewMode = (nextMode) => {
    if (!viewModes.includes(nextMode)) return;
    setViewMode(nextMode);
    restoreScrollRef.current = { top: 0, left: 0 };
    writeMemory(resolvedMemoryKey, {
      ...buildMemoryState(),
      viewMode: nextMode,
      tableScrollTop: 0,
      tableScrollLeft: 0,
    });
    window.requestAnimationFrame(() => {
      if (tableScrollRef.current) {
        tableScrollRef.current.scrollTop = 0;
        tableScrollRef.current.scrollLeft = 0;
      }
      if (fixedHeaderScrollRef.current) fixedHeaderScrollRef.current.scrollLeft = 0;
    });
  };

  useLayoutEffect(() => {
    const scrollContainer = tableScrollRef.current;
    if (!scrollContainer || viewMode === 'list') return;
    scrollContainer.scrollTop = 0;
    scrollContainer.scrollLeft = 0;
  }, [viewMode]);

  const clearSavedState = useCallback(() => {
    clearMemory(resolvedMemoryKey);
  }, [resolvedMemoryKey]);

  useEffect(() => {
    if (initialMemory.custom && typeof onRestoreMemoryState === 'function') {
      onRestoreMemoryState(initialMemory.custom, initialMemory);
    }
    restoreScrollRef.current = {
      top: initialMemory.viewMode === 'list' ? Number(initialMemory.tableScrollTop) || 0 : 0,
      left: initialMemory.viewMode === 'list' ? Number(initialMemory.tableScrollLeft) || 0 : 0,
    };
    onMemoryReady?.({ saveNow, clearSavedState, restoredState: initialMemory });
    // La restauration externe ne doit s'executer qu'au montage de cette page.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    window.clearTimeout(saveTimerRef.current);
    saveTimerRef.current = window.setTimeout(saveNow, 180);
    return () => window.clearTimeout(saveTimerRef.current);
  }, [
    columnWidths,
    currentPageSize,
    currentSearch,
    currentSelectedKeys,
    currentSortColumn,
    currentSortDirection,
    currentVisibleIds,
    groupBy,
    memoryState,
    safePage,
    saveNow,
  ]);

  useEffect(() => {
    const handlePageHide = () => saveNow();
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') saveNow();
    };
    window.addEventListener('pagehide', handlePageHide);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      saveNow();
      window.removeEventListener('pagehide', handlePageHide);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [saveNow]);

  useLayoutEffect(() => {
    if (!lockMainScroll) return undefined;
    const main = rootRef.current?.closest('main');
    if (!main) return undefined;
    const previous = {
      overflow: main.style.overflow,
      minHeight: main.style.minHeight,
      scrollTop: main.scrollTop,
      scrollLeft: main.scrollLeft,
    };
    main.scrollTop = 0;
    main.scrollLeft = 0;
    main.style.overflow = 'hidden';
    main.style.minHeight = '0';
    return () => {
      main.style.overflow = previous.overflow;
      main.style.minHeight = previous.minHeight;
      main.scrollTop = previous.scrollTop;
      main.scrollLeft = previous.scrollLeft;
    };
  }, [lockMainScroll]);

  useEffect(() => {
    if (!restoreScrollRef.current || loading) return;
    const { top, left } = restoreScrollRef.current;
    const frame = window.requestAnimationFrame(() => {
      if (tableScrollRef.current) {
        tableScrollRef.current.scrollTop = top;
        tableScrollRef.current.scrollLeft = left;
      }
      if (fixedHeaderScrollRef.current) fixedHeaderScrollRef.current.scrollLeft = left;
      restoreScrollRef.current = null;
    });
    return () => window.cancelAnimationFrame(frame);
  }, [loading, rows.length]);

  useEffect(() => {
    const handleOutsideClick = (event) => {
      if (
        showFilters
        && !filterPanelRef.current?.contains(event.target)
        && !filterButtonRef.current?.contains(event.target)
      ) setShowFilters(false);
      if (
        showColumns
        && !columnsPanelRef.current?.contains(event.target)
        && !columnsButtonRef.current?.contains(event.target)
      ) setShowColumns(false);
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [showColumns, showFilters]);

  const measurePanelPosition = (button, width) => {
    const rect = button?.getBoundingClientRect();
    if (!rect) return { top: 0, left: 0 };
    return {
      top: rect.bottom + 5,
      left: Math.max(8, Math.min(rect.right - width, window.innerWidth - width - 8)),
    };
  };

  const openFilterPanel = () => {
    if (!showFilters) {
      const panelWidth = Math.min(Math.max(filterPanelWidth, 600), window.innerWidth - 16);
      setFilterPanelPosition(measurePanelPosition(filterButtonRef.current, panelWidth));
      onFiltersOpen?.();
    }
    setShowColumns(false);
    setShowFilters((value) => !value);
  };

  const openColumnsPanel = () => {
    if (!showColumns) setColumnsPanelPosition(measurePanelPosition(columnsButtonRef.current, 280));
    setShowFilters(false);
    setShowColumns((value) => !value);
  };

  useLayoutEffect(() => {
    if (!showFilters) return undefined;
    const frame = window.requestAnimationFrame(() => {
      if (filterPanelRef.current) filterPanelRef.current.scrollTop = 0;
    });
    return () => window.cancelAnimationFrame(frame);
  }, [showFilters]);

  useLayoutEffect(() => {
    if (!showColumns) return undefined;
    const frame = window.requestAnimationFrame(() => {
      if (columnsPanelRef.current) columnsPanelRef.current.scrollTop = 0;
    });
    return () => window.cancelAnimationFrame(frame);
  }, [showColumns]);

  const toggleRow = useCallback((key) => {
    const next = selectedKeySet.has(key)
      ? currentSelectedKeys.filter((item) => item !== key)
      : [...currentSelectedKeys, key];
    setSelected(next);
  }, [currentSelectedKeys, selectedKeySet, setSelected]);

  useEffect(() => () => window.clearTimeout(rowClickTimerRef.current), []);

  const isRowInteractionControl = useCallback((event) => {
    const target = event?.target;
    return typeof Element !== 'undefined' && target instanceof Element && Boolean(target.closest(
      'a, button, input, select, textarea, label, [role="button"], [data-row-interaction-ignore="true"]',
    ));
  }, []);

  const getRowInteractionProps = useCallback((row) => {
    if (!onRowOpen) {
      return {
        onClick: (event) => onRowClick?.(row, { saveNow, event }),
        onDoubleClick: (event) => onRowDoubleClick?.(row, { saveNow, event }),
      };
    }

    const key = resolveRowKey(row, rowKey);
    return {
      onClick: (event) => {
        if (event.defaultPrevented || isRowInteractionControl(event)) return;
        window.clearTimeout(rowClickTimerRef.current);
        if (event.detail > 1) return;

        rowClickTimerRef.current = window.setTimeout(() => {
          if (selectable && currentSelectedKeys.length > 0) {
            toggleRow(key);
            return;
          }
          saveNow();
          onRowOpen(row, { saveNow, event });
        }, 220);
      },
      onDoubleClick: (event) => {
        if (event.defaultPrevented || isRowInteractionControl(event)) return;
        event.preventDefault();
        event.stopPropagation();
        window.clearTimeout(rowClickTimerRef.current);
        if (selectable) {
          toggleRow(key);
          return;
        }
        onRowDoubleClick?.(row, { saveNow, event });
      },
    };
  }, [
    currentSelectedKeys.length,
    isRowInteractionControl,
    onRowClick,
    onRowDoubleClick,
    onRowOpen,
    rowKey,
    saveNow,
    selectable,
    toggleRow,
  ]);

  const toggleDisplayedRows = () => {
    if (allDisplayedSelected) {
      const displayedSet = new Set(displayedKeys);
      setSelected(currentSelectedKeys.filter((key) => !displayedSet.has(key)));
      return;
    }
    setSelected([...new Set([...currentSelectedKeys, ...displayedKeys])]);
  };

  const startColumnResize = (event, columnId) => {
    if (!allowColumnResize) return;
    event.preventDefault();
    event.stopPropagation();
    const startX = event.clientX;
    const headings = Array.from(fixedHeaderScrollRef.current?.querySelectorAll('.somane-list-table__heading') || []);
    const startWidths = activeColumns.map((column, index) => (
      headings[index]?.getBoundingClientRect().width
      || Number(columnWidths[column.id])
      || Number(column.width)
      || Number(column.minWidth)
      || DEFAULT_COLUMN_WIDTH
    ));
    const columnIndex = activeColumns.findIndex((column) => column.id === columnId);
    const totalWidth = startWidths.reduce((sum, width) => sum + width, 0);
    const minWidth = Math.min(MIN_COLUMN_WIDTH, totalWidth / Math.max(1, activeColumns.length));
    const startWidth = startWidths[columnIndex] || minWidth;
    const onMouseMove = (moveEvent) => {
      if (columnIndex < 0) return;
      const maxWidth = Math.max(minWidth, totalWidth - (activeColumns.length - 1) * minWidth);
      const nextWidth = Math.min(maxWidth, Math.max(minWidth, startWidth + moveEvent.clientX - startX));
      const remainingIndexes = startWidths.map((_, index) => index).filter((index) => index !== columnIndex);
      const nextWidths = [...startWidths];
      nextWidths[columnIndex] = nextWidth;
      let flexibleIndexes = [...remainingIndexes];
      let flexibleWidth = totalWidth - nextWidth;

      while (flexibleIndexes.length) {
        const weightTotal = flexibleIndexes.reduce((sum, index) => sum + startWidths[index], 0) || flexibleIndexes.length;
        const widthToShare = flexibleWidth;
        const totalWeight = weightTotal;
        const constrainedIndexes = flexibleIndexes.filter((index) => (
          widthToShare * startWidths[index] / totalWeight < minWidth
        ));
        if (!constrainedIndexes.length) {
          flexibleIndexes.forEach((index) => {
            nextWidths[index] = widthToShare * startWidths[index] / totalWeight;
          });
          break;
        }
        for (const index of constrainedIndexes) {
          nextWidths[index] = minWidth;
          flexibleWidth -= minWidth;
        }
        flexibleIndexes = flexibleIndexes.filter((index) => !constrainedIndexes.includes(index));
      }

      setColumnWidths(Object.fromEntries(activeColumns.map((column, index) => [column.id, nextWidths[index]])));
    };
    const onMouseUp = () => {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  };

  const columnWidthStyle = useCallback((column) => {
    const widthBasis = activeColumns.map((item) => (
      Number(columnWidths[item.id]) || Number(item.width) || Number(item.minWidth) || DEFAULT_COLUMN_WIDTH
    ));
    const totalBasis = widthBasis.reduce((sum, width) => sum + width, 0) || activeColumns.length;
    const fixedWidth = (selectable ? SELECT_COLUMN_WIDTH : 0)
      + (allowColumnVisibility ? ACTION_COLUMN_WIDTH : 0);
    const tableWidth = tableViewportWidth || tableScrollRef.current?.clientWidth || 1200;
    const availableWidth = Math.max(activeColumns.length, tableWidth - fixedWidth);
    const index = activeColumns.findIndex((item) => item.id === column.id);
    const width = availableWidth * (widthBasis[index] || 1) / totalBasis;
    return { width, minWidth: 0, maxWidth: width };
  }, [activeColumns, allowColumnVisibility, columnWidths, selectable, tableViewportWidth]);

  const renderHeaderRow = (interactive) => (
    <tr className="somane-list-table__header h-11 border-y border-gray-300 bg-gray-100 text-xs font-semibold text-gray-700">
      {selectable && (
        <th style={{ width: SELECT_COLUMN_WIDTH, minWidth: SELECT_COLUMN_WIDTH, maxWidth: SELECT_COLUMN_WIDTH }} className="group w-11 min-w-11 border-r border-gray-200 px-2 text-center transition-colors duration-150 hover:bg-purple-50 hover:text-purple-700">
          {interactive && (
            <input
              type="checkbox"
              checked={allDisplayedSelected}
              onChange={toggleDisplayedRows}
              aria-label="Selectionner les lignes affichees"
              className="h-4 w-4 rounded border-gray-300 accent-teal-700 transition-transform duration-150 group-hover:scale-110"
            />
          )}
        </th>
      )}
      {activeColumns.map((column) => (
        <th
          key={column.id}
          style={columnWidthStyle(column)}
          aria-sort={currentSortColumn === column.id
            ? (currentSortDirection === 'desc' ? 'descending' : 'ascending')
            : undefined}
          className={classNames(
            'somane-list-table__heading group relative border-r border-gray-200 px-3 text-left transition-colors duration-150 hover:bg-purple-50 hover:text-purple-700',
            column.numeric && 'text-right',
            column.headerClassName,
          )}
          title={column.label}
        >
          {allowColumnSort && column.sortable !== false ? (
            <button
              type="button"
              onClick={() => changeSort(column)}
              className={classNames(
                'flex w-full cursor-pointer items-center gap-1 overflow-hidden transition-transform duration-150 group-hover:-translate-y-px',
                column.numeric ? 'justify-end text-right' : 'justify-start text-left',
              )}
              title={`Trier par ${column.label}`}
            >
              <span className="truncate">{column.label}</span>
              {currentSortColumn === column.id ? (
                currentSortDirection === 'desc'
                  ? <FiArrowDown className="shrink-0 text-purple-700" size={12} />
                  : <FiArrowUp className="shrink-0 text-purple-700" size={12} />
              ) : (
                <FiArrowUp className="shrink-0 text-gray-400 opacity-0 transition-opacity duration-150 group-hover:opacity-70" size={11} />
              )}
            </button>
          ) : (
            <span className="block truncate transition-transform duration-150 group-hover:-translate-y-px">{column.label}</span>
          )}
          {interactive && allowColumnResize && (
            <button
              type="button"
              aria-label={`Redimensionner ${column.label}`}
              onMouseDown={(event) => startColumnResize(event, column.id)}
              className="group absolute -right-1 top-0 z-10 h-full w-2 cursor-col-resize bg-transparent"
            >
              <span className="absolute right-1 top-0 h-full w-px bg-transparent group-hover:bg-purple-400" />
            </button>
          )}
        </th>
      ))}
      {allowColumnVisibility && (
        <th style={{ width: ACTION_COLUMN_WIDTH, minWidth: ACTION_COLUMN_WIDTH, maxWidth: ACTION_COLUMN_WIDTH }} className="group w-10 min-w-10 px-1 text-center transition-colors duration-150 hover:bg-purple-50 hover:text-purple-700">
          {interactive && (
            <button
              ref={columnsButtonRef}
              type="button"
              onClick={openColumnsPanel}
              className="inline-flex h-7 w-7 items-center justify-center rounded text-gray-500 transition-transform duration-150 hover:bg-purple-100 hover:text-purple-700 group-hover:scale-105"
              title="Afficher ou masquer les colonnes"
            >
              <FiMoreHorizontal size={17} />
            </button>
          )}
        </th>
      )}
    </tr>
  );

  const renderDefaultRow = useCallback((row, rowIndex) => {
    const key = resolveRowKey(row, rowKey);
    const selected = selectedKeySet.has(key);
    const interactionProps = getRowInteractionProps(row);
    return (
      <tr
        key={key ?? rowIndex}
        {...interactionProps}
        className={classNames(
          'somane-list-table__row border-b border-gray-200 text-xs text-gray-700',
          selected ? 'is-selected bg-purple-50' : `${getStripeClassName(rowIndex)} hover:bg-purple-50/40`,
          (onRowOpen || onRowClick || onRowDoubleClick) && 'cursor-pointer',
          getRowClassName?.(row, rowIndex),
        )}
      >
        {selectable && (
          <td data-row-select="true" className="w-11 min-w-11 border-r border-gray-100 px-2 py-1.5 text-center" onClick={(event) => event.stopPropagation()}>
            <input
              type="checkbox"
              checked={selected}
              onChange={() => toggleRow(key)}
              aria-label="Selectionner cette ligne"
              className="h-4 w-4 rounded border-gray-300 accent-teal-700"
            />
          </td>
        )}
        {activeColumns.map((column) => {
          const value = getValue(row, column);
          const content = column.render ? column.render(value, row, rowIndex) : (value ?? '—');
          const titleValue = typeof content === 'string' || typeof content === 'number' ? String(content) : String(value ?? '');
          return (
            <td
              key={column.id}
              data-label={column.label}
              style={columnWidthStyle(column)}
              className={classNames(
                'somane-list-table__cell overflow-hidden border-r border-gray-100 px-2 py-1.5 text-xs',
                column.numeric ? 'whitespace-nowrap text-right tabular-nums' : 'whitespace-nowrap',
                column.className,
              )}
              title={column.title ? column.title(value, row) : titleValue}
            >
              <div className={classNames(
                'truncate',
                column.numeric && !column.dataType && 'somane-data-number',
                column.dataType && `somane-data-${column.dataType}`,
              )}>{content}</div>
            </td>
          );
        })}
        {allowColumnVisibility && <td style={{ width: ACTION_COLUMN_WIDTH, minWidth: ACTION_COLUMN_WIDTH, maxWidth: ACTION_COLUMN_WIDTH }} className="w-6 min-w-6 px-0.5 py-1.5" />}
      </tr>
    );
  }, [
    activeColumns,
    allowColumnVisibility,
    columnWidthStyle,
    getRowClassName,
    getStripeClassName,
    getRowInteractionProps,
    onRowClick,
    onRowDoubleClick,
    onRowOpen,
    rowKey,
    selectable,
    selectedKeySet,
    toggleRow,
  ]);

  const clearViewFilters = () => {
    if (onClearFilters) {
      onClearFilters();
      return;
    }
    setSearch('');
    activeSearchChips.forEach((chip) => {
      if (chip.kind === 'groupBy') clearGroupBy();
      else if (onRemoveFilterChip) onRemoveFilterChip(chip);
      else chip.onRemove?.();
    });
  };
  const canClearViewFilters = Boolean(currentSearch || activeSearchChips.length);
  const retryLoading = () => (onRetry ? onRetry() : window.location.reload());
  const errorDescription = typeof error === 'string' ? error : error?.message || 'Vérifiez votre connexion, puis réessayez.';

  const renderRows = () => {
    if (loading) {
      return (
        <tr><td colSpan={activeColumns.length + (selectable ? 1 : 0) + (allowColumnVisibility ? 1 : 0)} className="p-3">
          <FeedbackState kind="loading" title={loadingText} layout="table" columns={activeColumns.length + (selectable ? 1 : 0) + (allowColumnVisibility ? 1 : 0)} />
        </td></tr>
      );
    }
    if (error && !displayedRows.length) {
      return (
        <tr><td colSpan={activeColumns.length + (selectable ? 1 : 0) + (allowColumnVisibility ? 1 : 0)} className="p-3">
          <FeedbackState kind="error" title="Impossible de charger les données" description={errorDescription} actionLabel="Réessayer" onAction={retryLoading} />
        </td></tr>
      );
    }
    if (!displayedRows.length) {
      return (
        <tr><td colSpan={activeColumns.length + (selectable ? 1 : 0) + (allowColumnVisibility ? 1 : 0)} className="p-3">
          <FeedbackState
            kind="empty"
            title="Aucun résultat"
            description={emptyText}
            actionLabel={canClearViewFilters ? 'Effacer les filtres' : undefined}
            onAction={canClearViewFilters ? clearViewFilters : undefined}
          />
        </td></tr>
      );
    }
    const context = {
      rows: displayedRows,
      columns: activeColumns,
      selectedRowKeys: currentSelectedKeys,
      selectedRows,
      toggleRow,
      renderDefaultRow,
      getStripeClassName,
      saveNow,
      columnCount: activeColumns.length + (selectable ? 1 : 0) + (allowColumnVisibility ? 1 : 0),
    };
    const addResponsiveLabels = (nodes) => React.Children.map(nodes, (node) => {
      if (!React.isValidElement(node)) return node;
      if (node.type === React.Fragment) {
        return React.cloneElement(node, {}, addResponsiveLabels(node.props.children));
      }
      if (node.type !== 'tr') return node;
      let columnIndex = 0;
      const children = React.Children.map(node.props.children, (cell) => {
        if (!React.isValidElement(cell) || cell.type !== 'td' || cell.props.colSpan) return cell;
        const containsCheckbox = React.Children.toArray(cell.props.children).some((child) => (
          React.isValidElement(child) && child.type === 'input' && child.props.type === 'checkbox'
        ));
        if (containsCheckbox) return React.cloneElement(cell, { 'data-row-select': 'true' });
        const column = activeColumns[columnIndex];
        columnIndex += 1;
        return column ? React.cloneElement(cell, { 'data-label': cell.props['data-label'] || column.label }) : cell;
      });
      return React.cloneElement(node, {}, children);
    });
    if (renderBody) return addResponsiveLabels(renderBody({ ...context, getRowInteractionProps }));
    if (renderRow) {
      return displayedRows.map((row, index) => {
        const renderedRow = renderRow(row, index, { ...context, getRowInteractionProps });
        if (!React.isValidElement(renderedRow)) return renderedRow;
        const [labeledRow] = addResponsiveLabels([renderedRow]);
        if (!onRowOpen) return labeledRow;
        return React.cloneElement(labeledRow, {
          ...getRowInteractionProps(row),
          className: classNames(labeledRow.props.className, 'cursor-pointer'),
        });
      });
    }
    return displayedRows.map(renderDefaultRow);
  };

  const renderCustomContent = () => renderContent?.({
    rows: displayedRows,
    allRows: rows,
    columns: activeColumns,
    selectedRowKeys: currentSelectedKeys,
    selectedRows,
    toggleRow,
    toggleDisplayedRows,
    allDisplayedSelected,
    getRowInteractionProps,
    getStripeClassName,
    saveNow,
    loading,
    empty: displayedRows.length === 0,
    page: safePage,
    pageSize: currentPageSize,
    total: totalItems,
    totalPages,
  });

  const resolveViewColumn = (selector) => columns.find((column) => (
    column.id === selector || column.dataIndex === selector
  ));
  const kanbanColumn = disableGrouping ? null : resolveViewColumn(groupBy[0] || kanbanGroupBy);
  const columnToken = (column) => [
    column?.id,
    column?.dataIndex,
    typeof column?.label === 'string' ? column.label : '',
    typeof column?.title === 'string' ? column.title : '',
  ].filter(Boolean).join(' ').toLocaleLowerCase('fr');
  const titleColumn = activeColumns
    .map((column, index) => {
      const token = columnToken(column);
      const score = /(^|[ _-])(name|nom|title|titre|display|libelle|label|numero|number|reference|code)([ _-]|$)/i.test(token)
        ? (/numero|number|reference|code/.test(token) ? 4 : 5)
        : 0;
      return { column, index, score };
    })
    .sort((left, right) => right.score - left.score || left.index - right.index)[0]?.column;
  const displayValue = (row, column) => {
    if (!column) return row?.name || row?.label || row?.display_name || row?.id || '—';
    const value = getValue(row, column);
    if (value === null || value === undefined || value === '') return '—';
    if (typeof value === 'object') return value.label || value.name || value.display_name || value.code || '—';
    return value;
  };
  const summaryColumns = [...activeColumns, ...kanbanSummaryColumns]
    .filter((column, index, list) => column !== titleColumn && list.findIndex((item) => item.id === column.id) === index);
  const statusColumn = summaryColumns.find((column) => /status|state|etat|statut|payment|paiement|active|actif|reconcile|lettrage/i.test(columnToken(column)));
  const summaryMetricColumns = summaryColumns
    .map((column, index) => {
      const token = columnToken(column);
      const numeric = displayedRows.some((row) => {
        const value = getValue(row, column);
        return typeof value === 'number' || (typeof value === 'string' && value.trim() !== '' && Number.isFinite(Number(value)));
      });
      const semanticScore = /total|ttc|amount|montant|solde|balance|value|valeur/.test(token) ? 5
        : /debit|credit|prix|price|count|entries|ecritures/.test(token) ? 3
          : column.numeric || column.align === 'right' ? 2 : 0;
      return { column, index, score: numeric ? semanticScore : 0 };
    })
    .filter((item) => item.score > 0 && item.column !== statusColumn)
    .sort((left, right) => right.score - left.score || left.index - right.index)
    .slice(0, 3)
    .map(({ column }) => column);
  const summaryDetailColumns = summaryColumns
    .filter((column) => column !== statusColumn && !summaryMetricColumns.includes(column))
    .map((column, index) => {
      const token = columnToken(column);
      const score = /date|created|updated|due|echeance|échéance/.test(token) ? 5
        : /partner|partenaire|client|customer|supplier|fournisseur/.test(token) ? 4
          : /reference|ref|journal|type|category|categorie|activity|activite/.test(token) ? 3
            : /compte|bank|banque/.test(token) ? 2
              : /code|prefix|prefixe/.test(token) ? 1 : 0;
      return { column, index, score };
    })
    .sort((left, right) => right.score - left.score || left.index - right.index)
    .map(({ column }) => column)
    .slice(0, 3);
  const getGroupLabel = (row) => {
    if (!kanbanColumn) return 'Tous les éléments';
    const raw = row?.[kanbanColumn.dataIndex || kanbanColumn.id];
    const value = raw && typeof raw === 'object'
      ? raw.label || raw.name || raw.display_name || String(raw.id || '')
      : raw;
    return String(value || 'Sans état');
  };
  const renderCollectionCards = (grouped, kanbanView = false) => {
    const shouldGroup = grouped && !disableGrouping;
    const groups = shouldGroup
      ? displayedRows.reduce((result, row) => {
        const label = getGroupLabel(row);
        if (!result.has(label)) result.set(label, []);
        result.get(label).push(row);
        return result;
      }, new Map())
      : new Map([['', displayedRows]]);

    if (loading) return <FeedbackState kind="loading" title={loadingText} layout="kanban" />;
    if (error && !displayedRows.length) return <FeedbackState kind="error" title="Impossible de charger les données" description={errorDescription} actionLabel="Réessayer" onAction={retryLoading} layout="kanban" />;
    if (!displayedRows.length) return (
      <FeedbackState
        kind="empty"
        title="Aucun résultat"
        description={emptyText}
        actionLabel={canClearViewFilters ? 'Effacer les filtres' : undefined}
        onAction={canClearViewFilters ? clearViewFilters : undefined}
        layout="kanban"
      />
    );

    return (
      <div className={classNames('somane-kanban', kanbanView && kanbanLayout === 'grid' && 'somane-kanban--grid')}>
        {[...groups.entries()].map(([group, groupRows]) => (
          <section className={classNames('somane-kanban__column', kanbanView && kanbanLayout === 'grid' && 'somane-kanban__column--grid')} key={group || 'kanban'}>
            {shouldGroup && kanbanColumn && (
              <h2 className="somane-kanban__heading">
                <span>{group}</span><span className="somane-kanban__count">{groupRows.length}</span>
              </h2>
            )}
            <div className={classNames('somane-kanban__cards', kanbanView && kanbanLayout === 'grid' && 'somane-kanban__cards--grid')}>
              {groupRows.map((row, rowIndex) => {
                const key = resolveRowKey(row, rowKey);
                const interactionProps = getRowInteractionProps(row);
                const title = String(displayValue(row, titleColumn));
                const statusText = statusColumn ? String(displayValue(row, statusColumn)) : '';
                const statusToken = statusText.toLocaleLowerCase('fr');
                const statusTone = /erreur|annul|refus|impay|retard|inactif/.test(statusToken) ? 'danger'
                  : /brouillon|attente|partiel|cours|incomplet/.test(statusToken) ? 'warning'
                    : /comptabilis|pay[eé]|actif|valid|termin|équilibr/.test(statusToken) ? 'success' : 'neutral';
                return (
                  <article
                    key={key}
                    {...interactionProps}
                    className={classNames('somane-record-card', 'somane-record-card--collection', onRowOpen && 'somane-record-card--interactive', selectedKeySet.has(key) && 'is-selected')}
                  >
                    {renderCollectionCard ? renderCollectionCard(row, {
                      selected: selectedKeySet.has(key),
                      toggleSelected: () => toggleRow(key),
                      openProps: interactionProps,
                    }) : (
                      <div className="somane-kanban-card somane-kanban-card--record">
                        <header className="somane-kanban-card__header">
                          {selectable && (
                            <input
                              type="checkbox"
                              checked={selectedKeySet.has(key)}
                              onChange={() => toggleRow(key)}
                              aria-label={`Sélectionner ${title}`}
                            />
                          )}
                          <span className="somane-kanban-card__avatar" aria-hidden="true">
                            {title.trim().slice(0, 2).toUpperCase()}
                          </span>
                          <h2>{title}</h2>
                        </header>
                        {summaryMetricColumns.length > 0 && (
                          <dl className={classNames(
                            'somane-kanban-card__metrics',
                            'somane-kanban-card__metrics--featured',
                            summaryMetricColumns.length === 2 && 'has-two',
                            summaryMetricColumns.length >= 3 && 'has-three',
                          )}>
                            {summaryMetricColumns.map((column) => (
                              <div key={column.id}>
                                <dt>{typeof column.label === 'string' ? column.label : column.id}</dt>
                                <dd>
                                  {column.render
                                    ? column.render(getValue(row, column), row, rowIndex)
                                    : displayValue(row, column)}
                                </dd>
                              </div>
                            ))}
                          </dl>
                        )}
                        <dl className="somane-kanban-card__details">
                          {summaryDetailColumns.map((column) => (
                            <div className="somane-kanban-card__field" key={column.id}>
                              <dt>{column.title || column.label || column.id}</dt>
                              <dd>{displayValue(row, column)}</dd>
                            </div>
                          ))}
                        </dl>
                        {statusColumn && (
                          <footer className="somane-kanban-card__summary-footer">
                            {statusColumn.render ? statusColumn.render(getValue(row, statusColumn), row, rowIndex) : (
                              <span className={`somane-kanban-card__status is-${statusTone}`}>
                                <span aria-hidden="true" />
                                {statusText}
                              </span>
                            )}
                          </footer>
                        )}
                      </div>
                    )}
                  </article>
                );
              })}
            </div>
          </section>
        ))}
      </div>
    );
  };

  const renderViewMode = () => (
    renderCollectionCards(Boolean(groupBy.length || kanbanGroupBy) && !disableGrouping, true)
  );

  const handlePreviousPage = (page) => {
    saveNow();
    if (onBack) onBack({ navigate, location, page, savedState: buildMemoryState() });
    else if (page?.path) navigate(page.path);
    else navigate(-1);
  };

  const executeAction = (action) => {
    saveNow();
    action.onClick?.({
      navigate,
      location,
      selectedRowKeys: currentSelectedKeys,
      selectedRows,
      clearSelection: () => setSelected([]),
      saveNow,
      clearSavedState,
    });
  };


  return (
    <div
      ref={rootRef}
      className={classNames(
        'somane-page-layout unified-index-root',
        isAccountingModulePage && 'somane-page-layout--accounting',
        className,
      )}
      style={{ '--somane-page-pull': `${pullToHeader}px` }}
    >
      <style>{`
        @keyframes unified-index-message-in {
          from { opacity: 0; transform: translateY(-4px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .unified-index-message { animation: unified-index-message-in 180ms ease-out; }
      `}</style>

      <section className="somane-page-layout__surface somane-list-shell">
        <div className={classNames('somane-page-header-band somane-list-toolbar relative z-30 shrink-0', toolbarClassName)}>
          <div
            className={classNames(
              'somane-page-header-row',
              activeSearchChips.length > 0 && 'has-search-chips',
              pageSummary.length > 0 && 'has-page-summary',
            )}
          >
            <div className="somane-list-header-left">
            {primaryAction && (
              <button
                type="button"
                onClick={() => executeAction(primaryAction)}
                disabled={primaryAction.disabled}
                className={classNames(
                  'somane-btn somane-btn--primary somane-btn--new disabled:cursor-not-allowed',
                )}
                title="Nouveau"
              >
                {primaryAction.icon && React.isValidElement(primaryAction.icon)
                  ? React.cloneElement(primaryAction.icon, { size: 12, 'aria-hidden': true })
                  : primaryAction.icon || <FiPlus size={12} aria-hidden="true" />}
                <span>Nouveau</span>
              </button>
            )}

            {leadingActions.map((action) => (
              <button
                key={action.id || action.label}
                type="button"
                onClick={() => executeAction(action)}
                disabled={action.disabled}
                title={action.title}
                className={classNames(
                  'somane-btn font-medium disabled:cursor-not-allowed',
                  resolveButtonClass(action.variant),
                  action.className,
                )}
              >
                {action.icon}{action.label}
              </button>
            ))}

              <div className="flex min-w-0 flex-1 flex-col justify-center">
              {showHistoryNavigation && previousPages.length > 0 && (
                <div className="somane-breadcrumb mb-0.5 flex h-3 items-center gap-1 text-[10px] leading-none text-gray-500" aria-label="Fil d’Ariane">
                  {previousPages.map((page, index) => (
                    <React.Fragment key={`${page.path || page.label}-${index}`}>
                      {index > 0 && (
                        <FiChevronRight className="shrink-0 text-gray-400" size={10} strokeWidth={2.4} />
                      )}
                      <button
                        type="button"
                        onClick={() => handlePreviousPage(page)}
                        className="somane-breadcrumb__link max-w-36 truncate transition-colors hover:text-purple-700"
                        title={`Revenir à ${page.label}`}
                      >
                        {page.label}
                      </button>
                    </React.Fragment>
                  ))}
                </div>
              )}
              <h1 className="min-w-0 truncate whitespace-nowrap text-base font-bold leading-tight text-gray-900">{title}</h1>
              {description && <p className="somane-list-header-description">{description}</p>}
            </div>
            </div>

            {pageSummary.length > 0 && (
              <div className="somane-page-summary" role="group" aria-label="Synthèse de la page">
                {pageSummary.map((item) => (
                  <div key={item.id || item.label} className="somane-page-summary__item" title={item.title}>
                    <span className="somane-page-summary__label">{item.label}</span>
                    <span className="somane-page-summary__value">{item.value}</span>
                    {item.detail && <span className="somane-page-summary__detail">{item.detail}</span>}
                  </div>
                ))}
              </div>
            )}

            <div
              className={classNames('somane-list-search', activeSearchChips.length > 0 && 'somane-list-search--has-chips')}
              style={{ '--somane-search-extra-width': `${searchExtraWidth}px` }}
            >
              <FiSearch className="somane-list-search__icon" size={17} aria-hidden="true" />
              <div className="somane-list-search__query">
                {currentSelectedKeys.length > 0 && (
                  <span className="somane-list-search__selection">
                    {currentSelectedKeys.length} selectionnee(s)
                  </span>
                )}
                {activeSearchChips.map((chip) => (
                  <span key={chip.id} title={chip.label} className={classNames('somane-list-search__chip', ['group', 'groupBy'].includes(chip.kind) && 'somane-list-search__group-chip')}>
                    <span className="somane-list-search__chip-label">{chip.label}</span>
                    <button
                      type="button"
                      onClick={() => {
                        if (chip.kind === 'groupBy') clearGroupBy();
                        else if (onRemoveFilterChip) onRemoveFilterChip(chip);
                        else if (chip.onRemove) chip.onRemove();
                      }}
                      aria-label={`Retirer ${['group', 'groupBy'].includes(chip.kind) ? 'le regroupement' : 'le filtre'} ${chip.label}`}
                    ><FiX size={12} aria-hidden="true" /></button>
                  </span>
                ))}
                <input
                  value={currentSearch}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder={searchPlaceholder}
                  className="somane-list-search__input"
                />
              </div>
              <div className="somane-list-search__controls">
                {searchActions.map((action) => (
                  <button
                    key={action.id || action.label || action.title}
                    type="button"
                    onClick={() => executeAction(action)}
                    disabled={action.disabled}
                    title={action.title || action.label}
                    aria-label={action.title || action.label}
                    className={classNames(
                      'somane-list-search__action',
                      action.active && 'is-active',
                      action.showLabel && 'has-label',
                      action.className,
                    )}
                  >
                    {action.icon}
                    {action.showLabel && action.label}
                  </button>
                ))}
                {renderFilters && (
                  <button
                    ref={filterButtonRef}
                    type="button"
                    onClick={openFilterPanel}
                    title={showFilters ? 'Fermer les filtres' : 'Ouvrir les filtres'}
                    className={classNames('somane-list-search__filter', showFilters && 'is-active')}
                    aria-label={showFilters ? 'Fermer les filtres' : 'Ouvrir les filtres'}
                    aria-expanded={showFilters}
                  >
                    {showFilters ? <FiX size={16} aria-hidden="true" /> : <FiFilter size={17} />}
                  </button>
                )}
              </div>
            </div>

            <div className="somane-list-header-right">
            {trailingActions.map((action) => (
              <button
                key={action.id || action.label}
                type="button"
                onClick={() => executeAction(action)}
                disabled={action.disabled}
                title={action.title}
                className={classNames(
                  'somane-btn font-medium disabled:cursor-not-allowed',
                  resolveButtonClass(action.variant),
                  action.className,
                )}
              >
                {action.icon}{action.label}
              </button>
            ))}

            {!renderContent && viewModes.length > 1 && (
              <div className="somane-view-switch" role="group" aria-label="Mode d’affichage">
                {viewModes.map((mode) => {
                  const options = {
                    list: { label: 'Tableau', icon: <FiList size={15} /> },
                    kanban: { label: 'Kanban', icon: <FiColumns size={15} /> },
                  };
                  const baseOption = options[mode];
                  if (!baseOption) return null;
                  const option = { ...baseOption, ...viewModeLabels[mode] };
                  return (
                    <button
                      key={mode}
                      type="button"
                      className="somane-view-switch__button"
                      aria-label={option.label}
                      aria-pressed={viewMode === mode}
                      title={option.label}
                      onClick={() => changeViewMode(mode)}
                    >
                      {option.icon}<span>{option.label}</span>
                    </button>
                  );
                })}
              </div>
            )}

            <div className="somane-list-results-control">
              <div className="somane-list-pagination" role="group" aria-label="Pagination">
                <span className="somane-list-pagination__label">
                  {totalItems === 0 ? '0' : `${(safePage - 1) * currentPageSize + 1}–${Math.min(safePage * currentPageSize, totalItems)}`} sur {totalItems}
                </span>
                <button type="button" onClick={() => changePage(safePage - 1)} disabled={safePage === 1} className="somane-list-page-button" aria-label="Page précédente"><FiChevronLeft size={14} /></button>
                <button type="button" onClick={() => changePage(safePage + 1)} disabled={safePage === totalPages} className="somane-list-page-button" aria-label="Page suivante"><FiChevronRight size={14} /></button>
              </div>
            </div>

            </div>

          </div>

          {renderToolbarExtension && (
            <div className="somane-list-toolbar__extension">
              {renderToolbarExtension()}
            </div>
          )}

          {currentSelectedKeys.length > 0 && (
            <div className="somane-list-selection-bar">
              <div className="somane-list-selection-bar__summary">
                {renderSelectionSummary
                  ? renderSelectionSummary(selectedRows, currentSelectedKeys)
                  : `${currentSelectedKeys.length} ligne(s) selectionnee(s)`}
              </div>
              <div className="somane-list-selection-bar__actions">
                {selectionActions.map((action) => (
                  <button
                    key={action.id || action.label}
                    type="button"
                    onClick={() => executeAction(action)}
                    disabled={typeof action.disabled === 'function' ? action.disabled(selectedRows) : action.disabled}
                    className={classNames(
                      'somane-list-selection-bar__action',
                      resolveButtonClass(action.variant),
                      action.className,
                    )}
                  >
                    {action.label}
                  </button>
                ))}
                <button type="button" onClick={() => setSelected([])} className="somane-list-selection-bar__clear">
                  Annuler
                </button>
              </div>
            </div>
          )}
        </div>

        {renderContent ? (
          <div
            ref={tableScrollRef}
            onScroll={() => {
              window.clearTimeout(saveTimerRef.current);
              saveTimerRef.current = window.setTimeout(saveNow, 120);
            }}
            className="unified-index-scroll somane-list-scroll relative min-h-0 flex-1 overflow-y-auto overscroll-contain"
          >
            {renderCustomContent()}
          </div>
        ) : viewMode !== 'list' ? (
          <div
            ref={tableScrollRef}
            onScroll={() => {
              window.clearTimeout(saveTimerRef.current);
              saveTimerRef.current = window.setTimeout(saveNow, 120);
            }}
            className={classNames(
              'unified-index-scroll somane-list-scroll relative min-h-0 flex-1 overflow-auto overscroll-contain',
              viewMode === 'kanban' && 'somane-kanban-scroll',
              viewMode === 'kanban' && kanbanLayout === 'grid' && 'somane-kanban-scroll--grid',
            )}
          >
            {renderViewMode()}
          </div>
        ) : <>
          <div ref={fixedHeaderScrollRef} className="shrink-0 overflow-hidden">
            <table className="somane-list-table w-full table-fixed border-collapse text-sm">
              <thead>{renderHeaderRow(true)}</thead>
            </table>
          </div>
          <div
            ref={tableScrollRef}
            onScroll={(event) => {
              if (fixedHeaderScrollRef.current) fixedHeaderScrollRef.current.scrollLeft = event.currentTarget.scrollLeft;
              window.clearTimeout(saveTimerRef.current);
              saveTimerRef.current = window.setTimeout(saveNow, 120);
            }}
            className="unified-index-scroll somane-list-scroll somane-list-table-scroll relative min-h-0 flex-1 overscroll-contain overflow-auto"
          >
            <table ref={bodyTableRef} className="somane-list-table w-full table-fixed border-collapse text-sm">
              <thead aria-hidden="true" style={{ visibility: 'collapse' }}>
                {renderHeaderRow(false)}
              </thead>
              <tbody>{renderRows()}</tbody>
            </table>
          </div>
        </>}

      </section>

      {showFilters && renderFilters && renderPortal(
        <div
          ref={filterPanelRef}
          onClick={(event) => event.stopPropagation()}
          style={{
            position: 'fixed',
            top: filterPanelPosition.top,
            left: filterPanelPosition.left,
            width: Math.min(Math.max(filterPanelWidth, 600), window.innerWidth - 16),
            maxHeight: `calc(100vh - ${filterPanelPosition.top + 10}px)`,
          }}
          className="somane-list-filter-panel"
        >
          {filterPanelCustomContent ? (
            renderFilters({ close: () => setShowFilters(false), saveNow, clearSavedState })
          ) : (
            <div className="somane-search-panel">
              <section className="somane-search-panel__section somane-search-panel__section--filters">
                <h2>Ajouter un filtre</h2>
                <div className="somane-search-panel__content">
                  {renderFilters({ close: () => setShowFilters(false), saveNow, clearSavedState })}
                </div>
              </section>

              <section className="somane-search-panel__section">
                <h2>Regrouper par</h2>
                <div className="somane-search-panel__content somane-search-panel__options">
                  {groupingOptions.length ? groupingOptions.map((option) => {
                    const id = option.id || option.value;
                    const checked = groupBy.includes(id);
                    return (
                      <button
                        key={id}
                        type="button"
                        className={classNames('somane-search-panel__option', checked && 'is-active')}
                        aria-pressed={checked}
                        onClick={() => toggleGroupBy(id)}
                      >
                        <span className="somane-search-panel__check">{checked ? <FiCheck size={14} /> : null}</span>
                        <span>{option.label || option.name || id}</span>
                        {checked && <span className="somane-search-panel__group-order">{groupBy.indexOf(id) + 1}</span>}
                      </button>
                    );
                  }) : <p className="somane-search-panel__empty">Aucun regroupement disponible.</p>}
                  {groupBy.length > 0 && (
                    <button type="button" className="somane-search-panel__clear" onClick={() => { setGroupBy([]); onGroupByChange?.([], groupingOptions); }}>
                      Effacer les regroupements
                    </button>
                  )}
                </div>
              </section>
            </div>
          )}
        </div>
      )}

      {showColumns && allowColumnVisibility && renderPortal(
        <div
          ref={columnsPanelRef}
          onClick={(event) => event.stopPropagation()}
          style={{
            position: 'fixed',
            top: columnsPanelPosition.top,
            left: columnsPanelPosition.left,
            maxHeight: `calc(100vh - ${columnsPanelPosition.top + 10}px)`,
          }}
          className="z-[1000] w-[280px] overflow-y-auto rounded border border-gray-300 bg-white p-2 shadow-xl"
        >
          <div className="mb-1 px-2 py-1 text-xs font-semibold text-gray-700">Colonnes</div>
          {columns.map((column) => {
            const checked = currentVisibleIds.includes(column.id);
            const cannotHide = checked && currentVisibleIds.length === 1;
            return (
              <label key={column.id} className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-xs text-gray-700 hover:bg-gray-50">
                <input
                  type="checkbox"
                  checked={checked}
                  disabled={cannotHide}
                  onChange={() => setVisibleIds(
                    checked
                      ? currentVisibleIds.filter((id) => id !== column.id)
                      : [...currentVisibleIds, column.id],
                  )}
                  className="h-4 w-4 rounded accent-purple-600"
                />
                <span>{column.label}</span>
              </label>
            );
          })}
          {Object.keys(columnWidths).length > 0 && (
            <button type="button" onClick={() => setColumnWidths({})} className="mt-2 w-full border-t border-gray-200 px-2 pt-2 text-left text-xs text-purple-700 hover:text-purple-900">
              Reinitialiser la largeur des colonnes
            </button>
          )}
        </div>
      )}
    </div>
  );
}
