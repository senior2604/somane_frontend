// src/features/comptabilité/services.js
import { apiClient } from '../../services/apiClient';
import { authService } from '../../services/authService'; 

const API_PREFIX = 'compta/';

// ============= SERVICE PIÈCES =============
const piecesService = {
  // === REQUÊTES API ===
  getAll: (filters = {}) => apiClient.get(`${API_PREFIX}moves/`, { params: filters }),
  getById: (id) => apiClient.get(`${API_PREFIX}moves/${id}/`),
  create: (data) => apiClient.post(`${API_PREFIX}moves/`, data),
  update: (id, data) => apiClient.put(`${API_PREFIX}moves/${id}/`, data),
  delete: (id) => apiClient.delete(`${API_PREFIX}moves/${id}/`),
  
  // === DONNÉES DE RÉFÉRENCE ===
  getJournals: async () => {
    try {
      const response = await apiClient.get(`${API_PREFIX}journals/`);
      
      let journalsData = [];
      if (Array.isArray(response)) {
        journalsData = response;
      } else if (response && typeof response === 'object') {
        if (response.results && Array.isArray(response.results)) {
          journalsData = response.results;
        } else if (response.data && Array.isArray(response.data)) {
          journalsData = response.data;
        }
      }
      
      return journalsData;
      
    } catch (error) {
      console.error('Erreur chargement journaux:', error);
      return [];
    }
  },
  
  getAccounts: async () => {
    try {
      const response = await apiClient.get(`${API_PREFIX}accounts/`);
      
      let accountsData = [];
      if (Array.isArray(response)) {
        accountsData = response;
      } else if (response && typeof response === 'object') {
        if (response.results && Array.isArray(response.results)) {
          accountsData = response.results;
        } else if (response.data && Array.isArray(response.data)) {
          accountsData = response.data;
        }
      }
      
      return accountsData;
      
    } catch (error) {
      console.error('Erreur chargement comptes:', error);
      return [];
    }
  },
  
  // === PARTENAIRES ===
  getPartners: async () => {
    try {
      const response = await apiClient.get('partenaires/');
      
      let partnersData = [];
      if (Array.isArray(response)) {
        partnersData = response;
      } else if (response && typeof response === 'object') {
        if (response.results && Array.isArray(response.results)) {
          partnersData = response.results;
        } else if (response.data && Array.isArray(response.data)) {
          partnersData = response.data;
        }
      }
      
      return partnersData;
      
    } catch (error) {
      console.error('Erreur chargement partenaires:', error);
      return [];
    }
  },
  
  // === DEVISES ===
  getDevises: async () => {
    try {
      const response = await apiClient.get('devises/');
      
      let devisesData = [];
      if (Array.isArray(response)) {
        devisesData = response;
      } else if (response && typeof response === 'object') {
        if (response.results && Array.isArray(response.results)) {
          devisesData = response.results;
        } else if (response.data && Array.isArray(response.data)) {
          devisesData = response.data;
        }
      }
      
      return devisesData;
      
    } catch (error) {
      console.error('Erreur chargement devises:', error);
      return [];
    }
  },
  
  // === ENTREPRISES/ENTITES ===
  getCompanies: async () => {
    try {
      // Essayer plusieurs endpoints possibles
      const endpoints = [
        'entites/',      // Le plus probable
        'companies/',    // Alternative anglaise
        'entreprises/',  // Alternative française
        'societes/'      // Autre alternative
      ];
      
      let companiesData = [];
      
      for (const endpoint of endpoints) {
        try {
          const response = await apiClient.get(endpoint);
          
          if (Array.isArray(response)) {
            companiesData = response;
          } else if (response && typeof response === 'object') {
            if (response.results && Array.isArray(response.results)) {
              companiesData = response.results;
            } else if (response.data && Array.isArray(response.data)) {
              companiesData = response.data;
            }
          }
          
          // Si on a trouvé des données, on arrête la boucle
          if (companiesData.length > 0) {
            console.log(`✅ Entreprises chargées depuis: ${endpoint} (${companiesData.length})`);
            break;
          }
        } catch (err) {
          // Continuer avec le prochain endpoint
          continue;
        }
      }
      
      // Si toujours aucune donnée, retourner tableau vide
      return companiesData;
      
    } catch (error) {
      console.error('Erreur chargement entreprises:', error);
      return [];
    }
  },
  
  // === UTILISATEUR CONNECTÉ ===
  getCurrentUser: async () => {
    try {
      // Utiliser authService pour récupérer l'utilisateur
      const user = authService.getCurrentUser();
      
      if (!user) {
        // Si pas d'utilisateur en cache, essayer de rafraîchir
        try {
          const refreshed = await authService.refreshUser();
          return refreshed || null;
        } catch (refreshError) {
          console.warn('Impossible de rafraîchir l\'utilisateur:', refreshError);
          return null;
        }
      }
      
      return user;
    } catch (error) {
      console.error('Erreur récupération utilisateur:', error);
      return null;
    }
  },
  
  // === FORMATAGE DES DONNÉES ===
  formatPieceForApi: (formData, companyId = 1, currencyId = 1) => {
    return {
      name: formData.reference || `ECR-${Date.now()}`,
      move_type: 'entry',
      state: 'draft',
      journal: formData.journal_id,
      date: formData.date,
      ref: formData.reference || '',
      partner: formData.partner_id || null,
      company: companyId,
      currency: currencyId,
      lines: formData.lines.map((line, index) => ({
        name: line.label || `Ligne ${index + 1}`,
        date: formData.date,
        account: line.account_id,
        debit: line.debit ? parseFloat(line.debit) : 0,
        credit: line.credit ? parseFloat(line.credit) : 0,
        partner: line.partner_id || null,
        journal: formData.journal_id,
        company: companyId,
        currency: currencyId,
        balance: (line.debit ? parseFloat(line.debit) : 0) - (line.credit ? parseFloat(line.credit) : 0)
      }))
    };
  },
  
  // === MÉTHODES SUPPLEMENTAIRES ===
  validate: (id) => apiClient.post(`${API_PREFIX}moves/${id}/validate/`),
  cancel: (id) => apiClient.post(`${API_PREFIX}moves/${id}/cancel/`),
  
  // === TESTS ET DIAGNOSTICS ===
  testEndpoints: async () => {
    const endpoints = [
      { name: 'Journaux', url: `${API_PREFIX}journals/` },
      { name: 'Comptes', url: `${API_PREFIX}accounts/` },
      { name: 'Partenaires', url: 'partenaires/' },
      { name: 'Devises', url: 'devises/' },
      { name: 'Entreprises', url: 'entites/' },
      { name: 'Companies', url: 'companies/' },
      { name: 'Entreprises (fr)', url: 'entreprises/' },
    ];
    
    const results = [];
    
    for (const endpoint of endpoints) {
      try {
        const response = await apiClient.get(endpoint.url);
        let count = 0;
        
        if (Array.isArray(response)) {
          count = response.length;
        } else if (response && typeof response === 'object') {
          if (Array.isArray(response.results)) {
            count = response.results.length;
          } else if (Array.isArray(response.data)) {
            count = response.data.length;
          }
        }
        
        results.push({
          name: endpoint.name,
          status: '✅',
          count: count,
          url: endpoint.url
        });
        
        console.log(`${endpoint.name}: ✅ ${count} éléments`);
      } catch (error) {
        results.push({
          name: endpoint.name,
          status: '❌',
          error: error.message,
          url: endpoint.url
        });
        console.log(`${endpoint.name}: ❌ ${error.message}`);
      }
    }
    
    return results;
  },
  
  // === VALIDATION DE L'ENVIRONNEMENT ===
  checkEnvironment: async () => {
    console.group('🔍 Diagnostic environnement comptabilité');
    
    // Vérifier l'authentification
    const user = authService.getCurrentUser();
    console.log('👤 Utilisateur connecté:', user ? 'Oui' : 'Non');
    if (user) {
      console.log('   ID:', user.id);
      console.log('   Company ID:', user.company_id);
      console.log('   Entité:', user.entite);
    }
    
    // Tester les endpoints principaux
    const testResults = await piecesService.testEndpoints();
    
    console.groupEnd();
    
    return {
      user: user,
      endpoints: testResults,
      timestamp: new Date().toISOString()
    };
  }
};

// ============= AUTRES SERVICES =============
const journauxService = {
  getAll: (filters = {}) => apiClient.get(`${API_PREFIX}journals/`, { params: filters }),
  getById: (id) => apiClient.get(`${API_PREFIX}journals/${id}/`),
  create: (data) => apiClient.post(`${API_PREFIX}journals/`, data),
  update: (id, data) => apiClient.put(`${API_PREFIX}journals/${id}/`, data),
  delete: (id) => apiClient.delete(`${API_PREFIX}journals/${id}/`),
  getTypes: () => apiClient.get(`${API_PREFIX}journal-types/`)
};

const comptesService = {
  getAll: () => apiClient.get(`${API_PREFIX}accounts/`),
  getById: (id) => apiClient.get(`${API_PREFIX}accounts/${id}/`),
  create: (data) => apiClient.post(`${API_PREFIX}accounts/`, data),
  update: (id, data) => apiClient.put(`${API_PREFIX}accounts/${id}/`, data),
  delete: (id) => apiClient.delete(`${API_PREFIX}accounts/${id}/`)
};

const partenairesService = {
  getAll: () => piecesService.getPartners(),
  getById: (id) => apiClient.get(`partenaires/${id}/`),
  create: (data) => apiClient.post('partenaires/', data),
  update: (id, data) => apiClient.put(`partenaires/${id}/`, data),
  delete: (id) => apiClient.delete(`partenaires/${id}/`)
};

const devisesService = {
  getAll: () => piecesService.getDevises(),
  getById: (id) => apiClient.get(`devises/${id}/`),
  create: (data) => apiClient.post('devises/', data),
  update: (id, data) => apiClient.put(`devises/${id}/`, data),
  delete: (id) => apiClient.delete(`devises/${id}/`)
};

const entreprisesService = {
  getAll: () => piecesService.getCompanies(),
  getById: (id) => apiClient.get(`entites/${id}/`),
  create: (data) => apiClient.post('entites/', data),
  update: (id, data) => apiClient.put(`entites/${id}/`, data),
  delete: (id) => apiClient.delete(`entites/${id}/`)
};

// ============= EXPORTS =============
export { 
  apiClient,
  authService, 
  journauxService,
  piecesService,
  comptesService,
  partenairesService,
  devisesService,
  entreprisesService
};

export default piecesService;