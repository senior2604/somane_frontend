import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { apiClient } from '../../services/apiClient';
import { 
  FiRefreshCw, FiPlus, FiEdit2, FiTrash2, FiSearch, FiX, FiChevronDown,
  FiCheck, FiUsers, FiChevronLeft, FiChevronRight, FiDownload, FiUpload,
  FiEye, FiCheckCircle, FiXCircle, FiUserCheck, FiShield, FiFolder,
  FiKey, FiLock, FiUnlock, FiMoreVertical, FiLink, FiUser, FiMail,
  FiPhone, FiCalendar, FiClock, FiImage
} from "react-icons/fi";

export default function UserGroupAssociationPage() {
  // États pour les données
  const [users, setUsers] = useState([]);
  const [groups, setGroups] = useState([]);
  const [userGroups, setUserGroups] = useState({});
  
  // États pour l'UI
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showUserForm, setShowUserForm] = useState(false);
  const [showGroupForm, setShowGroupForm] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [editingGroup, setEditingGroup] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedDetail, setSelectedDetail] = useState(null);
  
  // États pour la recherche et filtres
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [selectedRows, setSelectedRows] = useState([]);
  const [activeTab, setActiveTab] = useState('users'); // 'users' ou 'groups'
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);
  const [filterStatut, setFilterStatut] = useState('');

  // Chargement initial des données
  useEffect(() => {
    fetchAllData();
  }, []);

  const fetchAllData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Charger les utilisateurs
      const usersResponse = await apiClient.get('/users/');
      const usersData = extractArrayData(usersResponse);
      setUsers(usersData);
      
      // Charger les groupes
      const groupsResponse = await apiClient.get('/groupes/');
      const groupsData = extractArrayData(groupsResponse);
      setGroups(groupsData);
      
      // Charger les associations existantes
      await fetchUserGroups(usersData, groupsData);
      
    } catch (err) {
      console.error('Erreur lors du chargement des données:', err);
      setError('Erreur lors du chargement des données');
    } finally {
      setLoading(false);
    }
  };

  const extractArrayData = (response) => {
    if (Array.isArray(response)) return response;
    if (response && Array.isArray(response.results)) return response.results;
    if (response && Array.isArray(response.data)) return response.data;
    return [];
  };

  const fetchUserGroups = async (usersData, groupsData) => {
    try {
      const associations = {};
      
      for (const user of usersData) {
        if (user.groups && Array.isArray(user.groups)) {
          associations[user.id] = user.groups.map(g => g.id);
        } else {
          try {
            const userWithGroups = await apiClient.get(`/users/${user.id}/`);
            if (userWithGroups.groups) {
              associations[user.id] = userWithGroups.groups.map(g => g.id);
            } else {
              associations[user.id] = [];
            }
          } catch (err) {
            console.warn(`Erreur chargement groupes pour utilisateur ${user.id}:`, err);
            associations[user.id] = [];
          }
        }
      }
      
      setUserGroups(associations);
    } catch (err) {
      console.error('Erreur lors du chargement des associations:', err);
      setUserGroups({});
    }
  };

  // Association/Dissociation
  const toggleUserGroup = async (userId, groupId) => {
    try {
      const currentGroups = userGroups[userId] || [];
      const isCurrentlyAssociated = currentGroups.includes(groupId);
      
      let newGroups;
      if (isCurrentlyAssociated) {
        newGroups = currentGroups.filter(id => id !== groupId);
      } else {
        newGroups = [...currentGroups, groupId];
      }
      
      await apiClient.patch(`/users/${userId}/`, {
        groups: newGroups
      });
      
      setUserGroups(prev => ({
        ...prev,
        [userId]: newGroups
      }));
      
      return true;
    } catch (err) {
      console.error('Erreur lors de la modification de l\'association:', err);
      setError('Erreur lors de la modification');
      return false;
    }
  };

  // Gestion des utilisateurs
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

  // Données actuelles selon l'onglet actif
  const currentData = activeTab === 'users' ? filteredUsers : filteredGroups;
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
    totalUsers: users.length,
    totalGroups: groups.length,
    actifs: users.filter(u => u.statut === 'actif' || u.is_active).length,
    inactifs: users.filter(u => u.statut === 'inactif' || !u.is_active).length,
    withPermissions: groups.filter(g => g.modules_autorises && g.modules_autorises.length > 0).length,
  }), [users, groups]);

  // Gestion des succès des formulaires
  const handleFormSuccess = () => {
    setShowUserForm(false);
    setShowGroupForm(false);
    setEditingUser(null);
    setEditingGroup(null);
    fetchAllData();
  };

  const handleRetry = () => {
    fetchAllData();
  };

  const resetFilters = () => {
    setSearchTerm('');
    setFilterStatut('');
    setCurrentPage(1);
  };

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

  return (
    <div className="p-4 bg-gradient-to-br from-gray-50 to-white min-h-screen">
      {/* Header compact avec recherche au centre */}
      <div className="mb-6">
        {/* Ligne supérieure avec titre */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-gradient-to-br from-violet-600 to-violet-500 rounded-lg shadow">
              <FiLink className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">Utilisateurs × Groupes</h1>
              <p className="text-gray-600 text-xs mt-0.5">
                Gérez les associations entre utilisateurs et groupes
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
                placeholder={activeTab === 'users' ? "Rechercher un utilisateur..." : "Rechercher un groupe..."}
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
                    filterStatut ? 'bg-violet-100 text-violet-700' : 'bg-gray-100 text-gray-700'
                  } hover:bg-gray-200 transition-colors`}
                >
                  <FiChevronDown size={12} />
                  <span>Filtre</span>
                </button>
                
                {/* Dropdown des filtres */}
                {showFilterDropdown && (
                  <div className="absolute right-0 top-full mt-1 w-48 bg-white rounded-lg shadow-lg border border-gray-200 z-10">
                    <div className="p-2">
                      <p className="text-xs font-medium text-gray-700 mb-2">Filtrer par statut</p>
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
                          className={`w-full text-left px-2 py-1.5 rounded text-xs ${filterStatut === 'actif' ? 'bg-green-50 text-green-700' : 'text-gray-700 hover:bg-gray-50'}`}
                        >
                          Actif seulement
                        </button>
                        <button
                          onClick={() => {
                            setFilterStatut('inactif');
                            setShowFilterDropdown(false);
                          }}
                          className={`w-full text-left px-2 py-1.5 rounded text-xs ${filterStatut === 'inactif' ? 'bg-red-50 text-red-700' : 'text-gray-700 hover:bg-gray-50'}`}
                        >
                          Inactif seulement
                        </button>
                      </div>
                      {(searchTerm || filterStatut) && (
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
            
            {activeTab === 'users' ? (
              <button 
                onClick={handleNewUser}
                className="ml-2 px-3 py-2 rounded-lg bg-gradient-to-r from-violet-600 to-violet-500 text-white hover:from-violet-700 hover:to-violet-600 transition-all duration-300 flex items-center gap-1.5 text-sm shadow"
              >
                <FiPlus size={14} />
                <span>Nouvel Utilisateur</span>
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
                <p className="text-xs text-gray-600">Total utilisateurs</p>
                <p className="text-sm font-bold text-violet-600 mt-0.5">{stats.totalUsers}</p>
              </div>
              <div className="p-1 bg-violet-50 rounded">
                <FiUsers className="w-3 h-3 text-violet-600" />
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg p-2 border border-gray-200 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-600">Actifs</p>
                <p className="text-sm font-bold text-green-600 mt-0.5">{stats.actifs}</p>
              </div>
              <div className="p-1 bg-green-50 rounded">
                <FiCheckCircle className="w-3 h-3 text-green-600" />
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg p-2 border border-gray-200 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-600">Inactifs</p>
                <p className="text-sm font-bold text-red-600 mt-0.5">{stats.inactifs}</p>
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
                <FiShield className="w-3 h-3 text-purple-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Onglets Utilisateur | Groupe */}
        <div className="flex border-b border-gray-200 mb-3">
          <button
            onClick={() => {
              setActiveTab('users');
              setCurrentPage(1);
              setSelectedRows([]);
              setFilterStatut('');
            }}
            className={`px-4 py-1.5 text-xs font-medium border-b-2 transition-colors ${
              activeTab === 'users'
                ? 'border-violet-600 text-violet-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Utilisateur
          </button>
          <button
            onClick={() => {
              setActiveTab('groups');
              setCurrentPage(1);
              setSelectedRows([]);
              setFilterStatut('');
            }}
            className={`px-4 py-1.5 text-xs font-medium border-b-2 transition-colors ${
              activeTab === 'groups'
                ? 'border-violet-600 text-violet-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Groupe
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
                
                {activeTab === 'users' ? (
                  <>
                    <th scope="col" className="px-3 py-2 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider border-r border-gray-300">
                      Utilisateur
                    </th>
                    <th scope="col" className="px-3 py-2 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider border-r border-gray-300">
                      Nom complet
                    </th>
                    <th scope="col" className="px-3 py-2 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider border-r border-gray-300">
                      Statut
                    </th>
                    <th scope="col" className="px-3 py-2 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Actes
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
                      Modules
                    </th>
                    <th scope="col" className="px-3 py-2 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider border-r border-gray-300">
                      Utilisateurs
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
                  <td colSpan={activeTab === 'users' ? 5 : 6} className="px-3 py-4 text-center">
                    <div className="flex flex-col items-center justify-center">
                      <div className="w-12 h-12 bg-gradient-to-br from-gray-100 to-gray-200 rounded-full flex items-center justify-center mb-2">
                        {activeTab === 'users' ? (
                          <FiUsers className="w-6 h-6 text-gray-400" />
                        ) : (
                          <FiShield className="w-6 h-6 text-gray-400" />
                        )}
                      </div>
                      <h3 className="text-sm font-semibold text-gray-900 mb-1">
                        {activeTab === 'users' 
                          ? (users.length === 0 ? 'Aucun utilisateur trouvé' : 'Aucun résultat')
                          : (groups.length === 0 ? 'Aucun groupe trouvé' : 'Aucun résultat')
                        }
                      </h3>
                      <p className="text-gray-600 text-xs mb-3 max-w-md">
                        {activeTab === 'users'
                          ? (users.length === 0 
                              ? 'Commencez par créer votre premier utilisateur' 
                              : 'Essayez de modifier vos critères de recherche')
                          : (groups.length === 0
                              ? 'Commencez par créer votre premier groupe'
                              : 'Essayez de modifier vos critères de recherche')
                        }
                      </p>
                      {((activeTab === 'users' && users.length === 0) || (activeTab === 'groups' && groups.length === 0)) && (
                        <button 
                          onClick={activeTab === 'users' ? handleNewUser : handleNewGroup}
                          className="px-3 py-1 bg-gradient-to-r from-violet-600 to-violet-500 text-white rounded hover:from-violet-700 hover:to-violet-600 transition-all duration-300 font-medium flex items-center gap-1 text-xs"
                        >
                          <FiPlus size={12} />
                          {activeTab === 'users' ? 'Créer utilisateur' : 'Créer groupe'}
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
                        
                        {/* Modules */}
                        <td className="px-3 py-2 border-r border-gray-200">
                          <div className="flex flex-wrap gap-0.5">
                            {item.modules_autorises && item.modules_autorises.length > 0 ? (
                              <>
                                <span className="inline-flex px-1 py-0.5 rounded text-xs bg-gradient-to-r from-violet-50 to-violet-100 text-violet-700 font-medium border border-violet-200">
                                  {item.modules_autorises.length} module(s)
                                </span>
                              </>
                            ) : (
                              <span className="text-xs text-gray-500">Aucun module</span>
                            )}
                          </div>
                        </td>
                        
                        {/* Utilisateurs */}
                        <td className="px-3 py-2 border-r border-gray-200">
                          <span className="inline-flex px-1.5 py-0.5 rounded text-xs font-medium bg-gradient-to-r from-green-50 to-emerald-50 text-green-700 border border-green-200">
                            {Object.values(userGroups).filter(groups => groups.includes(item.id)).length} utilisateur(s)
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
                    {indexOfFirstItem + 1}-{Math.min(indexOfLastItem, currentData.length)} sur {currentData.length} {activeTab === 'users' ? 'utilisateurs' : 'groupes'}
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

      {/* Modaux pour création/édition - FORMULAIRES IDENTIQUES À VOS CODES D'ORIGINE */}
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
          userGroups={userGroups}
          groups={groups}
          users={users}
          onClose={() => {
            setShowDetailModal(false);
            setSelectedDetail(null);
          }}
        />
      )}
    </div>
  );
}

// MODAL DE DÉTAILS UTILISATEUR (identique à votre code)
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

          <div className="bg-gradient-to-br from-purple-50 to-white rounded-lg p-3 border border-purple-100">
            <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-1.5">
              <div className="w-1 h-4 bg-gradient-to-b from-purple-600 to-purple-400 rounded"></div>
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

// MODAL DE DÉTAILS GROUPE (identique à votre code)
function GroupDetailModal({ item, userGroups, users, onClose }) {
  const availableModules = [
    'Core/Noyau',
    'Achat',
    'Vente', 
    'Comptabilité',
    'RH/Paie',
    'Stock',
    'Production',
    'Projet',
    'CRM',
    'Maintenance'
  ];

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
                <p className="text-sm text-gray-900">{Object.values(userGroups).filter(groups => groups.includes(item.id)).length} membre(s)</p>
              </div>
              <div className="md:col-span-3">
                <p className="text-xs font-medium text-gray-500 mb-0.5">Description</p>
                <p className="text-sm text-gray-900">{item.description || 'Aucune description'}</p>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-violet-50 to-purple-50 rounded-lg p-3 border border-violet-100">
            <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-1.5">
              <div className="w-1 h-4 bg-gradient-to-b from-violet-600 to-violet-400 rounded"></div>
              Modules Autorisés
            </h3>
            <div className="flex flex-wrap gap-2">
              {item.modules_autorises && item.modules_autorises.length > 0 ? (
                item.modules_autorises.map((module, idx) => (
                  <span key={idx} className="inline-flex px-3 py-1.5 rounded-lg text-sm bg-gradient-to-r from-violet-50 to-violet-100 text-violet-700 font-medium border border-violet-200">
                    {module}
                  </span>
                ))
              ) : (
                <p className="text-sm text-gray-500">Aucun module autorisé</p>
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

// MODAL DE DÉTAILS (wrapper)
function DetailModal({ item, type, userGroups, groups, users, onClose }) {
  if (type === 'users') {
    return <UserDetailModal item={item} userGroups={userGroups} groups={groups} onClose={onClose} />;
  } else {
    return <GroupDetailModal item={item} userGroups={userGroups} users={users} onClose={onClose} />;
  }
}

// MODAL FORMULAIRE UTILISATEUR - IDENTIQUE À VOTRE PREMIER CODE
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
        {/* Header du modal */}
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
          <div className="bg-gradient-to-br from-violet-50 to-purple-50 rounded-lg p-3 border border-violet-200">
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
            <div className="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-lg p-3 border border-blue-200">
              <div className="flex items-center gap-2 mb-3">
                <FiMail className="w-4 h-4 text-blue-600" />
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

// MODAL FORMULAIRE GROUPE - IDENTIQUE À VOTRE PREMIER CODE
function GroupFormModal({ group, onClose, onSuccess }) {
  const [formData, setFormData] = useState({
    name: group?.name || '',
    description: group?.description || '',
    modules_autorises: group?.modules_autorises || [],
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Liste des modules disponibles
  const availableModules = [
    'Core/Noyau',
    'Achat',
    'Vente', 
    'Comptabilité',
    'RH/Paie',
    'Stock',
    'Production',
    'Projet',
    'CRM',
    'Maintenance'
  ];

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

  const toggleModule = (module) => {
    const currentModules = formData.modules_autorises || [];
    const newModules = currentModules.includes(module)
      ? currentModules.filter(m => m !== module)
      : [...currentModules, module];
    
    handleChange('modules_autorises', newModules);
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-3 z-50 backdrop-blur-sm">
      <div className="bg-white rounded-lg w-full max-w-5xl max-h-[90vh] overflow-y-auto shadow-xl">
        {/* Header du modal */}
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

          {/* Section Modules Autorisés */}
          <div className="bg-gradient-to-br from-violet-50 to-purple-50 rounded-lg p-3 border border-violet-100">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-1 h-4 bg-gradient-to-b from-violet-600 to-violet-400 rounded"></div>
              <h3 className="text-sm font-semibold text-gray-900">Modules Autorisés</h3>
            </div>
            <p className="text-xs text-gray-600 mb-3">
              Sélectionnez les modules auxquels ce groupe aura accès
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {availableModules.map(module => (
                <label 
                  key={module} 
                  className={`flex items-center gap-2 p-3 rounded-lg border transition-all duration-200 cursor-pointer text-sm ${
                    formData.modules_autorises.includes(module)
                      ? 'bg-white border-violet-400'
                      : 'bg-white border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={formData.modules_autorises.includes(module)}
                    onChange={() => toggleModule(module)}
                    className="w-4 h-4 text-violet-600 rounded focus:ring-violet-500"
                  />
                  <div className="flex-1">
                    <div className="font-medium text-gray-900">{module}</div>
                  </div>
                  {formData.modules_autorises.includes(module) && (
                    <div className="p-1 bg-gradient-to-r from-violet-100 to-violet-200 rounded">
                      <FiCheck className="w-3 h-3 text-violet-600" />
                    </div>
                  )}
                </label>
              ))}
            </div>
            
            <div className="mt-3 text-xs text-gray-600">
              <div className="flex items-center gap-1.5">
                <FiCheckCircle className="w-3 h-3 text-green-600" />
                <span>{formData.modules_autorises.length} module(s) sélectionné(s)</span>
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
              <div className="bg-white rounded-lg p-2 border border-gray-200">
                <div className="text-xs font-medium text-gray-500 mb-1">Modules</div>
                <div className="text-sm font-medium text-gray-900">
                  {formData.modules_autorises.length > 0 
                    ? `${formData.modules_autorises.length} module(s)` 
                    : 'Aucun module'}
                </div>
              </div>
              {formData.modules_autorises.length > 0 && (
                <div className="col-span-2 bg-white rounded-lg p-2 border border-gray-200">
                  <div className="text-xs font-medium text-gray-500 mb-1">Modules sélectionnés</div>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {formData.modules_autorises.slice(0, 5).map((module, idx) => (
                      <span key={idx} className="inline-flex px-2 py-0.5 rounded text-xs bg-gradient-to-r from-violet-50 to-violet-100 text-violet-700 font-medium border border-violet-200">
                        {module}
                      </span>
                    ))}
                    {formData.modules_autorises.length > 5 && (
                      <span className="inline-flex px-2 py-0.5 rounded text-xs bg-gradient-to-r from-gray-50 to-gray-100 text-gray-600 font-medium border border-gray-200">
                        +{formData.modules_autorises.length - 5} de plus
                      </span>
                    )}
                  </div>
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
