// src/pages/Entities/EntitiesPage.jsx
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
  FiExternalLink,
  FiImage,
  FiCheckCircle,
  FiXCircle,
  FiMap,
  FiFolder
} from "react-icons/fi";
import { TbBuildingSkyscraper } from "react-icons/tb";

// 🔽 IMPORT DU COMPOSANT PARTAGÉ
import EntityFormModal from '../../components/EntityFormModal';

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
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);

  // Chargement initial
  useEffect(() => {
    fetchAllData();
  }, []);

  const fetchAllData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [entitiesRes, usersRes, paysRes, devisesRes, languesRes] = await Promise.all([
        apiClient.get('/entites/'),
        apiClient.get('/users/'),
        apiClient.get('/pays/'),
        apiClient.get('/devises/'),
        apiClient.get('/langues/')
      ]);
      const extractData = (response) => {
        if (Array.isArray(response)) return response;
        if (response && Array.isArray(response.results)) return response.results;
        if (response && Array.isArray(response.data)) return response.data;
        return [];
      };
      setEntities(extractData(entitiesRes));
      setUsers(extractData(usersRes));
      setPays(extractData(paysRes));
      setDevises(extractData(devisesRes));
      setLangues(extractData(languesRes));
    } catch (err) {
      console.error('Erreur lors du chargement des données:', err);
      setError('Erreur lors du chargement des données');
      setEntities([]);
      setUsers([]);
      setPays([]);
      setDevises([]);
      setLangues([]);
    } finally {
      setLoading(false);
    }
  };

  const getVilleName = (ville) => {
    if (!ville) return '';
    if (typeof ville === 'string') return ville;
    if (typeof ville === 'object') {
      return ville.nom || ville.name || ville.nom_fr || '';
    }
    return String(ville);
  };

  // Filtrage et recherche
  const filteredEntities = entities.filter(entity => {
    const matchesSearch =
      (entity.raison_sociale || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (entity.activite || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (entity.email || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      getVilleName(entity.ville).toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatut = filterStatut === '' ||
      (filterStatut === 'actif' ? entity.statut : !entity.statut);
    const matchesPays = filterPays === '' ||
      (entity.pays && entity.pays.id && entity.pays.id.toString() === filterPays);
    return matchesSearch && matchesStatut && matchesPays;
  });

  // Calculs pour la pagination
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentEntities = Array.isArray(filteredEntities) ? filteredEntities.slice(indexOfFirstItem, indexOfLastItem) : [];
  const totalPages = Math.ceil((Array.isArray(filteredEntities) ? filteredEntities.length : 0) / itemsPerPage);

  // Pagination
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
    if (window.confirm(`Êtes-vous sûr de vouloir supprimer l'entité "${entity.raison_sociale}" ? Cette action est irréversible.`)) {
      try {
        await apiClient.delete(`/entites/${entity.id}/`);
        fetchAllData();
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
    fetchAllData();
  };

  const handleRetry = () => {
    fetchAllData();
  };

  const resetFilters = () => {
    setSearchTerm('');
    setFilterStatut('');
    setFilterPays('');
    setCurrentPage(1);
    setShowFilterDropdown(false);
  };

  // Statistiques
  const stats = {
    total: entities.length,
    actives: entities.filter(e => e.statut).length,
    inactives: entities.filter(e => !e.statut).length,
    withParent: entities.filter(e => e.parent_id).length,
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
                placeholder="Rechercher une société..."
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
                    filterStatut || filterPays ? 'bg-violet-100 text-violet-700' : 'bg-gray-100 text-gray-700'
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
                            setFilterStatut('actif');
                            setShowFilterDropdown(false);
                          }}
                          className={`w-full text-left px-2 py-1.5 rounded text-xs ${filterStatut === 'actif' ? 'bg-violet-50 text-violet-700' : 'text-gray-700 hover:bg-gray-50'}`}
                        >
                          Actives seulement
                        </button>
                        <button
                          onClick={() => {
                            setFilterStatut('inactif');
                            setShowFilterDropdown(false);
                          }}
                          className={`w-full text-left px-2 py-1.5 rounded text-xs ${filterStatut === 'inactif' ? 'bg-violet-50 text-violet-700' : 'text-gray-700 hover:bg-gray-50'}`}
                        >
                          Inactives seulement
                        </button>
                      </div>
                      {/* Réinitialiser */}
                      {(searchTerm || filterStatut || filterPays) && (
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
          </div>
          <button
            onClick={handleRetry}
            className="ml-3 px-3 py-2 rounded-lg border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 transition-all duration-300 flex items-center gap-1.5 text-sm"
          >
            <FiRefreshCw className={`${loading ? 'animate-spin' : ''}`} size={14} />
            <span>Actualiser</span>
          </button>
          <button
            onClick={handleNewEntity}
            className="ml-2 px-3 py-2 rounded-lg bg-gradient-to-r from-violet-600 to-violet-500 text-white hover:from-violet-700 hover:to-violet-600 transition-all duration-300 flex items-center gap-1.5 text-sm shadow"
          >
            <FiPlus size={14} />
            <span>Nouvelle Société</span>
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
              <TbBuildingSkyscraper className="w-3 h-3 text-violet-600" />
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
              <span className="text-xs text-gray-600">Inactives:</span>
              <span className="text-sm font-bold text-red-600">{stats.inactives}</span>
            </div>
            <div className="p-1 bg-red-50 rounded">
              <FiXCircle className="w-3 h-3 text-red-600" />
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg p-2 border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-600">Filiales:</span>
              <span className="text-sm font-bold text-blue-600">{stats.withParent}</span>
            </div>
            <div className="p-1 bg-blue-50 rounded">
              <FiFolder className="w-3 h-3 text-blue-600" />
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
          Toutes les sociétés
        </button>
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
                  checked={selectedRows.length === currentEntities.length && currentEntities.length > 0}
                  onChange={selectAllRows}
                  className="w-3 h-3 text-violet-600 rounded focus:ring-violet-500 border-gray-300"
                />
                <span className="text-xs text-gray-700">
                  {selectedRows.length} sélectionné(s)
                </span>
              </div>
              {(filterStatut || filterPays) && (
                <div className="flex items-center gap-1">
                  {filterStatut && (
                    <span className="px-1.5 py-0.5 bg-violet-50 text-violet-700 text-xs rounded border border-violet-200">
                      {filterStatut === 'actif' ? 'Actives' : 'Inactives'}
                    </span>
                  )}
                  {filterPays && (
                    <span className="px-1.5 py-0.5 bg-violet-50 text-violet-700 text-xs rounded border border-violet-200">
                      Pays: {pays.find(p => p.id.toString() === filterPays)?.nom_fr || filterPays}
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
                      checked={selectedRows.length === currentEntities.length && currentEntities.length > 0}
                      onChange={selectAllRows}
                      className="w-3 h-3 text-violet-600 rounded focus:ring-violet-500 border-gray-300"
                    />
                    ID
                  </div>
                </th>
                <th scope="col" className="px-3 py-2 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider border-r border-gray-300">
                  Société
                </th>
                <th scope="col" className="px-3 py-2 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider border-r border-gray-300">
                  Activité
                </th>
                <th scope="col" className="px-3 py-2 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider border-r border-gray-300">
                  Localisation
                </th>
                <th scope="col" className="px-3 py-2 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider border-r border-gray-300">
                  Contact
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
                  <td colSpan={7} className="px-3 py-4 text-center">
                    <div className="flex flex-col items-center justify-center">
                      <div className="w-12 h-12 bg-gradient-to-br from-gray-100 to-gray-200 rounded-full flex items-center justify-center mb-2">
                        <TbBuildingSkyscraper className="w-6 h-6 text-gray-400" />
                      </div>
                      <h3 className="text-sm font-semibold text-gray-900 mb-1">
                        {entities.length === 0 ? 'Aucune société trouvée' : 'Aucun résultat'}
                      </h3>
                      <p className="text-gray-600 text-xs mb-3 max-w-md">
                        {entities.length === 0
                          ? 'Commencez par créer votre première société'
                          : 'Essayez de modifier vos critères de recherche'}
                      </p>
                      {entities.length === 0 && (
                        <button
                          onClick={handleNewEntity}
                          className="px-3 py-1 bg-gradient-to-r from-violet-600 to-violet-500 text-white rounded hover:from-violet-700 hover:to-violet-600 transition-all duration-300 font-medium flex items-center gap-1 text-xs"
                        >
                          <FiPlus size={12} />
                          Créer société
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
                      selectedRows.includes(entity.id) ? 'bg-gradient-to-r from-violet-50 to-violet-25' : 'bg-white'
                    }`}
                  >
                    {/* ID avec checkbox */}
                    <td className="px-3 py-2 whitespace-nowrap border-r border-gray-200">
                      <div className="flex items-center gap-1.5">
                        <input
                          type="checkbox"
                          checked={selectedRows.includes(entity.id)}
                          onChange={() => toggleRowSelection(entity.id)}
                          className="w-3 h-3 text-violet-600 rounded focus:ring-violet-500 border-gray-300"
                        />
                        <span className="px-1 py-0.5 bg-gray-100 text-gray-800 rounded text-xs font-medium font-mono">
                          #{entity.id}
                        </span>
                      </div>
                    </td>
                    {/* Société */}
                    <td className="px-3 py-2 border-r border-gray-200">
                      <div className="flex items-center gap-2">
                        {entity.logo ? (
                          <div className="w-8 h-8 rounded-full overflow-hidden bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200">
                            <img src={entity.logo} alt={entity.raison_sociale} className="w-full h-full object-cover" />
                          </div>
                        ) : (
                          <div className="w-8 h-8 bg-gradient-to-br from-violet-50 to-violet-100 rounded-full flex items-center justify-center border border-violet-200">
                            <TbBuildingSkyscraper className="w-4 h-4 text-violet-600" />
                          </div>
                        )}
                        <div>
                          <div className="text-xs font-semibold text-gray-900 truncate max-w-[120px]">{entity.raison_sociale}</div>
                          <div className="text-xs text-gray-500">{entity.forme_juridique || '-'}</div>
                        </div>
                      </div>
                    </td>
                    {/* Activité */}
                    <td className="px-3 py-2 border-r border-gray-200">
                      <div className="text-xs text-gray-900 truncate max-w-[100px]">
                        {entity.activite || '-'}
                      </div>
                    </td>
                    {/* Localisation */}
                    <td className="px-3 py-2 border-r border-gray-200">
                      <div className="flex flex-col">
                        <div className="text-xs text-gray-900">
                          {entity.ville_details?.nom || entity.ville_legacy || '-'}
                        </div>
                        <div className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                          {entity.pays_details?.emoji || '🌍'}
                          <span className="truncate max-w-[80px]">{entity.pays_details?.nom || '-'}</span>
                        </div>
                      </div>
                    </td>
                    {/* Contact */}
                    <td className="px-3 py-2 border-r border-gray-200">
                      <div className="flex flex-col">
                        <div className="text-xs text-gray-900 truncate max-w-[100px]">{entity.email || '-'}</div>
                        <div className="text-xs text-gray-500 truncate max-w-[100px]">{entity.telephone || '-'}</div>
                      </div>
                    </td>
                    {/* Statut */}
                    <td className="px-3 py-2 border-r border-gray-200">
                      <div className="flex items-center">
                        <div className={`px-1.5 py-0.5 rounded flex items-center gap-1 ${
                          entity.statut
                            ? 'bg-gradient-to-r from-green-50 to-emerald-50 text-green-700 border border-green-200'
                            : 'bg-gradient-to-r from-red-50 to-pink-50 text-red-700 border border-red-200'
                        }`}>
                          {entity.statut ? (
                            <>
                              <div className="w-1.5 h-1.5 bg-green-500 rounded-full"></div>
                              <span className="text-xs font-medium">Active</span>
                            </>
                          ) : (
                            <>
                              <div className="w-1.5 h-1.5 bg-red-500 rounded-full"></div>
                              <span className="text-xs font-medium">Inactive</span>
                            </>
                          )}
                        </div>
                      </div>
                    </td>
                    {/* Actions */}
                    <td className="px-3 py-2 whitespace-nowrap">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleViewDetails(entity)}
                          className="p-1 bg-gradient-to-r from-gray-50 to-gray-100 text-gray-700 rounded hover:from-gray-100 hover:to-gray-200 transition-all duration-200 shadow-sm hover:shadow"
                          title="Voir détails"
                        >
                          <FiEye size={12} />
                        </button>
                        <button
                          onClick={() => handleEdit(entity)}
                          className="p-1 bg-gradient-to-r from-violet-50 to-violet-100 text-violet-700 rounded hover:from-violet-100 hover:to-violet-200 transition-all duration-200 shadow-sm hover:shadow"
                          title="Modifier"
                        >
                          <FiEdit2 size={12} />
                        </button>
                        <button
                          onClick={() => handleDelete(entity)}
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
        {currentEntities.length > 0 && (
          <div className="px-3 py-2 border-t border-gray-200 bg-gradient-to-r from-gray-50 to-white">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1">
                  <span className="text-xs text-gray-700">
                    Page {currentPage} sur {totalPages}
                  </span>
                  <span className="text-gray-300">•</span>
                  <span className="text-xs text-gray-700">
                    {indexOfFirstItem + 1}-{Math.min(indexOfLastItem, filteredEntities.length)} sur {filteredEntities.length} sociétés
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

// MODAL DE DÉTAILS SOCIÉTÉ (inchangé)
function EntityDetailModal({ entity, onClose }) {
  // ... (gardez tout le code existant de EntityDetailModal)
  // Il n'a pas été modifié car il ne contient pas de formulaire
  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-3 z-50 backdrop-blur-sm">
      {/* Contenu inchangé */}
    </div>
  );
}