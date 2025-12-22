// 📁 src/services/authService.js
import { API_CONFIG, ENDPOINTS } from '../config/api';

class AuthService {
  constructor() {
    this.baseURL = API_CONFIG.BASE_URL;
    this.tokenKey = 'access_token';
    this.refreshTokenKey = 'refresh_token';
    this.userKey = 'user_data';
    this.entiteKey = 'entite_active';
    
    // Pour la rétrocompatibilité
    this.compatKeys = {
      'accessToken': 'access_token',
      'refreshToken': 'refresh_token',
      'user': 'user_data'
    };
    
    this.isRefreshing = false;
    this.refreshPromise = null;
  }

  /**
   * Initialise le service et migre les anciennes données si nécessaire
   */
  initialize() {
    this.migrateOldData();
    this.validateTokens();
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
    // ✅ GÉRER SPÉCIALEMENT LE CAS 204 NO CONTENT
    if (response.status === 204) {
      return { 
        success: true,
        detail: "Opération réussie (204 No Content)",
        status: 204
      };
    }

    const contentType = response.headers.get('content-type');
    
    // Si la réponse n'est pas du JSON
    if (!contentType || !contentType.includes('application/json')) {
      const text = await response.text();
      
      // Si c'est une erreur 400+ sans JSON
      if (!response.ok) {
        throw {
          status: response.status,
          message: `Erreur serveur (${response.status}): ${text.substring(0, 200)}`,
          responseText: text
        };
      }
      
      // Si c'est une réponse non-JSON mais OK
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
   * Connexion utilisateur
   */
  async login(credentials) {
    try {
      const response = await fetch(`${this.baseURL}${ENDPOINTS.AUTH.LOGIN}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(credentials),
      });

      const data = await this.handleResponse(response);
      
      // Stocker les tokens et données utilisateur
      if (data.access) {
        this.setToken(data.access);
        if (data.refresh) {
          this.setRefreshToken(data.refresh);
        }
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
   * Activation de compte
   */
  async activateAccount(uid, token, password = null) {
    try {
      const payload = { uid, token };
      if (password) {
        payload.new_password = password;
      }

      const response = await fetch(`${this.baseURL}${ENDPOINTS.AUTH.ACTIVATION}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const result = await this.handleResponse(response);
      console.log('✅ Activation réussie');
      return result;
    } catch (error) {
      console.error('❌ Erreur d\'activation:', error);
      throw this.formatError(error);
    }
  }

  /**
   * Réinitialisation de mot de passe (confirmation)
   */
  async resetPasswordConfirm(uid, token, new_password) {
    try {
      const response = await fetch(`${this.baseURL}${ENDPOINTS.AUTH.PASSWORD_RESET_CONFIRM}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ uid, token, new_password }),
      });

      const result = await this.handleResponse(response);
      console.log('✅ Mot de passe réinitialisé');
      return result;
    } catch (error) {
      console.error('❌ Erreur de réinitialisation:', error);
      throw this.formatError(error);
    }
  }

  /**
   * Demande de réinitialisation de mot de passe
   */
  async requestPasswordReset(email) {
    try {
      const response = await fetch(`${this.baseURL}${ENDPOINTS.AUTH.PASSWORD_RESET}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });

      const result = await this.handleResponse(response);
      console.log('✅ Demande de réinitialisation envoyée');
      return result;
    } catch (error) {
      console.error('❌ Erreur de demande de réinitialisation:', error);
      throw this.formatError(error);
    }
  }

  /**
   * Inscription utilisateur
   */
  async register(userData) {
    try {
      const response = await fetch(`${this.baseURL}${ENDPOINTS.AUTH.REGISTER}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
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

  /**
   * Déconnexion
   */
  async logout() {
    try {
      const token = this.getToken();
      if (token) {
        await fetch(`${this.baseURL}${ENDPOINTS.AUTH.LOGOUT}`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }).catch(err => {
          console.warn('⚠️ Erreur lors de l\'appel logout API:', err);
          // On continue même si l'API échoue
        });
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
    // Éviter plusieurs rafraîchissements simultanés
    if (this.isRefreshing && this.refreshPromise) {
      return await this.refreshPromise;
    }
    
    this.isRefreshing = true;
    this.refreshPromise = (async () => {
      try {
        const refreshToken = this.getRefreshToken();
        if (!refreshToken) {
          throw new Error('Aucun refresh token disponible');
        }

        console.log('🔄 Tentative de rafraîchissement du token...');
        
        const response = await fetch(`${this.baseURL}${ENDPOINTS.AUTH.REFRESH}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
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
        
        // Si le refresh token est invalide/expiré, déconnecter
        if (error.status === 401 || error.message.includes('token') || error.message.includes('invalid')) {
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

  /**
   * Récupère le token JWT actuel
   */
  getToken() {
    try {
      // Chercher dans l'ordre : nouvelle clé, ancienne clé, sessionStorage
      const token = localStorage.getItem(this.tokenKey) ||
                    localStorage.getItem('accessToken') ||
                    sessionStorage.getItem(this.tokenKey) ||
                    localStorage.getItem('access') ||
                    sessionStorage.getItem('access');
      
      if (token && typeof token === 'string' && token.trim().length > 10) {
        return token.trim();
      }
      
      return null;
    } catch (error) {
      console.error('❌ Erreur lors de la récupération du token:', error);
      return null;
    }
  }

  /**
   * Récupère le refresh token
   */
  getRefreshToken() {
    try {
      const refreshToken = localStorage.getItem(this.refreshTokenKey) ||
                          localStorage.getItem('refreshToken') ||
                          sessionStorage.getItem(this.refreshTokenKey) ||
                          localStorage.getItem('refresh') ||
                          sessionStorage.getItem('refresh');
      
      if (refreshToken && typeof refreshToken === 'string' && refreshToken.trim().length > 10) {
        return refreshToken.trim();
      }
      
      return null;
    } catch (error) {
      console.error('❌ Erreur lors de la récupération du refresh token:', error);
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
      
      // Stocker dans le storage principal
      storage.setItem(this.tokenKey, trimmedToken);
      
      // Stocker aussi dans la clé de compatibilité
      localStorage.setItem('accessToken', trimmedToken);
      
      console.log('🔐 Token stocké avec succès');
      return true;
    } catch (error) {
      console.error('❌ Erreur lors du stockage du token:', error);
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
      localStorage.setItem('refreshToken', trimmedToken);
      
      return true;
    } catch (error) {
      console.error('❌ Erreur lors du stockage du refresh token:', error);
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
      
      // Stocker dans les deux storage pour compatibilité
      localStorage.setItem(this.userKey, userJson);
      localStorage.setItem('user', userJson);
      
      return true;
    } catch (error) {
      console.error('❌ Erreur lors du stockage des données utilisateur:', error);
      return false;
    }
  }

  /**
   * Récupère les données utilisateur
   */
  getUser() {
    try {
      const userJson = localStorage.getItem(this.userKey) || 
                       localStorage.getItem('user') ||
                       sessionStorage.getItem(this.userKey);
      
      if (userJson) {
        const userData = JSON.parse(userJson);
        
        // Vérifier la structure minimale
        if (userData && (userData.id || userData.email || userData.username)) {
          return userData;
        }
      }
      
      return null;
    } catch (error) {
      console.error('❌ Erreur lors de la récupération des données utilisateur:', error);
      return null;
    }
  }

  /**
   * Définit l'entité active
   */
  setActiveEntite(entiteId) {
    try {
      if (entiteId) {
        localStorage.setItem(this.entiteKey, entiteId.toString());
        return true;
      }
      return false;
    } catch (error) {
      console.error('❌ Erreur lors du stockage de l\'entité active:', error);
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
      console.error('❌ Erreur lors de la récupération de l\'entité active:', error);
      return null;
    }
  }

  /**
   * Vérifie si l'utilisateur est authentifié
   */
  isAuthenticated() {
    const token = this.getToken();
    
    if (!token) {
      return false;
    }
    
    // Optionnel : vérifier l'expiration du token si jwt-decode est disponible
    // try {
    //   const decoded = jwt_decode(token);
    //   const currentTime = Date.now() / 1000;
    //   return decoded.exp > currentTime;
    // } catch {
    //   return true; // On assume valide si on ne peut pas décoder
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
      console.warn('⚠️ Token principal manquant mais refresh token présent');
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
   * Nettoie toutes les données d'authentification
   */
  clearAuthData() {
    try {
      // Nettoyer localStorage
      const localStorageKeys = [
        this.tokenKey, this.refreshTokenKey, this.userKey, this.entiteKey,
        'accessToken', 'refreshToken', 'user', 'entiteActive',
        'access', 'refresh'
      ];
      
      localStorageKeys.forEach(key => {
        localStorage.removeItem(key);
      });
      
      // Nettoyer sessionStorage
      const sessionStorageKeys = [
        this.tokenKey, this.refreshTokenKey, this.userKey,
        'access', 'refresh', 'user'
      ];
      
      sessionStorageKeys.forEach(key => {
        sessionStorage.removeItem(key);
      });
      
      // Nettoyer les cookies d'authentification
      this.clearAuthCookies();
      
      console.log('🧹 Données d\'authentification nettoyées');
      return true;
    } catch (error) {
      console.error('❌ Erreur lors du nettoyage des données:', error);
      return false;
    }
  }

  /**
   * Nettoie les cookies d'authentification
   */
  clearAuthCookies() {
    try {
      const cookies = document.cookie.split(';');
      cookies.forEach(cookie => {
        const eqPos = cookie.indexOf('=');
        const name = eqPos > -1 ? cookie.substr(0, eqPos).trim() : cookie.trim();
        
        // Supprimer les cookies liés à l'authentification
        if (name.includes('auth') || name.includes('token') || name.includes('session')) {
          document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; domain=${window.location.hostname}`;
        }
      });
    } catch (error) {
      console.warn('⚠️ Erreur lors du nettoyage des cookies:', error);
    }
  }

  /**
   * Formate les erreurs de manière cohérente
   */
  formatError(error) {
    if (error instanceof Error) {
      return error;
    }
    
    if (typeof error === 'object' && error.message) {
      return new Error(error.message);
    }
    
    return new Error(String(error));
  }

  /**
   * Vérifie si un token est expiré (basique)
   */
  isTokenExpired(token) {
    if (!token) return true;
    
    try {
      // Méthode basique : vérifier la longueur et le format
      const parts = token.split('.');
      if (parts.length !== 3) return true;
      
      // Optionnel : décoder et vérifier l'expiration si jwt-decode est disponible
      // const decoded = jwt_decode(token);
      // return decoded.exp * 1000 < Date.now();
      
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
      // Si jwt-decode est disponible
      // const decoded = jwt_decode(token);
      // const expiresIn = (decoded.exp * 1000) - Date.now();
      // return expiresIn < minutes * 60 * 1000;
      
      return false; // Par défaut, on ne sait pas
    } catch {
      return false;
    }
  }
}

// Initialiser le service au chargement
const authService = new AuthService();
authService.initialize();

export { authService };