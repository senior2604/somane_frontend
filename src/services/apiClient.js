// src/services/apiClient.js
import { API_CONFIG } from '../config/api';
import { authService } from './authService';

class ApiClient {
  constructor() {
    this.baseURL = API_CONFIG.BASE_URL;
    this.refreshPromise = null;
  }

  /**
   * Méthode générique pour effectuer des requêtes HTTP
   * Gère automatiquement l'authentification et le rafraîchissement des tokens
   */
  async request(endpoint, options = {}) {
    const url = `${this.baseURL}${endpoint}`;
    
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
    } else {
      console.warn(`⚠️ Aucun token JWT trouvé pour l'endpoint: ${endpoint}`);
      
      // Pour les endpoints publics, on continue sans token
      // Pour les endpoints privés, on peut décider de bloquer ou continuer
      if (this.isPublicEndpoint(endpoint)) {
        console.log(`✅ Endpoint public ${endpoint} - requête sans token`);
      }
    }

    try {
      const response = await fetch(url, config);
      
      // Gestion spécifique des codes d'erreur
      switch (response.status) {
        case 401: // Unauthorized
          console.warn(`🔐 401 Unauthorized sur ${endpoint}`);
          
          // Essayer de rafraîchir le token si possible
          if (token && await this.tryRefreshToken()) {
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
            endpoint: endpoint
          };
          
        case 403: // Forbidden
          console.warn(`🚫 403 Forbidden sur ${endpoint}`);
          throw {
            status: 403,
            message: 'Accès refusé - Permissions insuffisantes',
            endpoint: endpoint
          };
          
        case 404: // Not Found
          console.warn(`🔍 404 Not Found sur ${endpoint}`);
          throw {
            status: 404,
            message: 'Ressource non trouvée',
            endpoint: endpoint
          };
          
        case 500: // Internal Server Error
          console.error(`🔥 500 Server Error sur ${endpoint}`);
          throw {
            status: 500,
            message: 'Erreur serveur interne',
            endpoint: endpoint
          };
      }

      // Si la réponse n'est pas OK (autres erreurs)
      if (!response.ok) {
        // Essayer de récupérer le message d'erreur du serveur
        let errorMessage = `HTTP error! status: ${response.status}`;
        try {
          const errorData = await response.json();
          errorMessage = errorData.detail || errorData.message || errorMessage;
        } catch (e) {
          // Si pas de JSON, utiliser le texte brut
          const text = await response.text();
          if (text) errorMessage = text;
        }
        
        throw {
          status: response.status,
          message: errorMessage,
          endpoint: endpoint
        };
      }

      // Gestion des réponses vides (204 No Content)
      if (response.status === 204) {
        return null;
      }

      // Parser la réponse JSON
      try {
        return await response.json();
      } catch (e) {
        console.error(`❌ Erreur parsing JSON sur ${endpoint}:`, e);
        throw {
          status: response.status,
          message: 'Réponse serveur invalide (JSON mal formé)',
          endpoint: endpoint
        };
      }
      
    } catch (error) {
      console.error(`API Request failed ${endpoint}:`, error);
      
      // Si l'erreur est déjà formatée, la renvoyer telle quelle
      if (error.status && error.message) {
        throw error;
      }
      
      // Sinon, formater l'erreur
      throw {
        status: 0,
        message: error.message || 'Erreur réseau ou serveur indisponible',
        endpoint: endpoint,
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
        
        // Appel au endpoint de rafraîchissement
        const response = await fetch(`${this.baseURL}/auth/jwt/refresh/`, {
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
          console.warn('❌ Échec du rafraîchissement du token');
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
      '/auth/',
      '/login/',
      '/register/',
      '/pays/',
      '/compta/taxes/',
      '/compta/accounts/',
      '/api/schema/',
      '/swagger/',
      '/redoc/'
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
    
    return fetch(`${this.baseURL}${endpoint}`, config);
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
  };
};