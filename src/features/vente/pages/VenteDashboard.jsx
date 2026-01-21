import React, { useState, useEffect } from 'react';
import { 
  FiShoppingCart, 
  FiDollarSign,
  FiTrendingUp,
  FiUsers,
  FiPackage,
  FiCalendar,
  FiBarChart2,
  FiTarget,
  FiPieChart
} from 'react-icons/fi';
import { venteApi } from '../services/venteApi';

export default function VenteDashboard() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState([]);
  const [recentCommandes, setRecentCommandes] = useState([]);
  const [topProduits, setTopProduits] = useState([]);
  const [topClients, setTopClients] = useState([]);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      
      // Données fictives pour le dashboard
      const mockStats = [
        {
          title: "Commandes ce mois",
          value: "156",
          change: "+18%",
          icon: <FiShoppingCart className="text-blue-600" size={24} />,
          color: "bg-blue-50 border-blue-200",
          detail: "vs mois précédent"
        },
        {
          title: "Chiffre d'affaires",
          value: "€245,800",
          change: "+22%",
          icon: <FiDollarSign className="text-green-600" size={24} />,
          color: "bg-green-50 border-green-200",
          detail: "HT ce mois"
        },
        {
          title: "Clients actifs",
          value: "42",
          change: "+8%",
          icon: <FiUsers className="text-purple-600" size={24} />,
          color: "bg-purple-50 border-purple-200",
          detail: "Achats ce mois"
        },
        {
          title: "Panier moyen",
          value: "€1,575",
          change: "+5%",
          icon: <FiTarget className="text-amber-600" size={24} />,
          color: "bg-amber-50 border-amber-200",
          detail: "Par commande"
        }
      ];

      const mockRecentCommandes = [
        { id: 1, number: "CMD-2024-001", client: "Entreprise A", amount: "€12,500", status: "Confirmée", date: "2024-01-15", delivery: "Livrée" },
        { id: 2, number: "CMD-2024-002", client: "Entreprise B", amount: "€8,200", status: "En attente", date: "2024-01-14", delivery: "En préparation" },
        { id: 3, number: "CMD-2024-003", client: "Entreprise C", amount: "€5,700", status: "Facturée", date: "2024-01-13", delivery: "Livrée" },
        { id: 4, number: "CMD-2024-004", client: "Entreprise D", amount: "€9,800", status: "Confirmée", date: "2024-01-12", delivery: "Expédiée" },
        { id: 5, number: "CMD-2024-005", client: "Entreprise E", amount: "€3,200", status: "Annulée", date: "2024-01-11", delivery: "Annulée" }
      ];

      const mockTopProduits = [
        { name: "Produit Premium X", sales: 45, revenue: "€28,500", growth: "+25%" },
        { name: "Produit Standard Y", sales: 32, revenue: "€15,200", growth: "+12%" },
        { name: "Produit Économique Z", sales: 28, revenue: "€8,400", growth: "+18%" },
        { name: "Accessoire A", sales: 21, revenue: "€6,300", growth: "+8%" }
      ];

      const mockTopClients = [
        { name: "Entreprise A", orders: 8, amount: "€48,500", loyalty: "Client depuis 2 ans" },
        { name: "Entreprise B", orders: 5, amount: "€31,200", loyalty: "Client depuis 1 an" },
        { name: "Entreprise C", orders: 4, amount: "€28,700", loyalty: "Nouveau client" },
        { name: "Entreprise D", orders: 3, amount: "€15,400", loyalty: "Client depuis 3 ans" }
      ];

      setStats(mockStats);
      setRecentCommandes(mockRecentCommandes);
      setTopProduits(mockTopProduits);
      setTopClients(mockTopClients);

      // Pour une vraie implémentation :
      // const data = await venteApi.getDashboardStats();
      // setStats(data);

    } catch (error) {
      console.error('Erreur lors du chargement du dashboard:', error);
    } finally {
      setLoading(false);
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
      {/* En-tête */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Tableau de Bord Ventes</h1>
        <p className="text-gray-600 mt-1">Vue d'ensemble des performances commerciales</p>
      </div>

      {/* Statistiques */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, index) => (
          <div
            key={index}
            className={`${stat.color} border rounded-lg p-4 flex items-center justify-between`}
          >
            <div>
              <p className="text-sm text-gray-600">{stat.title}</p>
              <p className="text-2xl font-bold mt-1">{stat.value}</p>
              <div className="flex items-center mt-2">
                <FiTrendingUp className="text-green-500 mr-1" size={14} />
                <span className="text-sm text-green-600">{stat.change}</span>
                <span className="text-sm text-gray-500 ml-2">{stat.detail}</span>
              </div>
            </div>
            <div className="p-3 bg-white rounded-lg shadow-sm">
              {stat.icon}
            </div>
          </div>
        ))}
      </div>

      {/* Grille principale */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Dernières commandes */}
        <div className="lg:col-span-2 bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-lg font-semibold text-gray-900">Dernières Commandes Client</h2>
              <button className="text-blue-600 hover:text-blue-800 text-sm font-medium">
                Voir tout →
              </button>
            </div>
            
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead>
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      N° Commande
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Client
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Montant
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Statut
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Livraison
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {recentCommandes.map((commande) => (
                    <tr key={commande.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <span className="font-medium text-gray-900">{commande.number}</span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700">
                        {commande.client}
                      </td>
                      <td className="px-4 py-3">
                        <span className="font-semibold">{commande.amount}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          commande.status === 'Confirmée' ? 'bg-green-100 text-green-800' :
                          commande.status === 'En attente' ? 'bg-yellow-100 text-yellow-800' :
                          commande.status === 'Facturée' ? 'bg-blue-100 text-blue-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          {commande.status}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          commande.delivery === 'Livrée' ? 'bg-green-100 text-green-800' :
                          commande.delivery === 'En préparation' ? 'bg-yellow-100 text-yellow-800' :
                          commande.delivery === 'Expédiée' ? 'bg-blue-100 text-blue-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          {commande.delivery}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500">
                        <FiCalendar className="inline mr-1" size={14} />
                        {commande.date}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Top produits */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-lg font-semibold text-gray-900">Top Produits</h2>
              <FiPieChart className="text-blue-500" size={20} />
            </div>
            
            <div className="space-y-4">
              {topProduits.map((produit, index) => (
                <div key={index} className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-medium text-gray-900">{produit.name}</h3>
                      <div className="flex items-center mt-2">
                        <FiPackage className="text-gray-400 mr-2" size={14} />
                        <span className="text-sm text-gray-600">{produit.sales} ventes</span>
                      </div>
                    </div>
                    <span className="text-green-600 font-medium">{produit.growth}</span>
                  </div>
                  <div className="mt-3 pt-3 border-t border-gray-100">
                    <div className="flex justify-between items-center">
                      <span className="text-lg font-bold">{produit.revenue}</span>
                      <div className="w-24 h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-blue-600" 
                          style={{ width: `${Math.min(100, (produit.sales / 50) * 100)}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Graphique rapide */}
            <div className="mt-8 pt-6 border-t border-gray-200">
              <h3 className="text-md font-medium text-gray-900 mb-4">Évolution mensuelle</h3>
              <div className="flex items-end h-32 space-x-2">
                {[40, 60, 75, 90, 85, 95, 100].map((height, idx) => (
                  <div key={idx} className="flex-1 flex flex-col items-center">
                    <div 
                      className="w-full bg-gradient-to-t from-blue-500 to-blue-300 rounded-t-lg"
                      style={{ height: `${height}%` }}
                    ></div>
                    <span className="text-xs text-gray-500 mt-1">S{idx+1}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Deuxième ligne */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top clients */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Top Clients</h2>
            <button className="text-blue-600 hover:text-blue-800 text-sm font-medium">
              Voir tout →
            </button>
          </div>
          <div className="space-y-3">
            {topClients.map((client, index) => (
              <div key={index} className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-lg">
                <div className="flex items-center">
                  <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center mr-3">
                    <span className="text-blue-700 font-bold">{client.name.charAt(0)}</span>
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{client.name}</p>
                    <p className="text-sm text-gray-600">{client.loyalty}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-semibold">{client.amount}</p>
                  <p className="text-sm text-gray-600">{client.orders} commandes</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Objectifs commerciaux */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Objectifs du Mois</h2>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-gray-600">Chiffre d'affaires</span>
                <span className="font-medium">€245,800 / €300,000</span>
              </div>
              <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-green-500 to-green-400" 
                  style={{ width: '82%' }}
                ></div>
              </div>
            </div>
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-gray-600">Nouvelles commandes</span>
                <span className="font-medium">156 / 200</span>
              </div>
              <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-blue-500 to-blue-400" 
                  style={{ width: '78%' }}
                ></div>
              </div>
            </div>
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-gray-600">Taux de conversion</span>
                <span className="font-medium">68%</span>
              </div>
              <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-purple-500 to-purple-400" 
                  style={{ width: '68%' }}
                ></div>
              </div>
            </div>
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-gray-600">Satisfaction client</span>
                <span className="font-medium">94%</span>
              </div>
              <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-amber-500 to-amber-400" 
                  style={{ width: '94%' }}
                ></div>
              </div>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-gray-200">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Progression globale</span>
              <span className="font-bold text-lg text-green-600">+18%</span>
            </div>
          </div>
        </div>
      </div>

      {/* Actions rapides */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Actions Rapides</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <button className="p-4 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors text-sm font-medium flex flex-col items-center">
            <FiShoppingCart size={24} className="mb-2" />
            Nouvelle Commande
          </button>
          <button className="p-4 bg-green-50 text-green-700 rounded-lg hover:bg-green-100 transition-colors text-sm font-medium flex flex-col items-center">
            <FiBarChart2 size={24} className="mb-2" />
            Rapport Ventes
          </button>
          <button className="p-4 bg-purple-50 text-purple-700 rounded-lg hover:bg-purple-100 transition-colors text-sm font-medium flex flex-col items-center">
            <FiUsers size={24} className="mb-2" />
            Gérer Clients
          </button>
          <button className="p-4 bg-amber-50 text-amber-700 rounded-lg hover:bg-amber-100 transition-colors text-sm font-medium flex flex-col items-center">
            <FiTarget size={24} className="mb-2" />
            Définir Objectifs
          </button>
        </div>
      </div>
    </div>
  );
}