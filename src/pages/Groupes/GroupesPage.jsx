import React, { useState, useEffect } from 'react';
import { apiClient } from '../../services/apiClient';

export default function GroupsPage() {
  const [groupes, setGroupes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editingGroup, setEditingGroup] = useState(null);
  
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchGroupes();
  }, []);

  const fetchGroupes = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await apiClient.get('/groupes/'); // ✅ CORRIGÉ
      
      let groupesData = [];
      if (Array.isArray(response)) {
        groupesData = response;
      } else if (response && Array.isArray(response.results)) {
        groupesData = response.results;
      } else if (response && Array.isArray(response.data)) {
        groupesData = response.data;
      } else {
        setError('Format de données inattendu');
        groupesData = [];
      }

      setGroupes(groupesData);
    } catch (err) {
      console.error('❌ Erreur lors du chargement des groupes:', err);
      setError('Erreur lors du chargement des groupes');
    } finally {
      setLoading(false);
    }
  };

  // Filtrage et recherche
  const filteredGroupes = groupes.filter(group => 
    group.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (group.description && group.description.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  // Calculs pour la pagination
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentGroupes = filteredGroupes.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredGroupes.length / itemsPerPage);

  // Changement de page
  const paginate = (pageNumber) => setCurrentPage(pageNumber);
  const nextPage = () => currentPage < totalPages && setCurrentPage(currentPage + 1);
  const prevPage = () => currentPage > 1 && setCurrentPage(currentPage - 1);

  // Gestion des actions
  const handleNewGroup = () => {
    setEditingGroup(null);
    setShowForm(true);
  };

  const handleEdit = (group) => {
    setEditingGroup(group);
    setShowForm(true);
  };

  const handleDelete = async (group) => {
    if (window.confirm(`Êtes-vous sûr de vouloir supprimer le groupe "${group.name}" ?`)) {
      try {
        await apiClient.delete(`/groupes/${group.id}/`); // ✅ CORRIGÉ
        fetchGroupes();
      } catch (err) {
        setError('Erreur lors de la suppression');
        console.error('Error deleting group:', err);
      }
    }
  };

  const handleFormSuccess = () => {
    setShowForm(false);
    setEditingGroup(null);
    fetchGroupes();
  };

  const handleRetry = () => {
    fetchGroupes();
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex justify-center items-center p-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-2">Chargement des groupes...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Groupes d'Utilisateurs</h1>
          <p className="text-gray-600 mt-1">
            {filteredGroupes.length} groupe(s) trouvé(s)
            {searchTerm && ' • Recherche active'}
          </p>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={handleRetry}
            className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Actualiser
          </button>
          <button 
            onClick={handleNewGroup}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Nouveau Groupe
          </button>
        </div>
      </div>

      {/* Message d'erreur */}
      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <svg className="w-5 h-5 text-red-600 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
              <span className="text-red-800 font-medium">{error}</span>
            </div>
            <button
              onClick={handleRetry}
              className="bg-red-600 text-white px-3 py-1 rounded text-sm hover:bg-red-700 transition-colors"
            >
              Réessayer
            </button>
          </div>
        </div>
      )}

      {/* Filtres et Recherche */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-300 p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Rechercher</label>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Nom, description..."
            />
          </div>
          <div className="flex items-end">
            <button
              onClick={() => {
                setSearchTerm('');
                setCurrentPage(1);
              }}
              className="w-full bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200 transition-colors border border-gray-300"
            >
              Réinitialiser
            </button>
          </div>
        </div>
      </div>

      {/* Statistiques */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-300 p-4">
          <div className="text-2xl font-bold text-blue-600">{groupes.length}</div>
          <div className="text-sm text-gray-600">Total des groupes</div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-300 p-4">
          <div className="text-2xl font-bold text-green-600">
            {groupes.filter(g => g.modules_autorises && g.modules_autorises.length > 0).length}
          </div>
          <div className="text-sm text-gray-600">Groupes avec permissions</div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-300 p-4">
          <div className="text-2xl font-bold text-purple-600">
            {groupes.reduce((total, group) => total + (group.user_count || 0), 0)}
          </div>
          <div className="text-sm text-gray-600">Utilisateurs totaux</div>
        </div>
      </div>

      {/* Tableau */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-300 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-300">
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700 border-r border-gray-300">
                  ID
                </th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700 border-r border-gray-300">
                  Nom du Groupe
                </th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700 border-r border-gray-300">
                  Description
                </th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700 border-r border-gray-300">
                  Modules Autorisés
                </th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700 border-r border-gray-300">
                  Utilisateurs
                </th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {currentGroupes.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-6 py-8 text-center text-gray-500 border-b border-gray-300">
                    {groupes.length === 0 ? 'Aucun groupe trouvé' : 'Aucun résultat pour votre recherche'}
                  </td>
                </tr>
              ) : (
                currentGroupes.map((group, index) => (
                  <tr 
                    key={group.id} 
                    className={`${
                      index % 2 === 0 ? 'bg-white' : 'bg-gray-50'
                    } hover:bg-gray-100 transition-colors border-b border-gray-300`}
                  >
                    <td className="px-6 py-4 text-sm text-gray-900 border-r border-gray-300 font-mono">
                      {group.id}
                    </td>
                    <td className="px-6 py-4 text-sm font-medium text-gray-900 border-r border-gray-300">
                      {group.name}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600 border-r border-gray-300">
                      {group.description || '-'}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600 border-r border-gray-300">
                      <div className="flex flex-wrap gap-1">
                        {group.modules_autorises && group.modules_autorises.length > 0 ? (
                          group.modules_autorises.slice(0, 3).map((module, idx) => (
                            <span key={idx} className="inline-flex px-2 py-1 rounded text-xs bg-blue-100 text-blue-800">
                              {module}
                            </span>
                          ))
                        ) : (
                          <span className="text-gray-400">Aucun module</span>
                        )}
                        {group.modules_autorises && group.modules_autorises.length > 3 && (
                          <span className="inline-flex px-2 py-1 rounded text-xs bg-gray-100 text-gray-600">
                            +{group.modules_autorises.length - 3}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600 border-r border-gray-300">
                      <span className="inline-flex px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        {group.user_count || 0} utilisateur(s)
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex space-x-3">
                        <button 
                          onClick={() => handleEdit(group)}
                          className="text-blue-600 hover:text-blue-800 text-sm font-medium transition-colors flex items-center gap-1"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                          Éditer
                        </button>
                        <button 
                          onClick={() => handleDelete(group)}
                          className="text-red-600 hover:text-red-800 text-sm font-medium transition-colors flex items-center gap-1"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                          Supprimer
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {filteredGroupes.length > 0 && (
          <div className="px-6 py-4 bg-gray-50 border-t border-gray-300">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <span className="text-sm text-gray-700">
                  Lignes par page:
                </span>
                <select
                  value={itemsPerPage}
                  onChange={(e) => {
                    setItemsPerPage(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                  className="border border-gray-300 rounded px-3 py-1 text-sm"
                >
                  <option value={5}>5</option>
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                  <option value={50}>50</option>
                </select>
                <span className="text-sm text-gray-700">
                  {indexOfFirstItem + 1}-{Math.min(indexOfLastItem, filteredGroupes.length)} sur {filteredGroupes.length}
                </span>
              </div>

              <div className="flex items-center space-x-2">
                <button
                  onClick={prevPage}
                  disabled={currentPage === 1}
                  className={`px-3 py-1 rounded border text-sm ${
                    currentPage === 1
                      ? 'bg-gray-100 text-gray-400 border-gray-300 cursor-not-allowed'
                      : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  Précédent
                </button>

                {/* Numéros de page */}
                <div className="flex space-x-1">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNumber;
                    if (totalPages <= 5) {
                      pageNumber = i + 1;
                    } else if (currentPage <= 3) {
                      pageNumber = i + 1;
                    } else if (currentPage >= totalPages - 2) {
                      pageNumber = totalPages - 4 + i;
                    } else {
                      pageNumber = currentPage - 2 + i;
                    }

                    return (
                      <button
                        key={pageNumber}
                        onClick={() => paginate(pageNumber)}
                        className={`w-8 h-8 rounded border text-sm ${
                          currentPage === pageNumber
                            ? 'bg-blue-600 text-white border-blue-600'
                            : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                        }`}
                      >
                        {pageNumber}
                      </button>
                    );
                  })}
                </div>

                <button
                  onClick={nextPage}
                  disabled={currentPage === totalPages}
                  className={`px-3 py-1 rounded border text-sm ${
                    currentPage === totalPages
                      ? 'bg-gray-100 text-gray-400 border-gray-300 cursor-not-allowed'
                      : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  Suivant
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Formulaire Modal */}
      {showForm && (
        <GroupFormModal
          group={editingGroup}
          onClose={() => {
            setShowForm(false);
            setEditingGroup(null);
          }}
          onSuccess={handleFormSuccess}
        />
      )}
    </div>
  );
}

// Composant Modal pour le formulaire des groupes
function GroupFormModal({ group, onClose, onSuccess }) {
  const [formData, setFormData] = useState({
    name: group?.name || '',
    description: group?.description || '',
    modules_autorises: group?.modules_autorises || [],
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Liste des modules disponibles
  const availableModules = [
    'Core/Noyau',
    'Achat',
    'Vente', 
    'Comptabilité',
    'RH/Paie',
    'Stock',
    'Production',
    'Projet',
    'CRM',
    'Maintenance'
  ];

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const url = group 
        ? `/groupes/${group.id}/` // ✅ CORRIGÉ
        : `/groupes/`; // ✅ CORRIGÉ
      
      const method = group ? 'PUT' : 'POST';

      await apiClient.request(url, {
        method: method,
        body: JSON.stringify(formData),
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      onSuccess();
    } catch (err) {
      const errorMessage = err.message || 'Erreur lors de la sauvegarde';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const toggleModule = (module) => {
    const currentModules = formData.modules_autorises || [];
    const newModules = currentModules.includes(module)
      ? currentModules.filter(m => m !== module)
      : [...currentModules, module];
    
    handleChange('modules_autorises', newModules);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-800">
            {group ? 'Modifier le groupe' : 'Créer un nouveau groupe'}
          </h2>
        </div>
        
        {error && (
          <div className="mx-6 mt-4 bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-center">
              <svg className="w-5 h-5 text-red-600 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
              <span className="text-red-800 text-sm">{error}</span>
            </div>
          </div>
        )}
        
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Informations Générales */}
          <div className="border-b border-gray-200 pb-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Informations Générales</h3>
            <div className="grid grid-cols-1 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nom du Groupe *
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => handleChange('name', e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Ex: Administrateurs, Managers, Opérateurs..."
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => handleChange('description', e.target.value)}
                  rows={3}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Description du groupe et de ses permissions..."
                />
              </div>
            </div>
          </div>

          {/* Modules Autorisés */}
          <div className="border-b border-gray-200 pb-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Modules Autorisés</h3>
            <p className="text-sm text-gray-600 mb-4">
              Sélectionnez les modules auxquels ce groupe aura accès
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {availableModules.map(module => (
                <label key={module} className="flex items-center space-x-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.modules_autorises.includes(module)}
                    onChange={() => toggleModule(module)}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm font-medium text-gray-700">{module}</span>
                </label>
              ))}
            </div>
          </div>
          
          <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors duration-200"
              disabled={loading}
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors duration-200 flex items-center space-x-2"
            >
              {loading && (
                <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
                </svg>
              )}
              <span>{loading ? 'Sauvegarde...' : group ? 'Mettre à jour' : 'Créer le groupe'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}