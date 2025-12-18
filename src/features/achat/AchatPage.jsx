import React, { useState, useEffect, useMemo, useRef } from 'react';
import { apiClient } from '../../services/apiClient';
import {
  FiRefreshCw,
  FiPlus,
  FiEdit2,
  FiTrash2,
  FiSearch,
  FiFilter,
  FiX,
  FiCheck,
  FiChevronLeft,
  FiChevronRight,
  FiChevronDown,
  FiDownload,
  FiUpload,
  FiEye,
  FiCheckCircle,
  FiXCircle,
  FiShoppingCart,
  FiUser,
  FiCalendar,
  FiDollarSign,
  FiInfo
} from "react-icons/fi";

export default function AchatPage() {
  const [achats, setAchats] = useState([]);
  const [fournisseurs, setFournisseurs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editingAchat, setEditingAchat] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedAchat, setSelectedAchat] = useState(null);

  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterFournisseur, setFilterFournisseur] = useState('');
  const [selectedRows, setSelectedRows] = useState([]);

  // Chargement initial
  useEffect(() => {
    fetchAllData();
  }, []);

  const fetchAllData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [achatsRes, fournisseursRes] = await Promise.all([
        apiClient.get('/achats/'),
        apiClient.get('/partenaires/?type_partenaire=fournisseur')
      ]);

      const extractData = (response) => {
        if (Array.isArray(response)) return response;
        if (response && Array.isArray(response.results)) return response.results;
        if (response && Array.isArray(response.data)) return response.data;
        return [];
      };

      setAchats(extractData(achatsRes));
      setFournisseurs(extractData(fournisseursRes));

    } catch (err) {
      console.error('Erreur lors du chargement des données:', err);
      setError('Erreur lors du chargement des données');
      setAchats([]);
      setFournisseurs([]);
    } finally {
      setLoading(false);
    }
  };

  // Filtrage et recherche
  const filteredAchats = useMemo(() => {
    return achats.filter(achat => {
      const matchesSearch =
        (achat.numero_commande || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (achat.fournisseur?.nom || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (achat.description || '').toLowerCase().includes(searchTerm.toLowerCase());

      const matchesFournisseur = !filterFournisseur ||
        (achat.fournisseur && achat.fournisseur.id && achat.fournisseur.id.toString() === filterFournisseur);

      return matchesSearch && matchesFournisseur;
    });
  }, [achats, searchTerm, filterFournisseur]);

  // Calculs pour la pagination
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentAchats = Array.isArray(filteredAchats) ? filteredAchats.slice(indexOfFirstItem, indexOfLastItem) : [];
  const totalPages = Math.ceil((Array.isArray(filteredAchats) ? filteredAchats.length : 0) / itemsPerPage);

  // Gestion des formulaires
  const handleSubmit = async (formData) => {
    try {
      if (editingAchat) {
        await apiClient.put(`/achats/${editingAchat.id}/`, formData);
      } else {
        await apiClient.post('/achats/', formData);
      }
      fetchAllData();
      setShowForm(false);
      setEditingAchat(null);
    } catch (err) {
      console.error('Erreur lors de la sauvegarde:', err);
      setError('Erreur lors de la sauvegarde');
    }
  };

  const handleDelete = async (achat) => {
    if (window.confirm('Êtes-vous sûr de vouloir supprimer cette commande d\'achat ?')) {
      try {
        await apiClient.delete(`/achats/${achat.id}/`);
        fetchAllData();
      } catch (err) {
        console.error('Erreur lors de la suppression:', err);
        setError('Erreur lors de la suppression');
      }
    }
  };

  const handleEdit = (achat) => {
    setEditingAchat(achat);
    setShowForm(true);
  };

  const handleViewDetails = (achat) => {
    setSelectedAchat(achat);
    setShowDetailModal(true);
  };

  // Gestion de la sélection
  const handleSelectRow = (id) => {
    setSelectedRows(prev =>
      prev.includes(id)
        ? prev.filter(rowId => rowId !== id)
        : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    if (selectedRows.length === currentAchats.length) {
      setSelectedRows([]);
    } else {
      setSelectedRows(currentAchats.map(achat => achat.id));
    }
  };

  // Export
  const handleExport = () => {
    // Logique d'export
    console.log('Export des achats sélectionnés');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center">
              <FiShoppingCart className="mr-3 text-blue-600" />
              Commandes d'Achat
            </h1>
            <p className="text-gray-600 mt-1">Gestion des commandes d'achat et fournisseurs</p>
          </div>
          <div className="flex space-x-3">
            <button
              onClick={fetchAllData}
              className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors flex items-center"
            >
              <FiRefreshCw className="mr-2" />
              Actualiser
            </button>
            <button
              onClick={() => setShowForm(true)}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center"
            >
              <FiPlus className="mr-2" />
              Nouvelle Commande
            </button>
          </div>
        </div>

        {/* Filtres et recherche */}
        <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="relative">
              <FiSearch className="absolute left-3 top-3 text-gray-400" />
              <input
                type="text"
                placeholder="Rechercher..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div className="relative">
              <FiFilter className="absolute left-3 top-3 text-gray-400" />
              <select
                value={filterFournisseur}
                onChange={(e) => setFilterFournisseur(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Tous les fournisseurs</option>
                {fournisseurs.map(fournisseur => (
                  <option key={fournisseur.id} value={fournisseur.id}>
                    {fournisseur.nom}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-center space-x-2">
              <label className="text-sm text-gray-600">Éléments par page:</label>
              <select
                value={itemsPerPage}
                onChange={(e) => setItemsPerPage(Number(e.target.value))}
                className="border border-gray-300 rounded px-2 py-1"
              >
                <option value={5}>5</option>
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
              </select>
            </div>
          </div>
        </div>

        {/* Actions groupées */}
        {selectedRows.length > 0 && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4 flex items-center justify-between">
            <span className="text-blue-800">
              {selectedRows.length} commande(s) sélectionnée(s)
            </span>
            <div className="flex space-x-2">
              <button
                onClick={handleExport}
                className="bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700"
              >
                <FiDownload className="inline mr-1" />
                Exporter
              </button>
            </div>
          </div>
        )}

        {/* Table */}
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    <input
                      type="checkbox"
                      checked={selectedRows.length === currentAchats.length && currentAchats.length > 0}
                      onChange={handleSelectAll}
                      className="rounded border-gray-300"
                    />
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    N° Commande
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Fournisseur
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Montant
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
                {currentAchats.map((achat) => (
                  <tr key={achat.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <input
                        type="checkbox"
                        checked={selectedRows.includes(achat.id)}
                        onChange={() => handleSelectRow(achat.id)}
                        className="rounded border-gray-300"
                      />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {achat.numero_commande}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {achat.fournisseur?.nom || 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(achat.date_commande).toLocaleDateString('fr-FR')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {achat.montant_total?.toLocaleString('fr-FR', { style: 'currency', currency: 'XOF' }) || 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        achat.statut === 'valide' ? 'bg-green-100 text-green-800' :
                        achat.statut === 'brouillon' ? 'bg-yellow-100 text-yellow-800' :
                        achat.statut === 'annule' ? 'bg-red-100 text-red-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {achat.statut || 'N/A'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex space-x-2">
                        <button
                          onClick={() => handleViewDetails(achat)}
                          className="text-blue-600 hover:text-blue-900"
                          title="Voir détails"
                        >
                          <FiEye />
                        </button>
                        <button
                          onClick={() => handleEdit(achat)}
                          className="text-indigo-600 hover:text-indigo-900"
                          title="Modifier"
                        >
                          <FiEdit2 />
                        </button>
                        <button
                          onClick={() => handleDelete(achat)}
                          className="text-red-600 hover:text-red-900"
                          title="Supprimer"
                        >
                          <FiTrash2 />
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
            <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
              <div className="flex-1 flex justify-between sm:hidden">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                  className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                >
                  Précédent
                </button>
                <button
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages}
                  className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                >
                  Suivant
                </button>
              </div>
              <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm text-gray-700">
                    Affichage de{' '}
                    <span className="font-medium">{indexOfFirstItem + 1}</span>
                    {' '}à{' '}
                    <span className="font-medium">{Math.min(indexOfLastItem, filteredAchats.length)}</span>
                    {' '}sur{' '}
                    <span className="font-medium">{filteredAchats.length}</span>
                    {' '}résultats
                  </p>
                </div>
                <div>
                  <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                    <button
                      onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                      disabled={currentPage === 1}
                      className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                    >
                      <FiChevronLeft />
                    </button>
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                      <button
                        key={page}
                        onClick={() => setCurrentPage(page)}
                        className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                          page === currentPage
                            ? 'z-10 bg-blue-50 border-blue-500 text-blue-600'
                            : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                        }`}
                      >
                        {page}
                      </button>
                    ))}
                    <button
                      onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                      disabled={currentPage === totalPages}
                      className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                    >
                      <FiChevronRight />
                    </button>
                  </nav>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modals */}
        {showForm && (
          <AchatFormModal
            achat={editingAchat}
            fournisseurs={fournisseurs}
            onSubmit={handleSubmit}
            onClose={() => {
              setShowForm(false);
              setEditingAchat(null);
            }}
          />
        )}

        {showDetailModal && selectedAchat && (
          <AchatDetailModal
            achat={selectedAchat}
            onClose={() => setShowDetailModal(false)}
          />
        )}

        {/* Error message */}
        {error && (
          <div className="mt-4 bg-red-50 border border-red-200 rounded-lg p-4 flex items-center">
            <FiXCircle className="text-red-500 mr-2" />
            <span className="text-red-800">{error}</span>
            <button
              onClick={() => setError(null)}
              className="ml-auto text-red-500 hover:text-red-700"
            >
              <FiX />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// Composant pour le formulaire modal
function AchatFormModal({ achat, fournisseurs, onSubmit, onClose }) {
  const [formData, setFormData] = useState({
    numero_commande: achat?.numero_commande || '',
    fournisseur: achat?.fournisseur?.id || '',
    date_commande: achat?.date_commande || new Date().toISOString().split('T')[0],
    montant_total: achat?.montant_total || 0,
    statut: achat?.statut || 'brouillon',
    description: achat?.description || '',
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">
            {achat ? 'Modifier la commande' : 'Nouvelle commande d\'achat'}
          </h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <FiX />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              N° Commande
            </label>
            <input
              type="text"
              value={formData.numero_commande}
              onChange={(e) => setFormData({ ...formData, numero_commande: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Fournisseur
            </label>
            <select
              value={formData.fournisseur}
              onChange={(e) => setFormData({ ...formData, fournisseur: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            >
              <option value="">Sélectionner un fournisseur</option>
              {fournisseurs.map(fournisseur => (
                <option key={fournisseur.id} value={fournisseur.id}>
                  {fournisseur.nom}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Date de commande
            </label>
            <input
              type="date"
              value={formData.date_commande}
              onChange={(e) => setFormData({ ...formData, date_commande: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Montant total
            </label>
            <input
              type="number"
              step="0.01"
              value={formData.montant_total}
              onChange={(e) => setFormData({ ...formData, montant_total: parseFloat(e.target.value) || 0 })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Statut
            </label>
            <select
              value={formData.statut}
              onChange={(e) => setFormData({ ...formData, statut: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="brouillon">Brouillon</option>
              <option value="valide">Validé</option>
              <option value="annule">Annulé</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Annuler
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              {achat ? 'Modifier' : 'Créer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Composant pour les détails modal
function AchatDetailModal({ achat, onClose }) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold flex items-center">
            <FiShoppingCart className="mr-2 text-blue-600" />
            Détails de la commande {achat.numero_commande}
          </h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <FiX />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">N° Commande</label>
              <p className="text-lg font-semibold">{achat.numero_commande}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Fournisseur</label>
              <p>{achat.fournisseur?.nom || 'N/A'}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Date de commande</label>
              <p>{new Date(achat.date_commande).toLocaleDateString('fr-FR')}</p>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Montant total</label>
              <p className="text-lg font-semibold text-green-600">
                {achat.montant_total?.toLocaleString('fr-FR', { style: 'currency', currency: 'XOF' }) || 'N/A'}
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Statut</label>
              <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                achat.statut === 'valide' ? 'bg-green-100 text-green-800' :
                achat.statut === 'brouillon' ? 'bg-yellow-100 text-yellow-800' :
                achat.statut === 'annule' ? 'bg-red-100 text-red-800' :
                'bg-gray-100 text-gray-800'
              }`}>
                {achat.statut || 'N/A'}
              </span>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Description</label>
              <p>{achat.description || 'Aucune description'}</p>
            </div>
          </div>
        </div>

        <div className="mt-6 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
}