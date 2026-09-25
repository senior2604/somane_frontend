import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { useEntity } from './EntityContext';
import { uiService } from '../services/uiService';

const UiContext = createContext(null);

export function UiProvider({ children }) {
  const { activeEntity } = useEntity();
  const [configuration, setConfiguration] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setConfiguration(await uiService.loadBootstrap());
    } catch (exception) {
      setConfiguration(null);
      setError(exception?.message || 'Impossible de charger la configuration UI');
    } finally {
      setLoading(false);
    }
  }, [activeEntity?.id]);

  useEffect(() => {
    reload();
  }, [reload]);

  return (
    <UiContext.Provider value={{ configuration, loading, error, reload }}>
      {children}
    </UiContext.Provider>
  );
}

export function useUi() {
  const value = useContext(UiContext);
  if (!value) throw new Error('useUi doit être utilisé dans UiProvider');
  return value;
}
