// src/config/api.js  → Version Production Pure

export const API_CONFIG = {
  BASE_URL: 'http://localhost:8000/api',           // ← Important : chemin relatif via Nginx
  TIMEOUT: 10000,
};

export const ENDPOINTS = {
  AUTH: {
    LOGIN: 'auth/jwt/create/',
    LOGOUT: 'auth/jwt/logout/',
    REGISTER: 'auth/users/',
    ACTIVATION: 'auth/users/activation/',
    PROFILE: 'auth/users/me/',
    REFRESH: 'auth/jwt/refresh/',
    PASSWORD_RESET: 'auth/users/reset_password/',
    PASSWORD_RESET_CONFIRM: 'auth/users/reset_password_confirm/',
  },
  
  USERS: 'users/',
  ENTITES: 'entites/',
  PAYS: 'pays/',
  DEVISES: 'devises/',
  ROLES: 'roles/',
  PARTENAIRES: 'partenaires/',
  
  COMPTA: {
    FRAMEWORKS: 'compta/frameworks/',
    GROUPS: 'compta/groups/',
    TYPES: 'compta/types/',
    ACCOUNTS: 'compta/accounts/',
    JOURNALS: 'compta/journals/',
    MOVES: 'compta/moves/',
    TAXES: 'compta/taxes/',
    FISCAL_POSITIONS: 'compta/fiscal-positions/',
    PAYMENTS: 'compta/payments/',
    BANK_STATEMENTS: 'compta/bank-statements/',
    ACCOUNT_COMPANY_CONFIGS: 'compta/account-company-configs/',
  },
};