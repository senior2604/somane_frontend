// src/features/vente/services.js
import { apiClient } from '../../services/apiClient';
import { authService } from '../../services/authService';

const API_PREFIX = 'ventes/';

// ============= UTILITAIRES COMMUNS =============
const parseApiResponse = (response) => {
  if (!response) return [];
  if (Array.isArray(response)) return response;
  if (response?.results && Array.isArray(response.results)) return response.results;
  if (response?.data && Array.isArray(response.data)) return response.data;
  return [];
};

const formatAmount = (value, locale = 'fr-FR', currency = 'XOF') => {
  if (!value && value !== 0) return '0';
  return Math.round(parseFloat(value)).toLocaleString(locale);
};

// ============= SERVICE COMMANDES =============
const commandesService = {
  getAll: async (entityId = null, filters = {}) => {
    try {
      const params = entityId ? { ...filters, company: entityId } : filters;
      const response = await apiClient.get(`${API_PREFIX}orders/`, { params });
      return parseApiResponse(response);
    } catch (error) {
      console.error('Erreur chargement commandes:', error);
      return [];
    }
  },

  getById: async (id, entityId = null) => {
    try {
      const params = entityId ? { company: entityId } : {};
      const response = await apiClient.get(`${API_PREFIX}orders/${id}/`, { params });
      return response;
    } catch (error) {
      console.error(`Erreur chargement commande ${id}:`, error);
      throw error;
    }
  },

  create: async (data, entityId = null) => {
    try {
      const payload = entityId ? { ...data, company: entityId } : data;
      return await apiClient.post(`${API_PREFIX}orders/`, payload);
    } catch (error) {
      console.error('Erreur création commande:', error);
      throw error;
    }
  },

  update: async (id, data, entityId = null) => {
    try {
      const payload = entityId ? { ...data, company: entityId } : data;
      return await apiClient.patch(`${API_PREFIX}orders/${id}/`, payload);
    } catch (error) {
      console.error(`Erreur mise à jour commande ${id}:`, error);
      throw error;
    }
  },

  delete: async (id, entityId = null) => {
    try {
      const params = entityId ? { company: entityId } : {};
      await apiClient.delete(`${API_PREFIX}orders/${id}/`, { params });
    } catch (error) {
      console.error(`Erreur suppression commande ${id}:`, error);
      throw error;
    }
  },

  confirm: async (id, entityId = null) => {
    try {
      const params = entityId ? { company: entityId } : {};
      return await apiClient.post(`${API_PREFIX}orders/${id}/confirm/`, {}, { params });
    } catch (error) {
      console.error(`Erreur confirmation commande ${id}:`, error);
      throw error;
    }
  },

  cancel: async (id, entityId = null) => {
    try {
      const params = entityId ? { company: entityId } : {};
      return await apiClient.post(`${API_PREFIX}orders/${id}/cancel/`, {}, { params });
    } catch (error) {
      console.error(`Erreur annulation commande ${id}:`, error);
      throw error;
    }
  },

  generateInvoice: async (id, entityId = null) => {
    try {
      const params = entityId ? { company: entityId } : {};
      return await apiClient.post(`${API_PREFIX}orders/${id}/create_invoice/`, {}, { params });
    } catch (error) {
      console.error(`Erreur génération facture commande ${id}:`, error);
      throw error;
    }
  },

  formatOrderNumber: (order) => {
    if (!order) return '—';
    return order.name || order.client_order_ref || `CMD-${order.id}`;
  },

  getStateBadge: (state) => {
    const config = {
      draft: { label: 'Devis', cls: 'bg-amber-100 text-amber-700' },
      sent: { label: 'Envoyé', cls: 'bg-blue-100 text-blue-700' },
      sale: { label: 'Confirmé', cls: 'bg-emerald-100 text-emerald-700' },
      done: { label: 'Terminé', cls: 'bg-gray-100 text-gray-700' },
      cancel: { label: 'Annulé', cls: 'bg-red-100 text-red-700' }
    }[state] || { label: state || 'Inconnu', cls: 'bg-gray-100 text-gray-700' };
    return config;
  },

  getInvoiceStatusBadge: (status) => {
    const config = {
      no: { label: 'Non facturé', cls: 'bg-gray-100 text-gray-700' },
      to_invoice: { label: 'À facturer', cls: 'bg-yellow-100 text-yellow-700' },
      invoiced: { label: 'Facturé', cls: 'bg-green-100 text-green-700' }
    }[status] || { label: status || '—', cls: 'bg-gray-100 text-gray-700' };
    return config;
  },

  getDeliveryStatusBadge: (status) => {
    const config = {
      no: { label: 'Non livré', cls: 'bg-gray-100 text-gray-700' },
      partial: { label: 'Partiel', cls: 'bg-yellow-100 text-yellow-700' },
      full: { label: 'Livré', cls: 'bg-green-100 text-green-700' }
    }[status] || { label: status || '—', cls: 'bg-gray-100 text-gray-700' };
    return config;
  }
};

// ============= SERVICE PRODUITS (Spécifique Ventes si besoin) =============
const produitsService = {
  getAll: async (entityId = null, filters = {}) => {
    try {
      const params = entityId ? { ...filters, company: entityId } : filters;
      // Note: Si tu utilises le module produits externe, préfère referentielsService.getProducts()
      const response = await apiClient.get(`${API_PREFIX}products/`, { params });
      return parseApiResponse(response);
    } catch (error) {
      console.error('Erreur chargement produits:', error);
      return [];
    }
  },
  // ... autres méthodes si nécessaires
};

// ============= SERVICE ÉQUIPES =============
const equipesService = {
  getAll: async (entityId = null, filters = {}) => {
    try {
      const params = entityId ? { ...filters, company: entityId } : filters;
      const response = await apiClient.get(`${API_PREFIX}teams/`, { params });
      return parseApiResponse(response);
    } catch (error) {
      console.error('Erreur chargement équipes:', error);
      return [];
    }
  },
  // ... autres méthodes
};

// ============= SERVICE RÉFÉRENTIELS (autres modules) =============
const referentielsService = {
  getPartners: async (entityId = null) => {
    try {
      const params = entityId ? { company: entityId } : {};
      const response = await apiClient.get('partenaires/', { params });
      return parseApiResponse(response);
    } catch (error) {
      console.error('Erreur chargement partenaires:', error);
      return [];
    }
  },

  // ✅ AJOUT DE LA MÉTHODE MANQUANTE POUR LES PRODUITS (ProductTemplate)
  getProducts: async () => {
    try {
      // L'endpoint correct pour les ProductTemplate est 'produits/templates/'
      const response = await apiClient.get('produits/templates/');
      return parseApiResponse(response);
    } catch (error) {
      console.error('Erreur chargement produits:', error);
      return [];
    }
  },

  getCurrencies: async () => {
    try {
      const response = await apiClient.get('devises/');
      return parseApiResponse(response);
    } catch (error) {
      console.error('Erreur chargement devises:', error);
      return [];
    }
  },

  getTaxes: async (entityId = null) => {
    try {
      const params = entityId ? { company: entityId } : {};
      const response = await apiClient.get('compta/taxes/', { params });
      return parseApiResponse(response);
    } catch (error) {
      console.error('Erreur chargement taxes:', error);
      return [];
    }
  },

  // ✅ CORRECTION ENDPOINT UOMS (Module Produits)
  getUoms: async () => {
    try {
      const response = await apiClient.get('produits/uoms/');
      return parseApiResponse(response);
    } catch (error) {
      console.warn('⚠️ UoMs non disponibles, fallback sur liste vide:', error);
      return [];
    }
  },

  getPricelists: async (entityId = null) => {
    try {
      const params = entityId ? { company: entityId } : {};
      const response = await apiClient.get(`${API_PREFIX}pricelists/`, { params });
      return parseApiResponse(response);
    } catch (error) {
      console.error('Erreur chargement listes de prix:', error);
      return [];
    }
  },
  
  getFiscalPositions: async (entityId = null) => {
    try {
      const params = entityId ? { company: entityId } : {};
      const response = await apiClient.get('compta/fiscal-positions/', { params });
      return parseApiResponse(response);
    } catch (error) {
      console.error('Erreur chargement positions fiscales:', error);
      return [];
    }
  }
};

// ============= DIAGNOSTIC & TESTS =============
const testEndpoints = async (entityId = null) => {
  const endpoints = [
    { name: 'Commandes', url: `${API_PREFIX}orders/` },
    { name: 'Produits (Templates)', url: 'produits/templates/' },
    { name: 'Équipes', url: `${API_PREFIX}teams/` },
    { name: 'Partenaires', url: 'partenaires/' },
    { name: 'Devises', url: 'devises/' },
    { name: 'Taxes', url: 'compta/taxes/' },
  ];

  const results = [];
  for (const ep of endpoints) {
    try {
      const params = entityId ? { company: entityId } : {};
      const res = await apiClient.get(ep.url, { params });
      const count = Array.isArray(res) ? res.length : res.results?.length || 0;
      results.push({ name: ep.name, status: '✅', count, url: ep.url });
    } catch (err) {
      results.push({ name: ep.name, status: '❌', error: err.message, url: ep.url });
    }
  }
  return results;
};

const checkEnvironment = async () => {
  console.group('🔍 Diagnostic environnement Ventes');
  
  const user = authService.getCurrentUser();
  console.log('👤 Utilisateur connecté:', user ? 'Oui' : 'Non');
  if (user) {
    console.log('   ID:', user.id);
    console.log('   Entité:', user.entite?.raison_sociale || user.company_id);
  }
  
  const testResults = await testEndpoints(user?.company_id || user?.entite?.id);
  console.groupEnd();
  
  return { user, endpoints: testResults, timestamp: new Date().toISOString() };
};

// ============= EXPORTS =============
export {
  apiClient,
  authService,
  commandesService,
  produitsService,
  equipesService,
  referentielsService,
  formatAmount,
  testEndpoints,
  checkEnvironment
};

// Export par défaut pour compatibilité avec l'ancien code
export default commandesService;