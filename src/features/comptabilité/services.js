// src/features/comptabilité/services.js
import { apiClient } from '../../services/apiClient';
import { authService } from '../../services/authService'; 

// CORRECT : Pas de slash au début car BASE_URL se termine par /api
const API_PREFIX = 'compta/';

// ============= SERVICE JOURNAUX =============
const journauxService = {
  getAll: (filters = {}) => apiClient.get(`${API_PREFIX}journals/`, { params: filters }),
  getById: (id) => apiClient.get(`${API_PREFIX}journals/${id}/`),
  create: (data) => apiClient.post(`${API_PREFIX}journals/`, data),
  update: (id, data) => apiClient.put(`${API_PREFIX}journals/${id}/`, data),
  delete: (id) => apiClient.delete(`${API_PREFIX}journals/${id}/`),
  
  getTypes: () => apiClient.get(`${API_PREFIX}journal-types/`),
  activate: (id) => apiClient.patch(`${API_PREFIX}journals/${id}/`, { active: true }),
  deactivate: (id) => apiClient.patch(`${API_PREFIX}journals/${id}/`, { active: false })
};

// ============= SERVICE PIÈCES =============
const piecesService = {
  // Note : "moves" correspond probablement à "pièces comptables"
  getAll: (filters = {}) => apiClient.get(`${API_PREFIX}moves/`, { params: filters }),
  getById: (id) => apiClient.get(`${API_PREFIX}moves/${id}/`),
  create: (data) => apiClient.post(`${API_PREFIX}moves/`, data),
  update: (id, data) => apiClient.put(`${API_PREFIX}moves/${id}/`, data),
  delete: (id) => apiClient.delete(`${API_PREFIX}moves/${id}/`),
  
  // Si ces endpoints n'existent pas, vous devrez les créer dans Django
  validate: (id) => apiClient.post(`${API_PREFIX}moves/${id}/validate/`),
  cancel: (id) => apiClient.post(`${API_PREFIX}moves/${id}/cancel/`),
  
  getJournals: () => apiClient.get(`${API_PREFIX}journals/`),
  getAccounts: () => apiClient.get(`${API_PREFIX}accounts/`),
  
  // Méthodes pour les partenaires (supposant que vous avez un endpoint partners/)
  getPartners: () => apiClient.get(`partners/`),
  
  // Méthode pour formater les données d'une pièce pour l'API
  formatPieceForApi: (formData) => {
    return {
      journal_id: formData.journal_id,
      date: formData.date,
      label: formData.label,
      reference: formData.reference || '',
      partner_id: formData.partner_id || null,
      move_lines: formData.lines.map(line => ({
        account_id: line.account_id,
        debit: line.debit ? parseFloat(line.debit) : 0,
        credit: line.credit ? parseFloat(line.credit) : 0,
        label: line.label || '',
        partner_id: line.partner_id || null
      }))
    };
  }
};

// ============= SERVICE COMPTES =============
const comptesService = {
  getAll: () => apiClient.get(`${API_PREFIX}accounts/`),
  getById: (id) => apiClient.get(`${API_PREFIX}accounts/${id}/`),
  create: (data) => apiClient.post(`${API_PREFIX}accounts/`, data),
  update: (id, data) => apiClient.put(`${API_PREFIX}accounts/${id}/`, data)
};

// ============= SERVICE DIVERS =============
const autresServices = {
  getTaxes: () => apiClient.get(`${API_PREFIX}taxes/`),
  getFiscalPositions: () => apiClient.get(`${API_PREFIX}fiscal-positions/`),
  getAccountGroups: () => apiClient.get(`${API_PREFIX}groups/`),
  getAccountTypes: () => apiClient.get(`${API_PREFIX}types/`),
  getFrameworks: () => apiClient.get(`${API_PREFIX}frameworks/`)
};

// ============= SERVICE PARTENAIRES (si séparé) =============
const partenairesService = {
  getAll: () => apiClient.get(`partners/`),
  getById: (id) => apiClient.get(`partners/${id}/`),
  create: (data) => apiClient.post(`partners/`, data),
  update: (id, data) => apiClient.put(`partners/${id}/`, data),
  delete: (id) => apiClient.delete(`partners/${id}/`)
};

// ============= EXPORTS =============
export { 
  apiClient,
  authService, 
  journauxService,
  piecesService,
  comptesService,
  partenairesService,
  autresServices
};