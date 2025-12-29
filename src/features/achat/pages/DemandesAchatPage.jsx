// features/achats/pages/DemandesAchatPage.jsx
import React, { useState, useEffect } from 'react';
import { apiClient } from '../../../services/apiClient';
import {
  FiPlus,
  FiEdit2,
  FiTrash2,
  FiSearch,
  FiEye,
  FiChevronLeft,
  FiChevronRight,
  FiRefreshCw,
  FiFilter,
  FiUser,
  FiBriefcase,
  FiCalendar,
  FiCheckCircle,
  FiXCircle
} from "react-icons/fi";

export default function DemandesAchatPage() {
  const [demandes, setDemandes] = useState([]);
  const [utilisateurs, setUtilisateurs] = useState([]);
  const [departements, setDepartements] = useState([]);
  const [societes, setSocietes] = useState([]);
  
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  
  // États pour formulaire/modal
  const [showForm, setShowForm] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      const [demandesResponse, utilisateursResponse, departementsResponse, societesResponse] = await Promise.all([
        apiClient.get('/achats/demandes-achat/').catch(() => ({ data: [] })),
        apiClient.get('/utilisateurs/').catch(() => ({ data: [] })),
        apiClient.get('/departements/').catch(() => ({ data: [] })),
        apiClient.get('/societes/').catch(() => ({ data: [] }))
      ]);

      setDemandes(demandesResponse.data || []);
      setUtilisateurs(utilisateursResponse.data || []);
      setDepartements(departementsResponse.data || []);
      setSocietes(societesResponse.data || []);

    } catch (error) {
      console.error('Erreur lors du chargement:', error);
    } finally {
      setLoading(false);
    }
  };

  // Fonctions utilitaires
  const getReferenceName = (list, id) => {
    const item = list.find(item => item.id === id);
    return item ? item.name : 'N/A';
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('fr-FR');
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      'brouillon': { label: 'Brouillon', color: 'bg-gray-100 text-gray-800' },
      'en_cours': { label: 'En cours', color: 'bg-blue-100 text-blue-800' },
      'valide': { label: 'Validé', color: 'bg-green-100 text-green-800' },
      'annule': { label: 'Annulé', color: 'bg-red-100 text-red-800' }
    };
    const config = statusConfig[status] || { label: status, color: 'bg-gray-100 text-gray-800' };
    return (
      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${config.color}`}>
        {config.label}
      </span>
    );
  };

  // Filtrage et pagination
  const filteredData = demandes.filter(demande => {
    const searchString = searchTerm.toLowerCase();
    return (
      (demande.name && demande.name.toLowerCase().includes(searchString)) ||
      (getReferenceName(utilisateurs, demande.user_id)?.toLowerCase().includes(searchString)) ||
      (demande.state && demande.state.toLowerCase().includes(searchString))
    );
  });

  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredData.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredData.length / itemsPerPage);

  // Gestion des formulaires
  const handleSubmit = async (formData) => {
    try {
      const endpoint = '/achats/demandes-achat/';
      if (editingItem) {
        await apiClient.put(`${endpoint}${editingItem.id}/`, formData);
      } else {
        await apiClient.post(endpoint, formData);
      }
      fetchData();
      setShowForm(false);
      setEditingItem(null);
    } catch (error) {
      console.error('Erreur lors de la sauvegarde:', error);
      alert('Erreur lors de la sauvegarde');
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Êtes-vous sûr de vouloir supprimer cette demande d\'achat ?')) {
      try {
        await apiClient.delete(`/achats/demandes-achat/${id}/`);
        fetchData();
      } catch (error) {
        console.error('Erreur lors de la suppression:', error);
        alert('Erreur lors de la suppression');
      }
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-violet-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* En-tête de la page */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Demandes d'Achat</h1>
          <p className="text-gray-600 mt-1">Gestion des demandes d'achat internes</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={fetchData}
            className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 flex items-center"
          >
            <FiRefreshCw className="mr-2" />
            Actualiser
          </button>
          <button
            onClick={() => setShowForm(true)}
            className="bg-violet-600 text-white px-4 py-2 rounded-lg hover:bg-violet-700 flex items-center"
          >
            <FiPlus className="mr-2" />
            Nouvelle Demande
          </button>
        </div>
      </div>

      {/* Barre de recherche et filtres */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="relative flex-1">
            <FiSearch className="absolute left-3 top-3 text-gray-400" />
            <input
              type="text"
              placeholder="Rechercher par numéro, demandeur, statut..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent"
            />
          </div>
          <div className="flex items-center gap-4">
            <select
              value={itemsPerPage}
              onChange={(e) => setItemsPerPage(Number(e.target.value))}
              className="border border-gray-300 rounded-lg px-3 py-2"
            >
              <option value={5}>5 par page</option>
              <option value={10}>10 par page</option>
              <option value={25}>25 par page</option>
              <option value={50}>50 par page</option>
            </select>
            <button className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 flex items-center">
              <FiFilter className="mr-2" />
              Filtres
            </button>
          </div>
        </div>
      </div>

      {/* Table principale */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  N° Demande
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Demandeur
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Département
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Société
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date Début
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Statut
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {currentItems.map((demande) => (
                <tr key={demande.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="font-medium text-gray-900">{demande.name || 'N/A'}</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <FiUser className="text-gray-400 mr-2" size={16} />
                      <span>{getReferenceName(utilisateurs, demande.user_id)}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <FiBriefcase className="text-gray-400 mr-2" size={16} />
                      <span>{getReferenceName(departements, demande.department_id)}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {getReferenceName(societes, demande.company_id)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <FiCalendar className="text-gray-400 mr-2" size={16} />
                      <span>{formatDate(demande.date_start)}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {getStatusBadge(demande.state)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          setSelectedItem(demande);
                          setShowDetailModal(true);
                        }}
                        className="text-blue-600 hover:text-blue-800 p-1 rounded hover:bg-blue-50"
                        title="Voir détails"
                      >
                        <FiEye size={18} />
                      </button>
                      <button
                        onClick={() => {
                          setEditingItem(demande);
                          setShowForm(true);
                        }}
                        className="text-violet-600 hover:text-violet-800 p-1 rounded hover:bg-violet-50"
                        title="Modifier"
                      >
                        <FiEdit2 size={18} />
                      </button>
                      <button
                        onClick={() => handleDelete(demande.id)}
                        className="text-red-600 hover:text-red-800 p-1 rounded hover:bg-red-50"
                        title="Supprimer"
                      >
                        <FiTrash2 size={18} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
            <div className="text-sm text-gray-700">
              Affichage de {indexOfFirstItem + 1} à {Math.min(indexOfLastItem, filteredData.length)} sur {filteredData.length} résultats
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className="p-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
              >
                <FiChevronLeft />
              </button>
              <span className="px-3 py-2 text-sm">
                Page {currentPage} sur {totalPages}
              </span>
              <button
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
                className="p-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
              >
                <FiChevronRight />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modal de formulaire */}
      {showForm && (
        <DemandeAchatFormModal
          item={editingItem}
          utilisateurs={utilisateurs}
          departements={departements}
          societes={societes}
          onSubmit={handleSubmit}
          onClose={() => {
            setShowForm(false);
            setEditingItem(null);
          }}
        />
      )}

      {/* Modal de détails */}
      {showDetailModal && selectedItem && (
        <DemandeAchatDetailModal
          item={selectedItem}
          utilisateurs={utilisateurs}
          departements={departements}
          societes={societes}
          onClose={() => setShowDetailModal(false)}
        />
      )}
    </div>
  );
}

// Modal de formulaire pour Demande d'Achat
function DemandeAchatFormModal({ item, utilisateurs, departements, societes, onSubmit, onClose }) {
  const [formData, setFormData] = useState(() => ({
    name: item?.name || '',
    user_id: item?.user_id || '',
    department_id: item?.department_id || '',
    company_id: item?.company_id || '',
    date_start: item?.date_start || new Date().toISOString().split('T')[0],
    state: item?.state || 'brouillon'
  }));

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center bg-violet-600 text-white p-4 rounded-t-lg">
          <h3 className="text-lg font-semibold">
            {item ? 'Modifier' : 'Nouvelle'} Demande d'Achat
          </h3>
          <button onClick={onClose} className="text-white hover:text-gray-200">
            <FiXCircle size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Numéro demande *
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Demandeur *
              </label>
              <select
                value={formData.user_id}
                onChange={(e) => setFormData({ ...formData, user_id: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500"
                required
              >
                <option value="">Sélectionner un demandeur</option>
                {utilisateurs.map(u => (
                  <option key={u.id} value={u.id}>{u.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Département *
              </label>
              <select
                value={formData.department_id}
                onChange={(e) => setFormData({ ...formData, department_id: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500"
                required
              >
                <option value="">Sélectionner un département</option>
                {departements.map(d => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Société *
              </label>
              <select
                value={formData.company_id}
                onChange={(e) => setFormData({ ...formData, company_id: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500"
                required
              >
                <option value="">Sélectionner une société</option>
                {societes.map(s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Date début *
              </label>
              <input
                type="date"
                value={formData.date_start}
                onChange={(e) => setFormData({ ...formData, date_start: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Statut *
            </label>
            <select
              value={formData.state}
              onChange={(e) => setFormData({ ...formData, state: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500"
              required
            >
              <option value="brouillon">Brouillon</option>
              <option value="en_cours">En cours</option>
              <option value="valide">Validé</option>
              <option value="annule">Annulé</option>
            </select>
          </div>

          <div className="flex justify-end space-x-3 pt-6">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
            >
              Annuler
            </button>
            <button
              type="submit"
              className="bg-violet-600 text-white px-4 py-2 rounded-lg hover:bg-violet-700"
            >
              {item ? 'Modifier' : 'Créer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Modal de détails pour Demande d'Achat
function DemandeAchatDetailModal({ item, utilisateurs, departements, societes, onClose }) {
  const getReferenceName = (list, id) => {
    const found = list.find(i => i.id === id);
    return found ? found.name : 'N/A';
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('fr-FR');
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold flex items-center">
            <FiEye className="mr-2 text-violet-600" />
            Détails de la Demande d'Achat
          </h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <FiXCircle size={24} />
          </button>
        </div>

        <div className="grid grid-cols-2 gap-6">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Numéro demande</label>
              <p className="text-lg font-semibold">{item.name || 'N/A'}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Demandeur</label>
              <div className="flex items-center">
                <FiUser className="text-gray-400 mr-2" size={16} />
                <p>{getReferenceName(utilisateurs, item.user_id)}</p>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Département</label>
              <div className="flex items-center">
                <FiBriefcase className="text-gray-400 mr-2" size={16} />
                <p>{getReferenceName(departements, item.department_id)}</p>
              </div>
            </div>
          </div>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Société</label>
              <p>{getReferenceName(societes, item.company_id)}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Date début</label>
              <div className="flex items-center">
                <FiCalendar className="text-gray-400 mr-2" size={16} />
                <p>{formatDate(item.date_start)}</p>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Statut</label>
              <p className="inline-flex px-2 py-1 text-sm font-semibold rounded-full bg-blue-100 text-blue-800">
                {item.state || 'N/A'}
              </p>
            </div>
          </div>
        </div>

        <div className="mt-8 flex justify-end space-x-3">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
}