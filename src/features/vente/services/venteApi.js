import { apiClient } from '../../../services/apiClient';

/**
 * Service API spécialisé pour le module Ventes
 * Réutilise l'apiClient existant avec des endpoints spécifiques
 */
class VenteApiService {
  constructor() {
    this.basePath = '/vente';
  }

  // ==================== COMMANDES CLIENT ====================
  getCommandesClient(params = {}) {
    return apiClient.get(`${this.basePath}/commandes-client/`, { params });
  }

  getCommandeClientById(id) {
    return apiClient.get(`${this.basePath}/commandes-client/${id}/`);
  }

  createCommandeClient(data) {
    return apiClient.post(`${this.basePath}/commandes-client/`, data);
  }

  updateCommandeClient(id, data) {
    return apiClient.put(`${this.basePath}/commandes-client/${id}/`, data);
  }

  deleteCommandeClient(id) {
    return apiClient.delete(`${this.basePath}/commandes-client/${id}/`);
  }

  // ==================== LIGNES COMMANDE CLIENT ====================
  getLignesCommandeClient(params = {}) {
    return apiClient.get(`${this.basePath}/lignes-commande-client/`, { params });
  }

  getLigneCommandeClientById(id) {
    return apiClient.get(`${this.basePath}/lignes-commande-client/${id}/`);
  }

  createLigneCommandeClient(data) {
    return apiClient.post(`${this.basePath}/lignes-commande-client/`, data);
  }

  updateLigneCommandeClient(id, data) {
    return apiClient.put(`${this.basePath}/lignes-commande-client/${id}/`, data);
  }

  deleteLigneCommandeClient(id) {
    return apiClient.delete(`${this.basePath}/lignes-commande-client/${id}/`);
  }

  // ==================== REPORTING VENTES ====================
  getReportingVentes(params = {}) {
    return apiClient.get(`${this.basePath}/reporting-ventes/`, { params });
  }

  getReportingVenteById(id) {
    return apiClient.get(`${this.basePath}/reporting-ventes/${id}/`);
  }

  createReportingVente(data) {
    return apiClient.post(`${this.basePath}/reporting-ventes/`, data);
  }

  updateReportingVente(id, data) {
    return apiClient.put(`${this.basePath}/reporting-ventes/${id}/`, data);
  }

  deleteReportingVente(id) {
    return apiClient.delete(`${this.basePath}/reporting-ventes/${id}/`);
  }

  // ==================== ÉQUIPES COMMERCIALES ====================
  getEquipesCommerciales(params = {}) {
    return apiClient.get(`${this.basePath}/equipes-commerciales/`, { params });
  }

  getEquipeCommercialeById(id) {
    return apiClient.get(`${this.basePath}/equipes-commerciales/${id}/`);
  }

  createEquipeCommerciale(data) {
    return apiClient.post(`${this.basePath}/equipes-commerciales/`, data);
  }

  updateEquipeCommerciale(id, data) {
    return apiClient.put(`${this.basePath}/equipes-commerciales/${id}/`, data);
  }

  deleteEquipeCommerciale(id) {
    return apiClient.delete(`${this.basePath}/equipes-commerciales/${id}/`);
  }

  // ==================== DONNÉES DE RÉFÉRENCE ====================
  getClients(params = {}) {
    return apiClient.get('/clients/', { params });
  }

  getProduits(params = {}) {
    return apiClient.get('/produits/', { params });
  }

  getDevises(params = {}) {
    return apiClient.get('/devises/', { params });
  }

  getSocietes(params = {}) {
    return apiClient.get('/societes/', { params });
  }

  getUtilisateurs(params = {}) {
    return apiClient.get('/utilisateurs/', { params });
  }

  getTaxes(params = {}) {
    return apiClient.get('/taxes/', { params });
  }

  getListesPrix(params = {}) {
    return apiClient.get('/listes-prix/', { params });
  }

  getTermesPaiement(params = {}) {
    return apiClient.get('/termes-paiement/', { params });
  }

  // ==================== MÉTHODES UTILITAIRES ====================
  
  /**
   * Récupère toutes les données nécessaires pour initialiser une page
   */
  async getInitialData() {
    try {
      const [
        commandesClient,
        lignesCommandeClient,
        reportingVentes,
        equipesCommerciales,
        clients,
        produits,
        devises,
        societes,
        utilisateurs,
        taxes,
        listesPrix,
        termesPaiement
      ] = await Promise.all([
        this.getCommandesClient().catch(() => ({ results: [] })),
        this.getLignesCommandeClient().catch(() => ({ results: [] })),
        this.getReportingVentes().catch(() => ({ results: [] })),
        this.getEquipesCommerciales().catch(() => ({ results: [] })),
        this.getClients().catch(() => ({ results: [] })),
        this.getProduits().catch(() => ({ results: [] })),
        this.getDevises().catch(() => ({ results: [] })),
        this.getSocietes().catch(() => ({ results: [] })),
        this.getUtilisateurs().catch(() => ({ results: [] })),
        this.getTaxes().catch(() => ({ results: [] })),
        this.getListesPrix().catch(() => ({ results: [] })),
        this.getTermesPaiement().catch(() => ({ results: [] }))
      ]);

      return {
        commandesClient: commandesClient.results || commandesClient,
        lignesCommandeClient: lignesCommandeClient.results || lignesCommandeClient,
        reportingVentes: reportingVentes.results || reportingVentes,
        equipesCommerciales: equipesCommerciales.results || equipesCommerciales,
        clients: clients.results || clients,
        produits: produits.results || produits,
        devises: devises.results || devises,
        societes: societes.results || societes,
        utilisateurs: utilisateurs.results || utilisateurs,
        taxes: taxes.results || taxes,
        listesPrix: listesPrix.results || listesPrix,
        termesPaiement: termesPaiement.results || termesPaiement
      };
    } catch (error) {
      console.error('Erreur lors du chargement des données initiales:', error);
      throw error;
    }
  }

  /**
   * Recherche avancée dans plusieurs tables
   */
  async searchGlobal(query) {
    try {
      const [commandes, reporting, equipes] = await Promise.all([
        this.getCommandesClient({ search: query }).catch(() => ({ results: [] })),
        this.getReportingVentes({ search: query }).catch(() => ({ results: [] })),
        this.getEquipesCommerciales({ search: query }).catch(() => ({ results: [] }))
      ]);

      return {
        commandesClient: commandes.results || commandes,
        reportingVentes: reporting.results || reporting,
        equipesCommerciales: equipes.results || equipes
      };
    } catch (error) {
      console.error('Erreur lors de la recherche globale:', error);
      throw error;
    }
  }

  /**
   * Export des données en CSV
   */
  async exportData(tableName, params = {}) {
    return apiClient.download(`${this.basePath}/${tableName}/export/`, {
      params,
      responseType: 'blob'
    });
  }

  /**
   * Statistiques pour le dashboard
   */
  async getDashboardStats() {
    try {
      const [
        commandesCount,
        lignesCount,
        reportingCount,
        equipesCount,
        commandesEnCours,
        commandesLivrees
      ] = await Promise.all([
        this.getCommandesClient({ limit: 1 }).then(res => res.count || 0).catch(() => 0),
        this.getLignesCommandeClient({ limit: 1 }).then(res => res.count || 0).catch(() => 0),
        this.getReportingVentes({ limit: 1 }).then(res => res.count || 0).catch(() => 0),
        this.getEquipesCommerciales({ limit: 1 }).then(res => res.count || 0).catch(() => 0),
        this.getCommandesClient({ state: 'en_cours', limit: 1 }).then(res => res.count || 0).catch(() => 0),
        this.getCommandesClient({ delivery_status: 'livree', limit: 1 }).then(res => res.count || 0).catch(() => 0)
      ]);

      return {
        totalCommandesClient: commandesCount,
        totalLignesCommande: lignesCount,
        totalReportingVentes: reportingCount,
        totalEquipesCommerciales: equipesCount,
        commandesEnCours,
        commandesLivrees,
        clientsActifs: 0 // À implémenter si disponible
      };
    } catch (error) {
      console.error('Erreur lors du chargement des statistiques:', error);
      throw error;
    }
  }
}

// Export singleton
export const venteApi = new VenteApiService();

/**
 * Hook React pour utiliser le service Vente API
 */
export const useVenteApi = () => {
  return venteApi;
};