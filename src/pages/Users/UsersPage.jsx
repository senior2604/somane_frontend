import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { apiClient } from '../../services/apiClient';
import { 
  FiRefreshCw, FiPlus, FiEdit2, FiTrash2, FiSearch, FiX, FiChevronDown,
  FiCheck, FiUsers, FiChevronLeft, FiChevronRight, FiDownload, FiUpload,
  FiEye, FiCheckCircle, FiXCircle, FiUserCheck, FiShield, FiFolder,
  FiKey, FiLock, FiUnlock, FiMoreVertical, FiLink, FiUser, FiMail,
  FiPhone, FiCalendar, FiClock, FiImage, FiLayers, FiBriefcase,
  FiArrowRight, FiArrowLeft, FiFilter, FiCopy, FiSave
} from "react-icons/fi";

// Types d'accès (identique à votre code permissions)
const TYPES_ACCES = [
  { value: 'aucun', label: 'Aucun accès', color: 'red', bgColor: 'bg-red-100', textColor: 'text-red-800', borderColor: 'border-red-300' },
  { value: 'lecture', label: 'Lecture seule', color: 'blue', bgColor: 'bg-blue-100', textColor: 'text-blue-800', borderColor: 'border-blue-300' },
  { value: 'ecriture', label: 'Lecture/Écriture', color: 'green', bgColor: 'bg-green-100', textColor: 'text-green-800', borderColor: 'border-green-300' },
  { value: 'validation', label: 'Validation', color: 'purple', bgColor: 'bg-purple-100', textColor: 'text-purple-800', borderColor: 'border-purple-300' },
  { value: 'suppression', label: 'Suppression', color: 'orange', bgColor: 'bg-orange-100', textColor: 'text-orange-800', borderColor: 'border-orange-300' },
  { value: 'personnalise', label: 'Personnalisé', color: 'gray', bgColor: 'bg-gray-100', textColor: 'text-gray-800', borderColor: 'border-gray-300' }
];

export default function UnifiedPermissionsPage() {
  // === ÉTATS POUR LES DONNÉES ===
  const [users, setUsers] = useState([]);
  const [groups, setGroups] = useState([]);
  const [permissions, setPermissions] = useState([]);
  const [modules, setModules] = useState([]);
  const [entites, setEntites] = useState([]);
  
  // États pour les associations
  const [userGroups, setUserGroups] = useState({});
  const [groupPermissions, setGroupPermissions] = useState({});
  
  // === ÉTATS POUR L'UI ===
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showUserForm, setShowUserForm] = useState(false);
  const [showGroupForm, setShowGroupForm] = useState(false);
  const [showPermissionForm, setShowPermissionForm] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [editingGroup, setEditingGroup] = useState(null);
  const [editingPermission, setEditingPermission] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedDetail, setSelectedDetail] = useState(null);
  const [showAssociationModal, setShowAssociationModal] = useState(false);
  const [associationType, setAssociationType] = useState(null);
  const [associationTarget, setAssociationTarget] = useState(null);
  
  // === ÉTATS POUR LA RECHERCHE ET FILTRES ===
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [selectedRows, setSelectedRows] = useState([]);
  const [activeTab, setActiveTab] = useState('users'); // 'users', 'groups', 'permissions'
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);
  const [filterStatut, setFilterStatut] = useState('');
  const [filterTypeAcces, setFilterTypeAcces] = useState('');

  // === CHARGEMENT INITIAL DES DONNÉES ===
  useEffect(() => {
    fetchAllData();
  }, []);

  const fetchAllData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Chargement parallèle
      const [usersResponse, groupsResponse, permissionsResponse, modulesResponse, entitesResponse] = await Promise.all([
        apiClient.get('/users/'),
        apiClient.get('/groupes/'),
        apiClient.get('/permissions/'),
        apiClient.get('/modules/'),
        apiClient.get('/entites/')
      ]);
      
      // Extraction des données
      const extractArrayData = (response) => {
        if (Array.isArray(response)) return response;
        if (response && Array.isArray(response.results)) return response.results;
        if (response && Array.isArray(response.data)) return response.data;
        return [];
      };
      
      const usersData = extractArrayData(usersResponse);
      const groupsData = extractArrayData(groupsResponse);
      const permissionsData = extractArrayData(permissionsResponse);
      const modulesData = extractArrayData(modulesResponse);
      const entitesData = extractArrayData(entitesResponse);
      
      setUsers(usersData);
      setGroups(groupsData);
      setPermissions(permissionsData);
      setModules(modulesData);
      setEntites(entitesData);
      
      // Charger les associations
      await loadAssociations(usersData, groupsData, permissionsData);
      
    } catch (err) {
      console.error('Erreur lors du chargement des données:', err);
      setError('Erreur lors du chargement des données');
    } finally {
      setLoading(false);
    }
  };

  const loadAssociations = async (usersData, groupsData, permissionsData) => {
    try {
      // Associations utilisateurs-groupes
      const userGroupAssociations = {};
      for (const user of usersData) {
        if (user.groups && Array.isArray(user.groups)) {
          userGroupAssociations[user.id] = user.groups.map(g => g.id);
        } else {
          try {
            const userWithGroups = await apiClient.get(`/users/${user.id}/`);
            userGroupAssociations[user.id] = userWithGroups.groups?.map(g => g.id) || [];
          } catch (err) {
            console.warn(`Erreur chargement groupes pour utilisateur ${user.id}:`, err);
            userGroupAssociations[user.id] = [];
          }
        }
      }
      setUserGroups(userGroupAssociations);
      
      // Associations groupes-permissions
      const groupPermissionAssociations = {};
      for (const group of groupsData) {
        const groupPerms = permissionsData.filter(p => 
          p.groupe === group.id || p.groupe?.id === group.id
        );
        groupPermissionAssociations[group.id] = groupPerms.map(p => p.id);
      }
      setGroupPermissions(groupPermissionAssociations);
      
    } catch (err) {
      console.error('Erreur lors du chargement des associations:', err);
    }
  };

  // === GESTION DES UTILISATEURS ===
  const handleNewUser = () => {
    setEditingUser(null);
    setShowUserForm(true);
  };

  const handleEditUser = (user) => {
    setEditingUser(user);
    setShowUserForm(true);
  };

  const handleDeleteUser = async (user) => {
    if (window.confirm(`Êtes-vous sûr de vouloir supprimer l'utilisateur "${user.email}" ?`)) {
      try {
        await apiClient.delete(`/users/${user.id}/`);
        fetchAllData();
      } catch (err) {
        setError('Erreur lors de la suppression');
        console.error('Error deleting user:', err);
      }
    }
  };

  const handleToggleStatut = async (user) => {
    try {
      const nouveauStatut = user.statut === 'actif' ? 'inactif' : 'actif';
      await apiClient.patch(`/users/${user.id}/`, {
        statut: nouveauStatut,
        is_active: nouveauStatut === 'actif'
      });
      fetchAllData();
    } catch (err) {
      setError('Erreur lors de la modification du statut');
      console.error('Error toggling statut:', err);
    }
  };

  const handleManageUserGroups = (user) => {
    setSelectedDetail(user);
    setAssociationType('user-groups');
    setAssociationTarget('user');
    setShowAssociationModal(true);
  };

  // === GESTION DES GROUPES ===
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

  const handleManageGroupUsers = (group) => {
    setSelectedDetail(group);
    setAssociationType('group-users');
    setAssociationTarget('group');
    setShowAssociationModal(true);
  };

  const handleManageGroupPermissions = (group) => {
    setSelectedDetail(group);
    setAssociationType('group-permissions');
    setAssociationTarget('group');
    setShowAssociationModal(true);
  };

  // === GESTION DES PERMISSIONS ===
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

  // === GESTION DES DÉTAILS ===
  const handleViewDetails = (item) => {
    setSelectedDetail(item);
    setShowDetailModal(true);
  };

  // === FILTRAGE ET RECHERCHE ===
  const filteredUsers = useMemo(() => {
    return users.filter(user => {
      const matchesSearch = 
        user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.username?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.first_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.last_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.telephone?.includes(searchTerm);
      
      const matchesStatut = filterStatut === '' || 
        user.statut?.toString() === filterStatut;
      
      return matchesSearch && matchesStatut;
    });
  }, [users, searchTerm, filterStatut]);

  const filteredGroups = useMemo(() => {
    return groups.filter(group => 
      group.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      group.description?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [groups, searchTerm]);

  const filteredPermissions = useMemo(() => {
    return permissions.filter(permission => {
      const group = groups.find(g => g.id === permission.groupe || g.id === permission.groupe?.id);
      const module = modules.find(m => m.id === permission.module);
      
      const matchesSearch = 
        (group?.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (module?.nom_affiche || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (module?.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (permission.acces || '').toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesTypeAcces = !filterTypeAcces || 
        permission.acces === filterTypeAcces;
      
      const matchesStatut = filterStatut === '' || 
        permission.statut?.toString() === filterStatut;
      
      return matchesSearch && matchesTypeAcces && matchesStatut;
    });
  }, [permissions, groups, modules, searchTerm, filterTypeAcces, filterStatut]);

  // === DONNÉES ACTUELLES SELON L'ONGLET ACTIF ===
  const currentData = activeTab === 'users' ? filteredUsers : 
                     activeTab === 'groups' ? filteredGroups : 
                     filteredPermissions;
  
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = currentData.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(currentData.length / itemsPerPage);

  // === SÉLECTION DES LIGNES ===
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

  // === PAGINATION ===
  const paginate = (pageNumber) => setCurrentPage(pageNumber);
  const nextPage = () => currentPage < totalPages && setCurrentPage(currentPage + 1);
  const prevPage = () => currentPage > 1 && setCurrentPage(currentPage - 1);

  // === STATISTIQUES ===
  const stats = useMemo(() => ({
    totalUsers: users.length,
    totalGroups: groups.length,
    totalPermissions: permissions.length,
    actifs: users.filter(u => u.statut === 'actif' || u.is_active).length,
    inactifs: users.filter(u => u.statut === 'inactif' || !u.is_active).length,
    permissionsActives: permissions.filter(p => p.statut).length,
    permissionsInactives: permissions.filter(p => !p.statut).length,
    groupsWithPermissions: Object.keys(groupPermissions).filter(id => groupPermissions[id].length > 0).length
  }), [users, groups, permissions, groupPermissions]);

  // === GESTION DES SUCCÈS DES FORMULAIRES ===
  const handleFormSuccess = () => {
    setShowUserForm(false);
    setShowGroupForm(false);
    setShowPermissionForm(false);
    setEditingUser(null);
    setEditingGroup(null);
    setEditingPermission(null);
    fetchAllData();
  };

  const handleAssociationSuccess = () => {
    setShowAssociationModal(false);
    setSelectedDetail(null);
    setAssociationType(null);
    setAssociationTarget(null);
    fetchAllData();
  };

  const handleRetry = () => {
    fetchAllData();
  };

  const resetFilters = () => {
    setSearchTerm('');
    setFilterStatut('');
    setFilterTypeAcces('');
    setCurrentPage(1);
  };

  // === FONCTIONS UTILITAIRES ===
  const getAccesBadgeClasses = (accesValue) => {
    const type = TYPES_ACCES.find(t => t.value === accesValue);
    return type ? `${type.bgColor} ${type.textColor} ${type.borderColor}` : 'bg-gray-100 text-gray-800 border-gray-300';
  };

  const getAccesLabel = (accesValue) => {
    const type = TYPES_ACCES.find(t => t.value === accesValue);
    return type ? type.label : 'Inconnu';
  };

  // === RENDU CHARGEMENT ===
  if (loading && !users.length) {
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

  // === RENDU PRINCIPAL ===
  return (
    <div className="p-4 bg-gradient-to-br from-gray-50 to-white min-h-screen">
      {/* HEADER COMPACT AVEC RECHERCHE AU CENTRE - TOUT EN VIOLET */}
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
                placeholder={
                  activeTab === 'users' ? "Rechercher un utilisateur..." :
                  activeTab === 'groups' ? "Rechercher un groupe..." :
                  "Rechercher une permission..."
                }
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
                    filterStatut || filterTypeAcces ? 'bg-violet-100 text-violet-700' : 'bg-gray-100 text-gray-700'
                  } hover:bg-gray-200 transition-colors`}
                >
                  <FiChevronDown size={12} />
                  <span>Filtre</span>
                </button>
                
                {/* Dropdown des filtres */}
                {showFilterDropdown && (
                  <div className="absolute right-0 top-full mt-1 w-48 bg-white rounded-lg shadow-lg border border-gray-200 z-10">
                    <div className="p-2">
                      <p className="text-xs font-medium text-gray-700 mb-2">Filtrer</p>
                      
                      {activeTab === 'users' && (
                        <div className="space-y-1">
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
                            Actif seulement
                          </button>
                          <button
                            onClick={() => {
                              setFilterStatut('inactif');
                              setShowFilterDropdown(false);
                            }}
                            className={`w-full text-left px-2 py-1.5 rounded text-xs ${filterStatut === 'inactif' ? 'bg-violet-50 text-violet-700' : 'text-gray-700 hover:bg-gray-50'}`}
                          >
                            Inactif seulement
                          </button>
                        </div>
                      )}
                      
                      {activeTab === 'permissions' && (
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
                      )}
                      
                      {activeTab === 'groups' && (
                        <p className="text-xs text-gray-500 py-2">
                          Aucun filtre disponible pour les groupes
                        </p>
                      )}
                      
                      {(searchTerm || filterStatut || filterTypeAcces) && (
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
            
            {/* Bouton selon l'onglet actif */}
            {activeTab === 'users' ? (
              <button 
                onClick={handleNewUser}
                className="ml-2 px-3 py-2 rounded-lg bg-gradient-to-r from-violet-600 to-violet-500 text-white hover:from-violet-700 hover:to-violet-600 transition-all duration-300 flex items-center gap-1.5 text-sm shadow"
              >
                <FiPlus size={14} />
                <span>Nouvel Utilisateur</span>
              </button>
            ) : activeTab === 'groups' ? (
              <button 
                onClick={handleNewGroup}
                className="ml-2 px-3 py-2 rounded-lg bg-gradient-to-r from-violet-600 to-violet-500 text-white hover:from-violet-700 hover:to-violet-600 transition-all duration-300 flex items-center gap-1.5 text-sm shadow"
              >
                <FiPlus size={14} />
                <span>Nouveau Groupe</span>
              </button>
            ) : (
              <button 
                onClick={handleNewPermission}
                className="ml-2 px-3 py-2 rounded-lg bg-gradient-to-r from-violet-600 to-violet-500 text-white hover:from-violet-700 hover:to-violet-600 transition-all duration-300 flex items-center gap-1.5 text-sm shadow"
              >
                <FiPlus size={14} />
                <span>Nouvelle Permission</span>
              </button>
            )}
          </div>
        </div>

        {/* Statistiques en ligne compactes */}
        <div className="grid grid-cols-3 gap-2 mb-3">
          <div className="bg-white rounded-lg p-2 border border-gray-200 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-600">Utilisateurs:</span>
                <span className="text-sm font-bold text-violet-600">{stats.totalUsers}</span>
              </div>
              <div className="p-1 bg-violet-50 rounded">
                <FiUsers className="w-3 h-3 text-violet-600" />
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg p-2 border border-gray-200 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-600">Groupes:</span>
                <span className="text-sm font-bold text-violet-600">{stats.totalGroups}</span>
              </div>
              <div className="p-1 bg-violet-50 rounded">
                <FiShield className="w-3 h-3 text-violet-600" />
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg p-2 border border-gray-200 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-600">Permissions:</span>
                <span className="text-sm font-bold text-violet-600">{stats.totalPermissions}</span>
              </div>
              <div className="p-1 bg-violet-50 rounded">
                <FiKey className="w-3 h-3 text-violet-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Onglets Utilisateurs | Groupes | Permissions - TOUT EN VIOLET */}
        <div className="flex border-b border-gray-200 mb-3">
          <button
            onClick={() => {
              setActiveTab('users');
              setCurrentPage(1);
              setSelectedRows([]);
              setFilterStatut('');
              setFilterTypeAcces('');
            }}
            className={`px-4 py-1.5 text-xs font-medium border-b-2 transition-colors ${
              activeTab === 'users'
                ? 'border-violet-600 text-violet-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Utilisateurs
          </button>
          <button
            onClick={() => {
              setActiveTab('groups');
              setCurrentPage(1);
              setSelectedRows([]);
              setFilterStatut('');
              setFilterTypeAcces('');
            }}
            className={`px-4 py-1.5 text-xs font-medium border-b-2 transition-colors ${
              activeTab === 'groups'
                ? 'border-violet-600 text-violet-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Groupes
          </button>
          <button
            onClick={() => {
              setActiveTab('permissions');
              setCurrentPage(1);
              setSelectedRows([]);
              setFilterStatut('');
              setFilterTypeAcces('');
            }}
            className={`px-4 py-1.5 text-xs font-medium border-b-2 transition-colors ${
              activeTab === 'permissions'
                ? 'border-violet-600 text-violet-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Permissions
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
                
                {/* Colonnes selon l'onglet actif */}
                {activeTab === 'users' ? (
                  <>
                    <th scope="col" className="px-3 py-2 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider border-r border-gray-300">
                      Utilisateur
                    </th>
                    <th scope="col" className="px-3 py-2 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider border-r border-gray-300">
                      Nom complet
                    </th>
                    <th scope="col" className="px-3 py-2 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider border-r border-gray-300">
                      Groupes
                    </th>
                    <th scope="col" className="px-3 py-2 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider border-r border-gray-300">
                      Statut
                    </th>
                    <th scope="col" className="px-3 py-2 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Actes
                    </th>
                  </>
                ) : activeTab === 'groups' ? (
                  <>
                    <th scope="col" className="px-3 py-2 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider border-r border-gray-300">
                      Nom du Groupe
                    </th>
                    <th scope="col" className="px-3 py-2 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider border-r border-gray-300">
                      Description
                    </th>
                    <th scope="col" className="px-3 py-2 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider border-r border-gray-300">
                      Utilisateurs
                    </th>
                    <th scope="col" className="px-3 py-2 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider border-r border-gray-300">
                      Permissions
                    </th>
                    <th scope="col" className="px-3 py-2 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Actes
                    </th>
                  </>
                ) : (
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
                    <th scope="col" className="px-3 py-2 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider border-r border-gray-300">
                      Statut
                    </th>
                    <th scope="col" className="px-3 py-2 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Actes
                    </th>
                  </>
                )}
              </tr>
            </thead>
            
            <tbody className="divide-y divide-gray-200">
              {currentItems.length === 0 ? (
                <tr>
                  <td colSpan={activeTab === 'users' ? 6 : activeTab === 'groups' ? 6 : 6} className="px-3 py-4 text-center">
                    <div className="flex flex-col items-center justify-center">
                      <div className="w-12 h-12 bg-gradient-to-br from-gray-100 to-gray-200 rounded-full flex items-center justify-center mb-2">
                        {activeTab === 'users' ? (
                          <FiUsers className="w-6 h-6 text-gray-400" />
                        ) : activeTab === 'groups' ? (
                          <FiShield className="w-6 h-6 text-gray-400" />
                        ) : (
                          <FiKey className="w-6 h-6 text-gray-400" />
                        )}
                      </div>
                      <h3 className="text-sm font-semibold text-gray-900 mb-1">
                        {activeTab === 'users' 
                          ? (users.length === 0 ? 'Aucun utilisateur trouvé' : 'Aucun résultat')
                          : activeTab === 'groups'
                          ? (groups.length === 0 ? 'Aucun groupe trouvé' : 'Aucun résultat')
                          : (permissions.length === 0 ? 'Aucune permission trouvée' : 'Aucun résultat')
                        }
                      </h3>
                      <p className="text-gray-600 text-xs mb-3 max-w-md">
                        {activeTab === 'users'
                          ? (users.length === 0 
                              ? 'Commencez par créer votre premier utilisateur' 
                              : 'Essayez de modifier vos critères de recherche')
                          : activeTab === 'groups'
                          ? (groups.length === 0
                              ? 'Commencez par créer votre premier groupe'
                              : 'Essayez de modifier vos critères de recherche')
                          : (permissions.length === 0
                              ? 'Commencez par créer votre première permission'
                              : 'Essayez de modifier vos critères de recherche')
                        }
                      </p>
                      {(activeTab === 'users' && users.length === 0) || 
                       (activeTab === 'groups' && groups.length === 0) ||
                       (activeTab === 'permissions' && permissions.length === 0) ? (
                        <button 
                          onClick={
                            activeTab === 'users' ? handleNewUser :
                            activeTab === 'groups' ? handleNewGroup :
                            handleNewPermission
                          }
                          className="px-3 py-1 bg-gradient-to-r from-violet-600 to-violet-500 text-white rounded hover:from-violet-700 hover:to-violet-600 transition-all duration-300 font-medium flex items-center gap-1 text-xs"
                        >
                          <FiPlus size={12} />
                          {activeTab === 'users' ? 'Créer utilisateur' : 
                           activeTab === 'groups' ? 'Créer groupe' : 
                           'Créer permission'}
                        </button>
                      ) : null}
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
                    
                    {activeTab === 'users' ? (
                      <>
                        {/* Utilisateur */}
                        <td className="px-3 py-2 border-r border-gray-200">
                          <div className="flex flex-col">
                            <div className="text-xs font-semibold text-gray-900 truncate max-w-[150px]">{item.email}</div>
                            <div className="text-xs text-gray-500">@{item.username}</div>
                          </div>
                        </td>
                        
                        {/* Nom complet */}
                        <td className="px-3 py-2 border-r border-gray-200">
                          <div className="flex flex-col">
                            <div className="text-xs text-gray-900">
                              {item.first_name || item.last_name ? `${item.first_name || ''} ${item.last_name || ''}`.trim() : 'Aucun'}
                            </div>
                            <div className="text-xs text-gray-500">
                              {item.telephone || 'Aucun téléphone'}
                            </div>
                          </div>
                        </td>
                        
                        {/* Groupes */}
                        <td className="px-3 py-2 border-r border-gray-200">
                          <div className="flex flex-wrap gap-0.5">
                            {(userGroups[item.id] || []).length > 0 ? (
                              <>
                                <span className="inline-flex px-1 py-0.5 rounded text-xs bg-gradient-to-r from-violet-50 to-violet-100 text-violet-700 font-medium border border-violet-200">
                                  {(userGroups[item.id] || []).length} groupe(s)
                                </span>
                              </>
                            ) : (
                              <span className="text-xs text-gray-500">Aucun groupe</span>
                            )}
                          </div>
                        </td>
                        
                        {/* Statut */}
                        <td className="px-3 py-2 border-r border-gray-200">
                          <div className="flex items-center">
                            <div className={`px-1.5 py-0.5 rounded flex items-center gap-1 ${
                              item.statut === 'actif' || item.is_active
                                ? 'bg-gradient-to-r from-green-50 to-emerald-50 text-green-700 border border-green-200' 
                                : 'bg-gradient-to-r from-red-50 to-pink-50 text-red-700 border border-red-200'
                            }`}>
                              {item.statut === 'actif' || item.is_active ? (
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
                        
                        {/* Actions pour utilisateurs */}
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
                              onClick={() => handleManageUserGroups(item)}
                              className="p-1 bg-gradient-to-r from-violet-50 to-violet-100 text-violet-700 rounded hover:from-violet-100 hover:to-violet-200 transition-all duration-200 shadow-sm hover:shadow"
                              title="Gérer les groupes"
                            >
                              <FiLink size={12} />
                            </button>
                            <button
                              onClick={() => handleToggleStatut(item)}
                              className={`p-1 rounded transition-all duration-200 shadow-sm hover:shadow ${
                                item.statut === 'actif' || item.is_active
                                  ? 'bg-gradient-to-r from-orange-50 to-orange-100 text-orange-700 hover:from-orange-100 hover:to-orange-200'
                                  : 'bg-gradient-to-r from-green-50 to-green-100 text-green-700 hover:from-green-100 hover:to-green-200'
                              }`}
                              title={item.statut === 'actif' || item.is_active ? 'Désactiver' : 'Activer'}
                            >
                              {item.statut === 'actif' || item.is_active ? (
                                <FiLock size={12} />
                              ) : (
                                <FiUnlock size={12} />
                              )}
                            </button>
                            <button
                              onClick={() => handleEditUser(item)}
                              className="p-1 bg-gradient-to-r from-violet-50 to-violet-100 text-violet-700 rounded hover:from-violet-100 hover:to-violet-200 transition-all duration-200 shadow-sm hover:shadow"
                              title="Modifier"
                            >
                              <FiEdit2 size={12} />
                            </button>
                            <button
                              onClick={() => handleDeleteUser(item)}
                              className="p-1 bg-gradient-to-r from-red-50 to-red-100 text-red-700 rounded hover:from-red-100 hover:to-red-200 transition-all duration-200 shadow-sm hover:shadow"
                              title="Supprimer"
                            >
                              <FiTrash2 size={12} />
                            </button>
                          </div>
                        </td>
                      </>
                    ) : activeTab === 'groups' ? (
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
                        
                        {/* Utilisateurs */}
                        <td className="px-3 py-2 border-r border-gray-200">
                          <span className="inline-flex px-1.5 py-0.5 rounded text-xs font-medium bg-gradient-to-r from-violet-50 to-violet-100 text-violet-700 border border-violet-200">
                            {Object.values(userGroups).filter(groups => groups.includes(item.id)).length} utilisateur(s)
                          </span>
                        </td>
                        
                        {/* Permissions */}
                        <td className="px-3 py-2 border-r border-gray-200">
                          <span className="inline-flex px-1.5 py-0.5 rounded text-xs font-medium bg-gradient-to-r from-violet-50 to-violet-100 text-violet-700 border border-violet-200">
                            {(groupPermissions[item.id] || []).length} permission(s)
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
                              onClick={() => handleManageGroupUsers(item)}
                              className="p-1 bg-gradient-to-r from-violet-50 to-violet-100 text-violet-700 rounded hover:from-violet-100 hover:to-violet-200 transition-all duration-200 shadow-sm hover:shadow"
                              title="Gérer les utilisateurs"
                            >
                              <FiUsers size={12} />
                            </button>
                            <button
                              onClick={() => handleManageGroupPermissions(item)}
                              className="p-1 bg-gradient-to-r from-violet-50 to-violet-100 text-violet-700 rounded hover:from-violet-100 hover:to-violet-200 transition-all duration-200 shadow-sm hover:shadow"
                              title="Gérer les permissions"
                            >
                              <FiKey size={12} />
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
                    ) : (
                      <>
                        {/* Groupe */}
                        <td className="px-3 py-2 border-r border-gray-200">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 bg-gradient-to-br from-violet-50 to-violet-100 rounded-full flex items-center justify-center border border-violet-200">
                              <FiUsers className="w-4 h-4 text-violet-600" />
                            </div>
                            <div>
                              <div className="text-xs font-semibold text-gray-900 truncate max-w-[120px]">
                                {groups.find(g => g.id === item.groupe || g.id === item.groupe?.id)?.name || '-'}
                              </div>
                            </div>
                          </div>
                        </td>
                        
                        {/* Module */}
                        <td className="px-3 py-2 border-r border-gray-200">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 bg-gradient-to-br from-violet-50 to-violet-100 rounded-full flex items-center justify-center border border-violet-200">
                              <FiLayers className="w-4 h-4 text-violet-600" />
                            </div>
                            <div>
                              <div className="text-xs font-medium text-gray-900 truncate max-w-[100px]">
                                {modules.find(m => m.id === item.module)?.nom_affiche || 
                                 modules.find(m => m.id === item.module)?.name || '-'}
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
                        
                        {/* Statut */}
                        <td className="px-3 py-2 border-r border-gray-200">
                          <div className="flex items-center">
                            <div className={`px-1.5 py-0.5 rounded flex items-center gap-1 ${
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
                    {indexOfFirstItem + 1}-{Math.min(indexOfLastItem, currentData.length)} sur {currentData.length} {activeTab === 'users' ? 'utilisateurs' : activeTab === 'groups' ? 'groupes' : 'permissions'}
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
      {showUserForm && (
        <UserFormModal
          user={editingUser}
          groupes={groups}
          onClose={() => {
            setShowUserForm(false);
            setEditingUser(null);
          }}
          onSuccess={handleFormSuccess}
        />
      )}

      {showGroupForm && (
        <GroupFormModal
          group={editingGroup}
          users={users}
          permissions={permissions}
          groups={groups}
          onClose={() => {
            setShowGroupForm(false);
            setEditingGroup(null);
          }}
          onSuccess={handleFormSuccess}
        />
      )}

      {showPermissionForm && (
        <PermissionFormModal
          permission={editingPermission}
          groupes={groups}
          modules={modules}
          entites={entites}
          onClose={() => {
            setShowPermissionForm(false);
            setEditingPermission(null);
          }}
          onSuccess={handleFormSuccess}
        />
      )}

      {/* Modal de détails */}
      {showDetailModal && selectedDetail && (
        <DetailModal
          item={selectedDetail}
          type={activeTab}
          userGroups={userGroups}
          groupPermissions={groupPermissions}
          groups={groups}
          users={users}
          permissions={permissions}
          modules={modules}
          onClose={() => {
            setShowDetailModal(false);
            setSelectedDetail(null);
          }}
        />
      )}

      {/* Modal d'association */}
      {showAssociationModal && selectedDetail && (
        <AssociationModal
          type={associationType}
          target={associationTarget}
          item={selectedDetail}
          users={users}
          groups={groups}
          permissions={permissions}
          modules={modules}
          userGroups={userGroups}
          groupPermissions={groupPermissions}
          onClose={() => {
            setShowAssociationModal(false);
            setSelectedDetail(null);
            setAssociationType(null);
            setAssociationTarget(null);
          }}
          onSuccess={handleAssociationSuccess}
        />
      )}
    </div>
  );
}

// ============================================
// MODALS MIS À JOUR
// ============================================

// MODAL FORMULAIRE UTILISATEUR
function UserFormModal({ user, groupes, onClose, onSuccess }) {
  const [formData, setFormData] = useState({
    email: user?.email || '',
    first_name: user?.first_name || '',
    last_name: user?.last_name || '',
    telephone: user?.telephone || '',
    statut: user?.statut || 'actif',
    groups: user?.groups?.map(g => g.id) || [],
  });

  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(user?.photo || null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handlePhotoChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setPhotoFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoPreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const toggleGroup = (groupId) => {
    setFormData(prev => ({
      ...prev,
      groups: prev.groups.includes(groupId)
        ? prev.groups.filter(id => id !== groupId)
        : [...prev.groups, groupId]
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (user) {
        // MODIFICATION
        const patchData = {
          email: formData.email,
          first_name: formData.first_name || '',
          last_name: formData.last_name || '',
          telephone: formData.telephone || '',
          statut: formData.statut || 'actif',
          groups: formData.groups,
          is_active: formData.statut === 'actif',
        };

        console.log('📤 Données PATCH envoyées:', patchData);
        
        const response = await apiClient.patch(`/users/${user.id}/`, patchData);
        console.log('✅ Réponse PATCH:', response);
        onSuccess();
        
      } else {
        // CRÉATION - Djoser
        const djoserData = {
          email: formData.email,
          first_name: formData.first_name || '',
          last_name: formData.last_name || '',
          telephone: formData.telephone || '',
        };

        console.log('📤 Création utilisateur (Djoser):', djoserData);
        
        const djoserResponse = await apiClient.post('/auth/users/', djoserData);
        console.log('✅ Réponse Djoser:', djoserResponse);
        onSuccess();
      }
      
    } catch (err) {
      console.error('❌ Erreur sauvegarde utilisateur:', err);
      let errorMessage = 'Erreur lors de la sauvegarde';
      if (err.response?.data) {
        const errorData = err.response.data;
        if (typeof errorData === 'object') {
          errorMessage = Object.entries(errorData)
            .map(([field, errors]) => `${field}: ${Array.isArray(errors) ? errors.join(', ') : errors}`)
            .join('\n');
        } else {
          errorMessage = JSON.stringify(errorData);
        }
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
        {/* Header du modal - TOUT EN VIOLET */}
        <div className="sticky top-0 bg-gradient-to-r from-violet-600 to-violet-500 text-white rounded-t-lg p-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-white/20 backdrop-blur-sm rounded">
                <FiUser className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-base font-bold">
                  {user ? 'Modifier l\'utilisateur' : 'Nouvel Utilisateur'}
                </h2>
                {!user && (
                  <p className="text-violet-100 text-xs mt-0.5">
                    L'utilisateur recevra un email pour définir son mot de passe
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
          {/* Section Photo de profil */}
          <div className="bg-gradient-to-br from-gray-50 to-white rounded-lg p-3 border border-gray-200">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-1 h-4 bg-gradient-to-b from-violet-600 to-violet-400 rounded"></div>
              <h3 className="text-sm font-semibold text-gray-900">Photo de profil</h3>
            </div>
            
            <div className="flex flex-col items-center">
              <div className="relative mb-3">
                <div className="w-24 h-24 bg-gradient-to-br from-violet-100 to-violet-200 rounded-full flex items-center justify-center overflow-hidden">
                  {photoPreview ? (
                    <img 
                      src={photoPreview} 
                      alt="Prévisualisation"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <FiUser className="w-12 h-12 text-violet-600" />
                  )}
                </div>
                {photoPreview && (
                  <button
                    type="button"
                    onClick={() => {
                      setPhotoPreview(null);
                      setPhotoFile(null);
                    }}
                    className="absolute top-0 right-0 p-1.5 bg-red-100 text-red-600 rounded-full hover:bg-red-200 transition-colors"
                  >
                    <FiX size={14} />
                  </button>
                )}
              </div>
              
              <div className="relative group">
                <input
                  type="file"
                  id="photo"
                  accept="image/*"
                  onChange={handlePhotoChange}
                  className="hidden"
                />
                <label
                  htmlFor="photo"
                  className="px-3 py-1.5 bg-gradient-to-r from-violet-50 to-violet-100 text-violet-700 rounded-lg hover:from-violet-100 hover:to-violet-200 transition-all duration-200 font-medium cursor-pointer flex items-center gap-1.5 text-sm"
                >
                  <FiImage size={14} />
                  {photoPreview ? 'Changer la photo' : 'Télécharger une photo'}
                </label>
              </div>
              <p className="text-xs text-gray-500 mt-1 text-center">
                Formats acceptés: JPG, PNG, GIF • Max: 5MB
              </p>
            </div>
          </div>

          {/* Section Informations Générales */}
          <div className="bg-gradient-to-br from-gray-50 to-white rounded-lg p-3 border border-gray-200">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-1 h-4 bg-gradient-to-b from-violet-600 to-violet-400 rounded"></div>
              <h3 className="text-sm font-semibold text-gray-900">Informations Générales</h3>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
              <div className="lg:col-span-2">
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Email <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <FiMail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 z-10" size={16} />
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => handleChange('email', e.target.value)}
                    className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-violet-500 focus:border-transparent bg-white text-sm"
                    placeholder="utilisateur@example.com"
                  />
                </div>
                {!user && (
                  <p className="text-xs text-gray-500 mt-1">
                    Un email sera envoyé à cette adresse pour activer le compte
                  </p>
                )}
              </div>
              
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Prénom</label>
                <input
                  type="text"
                  value={formData.first_name}
                  onChange={(e) => handleChange('first_name', e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-violet-500 focus:border-transparent text-sm"
                  placeholder="Jean"
                />
              </div>
              
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Nom</label>
                <input
                  type="text"
                  value={formData.last_name}
                  onChange={(e) => handleChange('last_name', e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-violet-500 focus:border-transparent text-sm"
                  placeholder="Dupont"
                />
              </div>
              
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Téléphone</label>
                <div className="relative">
                  <FiPhone className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
                  <input
                    type="tel"
                    value={formData.telephone}
                    onChange={(e) => handleChange('telephone', e.target.value)}
                    className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-violet-500 focus:border-transparent text-sm"
                    placeholder="+228 XX XX XX XX"
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Statut</label>
                <select
                  value={formData.statut}
                  onChange={(e) => handleChange('statut', e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-violet-500 focus:border-transparent text-sm"
                >
                  <option value="actif">Actif</option>
                  <option value="inactif">Inactif</option>
                </select>
              </div>
            </div>
          </div>

          {/* Section Groupes d'appartenance */}
          <div className="bg-gradient-to-br from-violet-50 to-violet-50 rounded-lg p-3 border border-violet-200">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-1 h-4 bg-gradient-to-b from-violet-600 to-violet-400 rounded"></div>
              <h3 className="text-sm font-semibold text-gray-900">Groupes d'appartenance</h3>
            </div>

            {groupes.length === 0 ? (
              <div className="text-center py-3">
                <FiUsers className="w-10 h-10 text-gray-300 mx-auto mb-1" />
                <p className="text-gray-500 text-sm">Aucun groupe disponible</p>
                <p className="text-gray-400 text-xs mt-0.5">
                  Créez d'abord des groupes dans la section "Groupes"
                </p>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-3">
                  {groupes.map(groupe => (
                    <label
                      key={groupe.id}
                      className={`flex items-center gap-2 p-3 rounded-lg border transition-all duration-200 cursor-pointer ${
                        formData.groups.includes(groupe.id)
                          ? 'bg-white border-violet-400 shadow-sm'
                          : 'bg-white border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={formData.groups.includes(groupe.id)}
                        onChange={() => toggleGroup(groupe.id)}
                        className="w-4 h-4 text-violet-600 rounded focus:ring-violet-500"
                      />
                      <div className="flex-1">
                        <div className="font-medium text-gray-900 text-sm">{groupe.name}</div>
                        {groupe.description && (
                          <div className="text-xs text-gray-500 mt-0.5 truncate">
                            {groupe.description}
                          </div>
                        )}
                      </div>
                    </label>
                  ))}
                </div>
                <div className="text-xs text-gray-600">
                  {formData.groups.length} groupe(s) sélectionné(s)
                </div>
              </>
            )}
          </div>

          {/* Information pour la création */}
          {!user && (
            <div className="bg-gradient-to-br from-violet-50 to-violet-50 rounded-lg p-3 border border-violet-200">
              <div className="flex items-center gap-2 mb-3">
                <FiMail className="w-4 h-4 text-violet-600" />
                <h3 className="text-sm font-semibold text-gray-900">Activation du compte</h3>
              </div>
              <div className="space-y-2">
                <p className="text-xs text-gray-700">
                  <span className="font-medium">Processus d'activation :</span>
                </p>
                <ul className="text-xs text-gray-600 space-y-1 list-disc pl-4">
                  <li>Un email sera envoyé à <span className="font-medium">{formData.email}</span></li>
                  <li>L'utilisateur cliquera sur le lien d'activation</li>
                  <li>Il définira son propre mot de passe sécurisé</li>
                  <li>Le compte sera activé automatiquement</li>
                </ul>
              </div>
            </div>
          )}

          {/* Aperçu */}
          <div className="bg-gradient-to-br from-violet-50 to-white rounded-lg p-3 border border-violet-100">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-1 h-4 bg-gradient-to-b from-violet-600 to-violet-400 rounded"></div>
              <h3 className="text-sm font-semibold text-gray-900">Aperçu de l'utilisateur</h3>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-white rounded-lg p-2 border border-gray-200">
                <div className="text-xs font-semibold text-gray-500 uppercase mb-1">Email</div>
                <div className="text-xs font-medium text-gray-900 truncate">{formData.email || 'Non défini'}</div>
              </div>
              <div className="bg-white rounded-lg p-2 border border-gray-200">
                <div className="text-xs font-semibold text-gray-500 uppercase mb-1">Statut</div>
                <div>
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                    formData.statut === 'actif'
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-red-100 text-red-800'
                  }`}>
                    {formData.statut === 'actif' ? 'Actif' : 'Inactif'}
                  </span>
                </div>
              </div>
              <div className="bg-white rounded-lg p-2 border border-gray-200">
                <div className="text-xs font-semibold text-gray-500 uppercase mb-1">Nom complet</div>
                <div className="text-xs font-medium text-gray-900 truncate">
                  {formData.first_name || formData.last_name 
                    ? `${formData.first_name} ${formData.last_name}`.trim() 
                    : 'Non défini'}
                </div>
              </div>
              <div className="bg-white rounded-lg p-2 border border-gray-200">
                <div className="text-xs font-semibold text-gray-500 uppercase mb-1">Groupes</div>
                <div className="text-xs font-medium text-gray-900">
                  {formData.groups.length > 0 
                    ? `${formData.groups.length} groupe(s)` 
                    : 'Aucun groupe'}
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
                  <span>{user ? 'Mettre à jour' : 'Créer l\'utilisateur'}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// MODAL FORMULAIRE GROUPE - COMPLÈTEMENT MIS À JOUR
function GroupFormModal({ group, users = [], permissions = [], groups: allGroups = [], onClose, onSuccess }) {
  const [formData, setFormData] = useState({
    name: group?.name || '',
    description: group?.description || '',
    category: group?.category || '',
    permissions: group?.permissions?.map(p => p.id) || [],
    members: group?.members?.map(u => u.id) || [],
    inherited_groups: group?.inherited_groups?.map(g => g.id) || [],
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  // États pour les listes déroulantes avec filtres
  const [availableMembers, setAvailableMembers] = useState([...users]);
  const [selectedMembers, setSelectedMembers] = useState([...users].filter(u => formData.members.includes(u.id)));
  const [availableGroups, setAvailableGroups] = useState([...allGroups].filter(g => !group || g.id !== group.id));
  const [selectedGroups, setSelectedGroups] = useState([...allGroups].filter(g => formData.inherited_groups.includes(g.id)));
  
  // États pour les filtres
  const [memberFilter, setMemberFilter] = useState('');
  const [groupFilter, setGroupFilter] = useState('');
  const [permissionFilter, setPermissionFilter] = useState('');

  // Filtrer les permissions par catégorie
  const categorizedPermissions = useMemo(() => {
    const categories = {};
    permissions.forEach(permission => {
      const parts = permission.name?.split(' | ') || [];
      const category = parts[0] || 'Autre';
      const model = parts[1] || '';
      const action = parts[2] || '';
      
      if (!categories[category]) {
        categories[category] = [];
      }
      categories[category].push({
        id: permission.id,
        name: permission.name,
        model: model,
        action: action,
        fullName: permission.name
      });
    });
    return categories;
  }, [permissions]);

  // Filtrer les membres disponibles
  useEffect(() => {
    const filtered = users.filter(user => 
      !memberFilter || 
      user.email?.toLowerCase().includes(memberFilter.toLowerCase()) ||
      user.first_name?.toLowerCase().includes(memberFilter.toLowerCase()) ||
      user.last_name?.toLowerCase().includes(memberFilter.toLowerCase())
    );
    setAvailableMembers(filtered.filter(u => !selectedMembers.find(sm => sm.id === u.id)));
  }, [users, selectedMembers, memberFilter]);

  // Filtrer les groupes disponibles
  useEffect(() => {
    const filtered = allGroups.filter(g => 
      (!group || g.id !== group.id) && // Exclure le groupe courant si édition
      (!groupFilter || 
        g.name?.toLowerCase().includes(groupFilter.toLowerCase()) ||
        g.description?.toLowerCase().includes(groupFilter.toLowerCase()))
    );
    setAvailableGroups(filtered.filter(g => !selectedGroups.find(sg => sg.id === g.id)));
  }, [allGroups, selectedGroups, groupFilter, group]);

  // Gérer la sélection des membres
  const handleSelectMember = (member) => {
    setSelectedMembers([...selectedMembers, member]);
    setAvailableMembers(availableMembers.filter(m => m.id !== member.id));
  };

  const handleRemoveMember = (member) => {
    setAvailableMembers([...availableMembers, member]);
    setSelectedMembers(selectedMembers.filter(m => m.id !== member.id));
  };

  const handleSelectAllMembers = () => {
    setSelectedMembers([...selectedMembers, ...availableMembers]);
    setAvailableMembers([]);
  };

  const handleRemoveAllMembers = () => {
    setAvailableMembers([...availableMembers, ...selectedMembers]);
    setSelectedMembers([]);
  };

  // Gérer la sélection des groupes
  const handleSelectGroup = (groupItem) => {
    setSelectedGroups([...selectedGroups, groupItem]);
    setAvailableGroups(availableGroups.filter(g => g.id !== groupItem.id));
  };

  const handleRemoveGroup = (groupItem) => {
    setAvailableGroups([...availableGroups, groupItem]);
    setSelectedGroups(selectedGroups.filter(g => g.id !== groupItem.id));
  };

  const handleSelectAllGroups = () => {
    setSelectedGroups([...selectedGroups, ...availableGroups]);
    setAvailableGroups([]);
  };

  const handleRemoveAllGroups = () => {
    setAvailableGroups([...availableGroups, ...selectedGroups]);
    setSelectedGroups([]);
  };

  // Gérer la sélection des permissions
  const togglePermission = (permissionId) => {
    setFormData(prev => ({
      ...prev,
      permissions: prev.permissions.includes(permissionId)
        ? prev.permissions.filter(id => id !== permissionId)
        : [...prev.permissions, permissionId]
    }));
  };

  const togglePermissionCategory = (category) => {
    const categoryPermissions = categorizedPermissions[category] || [];
    const allInCategorySelected = categoryPermissions.every(p => formData.permissions.includes(p.id));
    
    if (allInCategorySelected) {
      // Désélectionner toutes les permissions de la catégorie
      setFormData(prev => ({
        ...prev,
        permissions: prev.permissions.filter(id => 
          !categoryPermissions.find(p => p.id === id)
        )
      }));
    } else {
      // Sélectionner toutes les permissions de la catégorie
      const newPermissions = [...new Set([...formData.permissions, ...categoryPermissions.map(p => p.id)])];
      setFormData(prev => ({
        ...prev,
        permissions: newPermissions
      }));
    }
  };

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

      // Mettre à jour formData avec les membres et groupes sélectionnés
      const finalFormData = {
        ...formData,
        members: selectedMembers.map(m => m.id),
        inherited_groups: selectedGroups.map(g => g.id)
      };

      await apiClient.request(url, {
        method: method,
        body: JSON.stringify(finalFormData),
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
      <div className="bg-white rounded-lg w-full max-w-6xl max-h-[90vh] overflow-y-auto shadow-xl">
        {/* Header du modal - TOUT EN VIOLET */}
        <div className="sticky top-0 bg-gradient-to-r from-violet-600 to-violet-500 text-white rounded-t-lg p-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-white/20 backdrop-blur-sm rounded">
                <FiShield className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-base font-bold">
                  {group ? 'Modifier le groupe' : 'Nouveau Groupe'}
                </h2>
                {!group && (
                  <p className="text-violet-100 text-xs mt-0.5">
                    Ajout de Groupe d'utilisateurs
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
        
        <form onSubmit={handleSubmit} className="p-4 space-y-6">
          {/* Section Informations Générales */}
          <div className="bg-gradient-to-br from-gray-50 to-white rounded-lg p-4 border border-gray-200">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-1 h-4 bg-gradient-to-b from-violet-600 to-violet-400 rounded"></div>
              <h3 className="text-sm font-semibold text-gray-900">Informations Générales</h3>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="lg:col-span-2">
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Nom <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <FiFolder className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => handleChange('name', e.target.value)}
                    className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-violet-500 focus:border-transparent bg-white text-sm"
                    placeholder="Nom du groupe"
                  />
                </div>
              </div>
              
              <div className="lg:col-span-2">
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Catégorie fonctionnelle
                </label>
                <input
                  type="text"
                  value={formData.category}
                  onChange={(e) => handleChange('category', e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-violet-500 focus:border-transparent text-sm"
                  placeholder="Catégorie fonctionnelle"
                />
              </div>
              
              <div className="lg:col-span-2">
                <label className="block text-xs font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => handleChange('description', e.target.value)}
                  rows={3}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-violet-500 focus:border-transparent text-sm"
                  placeholder="Description du groupe..."
                />
              </div>
            </div>
          </div>

          {/* Section Permissions - Interface similaire à Django */}
          <div className="bg-gradient-to-br from-violet-50 to-white rounded-lg p-4 border border-violet-200">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-1 h-4 bg-gradient-to-b from-violet-600 to-violet-400 rounded"></div>
              <h3 className="text-sm font-semibold text-gray-900">Permissions</h3>
            </div>

            {/* Filtre pour les permissions */}
            <div className="mb-4">
              <div className="relative">
                <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={14} />
                <input
                  type="text"
                  value={permissionFilter}
                  onChange={(e) => setPermissionFilter(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-violet-500 focus:border-transparent text-sm"
                  placeholder="Filtrer les permissions..."
                />
              </div>
            </div>

            {/* Liste des permissions par catégorie */}
            <div className="max-h-80 overflow-y-auto border border-gray-200 rounded-lg bg-white">
              {Object.keys(categorizedPermissions).length === 0 ? (
                <div className="text-center py-6">
                  <FiKey className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                  <p className="text-gray-500 text-sm">Aucune permission disponible</p>
                </div>
              ) : (
                Object.entries(categorizedPermissions).map(([category, perms]) => {
                  const filteredPerms = perms.filter(p => 
                    !permissionFilter || 
                    p.name?.toLowerCase().includes(permissionFilter.toLowerCase()) ||
                    p.model?.toLowerCase().includes(permissionFilter.toLowerCase()) ||
                    p.action?.toLowerCase().includes(permissionFilter.toLowerCase())
                  );

                  if (filteredPerms.length === 0) return null;

                  const allSelected = filteredPerms.every(p => formData.permissions.includes(p.id));
                  const someSelected = filteredPerms.some(p => formData.permissions.includes(p.id));

                  return (
                    <div key={category} className="border-b border-gray-100 last:border-b-0">
                      <div className="flex items-center gap-2 p-3 bg-gray-50">
                        <input
                          type="checkbox"
                          checked={allSelected}
                          ref={input => {
                            if (input) {
                              input.indeterminate = someSelected && !allSelected;
                            }
                          }}
                          onChange={() => togglePermissionCategory(category)}
                          className="w-4 h-4 text-violet-600 rounded focus:ring-violet-500"
                        />
                        <h4 className="text-xs font-semibold text-gray-900">{category}</h4>
                        <span className="text-xs text-gray-500 ml-auto">
                          {filteredPerms.filter(p => formData.permissions.includes(p.id)).length}/{filteredPerms.length}
                        </span>
                      </div>
                      <div className="pl-8 pr-3">
                        {filteredPerms.map(permission => (
                          <label
                            key={permission.id}
                            className="flex items-center gap-2 py-2 border-b border-gray-50 last:border-b-0 hover:bg-gray-50 px-2"
                          >
                            <input
                              type="checkbox"
                              checked={formData.permissions.includes(permission.id)}
                              onChange={() => togglePermission(permission.id)}
                              className="w-4 h-4 text-violet-600 rounded focus:ring-violet-500"
                            />
                            <div className="flex-1 min-w-0">
                              <div className="text-xs text-gray-900 truncate">{permission.model}</div>
                              <div className="text-xs text-gray-500">{permission.action}</div>
                            </div>
                          </label>
                        ))}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <div className="mt-3 text-xs text-gray-600 flex items-center gap-2">
              <span>{formData.permissions.length} permission(s) sélectionnée(s)</span>
              <button
                type="button"
                onClick={() => {
                  // Sélectionner toutes les permissions
                  const allPermissionIds = permissions.map(p => p.id);
                  setFormData(prev => ({
                    ...prev,
                    permissions: allPermissionIds
                  }));
                }}
                className="text-violet-600 hover:text-violet-700 font-medium"
              >
                Tout sélectionner
              </button>
              <button
                type="button"
                onClick={() => {
                  // Désélectionner toutes les permissions
                  setFormData(prev => ({
                    ...prev,
                    permissions: []
                  }));
                }}
                className="text-gray-600 hover:text-gray-700 font-medium"
              >
                Tout désélectionner
              </button>
            </div>
          </div>

          {/* Section Membres du groupe - Interface double liste */}
          <div className="bg-gradient-to-br from-blue-50 to-white rounded-lg p-4 border border-blue-200">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-1 h-4 bg-gradient-to-b from-blue-600 to-blue-400 rounded"></div>
              <h3 className="text-sm font-semibold text-gray-900">Membres du groupe</h3>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Membres disponibles */}
              <div>
                <div className="mb-2">
                  <h4 className="text-xs font-medium text-gray-700 mb-1">
                    Membres du groupe disponible(s) 
                  </h4>
                  <p className="text-xs text-gray-500 mb-2">
                    Choisissez Membres du groupe en les sélectionnant puis cliquez sur le bouton flèche « Choisir ».
                  </p>
                </div>

                {/* Filtre */}
                <div className="mb-3">
                  <div className="relative">
                    <FiFilter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={12} />
                    <input
                      type="text"
                      value={memberFilter}
                      onChange={(e) => setMemberFilter(e.target.value)}
                      className="w-full pl-9 pr-3 py-1.5 border border-gray-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Filtrer"
                    />
                  </div>
                </div>

                {/* Liste des membres disponibles */}
                <div className="border border-gray-300 rounded h-48 overflow-y-auto">
                  {availableMembers.length === 0 ? (
                    <div className="flex items-center justify-center h-full text-gray-500 text-xs">
                      Aucun membre disponible
                    </div>
                  ) : (
                    availableMembers.map(member => (
                      <div
                        key={member.id}
                        className="flex items-center gap-2 p-2 border-b border-gray-100 hover:bg-gray-50 cursor-pointer"
                        onClick={() => handleSelectMember(member)}
                      >
                        <FiUser className="w-3 h-3 text-gray-400" />
                        <div className="flex-1 min-w-0">
                          <div className="text-xs text-gray-900 truncate">{member.email}</div>
                          {member.first_name && (
                            <div className="text-xs text-gray-500 truncate">{member.first_name} {member.last_name}</div>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {/* Boutons d'action */}
                <div className="mt-3 flex gap-2">
                  <button
                    type="button"
                    onClick={handleSelectAllMembers}
                    className="flex-1 px-2 py-1.5 bg-blue-50 text-blue-700 rounded text-xs hover:bg-blue-100 transition-colors flex items-center justify-center gap-1"
                  >
                    <FiArrowRight size={10} />
                    Choisir toutes les valeurs « Membres du groupe »
                  </button>
                </div>
              </div>

              {/* Membres sélectionnés */}
              <div>
                <div className="mb-2">
                  <h4 className="text-xs font-medium text-gray-700 mb-1">
                    Choix des « Membres du groupe »
                  </h4>
                  <p className="text-xs text-gray-500 mb-2">
                    Enlevez les valeurs « Membres du groupe » en les sélectionnant puis en cliquant sur le bouton flèche « Enlever ».
                  </p>
                </div>

                {/* Filtre */}
                <div className="mb-3">
                  <div className="relative">
                    <FiFilter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={12} />
                    <input
                      type="text"
                      value={memberFilter}
                      onChange={(e) => setMemberFilter(e.target.value)}
                      className="w-full pl-9 pr-3 py-1.5 border border-gray-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Filtrer"
                    />
                  </div>
                </div>

                {/* Liste des membres sélectionnés */}
                <div className="border border-gray-300 rounded h-48 overflow-y-auto">
                  {selectedMembers.length === 0 ? (
                    <div className="flex items-center justify-center h-full text-gray-500 text-xs">
                      Aucun membre sélectionné
                    </div>
                  ) : (
                    selectedMembers.map(member => (
                      <div
                        key={member.id}
                        className="flex items-center gap-2 p-2 border-b border-gray-100 hover:bg-gray-50 cursor-pointer"
                        onClick={() => handleRemoveMember(member)}
                      >
                        <FiUser className="w-3 h-3 text-blue-500" />
                        <div className="flex-1 min-w-0">
                          <div className="text-xs text-gray-900 truncate">{member.email}</div>
                          {member.first_name && (
                            <div className="text-xs text-gray-500 truncate">{member.first_name} {member.last_name}</div>
                          )}
                        </div>
                        <FiX className="w-3 h-3 text-gray-400 hover:text-red-500" />
                      </div>
                    ))
                  )}
                </div>

                {/* Boutons d'action */}
                <div className="mt-3 flex gap-2">
                  <button
                    type="button"
                    onClick={handleRemoveAllMembers}
                    className="flex-1 px-2 py-1.5 bg-red-50 text-red-700 rounded text-xs hover:bg-red-100 transition-colors flex items-center justify-center gap-1"
                  >
                    <FiArrowLeft size={10} />
                    Enlever toutes les valeurs « Membres du groupe »
                  </button>
                </div>
              </div>
            </div>

            <div className="mt-4 text-xs text-gray-600">
              <p className="mb-1">
                Maintenez appuyé « Ctrl », ou « Commande (touche pomme) » sur un Mac, pour en sélectionner plusieurs.
              </p>
              <div className="flex items-center gap-4">
                <span>{selectedMembers.length} membre(s) sélectionné(s)</span>
              </div>
            </div>
          </div>

          {/* Section Groupes hérités - Interface double liste */}
          <div className="bg-gradient-to-br from-green-50 to-white rounded-lg p-4 border border-green-200">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-1 h-4 bg-gradient-to-b from-green-600 to-green-400 rounded"></div>
              <h3 className="text-sm font-semibold text-gray-900">Groupes hérités</h3>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Groupes disponibles */}
              <div>
                <div className="mb-2">
                  <h4 className="text-xs font-medium text-gray-700 mb-1">
                    Groupes hérités disponible(s) 
                  </h4>
                  <p className="text-xs text-gray-500 mb-2">
                    Choisissez Groupes hérités en les sélectionnant puis cliquez sur le bouton flèche « Choisir ».
                  </p>
                </div>

                {/* Filtre */}
                <div className="mb-3">
                  <div className="relative">
                    <FiFilter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={12} />
                    <input
                      type="text"
                      value={groupFilter}
                      onChange={(e) => setGroupFilter(e.target.value)}
                      className="w-full pl-9 pr-3 py-1.5 border border-gray-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-green-500 focus:border-transparent"
                      placeholder="Filtrer"
                    />
                  </div>
                </div>

                {/* Liste des groupes disponibles */}
                <div className="border border-gray-300 rounded h-48 overflow-y-auto">
                  {availableGroups.length === 0 ? (
                    <div className="flex items-center justify-center h-full text-gray-500 text-xs">
                      Aucun groupe disponible
                    </div>
                  ) : (
                    availableGroups.map(groupItem => (
                      <div
                        key={groupItem.id}
                        className="flex items-center gap-2 p-2 border-b border-gray-100 hover:bg-gray-50 cursor-pointer"
                        onClick={() => handleSelectGroup(groupItem)}
                      >
                        <FiFolder className="w-3 h-3 text-gray-400" />
                        <div className="flex-1 min-w-0">
                          <div className="text-xs text-gray-900 truncate">{groupItem.name}</div>
                          {groupItem.description && (
                            <div className="text-xs text-gray-500 truncate">{groupItem.description}</div>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {/* Boutons d'action */}
                <div className="mt-3 flex gap-2">
                  <button
                    type="button"
                    onClick={handleSelectAllGroups}
                    className="flex-1 px-2 py-1.5 bg-green-50 text-green-700 rounded text-xs hover:bg-green-100 transition-colors flex items-center justify-center gap-1"
                  >
                    <FiArrowRight size={10} />
                    Choisir toutes les valeurs « Groupes hérités »
                  </button>
                </div>
              </div>

              {/* Groupes sélectionnés */}
              <div>
                <div className="mb-2">
                  <h4 className="text-xs font-medium text-gray-700 mb-1">
                    Choix des « Groupes hérités »
                  </h4>
                  <p className="text-xs text-gray-500 mb-2">
                    Enlevez les valeurs « Groupes hérités » en les sélectionnant puis en cliquant sur le bouton flèche « Enlever ».
                  </p>
                </div>

                {/* Filtre */}
                <div className="mb-3">
                  <div className="relative">
                    <FiFilter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={12} />
                    <input
                      type="text"
                      value={groupFilter}
                      onChange={(e) => setGroupFilter(e.target.value)}
                      className="w-full pl-9 pr-3 py-1.5 border border-gray-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-green-500 focus:border-transparent"
                      placeholder="Filtrer"
                    />
                  </div>
                </div>

                {/* Liste des groupes sélectionnés */}
                <div className="border border-gray-300 rounded h-48 overflow-y-auto">
                  {selectedGroups.length === 0 ? (
                    <div className="flex items-center justify-center h-full text-gray-500 text-xs">
                      Aucun groupe sélectionné
                    </div>
                  ) : (
                    selectedGroups.map(groupItem => (
                      <div
                        key={groupItem.id}
                        className="flex items-center gap-2 p-2 border-b border-gray-100 hover:bg-gray-50 cursor-pointer"
                        onClick={() => handleRemoveGroup(groupItem)}
                      >
                        <FiFolder className="w-3 h-3 text-green-500" />
                        <div className="flex-1 min-w-0">
                          <div className="text-xs text-gray-900 truncate">{groupItem.name}</div>
                          {groupItem.description && (
                            <div className="text-xs text-gray-500 truncate">{groupItem.description}</div>
                          )}
                        </div>
                        <FiX className="w-3 h-3 text-gray-400 hover:text-red-500" />
                      </div>
                    ))
                  )}
                </div>

                {/* Boutons d'action */}
                <div className="mt-3 flex gap-2">
                  <button
                    type="button"
                    onClick={handleRemoveAllGroups}
                    className="flex-1 px-2 py-1.5 bg-red-50 text-red-700 rounded text-xs hover:bg-red-100 transition-colors flex items-center justify-center gap-1"
                  >
                    <FiArrowLeft size={10} />
                    Enlever toutes les valeurs « Groupes hérités »
                  </button>
                </div>
              </div>
            </div>

            <div className="mt-4 text-xs text-gray-600">
              <p className="mb-1">
                Maintenez appuyé « Ctrl », ou « Commande (touche pomme) » sur un Mac, pour en sélectionner plusieurs.
              </p>
              <div className="flex items-center gap-4">
                <span>{selectedGroups.length} groupe(s) hérité(s) sélectionné(s)</span>
              </div>
            </div>
          </div>

          {/* Aperçu */}
          <div className="bg-gradient-to-br from-violet-50 to-white rounded-lg p-4 border border-violet-100">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-1 h-4 bg-gradient-to-b from-violet-600 to-violet-400 rounded"></div>
              <h3 className="text-sm font-semibold text-gray-900">Aperçu du groupe</h3>
            </div>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <div className="bg-white rounded-lg p-3 border border-gray-200">
                <div className="text-xs font-medium text-gray-500 mb-1">Nom du groupe</div>
                <div className="text-sm font-medium text-gray-900">{formData.name || 'Non défini'}</div>
              </div>
              <div className="bg-white rounded-lg p-3 border border-gray-200">
                <div className="text-xs font-medium text-gray-500 mb-1">Catégorie</div>
                <div className="text-sm font-medium text-gray-900">{formData.category || 'Non définie'}</div>
              </div>
              <div className="bg-white rounded-lg p-3 border border-gray-200">
                <div className="text-xs font-medium text-gray-500 mb-1">Membres</div>
                <div className="text-sm font-medium text-gray-900">{selectedMembers.length} membre(s)</div>
              </div>
              <div className="bg-white rounded-lg p-3 border border-gray-200">
                <div className="text-xs font-medium text-gray-500 mb-1">Permissions</div>
                <div className="text-sm font-medium text-gray-900">{formData.permissions.length} permission(s)</div>
              </div>
            </div>
          </div>
          
          {/* Boutons d'action */}
          <div className="flex justify-end gap-2 pt-4 border-t border-gray-200">
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

// MODAL FORMULAIRE PERMISSION - AMÉLIORÉ
function PermissionFormModal({ permission, groupes, modules, entites, onClose, onSuccess }) {
  const [formData, setFormData] = useState({
    name: permission?.name || '',
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
        {/* Header du modal - TOUT EN VIOLET */}
        <div className="sticky top-0 bg-gradient-to-r from-violet-600 to-violet-500 text-white rounded-t-lg p-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-white/20 backdrop-blur-sm rounded">
                <FiKey className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-base font-bold">
                  {permission ? 'Modifier la permission' : 'Ajout de permission'}
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
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Nom */}
              <div className="lg:col-span-2">
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Nom
                </label>
                <div className="relative">
                  <FiKey className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => handleChange('name', e.target.value)}
                    className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-violet-500 focus:border-transparent bg-white text-sm"
                    placeholder="Nom de la permission (optionnel)"
                  />
                </div>
              </div>
              
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
                <label className="block text-xs font-medium text-gray-700 mb-1">Entité</label>
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
                  Accès <span className="text-red-500">*</span>
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

// MODAL DE DÉTAILS (wrapper)
function DetailModal({ item, type, userGroups, groupPermissions, groups, users, permissions, modules, onClose }) {
  if (type === 'users') {
    return <UserDetailModal item={item} userGroups={userGroups} groups={groups} onClose={onClose} />;
  } else if (type === 'groups') {
    return <GroupDetailModal item={item} userGroups={userGroups} groupPermissions={groupPermissions} permissions={permissions} modules={modules} users={users} onClose={onClose} />;
  } else {
    return <PermissionDetailModal item={item} groups={groups} modules={modules} onClose={onClose} />;
  }
}

// MODAL DE DÉTAILS UTILISATEUR
function UserDetailModal({ item, userGroups, groups, onClose }) {
  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-3 z-50 backdrop-blur-sm">
      <div className="bg-white rounded-lg w-full max-w-4xl max-h-[90vh] overflow-y-auto shadow-xl">
        <div className="sticky top-0 bg-gradient-to-r from-violet-600 to-violet-500 text-white rounded-t-lg p-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-white/20 backdrop-blur-sm rounded">
                <FiUser className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-base font-bold">Détails de l'utilisateur</h2>
                <p className="text-violet-100 text-xs mt-0.5">{item.email}</p>
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
          <div className="bg-gradient-to-br from-gray-50 to-white rounded-lg p-3 border border-gray-200">
            <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-1.5">
              <div className="w-1 h-4 bg-gradient-to-b from-violet-600 to-violet-400 rounded"></div>
              Informations Générales
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <p className="text-xs font-medium text-gray-500 mb-0.5">Photo de profil</p>
                <div className="flex items-center gap-3">
                  <div className="w-16 h-16 bg-gradient-to-br from-violet-100 to-violet-200 rounded-full flex items-center justify-center overflow-hidden">
                    {item.photo ? (
                      <img 
                        src={item.photo} 
                        alt={item.email}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <FiUser className="w-8 h-8 text-violet-600" />
                    )}
                  </div>
                </div>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500 mb-0.5">Email</p>
                <p className="text-sm text-gray-900 font-medium">{item.email}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500 mb-0.5">Nom d'utilisateur</p>
                <p className="text-sm text-gray-900">@{item.username}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500 mb-0.5">Nom complet</p>
                <p className="text-sm text-gray-900">
                  {item.first_name} {item.last_name}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500 mb-0.5">Téléphone</p>
                <p className="text-sm text-gray-900">{item.telephone || '-'}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500 mb-0.5">Statut</p>
                <div className={`px-2 py-1 rounded inline-flex items-center gap-1 ${
                  item.statut === 'actif' || item.is_active
                    ? 'bg-gradient-to-r from-green-50 to-emerald-50 text-green-700 border border-green-200' 
                    : 'bg-gradient-to-r from-red-50 to-pink-50 text-red-700 border border-red-200'
                }`}>
                  {item.statut === 'actif' || item.is_active ? (
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

          <div className="bg-gradient-to-br from-violet-50 to-white rounded-lg p-3 border border-violet-100">
            <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-1.5">
              <div className="w-1 h-4 bg-gradient-to-b from-violet-600 to-violet-400 rounded"></div>
              Informations du compte
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <p className="text-xs font-medium text-gray-500 mb-0.5">Date de création</p>
                <p className="text-sm text-gray-900">
                  {item.date_joined ? new Date(item.date_joined).toLocaleDateString('fr-FR') : '-'}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500 mb-0.5">Dernière modification</p>
                <p className="text-sm text-gray-900">
                  {item.date_modified ? new Date(item.date_modified).toLocaleDateString('fr-FR') : '-'}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500 mb-0.5">Dernière connexion</p>
                <p className="text-sm text-gray-900">
                  {item.last_login ? new Date(item.last_login).toLocaleDateString('fr-FR') : 'Jamais'}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-violet-50 to-white rounded-lg p-3 border border-violet-200">
            <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-1.5">
              <div className="w-1 h-4 bg-gradient-to-b from-violet-600 to-violet-400 rounded"></div>
              Groupes d'appartenance
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {(userGroups[item.id] || []).length > 0 ? (
                groups
                  .filter(group => (userGroups[item.id] || []).includes(group.id))
                  .map(groupe => (
                    <div key={groupe.id} className="bg-white rounded-lg p-3 border border-gray-200">
                      <div className="font-medium text-gray-900 text-sm">{groupe.name}</div>
                      {groupe.description && (
                        <div className="text-xs text-gray-500 mt-1">
                          {groupe.description}
                        </div>
                      )}
                    </div>
                  ))
              ) : (
                <div className="col-span-2 text-center py-4">
                  <FiUsers className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                  <p className="text-gray-500">Aucun groupe assigné</p>
                </div>
              )}
            </div>
          </div>
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

// MODAL DE DÉTAILS GROUPE
function GroupDetailModal({ item, userGroups, groupPermissions, permissions, modules, users, onClose }) {
  const groupUsers = Object.entries(userGroups)
    .filter(([userId, groupIds]) => groupIds.includes(item.id))
    .map(([userId]) => users.find(u => u.id === parseInt(userId)))
    .filter(Boolean);
  
  const groupPerms = permissions.filter(p => 
    (groupPermissions[item.id] || []).includes(p.id)
  );

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
          <div className="bg-gradient-to-br from-gray-50 to-white rounded-lg p-3 border border-gray-200">
            <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-1.5">
              <div className="w-1 h-4 bg-gradient-to-b from-violet-600 to-violet-400 rounded"></div>
              Informations Générales
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <p className="text-xs font-medium text-gray-500 mb-0.5">IDENTIFIANT</p>
                <p className="text-sm text-gray-900 font-medium font-mono">#{item.id}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500 mb-0.5">Nom du Groupe</p>
                <p className="text-sm text-gray-900 font-medium">{item.name}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500 mb-0.5">Utilisateurs</p>
                <p className="text-sm text-gray-900">{groupUsers.length} membre(s)</p>
              </div>
              <div className="md:col-span-3">
                <p className="text-xs font-medium text-gray-500 mb-0.5">Description</p>
                <p className="text-sm text-gray-900">{item.description || 'Aucune description'}</p>
              </div>
            </div>
          </div>

          {groupUsers.length > 0 && (
            <div className="bg-gradient-to-br from-violet-50 to-white rounded-lg p-3 border border-violet-100">
              <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-1.5">
                <div className="w-1 h-4 bg-gradient-to-b from-violet-600 to-violet-400 rounded"></div>
                Utilisateurs du groupe ({groupUsers.length})
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {groupUsers.map(user => (
                  <div key={user.id} className="bg-white rounded-lg p-3 border border-gray-200">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gradient-to-br from-violet-100 to-violet-200 rounded-full flex items-center justify-center">
                        <FiUser className="w-5 h-5 text-violet-600" />
                      </div>
                      <div>
                        <div className="font-medium text-gray-900 text-sm">
                          {user.first_name} {user.last_name}
                        </div>
                        <div className="text-xs text-gray-500">{user.email}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {groupPerms.length > 0 && (
            <div className="bg-gradient-to-br from-violet-50 to-white rounded-lg p-3 border border-violet-200">
              <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-1.5">
                <div className="w-1 h-4 bg-gradient-to-b from-violet-600 to-violet-400 rounded"></div>
                Permissions du groupe ({groupPerms.length})
              </h3>
              <div className="space-y-3">
                {groupPerms.map(permission => {
                  const module = modules.find(m => m.id === permission.module);
                  const accessType = TYPES_ACCES.find(t => t.value === permission.acces);
                  
                  return (
                    <div key={permission.id} className="bg-white rounded-lg p-3 border border-gray-200">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-medium text-gray-900 text-sm">
                            {module?.nom_affiche || module?.name || 'Module'}
                          </div>
                          <div className="flex items-center gap-2 mt-1">
                            <span className={`px-2 py-0.5 rounded text-xs ${accessType?.bgColor || 'bg-gray-100'} ${accessType?.textColor || 'text-gray-800'}`}>
                              {accessType?.label || permission.acces}
                            </span>
                            <span className={`px-2 py-0.5 rounded text-xs ${
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
                  );
                })}
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

// MODAL DE DÉTAILS PERMISSION
function PermissionDetailModal({ item, groups, modules, onClose }) {
  const group = groups.find(g => g.id === item.groupe || g.id === item.groupe?.id);
  const module = modules.find(m => m.id === item.module);
  const accessType = TYPES_ACCES.find(t => t.value === item.acces);

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-3 z-50 backdrop-blur-sm">
      <div className="bg-white rounded-lg w-full max-w-4xl max-h-[90vh] overflow-y-auto shadow-xl">
        <div className="sticky top-0 bg-gradient-to-r from-violet-600 to-violet-500 text-white rounded-t-lg p-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-white/20 backdrop-blur-sm rounded">
                <FiKey className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-base font-bold">Détails de la permission</h2>
                <p className="text-violet-100 text-xs mt-0.5">
                  {group?.name} - {module?.nom_affiche || module?.name}
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
          <div className="bg-gradient-to-br from-gray-50 to-white rounded-lg p-3 border border-gray-200">
            <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-1.5">
              <div className="w-1 h-4 bg-gradient-to-b from-violet-600 to-violet-400 rounded"></div>
              Informations Générales
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <p className="text-xs font-medium text-gray-500 mb-0.5">IDENTIFIANT</p>
                <p className="text-sm text-gray-900 font-medium font-mono">#{item.id}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500 mb-0.5">Groupe</p>
                <p className="text-sm text-gray-900 font-medium">{group?.name || '-'}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500 mb-0.5">Module</p>
                <p className="text-sm text-gray-900 font-medium">{module?.nom_affiche || module?.name || '-'}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500 mb-0.5">Type d'accès</p>
                <div className={`inline-flex items-center px-2 py-1 rounded border ${accessType?.bgColor || 'bg-gray-100'} ${accessType?.textColor || 'text-gray-800'} ${accessType?.borderColor || 'border-gray-300'}`}>
                  <span className="text-xs font-medium">
                    {accessType?.label || item.acces}
                  </span>
                </div>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500 mb-0.5">Statut</p>
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

// MODAL D'ASSOCIATION
function AssociationModal({ 
  type, 
  target, 
  item, 
  users, 
  groups, 
  permissions, 
  modules,
  userGroups,
  groupPermissions,
  onClose,
  onSuccess 
}) {
  const [selectedItems, setSelectedItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  useEffect(() => {
    if (type === 'user-groups' && item) {
      setSelectedItems(userGroups[item.id] || []);
    } else if (type === 'group-users' && item) {
      const groupUsers = Object.entries(userGroups)
        .filter(([userId, groupIds]) => groupIds.includes(item.id))
        .map(([userId]) => parseInt(userId));
      setSelectedItems(groupUsers);
    } else if (type === 'group-permissions' && item) {
      setSelectedItems(groupPermissions[item.id] || []);
    }
  }, [type, item, userGroups, groupPermissions]);
  
  const title = type === 'user-groups' 
    ? `Gérer les groupes de ${item?.email}`
    : type === 'group-users'
    ? `Gérer les utilisateurs du groupe ${item?.name}`
    : `Gérer les permissions du groupe ${item?.name}`;
  
  const description = type === 'user-groups' 
    ? 'Sélectionnez les groupes pour cet utilisateur'
    : type === 'group-users'
    ? 'Sélectionnez les utilisateurs pour ce groupe'
    : 'Sélectionnez les permissions pour ce groupe';
  
  const availableItems = type === 'user-groups' 
    ? groups 
    : type === 'group-users'
    ? users
    : permissions;
  
  const handleSave = async () => {
    setLoading(true);
    setError(null);
    
    try {
      if (type === 'user-groups') {
        await apiClient.patch(`/users/${item.id}/`, {
          groups: selectedItems
        });
      } else if (type === 'group-users') {
        // Mettre à jour chaque utilisateur
        const updates = availableItems.map(user => {
          const currentGroups = userGroups[user.id] || [];
          const newGroups = selectedItems.includes(user.id)
            ? [...currentGroups.filter(id => id !== item.id), item.id]
            : currentGroups.filter(id => id !== item.id);
          
          return apiClient.patch(`/users/${user.id}/`, {
            groups: newGroups
          });
        });
        
        await Promise.all(updates);
      } else if (type === 'group-permissions') {
        // Pour simplifier, on pourrait mettre à jour les permissions existantes
        // ou créer de nouvelles permissions
        // Note: Dans une vraie implémentation, il faudrait gérer la création/suppression
      }
      
      onSuccess();
    } catch (err) {
      console.error('Erreur:', err);
      setError('Erreur lors de la sauvegarde des associations');
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-3 z-50 backdrop-blur-sm">
      <div className="bg-white rounded-lg w-full max-w-4xl max-h-[90vh] overflow-y-auto shadow-xl">
        <div className="sticky top-0 bg-gradient-to-r from-violet-600 to-violet-500 text-white rounded-t-lg p-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-white/20 backdrop-blur-sm rounded">
                <FiLink className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-base font-bold">{title}</h2>
                <p className="text-violet-100 text-xs mt-0.5">{description}</p>
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
        
        <div className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {availableItems.map(availableItem => {
              const isSelected = selectedItems.includes(availableItem.id);
              let icon, color, bgColor;
              
              if (type === 'user-groups') {
                icon = FiUsers;
                color = 'text-violet-600';
                bgColor = isSelected ? 'bg-violet-100' : 'bg-gray-100';
              } else if (type === 'group-users') {
                icon = FiUser;
                color = 'text-violet-600';
                bgColor = isSelected ? 'bg-violet-100' : 'bg-gray-100';
              } else {
                icon = FiKey;
                color = 'text-violet-600';
                bgColor = isSelected ? 'bg-violet-100' : 'bg-gray-100';
              }
              
              const Icon = icon;
              
              return (
                <div
                  key={availableItem.id}
                  onClick={() => {
                    setSelectedItems(prev => 
                      isSelected
                        ? prev.filter(id => id !== availableItem.id)
                        : [...prev, availableItem.id]
                    );
                  }}
                  className={`p-3 rounded-lg border cursor-pointer transition-all ${
                    isSelected
                      ? 'border-violet-500 bg-violet-50 ring-1 ring-violet-500'
                      : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${bgColor}`}>
                        <Icon className={`w-5 h-5 ${color}`} />
                      </div>
                      <div>
                        <h3 className="text-sm font-medium text-gray-900">
                          {availableItem.name || availableItem.email}
                        </h3>
                        {availableItem.description && (
                          <p className="text-xs text-gray-500 truncate">
                            {availableItem.description}
                          </p>
                        )}
                        {type === 'group-permissions' && availableItem.module && (
                          <p className="text-xs text-gray-500">
                            Module: {modules.find(m => m.id === availableItem.module)?.nom_affiche}
                          </p>
                        )}
                      </div>
                    </div>
                    {isSelected && (
                      <div className="p-1 bg-violet-100 rounded-full">
                        <FiCheck className="w-4 h-4 text-violet-600" />
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
        
        <div className="p-3 border-t border-gray-200 bg-gradient-to-r from-gray-50 to-white">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-600">
              {selectedItems.length} éléments sélectionnés
            </div>
            <div className="flex gap-2">
              <button
                onClick={onClose}
                className="px-4 py-1.5 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-all duration-200 font-medium text-sm"
                disabled={loading}
              >
                Annuler
              </button>
              <button
                onClick={handleSave}
                disabled={loading}
                className="px-4 py-1.5 bg-gradient-to-r from-violet-600 to-violet-500 text-white rounded-lg hover:from-violet-700 hover:to-violet-600 disabled:opacity-50 transition-all duration-200 font-medium flex items-center space-x-1.5 text-sm"
              >
                {loading ? (
                  <>
                    <FiRefreshCw className="animate-spin" size={14} />
                    <span>Enregistrement...</span>
                  </>
                ) : (
                  <>
                    <FiCheck size={14} />
                    <span>Enregistrer</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}