import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FiEye,
  FiEdit2,
  FiTrash2,
  FiPlus,
  FiRefreshCw,
  FiSearch,
  FiChevronLeft,
  FiChevronRight
} from 'react-icons/fi';
import { apiClient } from '../../../../services/apiClient';

export default function PrixFournisseursList() {
  const navigate = useNavigate();
  
  const [prix, setPrix] = useState([]);
  const [filteredPrix, setFilteredPrix] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Relations
  const [fournisseurs, setFournisseurs] = useState([]);
  const [produits, setProduits] = useState([]);
  const [devises, setDevises] = useState([]);
  
  // Filtrage et pagination
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const [prixRes, fournisseursRes, produitsRes, devisesRes] = await Promise.all([
        apiClient.get('/achats/prix-fournisseurs/').catch(() => ({ data: [] })),
        apiClient.get('/fournisseurs/').catch(() => ({ data: [] })),
        apiClient.get('/produits/').catch(() => ({ data: [] })),
        apiClient.get('/devises/').catch(() => ({ data: [] }))
      ]);
      
      const prixData = Array.isArray(prixRes.data) ? prixRes.data : prixRes.results || [];
      setPrix(prixData);
      setFilteredPrix(prixData);
      setFournisseurs(Array.isArray(fournisseursRes.data) ? fournisseursRes.data : []);
      setProduits(Array.isArray(produitsRes.data) ? produitsRes.data : []);
      setDevises(Array.isArray(devisesRes.data) ? devisesRes.data : []);
    } catch (err) {
      console.error('❌ Erreur chargement prix:', err);
      setError('Impossible de charger les prix fournisseurs.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Recherche
  useEffect(() => {
    const filtered = prix.filter(item => {
      const search = searchTerm.toLowerCase();
      return (
        fournisseurs.find(f => f.id === item.fournisseur_id)?.name?.toLowerCase().includes(search) ||
        produits.find(p => p.id === item.product_id)?.name?.toLowerCase().includes(search) ||
        devises.find(d => d.id === item.currency_id)?.name?.toLowerCase().includes(search)
      );
    });
    setFilteredPrix(filtered);
    setCurrentPage(1);
  }, [searchTerm, prix, fournisseurs, produits, devises]);

  const handleDelete = async (item) => {
    if (!window.confirm('Supprimer ce prix fournisseur ?')) return;
    try {
      await apiClient.delete(`/achats/prix-fournisseurs/${item.id}/`);
      loadData();
    } catch (err) {
      setError('Erreur suppression: ' + (err.response?.data?.detail || err.message));
    }
  };

  // Pagination
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredPrix.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredPrix.length / itemsPerPage);

  const getReferenceName = (list, id) => {
    return list.find(item => item.id === id)?.name || 'N/A';
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'XOF' }).format(amount || 0);
  };

  const formatDate = (dateString) => {
    return dateString ? new Date(dateString).toLocaleDateString('fr-FR') : 'N/A';
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
      {/* En-tête */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Prix Fournisseurs</h1>
          <p className="text-gray-600 mt-1">Gestion des prix ({filteredPrix.length})</p>
        </div>
        <div className="flex gap-3">
          <button onClick={loadData} className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 flex items-center">
            <FiRefreshCw className="mr-2" />
            Actualiser
          </button>
          <button onClick={() => navigate('create')} className="bg-violet-600 text-white px-4 py-2 rounded-lg hover:bg-violet-700 flex items-center">
            <FiPlus className="mr-2" />
            Nouveau Prix
          </button>
        </div>
      </div>

      {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">{error}</div>}

      {/* Recherche */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="relative flex-1">
            <FiSearch className="absolute left-3 top-3 text-gray-400" />
            <input
              type="text"
              placeholder="Rechercher..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500"
            />
          </div>
          <select value={itemsPerPage} onChange={(e) => setItemsPerPage(Number(e.target.value))} className="border border-gray-300 rounded-lg px-3 py-2">
            <option value={5}>5 par page</option>
            <option value={10}>10 par page</option>
            <option value={25}>25 par page</option>
            <option value={50}>50 par page</option>
          </select>
        </div>
      </div>

      {/* Tableau */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Fournisseur</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Produit</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Prix</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Devise</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Qté Min</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date Effective</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {currentItems.map((item) => (
                <tr key={item.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 font-medium text-gray-900">{getReferenceName(fournisseurs, item.fournisseur_id)}</td>
                  <td className="px-6 py-4">{getReferenceName(produits, item.product_id)}</td>
                  <td className="px-6 py-4 font-semibold">{formatCurrency(item.price)}</td>
                  <td className="px-6 py-4">{getReferenceName(devises, item.currency_id)}</td>
                  <td className="px-6 py-4">{item.min_quantity || '-'}</td>
                  <td className="px-6 py-4">{formatDate(item.date_effective)}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <button onClick={() => navigate(`${item.id}`)} className="text-blue-600 hover:text-blue-800" title="Voir">
                        <FiEye size={18} />
                      </button>
                      <button onClick={() => navigate(`${item.id}/edit`)} className="text-violet-600 hover:text-violet-800" title="Modifier">
                        <FiEdit2 size={18} />
                      </button>
                      <button onClick={() => handleDelete(item)} className="text-red-600 hover:text-red-800" title="Supprimer">
                        <FiTrash2 size={18} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
            <span className="text-sm text-gray-600">Page {currentPage} sur {totalPages}</span>
            <div className="flex gap-2">
              <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="px-3 py-1 bg-gray-200 rounded hover:bg-gray-300 disabled:opacity-50">
                <FiChevronLeft />
              </button>
              <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="px-3 py-1 bg-gray-200 rounded hover:bg-gray-300 disabled:opacity-50">
                <FiChevronRight />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
