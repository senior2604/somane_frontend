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
import {
  FiAlertCircle,
  FiArrowDown,
  FiArrowUp,
  FiCheck,
  FiChevronLeft,
  FiChevronRight,
  FiChevronsLeft,
  FiChevronsRight,
  FiFilter,
  FiMoreHorizontal,
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
const DEFAULT_PAGE_SIZES = [15, 25, 50, 100];
const DEFAULT_COLUMN_WIDTH = 120;
const MIN_COLUMN_WIDTH = 56;
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
  primary: 'border-purple-600 bg-purple-600 text-white hover:bg-purple-700',
  success: 'border-emerald-600 bg-emerald-600 text-white hover:bg-emerald-700',
  danger: 'border-red-600 bg-red-600 text-white hover:bg-red-700',
  warning: 'border-amber-500 bg-amber-500 text-white hover:bg-amber-600',
  default: 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50',
}[variant] || 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50');

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
  messageDuration = 5000,
  onDismissError,
  onDismissSuccess,
  emptyText = 'Aucune donnee',
  loadingText = 'Chargement...',

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
  filterPanelWidth = 420,

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
  stripedRows = true,
  rowStripeClassNames = DEFAULT_ROW_STRIPES,

  page,
  defaultPage = 1,
  onPageChange,
  pageSize,
  defaultPageSize = 15,
  onPageSizeChange,
  pageSizeOptions = DEFAULT_PAGE_SIZES,
  total,
  serverSide = false,
  footerText,

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
  pullToHeader = 16,
  className = '',
  toolbarClassName = '',
}) {
  const navigate = useNavigate();
  const location = useLocation();
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
  const sizingHeaderRef = useRef(null);
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
  const [internalPageSize, setInternalPageSize] = useState(Number(initialMemory.pageSize) || defaultPageSize);
  const [internalColumnWidths, setInternalColumnWidths] = useState(() => (
    initialMemory.columnWidths && typeof initialMemory.columnWidths === 'object'
      ? initialMemory.columnWidths
      : {}
  ));
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
  const [showFilters, setShowFilters] = useState(false);
  const [showColumns, setShowColumns] = useState(false);
  const [filterPanelPosition, setFilterPanelPosition] = useState({ top: 0, left: 0 });
  const [columnsPanelPosition, setColumnsPanelPosition] = useState({ top: 0, left: 0 });
  const [headerMetrics, setHeaderMetrics] = useState({ widths: [], tableWidth: 0 });
  const [visibleError, setVisibleError] = useState(error);
  const [visibleSuccess, setVisibleSuccess] = useState(success);

  useEffect(() => {
    setVisibleError(error);
    if (!error || messageDuration <= 0) return undefined;
    const timer = window.setTimeout(() => {
      setVisibleError('');
      dismissErrorRef.current?.();
    }, messageDuration);
    return () => window.clearTimeout(timer);
  }, [error, messageDuration]);

  useEffect(() => {
    setVisibleSuccess(success);
    if (!success || messageDuration <= 0) return undefined;
    const timer = window.setTimeout(() => {
      setVisibleSuccess('');
      dismissSuccessRef.current?.();
    }, messageDuration);
    return () => window.clearTimeout(timer);
  }, [messageDuration, success]);

  const currentSearch = searchValue !== undefined ? searchValue : internalSearch;
  const currentSelectedKeys = selectedRowKeys !== undefined ? selectedRowKeys : internalSelectedKeys;
  const currentPage = page !== undefined ? page : internalPage;
  const currentPageSize = pageSize !== undefined ? pageSize : internalPageSize;
  const currentVisibleIds = visibleColumnIds !== undefined ? visibleColumnIds : internalVisibleIds;
  const columnWidths = controlledColumnWidths !== undefined ? controlledColumnWidths : internalColumnWidths;
  const currentSortColumn = controlledSortColumn !== undefined ? controlledSortColumn : internalSortColumn;
  const currentSortDirection = controlledSortDirection !== undefined ? controlledSortDirection : internalSortDirection;

  const activeColumns = useMemo(() => (
    columns.filter((column) => currentVisibleIds.includes(column.id))
  ), [columns, currentVisibleIds]);

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

  const changePageSize = useCallback((nextPageSize) => {
    const normalized = Number(nextPageSize) || defaultPageSize;
    if (pageSize === undefined) setInternalPageSize(normalized);
    onPageSizeChange?.(normalized);
    if (page === undefined) setInternalPage(1);
    onPageChange?.(1);
  }, [defaultPageSize, onPageChange, onPageSizeChange, page, pageSize]);

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
    memoryState,
    rememberSelection,
    safePage,
  ]);

  stateSnapshotRef.current = buildMemoryState;

  const saveNow = useCallback(() => {
    writeMemory(resolvedMemoryKey, stateSnapshotRef.current?.() || {});
  }, [resolvedMemoryKey]);

  const clearSavedState = useCallback(() => {
    clearMemory(resolvedMemoryKey);
  }, [resolvedMemoryKey]);

  useEffect(() => {
    if (initialMemory.custom && typeof onRestoreMemoryState === 'function') {
      onRestoreMemoryState(initialMemory.custom, initialMemory);
    }
    restoreScrollRef.current = {
      top: Number(initialMemory.tableScrollTop) || 0,
      left: Number(initialMemory.tableScrollLeft) || 0,
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
      setFilterPanelPosition(measurePanelPosition(filterButtonRef.current, filterPanelWidth));
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
    const startWidth = event.currentTarget.parentElement?.offsetWidth || DEFAULT_COLUMN_WIDTH;
    const onMouseMove = (moveEvent) => {
      const nextWidth = Math.max(MIN_COLUMN_WIDTH, startWidth + moveEvent.clientX - startX);
      setColumnWidths((previous) => ({ ...previous, [columnId]: nextWidth }));
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
    const width = columnWidths[column.id] || column.width;
    if (width) return { width, minWidth: width, maxWidth: width };
    return column.minWidth ? { minWidth: column.minWidth } : undefined;
  }, [columnWidths]);

  const visibleColumnKey = activeColumns.map((column) => column.id).join('|');
  const hasResizedColumns = Object.keys(columnWidths).length > 0;
  const resizedTableMinWidth = hasResizedColumns
    ? activeColumns.reduce((sum, column) => sum + (columnWidths[column.id] || column.width || DEFAULT_COLUMN_WIDTH), 88)
    : undefined;

  useLayoutEffect(() => {
    if (renderContent) return undefined;

    const measure = () => {
      const cells = Array.from(sizingHeaderRef.current?.querySelectorAll('th') || []);
      if (!cells.length || !bodyTableRef.current || !tableScrollRef.current) return;
      const widths = cells.map((cell) => Math.round(cell.getBoundingClientRect().width));
      if (widths.some((width) => width <= 0)) return;
      const tableWidth = Math.max(
        Math.round(bodyTableRef.current.scrollWidth),
        Math.round(tableScrollRef.current.clientWidth),
      );
      setHeaderMetrics((previous) => {
        const unchanged = previous.tableWidth === tableWidth
          && previous.widths.length === widths.length
          && previous.widths.every((width, index) => width === widths[index]);
        return unchanged ? previous : { widths, tableWidth };
      });
    };
    const frame = window.requestAnimationFrame(measure);
    const observer = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(measure) : null;
    const observedElement = bodyTableRef.current;
    if (observer && typeof Element !== 'undefined' && observedElement instanceof Element) {
      observer.observe(observedElement);
    }
    window.addEventListener('resize', measure);
    return () => {
      window.cancelAnimationFrame(frame);
      observer?.disconnect();
      window.removeEventListener('resize', measure);
    };
  }, [columnWidths, displayedRows.length, renderContent, visibleColumnKey]);

  const renderHeaderRow = (interactive) => (
    <tr className="h-11 border-y border-gray-300 bg-gray-100 text-xs font-semibold text-gray-700">
      {selectable && (
        <th className="group w-11 min-w-11 border-r border-gray-200 px-2 text-center transition-colors duration-150 hover:bg-purple-50 hover:text-purple-700">
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
          className={classNames(
            'group relative border-r border-gray-200 px-3 text-left transition-colors duration-150 hover:bg-purple-50 hover:text-purple-700',
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
        <th className="group w-10 min-w-10 px-1 text-center transition-colors duration-150 hover:bg-purple-50 hover:text-purple-700">
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
          'border-b border-gray-200 text-xs text-gray-700',
          selected ? 'bg-purple-50' : `${getStripeClassName(rowIndex)} hover:bg-purple-50/40`,
          (onRowOpen || onRowClick || onRowDoubleClick) && 'cursor-pointer',
          getRowClassName?.(row, rowIndex),
        )}
      >
        {selectable && (
          <td className="w-11 min-w-11 border-r border-gray-100 px-2 py-1.5 text-center" onClick={(event) => event.stopPropagation()}>
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
              style={columnWidthStyle(column)}
              className={classNames(
                'overflow-hidden border-r border-gray-100 px-2 py-1.5 text-xs',
                column.numeric ? 'whitespace-nowrap text-right tabular-nums' : 'whitespace-nowrap',
                column.className,
              )}
              title={column.title ? column.title(value, row) : titleValue}
            >
              <div className="truncate">{content}</div>
            </td>
          );
        })}
        {allowColumnVisibility && <td className="w-6 min-w-6 px-0.5 py-1.5" />}
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

  const renderRows = () => {
    if (loading) {
      return (
        <tr><td colSpan={activeColumns.length + (selectable ? 1 : 0) + (allowColumnVisibility ? 1 : 0)} className="px-4 py-12 text-center text-sm text-gray-500">{loadingText}</td></tr>
      );
    }
    if (!displayedRows.length) {
      return (
        <tr><td colSpan={activeColumns.length + (selectable ? 1 : 0) + (allowColumnVisibility ? 1 : 0)} className="px-4 py-12 text-center text-sm text-gray-500">{emptyText}</td></tr>
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
    if (renderBody) return renderBody({ ...context, getRowInteractionProps });
    if (renderRow) {
      return displayedRows.map((row, index) => {
        const renderedRow = renderRow(row, index, { ...context, getRowInteractionProps });
        if (!onRowOpen || !React.isValidElement(renderedRow)) return renderedRow;
        return React.cloneElement(renderedRow, {
          ...getRowInteractionProps(row),
          className: classNames(renderedRow.props.className, 'cursor-pointer'),
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

  const tableStyle = hasResizedColumns ? { minWidth: resizedTableMinWidth } : undefined;
  const headerColumnCount = activeColumns.length + (selectable ? 1 : 0) + (allowColumnVisibility ? 1 : 0);

  return (
    <div
      ref={rootRef}
      className={classNames('unified-index-root flex min-h-0 flex-col overflow-hidden bg-gray-50', className)}
      style={{
        height: `calc(100% + ${pullToHeader}px)`,
        marginTop: `-${pullToHeader}px`,
      }}
    >
      <style>{`
        .unified-index-scroll { scrollbar-width: none; -ms-overflow-style: none; }
        .unified-index-scroll::-webkit-scrollbar { width: 0; height: 0; display: none; }
        @keyframes unified-index-message-in {
          from { opacity: 0; transform: translateY(-4px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .unified-index-message { animation: unified-index-message-in 180ms ease-out; }
      `}</style>

      <section className="flex min-h-0 flex-1 flex-col border border-gray-300 bg-white">
        <div className={classNames('relative z-30 shrink-0 bg-white', toolbarClassName)}>
          <div className="flex min-h-[46px] items-center gap-2 px-3 py-1.5">
            {primaryAction && (
              <button
                type="button"
                onClick={() => executeAction(primaryAction)}
                disabled={primaryAction.disabled}
                className={classNames(
                  'inline-flex h-9 shrink-0 items-center gap-2 rounded border px-3 text-xs font-semibold disabled:cursor-not-allowed disabled:opacity-50',
                  resolveButtonClass(primaryAction.variant || 'primary'),
                  primaryAction.className,
                )}
              >
                {primaryAction.icon}
                {primaryAction.label}
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
                  'inline-flex h-9 shrink-0 items-center gap-2 rounded border px-3 text-xs font-medium disabled:opacity-50',
                  resolveButtonClass(action.variant),
                  action.className,
                )}
              >
                {action.icon}{action.label}
              </button>
            ))}

            <div className="flex shrink-0 flex-col justify-center whitespace-nowrap">
              {showHistoryNavigation && previousPages.length > 0 && (
                <div className="mb-0.5 flex h-3 items-center gap-1 text-[10px] leading-none text-gray-500">
                  {previousPages.map((page, index) => (
                    <React.Fragment key={`${page.path || page.label}-${index}`}>
                      {index > 0 && (
                        <FiChevronRight className="shrink-0 text-gray-400" size={10} strokeWidth={2.4} />
                      )}
                      <button
                        type="button"
                        onClick={() => handlePreviousPage(page)}
                        className="max-w-36 truncate transition-colors hover:text-purple-700"
                        title={`Revenir à ${page.label}`}
                      >
                        {page.label}
                      </button>
                    </React.Fragment>
                  ))}
                </div>
              )}
              <h1 className="text-base font-bold leading-tight text-gray-900">{title}</h1>
            </div>

            <div className="group flex min-w-[220px] flex-1 items-center rounded border border-gray-300 bg-white transition-all duration-200 hover:border-purple-400 hover:bg-purple-50/30 hover:shadow-sm focus-within:border-purple-500 focus-within:bg-white focus-within:ring-2 focus-within:ring-purple-100">
              <FiSearch className="ml-3 shrink-0 text-gray-500 transition-all duration-200 group-hover:scale-110 group-hover:text-purple-600 group-focus-within:scale-110 group-focus-within:text-purple-700" size={17} />
              {currentSelectedKeys.length > 0 && (
                <span className="ml-2 shrink-0 rounded bg-purple-100 px-2 py-1 text-xs font-medium text-purple-700">
                  {currentSelectedKeys.length} selectionnee(s)
                </span>
              )}
              {filterChips.map((chip) => (
                <span key={chip.id} className="ml-1 inline-flex shrink-0 items-center gap-1 rounded bg-teal-100 px-2 py-1 text-xs text-teal-700">
                  {chip.label}
                  {onRemoveFilterChip && (
                    <button type="button" onClick={() => onRemoveFilterChip(chip)} className="hover:text-teal-900"><FiX size={12} /></button>
                  )}
                </span>
              ))}
              <input
                value={currentSearch}
                onChange={(event) => setSearch(event.target.value)}
                placeholder={searchPlaceholder}
                className="h-9 min-w-[90px] flex-1 bg-transparent px-3 text-sm outline-none"
              />
              {searchActions.map((action) => (
                <button
                  key={action.id || action.label || action.title}
                  type="button"
                  onClick={() => executeAction(action)}
                  disabled={action.disabled}
                  title={action.title || action.label}
                  aria-label={action.title || action.label}
                  className={classNames(
                    'mr-1 inline-flex h-8 shrink-0 items-center justify-center gap-1.5 rounded px-2 text-xs font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50',
                    action.active ? 'bg-purple-50 text-purple-700' : 'text-gray-500 hover:bg-purple-50 hover:text-purple-700',
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
                  title="Filtres"
                  className={classNames('mr-1 inline-flex h-8 w-8 items-center justify-center rounded', showFilters ? 'bg-purple-50 text-purple-700' : 'text-gray-500 hover:bg-purple-50 hover:text-purple-700')}
                >
                  <FiFilter size={17} />
                </button>
              )}
            </div>

            {trailingActions.map((action) => (
              <button
                key={action.id || action.label}
                type="button"
                onClick={() => executeAction(action)}
                disabled={action.disabled}
                title={action.title}
                className={classNames(
                  'inline-flex h-9 shrink-0 items-center gap-2 rounded border px-3 text-xs font-medium disabled:opacity-50',
                  resolveButtonClass(action.variant),
                  action.className,
                )}
              >
                {action.icon}{action.label}
              </button>
            ))}

            <div className="flex shrink-0 items-center gap-2">
              <span className="text-xs text-gray-500">Afficher</span>
              <select
                value={currentPageSize}
                onChange={(event) => changePageSize(event.target.value)}
                className="h-9 rounded border border-gray-300 bg-white px-2 text-xs outline-none focus:border-purple-500"
              >
                {pageSizeOptions.map((size) => <option key={size} value={size}>{size}</option>)}
              </select>
              <span className="text-xs text-gray-500">lignes</span>
            </div>
          </div>

          {renderToolbarExtension && (
            <div className="border-t border-gray-200 bg-white px-3 py-1">
              {renderToolbarExtension()}
            </div>
          )}

          {visibleError && (
            <div className="unified-index-message flex items-center gap-2 border-t border-red-200 bg-red-50 px-3 py-1.5 text-xs text-red-700">
              <FiAlertCircle className="shrink-0" size={14} />
              <span className="min-w-0 flex-1">{visibleError}</span>
              <button type="button" onClick={() => { setVisibleError(''); dismissErrorRef.current?.(); }} title="Fermer" className="rounded p-0.5 transition-colors hover:bg-red-100 hover:text-red-900">
                <FiX size={14} />
              </button>
            </div>
          )}
          {visibleSuccess && (
            <div className="unified-index-message flex items-center gap-2 border-t border-green-200 bg-green-50 px-3 py-1.5 text-xs text-green-700">
              <FiCheck className="shrink-0" size={14} />
              <span className="min-w-0 flex-1">{visibleSuccess}</span>
              <button type="button" onClick={() => { setVisibleSuccess(''); dismissSuccessRef.current?.(); }} title="Fermer" className="rounded p-0.5 transition-colors hover:bg-green-100 hover:text-green-900">
                <FiX size={14} />
              </button>
            </div>
          )}
          {currentSelectedKeys.length > 0 && (
            <div className="flex min-h-9 items-center justify-between gap-3 border-y border-gray-300 bg-gray-50 px-3 py-1 text-xs">
              <div className="min-w-0 flex-1 text-gray-700">
                {renderSelectionSummary
                  ? renderSelectionSummary(selectedRows, currentSelectedKeys)
                  : `${currentSelectedKeys.length} ligne(s) selectionnee(s)`}
              </div>
              <div className="flex shrink-0 items-center gap-2">
                {selectionActions.map((action) => (
                  <button
                    key={action.id || action.label}
                    type="button"
                    onClick={() => executeAction(action)}
                    disabled={typeof action.disabled === 'function' ? action.disabled(selectedRows) : action.disabled}
                    className={classNames(
                      'h-7 rounded border px-2 text-xs font-medium disabled:opacity-50',
                      resolveButtonClass(action.variant),
                      action.className,
                    )}
                  >
                    {action.label}
                  </button>
                ))}
                <button type="button" onClick={() => setSelected([])} className="h-7 rounded border border-gray-300 bg-white px-2 text-xs text-gray-700 hover:bg-gray-100">
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
            className="unified-index-scroll relative min-h-0 flex-1 overflow-y-auto overscroll-contain"
          >
            {renderCustomContent()}
          </div>
        ) : <>
        <div ref={fixedHeaderScrollRef} className="shrink-0 overflow-hidden">
          <table
            className="w-full table-auto border-collapse text-sm"
            style={{
              width: headerMetrics.tableWidth || '100%',
              minWidth: headerMetrics.tableWidth || resizedTableMinWidth,
              tableLayout: headerMetrics.widths.length ? 'fixed' : 'auto',
            }}
          >
            {headerMetrics.widths.length === headerColumnCount && (
              <colgroup>
                {headerMetrics.widths.map((width, index) => <col key={`${visibleColumnKey}-${index}`} style={{ width }} />)}
              </colgroup>
            )}
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
          className="unified-index-scroll relative min-h-0 flex-1 overscroll-contain overflow-auto"
        >
          <table ref={bodyTableRef} className="w-full table-auto border-collapse text-sm" style={tableStyle}>
            <thead ref={sizingHeaderRef} aria-hidden="true" style={{ visibility: 'collapse' }}>
              {renderHeaderRow(false)}
            </thead>
            <tbody>{renderRows()}</tbody>
          </table>
        </div>
        </>}

        <footer className="shrink-0 border-t border-gray-300 bg-gray-50 px-4 py-2">
          <div className="flex items-center justify-between">
            <div className="text-xs text-gray-600">{footerText || `Page ${safePage} sur ${totalPages}`}</div>
            <div className="flex items-center gap-1">
              <button type="button" onClick={() => changePage(1)} disabled={safePage === 1} className="rounded border border-gray-300 p-1 disabled:opacity-40"><FiChevronsLeft size={14} /></button>
              <button type="button" onClick={() => changePage(safePage - 1)} disabled={safePage === 1} className="rounded border border-gray-300 p-1 disabled:opacity-40"><FiChevronLeft size={14} /></button>
              <button type="button" onClick={() => changePage(safePage + 1)} disabled={safePage === totalPages} className="rounded border border-gray-300 p-1 disabled:opacity-40"><FiChevronRight size={14} /></button>
              <button type="button" onClick={() => changePage(totalPages)} disabled={safePage === totalPages} className="rounded border border-gray-300 p-1 disabled:opacity-40"><FiChevronsRight size={14} /></button>
            </div>
          </div>
        </footer>
      </section>

      {showFilters && renderFilters && renderPortal(
        <div
          ref={filterPanelRef}
          onClick={(event) => event.stopPropagation()}
          style={{
            position: 'fixed',
            top: filterPanelPosition.top,
            left: filterPanelPosition.left,
            width: filterPanelWidth,
            maxHeight: `calc(100vh - ${filterPanelPosition.top + 10}px)`,
          }}
          className="z-[1000] max-w-[calc(100vw-16px)] overflow-y-auto rounded border border-gray-300 bg-white shadow-xl"
        >
          {renderFilters({ close: () => setShowFilters(false), saveNow, clearSavedState })}
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
