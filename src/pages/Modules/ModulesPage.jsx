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
  FiMoreVertical,
  FiCheckCircle,
  FiXCircle,
  FiHash,
  FiType,
  FiBriefcase,
  FiHome,
  FiCreditCard,
  FiUsers,
  FiImage,
  FiMap,
  FiFolder
} from "react-icons/fi";
import { TbSettings, TbBuildingSkyscraper } from "react-icons/tb";

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
  const [selectedRows, setSelectedRows] = useState([]);
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);

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

  // Gestion des sélections
  const toggleRowSelection = (id) => {
    setSelectedRows(prev => 
      prev.includes(id) 
        ? prev.filter(rowId => rowId !== id)
        : [...prev, id]
    );
  };

  const selectAllRows = () => {
    if (selectedRows.length === currentModules.length) {
      setSelectedRows([]);
    } else {
      setSelectedRows(currentModules.map(module => module.id));
    }
  };

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

  const resetFilters = () => {
    setSearchTerm('');
    setFilterStatut('');
    setFilterApplication('');
    setCurrentPage(1);
    setShowFilterDropdown(false);
  };

  // Statistiques
  const stats = {
    total: modules.length,
    actifs: modules.filter(m => m.statut === 'actif').length,
    inactifs: modules.filter(m => m.statut === 'inactif').length,
    installes: modules.filter(m => m.statut === 'installe').length,
    applications: modules.filter(m => m.application).length,
    systemes: modules.filter(m => !m.application).length,
    visibles: modules.filter(m => m.visible).length,
    caches: modules.filter(m => !m.visible).length
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
            <div className="absolute top-0 left-0 w-12 h-12 border-3 border-violet-600 border-t-transparent rounded-full animate-spin"></div>
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
      {/* HEADER COMPACT AVEC RECHERCHE AU CENTRE */}
      <div className="mb-6">
        {/* Barre de recherche au centre */}
        <div className="flex items-center justify-center gap-3 mb-4">
          <div className="relative flex items-center">
            <div className="relative flex-1">
              <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 pr-24 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-violet-500 focus:border-transparent text-sm w-80"
                placeholder="Rechercher un module..."
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="absolute right-20 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1"
                >
                  <FiX size={14} />
                </button>
              )}
              
              {/* Bouton de filtre avec dropdown */}
              <div className="absolute right-1 top-1/2 transform -translate-y-1/2">
                <button
                  onClick={() => setShowFilterDropdown(!showFilterDropdown)}
                  className={`flex items-center gap-1 px-2 py-1.5 rounded text-xs font-medium ${
                    filterStatut || filterApplication ? 'bg-violet-100 text-violet-700' : 'bg-gray-100 text-gray-700'
                  } hover:bg-gray-200 transition-colors`}
                >
                  <FiChevronDown size={12} />
                  <span>Filtre</span>
                </button>
                
                {/* Dropdown des filtres */}
                {showFilterDropdown && (
                  <div className="absolute right-0 top-full mt-1 w-48 bg-white rounded-lg shadow-lg border border-gray-200 z-10">
                    <div className="p-2">
                      <p className="text-xs font-medium text-gray-700 mb-2">Filtrer par</p>
                      
                      {/* Filtre Statut */}
                      <div className="space-y-1 mb-3">
                        <p className="text-xs font-medium text-gray-700 mb-1">Statut</p>
                        <button
                          onClick={() => {
                            setFilterStatut('');
                            setShowFilterDropdown(false);
                          }}
                          className={`w-full text-left px-2 py-1.5 rounded text-xs ${!filterStatut ? 'bg-violet-50 text-violet-700' : 'text-gray-700 hover:bg-gray-50'}`}
                        >
                          Tous les statuts
                        </button>
                        <button
                          onClick={() => {
                            setFilterStatut('installe');
                            setShowFilterDropdown(false);
                          }}
                          className={`w-full text-left px-2 py-1.5 rounded text-xs ${filterStatut === 'installe' ? 'bg-violet-50 text-violet-700' : 'text-gray-700 hover:bg-gray-50'}`}
                        >
                          Installés seulement
                        </button>
                        <button
                          onClick={() => {
                            setFilterStatut('actif');
                            setShowFilterDropdown(false);
                          }}
                          className={`w-full text-left px-2 py-1.5 rounded text-xs ${filterStatut === 'actif' ? 'bg-violet-50 text-violet-700' : 'text-gray-700 hover:bg-gray-50'}`}
                        >
                          Actifs seulement
                        </button>
                        <button
                          onClick={() => {
                            setFilterStatut('inactif');
                            setShowFilterDropdown(false);
                          }}
                          className={`w-full text-left px-2 py-1.5 rounded text-xs ${filterStatut === 'inactif' ? 'bg-violet-50 text-violet-700' : 'text-gray-700 hover:bg-gray-50'}`}
                        >
                          Inactifs seulement
                        </button>
                      </div>
                      
                      {/* Filtre Type */}
                      <div className="space-y-1 mb-3">
                        <p className="text-xs font-medium text-gray-700 mb-1">Type</p>
                        <button
                          onClick={() => {
                            setFilterApplication('');
                            setShowFilterDropdown(false);
                          }}
                          className={`w-full text-left px-2 py-1.5 rounded text-xs ${!filterApplication ? 'bg-violet-50 text-violet-700' : 'text-gray-700 hover:bg-gray-50'}`}
                        >
                          Tous les types
                        </button>
                        <button
                          onClick={() => {
                            setFilterApplication('true');
                            setShowFilterDropdown(false);
                          }}
                          className={`w-full text-left px-2 py-1.5 rounded text-xs ${filterApplication === 'true' ? 'bg-violet-50 text-violet-700' : 'text-gray-700 hover:bg-gray-50'}`}
                        >
                          Applications seulement
                        </button>
                        <button
                          onClick={() => {
                            setFilterApplication('false');
                            setShowFilterDropdown(false);
                          }}
                          className={`w-full text-left px-2 py-1.5 rounded text-xs ${filterApplication === 'false' ? 'bg-violet-50 text-violet-700' : 'text-gray-700 hover:bg-gray-50'}`}
                        >
                          Systèmes seulement
                        </button>
                      </div>
                      
                      {/* Réinitialiser */}
                      {(searchTerm || filterStatut || filterApplication) && (
                        <button
                          onClick={resetFilters}
                          className="w-full mt-2 px-2 py-1.5 bg-gray-100 text-gray-700 rounded text-xs hover:bg-gray-200 transition-colors"
                        >
                          Réinitialiser les filtres
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
            
            <button 
              onClick={handleRetry}
              className="ml-3 px-3 py-2 rounded-lg border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 transition-all duration-300 flex items-center gap-1.5 text-sm"
            >
              <FiRefreshCw className={`${loading ? 'animate-spin' : ''}`} size={14} />
              <span>Actualiser</span>
            </button>
            
            <button 
              onClick={handleNewModule}
              className="ml-2 px-3 py-2 rounded-lg bg-gradient-to-r from-violet-600 to-violet-500 text-white hover:from-violet-700 hover:to-violet-600 transition-all duration-300 flex items-center gap-1.5 text-sm shadow"
            >
              <FiPlus size={14} />
              <span>Nouveau Module</span>
            </button>
          </div>
        </div>

        {/* Statistiques en ligne compactes - AMÉLIORÉES */}
        <div className="grid grid-cols-4 gap-2 mb-3">
          <div className="bg-white rounded-lg p-2 border border-gray-200 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-600">Total:</span>
                <span className="text-sm font-bold text-violet-600">{stats.total}</span>
              </div>
              <div className="p-1 bg-violet-50 rounded">
                <FiPackage className="w-3 h-3 text-violet-600" />
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg p-2 border border-gray-200 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-600">Actifs:</span>
                <span className="text-sm font-bold text-green-600">{stats.actifs}</span>
              </div>
              <div className="p-1 bg-green-50 rounded">
                <FiCheckCircle className="w-3 h-3 text-green-600" />
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg p-2 border border-gray-200 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-600">Applications:</span>
                <span className="text-sm font-bold text-purple-600">{stats.applications}</span>
              </div>
              <div className="p-1 bg-purple-50 rounded">
                <FiMonitor className="w-3 h-3 text-purple-600" />
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg p-2 border border-gray-200 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-600">Visibles:</span>
                <span className="text-sm font-bold text-amber-600">{stats.visibles}</span>
              </div>
              <div className="p-1 bg-amber-50 rounded">
                <FiEyeIcon className="w-3 h-3 text-amber-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Onglets */}
        <div className="flex border-b border-gray-200 mb-3">
          <button
            onClick={() => {
              setCurrentPage(1);
              setSelectedRows([]);
              resetFilters();
            }}
            className="px-4 py-1.5 text-xs font-medium border-b-2 border-violet-600 text-violet-600 transition-colors"
          >
            Tous les modules
          </button>
        </div>
      </div>

      {/* Message d'erreur compact */}
      {error && (
        <div className="mb-4">
          <div className="bg-gradient-to-r from-red-50 to-red-100 border-l-3 border-red-500 rounded-r-lg p-2 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-1 bg-red-100 rounded">
                  <FiXCircle className="w-3 h-3 text-red-600" />
                </div>
                <div>
                  <p className="font-medium text-red-900 text-xs">{error}</p>
                </div>
              </div>
              <button
                onClick={handleRetry}
                className="px-2 py-1 bg-red-600 text-white rounded hover:bg-red-700 transition-colors text-xs font-medium"
              >
                Réessayer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tableau Principal */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        {/* En-tête du tableau avec actions compact */}
        <div className="px-3 py-2 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5">
                <input
                  type="checkbox"
                  checked={selectedRows.length === currentModules.length && currentModules.length > 0}
                  onChange={selectAllRows}
                  className="w-3 h-3 text-violet-600 rounded focus:ring-violet-500 border-gray-300"
                />
                <span className="text-xs text-gray-700">
                  {selectedRows.length} sélectionné(s)
                </span>
              </div>
              {(filterStatut || filterApplication) && (
                <div className="flex items-center gap-1">
                  {filterStatut === 'installe' && (
                    <span className="px-1.5 py-0.5 bg-violet-50 text-violet-700 text-xs rounded border border-violet-200">
                      Installés
                    </span>
                  )}
                  {filterStatut === 'actif' && (
                    <span className="px-1.5 py-0.5 bg-violet-50 text-violet-700 text-xs rounded border border-violet-200">
                      Actifs
                    </span>
                  )}
                  {filterStatut === 'inactif' && (
                    <span className="px-1.5 py-0.5 bg-violet-50 text-violet-700 text-xs rounded border border-violet-200">
                      Inactifs
                    </span>
                  )}
                  {filterApplication === 'true' && (
                    <span className="px-1.5 py-0.5 bg-violet-50 text-violet-700 text-xs rounded border border-violet-200">
                      Applications
                    </span>
                  )}
                  {filterApplication === 'false' && (
                    <span className="px-1.5 py-0.5 bg-violet-50 text-violet-700 text-xs rounded border border-violet-200">
                      Systèmes
                    </span>
                  )}
                </div>
              )}
            </div>
            <div className="flex items-center gap-1">
              <button className="p-1 hover:bg-gray-100 rounded transition-colors text-gray-600">
                <FiDownload size={14} />
              </button>
              <button className="p-1 hover:bg-gray-100 rounded transition-colors text-gray-600">
                <FiUpload size={14} />
              </button>
              <select
                value={itemsPerPage}
                onChange={(e) => {
                  setItemsPerPage(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="border border-gray-300 rounded px-1.5 py-0.5 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-violet-500 focus:border-transparent"
              >
                <option value={5}>5 lignes</option>
                <option value={10}>10 lignes</option>
                <option value={20}>20 lignes</option>
                <option value={50}>50 lignes</option>
              </select>
            </div>
          </div>
        </div>

        {/* Tableau SIMPLIFIÉ - Pas d'icônes dans les cellules */}
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead>
              <tr className="bg-gradient-to-r from-gray-50 to-gray-100">
                <th scope="col" className="px-3 py-2 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider border-r border-gray-300">
                  <div className="flex items-center gap-1">
                    <input
                      type="checkbox"
                      checked={selectedRows.length === currentModules.length && currentModules.length > 0}
                      onChange={selectAllRows}
                      className="w-3 h-3 text-violet-600 rounded focus:ring-violet-500 border-gray-300"
                    />
                    Module
                  </div>
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
                  <td colSpan={5} className="px-3 py-4 text-center">
                    <div className="flex flex-col items-center justify-center">
                      <div className="w-12 h-12 bg-gradient-to-br from-gray-100 to-gray-200 rounded-full flex items-center justify-center mb-2">
                        <FiPackage className="w-6 h-6 text-gray-400" />
                      </div>
                      <h3 className="text-sm font-semibold text-gray-900 mb-1">
                        {modules.length === 0 ? 'Aucun module trouvé' : 'Aucun résultat'}
                      </h3>
                      <p className="text-gray-600 text-xs mb-3 max-w-md">
                        {modules.length === 0 
                          ? 'Commencez par créer votre premier module' 
                          : 'Essayez de modifier vos critères de recherche'}
                      </p>
                      {modules.length === 0 && (
                        <button 
                          onClick={handleNewModule}
                          className="px-3 py-1 bg-gradient-to-r from-violet-600 to-violet-500 text-white rounded hover:from-violet-700 hover:to-violet-600 transition-all duration-300 font-medium flex items-center gap-1 text-xs"
                        >
                          <FiPlus size={12} />
                          Créer module
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                currentModules.map((module) => (
                  <tr 
                    key={module.id}
                    className={`hover:bg-gradient-to-r hover:from-gray-50 hover:to-white transition-all duration-200 ${
                      selectedRows.includes(module.id) ? 'bg-gradient-to-r from-violet-50 to-violet-25' : 'bg-white'
                    }`}
                  >
                    {/* Module avec checkbox */}
                    <td className="px-3 py-2 whitespace-nowrap border-r border-gray-200">
                      <div className="flex items-center gap-1.5">
                        <input
                          type="checkbox"
                          checked={selectedRows.includes(module.id)}
                          onChange={() => toggleRowSelection(module.id)}
                          className="w-3 h-3 text-violet-600 rounded focus:ring-violet-500 border-gray-300"
                        />
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-semibold text-gray-900">{module.nom_affiche}</span>
                            <span className="text-xs text-gray-500 font-mono bg-gray-100 px-1 py-0.5 rounded">
                              {module.nom}
                            </span>
                          </div>
                          <div className="text-xs text-gray-500 truncate max-w-[180px]">
                            {module.description || 'Aucune description'}
                          </div>
                        </div>
                      </div>
                    </td>
                    
                    {/* Version */}
                    <td className="px-3 py-2 border-r border-gray-200">
                      <div className="flex items-center">
                        <span className="text-xs font-medium text-gray-900 bg-gray-100 px-2 py-0.5 rounded border border-gray-200">
                          v{module.version}
                        </span>
                      </div>
                    </td>
                    
                    {/* Statut */}
                    <td className="px-3 py-2 border-r border-gray-200">
                      <div className="flex items-center">
                        <div className={`px-1.5 py-0.5 rounded flex items-center gap-1 ${getStatutColor(module.statut)}`}>
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
                    
                    {/* Type */}
                    <td className="px-3 py-2 border-r border-gray-200">
                      <div className="flex flex-col gap-0.5">
                        <div className={`px-1.5 py-0.5 rounded flex items-center gap-1 w-fit ${
                          module.application 
                            ? 'bg-gradient-to-r from-purple-50 to-purple-100 text-purple-700 border border-purple-200' 
                            : 'bg-gradient-to-r from-gray-50 to-gray-100 text-gray-700 border border-gray-200'
                        }`}>
                          {module.application ? (
                            <>
                              <span className="text-xs font-medium">Application</span>
                            </>
                          ) : (
                            <>
                              <span className="text-xs font-medium">Système</span>
                            </>
                          )}
                        </div>
                        <div className={`px-1.5 py-0.5 rounded flex items-center gap-1 w-fit ${
                          module.visible 
                            ? 'bg-gradient-to-r from-green-50 to-emerald-50 text-green-700 border border-green-200' 
                            : 'bg-gradient-to-r from-red-50 to-pink-50 text-red-700 border border-red-200'
                        }`}>
                          {module.visible ? (
                            <>
                              <div className="w-1.5 h-1.5 bg-green-500 rounded-full"></div>
                              <span className="text-xs">Visible</span>
                            </>
                          ) : (
                            <>
                              <div className="w-1.5 h-1.5 bg-red-500 rounded-full"></div>
                              <span className="text-xs">Caché</span>
                            </>
                          )}
                        </div>
                      </div>
                    </td>
                    
                    {/* Actions */}
                    <td className="px-3 py-2 whitespace-nowrap">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleViewDetails(module)}
                          className="p-1 bg-gradient-to-r from-gray-50 to-gray-100 text-gray-700 rounded hover:from-gray-100 hover:to-gray-200 transition-all duration-200 shadow-sm hover:shadow"
                          title="Voir détails"
                        >
                          <FiEye size={12} />
                        </button>
                        <button
                          onClick={() => handleToggleStatut(module)}
                          className={`p-1 rounded hover:shadow transition-all duration-200 ${
                            module.statut === 'actif'
                              ? 'bg-gradient-to-r from-orange-50 to-amber-100 text-orange-700 hover:from-orange-100 hover:to-amber-200'
                              : 'bg-gradient-to-r from-green-50 to-emerald-100 text-green-700 hover:from-green-100 hover:to-emerald-200'
                          }`}
                          title={module.statut === 'actif' ? 'Désactiver' : 'Activer'}
                        >
                          <FiPower size={12} />
                        </button>
                        <button
                          onClick={() => handleEdit(module)}
                          className="p-1 bg-gradient-to-r from-violet-50 to-violet-100 text-violet-700 rounded hover:from-violet-100 hover:to-violet-200 transition-all duration-200 shadow-sm hover:shadow"
                          title="Modifier"
                        >
                          <FiEdit2 size={12} />
                        </button>
                        <button
                          onClick={() => handleDelete(module)}
                          className="p-1 bg-gradient-to-r from-red-50 to-red-100 text-red-700 rounded hover:from-red-100 hover:to-red-200 transition-all duration-200 shadow-sm hover:shadow"
                          title="Supprimer"
                        >
                          <FiTrash2 size={12} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination compact */}
        {currentModules.length > 0 && (
          <div className="px-3 py-2 border-t border-gray-200 bg-gradient-to-r from-gray-50 to-white">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1">
                  <span className="text-xs text-gray-700">
                    Page {currentPage} sur {totalPages}
                  </span>
                  <span className="text-gray-300">•</span>
                  <span className="text-xs text-gray-700">
                    {indexOfFirstItem + 1}-{Math.min(indexOfLastItem, filteredModules.length)} sur {filteredModules.length} modules
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-1">
                <button
                  onClick={prevPage}
                  disabled={currentPage === 1}
                  className={`p-1 rounded border transition-all duration-200 ${
                    currentPage === 1
                      ? 'bg-gray-100 text-gray-400 border-gray-300 cursor-not-allowed'
                      : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50 hover:border-gray-400 hover:shadow-sm'
                  }`}
                  title="Page précédente"
                >
                  <FiChevronLeft size={12} />
                </button>

                {/* Numéros de page */}
                <div className="flex items-center gap-0.5">
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
                        className={`min-w-[28px] h-7 rounded border text-xs font-medium transition-all duration-200 ${
                          currentPage === pageNumber
                            ? 'bg-gradient-to-r from-violet-600 to-violet-500 text-white border-violet-600 shadow'
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
                  className={`p-1 rounded border transition-all duration-200 ${
                    currentPage === totalPages
                      ? 'bg-gray-100 text-gray-400 border-gray-300 cursor-not-allowed'
                      : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50 hover:border-gray-400 hover:shadow-sm'
                  }`}
                  title="Page suivante"
                >
                  <FiChevronRight size={12} />
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

// MODAL DE DÉTAILS DU MODULE - DESIGN MIS À JOUR
function ModuleDetailModal({ module, onClose }) {
  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-3 z-50 backdrop-blur-sm">
      <div className="bg-white rounded-lg w-full max-w-4xl max-h-[90vh] overflow-y-auto shadow-xl">
        {/* Header du modal */}
        <div className="sticky top-0 bg-gradient-to-r from-violet-600 to-violet-500 text-white rounded-t-lg p-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-white/20 backdrop-blur-sm rounded">
                <FiPackage className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-base font-bold">Détails du Module</h2>
                <p className="text-violet-100 text-xs mt-0.5">{module.nom_affiche}</p>
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
          {/* En-tête avec icône */}
          <div className="flex flex-col md:flex-row items-center md:items-start gap-4 mb-6">
            <div className="w-32 h-32 bg-gradient-to-br from-violet-100 to-violet-200 rounded-lg flex items-center justify-center overflow-hidden border-2 border-violet-300">
              <span className="text-5xl">{module.icone || '📦'}</span>
            </div>
            <div className="flex-1 text-center md:text-left">
              <h1 className="text-xl font-bold text-gray-900">{module.nom_affiche}</h1>
              <p className="text-gray-600 mt-1">{module.description || 'Aucune description'}</p>
              <div className="flex flex-wrap gap-2 mt-3 justify-center md:justify-start">
                <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                  module.statut === 'actif' 
                    ? 'bg-green-100 text-green-800' 
                    : module.statut === 'inactif'
                    ? 'bg-red-100 text-red-800'
                    : 'bg-blue-100 text-blue-800'
                }`}>
                  {module.statut === 'actif' ? 'Actif' : 
                   module.statut === 'inactif' ? 'Inactif' : 'Installé'}
                </span>
                {module.application ? (
                  <span className="inline-flex items-center px-3 py-1 bg-purple-100 text-purple-800 rounded-full text-xs font-medium">
                    <FiMonitor className="w-3 h-3 mr-1" />
                    Application
                  </span>
                ) : (
                  <span className="inline-flex items-center px-3 py-1 bg-gray-100 text-gray-800 rounded-full text-xs font-medium">
                    <FiCpu className="w-3 h-3 mr-1" />
                    Système
                  </span>
                )}
                {module.visible ? (
                  <span className="inline-flex items-center px-3 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium">
                    <FiEyeIcon className="w-3 h-3 mr-1" />
                    Visible
                  </span>
                ) : (
                  <span className="inline-flex items-center px-3 py-1 bg-red-100 text-red-800 rounded-full text-xs font-medium">
                    <FiEyeOffIcon className="w-3 h-3 mr-1" />
                    Caché
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Informations Générales */}
          <div className="bg-gradient-to-br from-gray-50 to-white rounded-lg p-4 border border-gray-200">
            <h3 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-1.5">
              <div className="w-1 h-4 bg-gradient-to-b from-violet-600 to-violet-400 rounded"></div>
              Informations Générales
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-xs font-medium text-gray-500 mb-1">Nom technique</p>
                <p className="text-sm text-gray-900 font-mono font-medium">{module.nom}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500 mb-1">Version</p>
                <p className="text-sm font-semibold text-blue-700">v{module.version}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500 mb-1">Icône</p>
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-gradient-to-br from-violet-100 to-violet-200 rounded flex items-center justify-center">
                    <span className="text-lg">{module.icone || '📦'}</span>
                  </div>
                  <p className="text-sm text-gray-900">{module.icone || 'Emoji par défaut'}</p>
                </div>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500 mb-1">Date d'installation</p>
                <p className="text-sm text-gray-900">
                  {module.date_installation ? new Date(module.date_installation).toLocaleDateString('fr-FR') : '-'}
                </p>
              </div>
              <div className="md:col-span-2">
                <p className="text-xs font-medium text-gray-500 mb-1">Description</p>
                <p className="text-sm text-gray-900">{module.description || 'Aucune description'}</p>
              </div>
            </div>
          </div>

          {/* Statut et Configuration */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-gradient-to-br from-green-50 to-white rounded-lg p-4 border border-green-200">
              <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-1.5">
                <div className="w-1 h-4 bg-gradient-to-b from-green-600 to-green-400 rounded"></div>
                Statut
              </h3>
              <div className={`px-2 py-1 rounded inline-flex items-center gap-1 w-fit ${
                module.statut === 'actif' 
                  ? 'bg-gradient-to-r from-green-50 to-emerald-50 text-green-700 border border-green-200' 
                  : module.statut === 'inactif'
                  ? 'bg-gradient-to-r from-red-50 to-pink-50 text-red-700 border border-red-200'
                  : 'bg-gradient-to-r from-blue-50 to-cyan-50 text-blue-700 border border-blue-200'
              }`}>
                {module.statut === 'actif' ? (
                  <>
                    <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                    <span className="text-xs font-medium">Actif</span>
                  </>
                ) : module.statut === 'inactif' ? (
                  <>
                    <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                    <span className="text-xs font-medium">Inactif</span>
                  </>
                ) : (
                  <>
                    <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                    <span className="text-xs font-medium">Installé</span>
                  </>
                )}
              </div>
            </div>

            <div className="bg-gradient-to-br from-purple-50 to-white rounded-lg p-4 border border-purple-200">
              <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-1.5">
                <div className="w-1 h-4 bg-gradient-to-b from-purple-600 to-purple-400 rounded"></div>
                Type
              </h3>
              <div className={`px-2 py-1 rounded inline-flex items-center gap-1 w-fit ${
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

            <div className="bg-gradient-to-br from-amber-50 to-white rounded-lg p-4 border border-amber-200">
              <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-1.5">
                <div className="w-1 h-4 bg-gradient-to-b from-amber-600 to-amber-400 rounded"></div>
                Visibilité
              </h3>
              <div className={`px-2 py-1 rounded inline-flex items-center gap-1 w-fit ${
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

          {/* Dépendances */}
          <div className="bg-gradient-to-br from-orange-50 to-white rounded-lg p-4 border border-orange-200">
            <h3 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-1.5">
              <div className="w-1 h-4 bg-gradient-to-b from-orange-600 to-orange-400 rounded"></div>
              Dépendances
            </h3>
            <div>
              {module.dependances && module.dependances.length > 0 ? (
                <div className="space-y-2">
                  {module.dependances.map((dependance, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-gradient-to-r from-gray-50 to-white rounded-lg border border-gray-200">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-gradient-to-br from-blue-100 to-blue-200 rounded flex items-center justify-center">
                          <span className="text-sm">{dependance.icone || '📦'}</span>
                        </div>
                        <div>
                          <div className="text-sm font-medium text-gray-900">{dependance.nom_affiche}</div>
                          <div className="text-xs text-gray-500 font-mono">{dependance.nom} • v{dependance.version}</div>
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
                <div className="text-center p-4">
                  <div className="w-12 h-12 bg-gradient-to-br from-gray-100 to-gray-200 rounded-full flex items-center justify-center mx-auto mb-2">
                    <FiPackage className="w-6 h-6 text-gray-400" />
                  </div>
                  <p className="text-sm text-gray-500">Aucune dépendance requise</p>
                </div>
              )}
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

// COMPOSANT MODAL DU FORMULAIRE - DESIGN MIS À JOUR
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
      <div className="bg-white rounded-lg w-full max-w-4xl max-h-[90vh] overflow-y-auto shadow-xl">
        {/* Header du modal avec gradient - COMPACT */}
        <div className="sticky top-0 bg-gradient-to-r from-violet-600 to-violet-500 text-white rounded-t-lg p-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-white/20 backdrop-blur-sm rounded">
                <FiPackage className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-base font-bold">
                  {module ? 'Modifier le module' : 'Nouveau Module'}
                </h2>
                {!module && (
                  <p className="text-violet-100 text-xs mt-0.5">
                    Créez un nouveau module système ou application
                  </p>
                )}
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
        
        {error && (
          <div className="mx-4 mt-3 bg-gradient-to-r from-red-50 to-red-100 border-l-3 border-red-500 rounded-r-lg p-3">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-red-100 rounded">
                <FiX className="text-red-600" size={14} />
              </div>
              <span className="text-red-800 text-xs font-medium whitespace-pre-line">{error}</span>
            </div>
          </div>
        )}
        
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {/* Section 1: Informations du Module */}
          <div className="bg-gradient-to-br from-gray-50 to-white rounded-lg p-3 border border-gray-200">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-1 h-4 bg-gradient-to-b from-violet-600 to-violet-400 rounded"></div>
              <h3 className="text-sm font-semibold text-gray-900">Informations du Module</h3>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
              {/* Nom technique */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Nom technique <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <FiHash className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
                  <input
                    type="text"
                    required
                    value={formData.nom}
                    onChange={(e) => handleChange('nom', e.target.value)}
                    className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-violet-500 focus:border-transparent bg-white text-sm font-mono"
                    placeholder="nom_du_module"
                  />
                </div>
              </div>
              
              {/* Nom affiché */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Nom affiché <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.nom_affiche}
                  onChange={(e) => handleChange('nom_affiche', e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-violet-500 focus:border-transparent text-sm"
                  placeholder="Nom du Module"
                />
              </div>
              
              {/* Version */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Version <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.version}
                  onChange={(e) => handleChange('version', e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-violet-500 focus:border-transparent text-sm"
                  placeholder="1.0.0"
                />
              </div>
              
              {/* Icône */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Icône</label>
                <input
                  type="text"
                  value={formData.icone}
                  onChange={(e) => handleChange('icone', e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-violet-500 focus:border-transparent text-sm"
                  placeholder="📦"
                />
              </div>
              
              {/* Statut */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Statut <span className="text-red-500">*</span>
                </label>
                <select
                  required
                  value={formData.statut}
                  onChange={(e) => handleChange('statut', e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-violet-500 focus:border-transparent text-sm"
                >
                  <option value="installe">Installé</option>
                  <option value="actif">Actif</option>
                  <option value="inactif">Inactif</option>
                </select>
              </div>
              
              {/* Application */}
              <div className="flex items-end">
                <label className="flex items-center gap-2 cursor-pointer">
                  <div className="relative">
                    <input
                      type="checkbox"
                      checked={formData.application}
                      onChange={(e) => handleChange('application', e.target.checked)}
                      className="sr-only"
                    />
                    <div className={`w-10 h-5 rounded-full transition-colors duration-300 ${
                      formData.application ? 'bg-purple-500' : 'bg-gray-300'
                    }`}>
                      <div className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform duration-300 ${
                        formData.application ? 'transform translate-x-5' : ''
                      }`}></div>
                    </div>
                  </div>
                  <div>
                    <span className="text-sm font-medium text-gray-700">
                      Module application
                    </span>
                    <p className="text-xs text-gray-500">
                      {formData.application ? 'Visible dans le menu' : 'Module système'}
                    </p>
                  </div>
                </label>
              </div>
              
              {/* Visible */}
              <div className="flex items-end">
                <label className="flex items-center gap-2 cursor-pointer">
                  <div className="relative">
                    <input
                      type="checkbox"
                      checked={formData.visible}
                      onChange={(e) => handleChange('visible', e.target.checked)}
                      className="sr-only"
                    />
                    <div className={`w-10 h-5 rounded-full transition-colors duration-300 ${
                      formData.visible ? 'bg-green-500' : 'bg-gray-300'
                    }`}>
                      <div className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform duration-300 ${
                        formData.visible ? 'transform translate-x-5' : ''
                      }`}></div>
                    </div>
                  </div>
                  <div>
                    <span className="text-sm font-medium text-gray-700">
                      Module visible
                    </span>
                    <p className="text-xs text-gray-500">
                      {formData.visible ? 'Visible pour les utilisateurs' : 'Caché'}
                    </p>
                  </div>
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
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-violet-500 focus:border-transparent text-sm"
                placeholder="Description du module..."
              />
            </div>
          </div>

          {/* Section 2: Dépendances */}
          <div className="bg-gradient-to-br from-orange-50 to-white rounded-lg p-3 border border-orange-100">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-1 h-4 bg-gradient-to-b from-orange-600 to-orange-400 rounded"></div>
              <h3 className="text-sm font-semibold text-gray-900">Dépendances</h3>
            </div>
            <div className="border border-gray-300 rounded-lg p-3 max-h-40 overflow-y-auto bg-white">
              {modules.filter(m => m.id !== module?.id).length === 0 ? (
                <div className="text-center p-3">
                  <FiPackage className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                  <p className="text-sm text-gray-500">Aucun autre module disponible</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {modules
                    .filter(m => m.id !== module?.id)
                    .map(dependance => (
                      <label key={dependance.id} className="flex items-center justify-between p-2 hover:bg-gray-50 rounded">
                        <div className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            checked={formData.dependances.includes(dependance.id)}
                            onChange={(e) => handleDependanceChange(dependance.id, e.target.checked)}
                            className="w-3.5 h-3.5 text-violet-600 border-gray-300 rounded focus:ring-violet-500"
                          />
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 bg-gradient-to-br from-violet-100 to-violet-200 rounded flex items-center justify-center">
                              <span className="text-xs">{dependance.icone || '📦'}</span>
                            </div>
                            <div>
                              <div className="text-xs font-medium text-gray-900">{dependance.nom_affiche}</div>
                              <div className="text-xs text-gray-500">v{dependance.version}</div>
                            </div>
                          </div>
                        </div>
                        <div className={`px-1.5 py-0.5 rounded text-xs ${
                          dependance.statut === 'actif' ? 'bg-green-100 text-green-800' :
                          dependance.statut === 'inactif' ? 'bg-red-100 text-red-800' :
                          'bg-blue-100 text-blue-800'
                        }`}>
                          {dependance.statut === 'actif' ? 'Actif' :
                           dependance.statut === 'inactif' ? 'Inactif' : 'Installé'}
                        </div>
                      </label>
                    ))
                  }
                </div>
              )}
            </div>
          </div>
          
          {/* Aperçu */}
          <div className="bg-gradient-to-br from-gray-50 to-white rounded-lg p-3 border border-gray-200">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-1 h-4 bg-gradient-to-b from-gray-600 to-gray-400 rounded"></div>
              <h3 className="text-sm font-semibold text-gray-900">Aperçu du module</h3>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2">
                <strong className="text-gray-700 w-24">Nom:</strong>
                <span className="bg-gray-100 px-2 py-1 rounded text-xs flex-1">
                  {formData.nom_affiche || 'Non défini'}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <strong className="text-gray-700 w-24">Version:</strong>
                <span className="bg-gray-100 px-2 py-1 rounded text-xs font-mono flex-1">
                  v{formData.version || '1.0.0'}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <strong className="text-gray-700 w-24">Statut:</strong>
                <span className={`px-2 py-1 rounded text-xs font-medium ${
                  formData.statut === 'actif' 
                    ? 'bg-gradient-to-r from-green-50 to-emerald-100 text-green-700 border border-green-200'
                    : formData.statut === 'inactif'
                    ? 'bg-gradient-to-r from-red-50 to-pink-100 text-red-700 border border-red-200'
                    : 'bg-gradient-to-r from-blue-50 to-blue-100 text-blue-700 border border-blue-200'
                }`}>
                  {formData.statut === 'actif' ? 'Actif' : 
                   formData.statut === 'inactif' ? 'Inactif' : 'Installé'}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <strong className="text-gray-700 w-24">Type:</strong>
                <span className={`px-2 py-1 rounded text-xs font-medium ${
                  formData.application 
                    ? 'bg-gradient-to-r from-purple-50 to-purple-100 text-purple-700 border border-purple-200'
                    : 'bg-gradient-to-r from-gray-50 to-gray-100 text-gray-700 border border-gray-200'
                }`}>
                  {formData.application ? 'Application' : 'Système'}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <strong className="text-gray-700 w-24">Visibilité:</strong>
                <span className={`px-2 py-1 rounded text-xs font-medium ${
                  formData.visible 
                    ? 'bg-gradient-to-r from-green-50 to-emerald-100 text-green-700 border border-green-200'
                    : 'bg-gradient-to-r from-red-50 to-pink-100 text-red-700 border border-red-200'
                }`}>
                  {formData.visible ? 'Visible' : 'Caché'}
                </span>
              </div>
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
              className="px-4 py-1.5 bg-gradient-to-r from-violet-600 to-violet-500 text-white rounded-lg hover:from-violet-700 hover:to-violet-600 disabled:opacity-50 transition-all duration-200 font-medium flex items-center gap-1.5 shadow hover:shadow-md text-sm"
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