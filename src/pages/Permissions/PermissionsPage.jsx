import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { apiClient } from '../../services/apiClient';
import { 
  FiRefreshCw, FiPlus, FiEdit2, FiTrash2, FiSearch, FiX, FiChevronDown,
  FiCheck, FiUsers, FiChevronLeft, FiChevronRight, FiDownload, FiUpload,
  FiEye, FiCheckCircle, FiXCircle, FiShield, FiLayers, FiBriefcase,
  FiLock, FiUnlock, FiFolder, FiKey, FiLink, FiChevronUp, FiMoreVertical,
  FiMail, FiPhone, FiCalendar, FiClock
} from "react-icons/fi";

// Types d'accès
const TYPES_ACCES = [
  { value: 'aucun', label: 'Aucun accès', color: 'red', bgColor: 'bg-red-100', textColor: 'text-red-800', borderColor: 'border-red-300' },
  { value: 'lecture', label: 'Lecture seule', color: 'blue', bgColor: 'bg-blue-100', textColor: 'text-blue-800', borderColor: 'border-blue-300' },
  { value: 'ecriture', label: 'Lecture/Écriture', color: 'green', bgColor: 'bg-green-100', textColor: 'text-green-800', borderColor: 'border-green-300' },
  { value: 'validation', label: 'Validation', color: 'purple', bgColor: 'bg-purple-100', textColor: 'text-purple-800', borderColor: 'border-purple-300' },
  { value: 'suppression', label: 'Suppression', color: 'orange', bgColor: 'bg-orange-100', textColor: 'text-orange-800', borderColor: 'border-orange-300' },
  { value: 'personnalise', label: 'Personnalisé', color: 'gray', bgColor: 'bg-gray-100', textColor: 'text-gray-800', borderColor: 'border-gray-300' }
];

export default function PermissionsPage() {
  // États pour les données
  const [permissions, setPermissions] = useState([]);
  const [groupes, setGroupes] = useState([]);
  const [modules, setModules] = useState([]);
  const [entites, setEntites] = useState([]);
  
  // États pour l'UI
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showPermissionForm, setShowPermissionForm] = useState(false);
  const [showGroupForm, setShowGroupForm] = useState(false);
  const [editingPermission, setEditingPermission] = useState(null);
  const [editingGroup, setEditingGroup] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedDetail, setSelectedDetail] = useState(null);
  
  // États pour la recherche et filtres
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [selectedRows, setSelectedRows] = useState([]);
  const [activeTab, setActiveTab] = useState('permissions'); // 'permissions' ou 'groups'
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);
  const [filterTypeAcces, setFilterTypeAcces] = useState('');
  const [filterStatut, setFilterStatut] = useState('');

  // Chargement initial des données
  useEffect(() => {
    fetchAllData();
  }, []);

  const fetchAllData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Chargement parallèle
      const [permissionsRes, groupesRes, modulesRes, entitesRes] = await Promise.all([
        apiClient.get('/permissions/'),
        apiClient.get('/groupes/'),
        apiClient.get('/modules/'),
        apiClient.get('/entites/')
      ]);
      
      // Extraction des données
      const extractData = (response) => {
        if (Array.isArray(response)) return response;
        if (response && Array.isArray(response.results)) return response.results;
        if (response && Array.isArray(response.data)) return response.data;
        return [];
      };
      
      setPermissions(extractData(permissionsRes));
      setGroupes(extractData(groupesRes));
      setModules(extractData(modulesRes));
      setEntites(extractData(entitesRes));
      
    } catch (err) {
      console.error('Erreur lors du chargement des données:', err);
      setError('Erreur lors du chargement des données');
    } finally {
      setLoading(false);
    }
  };

  // Gestion des permissions
  const handleNewPermission = () => {
    setEditingPermission(null);
    setShowPermissionForm(true);
  };

  const handleEditPermission = (permission) => {
    setEditingPermission(permission);
    setShowPermissionForm(true);
  };

  const handleDeletePermission = async (permission) => {
    if (window.confirm(`Êtes-vous sûr de vouloir supprimer cette permission ?`)) {
      try {
        await apiClient.delete(`/permissions/${permission.id}/`);
        fetchAllData();
      } catch (err) {
        setError('Erreur lors de la suppression');
        console.error('Error deleting permission:', err);
      }
    }
  };

  const handleToggleStatutPermission = async (permission) => {
    try {
      const nouveauStatut = !permission.statut;
      await apiClient.patch(`/permissions/${permission.id}/`, {
        statut: nouveauStatut
      });
      fetchAllData();
    } catch (err) {
      setError('Erreur lors de la modification du statut');
      console.error('Error toggling statut:', err);
    }
  };

  // Gestion des groupes
  const handleNewGroup = () => {
    setEditingGroup(null);
    setShowGroupForm(true);
  };

  const handleEditGroup = (group) => {
    setEditingGroup(group);
    setShowGroupForm(true);
  };

  const handleDeleteGroup = async (group) => {
    if (window.confirm(`Êtes-vous sûr de vouloir supprimer le groupe "${group.name}" ?`)) {
      try {
        await apiClient.delete(`/groupes/${group.id}/`);
        fetchAllData();
      } catch (err) {
        setError('Erreur lors de la suppression');
        console.error('Error deleting group:', err);
      }
    }
  };

  // Gestion des détails
  const handleViewDetails = (item) => {
    setSelectedDetail(item);
    setShowDetailModal(true);
  };

  // Filtrage et recherche
  const filteredPermissions = useMemo(() => {
    return permissions.filter(permission => {
      const matchesSearch = 
        (permission.groupe_details?.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (permission.module_details?.nom_affiche || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (permission.module_details?.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (permission.entite_details?.raison_sociale || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (permission.acces || '').toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesTypeAcces = !filterTypeAcces || 
        permission.acces === filterTypeAcces;
      
      const matchesStatut = filterStatut === '' || 
        permission.statut?.toString() === filterStatut;
      
      return matchesSearch && matchesTypeAcces && matchesStatut;
    });
  }, [permissions, searchTerm, filterTypeAcces, filterStatut]);

  const filteredGroupes = useMemo(() => {
    return groupes.filter(group => 
      group.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      group.description?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [groupes, searchTerm]);

  // Données actuelles selon l'onglet actif
  const currentData = activeTab === 'permissions' ? filteredPermissions : filteredGroupes;
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = currentData.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(currentData.length / itemsPerPage);

  // Sélection des lignes
  const toggleRowSelection = (id) => {
    setSelectedRows(prev => 
      prev.includes(id) 
        ? prev.filter(rowId => rowId !== id)
        : [...prev, id]
    );
  };

  const selectAllRows = useCallback(() => {
    if (selectedRows.length === currentItems.length) {
      setSelectedRows([]);
    } else {
      setSelectedRows(currentItems.map(item => item.id));
    }
  }, [currentItems, selectedRows.length]);

  // Pagination
  const paginate = (pageNumber) => setCurrentPage(pageNumber);
  const nextPage = () => currentPage < totalPages && setCurrentPage(currentPage + 1);
  const prevPage = () => currentPage > 1 && setCurrentPage(currentPage - 1);

  // Statistiques
  const stats = useMemo(() => ({
    totalPermissions: permissions.length,
    totalGroups: groupes.length,
    permissionsActives: permissions.filter(p => p.statut).length,
    permissionsInactives: permissions.filter(p => !p.statut).length,
    groupsWithPermissions: groupes.filter(g => 
      permissions.some(p => p.groupe === g.id || p.groupe?.id === g.id)
    ).length,
  }), [permissions, groupes]);

  // Gestion des succès des formulaires
  const handleFormSuccess = () => {
    setShowPermissionForm(false);
    setShowGroupForm(false);
    setEditingPermission(null);
    setEditingGroup(null);
    fetchAllData();
  };

  const handleRetry = () => {
    fetchAllData();
  };

  const resetFilters = () => {
    setSearchTerm('');
    setFilterTypeAcces('');
    setFilterStatut('');
    setCurrentPage(1);
  };

  // Obtenir les classes CSS pour le badge d'accès
  const getAccesBadgeClasses = (accesValue) => {
    const type = TYPES_ACCES.find(t => t.value === accesValue);
    return type ? `${type.bgColor} ${type.textColor} ${type.borderColor}` : 'bg-gray-100 text-gray-800 border-gray-300';
  };

  // Obtenir le libellé du type d'accès
  const getAccesLabel = (accesValue) => {
    const type = TYPES_ACCES.find(t => t.value === accesValue);
    return type ? type.label : 'Inconnu';
  };

  if (loading && !permissions.length) {
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
        {/* Ligne supérieure avec titre */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-gradient-to-br from-violet-600 to-violet-500 rounded-lg shadow">
              <FiShield className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">Permissions × Groupes</h1>
              <p className="text-gray-600 text-xs mt-0.5">
                Gérez les associations entre permissions et groupes
              </p>
            </div>
          </div>
        </div>

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
                placeholder={activeTab === 'permissions' ? "Rechercher une permission..." : "Rechercher un groupe..."}
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
                    filterTypeAcces || filterStatut ? 'bg-violet-100 text-violet-700' : 'bg-gray-100 text-gray-700'
                  } hover:bg-gray-200 transition-colors`}
                >
                  <FiChevronDown size={12} />
                  <span>Filtre</span>
                </button>
                
                {/* Dropdown des filtres */}
                {showFilterDropdown && (
                  <div className="absolute right-0 top-full mt-1 w-48 bg-white rounded-lg shadow-lg border border-gray-200 z-10">
                    <div className="p-2">
                      <p className="text-xs font-medium text-gray-700 mb-2">
                        {activeTab === 'permissions' ? 'Filtrer par' : 'Filtrer'}
                      </p>
                      
                      {activeTab === 'permissions' ? (
                        <>
                          <div className="space-y-1 mb-3">
                            <p className="text-xs font-medium text-gray-700 mb-1">Type d'accès</p>
                            <select
                              value={filterTypeAcces}
                              onChange={(e) => {
                                setFilterTypeAcces(e.target.value);
                                setShowFilterDropdown(false);
                              }}
                              className="w-full text-xs border border-gray-300 rounded px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-violet-500"
                            >
                              <option value="">Tous les types</option>
                              {TYPES_ACCES.map(type => (
                                <option key={type.value} value={type.value}>{type.label}</option>
                              ))}
                            </select>
                          </div>
                          
                          <div className="space-y-1">
                            <p className="text-xs font-medium text-gray-700 mb-1">Statut</p>
                            <select
                              value={filterStatut}
                              onChange={(e) => {
                                setFilterStatut(e.target.value);
                                setShowFilterDropdown(false);
                              }}
                              className="w-full text-xs border border-gray-300 rounded px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-violet-500"
                            >
                              <option value="">Tous les statuts</option>
                              <option value="true">Actif</option>
                              <option value="false">Inactif</option>
                            </select>
                          </div>
                        </>
                      ) : (
                        <p className="text-xs text-gray-500 py-2">
                          Aucun filtre disponible pour les groupes
                        </p>
                      )}
                      
                      {(searchTerm || filterTypeAcces || filterStatut) && (
                        <button
                          onClick={() => {
                            resetFilters();
                            setShowFilterDropdown(false);
                          }}
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
            
            {activeTab === 'permissions' ? (
              <button 
                onClick={handleNewPermission}
                className="ml-2 px-3 py-2 rounded-lg bg-gradient-to-r from-violet-600 to-violet-500 text-white hover:from-violet-700 hover:to-violet-600 transition-all duration-300 flex items-center gap-1.5 text-sm shadow"
              >
                <FiPlus size={14} />
                <span>Nouvelle Permission</span>
              </button>
            ) : (
              <button 
                onClick={handleNewGroup}
                className="ml-2 px-3 py-2 rounded-lg bg-gradient-to-r from-violet-600 to-violet-500 text-white hover:from-violet-700 hover:to-violet-600 transition-all duration-300 flex items-center gap-1.5 text-sm shadow"
              >
                <FiPlus size={14} />
                <span>Nouveau Groupe</span>
              </button>
            )}
          </div>
        </div>

        {/* Statistiques en ligne compactes */}
        <div className="grid grid-cols-4 gap-2 mb-3">
          <div className="bg-white rounded-lg p-2 border border-gray-200 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-600">Total permissions</p>
                <p className="text-sm font-bold text-violet-600 mt-0.5">{stats.totalPermissions}</p>
              </div>
              <div className="p-1 bg-violet-50 rounded">
                <FiShield className="w-3 h-3 text-violet-600" />
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg p-2 border border-gray-200 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-600">Actives</p>
                <p className="text-sm font-bold text-green-600 mt-0.5">{stats.permissionsActives}</p>
              </div>
              <div className="p-1 bg-green-50 rounded">
                <FiCheckCircle className="w-3 h-3 text-green-600" />
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg p-2 border border-gray-200 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-600">Inactives</p>
                <p className="text-sm font-bold text-red-600 mt-0.5">{stats.permissionsInactives}</p>
              </div>
              <div className="p-1 bg-red-50 rounded">
                <FiXCircle className="w-3 h-3 text-red-600" />
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg p-2 border border-gray-200 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-600">Total groupes</p>
                <p className="text-sm font-bold text-purple-600 mt-0.5">{stats.totalGroups}</p>
              </div>
              <div className="p-1 bg-purple-50 rounded">
                <FiUsers className="w-3 h-3 text-purple-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Onglets Permissions | Groupes */}
        <div className="flex border-b border-gray-200 mb-3">
          <button
            onClick={() => {
              setActiveTab('permissions');
              setCurrentPage(1);
              setSelectedRows([]);
              setFilterTypeAcces('');
              setFilterStatut('');
            }}
            className={`px-4 py-1.5 text-xs font-medium border-b-2 transition-colors ${
              activeTab === 'permissions'
                ? 'border-violet-600 text-violet-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Permissions
          </button>
          <button
            onClick={() => {
              setActiveTab('groups');
              setCurrentPage(1);
              setSelectedRows([]);
              setFilterTypeAcces('');
              setFilterStatut('');
            }}
            className={`px-4 py-1.5 text-xs font-medium border-b-2 transition-colors ${
              activeTab === 'groups'
                ? 'border-violet-600 text-violet-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Groupes
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
                  checked={selectedRows.length === currentItems.length && currentItems.length > 0}
                  onChange={selectAllRows}
                  className="w-3 h-3 text-violet-600 rounded focus:ring-violet-500 border-gray-300"
                />
                <span className="text-xs text-gray-700">
                  {selectedRows.length} sélectionné(s)
                </span>
              </div>
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
                      checked={selectedRows.length === currentItems.length && currentItems.length > 0}
                      onChange={selectAllRows}
                      className="w-3 h-3 text-violet-600 rounded focus:ring-violet-500 border-gray-300"
                    />
                    IDENTIFIANT
                  </div>
                </th>
                
                {activeTab === 'permissions' ? (
                  <>
                    <th scope="col" className="px-3 py-2 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider border-r border-gray-300">
                      Groupe
                    </th>
                    <th scope="col" className="px-3 py-2 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider border-r border-gray-300">
                      Module
                    </th>
                    <th scope="col" className="px-3 py-2 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider border-r border-gray-300">
                      Type d'accès
                    </th>
                    <th scope="col" className="px-3 py-2 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Actions
                    </th>
                  </>
                ) : (
                  <>
                    <th scope="col" className="px-3 py-2 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider border-r border-gray-300">
                      Nom du Groupe
                    </th>
                    <th scope="col" className="px-3 py-2 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider border-r border-gray-300">
                      Description
                    </th>
                    <th scope="col" className="px-3 py-2 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider border-r border-gray-300">
                      Permissions
                    </th>
                    <th scope="col" className="px-3 py-2 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Actions
                    </th>
                  </>
                )}
              </tr>
            </thead>
            
            <tbody className="divide-y divide-gray-200">
              {currentItems.length === 0 ? (
                <tr>
                  <td colSpan={activeTab === 'permissions' ? 5 : 5} className="px-3 py-4 text-center">
                    <div className="flex flex-col items-center justify-center">
                      <div className="w-12 h-12 bg-gradient-to-br from-gray-100 to-gray-200 rounded-full flex items-center justify-center mb-2">
                        {activeTab === 'permissions' ? (
                          <FiShield className="w-6 h-6 text-gray-400" />
                        ) : (
                          <FiUsers className="w-6 h-6 text-gray-400" />
                        )}
                      </div>
                      <h3 className="text-sm font-semibold text-gray-900 mb-1">
                        {activeTab === 'permissions' 
                          ? (permissions.length === 0 ? 'Aucune permission trouvée' : 'Aucun résultat')
                          : (groupes.length === 0 ? 'Aucun groupe trouvé' : 'Aucun résultat')
                        }
                      </h3>
                      <p className="text-gray-600 text-xs mb-3 max-w-md">
                        {activeTab === 'permissions'
                          ? (permissions.length === 0 
                              ? 'Commencez par créer votre première permission' 
                              : 'Essayez de modifier vos critères de recherche')
                          : (groupes.length === 0
                              ? 'Commencez par créer votre premier groupe'
                              : 'Essayez de modifier vos critères de recherche')
                        }
                      </p>
                      {((activeTab === 'permissions' && permissions.length === 0) || (activeTab === 'groups' && groupes.length === 0)) && (
                        <button 
                          onClick={activeTab === 'permissions' ? handleNewPermission : handleNewGroup}
                          className="px-3 py-1 bg-gradient-to-r from-violet-600 to-violet-500 text-white rounded hover:from-violet-700 hover:to-violet-600 transition-all duration-300 font-medium flex items-center gap-1 text-xs"
                        >
                          <FiPlus size={12} />
                          {activeTab === 'permissions' ? 'Créer permission' : 'Créer groupe'}
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                currentItems.map((item) => (
                  <tr 
                    key={item.id}
                    className={`hover:bg-gradient-to-r hover:from-gray-50 hover:to-white transition-all duration-200 ${
                      selectedRows.includes(item.id) ? 'bg-gradient-to-r from-violet-50 to-violet-25' : 'bg-white'
                    }`}
                  >
                    {/* IDENTIFIANT avec checkbox */}
                    <td className="px-3 py-2 whitespace-nowrap border-r border-gray-200">
                      <div className="flex items-center gap-1.5">
                        <input
                          type="checkbox"
                          checked={selectedRows.includes(item.id)}
                          onChange={() => toggleRowSelection(item.id)}
                          className="w-3 h-3 text-violet-600 rounded focus:ring-violet-500 border-gray-300"
                        />
                        <span className="px-1 py-0.5 bg-gray-100 text-gray-800 rounded text-xs font-medium font-mono">
                          #{item.id}
                        </span>
                      </div>
                    </td>
                    
                    {activeTab === 'permissions' ? (
                      <>
                        {/* Groupe */}
                        <td className="px-3 py-2 border-r border-gray-200">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 bg-gradient-to-br from-blue-50 to-blue-100 rounded-full flex items-center justify-center border border-blue-200">
                              <FiUsers className="w-4 h-4 text-blue-600" />
                            </div>
                            <div>
                              <div className="text-xs font-semibold text-gray-900 truncate max-w-[120px]">
                                {item.groupe_details?.name || item.groupe?.name || '-'}
                              </div>
                            </div>
                          </div>
                        </td>
                        
                        {/* Module */}
                        <td className="px-3 py-2 border-r border-gray-200">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 bg-gradient-to-br from-green-50 to-green-100 rounded-full flex items-center justify-center border border-green-200">
                              <FiLayers className="w-4 h-4 text-green-600" />
                            </div>
                            <div>
                              <div className="text-xs font-medium text-gray-900 truncate max-w-[100px]">
                                {item.module_details?.nom_affiche || item.module_details?.name || item.module?.nom_affiche || item.module?.name || '-'}
                              </div>
                            </div>
                          </div>
                        </td>
                        
                        {/* Type d'accès */}
                        <td className="px-3 py-2 border-r border-gray-200">
                          <div className={`px-1.5 py-0.5 rounded flex items-center gap-1 border ${getAccesBadgeClasses(item.acces)}`}>
                            <div className={`w-1.5 h-1.5 rounded-full ${
                              item.acces === 'aucun' ? 'bg-red-500' :
                              item.acces === 'lecture' ? 'bg-blue-500' :
                              item.acces === 'ecriture' ? 'bg-green-500' :
                              item.acces === 'validation' ? 'bg-purple-500' :
                              item.acces === 'suppression' ? 'bg-orange-500' :
                              'bg-gray-500'
                            }`}></div>
                            <span className="text-xs font-medium">{getAccesLabel(item.acces)}</span>
                          </div>
                        </td>
                        
                        {/* Actions pour permissions */}
                        <td className="px-3 py-2 whitespace-nowrap">
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => handleViewDetails(item)}
                              className="p-1 bg-gradient-to-r from-gray-50 to-gray-100 text-gray-700 rounded hover:from-gray-100 hover:to-gray-200 transition-all duration-200 shadow-sm hover:shadow"
                              title="Voir détails"
                            >
                              <FiEye size={12} />
                            </button>
                            <button
                              onClick={() => handleToggleStatutPermission(item)}
                              className={`p-1 rounded transition-all duration-200 shadow-sm hover:shadow ${
                                item.statut
                                  ? 'bg-gradient-to-r from-orange-50 to-orange-100 text-orange-700 hover:from-orange-100 hover:to-orange-200'
                                  : 'bg-gradient-to-r from-green-50 to-green-100 text-green-700 hover:from-green-100 hover:to-green-200'
                              }`}
                              title={item.statut ? 'Désactiver' : 'Activer'}
                            >
                              {item.statut ? (
                                <FiLock size={12} />
                              ) : (
                                <FiUnlock size={12} />
                              )}
                            </button>
                            <button
                              onClick={() => handleEditPermission(item)}
                              className="p-1 bg-gradient-to-r from-violet-50 to-violet-100 text-violet-700 rounded hover:from-violet-100 hover:to-violet-200 transition-all duration-200 shadow-sm hover:shadow"
                              title="Modifier"
                            >
                              <FiEdit2 size={12} />
                            </button>
                            <button
                              onClick={() => handleDeletePermission(item)}
                              className="p-1 bg-gradient-to-r from-red-50 to-red-100 text-red-700 rounded hover:from-red-100 hover:to-red-200 transition-all duration-200 shadow-sm hover:shadow"
                              title="Supprimer"
                            >
                              <FiTrash2 size={12} />
                            </button>
                          </div>
                        </td>
                      </>
                    ) : (
                      <>
                        {/* Nom du Groupe */}
                        <td className="px-3 py-2 border-r border-gray-200">
                          <div className="flex items-center gap-1.5">
                            <div className="p-0.5 bg-violet-100 rounded">
                              <FiFolder className="w-2.5 h-2.5 text-violet-700" />
                            </div>
                            <div className="text-xs font-semibold text-gray-900">{item.name}</div>
                          </div>
                        </td>
                        
                        {/* Description */}
                        <td className="px-3 py-2 border-r border-gray-200">
                          <div className="text-xs text-gray-600">
                            {item.description || 'Aucune description'}
                          </div>
                        </td>
                        
                        {/* Permissions */}
                        <td className="px-3 py-2 border-r border-gray-200">
                          <span className="inline-flex px-1.5 py-0.5 rounded text-xs font-medium bg-gradient-to-r from-green-50 to-emerald-50 text-green-700 border border-green-200">
                            {permissions.filter(p => p.groupe === item.id || p.groupe?.id === item.id).length} permission(s)
                          </span>
                        </td>
                        
                        {/* Actions pour groupes */}
                        <td className="px-3 py-2 whitespace-nowrap">
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => handleViewDetails(item)}
                              className="p-1 bg-gradient-to-r from-gray-50 to-gray-100 text-gray-700 rounded hover:from-gray-100 hover:to-gray-200 transition-all duration-200 shadow-sm hover:shadow"
                              title="Voir détails"
                            >
                              <FiEye size={12} />
                            </button>
                            <button
                              onClick={() => handleEditGroup(item)}
                              className="p-1 bg-gradient-to-r from-violet-50 to-violet-100 text-violet-700 rounded hover:from-violet-100 hover:to-violet-200 transition-all duration-200 shadow-sm hover:shadow"
                              title="Modifier"
                            >
                              <FiEdit2 size={12} />
                            </button>
                            <button
                              onClick={() => handleDeleteGroup(item)}
                              className="p-1 bg-gradient-to-r from-red-50 to-red-100 text-red-700 rounded hover:from-red-100 hover:to-red-200 transition-all duration-200 shadow-sm hover:shadow"
                              title="Supprimer"
                            >
                              <FiTrash2 size={12} />
                            </button>
                          </div>
                        </td>
                      </>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination compact */}
        {currentItems.length > 0 && (
          <div className="px-3 py-2 border-t border-gray-200 bg-gradient-to-r from-gray-50 to-white">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1">
                  <span className="text-xs text-gray-700">
                    Page {currentPage} sur {totalPages}
                  </span>
                  <span className="text-gray-300">•</span>
                  <span className="text-xs text-gray-700">
                    {indexOfFirstItem + 1}-{Math.min(indexOfLastItem, currentData.length)} sur {currentData.length} {activeTab === 'permissions' ? 'permissions' : 'groupes'}
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

      {/* Modaux pour création/édition */}
      {showPermissionForm && (
        <PermissionFormModal
          permission={editingPermission}
          groupes={groupes}
          modules={modules}
          entites={entites}
          onClose={() => {
            setShowPermissionForm(false);
            setEditingPermission(null);
          }}
          onSuccess={handleFormSuccess}
        />
      )}

      {showGroupForm && (
        <GroupFormModal
          group={editingGroup}
          onClose={() => {
            setShowGroupForm(false);
            setEditingGroup(null);
          }}
          onSuccess={handleFormSuccess}
        />
      )}

      {/* Modal de détails */}
      {showDetailModal && selectedDetail && (
        <DetailModal
          item={selectedDetail}
          type={activeTab}
          permissions={permissions}
          groupes={groupes}
          modules={modules}
          entites={entites}
          onClose={() => {
            setShowDetailModal(false);
            setSelectedDetail(null);
          }}
        />
      )}
    </div>
  );
}

// MODAL DE DÉTAILS PERMISSION
function PermissionDetailModal({ item, groupes, modules, entites, onClose }) {
  const getModuleName = (permission) => {
    return permission.module_details?.nom_affiche || 
           permission.module_details?.name || 
           permission.module?.nom_affiche ||
           permission.module?.name || 
           'N/A';
  };

  const getGroupeName = (permission) => {
    return permission.groupe_details?.name || 
           permission.groupe?.name || 
           'N/A';
  };

  const getEntiteName = (permission) => {
    return permission.entite_details?.raison_sociale || 
           permission.entite_details?.name ||
           'Toutes';
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-3 z-50 backdrop-blur-sm">
      <div className="bg-white rounded-lg w-full max-w-4xl max-h-[90vh] overflow-y-auto shadow-xl">
        <div className="sticky top-0 bg-gradient-to-r from-violet-600 to-violet-500 text-white rounded-t-lg p-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-white/20 backdrop-blur-sm rounded">
                <FiShield className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-base font-bold">Détails de la permission</h2>
                <p className="text-violet-100 text-xs mt-0.5">
                  {getGroupeName(item)} - {getModuleName(item)}
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
        
        <div className="p-4 space-y-4">
          {/* Informations Générales */}
          <div className="bg-gradient-to-br from-gray-50 to-white rounded-lg p-4 border border-gray-200">
            <h3 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-1.5">
              <div className="w-1 h-4 bg-gradient-to-b from-violet-600 to-violet-400 rounded"></div>
              Informations Générales
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-xs font-medium text-gray-500 mb-1">IDENTIFIANT</p>
                <p className="text-sm text-gray-900 font-medium font-mono">#{item.id}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500 mb-1">Groupe</p>
                <p className="text-sm text-gray-900 font-medium">{getGroupeName(item)}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500 mb-1">Module</p>
                <p className="text-sm text-gray-900 font-medium">{getModuleName(item)}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500 mb-1">Entité</p>
                <p className="text-sm text-gray-900">
                  {getEntiteName(item)}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500 mb-1">Type d'accès</p>
                <div className={`inline-flex items-center px-2 py-1 rounded border ${
                  item.acces === 'aucun' ? 'bg-red-100 text-red-800 border-red-300' :
                  item.acces === 'lecture' ? 'bg-blue-100 text-blue-800 border-blue-300' :
                  item.acces === 'ecriture' ? 'bg-green-100 text-green-800 border-green-300' :
                  item.acces === 'validation' ? 'bg-purple-100 text-purple-800 border-purple-300' :
                  item.acces === 'suppression' ? 'bg-orange-100 text-orange-800 border-orange-300' :
                  'bg-gray-100 text-gray-800 border-gray-300'
                }`}>
                  <span className="text-xs font-medium">
                    {item.acces === 'aucun' ? 'Aucun accès' :
                     item.acces === 'lecture' ? 'Lecture seule' :
                     item.acces === 'ecriture' ? 'Lecture/Écriture' :
                     item.acces === 'validation' ? 'Validation' :
                     item.acces === 'suppression' ? 'Suppression' :
                     'Personnalisé'}
                  </span>
                </div>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500 mb-1">Statut</p>
                <div className={`px-2 py-1 rounded inline-flex items-center gap-1 ${
                  item.statut
                    ? 'bg-gradient-to-r from-green-50 to-emerald-50 text-green-700 border border-green-200' 
                    : 'bg-gradient-to-r from-red-50 to-pink-50 text-red-700 border border-red-200'
                }`}>
                  {item.statut ? (
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

// MODAL DE DÉTAILS GROUPE
function GroupDetailModal({ item, permissions, modules, onClose }) {
  const groupPermissions = permissions.filter(p => p.groupe === item.id || p.groupe?.id === item.id);

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-3 z-50 backdrop-blur-sm">
      <div className="bg-white rounded-lg w-full max-w-4xl max-h-[90vh] overflow-y-auto shadow-xl">
        <div className="sticky top-0 bg-gradient-to-r from-violet-600 to-violet-500 text-white rounded-t-lg p-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-white/20 backdrop-blur-sm rounded">
                <FiUsers className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-base font-bold">Détails du groupe</h2>
                <p className="text-violet-100 text-xs mt-0.5">{item.name}</p>
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
          <div className="bg-gradient-to-br from-gray-50 to-white rounded-lg p-4 border border-gray-200">
            <h3 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-1.5">
              <div className="w-1 h-4 bg-gradient-to-b from-violet-600 to-violet-400 rounded"></div>
              Informations Générales
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <p className="text-xs font-medium text-gray-500 mb-1">IDENTIFIANT</p>
                <p className="text-sm text-gray-900 font-medium font-mono">#{item.id}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500 mb-1">Nom du Groupe</p>
                <p className="text-sm text-gray-900 font-medium">{item.name}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500 mb-1">Permissions</p>
                <p className="text-sm text-gray-900">{groupPermissions.length} permission(s)</p>
              </div>
              <div className="md:col-span-3">
                <p className="text-xs font-medium text-gray-500 mb-1">Description</p>
                <p className="text-sm text-gray-900">{item.description || 'Aucune description'}</p>
              </div>
            </div>
          </div>

          {groupPermissions.length > 0 && (
            <div className="bg-gradient-to-br from-violet-50 to-purple-50 rounded-lg p-4 border border-violet-200">
              <h3 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-1.5">
                <div className="w-1 h-4 bg-gradient-to-b from-violet-600 to-violet-400 rounded"></div>
                Permissions du groupe
              </h3>
              <div className="space-y-3">
                {groupPermissions.map(permission => (
                  <div key={permission.id} className="bg-white rounded-lg p-3 border border-gray-200">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium text-gray-900 text-sm">
                          {permission.module_details?.nom_affiche || 
                           permission.module_details?.name || 
                           permission.module?.nom_affiche ||
                           permission.module?.name || 
                           'N/A'}
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <span className={`text-xs px-2 py-0.5 rounded ${
                            permission.acces === 'aucun' ? 'bg-red-100 text-red-800' :
                            permission.acces === 'lecture' ? 'bg-blue-100 text-blue-800' :
                            permission.acces === 'ecriture' ? 'bg-green-100 text-green-800' :
                            permission.acces === 'validation' ? 'bg-purple-100 text-purple-800' :
                            permission.acces === 'suppression' ? 'bg-orange-100 text-orange-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {permission.acces === 'aucun' ? 'Aucun accès' :
                             permission.acces === 'lecture' ? 'Lecture seule' :
                             permission.acces === 'ecriture' ? 'Lecture/Écriture' :
                             permission.acces === 'validation' ? 'Validation' :
                             permission.acces === 'suppression' ? 'Suppression' :
                             'Personnalisé'}
                          </span>
                          <span className={`text-xs px-2 py-0.5 rounded ${
                            permission.statut
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {permission.statut ? 'Active' : 'Inactive'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

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

// MODAL DE DÉTAILS (wrapper)
function DetailModal({ item, type, permissions, groupes, modules, entites, onClose }) {
  if (type === 'permissions') {
    return <PermissionDetailModal item={item} groupes={groupes} modules={modules} entites={entites} onClose={onClose} />;
  } else {
    return <GroupDetailModal item={item} permissions={permissions} modules={modules} onClose={onClose} />;
  }
}

// MODAL FORMULAIRE PERMISSION (identique à votre code original)
function PermissionFormModal({ permission, groupes, modules, entites, onClose, onSuccess }) {
  const [formData, setFormData] = useState({
    groupe: permission?.groupe?.id || permission?.groupe || '',
    module: permission?.module?.id || permission?.module || '',
    entite: permission?.entite?.id || permission?.entite || '',
    acces: permission?.acces || 'lecture',
    statut: permission?.statut !== undefined ? permission.statut : true
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    // Validation
    if (!formData.groupe) {
      setError('Le groupe est obligatoire');
      setLoading(false);
      return;
    }

    if (!formData.module) {
      setError('Le module est obligatoire');
      setLoading(false);
      return;
    }

    try {
      const url = permission 
        ? `/permissions/${permission.id}/`
        : `/permissions/`;
      
      const method = permission ? 'PUT' : 'POST';

      // Préparer les données pour l'API
      const apiData = {
        groupe: parseInt(formData.groupe),
        module: parseInt(formData.module),
        entite: formData.entite ? parseInt(formData.entite) : null,
        acces: formData.acces,
        statut: formData.statut
      };

      console.log('📤 Envoi des données:', apiData);

      const response = await apiClient.request(url, {
        method: method,
        body: JSON.stringify(apiData),
        headers: {
          'Content-Type': 'application/json'
        }
      });

      console.log('✅ Réponse:', response);
      
      onSuccess();
    } catch (err) {
      console.error('❌ Erreur formulaire:', err);
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

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-3 z-50 backdrop-blur-sm">
      <div className="bg-white rounded-lg w-full max-w-4xl max-h-[90vh] overflow-y-auto shadow-xl">
        {/* Header du modal */}
        <div className="sticky top-0 bg-gradient-to-r from-violet-600 to-violet-500 text-white rounded-t-lg p-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-white/20 backdrop-blur-sm rounded">
                <FiShield className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-base font-bold">
                  {permission ? 'Modifier la permission' : 'Nouvelle Permission'}
                </h2>
                {!permission && (
                  <p className="text-violet-100 text-xs mt-0.5">
                    Créez une nouvelle permission dans le système
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
          {/* Section Informations Générales */}
          <div className="bg-gradient-to-br from-gray-50 to-white rounded-lg p-3 border border-gray-200">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-1 h-4 bg-gradient-to-b from-violet-600 to-violet-400 rounded"></div>
              <h3 className="text-sm font-semibold text-gray-900">Informations Générales</h3>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
              {/* Groupe */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Groupe <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <FiUsers className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
                  <select
                    required
                    value={formData.groupe}
                    onChange={(e) => handleChange('groupe', e.target.value)}
                    className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-violet-500 focus:border-transparent bg-white text-sm appearance-none"
                  >
                    <option value="">Sélectionnez un groupe</option>
                    {groupes.map(groupe => (
                      <option key={groupe.id} value={groupe.id}>
                        {groupe.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              
              {/* Module */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Module <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <FiLayers className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
                  <select
                    required
                    value={formData.module}
                    onChange={(e) => handleChange('module', e.target.value)}
                    className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-violet-500 focus:border-transparent bg-white text-sm appearance-none"
                  >
                    <option value="">Sélectionnez un module</option>
                    {modules.map(module => (
                      <option key={module.id} value={module.id}>
                        {module.nom_affiche || module.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              
              {/* Entité */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Entité (optionnel)</label>
                <div className="relative">
                  <FiBriefcase className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
                  <select
                    value={formData.entite}
                    onChange={(e) => handleChange('entite', e.target.value)}
                    className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-violet-500 focus:border-transparent bg-white text-sm appearance-none"
                  >
                    <option value="">Toutes les entités</option>
                    {entites.map(entite => (
                      <option key={entite.id} value={entite.id}>
                        {entite.raison_sociale || entite.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              
              {/* Type d'accès */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Type d'accès <span className="text-red-500">*</span>
                </label>
                <select
                  required
                  value={formData.acces}
                  onChange={(e) => handleChange('acces', e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-violet-500 focus:border-transparent text-sm"
                >
                  <option value="aucun">Aucun accès</option>
                  <option value="lecture">Lecture seule</option>
                  <option value="ecriture">Lecture/Écriture</option>
                  <option value="validation">Validation</option>
                  <option value="suppression">Suppression</option>
                  <option value="personnalise">Personnalisé</option>
                </select>
              </div>
              
              <div className="lg:col-span-2">
                <label className="flex items-center gap-2 p-2 bg-gradient-to-r from-gray-50 to-gray-100 rounded-lg border border-gray-200 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.statut}
                    onChange={(e) => handleChange('statut', e.target.checked)}
                    className="w-4 h-4 text-violet-600 rounded focus:ring-violet-500 border-gray-300"
                  />
                  <div>
                    <span className="text-sm font-medium text-gray-700">Permission active</span>
                    <p className="text-xs text-gray-500 mt-0.5">
                      Les permissions inactives ne seront pas appliquées
                    </p>
                  </div>
                </label>
              </div>
            </div>
          </div>

          {/* Aperçu */}
          <div className="bg-gradient-to-br from-violet-50 to-white rounded-lg p-3 border border-violet-100">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-1 h-4 bg-gradient-to-b from-violet-600 to-violet-400 rounded"></div>
              <h3 className="text-sm font-semibold text-gray-900">Aperçu</h3>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-white rounded-lg p-2 border border-gray-200">
                <div className="text-xs font-medium text-gray-500 mb-1">Groupe</div>
                <div className="text-sm font-medium text-gray-900">
                  {groupes.find(g => g.id === parseInt(formData.groupe))?.name || 'Non sélectionné'}
                </div>
              </div>
              <div className="bg-white rounded-lg p-2 border border-gray-200">
                <div className="text-xs font-medium text-gray-500 mb-1">Module</div>
                <div className="text-sm font-medium text-gray-900">
                  {modules.find(m => m.id === parseInt(formData.module))?.nom_affiche || 
                   modules.find(m => m.id === parseInt(formData.module))?.name || 
                   'Non sélectionné'}
                </div>
              </div>
              <div className="bg-white rounded-lg p-2 border border-gray-200">
                <div className="text-xs font-medium text-gray-500 mb-1">Entité</div>
                <div className="text-sm font-medium text-gray-900">
                  {formData.entite 
                    ? entites.find(e => e.id === parseInt(formData.entite))?.raison_sociale ||
                      entites.find(e => e.id === parseInt(formData.entite))?.name
                    : 'Toutes les entités'}
                </div>
              </div>
              <div className="bg-white rounded-lg p-2 border border-gray-200">
                <div className="text-xs font-medium text-gray-500 mb-1">Type d'accès</div>
                <div className={`inline-flex items-center px-2 py-1 rounded border ${
                  formData.acces === 'aucun' ? 'bg-red-100 text-red-800 border-red-300' :
                  formData.acces === 'lecture' ? 'bg-blue-100 text-blue-800 border-blue-300' :
                  formData.acces === 'ecriture' ? 'bg-green-100 text-green-800 border-green-300' :
                  formData.acces === 'validation' ? 'bg-purple-100 text-purple-800 border-purple-300' :
                  formData.acces === 'suppression' ? 'bg-orange-100 text-orange-800 border-orange-300' :
                  'bg-gray-100 text-gray-800 border-gray-300'
                }`}>
                  <span className="text-xs font-medium">
                    {formData.acces === 'aucun' ? 'Aucun accès' :
                     formData.acces === 'lecture' ? 'Lecture seule' :
                     formData.acces === 'ecriture' ? 'Lecture/Écriture' :
                     formData.acces === 'validation' ? 'Validation' :
                     formData.acces === 'suppression' ? 'Suppression' :
                     'Personnalisé'}
                  </span>
                </div>
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
                  <span>{permission ? 'Mettre à jour' : 'Créer la permission'}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// MODAL FORMULAIRE GROUPE (identique à votre premier code)
function GroupFormModal({ group, onClose, onSuccess }) {
  const [formData, setFormData] = useState({
    name: group?.name || '',
    description: group?.description || '',
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    if (!formData.name.trim()) {
      setError('Le nom du groupe est obligatoire');
      setLoading(false);
      return;
    }

    try {
      const url = group 
        ? `/groupes/${group.id}/`
        : `/groupes/`;
      
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
      console.error('Erreur sauvegarde groupe:', err);
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

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-3 z-50 backdrop-blur-sm">
      <div className="bg-white rounded-lg w-full max-w-4xl max-h-[90vh] overflow-y-auto shadow-xl">
        {/* Header du modal */}
        <div className="sticky top-0 bg-gradient-to-r from-violet-600 to-violet-500 text-white rounded-t-lg p-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-white/20 backdrop-blur-sm rounded">
                <FiUsers className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-base font-bold">
                  {group ? 'Modifier le groupe' : 'Nouveau Groupe'}
                </h2>
                {!group && (
                  <p className="text-violet-100 text-xs mt-0.5">
                    Créez un nouveau groupe dans le système
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
          {/* Section Informations Générales */}
          <div className="bg-gradient-to-br from-gray-50 to-white rounded-lg p-3 border border-gray-200">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-1 h-4 bg-gradient-to-b from-violet-600 to-violet-400 rounded"></div>
              <h3 className="text-sm font-semibold text-gray-900">Informations Générales</h3>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
              <div className="lg:col-span-2">
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Nom du Groupe <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <FiFolder className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => handleChange('name', e.target.value)}
                    className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-violet-500 focus:border-transparent bg-white text-sm"
                    placeholder="Ex: Administrateurs, Managers, Opérateurs..."
                  />
                </div>
              </div>
              
              <div className="lg:col-span-2">
                <label className="block text-xs font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => handleChange('description', e.target.value)}
                  rows={2}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-violet-500 focus:border-transparent text-sm"
                  placeholder="Description du groupe et de ses permissions..."
                />
              </div>
            </div>
          </div>

          {/* Aperçu */}
          <div className="bg-gradient-to-br from-violet-50 to-white rounded-lg p-3 border border-violet-100">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-1 h-4 bg-gradient-to-b from-violet-600 to-violet-400 rounded"></div>
              <h3 className="text-sm font-semibold text-gray-900">Aperçu du groupe</h3>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-white rounded-lg p-2 border border-gray-200">
                <div className="text-xs font-medium text-gray-500 mb-1">Nom du groupe</div>
                <div className="text-sm font-medium text-gray-900">{formData.name || 'Non défini'}</div>
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
                  <span>{group ? 'Mettre à jour' : 'Créer le groupe'}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}