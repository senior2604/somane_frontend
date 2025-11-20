import React, { useState, useEffect } from 'react';
import { apiClient } from '../../services/apiClient';

export default function ModulesPage() {
  const [modules, setModules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editingModule, setEditingModule] = useState(null);
  const [showDependances, setShowDependances] = useState(false);
  const [selectedModule, setSelectedModule] = useState(null);
  
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatut, setFilterStatut] = useState('');
  const [filterApplication, setFilterApplication] = useState('');

  useEffect(() => {
    fetchModules();
  }, []);

  const fetchModules = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await apiClient.get('/modules/');
      
      let modulesData = [];
      if (Array.isArray(response)) {
        modulesData = response;
      } else if (response && Array.isArray(response.results)) {
        modulesData = response.results;
      } else {
        setError('Format de données inattendu');
        modulesData = [];
      }

      setModules(modulesData);
    } catch (err) {
      console.error('❌ Erreur lors du chargement des modules:', err);
      setError('Erreur lors du chargement des modules');
    } finally {
      setLoading(false);
    }
  };

  // Filtrage et recherche
  const filteredModules = modules.filter(module => {
    const matchesSearch = 
      module.nom?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      module.nom_affiche?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      module.description?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatut = filterStatut === '' || 
      module.statut === filterStatut;
    
    const matchesApplication = filterApplication === '' || 
      module.application.toString() === filterApplication;
    
    return matchesSearch && matchesStatut && matchesApplication;
  });

  // Calculs pour la pagination
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentModules = Array.isArray(filteredModules) ? filteredModules.slice(indexOfFirstItem, indexOfLastItem) : [];
  const totalPages = Math.ceil((Array.isArray(filteredModules) ? filteredModules.length : 0) / itemsPerPage);

  // Changement de page
  const paginate = (pageNumber) => setCurrentPage(pageNumber);
  const nextPage = () => currentPage < totalPages && setCurrentPage(currentPage + 1);
  const prevPage = () => currentPage > 1 && setCurrentPage(currentPage - 1);

  // Gestion des actions
  const handleNewModule = () => {
    setEditingModule(null);
    setShowForm(true);
  };

  const handleEdit = (module) => {
    setEditingModule(module);
    setShowForm(true);
  };

  const handleDelete = async (module) => {
    if (window.confirm(`Êtes-vous sûr de vouloir supprimer le module "${module.nom_affiche}" ?`)) {
      try {
        await apiClient.delete(`/modules/${module.id}/`);
        fetchModules();
      } catch (err) {
        setError('Erreur lors de la suppression');
        console.error('Error deleting module:', err);
      }
    }
  };

  const handleToggleStatut = async (module) => {
    try {
      const nouveauStatut = module.statut === 'actif' ? 'inactif' : 'actif';
      await apiClient.patch(`/modules/${module.id}/`, {
        statut: nouveauStatut
      });
      fetchModules();
    } catch (err) {
      setError('Erreur lors de la modification');
      console.error('Error toggling statut:', err);
    }
  };

  const handleToggleApplication = async (module) => {
    try {
      await apiClient.patch(`/modules/${module.id}/`, {
        application: !module.application
      });
      fetchModules();
    } catch (err) {
      setError('Erreur lors de la modification');
      console.error('Error toggling application:', err);
    }
  };

  const handleToggleVisible = async (module) => {
    try {
      await apiClient.patch(`/modules/${module.id}/`, {
        visible: !module.visible
      });
      fetchModules();
    } catch (err) {
      setError('Erreur lors de la modification');
      console.error('Error toggling visible:', err);
    }
  };

  const handleShowDependances = (module) => {
    setSelectedModule(module);
    setShowDependances(true);
  };

  const handleFormSuccess = () => {
    setShowForm(false);
    setEditingModule(null);
    fetchModules();
  };

  const handleRetry = () => {
    fetchModules();
  };

  const getStatutDisplay = (statut) => {
    const statuts = {
      'installe': 'Installé',
      'actif': 'Actif',
      'inactif': 'Inactif'
    };
    return statuts[statut] || statut;
  };

  const getStatutColor = (statut) => {
    switch (statut) {
      case 'actif':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'inactif':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'installe':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getDependancesNames = (module) => {
    if (!module.dependances || module.dependances.length === 0) {
      return 'Aucune';
    }
    return module.dependances.map(dep => dep.nom_affiche).join(', ');
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex justify-center items-center p-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-2">Chargement des modules...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Gestion des Modules</h1>
          <p className="text-gray-600 mt-1">
            {filteredModules.length} module(s) trouvé(s)
            {(searchTerm || filterStatut || filterApplication) && ' • Filtres actifs'}
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
            onClick={handleNewModule}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Nouveau Module
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
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Rechercher</label>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Nom, affichage, description..."
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Statut</label>
            <select
              value={filterStatut}
              onChange={(e) => setFilterStatut(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">Tous les statuts</option>
              <option value="installe">Installé</option>
              <option value="actif">Actif</option>
              <option value="inactif">Inactif</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Application</label>
            <select
              value={filterApplication}
              onChange={(e) => setFilterApplication(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">Tous les types</option>
              <option value="true">Application</option>
              <option value="false">Système</option>
            </select>
          </div>
          <div className="flex items-end">
            <button
              onClick={() => {
                setSearchTerm('');
                setFilterStatut('');
                setFilterApplication('');
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
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-300 p-4">
          <div className="text-2xl font-bold text-blue-600">{modules.length}</div>
          <div className="text-sm text-gray-600">Total des modules</div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-300 p-4">
          <div className="text-2xl font-bold text-green-600">
            {modules.filter(m => m.statut === 'actif').length}
          </div>
          <div className="text-sm text-gray-600">Modules actifs</div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-300 p-4">
          <div className="text-2xl font-bold text-purple-600">
            {modules.filter(m => m.application).length}
          </div>
          <div className="text-sm text-gray-600">Applications</div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-300 p-4">
          <div className="text-2xl font-bold text-orange-600">
            {modules.filter(m => m.visible).length}
          </div>
          <div className="text-sm text-gray-600">Modules visibles</div>
        </div>
      </div>

      {/* Tableau */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-300 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-300">
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700 border-r border-gray-300">
                  Module
                </th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700 border-r border-gray-300">
                  Version
                </th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700 border-r border-gray-300">
                  Dépendances
                </th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700 border-r border-gray-300">
                  Statut
                </th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700 border-r border-gray-300">
                  Type
                </th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700 border-r border-gray-300">
                  Visibilité
                </th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700 border-r border-gray-300">
                  Installation
                </th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {currentModules.length === 0 ? (
                <tr>
                  <td colSpan="8" className="px-6 py-8 text-center text-gray-500 border-b border-gray-300">
                    {modules.length === 0 ? 'Aucun module trouvé' : 'Aucun résultat pour votre recherche'}
                  </td>
                </tr>
              ) : (
                currentModules.map((module, index) => (
                  <tr 
                    key={module.id} 
                    className={`${
                      index % 2 === 0 ? 'bg-white' : 'bg-gray-50'
                    } hover:bg-gray-100 transition-colors border-b border-gray-300`}
                  >
                    <td className="px-6 py-4 border-r border-gray-300">
                      <div className="flex items-center space-x-3">
                        <div className="flex-shrink-0 w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                          <span className="text-blue-600 text-sm">
                            {module.icone || '📦'}
                          </span>
                        </div>
                        <div className="flex flex-col">
                          <span className="text-sm font-medium text-gray-900">
                            {module.nom_affiche}
                          </span>
                          <span className="text-xs text-gray-500 font-mono">
                            {module.nom}
                          </span>
                          {module.description && (
                            <span className="text-xs text-gray-400 mt-1">
                              {module.description.length > 50 
                                ? `${module.description.substring(0, 50)}...` 
                                : module.description
                              }
                            </span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 border-r border-gray-300">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 border border-gray-200">
                        v{module.version}
                      </span>
                    </td>
                    <td className="px-6 py-4 border-r border-gray-300">
                      <div className="max-w-xs">
                        <span className="text-sm text-gray-600">
                          {getDependancesNames(module)}
                        </span>
                        {module.dependances && module.dependances.length > 0 && (
                          <button
                            onClick={() => handleShowDependances(module)}
                            className="text-blue-600 hover:text-blue-800 text-xs ml-2"
                          >
                            Voir
                          </button>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 border-r border-gray-300">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatutColor(module.statut)}`}>
                        {getStatutDisplay(module.statut)}
                      </span>
                    </td>
                    <td className="px-6 py-4 border-r border-gray-300">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        module.application 
                          ? 'bg-purple-100 text-purple-800 border border-purple-200' 
                          : 'bg-gray-100 text-gray-800 border border-gray-200'
                      }`}>
                        {module.application ? 'Application' : 'Système'}
                      </span>
                    </td>
                    <td className="px-6 py-4 border-r border-gray-300">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        module.visible 
                          ? 'bg-green-100 text-green-800 border border-green-200' 
                          : 'bg-red-100 text-red-800 border border-red-200'
                      }`}>
                        {module.visible ? 'Visible' : 'Caché'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600 border-r border-gray-300">
                      {new Date(module.date_installation).toLocaleDateString('fr-FR')}
                      <br />
                      <span className="text-xs text-gray-400">
                        par {module.installe_par?.email || 'Système'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col space-y-2">
                        <div className="flex space-x-2">
                          <button 
                            onClick={() => handleToggleStatut(module)}
                            className={`text-xs font-medium transition-colors flex items-center gap-1 ${
                              module.statut === 'actif' 
                                ? 'text-orange-600 hover:text-orange-800' 
                                : 'text-green-600 hover:text-green-800'
                            }`}
                          >
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              {module.statut === 'actif' ? (
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                              ) : (
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                              )}
                            </svg>
                            {module.statut === 'actif' ? 'Désactiver' : 'Activer'}
                          </button>
                          <button 
                            onClick={() => handleToggleApplication(module)}
                            className={`text-xs font-medium transition-colors flex items-center gap-1 ${
                              module.application 
                                ? 'text-gray-600 hover:text-gray-800' 
                                : 'text-purple-600 hover:text-purple-800'
                            }`}
                          >
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                            </svg>
                            {module.application ? 'Système' : 'App'}
                          </button>
                        </div>
                        <div className="flex space-x-2">
                          <button 
                            onClick={() => handleToggleVisible(module)}
                            className={`text-xs font-medium transition-colors flex items-center gap-1 ${
                              module.visible 
                                ? 'text-orange-600 hover:text-orange-800' 
                                : 'text-green-600 hover:text-green-800'
                            }`}
                          >
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              {module.visible ? (
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                              ) : (
                                <>
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                </>
                              )}
                            </svg>
                            {module.visible ? 'Cacher' : 'Montrer'}
                          </button>
                          <button 
                            onClick={() => handleEdit(module)}
                            className="text-blue-600 hover:text-blue-800 text-xs font-medium transition-colors flex items-center gap-1"
                          >
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                            Éditer
                          </button>
                          <button 
                            onClick={() => handleDelete(module)}
                            className="text-red-600 hover:text-red-800 text-xs font-medium transition-colors flex items-center gap-1"
                          >
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                            Supprimer
                          </button>
                        </div>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {filteredModules.length > 0 && (
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
                  {indexOfFirstItem + 1}-{Math.min(indexOfLastItem, filteredModules.length)} sur {filteredModules.length}
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
        <ModuleFormModal
          module={editingModule}
          modules={modules}
          onClose={() => {
            setShowForm(false);
            setEditingModule(null);
          }}
          onSuccess={handleFormSuccess}
        />
      )}

      {/* Modal des dépendances */}
      {showDependances && (
        <DependancesModal
          module={selectedModule}
          onClose={() => {
            setShowDependances(false);
            setSelectedModule(null);
          }}
        />
      )}
    </div>
  );
}

// Composant Modal pour le formulaire des modules
function ModuleFormModal({ module, modules, onClose, onSuccess }) {
  const [formData, setFormData] = useState({
    nom: module?.nom || '',
    nom_affiche: module?.nom_affiche || '',
    description: module?.description || '',
    version: module?.version || '1.0.0',
    icone: module?.icone || '📦',
    application: module?.application ?? true,
    visible: module?.visible ?? true,
    statut: module?.statut || 'installe',
    dependances: module?.dependances?.map(d => d.id) || []
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    // Validation
    if (!formData.nom || !formData.nom_affiche) {
      setError('Le nom et le nom affiché sont obligatoires');
      setLoading(false);
      return;
    }

    try {
      const payload = {
        ...formData
      };

      const url = module 
        ? `/modules/${module.id}/`
        : `/modules/`;
      
      const method = module ? 'PUT' : 'POST';

      await apiClient.request(url, {
        method: method,
        body: JSON.stringify(payload),
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

  const handleDependanceChange = (dependanceId, checked) => {
    setFormData(prev => ({
      ...prev,
      dependances: checked
        ? [...prev.dependances, dependanceId]
        : prev.dependances.filter(id => id !== dependanceId)
    }));
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-800">
            {module ? 'Modifier le module' : 'Créer un nouveau module'}
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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Nom technique */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Nom technique *
              </label>
              <input
                type="text"
                required
                value={formData.nom}
                onChange={(e) => handleChange('nom', e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono"
                placeholder="nom_du_module"
              />
              <p className="text-xs text-gray-500 mt-1">
                Identifiant unique en minuscules
              </p>
            </div>
            
            {/* Nom affiché */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Nom affiché *
              </label>
              <input
                type="text"
                required
                value={formData.nom_affiche}
                onChange={(e) => handleChange('nom_affiche', e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Nom du Module"
              />
            </div>
            
            {/* Version */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Version *
              </label>
              <input
                type="text"
                required
                value={formData.version}
                onChange={(e) => handleChange('version', e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="1.0.0"
              />
            </div>
            
            {/* Icône */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Icône
              </label>
              <input
                type="text"
                value={formData.icone}
                onChange={(e) => handleChange('icone', e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="📦"
              />
              <p className="text-xs text-gray-500 mt-1">
                Emoji ou classe FontAwesome
              </p>
            </div>
            
            {/* Statut */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Statut *
              </label>
              <select
                required
                value={formData.statut}
                onChange={(e) => handleChange('statut', e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="installe">Installé</option>
                <option value="actif">Actif</option>
                <option value="inactif">Inactif</option>
              </select>
            </div>
            
            {/* Application */}
            <div className="flex items-end">
              <label className="flex items-center space-x-3">
                <input
                  type="checkbox"
                  checked={formData.application}
                  onChange={(e) => handleChange('application', e.target.checked)}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <span className="text-sm font-medium text-gray-700">
                  Module application
                </span>
              </label>
            </div>
            
            {/* Visible */}
            <div className="flex items-end">
              <label className="flex items-center space-x-3">
                <input
                  type="checkbox"
                  checked={formData.visible}
                  onChange={(e) => handleChange('visible', e.target.checked)}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <span className="text-sm font-medium text-gray-700">
                  Module visible
                </span>
              </label>
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => handleChange('description', e.target.value)}
              rows={3}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Description du module..."
            />
          </div>

          {/* Dépendances */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Dépendances
            </label>
            <div className="border border-gray-300 rounded-lg p-4 max-h-40 overflow-y-auto">
              {modules.filter(m => m.id !== module?.id).length === 0 ? (
                <p className="text-sm text-gray-500 text-center">Aucun autre module disponible</p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {modules
                    .filter(m => m.id !== module?.id)
                    .map(dependance => (
                      <label key={dependance.id} className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          checked={formData.dependances.includes(dependance.id)}
                          onChange={(e) => handleDependanceChange(dependance.id, e.target.checked)}
                          className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                        />
                        <span className="text-sm text-gray-700">
                          {dependance.nom_affiche}
                        </span>
                        <span className="text-xs text-gray-400">
                          (v{dependance.version})
                        </span>
                      </label>
                    ))
                  }
                </div>
              )}
            </div>
          </div>

          {/* Aperçu */}
          <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
            <h3 className="text-sm font-medium text-gray-700 mb-2">Aperçu du module</h3>
            <div className="space-y-2 text-sm">
              <div><strong>Nom technique:</strong> {formData.nom || 'Non défini'}</div>
              <div><strong>Nom affiché:</strong> {formData.nom_affiche || 'Non défini'}</div>
              <div><strong>Version:</strong> {formData.version || 'Non défini'}</div>
              <div><strong>Statut:</strong> 
                <span className={`ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                  formData.statut === 'actif' ? 'bg-green-100 text-green-800' :
                  formData.statut === 'inactif' ? 'bg-red-100 text-red-800' :
                  'bg-blue-100 text-blue-800'
                }`}>
                  {formData.statut === 'actif' ? 'Actif' :
                   formData.statut === 'inactif' ? 'Inactif' : 'Installé'}
                </span>
              </div>
              <div><strong>Type:</strong> 
                <span className={`ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                  formData.application 
                    ? 'bg-purple-100 text-purple-800' 
                    : 'bg-gray-100 text-gray-800'
                }`}>
                  {formData.application ? 'Application' : 'Système'}
                </span>
              </div>
              <div><strong>Dépendances:</strong> {formData.dependances.length} module(s)</div>
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
              <span>{loading ? 'Sauvegarde...' : module ? 'Mettre à jour' : 'Créer le module'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Composant Modal pour les dépendances
function DependancesModal({ module, onClose }) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg w-full max-w-md">
        <div className="p-6 border-b border-gray-200">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold text-gray-800">
              Dépendances - {module.nom_affiche}
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <div className="p-6">
          {module.dependances && module.dependances.length > 0 ? (
            <div className="space-y-3">
              {module.dependances.map((dependance, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                      <span className="text-blue-600 text-sm">
                        {dependance.icone || '📦'}
                      </span>
                    </div>
                    <div>
                      <div className="text-sm font-medium text-gray-900">
                        {dependance.nom_affiche}
                      </div>
                      <div className="text-xs text-gray-500">
                        v{dependance.version}
                      </div>
                    </div>
                  </div>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    dependance.statut === 'actif' ? 'bg-green-100 text-green-800' :
                    dependance.statut === 'inactif' ? 'bg-red-100 text-red-800' :
                    'bg-blue-100 text-blue-800'
                  }`}>
                    {dependance.statut === 'actif' ? 'Actif' :
                     dependance.statut === 'inactif' ? 'Inactif' : 'Installé'}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center text-gray-500 p-8">
              Ce module n'a aucune dépendance
            </div>
          )}
        </div>
      </div>
    </div>
  );
}