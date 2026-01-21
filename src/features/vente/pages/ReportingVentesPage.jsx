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
  FiCalendar,
  FiUser,
  FiPackage,
  FiDollarSign,
  FiTrendingUp,
  FiBarChart2,
  FiXCircle
} from "react-icons/fi";

export default function ReportingVentesPage() {
  const [reporting, setReporting] = useState([]);
  const [produits, setProduits] = useState([]);
  const [clients, setClients] = useState([]);
  const [unites, setUnites] = useState([]);
  const [devises, setDevises] = useState([]);
  const [societes, setSocietes] = useState([]);
  
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedProduit, setSelectedProduit] = useState('all');
  const [selectedClient, setSelectedClient] = useState('all');
  
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
      
      const [
        reportingResponse, 
        produitsResponse, 
        clientsResponse, 
        unitesResponse, 
        devisesResponse,
        societesResponse
      ] = await Promise.all([
        apiClient.get('/vente/reporting-ventes/').catch(() => ({ data: [] })),
        apiClient.get('/produits/').catch(() => ({ data: [] })),
        apiClient.get('/clients/').catch(() => ({ data: [] })),
        apiClient.get('/unites-mesure/').catch(() => ({ data: [] })),
        apiClient.get('/devises/').catch(() => ({ data: [] })),
        apiClient.get('/societes/').catch(() => ({ data: [] }))
      ]);

      setReporting(reportingResponse.data || []);
      setProduits(produitsResponse.data || []);
      setClients(clientsResponse.data || []);
      setUnites(unitesResponse.data || []);
      setDevises(devisesResponse.data || []);
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

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'XOF'
    }).format(amount || 0);
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('fr-FR');
  };

  const getStateBadge = (state) => {
    const statusConfig = {
      'draft': { label: 'Brouillon', color: 'bg-gray-100 text-gray-800' },
      'posted': { label: 'Posté', color: 'bg-green-100 text-green-800' },
      'cancel': { label: 'Annulé', color: 'bg-red-100 text-red-800' }
    };
    const config = statusConfig[state] || { label: state, color: 'bg-gray-100 text-gray-800' };
    return (
      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${config.color}`}>
        {config.label}
      </span>
    );
  };

  // Filtrage et pagination
  const filteredData = reporting.filter(item => {
    const searchString = searchTerm.toLowerCase();
    const matchesSearch = 
      (item.name?.toLowerCase().includes(searchString)) ||
      (getReferenceName(produits, item.product_id)?.toLowerCase().includes(searchString)) ||
      (getReferenceName(clients, item.partner_id)?.toLowerCase().includes(searchString)) ||
      (item.state?.toLowerCase().includes(searchString));
    
    const matchesDate = !selectedDate || item.date === selectedDate;
    const matchesProduit = selectedProduit === 'all' || item.product_id === parseInt(selectedProduit);
    const matchesClient = selectedClient === 'all' || item.partner_id === parseInt(selectedClient);
    
    return matchesSearch && matchesDate && matchesProduit && matchesClient;
  });

  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredData.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredData.length / itemsPerPage);

  // Gestion des formulaires
  const handleSubmit = async (formData) => {
    try {
      const endpoint = '/vente/reporting-ventes/';
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
    if (window.confirm('Êtes-vous sûr de vouloir supprimer cette entrée de reporting ?')) {
      try {
        await apiClient.delete(`/vente/reporting-ventes/${id}/`);
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
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* En-tête de la page */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Reporting des Ventes</h1>
          <p className="text-gray-600 mt-1">Analyse et suivi des performances commerciales</p>
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
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center"
          >
            <FiPlus className="mr-2" />
            Nouvelle Entrée
          </button>
          <button className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center">
            <FiBarChart2 className="mr-2" />
            Exporter CSV
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
              placeholder="Rechercher par nom, produit, client..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          
          <div className="flex items-center gap-4">
            <div className="flex gap-2">
              <div>
                <label className="text-sm text-gray-600 mr-2">Date:</label>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="border border-gray-300 rounded-lg px-3 py-2"
                />
              </div>
              
              <div>
                <label className="text-sm text-gray-600 mr-2">Produit:</label>
                <select
                  value={selectedProduit}
                  onChange={(e) => setSelectedProduit(e.target.value)}
                  className="border border-gray-300 rounded-lg px-3 py-2"
                >
                  <option value="all">Tous les produits</option>
                  {produits.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="text-sm text-gray-600 mr-2">Client:</label>
                <select
                  value={selectedClient}
                  onChange={(e) => setSelectedClient(e.target.value)}
                  className="border border-gray-300 rounded-lg px-3 py-2"
                >
                  <option value="all">Tous les clients</option>
                  {clients.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
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
                  Nom ligne
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Produit
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Client
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Unité
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Quantités
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Montants
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Société
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
              {currentItems.map((item) => (
                <tr key={item.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="font-medium text-gray-900">{item.name || 'N/A'}</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <FiPackage className="text-gray-400 mr-2" size={16} />
                      <span>{getReferenceName(produits, item.product_id)}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <FiUser className="text-gray-400 mr-2" size={16} />
                      <span>{getReferenceName(clients, item.partner_id)}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <FiCalendar className="text-gray-400 mr-2" size={16} />
                      <span>{formatDate(item.date)}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {getReferenceName(unites, item.product_uom)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex flex-col">
                      <div className="flex items-center">
                        <span className="font-medium">{item.product_uom_qty || 0}</span>
                        <span className="text-xs text-gray-500 ml-1">dem.</span>
                      </div>
                      <div className="text-xs text-gray-600">
                        Livrée: {item.qty_delivered || 0} | Fact.: {item.qty_invoiced || 0}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex flex-col">
                      <div className="flex items-center text-green-600">
                        <FiDollarSign size={14} />
                        <span className="font-bold ml-1">{formatCurrency(item.price_total)}</span>
                      </div>
                      <div className="text-xs text-gray-600">
                        HT: {formatCurrency(item.price_subtotal)}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {getReferenceName(societes, item.company_id)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {getStateBadge(item.state)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          setSelectedItem(item);
                          setShowDetailModal(true);
                        }}
                        className="text-blue-600 hover:text-blue-800 p-1 rounded hover:bg-blue-50"
                        title="Voir détails"
                      >
                        <FiEye size={18} />
                      </button>
                      <button
                        onClick={() => {
                          setEditingItem(item);
                          setShowForm(true);
                        }}
                        className="text-blue-600 hover:text-blue-800 p-1 rounded hover:bg-blue-50"
                        title="Modifier"
                      >
                        <FiEdit2 size={18} />
                      </button>
                      <button
                        onClick={() => handleDelete(item.id)}
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

      {/* Statistiques sommaires */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Synthèse du Reporting</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="p-4 bg-blue-50 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Chiffre d'affaires total</p>
                <p className="text-2xl font-bold mt-1">
                  {formatCurrency(reporting.reduce((sum, item) => sum + (item.price_total || 0), 0))}
                </p>
              </div>
              <FiDollarSign className="text-blue-500" size={24} />
            </div>
          </div>
          <div className="p-4 bg-green-50 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Quantité totale</p>
                <p className="text-2xl font-bold mt-1">
                  {reporting.reduce((sum, item) => sum + (item.product_uom_qty || 0), 0)}
                </p>
              </div>
              <FiTrendingUp className="text-green-500" size={24} />
            </div>
          </div>
          <div className="p-4 bg-purple-50 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Clients actifs</p>
                <p className="text-2xl font-bold mt-1">
                  {[...new Set(reporting.map(item => item.partner_id))].length}
                </p>
              </div>
              <FiUser className="text-purple-500" size={24} />
            </div>
          </div>
          <div className="p-4 bg-amber-50 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Produits vendus</p>
                <p className="text-2xl font-bold mt-1">
                  {[...new Set(reporting.map(item => item.product_id))].length}
                </p>
              </div>
              <FiPackage className="text-amber-500" size={24} />
            </div>
          </div>
        </div>
      </div>

      {/* Modal de formulaire */}
      {showForm && (
        <ReportingVenteFormModal
          item={editingItem}
          produits={produits}
          clients={clients}
          unites={unites}
          devises={devises}
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
        <ReportingVenteDetailModal
          item={selectedItem}
          produits={produits}
          clients={clients}
          unites={unites}
          devises={devises}
          societes={societes}
          onClose={() => setShowDetailModal(false)}
        />
      )}
    </div>
  );
}

// Modal de formulaire pour Reporting Vente
function ReportingVenteFormModal({ item, produits, clients, unites, devises, societes, onSubmit, onClose }) {
  const [formData, setFormData] = useState(() => ({
    name: item?.name || '',
    product_id: item?.product_id || '',
    product_uom: item?.product_uom || '',
    price_total: item?.price_total || 0,
    price_subtotal: item?.price_subtotal || 0,
    product_uom_qty: item?.product_uom_qty || 0,
    qty_delivered: item?.qty_delivered || 0,
    qty_invoiced: item?.qty_invoiced || 0,
    partner_id: item?.partner_id || '',
    date: item?.date || new Date().toISOString().split('T')[0],
    state: item?.state || 'draft',
    company_id: item?.company_id || '',
    currency_id: item?.currency_id || ''
  }));

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center bg-blue-600 text-white p-4 rounded-t-lg">
          <h3 className="text-lg font-semibold">
            {item ? 'Modifier' : 'Nouvelle'} Entrée de Reporting
          </h3>
          <button onClick={onClose} className="text-white hover:text-gray-200">
            <FiXCircle size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nom ligne *
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Produit *
              </label>
              <select
                value={formData.product_id}
                onChange={(e) => setFormData({ ...formData, product_id: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                required
              >
                <option value="">Sélectionner un produit</option>
                {produits.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Client *
              </label>
              <select
                value={formData.partner_id}
                onChange={(e) => setFormData({ ...formData, partner_id: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                required
              >
                <option value="">Sélectionner un client</option>
                {clients.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Date *
              </label>
              <input
                type="date"
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Unité de mesure
              </label>
              <select
                value={formData.product_uom}
                onChange={(e) => setFormData({ ...formData, product_uom: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Sélectionner une unité</option>
                {unites.map(u => (
                  <option key={u.id} value={u.id}>{u.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Quantité demandée
              </label>
              <input
                type="number"
                step="0.01"
                value={formData.product_uom_qty}
                onChange={(e) => setFormData({ ...formData, product_uom_qty: parseFloat(e.target.value) || 0 })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Quantité livrée
              </label>
              <input
                type="number"
                step="0.01"
                value={formData.qty_delivered}
                onChange={(e) => setFormData({ ...formData, qty_delivered: parseFloat(e.target.value) || 0 })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Quantité facturée
              </label>
              <input
                type="number"
                step="0.01"
                value={formData.qty_invoiced}
                onChange={(e) => setFormData({ ...formData, qty_invoiced: parseFloat(e.target.value) || 0 })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Sous-total HT
              </label>
              <input
                type="number"
                step="0.01"
                value={formData.price_subtotal}
                onChange={(e) => setFormData({ ...formData, price_subtotal: parseFloat(e.target.value) || 0 })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Total TTC
              </label>
              <input
                type="number"
                step="0.01"
                value={formData.price_total}
                onChange={(e) => setFormData({ ...formData, price_total: parseFloat(e.target.value) || 0 })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Société *
              </label>
              <select
                value={formData.company_id}
                onChange={(e) => setFormData({ ...formData, company_id: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
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
                Devise *
              </label>
              <select
                value={formData.currency_id}
                onChange={(e) => setFormData({ ...formData, currency_id: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                required
              >
                <option value="">Sélectionner une devise</option>
                {devises.map(d => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Statut *
              </label>
              <select
                value={formData.state}
                onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                required
              >
                <option value="draft">Brouillon</option>
                <option value="posted">Posté</option>
                <option value="cancel">Annulé</option>
              </select>
            </div>
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
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
            >
              {item ? 'Modifier' : 'Créer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Modal de détails pour Reporting Vente
function ReportingVenteDetailModal({ item, produits, clients, unites, devises, societes, onClose }) {
  const getReferenceName = (list, id) => {
    const found = list.find(i => i.id === id);
    return found ? found.name : 'N/A';
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'XOF'
    }).format(amount || 0);
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
            <FiEye className="mr-2 text-blue-600" />
            Détails du Reporting Vente
          </h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <FiXCircle size={24} />
          </button>
        </div>

        <div className="grid grid-cols-2 gap-6">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Nom ligne</label>
              <p className="text-lg font-semibold">{item.name || 'N/A'}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Produit</label>
              <div className="flex items-center">
                <FiPackage className="text-gray-400 mr-2" size={16} />
                <p>{getReferenceName(produits, item.product_id)}</p>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Client</label>
              <div className="flex items-center">
                <FiUser className="text-gray-400 mr-2" size={16} />
                <p>{getReferenceName(clients, item.partner_id)}</p>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Date</label>
              <div className="flex items-center">
                <FiCalendar className="text-gray-400 mr-2" size={16} />
                <p>{formatDate(item.date)}</p>
              </div>
            </div>
          </div>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Unité de mesure</label>
              <p>{getReferenceName(unites, item.product_uom) || 'N/A'}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Société</label>
              <p>{getReferenceName(societes, item.company_id)}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Devise</label>
              <p>{getReferenceName(devises, item.currency_id)}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Statut</label>
              <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full mt-1 ${
                item.state === 'posted' ? 'bg-green-100 text-green-800' :
                item.state === 'cancel' ? 'bg-red-100 text-red-800' :
                'bg-gray-100 text-gray-800'
              }`}>
                {item.state || 'N/A'}
              </span>
            </div>
          </div>
        </div>

        <div className="mt-8 pt-6 border-t border-gray-200">
          <label className="block text-sm font-medium text-gray-700 mb-4">Quantités</label>
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <p className="text-sm text-gray-600">Demandée</p>
              <p className="text-2xl font-bold">{item.product_uom_qty || 0}</p>
            </div>
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <p className="text-sm text-gray-600">Livrée</p>
              <p className="text-2xl font-bold text-green-600">{item.qty_delivered || 0}</p>
            </div>
            <div className="text-center p-4 bg-purple-50 rounded-lg">
              <p className="text-sm text-gray-600">Facturée</p>
              <p className="text-2xl font-bold text-purple-600">{item.qty_invoiced || 0}</p>
            </div>
          </div>
        </div>

        <div className="mt-8 pt-6 border-t border-gray-200">
          <label className="block text-sm font-medium text-gray-700 mb-4">Montants</label>
          <div className="grid grid-cols-2 gap-4">
            <div className="text-center p-4 bg-amber-50 rounded-lg">
              <p className="text-sm text-gray-600">Sous-total HT</p>
              <p className="text-2xl font-bold">{formatCurrency(item.price_subtotal)}</p>
            </div>
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <p className="text-sm text-gray-600">Total TTC</p>
              <p className="text-2xl font-bold text-green-700">{formatCurrency(item.price_total)}</p>
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