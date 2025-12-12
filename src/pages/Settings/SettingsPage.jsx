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
  FiGlobe, 
  FiLock, 
  FiUnlock, 
  FiEye,
  FiChevronLeft, 
  FiChevronRight,
  FiSettings,
  FiShield,
  FiDatabase,
  FiHash,
  FiType,
  FiList,
  FiCode,
  FiDownload,
  FiUpload,
  FiCalendar,
  FiInfo,
  FiAlertCircle,
  FiCheckCircle,
  FiXCircle,
  FiMoreVertical,
  FiChevronDown,
  FiChevronUp,
  FiExternalLink,
  FiFileText,
  FiBriefcase,
  FiHome,
  FiCreditCard,
  FiActivity,
  FiUsers,
  FiImage,
  FiMap,
  FiFolder
} from "react-icons/fi";
import { TbSettings, TbBuildingSkyscraper } from "react-icons/tb";

export default function ParametresPage() {
  const [parametres, setParametres] = useState([]);
  const [entites, setEntites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editingParametre, setEditingParametre] = useState(null);
  const [selectedParametre, setSelectedParametre] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterEntite, setFilterEntite] = useState('');
  const [filterModifiable, setFilterModifiable] = useState('');
  const [selectedRows, setSelectedRows] = useState([]);
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);

  useEffect(() => {
    fetchParametres();
    fetchEntites();
  }, []);

  const fetchParametres = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await apiClient.get('/parametres/');
      
      let parametresData = [];
      if (Array.isArray(response)) {
        parametresData = response;
      } else if (response && Array.isArray(response.results)) {
        parametresData = response.results;
      } else {
        setError('Format de données inattendu');
        parametresData = [];
      }

      setParametres(parametresData);
    } catch (err) {
      console.error('❌ Erreur lors du chargement des paramètres:', err);
      setError('Erreur lors du chargement des paramètres');
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
  const filteredParametres = parametres.filter(parametre => {
    const matchesSearch = 
      parametre.cle?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      parametre.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      parametre.valeur?.toString().toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesEntite = filterEntite === '' || 
      (parametre.entite && parametre.entite.id.toString() === filterEntite) ||
      (filterEntite === 'global' && !parametre.entite);
    
    const matchesModifiable = filterModifiable === '' || 
      parametre.modifiable.toString() === filterModifiable;
    
    return matchesSearch && matchesEntite && matchesModifiable;
  });

  // Calculs pour la pagination
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentParametres = Array.isArray(filteredParametres) ? filteredParametres.slice(indexOfFirstItem, indexOfLastItem) : [];
  const totalPages = Math.ceil((Array.isArray(filteredParametres) ? filteredParametres.length : 0) / itemsPerPage);

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
    if (selectedRows.length === currentParametres.length) {
      setSelectedRows([]);
    } else {
      setSelectedRows(currentParametres.map(parametre => parametre.id));
    }
  };

  // Gestion des actions
  const handleNewParametre = () => {
    setEditingParametre(null);
    setShowForm(true);
  };

  const handleEdit = (parametre) => {
    setEditingParametre(parametre);
    setShowForm(true);
  };

  const handleDelete = async (parametre) => {
    if (window.confirm(`Êtes-vous sûr de vouloir supprimer le paramètre "${parametre.cle}" ?`)) {
      try {
        await apiClient.delete(`/parametres/${parametre.id}/`);
        fetchParametres();
      } catch (err) {
        setError('Erreur lors de la suppression');
        console.error('Error deleting parametre:', err);
      }
    }
  };

  const handleToggleModifiable = async (parametre) => {
    try {
      await apiClient.patch(`/parametres/${parametre.id}/`, {
        modifiable: !parametre.modifiable
      });
      fetchParametres();
    } catch (err) {
      setError('Erreur lors de la modification');
      console.error('Error toggling modifiable:', err);
    }
  };

  const handleViewDetails = (parametre) => {
    setSelectedParametre(parametre);
    setShowDetailModal(true);
  };

  const handleFormSuccess = () => {
    setShowForm(false);
    setEditingParametre(null);
    fetchParametres();
  };

  const handleRetry = () => {
    fetchParametres();
  };

  const resetFilters = () => {
    setSearchTerm('');
    setFilterEntite('');
    setFilterModifiable('');
    setCurrentPage(1);
    setShowFilterDropdown(false);
  };

  // Fonction pour formater l'affichage de la valeur
  const formatValeur = (valeur) => {
    if (valeur === null || valeur === undefined) return '-';
    if (typeof valeur === 'object') {
      try {
        return JSON.stringify(valeur, null, 2);
      } catch {
        return String(valeur);
      }
    }
    return String(valeur);
  };

  // Statistiques
  const stats = {
    total: parametres.length,
    modifiables: parametres.filter(p => p.modifiable).length,
    nonModifiables: parametres.filter(p => !p.modifiable).length,
    globaux: parametres.filter(p => !p.entite).length,
    specifiques: parametres.filter(p => p.entite).length,
    entitesConfigurees: new Set(parametres.map(p => p.entite?.id).filter(id => id)).size
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
                placeholder="Rechercher un paramètre..."
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
                    filterEntite || filterModifiable ? 'bg-violet-100 text-violet-700' : 'bg-gray-100 text-gray-700'
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
                          Globaux seulement
                        </button>
                      </div>
                      
                      {/* Filtre Modifiable */}
                      <div className="space-y-1 mb-3">
                        <p className="text-xs font-medium text-gray-700 mb-1">Modifiable</p>
                        <button
                          onClick={() => {
                            setFilterModifiable('');
                            setShowFilterDropdown(false);
                          }}
                          className={`w-full text-left px-2 py-1.5 rounded text-xs ${!filterModifiable ? 'bg-violet-50 text-violet-700' : 'text-gray-700 hover:bg-gray-50'}`}
                        >
                          Tous les statuts
                        </button>
                        <button
                          onClick={() => {
                            setFilterModifiable('true');
                            setShowFilterDropdown(false);
                          }}
                          className={`w-full text-left px-2 py-1.5 rounded text-xs ${filterModifiable === 'true' ? 'bg-violet-50 text-violet-700' : 'text-gray-700 hover:bg-gray-50'}`}
                        >
                          Modifiables seulement
                        </button>
                        <button
                          onClick={() => {
                            setFilterModifiable('false');
                            setShowFilterDropdown(false);
                          }}
                          className={`w-full text-left px-2 py-1.5 rounded text-xs ${filterModifiable === 'false' ? 'bg-violet-50 text-violet-700' : 'text-gray-700 hover:bg-gray-50'}`}
                        >
                          Non modifiables
                        </button>
                      </div>
                      
                      {/* Réinitialiser */}
                      {(searchTerm || filterEntite || filterModifiable) && (
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
              onClick={handleNewParametre}
              className="ml-2 px-3 py-2 rounded-lg bg-gradient-to-r from-violet-600 to-violet-500 text-white hover:from-violet-700 hover:to-violet-600 transition-all duration-300 flex items-center gap-1.5 text-sm shadow"
            >
              <FiPlus size={14} />
              <span>Nouveau Paramètre</span>
            </button>
          </div>
        </div>

        {/* Statistiques en ligne compactes */}
        <div className="grid grid-cols-5 gap-2 mb-3">
          <div className="bg-white rounded-lg p-2 border border-gray-200 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-600">Total:</span>
                <span className="text-sm font-bold text-violet-600">{stats.total}</span>
              </div>
              <div className="p-1 bg-violet-50 rounded">
                <TbSettings className="w-3 h-3 text-violet-600" />
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg p-2 border border-gray-200 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-600">Modifiables:</span>
                <span className="text-sm font-bold text-green-600">{stats.modifiables}</span>
              </div>
              <div className="p-1 bg-green-50 rounded">
                <FiUnlock className="w-3 h-3 text-green-600" />
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg p-2 border border-gray-200 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-600">Verrouillés:</span>
                <span className="text-sm font-bold text-red-600">{stats.nonModifiables}</span>
              </div>
              <div className="p-1 bg-red-50 rounded">
                <FiLock className="w-3 h-3 text-red-600" />
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg p-2 border border-gray-200 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-600">Globaux:</span>
                <span className="text-sm font-bold text-blue-600">{stats.globaux}</span>
              </div>
              <div className="p-1 bg-blue-50 rounded">
                <FiGlobe className="w-3 h-3 text-blue-600" />
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg p-2 border border-gray-200 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-600">Spécifiques:</span>
                <span className="text-sm font-bold text-orange-600">{stats.specifiques}</span>
              </div>
              <div className="p-1 bg-orange-50 rounded">
                <FiBriefcase className="w-3 h-3 text-orange-600" />
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
            Tous les paramètres
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
                  checked={selectedRows.length === currentParametres.length && currentParametres.length > 0}
                  onChange={selectAllRows}
                  className="w-3 h-3 text-violet-600 rounded focus:ring-violet-500 border-gray-300"
                />
                <span className="text-xs text-gray-700">
                  {selectedRows.length} sélectionné(s)
                </span>
              </div>
              {(filterEntite || filterModifiable) && (
                <div className="flex items-center gap-1">
                  {filterEntite === 'global' && (
                    <span className="px-1.5 py-0.5 bg-violet-50 text-violet-700 text-xs rounded border border-violet-200">
                      Globaux seulement
                    </span>
                  )}
                  {filterModifiable === 'true' && (
                    <span className="px-1.5 py-0.5 bg-violet-50 text-violet-700 text-xs rounded border border-violet-200">
                      Modifiables
                    </span>
                  )}
                  {filterModifiable === 'false' && (
                    <span className="px-1.5 py-0.5 bg-violet-50 text-violet-700 text-xs rounded border border-violet-200">
                      Non modifiables
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
                      checked={selectedRows.length === currentParametres.length && currentParametres.length > 0}
                      onChange={selectAllRows}
                      className="w-3 h-3 text-violet-600 rounded focus:ring-violet-500 border-gray-300"
                    />
                    ID
                  </div>
                </th>
                <th scope="col" className="px-3 py-2 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider border-r border-gray-300">
                  Clé
                </th>
                <th scope="col" className="px-3 py-2 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider border-r border-gray-300">
                  Valeur
                </th>
                <th scope="col" className="px-3 py-2 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider border-r border-gray-300">
                  Description
                </th>
                <th scope="col" className="px-3 py-2 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider border-r border-gray-300">
                  Portée
                </th>
                <th scope="col" className="px-3 py-2 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider border-r border-gray-300">
                  Modifiable
                </th>
                <th scope="col" className="px-3 py-2 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            
            <tbody className="divide-y divide-gray-200">
              {currentParametres.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-3 py-4 text-center">
                    <div className="flex flex-col items-center justify-center">
                      <div className="w-12 h-12 bg-gradient-to-br from-gray-100 to-gray-200 rounded-full flex items-center justify-center mb-2">
                        <TbSettings className="w-6 h-6 text-gray-400" />
                      </div>
                      <h3 className="text-sm font-semibold text-gray-900 mb-1">
                        {parametres.length === 0 ? 'Aucun paramètre trouvé' : 'Aucun résultat'}
                      </h3>
                      <p className="text-gray-600 text-xs mb-3 max-w-md">
                        {parametres.length === 0 
                          ? 'Commencez par créer votre premier paramètre' 
                          : 'Essayez de modifier vos critères de recherche'}
                      </p>
                      {parametres.length === 0 && (
                        <button 
                          onClick={handleNewParametre}
                          className="px-3 py-1 bg-gradient-to-r from-violet-600 to-violet-500 text-white rounded hover:from-violet-700 hover:to-violet-600 transition-all duration-300 font-medium flex items-center gap-1 text-xs"
                        >
                          <FiPlus size={12} />
                          Créer paramètre
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                currentParametres.map((parametre) => (
                  <tr 
                    key={parametre.id}
                    className={`hover:bg-gradient-to-r hover:from-gray-50 hover:to-white transition-all duration-200 ${
                      selectedRows.includes(parametre.id) ? 'bg-gradient-to-r from-violet-50 to-violet-25' : 'bg-white'
                    }`}
                  >
                    {/* ID avec checkbox */}
                    <td className="px-3 py-2 whitespace-nowrap border-r border-gray-200">
                      <div className="flex items-center gap-1.5">
                        <input
                          type="checkbox"
                          checked={selectedRows.includes(parametre.id)}
                          onChange={() => toggleRowSelection(parametre.id)}
                          className="w-3 h-3 text-violet-600 rounded focus:ring-violet-500 border-gray-300"
                        />
                        <span className="px-1 py-0.5 bg-gray-100 text-gray-800 rounded text-xs font-medium font-mono">
                          #{parametre.id}
                        </span>
                      </div>
                    </td>
                    
                    {/* Clé */}
                    <td className="px-3 py-2 border-r border-gray-200">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 bg-gradient-to-br from-violet-50 to-violet-100 rounded flex items-center justify-center border border-violet-200">
                          <FiHash className="w-3 h-3 text-violet-600" />
                        </div>
                        <div>
                          <div className="text-xs font-semibold text-gray-900 truncate max-w-[120px] font-mono">{parametre.cle}</div>
                          <div className="text-xs text-gray-500">Type: {typeof parametre.valeur}</div>
                        </div>
                      </div>
                    </td>
                    
                    {/* Valeur */}
                    <td className="px-3 py-2 border-r border-gray-200">
                      <div className="max-w-xs">
                        <div className="text-xs text-gray-600 bg-gray-50 px-2 py-1 rounded border border-gray-200 break-all font-mono max-h-16 overflow-y-auto">
                          {formatValeur(parametre.valeur).substring(0, 100)}
                          {formatValeur(parametre.valeur).length > 100 ? '...' : ''}
                        </div>
                      </div>
                    </td>
                    
                    {/* Description */}
                    <td className="px-3 py-2 border-r border-gray-200">
                      <div className="max-w-[120px]">
                        <div className="text-xs text-gray-900 truncate" title={parametre.description}>
                          {parametre.description || '-'}
                        </div>
                      </div>
                    </td>
                    
                    {/* Portée */}
                    <td className="px-3 py-2 border-r border-gray-200">
                      <div className="flex flex-col">
                        {parametre.entite ? (
                          <div className="flex items-center gap-1">
                            <div className="w-4 h-4 bg-gradient-to-br from-orange-50 to-orange-100 rounded flex items-center justify-center border border-orange-200">
                              <FiBriefcase className="w-2 h-2 text-orange-600" />
                            </div>
                            <span className="text-xs text-gray-900 truncate max-w-[80px]">
                              {parametre.entite.raison_sociale}
                            </span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1">
                            <div className="w-4 h-4 bg-gradient-to-br from-blue-50 to-blue-100 rounded flex items-center justify-center border border-blue-200">
                              <FiGlobe className="w-2 h-2 text-blue-600" />
                            </div>
                            <span className="text-xs text-gray-900">Global</span>
                          </div>
                        )}
                        <div className="text-xs text-gray-500 mt-0.5">
                          {parametre.entite ? 'Spécifique' : 'Système'}
                        </div>
                      </div>
                    </td>
                    
                    {/* Modifiable */}
                    <td className="px-3 py-2 border-r border-gray-200">
                      <div className="flex items-center">
                        <div className={`px-1.5 py-0.5 rounded flex items-center gap-1 ${
                          parametre.modifiable
                            ? 'bg-gradient-to-r from-green-50 to-emerald-50 text-green-700 border border-green-200' 
                            : 'bg-gradient-to-r from-red-50 to-pink-50 text-red-700 border border-red-200'
                        }`}>
                          {parametre.modifiable ? (
                            <>
                              <div className="w-1.5 h-1.5 bg-green-500 rounded-full"></div>
                              <span className="text-xs font-medium">Oui</span>
                            </>
                          ) : (
                            <>
                              <div className="w-1.5 h-1.5 bg-red-500 rounded-full"></div>
                              <span className="text-xs font-medium">Non</span>
                            </>
                          )}
                        </div>
                      </div>
                    </td>
                    
                    {/* Actions */}
                    <td className="px-3 py-2 whitespace-nowrap">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleViewDetails(parametre)}
                          className="p-1 bg-gradient-to-r from-gray-50 to-gray-100 text-gray-700 rounded hover:from-gray-100 hover:to-gray-200 transition-all duration-200 shadow-sm hover:shadow"
                          title="Voir détails"
                        >
                          <FiEye size={12} />
                        </button>
                        <button
                          onClick={() => handleToggleModifiable(parametre)}
                          className={`p-1 rounded hover:shadow transition-all duration-200 ${
                            parametre.modifiable
                              ? 'bg-gradient-to-r from-orange-50 to-amber-100 text-orange-700 hover:from-orange-100 hover:to-amber-200'
                              : 'bg-gradient-to-r from-green-50 to-emerald-100 text-green-700 hover:from-green-100 hover:to-emerald-200'
                          }`}
                          title={parametre.modifiable ? 'Verrouiller' : 'Déverrouiller'}
                        >
                          {parametre.modifiable ? <FiLock size={12} /> : <FiUnlock size={12} />}
                        </button>
                        <button
                          onClick={() => handleEdit(parametre)}
                          className="p-1 bg-gradient-to-r from-violet-50 to-violet-100 text-violet-700 rounded hover:from-violet-100 hover:to-violet-200 transition-all duration-200 shadow-sm hover:shadow"
                          title="Modifier"
                        >
                          <FiEdit2 size={12} />
                        </button>
                        <button
                          onClick={() => handleDelete(parametre)}
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
        {currentParametres.length > 0 && (
          <div className="px-3 py-2 border-t border-gray-200 bg-gradient-to-r from-gray-50 to-white">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1">
                  <span className="text-xs text-gray-700">
                    Page {currentPage} sur {totalPages}
                  </span>
                  <span className="text-gray-300">•</span>
                  <span className="text-xs text-gray-700">
                    {indexOfFirstItem + 1}-{Math.min(indexOfLastItem, filteredParametres.length)} sur {filteredParametres.length} paramètres
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
        <ParametreFormModal
          parametre={editingParametre}
          entites={entites}
          onClose={() => {
            setShowForm(false);
            setEditingParametre(null);
          }}
          onSuccess={handleFormSuccess}
        />
      )}

      {showDetailModal && selectedParametre && (
        <ParametreDetailModal
          parametre={selectedParametre}
          onClose={() => {
            setShowDetailModal(false);
            setSelectedParametre(null);
          }}
        />
      )}
    </div>
  );
}

// MODAL DE DÉTAILS PARAMÈTRE - DESIGN MIS À JOUR
function ParametreDetailModal({ parametre, onClose }) {
  const formatValeurDisplay = (valeur) => {
    if (typeof valeur === 'object' && valeur !== null) {
      return (
        <pre className="bg-gray-50 p-3 rounded border border-gray-200 overflow-x-auto text-sm font-mono">
          {JSON.stringify(valeur, null, 2)}
        </pre>
      );
    }
    return (
      <div className="bg-gray-50 px-3 py-2 rounded border border-gray-200 text-sm font-mono break-all">
        {String(valeur)}
      </div>
    );
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-3 z-50 backdrop-blur-sm">
      <div className="bg-white rounded-lg w-full max-w-4xl max-h-[90vh] overflow-y-auto shadow-xl">
        {/* Header du modal */}
        <div className="sticky top-0 bg-gradient-to-r from-violet-600 to-violet-500 text-white rounded-t-lg p-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-white/20 backdrop-blur-sm rounded">
                <TbSettings className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-base font-bold">Détails du Paramètre</h2>
                <p className="text-violet-100 text-xs mt-0.5 font-mono">{parametre.cle}</p>
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
              <TbSettings className="w-16 h-16 text-violet-600" />
            </div>
            <div className="flex-1 text-center md:text-left">
              <h1 className="text-xl font-bold text-gray-900 font-mono">{parametre.cle}</h1>
              <p className="text-gray-600 mt-1">{parametre.description || 'Aucune description'}</p>
              <div className="flex flex-wrap gap-2 mt-3 justify-center md:justify-start">
                <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                  parametre.modifiable
                    ? 'bg-green-100 text-green-800' 
                    : 'bg-red-100 text-red-800'
                }`}>
                  {parametre.modifiable ? 'Modifiable' : 'Non modifiable'}
                </span>
                {parametre.entite ? (
                  <span className="inline-flex items-center px-3 py-1 bg-orange-100 text-orange-800 rounded-full text-xs font-medium">
                    <FiBriefcase className="w-3 h-3 mr-1" />
                    {parametre.entite.raison_sociale}
                  </span>
                ) : (
                  <span className="inline-flex items-center px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium">
                    <FiGlobe className="w-3 h-3 mr-1" />
                    Global
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
                <p className="text-xs font-medium text-gray-500 mb-1">Identifiant</p>
                <p className="text-sm text-gray-900 font-mono font-medium">#{parametre.id}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500 mb-1">Type de valeur</p>
                <p className="text-sm text-gray-900">
                  {typeof parametre.valeur === 'object' ? 'Object/JSON' : 
                   typeof parametre.valeur === 'boolean' ? 'Booléen' : 
                   typeof parametre.valeur === 'number' ? 'Nombre' : 'Texte'}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500 mb-1">Date de création</p>
                <p className="text-sm text-gray-900">
                  {parametre.date_creation ? new Date(parametre.date_creation).toLocaleDateString('fr-FR') : '-'}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500 mb-1">Dernière modification</p>
                <p className="text-sm text-gray-900">
                  {new Date(parametre.date_maj).toLocaleDateString('fr-FR')}
                  <span className="text-xs text-gray-500 ml-2">
                    {new Date(parametre.date_maj).toLocaleTimeString('fr-FR')}
                  </span>
                </p>
              </div>
            </div>
          </div>

          {/* Description */}
          <div className="bg-gradient-to-br from-blue-50 to-white rounded-lg p-4 border border-blue-200">
            <h3 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-1.5">
              <div className="w-1 h-4 bg-gradient-to-b from-blue-600 to-blue-400 rounded"></div>
              Description
            </h3>
            <p className="text-sm text-gray-900">{parametre.description || 'Aucune description'}</p>
          </div>

          {/* Valeur */}
          <div className="bg-gradient-to-br from-emerald-50 to-white rounded-lg p-4 border border-emerald-200">
            <h3 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-1.5">
              <div className="w-1 h-4 bg-gradient-to-b from-emerald-600 to-emerald-400 rounded"></div>
              Valeur
            </h3>
            {formatValeurDisplay(parametre.valeur)}
          </div>

          {/* Portée et Statut */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-gradient-to-br from-orange-50 to-white rounded-lg p-4 border border-orange-200">
              <h3 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-1.5">
                <div className="w-1 h-4 bg-gradient-to-b from-orange-600 to-orange-400 rounded"></div>
                Portée
              </h3>
              <div>
                {parametre.entite ? (
                  <div>
                    <p className="text-sm font-medium text-gray-900">{parametre.entite.raison_sociale}</p>
                    <p className="text-xs text-gray-500 mt-0.5">Paramètre spécifique à l'entité</p>
                  </div>
                ) : (
                  <div>
                    <p className="text-sm font-medium text-gray-900">Global</p>
                    <p className="text-xs text-gray-500 mt-0.5">Paramètre système global</p>
                  </div>
                )}
              </div>
            </div>

            <div className="bg-gradient-to-br from-violet-50 to-white rounded-lg p-4 border border-violet-200">
              <h3 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-1.5">
                <div className="w-1 h-4 bg-gradient-to-b from-violet-600 to-violet-400 rounded"></div>
                Statut
              </h3>
              <div className="flex flex-col gap-2">
                <div className={`px-2 py-1 rounded flex items-center gap-1 w-fit ${
                  parametre.modifiable
                    ? 'bg-gradient-to-r from-green-50 to-emerald-50 text-green-700 border border-green-200' 
                    : 'bg-gradient-to-r from-red-50 to-pink-50 text-red-700 border border-red-200'
                }`}>
                  {parametre.modifiable ? (
                    <>
                      <FiUnlock className="w-3 h-3" />
                      <span className="text-xs font-medium">Modifiable</span>
                    </>
                  ) : (
                    <>
                      <FiLock className="w-3 h-3" />
                      <span className="text-xs font-medium">Non modifiable</span>
                    </>
                  )}
                </div>
                <p className="text-xs text-gray-500">
                  {parametre.modifiable 
                    ? 'Ce paramètre peut être modifié par les utilisateurs autorisés'
                    : 'Ce paramètre est verrouillé et ne peut être modifié'}
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

// COMPOSANT MODAL AVEC DROPDOWNS AVEC RECHERCHE INTÉGRÉE - FORMULAIRE COMPLET
function ParametreFormModal({ parametre, entites, onClose, onSuccess }) {
  const [formData, setFormData] = useState({
    cle: parametre?.cle || '',
    valeur: parametre?.valeur || '',
    description: parametre?.description || '',
    entite: parametre?.entite?.id || '',
    modifiable: parametre?.modifiable ?? true
  });

  const [valeurType, setValeurType] = useState('texte');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  // ÉTATS POUR RECHERCHE DANS LES DROPDOWNS
  const [searchEntite, setSearchEntite] = useState('');

  // S'assurer que les tableaux sont toujours des tableaux
  const entitesArray = Array.isArray(entites) ? entites : [];

  // Filtrer les listes avec la recherche
  const filteredEntites = entitesArray.filter(entite =>
    entite.raison_sociale.toLowerCase().includes(searchEntite.toLowerCase())
  );

  useEffect(() => {
    // Déterminer le type de valeur
    if (parametre) {
      const val = parametre.valeur;
      if (typeof val === 'boolean') {
        setValeurType('boolean');
        setFormData(prev => ({ ...prev, valeur: val }));
      } else if (typeof val === 'number') {
        setValeurType('nombre');
        setFormData(prev => ({ ...prev, valeur: val }));
      } else if (typeof val === 'object') {
        setValeurType('json');
        setFormData(prev => ({ ...prev, valeur: JSON.stringify(val, null, 2) }));
      } else {
        setValeurType('texte');
      }
    }
  }, [parametre]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    // Validation
    if (!formData.cle.trim()) {
      setError('La clé est obligatoire');
      setLoading(false);
      return;
    }

    if (!formData.description.trim()) {
      setError('La description est obligatoire');
      setLoading(false);
      return;
    }

    try {
      // Préparer la valeur selon le type
      let valeurFinale = formData.valeur;
      
      if (valeurType === 'nombre') {
        valeurFinale = parseFloat(formData.valeur);
        if (isNaN(valeurFinale)) {
          setError('La valeur doit être un nombre valide');
          setLoading(false);
          return;
        }
      } else if (valeurType === 'boolean') {
        valeurFinale = formData.valeur === 'true';
      } else if (valeurType === 'json') {
        try {
          valeurFinale = JSON.parse(formData.valeur);
        } catch (err) {
          setError('JSON invalide');
          setLoading(false);
          return;
        }
      }

      const payload = {
        ...formData,
        valeur: valeurFinale,
        entite: formData.entite || null
      };

      const url = parametre 
        ? `/parametres/${parametre.id}/`
        : `/parametres/`;
      
      const method = parametre ? 'PUT' : 'POST';

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

  // Composant réutilisable pour les dropdowns avec recherche
  const SearchableDropdown = ({ 
    label, 
    value, 
    onChange, 
    options, 
    searchValue,
    onSearchChange,
    placeholder,
    required = false,
    disabled = false,
    icon: Icon,
    getOptionLabel = (option) => option,
    getOptionValue = (option) => option,
    renderOption = (option) => getOptionLabel(option)
  }) => {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef(null);
    const inputRef = useRef(null);

    const filteredOptions = options.filter(option =>
      getOptionLabel(option).toLowerCase().includes(searchValue.toLowerCase())
    );

    const selectedOption = options.find(opt => getOptionValue(opt) === value);

    useEffect(() => {
      const handleMouseDown = (event) => {
        if (!dropdownRef.current?.contains(event.target)) {
          setIsOpen(false);
          onSearchChange('');
        }
      };

      document.addEventListener('mousedown', handleMouseDown, true);
      
      return () => {
        document.removeEventListener('mousedown', handleMouseDown, true);
      };
    }, [onSearchChange]);

    const handleToggle = () => {
      if (!disabled) {
        setIsOpen(!isOpen);
        if (!isOpen) {
          setTimeout(() => {
            inputRef.current?.focus();
          }, 0);
        } else {
          onSearchChange('');
        }
      }
    };

    const handleInputMouseDown = (e) => {
      e.stopPropagation();
    };

    const handleInputFocus = (e) => {
      e.stopPropagation();
    };

    const handleInputClick = (e) => {
      e.stopPropagation();
    };

    const handleOptionClick = (optionValue) => {
      onChange(optionValue);
      setIsOpen(false);
      onSearchChange('');
    };

    return (
      <div className="relative" ref={dropdownRef}>
        {label && (
          <label className="block text-xs font-medium text-gray-700 mb-1">
            {label} {required && <span className="text-red-500">*</span>}
          </label>
        )}
        
        {/* Bouton d'ouverture du dropdown */}
        <button
          type="button"
          onClick={handleToggle}
          onMouseDown={(e) => e.preventDefault()}
          disabled={disabled}
          className={`w-full text-left border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-violet-500 focus:border-transparent transition-all text-sm ${
            disabled 
              ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
              : 'bg-white hover:border-gray-400'
          } ${isOpen ? 'ring-1 ring-violet-500 border-violet-500' : ''}`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {Icon && <Icon className="text-gray-400" size={16} />}
              {selectedOption ? (
                <span className="text-gray-900 font-medium truncate">{getOptionLabel(selectedOption)}</span>
              ) : (
                <span className="text-gray-500 truncate">{placeholder || `Sélectionnez...`}</span>
              )}
            </div>
            <svg className={`h-4 w-4 text-gray-400 transition-transform ${isOpen ? 'transform rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </button>

        {/* Dropdown avec recherche */}
        {isOpen && (
          <div 
            className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-56 overflow-hidden"
            onMouseDown={handleInputMouseDown}
          >
            {/* Barre de recherche */}
            <div className="p-2 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-gray-100">
              <div className="relative">
                <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
                <input
                  ref={inputRef}
                  type="text"
                  value={searchValue}
                  onChange={(e) => onSearchChange(e.target.value)}
                  onMouseDown={handleInputMouseDown}
                  onClick={handleInputClick}
                  onFocus={handleInputFocus}
                  className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-violet-500 focus:border-transparent text-sm bg-white"
                  placeholder={`Rechercher...`}
                  autoFocus
                />
              </div>
              <p className="text-xs text-gray-500 mt-1 px-1">
                {filteredOptions.length} résultat(s) trouvé(s)
              </p>
            </div>
            
            {/* Liste des options */}
            <div className="max-h-44 overflow-y-auto">
              <div
                className={`px-3 py-2 cursor-pointer hover:bg-violet-50 text-sm border-b border-gray-100 transition-colors ${
                  !value ? 'bg-gradient-to-r from-violet-50 to-violet-100 text-violet-700 font-medium' : 'text-gray-700 hover:bg-violet-50'
                }`}
                onMouseDown={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                }}
                onClick={() => handleOptionClick('')}
              >
                <div className="flex items-center gap-2">
                  <FiGlobe className="text-gray-400" size={14} />
                  <span>Paramètre global (aucune entité)</span>
                </div>
              </div>
              
              {filteredOptions.length === 0 ? (
                <div className="p-4 text-center">
                  <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-2">
                    <FiSearch className="text-gray-400" />
                  </div>
                  <p className="text-gray-500 text-xs">Aucun résultat trouvé</p>
                </div>
              ) : (
                filteredOptions.map((option, index) => (
                  <div
                    key={index}
                    className={`px-3 py-2 cursor-pointer hover:bg-violet-50 text-sm border-b border-gray-100 last:border-b-0 transition-colors ${
                      value === getOptionValue(option) ? 'bg-gradient-to-r from-violet-50 to-violet-100 text-violet-700 font-medium' : 'text-gray-700'
                    }`}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                    }}
                    onClick={() => handleOptionClick(getOptionValue(option))}
                  >
                    {renderOption(option)}
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Affichage de la valeur sélectionnée */}
        {selectedOption && !isOpen && (
          <p className="text-xs text-emerald-600 mt-1 flex items-center gap-1">
            <FiCheck size={12} />
            Sélectionné: <span className="font-medium truncate">{getOptionLabel(selectedOption)}</span>
          </p>
        )}
      </div>
    );
  };

  const renderValeurInput = () => {
    switch (valeurType) {
      case 'boolean':
        return (
          <select
            value={formData.valeur}
            onChange={(e) => handleChange('valeur', e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-violet-500 focus:border-transparent text-sm"
          >
            <option value="true">True</option>
            <option value="false">False</option>
          </select>
        );
      
      case 'nombre':
        return (
          <div className="relative">
            <FiHash className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
            <input
              type="number"
              step="any"
              value={formData.valeur}
              onChange={(e) => handleChange('valeur', e.target.value)}
              className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-violet-500 focus:border-transparent text-sm"
              placeholder="0.00"
            />
          </div>
        );
      
      case 'json':
        return (
          <div className="relative">
            <FiCode className="absolute left-3 top-3 text-gray-400" size={16} />
            <textarea
              value={formData.valeur}
              onChange={(e) => handleChange('valeur', e.target.value)}
              rows={6}
              className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-violet-500 focus:border-transparent font-mono text-sm"
              placeholder='{"key": "value"}'
            />
          </div>
        );
      
      default:
        return (
          <div className="relative">
            <FiType className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
            <textarea
              value={formData.valeur}
              onChange={(e) => handleChange('valeur', e.target.value)}
              rows={3}
              className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-violet-500 focus:border-transparent text-sm"
              placeholder="Valeur du paramètre..."
            />
          </div>
        );
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-3 z-50 backdrop-blur-sm">
      <div className="bg-white rounded-lg w-full max-w-4xl max-h-[90vh] overflow-y-auto shadow-xl">
        {/* Header du modal avec gradient - COMPACT */}
        <div className="sticky top-0 bg-gradient-to-r from-violet-600 to-violet-500 text-white rounded-t-lg p-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-white/20 backdrop-blur-sm rounded">
                <TbSettings className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-base font-bold">
                  {parametre ? 'Modifier le paramètre' : 'Nouveau Paramètre'}
                </h2>
                {!parametre && (
                  <p className="text-violet-100 text-xs mt-0.5">
                    Créez un nouveau paramètre système
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
                <FiAlertCircle className="text-red-600" size={14} />
              </div>
              <span className="text-red-800 text-xs font-medium whitespace-pre-line">{error}</span>
            </div>
          </div>
        )}
        
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {/* Section 1: Informations de Base */}
          <div className="bg-gradient-to-br from-gray-50 to-white rounded-lg p-3 border border-gray-200">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-1 h-4 bg-gradient-to-b from-violet-600 to-violet-400 rounded"></div>
              <h3 className="text-sm font-semibold text-gray-900">Informations de Base</h3>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
              {/* Clé */}
              <div className="lg:col-span-2">
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Clé <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <FiHash className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
                  <input
                    type="text"
                    required
                    value={formData.cle}
                    onChange={(e) => handleChange('cle', e.target.value)}
                    className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-violet-500 focus:border-transparent bg-white text-sm font-mono"
                    placeholder="NOM_DU_PARAMETRE"
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Identifiant unique en majuscules (ex: TAUX_TVA, SEUIL_MAX)
                </p>
              </div>
              
              {/* Type de valeur */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Type de valeur
                </label>
                <div className="relative">
                  <FiList className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
                  <select
                    value={valeurType}
                    onChange={(e) => setValeurType(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-violet-500 focus:border-transparent text-sm appearance-none"
                  >
                    <option value="texte">Texte</option>
                    <option value="nombre">Nombre</option>
                    <option value="boolean">Booléen</option>
                    <option value="json">JSON</option>
                  </select>
                </div>
              </div>
              
              {/* Modifiable */}
              <div className="flex items-end">
                <label className="flex items-center gap-2 cursor-pointer">
                  <div className="relative">
                    <input
                      type="checkbox"
                      checked={formData.modifiable}
                      onChange={(e) => handleChange('modifiable', e.target.checked)}
                      className="sr-only"
                    />
                    <div className={`w-10 h-5 rounded-full transition-colors duration-300 ${
                      formData.modifiable ? 'bg-green-500' : 'bg-gray-300'
                    }`}>
                      <div className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform duration-300 ${
                        formData.modifiable ? 'transform translate-x-5' : ''
                      }`}></div>
                    </div>
                  </div>
                  <div>
                    <span className="text-sm font-medium text-gray-700">
                      Paramètre modifiable
                    </span>
                    <p className="text-xs text-gray-500">
                      {formData.modifiable ? 'Les utilisateurs peuvent modifier' : 'Verrouillé en lecture seule'}
                    </p>
                  </div>
                </label>
              </div>
            </div>
          </div>

          {/* Section 2: Portée */}
          <div className="bg-gradient-to-br from-orange-50 to-white rounded-lg p-3 border border-orange-100">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-1 h-4 bg-gradient-to-b from-orange-600 to-orange-400 rounded"></div>
              <h3 className="text-sm font-semibold text-gray-900">Portée</h3>
            </div>
            <SearchableDropdown
              label="Entité"
              value={formData.entite}
              onChange={(value) => handleChange('entite', value)}
              options={entitesArray}
              searchValue={searchEntite}
              onSearchChange={setSearchEntite}
              placeholder="Sélectionnez une entité (optionnel)"
              icon={FiBriefcase}
              getOptionLabel={(entite) => `${entite.raison_sociale} (${entite.forme_juridique || 'Société'})`}
              getOptionValue={(entite) => entite.id}
              renderOption={(entite) => (
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 bg-gradient-to-br from-orange-50 to-orange-100 rounded flex items-center justify-center">
                    <FiBriefcase className="w-3 h-3 text-orange-600" />
                  </div>
                  <div>
                    <div className="text-xs font-medium text-gray-900">{entite.raison_sociale}</div>
                    <div className="text-xs text-gray-500">{entite.activite || 'Aucune activité'}</div>
                  </div>
                </div>
              )}
            />
            <p className="text-xs text-gray-500 mt-2">
              Laisser vide pour créer un paramètre global (appliqué à toutes les entités)
            </p>
          </div>

          {/* Section 3: Description */}
          <div className="bg-gradient-to-br from-blue-50 to-white rounded-lg p-3 border border-blue-100">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-1 h-4 bg-gradient-to-b from-blue-600 to-blue-400 rounded"></div>
              <h3 className="text-sm font-semibold text-gray-900">Description</h3>
            </div>
            <div className="relative">
              <FiInfo className="absolute left-3 top-3 text-gray-400" size={16} />
              <textarea
                required
                value={formData.description}
                onChange={(e) => handleChange('description', e.target.value)}
                rows={2}
                className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-transparent text-sm"
                placeholder="Description détaillée du paramètre et de son utilisation..."
              />
            </div>
          </div>

          {/* Section 4: Valeur */}
          <div className="bg-gradient-to-br from-emerald-50 to-white rounded-lg p-3 border border-emerald-100">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-1 h-4 bg-gradient-to-b from-emerald-600 to-emerald-400 rounded"></div>
              <h3 className="text-sm font-semibold text-gray-900">Valeur</h3>
            </div>
            {renderValeurInput()}
          </div>

          {/* Aperçu */}
          <div className="bg-gradient-to-br from-gray-50 to-white rounded-lg p-3 border border-gray-200">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-1 h-4 bg-gradient-to-b from-gray-600 to-gray-400 rounded"></div>
              <h3 className="text-sm font-semibold text-gray-900">Aperçu du paramètre</h3>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2">
                <strong className="text-gray-700 w-24">Clé:</strong>
                <span className="bg-gray-100 px-2 py-1 rounded text-xs font-mono flex-1">
                  {formData.cle || 'Non défini'}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <strong className="text-gray-700 w-24">Valeur:</strong>
                <span className="bg-gray-100 px-2 py-1 rounded text-xs font-mono flex-1 truncate">
                  {formData.valeur || 'Non défini'}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <strong className="text-gray-700 w-24">Portée:</strong>
                <span className={`px-2 py-1 rounded text-xs font-medium ${
                  formData.entite 
                    ? 'bg-gradient-to-r from-orange-50 to-orange-100 text-orange-700 border border-orange-200'
                    : 'bg-gradient-to-r from-blue-50 to-blue-100 text-blue-700 border border-blue-200'
                }`}>
                  {formData.entite 
                    ? entitesArray.find(e => e.id == formData.entite)?.raison_sociale 
                    : 'Global'}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <strong className="text-gray-700 w-24">Modifiable:</strong>
                <span className={`px-2 py-1 rounded text-xs font-medium ${
                  formData.modifiable 
                    ? 'bg-gradient-to-r from-green-50 to-emerald-100 text-green-700 border border-green-200'
                    : 'bg-gradient-to-r from-red-50 to-pink-100 text-red-700 border border-red-200'
                }`}>
                  {formData.modifiable ? 'Oui' : 'Non'}
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
                  <span>{parametre ? 'Mettre à jour' : 'Créer le paramètre'}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}