// src/features/vente/pages/VenteDashboard.jsx
import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiPlus, FiTrendingUp, FiClock, FiCheckCircle, FiAlertCircle } from 'react-icons/fi';
import { useEntity } from '../../../context/EntityContext';
import { commandesService, formatAmount } from '../services';

export default function VenteDashboard() {
  const navigate = useNavigate();
  const { activeEntity } = useEntity(); // ← AJOUT : hook pour récupérer l'entité active
  
  const [stats, setStats] = useState({
    totalOrders: 0,
    totalAmount: 0,
    pendingOrders: 0,
    confirmedOrders: 0,
  });
  const [recentOrders, setRecentOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchData = useCallback(async () => {
    // Guard : si pas d'entité, on arrête (sans bloquer l'UI)
    if (!activeEntity) {
      setError('Veuillez sélectionner une entité pour voir les données de ventes');
      setLoading(false);
      return;
    }
    
    try {
      setLoading(true);
      setError(null);
      
      // Appel API avec entityId et filtres
      const response = await commandesService.getAll(activeEntity.id, { 
        limit: 5, 
        ordering: '-date_order' 
      });
      
      const orders = Array.isArray(response) ? response : response.results || [];
      
      setRecentOrders(orders);
      
      // Calcul des stats
      const total = orders.reduce((sum, o) => sum + (o.amount_total || 0), 0);
      const pending = orders.filter(o => o.state === 'draft').length;
      const confirmed = orders.filter(o => o.state === 'sale').length;
      
      setStats({
        totalOrders: orders.length,
        totalAmount: total,
        pendingOrders: pending,
        confirmedOrders: confirmed,
      });
    } catch (err) {
      console.error('Erreur chargement dashboard ventes:', err);
      setError('Impossible de charger les données de ventes');
    } finally {
      setLoading(false);
    }
  }, [activeEntity]);

  useEffect(() => {
    if (activeEntity) {
      fetchData();
    }
  }, [activeEntity, fetchData]);

  // Badges de statut (réutilisables)
  const StateBadge = ({ state }) => {
    const config = {
      draft: { text: 'Devis', cls: 'bg-amber-100 text-amber-700' },
      sent: { text: 'Envoyé', cls: 'bg-blue-100 text-blue-700' },
      sale: { text: 'Confirmé', cls: 'bg-emerald-100 text-emerald-700' },
      done: { text: 'Terminé', cls: 'bg-gray-100 text-gray-700' },
      cancel: { text: 'Annulé', cls: 'bg-red-100 text-red-700' }
    }[state] || { text: state || 'Inconnu', cls: 'bg-gray-100 text-gray-700' };
    return (
      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${config.cls}`}>
        {config.text}
      </span>
    );
  };

  const formatDate = (dateString) => {
    if (!dateString) return '—';
    return new Date(dateString).toLocaleDateString('fr-FR', {
      day: '2-digit', month: 'short', year: 'numeric'
    });
  };

  // Rendu : Message si pas d'entité
  if (!activeEntity && !loading) {
    return (
      <div className="p-6">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center">
          <FiAlertCircle className="text-yellow-600 mx-auto mb-3" size={32} />
          <p className="text-yellow-800 font-medium mb-2">Aucune entité sélectionnée</p>
          <p className="text-sm text-gray-600 mb-4">Veuillez sélectionner une entité pour voir les données de ventes.</p>
          <button
            onClick={() => navigate('/select-entite')}
            className="px-4 py-2 bg-violet-600 text-white text-sm rounded hover:bg-violet-700"
          >
            Sélectionner une entité
          </button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-violet-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-center">
          <p className="text-red-700">{error}</p>
          <button onClick={fetchData} className="mt-2 text-sm text-violet-600 hover:underline">
            Réessayer
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* En-tête */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">📊 Tableau de bord Ventes</h1>
          <p className="text-gray-600 mt-1">Entité : <span className="font-medium">{activeEntity?.raison_sociale}</span></p>
        </div>
        <button
          onClick={() => navigate('/vente/commandes/create')}
          className="flex items-center gap-2 px-4 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700 transition-colors"
        >
          <FiPlus size={18} /> Nouvelle commande
        </button>
      </div>

      {/* Cartes KPI */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total commandes */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Total commandes</p>
              <p className="text-2xl font-bold text-gray-800 mt-1">{stats.totalOrders}</p>
            </div>
            <div className="p-3 bg-violet-100 rounded-lg">
              <FiTrendingUp className="text-violet-600" size={24} />
            </div>
          </div>
        </div>

        {/* Chiffre d'affaires */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Chiffre d'affaires</p>
              <p className="text-2xl font-bold text-gray-800 mt-1">{formatAmount(stats.totalAmount)} XOF</p>
            </div>
            <div className="p-3 bg-emerald-100 rounded-lg">
              <FiCheckCircle className="text-emerald-600" size={24} />
            </div>
          </div>
        </div>

        {/* Devis en attente */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Devis en attente</p>
              <p className="text-2xl font-bold text-amber-600 mt-1">{stats.pendingOrders}</p>
            </div>
            <div className="p-3 bg-amber-100 rounded-lg">
              <FiClock className="text-amber-600" size={24} />
            </div>
          </div>
        </div>

        {/* Commandes confirmées */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Commandes confirmées</p>
              <p className="text-2xl font-bold text-emerald-600 mt-1">{stats.confirmedOrders}</p>
            </div>
            <div className="p-3 bg-blue-100 rounded-lg">
              <FiCheckCircle className="text-blue-600" size={24} />
            </div>
          </div>
        </div>
      </div>

      {/* Commandes récentes */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="p-4 border-b border-gray-200 flex items-center justify-between">
          <h2 className="font-semibold text-gray-800">Commandes récentes</h2>
          <button
            onClick={() => navigate('/vente/commandes')}
            className="text-sm text-violet-600 hover:text-violet-700 font-medium"
          >
            Voir tout →
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">N° Commande</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Client</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Montant TTC</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Statut</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {recentOrders.length > 0 ? (
                recentOrders.map((order) => {
                  // Récupération du nom client (enrichi ou fallback)
                  const clientName = order.partner_detail?.displayName 
                    || order.partner_name 
                    || order.partner_id 
                    || '—';
                  
                  return (
                    <tr
                      key={order.id}
                      onClick={() => navigate(`/vente/commandes/${order.id}`)}
                      className="hover:bg-gray-50 cursor-pointer transition-colors"
                    >
                      <td className="px-4 py-3 text-sm font-medium text-gray-800">{order.name || '—'}</td>
                      <td className="px-4 py-3 text-sm text-gray-600 truncate max-w-[150px]" title={clientName}>
                        {clientName}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">{formatDate(order.date_order)}</td>
                      <td className="px-4 py-3 text-sm font-medium text-gray-800">
                        {formatAmount(order.amount_total)} XOF
                      </td>
                      <td className="px-4 py-3">
                        <StateBadge state={order.state} />
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-gray-500">
                    {activeEntity ? 'Aucune commande récente' : 'Sélectionnez une entité pour voir les commandes'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}