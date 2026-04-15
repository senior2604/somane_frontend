// C:\python\django\somane_frontend\src\config\api.js

export const API_CONFIG = {
  BASE_URL: process.env.REACT_APP_API_URL || 'http://localhost:8000/api/',
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
  
  // ✅ CORE ENDPOINTS
  USERS: 'users/',
  ENTITES: 'entites/',
  PAYS: 'pays/',           // ✅ AJOUTÉ avec slash
  DEVISES: 'devises/',     // ✅ Slash ajouté
  ROLES: 'roles/',
  PARTENAIRES: 'partenaires/',  // ✅ AJOUTÉ
  
  // ✅ COMPTABILITÉ - Tous les endpoints avec slashes
  COMPTA: {
    FRAMEWORKS: 'compta/frameworks/',
    GROUPS: 'compta/groups/',
    TYPES: 'compta/types/',         // ✅ AccountAccountType
    ACCOUNTS: 'compta/accounts/',
    JOURNALS: 'compta/journals/',
    MOVES: 'compta/moves/',
    TAXES: 'compta/taxes/',
    FISCAL_POSITIONS: 'compta/fiscal-positions/',
    PAYMENTS: 'compta/payments/',   // ✅ AJOUTÉ
    BANK_STATEMENTS: 'compta/bank-statements/',  // ✅ AJOUTÉ
    ACCOUNT_COMPANY_CONFIGS: 'compta/account-company-configs/',   // ← Important
  },
};