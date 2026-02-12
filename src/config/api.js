// C:\python\django\somane_frontend\src\config\api.js

export const API_CONFIG = {
  BASE_URL: process.env.REACT_APP_API_URL || 'http://localhost:8000/api/',
  TIMEOUT: 10000,
};

export const ENDPOINTS = {
  AUTH: {
    LOGIN: 'auth/jwt/create',
    LOGOUT: 'auth/jwt/logout',
    REGISTER: 'auth/users',
    ACTIVATION: 'auth/users/activation',
    PROFILE: 'auth/users/me',
    REFRESH: 'auth/jwt/refresh',
    PASSWORD_RESET: 'auth/users/reset_password',
    PASSWORD_RESET_CONFIRM: 'auth/users/reset_password_confirm',
  },
  USERS: 'users',
  ENTITIES: 'entites',
  DEVISES: 'devises', // ✅ AJOUTÉ
  ROLES: 'roles',
  
  // ✅ COMPTABILITÉ - Tous les endpoints
  COMPTA: {
    FRAMEWORKS: 'compta/frameworks',
    GROUPS: 'compta/groups',       // ✅ AJOUTÉ
    TYPES: 'compta/types',         // ✅ AJOUTÉ
    ACCOUNTS: 'compta/accounts',
    JOURNALS: 'compta/journals',
    MOVES: 'compta/moves',
    TAXES: 'compta/taxes',
    FISCAL_POSITIONS: 'compta/fiscal-positions',
  },
};