// src/config/api.js
export const API_CONFIG = {
  // IMPORTANT : Avec le slash final pour que ça soit clair
  BASE_URL: process.env.REACT_APP_API_URL || 'http://localhost:8000/api/',
  
  TIMEOUT: 10000,
};

export const ENDPOINTS = {
  AUTH: {
    LOGIN: 'auth/token/', // Note : sans slash au début
    LOGOUT: 'auth/token/logout/',
    REGISTER: 'auth/users/',
    ACTIVATION: 'auth/users/activation/',
    PROFILE: 'auth/users/me/',
    REFRESH: 'auth/token/refresh/',
    PASSWORD_RESET: 'auth/users/reset_password/',
    PASSWORD_RESET_CONFIRM: 'auth/users/reset_password_confirm/',
  },
  USERS: 'users/',
  ENTITIES: 'entites/',
  ROLES: 'roles/',
};