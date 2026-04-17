// 📁 src/services/authService.js
import { API_CONFIG, ENDPOINTS } from '../config/api';

class AuthService {
  constructor() {
    this.baseURL = this._normalizeBaseUrl(API_CONFIG.BASE_URL);
    this.tokenKey = 'access_token';
    this.refreshTokenKey = 'refresh_token';
    this.userKey = 'user_data';
    this.entiteKey = 'entite_active';
    
    // Clés de compatibilité pour migration
    this.compatKeys = {
      'accessToken': 'access_token',
      'refreshToken': 'refresh_token',
      'user': 'user_data'
    };
    
    this.isRefreshing = false;
    this.refreshPromise = null;
    
    console.log('🔐 AuthService initialisé avec baseURL:', this.baseURL);
  }

  /**
   * Normalise l'URL de base pour éviter les erreurs de concaténation
   * Ex: 'http://localhost:8000/api' → 'http://localhost:8000/api/'
   */
  /**
   * Normalise l'URL de base pour production (chemin relatif)
   */
  _normalizeBaseUrl(url) {
    if (!url) return '/api/';                    // ← Changé pour production

    let normalized = url.replace(/\/+$/, '');    // supprime les / à la fin
    if (!normalized.endsWith('/')) normalized += '/';

    return normalized;
  }

  /**
   * Construit une URL complète sans risque de double slash ou slash manquant
   * Ex: buildUrl('auth/users/activation/') → 'http://localhost:8000/api/auth/users/activation/'
   */
  _buildUrl(endpoint) {
    if (!endpoint) return this.baseURL;
    
    // Supprimer le slash de début si présent
    const cleanEndpoint = endpoint.startsWith('/') ? endpoint.slice(1) : endpoint;
    
    return `${this.baseURL}${cleanEndpoint}`;
  }

  /**
   * Initialise le service et migre les anciennes données si nécessaire
   */
  initialize() {
    this.migrateOldData();
    this.validateTokens();
    console.log('🔐 AuthService initialisé avec baseURL:', this.baseURL);
  }

  /**
   * Migre les données des anciennes clés vers les nouvelles
   */
  migrateOldData() {
    try {
      Object.entries(this.compatKeys).forEach(([oldKey, newKey]) => {
        const oldValue = localStorage.getItem(oldKey);
        if (oldValue && !localStorage.getItem(newKey)) {
          localStorage.setItem(newKey, oldValue);
          console.log(`🔄 Migration: ${oldKey} → ${newKey}`);
        }
      });
    } catch (error) {
      console.warn('⚠️ Erreur lors de la migration des données:', error);
    }
  }

  /**
   * Gère les réponses HTTP de manière centralisée
   */
  async handleResponse(response) {
    // ✅ GÉRER SPÉCIALEMENT LE CAS 204 NO CONTENT (succès sans body)
    if (response.status === 204) {
      return { 
        success: true,
        detail: "Opération réussie (204 No Content)",
        status: 204
      };
    }

    const contentType = response.headers?.get('content-type');
    
    // Si la réponse n'est pas du JSON
    if (!contentType || !contentType.includes('application/json')) {
      const text = await response.text().catch(() => '');
      
      if (!response.ok) {
        throw {
          status: response.status,
          message: `Erreur serveur (${response.status}): ${text.substring(0, 200)}`,
          responseText: text
        };
      }
      
      return {
        success: true,
        data: text,
        status: response.status,
        isJson: false
      };
    }

    // Traitement des réponses JSON
    try {
      const data = await response.json();
      
      if (!response.ok) {
        const error = new Error(data.detail || data.message || `Erreur HTTP ${response.status}`);
        error.status = response.status;
        error.data = data;
        throw error;
      }

      return {
        ...data,
        status: response.status,
        success: true
      };
    } catch (parseError) {
      console.error('❌ Erreur parsing JSON:', parseError);
      throw new Error(`Réponse serveur invalide: ${parseError.message}`);
    }
  }

  /**
   * Formate les erreurs de manière cohérente
   */
  formatError(error) {
    if (error instanceof Error) return error;
    if (typeof error === 'object' && error?.message) return new Error(error.message);
    return new Error(String(error || 'Erreur inconnue'));
  }

  // ===================================================================
  // AUTHENTIFICATION
  // ===================================================================

  /**
   * Connexion utilisateur avec JWT
   */
  async login(credentials) {
    try {
      const url = this._buildUrl(ENDPOINTS.AUTH.LOGIN);
      console.log('🔑 Tentative de connexion:', url);
      
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(credentials),
      });

      const data = await this.handleResponse(response);
      
      if (data.access) {
        this.setToken(data.access);
        if (data.refresh) this.setRefreshToken(data.refresh);
        if (data.user) {
          this.setUser(data.user);
          if (data.user.entite_active) {
            this.setActiveEntite(data.user.entite_active);
          }
        }
        console.log('✅ Connexion réussie');
        return data;
      }
      
      throw new Error('Token JWT non reçu du serveur');
      
    } catch (error) {
      console.error('❌ Erreur de connexion:', error);
      throw this.formatError(error);
    }
  }

  /**
   * Déconnexion utilisateur
   */
  async logout() {
    try {
      const token = this.getToken();
      if (token) {
        const url = this._buildUrl(ENDPOINTS.AUTH.LOGOUT);
        await fetch(url, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }).catch(err => console.warn('⚠️ Logout API échoué (ignoré):', err));
      }
    } catch (error) {
      console.error('❌ Erreur lors de la déconnexion:', error);
    } finally {
      this.clearAuthData();
      console.log('👋 Déconnexion réussie');
    }
  }

  /**
   * Rafraîchissement du token JWT
   */
  async refreshToken() {
    if (this.isRefreshing && this.refreshPromise) {
      return await this.refreshPromise;
    }
    
    this.isRefreshing = true;
    this.refreshPromise = (async () => {
      try {
        const refreshToken = this.getRefreshToken();
        if (!refreshToken) throw new Error('Aucun refresh token disponible');

        console.log('🔄 Tentative de rafraîchissement du token...');
        
        const url = this._buildUrl(ENDPOINTS.AUTH.REFRESH);
        const response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refresh: refreshToken }),
        });

        const data = await this.handleResponse(response);
        
        if (data.access) {
          this.setToken(data.access);
          console.log('✅ Token rafraîchi avec succès');
          return data;
        }
        
        throw new Error('Nouveau token non reçu');
        
      } catch (error) {
        console.error('❌ Erreur de rafraîchissement:', error);
        if (error.status === 401 || error.message?.includes('token') || error.message?.includes('invalid')) {
          console.warn('🔒 Refresh token invalide, déconnexion...');
          this.clearAuthData();
        }
        throw this.formatError(error);
      } finally {
        this.isRefreshing = false;
        this.refreshPromise = null;
      }
    })();
    
    return await this.refreshPromise;
  }

  // ===================================================================
  // ACTIVATION DE COMPTE - FLUX EN 2 ÉTAPES
  // ===================================================================

  /**
   * ÉTAPE 1 : Active le compte avec uid + token (sans mot de passe)
   * Utilise l'endpoint Djoser: POST /api/auth/users/activation/
   */
  async activateAccount(uid, token) {
    try {
      if (!uid || !token) {
        throw new Error('UID et token sont requis pour l\'activation');
      }

      const url = this._buildUrl(ENDPOINTS.AUTH.ACTIVATION);
      console.log('🔗 Activation:', url, { uid, token: '***' });
      
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ uid, token }),
      });

      const result = await this.handleResponse(response);
      console.log('✅ Compte activé avec succès');
      return result;
      
    } catch (error) {
      console.error('❌ Erreur d\'activation:', error);
      
      // Messages d'erreur plus clairs
      if (error.status === 404) {
        throw new Error('Endpoint d\'activation non trouvé. Vérifiez la configuration API.');
      }
      if (error.status === 400 && error.data?.uid) {
        throw new Error('Lien d\'activation invalide ou expiré');
      }
      if (error.status === 400 && error.data?.token) {
        throw new Error('Token d\'activation invalide ou expiré');
      }
      
      throw this.formatError(error);
    }
  }

  /**
   * ÉTAPE 2 : Définit le mot de passe APRÈS activation
   * Utilise l'endpoint Djoser: POST /api/auth/users/reset_password_confirm/
   * Note: On réutilise uid/token car ils sont encore valides juste après l'activation
   */
  async setPasswordAfterActivation(uid, token, newPassword) {
    try {
      if (!uid || !token || !newPassword) {
        throw new Error('UID, token et nouveau mot de passe sont requis');
      }

      const url = this._buildUrl(ENDPOINTS.AUTH.PASSWORD_RESET_CONFIRM);
      console.log('🔐 Définition du mot de passe:', url);
      
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          uid, 
          token, 
          new_password: newPassword 
        }),
      });

      const result = await this.handleResponse(response);
      console.log('✅ Mot de passe défini avec succès');
      return result;
      
    } catch (error) {
      console.error('❌ Erreur définition mot de passe:', error);
      
      if (error.status === 400) {
        if (error.data?.uid?.[0]) throw new Error(error.data.uid[0]);
        if (error.data?.token?.[0]) throw new Error(error.data.token[0]);
        if (error.data?.new_password?.[0]) throw new Error(error.data.new_password[0]);
      }
      
      throw this.formatError(error);
    }
  }

  /**
   * Méthode utilitaire : Active le compte ET définit le mot de passe en une seule fois
   * Pratique pour les tests ou les flux simplifiés
   */
  async activateAndSetPassword(uid, token, newPassword) {
    // Étape 1: Activation
    await this.activateAccount(uid, token);
    
    // Petit délai pour s'assurer que l'activation est propagée
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Étape 2: Mot de passe
    return await this.setPasswordAfterActivation(uid, token, newPassword);
  }

  // ===================================================================
  // RÉINITIALISATION DE MOT DE PASSE (flux standard)
  // ===================================================================

  /**
   * Demande de réinitialisation de mot de passe (envoi email)
   */
  async requestPasswordReset(email) {
    try {
      const url = this._buildUrl(ENDPOINTS.AUTH.PASSWORD_RESET);
      
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      const result = await this.handleResponse(response);
      console.log('✅ Demande de réinitialisation envoyée');
      return result;
    } catch (error) {
      console.error('❌ Erreur demande de réinitialisation:', error);
      throw this.formatError(error);
    }
  }

  /**
   * Confirmation de réinitialisation de mot de passe (avec nouveau mot de passe)
   * Utilisé quand l'utilisateur clique sur le lien reçu par email
   */
  async confirmPasswordReset(uid, token, newPassword) {
    return await this.setPasswordAfterActivation(uid, token, newPassword);
  }

  // ===================================================================
  // INSCRIPTION
  // ===================================================================

  /**
   * Inscription utilisateur standard (via Djoser)
   */
  async register(userData) {
    try {
      const url = this._buildUrl(ENDPOINTS.AUTH.REGISTER);
      
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userData),
      });

      const result = await this.handleResponse(response);
      console.log('✅ Inscription réussie');
      return result;
    } catch (error) {
      console.error('❌ Erreur d\'inscription:', error);
      throw this.formatError(error);
    }
  }

  // ===================================================================
  // GESTION DES TOKENS ET DONNÉES UTILISATEUR
  // ===================================================================

  /**
   * Récupère le token JWT actuel (avec fallback sur anciennes clés)
   */
  getToken() {
    try {
      const token = 
        localStorage.getItem(this.tokenKey) ||
        localStorage.getItem('accessToken') ||
        sessionStorage.getItem(this.tokenKey) ||
        localStorage.getItem('access') ||
        sessionStorage.getItem('access');
      
      if (token && typeof token === 'string' && token.trim().length > 10) {
        return token.trim();
      }
      return null;
    } catch (error) {
      console.error('❌ Erreur récupération token:', error);
      return null;
    }
  }

  /**
   * Récupère le refresh token
   */
  getRefreshToken() {
    try {
      const refreshToken = 
        localStorage.getItem(this.refreshTokenKey) ||
        localStorage.getItem('refreshToken') ||
        sessionStorage.getItem(this.refreshTokenKey) ||
        localStorage.getItem('refresh') ||
        sessionStorage.getItem('refresh');
      
      if (refreshToken && typeof refreshToken === 'string' && refreshToken.trim().length > 10) {
        return refreshToken.trim();
      }
      return null;
    } catch (error) {
      console.error('❌ Erreur récupération refresh token:', error);
      return null;
    }
  }

  /**
   * Stocke le token JWT
   */
  setToken(token, rememberMe = true) {
    try {
      if (!token || typeof token !== 'string') {
        throw new Error('Token invalide');
      }
      
      const trimmedToken = token.trim();
      const storage = rememberMe ? localStorage : sessionStorage;
      
      storage.setItem(this.tokenKey, trimmedToken);
      localStorage.setItem('accessToken', trimmedToken); // Compatibilité
      
      console.log('🔐 Token stocké');
      return true;
    } catch (error) {
      console.error('❌ Erreur stockage token:', error);
      return false;
    }
  }

  /**
   * Stocke le refresh token
   */
  setRefreshToken(refreshToken, rememberMe = true) {
    try {
      if (!refreshToken || typeof refreshToken !== 'string') {
        throw new Error('Refresh token invalide');
      }
      
      const trimmedToken = refreshToken.trim();
      const storage = rememberMe ? localStorage : sessionStorage;
      
      storage.setItem(this.refreshTokenKey, trimmedToken);
      localStorage.setItem('refreshToken', trimmedToken); // Compatibilité
      
      return true;
    } catch (error) {
      console.error('❌ Erreur stockage refresh token:', error);
      return false;
    }
  }

  /**
   * Stocke les données utilisateur
   */
  setUser(userData) {
    try {
      if (!userData || typeof userData !== 'object') {
        throw new Error('Données utilisateur invalides');
      }
      
      const userJson = JSON.stringify(userData);
      localStorage.setItem(this.userKey, userJson);
      localStorage.setItem('user', userJson); // Compatibilité
      
      return true;
    } catch (error) {
      console.error('❌ Erreur stockage user:', error);
      return false;
    }
  }

  /**
   * Récupère les données utilisateur
   */
  getUser() {
    try {
      const userJson = 
        localStorage.getItem(this.userKey) || 
        localStorage.getItem('user') ||
        sessionStorage.getItem(this.userKey);
      
      if (userJson) {
        const userData = JSON.parse(userJson);
        if (userData && (userData.id || userData.email || userData.username)) {
          return userData;
        }
      }
      return null;
    } catch (error) {
      console.error('❌ Erreur récupération user:', error);
      return null;
    }
  }

  /**
   * Définit l'entité active
   */
  setActiveEntite(entiteId) {
    try {
      if (entiteId) {
        localStorage.setItem(this.entiteKey, String(entiteId));
        return true;
      }
      return false;
    } catch (error) {
      console.error('❌ Erreur stockage entité:', error);
      return false;
    }
  }

  /**
   * Récupère l'entité active
   */
  getActiveEntite() {
    try {
      return localStorage.getItem(this.entiteKey);
    } catch (error) {
      console.error('❌ Erreur récupération entité:', error);
      return null;
    }
  }

  // ===================================================================
  // VÉRIFICATIONS ET NETTOYAGE
  // ===================================================================

  /**
   * Vérifie si l'utilisateur est authentifié
   */
  isAuthenticated() {
    const token = this.getToken();
    if (!token) return false;
    
    // Optionnel: vérifier l'expiration avec jwt-decode
    // try {
    //   const decoded = jwt_decode(token);
    //   return decoded.exp > Date.now() / 1000;
    // } catch {
    //   return true;
    // }
    
    return true;
  }

  /**
   * Valide les tokens stockés
   */
  validateTokens() {
    const token = this.getToken();
    const refreshToken = this.getRefreshToken();
    
    if (!token && refreshToken) {
      console.warn('⚠️ Token manquant mais refresh token présent');
    }
    if (token && !refreshToken) {
      console.warn('⚠️ Token présent mais refresh token manquant');
    }
    
    return {
      hasToken: !!token,
      hasRefreshToken: !!refreshToken,
      isValid: !!(token && refreshToken)
    };
  }

  /**
   * Nettoie TOUTES les données d'authentification
   */
  clearAuthData() {
    try {
      // localStorage
      [
        this.tokenKey, this.refreshTokenKey, this.userKey, this.entiteKey,
        'accessToken', 'refreshToken', 'user', 'entiteActive',
        'access', 'refresh'
      ].forEach(key => localStorage.removeItem(key));
      
      // sessionStorage
      [
        this.tokenKey, this.refreshTokenKey, this.userKey,
        'access', 'refresh', 'user'
      ].forEach(key => sessionStorage.removeItem(key));
      
      // Cookies
      this.clearAuthCookies();
      
      console.log('🧹 Données d\'authentification nettoyées');
      return true;
    } catch (error) {
      console.error('❌ Erreur nettoyage:', error);
      return false;
    }
  }

  /**
   * Nettoie les cookies d'authentification
   */
  clearAuthCookies() {
    try {
      document.cookie.split(';').forEach(cookie => {
        const name = cookie.split('=')[0]?.trim();
        if (name && (name.includes('auth') || name.includes('token') || name.includes('session'))) {
          document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; domain=${window.location.hostname}`;
        }
      });
    } catch (error) {
      console.warn('⚠️ Erreur nettoyage cookies:', error);
    }
  }

  /**
   * Vérifie si un token JWT est expiré (méthode basique)
   */
  isTokenExpired(token) {
    if (!token) return true;
    try {
      const parts = token.split('.');
      if (parts.length !== 3) return true;
      // Optionnel: jwt_decode pour vérification précise
      return false;
    } catch {
      return true;
    }
  }

  /**
   * Vérifie si le token va bientôt expirer
   */
  isTokenAboutToExpire(minutes = 5) {
    const token = this.getToken();
    if (!token) return true;
    try {
      // Optionnel: jwt_decode pour vérification précise
      return false;
    } catch {
      return false;
    }
  }
}

// ===================================================================
// EXPORT
// ===================================================================

const authService = new AuthService();
authService.initialize();

export { authService };
export default authService;