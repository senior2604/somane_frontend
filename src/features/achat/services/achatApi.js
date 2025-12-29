// features/achats/services/achatApi.js
import { apiClient } from '../../../services/apiClient';

/**
 * Service API spécialisé pour le module Achats
 * Réutilise l'apiClient existant avec des endpoints spécifiques
 */
class AchatApiService {
  constructor() {
    this.basePath = '/achats';
  }

  // ==================== BONS DE COMMANDE ====================
  getBonsCommande(params = {}) {
    return apiClient.get(`${this.basePath}/bons-commande/`, { params });
  }

  getBonCommandeById(id) {
    return apiClient.get(`${this.basePath}/bons-commande/${id}/`);
  }

  createBonCommande(data) {
    return apiClient.post(`${this.basePath}/bons-commande/`, data);
  }

  updateBonCommande(id, data) {
    return apiClient.put(`${this.basePath}/bons-commande/${id}/`, data);
  }

  deleteBonCommande(id) {
    return apiClient.delete(`${this.basePath}/bons-commande/${id}/`);
  }

  // ==================== LIGNES BON COMMANDE ====================
  getLignesBonCommande(params = {}) {
    return apiClient.get(`${this.basePath}/lignes-bon-commande/`, { params });
  }

  getLigneBonCommandeById(id) {
    return apiClient.get(`${this.basePath}/lignes-bon-commande/${id}/`);
  }

  createLigneBonCommande(data) {
    return apiClient.post(`${this.basePath}/lignes-bon-commande/`, data);
  }

  updateLigneBonCommande(id, data) {
    return apiClient.put(`${this.basePath}/lignes-bon-commande/${id}/`, data);
  }

  deleteLigneBonCommande(id) {
    return apiClient.delete(`${this.basePath}/lignes-bon-commande/${id}/`);
  }

  // ==================== DEMANDES ACHAT ====================
  getDemandesAchat(params = {}) {
    return apiClient.get(`${this.basePath}/demandes-achat/`, { params });
  }

  getDemandeAchatById(id) {
    return apiClient.get(`${this.basePath}/demandes-achat/${id}/`);
  }

  createDemandeAchat(data) {
    return apiClient.post(`${this.basePath}/demandes-achat/`, data);
  }

  updateDemandeAchat(id, data) {
    return apiClient.put(`${this.basePath}/demandes-achat/${id}/`, data);
  }

  deleteDemandeAchat(id) {
    return apiClient.delete(`${this.basePath}/demandes-achat/${id}/`);
  }

  // ==================== LIGNES DEMANDE ACHAT ====================
  getLignesDemandeAchat(params = {}) {
    return apiClient.get(`${this.basePath}/lignes-demande-achat/`, { params });
  }

  getLigneDemandeAchatById(id) {
    return apiClient.get(`${this.basePath}/lignes-demande-achat/${id}/`);
  }

  createLigneDemandeAchat(data) {
    return apiClient.post(`${this.basePath}/lignes-demande-achat/`, data);
  }

  updateLigneDemandeAchat(id, data) {
    return apiClient.put(`${this.basePath}/lignes-demande-achat/${id}/`, data);
  }

  deleteLigneDemandeAchat(id) {
    return apiClient.delete(`${this.basePath}/lignes-demande-achat/${id}/`);
  }

  // ==================== PRIX FOURNISSEURS ====================
  getPrixFournisseurs(params = {}) {
    return apiClient.get(`${this.basePath}/prix-fournisseurs/`, { params });
  }

  getPrixFournisseurById(id) {
    return apiClient.get(`${this.basePath}/prix-fournisseurs/${id}/`);
  }

  createPrixFournisseur(data) {
    return apiClient.post(`${this.basePath}/prix-fournisseurs/`, data);
  }

  updatePrixFournisseur(id, data) {
    return apiClient.put(`${this.basePath}/prix-fournisseurs/${id}/`, data);
  }

  deletePrixFournisseur(id) {
    return apiClient.delete(`${this.basePath}/prix-fournisseurs/${id}/`);
  }

  // ==================== DONNÉES DE RÉFÉRENCE ====================
  // Ces endpoints peuvent venir d'autres modules

  getFournisseurs(params = {}) {
    return apiClient.get('/fournisseurs/', { params });
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

  getDepartements(params = {}) {
    return apiClient.get('/departements/', { params });
  }

  getTaxes(params = {}) {
    return apiClient.get('/taxes/', { params });
  }

  // ==================== MÉTHODES UTILITAIRES ====================
  
  /**
   * Récupère toutes les données nécessaires pour initialiser une page
   */
  async getInitialData() {
    try {
      const [
        bonsCommande,
        lignesBonCommande,
        demandesAchat,
        lignesDemandeAchat,
        prixFournisseurs,
        fournisseurs,
        produits,
        devises,
        societes,
        utilisateurs,
        departements,
        taxes
      ] = await Promise.all([
        this.getBonsCommande().catch(() => ({ results: [] })),
        this.getLignesBonCommande().catch(() => ({ results: [] })),
        this.getDemandesAchat().catch(() => ({ results: [] })),
        this.getLignesDemandeAchat().catch(() => ({ results: [] })),
        this.getPrixFournisseurs().catch(() => ({ results: [] })),
        this.getFournisseurs().catch(() => ({ results: [] })),
        this.getProduits().catch(() => ({ results: [] })),
        this.getDevises().catch(() => ({ results: [] })),
        this.getSocietes().catch(() => ({ results: [] })),
        this.getUtilisateurs().catch(() => ({ results: [] })),
        this.getDepartements().catch(() => ({ results: [] })),
        this.getTaxes().catch(() => ({ results: [] }))
      ]);

      return {
        bonsCommande: bonsCommande.results || bonsCommande,
        lignesBonCommande: lignesBonCommande.results || lignesBonCommande,
        demandesAchat: demandesAchat.results || demandesAchat,
        lignesDemandeAchat: lignesDemandeAchat.results || lignesDemandeAchat,
        prixFournisseurs: prixFournisseurs.results || prixFournisseurs,
        fournisseurs: fournisseurs.results || fournisseurs,
        produits: produits.results || produits,
        devises: devises.results || devises,
        societes: societes.results || societes,
        utilisateurs: utilisateurs.results || utilisateurs,
        departements: departements.results || departements,
        taxes: taxes.results || taxes
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
      const [bons, demandes, prix] = await Promise.all([
        this.getBonsCommande({ search: query }).catch(() => ({ results: [] })),
        this.getDemandesAchat({ search: query }).catch(() => ({ results: [] })),
        this.getPrixFournisseurs({ search: query }).catch(() => ({ results: [] }))
      ]);

      return {
        bonsCommande: bons.results || bons,
        demandesAchat: demandes.results || demandes,
        prixFournisseurs: prix.results || prix
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
        bonsCount,
        demandesCount,
        prixCount,
        bonsEnCours,
        demandesEnAttente
      ] = await Promise.all([
        this.getBonsCommande({ limit: 1 }).then(res => res.count || 0).catch(() => 0),
        this.getDemandesAchat({ limit: 1 }).then(res => res.count || 0).catch(() => 0),
        this.getPrixFournisseurs({ limit: 1 }).then(res => res.count || 0).catch(() => 0),
        this.getBonsCommande({ state: 'en_cours', limit: 1 }).then(res => res.count || 0).catch(() => 0),
        this.getDemandesAchat({ state: 'en_attente', limit: 1 }).then(res => res.count || 0).catch(() => 0)
      ]);

      return {
        totalBonsCommande: bonsCount,
        totalDemandesAchat: demandesCount,
        totalPrixFournisseurs: prixCount,
        bonsEnCours,
        demandesEnAttente,
        fournisseursActifs: 0 // À implémenter si disponible
      };
    } catch (error) {
      console.error('Erreur lors du chargement des statistiques:', error);
      throw error;
    }
  }
}

// Export singleton
export const achatApi = new AchatApiService();

/**
 * Hook React pour utiliser le service Achat API
 */
export const useAchatApi = () => {
  return achatApi;
};