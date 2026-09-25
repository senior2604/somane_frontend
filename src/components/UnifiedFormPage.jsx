import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  FiAlertCircle,
  FiCheck,
  FiChevronRight,
  FiInfo,
  FiPlus,
  FiUploadCloud,
  FiX,
} from 'react-icons/fi';

const HISTORY_KEY = 'somane:navigation:history';
const CURRENT_PAGE_KEY = 'somane:navigation:current-page';
const PREVIOUS_PAGE_KEY = 'somane:navigation:previous-page';
const HISTORY_CHANGED_EVENT = 'somane:navigation-history-changed';
const FORM_MEMORY_PREFIX = 'somane:unified-form';
const DEFAULT_MESSAGE_DURATION = 30000;
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

const readHistory = () => {
  if (typeof window === 'undefined') return [];
  const history = safeParse(window.sessionStorage.getItem(HISTORY_KEY), []);
  return Array.isArray(history)
    ? history.filter(page => page?.path && page?.label)
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
    ? locationState.previousPages
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

const resolveFeedbackStyle = (type) => {
  if (type === 'error') return 'border-red-200 bg-red-50 text-red-700';
  if (type === 'success') return 'border-green-200 bg-green-50 text-green-700';
  if (type === 'warning') return 'border-amber-200 bg-amber-50 text-amber-700';
  return 'border-blue-200 bg-blue-50 text-blue-700';
};

const FeedbackIcon = ({ type }) => {
  if (type === 'error' || type === 'warning') return <FiAlertCircle size={13} />;
  if (type === 'success') return <FiCheck size={13} />;
  return <FiInfo size={13} />;
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
  pullToHeader = 16,
  className = '',

  primaryAction = { label: 'Nouveau', icon: <FiPlus size={12} /> },
  onTitleClick,
  headerActions = [],
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
  onDismissFeedback,
  messageDuration = DEFAULT_MESSAGE_DURATION,
  process,

  children,
  traceability,
  traceabilityWidth = 320,
  noContext,
}) {
  const navigate = useNavigate();
  const location = useLocation();
  const currentPath = `${location.pathname}${location.search || ''}`;
  const resolvedPageLabel = pageLabel || (mode === 'show' ? `Détail ${title}` : `Création ${title}`);
  const resolvedMemoryKey = memoryKey
    ? `${FORM_MEMORY_PREFIX}:${memoryKey}`
    : `${FORM_MEMORY_PREFIX}:${currentPath}`;

  const [previousPages, setPreviousPages] = useState(() => (
    resolvePreviousPages(currentPath, location.state)
  ));
  const [visibleFeedback, setVisibleFeedback] = useState(feedback || null);
  const [exitDialogOpen, setExitDialogOpen] = useState(false);
  const [pendingTarget, setPendingTarget] = useState(null);
  const restoredRef = useRef(false);
  const saveTimerRef = useRef(null);
  const feedbackTimerRef = useRef(null);

  const traceOpen = Boolean(traceability?.open);
  const hasTraceability = Boolean(traceability);

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
    setVisibleFeedback(feedback || null);
    window.clearTimeout(feedbackTimerRef.current);
    if (!feedback || messageDuration <= 0) return undefined;

    feedbackTimerRef.current = window.setTimeout(() => {
      setVisibleFeedback(null);
      onDismissFeedback?.();
    }, messageDuration);

    return () => window.clearTimeout(feedbackTimerRef.current);
  }, [feedback, messageDuration, onDismissFeedback]);

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

  const history = useMemo(() => previousPages.slice(-2), [previousPages]);

  if (noContext) {
    return (
      <div
        className="flex min-h-0 flex-col overflow-hidden bg-gray-50"
        style={{ height: `calc(100% + ${pullToHeader}px)`, marginTop: `-${pullToHeader}px` }}
      >
        <section className="flex min-h-0 flex-1 flex-col border border-gray-300 bg-white">
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
      className={classNames('unified-form-root relative flex min-h-0 flex-col overflow-visible bg-gray-50', className)}
      style={{ height: `calc(100% + ${pullToHeader}px)`, marginTop: `-${pullToHeader}px` }}
    >
      <style>{`
        .unified-form-scroll { scrollbar-width: none; -ms-overflow-style: none; }
        .unified-form-scroll::-webkit-scrollbar { width: 0; height: 0; display: none; }
        @keyframes unified-form-message-in {
          from { opacity: 0; transform: translateY(-4px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .unified-form-message { animation: unified-form-message-in 180ms ease-out; }
      `}</style>

      <section className="flex min-h-0 flex-1 flex-col overflow-visible border border-gray-300 bg-white">
        <div
          className="grid min-h-0 flex-1 gap-0"
          style={{
            gridTemplateColumns: traceOpen
              ? `minmax(0, 1fr) ${traceabilityWidth}px`
              : 'minmax(0, 1fr)',
          }}
        >
          <div className="flex min-h-0 min-w-0 flex-col">
            <header className="relative z-20 shrink-0 border-b border-gray-300 px-4 py-3 pointer-events-auto">
              <div className="flex items-start justify-between gap-4">
                <div className="flex min-w-0 items-start gap-3">
                  {primaryAction && (
                    <button
                      type="button"
                      onClick={() => executeHeaderAction(primaryAction)}
                      disabled={primaryAction.disabled}
                      title={primaryAction.title || primaryAction.label}
                      className={classNames(
                        'flex h-[60px] shrink-0 items-center gap-1 border border-purple-600 bg-purple-600 px-4 text-xs font-semibold text-white transition-all duration-200 hover:scale-105 hover:border-purple-700 hover:bg-purple-700 hover:shadow-md active:scale-95 disabled:cursor-not-allowed disabled:opacity-50',
                        primaryAction.className,
                      )}
                    >
                      {primaryAction.icon || <FiPlus size={12} />}
                      <span>{primaryAction.label || 'Nouveau'}</span>
                    </button>
                  )}

                  <div className="flex min-w-0 flex-col justify-center">
                    {history.length > 0 && (
                      <div className="mb-0.5 flex h-3 max-w-[440px] items-center gap-1 overflow-hidden text-[10px] leading-none text-gray-500">
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
                              className="max-w-44 truncate transition-colors hover:text-purple-700"
                              title={`Revenir à ${page.label}`}
                            >
                              {page.label}
                            </button>
                          </React.Fragment>
                        ))}
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        if (onTitleClick) onTitleClick({ requestExit, getReturnTarget });
                        else requestExit({ path: fallbackPath, state: { restoredFromSmartBack: true } });
                      }}
                      className="w-fit truncate text-left text-lg font-bold leading-tight text-gray-900 transition-all duration-200 hover:text-purple-600"
                    >
                      {title}
                    </button>
                    {recordLabel && (
                      <div className="mt-0.5 truncate text-sm font-medium text-gray-700">
                        {recordLabel}
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex shrink-0 items-center gap-2">
                  {headerActions.map(action => (
                    <button
                      key={action.id || action.label}
                      type="button"
                      onClick={() => executeHeaderAction(action)}
                      disabled={action.disabled}
                      title={action.title || action.label}
                      className={classNames(
                        'flex h-8 items-center gap-1 border border-gray-300 px-3 text-xs text-gray-700 transition-all duration-200 hover:scale-105 hover:border-purple-500 hover:bg-purple-50 hover:text-purple-700 hover:shadow-md active:scale-95 disabled:cursor-not-allowed disabled:opacity-50',
                        action.className,
                      )}
                    >
                      {action.icon}{action.label && <span>{action.label}</span>}
                    </button>
                  ))}

                  {actionsMenu}

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
                      className="flex h-8 w-8 items-center justify-center rounded-full bg-purple-600 text-white shadow-sm transition-all duration-200 hover:scale-110 hover:bg-purple-700 hover:shadow-lg active:scale-90 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {saveIcon}
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => requestExit()}
                    title="Quitter la page"
                    aria-label="Quitter la page"
                    className="flex h-8 w-8 items-center justify-center rounded-full bg-black text-white transition-all duration-200 hover:scale-110 hover:bg-gray-800 hover:shadow-lg active:scale-90"
                  >
                    <FiX size={16} />
                  </button>
                </div>
              </div>
            </header>

            {visibleFeedback?.message && (
              <div className="unified-form-message shrink-0 border-b border-gray-300 px-4 py-2">
                <div className={classNames(
                  'flex w-full items-start gap-2 border px-3 py-2 text-xs',
                  resolveFeedbackStyle(visibleFeedback.type),
                )}>
                  <span className="mt-0.5 shrink-0">
                    <FeedbackIcon type={visibleFeedback.type} />
                  </span>
                  <span className="min-w-0 flex-1 whitespace-pre-line leading-4">
                    {visibleFeedback.message}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setVisibleFeedback(null);
                      onDismissFeedback?.();
                    }}
                    className="shrink-0 p-0.5 text-current opacity-70 transition-opacity hover:opacity-100"
                    title="Fermer"
                    aria-label="Fermer le message"
                  >
                    <FiX size={13} />
                  </button>
                </div>
              </div>
            )}

            {process && (
              <div className="shrink-0 border-b border-gray-300 bg-white">
                {process}
              </div>
            )}

            {hasTraceability && !traceOpen && (
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
              {children}
            </main>
          </div>

          {hasTraceability && traceOpen && (
            <aside className="unified-form-scroll relative z-10 min-h-0 overflow-y-auto border-l border-gray-300 bg-gray-50 pointer-events-auto">
              <div className="sticky top-0 z-10 flex items-center justify-between border-b border-gray-300 bg-white px-4 py-3">
                <div className="flex min-w-0 items-center gap-2">
                  <FiInfo className="shrink-0 text-purple-600" size={14} />
                  <h2 className="truncate text-xs font-semibold uppercase tracking-wide text-gray-800">
                    {traceability.title || 'Traçabilité'}
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={traceability.onClose}
                  className="flex h-7 items-center gap-1 border border-gray-300 px-2 text-xs text-gray-600 transition-all hover:border-purple-500 hover:bg-purple-50 hover:text-purple-700"
                  title="Fermer la traçabilité"
                  aria-label="Fermer la traçabilité"
                >
                  <FiX size={12} />
                  <span>Fermer</span>
                </button>
              </div>
              {traceability.content}
            </aside>
          )}
        </div>
      </section>

      {exitDialogOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 px-4">
          <div className="w-full max-w-md border border-gray-300 bg-white shadow-xl">
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
