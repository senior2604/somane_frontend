import React, { useState, useEffect } from 'react';

const StockPickingsList = () => {
  const [pickings, setPickings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('');

  useEffect(() => {
    // Simuler des données - à remplacer avec des appels API réels
    setTimeout(() => {
      setPickings([
        {
          id: 1,
          name: 'RECV/2026/001',
          picking_type: 'Réception',
          location_src: 'Fournisseur Principal',
          location_dest: 'Zone Réception',
          state: 'confirmed',
          scheduled_date: '2026-04-14 10:00',
          priority: 'normal'
        },
        {
          id: 2,
          name: 'TRANS/2026/002',
          picking_type: 'Transfert Interne',
          location_src: 'Stock Matières Premières',
          location_dest: 'Zone Production',
          state: 'assigned',
          scheduled_date: '2026-04-14 14:00',
          priority: 'urgent'
        },
        {
          id: 3,
          name: 'LIVR/2026/003',
          picking_type: 'Livraison',
          location_src: 'Stock Produits Finis',
          location_dest: 'Magasin Ventas',
          state: 'done',
          scheduled_date: '2026-04-13 16:00',
          priority: 'normal'
        },
        {
          id: 4,
          name: 'RECV/2026/004',
          picking_type: 'Réception',
          location_src: 'Fournisseur Secondaire',
          location_dest: 'Zone Réception',
          state: 'draft',
          scheduled_date: '2026-04-15 09:00',
          priority: 'normal'
        },
        {
          id: 5,
          name: 'TRANS/2026/005',
          picking_type: 'Transfert Interne',
          location_src: 'Zone Production',
          location_dest: 'Stock Produits Finis',
          state: 'waiting',
          scheduled_date: '2026-04-14 16:00',
          priority: 'high'
        }
      ]);
      setLoading(false);
    }, 1000);
  }, []);

  const filteredPickings = pickings.filter(picking => 
    filterStatus === '' || picking.state === filterStatus
  );

  const getStateLabel = (state) => {
    const states = {
      'draft': 'Brouillon',
      'confirmed': 'Confirmé',
      'assigned': 'Assigné',
      'partially_available': 'Partiellement disponible',
      'waiting': 'En attente',
      'done': 'Terminé',
      'cancel': 'Annulé'
    };
    return states[state] || state;
  };

  const getStateColor = (state) => {
    const colors = {
      'draft': 'bg-gray-100 text-gray-800',
      'confirmed': 'bg-blue-100 text-blue-800',
      'assigned': 'bg-yellow-100 text-yellow-800',
      'partially_available': 'bg-orange-100 text-orange-800',
      'waiting': 'bg-purple-100 text-purple-800',
      'done': 'bg-green-100 text-green-800',
      'cancel': 'bg-red-100 text-red-800'
    };
    return colors[state] || 'bg-gray-100 text-gray-800';
  };

  const getPriorityLabel = (priority) => {
    const priorities = {
      'not_urgent': 'Non urgent',
      'normal': 'Normal',
      'urgent': 'Urgent',
      'very_urgent': 'Très urgent'
    };
    return priorities[priority] || priority;
  };

  const getPriorityColor = (priority) => {
    const colors = {
      'not_urgent': 'bg-green-100 text-green-800',
      'normal': 'bg-gray-100 text-gray-800',
      'urgent': 'bg-orange-100 text-orange-800',
      'very_urgent': 'bg-red-100 text-red-800'
    };
    return colors[priority] || 'bg-gray-100 text-gray-800';
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
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">Mouvements de Stock</h2>
        <button className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors">
          Nouveau Mouvement
        </button>
      </div>

      {/* Filtres */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Tous les états</option>
              <option value="draft">Brouillon</option>
              <option value="confirmed">Confirmé</option>
              <option value="assigned">Assigné</option>
              <option value="waiting">En attente</option>
              <option value="done">Terminé</option>
              <option value="cancel">Annulé</option>
            </select>
          </div>
          <button className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors">
            Réinitialiser
          </button>
        </div>
      </div>

      {/* Tableau des mouvements */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">
            {filteredPickings.length} mouvement{filteredPickings.length > 1 ? 's' : ''}
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Référence
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Source
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Destination
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  État
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Priorité
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date prévue
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredPickings.map((picking) => (
                <tr key={picking.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {picking.name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {picking.picking_type}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {picking.location_src}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {picking.location_dest}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStateColor(picking.state)}`}>
                      {getStateLabel(picking.state)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getPriorityColor(picking.priority)}`}>
                      {getPriorityLabel(picking.priority)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(picking.scheduled_date).toLocaleString('fr-FR')}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex space-x-2">
                      <button className="text-blue-600 hover:text-blue-900">
                        Voir
                      </button>
                      <button className="text-green-600 hover:text-green-900">
                        Modifier
                      </button>
                      {picking.state === 'confirmed' && (
                        <button className="text-yellow-600 hover:text-yellow-900">
                          Assigner
                        </button>
                      )}
                      {picking.state === 'assigned' && (
                        <button className="text-purple-600 hover:text-purple-900">
                          Terminer
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {filteredPickings.length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-500">Aucun mouvement trouvé</p>
        </div>
      )}
    </div>
  );
};

export default StockPickingsList;
