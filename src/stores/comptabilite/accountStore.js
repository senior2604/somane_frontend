// C:\python\django\somane_frontend\src\stores\comptabilite\accountStore.js

import { create } from 'zustand';
import axiosInstance from '../../config/axiosInstance';
import { ENDPOINTS } from '../../config/api';

const useAccountStore = create((set, get) => ({
  // État
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

  // Actions
  fetchAccounts: async (params = {}) => {
    set({ loading: true, error: null });
    try {
      const response = await axiosInstance.get(ENDPOINTS.COMPTA.ACCOUNTS, { params });
      
      set({
        accounts: response.data.results || response.data,
        pagination: {
          current: params.page || 1,
          pageSize: params.page_size || 20,
          total: response.data.count || response.data.length,
        },
        loading: false,
      });
    } catch (error) {
      set({
        error: error.response?.data?.detail || 'Erreur lors du chargement des comptes',
        loading: false,
      });
      throw error;
    }
  },

  fetchAccountById: async (id) => {
    set({ loading: true, error: null });
    try {
      const response = await axiosInstance.get(`${ENDPOINTS.COMPTA.ACCOUNTS}/${id}`);
      set({ currentAccount: response.data, loading: false });
      return response.data;
    } catch (error) {
      set({
        error: error.response?.data?.detail || 'Erreur lors du chargement du compte',
        loading: false,
      });
      throw error;
    }
  },

  fetchAccountsByFramework: async (frameworkId, params = {}) => {
    return get().fetchAccounts({ ...params, framework: frameworkId });
  },

  createAccount: async (data) => {
    set({ loading: true, error: null });
    try {
      const response = await axiosInstance.post(ENDPOINTS.COMPTA.ACCOUNTS, data);
      set((state) => ({
        accounts: [response.data, ...state.accounts],
        loading: false,
      }));
      return response.data;
    } catch (error) {
      set({
        error: error.response?.data?.detail || 'Erreur lors de la création du compte',
        loading: false,
      });
      throw error;
    }
  },

  updateAccount: async (id, data) => {
    set({ loading: true, error: null });
    try {
      const response = await axiosInstance.put(`${ENDPOINTS.COMPTA.ACCOUNTS}/${id}`, data);
      set((state) => ({
        accounts: state.accounts.map((a) => (a.id === id ? response.data : a)),
        currentAccount: state.currentAccount?.id === id ? response.data : state.currentAccount,
        loading: false,
      }));
      return response.data;
    } catch (error) {
      set({
        error: error.response?.data?.detail || 'Erreur lors de la modification du compte',
        loading: false,
      });
      throw error;
    }
  },

  deleteAccount: async (id) => {
    set({ loading: true, error: null });
    try {
      await axiosInstance.delete(`${ENDPOINTS.COMPTA.ACCOUNTS}/${id}`);
      set((state) => ({
        accounts: state.accounts.filter((a) => a.id !== id),
        loading: false,
      }));
    } catch (error) {
      set({
        error: error.response?.data?.detail || 'Erreur lors de la suppression du compte',
        loading: false,
      });
      throw error;
    }
  },

  // Import de comptes (batch)
  importAccounts: async (accountsData, onProgress) => {
    set({ loading: true, error: null });
    const results = {
      success: 0,
      failed: 0,
      errors: [],
    };

    try {
      const batchSize = 10;
      for (let i = 0; i < accountsData.length; i += batchSize) {
        const batch = accountsData.slice(i, i + batchSize);

        await Promise.all(
          batch.map(async (account) => {
            try {
              await axiosInstance.post(ENDPOINTS.COMPTA.ACCOUNTS, account);
              results.success++;
            } catch (error) {
              results.failed++;
              results.errors.push({
                code: account.code,
                error: error.response?.data?.detail || 'Erreur inconnue',
              });
            }
          })
        );

        // Callback de progression
        if (onProgress) {
          const progress = Math.round(((i + batch.length) / accountsData.length) * 100);
          onProgress(progress);
        }
      }

      set({ loading: false });
      return results;
    } catch (error) {
      set({
        error: error.response?.data?.detail || 'Erreur lors de l\'import des comptes',
        loading: false,
      });
      throw error;
    }
  },

  setFilters: (filters) => set({ filters }),
  setPagination: (pagination) => set({ pagination }),
  clearError: () => set({ error: null }),
}));

export default useAccountStore;