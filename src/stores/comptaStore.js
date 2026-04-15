// src/stores/comptaStore.js
import { create } from 'zustand';
import axios from 'axios';

const API_BASE = '/api/compta/'; // ajuste si besoin (ou '/api/compta/' si pas de v1)



const useComptaStore = create((set, get) => ({
  // État
  frameworks: [],          // liste des plans comptables
  entities: [],            // liste des entités/compagnies
  currentFramework: null,  // plan sélectionné
  loading: false,
  error: null,

  // Actions
  fetchFrameworks: async () => {
    set({ loading: true, error: null });
    try {
      const res = await axios.get(`${API_BASE}/frameworks/`);
      set({ frameworks: res.data, loading: false });
    } catch (err) {
      set({ error: err.message || 'Erreur lors du chargement des plans', loading: false });
      console.error('Erreur fetch frameworks:', err);
    }
  },

  fetchEntities: async () => {
    set({ loading: true, error: null });
    try {
      const res = await axios.get('/api/entites/'); // ton endpoint existant
      set({ entities: res.data, loading: false });
    } catch (err) {
      set({ error: err.message || 'Erreur chargement entités', loading: false });
      console.error('Erreur fetch entités:', err);
    }
  },

  setCurrentFramework: (framework) => set({ currentFramework: framework }),

  // Optionnel : créer un plan (pour le formulaire)
  createFramework: async (data) => {
    try {
      const res = await axios.post(`${API_BASE}/frameworks/`, data);
      set(state => ({ frameworks: [...state.frameworks, res.data] }));
      return res.data;
    } catch (err) {
      throw err.response?.data || { message: 'Erreur création plan' };
    }
  },

  // Optionnel : mettre à jour un plan
  updateFramework: async (id, data) => {
    try {
      const res = await axios.put(`${API_BASE}/frameworks/${id}/`, data);
      set(state => ({
        frameworks: state.frameworks.map(f => f.id === id ? res.data : f)
      }));
      return res.data;
    } catch (err) {
      throw err.response?.data || { message: 'Erreur modification' };
    }
  }
}));

export default useComptaStore;