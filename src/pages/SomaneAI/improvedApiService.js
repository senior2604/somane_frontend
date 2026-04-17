// somane_frontend/src/pages/SomaneAI/improvedApiService.js
/**
 * Service API amélioré pour SomaneAI
 * Interagit avec le backend intelligent et les modules ERP
 */

import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000/api';

// Instance axios configurée
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Intercepteur pour ajouter le token JWT
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

/**
 * Service pour le chat intelligent avec SomaneAI
 */
class SomaneAIService {
  /**
   * Envoie un message à l'IA et reçoit une réponse
   * @param {string} message - Le message de l'utilisateur
   * @returns {Promise<Object>} La réponse de l'IA
   */
  async sendMessage(message) {
    try {
      const response = await apiClient.post('/somaneai/chat/', {
        message: message,
      });
      return response.data;
    } catch (error) {
      console.error('Erreur lors de l\'envoi du message:', error);
      throw error;
    }
  }

  /**
   * Alternative: envoie un message via le ViewSet
   */
  async sendMessageViaViewSet(message) {
    try {
      const response = await apiClient.post('/somaneai/messages/send_message/', {
        message: message,
      });
      return response.data;
    } catch (error) {
      console.error('Erreur lors de l\'envoi du message:', error);
      throw error;
    }
  }

  /**
   * Récupère l'historique du chat
   * @returns {Promise<Array>} Liste des messages précédents
   */
  async getChatHistory() {
    try {
      const response = await apiClient.get('/somaneai/history/');
      return response.data;
    } catch (error) {
      console.error('Erreur lors de la récupération de l\'historique:', error);
      throw error;
    }
  }

  /**
   * Efface l'historique du chat
   * @returns {Promise<Object>} Confirmation de suppression
   */
  async clearChatHistory() {
    try {
      const response = await apiClient.post('/somaneai/clear/');
      return response.data;
    } catch (error) {
      console.error('Erreur lors de l\'effacement de l\'historique:', error);
      throw error;
    }
  }
}

/**
 * Service pour récupérer les données ERP
 */
class ERPDataService {
  /**
   * Récupère les données de ventes
   */
  async getVentesData(filters = {}) {
    try {
      const response = await apiClient.get('/ventes/', { params: filters });
      return response.data;
    } catch (error) {
      console.error('Erreur lors de la récupération des ventes:', error);
      return [];
    }
  }

  /**
   * Récupère les données de stock
   */
  async getStockData(filters = {}) {
    try {
      const response = await apiClient.get('/stock/', { params: filters });
      return response.data;
    } catch (error) {
      console.error('Erreur lors de la récupération du stock:', error);
      return [];
    }
  }

  /**
   * Récupère les données financières
   */
  async getFinancesData(filters = {}) {
    try {
      const response = await apiClient.get('/finances/', { params: filters });
      return response.data;
    } catch (error) {
      console.error('Erreur lors de la récupération des finances:', error);
      return [];
    }
  }

  /**
   * Récupère les données clients
   */
  async getClientsData(filters = {}) {
    try {
      const response = await apiClient.get('/partenaires/', { params: filters });
      return response.data;
    } catch (error) {
      console.error('Erreur lors de la récupération des clients:', error);
      return [];
    }
  }

  /**
   * Récupère les données de commandes
   */
  async getCommandesData(filters = {}) {
    try {
      const response = await apiClient.get('/commandes/', { params: filters });
      return response.data;
    } catch (error) {
      console.error('Erreur lors de la récupération des commandes:', error);
      return [];
    }
  }

  /**
   * Récupère les données d'achats
   */
  async getAchatsData(filters = {}) {
    try {
      const response = await apiClient.get('/achats/', { params: filters });
      return response.data;
    } catch (error) {
      console.error('Erreur lors de la récupération des achats:', error);
      return [];
    }
  }

  /**
   * Récupère tous les KPIs
   */
  async getKPIsData() {
    try {
      const response = await apiClient.get('/kpis/');
      return response.data;
    } catch (error) {
      console.error('Erreur lors de la récupération des KPIs:', error);
      return [];
    }
  }
}

/**
 * Service pour les analyses avancées
 */
class AnalyticsService {
  /**
   * Génère un rapport d'analyse
   */
  async generateReport(reportType, filters = {}) {
    try {
      const response = await apiClient.post('/analytics/report/', {
        report_type: reportType,
        filters: filters,
      });
      return response.data;
    } catch (error) {
      console.error('Erreur lors de la génération du rapport:', error);
      throw error;
    }
  }

  /**
   * Récupère les tendances
   */
  async getTrends(metric, period = '30days') {
    try {
      const response = await apiClient.get(`/analytics/trends/`, {
        params: { metric, period },
      });
      return response.data;
    } catch (error) {
      console.error('Erreur lors de la récupération des tendances:', error);
      return [];
    }
  }

  /**
   * Récupère les comparaisons périodes
   */
  async comparePeriods(metric, period1, period2) {
    try {
      const response = await apiClient.post('/analytics/compare/', {
        metric,
        period1,
        period2,
      });
      return response.data;
    } catch (error) {
      console.error('Erreur lors de la comparaison:', error);
      throw error;
    }
  }
}

export const somaneAIService = new SomaneAIService();
export const erpDataService = new ERPDataService();
export const analyticsService = new AnalyticsService();
