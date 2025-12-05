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
  FiAlertCircle
} from "react-icons/fi";
import { TbSettings } from "react-icons/tb";

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

  const handleResetFilters = () => {
    setSearchTerm('');
    setFilterEntite('');
    setFilterModifiable('');
    setCurrentPage(1);
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
              <TbSettings className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">Gestion des Paramètres</h1>
              <p className="text-gray-600 text-xs mt-0.5">
                Gérez les paramètres système et par entité
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
              onClick={handleNewParametre}
              className="px-4 py-1.5 rounded-lg bg-gradient-to-r from-blue-600 to-blue-500 text-white hover:from-blue-700 hover:to-blue-600 transition-all duration-300 hover:shadow flex items-center gap-1.5 text-sm group shadow"
            >
              <FiPlus className="group-hover:rotate-90 transition-transform duration-300 text-sm" />
              <span className="font-semibold">Nouveau Paramètre</span>
            </button>
          </div>
        </div>

        {/* Statistiques en ligne */}
        <div className="grid grid-cols-4 gap-3 mb-4">
          <div className="bg-white rounded-lg p-3 border border-gray-200 shadow-sm hover:shadow transition-shadow duration-300">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-600">Total des paramètres</p>
                <p className="text-lg font-bold text-gray-900 mt-0.5">{parametres.length}</p>
              </div>
              <div className="p-1.5 bg-blue-50 rounded">
                <FiDatabase className="w-4 h-4 text-blue-600" />
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg p-3 border border-gray-200 shadow-sm hover:shadow transition-shadow duration-300">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-600">Paramètres modifiables</p>
                <p className="text-lg font-bold text-green-600 mt-0.5">
                  {parametres.filter(p => p.modifiable).length}
                </p>
              </div>
              <div className="p-1.5 bg-green-50 rounded">
                <FiUnlock className="w-4 h-4 text-green-600" />
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg p-3 border border-gray-200 shadow-sm hover:shadow transition-shadow duration-300">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-600">Paramètres globaux</p>
                <p className="text-lg font-bold text-purple-600 mt-0.5">
                  {parametres.filter(p => !p.entite).length}
                </p>
              </div>
              <div className="p-1.5 bg-purple-50 rounded">
                <FiGlobe className="w-4 h-4 text-purple-600" />
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg p-3 border border-gray-200 shadow-sm hover:shadow transition-shadow duration-300">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-600">Entités configurées</p>
                <p className="text-lg font-bold text-orange-600 mt-0.5">
                  {new Set(parametres.map(p => p.entite?.id).filter(id => id)).size}
                </p>
              </div>
              <div className="p-1.5 bg-orange-50 rounded">
                <TbSettings className="w-4 h-4 text-orange-600" />
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
                  <FiAlertCircle className="w-4 h-4 text-red-600" />
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
                {filteredParametres.length} résultat(s)
              </span>
              {(searchTerm || filterEntite || filterModifiable) && (
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
                    placeholder="Clé, description, valeur..."
                  />
                </div>
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Portée</label>
              <div className="relative">
                <FiGlobe className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 text-sm" />
                <select
                  value={filterEntite}
                  onChange={(e) => setFilterEntite(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-transparent bg-white appearance-none text-sm"
                >
                  <option value="">Toutes les portées</option>
                  <option value="global">Paramètres globaux</option>
                  {entites.map(entite => (
                    <option key={entite.id} value={entite.id}>
                      {entite.raison_sociale}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Modifiable</label>
              <div className="relative">
                <FiFilter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 text-sm" />
                <select
                  value={filterModifiable}
                  onChange={(e) => setFilterModifiable(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-transparent bg-white appearance-none text-sm"
                >
                  <option value="">Tous les statuts</option>
                  <option value="true">Modifiable</option>
                  <option value="false">Non modifiable</option>
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
              <div className="flex items-center gap-1.5">
                <input
                  type="checkbox"
                  checked={selectedRows.length === currentParametres.length && currentParametres.length > 0}
                  onChange={selectAllRows}
                  className="w-3.5 h-3.5 text-blue-600 rounded focus:ring-blue-500 border-gray-300"
                />
                <span className="text-xs text-gray-700">
                  {selectedRows.length} sélectionné(s)
                </span>
              </div>
              {selectedRows.length > 0 && (
                <div className="flex items-center gap-1.5">
                  <button className="px-2 py-1 bg-blue-50 text-blue-700 rounded text-xs font-medium hover:bg-blue-100 transition-colors">
                    <FiDownload size={12} />
                  </button>
                  <button className="px-2 py-1 bg-red-50 text-red-700 rounded text-xs font-medium hover:bg-red-100 transition-colors">
                    <FiTrash2 size={12} />
                  </button>
                </div>
              )}
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

        {/* Tableau */}
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead>
              <tr className="bg-gradient-to-r from-gray-50 to-gray-100">
                <th scope="col" className="px-3 py-2 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider border-r border-gray-300">
                  <div className="flex items-center gap-1.5">
                    <input
                      type="checkbox"
                      checked={selectedRows.length === currentParametres.length && currentParametres.length > 0}
                      onChange={selectAllRows}
                      className="w-3.5 h-3.5 text-blue-600 rounded focus:ring-blue-500 border-gray-300"
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
                  <td colSpan="7" className="px-3 py-6 text-center">
                    <div className="flex flex-col items-center justify-center">
                      <div className="w-16 h-16 bg-gradient-to-br from-gray-100 to-gray-200 rounded-full flex items-center justify-center mb-3">
                        <TbSettings className="w-8 h-8 text-gray-400" />
                      </div>
                      <h3 className="text-base font-semibold text-gray-900 mb-1.5">
                        {parametres.length === 0 ? 'Aucun paramètre trouvé' : 'Aucun résultat pour votre recherche'}
                      </h3>
                      <p className="text-gray-600 mb-4 max-w-md text-sm">
                        {parametres.length === 0 
                          ? 'Commencez par créer votre premier paramètre' 
                          : 'Essayez de modifier vos critères de recherche ou de filtres'}
                      </p>
                      {parametres.length === 0 && (
                        <button 
                          onClick={handleNewParametre}
                          className="px-4 py-1.5 bg-gradient-to-r from-blue-600 to-blue-500 text-white rounded-lg hover:from-blue-700 hover:to-blue-600 transition-all duration-300 font-medium flex items-center gap-1.5 text-sm"
                        >
                          <FiPlus />
                          Créer mon premier paramètre
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
                      selectedRows.includes(parametre.id) ? 'bg-gradient-to-r from-blue-50 to-blue-25' : 'bg-white'
                    }`}
                  >
                    <td className="px-3 py-2 whitespace-nowrap border-r border-gray-200">
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={selectedRows.includes(parametre.id)}
                          onChange={() => toggleRowSelection(parametre.id)}
                          className="w-3.5 h-3.5 text-blue-600 rounded focus:ring-blue-500 border-gray-300"
                        />
                        <span className="px-1.5 py-0.5 bg-gray-100 text-gray-800 rounded text-xs font-medium font-mono">
                          #{parametre.id}
                        </span>
                      </div>
                    </td>
                    <td className="px-3 py-2 border-r border-gray-200">
                      <div>
                        <div className="text-sm font-semibold text-gray-900 font-mono">{parametre.cle}</div>
                        <div className="text-xs text-gray-500">
                          {parametre.entite ? 'Spécifique' : 'Global'}
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-2 border-r border-gray-200">
                      <div className="max-w-xs">
                        <div className="text-sm text-gray-600 bg-gray-50 px-2 py-1 rounded border border-gray-200 break-all font-mono text-xs max-h-20 overflow-y-auto">
                          {formatValeur(parametre.valeur)}
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-2 border-r border-gray-200">
                      <div className="max-w-xs">
                        <div className="text-sm text-gray-900 truncate" title={parametre.description}>
                          {parametre.description}
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-2 border-r border-gray-200">
                      {parametre.entite ? (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gradient-to-r from-blue-50 to-blue-100 text-blue-700 border border-blue-200">
                          {parametre.entite.raison_sociale}
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gradient-to-r from-green-50 to-emerald-100 text-green-700 border border-green-200">
                          Global
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-2 border-r border-gray-200">
                      <div className="flex items-center">
                        <div className={`px-2 py-1 rounded flex items-center gap-1 ${
                          parametre.modifiable
                            ? 'bg-gradient-to-r from-green-50 to-emerald-50 text-green-700 border border-green-200' 
                            : 'bg-gradient-to-r from-red-50 to-pink-50 text-red-700 border border-red-200'
                        }`}>
                          {parametre.modifiable ? (
                            <>
                              <FiUnlock className="w-3 h-3" />
                              <span className="text-xs font-medium">Oui</span>
                            </>
                          ) : (
                            <>
                              <FiLock className="w-3 h-3" />
                              <span className="text-xs font-medium">Non</span>
                            </>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => handleViewDetails(parametre)}
                          className="p-1.5 bg-gradient-to-r from-gray-50 to-gray-100 text-gray-700 rounded-lg hover:from-gray-100 hover:to-gray-200 transition-all duration-200 shadow-sm hover:shadow"
                          title="Voir détails"
                        >
                          <FiEye size={14} />
                        </button>
                        <button
                          onClick={() => handleToggleModifiable(parametre)}
                          className={`p-1.5 rounded-lg hover:shadow transition-all duration-200 ${
                            parametre.modifiable
                              ? 'bg-gradient-to-r from-orange-50 to-amber-100 text-orange-700 hover:from-orange-100 hover:to-amber-200'
                              : 'bg-gradient-to-r from-green-50 to-emerald-100 text-green-700 hover:from-green-100 hover:to-emerald-200'
                          }`}
                          title={parametre.modifiable ? 'Verrouiller' : 'Déverrouiller'}
                        >
                          {parametre.modifiable ? <FiLock size={14} /> : <FiUnlock size={14} />}
                        </button>
                        <button
                          onClick={() => handleEdit(parametre)}
                          className="p-1.5 bg-gradient-to-r from-blue-50 to-blue-100 text-blue-700 rounded-lg hover:from-blue-100 hover:to-blue-200 transition-all duration-200 shadow-sm hover:shadow"
                          title="Modifier"
                        >
                          <FiEdit2 size={14} />
                        </button>
                        <button
                          onClick={() => handleDelete(parametre)}
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
        {filteredParametres.length > 0 && (
          <div className="px-4 py-3 border-t border-gray-200 bg-gradient-to-r from-gray-50 to-white">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs text-gray-700">
                    Page {currentPage} sur {totalPages}
                  </span>
                  <span className="text-gray-300">•</span>
                  <span className="text-xs text-gray-700">
                    {indexOfFirstItem + 1}-{Math.min(indexOfLastItem, filteredParametres.length)} sur {filteredParametres.length} paramètres
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

      {/* Modal de détails */}
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

// MODAL DE DÉTAILS
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
      <div className="bg-gray-50 px-3 py-2 rounded border border-gray-200 text-sm font-mono">
        {String(valeur)}
      </div>
    );
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-3 z-50 backdrop-blur-sm">
      <div className="bg-white rounded-lg w-full max-w-4xl max-h-[90vh] overflow-y-auto shadow-xl">
        {/* Header du modal */}
        <div className="sticky top-0 bg-gradient-to-r from-blue-600 to-blue-500 text-white rounded-t-lg p-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-white/20 backdrop-blur-sm rounded">
                <TbSettings className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-base font-bold">Détails du paramètre</h2>
                <p className="text-blue-100 text-xs mt-0.5 font-mono">{parametre.cle}</p>
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
                <p className="text-xs font-medium text-gray-500 mb-0.5">Clé</p>
                <p className="text-sm text-gray-900 font-mono font-medium">{parametre.cle}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500 mb-0.5">Type de valeur</p>
                <p className="text-sm text-gray-900">
                  {typeof parametre.valeur === 'object' ? 'Object/JSON' : 
                   typeof parametre.valeur === 'boolean' ? 'Booléen' : 
                   typeof parametre.valeur === 'number' ? 'Nombre' : 'Texte'}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500 mb-0.5">Date de création</p>
                <p className="text-sm text-gray-900">
                  {parametre.date_creation ? new Date(parametre.date_creation).toLocaleDateString('fr-FR') : '-'}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500 mb-0.5">Dernière modification</p>
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
          <div className="bg-gradient-to-br from-blue-50 to-white rounded-lg p-3 border border-blue-100">
            <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-1.5">
              <div className="w-1 h-4 bg-gradient-to-b from-blue-600 to-blue-400 rounded"></div>
              Description
            </h3>
            <p className="text-sm text-gray-900">{parametre.description || 'Aucune description'}</p>
          </div>

          {/* Valeur */}
          <div className="bg-gradient-to-br from-emerald-50 to-white rounded-lg p-3 border border-emerald-100">
            <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-1.5">
              <div className="w-1 h-4 bg-gradient-to-b from-emerald-600 to-emerald-400 rounded"></div>
              Valeur
            </h3>
            {formatValeurDisplay(parametre.valeur)}
          </div>

          {/* Portée et Statut */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-gradient-to-br from-purple-50 to-white rounded-lg p-3 border border-purple-100">
              <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-1.5">
                <div className="w-1 h-4 bg-gradient-to-b from-purple-600 to-purple-400 rounded"></div>
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

            <div className="bg-gradient-to-br from-orange-50 to-white rounded-lg p-3 border border-orange-100">
              <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-1.5">
                <div className="w-1 h-4 bg-gradient-to-b from-orange-600 to-orange-400 rounded"></div>
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

// COMPOSANT MODAL POUR LE FORMULAIRE DES PARAMÈTRES
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
    if (!formData.cle) {
      setError('La clé est obligatoire');
      setLoading(false);
      return;
    }

    if (!formData.valeur) {
      setError('La valeur est obligatoire');
      setLoading(false);
      return;
    }

    if (!formData.description) {
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

  const renderValeurInput = () => {
    switch (valeurType) {
      case 'boolean':
        return (
          <select
            value={formData.valeur}
            onChange={(e) => handleChange('valeur', e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
          >
            <option value="true">True</option>
            <option value="false">False</option>
          </select>
        );
      
      case 'nombre':
        return (
          <div className="relative">
            <FiHash className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 text-sm" />
            <input
              type="number"
              step="any"
              value={formData.valeur}
              onChange={(e) => handleChange('valeur', e.target.value)}
              className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
              placeholder="0.00"
            />
          </div>
        );
      
      case 'json':
        return (
          <div className="relative">
            <FiCode className="absolute left-3 top-3 text-gray-400 text-sm" />
            <textarea
              value={formData.valeur}
              onChange={(e) => handleChange('valeur', e.target.value)}
              rows={6}
              className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
              placeholder='{"key": "value"}'
            />
          </div>
        );
      
      default:
        return (
          <div className="relative">
            <FiType className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 text-sm" />
            <textarea
              value={formData.valeur}
              onChange={(e) => handleChange('valeur', e.target.value)}
              rows={3}
              className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
              placeholder="Valeur du paramètre..."
            />
          </div>
        );
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-3 z-50 backdrop-blur-sm">
      <div className="bg-white rounded-lg w-full max-w-3xl max-h-[90vh] overflow-y-auto shadow-xl">
        {/* Header du modal avec gradient */}
        <div className="sticky top-0 bg-gradient-to-r from-blue-600 to-blue-500 text-white rounded-t-lg p-3">
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
                  <p className="text-blue-100 text-xs mt-0.5">
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
              <span className="text-red-800 text-xs font-medium">{error}</span>
            </div>
          </div>
        )}
        
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {/* Section 1: Informations Générales */}
          <div className="bg-gradient-to-br from-gray-50 to-white rounded-lg p-3 border border-gray-200">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-1 h-4 bg-gradient-to-b from-blue-600 to-blue-400 rounded"></div>
              <h3 className="text-sm font-semibold text-gray-900">Informations Générales</h3>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
              {/* Clé */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Clé <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <FiHash className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 text-sm" />
                  <input
                    type="text"
                    required
                    value={formData.cle}
                    onChange={(e) => handleChange('cle', e.target.value)}
                    className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-sm font-mono"
                    placeholder="NOM_DU_PARAMETRE"
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Identifiant unique en majuscules
                </p>
              </div>
              
              {/* Type de valeur */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Type de valeur
                </label>
                <div className="relative">
                  <FiList className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 text-sm" />
                  <select
                    value={valeurType}
                    onChange={(e) => setValeurType(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm appearance-none"
                  >
                    <option value="texte">Texte</option>
                    <option value="nombre">Nombre</option>
                    <option value="boolean">Booléen</option>
                    <option value="json">JSON</option>
                  </select>
                </div>
              </div>
              
              {/* Portée */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Portée
                </label>
                <div className="relative">
                  <FiGlobe className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 text-sm" />
                  <select
                    value={formData.entite}
                    onChange={(e) => handleChange('entite', e.target.value)}
                    className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm appearance-none"
                  >
                    <option value="">Paramètre global</option>
                    {entites.map(entite => (
                      <option key={entite.id} value={entite.id}>
                        {entite.raison_sociale}
                      </option>
                    ))}
                  </select>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Vide = paramètre global
                </p>
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
                  <span className="text-sm font-medium text-gray-700">
                    Paramètre modifiable
                  </span>
                </label>
              </div>
            </div>
          </div>

          {/* Section 2: Description */}
          <div className="bg-gradient-to-br from-blue-50 to-white rounded-lg p-3 border border-blue-100">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-1 h-4 bg-gradient-to-b from-blue-600 to-blue-400 rounded"></div>
              <h3 className="text-sm font-semibold text-gray-900">Description</h3>
            </div>
            <div className="relative">
              <FiInfo className="absolute left-3 top-3 text-gray-400 text-sm" />
              <textarea
                required
                value={formData.description}
                onChange={(e) => handleChange('description', e.target.value)}
                rows={2}
                className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                placeholder="Description détaillée du paramètre..."
              />
            </div>
          </div>

          {/* Section 3: Valeur */}
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
                    ? 'bg-gradient-to-r from-blue-50 to-blue-100 text-blue-700 border border-blue-200'
                    : 'bg-gradient-to-r from-green-50 to-emerald-100 text-green-700 border border-green-200'
                }`}>
                  {formData.entite 
                    ? entites.find(e => e.id == formData.entite)?.raison_sociale 
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
              className="px-4 py-1.5 bg-gradient-to-r from-blue-600 to-blue-500 text-white rounded-lg hover:from-blue-700 hover:to-blue-600 disabled:opacity-50 transition-all duration-200 font-medium flex items-center gap-1.5 shadow hover:shadow-md text-sm"
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