import React, { useState, useEffect, useMemo } from 'react';
import { apiClient } from '../../services/apiClient';
import { 
  FiRefreshCw, 
  FiPlus, 
  FiEdit2, 
  FiTrash2, 
  FiSearch, 
  FiFilter, 
  FiX, 
  FiCheck, 
  FiGlobe, 
  FiEye,
  FiPackage,
  FiCpu,
  FiEyeOff,
  FiToggleLeft,
  FiToggleRight,
  FiChevronLeft,
  FiChevronRight,
  FiInfo,
  FiList,
  FiActivity,
  FiBox,
  FiLayers,
  FiMonitor,
  FiEye as FiEyeIcon,
  FiEyeOff as FiEyeOffIcon,
  FiPower,
  FiDownload,
  FiUpload,
  FiCalendar,
  FiUser,
  FiCode,
  FiSettings,
  FiChevronDown,
  FiChevronUp,
  FiExternalLink,
  FiMoreVertical
} from "react-icons/fi";

export default function ModulesPage() {
  const [modules, setModules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editingModule, setEditingModule] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
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

  // Filtrage et recherche avec useMemo pour optimisation
  const filteredModules = useMemo(() => {
    return modules.filter(module => {
      const matchesSearch = 
        (module.nom?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
        (module.nom_affiche?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
        (module.description?.toLowerCase() || '').includes(searchTerm.toLowerCase());
      
      const matchesStatut = filterStatut === '' || 
        module.statut === filterStatut;
      
      const matchesApplication = filterApplication === '' || 
        module.application?.toString() === filterApplication;
      
      return matchesSearch && matchesStatut && matchesApplication;
    });
  }, [modules, searchTerm, filterStatut, filterApplication]);

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

  const handleViewDetails = (module) => {
    setSelectedModule(module);
    setShowDetailModal(true);
  };

  const handleFormSuccess = () => {
    setShowForm(false);
    setEditingModule(null);
    fetchModules();
  };

  const handleRetry = () => {
    fetchModules();
  };

  const handleResetFilters = () => {
    setSearchTerm('');
    setFilterStatut('');
    setFilterApplication('');
    setCurrentPage(1);
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
        return 'bg-gradient-to-r from-green-50 to-emerald-50 text-green-700 border border-green-200';
      case 'inactif':
        return 'bg-gradient-to-r from-red-50 to-pink-50 text-red-700 border border-red-200';
      case 'installe':
        return 'bg-gradient-to-r from-blue-50 to-cyan-50 text-blue-700 border border-blue-200';
      default:
        return 'bg-gradient-to-r from-gray-50 to-gray-100 text-gray-700 border border-gray-200';
    }
  };

  if (loading) {
    return (
      <div className="p-4 bg-gradient-to-br from-gray-50 to-white min-h-screen">
        <div className="flex flex-col items-center justify-center h-96">
          <div className="relative">
            <div className="w-12 h-12 border-3 border-gray-200 rounded-full"></div>
            <div className="absolute top-0 left-0 w-12 h-12 border-3 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          </div>
          <div className="mt-4">
            <div className="h-2 bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 rounded-full w-32 animate-pulse"></div>
            <div className="h-2 bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 rounded-full w-24 mt-2 animate-pulse mx-auto"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 bg-gradient-to-br from-gray-50 to-white min-h-screen">
      {/* Header avec gradient */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-gradient-to-br from-blue-600 to-blue-500 rounded-lg shadow">
              <FiPackage className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">Gestion des Modules</h1>
              <p className="text-gray-600 text-xs mt-0.5">
                Gérez tous les modules et applications du système
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button 
              onClick={handleRetry}
              className="px-3 py-1.5 rounded-lg border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 transition-all duration-300 hover:shadow flex items-center gap-1.5 text-sm group"
            >
              <FiRefreshCw className="group-hover:rotate-180 transition-transform duration-500 text-sm" />
              <span className="font-medium">Actualiser</span>
            </button>
            <button 
              onClick={handleNewModule}
              className="px-4 py-1.5 rounded-lg bg-gradient-to-r from-blue-600 to-blue-500 text-white hover:from-blue-700 hover:to-blue-600 transition-all duration-300 hover:shadow flex items-center gap-1.5 text-sm group shadow"
            >
              <FiPlus className="group-hover:rotate-90 transition-transform duration-300 text-sm" />
              <span className="font-semibold">Nouveau Module</span>
            </button>
          </div>
        </div>

        {/* Statistiques en ligne */}
        <div className="grid grid-cols-4 gap-3 mb-4">
          <div className="bg-white rounded-lg p-3 border border-gray-200 shadow-sm hover:shadow transition-shadow duration-300">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-600">Total des modules</p>
                <p className="text-lg font-bold text-gray-900 mt-0.5">{modules.length}</p>
              </div>
              <div className="p-1.5 bg-blue-50 rounded">
                <FiPackage className="w-4 h-4 text-blue-600" />
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg p-3 border border-gray-200 shadow-sm hover:shadow transition-shadow duration-300">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-600">Modules actifs</p>
                <p className="text-lg font-bold text-green-600 mt-0.5">
                  {modules.filter(m => m.statut === 'actif').length}
                </p>
              </div>
              <div className="p-1.5 bg-green-50 rounded">
                <FiActivity className="w-4 h-4 text-green-600" />
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg p-3 border border-gray-200 shadow-sm hover:shadow transition-shadow duration-300">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-600">Applications</p>
                <p className="text-lg font-bold text-purple-600 mt-0.5">
                  {modules.filter(m => m.application).length}
                </p>
              </div>
              <div className="p-1.5 bg-purple-50 rounded">
                <FiMonitor className="w-4 h-4 text-purple-600" />
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg p-3 border border-gray-200 shadow-sm hover:shadow transition-shadow duration-300">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-600">Modules visibles</p>
                <p className="text-lg font-bold text-amber-600 mt-0.5">
                  {modules.filter(m => m.visible).length}
                </p>
              </div>
              <div className="p-1.5 bg-amber-50 rounded">
                <FiEyeIcon className="w-4 h-4 text-amber-600" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Message d'erreur */}
      {error && (
        <div className="mb-4">
          <div className="bg-gradient-to-r from-red-50 to-red-100 border-l-3 border-red-500 rounded-r-lg p-3 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-red-100 rounded">
                  <FiX className="w-4 h-4 text-red-600" />
                </div>
                <div>
                  <p className="font-medium text-red-900 text-sm">{error}</p>
                  <p className="text-xs text-red-700 mt-0.5">Veuillez réessayer</p>
                </div>
              </div>
              <button
                onClick={handleRetry}
                className="px-3 py-1.5 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-xs font-medium shadow-sm"
              >
                Réessayer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Barre d'outils - Filtres et Recherche */}
      <div className="mb-4">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-3">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-gray-900 text-sm">Filtres et Recherche</h3>
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-gray-600">
                {filteredModules.length} résultat(s)
              </span>
              {(searchTerm || filterStatut || filterApplication) && (
                <button
                  onClick={handleResetFilters}
                  className="px-2 py-1 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors text-xs font-medium flex items-center gap-1"
                >
                  <FiX size={12} />
                  Effacer
                </button>
              )}
            </div>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Recherche</label>
              <div className="relative group">
                <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-blue-500 rounded-lg blur opacity-0 group-hover:opacity-20 transition-opacity duration-300"></div>
                <div className="relative">
                  <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 z-10 text-sm" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-transparent bg-white relative z-10 text-sm"
                    placeholder="Rechercher un module..."
                  />
                </div>
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Statut</label>
              <div className="relative">
                <FiFilter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 text-sm" />
                <select
                  value={filterStatut}
                  onChange={(e) => setFilterStatut(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-transparent bg-white appearance-none text-sm"
                >
                  <option value="">Tous les statuts</option>
                  <option value="installe">Installé</option>
                  <option value="actif">Actif</option>
                  <option value="inactif">Inactif</option>
                </select>
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Type</label>
              <div className="relative">
                <FiBox className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 text-sm" />
                <select
                  value={filterApplication}
                  onChange={(e) => setFilterApplication(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-transparent bg-white appearance-none text-sm"
                >
                  <option value="">Tous les types</option>
                  <option value="true">Application</option>
                  <option value="false">Système</option>
                </select>
              </div>
            </div>
            <div className="flex items-end">
              <button
                onClick={handleResetFilters}
                className="w-full px-3 py-2 bg-gradient-to-r from-gray-100 to-gray-50 text-gray-700 rounded-lg hover:from-gray-200 hover:to-gray-100 transition-all duration-300 border border-gray-300 font-medium flex items-center justify-center gap-1.5 text-sm"
              >
                <FiX className="group-hover:rotate-90 transition-transform duration-300" />
                Réinitialiser tout
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Tableau Principal */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        {/* En-tête du tableau avec actions */}
        <div className="px-4 py-3 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="text-xs text-gray-700">
                {currentModules.length} module(s) affiché(s)
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button className="p-1.5 hover:bg-gray-100 rounded transition-colors text-gray-600">
                <FiDownload size={16} />
              </button>
              <button className="p-1.5 hover:bg-gray-100 rounded transition-colors text-gray-600">
                <FiUpload size={16} />
              </button>
              <select
                value={itemsPerPage}
                onChange={(e) => {
                  setItemsPerPage(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="border border-gray-300 rounded px-2 py-1 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-transparent"
              >
                <option value={5}>5 lignes</option>
                <option value={10}>10 lignes</option>
                <option value={20}>20 lignes</option>
                <option value={50}>50 lignes</option>
              </select>
            </div>
          </div>
        </div>

        {/* Tableau SIMPLIFIÉ - Seules les informations essentielles */}
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead>
              <tr className="bg-gradient-to-r from-gray-50 to-gray-100">
                <th scope="col" className="px-3 py-2 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider border-r border-gray-300">
                  Module
                </th>
                <th scope="col" className="px-3 py-2 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider border-r border-gray-300">
                  Version
                </th>
                <th scope="col" className="px-3 py-2 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider border-r border-gray-300">
                  Statut
                </th>
                <th scope="col" className="px-3 py-2 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider border-r border-gray-300">
                  Type
                </th>
                <th scope="col" className="px-3 py-2 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {currentModules.length === 0 ? (
                <tr>
                  <td colSpan="5" className="px-3 py-6 text-center">
                    <div className="flex flex-col items-center justify-center">
                      <div className="w-16 h-16 bg-gradient-to-br from-gray-100 to-gray-200 rounded-full flex items-center justify-center mb-3">
                        <FiPackage className="w-8 h-8 text-gray-400" />
                      </div>
                      <h3 className="text-base font-semibold text-gray-900 mb-1.5">
                        {modules.length === 0 ? 'Aucun module trouvé' : 'Aucun résultat pour votre recherche'}
                      </h3>
                      <p className="text-gray-600 mb-4 max-w-md text-sm">
                        {modules.length === 0 
                          ? 'Commencez par créer votre premier module pour gérer votre système' 
                          : 'Essayez de modifier vos critères de recherche ou de filtres'}
                      </p>
                      {modules.length === 0 && (
                        <button 
                          onClick={handleNewModule}
                          className="px-4 py-1.5 bg-gradient-to-r from-blue-600 to-blue-500 text-white rounded-lg hover:from-blue-700 hover:to-blue-600 transition-all duration-300 font-medium flex items-center gap-1.5 text-sm"
                        >
                          <FiPlus />
                          Créer mon premier module
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                currentModules.map((module) => (
                  <tr 
                    key={module.id}
                    className="hover:bg-gradient-to-r hover:from-gray-50 hover:to-white transition-all duration-200 bg-white"
                  >
                    <td className="px-3 py-2 whitespace-nowrap border-r border-gray-200">
                      <div className="flex items-center gap-3">
                        <div className="flex-shrink-0">
                          <div className="w-8 h-8 bg-gradient-to-br from-blue-100 to-blue-50 rounded-lg flex items-center justify-center border border-blue-200">
                            <span className="text-blue-600 text-sm">
                              {module.icone || '📦'}
                            </span>
                          </div>
                        </div>
                        <div>
                          <div className="text-sm font-semibold text-gray-900">
                            {module.nom_affiche}
                          </div>
                          <div className="text-xs text-gray-500 font-mono">
                            {module.nom}
                          </div>
                          {module.description && (
                            <div className="text-xs text-gray-400 truncate max-w-[200px]">
                              {module.description}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-2 border-r border-gray-200">
                      <div className="flex items-center">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gradient-to-r from-gray-50 to-gray-100 text-gray-800 border border-gray-200">
                          v{module.version}
                        </span>
                      </div>
                    </td>
                    <td className="px-3 py-2 border-r border-gray-200">
                      <div className="flex items-center">
                        <div className={`px-2 py-1 rounded flex items-center gap-1 ${getStatutColor(module.statut)}`}>
                          {module.statut === 'actif' ? (
                            <>
                              <div className="w-1.5 h-1.5 bg-green-500 rounded-full"></div>
                              <span className="text-xs font-medium">Actif</span>
                            </>
                          ) : module.statut === 'inactif' ? (
                            <>
                              <div className="w-1.5 h-1.5 bg-red-500 rounded-full"></div>
                              <span className="text-xs font-medium">Inactif</span>
                            </>
                          ) : (
                            <>
                              <div className="w-1.5 h-1.5 bg-blue-500 rounded-full"></div>
                              <span className="text-xs font-medium">Installé</span>
                            </>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-2 border-r border-gray-200">
                      <div className="flex items-center">
                        <div className={`px-2 py-1 rounded flex items-center gap-1 ${
                          module.application 
                            ? 'bg-gradient-to-r from-purple-50 to-purple-100 text-purple-700 border border-purple-200' 
                            : 'bg-gradient-to-r from-gray-50 to-gray-100 text-gray-700 border border-gray-200'
                        }`}>
                          {module.application ? (
                            <>
                              <FiMonitor className="w-3 h-3" />
                              <span className="text-xs font-medium">Application</span>
                            </>
                          ) : (
                            <>
                              <FiCpu className="w-3 h-3" />
                              <span className="text-xs font-medium">Système</span>
                            </>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => handleViewDetails(module)}
                          className="p-1.5 bg-gradient-to-r from-gray-50 to-gray-100 text-gray-700 rounded-lg hover:from-gray-100 hover:to-gray-200 transition-all duration-200 shadow-sm hover:shadow"
                          title="Voir détails"
                        >
                          <FiEye size={14} />
                        </button>
                        <button
                          onClick={() => handleToggleStatut(module)}
                          className={`p-1.5 rounded-lg transition-all duration-200 shadow-sm hover:shadow ${
                            module.statut === 'actif'
                              ? 'bg-gradient-to-r from-orange-50 to-orange-100 text-orange-700 hover:from-orange-100 hover:to-orange-200'
                              : 'bg-gradient-to-r from-green-50 to-green-100 text-green-700 hover:from-green-100 hover:to-green-200'
                          }`}
                          title={module.statut === 'actif' ? 'Désactiver' : 'Activer'}
                        >
                          <FiPower size={14} />
                        </button>
                        <button
                          onClick={() => handleEdit(module)}
                          className="p-1.5 bg-gradient-to-r from-blue-50 to-blue-100 text-blue-700 rounded-lg hover:from-blue-100 hover:to-blue-200 transition-all duration-200 shadow-sm hover:shadow"
                          title="Modifier"
                        >
                          <FiEdit2 size={14} />
                        </button>
                        <button
                          onClick={() => handleDelete(module)}
                          className="p-1.5 bg-gradient-to-r from-red-50 to-red-100 text-red-700 rounded-lg hover:from-red-100 hover:to-red-200 transition-all duration-200 shadow-sm hover:shadow"
                          title="Supprimer"
                        >
                          <FiTrash2 size={14} />
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
        {filteredModules.length > 0 && (
          <div className="px-4 py-3 border-t border-gray-200 bg-gradient-to-r from-gray-50 to-white">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs text-gray-700">
                    Page {currentPage} sur {totalPages}
                  </span>
                  <span className="text-gray-300">•</span>
                  <span className="text-xs text-gray-700">
                    {indexOfFirstItem + 1}-{Math.min(indexOfLastItem, filteredModules.length)} sur {filteredModules.length} modules
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  onClick={prevPage}
                  disabled={currentPage === 1}
                  className={`p-1.5 rounded border transition-all duration-200 ${
                    currentPage === 1
                      ? 'bg-gray-100 text-gray-400 border-gray-300 cursor-not-allowed'
                      : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50 hover:border-gray-400 hover:shadow-sm'
                  }`}
                  title="Page précédente"
                >
                  <FiChevronLeft size={14} />
                </button>

                {/* Numéros de page */}
                <div className="flex items-center gap-1">
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
                        className={`min-w-[32px] h-8 rounded border text-xs font-medium transition-all duration-200 ${
                          currentPage === pageNumber
                            ? 'bg-gradient-to-r from-blue-600 to-blue-500 text-white border-blue-600 shadow'
                            : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50 hover:border-gray-400'
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
                  className={`p-1.5 rounded border transition-all duration-200 ${
                    currentPage === totalPages
                      ? 'bg-gray-100 text-gray-400 border-gray-300 cursor-not-allowed'
                      : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50 hover:border-gray-400 hover:shadow-sm'
                  }`}
                  title="Page suivante"
                >
                  <FiChevronRight size={14} />
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

      {/* Modal de détails */}
      {showDetailModal && selectedModule && (
        <ModuleDetailModal
          module={selectedModule}
          onClose={() => {
            setShowDetailModal(false);
            setSelectedModule(null);
          }}
        />
      )}
    </div>
  );
}

// MODAL DE DÉTAILS DU MODULE
function ModuleDetailModal({ module, onClose }) {
  const getDependancesNames = (module) => {
    if (!module.dependances || module.dependances.length === 0) {
      return 'Aucune';
    }
    return module.dependances.map(dep => dep.nom_affiche).join(', ');
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-3 z-50 backdrop-blur-sm">
      <div className="bg-white rounded-lg w-full max-w-4xl max-h-[90vh] overflow-y-auto shadow-xl">
        {/* Header du modal */}
        <div className="sticky top-0 bg-gradient-to-r from-blue-600 to-blue-500 text-white rounded-t-lg p-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-white/20 backdrop-blur-sm rounded">
                <FiPackage className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-base font-bold">Détails du module</h2>
                <p className="text-blue-100 text-xs mt-0.5">{module.nom_affiche}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1 hover:bg-white/20 rounded transition-colors"
            >
              <FiX size={18} />
            </button>
          </div>
        </div>
        
        <div className="p-4 space-y-4">
          {/* Informations Générales */}
          <div className="bg-gradient-to-br from-gray-50 to-white rounded-lg p-3 border border-gray-200">
            <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-1.5">
              <div className="w-1 h-4 bg-gradient-to-b from-blue-600 to-blue-400 rounded"></div>
              Informations Générales
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <p className="text-xs font-medium text-gray-500 mb-0.5">Nom affiché</p>
                <p className="text-sm text-gray-900 font-medium">{module.nom_affiche}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500 mb-0.5">Nom technique</p>
                <p className="text-sm text-gray-900 font-mono">{module.nom}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500 mb-0.5">Version</p>
                <p className="text-sm font-semibold text-blue-700">v{module.version}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500 mb-0.5">Icône</p>
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 bg-blue-100 rounded flex items-center justify-center">
                    <span className="text-blue-600 text-sm">{module.icone || '📦'}</span>
                  </div>
                  <p className="text-sm text-gray-900">{module.icone || 'Aucune'}</p>
                </div>
              </div>
              <div className="md:col-span-2">
                <p className="text-xs font-medium text-gray-500 mb-0.5">Description</p>
                <p className="text-sm text-gray-900">{module.description || 'Aucune description'}</p>
              </div>
            </div>
          </div>

          {/* Statut et Configuration */}
          <div className="bg-gradient-to-br from-purple-50 to-white rounded-lg p-3 border border-purple-100">
            <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-1.5">
              <div className="w-1 h-4 bg-gradient-to-b from-purple-600 to-purple-400 rounded"></div>
              Statut et Configuration
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <p className="text-xs font-medium text-gray-500 mb-0.5">Statut</p>
                <div className={`px-2 py-1 rounded inline-flex items-center gap-1 ${
                  module.statut === 'actif' 
                    ? 'bg-gradient-to-r from-green-50 to-emerald-50 text-green-700 border border-green-200' 
                    : module.statut === 'inactif'
                    ? 'bg-gradient-to-r from-red-50 to-pink-50 text-red-700 border border-red-200'
                    : 'bg-gradient-to-r from-blue-50 to-cyan-50 text-blue-700 border border-blue-200'
                }`}>
                  {module.statut === 'actif' ? (
                    <>
                      <div className="w-1.5 h-1.5 bg-green-500 rounded-full"></div>
                      <span className="text-xs font-medium">Actif</span>
                    </>
                  ) : module.statut === 'inactif' ? (
                    <>
                      <div className="w-1.5 h-1.5 bg-red-500 rounded-full"></div>
                      <span className="text-xs font-medium">Inactif</span>
                    </>
                  ) : (
                    <>
                      <div className="w-1.5 h-1.5 bg-blue-500 rounded-full"></div>
                      <span className="text-xs font-medium">Installé</span>
                    </>
                  )}
                </div>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500 mb-0.5">Type</p>
                <div className={`px-2 py-1 rounded inline-flex items-center gap-1 ${
                  module.application 
                    ? 'bg-gradient-to-r from-purple-50 to-purple-100 text-purple-700 border border-purple-200' 
                    : 'bg-gradient-to-r from-gray-50 to-gray-100 text-gray-700 border border-gray-200'
                }`}>
                  {module.application ? (
                    <>
                      <FiMonitor className="w-3 h-3" />
                      <span className="text-xs font-medium">Application</span>
                    </>
                  ) : (
                    <>
                      <FiCpu className="w-3 h-3" />
                      <span className="text-xs font-medium">Système</span>
                    </>
                  )}
                </div>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500 mb-0.5">Visibilité</p>
                <div className={`px-2 py-1 rounded inline-flex items-center gap-1 ${
                  module.visible 
                    ? 'bg-gradient-to-r from-green-50 to-emerald-50 text-green-700 border border-green-200' 
                    : 'bg-gradient-to-r from-red-50 to-pink-50 text-red-700 border border-red-200'
                }`}>
                  {module.visible ? (
                    <>
                      <FiEyeIcon className="w-3 h-3" />
                      <span className="text-xs font-medium">Visible</span>
                    </>
                  ) : (
                    <>
                      <FiEyeOffIcon className="w-3 h-3" />
                      <span className="text-xs font-medium">Caché</span>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Dépendances */}
          <div className="bg-gradient-to-br from-amber-50 to-white rounded-lg p-3 border border-amber-100">
            <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-1.5">
              <div className="w-1 h-4 bg-gradient-to-b from-amber-600 to-amber-400 rounded"></div>
              Dépendances
            </h3>
            <div>
              <p className="text-xs font-medium text-gray-500 mb-0.5">Modules requis</p>
              <div className="mt-2">
                {module.dependances && module.dependances.length > 0 ? (
                  <div className="space-y-2">
                    {module.dependances.map((dependance, index) => (
                      <div key={index} className="flex items-center justify-between p-2 bg-gradient-to-r from-gray-50 to-white rounded-lg border border-gray-200">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 bg-blue-100 rounded flex items-center justify-center">
                            <span className="text-blue-600 text-xs">{dependance.icone || '📦'}</span>
                          </div>
                          <div>
                            <div className="text-sm font-medium text-gray-900">{dependance.nom_affiche}</div>
                            <div className="text-xs text-gray-500">v{dependance.version}</div>
                          </div>
                        </div>
                        <div className={`px-2 py-0.5 rounded text-xs ${
                          dependance.statut === 'actif' ? 'bg-green-100 text-green-800' :
                          dependance.statut === 'inactif' ? 'bg-red-100 text-red-800' :
                          'bg-blue-100 text-blue-800'
                        }`}>
                          {dependance.statut === 'actif' ? 'Actif' :
                           dependance.statut === 'inactif' ? 'Inactif' : 'Installé'}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500">Aucune dépendance</p>
                )}
              </div>
            </div>
          </div>

          {/* Installation */}
          <div className="bg-gradient-to-br from-emerald-50 to-white rounded-lg p-3 border border-emerald-100">
            <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-1.5">
              <div className="w-1 h-4 bg-gradient-to-b from-emerald-600 to-emerald-400 rounded"></div>
              Installation
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <p className="text-xs font-medium text-gray-500 mb-0.5">Date d'installation</p>
                <p className="text-sm text-gray-900">
                  {module.date_installation ? new Date(module.date_installation).toLocaleDateString('fr-FR') : '-'}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500 mb-0.5">Installé par</p>
                <p className="text-sm text-gray-900">
                  {module.installe_par?.email || 'Système'}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Bouton de fermeture */}
        <div className="p-3 border-t border-gray-200 bg-gradient-to-r from-gray-50 to-white">
          <div className="flex justify-end">
            <button
              onClick={onClose}
              className="px-4 py-1.5 bg-gradient-to-r from-gray-600 to-gray-500 text-white rounded hover:from-gray-700 hover:to-gray-600 transition-all duration-200 font-medium text-sm shadow-sm"
            >
              Fermer
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// COMPOSANT MODAL DU FORMULAIRE (inchangé sauf style)
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

    if (!formData.nom || !formData.nom_affiche) {
      setError('Le nom et le nom affiché sont obligatoires');
      setLoading(false);
      return;
    }

    try {
      const payload = { ...formData };
      const url = module ? `/modules/${module.id}/` : `/modules/`;
      const method = module ? 'PUT' : 'POST';

      await apiClient.request(url, {
        method: method,
        body: JSON.stringify(payload),
        headers: { 'Content-Type': 'application/json' }
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
    setFormData(prev => ({ ...prev, [field]: value }));
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
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-3 z-50 backdrop-blur-sm">
      <div className="bg-white rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-xl">
        <div className="sticky top-0 bg-gradient-to-r from-blue-600 to-blue-500 text-white rounded-t-lg p-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-white/20 backdrop-blur-sm rounded">
                <FiPackage className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-base font-bold">
                  {module ? 'Modifier le module' : 'Nouveau Module'}
                </h2>
              </div>
            </div>
            <button onClick={onClose} className="p-1 hover:bg-white/20 rounded">
              <FiX size={18} />
            </button>
          </div>
        </div>
        
        {error && (
          <div className="mx-4 mt-3 bg-gradient-to-r from-red-50 to-red-100 border-l-3 border-red-500 rounded-r-lg p-3">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-red-100 rounded">
                <FiX className="text-red-600" size={14} />
              </div>
              <span className="text-red-800 text-xs font-medium">{error}</span>
            </div>
          </div>
        )}
        
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {/* Formulaire inchangé... */}
          <div className="bg-gradient-to-br from-gray-50 to-white rounded-lg p-3 border border-gray-200">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-1 h-4 bg-gradient-to-b from-blue-600 to-blue-400 rounded"></div>
              <h3 className="text-sm font-semibold text-gray-900">Informations du Module</h3>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Nom technique *
                </label>
                <input
                  type="text"
                  required
                  value={formData.nom}
                  onChange={(e) => handleChange('nom', e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-transparent text-sm font-mono"
                  placeholder="nom_du_module"
                />
              </div>
              
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Nom affiché *
                </label>
                <input
                  type="text"
                  required
                  value={formData.nom_affiche}
                  onChange={(e) => handleChange('nom_affiche', e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-transparent text-sm"
                  placeholder="Nom du Module"
                />
              </div>
              
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Version *
                </label>
                <input
                  type="text"
                  required
                  value={formData.version}
                  onChange={(e) => handleChange('version', e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-transparent text-sm"
                  placeholder="1.0.0"
                />
              </div>
              
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Icône</label>
                <input
                  type="text"
                  value={formData.icone}
                  onChange={(e) => handleChange('icone', e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-transparent text-sm"
                  placeholder="📦"
                />
              </div>
              
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Statut *
                </label>
                <select
                  required
                  value={formData.statut}
                  onChange={(e) => handleChange('statut', e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-transparent text-sm"
                >
                  <option value="installe">Installé</option>
                  <option value="actif">Actif</option>
                  <option value="inactif">Inactif</option>
                </select>
              </div>
              
              <div className="flex items-end">
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={formData.application}
                    onChange={(e) => handleChange('application', e.target.checked)}
                    className="w-3.5 h-3.5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <span className="text-sm font-medium text-gray-700">
                    Module application
                  </span>
                </label>
              </div>
              
              <div className="flex items-end">
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={formData.visible}
                    onChange={(e) => handleChange('visible', e.target.checked)}
                    className="w-3.5 h-3.5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <span className="text-sm font-medium text-gray-700">
                    Module visible
                  </span>
                </label>
              </div>
            </div>

            {/* Description */}
            <div className="mt-3">
              <label className="block text-xs font-medium text-gray-700 mb-1">Description</label>
              <textarea
                value={formData.description}
                onChange={(e) => handleChange('description', e.target.value)}
                rows={2}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-transparent text-sm"
                placeholder="Description du module..."
              />
            </div>
          </div>

          {/* Dépendances */}
          <div className="bg-gradient-to-br from-purple-50 to-white rounded-lg p-3 border border-purple-100">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-1 h-4 bg-gradient-to-b from-purple-600 to-purple-400 rounded"></div>
              <h3 className="text-sm font-semibold text-gray-900">Dépendances</h3>
            </div>
            <div className="border border-gray-300 rounded-lg p-3 max-h-40 overflow-y-auto bg-white">
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
                          className="w-3.5 h-3.5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                        />
                        <div className="flex items-center gap-1">
                          <span className="text-sm text-gray-700">{dependance.nom_affiche}</span>
                          <span className="text-xs text-gray-400">(v{dependance.version})</span>
                        </div>
                      </label>
                    ))
                  }
                </div>
              )}
            </div>
          </div>
          
          {/* Boutons d'action */}
          <div className="flex justify-end gap-2 pt-3 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-1.5 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-all duration-200 font-medium text-sm hover:shadow-sm"
              disabled={loading}
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-1.5 bg-gradient-to-r from-blue-600 to-blue-500 text-white rounded-lg hover:from-blue-700 hover:to-blue-600 disabled:opacity-50 transition-all duration-200 font-medium flex items-center space-x-1.5 shadow hover:shadow-md text-sm"
            >
              {loading ? (
                <>
                  <FiRefreshCw className="animate-spin" size={14} />
                  <span>Sauvegarde...</span>
                </>
              ) : (
                <>
                  <FiCheck size={14} />
                  <span>{module ? 'Mettre à jour' : 'Créer le module'}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}