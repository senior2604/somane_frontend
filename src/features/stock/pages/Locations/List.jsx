import React, { useState, useEffect } from 'react';

const LocationsList = () => {
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    // Simuler des données - à remplacer avec des appels API réels
    setTimeout(() => {
      setLocations([
        { id: 1, name: 'Entrepôt Principal', code: 'WH/001', type: 'internal', parent: null },
        { id: 2, name: 'Zone Réception', code: 'WH/001/REC', type: 'internal', parent: 'Entrepôt Principal' },
        { id: 3, name: 'Zone Expédition', code: 'WH/001/EXP', type: 'internal', parent: 'Entrepôt Principal' },
        { id: 4, name: 'Stock Produits Finis', code: 'WH/001/PF', type: 'internal', parent: 'Entrepôt Principal' },
        { id: 5, name: 'Stock Matières Premières', code: 'WH/001/MP', type: 'internal', parent: 'Entrepôt Principal' },
        { id: 6, name: 'Zone Quarantaine', code: 'WH/001/QT', type: 'inventory', parent: 'Entrepôt Principal' },
        { id: 7, name: 'Magasin Ventas', code: 'ST/001', type: 'customer', parent: null },
        { id: 8, name: 'Fournisseur Principal', code: 'SUP/001', type: 'supplier', parent: null },
      ]);
      setLoading(false);
    }, 1000);
  }, []);

  const filteredLocations = locations.filter(location =>
    location.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    location.code.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getTypeLabel = (type) => {
    const types = {
      'internal': 'Interne',
      'customer': 'Client',
      'supplier': 'Fournisseur',
      'inventory': 'Inventaire',
      'production': 'Production',
      'transit': 'Transit'
    };
    return types[type] || type;
  };

  const getTypeColor = (type) => {
    const colors = {
      'internal': 'bg-blue-100 text-blue-800',
      'customer': 'bg-green-100 text-green-800',
      'supplier': 'bg-purple-100 text-purple-800',
      'inventory': 'bg-yellow-100 text-yellow-800',
      'production': 'bg-red-100 text-red-800',
      'transit': 'bg-gray-100 text-gray-800'
    };
    return colors[type] || 'bg-gray-100 text-gray-800';
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
        <h2 className="text-2xl font-bold text-gray-900">Emplacements de Stock</h2>
        <button className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors">
          Nouvel Emplacement
        </button>
      </div>

      {/* Barre de recherche et filtres */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <input
              type="text"
              placeholder="Rechercher par nom ou code..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <select className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500">
            <option value="">Tous les types</option>
            <option value="internal">Interne</option>
            <option value="customer">Client</option>
            <option value="supplier">Fournisseur</option>
            <option value="inventory">Inventaire</option>
          </select>
        </div>
      </div>

      {/* Tableau des emplacements */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">
            {filteredLocations.length} emplacement{filteredLocations.length > 1 ? 's' : ''}
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Code
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Nom
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Parent
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredLocations.map((location) => (
                <tr key={location.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {location.code}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {location.name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getTypeColor(location.type)}`}>
                      {getTypeLabel(location.type)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {location.parent || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex space-x-2">
                      <button className="text-blue-600 hover:text-blue-900">
                        Modifier
                      </button>
                      <button className="text-red-600 hover:text-red-900">
                        Supprimer
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {filteredLocations.length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-500">Aucun emplacement trouvé</p>
        </div>
      )}
    </div>
  );
};

export default LocationsList;
