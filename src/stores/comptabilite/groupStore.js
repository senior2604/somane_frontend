// C:\python\django\somane_frontend\src\stores\comptabilite\groupStore.js

import { create } from 'zustand';
import axiosInstance from '../../config/axiosInstance'; // ✅ Client centralisé
import { ENDPOINTS } from '../../config/api';

const useGroupStore = create((set, get) => ({
  // État
  groups: [],
  currentGroup: null,
  loading: false,
  error: null,
  filters: {
    framework: null,
    parent: null,
  },

  // Actions
  fetchGroups: async (params = {}) => {
    set({ loading: true, error: null });
    try {
      const response = await axiosInstance.get(ENDPOINTS.COMPTA.GROUPS, { params });
      set({
        groups: response.data.results || response.data,
        loading: false,
      });
    } catch (error) {
      set({
        error: error.response?.data?.detail || 'Erreur lors du chargement des classes',
        loading: false,
      });
      throw error;
    }
  },

  fetchGroupById: async (id) => {
    set({ loading: true, error: null });
    try {
      const response = await axiosInstance.get(`${ENDPOINTS.COMPTA.GROUPS}/${id}`);
      set({ currentGroup: response.data, loading: false });
      return response.data;
    } catch (error) {
      set({
        error: error.response?.data?.detail || 'Erreur lors du chargement de la classe',
        loading: false,
      });
      throw error;
    }
  },

  fetchGroupsByFramework: async (frameworkId) => {
    return get().fetchGroups({ framework: frameworkId });
  },

  createGroup: async (data) => {
    set({ loading: true, error: null });
    try {
      const response = await axiosInstance.post(ENDPOINTS.COMPTA.GROUPS, data);
      set((state) => ({
        groups: [...state.groups, response.data],
        loading: false,
      }));
      return response.data;
    } catch (error) {
      set({
        error: error.response?.data?.detail || 'Erreur lors de la création de la classe',
        loading: false,
      });
      throw error;
    }
  },

  updateGroup: async (id, data) => {
    set({ loading: true, error: null });
    try {
      const response = await axiosInstance.put(`${ENDPOINTS.COMPTA.GROUPS}/${id}`, data);
      set((state) => ({
        groups: state.groups.map((g) => (g.id === id ? response.data : g)),
        currentGroup: state.currentGroup?.id === id ? response.data : state.currentGroup,
        loading: false,
      }));
      return response.data;
    } catch (error) {
      set({
        error: error.response?.data?.detail || 'Erreur lors de la modification de la classe',
        loading: false,
      });
      throw error;
    }
  },

  deleteGroup: async (id) => {
    set({ loading: true, error: null });
    try {
      await axiosInstance.delete(`${ENDPOINTS.COMPTA.GROUPS}/${id}`);
      set((state) => ({
        groups: state.groups.filter((g) => g.id !== id),
        loading: false,
      }));
    } catch (error) {
      set({
        error: error.response?.data?.detail || 'Erreur lors de la suppression de la classe',
        loading: false,
      });
      throw error;
    }
  },

  setFilters: (filters) => set({ filters }),
  clearError: () => set({ error: null }),
}));

export default useGroupStore;