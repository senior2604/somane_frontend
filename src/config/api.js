// src/config/api.js
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
  },
  USERS: '/users/',
  ENTITIES: '/entities/',
  ROLES: '/roles/',
  // Ajoutez d'autres endpoints selon vos besoins
};