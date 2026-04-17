import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000/api';

// Configuration Axios
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000,
});

// Récupérer les données de ventes
export const fetchVentesData = async () => {
  try {
    const response = await apiClient.get('/ventes/');
    return response.data;
  } catch (error) {
    console.error('Erreur récupération ventes:', error);
    return null;
  }
};

// Module stock supprimé - fonction fetchStockData retirée

// Récupérer les données financières
export const fetchFinancesData = async () => {
  try {
    const response = await apiClient.get('/finances/');
    return response.data;
  } catch (error) {
    console.error('Erreur récupération finances:', error);
    return null;
  }
};

// Récupérer les données de clients
export const fetchClientsData = async () => {
  try {
    const response = await apiClient.get('/clients/');
    return response.data;
  } catch (error) {
    console.error('Erreur récupération clients:', error);
    return null;
  }
};

// Récupérer les données de fournisseurs
export const fetchFournisseursData = async () => {
  try {
    const response = await apiClient.get('/fournisseurs/');
    return response.data;
  } catch (error) {
    console.error('Erreur récupération fournisseurs:', error);
    return null;
  }
};

// Récupérer les données de commandes
export const fetchCommandesData = async () => {
  try {
    const response = await apiClient.get('/commandes/');
    return response.data;
  } catch (error) {
    console.error('Erreur récupération commandes:', error);
    return null;
  }
};

// Récupérer les KPIs
export const fetchKPIsData = async () => {
  try {
    const response = await apiClient.get('/kpis/');
    return response.data;
  } catch (error) {
    console.error('Erreur récupération KPIs:', error);
    return null;
  }
};

// Envoyer les interactions IA pour apprentissage
export const logAIInteraction = async (question, reponse, donnees) => {
  try {
    await apiClient.post('/ai-interactions/', {
      question,
      reponse,
      donnees,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Erreur log interaction IA:', error);
  }
};

// Récupérer les analyses passées (apprentissage de l'IA)
export const fetchAIAnalytics = async () => {
  try {
    const response = await apiClient.get('/ai-analytics/');
    return response.data;
  } catch (error) {
    console.error('Erreur récupération analytics IA:', error);
    return null;
  }
};

export default apiClient;
