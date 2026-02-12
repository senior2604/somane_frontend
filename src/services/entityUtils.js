// src/services/entityUtils.js
export const getActiveEntity = () => {
  try {
    const saved = localStorage.getItem('currentEntite');
    return saved ? JSON.parse(saved) : null;
  } catch (e) {
    console.error('Erreur récupération entité active:', e);
    return null;
  }
};