// src/services/apiClient.js
import { API_CONFIG } from '../config/api';
import { authService } from './authService';
import { getActiveEntity } from './entityUtils';

class ApiClient {
  constructor() {
    // Normaliser l'URL de base
    this.baseURL = this.normalizeBaseURL(API_CONFIG.BASE_URL);
    console.log('📡 API Client initialisé avec URL:', this.baseURL);
    this.refreshPromise = null;
    
    // Endpoints qui ne nécessitent PAS d'entité
    this.nonEntityEndpoints = [
      'auth/',
      'login/',
      'register/',
      'pays/',
      'devises/',
      'subdivisions/',
      'villes/',
      'langues/',
      'banques/',
      'banques-partenaires/',      // ✅ Maintenant sans core/
      'taux-change/',
      'groupes/',
      'modules/',
      'permissions/',
      'api/schema/',
      'swagger/',
      'redoc/'
    ];
    
    // Endpoints publics (sans authentification)
    this.publicEndpoints = [
      'auth/',
      'login/',
      'register/',
      'pays/',
      'api/schema/',
      'swagger/',
      'redoc/'
    ];
    
    // Mapping des corrections d'endpoints courants
    this.endpointCorrections = {
      'core/banque-partenaires/': 'core/banques-partenaires/',
      'core/banque/': 'core/banques/',
      'compta/journal/': 'compta/journals/',
      'banque-partenaires/': 'banques-partenaires/',     // ✅ Corrigé : sans core/
      // 'banques-partenaires/': 'core/banques-partenaires/',  // ❌ SUPPRIMÉ
    };
    
    // Liste des endpoints qui nécessitent le préfixe 'core/'
    this.coreEndpoints = [
      'utilisateurentites/',
      'parametres/',
      'journals/',
      'taches/',
      'informations/',
      'modules/',
      'permissions/',
      'groupes/',
    ];
  }

  /**
   * Normalise l'URL de base pour qu'elle se termine par un slash
   */
  normalizeBaseURL(url) {
    let normalized = url;
    
    if (!normalized.startsWith('http://') && !normalized.startsWith('https://')) {
      normalized = 'http://' + normalized;
    }
    
    if (!normalized.endsWith('/')) {
      normalized = normalized + '/';
    }
    
    return normalized;
  }

  /**
   * Vérifie si un endpoint nécessite une entité
   */
  requiresEntity(endpoint) {
    return !this.nonEntityEndpoints.some(nonEntityEndpoint => 
      endpoint.startsWith(nonEntityEndpoint)
    );
  }

  /**
   * Corrige automatiquement les endpoints mal écrits
   */
  correctEndpoint(endpoint) {
    let corrected = endpoint;
    
    // Nettoyer d'abord les slashes superflus
    if (corrected.startsWith('/')) {
      corrected = corrected.substring(1);
    }
    
    // Appliquer les corrections connues
    Object.entries(this.endpointCorrections).forEach(([wrong, correct]) => {
      if (corrected === wrong || corrected === wrong.replace(/\/$/, '')) {
        console.warn(`🔄 Correction automatique: "${wrong}" → "${correct}"`);
        corrected = correct;
      }
    });
    
    // ✅ NOUVEAU : Ajouter automatiquement 'core/' pour certains endpoints
    const needsCore = this.coreEndpoints.some(prefix => 
      corrected.startsWith(prefix) && !corrected.startsWith('core/')
    );
    
    if (needsCore) {
      corrected = 'core/' + corrected;
      console.warn(`🔄 Ajout automatique du préfixe core/: "${endpoint}" → "${corrected}"`);
    }
    
    // Correction générique: remplacer les underscores par des tirets
    if (corrected.includes('banque_')) {
      corrected = corrected.replace(/banque_/g, 'banques-');
      console.warn(`🔄 Correction auto (underscore → tiret): "${endpoint}" → "${corrected}"`);
    }
    
    return corrected;
  }

  /**
   * Méthode générique pour effectuer des requêtes HTTP
   */
  async request(endpoint, options = {}) {
    // Sauvegarder l'original pour les logs
    const originalEndpoint = endpoint;
    
    // Corriger l'endpoint si nécessaire
    endpoint = this.correctEndpoint(endpoint);
    
    // Supprimer le slash de début si présent
    if (endpoint.startsWith('/')) {
      endpoint = endpoint.substring(1);
      console.warn(`⚠️ Slash de début supprimé. Nouvel endpoint: ${endpoint}`);
    }
    
    const url = `${this.baseURL}${endpoint}`;
    console.log('📤 API Request:', {
      url,
      method: options.method || 'GET',
      endpoint: endpoint,
      originalEndpoint: originalEndpoint !== endpoint ? originalEndpoint : undefined
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
    }

    // N'injecter l'entité QUE pour les endpoints qui en ont besoin
    if (this.requiresEntity(endpoint)) {
      const activeEntity = getActiveEntity();
      if (activeEntity) {
        config.headers['X-Entity-ID'] = activeEntity.id;
        console.log(`🏢 Entité active injectée: ${activeEntity.id} (${activeEntity.raison_sociale})`);
      } else {
        console.log(`⚠️ Endpoint ${endpoint} nécessite une entité mais aucune n'est active`);
      }
    } else {
      console.log(`⏭️ Endpoint ${endpoint} ne nécessite pas d'entité`);
    }

    try {
      const response = await fetch(url, config);
      console.log(`📥 API Response: ${response.status} ${response.statusText} pour ${endpoint}`);
      
      // Gestion spécifique des codes d'erreur
      switch (response.status) {
        case 401:
          console.warn(`🔐 401 Unauthorized sur ${endpoint}`);
          if (token && await this.tryRefreshToken()) {
            console.log('🔄 Token rafraîchi, réessai...');
            return await this.request(endpoint, options);
          }
          authService.logout();
          if (!this.isPublicEndpoint(endpoint)) {
            setTimeout(() => {
              window.location.href = '/login?redirect=' + encodeURIComponent(window.location.pathname);
            }, 1000);
          }
          throw {
            status: 401,
            message: 'Session expirée',
            endpoint: endpoint,
            url: url
          };
          
        case 403:
          console.warn(`🚫 403 Forbidden sur ${endpoint}`);
          throw {
            status: 403,
            message: 'Accès refusé',
            endpoint: endpoint,
            url: url
          };
          
        case 404:
          console.warn(`🔍 404 Not Found sur ${endpoint}`);
          console.log(`URL complète: ${url}`);
          
          // ✅ CORRIGÉ : Vérifier si c'est un module optionnel
          const isOptionalModule = 
            endpoint.includes('banques-partenaires') || 
            endpoint.includes('taux-change') ||
            endpoint.includes('banques');
            
          if (isOptionalModule) {
            console.warn(`ℹ️ Module optionnel non disponible: ${endpoint} (retourne tableau vide)`);
            return [];
          }
          
          throw {
            status: 404,
            message: `Ressource non trouvée: ${endpoint}`,
            endpoint: endpoint,
            url: url
          };
          
        case 500:
          console.error(`🔥 500 Server Error sur ${endpoint}`);
          throw {
            status: 500,
            message: 'Erreur serveur interne',
            endpoint: endpoint,
            url: url
          };
      }

      if (!response.ok) {
        let errorMessage = `HTTP error! status: ${response.status}`;
        try {
          const errorData = await response.json();
          errorMessage = errorData.detail || errorData.message || errorMessage;
          console.error('📄 Détails erreur serveur:', errorData);
        } catch (e) {
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

      if (response.status === 204) {
        console.log(`✅ 204 No Content pour ${endpoint}`);
        return null;
      }

      try {
        const data = await response.json();
        console.log(`✅ Réponse JSON reçue pour ${endpoint}:`, 
          Array.isArray(data) ? `${data.length} items` : 'Objet reçu');
        return data;
      } catch (e) {
        console.error(`❌ Erreur parsing JSON sur ${endpoint}:`, e);
        throw {
          status: response.status,
          message: 'JSON invalide',
          endpoint: endpoint,
          url: url
        };
      }
      
    } catch (error) {
      // ✅ CORRIGÉ : Gestion des erreurs pour modules optionnels
      if (error.status === 404 && 
          (endpoint.includes('banques-partenaires') || 
           endpoint.includes('taux-change') ||
           endpoint.includes('banques'))) {
        console.warn(`ℹ️ Module optionnel non disponible: ${endpoint} (retourne tableau vide)`);
        return [];
      }
      
      console.error(`❌ API Request failed ${endpoint}:`, error);
      
      if (error.status && error.message) {
        throw error;
      }
      
      throw {
        status: 0,
        message: error.message || 'Erreur réseau',
        endpoint: endpoint,
        url: url,
        originalError: error
      };
    }
  }

  async tryRefreshToken() {
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
        
        const refreshUrl = `${this.baseURL.replace(/\/$/, '')}/auth/jwt/refresh/`;
        console.log('URL de rafraîchissement:', refreshUrl);
        
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
          console.warn('❌ Échec du rafraîchissement', response.status);
          return false;
        }
      } catch (error) {
        console.error('❌ Erreur refresh token:', error);
        return false;
      } finally {
        this.refreshPromise = null;
      }
    })();
    
    return await this.refreshPromise;
  }

  isPublicEndpoint(endpoint) {
    return this.publicEndpoints.some(publicEndpoint => 
      endpoint.startsWith(publicEndpoint)
    );
  }

  // Méthodes raccourcies
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

  upload(endpoint, formData, options = {}) {
    const config = {
      ...options,
      method: 'POST',
      headers: {
        ...options.headers,
      },
      body: formData,
    };
    
    delete config.headers['Content-Type'];
    return this.request(endpoint, config);
  }

  download(endpoint, options = {}) {
    const config = {
      ...options,
      method: 'GET',
      headers: {
        ...options.headers,
      },
    };
    
    const token = authService.getToken();
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    
    if (endpoint.startsWith('/')) {
      endpoint = endpoint.substring(1);
    }
    
    return fetch(`${this.baseURL}${endpoint}`, config);
  }
  
  async testConnection() {
    console.log('🔧 Test de connexion API...');
    try {
      const response = await fetch(this.baseURL);
      console.log('Status racine:', response.status);
      return response.ok;
    } catch (error) {
      console.error('❌ Erreur connexion:', error);
      return false;
    }
  }
  
  getConfig() {
    return {
      baseURL: this.baseURL,
      hasToken: !!authService.getToken(),
    };
  }
}

export const apiClient = new ApiClient();

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