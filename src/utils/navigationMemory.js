import { useCallback, useEffect, useMemo, useRef } from 'react';

const STORAGE_PREFIX = 'somane:compta:memory';
const RETURN_CONTEXT_KEY = `${STORAGE_PREFIX}:return-context`;
const DEFAULT_TTL_MS = 24 * 60 * 60 * 1000;

const now = () => Date.now();

const makeStorageKey = (key) => `${STORAGE_PREFIX}:${key}`;

const safeParse = (value, fallback = null) => {
  try {
    return value ? JSON.parse(value) : fallback;
  } catch {
    return fallback;
  }
};

const isExpired = (record) => {
  if (!record?.expiresAt) return false;
  return now() > Number(record.expiresAt);
};

export const navigationMemory = {
  save(key, value, options = {}) {
    if (!key) return;
    const ttl = Number(options.ttlMs || DEFAULT_TTL_MS);
    const record = {
      value,
      savedAt: now(),
      expiresAt: ttl > 0 ? now() + ttl : null,
      version: 1,
    };
    try {
      sessionStorage.setItem(makeStorageKey(key), JSON.stringify(record));
    } catch (error) {
      console.warn(`[navigationMemory] Impossible de sauvegarder ${key}`, error);
    }
  },

  load(key, fallback = null) {
    if (!key) return fallback;
    try {
      const record = safeParse(sessionStorage.getItem(makeStorageKey(key)));
      if (!record || isExpired(record)) {
        sessionStorage.removeItem(makeStorageKey(key));
        return fallback;
      }
      return record.value ?? fallback;
    } catch {
      return fallback;
    }
  },

  clear(key) {
    if (!key) return;
    try {
      sessionStorage.removeItem(makeStorageKey(key));
    } catch {}
  },

  saveReturnContext(context) {
    const normalized = {
      ...context,
      createdAt: now(),
    };
    try {
      sessionStorage.setItem(RETURN_CONTEXT_KEY, JSON.stringify(normalized));
    } catch (error) {
      console.warn('[navigationMemory] Impossible de sauvegarder le contexte de retour', error);
    }
    return normalized;
  },

  getReturnContext() {
    try {
      return safeParse(sessionStorage.getItem(RETURN_CONTEXT_KEY), null);
    } catch {
      return null;
    }
  },

  consumeReturnContext() {
    const context = navigationMemory.getReturnContext();
    try {
      sessionStorage.removeItem(RETURN_CONTEXT_KEY);
    } catch {}
    return context;
  },

  clearReturnContext() {
    try {
      sessionStorage.removeItem(RETURN_CONTEXT_KEY);
    } catch {}
  },
};

export const buildReturnContext = ({
  returnTo,
  memoryKey,
  targetField = '',
  targetLineId = null,
  source = '',
  payload = {},
}) => ({
  returnTo,
  memoryKey,
  targetField,
  targetLineId,
  source,
  payload,
});

export const usePageMemory = ({
  key,
  enabled = true,
  state,
  restore,
  includeScroll = true,
  debounceMs = 250,
  restoreScroll = true,
}) => {
  const restoredRef = useRef(false);
  const timeoutRef = useRef(null);

  const stateSnapshot = useMemo(() => {
    if (!state || typeof state !== 'object') return state;
    return {
      ...state,
      ...(includeScroll ? { scrollY: window.scrollY || 0 } : {}),
    };
  }, [state, includeScroll]);

  useEffect(() => {
    if (!enabled || !key || restoredRef.current) return;
    const saved = navigationMemory.load(key);
    if (!saved) {
      restoredRef.current = true;
      return;
    }

    if (typeof restore === 'function') {
      restore(saved);
    }

    if (restoreScroll && typeof saved.scrollY === 'number') {
      setTimeout(() => window.scrollTo({ top: saved.scrollY, behavior: 'auto' }), 0);
    }

    restoredRef.current = true;
  }, [enabled, key, restore, restoreScroll]);

  useEffect(() => {
    if (!enabled || !key || !restoredRef.current) return undefined;
    clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      navigationMemory.save(key, stateSnapshot);
    }, debounceMs);

    return () => clearTimeout(timeoutRef.current);
  }, [enabled, key, stateSnapshot, debounceMs]);

  const saveNow = useCallback((overrideState = null) => {
    if (!enabled || !key) return;
    navigationMemory.save(key, overrideState || stateSnapshot);
  }, [enabled, key, stateSnapshot]);

  const clear = useCallback(() => navigationMemory.clear(key), [key]);

  return {
    saveNow,
    clear,
    restored: restoredRef.current,
  };
};

export const useDraftMemory = ({
  key,
  enabled = true,
  draft,
  restore,
  debounceMs = 300,
}) => usePageMemory({
  key,
  enabled,
  state: draft,
  restore,
  includeScroll: true,
  debounceMs,
});

export const createLinkedRecordNavigation = ({
  navigate,
  route,
  returnTo,
  memoryKey,
  targetField,
  targetLineId = null,
  draft,
  payload = {},
}) => {
  if (!navigate || !route) return;

  if (memoryKey && draft) {
    navigationMemory.save(memoryKey, draft);
  }

  const context = navigationMemory.saveReturnContext(buildReturnContext({
    returnTo,
    memoryKey,
    targetField,
    targetLineId,
    payload,
  }));

  navigate(route, { state: { returnContext: context } });
};
