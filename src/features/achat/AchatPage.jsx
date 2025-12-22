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
  const [activeTab, setActiveTab] = useState('bons-commande');
  
  // États pour chaque table
  const [bonsCommande, setBonsCommande] = useState([]);
  const [lignesBonCommande, setLignesBonCommande] = useState([]);
  const [demandesAchat, setDemandesAchat] = useState([]);
  const [lignesDemandeAchat, setLignesDemandeAchat] = useState([]);
  const [prixFournisseurs, setPrixFournisseurs] = useState([]);
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // États pour formulaires et modals
  const [showForm, setShowForm] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);

  // États pour pagination et recherche
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRows, setSelectedRows] = useState([]);

  // Chargement initial
  useEffect(() => {
    fetchAllData();
  }, []);

  const fetchAllData = async () => {
    try {
      setLoading(true);
      setError(null);

      const endpoints = [
        '/achats/bons-commande/',
        '/achats/lignes-bon-commande/',
        '/achats/demandes-achat/',
        '/achats/lignes-demande-achat/',
        '/achats/prix-fournisseurs/'
      ];

      const responses = await Promise.all(
        endpoints.map(endpoint => apiClient.get(endpoint).catch(() => []))
      );

      const extractData = (response) => {
        if (Array.isArray(response)) return response;
        if (response && Array.isArray(response.results)) return response.results;
        if (response && Array.isArray(response.data)) return response.data;
        return [];
      };

      setBonsCommande(extractData(responses[0]));
      setLignesBonCommande(extractData(responses[1]));
      setDemandesAchat(extractData(responses[2]));
      setLignesDemandeAchat(extractData(responses[3]));
      setPrixFournisseurs(extractData(responses[4]));

    } catch (err) {
      console.error('Erreur lors du chargement des données:', err);
      setError('Erreur lors du chargement des données');
    } finally {
      setLoading(false);
    }
  };

  // Filtrage et recherche selon l'onglet actif
  const getFilteredData = () => {
    let data = [];
    switch (activeTab) {
      case 'bons-commande':
        data = bonsCommande;
        break;
      case 'lignes-bon-commande':
        data = lignesBonCommande;
        break;
      case 'demandes-achat':
        data = demandesAchat;
        break;
      case 'lignes-demande-achat':
        data = lignesDemandeAchat;
        break;
      case 'prix-fournisseurs':
        data = prixFournisseurs;
        break;
      default:
        data = [];
    }

    return data.filter(item => {
      // Recherche simple sur tous les champs texte
      const itemString = JSON.stringify(item).toLowerCase();
      return itemString.includes(searchTerm.toLowerCase());
    });
  };

  const filteredData = useMemo(() => getFilteredData(), [
    activeTab, bonsCommande, lignesBonCommande, demandesAchat, lignesDemandeAchat, prixFournisseurs, searchTerm
  ]);

  // Calculs pour la pagination
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = Array.isArray(filteredData) ? filteredData.slice(indexOfFirstItem, indexOfLastItem) : [];
  const totalPages = Math.ceil((Array.isArray(filteredData) ? filteredData.length : 0) / itemsPerPage);

  // Gestion des formulaires
  const getEndpoint = () => {
    switch (activeTab) {
      case 'bons-commande': return '/achats/bons-commande/';
      case 'lignes-bon-commande': return '/achats/lignes-bon-commande/';
      case 'demandes-achat': return '/achats/demandes-achat/';
      case 'lignes-demande-achat': return '/achats/lignes-demande-achat/';
      case 'prix-fournisseurs': return '/achats/prix-fournisseurs/';
      default: return '/achats/';
    }
  };

  const handleSubmit = async (formData) => {
    try {
      const endpoint = getEndpoint();
      if (editingItem) {
        await apiClient.put(`${endpoint}${editingItem.id}/`, formData);
      } else {
        await apiClient.post(endpoint, formData);
      }
      fetchAllData();
      setShowForm(false);
      setEditingItem(null);
    } catch (err) {
      console.error('Erreur lors de la sauvegarde:', err);
      setError('Erreur lors de la sauvegarde');
    }
  };

  const handleDelete = async (item) => {
    const tabNames = {
      'bons-commande': 'bon de commande',
      'lignes-bon-commande': 'ligne de bon de commande',
      'demandes-achat': 'demande d\'achat',
      'lignes-demande-achat': 'ligne de demande d\'achat',
      'prix-fournisseurs': 'prix fournisseur'
    };
    if (window.confirm(`Êtes-vous sûr de vouloir supprimer ce ${tabNames[activeTab]} ?`)) {
      try {
        const endpoint = getEndpoint();
        await apiClient.delete(`${endpoint}${item.id}/`);
        fetchAllData();
      } catch (err) {
        console.error('Erreur lors de la suppression:', err);
        setError('Erreur lors de la suppression');
      }
    }
  };

  const handleEdit = (item) => {
    setEditingItem(item);
    setShowForm(true);
  };

  const handleViewDetails = (item) => {
    setSelectedItem(item);
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
    if (selectedRows.length === currentItems.length) {
      setSelectedRows([]);
    } else {
      setSelectedRows(currentItems.map(item => item.id));
    }
  };

  // Export
  const handleExport = () => {
    // Logique d'export des éléments sélectionnés
    console.log('Export des éléments sélectionnés:', selectedRows);
    // Ici vous pouvez implémenter l'export vers CSV/Excel
  };

  // Fonctions pour les en-têtes et lignes de table dynamiques
  const getTableHeaders = () => {
    switch (activeTab) {
      case 'bons-commande':
        return ['N° Commande', 'Fournisseur', 'Date', 'Devise', 'Société', 'Statut', 'Montant Total', 'HT', 'TVA', 'Acheteur'];
      case 'lignes-bon-commande':
        return ['Bon Commande', 'Article', 'Description', 'Quantité', 'Prix Unit.', 'Taxes', 'Date Prévue', 'Sous-total'];
      case 'demandes-achat':
        return ['N° Demande', 'Demandeur', 'Département', 'Société', 'Date Début', 'Statut'];
      case 'lignes-demande-achat':
        return ['Demande', 'Article', 'Quantité Demandée', 'Description'];
      case 'prix-fournisseurs':
        return ['Fournisseur', 'Produit', 'Prix', 'Devise'];
      default:
        return [];
    }
  };

  const getTableRow = (item) => {
    switch (activeTab) {
      case 'bons-commande':
        return [
          item.name || 'N/A',
          item.partner_id?.name || 'N/A',
          item.date_order ? new Date(item.date_order).toLocaleDateString() : 'N/A',
          item.currency_id?.name || 'N/A',
          item.company_id?.name || 'N/A',
          item.state || 'N/A',
          item.amount_total || '0',
          item.amount_untaxed || '0',
          item.amount_tax || '0',
          item.user_id?.name || 'N/A'
        ];
      case 'lignes-bon-commande':
        return [
          item.order_id?.name || 'N/A',
          item.product_id?.name || 'N/A',
          item.name || 'N/A',
          item.product_qty || '0',
          item.price_unit || '0',
          item.taxes_id?.map(t => t.name).join(', ') || 'N/A',
          item.date_planned ? new Date(item.date_planned).toLocaleDateString() : 'N/A',
          item.price_subtotal || '0'
        ];
      case 'demandes-achat':
        return [
          item.name || 'N/A',
          item.user_id?.name || 'N/A',
          item.department_id?.name || 'N/A',
          item.company_id?.name || 'N/A',
          item.date_start ? new Date(item.date_start).toLocaleDateString() : 'N/A',
          item.state || 'N/A'
        ];
      case 'lignes-demande-achat':
        return [
          item.requisition_id?.name || 'N/A',
          item.product_id?.name || 'N/A',
          item.product_qty || '0',
          item.description || 'N/A'
        ];
      case 'prix-fournisseurs':
        return [
          item.partner_id?.name || 'N/A',
          item.product_id?.name || 'N/A',
          item.price || '0',
          item.currency_id?.name || 'N/A'
        ];
      default:
        return [];
    }
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
              Module Achat
            </h1>
            <p className="text-gray-600 mt-1">Gestion complète des achats et fournisseurs</p>
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
              disabled={activeTab !== 'bons-commande'}
            >
              <FiPlus className="mr-2" />
              Nouveau
            </button>
          </div>
        </div>

        {/* Onglets */}
        <div className="mb-6">
          <nav className="flex space-x-1 bg-white p-1 rounded-lg shadow-sm">
            {[
              { id: 'bons-commande', label: 'Bons de Commande', count: bonsCommande.length },
              { id: 'lignes-bon-commande', label: 'Lignes Bon Commande', count: lignesBonCommande.length },
              { id: 'demandes-achat', label: 'Demandes d\'Achat', count: demandesAchat.length },
              { id: 'lignes-demande-achat', label: 'Lignes Demande Achat', count: lignesDemandeAchat.length },
              { id: 'prix-fournisseurs', label: 'Prix Fournisseurs', count: prixFournisseurs.length }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id);
                  setCurrentPage(1);
                  setSelectedRows([]);
                  setSearchTerm('');
                }}
                className={`flex-1 py-2 px-4 text-sm font-medium rounded-md transition-colors ${
                  activeTab === tab.id
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                }`}
              >
                {tab.label} ({tab.count})
              </button>
            ))}
          </nav>
        </div>

        {/* Filtres et recherche */}
        <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
              {selectedRows.length} élément(s) sélectionné(s)
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

        {/* Table dynamique */}
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    <input
                      type="checkbox"
                      checked={selectedRows.length === currentItems.length && currentItems.length > 0}
                      onChange={handleSelectAll}
                      className="rounded border-gray-300"
                    />
                  </th>
                  {getTableHeaders().map((header, index) => (
                    <th key={index} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {header}
                    </th>
                  ))}
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {currentItems.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <input
                        type="checkbox"
                        checked={selectedRows.includes(item.id)}
                        onChange={() => handleSelectRow(item.id)}
                        className="rounded border-gray-300"
                      />
                    </td>
                    {getTableRow(item).map((cell, index) => (
                      <td key={index} className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {cell}
                      </td>
                    ))}
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex space-x-2">
                        <button
                          onClick={() => handleViewDetails(item)}
                          className="text-blue-600 hover:text-blue-900"
                          title="Voir détails"
                        >
                          <FiEye size={16} />
                        </button>
                        <button
                          onClick={() => handleEdit(item)}
                          className="text-yellow-600 hover:text-yellow-900"
                          title="Modifier"
                        >
                          <FiEdit2 size={16} />
                        </button>
                        <button
                          onClick={() => handleDelete(item)}
                          className="text-red-600 hover:text-red-900"
                          title="Supprimer"
                        >
                          <FiTrash2 size={16} />
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
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                  className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                >
                  Précédent
                </button>
                <button
                  onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
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
                    <span className="font-medium">{Math.min(indexOfLastItem, filteredData.length)}</span>
                    {' '}sur{' '}
                    <span className="font-medium">{filteredData.length}</span>
                    {' '}résultats
                  </p>
                </div>
                <div>
                  <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                    <button
                      onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                      disabled={currentPage === 1}
                      className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                    >
                      <FiChevronLeft className="h-5 w-5" />
                    </button>
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      const pageNum = Math.max(1, Math.min(totalPages - 4, currentPage - 2)) + i;
                      if (pageNum > totalPages) return null;
                      return (
                        <button
                          key={pageNum}
                          onClick={() => setCurrentPage(pageNum)}
                          className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                            pageNum === currentPage
                              ? 'z-10 bg-blue-50 border-blue-500 text-blue-600'
                              : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                          }`}
                        >
                          {pageNum}
                        </button>
                      );
                    })}
                    <button
                      onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                      disabled={currentPage === totalPages}
                      className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                    >
                      <FiChevronRight className="h-5 w-5" />
                    </button>
                  </nav>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modals */}
        {showForm && activeTab === 'bons-commande' && (
          <AchatFormModal
            item={editingItem}
            onSubmit={handleSubmit}
            onClose={() => {
              setShowForm(false);
              setEditingItem(null);
            }}
          />
        )}

        {showDetailModal && selectedItem && (
          <AchatDetailModal
            item={selectedItem}
            onClose={() => {
              setShowDetailModal(false);
              setSelectedItem(null);
            }}
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