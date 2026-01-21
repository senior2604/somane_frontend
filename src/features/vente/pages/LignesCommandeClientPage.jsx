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
  FiCalendar,
  FiDollarSign,
  FiPercent,
  FiXCircle
} from "react-icons/fi";

export default function LignesCommandeClientPage() {
  const [lignes, setLignes] = useState([]);
  const [commandes, setCommandes] = useState([]);
  const [produits, setProduits] = useState([]);
  const [taxes, setTaxes] = useState([]);
  const [unites, setUnites] = useState([]);
  
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [selectedCommande, setSelectedCommande] = useState('all');
  
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
      
      const [lignesResponse, commandesResponse, produitsResponse, taxesResponse, unitesResponse] = await Promise.all([
        apiClient.get('/vente/lignes-commande-client/').catch(() => ({ data: [] })),
        apiClient.get('/vente/commandes-client/').catch(() => ({ data: [] })),
        apiClient.get('/produits/').catch(() => ({ data: [] })),
        apiClient.get('/taxes/').catch(() => ({ data: [] })),
        apiClient.get('/unites-mesure/').catch(() => ({ data: [] }))
      ]);

      setLignes(lignesResponse.data || []);
      setCommandes(commandesResponse.data || []);
      setProduits(produitsResponse.data || []);
      setTaxes(taxesResponse.data || []);
      setUnites(unitesResponse.data || []);

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

  const getCommandeName = (id) => {
    const commande = commandes.find(c => c.id === id);
    return commande ? commande.name : 'N/A';
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'XOF'
    }).format(amount || 0);
  };

  const getInvoiceStatusBadge = (status) => {
    const statusConfig = {
      'a_facturer': { label: 'À facturer', color: 'bg-orange-100 text-orange-800' },
      'facturee': { label: 'Facturée', color: 'bg-green-100 text-green-800' },
      'rien_a_facturer': { label: 'Rien à facturer', color: 'bg-gray-100 text-gray-800' }
    };
    const config = statusConfig[status] || { label: status, color: 'bg-gray-100 text-gray-800' };
    return (
      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${config.color}`}>
        {config.label}
      </span>
    );
  };

  const getStateBadge = (state) => {
    const statusConfig = {
      'draft': { label: 'Brouillon', color: 'bg-gray-100 text-gray-800' },
      'sale': { label: 'Vente', color: 'bg-blue-100 text-blue-800' },
      'done': { label: 'Terminé', color: 'bg-green-100 text-green-800' },
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
  const filteredData = lignes.filter(ligne => {
    const searchString = searchTerm.toLowerCase();
    const matchesSearch = 
      (getCommandeName(ligne.order_id)?.toLowerCase().includes(searchString)) ||
      (getReferenceName(produits, ligne.product_id)?.toLowerCase().includes(searchString)) ||
      (ligne.name?.toLowerCase().includes(searchString));
    
    const matchesCommande = selectedCommande === 'all' || ligne.order_id === parseInt(selectedCommande);
    
    return matchesSearch && matchesCommande;
  });

  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredData.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredData.length / itemsPerPage);

  // Gestion des formulaires
  const handleSubmit = async (formData) => {
    try {
      const endpoint = '/vente/lignes-commande-client/';
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
    if (window.confirm('Êtes-vous sûr de vouloir supprimer cette ligne de commande ?')) {
      try {
        await apiClient.delete(`/vente/lignes-commande-client/${id}/`);
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
          <h1 className="text-2xl font-bold text-gray-900">Lignes de Commande Client</h1>
          <p className="text-gray-600 mt-1">Gestion des lignes de commandes clients</p>
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
              placeholder="Rechercher par commande, produit, description..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          
          <div className="flex items-center gap-4">
            <div>
              <label className="text-sm text-gray-600 mr-2">Commande:</label>
              <select
                value={selectedCommande}
                onChange={(e) => setSelectedCommande(e.target.value)}
                className="border border-gray-300 rounded-lg px-3 py-2"
              >
                <option value="all">Toutes les commandes</option>
                {commandes.map(commande => (
                  <option key={commande.id} value={commande.id}>{commande.name}</option>
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
                  Commande
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Produit
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Description
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Quantité
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Prix Unit.
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Remise
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Taxes
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Total TTC
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
              {currentItems.map((ligne) => (
                <tr key={ligne.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="font-medium text-gray-900">{getCommandeName(ligne.order_id)}</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <FiPackage className="text-gray-400 mr-2" size={16} />
                      <span>{getReferenceName(produits, ligne.product_id)}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm text-gray-600">{ligne.name || 'N/A'}</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex flex-col">
                      <span className="font-medium">{ligne.product_uom_qty || 0}</span>
                      <div className="text-xs text-gray-500 mt-1">
                        Livrée: {ligne.qty_delivered || 0} | Facturée: {ligne.qty_invoiced || 0}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {formatCurrency(ligne.price_unit)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {ligne.discount ? (
                      <div className="flex items-center text-red-600">
                        <FiPercent size={14} />
                        <span className="ml-1">{ligne.discount}%</span>
                      </div>
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm text-gray-600">
                      {ligne.tax_id && Array.isArray(ligne.tax_id) 
                        ? ligne.tax_id.map(id => getReferenceName(taxes, id)).join(', ')
                        : 'N/A'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap font-semibold">
                    {formatCurrency(ligne.price_total)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap space-y-1">
                    <div>{getInvoiceStatusBadge(ligne.invoice_status)}</div>
                    <div>{getStateBadge(ligne.state)}</div>
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
                        className="text-blue-600 hover:text-blue-800 p-1 rounded hover:bg-blue-50"
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
        <LigneCommandeClientFormModal
          item={editingItem}
          commandes={commandes}
          produits={produits}
          taxes={taxes}
          unites={unites}
          onSubmit={handleSubmit}
          onClose={() => {
            setShowForm(false);
            setEditingItem(null);
          }}
        />
      )}

      {/* Modal de détails */}
      {showDetailModal && selectedItem && (
        <LigneCommandeClientDetailModal
          item={selectedItem}
          commandes={commandes}
          produits={produits}
          taxes={taxes}
          unites={unites}
          onClose={() => setShowDetailModal(false)}
        />
      )}
    </div>
  );
}

// Modal de formulaire pour Ligne Commande Client
function LigneCommandeClientFormModal({ item, commandes, produits, taxes, unites, onSubmit, onClose }) {
  const [formData, setFormData] = useState(() => ({
    order_id: item?.order_id || '',
    product_id: item?.product_id || '',
    name: item?.name || '',
    product_uom_qty: item?.product_uom_qty || 0,
    qty_delivered: item?.qty_delivered || 0,
    qty_invoiced: item?.qty_invoiced || 0,
    price_unit: item?.price_unit || 0,
    discount: item?.discount || 0,
    tax_id: item?.tax_id || [],
    price_subtotal: item?.price_subtotal || 0,
    price_tax: item?.price_tax || 0,
    price_total: item?.price_total || 0,
    customer_lead: item?.customer_lead || 0,
    product_uom: item?.product_uom || '',
    invoice_status: item?.invoice_status || 'a_facturer',
    state: item?.state || 'draft'
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
            {item ? 'Modifier' : 'Nouvelle'} Ligne de Commande Client
          </h3>
          <button onClick={onClose} className="text-white hover:text-gray-200">
            <FiXCircle size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Commande client *
              </label>
              <select
                value={formData.order_id}
                onChange={(e) => setFormData({ ...formData, order_id: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                required
              >
                <option value="">Sélectionner une commande</option>
                {commandes.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>

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
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Quantité demandée *
              </label>
              <input
                type="number"
                step="0.01"
                value={formData.product_uom_qty}
                onChange={(e) => setFormData({ ...formData, product_uom_qty: parseFloat(e.target.value) || 0 })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                required
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

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Prix unitaire *
              </label>
              <input
                type="number"
                step="0.01"
                value={formData.price_unit}
                onChange={(e) => setFormData({ ...formData, price_unit: parseFloat(e.target.value) || 0 })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Remise (%)
              </label>
              <input
                type="number"
                step="0.01"
                value={formData.discount}
                onChange={(e) => setFormData({ ...formData, discount: parseFloat(e.target.value) || 0 })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Délai livraison (jours)
              </label>
              <input
                type="number"
                step="1"
                value={formData.customer_lead}
                onChange={(e) => setFormData({ ...formData, customer_lead: parseFloat(e.target.value) || 0 })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Taxes
              </label>
              <select
                multiple
                value={formData.tax_id}
                onChange={(e) => {
                  const options = Array.from(e.target.selectedOptions, option => option.value);
                  setFormData({ ...formData, tax_id: options });
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                {taxes.map(t => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
              <p className="text-xs text-gray-500 mt-1">Maintenez Ctrl pour sélectionner plusieurs taxes</p>
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

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Statut facturation
              </label>
              <select
                value={formData.invoice_status}
                onChange={(e) => setFormData({ ...formData, invoice_status: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="a_facturer">À facturer</option>
                <option value="facturee">Facturée</option>
                <option value="rien_a_facturer">Rien à facturer</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                État ligne
              </label>
              <select
                value={formData.state}
                onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="draft">Brouillon</option>
                <option value="sale">Vente</option>
                <option value="done">Terminé</option>
                <option value="cancel">Annulé</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
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
                Montant taxes
              </label>
              <input
                type="number"
                step="0.01"
                value={formData.price_tax}
                onChange={(e) => setFormData({ ...formData, price_tax: parseFloat(e.target.value) || 0 })}
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

// Modal de détails pour Ligne Commande Client
function LigneCommandeClientDetailModal({ item, commandes, produits, taxes, unites, onClose }) {
  const getReferenceName = (list, id) => {
    const found = list.find(i => i.id === id);
    return found ? found.name : 'N/A';
  };

  const getCommandeName = (id) => {
    const commande = commandes.find(c => c.id === id);
    return commande ? commande.name : 'N/A';
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'XOF'
    }).format(amount || 0);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold flex items-center">
            <FiEye className="mr-2 text-blue-600" />
            Détails de la Ligne de Commande Client
          </h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <FiXCircle size={24} />
          </button>
        </div>

        <div className="grid grid-cols-2 gap-6">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Commande client</label>
              <p className="text-lg font-semibold">{getCommandeName(item.order_id)}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Produit</label>
              <div className="flex items-center">
                <FiPackage className="text-gray-400 mr-2" size={16} />
                <p>{getReferenceName(produits, item.product_id)}</p>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Description</label>
              <p className="text-gray-600">{item.name || 'N/A'}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Unité de mesure</label>
              <p>{getReferenceName(unites, item.product_uom) || 'N/A'}</p>
            </div>
          </div>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Quantités</label>
              <div className="grid grid-cols-3 gap-2 mt-1">
                <div className="text-center">
                  <p className="text-xs text-gray-600">Demandée</p>
                  <p className="text-xl font-bold">{item.product_uom_qty || 0}</p>
                </div>
                <div className="text-center">
                  <p className="text-xs text-gray-600">Livrée</p>
                  <p className="text-xl font-bold text-green-600">{item.qty_delivered || 0}</p>
                </div>
                <div className="text-center">
                  <p className="text-xs text-gray-600">Facturée</p>
                  <p className="text-xl font-bold text-blue-600">{item.qty_invoiced || 0}</p>
                </div>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Prix et remise</label>
              <div className="flex items-center justify-between mt-1">
                <span>Prix unitaire:</span>
                <span className="font-semibold">{formatCurrency(item.price_unit)}</span>
              </div>
              {item.discount > 0 && (
                <div className="flex items-center justify-between mt-1 text-red-600">
                  <span>Remise:</span>
                  <span className="font-semibold">{item.discount}%</span>
                </div>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Délai livraison</label>
              <p className="mt-1">{item.customer_lead || 0} jours</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Taxes</label>
              <p className="text-gray-600 mt-1">
                {item.tax_id && Array.isArray(item.tax_id) 
                  ? item.tax_id.map(id => getReferenceName(taxes, id)).join(', ')
                  : 'Aucune taxe'}
              </p>
            </div>
          </div>
        </div>

        <div className="mt-8 pt-6 border-t border-gray-200">
          <label className="block text-sm font-medium text-gray-700 mb-2">Montants</label>
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <p className="text-sm text-gray-600">Sous-total HT</p>
              <p className="text-2xl font-bold">{formatCurrency(item.price_subtotal)}</p>
            </div>
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <p className="text-sm text-gray-600">Taxes</p>
              <p className="text-2xl font-bold">{formatCurrency(item.price_tax)}</p>
            </div>
            <div className="text-center p-4 bg-purple-50 rounded-lg">
              <p className="text-sm text-gray-600">Total TTC</p>
              <p className="text-2xl font-bold text-purple-700">{formatCurrency(item.price_total)}</p>
            </div>
          </div>
        </div>

        <div className="mt-8 pt-6 border-t border-gray-200">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Statut facturation</label>
              <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full mt-1 ${
                item.invoice_status === 'facturee' ? 'bg-green-100 text-green-800' :
                item.invoice_status === 'a_facturer' ? 'bg-orange-100 text-orange-800' :
                'bg-gray-100 text-gray-800'
              }`}>
                {item.invoice_status || 'N/A'}
              </span>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">État ligne</label>
              <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full mt-1 ${
                item.state === 'done' ? 'bg-green-100 text-green-800' :
                item.state === 'sale' ? 'bg-blue-100 text-blue-800' :
                item.state === 'cancel' ? 'bg-red-100 text-red-800' :
                'bg-gray-100 text-gray-800'
              }`}>
                {item.state || 'N/A'}
              </span>
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