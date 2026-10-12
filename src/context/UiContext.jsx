import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { useEntity } from './EntityContext';
import { uiService } from '../services/uiService';
import { securityService } from '../services/securityAccess';

const UiContext = createContext(null);

export function UiProvider({ children }) {
  const { activeEntity } = useEntity();
  const [configuration, setConfiguration] = useState(null);
  const [security, setSecurity] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    setSecurity(null);
    try {
      const [bootstrapResult, securityResult] = await Promise.allSettled([
        uiService.loadBootstrap(),
        securityService.fetchMe(),
      ]);

      if (bootstrapResult.status === 'rejected') throw bootstrapResult.reason;

      setConfiguration(bootstrapResult.value);
      if (securityResult.status === 'fulfilled') {
        setSecurity(securityResult.value);
      } else {
        setSecurity(null);
        setError(securityResult.reason?.message || 'Impossible de charger les permissions');
      }
    } catch (exception) {
      setConfiguration(null);
      setSecurity(null);
      setError(exception?.message || 'Impossible de charger la configuration UI');
    } finally {
      setLoading(false);
    }
  }, [activeEntity?.id]);

  useEffect(() => {
    reload();
  }, [reload]);

  return (
    <UiContext.Provider value={{ configuration, security, loading, error, reload }}>
      {children}
    </UiContext.Provider>
  );
}

export function useUi() {
  const value = useContext(UiContext);
  if (!value) throw new Error('useUi doit être utilisé dans UiProvider');
  return value;
}

export function useOptionalUi() {
  return useContext(UiContext);
}
