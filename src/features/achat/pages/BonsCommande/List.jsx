import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FiEye,
  FiEdit2,
  FiTrash2,
  FiPlus,
  FiRefreshCw,
  FiSearch,
  FiFilter,
  FiChevronLeft,
  FiChevronRight
} from 'react-icons/fi';
import { apiClient } from '../../../../services/apiClient';

export default function BonsCommandeList() {
  const navigate = useNavigate();
  
  const [bonsCommande, setBonsCommande] = useState([]);
  const [filteredBons, setFilteredBons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Relations
  const [fournisseurs, setFournisseurs] = useState([]);
  const [devises, setDevises] = useState([]);
  const [societes, setSocietes] = useState([]);
  const [utilisateurs, setUtilisateurs] = useState([]);
  
  // Filtrage et pagination
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [selectedBonIds, setSelectedBonIds] = useState([]);
  const [activeRowId, setActiveRowId] = useState(null);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const [bonsRes, fournisseursRes, devisesRes, societesRes, utilisateursRes] = await Promise.all([
        apiClient.get('/achats/bons-commande/').catch(() => ({ data: [] })),
        apiClient.get('/fournisseurs/').catch(() => ({ data: [] })),
        apiClient.get('/devises/').catch(() => ({ data: [] })),
        apiClient.get('/societes/').catch(() => ({ data: [] })),
        apiClient.get('/utilisateurs/').catch(() => ({ data: [] }))
      ]);
      
      const bonsData = Array.isArray(bonsRes.data) ? bonsRes.data : bonsRes.results || [];
      setBonsCommande(bonsData);
      setFilteredBons(bonsData);
      setFournisseurs(Array.isArray(fournisseursRes.data) ? fournisseursRes.data : []);
      setDevises(Array.isArray(devisesRes.data) ? devisesRes.data : []);
      setSocietes(Array.isArray(societesRes.data) ? societesRes.data : []);
      setUtilisateurs(Array.isArray(utilisateursRes.data) ? utilisateursRes.data : []);
      
      setActiveRowId(null);
    } catch (err) {
      console.error('❌ Erreur chargement bons commande:', err);
      setError('Impossible de charger les bons de commande.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Recherche
  useEffect(() => {
    const filtered = bonsCommande.filter(bon => {
      const search = searchTerm.toLowerCase();
      return (
        bon.name?.toLowerCase().includes(search) ||
        fournisseurs.find(f => f.id === bon.partner_id)?.name?.toLowerCase().includes(search) ||
        bon.state?.toLowerCase().includes(search)
      );
    });
    setFilteredBons(filtered);
    setCurrentPage(1);
  }, [searchTerm, bonsCommande, fournisseurs]);

  const handleDelete = async (bon) => {
    if (!window.confirm(`Supprimer "${bon.name}" ?`)) return;
    try {
      await apiClient.delete(`/achats/bons-commande/${bon.id}/`);
      loadData();
    } catch (err) {
      setError('Erreur suppression: ' + (err.response?.data?.detail || err.message));
    }
  };

  // Pagination
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredBons.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredBons.length / itemsPerPage);

  const getStatusBadge = (status) => {
    const statusConfig = {
      'brouillon': { label: 'Brouillon', color: 'bg-gray-100 text-gray-800' },
      'demande_prix': { label: 'Demande Prix', color: 'bg-yellow-100 text-yellow-800' },
      'envoyer': { label: 'Envoyé', color: 'bg-blue-100 text-blue-800' },
      'confirmer': { label: 'Confirmé', color: 'bg-green-100 text-green-800' },
      'annule': { label: 'Annulé', color: 'bg-red-100 text-red-800' }
    };
    const config = statusConfig[status] || { label: status, color: 'bg-gray-100 text-gray-800' };
    return <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${config.color}`}>{config.label}</span>;
  };

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
          <h1 className="text-2xl font-bold text-gray-900">Bons de Commande</h1>
          <p className="text-gray-600 mt-1">Gestion des bons de commande fournisseurs ({filteredBons.length})</p>
        </div>
        <div className="flex gap-3">
          <button onClick={loadData} className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 flex items-center">
            <FiRefreshCw className="mr-2" />
            Actualiser
          </button>
          <button onClick={() => navigate('create')} className="bg-violet-600 text-white px-4 py-2 rounded-lg hover:bg-violet-700 flex items-center">
            <FiPlus className="mr-2" />
            Nouveau
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
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">N° Commande</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Fournisseur</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Devise</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Montant</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Statut</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {currentItems.map((bon) => (
                <tr key={bon.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 font-medium text-gray-900">{bon.name}</td>
                  <td className="px-6 py-4">{getReferenceName(fournisseurs, bon.partner_id)}</td>
                  <td className="px-6 py-4">{formatDate(bon.date_order)}</td>
                  <td className="px-6 py-4">{getReferenceName(devises, bon.currency_id)}</td>
                  <td className="px-6 py-4 font-semibold">{formatCurrency(bon.amount_total)}</td>
                  <td className="px-6 py-4">{getStatusBadge(bon.state)}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <button onClick={() => navigate(`${bon.id}`)} className="text-blue-600 hover:text-blue-800" title="Voir">
                        <FiEye size={18} />
                      </button>
                      <button onClick={() => navigate(`${bon.id}/edit`)} className="text-violet-600 hover:text-violet-800" title="Modifier">
                        <FiEdit2 size={18} />
                      </button>
                      <button onClick={() => handleDelete(bon)} className="text-red-600 hover:text-red-800" title="Supprimer">
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
