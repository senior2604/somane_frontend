// src/features/comptabilite/services.js
import { apiClient } from '../../services/apiClient';
import { authService } from '../../services/authService'; 

const API_PREFIX = 'compta/';

// ==============================================================================
// ============= SERVICE TABLEAU DE BORD COMPTABLE ===============================
// ==============================================================================
export const dashboardService = {
  /**
   * Recuperer les indicateurs du tableau de bord comptable
   */
  getSummary: async (entityId = null, filters = {}) => {
    try {
      const params = entityId
        ? { ...filters, company: entityId, entity_id: entityId }
        : filters;
      const query = new URLSearchParams(
        Object.entries(params).filter(([, value]) => value !== undefined && value !== null && value !== '')
      ).toString();
      const endpoint = query ? `${API_PREFIX}dashboard/?${query}` : `${API_PREFIX}dashboard/`;

      const response = await apiClient.get(endpoint);

      if (response?.data && typeof response.data === 'object') return response.data;
      return response;
    } catch (error) {
      console.error('Erreur chargement dashboard comptable:', error);
      throw error;
    }
  }
};

// ==============================================================================
// ============= SERVICE PAIEMENTS (AJOUTÉ ICI) ================================
// ==============================================================================
export const paymentService = {
  /**
   * Récupérer la liste des paiements
   */
  getAll: async (entityId = null, filters = {}) => {
    try {
      const params = entityId ? { ...filters, company: entityId } : filters;
      const response = await apiClient.get(`${API_PREFIX}payments/`, { params });
      
      let data = [];
      if (Array.isArray(response)) data = response;
      else if (response?.results) data = response.results;
      else if (response?.data) data = response.data;
      
      return data;
    } catch (error) {
      console.error('Erreur chargement paiements:', error);
      return [];
    }
  },

  /**
   * Créer un nouveau paiement
   */
  create: async (data, entityId = null) => {
    try {
      const payload = entityId ? { ...data, company: entityId } : data;
      // S'assurer que le montant est un nombre
      if (payload.amount) payload.amount = parseFloat(payload.amount);
      
      const response = await apiClient.post(`${API_PREFIX}payments/`, payload);
      return response;
    } catch (error) {
      console.error('Erreur création paiement:', error);
      throw error;
    }
  },

  /**
   * Récupérer un paiement par ID
   */
  getById: async (id, entityId = null) => {
    try {
      const params = entityId ? { company: entityId } : {};
      const response = await apiClient.get(`${API_PREFIX}payments/${id}/`, { params });
      return response;
    } catch (error) {
      console.error(`Erreur chargement paiement ${id}:`, error);
      throw error;
    }
  },

  /**
   * Valider un paiement (Passer à l'état 'posted')
   */
  validate: async (id, entityId = null) => {
    try {
      const params = entityId ? { company: entityId } : {};
      return await apiClient.post(`${API_PREFIX}payments/${id}/validate/`, {}, { params });
    } catch (error) {
      console.error('Erreur validation paiement:', error);
      throw error;
    }
  },

  /**
   * Annuler un paiement
   */
  cancel: async (id, entityId = null) => {
    try {
      const params = entityId ? { company: entityId } : {};
      return await apiClient.post(`${API_PREFIX}payments/${id}/cancel/`, {}, { params });
    } catch (error) {
      console.error('Erreur annulation paiement:', error);
      throw error;
    }
  },

  /**
   * Récupérer les journaux de type Banque ou Caisse uniquement
   */
  getCashJournals: async (entityId = null) => {
    try {
      const params = entityId ? { company: entityId } : {};
      const response = await apiClient.get(`${API_PREFIX}journals/`, { params });
      
      let journals = [];
      if (Array.isArray(response)) journals = response;
      else if (response?.results) journals = response.results;
      else if (response?.data) journals = response.data;

      // Filtrer pour ne garder que Banque et Caisse
      return journals.filter(j => {
        const typeCode = j.type?.code || j.type_code || '';
        return ['BAN', 'CAI', 'BANQUE', 'CAISSE', 'CASH', 'BANK'].includes(typeCode.toUpperCase());
      });
    } catch (error) {
      console.error('Erreur chargement journaux trésorerie:', error);
      return [];
    }
  },

  /**
   * Récupérer les factures impayées d'un partenaire
   */
  getOpenInvoices: async (partnerId, entityId = null) => {
    if (!partnerId) return [];
    try {
      const params = {
        partner_id: partnerId,
        move_type__in: ['out_invoice', 'in_invoice', 'out_refund', 'in_refund'],
        state: 'posted',
        amount_residual__gt: 0
      };
      if (entityId) params.company = entityId;

      const response = await apiClient.get(`${API_PREFIX}moves/`, { params });
      
      let moves = [];
      if (Array.isArray(response)) moves = response;
      else if (response?.results) moves = response.results;
      else if (response?.data) moves = response.data;
      
      return moves;
    } catch (error) {
      console.error('Erreur chargement factures impayées:', error);
      return [];
    }
  }
};

// ============= SERVICE SÉQUENCES =============
export const sequencesService = {
  /**
   * Récupérer toutes les séquences
   * @param {number|null} entityId - ID de l'entité (optionnel)
   * @returns {Promise<Array>} Liste des séquences
   */
  getAll: async (entityId = null) => {
    try {
      const params = entityId ? { company: entityId } : {};
      const response = await apiClient.get('/sequences/', { params });
      
      let sequencesData = [];
      if (Array.isArray(response)) {
        sequencesData = response;
      } else if (response && typeof response === 'object') {
        if (response.results && Array.isArray(response.results)) {
          sequencesData = response.results;
        } else if (response.data && Array.isArray(response.data)) {
          sequencesData = response.data;
        }
      }
      
      return sequencesData;
    } catch (error) {
      console.error('Erreur chargement séquences:', error);
      return [];
    }
  },

  /**
   * Récupérer une séquence par son ID
   * @param {number} id - ID de la séquence
   * @param {number|null} entityId - ID de l'entité (optionnel)
   * @returns {Promise<Object>} Détails de la séquence
   */
  getById: async (id, entityId = null) => {
    try {
      const params = entityId ? { company: entityId } : {};
      const response = await apiClient.get(`/sequences/${id}/`, { params });
      return response;
    } catch (error) {
      console.error(`Erreur chargement séquence ${id}:`, error);
      throw error;
    }
  },

  /**
   * Créer une nouvelle séquence
   * @param {Object} data - Données de la séquence
   * @param {number|null} entityId - ID de l'entité (optionnel)
   * @returns {Promise<Object>} Séquence créée
   */
  create: async (data, entityId = null) => {
    try {
      const payload = entityId ? { ...data, company: entityId } : data;
      const response = await apiClient.post('/sequences/', payload);
      return response;
    } catch (error) {
      console.error('Erreur création séquence:', error);
      throw error;
    }
  },

  /**
   * Mettre à jour une séquence
   * @param {number} id - ID de la séquence
   * @param {Object} data - Données à mettre à jour
   * @param {number|null} entityId - ID de l'entité (optionnel)
   * @returns {Promise<Object>} Séquence mise à jour
   */
  update: async (id, data, entityId = null) => {
    try {
      const payload = entityId ? { ...data, company: entityId } : data;
      const response = await apiClient.put(`/sequences/${id}/`, payload);
      return response;
    } catch (error) {
      console.error(`Erreur mise à jour séquence ${id}:`, error);
      throw error;
    }
  },

  /**
   * Supprimer une séquence
   * @param {number} id - ID de la séquence
   * @param {number|null} entityId - ID de l'entité (optionnel)
   * @returns {Promise<void>}
   */
  delete: async (id, entityId = null) => {
    try {
      const params = entityId ? { company: entityId } : {};
      await apiClient.delete(`/sequences/${id}/`, { params });
    } catch (error) {
      console.error(`Erreur suppression séquence ${id}:`, error);
      throw error;
    }
  },

  /**
   * Générer le prochain numéro d'une séquence
   * @param {number} id - ID de la séquence
   * @param {number|null} entityId - ID de l'entité (optionnel)
   * @returns {Promise<Object>} Objet avec le prochain numéro
   */
  getNextNumber: async (id, entityId = null) => {
    try {
      const params = entityId ? { company: entityId } : {};
      const response = await apiClient.post(`/sequences/${id}/next/`, {}, { params });
      return response;
    } catch (error) {
      console.error(`Erreur génération prochain numéro séquence ${id}:`, error);
      throw error;
    }
  },

  /**
   * Formater le libellé d'une séquence pour l'affichage
   * @param {Object} sequence - Objet séquence
   * @returns {string} Libellé formaté
   */
  formatSequenceLabel: (sequence) => {
    if (!sequence) return '';
    const prefix = sequence.prefix || '';
    const suffix = sequence.suffix || '';
    const padding = sequence.padding || 5;
    const currentNumber = sequence.current_number || 0;
    const formattedNumber = String(currentNumber).padStart(padding, '0');
    return `${prefix}${formattedNumber}${suffix}`;
  },

  /**
   * Formater le modèle d'une séquence pour l'affichage
   * @param {Object} sequence - Objet séquence
   * @returns {string} Modèle formaté (ex: FACT-00000)
   */
  formatSequencePattern: (sequence) => {
    if (!sequence) return '';
    const prefix = sequence.prefix || '';
    const suffix = sequence.suffix || '';
    const padding = sequence.padding || 5;
    const zeros = '0'.repeat(padding);
    return `${prefix}${zeros}${suffix}`;
  }
};

// ============= SERVICE LETTRAGE =============
export const lettrageService = {
  // === LIGNES À LETTRER (Show/List) ===
  
  /**
   * Récupérer les lignes non lettrées (éligibles au lettrage)
   * @param {number|null} entityId - ID de l'entité
   * @param {Object} filters - Filtres optionnels (date, partenaire, compte, montant)
   * @returns {Promise<Array>} Liste des lignes AccountMoveLine
   */
  getUnreconciledLines: async (entityId = null, filters = {}) => {
    try {
      const params = {
        reconciled: 'false',
        ...(entityId && { company: entityId }),
        ...filters
      };
      const response = await apiClient.get(`${API_PREFIX}move-lines/unreconciled/`, { params });
      
      let linesData = [];
      if (Array.isArray(response)) {
        linesData = response;
      } else if (response && typeof response === 'object') {
        if (response.results && Array.isArray(response.results)) {
          linesData = response.results;
        } else if (response.data && Array.isArray(response.data)) {
          linesData = response.data;
        }
      }
      return linesData;
    } catch (error) {
      console.error('Erreur chargement lignes non lettrées:', error);
      return [];
    }
  },

  /**
   * Récupérer les candidats potentiels pour une ligne donnée
   * (mêmes compte/partenaire, solde opposé, même journal optionnel)
   * @param {number} lineId - ID de la ligne source
   * @param {number|null} entityId - ID de l'entité
   * @returns {Promise<Array>} Liste des lignes candidates
   */
  getCandidatesForLine: async (lineId, entityId = null) => {
    try {
      const params = entityId ? { company: entityId } : {};
      const response = await apiClient.get(`${API_PREFIX}move-lines/${lineId}/candidates/`, { params });
      
      let candidatesData = [];
      if (Array.isArray(response)) {
        candidatesData = response;
      } else if (response && typeof response === 'object') {
        if (response.results && Array.isArray(response.results)) {
          candidatesData = response.results;
        } else if (response.data && Array.isArray(response.data)) {
          candidatesData = response.data;
        }
      }
      return candidatesData;
    } catch (error) {
      console.error(`Erreur chargement candidats pour ligne ${lineId}:`, error);
      return [];
    }
  },

  // === CRÉATION & GESTION DU LETTRAGE (Create) ===
  
  /**
   * Créer un nouveau lettrage (partiel ou total)
   * @param {Object} data - Payload de lettrage
   * @param {number|null} entityId - ID de l'entité
   * @returns {Promise<Object>} Lettrage créé
   * 
   * Payload attendu :
   * {
   *   line_ids: number[],        // IDs des AccountMoveLine à lettrer
   *   reconcile_type: 'partial' | 'full',
   *   amount?: number,           // Requis si type='partial'
   *   comment?: string,
   *   auto_writeoff?: boolean    // Optionnel : arrondir les écarts < seuil
   * }
   */
  create: async (data, entityId = null) => {
    try {
      const payload = entityId ? { ...data, company: entityId } : data;
      const response = await apiClient.post(`${API_PREFIX}reconciliations/`, payload);
      return response;
    } catch (error) {
      console.error('Erreur création lettrage:', error);
      throw error;
    }
  },

  /**
   * Récupérer un lettrage par son ID (pour Show/Edit)
   * @param {number} id - ID du lettrage
   * @param {number|null} entityId - ID de l'entité
   * @returns {Promise<Object>} Détails du lettrage
   */
  getById: async (id, entityId = null) => {
    try {
      const params = entityId ? { company: entityId } : {};
      const response = await apiClient.get(`${API_PREFIX}reconciliations/${id}/`, { params });
      return response;
    } catch (error) {
      console.error(`Erreur chargement lettrage ${id}:`, error);
      throw error;
    }
  },

  /**
   * Mettre à jour un lettrage (commentaire, type, montant partiel)
   * @param {number} id - ID du lettrage
   * @param {Object} data - Données à mettre à jour
   * @param {number|null} entityId - ID de l'entité
   * @returns {Promise<Object>} Lettrage mis à jour
   */
  update: async (id, data, entityId = null) => {
    try {
      const payload = entityId ? { ...data, company: entityId } : data;
      const response = await apiClient.put(`${API_PREFIX}reconciliations/${id}/`, payload);
      return response;
    } catch (error) {
      console.error(`Erreur mise à jour lettrage ${id}:`, error);
      throw error;
    }
  },

  /**
   * Annuler/Supprimer un lettrage (pour débogage ou correction)
   * @param {number} id - ID du lettrage
   * @param {number|null} entityId - ID de l'entité
   * @returns {Promise<void>}
   */
  delete: async (id, entityId = null) => {
    try {
      const params = entityId ? { company: entityId } : {};
      await apiClient.delete(`${API_PREFIX}reconciliations/${id}/`, { params });
    } catch (error) {
      console.error(`Erreur suppression lettrage ${id}:`, error);
      throw error;
    }
  },

  // === HISTORIQUE & AUDIT ===
  
  /**
   * Récupérer l'historique des lettrages d'une ligne comptable
   * @param {number} lineId - ID de la ligne AccountMoveLine
   * @param {number|null} entityId - ID de l'entité
   * @returns {Promise<Array>} Liste des lettrages appliqués à cette ligne
   */
  getLineHistory: async (lineId, entityId = null) => {
    try {
      const params = entityId ? { company: entityId } : {};
      const response = await apiClient.get(`${API_PREFIX}move-lines/${lineId}/reconciliation-history/`, { params });
      
      let historyData = [];
      if (Array.isArray(response)) {
        historyData = response;
      } else if (response && typeof response === 'object') {
        if (response.results && Array.isArray(response.results)) {
          historyData = response.results;
        } else if (response.data && Array.isArray(response.data)) {
          historyData = response.data;
        }
      }
      return historyData;
    } catch (error) {
      console.error(`Erreur chargement historique ligne ${lineId}:`, error);
      return [];
    }
  },

  // === RÈGLES AUTOMATIQUES (Bonus V2) ===
  
  /**
   * Récupérer les modèles de lettrage automatique disponibles
   * @param {number|null} entityId - ID de l'entité
   * @returns {Promise<Array>} Liste des AccountReconcileModel
   */
  getReconcileModels: async (entityId = null) => {
    try {
      const params = entityId ? { company: entityId } : {};
      const response = await apiClient.get(`${API_PREFIX}reconcile-models/`, { params });
      
      let modelsData = [];
      if (Array.isArray(response)) {
        modelsData = response;
      } else if (response && typeof response === 'object') {
        if (response.results && Array.isArray(response.results)) {
          modelsData = response.results;
        } else if (response.data && Array.isArray(response.data)) {
          modelsData = response.data;
        }
      }
      return modelsData;
    } catch (error) {
      console.error('Erreur chargement modèles de lettrage:', error);
      return [];
    }
  },

  /**
   * Appliquer un modèle de lettrage automatique sur une ligne
   * @param {number} modelId - ID du modèle AccountReconcileModel
   * @param {number} lineId - ID de la ligne à traiter
   * @param {number|null} entityId - ID de l'entité
   * @returns {Promise<Object>} Résultat de l'application (propositions de lettrage)
   */
  applyModel: async (modelId, lineId, entityId = null) => {
    try {
      const params = entityId ? { company: entityId } : {};
      const response = await apiClient.post(
        `${API_PREFIX}reconcile-models/${modelId}/apply/`,
        { line_id: lineId },
        { params }
      );
      return response;
    } catch (error) {
      console.error(`Erreur application modèle ${modelId} sur ligne ${lineId}:`, error);
      throw error;
    }
  },

  // === UTILITAIRES ===
  
  /**
   * Formater le montant d'un lettrage pour l'affichage
   * @param {Object} reconciliation - Objet lettrage
   * @param {string} locale - Locale pour Intl.NumberFormat (défaut: 'fr-FR')
   * @returns {string} Montant formaté avec devise
   */
  formatAmount: (reconciliation, locale = 'fr-FR') => {
    if (!reconciliation) return '0,00';
    const amount = reconciliation.amount || reconciliation.debit || reconciliation.credit || 0;
    const currency = reconciliation.currency_code || 'XOF';
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 2
    }).format(Math.abs(amount));
  },

  /**
   * Déterminer le type de lettrage pour affichage (badge)
   * @param {Object} reconciliation - Objet lettrage
   * @returns {{ label: string, color: string }} Label et classe Tailwind pour le badge
   */
  getTypeBadge: (reconciliation) => {
    if (!reconciliation) return { label: 'Inconnu', color: 'bg-gray-100 text-gray-700' };
    
    if (reconciliation.reconcile_type === 'full') {
      return { label: 'Total', color: 'bg-green-100 text-green-700' };
    }
    if (reconciliation.reconcile_type === 'partial') {
      return { label: 'Partiel', color: 'bg-amber-100 text-amber-700' };
    }
    if (reconciliation.is_auto) {
      return { label: 'Auto', color: 'bg-blue-100 text-blue-700' };
    }
    return { label: 'Manuel', color: 'bg-purple-100 text-purple-700' };
  }
};

// ============= SERVICE PIÈCES =============
export const piecesService = {
  // === REQUÊTES API AVEC ENTITÉ ===
  getAll: (entityId = null, filters = {}) => {
    const params = entityId ? { ...filters, company: entityId } : filters;
    return apiClient.get(`${API_PREFIX}moves/`, { params });
  },
  
  getById: (id, entityId = null) => {
    const params = entityId ? { company: entityId } : {};
    return apiClient.get(`${API_PREFIX}moves/${id}/`, { params });
  },
  
  create: (data, entityId = null) => {
    const payload = entityId ? { ...data, company: entityId } : data;
    return apiClient.post(`${API_PREFIX}moves/`, payload);
  },
  
  update: (id, data, entityId = null) => {
    const payload = entityId ? { ...data, company: entityId } : data;
    return apiClient.put(`${API_PREFIX}moves/${id}/`, payload);
  },
  
  delete: (id, entityId = null) => {
    const params = entityId ? { company: entityId } : {};
    return apiClient.delete(`${API_PREFIX}moves/${id}/`, { params });
  },
  
  // === MÉTHODES DE CHANGEMENT D'ÉTAT ===
  
  /**
   * Valider une pièce (passer de brouillon à comptabilisé)
   */
  validate: (id, entityId = null) => {
    const params = entityId ? { company: entityId } : {};
    return apiClient.post(`${API_PREFIX}moves/${id}/post/`, {}, { params });
  },
  
  /**
   * Annuler une pièce comptabilisée
   */
  cancel: (id, entityId = null) => {
    const params = entityId ? { company: entityId } : {};
    return apiClient.post(`${API_PREFIX}moves/${id}/cancel/`, {}, { params });
  },
  
  /**
   * Remettre une pièce en brouillon
   */
  draft: (id, entityId = null) => {
    const params = entityId ? { company: entityId } : {};
    return apiClient.post(`${API_PREFIX}moves/${id}/draft/`, {}, { params });
  },
  
  /**
   * Dupliquer une pièce
   */
  duplicate: (id, entityId = null) => {
    const params = entityId ? { company: entityId } : {};
    return apiClient.post(`${API_PREFIX}moves/${id}/duplicate/`, {}, { params });
  },
  
  /**
   * Extourner une pièce (créer une pièce inverse)
   */
  reverse: (id, entityId = null) => {
    const params = entityId ? { company: entityId } : {};
    return apiClient.post(`${API_PREFIX}moves/${id}/reverse/`, {}, { params });
  },
  
  // === PIÈCES JOINTES ===
  
  /**
   * Récupérer toutes les pièces jointes d'une pièce comptable
   * @param {number} moveId - ID de la pièce comptable
   * @param {number|null} entityId - ID de l'entité (optionnel)
   * @returns {Promise<Array>} Liste des pièces jointes
   */
  getAttachments: async (moveId, entityId = null) => {
    try {
      const params = entityId ? { company: entityId } : {};
      const response = await apiClient.get(`${API_PREFIX}moves/${moveId}/attachments/`, { params });
      
      let attachmentsData = [];
      if (Array.isArray(response)) {
        attachmentsData = response;
      } else if (response && typeof response === 'object') {
        if (response.results && Array.isArray(response.results)) {
          attachmentsData = response.results;
        } else if (response.data && Array.isArray(response.data)) {
          attachmentsData = response.data;
        }
      }
      
      return attachmentsData;
    } catch (error) {
      console.error('Erreur récupération pièces jointes:', error);
      return [];
    }
  },
  
  /**
   * Upload de pièces jointes
   * ⚠️ IMPORTANT: Ne pas définir Content-Type manuellement avec FormData
   * Le navigateur doit générer automatiquement la boundary
   * @param {number} moveId - ID de la pièce comptable
   * @param {FormData} formData - FormData contenant les fichiers
   * @param {number|null} entityId - ID de l'entité (optionnel)
   * @returns {Promise<Object>} Résultat de l'upload
   */
  uploadAttachments: async (moveId, formData, entityId = null) => {
    try {
      const params = entityId ? { company: entityId } : {};
      // ⚠️ NE PAS ajouter d'en-tête Content-Type ici
      // Le navigateur le génère automatiquement avec la boundary correcte
      const response = await apiClient.post(
        `${API_PREFIX}moves/${moveId}/attachments/`,
        formData,
        { params }
        // PAS de headers['Content-Type'] = 'multipart/form-data'
      );
      return response;
    } catch (error) {
      console.error('Erreur upload pièces jointes:', error);
      throw error;
    }
  },
  
  /**
   * Télécharger une pièce jointe
   * ✅ CORRIGÉ : Utilisation de apiClient.download pour éviter les problèmes de Content-Type
   * @param {number} attachmentId - ID de la pièce jointe
   * @param {number|null} entityId - ID de l'entité (optionnel)
   * @returns {Promise<Blob>} Fichier sous forme de Blob
   */
  downloadAttachment: async (attachmentId, entityId = null) => {
    try {
      // Utiliser la méthode download qui ne force pas le Content-Type
      const response = await apiClient.download(`${API_PREFIX}attachments/${attachmentId}/download/`);
      
      if (!response.ok) {
        throw new Error(`Erreur HTTP: ${response.status}`);
      }
      
      return await response.blob();
    } catch (error) {
      console.error('Erreur téléchargement pièce jointe:', error);
      throw error;
    }
  },
  
  /**
   * Supprimer une pièce jointe
   * @param {number} moveId - ID de la pièce comptable
   * @param {number} attachmentId - ID de la pièce jointe
   * @param {number|null} entityId - ID de l'entité (optionnel)
   * @returns {Promise<void>}
   */
  deleteAttachment: async (moveId, attachmentId, entityId = null) => {
    try {
      const params = entityId ? { company: entityId } : {};
      await apiClient.delete(
        `${API_PREFIX}moves/${moveId}/attachments/${attachmentId}/`,
        { params }
      );
    } catch (error) {
      console.error('Erreur suppression pièce jointe:', error);
      throw error;
    }
  },
  
  /**
   * Créer une pièce avec des fichiers (upload simultané)
   * ⚠️ IMPORTANT: Ne pas définir Content-Type manuellement avec FormData
   * @param {FormData} formData - FormData contenant les données et les fichiers
   * @param {number|null} entityId - ID de l'entité (optionnel)
   * @returns {Promise<Object>} Pièce créée
   */
  createWithFiles: async (formData, entityId = null) => {
    try {
      const params = entityId ? { company: entityId } : {};
      // ⚠️ NE PAS ajouter d'en-tête Content-Type ici
      const response = await apiClient.post(
        `${API_PREFIX}moves/with-files/`,
        formData,
        { params }
      );
      return response;
    } catch (error) {
      console.error('Erreur création avec fichiers:', error);
      throw error;
    }
  },
  
  /**
   * Mettre à jour une pièce avec des fichiers (upload simultané)
   * ⚠️ IMPORTANT: Ne pas définir Content-Type manuellement avec FormData
   * @param {number} id - ID de la pièce
   * @param {FormData} formData - FormData contenant les données et les fichiers
   * @param {number|null} entityId - ID de l'entité (optionnel)
   * @returns {Promise<Object>} Pièce mise à jour
   */
  updateWithFiles: async (id, formData, entityId = null) => {
    try {
      const params = entityId ? { company: entityId } : {};
      // ⚠️ NE PAS ajouter d'en-tête Content-Type ici
      const response = await apiClient.put(
        `${API_PREFIX}moves/${id}/with-files/`,
        formData,
        { params }
      );
      return response;
    } catch (error) {
      console.error('Erreur mise à jour avec fichiers:', error);
      throw error;
    }
  },
  
  // === DONNÉES DE RÉFÉRENCE AVEC ENTITÉ ===
  getJournals: async (entityId = null) => {
    try {
      const params = entityId ? { company: entityId } : {};
      const response = await apiClient.get(`${API_PREFIX}journals/`, { params });
      
      let journalsData = [];
      if (Array.isArray(response)) {
        journalsData = response;
      } else if (response && typeof response === 'object') {
        if (response.results && Array.isArray(response.results)) {
          journalsData = response.results;
        } else if (response.data && Array.isArray(response.data)) {
          journalsData = response.data;
        }
      }
      
      return journalsData;
      
    } catch (error) {
      console.error('Erreur chargement journaux:', error);
      return [];
    }
  },
  
  /**
   * Récupérer TOUS les comptes (racines + opérationnels)
   * À utiliser pour la page liste des comptes
   */
  getAccounts: async (entityId = null) => {
    try {
      const params = {};
      const response = await apiClient.get(`${API_PREFIX}accounts/`, { params });
      
      let accountsData = [];
      if (Array.isArray(response)) {
        accountsData = response;
      } else if (response && typeof response === 'object') {
        if (response.results && Array.isArray(response.results)) {
          accountsData = response.results;
        } else if (response.data && Array.isArray(response.data)) {
          accountsData = response.data;
        }
      }
      
      console.log('📊 Comptes chargés (tous):', accountsData.length);
      
      return accountsData;
      
    } catch (error) {
      console.error('Erreur chargement comptes:', error);
      return [];
    }
  },
  
  /**
   * ✅ NOUVEAU : Récupérer uniquement les comptes opérationnels (sans les racines)
   * À utiliser pour les autocomplete (création pièce, journaux, etc.)
   */
  getOperationalAccounts: async (entityId = null) => {
    try {
      const params = { exclude_roots: true };
      const response = await apiClient.get(`${API_PREFIX}accounts/`, { params });
      
      let accountsData = [];
      if (Array.isArray(response)) {
        accountsData = response;
      } else if (response && typeof response === 'object') {
        if (response.results && Array.isArray(response.results)) {
          accountsData = response.results;
        } else if (response.data && Array.isArray(response.data)) {
          accountsData = response.data;
        }
      }
      
      console.log('📊 Comptes opérationnels chargés (sans racines):', accountsData.length);
      
      return accountsData;
      
    } catch (error) {
      console.error('Erreur chargement comptes opérationnels:', error);
      return [];
    }
  },
  
  // === PARTENAIRES AVEC ENTITÉ ===
  getPartners: async (entityId = null) => {
    try {
      const params = entityId ? { company: entityId } : {};
      const response = await apiClient.get('partenaires/', { params });
      
      let partnersData = [];
      if (Array.isArray(response)) {
        partnersData = response;
      } else if (response && typeof response === 'object') {
        if (response.results && Array.isArray(response.results)) {
          partnersData = response.results;
        } else if (response.data && Array.isArray(response.data)) {
          partnersData = response.data;
        }
      }
      
      return partnersData;
      
    } catch (error) {
      console.error('Erreur chargement partenaires:', error);
      return [];
    }
  },
  
  // === DEVISES AVEC ENTITÉ ===
  getDevises: async (entityId = null) => {
    try {
      const params = entityId ? { company: entityId } : {};
      const response = await apiClient.get('devises/', { params });
      
      let devisesData = [];
      if (Array.isArray(response)) {
        devisesData = response;
      } else if (response && typeof response === 'object') {
        if (response.results && Array.isArray(response.results)) {
          devisesData = response.results;
        } else if (response.data && Array.isArray(response.data)) {
          devisesData = response.data;
        }
      }
      
      return devisesData;
      
    } catch (error) {
      console.error('Erreur chargement devises:', error);
      return [];
    }
  },
  
  // === TAXES ===
  getTaxes: async (entityId = null) => {
    try {
      const params = entityId ? { company: entityId } : {};
      const response = await apiClient.get(`${API_PREFIX}taxes/`, { params });
      
      let taxesData = [];
      if (Array.isArray(response)) {
        taxesData = response;
      } else if (response && typeof response === 'object') {
        if (response.results && Array.isArray(response.results)) {
          taxesData = response.results;
        } else if (response.data && Array.isArray(response.data)) {
          taxesData = response.data;
        }
      }
      
      return taxesData;
      
    } catch (error) {
      console.error('Erreur chargement taxes:', error);
      return [];
    }
  },
  
  // === UTILISATEURS ===
  getUsers: async (entityId = null) => {
    try {
      const params = entityId ? { company: entityId } : {};
      const response = await apiClient.get('core/users/', { params });
      
      let usersData = [];
      if (Array.isArray(response)) {
        usersData = response;
      } else if (response && typeof response === 'object') {
        if (response.results && Array.isArray(response.results)) {
          usersData = response.results;
        } else if (response.data && Array.isArray(response.data)) {
          usersData = response.data;
        }
      }
      
      return usersData;
      
    } catch (error) {
      console.error('Erreur chargement utilisateurs:', error);
      return [];
    }
  },
  
  // === POSITIONS FISCALES ===
  getFiscalPositions: async (entityId = null) => {
    try {
      const params = entityId ? { company: entityId } : {};
      const response = await apiClient.get(`${API_PREFIX}fiscal-positions/`, { params });
      
      let positionsData = [];
      if (Array.isArray(response)) {
        positionsData = response;
      } else if (response && typeof response === 'object') {
        if (response.results && Array.isArray(response.results)) {
          positionsData = response.results;
        } else if (response.data && Array.isArray(response.data)) {
          positionsData = response.data;
        }
      }
      
      return positionsData;
      
    } catch (error) {
      console.error('Erreur chargement positions fiscales:', error);
      return [];
    }
  },

  // ✅ NOUVEAU : RETENUES À LA SOURCE
  getWithholdingTaxes: async (entityId = null) => {
    try {
      const params = entityId ? { company_id: entityId } : {};
      const response = await apiClient.get(`${API_PREFIX}withholding-taxes/`, { params });
      
      let taxesData = [];
      if (Array.isArray(response)) {
        taxesData = response;
      } else if (response && typeof response === 'object') {
        if (response.results && Array.isArray(response.results)) {
          taxesData = response.results;
        } else if (response.data && Array.isArray(response.data)) {
          taxesData = response.data;
        }
      }
      
      return taxesData;
    } catch (error) {
      console.error('Erreur chargement retenues à la source:', error);
      return [];
    }
  },
    
  // === ENTREPRISES/ENTITES ===
  getCompanies: async () => {
    try {
      const endpoints = [
        'entites/',      
        'companies/',    
        'entreprises/',  
        'societes/'      
      ];
      
      let companiesData = [];
      
      for (const endpoint of endpoints) {
        try {
          const response = await apiClient.get(endpoint);
          
          if (Array.isArray(response)) {
            companiesData = response;
          } else if (response && typeof response === 'object') {
            if (response.results && Array.isArray(response.results)) {
              companiesData = response.results;
            } else if (response.data && Array.isArray(response.data)) {
              companiesData = response.data;
            }
          }
          
          if (companiesData.length > 0) {
            console.log(`✅ Entreprises chargées depuis: ${endpoint} (${companiesData.length})`);
            break;
          }
        } catch (err) {
          continue;
        }
      }
      
      return companiesData;
      
    } catch (error) {
      console.error('Erreur chargement entreprises:', error);
      return [];
    }
  },
  
  getCurrentUser: async () => {
    try {
      const user = authService.getCurrentUser();
      
      if (!user) {
        try {
          const refreshed = await authService.refreshUser();
          return refreshed || null;
        } catch (refreshError) {
          console.warn('Impossible de rafraîchir l\'utilisateur:', refreshError);
          return null;
        }
      }
      
      return user;
    } catch (error) {
      console.error('Erreur récupération utilisateur:', error);
      return null;
    }
  },
  
  formatPieceForApi: (formData, companyId = 1, currencyId = 1) => {
    return {
      name: formData.reference || `ECR-${Date.now()}`,
      move_type: 'entry',
      state: 'draft',
      journal: formData.journal_id,
      date: formData.date,
      ref: formData.reference || '',
      partner: formData.partner_id || null,
      company: companyId,
      currency: currencyId,
      lines: formData.lines.map((line, index) => ({
        name: line.label || `Ligne ${index + 1}`,
        date: formData.date,
        account: line.account_id,
        debit: line.debit ? parseFloat(line.debit) : 0,
        credit: line.credit ? parseFloat(line.credit) : 0,
        partner: line.partner_id || null,
        journal: formData.journal_id,
        company: companyId,
        currency: currencyId,
        balance: (line.debit ? parseFloat(line.debit) : 0) - (line.credit ? parseFloat(line.credit) : 0)
      }))
    };
  },
  
  testEndpoints: async (entityId = null) => {
    const endpoints = [
      { name: 'Journaux', url: `${API_PREFIX}journals/` },
      { name: 'Comptes', url: `${API_PREFIX}accounts/` },
      { name: 'Partenaires', url: 'partenaires/' },
      { name: 'Devises', url: 'devises/' },
      { name: 'Taxes', url: `${API_PREFIX}taxes/` },
      { name: 'Positions fiscales', url: `${API_PREFIX}fiscal-positions/` },
      { name: 'Séquences', url: '/sequences/' },
    ];
    
    const results = [];
    
    for (const endpoint of endpoints) {
      try {
        const params = entityId ? { company: entityId } : {};
        const response = await apiClient.get(endpoint.url, { params });
        let count = 0;
        
        if (Array.isArray(response)) {
          count = response.length;
        } else if (response && typeof response === 'object') {
          if (Array.isArray(response.results)) {
            count = response.results.length;
          } else if (Array.isArray(response.data)) {
            count = response.data.length;
          }
        }
        
        results.push({
          name: endpoint.name,
          status: '✅',
          count: count,
          url: endpoint.url
        });
        
        console.log(`${endpoint.name}: ✅ ${count} éléments`);
      } catch (error) {
        results.push({
          name: endpoint.name,
          status: '❌',
          error: error.message,
          url: endpoint.url
        });
        console.log(`${endpoint.name}: ❌ ${error.message}`);
      }
    }
    
    return results;
  },
  
  checkEnvironment: async () => {
    console.group('🔍 Diagnostic environnement comptabilité');
    
    const user = authService.getCurrentUser();
    console.log('👤 Utilisateur connecté:', user ? 'Oui' : 'Non');
    if (user) {
      console.log('   ID:', user.id);
      console.log('   Company ID:', user.company_id);
      console.log('   Entité:', user.entite);
    }
    
    const testResults = await piecesService.testEndpoints(user?.company_id);
    
    console.groupEnd();
    
    return {
      user: user,
      endpoints: testResults,
      timestamp: new Date().toISOString()
    };
  }
};

// ============= SERVICE JOURNAUX =============
export const journauxService = {
  getAll: (entityId = null, filters = {}) => {
    const params = entityId ? { ...filters, company: entityId } : filters;
    return apiClient.get(`${API_PREFIX}journals/`, { params });
  },
  
  getById: (id, entityId = null) => {
    const params = entityId ? { company: entityId } : {};
    return apiClient.get(`${API_PREFIX}journals/${id}/`, { params });
  },
  
  create: (data, entityId = null) => {
    const payload = entityId ? { ...data, company: entityId } : data;
    return apiClient.post(`${API_PREFIX}journals/`, payload);
  },
  
  update: (id, data, entityId = null) => {
    const payload = entityId ? { ...data, company: entityId } : data;
    return apiClient.put(`${API_PREFIX}journals/${id}/`, payload);
  },
  
  delete: (id, entityId = null) => {
    const params = entityId ? { company: entityId } : {};
    return apiClient.delete(`${API_PREFIX}journals/${id}/`, { params });
  },
  
  getTypes: (entityId = null) => {
    const params = entityId ? { company: entityId } : {};
    return apiClient.get(`${API_PREFIX}journal-types/`, { params });
  }
};

// ============= SERVICE COMPTES =============
export const comptesService = {
  /**
   * Récupérer TOUS les comptes (racines + opérationnels)
   */
  getAll: (entityId = null, filters = {}) => {
    const params = { ...filters };
    return apiClient.get(`${API_PREFIX}accounts/`, { params });
  },
  
  /**
   * ✅ NOUVEAU : Récupérer uniquement les comptes opérationnels
   */
  getOperationalAccounts: (entityId = null, filters = {}) => {
    const params = { ...filters, exclude_roots: true };
    return apiClient.get(`${API_PREFIX}accounts/`, { params });
  },
  
  getById: (id, entityId = null) => {
    const params = entityId ? { company: entityId } : {};
    return apiClient.get(`${API_PREFIX}accounts/${id}/`, { params });
  },
  
  create: (data, entityId = null) => {
    const payload = entityId ? { ...data, company: entityId } : data;
    return apiClient.post(`${API_PREFIX}accounts/`, payload);
  },
  
  update: (id, data, entityId = null) => {
    const payload = entityId ? { ...data, company: entityId } : data;
    return apiClient.put(`${API_PREFIX}accounts/${id}/`, payload);
  },
  
  delete: (id, entityId = null) => {
    const params = entityId ? { company: entityId } : {};
    return apiClient.delete(`${API_PREFIX}accounts/${id}/`, { params });
  }
};

// ============= SERVICE PARTENAIRES =============
export const partenairesService = {
  getAll: (entityId = null, filters = {}) => {
    const params = entityId ? { ...filters, company: entityId } : filters;
    return apiClient.get('partenaires/', { params });
  },
  
  getById: (id, entityId = null) => {
    const params = entityId ? { company: entityId } : {};
    return apiClient.get(`partenaires/${id}/`, { params });
  },
  
  create: (data, entityId = null) => {
    const payload = entityId ? { ...data, company: entityId } : data;
    return apiClient.post('partenaires/', payload);
  },
  
  update: (id, data, entityId = null) => {
    const payload = entityId ? { ...data, company: entityId } : data;
    return apiClient.put(`partenaires/${id}/`, payload);
  },
  
  delete: (id, entityId = null) => {
    const params = entityId ? { company: entityId } : {};
    return apiClient.delete(`partenaires/${id}/`, { params });
  }
};

// ============= SERVICE DEVISES =============
export const devisesService = {
  getAll: (entityId = null, filters = {}) => {
    const params = entityId ? { ...filters, company: entityId } : filters;
    return apiClient.get('devises/', { params });
  },
  
  getById: (id, entityId = null) => {
    const params = entityId ? { company: entityId } : {};
    return apiClient.get(`devises/${id}/`, { params });
  },
  
  create: (data, entityId = null) => {
    const payload = entityId ? { ...data, company: entityId } : data;
    return apiClient.post('devises/', payload);
  },
  
  update: (id, data, entityId = null) => {
    const payload = entityId ? { ...data, company: entityId } : data;
    return apiClient.put(`devises/${id}/`, payload);
  },
  
  delete: (id, entityId = null) => {
    const params = entityId ? { company: entityId } : {};
    return apiClient.delete(`devises/${id}/`, { params });
  }
};

// ============= SERVICE ENTREPRISES =============
export const entreprisesService = {
  getAll: (filters = {}) => apiClient.get('entites/', { params: filters }),
  getById: (id) => apiClient.get(`entites/${id}/`),
  create: (data) => apiClient.post('entites/', data),
  update: (id, data) => apiClient.put(`entites/${id}/`, data),
  delete: (id) => apiClient.delete(`entites/${id}/`)
};

// ============= EXPORTS =============
// Note: apiClient, authService sont déjà exportés en tant que named exports depuis leurs fichiers respectifs
// On les ré-exporte ici pour faciliter l'import
export { 
  apiClient,
  authService
};

// Export par défaut pour la rétrocompatibilité
export default piecesService;
