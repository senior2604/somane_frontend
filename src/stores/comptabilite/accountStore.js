// C:\python\django\somane_frontend\src\stores\comptabilite\accountStore.js

import { create } from 'zustand';
import axiosInstance from '../../config/axiosInstance';
import { ENDPOINTS } from '../../config/api';

const useAccountStore = create((set, get) => ({
  // ═══════════════════════════════════════════════════════════════
  // ÉTAT
  // ═══════════════════════════════════════════════════════════════
  accounts: [],
  currentAccount: null,
  loading: false,
  error: null,
  pagination: {
    current: 1,
    pageSize: 20,
    total: 0,
  },
  filters: {
    framework: null,
    type: null,
    group: null,
    company: null,
    active: null,
    reconcile: null,
  },

  // ═══════════════════════════════════════════════════════════════
  // ACTIONS - LECTURE
  // ═══════════════════════════════════════════════════════════════

  /**
   * Récupère la liste des comptes avec pagination et filtres
   * @param {Object} params - Paramètres de filtrage (framework, type, group, page, etc.)
   */
  fetchAccounts: async (params = {}) => {
    set({ loading: true, error: null });
    try {
      const response = await axiosInstance.get(ENDPOINTS.COMPTA.ACCOUNTS, { params });
      
      set({
        accounts: response.data.results || response.data || [],
        pagination: {
          current: params.page || 1,
          pageSize: params.page_size || 20,
          total: response.data.count || (response.data.results ? response.data.results.length : response.data.length),
        },
        loading: false,
      });

      return response.data;
    } catch (error) {
      const errorMessage = error.response?.data?.detail 
        || error.response?.data?.non_field_errors?.[0]
        || 'Erreur lors du chargement des comptes';
      
      set({
        error: errorMessage,
        loading: false,
        accounts: [], // ✅ Réinitialiser en cas d'erreur
      });
      
      throw error;
    }
  },

  /**
   * Récupère un compte par son ID
   * @param {number} id - ID du compte
   */
  fetchAccountById: async (id) => {
    set({ loading: true, error: null });
    try {
      // ✅ Slash final garanti
      const response = await axiosInstance.get(`${ENDPOINTS.COMPTA.ACCOUNTS}${id}/`);
      
      set({ 
        currentAccount: response.data, 
        loading: false 
      });
      
      return response.data;
    } catch (error) {
      const errorMessage = error.response?.data?.detail 
        || 'Erreur lors du chargement du compte';
      
      set({
        error: errorMessage,
        loading: false,
      });
      
      throw error;
    }
  },

  /**
   * Récupère les comptes d'un référentiel spécifique
   * @param {number} frameworkId - ID du référentiel
   * @param {Object} params - Paramètres additionnels
   */
  fetchAccountsByFramework: async (frameworkId, params = {}) => {
    return get().fetchAccounts({ 
      ...params, 
      framework: frameworkId 
    });
  },

  // ═══════════════════════════════════════════════════════════════
  // ACTIONS - ÉCRITURE
  // ═══════════════════════════════════════════════════════════════

  /**
   * Crée un nouveau compte
   * @param {Object} data - Données du compte à créer
   */
  createAccount: async (data) => {
    set({ loading: true, error: null });
    try {
      const response = await axiosInstance.post(ENDPOINTS.COMPTA.ACCOUNTS, data);
      
      set((state) => ({
        accounts: [response.data, ...state.accounts],
        pagination: {
          ...state.pagination,
          total: state.pagination.total + 1,
        },
        loading: false,
      }));
      
      return response.data;
    } catch (error) {
      const errorMessage = error.response?.data?.detail 
        || error.response?.data?.code?.[0]
        || error.response?.data?.non_field_errors?.[0]
        || 'Erreur lors de la création du compte';
      
      set({
        error: errorMessage,
        loading: false,
      });
      
      throw error;
    }
  },

  /**
   * Met à jour un compte existant
   * @param {number} id - ID du compte
   * @param {Object} data - Nouvelles données du compte
   */
  updateAccount: async (id, data) => {
    set({ loading: true, error: null });
    try {
      // ✅ Slash final garanti
      const response = await axiosInstance.put(`${ENDPOINTS.COMPTA.ACCOUNTS}${id}/`, data);
      
      set((state) => ({
        accounts: state.accounts.map((account) => 
          account.id === id ? response.data : account
        ),
        currentAccount: state.currentAccount?.id === id 
          ? response.data 
          : state.currentAccount,
        loading: false,
      }));
      
      return response.data;
    } catch (error) {
      const errorMessage = error.response?.data?.detail 
        || error.response?.data?.non_field_errors?.[0]
        || 'Erreur lors de la modification du compte';
      
      set({
        error: errorMessage,
        loading: false,
      });
      
      throw error;
    }
  },

  /**
   * Supprime un compte
   * @param {number} id - ID du compte à supprimer
   */
  deleteAccount: async (id) => {
    set({ loading: true, error: null });
    try {
      // ✅ Slash final garanti
      await axiosInstance.delete(`${ENDPOINTS.COMPTA.ACCOUNTS}${id}/`);
      
      set((state) => ({
        accounts: state.accounts.filter((account) => account.id !== id),
        pagination: {
          ...state.pagination,
          total: Math.max(0, state.pagination.total - 1),
        },
        currentAccount: state.currentAccount?.id === id 
          ? null 
          : state.currentAccount,
        loading: false,
      }));
    } catch (error) {
      const errorMessage = error.response?.data?.detail 
        || error.response?.data?.non_field_errors?.[0]
        || 'Erreur lors de la suppression du compte';
      
      set({
        error: errorMessage,
        loading: false,
      });
      
      throw error;
    }
  },

  // ═══════════════════════════════════════════════════════════════
  // ACTIONS - IMPORT BATCH
  // ═══════════════════════════════════════════════════════════════

  /**
   * Importe plusieurs comptes en batch
   * @param {Array} accountsData - Tableau de données de comptes
   * @param {Function} onProgress - Callback de progression (optionnel)
   */
  importAccounts: async (accountsData, onProgress) => {
    set({ loading: true, error: null });
    
    const results = {
      success: 0,
      failed: 0,
      errors: [],
      total: accountsData.length,
    };

    try {
      const batchSize = 10;
      
      for (let i = 0; i < accountsData.length; i += batchSize) {
        const batch = accountsData.slice(i, i + batchSize);

        // Traiter le batch en parallèle
        const batchPromises = batch.map(async (accountData) => {
          try {
            await axiosInstance.post(ENDPOINTS.COMPTA.ACCOUNTS, accountData);
            results.success++;
            return { success: true, data: accountData };
          } catch (error) {
            results.failed++;
            const errorDetail = {
              code: accountData.code,
              name: accountData.name,
              error: error.response?.data?.detail 
                || error.response?.data?.code?.[0]
                || error.response?.data?.non_field_errors?.[0]
                || 'Erreur inconnue',
            };
            results.errors.push(errorDetail);
            return { success: false, error: errorDetail };
          }
        });

        await Promise.allSettled(batchPromises);

        // Callback de progression
        if (onProgress) {
          const progress = Math.round(((i + batch.length) / accountsData.length) * 100);
          onProgress({
            progress,
            processed: i + batch.length,
            total: accountsData.length,
            success: results.success,
            failed: results.failed,
          });
        }
      }

      set({ loading: false });
      
      // Recharger la liste après l'import
      if (results.success > 0) {
        const currentFilters = get().filters;
        await get().fetchAccounts(currentFilters);
      }
      
      return results;
    } catch (error) {
      const errorMessage = error.response?.data?.detail 
        || 'Erreur lors de l\'import des comptes';
      
      set({
        error: errorMessage,
        loading: false,
      });
      
      throw error;
    }
  },

  /**
   * Exporte les comptes actuels en CSV
   * @returns {string} - Données CSV
   */
  exportAccountsToCSV: () => {
    const accounts = get().accounts;
    
    if (!accounts || accounts.length === 0) {
      throw new Error('Aucun compte à exporter');
    }

    // En-têtes CSV
    const headers = [
      'Code',
      'Libellé',
      'Nature',
      'Classe',
      'Solde ouverture',
      'Lettrable',
      'Actif',
    ];

    // Lignes de données
    const rows = accounts.map((account) => [
      account.code || '',
      account.name || '',
      account.type_name || '',
      account.group_name || '',
      account.opening_balance || '0.00',
      account.reconcile ? 'Oui' : 'Non',
      account.active ? 'Actif' : 'Inactif',
    ]);

    // Construire le CSV
    const csvContent = [
      headers.join(','),
      ...rows.map((row) => row.map((cell) => `"${cell}"`).join(',')),
    ].join('\n');

    return csvContent;
  },

  // ═══════════════════════════════════════════════════════════════
  // ACTIONS - UTILITAIRES
  // ═══════════════════════════════════════════════════════════════

  /**
   * Met à jour les filtres
   * @param {Object} filters - Nouveaux filtres
   */
  setFilters: (filters) => {
    set({ filters });
  },

  /**
   * Met à jour la pagination
   * @param {Object|Function} pagination - Nouvelle pagination ou fonction de mise à jour
   */
  setPagination: (pagination) => {
    if (typeof pagination === 'function') {
      set((state) => ({
        pagination: pagination(state.pagination),
      }));
    } else {
      set({ pagination });
    }
  },

  /**
   * Réinitialise le compte courant
   */
  clearCurrentAccount: () => {
    set({ currentAccount: null });
  },

  /**
   * Efface les erreurs
   */
  clearError: () => {
    set({ error: null });
  },

  /**
   * Réinitialise complètement le store
   */
  reset: () => {
    set({
      accounts: [],
      currentAccount: null,
      loading: false,
      error: null,
      pagination: {
        current: 1,
        pageSize: 20,
        total: 0,
      },
      filters: {
        framework: null,
        type: null,
        group: null,
        company: null,
        active: null,
        reconcile: null,
      },
    });
  },
}));

export default useAccountStore;