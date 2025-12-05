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
  FiMapPin, 
  FiPhone, 
  FiMail, 
  FiDollarSign, 
  FiCalendar, 
  FiUser, 
  FiChevronLeft, 
  FiChevronRight,
  FiFileText,
  FiBriefcase,
  FiHome,
  FiCreditCard,
  FiActivity,
  FiUsers,
  FiDownload,
  FiUpload,
  FiEye,
  FiMoreVertical,
  FiChevronDown,
  FiChevronUp,
  FiInfo,
  FiExternalLink
} from "react-icons/fi";
import { TbBuildingSkyscraper } from "react-icons/tb";

export default function EntitiesPage() {
  const [entities, setEntities] = useState([]);
  const [users, setUsers] = useState([]);
  const [pays, setPays] = useState([]);
  const [devises, setDevises] = useState([]);
  const [langues, setLangues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editingEntity, setEditingEntity] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedEntity, setSelectedEntity] = useState(null);
  
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatut, setFilterStatut] = useState('');
  const [filterPays, setFilterPays] = useState('');
  const [selectedRows, setSelectedRows] = useState([]);

  useEffect(() => {
    fetchEntities();
    fetchUsers();
    fetchPays();
    fetchDevises();
    fetchLangues();
  }, []);

  const fetchEntities = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await apiClient.get('/entites/');
      
      if (Array.isArray(response)) {
        setEntities(response);
      } else if (response && Array.isArray(response.results)) {
        setEntities(response.results);
      } else {
        setError('Format de données inattendu');
        setEntities([]);
      }
    } catch (err) {
      console.error('Erreur lors du chargement des entités:', err);
      setError('Erreur lors du chargement des entités');
      setEntities([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      const response = await apiClient.get('/users/');
      
      if (Array.isArray(response)) {
        setUsers(response);
      } else if (response && Array.isArray(response.results)) {
        setUsers(response.results);
      } else {
        setUsers([]);
      }
    } catch (err) {
      console.error('Error fetching users:', err);
      setUsers([]);
    }
  };

  const fetchPays = async () => {
    try {
      const response = await apiClient.get('/pays/');
      
      if (Array.isArray(response)) {
        setPays(response);
      } else {
        setPays([]);
      }
    } catch (err) {
      console.error('Error fetching pays:', err);
      setPays([]);
    }
  };

  const fetchDevises = async () => {
    try {
      const response = await apiClient.get('/devises/');
      
      if (Array.isArray(response)) {
        setDevises(response);
      } else {
        setDevises([]);
      }
    } catch (err) {
      console.error('Error fetching devises:', err);
      setDevises([]);
    }
  };

  const fetchLangues = async () => {
    try {
      const response = await apiClient.get('/langues/');
      
      if (Array.isArray(response)) {
        setLangues(response);
      } else {
        setLangues([]);
      }
    } catch (err) {
      console.error('Error fetching langues:', err);
      setLangues([]);
    }
  };

  // Fonction utilitaire pour extraire le nom de la ville
  const getVilleName = (ville) => {
    if (!ville) return '';
    if (typeof ville === 'string') return ville;
    if (typeof ville === 'object') {
      return ville.nom || ville.name || ville.nom_fr || '';
    }
    return String(ville);
  };

  // Filtrage et recherche - VERSION CORRIGÉE
  const filteredEntities = entities.filter(entity => {
    // Gérer les différents formats de ville pour la recherche
    const villeNom = getVilleName(entity.ville).toLowerCase();
    const raisonSociale = (entity.raison_sociale || '').toLowerCase();
    const activite = (entity.activite || '').toLowerCase();
    
    const matchesSearch = 
      raisonSociale.includes(searchTerm.toLowerCase()) ||
      activite.includes(searchTerm.toLowerCase()) ||
      villeNom.includes(searchTerm.toLowerCase());
    
    const matchesStatut = !filterStatut || 
      (filterStatut === 'actif' ? entity.statut : !entity.statut);
    
    const matchesPays = !filterPays || 
      (entity.pays && entity.pays.id.toString() === filterPays);
    
    return matchesSearch && matchesStatut && matchesPays;
  });

  // Calculs pour la pagination
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentEntities = Array.isArray(filteredEntities) ? filteredEntities.slice(indexOfFirstItem, indexOfLastItem) : [];
  const totalPages = Math.ceil((Array.isArray(filteredEntities) ? filteredEntities.length : 0) / itemsPerPage);

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
    if (selectedRows.length === currentEntities.length) {
      setSelectedRows([]);
    } else {
      setSelectedRows(currentEntities.map(entity => entity.id));
    }
  };

  // Gestion des actions
  const handleNewEntity = () => {
    setEditingEntity(null);
    setShowForm(true);
  };

  const handleEdit = (entity) => {
    setEditingEntity(entity);
    setShowForm(true);
  };

  const handleDelete = async (entity) => {
    if (window.confirm(`Êtes-vous sûr de vouloir supprimer l'entité "${entity.raison_sociale}" ?`)) {
      try {
        await apiClient.delete(`/entites/${entity.id}/`);
        fetchEntities();
      } catch (err) {
        setError('Erreur lors de la suppression');
        console.error('Error deleting entity:', err);
      }
    }
  };

  const handleViewDetails = (entity) => {
    setSelectedEntity(entity);
    setShowDetailModal(true);
  };

  const handleFormSuccess = () => {
    setShowForm(false);
    setEditingEntity(null);
    fetchEntities();
  };

  const handleRetry = () => {
    fetchEntities();
  };

  const handleResetFilters = () => {
    setSearchTerm('');
    setFilterStatut('');
    setFilterPays('');
    setCurrentPage(1);
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
      {/* Header avec gradient */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-gradient-to-br from-violet-600 to-violet-500 rounded-lg shadow">
              <TbBuildingSkyscraper className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">Gestion des Entités</h1>
              <p className="text-gray-600 text-xs mt-0.5">
                Gérez toutes les entités de votre organisation
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
              onClick={handleNewEntity}
              className="px-4 py-1.5 rounded-lg bg-gradient-to-r from-violet-600 to-violet-500 text-white hover:from-violet-700 hover:to-violet-600 transition-all duration-300 hover:shadow flex items-center gap-1.5 text-sm group shadow"
            >
              <FiPlus className="group-hover:rotate-90 transition-transform duration-300 text-sm" />
              <span className="font-semibold">Nouvelle Entité</span>
            </button>
          </div>
        </div>

        {/* Statistiques en ligne - MODIFIÉ */}
        <div className="grid grid-cols-3 gap-3 mb-4">
          <div className="bg-white rounded-lg p-3 border border-gray-200 shadow-sm hover:shadow transition-shadow duration-300">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-600">Total des entités</p>
                <p className="text-lg font-bold text-gray-900 mt-0.5">{entities.length}</p>
              </div>
              <div className="p-1.5 bg-blue-50 rounded">
                <TbBuildingSkyscraper className="w-4 h-4 text-blue-600" />
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg p-3 border border-gray-200 shadow-sm hover:shadow transition-shadow duration-300">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-600">Entités actives</p>
                <p className="text-lg font-bold text-green-600 mt-0.5">{entities.filter(e => e.statut).length}</p>
              </div>
              <div className="p-1.5 bg-green-50 rounded">
                <FiActivity className="w-4 h-4 text-green-600" />
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg p-3 border border-gray-200 shadow-sm hover:shadow transition-shadow duration-300">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-600">Entités inactives</p>
                <p className="text-lg font-bold text-red-600 mt-0.5">{entities.filter(e => !e.statut).length}</p>
              </div>
              <div className="p-1.5 bg-red-50 rounded">
                <FiActivity className="w-4 h-4 text-red-600" />
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
                {filteredEntities.length} résultat(s)
              </span>
              {(searchTerm || filterPays || filterStatut) && (
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
                <div className="absolute inset-0 bg-gradient-to-r from-violet-600 to-violet-500 rounded-lg blur opacity-0 group-hover:opacity-20 transition-opacity duration-300"></div>
                <div className="relative">
                  <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 z-10 text-sm" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-violet-500 focus:border-transparent bg-white relative z-10 text-sm"
                    placeholder="Rechercher une entité..."
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
                  className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-violet-500 focus:border-transparent bg-white appearance-none text-sm"
                >
                  <option value="">Tous les statuts</option>
                  <option value="actif">Actif</option>
                  <option value="inactif">Inactif</option>
                </select>
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Pays</label>
              <div className="relative">
                <FiGlobe className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 text-sm" />
                <select
                  value={filterPays}
                  onChange={(e) => setFilterPays(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-violet-500 focus:border-transparent bg-white appearance-none text-sm"
                >
                  <option value="">Tous les pays</option>
                  {pays.map(paysItem => (
                    <option key={paysItem.id} value={paysItem.id}>
                      {paysItem.emoji} {paysItem.nom_fr || paysItem.nom}
                    </option>
                  ))}
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
                  checked={selectedRows.length === currentEntities.length && currentEntities.length > 0}
                  onChange={selectAllRows}
                  className="w-3.5 h-3.5 text-violet-600 rounded focus:ring-violet-500 border-gray-300"
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
                className="border border-gray-300 rounded px-2 py-1 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-violet-500 focus:border-transparent"
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
                      checked={selectedRows.length === currentEntities.length && currentEntities.length > 0}
                      onChange={selectAllRows}
                      className="w-3.5 h-3.5 text-violet-600 rounded focus:ring-violet-500 border-gray-300"
                    />
                    ID
                  </div>
                </th>
                <th scope="col" className="px-3 py-2 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider border-r border-gray-300">
                  Raison Sociale
                </th>
                <th scope="col" className="px-3 py-2 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider border-r border-gray-300">
                  Activité
                </th>
                <th scope="col" className="px-3 py-2 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider border-r border-gray-300">
                  Pays
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
              {currentEntities.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-3 py-6 text-center">
                    <div className="flex flex-col items-center justify-center">
                      <div className="w-16 h-16 bg-gradient-to-br from-gray-100 to-gray-200 rounded-full flex items-center justify-center mb-3">
                        <TbBuildingSkyscraper className="w-8 h-8 text-gray-400" />
                      </div>
                      <h3 className="text-base font-semibold text-gray-900 mb-1.5">
                        {entities.length === 0 ? 'Aucune entité trouvée' : 'Aucun résultat pour votre recherche'}
                      </h3>
                      <p className="text-gray-600 mb-4 max-w-md text-sm">
                        {entities.length === 0 
                          ? 'Commencez par créer votre première entité pour gérer votre organisation' 
                          : 'Essayez de modifier vos critères de recherche ou de filtres'}
                      </p>
                      {entities.length === 0 && (
                        <button 
                          onClick={handleNewEntity}
                          className="px-4 py-1.5 bg-gradient-to-r from-violet-600 to-violet-500 text-white rounded-lg hover:from-violet-700 hover:to-violet-600 transition-all duration-300 font-medium flex items-center gap-1.5 text-sm"
                        >
                          <FiPlus />
                          Créer ma première entité
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                currentEntities.map((entity) => (
                  <tr 
                    key={entity.id}
                    className={`hover:bg-gradient-to-r hover:from-gray-50 hover:to-white transition-all duration-200 ${
                      selectedRows.includes(entity.id) ? 'bg-gradient-to-r from-blue-50 to-blue-25' : 'bg-white'
                    }`}
                  >
                    <td className="px-3 py-2 whitespace-nowrap border-r border-gray-200">
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={selectedRows.includes(entity.id)}
                          onChange={() => toggleRowSelection(entity.id)}
                          className="w-3.5 h-3.5 text-violet-600 rounded focus:ring-violet-500 border-gray-300"
                        />
                        <span className="px-1.5 py-0.5 bg-gray-100 text-gray-800 rounded text-xs font-medium font-mono">
                          #{entity.id}
                        </span>
                      </div>
                    </td>
                    <td className="px-3 py-2 border-r border-gray-200">
                      <div>
                        <div className="text-sm font-semibold text-gray-900">{entity.raison_sociale}</div>
                        <div className="text-xs text-gray-500 truncate max-w-[200px]">{entity.email || 'Aucun email'}</div>
                      </div>
                    </td>
                    <td className="px-3 py-2 border-r border-gray-200">
                      <div className="text-sm text-gray-900 truncate max-w-[150px]">
                        {entity.activite || '-'}
                      </div>
                    </td>
                    <td className="px-3 py-2 border-r border-gray-200">
                      <div className="flex items-center gap-1.5">
                        <span className="text-base">{entity.pays_details?.emoji || '🌍'}</span>
                        <div>
                          <div className="text-sm font-medium text-gray-900 truncate max-w-[100px]">
                            {entity.pays_details?.nom || '-'}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-2 border-r border-gray-200">
                      <div className="flex items-center">
                        <div className={`px-2 py-1 rounded flex items-center gap-1 ${
                          entity.statut
                            ? 'bg-gradient-to-r from-green-50 to-emerald-50 text-green-700 border border-green-200' 
                            : 'bg-gradient-to-r from-red-50 to-pink-50 text-red-700 border border-red-200'
                        }`}>
                          {entity.statut ? (
                            <>
                              <div className="w-1.5 h-1.5 bg-green-500 rounded-full"></div>
                              <span className="text-xs font-medium">Actif</span>
                            </>
                          ) : (
                            <>
                              <div className="w-1.5 h-1.5 bg-red-500 rounded-full"></div>
                              <span className="text-xs font-medium">Inactif</span>
                            </>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => handleViewDetails(entity)}
                          className="p-1.5 bg-gradient-to-r from-gray-50 to-gray-100 text-gray-700 rounded-lg hover:from-gray-100 hover:to-gray-200 transition-all duration-200 shadow-sm hover:shadow"
                          title="Voir détails"
                        >
                          <FiEye size={14} />
                        </button>
                        <button
                          onClick={() => handleEdit(entity)}
                          className="p-1.5 bg-gradient-to-r from-blue-50 to-blue-100 text-blue-700 rounded-lg hover:from-blue-100 hover:to-blue-200 transition-all duration-200 shadow-sm hover:shadow"
                          title="Modifier"
                        >
                          <FiEdit2 size={14} />
                        </button>
                        <button
                          onClick={() => handleDelete(entity)}
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
        {filteredEntities.length > 0 && (
          <div className="px-4 py-3 border-t border-gray-200 bg-gradient-to-r from-gray-50 to-white">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs text-gray-700">
                    Page {currentPage} sur {totalPages}
                  </span>
                  <span className="text-gray-300">•</span>
                  <span className="text-xs text-gray-700">
                    {indexOfFirstItem + 1}-{Math.min(indexOfLastItem, filteredEntities.length)} sur {filteredEntities.length} entités
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
        <EntityFormModal
          entity={editingEntity}
          users={users}
          pays={pays}
          devises={devises}
          langues={langues}
          onClose={() => {
            setShowForm(false);
            setEditingEntity(null);
          }}
          onSuccess={handleFormSuccess}
        />
      )}

      {/* Modal de détails */}
      {showDetailModal && selectedEntity && (
        <EntityDetailModal
          entity={selectedEntity}
          onClose={() => {
            setShowDetailModal(false);
            setSelectedEntity(null);
          }}
        />
      )}
    </div>
  );
}

// MODAL DE DÉTAILS
function EntityDetailModal({ entity, onClose }) {
  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-3 z-50 backdrop-blur-sm">
      <div className="bg-white rounded-lg w-full max-w-4xl max-h-[90vh] overflow-y-auto shadow-xl">
        {/* Header du modal */}
        <div className="sticky top-0 bg-gradient-to-r from-violet-600 to-violet-500 text-white rounded-t-lg p-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-white/20 backdrop-blur-sm rounded">
                <TbBuildingSkyscraper className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-base font-bold">Détails de l'entité</h2>
                <p className="text-violet-100 text-xs mt-0.5">{entity.raison_sociale}</p>
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
              <div className="w-1 h-4 bg-gradient-to-b from-violet-600 to-violet-400 rounded"></div>
              Informations Générales
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <p className="text-xs font-medium text-gray-500 mb-0.5">Raison Sociale</p>
                <p className="text-sm text-gray-900 font-medium">{entity.raison_sociale}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500 mb-0.5">Activité</p>
                <p className="text-sm text-gray-900">{entity.activite || '-'}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500 mb-0.5">Forme Juridique</p>
                <p className="text-sm text-gray-900">{entity.forme_juridique || '-'}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500 mb-0.5">Capital Social</p>
                <p className="text-sm font-semibold text-emerald-700">
                  {entity.capital_social ? 
                    new Intl.NumberFormat('fr-FR', { 
                      style: 'currency', 
                      currency: 'XOF',
                      minimumFractionDigits: 0
                    }).format(entity.capital_social) 
                    : '-'}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500 mb-0.5">Date de Création</p>
                <p className="text-sm text-gray-900">
                  {entity.date_creation ? new Date(entity.date_creation).toLocaleDateString('fr-FR') : '-'}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500 mb-0.5">Statut</p>
                <div className={`px-2 py-1 rounded inline-flex items-center gap-1 ${
                  entity.statut
                    ? 'bg-gradient-to-r from-green-50 to-emerald-50 text-green-700 border border-green-200' 
                    : 'bg-gradient-to-r from-red-50 to-pink-50 text-red-700 border border-red-200'
                }`}>
                  {entity.statut ? (
                    <>
                      <div className="w-1.5 h-1.5 bg-green-500 rounded-full"></div>
                      <span className="text-xs font-medium">Actif</span>
                    </>
                  ) : (
                    <>
                      <div className="w-1.5 h-1.5 bg-red-500 rounded-full"></div>
                      <span className="text-xs font-medium">Inactif</span>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Informations Légales */}
          <div className="bg-gradient-to-br from-blue-50 to-white rounded-lg p-3 border border-blue-100">
            <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-1.5">
              <div className="w-1 h-4 bg-gradient-to-b from-blue-600 to-blue-400 rounded"></div>
              Informations Légales
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <p className="text-xs font-medium text-gray-500 mb-0.5">Registre de Commerce</p>
                <p className="text-sm text-gray-900">{entity.registre_commerce || '-'}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500 mb-0.5">Numéro Fiscal</p>
                <p className="text-sm text-gray-900">{entity.numero_fiscal || '-'}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500 mb-0.5">Sécurité Sociale</p>
                <p className="text-sm text-gray-900">{entity.securite_sociale || '-'}</p>
              </div>
            </div>
          </div>

          {/* Localisation */}
          <div className="bg-gradient-to-br from-purple-50 to-white rounded-lg p-3 border border-purple-100">
            <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-1.5">
              <div className="w-1 h-4 bg-gradient-to-b from-purple-600 to-purple-400 rounded"></div>
              Localisation
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="md:col-span-2">
                <p className="text-xs font-medium text-gray-500 mb-0.5">Adresse</p>
                <p className="text-sm text-gray-900">{entity.adresse || '-'}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500 mb-0.5">Complément d'adresse</p>
                <p className="text-sm text-gray-900">{entity.complement_adresse || '-'}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500 mb-0.5">Code Postal</p>
                <p className="text-sm text-gray-900">{entity.code_postal || '-'}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500 mb-0.5">Pays</p>
                <div className="flex items-center gap-1.5">
                  <span className="text-base">{entity.pays_details?.emoji || '🌍'}</span>
                  <p className="text-sm text-gray-900">{entity.pays_details?.nom || '-'}</p>
                </div>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500 mb-0.5">Ville</p>
                <p className="text-sm text-gray-900">{entity.ville_details?.nom || '-'}</p>
              </div>
            </div>
          </div>

          {/* Contact */}
          <div className="bg-gradient-to-br from-cyan-50 to-white rounded-lg p-3 border border-cyan-100">
            <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-1.5">
              <div className="w-1 h-4 bg-gradient-to-b from-cyan-600 to-cyan-400 rounded"></div>
              Contact
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <p className="text-xs font-medium text-gray-500 mb-0.5">Téléphone</p>
                <p className="text-sm text-gray-900">{entity.telephone || '-'}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500 mb-0.5">Email</p>
                <p className="text-sm text-gray-900">{entity.email || '-'}</p>
              </div>
              <div className="md:col-span-2">
                <p className="text-xs font-medium text-gray-500 mb-0.5">Site Web</p>
                <p className="text-sm text-blue-600">{entity.site_web || '-'}</p>
              </div>
            </div>
          </div>

          {/* Devise et Langue */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-gradient-to-br from-emerald-50 to-white rounded-lg p-3 border border-emerald-100">
              <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-1.5">
                <div className="w-1 h-4 bg-gradient-to-b from-emerald-600 to-emerald-400 rounded"></div>
                Devise
              </h3>
              <p className="text-sm text-gray-900">
                {entity.devise_details 
                  ? `${entity.devise_details.code} - ${entity.devise_details.nom} (${entity.devise_details.symbole})` 
                  : '-'}
              </p>
            </div>

            <div className="bg-gradient-to-br from-amber-50 to-white rounded-lg p-3 border border-amber-100">
              <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-1.5">
                <div className="w-1 h-4 bg-gradient-to-b from-amber-600 to-amber-400 rounded"></div>
                Langue
              </h3>
              <p className="text-sm text-gray-900">
                {entity.langue_details 
                  ? `${entity.langue_details.nom} (${entity.langue_details.code})` 
                  : '-'}
              </p>
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

// COMPOSANT MODAL AVEC DROPDOWNS AVEC RECHERCHE INTÉGRÉE - FORMULAIRE COMPACT
function EntityFormModal({ entity, users, pays, devises, langues, onClose, onSuccess }) {
  // Données pour les listes déroulantes
  const secteursActivite = [
    "Agriculture", "Agroalimentaire", "Artisanat", "Assurance", "Automobile",
    "Bancaire", "Bâtiment et Travaux Publics", "Commerce", "Communication",
    "Construction", "Consulting", "Distribution", "Éducation", "Énergie",
    "Finance", "Immobilier", "Industrie", "Informatique et Technologie",
    "Logistique", "Médical et Santé", "Restaurant et Hôtellerie", "Services",
    "Tourisme", "Transport", "Autre"
  ];

  const formesJuridiques = [
    "Entreprise Individuelle (EI)",
    "Entreprise Unipersonnelle à Responsabilité Limitée (EURL)",
    "Société à Responsabilité Limitée (SARL)",
    "Société Anonyme (SA)",
    "Société par Actions Simplifiée (SAS)",
    "Société par Actions Simplifiée Unipersonnelle (SASU)",
    "Société en Nom Collectif (SNC)",
    "Société Civile",
    "Groupement d'Intérêt Economique (GIE)",
    "Société Coopérative",
    "Association",
    "Fondation",
    "Autre"
  ];

  // États pour le formulaire
  const [formData, setFormData] = useState({
    raison_sociale: entity?.raison_sociale || '',
    activite: entity?.activite || '',
    activite_autre: '',
    forme_juridique: entity?.forme_juridique || '',
    forme_juridique_autre: '',
    capital_social: entity?.capital_social || '',
    date_creation: entity?.date_creation || new Date().toISOString().split('T')[0],
    registre_commerce: entity?.registre_commerce || '',
    numero_fiscal: entity?.numero_fiscal || '',
    securite_sociale: entity?.securite_sociale || '',
    adresse: entity?.adresse || '',
    complement_adresse: entity?.complement_adresse || '',
    code_postal: entity?.code_postal || '',
    pays: entity?.pays?.id || '',
    subdivision: entity?.subdivision?.id || '',
    ville: entity?.ville?.id || '',
    telephone: entity?.telephone || '',
    email: entity?.email || '',
    site_web: entity?.site_web || '',
    devise: entity?.devise?.id || '',
    langue: entity?.langue?.id || '',
    statut: entity?.statut !== undefined ? entity.statut : true,
    cree_par: entity?.cree_par?.id || ''
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showAutreActivite, setShowAutreActivite] = useState(false);
  const [showAutreFormeJuridique, setShowAutreFormeJuridique] = useState(false);
  
  // ÉTATS POUR LISTES DYNAMIQUES
  const [subdivisions, setSubdivisions] = useState([]);
  const [villes, setVilles] = useState([]);
  const [loadingSubdivisions, setLoadingSubdivisions] = useState(false);
  const [loadingVilles, setLoadingVilles] = useState(false);

  // ÉTATS POUR RECHERCHE DANS LES DROPDOWNS
  const [searchActivite, setSearchActivite] = useState('');
  const [searchFormeJuridique, setSearchFormeJuridique] = useState('');
  const [searchPays, setSearchPays] = useState('');
  const [searchDevise, setSearchDevise] = useState('');
  const [searchLangue, setSearchLangue] = useState('');
  const [searchUser, setSearchUser] = useState('');
  const [searchSubdivision, setSearchSubdivision] = useState('');
  const [searchVille, setSearchVille] = useState('');

  // S'assurer que les tableaux sont toujours des tableaux
  const usersArray = Array.isArray(users) ? users : [];
  const paysArray = Array.isArray(pays) ? pays : [];
  const devisesArray = Array.isArray(devises) ? devises : [];
  const languesArray = Array.isArray(langues) ? langues : [];

  // Filtrer les listes avec la recherche
  const filteredSecteursActivite = secteursActivite.filter(secteur =>
    secteur.toLowerCase().includes(searchActivite.toLowerCase())
  );

  const filteredFormesJuridiques = formesJuridiques.filter(forme =>
    forme.toLowerCase().includes(searchFormeJuridique.toLowerCase())
  );

  const filteredPays = paysArray.filter(paysItem =>
    (paysItem.nom_fr || paysItem.nom).toLowerCase().includes(searchPays.toLowerCase()) ||
    paysItem.code_iso.toLowerCase().includes(searchPays.toLowerCase())
  );

  const filteredDevises = devisesArray.filter(devise =>
    devise.nom.toLowerCase().includes(searchDevise.toLowerCase()) ||
    devise.code.toLowerCase().includes(searchDevise.toLowerCase())
  );

  const filteredLangues = languesArray.filter(langue =>
    langue.nom.toLowerCase().includes(searchLangue.toLowerCase()) ||
    langue.code.toLowerCase().includes(searchLangue.toLowerCase())
  );

  const filteredUsers = usersArray.filter(user =>
    user.username.toLowerCase().includes(searchUser.toLowerCase()) ||
    user.email.toLowerCase().includes(searchUser.toLowerCase())
  );

  const filteredSubdivisions = subdivisions.filter(subdivision =>
    subdivision.nom.toLowerCase().includes(searchSubdivision.toLowerCase()) ||
    subdivision.code.toLowerCase().includes(searchSubdivision.toLowerCase())
  );

  const filteredVilles = villes.filter(ville =>
    ville.nom.toLowerCase().includes(searchVille.toLowerCase()) ||
    (ville.code_postal && ville.code_postal.includes(searchVille))
  );

  // CHARGEMENT DYNAMIQUE DES SUBDIVISIONS
  useEffect(() => {
    const fetchSubdivisions = async () => {
      if (formData.pays) {
        setLoadingSubdivisions(true);
        try {
          const response = await apiClient.get(`/subdivisions/?pays=${formData.pays}`);
          
          let subdivisionsData = [];
          if (Array.isArray(response)) {
            subdivisionsData = response;
          } else if (response && Array.isArray(response.results)) {
            subdivisionsData = response.results;
          }
          
          setSubdivisions(subdivisionsData);
          
          // Réinitialiser la subdivision si elle ne fait pas partie du nouveau pays
          if (formData.subdivision) {
            const currentSubdivisionExists = subdivisionsData.some(
              sub => sub.id.toString() === formData.subdivision.toString()
            );
            if (!currentSubdivisionExists) {
              setFormData(prev => ({ ...prev, subdivision: '', ville: '' }));
            }
          }
        } catch (err) {
          console.error('Erreur chargement subdivisions:', err);
          setSubdivisions([]);
        } finally {
          setLoadingSubdivisions(false);
        }
      } else {
        setSubdivisions([]);
        setFormData(prev => ({ ...prev, subdivision: '', ville: '' }));
      }
    };

    fetchSubdivisions();
  }, [formData.pays, formData.subdivision]);

  // CHARGEMENT DYNAMIQUE DES VILLES
  useEffect(() => {
    const fetchVilles = async () => {
      if (formData.subdivision) {
        setLoadingVilles(true);
        try {
          const response = await apiClient.get(`/villes/?subdivision=${formData.subdivision}`);
          
          let villesData = [];
          if (Array.isArray(response)) {
            villesData = response;
          } else if (response && Array.isArray(response.results)) {
            villesData = response.results;
          }
          
          setVilles(villesData);
          
          // Réinitialiser la ville si elle ne fait pas partie de la nouvelle subdivision
          if (formData.ville) {
            const currentVilleExists = villesData.some(
              ville => ville.id.toString() === formData.ville.toString()
            );
            if (!currentVilleExists) {
              setFormData(prev => ({ ...prev, ville: '' }));
            }
          }
        } catch (err) {
          console.error('Erreur chargement villes:', err);
          setVilles([]);
        } finally {
          setLoadingVilles(false);
        }
      } else {
        setVilles([]);
        setFormData(prev => ({ ...prev, ville: '' }));
      }
    };

    fetchVilles();
  }, [formData.subdivision, formData.ville]);

  // Gestion du choix "Autre" pour les listes déroulantes
  useEffect(() => {
    setShowAutreActivite(formData.activite === 'Autre');
    setShowAutreFormeJuridique(formData.forme_juridique === 'Autre');
  }, [formData.activite, formData.forme_juridique]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    // Validation
    if (!formData.raison_sociale) {
      setError('La raison sociale est obligatoire');
      setLoading(false);
      return;
    }

    if (!formData.pays) {
      setError('Le pays est obligatoire');
      setLoading(false);
      return;
    }

    if (!formData.subdivision) {
      setError('La subdivision (état/province/région) est obligatoire');
      setLoading(false);
      return;
    }

    if (!formData.ville) {
      setError('La ville est obligatoire');
      setLoading(false);
      return;
    }

    if (!formData.telephone) {
      setError('Le téléphone est obligatoire');
      setLoading(false);
      return;
    }

    if (!formData.email) {
      setError('L\'email est obligatoire');
      setLoading(false);
      return;
    }

    try {
      const url = entity 
        ? `/entites/${entity.id}/`
        : `/entites/`;
      
      const method = entity ? 'PUT' : 'POST';

      // Préparer les données finales
      const submitData = {
        ...formData,
        activite: showAutreActivite ? formData.activite_autre : formData.activite,
        forme_juridique: showAutreFormeJuridique ? formData.forme_juridique_autre : formData.forme_juridique,
      };

      // Nettoyer les champs temporaires
      delete submitData.activite_autre;
      delete submitData.forme_juridique_autre;

      await apiClient.request(url, {
        method: method,
        body: JSON.stringify(submitData),
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

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-3 z-50 backdrop-blur-sm">
      <div className="bg-white rounded-lg w-full max-w-5xl max-h-[90vh] overflow-y-auto shadow-xl">
        {/* Header du modal avec gradient - COMPACT */}
        <div className="sticky top-0 bg-gradient-to-r from-violet-600 to-violet-500 text-white rounded-t-lg p-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-white/20 backdrop-blur-sm rounded">
                <TbBuildingSkyscraper className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-base font-bold">
                  {entity ? 'Modifier l\'entité' : 'Nouvelle Entité'}
                </h2>
                {!entity && (
                  <p className="text-violet-100 text-xs mt-0.5">
                    Créez une nouvelle entité dans le système
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
              <span className="text-red-800 text-xs font-medium">{error}</span>
            </div>
          </div>
        )}
        
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {/* Section 1: Informations Générales */}
          <div className="bg-gradient-to-br from-gray-50 to-white rounded-lg p-3 border border-gray-200">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-1 h-4 bg-gradient-to-b from-violet-600 to-violet-400 rounded"></div>
              <h3 className="text-sm font-semibold text-gray-900">Informations Générales</h3>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
              <div className="lg:col-span-2">
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Raison Sociale <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.raison_sociale}
                  onChange={(e) => handleChange('raison_sociale', e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-violet-500 focus:border-transparent bg-white text-sm"
                  placeholder="Nom de l'entreprise"
                />
              </div>
              
              {/* Secteur d'Activité avec recherche */}
              <div className="lg:col-span-2">
                <SearchableDropdown
                  label="Secteur d'Activité"
                  value={formData.activite}
                  onChange={(value) => handleChange('activite', value)}
                  options={secteursActivite}
                  searchValue={searchActivite}
                  onSearchChange={setSearchActivite}
                  placeholder="Sélectionnez un secteur d'activité"
                />
                {showAutreActivite && (
                  <div className="mt-2">
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Précisez le secteur d'activité <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.activite_autre}
                      onChange={(e) => handleChange('activite_autre', e.target.value)}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-violet-500 focus:border-transparent text-sm"
                      placeholder="Secteur d'activité"
                      required
                    />
                  </div>
                )}
              </div>
              
              {/* Forme Juridique avec recherche */}
              <div>
                <SearchableDropdown
                  label="Forme Juridique"
                  value={formData.forme_juridique}
                  onChange={(value) => handleChange('forme_juridique', value)}
                  options={formesJuridiques}
                  searchValue={searchFormeJuridique}
                  onSearchChange={setSearchFormeJuridique}
                  placeholder="Sélectionnez une forme juridique"
                />
                {showAutreFormeJuridique && (
                  <div className="mt-2">
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Précisez la forme juridique <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.forme_juridique_autre}
                      onChange={(e) => handleChange('forme_juridique_autre', e.target.value)}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-violet-500 focus:border-transparent text-sm"
                      placeholder="Forme juridique"
                      required
                    />
                  </div>
                )}
              </div>
              
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Capital Social</label>
                <div className="relative">
                  <FiDollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
                  <input
                    type="number"
                    step="0.01"
                    value={formData.capital_social}
                    onChange={(e) => handleChange('capital_social', e.target.value)}
                    className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-violet-500 focus:border-transparent text-sm"
                    placeholder="0.00"
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Date de Création</label>
                <div className="relative">
                  <FiCalendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
                  <input
                    type="date"
                    required
                    value={formData.date_creation}
                    onChange={(e) => handleChange('date_creation', e.target.value)}
                    className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-violet-500 focus:border-transparent bg-white text-sm"
                    readOnly={!entity}
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  {!entity ? "Date du jour par défaut" : "Modifiable pour les entités existantes"}
                </p>
              </div>
              
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Statut</label>
                <select
                  value={formData.statut}
                  onChange={(e) => handleChange('statut', e.target.value === 'true')}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-violet-500 focus:border-transparent text-sm"
                >
                  <option value={true}>Actif</option>
                  <option value={false}>Inactif</option>
                </select>
              </div>
            </div>
          </div>

          {/* Section 2: Informations Légales */}
          <div className="bg-gradient-to-br from-blue-50 to-white rounded-lg p-3 border border-blue-100">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-1 h-4 bg-gradient-to-b from-blue-600 to-blue-400 rounded"></div>
              <h3 className="text-sm font-semibold text-gray-900">Informations Légales</h3>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Registre de Commerce</label>
                <input
                  type="text"
                  value={formData.registre_commerce}
                  onChange={(e) => handleChange('registre_commerce', e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-transparent text-sm"
                  placeholder="Numéro RC"
                />
              </div>
              
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Numéro Fiscal</label>
                <input
                  type="text"
                  value={formData.numero_fiscal}
                  onChange={(e) => handleChange('numero_fiscal', e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-transparent text-sm"
                  placeholder="Numéro d'identification fiscale"
                />
              </div>
              
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Sécurité Sociale</label>
                <input
                  type="text"
                  value={formData.securite_sociale}
                  onChange={(e) => handleChange('securite_sociale', e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-transparent text-sm"
                  placeholder="Numéro de sécurité sociale"
                />
              </div>
            </div>
          </div>

          {/* Section 3: Devise et Langue */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            <div className="bg-gradient-to-br from-emerald-50 to-white rounded-lg p-3 border border-emerald-100">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-1 h-4 bg-gradient-to-b from-emerald-600 to-emerald-400 rounded"></div>
                <h3 className="text-sm font-semibold text-gray-900">Devise</h3>
              </div>
              <SearchableDropdown
                value={formData.devise}
                onChange={(value) => handleChange('devise', value)}
                options={devisesArray}
                searchValue={searchDevise}
                onSearchChange={setSearchDevise}
                placeholder="Sélectionnez une devise"
                icon={FiDollarSign}
                getOptionLabel={(devise) => `${devise.code} - ${devise.nom} (${devise.symbole})`}
                getOptionValue={(devise) => devise.id}
              />
            </div>

            <div className="bg-gradient-to-br from-amber-50 to-white rounded-lg p-3 border border-amber-100">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-1 h-4 bg-gradient-to-b from-amber-600 to-amber-400 rounded"></div>
                <h3 className="text-sm font-semibold text-gray-900">Langue</h3>
              </div>
              <SearchableDropdown
                value={formData.langue}
                onChange={(value) => handleChange('langue', value)}
                options={languesArray}
                searchValue={searchLangue}
                onSearchChange={setSearchLangue}
                placeholder="Sélectionnez une langue"
                icon={FiGlobe}
                getOptionLabel={(langue) => `${langue.nom} (${langue.code})`}
                getOptionValue={(langue) => langue.id}
              />
            </div>
          </div>

          {/* Section 4: Localisation */}
          <div className="bg-gradient-to-br from-purple-50 to-white rounded-lg p-3 border border-purple-100">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-1 h-4 bg-gradient-to-b from-purple-600 to-purple-400 rounded"></div>
              <h3 className="text-sm font-semibold text-gray-900">Localisation</h3>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
              <div className="lg:col-span-2">
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Adresse complète <span className="text-red-500">*</span>
                </label>
                <textarea
                  required
                  value={formData.adresse}
                  onChange={(e) => handleChange('adresse', e.target.value)}
                  rows={2}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-purple-500 focus:border-transparent text-sm"
                  placeholder="Adresse complète"
                />
              </div>
              
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Complément d'adresse</label>
                <input
                  type="text"
                  value={formData.complement_adresse}
                  onChange={(e) => handleChange('complement_adresse', e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-purple-500 focus:border-transparent text-sm"
                  placeholder="Bâtiment, étage, etc."
                />
              </div>
              
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Code Postal</label>
                <input
                  type="text"
                  value={formData.code_postal}
                  onChange={(e) => handleChange('code_postal', e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-purple-500 focus:border-transparent text-sm"
                  placeholder="Code postal"
                />
              </div>

              {/* Pays avec recherche */}
              <div>
                <SearchableDropdown
                  label="Pays"
                  value={formData.pays}
                  onChange={(value) => handleChange('pays', value)}
                  options={paysArray}
                  searchValue={searchPays}
                  onSearchChange={setSearchPays}
                  placeholder="Sélectionnez un pays"
                  required={true}
                  icon={FiGlobe}
                  getOptionLabel={(paysItem) => `${paysItem.emoji} ${paysItem.nom_fr || paysItem.nom} (${paysItem.code_iso})`}
                  getOptionValue={(paysItem) => paysItem.id}
                />
              </div>

              {/* Subdivision avec recherche */}
              <div>
                <SearchableDropdown
                  label="État/Province/Région"
                  value={formData.subdivision}
                  onChange={(value) => handleChange('subdivision', value)}
                  options={subdivisions}
                  searchValue={searchSubdivision}
                  onSearchChange={setSearchSubdivision}
                  placeholder="Sélectionnez une subdivision"
                  required={true}
                  disabled={!formData.pays || loadingSubdivisions}
                  icon={FiMapPin}
                  getOptionLabel={(subdivision) => `${subdivision.nom} (${subdivision.type_subdivision})`}
                  getOptionValue={(subdivision) => subdivision.id}
                />
                {!formData.pays && (
                  <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                    <FiGlobe size={10} />
                    Veuillez d'abord sélectionner un pays
                  </p>
                )}
                {loadingSubdivisions && (
                  <p className="text-xs text-blue-500 mt-1 flex items-center gap-1">
                    <FiRefreshCw className="animate-spin" size={10} />
                    Chargement des subdivisions...
                  </p>
                )}
              </div>

              {/* Ville avec recherche */}
              <div>
                <SearchableDropdown
                  label="Ville"
                  value={formData.ville}
                  onChange={(value) => handleChange('ville', value)}
                  options={villes}
                  searchValue={searchVille}
                  onSearchChange={setSearchVille}
                  placeholder="Sélectionnez une ville"
                  required={true}
                  disabled={!formData.subdivision || loadingVilles}
                  icon={FiMapPin}
                  getOptionLabel={(ville) => `${ville.nom} ${ville.code_postal ? `(${ville.code_postal})` : ''}`}
                  getOptionValue={(ville) => ville.id}
                />
                {!formData.subdivision && (
                  <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                    <FiMapPin size={10} />
                    Veuillez d'abord sélectionner une subdivision
                  </p>
                )}
                {loadingVilles && (
                  <p className="text-xs text-blue-500 mt-1 flex items-center gap-1">
                    <FiRefreshCw className="animate-spin" size={10} />
                    Chargement des villes...
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Section 5: Contact */}
          <div className="bg-gradient-to-br from-cyan-50 to-white rounded-lg p-3 border border-cyan-100">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-1 h-4 bg-gradient-to-b from-cyan-600 to-cyan-400 rounded"></div>
              <h3 className="text-sm font-semibold text-gray-900">Contact</h3>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Téléphone <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <FiPhone className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
                  <input
                    type="tel"
                    required
                    value={formData.telephone}
                    onChange={(e) => handleChange('telephone', e.target.value)}
                    className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-cyan-500 focus:border-transparent text-sm"
                    placeholder="+228 XX XXX XXX"
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Email <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <FiMail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => handleChange('email', e.target.value)}
                    className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-cyan-500 focus:border-transparent text-sm"
                    placeholder="contact@entreprise.tg"
                  />
                </div>
              </div>
              
              <div className="lg:col-span-2">
                <label className="block text-xs font-medium text-gray-700 mb-1">Site Web</label>
                <input
                  type="url"
                  value={formData.site_web}
                  onChange={(e) => handleChange('site_web', e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-cyan-500 focus:border-transparent text-sm"
                  placeholder="https://www.example.com"
                />
              </div>
            </div>
          </div>

          {/* Section 6: Administration */}
          <div className="bg-gradient-to-br from-gray-50 to-white rounded-lg p-3 border border-gray-200">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-1 h-4 bg-gradient-to-b from-gray-600 to-gray-400 rounded"></div>
              <h3 className="text-sm font-semibold text-gray-900">Administration</h3>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
              {/* Utilisateur créateur avec recherche */}
              <div>
                <SearchableDropdown
                  label="Créé par"
                  value={formData.cree_par}
                  onChange={(value) => handleChange('cree_par', value)}
                  options={usersArray}
                  searchValue={searchUser}
                  onSearchChange={setSearchUser}
                  placeholder="Sélectionnez un utilisateur"
                  icon={FiUser}
                  getOptionLabel={(user) => `${user.username} (${user.email})`}
                  getOptionValue={(user) => user.id}
                />
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
                  <span>{entity ? 'Mettre à jour' : 'Créer l\'entité'}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}