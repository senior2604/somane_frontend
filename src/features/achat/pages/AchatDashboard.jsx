// features/achats/pages/AchatDashboard.jsx
import React from 'react';
import { 
  FiShoppingCart, 
  FiFileText, 
  FiPackage, 
  FiDollarSign,
  FiTrendingUp,
  FiCalendar,
  FiDollarSign as FiDollar
} from 'react-icons/fi';

export default function AchatDashboard() {
  // Données fictives pour le dashboard
  const stats = [
    {
      title: "Bons de Commande",
      value: "45",
      change: "+12%",
      icon: <FiFileText className="text-violet-600" size={24} />,
      color: "bg-violet-50 border-violet-200"
    },
    {
      title: "Demandes d'Achat",
      value: "28",
      change: "+5%",
      icon: <FiShoppingCart className="text-blue-600" size={24} />,
      color: "bg-blue-50 border-blue-200"
    },
    {
      title: "Fournisseurs Actifs",
      value: "15",
      change: "+3%",
      icon: <FiDollarSign className="text-green-600" size={24} />,
      color: "bg-green-50 border-green-200"
    },
    {
      title: "Montant Total",
      value: "€124,500",
      change: "+18%",
      icon: <FiDollar className="text-amber-600" size={24} />,
      color: "bg-amber-50 border-amber-200"
    }
  ];

  const recentOrders = [
    { id: 1, number: "BC-2024-001", supplier: "Fournisseur A", amount: "€12,500", status: "Confirmé", date: "2024-01-15" },
    { id: 2, number: "BC-2024-002", supplier: "Fournisseur B", amount: "€8,200", status: "En attente", date: "2024-01-14" },
    { id: 3, number: "BC-2024-003", supplier: "Fournisseur C", amount: "€5,700", status: "Livré", date: "2024-01-13" },
    { id: 4, number: "BC-2024-004", supplier: "Fournisseur D", amount: "€9,800", status: "Confirmé", date: "2024-01-12" },
    { id: 5, number: "BC-2024-005", supplier: "Fournisseur E", amount: "€3,200", status: "Annulé", date: "2024-01-11" }
  ];

  const pendingRequests = [
    { id: 1, number: "DA-2024-001", department: "Production", items: 5, status: "En validation" },
    { id: 2, number: "DA-2024-002", department: "Marketing", items: 3, status: "En cours" },
    { id: 3, number: "DA-2024-003", department: "IT", items: 2, status: "Approuvé" },
    { id: 4, number: "DA-2024-004", department: "RH", items: 1, status: "En attente" }
  ];

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Tableau de Bord Achats</h1>
        <p className="text-gray-600 mt-1">Vue d'ensemble des activités d'achat</p>
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
                <span className="text-sm text-gray-500 ml-2">vs mois dernier</span>
              </div>
            </div>
            <div className="p-3 bg-white rounded-lg">
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
              <h2 className="text-lg font-semibold text-gray-900">Derniers Bons de Commande</h2>
              <button className="text-violet-600 hover:text-violet-800 text-sm font-medium">
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
                      Fournisseur
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Montant
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Statut
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {recentOrders.map((order) => (
                    <tr key={order.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <span className="font-medium text-gray-900">{order.number}</span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700">
                        {order.supplier}
                      </td>
                      <td className="px-4 py-3">
                        <span className="font-semibold">{order.amount}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          order.status === 'Confirmé' ? 'bg-green-100 text-green-800' :
                          order.status === 'En attente' ? 'bg-yellow-100 text-yellow-800' :
                          order.status === 'Livré' ? 'bg-blue-100 text-blue-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          {order.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500">
                        <FiCalendar className="inline mr-1" size={14} />
                        {order.date}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Demandes en attente */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-6">Demandes en Attente</h2>
            
            <div className="space-y-4">
              {pendingRequests.map((request) => (
                <div key={request.id} className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-medium text-gray-900">{request.number}</h3>
                      <p className="text-sm text-gray-600 mt-1">{request.department}</p>
                    </div>
                    <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                      request.status === 'Approuvé' ? 'bg-green-100 text-green-800' :
                      request.status === 'En validation' ? 'bg-yellow-100 text-yellow-800' :
                      request.status === 'En cours' ? 'bg-blue-100 text-blue-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {request.status}
                    </span>
                  </div>
                  <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100">
                    <div className="flex items-center text-sm text-gray-600">
                      <FiPackage className="mr-1" size={14} />
                      {request.items} article(s)
                    </div>
                    <button className="text-violet-600 hover:text-violet-800 text-sm font-medium">
                      Détails →
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Actions rapides */}
            <div className="mt-8 pt-6 border-t border-gray-200">
              <h3 className="text-md font-medium text-gray-900 mb-4">Actions Rapides</h3>
              <div className="grid grid-cols-2 gap-3">
                <button className="p-3 bg-violet-50 text-violet-700 rounded-lg hover:bg-violet-100 transition-colors text-sm font-medium flex flex-col items-center">
                  <FiFileText size={20} className="mb-2" />
                  Nouveau Bon
                </button>
                <button className="p-3 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors text-sm font-medium flex flex-col items-center">
                  <FiShoppingCart size={20} className="mb-2" />
                  Nouvelle Demande
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Graphique et synthèse */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Synthèse mensuelle */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Synthèse Mensuelle</h2>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-gray-600">Commandes passées</span>
                <span className="font-medium">12</span>
              </div>
              <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                <div className="h-full bg-violet-600" style={{ width: '80%' }}></div>
              </div>
            </div>
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-gray-600">Demandes traitées</span>
                <span className="font-medium">18</span>
              </div>
              <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                <div className="h-full bg-blue-600" style={{ width: '90%' }}></div>
              </div>
            </div>
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-gray-600">Montant total</span>
                <span className="font-medium">€45,230</span>
              </div>
              <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                <div className="h-full bg-green-600" style={{ width: '65%' }}></div>
              </div>
            </div>
          </div>
        </div>

        {/* Fournisseurs actifs */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Top Fournisseurs</h2>
            <button className="text-violet-600 hover:text-violet-800 text-sm font-medium">
              Voir tout →
            </button>
          </div>
          <div className="space-y-3">
            {[
              { name: "Fournisseur A", amount: "€28,500", orders: 8 },
              { name: "Fournisseur B", amount: "€21,200", orders: 5 },
              { name: "Fournisseur C", amount: "€18,700", orders: 4 },
              { name: "Fournisseur D", amount: "€15,400", orders: 3 }
            ].map((supplier, index) => (
              <div key={index} className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-lg">
                <div className="flex items-center">
                  <div className="w-8 h-8 bg-violet-100 rounded-lg flex items-center justify-center mr-3">
                    <span className="text-violet-700 font-bold">{supplier.name.charAt(0)}</span>
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{supplier.name}</p>
                    <p className="text-sm text-gray-600">{supplier.orders} commandes</p>
                  </div>
                </div>
                <span className="font-semibold">{supplier.amount}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}