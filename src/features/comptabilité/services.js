// src/features/comptabilité/services.js
import { apiClient } from '../../services/apiClient';
import { authService } from '../../services/authService'; 

const API_PREFIX = 'compta/';

// ============= SERVICE PIÈCES =============
const piecesService = {
  // === REQUÊTES API AVEC ENTITÉ ===
  getAll: (entityId = null, filters = {}) => {
    const params = entityId ? { ...filters, company: entityId } : filters;
    return apiClient.get(`${API_PREFIX}moves/`, { params });
  },
  
  getById: (id, entityId = null) => {
    const params = entityId ? { company: entityId } : {};
    return apiClient.get(`${API_PREFIX}moves/${id}/`, { params });
  },
  
  create: (data, entityId = null) => {
    const payload = entityId ? { ...data, company: entityId } : data;
    return apiClient.post(`${API_PREFIX}moves/`, payload);
  },
  
  update: (id, data, entityId = null) => {
    const payload = entityId ? { ...data, company: entityId } : data;
    return apiClient.put(`${API_PREFIX}moves/${id}/`, payload);
  },
  
  delete: (id, entityId = null) => {
    const params = entityId ? { company: entityId } : {};
    return apiClient.delete(`${API_PREFIX}moves/${id}/`, { params });
  },
  
  // === MÉTHODES DE CHANGEMENT D'ÉTAT ===
  
  /**
   * Valider une pièce (passer de brouillon à comptabilisé)
   */
  validate: (id, entityId = null) => {
    const params = entityId ? { company: entityId } : {};
    return apiClient.post(`${API_PREFIX}moves/${id}/validate/`, {}, { params });
  },
  
  /**
   * Annuler une pièce comptabilisée
   */
  cancel: (id, entityId = null) => {
    const params = entityId ? { company: entityId } : {};
    return apiClient.post(`${API_PREFIX}moves/${id}/cancel/`, {}, { params });
  },
  
  /**
   * Remettre une pièce en brouillon
   */
  draft: (id, entityId = null) => {
    const params = entityId ? { company: entityId } : {};
    return apiClient.post(`${API_PREFIX}moves/${id}/draft/`, {}, { params });
  },
  
  /**
   * Dupliquer une pièce
   */
  duplicate: (id, entityId = null) => {
    const params = entityId ? { company: entityId } : {};
    return apiClient.post(`${API_PREFIX}moves/${id}/duplicate/`, {}, { params });
  },
  
  /**
   * Extourner une pièce (créer une pièce inverse)
   */
  reverse: (id, entityId = null) => {
    const params = entityId ? { company: entityId } : {};
    return apiClient.post(`${API_PREFIX}moves/${id}/reverse/`, {}, { params });
  },
  
  // === DONNÉES DE RÉFÉRENCE AVEC ENTITÉ ===
  getJournals: async (entityId = null) => {
    try {
      const params = entityId ? { company: entityId } : {};
      const response = await apiClient.get(`${API_PREFIX}journals/`, { params });
      
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
  
  getAccounts: async (entityId = null) => {
    try {
      const params = entityId ? { company: entityId } : {};
      const response = await apiClient.get(`${API_PREFIX}accounts/`, { params });
      
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
  
  // === PARTENAIRES AVEC ENTITÉ ===
  getPartners: async (entityId = null) => {
    try {
      const params = entityId ? { company: entityId } : {};
      const response = await apiClient.get('partenaires/', { params });
      
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
  
  // === DEVISES AVEC ENTITÉ ===
  getDevises: async (entityId = null) => {
    try {
      const params = entityId ? { company: entityId } : {};
      const response = await apiClient.get('devises/', { params });
      
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
  
  // === TAXES ===
  getTaxes: async (entityId = null) => {
    try {
      const params = entityId ? { company: entityId } : {};
      const response = await apiClient.get(`${API_PREFIX}taxes/`, { params });
      
      let taxesData = [];
      if (Array.isArray(response)) {
        taxesData = response;
      } else if (response && typeof response === 'object') {
        if (response.results && Array.isArray(response.results)) {
          taxesData = response.results;
        } else if (response.data && Array.isArray(response.data)) {
          taxesData = response.data;
        }
      }
      
      return taxesData;
      
    } catch (error) {
      console.error('Erreur chargement taxes:', error);
      return [];
    }
  },
  
  // === UTILISATEURS ===
  getUsers: async (entityId = null) => {
    try {
      const params = entityId ? { company: entityId } : {};
      const response = await apiClient.get('core/users/', { params });
      
      let usersData = [];
      if (Array.isArray(response)) {
        usersData = response;
      } else if (response && typeof response === 'object') {
        if (response.results && Array.isArray(response.results)) {
          usersData = response.results;
        } else if (response.data && Array.isArray(response.data)) {
          usersData = response.data;
        }
      }
      
      return usersData;
      
    } catch (error) {
      console.error('Erreur chargement utilisateurs:', error);
      return [];
    }
  },
  
  // === POSITIONS FISCALES ===
  getFiscalPositions: async (entityId = null) => {
    try {
      const params = entityId ? { company: entityId } : {};
      const response = await apiClient.get(`${API_PREFIX}fiscal-positions/`, { params });
      
      let positionsData = [];
      if (Array.isArray(response)) {
        positionsData = response;
      } else if (response && typeof response === 'object') {
        if (response.results && Array.isArray(response.results)) {
          positionsData = response.results;
        } else if (response.data && Array.isArray(response.data)) {
          positionsData = response.data;
        }
      }
      
      return positionsData;
      
    } catch (error) {
      console.error('Erreur chargement positions fiscales:', error);
      return [];
    }
  },
  
  // === ENTREPRISES/ENTITES ===
  getCompanies: async () => {
    try {
      const endpoints = [
        'entites/',      
        'companies/',    
        'entreprises/',  
        'societes/'      
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
          
          if (companiesData.length > 0) {
            console.log(`✅ Entreprises chargées depuis: ${endpoint} (${companiesData.length})`);
            break;
          }
        } catch (err) {
          continue;
        }
      }
      
      return companiesData;
      
    } catch (error) {
      console.error('Erreur chargement entreprises:', error);
      return [];
    }
  },
  
  getCurrentUser: async () => {
    try {
      const user = authService.getCurrentUser();
      
      if (!user) {
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
  
  testEndpoints: async (entityId = null) => {
    const endpoints = [
      { name: 'Journaux', url: `${API_PREFIX}journals/` },
      { name: 'Comptes', url: `${API_PREFIX}accounts/` },
      { name: 'Partenaires', url: 'partenaires/' },
      { name: 'Devises', url: 'devises/' },
      { name: 'Taxes', url: `${API_PREFIX}taxes/` },
      { name: 'Positions fiscales', url: `${API_PREFIX}fiscal-positions/` },
    ];
    
    const results = [];
    
    for (const endpoint of endpoints) {
      try {
        const params = entityId ? { company: entityId } : {};
        const response = await apiClient.get(endpoint.url, { params });
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
  
  checkEnvironment: async () => {
    console.group('🔍 Diagnostic environnement comptabilité');
    
    const user = authService.getCurrentUser();
    console.log('👤 Utilisateur connecté:', user ? 'Oui' : 'Non');
    if (user) {
      console.log('   ID:', user.id);
      console.log('   Company ID:', user.company_id);
      console.log('   Entité:', user.entite);
    }
    
    const testResults = await piecesService.testEndpoints(user?.company_id);
    
    console.groupEnd();
    
    return {
      user: user,
      endpoints: testResults,
      timestamp: new Date().toISOString()
    };
  }
};

// ============= SERVICE JOURNAUX =============
const journauxService = {
  getAll: (entityId = null, filters = {}) => {
    const params = entityId ? { ...filters, company: entityId } : filters;
    return apiClient.get(`${API_PREFIX}journals/`, { params });
  },
  
  getById: (id, entityId = null) => {
    const params = entityId ? { company: entityId } : {};
    return apiClient.get(`${API_PREFIX}journals/${id}/`, { params });
  },
  
  create: (data, entityId = null) => {
    const payload = entityId ? { ...data, company: entityId } : data;
    return apiClient.post(`${API_PREFIX}journals/`, payload);
  },
  
  update: (id, data, entityId = null) => {
    const payload = entityId ? { ...data, company: entityId } : data;
    return apiClient.put(`${API_PREFIX}journals/${id}/`, payload);
  },
  
  delete: (id, entityId = null) => {
    const params = entityId ? { company: entityId } : {};
    return apiClient.delete(`${API_PREFIX}journals/${id}/`, { params });
  },
  
  getTypes: (entityId = null) => {
    const params = entityId ? { company: entityId } : {};
    return apiClient.get(`${API_PREFIX}journal-types/`, { params });
  }
};

// ============= SERVICE COMPTES =============
const comptesService = {
  getAll: (entityId = null, filters = {}) => {
    const params = entityId ? { ...filters, company: entityId } : filters;
    return apiClient.get(`${API_PREFIX}accounts/`, { params });
  },
  
  getById: (id, entityId = null) => {
    const params = entityId ? { company: entityId } : {};
    return apiClient.get(`${API_PREFIX}accounts/${id}/`, { params });
  },
  
  create: (data, entityId = null) => {
    const payload = entityId ? { ...data, company: entityId } : data;
    return apiClient.post(`${API_PREFIX}accounts/`, payload);
  },
  
  update: (id, data, entityId = null) => {
    const payload = entityId ? { ...data, company: entityId } : data;
    return apiClient.put(`${API_PREFIX}accounts/${id}/`, payload);
  },
  
  delete: (id, entityId = null) => {
    const params = entityId ? { company: entityId } : {};
    return apiClient.delete(`${API_PREFIX}accounts/${id}/`, { params });
  }
};

// ============= SERVICE PARTENAIRES =============
const partenairesService = {
  getAll: (entityId = null, filters = {}) => {
    const params = entityId ? { ...filters, company: entityId } : filters;
    return apiClient.get('partenaires/', { params });
  },
  
  getById: (id, entityId = null) => {
    const params = entityId ? { company: entityId } : {};
    return apiClient.get(`partenaires/${id}/`, { params });
  },
  
  create: (data, entityId = null) => {
    const payload = entityId ? { ...data, company: entityId } : data;
    return apiClient.post('partenaires/', payload);
  },
  
  update: (id, data, entityId = null) => {
    const payload = entityId ? { ...data, company: entityId } : data;
    return apiClient.put(`partenaires/${id}/`, payload);
  },
  
  delete: (id, entityId = null) => {
    const params = entityId ? { company: entityId } : {};
    return apiClient.delete(`partenaires/${id}/`, { params });
  }
};

// ============= SERVICE DEVISES =============
const devisesService = {
  getAll: (entityId = null, filters = {}) => {
    const params = entityId ? { ...filters, company: entityId } : filters;
    return apiClient.get('devises/', { params });
  },
  
  getById: (id, entityId = null) => {
    const params = entityId ? { company: entityId } : {};
    return apiClient.get(`devises/${id}/`, { params });
  },
  
  create: (data, entityId = null) => {
    const payload = entityId ? { ...data, company: entityId } : data;
    return apiClient.post('devises/', payload);
  },
  
  update: (id, data, entityId = null) => {
    const payload = entityId ? { ...data, company: entityId } : data;
    return apiClient.put(`devises/${id}/`, payload);
  },
  
  delete: (id, entityId = null) => {
    const params = entityId ? { company: entityId } : {};
    return apiClient.delete(`devises/${id}/`, { params });
  }
};

// ============= SERVICE ENTREPRISES =============
const entreprisesService = {
  getAll: (filters = {}) => apiClient.get('entites/', { params: filters }),
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