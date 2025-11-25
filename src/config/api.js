// 📁 src/config/api.js
export const API_CONFIG = {
  BASE_URL: 'http://localhost:8000/api', // Votre URL Django
  TIMEOUT: 10000,
};

export const ENDPOINTS = {
  AUTH: {
    LOGIN: '/auth/login/',
    LOGOUT: '/auth/logout/',
    REGISTER: '/auth/register/',
    PROFILE: '/auth/profile/',
    ACTIVATION: '/auth/activate/', // AJOUTÉ - endpoint d'activation
    REFRESH: '/auth/token/refresh/', // AJOUTÉ
    PASSWORD_RESET: '/auth/password/reset/', // AJOUTÉ
    PASSWORD_RESET_CONFIRM: '/auth/password/reset/confirm/', // AJOUTÉ
  },
  USERS: '/users/',
  ENTITIES: '/entites/', // CORRIGÉ (était /entities/)
  ROLES: '/roles/',
  // Ajoutez d'autres endpoints selon vos besoins
};