// src/stores/comptabilite/frameworkStore.js

import { create } from 'zustand';
import axiosInstance from '../../config/axiosInstance';
import { ENDPOINTS } from '../../config/api';

const useFrameworkStore = create((set, get) => ({
  frameworks: [],
  currentFramework: null,
  loading: false,
  error: null,
  pagination: {
    current: 1,
    pageSize: 10,
    total: 0,
  },

  fetchFrameworks: async (params = {}) => {
    set({ loading: true, error: null });
    try {
      const response = await axiosInstance.get(ENDPOINTS.COMPTA.FRAMEWORKS, { params });
      
      const data = response.data.results || response.data || [];
      
      set({
        frameworks: Array.isArray(data) ? data : [],
        pagination: {
          current: params.page || 1,
          pageSize: params.page_size || 10,
          total: response.data.count || (Array.isArray(data) ? data.length : 0),
        },
        loading: false,
      });
      
      return response.data;
    } catch (error) {
      console.error('Erreur fetch frameworks:', error);
      set({
        error: error.response?.data?.detail || 'Erreur lors du chargement des plans comptables',
        loading: false,
        frameworks: [], // ✅ Réinitialiser en cas d'erreur
      });
      throw error;
    }
  },

  fetchFrameworkById: async (id) => {
    set({ loading: true, error: null });
    try {
      // ✅ CORRIGÉ : Pas de slash supplémentaire
      const response = await axiosInstance.get(`${ENDPOINTS.COMPTA.FRAMEWORKS}${id}/`);
      set({ currentFramework: response.data, loading: false });
      return response.data;
    } catch (error) {
      set({
        error: error.response?.data?.detail || 'Erreur lors du chargement du plan comptable',
        loading: false,
      });
      throw error;
    }
  },

  createFramework: async (data) => {
    set({ loading: true, error: null });
    try {
      const response = await axiosInstance.post(ENDPOINTS.COMPTA.FRAMEWORKS, data);
      set((state) => ({
        frameworks: [response.data, ...state.frameworks],
        pagination: {
          ...state.pagination,
          total: state.pagination.total + 1,
        },
        loading: false,
      }));
      return response.data;
    } catch (error) {
      set({
        error: error.response?.data?.detail || 'Erreur lors de la création du plan comptable',
        loading: false,
      });
      throw error;
    }
  },

  updateFramework: async (id, data) => {
    set({ loading: true, error: null });
    try {
      // ✅ CORRIGÉ : Pas de slash supplémentaire
      const response = await axiosInstance.put(`${ENDPOINTS.COMPTA.FRAMEWORKS}${id}/`, data);
      set((state) => ({
        frameworks: state.frameworks.map((f) => (f.id === id ? response.data : f)),
        currentFramework:
          state.currentFramework?.id === id ? response.data : state.currentFramework,
        loading: false,
      }));
      return response.data;
    } catch (error) {
      set({
        error: error.response?.data?.detail || 'Erreur lors de la modification du plan comptable',
        loading: false,
      });
      throw error;
    }
  },

  deleteFramework: async (id) => {
    set({ loading: true, error: null });
    try {
      // ✅ CORRIGÉ : Pas de slash supplémentaire
      await axiosInstance.delete(`${ENDPOINTS.COMPTA.FRAMEWORKS}${id}/`);
      set((state) => ({
        frameworks: state.frameworks.filter((f) => f.id !== id),
        pagination: {
          ...state.pagination,
          total: Math.max(0, state.pagination.total - 1),
        },
        loading: false,
      }));
    } catch (error) {
      set({
        error: error.response?.data?.detail || 'Erreur lors de la suppression du plan comptable',
        loading: false,
      });
      throw error;
    }
  },

  setCurrentFramework: (framework) => set({ currentFramework: framework }),
  
  clearError: () => set({ error: null }),
  
  // ✅ BONUS : Méthode de reset complète
  reset: () => {
    set({
      frameworks: [],
      currentFramework: null,
      loading: false,
      error: null,
      pagination: {
        current: 1,
        pageSize: 10,
        total: 0,
      },
    });
  },
}));

export default useFrameworkStore;