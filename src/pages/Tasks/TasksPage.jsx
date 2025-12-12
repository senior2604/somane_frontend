import React, { useState, useEffect, useRef } from 'react';
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
  FiPlay,
  FiPause,
  FiCalendar,
  FiClock,
  FiDatabase,
  FiGlobe,
  FiFileText,
  FiChevronLeft,
  FiChevronRight,
  FiDownload,
  FiUpload,
  FiEye,
  FiCheckCircle,
  FiXCircle,
  FiAlertCircle,
  FiInfo,
  FiMoreVertical,
  FiChevronDown,
  FiChevronUp
} from "react-icons/fi";
import { TbClock } from "react-icons/tb";

export default function TasksPage() {
  const [taches, setTaches] = useState([]);
  const [entites, setEntites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editingTache, setEditingTache] = useState(null);
  const [showLogs, setShowLogs] = useState(false);
  const [selectedTache, setSelectedTache] = useState(null);
  
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterEntite, setFilterEntite] = useState('');
  const [filterFrequence, setFilterFrequence] = useState('');
  const [filterStatut, setFilterStatut] = useState('');
  const [selectedRows, setSelectedRows] = useState([]);
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);

  useEffect(() => {
    fetchTaches();
    fetchEntites();
  }, []);

  const fetchTaches = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await apiClient.get('/taches/');
      
      let tachesData = [];
      if (Array.isArray(response)) {
        tachesData = response;
      } else if (response && Array.isArray(response.results)) {
        tachesData = response.results;
      } else {
        setError('Format de données inattendu');
        tachesData = [];
      }

      setTaches(tachesData);
    } catch (err) {
      console.error('❌ Erreur lors du chargement des tâches:', err);
      setError('Erreur lors du chargement des tâches automatiques');
    } finally {
      setLoading(false);
    }
  };

  const fetchEntites = async () => {
    try {
      const response = await apiClient.get('/entites/');
      
      let entitesData = [];
      if (Array.isArray(response)) {
        entitesData = response;
      } else if (response && Array.isArray(response.results)) {
        entitesData = response.results;
      } else {
        entitesData = [];
      }

      setEntites(entitesData);
    } catch (err) {
      console.error('Error fetching entites:', err);
      setEntites([]);
    }
  };

  // Filtrage et recherche
  const filteredTaches = taches.filter(tache => {
    const matchesSearch = 
      (tache.nom || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (tache.modele_cible || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (tache.fonction || '').toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesEntite = filterEntite === '' || 
      (tache.entite && tache.entite.id.toString() === filterEntite) ||
      (filterEntite === 'global' && !tache.entite);
    
    const matchesFrequence = filterFrequence === '' || 
      tache.frequence === filterFrequence;
    
    const matchesStatut = filterStatut === '' || 
      tache.active.toString() === filterStatut;
    
    return matchesSearch && matchesEntite && matchesFrequence && matchesStatut;
  });

  // Calculs pour la pagination
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentTaches = Array.isArray(filteredTaches) ? filteredTaches.slice(indexOfFirstItem, indexOfLastItem) : [];
  const totalPages = Math.ceil((Array.isArray(filteredTaches) ? filteredTaches.length : 0) / itemsPerPage);

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
    if (selectedRows.length === currentTaches.length) {
      setSelectedRows([]);
    } else {
      setSelectedRows(currentTaches.map(tache => tache.id));
    }
  };

  // Gestion des actions
  const handleNewTache = () => {
    setEditingTache(null);
    setShowForm(true);
  };

  const handleEdit = (tache) => {
    setEditingTache(tache);
    setShowForm(true);
  };

  const handleDelete = async (tache) => {
    if (window.confirm(`Êtes-vous sûr de vouloir supprimer la tâche "${tache.nom}" ?`)) {
      try {
        await apiClient.delete(`/taches/${tache.id}/`);
        fetchTaches();
      } catch (err) {
        setError('Erreur lors de la suppression');
        console.error('Error deleting tache:', err);
      }
    }
  };

  const handleToggleActive = async (tache) => {
    try {
      await apiClient.patch(`/taches/${tache.id}/`, {
        active: !tache.active
      });
      fetchTaches();
    } catch (err) {
      setError('Erreur lors de la modification');
      console.error('Error toggling active:', err);
    }
  };

  const handleExecuteNow = async (tache) => {
    try {
      setError(null);
      await apiClient.post(`/taches/${tache.id}/executer-now/`);
      // Recharger pour avoir la date de dernière exécution
      setTimeout(() => fetchTaches(), 1000);
    } catch (err) {
      setError('Erreur lors de l\'exécution manuelle');
      console.error('Error executing task:', err);
    }
  };

  const handleShowLogs = (tache) => {
    setSelectedTache(tache);
    setShowLogs(true);
  };

  const handleFormSuccess = () => {
    setShowForm(false);
    setEditingTache(null);
    fetchTaches();
  };

  const handleRetry = () => {
    fetchTaches();
  };

  const resetFilters = () => {
    setSearchTerm('');
    setFilterEntite('');
    setFilterFrequence('');
    setFilterStatut('');
    setCurrentPage(1);
    setShowFilterDropdown(false);
  };

  // Utilitaires d'affichage
  const getFrequenceDisplay = (frequence) => {
    const frequences = {
      'hourly': 'Toutes les heures',
      'daily': 'Quotidienne',
      'weekly': 'Hebdomadaire',
      'monthly': 'Mensuelle'
    };
    return frequences[frequence] || frequence;
  };

  const getStatutProchaineExecution = (tache) => {
    if (!tache.active) return 'Inactive';
    
    const maintenant = new Date();
    const prochaine = new Date(tache.prochaine_execution);
    
    if (prochaine < maintenant) {
      return 'En retard';
    }
    
    const diffHeures = (prochaine - maintenant) / (1000 * 60 * 60);
    if (diffHeures < 1) {
      return 'Bientôt';
    }
    
    return 'Planifiée';
  };

  const getStatutColor = (statut) => {
    switch (statut) {
      case 'Bientôt': return 'bg-gradient-to-r from-orange-50 to-orange-100 text-orange-700 border border-orange-200';
      case 'En retard': return 'bg-gradient-to-r from-red-50 to-red-100 text-red-700 border border-red-200';
      case 'Planifiée': return 'bg-gradient-to-r from-green-50 to-green-100 text-green-700 border border-green-200';
      case 'Inactive': return 'bg-gradient-to-r from-gray-50 to-gray-100 text-gray-700 border border-gray-200';
      default: return 'bg-gradient-to-r from-gray-50 to-gray-100 text-gray-700 border border-gray-200';
    }
  };

  // Statistiques
  const stats = {
    total: taches.length,
    actives: taches.filter(t => t.active).length,
    globales: taches.filter(t => !t.entite).length,
    enRetard: taches.filter(t => {
      if (!t.active) return false;
      const maintenant = new Date();
      const prochaine = new Date(t.prochaine_execution);
      return prochaine < maintenant;
    }).length,
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
                placeholder="Rechercher une tâche..."
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
                    filterEntite || filterFrequence || filterStatut ? 'bg-violet-100 text-violet-700' : 'bg-gray-100 text-gray-700'
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
                      
                      {/* Filtre Portée */}
                      <div className="space-y-1 mb-3">
                        <p className="text-xs font-medium text-gray-700 mb-1">Portée</p>
                        <button
                          onClick={() => {
                            setFilterEntite('');
                            setShowFilterDropdown(false);
                          }}
                          className={`w-full text-left px-2 py-1.5 rounded text-xs ${!filterEntite ? 'bg-violet-50 text-violet-700' : 'text-gray-700 hover:bg-gray-50'}`}
                        >
                          Toutes les portées
                        </button>
                        <button
                          onClick={() => {
                            setFilterEntite('global');
                            setShowFilterDropdown(false);
                          }}
                          className={`w-full text-left px-2 py-1.5 rounded text-xs ${filterEntite === 'global' ? 'bg-violet-50 text-violet-700' : 'text-gray-700 hover:bg-gray-50'}`}
                        >
                          Tâches globales
                        </button>
                        {entites.slice(0, 5).map(entite => (
                          <button
                            key={entite.id}
                            onClick={() => {
                              setFilterEntite(entite.id.toString());
                              setShowFilterDropdown(false);
                            }}
                            className={`w-full text-left px-2 py-1.5 rounded text-xs truncate ${
                              filterEntite === entite.id.toString() ? 'bg-violet-50 text-violet-700' : 'text-gray-700 hover:bg-gray-50'
                            }`}
                          >
                            {entite.raison_sociale}
                          </button>
                        ))}
                      </div>
                      
                      {/* Filtre Fréquence */}
                      <div className="space-y-1 mb-3">
                        <p className="text-xs font-medium text-gray-700 mb-1">Fréquence</p>
                        <button
                          onClick={() => {
                            setFilterFrequence('');
                            setShowFilterDropdown(false);
                          }}
                          className={`w-full text-left px-2 py-1.5 rounded text-xs ${!filterFrequence ? 'bg-violet-50 text-violet-700' : 'text-gray-700 hover:bg-gray-50'}`}
                        >
                          Toutes les fréquences
                        </button>
                        <button
                          onClick={() => {
                            setFilterFrequence('hourly');
                            setShowFilterDropdown(false);
                          }}
                          className={`w-full text-left px-2 py-1.5 rounded text-xs ${filterFrequence === 'hourly' ? 'bg-violet-50 text-violet-700' : 'text-gray-700 hover:bg-gray-50'}`}
                        >
                          Toutes les heures
                        </button>
                        <button
                          onClick={() => {
                            setFilterFrequence('daily');
                            setShowFilterDropdown(false);
                          }}
                          className={`w-full text-left px-2 py-1.5 rounded text-xs ${filterFrequence === 'daily' ? 'bg-violet-50 text-violet-700' : 'text-gray-700 hover:bg-gray-50'}`}
                        >
                          Quotidienne
                        </button>
                        <button
                          onClick={() => {
                            setFilterFrequence('weekly');
                            setShowFilterDropdown(false);
                          }}
                          className={`w-full text-left px-2 py-1.5 rounded text-xs ${filterFrequence === 'weekly' ? 'bg-violet-50 text-violet-700' : 'text-gray-700 hover:bg-gray-50'}`}
                        >
                          Hebdomadaire
                        </button>
                      </div>
                      
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
                            setFilterStatut('true');
                            setShowFilterDropdown(false);
                          }}
                          className={`w-full text-left px-2 py-1.5 rounded text-xs ${filterStatut === 'true' ? 'bg-violet-50 text-violet-700' : 'text-gray-700 hover:bg-gray-50'}`}
                        >
                          Actives seulement
                        </button>
                        <button
                          onClick={() => {
                            setFilterStatut('false');
                            setShowFilterDropdown(false);
                          }}
                          className={`w-full text-left px-2 py-1.5 rounded text-xs ${filterStatut === 'false' ? 'bg-violet-50 text-violet-700' : 'text-gray-700 hover:bg-gray-50'}`}
                        >
                          Inactives seulement
                        </button>
                      </div>
                      
                      {/* Réinitialiser */}
                      {(searchTerm || filterEntite || filterFrequence || filterStatut) && (
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
              onClick={handleNewTache}
              className="ml-2 px-3 py-2 rounded-lg bg-gradient-to-r from-violet-600 to-violet-500 text-white hover:from-violet-700 hover:to-violet-600 transition-all duration-300 flex items-center gap-1.5 text-sm shadow"
            >
              <FiPlus size={14} />
              <span>Nouvelle Tâche</span>
            </button>
          </div>
        </div>

        {/* Statistiques en ligne compactes */}
        <div className="grid grid-cols-4 gap-2 mb-3">
          <div className="bg-white rounded-lg p-2 border border-gray-200 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-600">Total:</span>
                <span className="text-sm font-bold text-violet-600">{stats.total}</span>
              </div>
              <div className="p-1 bg-violet-50 rounded">
                <TbClock className="w-3 h-3 text-violet-600" />
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg p-2 border border-gray-200 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-600">Actives:</span>
                <span className="text-sm font-bold text-green-600">{stats.actives}</span>
              </div>
              <div className="p-1 bg-green-50 rounded">
                <FiCheckCircle className="w-3 h-3 text-green-600" />
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg p-2 border border-gray-200 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-600">Globales:</span>
                <span className="text-sm font-bold text-blue-600">{stats.globales}</span>
              </div>
              <div className="p-1 bg-blue-50 rounded">
                <FiGlobe className="w-3 h-3 text-blue-600" />
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg p-2 border border-gray-200 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-600">En retard:</span>
                <span className="text-sm font-bold text-red-600">{stats.enRetard}</span>
              </div>
              <div className="p-1 bg-red-50 rounded">
                <FiAlertCircle className="w-3 h-3 text-red-600" />
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
            Toutes les tâches
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
                  <FiX className="w-3 h-3 text-red-600" />
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
                  checked={selectedRows.length === currentTaches.length && currentTaches.length > 0}
                  onChange={selectAllRows}
                  className="w-3 h-3 text-violet-600 rounded focus:ring-violet-500 border-gray-300"
                />
                <span className="text-xs text-gray-700">
                  {selectedRows.length} sélectionné(s)
                </span>
              </div>
              {(filterEntite || filterFrequence || filterStatut) && (
                <div className="flex items-center gap-1">
                  {filterEntite && (
                    <span className="px-1.5 py-0.5 bg-violet-50 text-violet-700 text-xs rounded border border-violet-200">
                      {filterEntite === 'global' ? 'Globales' : `Société: ${entites.find(e => e.id.toString() === filterEntite)?.raison_sociale || filterEntite}`}
                    </span>
                  )}
                  {filterFrequence && (
                    <span className="px-1.5 py-0.5 bg-violet-50 text-violet-700 text-xs rounded border border-violet-200">
                      Fréquence: {getFrequenceDisplay(filterFrequence)}
                    </span>
                  )}
                  {filterStatut && (
                    <span className="px-1.5 py-0.5 bg-violet-50 text-violet-700 text-xs rounded border border-violet-200">
                      {filterStatut === 'true' ? 'Actives' : 'Inactives'}
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

        {/* Tableau */}
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead>
              <tr className="bg-gradient-to-r from-gray-50 to-gray-100">
                <th scope="col" className="px-3 py-2 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider border-r border-gray-300">
                  <div className="flex items-center gap-1">
                    <input
                      type="checkbox"
                      checked={selectedRows.length === currentTaches.length && currentTaches.length > 0}
                      onChange={selectAllRows}
                      className="w-3 h-3 text-violet-600 rounded focus:ring-violet-500 border-gray-300"
                    />
                    Tâche
                  </div>
                </th>
                <th scope="col" className="px-3 py-2 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider border-r border-gray-300">
                  Portée
                </th>
                <th scope="col" className="px-3 py-2 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider border-r border-gray-300">
                  Fréquence
                </th>
                <th scope="col" className="px-3 py-2 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider border-r border-gray-300">
                  Modèle cible
                </th>
                <th scope="col" className="px-3 py-2 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider border-r border-gray-300">
                  Dernière exécution
                </th>
                <th scope="col" className="px-3 py-2 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider border-r border-gray-300">
                  Statut
                </th>
                <th scope="col" className="px-3 py-2 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            
            <tbody className="divide-y divide-gray-200">
              {currentTaches.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-3 py-4 text-center">
                    <div className="flex flex-col items-center justify-center">
                      <div className="w-12 h-12 bg-gradient-to-br from-gray-100 to-gray-200 rounded-full flex items-center justify-center mb-2">
                        <TbClock className="w-6 h-6 text-gray-400" />
                      </div>
                      <h3 className="text-sm font-semibold text-gray-900 mb-1">
                        {taches.length === 0 ? 'Aucune tâche trouvée' : 'Aucun résultat'}
                      </h3>
                      <p className="text-gray-600 text-xs mb-3 max-w-md">
                        {taches.length === 0 
                          ? 'Commencez par créer votre première tâche automatique' 
                          : 'Essayez de modifier vos critères de recherche'}
                      </p>
                      {taches.length === 0 && (
                        <button 
                          onClick={handleNewTache}
                          className="px-3 py-1 bg-gradient-to-r from-violet-600 to-violet-500 text-white rounded hover:from-violet-700 hover:to-violet-600 transition-all duration-300 font-medium flex items-center gap-1 text-xs"
                        >
                          <FiPlus size={12} />
                          Créer tâche
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                currentTaches.map((tache) => (
                  <tr 
                    key={tache.id}
                    className={`hover:bg-gradient-to-r hover:from-gray-50 hover:to-white transition-all duration-200 ${
                      selectedRows.includes(tache.id) ? 'bg-gradient-to-r from-violet-50 to-violet-25' : 'bg-white'
                    }`}
                  >
                    {/* Tâche avec checkbox */}
                    <td className="px-3 py-2 border-r border-gray-200">
                      <div className="flex items-center gap-1.5">
                        <input
                          type="checkbox"
                          checked={selectedRows.includes(tache.id)}
                          onChange={() => toggleRowSelection(tache.id)}
                          className="w-3 h-3 text-violet-600 rounded focus:ring-violet-500 border-gray-300"
                        />
                        <div>
                          <div className="text-xs font-semibold text-gray-900 truncate max-w-[120px]">
                            {tache.nom}
                          </div>
                          <div className="text-xs text-gray-500">
                            {tache.fonction}
                          </div>
                        </div>
                      </div>
                    </td>
                    
                    {/* Portée */}
                    <td className="px-3 py-2 border-r border-gray-200">
                      {tache.entite ? (
                        <div className="flex items-center gap-1.5">
                          <div className="w-6 h-6 bg-gradient-to-br from-blue-50 to-blue-100 rounded-full flex items-center justify-center border border-blue-200">
                            <FiDatabase className="w-3 h-3 text-blue-600" />
                          </div>
                          <span className="text-xs text-gray-900 truncate max-w-[80px]">
                            {tache.entite.raison_sociale}
                          </span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5">
                          <div className="w-6 h-6 bg-gradient-to-br from-green-50 to-green-100 rounded-full flex items-center justify-center border border-green-200">
                            <FiGlobe className="w-3 h-3 text-green-600" />
                          </div>
                          <span className="text-xs text-gray-900">Globale</span>
                        </div>
                      )}
                    </td>
                    
                    {/* Fréquence */}
                    <td className="px-3 py-2 border-r border-gray-200">
                      <div className="flex flex-col">
                        <div className="text-xs text-gray-900">
                          {getFrequenceDisplay(tache.frequence)}
                        </div>
                        {tache.heure_execution && (
                          <div className="text-xs text-gray-500 flex items-center gap-0.5 mt-0.5">
                            <FiClock size={10} />
                            <span>{tache.heure_execution}</span>
                          </div>
                        )}
                      </div>
                    </td>
                    
                    {/* Modèle cible */}
                    <td className="px-3 py-2 border-r border-gray-200">
                      <div className="px-1.5 py-0.5 bg-gray-50 text-gray-800 rounded border border-gray-200 text-xs font-mono truncate max-w-[100px]">
                        {tache.modele_cible}
                      </div>
                    </td>
                    
                    {/* Dernière exécution */}
                    <td className="px-3 py-2 border-r border-gray-200">
                      <div className="flex flex-col">
                        {tache.derniere_execution ? (
                          <>
                            <div className="text-xs text-gray-900">
                              {new Date(tache.derniere_execution).toLocaleDateString('fr-FR')}
                            </div>
                            <div className="text-xs text-gray-500">
                              {new Date(tache.derniere_execution).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                            </div>
                          </>
                        ) : (
                          <span className="text-xs text-gray-400">Jamais</span>
                        )}
                      </div>
                    </td>
                    
                    {/* Statut */}
                    <td className="px-3 py-2 border-r border-gray-200">
                      <div className="flex flex-col gap-1">
                        <div className={`px-1.5 py-0.5 rounded flex items-center gap-1 text-xs ${
                          tache.active
                            ? 'bg-gradient-to-r from-green-50 to-emerald-50 text-green-700 border border-green-200' 
                            : 'bg-gradient-to-r from-red-50 to-pink-50 text-red-700 border border-red-200'
                        }`}>
                          {tache.active ? (
                            <>
                              <div className="w-1.5 h-1.5 bg-green-500 rounded-full"></div>
                              <span className="font-medium">Active</span>
                            </>
                          ) : (
                            <>
                              <div className="w-1.5 h-1.5 bg-red-500 rounded-full"></div>
                              <span className="font-medium">Inactive</span>
                            </>
                          )}
                        </div>
                        {tache.active && (
                          <div className={`px-1.5 py-0.5 rounded flex items-center gap-1 text-xs ${getStatutColor(getStatutProchaineExecution(tache))}`}>
                            {getStatutProchaineExecution(tache)}
                          </div>
                        )}
                      </div>
                    </td>
                    
                    {/* Actions */}
                    <td className="px-3 py-2 whitespace-nowrap">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleToggleActive(tache)}
                          className={`p-1 rounded transition-all duration-200 shadow-sm hover:shadow ${
                            tache.active
                              ? 'bg-gradient-to-r from-orange-50 to-orange-100 text-orange-700 hover:from-orange-100 hover:to-orange-200'
                              : 'bg-gradient-to-r from-green-50 to-green-100 text-green-700 hover:from-green-100 hover:to-green-200'
                          }`}
                          title={tache.active ? 'Désactiver' : 'Activer'}
                        >
                          {tache.active ? <FiPause size={12} /> : <FiPlay size={12} />}
                        </button>
                        <button
                          onClick={() => handleExecuteNow(tache)}
                          disabled={!tache.active}
                          className={`p-1 rounded transition-all duration-200 shadow-sm hover:shadow ${
                            tache.active
                              ? 'bg-gradient-to-r from-purple-50 to-purple-100 text-purple-700 hover:from-purple-100 hover:to-purple-200'
                              : 'bg-gradient-to-r from-gray-50 to-gray-100 text-gray-400 cursor-not-allowed'
                          }`}
                          title="Exécuter maintenant"
                        >
                          <FiPlay size={12} />
                        </button>
                        <button
                          onClick={() => handleShowLogs(tache)}
                          className="p-1 bg-gradient-to-r from-blue-50 to-blue-100 text-blue-700 rounded hover:from-blue-100 hover:to-blue-200 transition-all duration-200 shadow-sm hover:shadow"
                          title="Voir les logs"
                        >
                          <FiEye size={12} />
                        </button>
                        <button
                          onClick={() => handleEdit(tache)}
                          className="p-1 bg-gradient-to-r from-violet-50 to-violet-100 text-violet-700 rounded hover:from-violet-100 hover:to-violet-200 transition-all duration-200 shadow-sm hover:shadow"
                          title="Modifier"
                        >
                          <FiEdit2 size={12} />
                        </button>
                        <button
                          onClick={() => handleDelete(tache)}
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
        {currentTaches.length > 0 && (
          <div className="px-3 py-2 border-t border-gray-200 bg-gradient-to-r from-gray-50 to-white">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1">
                  <span className="text-xs text-gray-700">
                    Page {currentPage} sur {totalPages}
                  </span>
                  <span className="text-gray-300">•</span>
                  <span className="text-xs text-gray-700">
                    {indexOfFirstItem + 1}-{Math.min(indexOfLastItem, filteredTaches.length)} sur {filteredTaches.length} tâches
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

      {/* Modaux */}
      {showForm && (
        <TacheFormModal
          tache={editingTache}
          entites={entites}
          onClose={() => {
            setShowForm(false);
            setEditingTache(null);
          }}
          onSuccess={handleFormSuccess}
        />
      )}

      {showLogs && selectedTache && (
        <LogsModal
          tache={selectedTache}
          onClose={() => {
            setShowLogs(false);
            setSelectedTache(null);
          }}
        />
      )}
    </div>
  );
}

// MODAL DE FORMULAIRE TÂCHE - DESIGN MISE À JOUR
function TacheFormModal({ tache, entites, onClose, onSuccess }) {
  const [formData, setFormData] = useState({
    nom: tache?.nom || '',
    modele_cible: tache?.modele_cible || '',
    fonction: tache?.fonction || '',
    frequence: tache?.frequence || 'daily',
    heure_execution: tache?.heure_execution || '00:00',
    entite: tache?.entite?.id || '',
    active: tache?.active ?? true,
    description: tache?.description || ''
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Fonction pour calculer la prochaine exécution
  const calculerProchaineExecution = (frequence, heureExecution) => {
    const maintenant = new Date();
    let prochaine = new Date();
    
    switch (frequence) {
      case 'hourly':
        prochaine.setHours(prochaine.getHours() + 1);
        prochaine.setMinutes(0);
        prochaine.setSeconds(0);
        prochaine.setMilliseconds(0);
        break;
      case 'daily':
        prochaine.setDate(prochaine.getDate() + 1);
        if (heureExecution) {
          const [heures, minutes] = heureExecution.split(':');
          prochaine.setHours(parseInt(heures), parseInt(minutes), 0, 0);
        } else {
          prochaine.setHours(0, 0, 0, 0);
        }
        break;
      case 'weekly':
        prochaine.setDate(prochaine.getDate() + 7);
        if (heureExecution) {
          const [heures, minutes] = heureExecution.split(':');
          prochaine.setHours(parseInt(heures), parseInt(minutes), 0, 0);
        } else {
          prochaine.setHours(0, 0, 0, 0);
        }
        break;
      case 'monthly':
        prochaine.setMonth(prochaine.getMonth() + 1);
        if (heureExecution) {
          const [heures, minutes] = heureExecution.split(':');
          prochaine.setHours(parseInt(heures), parseInt(minutes), 0, 0);
        } else {
          prochaine.setHours(0, 0, 0, 0);
        }
        break;
      default:
        prochaine.setDate(prochaine.getDate() + 1);
        prochaine.setHours(0, 0, 0, 0);
    }
    
    return prochaine.toISOString();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    // Validation
    if (!formData.nom || !formData.modele_cible || !formData.fonction) {
      setError('Tous les champs obligatoires doivent être remplis');
      setLoading(false);
      return;
    }

    try {
      // Calculer la prochaine exécution
      const prochaineExecution = calculerProchaineExecution(
        formData.frequence, 
        formData.heure_execution
      );

      const payload = {
        nom: formData.nom,
        modele_cible: formData.modele_cible,
        fonction: formData.fonction,
        frequence: formData.frequence,
        heure_execution: formData.heure_execution || null,
        entite: formData.entite || null,
        active: formData.active,
        prochaine_execution: prochaineExecution,
        derniere_execution: null
      };

      const url = tache 
        ? `/taches/${tache.id}/`
        : `/taches/`;
      
      const method = tache ? 'PUT' : 'POST';

      const response = await apiClient.request(url, {
        method: method,
        body: JSON.stringify(payload),
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      onSuccess();
    } catch (err) {
      console.error('❌ Erreur sauvegarde:', err);
      
      let errorMessage = 'Erreur lors de la sauvegarde';
      if (err.response?.data) {
        errorMessage = `Erreur ${err.response.status}: ${JSON.stringify(err.response.data)}`;
      } else if (err.message) {
        errorMessage = err.message;
      }
      
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

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-3 z-50 backdrop-blur-sm">
      <div className="bg-white rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-xl">
        {/* Header du modal */}
        <div className="sticky top-0 bg-gradient-to-r from-violet-600 to-violet-500 text-white rounded-t-lg p-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-white/20 backdrop-blur-sm rounded">
                <TbClock className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-base font-bold">
                  {tache ? 'Modifier la tâche' : 'Nouvelle Tâche Automatique'}
                </h2>
                <p className="text-violet-100 text-xs mt-0.5">
                  Configurez une tâche planifiée
                </p>
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
          {/* Section 1: Configuration de base */}
          <div className="bg-gradient-to-br from-gray-50 to-white rounded-lg p-3 border border-gray-200">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-1 h-4 bg-gradient-to-b from-violet-600 to-violet-400 rounded"></div>
              <h3 className="text-sm font-semibold text-gray-900">Configuration de Base</h3>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {/* Nom */}
              <div className="md:col-span-2">
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Nom de la tâche <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.nom}
                  onChange={(e) => handleChange('nom', e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-violet-500 focus:border-transparent text-sm"
                  placeholder="Ex: Nettoyage des anciennes données"
                />
              </div>
              
              {/* Modèle cible */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Modèle cible <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.modele_cible}
                  onChange={(e) => handleChange('modele_cible', e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-violet-500 focus:border-transparent text-sm font-mono"
                  placeholder="Ex: core.Partenaire"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Format: application.Modele
                </p>
              </div>
              
              {/* Fonction */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Fonction <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.fonction}
                  onChange={(e) => handleChange('fonction', e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-violet-500 focus:border-transparent text-sm"
                  placeholder="Ex: nettoyer_anciennes_donnees"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Nom de la fonction à exécuter
                </p>
              </div>
            </div>
          </div>

          {/* Section 2: Planification */}
          <div className="bg-gradient-to-br from-blue-50 to-white rounded-lg p-3 border border-blue-100">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-1 h-4 bg-gradient-to-b from-blue-600 to-blue-400 rounded"></div>
              <h3 className="text-sm font-semibold text-gray-900">Planification</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {/* Fréquence */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Fréquence <span className="text-red-500">*</span>
                </label>
                <select
                  required
                  value={formData.frequence}
                  onChange={(e) => handleChange('frequence', e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-transparent text-sm"
                >
                  <option value="hourly">Toutes les heures</option>
                  <option value="daily">Quotidienne</option>
                  <option value="weekly">Hebdomadaire</option>
                  <option value="monthly">Mensuelle</option>
                </select>
              </div>
              
              {/* Heure d'exécution */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Heure d'exécution
                </label>
                <div className="relative">
                  <FiClock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
                  <input
                    type="time"
                    value={formData.heure_execution}
                    onChange={(e) => handleChange('heure_execution', e.target.value)}
                    className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-transparent text-sm"
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Pour daily/weekly/monthly uniquement
                </p>
              </div>
            </div>
          </div>

          {/* Section 3: Portée */}
          <div className="bg-gradient-to-br from-emerald-50 to-white rounded-lg p-3 border border-emerald-100">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-1 h-4 bg-gradient-to-b from-emerald-600 to-emerald-400 rounded"></div>
              <h3 className="text-sm font-semibold text-gray-900">Portée</h3>
            </div>
            
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Portée d'exécution
              </label>
              <select
                value={formData.entite}
                onChange={(e) => handleChange('entite', e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-transparent text-sm"
              >
                <option value="">Tâche globale (toutes les sociétés)</option>
                {entites.map(entite => (
                  <option key={entite.id} value={entite.id}>
                    Société: {entite.raison_sociale}
                  </option>
                ))}
              </select>
              <p className="text-xs text-gray-500 mt-1">
                Sélectionnez une société spécifique ou laissez vide pour une tâche globale
              </p>
            </div>
          </div>

          {/* Section 4: Statut */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="bg-gradient-to-br from-violet-50 to-white rounded-lg p-3 border border-violet-100">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-1 h-4 bg-gradient-to-b from-violet-600 to-violet-400 rounded"></div>
                <h3 className="text-sm font-semibold text-gray-900">Statut</h3>
              </div>
              <div className="flex items-center">
                <label className="flex items-center space-x-2 cursor-pointer">
                  <div className="relative">
                    <input
                      type="checkbox"
                      checked={formData.active}
                      onChange={(e) => handleChange('active', e.target.checked)}
                      className="sr-only"
                    />
                    <div className={`w-10 h-6 rounded-full transition-colors duration-200 ${
                      formData.active ? 'bg-violet-600' : 'bg-gray-300'
                    }`}></div>
                    <div className={`absolute left-0.5 top-0.5 w-5 h-5 bg-white rounded-full transition-transform duration-200 transform ${
                      formData.active ? 'translate-x-4' : 'translate-x-0'
                    }`}></div>
                  </div>
                  <span className="text-sm text-gray-700">
                    {formData.active ? 'Tâche active' : 'Tâche inactive'}
                  </span>
                </label>
              </div>
            </div>

            {/* Aperçu */}
            <div className="bg-gradient-to-br from-amber-50 to-white rounded-lg p-3 border border-amber-100">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-1 h-4 bg-gradient-to-b from-amber-600 to-amber-400 rounded"></div>
                <h3 className="text-sm font-semibold text-gray-900">Aperçu</h3>
              </div>
              <div className="space-y-1 text-xs">
                <div><span className="font-medium">Prochaine exécution:</span> {
                  new Date(calculerProchaineExecution(formData.frequence, formData.heure_execution)).toLocaleString('fr-FR')
                }</div>
                <div><span className="font-medium">Portée:</span> {
                  formData.entite 
                    ? entites.find(e => e.id == formData.entite)?.raison_sociale 
                    : 'Globale'
                }</div>
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
              className="px-4 py-1.5 bg-gradient-to-r from-violet-600 to-violet-500 text-white rounded-lg hover:from-violet-700 hover:to-violet-600 disabled:opacity-50 transition-all duration-200 font-medium flex items-center space-x-1.5 shadow hover:shadow-md text-sm"
            >
              {loading ? (
                <>
                  <FiRefreshCw className="animate-spin" size={14} />
                  <span>Sauvegarde...</span>
                </>
              ) : (
                <>
                  <FiCheck size={14} />
                  <span>{tache ? 'Mettre à jour' : 'Créer la tâche'}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// MODAL DES LOGS D'EXÉCUTION - DESIGN MISE À JOUR
function LogsModal({ tache, onClose }) {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLogs();
  }, [tache]);

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get(`/taches/${tache.id}/logs/`);
      setLogs(Array.isArray(response) ? response : []);
    } catch (err) {
      console.error('Error fetching logs:', err);
      setLogs([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-3 z-50 backdrop-blur-sm">
      <div className="bg-white rounded-lg w-full max-w-4xl max-h-[80vh] overflow-y-auto shadow-xl">
        <div className="sticky top-0 bg-gradient-to-r from-violet-600 to-violet-500 text-white rounded-t-lg p-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-white/20 backdrop-blur-sm rounded">
                <FiFileText className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-base font-bold">Logs d'exécution</h2>
                <p className="text-violet-100 text-xs mt-0.5">{tache.nom}</p>
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

        <div className="p-4">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-8">
              <div className="relative">
                <div className="w-8 h-8 border-2 border-gray-200 rounded-full"></div>
                <div className="absolute top-0 left-0 w-8 h-8 border-2 border-violet-600 border-t-transparent rounded-full animate-spin"></div>
              </div>
              <div className="mt-4">
                <div className="h-2 bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 rounded-full w-24 animate-pulse mx-auto"></div>
              </div>
            </div>
          ) : logs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8">
              <div className="w-12 h-12 bg-gradient-to-br from-gray-100 to-gray-200 rounded-full flex items-center justify-center mb-3">
                <FiFileText className="w-6 h-6 text-gray-400" />
              </div>
              <h3 className="text-sm font-semibold text-gray-900 mb-1">
                Aucun log disponible
              </h3>
              <p className="text-gray-600 text-xs">
                Cette tâche n'a pas encore été exécutée
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {logs.map((log, index) => (
                <div 
                  key={index} 
                  className="bg-gradient-to-br from-gray-50 to-white rounded-lg p-3 border border-gray-200 hover:border-gray-300 transition-colors"
                >
                  <div className="flex justify-between items-start mb-2">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                      log.statut === 'succes' 
                        ? 'bg-gradient-to-r from-green-50 to-green-100 text-green-700 border border-green-200' 
                        : 'bg-gradient-to-r from-red-50 to-red-100 text-red-700 border border-red-200'
                    }`}>
                      {log.statut === 'succes' ? 'Succès' : 'Échec'}
                    </span>
                    <span className="text-xs text-gray-500">
                      {new Date(log.date_execution).toLocaleString('fr-FR')}
                    </span>
                  </div>
                  <div className="text-sm text-gray-700 mb-2">
                    {log.message}
                  </div>
                  {log.erreur && (
                    <div className="mt-2 p-2 bg-gradient-to-r from-red-50 to-red-100 border border-red-200 rounded text-xs text-red-700 font-mono whitespace-pre-wrap">
                      {log.erreur}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}