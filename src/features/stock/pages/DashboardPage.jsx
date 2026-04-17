import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

const DashboardPage = () => {
  const [stats, setStats] = useState({
    totalMovements: 0,
    pendingMovements: 0,
    completedMovements: 0,
    totalLocations: 0,
    lowStockItems: 0
  });

  useEffect(() => {
    // Simuler des données - à remplacer avec des appels API réels
    setStats({
      totalMovements: 156,
      pendingMovements: 23,
      completedMovements: 133,
      totalLocations: 12,
      lowStockItems: 8
    });
  }, []);

  const StatCard = ({ title, value, color, link }) => (
    <Link to={link} className="block">
      <div className={`${color} rounded-lg p-6 text-white hover:opacity-90 transition-opacity`}>
        <h3 className="text-lg font-medium mb-2">{title}</h3>
        <p className="text-3xl font-bold">{value}</p>
      </div>
    </Link>
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-3xl font-bold text-gray-900">Tableau de bord Stock</h2>
        <div className="flex space-x-2">
          <button className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors">
            Nouveau Mouvement
          </button>
          <button className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors">
            Inventaire
          </button>
        </div>
      </div>

      {/* Statistiques */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <StatCard
          title="Total Mouvements"
          value={stats.totalMovements}
          color="bg-blue-600"
          link="/stock/pickings"
        />
        <StatCard
          title="En Attente"
          value={stats.pendingMovements}
          color="bg-yellow-600"
          link="/stock/pickings"
        />
        <StatCard
          title="Terminés"
          value={stats.completedMovements}
          color="bg-green-600"
          link="/stock/pickings"
        />
        <StatCard
          title="Emplacements"
          value={stats.totalLocations}
          color="bg-purple-600"
          link="/stock/locations"
        />
        <StatCard
          title="Stock Faible"
          value={stats.lowStockItems}
          color="bg-red-600"
          link="/stock/alerts"
        />
      </div>

      {/* Mouvements récents */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Mouvements récents</h3>
        </div>
        <div className="p-6">
          <div className="space-y-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex items-center justify-between py-3 border-b border-gray-100 last:border-0">
                <div className="flex items-center space-x-4">
                  <div className={`w-3 h-3 rounded-full ${
                    i % 3 === 0 ? 'bg-green-500' : i % 3 === 1 ? 'bg-yellow-500' : 'bg-blue-500'
                  }`}></div>
                  <div>
                    <p className="font-medium text-gray-900">Mouvement #{1000 + i}</p>
                    <p className="text-sm text-gray-500">
                      {i % 3 === 0 ? 'Réception' : i % 3 === 1 ? 'Transfert interne' : 'Livraison'}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-500">il y a {i * 2}h</p>
                  <p className="text-sm font-medium text-gray-900">
                    {i % 3 === 0 ? 'Confirmé' : i % 3 === 1 ? 'En attente' : 'Terminé'}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Actions rapides */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Actions rapides</h3>
          <div className="space-y-2">
            <button className="w-full text-left px-4 py-2 bg-gray-50 rounded hover:bg-gray-100 transition-colors">
              Créer un transfert
            </button>
            <button className="w-full text-left px-4 py-2 bg-gray-50 rounded hover:bg-gray-100 transition-colors">
              Nouvel emplacement
            </button>
            <button className="w-full text-left px-4 py-2 bg-gray-50 rounded hover:bg-gray-100 transition-colors">
              Gérer les lots
            </button>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Rapports</h3>
          <div className="space-y-2">
            <button className="w-full text-left px-4 py-2 bg-gray-50 rounded hover:bg-gray-100 transition-colors">
              Mouvements du jour
            </button>
            <button className="w-full text-left px-4 py-2 bg-gray-50 rounded hover:bg-gray-100 transition-colors">
              État des stocks
            </button>
            <button className="w-full text-left px-4 py-2 bg-gray-50 rounded hover:bg-gray-100 transition-colors">
              Analyse des retours
            </button>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Alertes</h3>
          <div className="space-y-2">
            <div className="flex items-center justify-between py-2">
              <span className="text-sm text-gray-600">Stock faible</span>
              <span className="bg-red-100 text-red-800 text-xs px-2 py-1 rounded">8</span>
            </div>
            <div className="flex items-center justify-between py-2">
              <span className="text-sm text-gray-600">En retard</span>
              <span className="bg-yellow-100 text-yellow-800 text-xs px-2 py-1 rounded">3</span>
            </div>
            <div className="flex items-center justify-between py-2">
              <span className="text-sm text-gray-600">À valider</span>
              <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded">12</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;
