// 📁 src/config/api.js
export const API_CONFIG = {
  BASE_URL: 'http://localhost:8000/api', // Votre URL Django
  TIMEOUT: 10000,
};

export const ENDPOINTS = {
  AUTH: {
    LOGIN: '/auth/token/',
    LOGOUT: '/auth/token/logout/',
    REGISTER: '/auth/users/',
    ACTIVATION: '/auth/users/activation/',  // ✅ URL DJOSER STANDARD
    PROFILE: '/auth/users/me/',
    REFRESH: '/auth/token/refresh/',
    PASSWORD_RESET: '/auth/users/reset_password/',
    PASSWORD_RESET_CONFIRM: '/auth/users/reset_password_confirm/',
  },
  USERS: '/users/',
  ENTITIES: '/entites/',
  ROLES: '/roles/',
};