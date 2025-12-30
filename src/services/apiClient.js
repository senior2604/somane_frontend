// src/services/apiClient.js
import { API_CONFIG } from '../config/api';
import { authService } from './authService';

class ApiClient {
  constructor() {
    // Normaliser l'URL de base
    this.baseURL = this.normalizeBaseURL(API_CONFIG.BASE_URL);
    console.log('📡 API Client initialisé avec URL:', this.baseURL); // Pour débogage
    this.refreshPromise = null;
  }

  /**
   * Normalise l'URL de base pour qu'elle se termine par un slash
   */
  normalizeBaseURL(url) {
    let normalized = url;
    
    // Ajouter le protocole si manquant
    if (!normalized.startsWith('http://') && !normalized.startsWith('https://')) {
      normalized = 'http://' + normalized;
    }
    
    // Assurer qu'elle se termine par un slash
    if (!normalized.endsWith('/')) {
      normalized = normalized + '/';
    }
    
    return normalized;
  }

  /**
   * Méthode générique pour effectuer des requêtes HTTP
   * Gère automatiquement l'authentification et le rafraîchissement des tokens
   */
  async request(endpoint, options = {}) {
    // Normaliser l'endpoint (supprimer le slash de début si présent)
    if (endpoint.startsWith('/')) {
      endpoint = endpoint.substring(1);
      console.warn(`⚠️ Endpoint corrigé: supprimé le slash de début. Nouvel endpoint: ${endpoint}`);
    }
    
    const url = `${this.baseURL}${endpoint}`;
    console.log('📤 API Request:', {
      url,
      method: options.method || 'GET',
      endpoint: endpoint
    });
    
    // Récupérer le token actuel
    let token = authService.getToken();
    
    // Configuration de la requête
    const config = {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    };

    // Ajouter le token d'authentification s'il existe
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
      console.log('🔑 Token JWT ajouté à la requête');
    } else {
      console.warn(`⚠️ Aucun token JWT trouvé pour l'endpoint: ${endpoint}`);
      
      // Pour les endpoints publics, on continue sans token
      if (this.isPublicEndpoint(endpoint)) {
        console.log(`✅ Endpoint public ${endpoint} - requête sans token`);
      }
    }

    try {
      const response = await fetch(url, config);
      console.log(`📥 API Response: ${response.status} ${response.statusText} pour ${endpoint}`);
      
      // Gestion spécifique des codes d'erreur
      switch (response.status) {
        case 401: // Unauthorized
          console.warn(`🔐 401 Unauthorized sur ${endpoint}`);
          
          // Essayer de rafraîchir le token si possible
          if (token && await this.tryRefreshToken()) {
            console.log('🔄 Token rafraîchi, réessai de la requête...');
            // Réessayer la requête avec le nouveau token
            return await this.request(endpoint, options);
          }
          
          // Si le refresh échoue ou si pas de token initial
          authService.logout();
          
          // Ne rediriger que si ce n'est pas une page publique
          if (!this.isPublicEndpoint(endpoint)) {
            setTimeout(() => {
              window.location.href = '/login?redirect=' + encodeURIComponent(window.location.pathname);
            }, 1000);
          }
          
          throw {
            status: 401,
            message: 'Session expirée ou non authentifiée',
            endpoint: endpoint,
            url: url
          };
          
        case 403: // Forbidden
          console.warn(`🚫 403 Forbidden sur ${endpoint}`);
          throw {
            status: 403,
            message: 'Accès refusé - Permissions insuffisantes',
            endpoint: endpoint,
            url: url
          };
          
        case 404: // Not Found
          console.warn(`🔍 404 Not Found sur ${endpoint}`);
          console.log(`URL complète: ${url}`);
          throw {
            status: 404,
            message: `Ressource non trouvée: ${endpoint}`,
            endpoint: endpoint,
            url: url
          };
          
        case 500: // Internal Server Error
          console.error(`🔥 500 Server Error sur ${endpoint}`);
          throw {
            status: 500,
            message: 'Erreur serveur interne',
            endpoint: endpoint,
            url: url
          };
      }

      // Si la réponse n'est pas OK (autres erreurs)
      if (!response.ok) {
        // Essayer de récupérer le message d'erreur du serveur
        let errorMessage = `HTTP error! status: ${response.status}`;
        try {
          const errorData = await response.json();
          errorMessage = errorData.detail || errorData.message || errorMessage;
          console.log('📄 Détails erreur serveur:', errorData);
        } catch (e) {
          // Si pas de JSON, utiliser le texte brut
          const text = await response.text();
          if (text) errorMessage = text;
        }
        
        throw {
          status: response.status,
          message: errorMessage,
          endpoint: endpoint,
          url: url
        };
      }

      // Gestion des réponses vides (204 No Content)
      if (response.status === 204) {
        console.log(`✅ 204 No Content pour ${endpoint}`);
        return null;
      }

      // Parser la réponse JSON
      try {
        const data = await response.json();
        console.log(`✅ Réponse JSON reçue pour ${endpoint}:`, 
          Array.isArray(data) ? `${data.length} items` : 'Object reçu');
        return data;
      } catch (e) {
        console.error(`❌ Erreur parsing JSON sur ${endpoint}:`, e);
        throw {
          status: response.status,
          message: 'Réponse serveur invalide (JSON mal formé)',
          endpoint: endpoint,
          url: url
        };
      }
      
    } catch (error) {
      console.error(`❌ API Request failed ${endpoint}:`, error);
      
      // Si l'erreur est déjà formatée, la renvoyer telle quelle
      if (error.status && error.message) {
        throw error;
      }
      
      // Sinon, formater l'erreur
      throw {
        status: 0,
        message: error.message || 'Erreur réseau ou serveur indisponible',
        endpoint: endpoint,
        url: url,
        originalError: error
      };
    }
  }

  /**
   * Tente de rafraîchir le token JWT
   */
  async tryRefreshToken() {
    // Éviter plusieurs tentatives de rafraîchissement simultanées
    if (this.refreshPromise) {
      return await this.refreshPromise;
    }
    
    this.refreshPromise = (async () => {
      try {
        console.log('🔄 Tentative de rafraîchissement du token...');
        const refreshToken = authService.getRefreshToken();
        
        if (!refreshToken) {
          console.warn('❌ Pas de refresh token disponible');
          return false;
        }
        
        // IMPORTANT: Corrigez l'URL - enlever le double slash
        const refreshUrl = `${this.baseURL.replace(/\/$/, '')}/auth/jwt/refresh/`;
        console.log('URL de rafraîchissement:', refreshUrl);
        
        // Appel au endpoint de rafraîchissement
        const response = await fetch(refreshUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ refresh: refreshToken }),
        });
        
        if (response.ok) {
          const data = await response.json();
          authService.setToken(data.access);
          console.log('✅ Token rafraîchi avec succès');
          return true;
        } else {
          console.warn('❌ Échec du rafraîchissement du token', response.status);
          return false;
        }
      } catch (error) {
        console.error('❌ Erreur lors du rafraîchissement du token:', error);
        return false;
      } finally {
        this.refreshPromise = null;
      }
    })();
    
    return await this.refreshPromise;
  }

  /**
   * Vérifie si un endpoint est public (ne nécessite pas d'authentification)
   */
  isPublicEndpoint(endpoint) {
    const publicEndpoints = [
      'auth/',
      'login/',
      'register/',
      'pays/',
      'compta/taxes/',
      'compta/accounts/',
      'api/schema/',
      'swagger/',
      'redoc/'
    ];
    
    return publicEndpoints.some(publicEndpoint => 
      endpoint.startsWith(publicEndpoint)
    );
  }

  /**
   * Méthodes raccourcies pour les verbes HTTP
   */
  
  get(endpoint, options = {}) {
    return this.request(endpoint, { ...options, method: 'GET' });
  }

  post(endpoint, data, options = {}) {
    return this.request(endpoint, {
      ...options,
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  put(endpoint, data, options = {}) {
    return this.request(endpoint, {
      ...options,
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  patch(endpoint, data, options = {}) {
    return this.request(endpoint, {
      ...options,
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  delete(endpoint, options = {}) {
    return this.request(endpoint, { ...options, method: 'DELETE' });
  }

  /**
   * Méthode pour uploader des fichiers
   */
  upload(endpoint, formData, options = {}) {
    const config = {
      ...options,
      method: 'POST',
      headers: {
        ...options.headers,
      },
      body: formData,
    };
    
    // Supprimer Content-Type pour que le navigateur le définisse avec le boundary
    delete config.headers['Content-Type'];
    
    return this.request(endpoint, config);
  }

  /**
   * Méthode pour télécharger des fichiers
   */
  download(endpoint, options = {}) {
    const config = {
      ...options,
      method: 'GET',
      headers: {
        ...options.headers,
      },
    };
    
    // Récupérer le token
    const token = authService.getToken();
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    
    // Normaliser l'endpoint
    if (endpoint.startsWith('/')) {
      endpoint = endpoint.substring(1);
    }
    
    return fetch(`${this.baseURL}${endpoint}`, config);
  }
  
  /**
   * Méthode pour tester la connexion
   */
  async testConnection() {
    console.log('🔧 Test de connexion API...');
    console.log('Base URL:', this.baseURL);
    
    try {
      const response = await fetch(this.baseURL);
      console.log('Status racine:', response.status, response.statusText);
      return response.ok;
    } catch (error) {
      console.error('❌ Erreur connexion:', error);
      return false;
    }
  }
  
  /**
   * Méthode pour obtenir la configuration actuelle
   */
  getConfig() {
    return {
      baseURL: this.baseURL,
      hasToken: !!authService.getToken(),
      endpoints: {
        journals: `${this.baseURL}compta/journals/`,
        accounts: `${this.baseURL}compta/accounts/`,
        moves: `${this.baseURL}compta/moves/`
      }
    };
  }
}

// Créer une instance unique (Singleton)
export const apiClient = new ApiClient();

/**
 * Hook personnalisé pour utiliser l'apiClient dans les composants React
 */
export const useApiClient = () => {
  return {
    get: apiClient.get.bind(apiClient),
    post: apiClient.post.bind(apiClient),
    put: apiClient.put.bind(apiClient),
    patch: apiClient.patch.bind(apiClient),
    delete: apiClient.delete.bind(apiClient),
    upload: apiClient.upload.bind(apiClient),
    download: apiClient.download.bind(apiClient),
    testConnection: apiClient.testConnection.bind(apiClient),
    getConfig: apiClient.getConfig.bind(apiClient),
  };
};