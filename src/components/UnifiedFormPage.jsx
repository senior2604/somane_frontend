import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import { isCorePage } from '../services/pageModule';
import { useNotifications } from '../context/NotificationContext';
import { FormMessage } from './FeedbackPrimitives';
import {
  FiChevronRight,
  FiChevronDown,
  FiInfo,
  FiPlus,
  FiSearch,
  FiUploadCloud,
  FiX,
} from 'react-icons/fi';

const HISTORY_KEY = 'somane:navigation:history';
const CURRENT_PAGE_KEY = 'somane:navigation:current-page';
const PREVIOUS_PAGE_KEY = 'somane:navigation:previous-page';
const HISTORY_CHANGED_EVENT = 'somane:navigation-history-changed';
const FORM_MEMORY_PREFIX = 'somane:unified-form';
const debugUnifiedForm = (message, details) => {
  if (typeof process !== 'undefined' && process.env?.NODE_ENV === 'production') return;
  if (details === undefined) console.log(`[UnifiedFormPage] ${message}`);
  else console.log(`[UnifiedFormPage] ${message}`, details);
};

const PAGE_LABELS = [
  ['/comptabilite/dashboard', 'Tableau de bord comptable'],
  ['/comptabilite/pieces', 'Pièces comptables'],
  ['/comptabilite/ecritures', 'Écritures comptables'],
  ['/comptabilite/paiements', 'Paiements'],
  ['/comptabilite/payements', 'Paiements'],
  ['/comptabilite/lettrage', 'Lettrage des comptes'],
  ['/comptabilite/journaux', 'Journaux comptables'],
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

const safeParse = (value, fallback = null) => {
  try {
    return value ? JSON.parse(value) : fallback;
  } catch {
    return fallback;
  }
};

const getPageLabel = (path = '') => {
  const pathname = String(path).split('?')[0];
  const match = PAGE_LABELS
    .filter(([route]) => pathname === route || pathname.startsWith(`${route}/`))
    .sort((left, right) => right[0].length - left[0].length)[0];

  if (match) return match[1];

  const segment = pathname.split('/').filter(Boolean).pop() || 'Accueil';
  if (/^\d+$/.test(segment)) return 'Détail';
  return segment
    .replace(/[-_]+/g, ' ')
    .replace(/^./, letter => letter.toUpperCase());
};

const normalizeHistoryPage = (page) => {
  if (!page?.path || !page?.label) return page;
  const label = String(page.label).trim();
  if (/^création d['’]une pièce comptable$/i.test(label)) {
    return { ...page, label: 'Création' };
  }
  if (/^détail de la pièce comptable$/i.test(label)) {
    return { ...page, label: 'Détail' };
  }
  return page;
};

const readHistory = () => {
  if (typeof window === 'undefined') return [];
  const history = safeParse(window.sessionStorage.getItem(HISTORY_KEY), []);
  return Array.isArray(history)
    ? history.filter(page => page?.path && page?.label).map(normalizeHistoryPage)
    : [];
};

const writeCurrentPage = (page) => {
  if (typeof window === 'undefined' || !page?.path || !page?.label) return;

  try {
    const history = readHistory();
    const currentPage = safeParse(window.sessionStorage.getItem(CURRENT_PAGE_KEY));

    if (currentPage?.path && currentPage.path !== page.path) {
      window.sessionStorage.setItem(PREVIOUS_PAGE_KEY, JSON.stringify(currentPage));
    }

    if (history[history.length - 1]?.path === page.path) {
      history[history.length - 1] = page;
    } else {
      history.push(page);
    }

    window.sessionStorage.setItem(HISTORY_KEY, JSON.stringify(history.slice(-20)));
    window.sessionStorage.setItem(CURRENT_PAGE_KEY, JSON.stringify(page));
    window.dispatchEvent(new CustomEvent(HISTORY_CHANGED_EVENT));
  } catch {}
};

const resolvePreviousPages = (currentPath, locationState) => {
  const history = readHistory();
  const visitsBeforeCurrent = history[history.length - 1]?.path === currentPath
    ? history.slice(0, -1)
    : history;
  const statePages = Array.isArray(locationState?.previousPages)
    ? locationState.previousPages.map(normalizeHistoryPage)
    : [];
  const returnTo = locationState?.returnTo || locationState?.returnContext?.returnTo || '';
  const candidates = [
    ...visitsBeforeCurrent,
    ...statePages,
    ...(returnTo ? [{ path: returnTo, label: getPageLabel(returnTo) }] : []),
  ].filter(page => page?.path && page?.label && page.path !== currentPath);
  const ordered = [];

  candidates.forEach(page => {
    if (ordered[ordered.length - 1]?.path === page.path) return;
    ordered.push(page);
  });

  return ordered.slice(-2);
};

/**
 * Structure visuelle commune des écrans Create et Show.
 * Les champs, les appels API et les validations restent dans la page métier.
 */
export default function UnifiedFormPage({
  title,
  recordLabel = '',
  pageLabel,
  mode = 'create',
  fallbackPath = '/dashboard',
  pullToHeader = 24,
  className = '',

  primaryAction = { label: 'Nouveau', icon: <FiPlus size={12} /> },
  onTitleClick,
  headerActions = [],
  headerActionsCentered = true,
  actionsMenu,

  onSave,
  saveLabel = 'Enregistrer',
  saveIcon = <FiUploadCloud size={16} />,
  saveDisabled = false,
  saving = false,
  autoReturnAfterSave = false,
  onAfterSave,
  buildReturnState,

  hasUnsavedChanges = false,
  exitTitle = 'Modifications non sauvegardées',
  exitMessage = 'Vous avez des modifications non sauvegardées. Voulez-vous les enregistrer avant de quitter cette page ?',
  exitSaveLabel = 'Enregistrer',

  memoryKey,
  memoryState,
  onRestoreMemoryState,
  rememberForm = true,

  feedback,
  fieldMessages = [],
  onDismissFeedback,
  messageDuration,
  process,

  children,
  traceability,
  traceabilityWidth = 320,
  noContext,
  recordNavigator,
}) {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useLanguage();
  const { notify } = useNotifications();
  const isAccountingModulePage = location.pathname.startsWith('/comptabilite/');
  const isCoreModulePage = isCorePage(location.pathname);
  const effectivePullToHeader = isCoreModulePage ? 0 : pullToHeader;
  const currentPath = `${location.pathname}${location.search || ''}`;
  const resolvedPageLabel = pageLabel || (mode === 'show' ? `Détail ${title}` : `Création ${title}`);
  const resolvedMemoryKey = memoryKey
    ? `${FORM_MEMORY_PREFIX}:${memoryKey}`
    : `${FORM_MEMORY_PREFIX}:${currentPath}`;

  const [previousPages, setPreviousPages] = useState(() => (
    resolvePreviousPages(currentPath, location.state)
  ));
  const [exitDialogOpen, setExitDialogOpen] = useState(false);
  const [pendingTarget, setPendingTarget] = useState(null);
  const [recordNavigatorOpen, setRecordNavigatorOpen] = useState(false);
  const [recordNavigatorSearch, setRecordNavigatorSearch] = useState('');
  const recordNavigatorRef = useRef(null);
  const restoredRef = useRef(false);
  const saveTimerRef = useRef(null);
  const lastFeedbackRef = useRef('');

  const traceOpen = Boolean(traceability?.open);
  const hasTraceability = Boolean(traceability);
  const recordNavigatorRecords = Array.isArray(recordNavigator?.records) ? recordNavigator.records : [];
  const visibleRecordNavigatorRecords = recordNavigatorRecords.filter((record) => (
    `${record.label || ''} ${record.detail || ''}`.toLocaleLowerCase('fr').includes(recordNavigatorSearch.trim().toLocaleLowerCase('fr'))
  ));

  useEffect(() => {
    if (!recordNavigatorOpen) return undefined;
    const closeOnOutsideClick = (event) => {
      if (!recordNavigatorRef.current?.contains(event.target)) setRecordNavigatorOpen(false);
    };
    const closeOnEscape = (event) => {
      if (event.key === 'Escape') setRecordNavigatorOpen(false);
    };
    document.addEventListener('mousedown', closeOnOutsideClick);
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.removeEventListener('mousedown', closeOnOutsideClick);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, [recordNavigatorOpen]);

  useEffect(() => {
    writeCurrentPage({ path: currentPath, label: resolvedPageLabel });
    setPreviousPages(resolvePreviousPages(currentPath, location.state));
  }, [currentPath, location.state, resolvedPageLabel]);

  useEffect(() => {
    const synchronizeHistory = () => {
      setPreviousPages(resolvePreviousPages(currentPath, location.state));
    };
    window.addEventListener(HISTORY_CHANGED_EVENT, synchronizeHistory);
    return () => window.removeEventListener(HISTORY_CHANGED_EVENT, synchronizeHistory);
  }, [currentPath, location.state]);

  useEffect(() => {
    if (!feedback?.message) {
      lastFeedbackRef.current = '';
      return;
    }
    const signature = `${feedback.type || 'info'}:${feedback.message}`;
    if (lastFeedbackRef.current === signature) return;
    lastFeedbackRef.current = signature;
    notify(feedback.message, {
      severity: ['error', 'warning', 'success'].includes(feedback.type) ? feedback.type : 'info',
      duration: messageDuration,
      onDismiss: onDismissFeedback,
    });
  }, [feedback?.message, feedback?.type, messageDuration, notify, onDismissFeedback]);

  useEffect(() => {
    if (!rememberForm || !resolvedMemoryKey || restoredRef.current) return;
    const saved = safeParse(window.sessionStorage.getItem(resolvedMemoryKey));
    if (saved?.state && typeof onRestoreMemoryState === 'function') {
      onRestoreMemoryState(saved.state);
    }
    restoredRef.current = true;
  }, [onRestoreMemoryState, rememberForm, resolvedMemoryKey]);

  useEffect(() => {
    if (!rememberForm || !resolvedMemoryKey || !restoredRef.current) return undefined;
    window.clearTimeout(saveTimerRef.current);
    saveTimerRef.current = window.setTimeout(() => {
      try {
        window.sessionStorage.setItem(resolvedMemoryKey, JSON.stringify({
          state: memoryState,
          savedAt: Date.now(),
        }));
      } catch {}
    }, 250);
    return () => window.clearTimeout(saveTimerRef.current);
  }, [memoryState, rememberForm, resolvedMemoryKey]);

  useEffect(() => {
    const handleBeforeUnload = event => {
      if (!hasUnsavedChanges) return;
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasUnsavedChanges]);

  const defaultReturnState = useCallback((savedRecord = null) => {
    const baseState = {
      ...(location.state || {}),
      restoredFromSmartBack: true,
    };
    if (!savedRecord) return baseState;
    return {
      ...baseState,
      createdRecord: savedRecord,
      created_record: savedRecord,
      selectedRecord: savedRecord,
      updatedRecord: savedRecord,
    };
  }, [location.state]);

  const makeReturnState = useCallback((savedRecord = null) => {
    if (typeof buildReturnState === 'function') {
      return buildReturnState(savedRecord, {
        location,
        currentPath,
        previousPages,
      });
    }
    return defaultReturnState(savedRecord);
  }, [buildReturnState, currentPath, defaultReturnState, location, previousPages]);

  const getReturnTarget = useCallback((savedRecord = null) => {
    const returnTo = location.state?.returnTo || location.state?.returnContext?.returnTo;
    if (returnTo && returnTo !== currentPath) {
      return { path: returnTo, state: makeReturnState(savedRecord) };
    }

    const previousPage = previousPages[previousPages.length - 1];
    if (previousPage?.path && previousPage.path !== currentPath) {
      return {
        path: previousPage.path,
        state: { restoredFromSmartBack: true },
      };
    }

    return {
      path: fallbackPath,
      state: { restoredFromSmartBack: true },
    };
  }, [currentPath, fallbackPath, location.state, makeReturnState, previousPages]);

  const performNavigation = useCallback(target => {
    if (!target?.path) return;
    navigate(target.path, target.state ? { state: target.state } : undefined);
  }, [navigate]);

  const requestExit = useCallback(target => {
    const destination = target || getReturnTarget();
    if (!hasUnsavedChanges) {
      performNavigation(destination);
      return;
    }
    setPendingTarget(destination);
    setExitDialogOpen(true);
  }, [getReturnTarget, hasUnsavedChanges, performNavigation]);

  const save = useCallback(async ({ returnAfterSave = autoReturnAfterSave } = {}) => {
    debugUnifiedForm('Demande d’enregistrement', {
      currentPath,
      hasOnSave: typeof onSave === 'function',
      saving,
      saveDisabled,
      returnAfterSave,
    });
    if (typeof onSave !== 'function' || saving || saveDisabled) {
      debugUnifiedForm('Enregistrement bloqué avant appel métier', {
        reason: typeof onSave !== 'function' ? 'onSave absent' : saving ? 'déjà en cours' : 'désactivé',
      });
      return false;
    }
    const savedRecord = await onSave();
    debugUnifiedForm('Réponse de onSave reçue', savedRecord);
    if (!savedRecord) {
      debugUnifiedForm('Aucune redirection : onSave a retourné false ou null');
      return false;
    }

    try {
      window.sessionStorage.removeItem(resolvedMemoryKey);
    } catch {}

    onAfterSave?.(savedRecord);
    if (returnAfterSave) {
      const target = getReturnTarget(savedRecord);
      debugUnifiedForm('Redirection automatique après enregistrement', target);
      performNavigation(target);
    } else {
      debugUnifiedForm('Pas de redirection automatique : la page métier gère la destination');
    }
    return savedRecord;
  }, [
    autoReturnAfterSave,
    currentPath,
    getReturnTarget,
    onAfterSave,
    onSave,
    performNavigation,
    resolvedMemoryKey,
    saveDisabled,
    saving,
  ]);

  const saveAndLeave = async () => {
    const savedRecord = await save({ returnAfterSave: false });
    if (!savedRecord) return;
    const explicitReturnTo = location.state?.returnTo || location.state?.returnContext?.returnTo;
    const target = explicitReturnTo && pendingTarget?.path === explicitReturnTo
      ? { ...pendingTarget, state: makeReturnState(savedRecord) }
      : pendingTarget || getReturnTarget(savedRecord);
    setExitDialogOpen(false);
    setPendingTarget(null);
    performNavigation(target);
  };

  const leaveWithoutSaving = () => {
    const target = pendingTarget || getReturnTarget();
    setExitDialogOpen(false);
    setPendingTarget(null);
    performNavigation(target);
  };

  const executeHeaderAction = action => {
    if (action?.path) {
      requestExit({
        path: action.path,
        state: {
          ...(action.state || {}),
          returnTo: currentPath,
          previousPages,
        },
      });
      return;
    }
    action?.onClick?.({
      navigate,
      location,
      requestExit,
      getReturnTarget,
      previousPages,
    });
  };

  const history = useMemo(() => previousPages.slice(-1), [previousPages]);
  const recordLabelIsCurrentItem = Boolean(
    recordLabel && history[0]?.label?.trim().toLowerCase() === String(title).trim().toLowerCase(),
  );

  if (noContext) {
    return (
      <div
        className={classNames(
          'somane-page-layout',
          isAccountingModulePage && 'somane-page-layout--accounting',
        )}
        style={{ '--somane-page-pull': `${effectivePullToHeader}px` }}
      >
        <section className="somane-page-layout__surface">
          <div className="border-b border-gray-300 px-4 py-3 text-lg font-bold text-gray-900">
            {title}
          </div>
          <div className="p-8">{noContext}</div>
        </section>
      </div>
    );
  }

  return (
    <div
      className={classNames(
        'somane-page-layout unified-form-root',
        isAccountingModulePage && 'somane-page-layout--accounting',
        className,
      )}
      style={{ '--somane-page-pull': `${effectivePullToHeader}px` }}
    >
      <style>{`
        .unified-form-scroll { scrollbar-width: none; -ms-overflow-style: none; }
        .unified-form-scroll::-webkit-scrollbar { width: 0; height: 0; display: none; }
        @keyframes unified-form-message-in {
          from { opacity: 0; transform: translateY(-4px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .unified-form-message { animation: unified-form-message-in 180ms ease-out; }
        @media (max-width: 1159px) {
          .unified-form-grid[data-trace-open="true"] {
            grid-template-columns: minmax(0, 1fr) !important;
            grid-template-rows: minmax(0, 1fr) minmax(180px, 32vh);
          }
          .unified-form-grid[data-trace-open="true"] > aside {
            border-left: 0;
            border-top: 1px solid rgb(209 213 219);
          }
        }
      `}</style>

      <section className="somane-page-layout__surface overflow-visible">
        <header className={classNames(
          'somane-page-header-band relative z-20 shrink-0 border-b border-gray-300 pointer-events-auto',
        )}>
          <div className={classNames('somane-page-header-row relative justify-between', recordNavigator && 'has-record-navigator')}>
            <div className="flex min-w-0 items-center gap-2">
              {primaryAction && (
                <button
                  type="button"
                  onClick={() => executeHeaderAction(primaryAction)}
                  disabled={primaryAction.disabled}
                  title="Nouveau"
                  className="somane-btn somane-btn--primary somane-btn--new disabled:cursor-not-allowed"
                >
                  {primaryAction.icon && React.isValidElement(primaryAction.icon)
                    ? React.cloneElement(primaryAction.icon, { size: 12, 'aria-hidden': true })
                    : primaryAction.icon || <FiPlus size={12} aria-hidden="true" />}
                  <span>Nouveau</span>
                </button>
              )}

              <div className="flex min-w-0 flex-col justify-center">
                {history.length > 0 && (
                  <div className="somane-breadcrumb mb-0.5 flex h-3 max-w-[440px] items-center gap-1 overflow-hidden text-[10px] leading-none text-gray-500" aria-label="Fil d’Ariane">
                    {history.map((page, index) => (
                      <React.Fragment key={`${page.path}-${index}`}>
                        {index > 0 && (
                          <FiChevronRight className="shrink-0 text-gray-400" size={10} strokeWidth={2.4} />
                        )}
                        <button
                          type="button"
                          onClick={() => requestExit({
                            path: page.path,
                            state: { restoredFromSmartBack: true },
                          })}
                          className="somane-breadcrumb__link max-w-44 truncate transition-colors hover:text-purple-700"
                          title={`Revenir à ${page.label}`}
                        >
                          {t(page.label)}
                        </button>
                      </React.Fragment>
                    ))}
                  </div>
                )}
                <div className="flex min-w-0 items-baseline gap-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      if (onTitleClick) onTitleClick({ requestExit, getReturnTarget });
                      else requestExit({ path: fallbackPath, state: { restoredFromSmartBack: true } });
                    }}
                    className="min-w-0 truncate text-left text-base font-bold leading-tight text-gray-900 transition-all duration-200 hover:text-purple-600"
                  >
                    {recordLabelIsCurrentItem && title !== 'Pièces comptables'
                      ? recordLabel
                    : title === 'Pièces comptables' ? t('Écriture') : t(title)}
                  </button>
                  {recordLabel && (!recordLabelIsCurrentItem || title === 'Pièces comptables') && (
                    <span className="max-w-48 truncate text-xs font-medium text-gray-700">
                      {recordLabel}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {recordNavigator && recordNavigatorRecords.length > 0 && (
              <div className="somane-list-search somane-record-navigator" ref={recordNavigatorRef}>
                <FiSearch className="somane-list-search__icon" size={17} aria-hidden="true" />
                <div className="somane-list-search__query">
                  <input
                    type="search"
                    className="somane-list-search__input"
                    value={recordNavigatorSearch}
                    onChange={(event) => {
                      setRecordNavigatorSearch(event.target.value);
                      setRecordNavigatorOpen(true);
                    }}
                    onFocus={() => setRecordNavigatorOpen(true)}
                    onKeyDown={(event) => {
                      if (event.key === 'ArrowDown') {
                        event.preventDefault();
                        setRecordNavigatorOpen(true);
                      }
                    }}
                    placeholder={recordNavigator.placeholder || `Rechercher dans ${recordNavigator.label || 'la liste'}...`}
                    aria-label={recordNavigator.placeholder || `Rechercher dans ${recordNavigator.label || 'la liste'}`}
                    aria-expanded={recordNavigatorOpen}
                    aria-controls="somane-record-navigator-options"
                    role="combobox"
                    aria-autocomplete="list"
                  />
                </div>
                <div className="somane-list-search__controls">
                  <button
                    type="button"
                    className="somane-list-search__filter somane-record-navigator__toggle"
                    aria-label={recordNavigatorOpen ? 'Fermer la liste' : 'Afficher la liste'}
                    aria-expanded={recordNavigatorOpen}
                    onClick={() => setRecordNavigatorOpen((open) => !open)}
                  >
                    <FiChevronDown size={14} />
                  </button>
                </div>
                {recordNavigatorOpen && (
                  <div className="somane-record-navigator__menu" id="somane-record-navigator-options" role="listbox">
                    {visibleRecordNavigatorRecords.length > 0 ? visibleRecordNavigatorRecords.map((record) => (
                      <button
                        type="button"
                        role="option"
                        aria-selected={String(record.id) === String(recordNavigator.value)}
                        key={record.id}
                        className={classNames(
                          'somane-record-navigator__option',
                          String(record.id) === String(recordNavigator.value) && 'is-current',
                        )}
                        onClick={() => {
                          setRecordNavigatorOpen(false);
                          setRecordNavigatorSearch('');
                          recordNavigator.onSelect?.(record);
                        }}
                      >
                        <span className="somane-record-navigator__option-label">{record.label}</span>
                        {record.detail && <span className="somane-record-navigator__option-detail">{record.detail}</span>}
                      </button>
                    )) : (
                      <p className="somane-record-navigator__empty">Aucun résultat dans cette liste.</p>
                    )}
                  </div>
                )}
              </div>
            )}

            <div className="somane-form-base-actions relative z-30">
              {!headerActionsCentered && headerActions.map(action => (
                <button
                  key={action.id || action.label}
                  type="button"
                  onClick={() => executeHeaderAction(action)}
                  disabled={action.disabled}
                  title={action.title || action.label}
                  className={classNames(
                    'somane-btn somane-btn--secondary disabled:cursor-not-allowed',
                    action.className,
                  )}
                >
                  {action.icon}{action.label && <span>{t(action.label)}</span>}
                </button>
              ))}

              {actionsMenu && (
                <div className="somane-form-actions-menu" title="Actions">
                  {actionsMenu}
                </div>
              )}

              {onSave && (
                <button
                  type="button"
                  onClick={() => {
                    debugUnifiedForm('Clic sur le bouton Enregistrer', { currentPath, saveLabel });
                    void save();
                  }}
                  disabled={saving || saveDisabled}
                  title={saveLabel}
                  aria-label={saveLabel}
                  className="somane-icon-btn somane-icon-btn--primary somane-icon-btn--round disabled:cursor-not-allowed"
                >
                  {saveIcon}
                </button>
              )}

              <button
                type="button"
                onClick={() => requestExit()}
                title="Quitter la page"
                aria-label="Quitter la page"
                className="somane-icon-btn somane-icon-btn--dark somane-icon-btn--round"
              >
                <FiX size={16} />
              </button>
            </div>

            {headerActionsCentered && headerActions.length > 0 && (
              <div className="somane-form-extra-actions pointer-events-none">
                {headerActions.map((action) => (
                  <button
                    key={action.id || action.label}
                    type="button"
                    onClick={() => executeHeaderAction(action)}
                    disabled={action.disabled}
                    title={action.title || action.label}
                    className={classNames(
                      'pointer-events-auto somane-btn somane-btn--secondary disabled:cursor-not-allowed',
                      action.className,
                    )}
                  >
                    {action.icon}{action.label && <span>{action.label}</span>}
                  </button>
                ))}
              </div>
            )}
          </div>
        </header>

        <div
          className="unified-form-grid grid min-h-0 flex-1 gap-0"
          data-trace-open={traceOpen ? 'true' : 'false'}
          style={{
            gridTemplateColumns: traceOpen
              ? `minmax(0, 1fr) ${traceabilityWidth}px`
              : 'minmax(0, 1fr)',
          }}
        >
          <div className="flex min-h-0 min-w-0 flex-col">
            {process && (
              <div className="shrink-0 border-b border-gray-300 bg-white">
                {process}
              </div>
            )}

            {hasTraceability && !traceOpen && !traceability.headerToggle && (
              <div className="relative z-20 h-0 shrink-0 overflow-visible">
                <button
                  type="button"
                  onClick={traceability.onOpen}
                  className="absolute right-0 top-0 flex h-7 w-7 -translate-y-1/2 translate-x-1/2 items-center justify-center rounded-full border border-purple-300 bg-white text-purple-600 shadow-md transition-all duration-200 hover:scale-110 hover:border-purple-600 hover:bg-purple-600 hover:text-white active:scale-95"
                  title="Afficher la traçabilité"
                  aria-label="Afficher la traçabilité"
                >
                  <FiInfo size={12} />
                </button>
              </div>
            )}

            <main className="unified-form-scroll relative z-0 min-h-0 flex-1 overflow-y-auto overscroll-contain">
              {Array.isArray(fieldMessages) && fieldMessages.length > 0 && (
                <div className="somane-form-message-list" aria-label="Erreurs et aides du formulaire">
                  {fieldMessages.map((item, index) => (
                    <FormMessage
                      key={`${item.fieldId || 'form'}-${item.severity || 'error'}-${index}`}
                      fieldId={item.fieldId}
                      severity={item.severity || 'error'}
                    >
                      {item.message}
                    </FormMessage>
                  ))}
                </div>
              )}
              {children}
            </main>
          </div>

          {hasTraceability && traceOpen && (
            <aside className="somane-side-panel somane-traceability-panel unified-form-scroll relative z-10 min-h-0 overflow-y-auto border-l border-gray-300 bg-gray-50 pointer-events-auto">
              <div className="somane-traceability-panel__header sticky top-0 z-10 flex items-center justify-between border-b border-gray-300 bg-white px-4 py-3">
                <div className="flex min-w-0 items-center gap-2">
                  <FiInfo className="shrink-0 text-purple-600" size={14} />
                  <h2 className="truncate text-xs font-semibold uppercase tracking-wide text-gray-800">
                    {t(traceability.title || 'Traçabilité')}
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={traceability.onClose}
                  className="flex h-7 items-center gap-1 border border-gray-300 px-2 text-xs text-gray-600 transition-all hover:border-purple-500 hover:bg-purple-50 hover:text-purple-700"
                  title={t('Fermer la traçabilité')}
                  aria-label={t('Fermer la traçabilité')}
                >
                  <FiX size={12} />
                  <span>{t('Fermer')}</span>
                </button>
              </div>
              <div className="somane-traceability-content">{traceability.content}</div>
            </aside>
          )}
        </div>
      </section>

      {exitDialogOpen && (
        <div className="somane-overlay-backdrop fixed inset-0 z-[100] flex items-center justify-center bg-black/50 px-4">
          <div className="somane-modal-surface w-full max-w-md border border-gray-300 bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4">
              <h2 className="text-base font-bold text-gray-900">{exitTitle}</h2>
              <button
                type="button"
                onClick={() => {
                  if (saving) return;
                  setExitDialogOpen(false);
                  setPendingTarget(null);
                }}
                disabled={saving}
                className="p-1 text-gray-500 transition-colors hover:bg-purple-50 hover:text-purple-700 disabled:opacity-50"
                title="Fermer"
                aria-label="Fermer"
              >
                <FiX size={16} />
              </button>
            </div>
            <p className="px-5 py-5 text-sm leading-5 text-gray-600">{exitMessage}</p>
            <div className="flex justify-end gap-3 border-t border-gray-200 px-5 py-4">
              <button
                type="button"
                onClick={leaveWithoutSaving}
                disabled={saving}
                className="border border-gray-300 px-4 py-2 text-sm text-gray-700 transition-all duration-200 hover:border-red-400 hover:bg-red-50 hover:text-red-700 active:scale-95 disabled:opacity-50"
              >
                Quitter
              </button>
              {onSave && (
                <button
                  type="button"
                  onClick={saveAndLeave}
                  disabled={saving || saveDisabled}
                  className="bg-purple-600 px-4 py-2 text-sm text-white transition-all duration-200 hover:bg-purple-700 hover:shadow-md active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {saving ? 'Enregistrement…' : exitSaveLabel}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
