// C:\python\django\somane_frontend\src\stores\comptabilite\typeStore.js

import { create } from 'zustand';
import axiosInstance from '../../config/axiosInstance';
import { ENDPOINTS } from '../../config/api';

const useTypeStore = create((set, get) => ({
  // État
  types: [],
  currentType: null,
  loading: false,
  error: null,

  // Actions
  fetchTypes: async (params = {}) => {
    set({ loading: true, error: null });
    try {
      const response = await axiosInstance.get(ENDPOINTS.COMPTA.TYPES, { params });
      set({
        types: response.data.results || response.data,
        loading: false,
      });
    } catch (error) {
      set({
        error: error.response?.data?.detail || 'Erreur lors du chargement des natures de comptes',
        loading: false,
      });
      throw error;
    }
  },

  fetchTypeById: async (id) => {
    set({ loading: true, error: null });
    try {
      const response = await axiosInstance.get(`${ENDPOINTS.COMPTA.TYPES}/${id}`);
      set({ currentType: response.data, loading: false });
      return response.data;
    } catch (error) {
      set({
        error: error.response?.data?.detail || 'Erreur lors du chargement de la nature',
        loading: false,
      });
      throw error;
    }
  },

  fetchTypesByFramework: async (frameworkId) => {
    return get().fetchTypes({ framework: frameworkId });
  },

  createType: async (data) => {
    set({ loading: true, error: null });
    try {
      const response = await axiosInstance.post(ENDPOINTS.COMPTA.TYPES, data);
      set((state) => ({
        types: [...state.types, response.data],
        loading: false,
      }));
      return response.data;
    } catch (error) {
      set({
        error: error.response?.data?.detail || 'Erreur lors de la création de la nature',
        loading: false,
      });
      throw error;
    }
  },

  updateType: async (id, data) => {
    set({ loading: true, error: null });
    try {
      const response = await axiosInstance.put(`${ENDPOINTS.COMPTA.TYPES}/${id}`, data);
      set((state) => ({
        types: state.types.map((t) => (t.id === id ? response.data : t)),
        currentType: state.currentType?.id === id ? response.data : state.currentType,
        loading: false,
      }));
      return response.data;
    } catch (error) {
      set({
        error: error.response?.data?.detail || 'Erreur lors de la modification de la nature',
        loading: false,
      });
      throw error;
    }
  },

  deleteType: async (id) => {
    set({ loading: true, error: null });
    try {
      await axiosInstance.delete(`${ENDPOINTS.COMPTA.TYPES}/${id}`);
      set((state) => ({
        types: state.types.filter((t) => t.id !== id),
        loading: false,
      }));
    } catch (error) {
      set({
        error: error.response?.data?.detail || 'Erreur lors de la suppression de la nature',
        loading: false,
      });
      throw error;
    }
  },

  clearError: () => set({ error: null }),
}));

export default useTypeStore;