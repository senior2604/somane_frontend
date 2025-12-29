// features/achats/pages/LignesDemandeAchatPage.jsx
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
  FiPackage,
  FiFileText,
  FiList,
  FiXCircle
} from "react-icons/fi";

export default function LignesDemandeAchatPage() {
  const [lignes, setLignes] = useState([]);
  const [demandes, setDemandes] = useState([]);
  const [produits, setProduits] = useState([]);
  
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [selectedDemande, setSelectedDemande] = useState('all');
  
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
      
      const [lignesResponse, demandesResponse, produitsResponse] = await Promise.all([
        apiClient.get('/achats/lignes-demande-achat/').catch(() => ({ data: [] })),
        apiClient.get('/achats/demandes-achat/').catch(() => ({ data: [] })),
        apiClient.get('/produits/').catch(() => ({ data: [] }))
      ]);

      setLignes(lignesResponse.data || []);
      setDemandes(demandesResponse.data || []);
      setProduits(produitsResponse.data || []);

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

  const getDemandeAchatName = (id) => {
    const demande = demandes.find(d => d.id === id);
    return demande ? demande.name : 'N/A';
  };

  // Filtrage et pagination
  const filteredData = lignes.filter(ligne => {
    const searchString = searchTerm.toLowerCase();
    const matchesSearch = 
      (getDemandeAchatName(ligne.requisition_id)?.toLowerCase().includes(searchString)) ||
      (getReferenceName(produits, ligne.product_id)?.toLowerCase().includes(searchString)) ||
      (ligne.description?.toLowerCase().includes(searchString));
    
    const matchesDemande = selectedDemande === 'all' || ligne.requisition_id === parseInt(selectedDemande);
    
    return matchesSearch && matchesDemande;
  });

  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredData.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredData.length / itemsPerPage);

  // Gestion des formulaires
  const handleSubmit = async (formData) => {
    try {
      const endpoint = '/achats/lignes-demande-achat/';
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
    if (window.confirm('Êtes-vous sûr de vouloir supprimer cette ligne de demande ?')) {
      try {
        await apiClient.delete(`/achats/lignes-demande-achat/${id}/`);
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
          <h1 className="text-2xl font-bold text-gray-900">Lignes de Demande d'Achat</h1>
          <p className="text-gray-600 mt-1">Gestion des lignes de demandes d'achat</p>
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
            Nouvelle Ligne
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
              placeholder="Rechercher par demande, produit, description..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent"
            />
          </div>
          
          <div className="flex items-center gap-4">
            <div>
              <label className="text-sm text-gray-600 mr-2">Demande d'achat:</label>
              <select
                value={selectedDemande}
                onChange={(e) => setSelectedDemande(e.target.value)}
                className="border border-gray-300 rounded-lg px-3 py-2"
              >
                <option value="all">Toutes les demandes</option>
                {demandes.map(demande => (
                  <option key={demande.id} value={demande.id}>{demande.name}</option>
                ))}
              </select>
            </div>
            
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
                  Demande
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Article demandé
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Quantité
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Description
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {currentItems.map((ligne) => (
                <tr key={ligne.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="font-medium text-gray-900">{getDemandeAchatName(ligne.requisition_id)}</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <FiPackage className="text-gray-400 mr-2" size={16} />
                      <span>{getReferenceName(produits, ligne.product_id)}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="font-medium text-lg">{ligne.product_qty || 0}</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm text-gray-600">{ligne.description || 'N/A'}</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          setSelectedItem(ligne);
                          setShowDetailModal(true);
                        }}
                        className="text-blue-600 hover:text-blue-800 p-1 rounded hover:bg-blue-50"
                        title="Voir détails"
                      >
                        <FiEye size={18} />
                      </button>
                      <button
                        onClick={() => {
                          setEditingItem(ligne);
                          setShowForm(true);
                        }}
                        className="text-violet-600 hover:text-violet-800 p-1 rounded hover:bg-violet-50"
                        title="Modifier"
                      >
                        <FiEdit2 size={18} />
                      </button>
                      <button
                        onClick={() => handleDelete(ligne.id)}
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
        <LigneDemandeAchatFormModal
          item={editingItem}
          demandes={demandes}
          produits={produits}
          onSubmit={handleSubmit}
          onClose={() => {
            setShowForm(false);
            setEditingItem(null);
          }}
        />
      )}

      {/* Modal de détails */}
      {showDetailModal && selectedItem && (
        <LigneDemandeAchatDetailModal
          item={selectedItem}
          demandes={demandes}
          produits={produits}
          onClose={() => setShowDetailModal(false)}
        />
      )}
    </div>
  );
}

// Modal de formulaire pour Ligne Demande d'Achat
function LigneDemandeAchatFormModal({ item, demandes, produits, onSubmit, onClose }) {
  const [formData, setFormData] = useState(() => ({
    requisition_id: item?.requisition_id || '',
    product_id: item?.product_id || '',
    product_qty: item?.product_qty || 0,
    description: item?.description || ''
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
            {item ? 'Modifier' : 'Nouvelle'} Ligne de Demande d'Achat
          </h3>
          <button onClick={onClose} className="text-white hover:text-gray-200">
            <FiXCircle size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Demande d'achat *
            </label>
            <select
              value={formData.requisition_id}
              onChange={(e) => setFormData({ ...formData, requisition_id: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500"
              required
            >
              <option value="">Sélectionner une demande</option>
              {demandes.map(d => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Article demandé *
            </label>
            <select
              value={formData.product_id}
              onChange={(e) => setFormData({ ...formData, product_id: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500"
              required
            >
              <option value="">Sélectionner un article</option>
              {produits.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Quantité demandée *
            </label>
            <input
              type="number"
              step="0.01"
              value={formData.product_qty}
              onChange={(e) => setFormData({ ...formData, product_qty: parseFloat(e.target.value) || 0 })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500"
            />
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

// Modal de détails pour Ligne Demande d'Achat
function LigneDemandeAchatDetailModal({ item, demandes, produits, onClose }) {
  const getReferenceName = (list, id) => {
    const found = list.find(i => i.id === id);
    return found ? found.name : 'N/A';
  };

  const getDemandeAchatName = (id) => {
    const demande = demandes.find(d => d.id === id);
    return demande ? demande.name : 'N/A';
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold flex items-center">
            <FiEye className="mr-2 text-violet-600" />
            Détails de la Ligne de Demande d'Achat
          </h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <FiXCircle size={24} />
          </button>
        </div>

        <div className="grid grid-cols-2 gap-6">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Demande d'achat</label>
              <p className="text-lg font-semibold">{getDemandeAchatName(item.requisition_id)}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Article demandé</label>
              <div className="flex items-center">
                <FiPackage className="text-gray-400 mr-2" size={16} />
                <p>{getReferenceName(produits, item.product_id)}</p>
              </div>
            </div>
          </div>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Quantité demandée</label>
              <p className="text-2xl font-bold">{item.product_qty || 0}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Description</label>
              <p className="text-gray-600">{item.description || 'N/A'}</p>
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