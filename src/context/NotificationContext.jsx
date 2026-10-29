import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { FiAlertCircle, FiAlertTriangle, FiCheckCircle, FiInfo, FiX } from 'react-icons/fi';
import { useAppearancePreferences } from './AppearancePreferencesContext';

const NotificationContext = createContext(null);
const notificationIcons = {
  success: FiCheckCircle,
  warning: FiAlertTriangle,
  error: FiAlertCircle,
  info: FiInfo,
};

export function NotificationProvider({ children }) {
  const { preferences } = useAppearancePreferences();
  const [notifications, setNotifications] = useState([]);
  const nextId = useRef(0);
  const timers = useRef(new Map());
  const notificationRefs = useRef(new Map());

  useEffect(() => () => {
    timers.current.forEach(clearTimeout);
    timers.current.clear();
  }, []);

  const dismiss = useCallback((id) => {
    const timer = timers.current.get(id);
    if (timer) clearTimeout(timer);
    timers.current.delete(id);
    const notification = notificationRefs.current.get(id);
    notificationRefs.current.delete(id);
    setNotifications((current) => current.filter((item) => item.id !== id));
    notification?.onDismiss?.();
  }, []);

  const notify = useCallback((message, options = {}) => {
    const id = ++nextId.current;
    const notification = {
      id,
      message: String(message || ''),
      title: options.title || '',
      severity: notificationIcons[options.severity] ? options.severity : 'info',
      duration: (options.duration === undefined ? preferences.notificationDuration : Number(options.duration)) === 0
        ? 0
        : Math.max(1500, Number(options.duration === undefined ? preferences.notificationDuration : options.duration) || 4500),
      action: options.action || null,
      onDismiss: options.onDismiss || null,
    };
    notificationRefs.current.set(id, notification);
    setNotifications((current) => [...current.slice(-3), notification]);
    if (notification.duration) timers.current.set(id, setTimeout(() => dismiss(id), notification.duration));
    return id;
  }, [dismiss, preferences.notificationDuration]);

  const value = useMemo(() => ({
    notify,
    dismiss,
    success: (message, options) => notify(message, { ...options, severity: 'success' }),
    warning: (message, options) => notify(message, { ...options, severity: 'warning' }),
    error: (message, options) => notify(message, { ...options, severity: 'error' }),
    info: (message, options) => notify(message, { ...options, severity: 'info' }),
  }), [notify, dismiss]);

  return (
    <NotificationContext.Provider value={value}>
      {children}
      <div className="somane-toast-region" aria-label="Notifications" aria-live="polite" aria-relevant="additions">
        {notifications.map((item) => {
          const Icon = notificationIcons[item.severity];
          return (
            <div key={item.id} className={`somane-toast somane-toast--${item.severity}`} role={item.severity === 'error' ? 'alert' : 'status'}>
              <Icon className="somane-toast__icon" aria-hidden="true" />
              <div className="somane-toast__content">
                {item.title && <strong className="somane-toast__title">{item.title}</strong>}
                <span>{item.message}</span>
                {item.action?.label && <button type="button" className="somane-toast__action" onClick={() => { item.action.onClick?.(); dismiss(item.id); }}>{item.action.label}</button>}
              </div>
              <button type="button" className="somane-toast__close" aria-label="Fermer la notification" onClick={() => dismiss(item.id)}><FiX /></button>
              {item.duration > 0 && <span className="somane-toast__timer" style={{ animationDuration: `${item.duration}ms` }} />}
            </div>
          );
        })}
      </div>
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (!context) throw new Error('useNotifications doit être utilisé dans NotificationProvider.');
  return context;
}
