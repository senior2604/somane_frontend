const CHANGE_EVENT = 'somane:developer-mode-change';

function storageKey(userId) {
  return `somane:developer-mode:${userId || 'anonymous'}`;
}

export function readDeveloperMode(userId) {
  if (typeof window === 'undefined') return false;
  return window.localStorage.getItem(storageKey(userId)) === 'true';
}

export function writeDeveloperMode(userId, enabled) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(storageKey(userId), enabled ? 'true' : 'false');
  window.dispatchEvent(new CustomEvent(CHANGE_EVENT, {
    detail: { userId: String(userId || 'anonymous'), enabled },
  }));
}

export function subscribeDeveloperMode(userId, callback) {
  if (typeof window === 'undefined') return () => {};
  const normalizedUserId = String(userId || 'anonymous');
  const handleChange = (event) => {
    if (event.detail?.userId === normalizedUserId) callback(Boolean(event.detail.enabled));
  };
  window.addEventListener(CHANGE_EVENT, handleChange);
  return () => window.removeEventListener(CHANGE_EVENT, handleChange);
}
