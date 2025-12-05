import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { apiClient } from '../../services/apiClient';
import { 
  FiRefreshCw, FiPlus, FiEdit2, FiTrash2, FiSearch, FiFilter, FiX, 
  FiCheck, FiMail, FiPhone, FiUser, FiUsers, FiChevronLeft, FiChevronRight,
  FiDownload, FiUpload, FiEye, FiMoreVertical, FiChevronDown, FiChevronUp,
  FiCheckCircle, FiXCircle, FiUserCheck, FiGlobe, FiBriefcase, FiCalendar,
  FiLock, FiUnlock, FiLogIn, FiActivity, FiImage, FiShield, FiKey,
  FiInfo
} from "react-icons/fi";

export default function UtilisateurPage() {
  const [utilisateurs, setUtilisateurs] = useState([]);
  const [groupes, setGroupes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingGroups, setLoadingGroups] = useState(true);
  const [error, setError] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editingUtilisateur, setEditingUtilisateur] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedUtilisateur, setSelectedUtilisateur] = useState(null);
  
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatut, setFilterStatut] = useState('');
  const [selectedRows, setSelectedRows] = useState([]);

  useEffect(() => {
    fetchUtilisateurs();
    fetchGroupes();
  }, []);

  const fetchUtilisateurs = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await apiClient.get('/users/');
      
      let utilisateursData = [];
      if (Array.isArray(response)) {
        utilisateursData = response;
      } else if (response && Array.isArray(response.results)) {
        utilisateursData = response.results;
      } else if (response && Array.isArray(response.data)) {
        utilisateursData = response.data;
      } else {
        setError('Format de données inattendu');
        utilisateursData = [];
      }

      setUtilisateurs(utilisateursData);
    } catch (err) {
      console.error('❌ Erreur lors du chargement des utilisateurs:', err);
      setError('Erreur lors du chargement des utilisateurs');
    } finally {
      setLoading(false);
    }
  };

  const fetchGroupes = async () => {
    try {
      setLoadingGroups(true);
      const response = await apiClient.get('/groupes/');
      
      let groupesData = [];
      if (Array.isArray(response)) {
        groupesData = response;
      } else if (response && Array.isArray(response.results)) {
        groupesData = response.results;
      } else if (response && Array.isArray(response.data)) {
        groupesData = response.data;
      } else {
        console.warn('Format de données groupes inattendu:', response);
        groupesData = [];
      }

      setGroupes(groupesData);
      console.log('✅ Groupes chargés:', groupesData.length);
    } catch (err) {
      console.error('❌ Erreur chargement groupes:', err);
      setGroupes([]);
    } finally {
      setLoadingGroups(false);
    }
  };

  // Filtrage et recherche
  const filteredUtilisateurs = useMemo(() => {
    return utilisateurs.filter(utilisateur => {
      const matchesSearch = 
        utilisateur.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        utilisateur.username?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        utilisateur.first_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        utilisateur.last_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        utilisateur.telephone?.includes(searchTerm);
      
      const matchesStatut = filterStatut === '' || 
        utilisateur.statut?.toString() === filterStatut;
      
      return matchesSearch && matchesStatut;
    });
  }, [utilisateurs, searchTerm, filterStatut]);

  // Calculs pour la pagination
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentUtilisateurs = useMemo(() => 
    Array.isArray(filteredUtilisateurs) 
      ? filteredUtilisateurs.slice(indexOfFirstItem, indexOfLastItem) 
      : []
  , [filteredUtilisateurs, indexOfFirstItem, indexOfLastItem]);
  
  const totalPages = Math.ceil((Array.isArray(filteredUtilisateurs) ? filteredUtilisateurs.length : 0) / itemsPerPage);

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

  const selectAllRows = useCallback(() => {
    if (selectedRows.length === currentUtilisateurs.length) {
      setSelectedRows([]);
    } else {
      setSelectedRows(currentUtilisateurs.map(utilisateur => utilisateur.id));
    }
  }, [currentUtilisateurs, selectedRows.length]);

  // Gestion des actions
  const handleNewUtilisateur = () => {
    setEditingUtilisateur(null);
    setShowForm(true);
  };

  const handleEdit = (utilisateur) => {
    setEditingUtilisateur(utilisateur);
    setShowForm(true);
  };

  const handleDelete = async (utilisateur) => {
    if (window.confirm(`Êtes-vous sûr de vouloir supprimer l'utilisateur "${utilisateur.email}" ? Cette action est irréversible.`)) {
      try {
        await apiClient.delete(`/users/${utilisateur.id}/`);
        fetchUtilisateurs();
      } catch (err) {
        setError('Erreur lors de la suppression');
        console.error('Error deleting utilisateur:', err);
      }
    }
  };

  const handleToggleStatut = async (utilisateur) => {
    try {
      const nouveauStatut = utilisateur.statut === 'actif' ? 'inactif' : 'actif';
      await apiClient.patch(`/users/${utilisateur.id}/`, {
        statut: nouveauStatut,
        is_active: nouveauStatut === 'actif'
      });
      fetchUtilisateurs();
    } catch (err) {
      setError('Erreur lors de la modification du statut');
      console.error('Error toggling statut:', err);
    }
  };

  const handleViewDetails = (utilisateur) => {
    setSelectedUtilisateur(utilisateur);
    setShowDetailModal(true);
  };

  const handleFormSuccess = () => {
    setShowForm(false);
    setEditingUtilisateur(null);
    fetchUtilisateurs();
  };

  const handleRetry = () => {
    fetchUtilisateurs();
  };

  const handleResetFilters = () => {
    setSearchTerm('');
    setFilterStatut('');
    setCurrentPage(1);
  };

  // Statistiques - 3 cartes seulement
  const stats = useMemo(() => ({
    total: utilisateurs.length,
    actifs: utilisateurs.filter(u => u.statut === 'actif').length,
    inactifs: utilisateurs.filter(u => u.statut === 'inactif').length,
  }), [utilisateurs]);

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
      {/* Header avec gradient - COMPACT */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-gradient-to-br from-violet-600 to-violet-500 rounded-lg shadow">
              <FiUsers className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">Gestion des Utilisateurs</h1>
              <p className="text-gray-600 text-xs mt-0.5">
                Gérez tous vos utilisateurs et leurs permissions
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button 
              onClick={handleRetry}
              className="px-3 py-1.5 rounded-lg border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 transition-all duration-300 hover:shadow flex items-center gap-1.5 text-sm group"
            >
              <FiRefreshCw className={`${loading ? 'animate-spin' : 'group-hover:rotate-180 transition-transform duration-500 text-sm'}`} />
              <span className="font-medium">Actualiser</span>
            </button>
            <button 
              onClick={handleNewUtilisateur}
              className="px-4 py-1.5 rounded-lg bg-gradient-to-r from-violet-600 to-violet-500 text-white hover:from-violet-700 hover:to-violet-600 transition-all duration-300 hover:shadow flex items-center gap-1.5 text-sm group shadow"
            >
              <FiPlus className="group-hover:rotate-90 transition-transform duration-300 text-sm" />
              <span className="font-semibold">Nouvel Utilisateur</span>
            </button>
          </div>
        </div>

        {/* Statistiques en ligne - 3 CARTES SEULEMENT - COMPACT */}
        <div className="grid grid-cols-3 gap-3 mb-4">
          <div className="bg-white rounded-lg p-3 border border-gray-200 shadow-sm hover:shadow transition-shadow duration-300">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-600">Total des utilisateurs</p>
                <p className="text-lg font-bold text-gray-900 mt-0.5">{stats.total}</p>
              </div>
              <div className="p-1.5 bg-violet-50 rounded">
                <FiUsers className="w-4 h-4 text-violet-600" />
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg p-3 border border-gray-200 shadow-sm hover:shadow transition-shadow duration-300">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-600">Utilisateurs actifs</p>
                <p className="text-lg font-bold text-green-600 mt-0.5">{stats.actifs}</p>
              </div>
              <div className="p-1.5 bg-green-50 rounded">
                <FiCheckCircle className="w-4 h-4 text-green-600" />
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg p-3 border border-gray-200 shadow-sm hover:shadow transition-shadow duration-300">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-600">Utilisateurs inactifs</p>
                <p className="text-lg font-bold text-red-600 mt-0.5">{stats.inactifs}</p>
              </div>
              <div className="p-1.5 bg-red-50 rounded">
                <FiXCircle className="w-4 h-4 text-red-600" />
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

      {/* Barre d'outils - Filtres et Recherche - COMPACT */}
      <div className="mb-4">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-3">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-gray-900 text-sm">Filtres et Recherche</h3>
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-gray-600">
                {filteredUtilisateurs.length} résultat(s)
              </span>
              {(searchTerm || filterStatut) && (
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
          
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
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
                    placeholder="Rechercher un utilisateur..."
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
                  <option value="suspendu">Suspendu</option>
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

      {/* Tableau Principal - SIMPLIFIÉ (5 colonnes seulement) */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        {/* En-tête du tableau avec actions - COMPACT */}
        <div className="px-4 py-3 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5">
                <input
                  type="checkbox"
                  checked={selectedRows.length === currentUtilisateurs.length && currentUtilisateurs.length > 0}
                  onChange={selectAllRows}
                  className="w-3.5 h-3.5 text-violet-600 rounded focus:ring-violet-500 border-gray-300"
                />
                <span className="text-xs text-gray-700">
                  {selectedRows.length} sélectionné(s)
                </span>
              </div>
              {selectedRows.length > 0 && (
                <div className="flex items-center gap-1.5">
                  <button className="px-2 py-1 bg-violet-50 text-violet-700 rounded text-xs font-medium hover:bg-violet-100 transition-colors">
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

        {/* Tableau SIMPLIFIÉ */}
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead>
              <tr className="bg-gradient-to-r from-gray-50 to-gray-100">
                <th scope="col" className="px-3 py-2 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider border-r border-gray-300">
                  <div className="flex items-center gap-1.5">
                    <input
                      type="checkbox"
                      checked={selectedRows.length === currentUtilisateurs.length && currentUtilisateurs.length > 0}
                      onChange={selectAllRows}
                      className="w-3.5 h-3.5 text-violet-600 rounded focus:ring-violet-500 border-gray-300"
                    />
                    ID
                  </div>
                </th>
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
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {currentUtilisateurs.length === 0 ? (
                <tr>
                  <td colSpan="5" className="px-3 py-6 text-center">
                    <div className="flex flex-col items-center justify-center">
                      <div className="w-16 h-16 bg-gradient-to-br from-gray-100 to-gray-200 rounded-full flex items-center justify-center mb-3">
                        <FiUsers className="w-8 h-8 text-gray-400" />
                      </div>
                      <h3 className="text-base font-semibold text-gray-900 mb-1.5">
                        {utilisateurs.length === 0 ? 'Aucun utilisateur trouvé' : 'Aucun résultat pour votre recherche'}
                      </h3>
                      <p className="text-gray-600 mb-4 max-w-md text-sm">
                        {utilisateurs.length === 0 
                          ? 'Commencez par créer votre premier utilisateur' 
                          : 'Essayez de modifier vos critères de recherche ou de filtres'}
                      </p>
                      {utilisateurs.length === 0 && (
                        <button 
                          onClick={handleNewUtilisateur}
                          className="px-4 py-1.5 bg-gradient-to-r from-violet-600 to-violet-500 text-white rounded-lg hover:from-violet-700 hover:to-violet-600 transition-all duration-300 font-medium flex items-center gap-1.5 text-sm"
                        >
                          <FiPlus />
                          Créer mon premier utilisateur
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                currentUtilisateurs.map((utilisateur) => (
                  <tr 
                    key={utilisateur.id}
                    className={`hover:bg-gradient-to-r hover:from-gray-50 hover:to-white transition-all duration-200 ${
                      selectedRows.includes(utilisateur.id) ? 'bg-gradient-to-r from-violet-50 to-violet-25' : 'bg-white'
                    }`}
                  >
                    <td className="px-3 py-2 whitespace-nowrap border-r border-gray-200">
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={selectedRows.includes(utilisateur.id)}
                          onChange={() => toggleRowSelection(utilisateur.id)}
                          className="w-3.5 h-3.5 text-violet-600 rounded focus:ring-violet-500 border-gray-300"
                        />
                        <span className="px-1.5 py-0.5 bg-gray-100 text-gray-800 rounded text-xs font-medium font-mono">
                          #{utilisateur.id}
                        </span>
                      </div>
                    </td>
                    <td className="px-3 py-2 border-r border-gray-200">
                      <div>
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 bg-gradient-to-br from-violet-100 to-violet-200 rounded-full flex items-center justify-center">
                            {utilisateur.photo ? (
                              <img 
                                src={utilisateur.photo} 
                                alt={utilisateur.email}
                                className="w-8 h-8 rounded-full object-cover"
                              />
                            ) : (
                              <FiUser className="w-4 h-4 text-violet-600" />
                            )}
                          </div>
                          <div>
                            <div className="text-sm font-semibold text-gray-900 truncate max-w-[150px]">{utilisateur.email}</div>
                            <div className="text-xs text-gray-500">@{utilisateur.username}</div>
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-2 border-r border-gray-200">
                      <div>
                        <div className="text-sm font-medium text-gray-900 truncate max-w-[150px]">
                          {utilisateur.first_name} {utilisateur.last_name}
                        </div>
                        <div className="text-xs text-gray-500 truncate max-w-[150px]">
                          {utilisateur.telephone || 'Aucun téléphone'}
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-2 border-r border-gray-200">
                      <div className="flex items-center">
                        <div className={`px-2 py-1 rounded flex items-center gap-1 ${
                          utilisateur.statut === 'actif'
                            ? 'bg-gradient-to-r from-green-50 to-emerald-50 text-green-700 border border-green-200' 
                            : utilisateur.statut === 'inactif'
                            ? 'bg-gradient-to-r from-red-50 to-pink-50 text-red-700 border border-red-200'
                            : 'bg-gradient-to-r from-yellow-50 to-orange-50 text-yellow-700 border border-yellow-200'
                        }`}>
                          {utilisateur.statut === 'actif' ? (
                            <>
                              <div className="w-1.5 h-1.5 bg-green-500 rounded-full"></div>
                              <span className="text-xs font-medium">Actif</span>
                            </>
                          ) : utilisateur.statut === 'inactif' ? (
                            <>
                              <div className="w-1.5 h-1.5 bg-red-500 rounded-full"></div>
                              <span className="text-xs font-medium">Inactif</span>
                            </>
                          ) : (
                            <>
                              <div className="w-1.5 h-1.5 bg-yellow-500 rounded-full"></div>
                              <span className="text-xs font-medium">Suspendu</span>
                            </>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => handleViewDetails(utilisateur)}
                          className="p-1.5 bg-gradient-to-r from-gray-50 to-gray-100 text-gray-700 rounded-lg hover:from-gray-100 hover:to-gray-200 transition-all duration-200 shadow-sm hover:shadow"
                          title="Voir détails"
                        >
                          <FiEye size={14} />
                        </button>
                        <button
                          onClick={() => handleToggleStatut(utilisateur)}
                          className={`p-1.5 rounded-lg transition-all duration-200 shadow-sm hover:shadow ${
                            utilisateur.statut === 'actif'
                              ? 'bg-gradient-to-r from-orange-50 to-orange-100 text-orange-700 hover:from-orange-100 hover:to-orange-200'
                              : 'bg-gradient-to-r from-green-50 to-green-100 text-green-700 hover:from-green-100 hover:to-green-200'
                          }`}
                          title={utilisateur.statut === 'actif' ? 'Désactiver' : 'Activer'}
                        >
                          {utilisateur.statut === 'actif' ? (
                            <FiLock size={14} />
                          ) : (
                            <FiUnlock size={14} />
                          )}
                        </button>
                        <button
                          onClick={() => handleEdit(utilisateur)}
                          className="p-1.5 bg-gradient-to-r from-violet-50 to-violet-100 text-violet-700 rounded-lg hover:from-violet-100 hover:to-violet-200 transition-all duration-200 shadow-sm hover:shadow"
                          title="Modifier"
                        >
                          <FiEdit2 size={14} />
                        </button>
                        <button
                          onClick={() => handleDelete(utilisateur)}
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

        {/* Pagination - COMPACT */}
        {filteredUtilisateurs.length > 0 && (
          <div className="px-4 py-3 border-t border-gray-200 bg-gradient-to-r from-gray-50 to-white">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs text-gray-700">
                    Page {currentPage} sur {totalPages}
                  </span>
                  <span className="text-gray-300">•</span>
                  <span className="text-xs text-gray-700">
                    {indexOfFirstItem + 1}-{Math.min(indexOfLastItem, filteredUtilisateurs.length)} sur {filteredUtilisateurs.length} utilisateurs
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
        <UtilisateurFormModal
          utilisateur={editingUtilisateur}
          groupes={groupes}
          loadingGroups={loadingGroups}
          onClose={() => {
            setShowForm(false);
            setEditingUtilisateur(null);
          }}
          onSuccess={handleFormSuccess}
        />
      )}

      {/* Modal de détails */}
      {showDetailModal && selectedUtilisateur && (
        <UtilisateurDetailModal
          utilisateur={selectedUtilisateur}
          onClose={() => {
            setShowDetailModal(false);
            setSelectedUtilisateur(null);
          }}
        />
      )}
    </div>
  );
}

// MODAL DE DÉTAILS POUR LES UTILISATEURS
function UtilisateurDetailModal({ utilisateur, onClose }) {
  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-3 z-50 backdrop-blur-sm">
      <div className="bg-white rounded-lg w-full max-w-4xl max-h-[90vh] overflow-y-auto shadow-xl">
        {/* Header du modal */}
        <div className="sticky top-0 bg-gradient-to-r from-violet-600 to-violet-500 text-white rounded-t-lg p-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-white/20 backdrop-blur-sm rounded">
                <FiUser className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-base font-bold">Détails de l'utilisateur</h2>
                <p className="text-violet-100 text-xs mt-0.5">{utilisateur.email}</p>
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
                <p className="text-xs font-medium text-gray-500 mb-0.5">Photo de profil</p>
                <div className="flex items-center gap-3">
                  <div className="w-16 h-16 bg-gradient-to-br from-violet-100 to-violet-200 rounded-full flex items-center justify-center overflow-hidden">
                    {utilisateur.photo ? (
                      <img 
                        src={utilisateur.photo} 
                        alt={utilisateur.email}
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
                <p className="text-sm text-gray-900 font-medium">{utilisateur.email}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500 mb-0.5">Nom d'utilisateur</p>
                <p className="text-sm text-gray-900">@{utilisateur.username}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500 mb-0.5">Nom complet</p>
                <p className="text-sm text-gray-900">
                  {utilisateur.first_name} {utilisateur.last_name}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500 mb-0.5">Téléphone</p>
                <p className="text-sm text-gray-900">{utilisateur.telephone || '-'}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500 mb-0.5">Statut</p>
                <div className={`px-2 py-1 rounded inline-flex items-center gap-1 ${
                  utilisateur.statut === 'actif'
                    ? 'bg-gradient-to-r from-green-50 to-emerald-50 text-green-700 border border-green-200' 
                    : utilisateur.statut === 'inactif'
                    ? 'bg-gradient-to-r from-red-50 to-pink-50 text-red-700 border border-red-200'
                    : 'bg-gradient-to-r from-yellow-50 to-orange-50 text-yellow-700 border border-yellow-200'
                }`}>
                  {utilisateur.statut === 'actif' ? (
                    <>
                      <div className="w-1.5 h-1.5 bg-green-500 rounded-full"></div>
                      <span className="text-xs font-medium">Actif</span>
                    </>
                  ) : utilisateur.statut === 'inactif' ? (
                    <>
                      <div className="w-1.5 h-1.5 bg-red-500 rounded-full"></div>
                      <span className="text-xs font-medium">Inactif</span>
                    </>
                  ) : (
                    <>
                      <div className="w-1.5 h-1.5 bg-yellow-500 rounded-full"></div>
                      <span className="text-xs font-medium">Suspendu</span>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Informations du compte */}
          <div className="bg-gradient-to-br from-violet-50 to-white rounded-lg p-3 border border-violet-100">
            <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-1.5">
              <div className="w-1 h-4 bg-gradient-to-b from-violet-600 to-violet-400 rounded"></div>
              Informations du compte
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <p className="text-xs font-medium text-gray-500 mb-0.5">Date de création</p>
                <p className="text-sm text-gray-900">
                  {utilisateur.date_joined ? new Date(utilisateur.date_joined).toLocaleDateString('fr-FR') : '-'}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500 mb-0.5">Dernière modification</p>
                <p className="text-sm text-gray-900">
                  {utilisateur.date_modified ? new Date(utilisateur.date_modified).toLocaleDateString('fr-FR') : '-'}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500 mb-0.5">Dernière connexion</p>
                <p className="text-sm text-gray-900">
                  {utilisateur.last_login ? new Date(utilisateur.last_login).toLocaleDateString('fr-FR') : 'Jamais'}
                </p>
              </div>
            </div>
          </div>

          {/* Groupes */}
          <div className="bg-gradient-to-br from-purple-50 to-white rounded-lg p-3 border border-purple-100">
            <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-1.5">
              <div className="w-1 h-4 bg-gradient-to-b from-purple-600 to-purple-400 rounded"></div>
              Groupes d'appartenance
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {utilisateur.groups?.length > 0 ? (
                utilisateur.groups.map(groupe => (
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

// COMPOSANT MODAL POUR LES UTILISATEURS - FORMULAIRE COMPACT
function UtilisateurFormModal({ utilisateur, groupes, loadingGroups, onClose, onSuccess }) {
  const [formData, setFormData] = useState({
    email: utilisateur?.email || '',
    first_name: utilisateur?.first_name || '',
    last_name: utilisateur?.last_name || '',
    telephone: utilisateur?.telephone || '',
    statut: utilisateur?.statut || 'actif',
    groups: utilisateur?.groups?.map(g => g.id) || [],
  });

  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(utilisateur?.photo || null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    console.log('👤 Utilisateur en édition:', utilisateur);
    console.log('👤 Groupes IDs:', utilisateur?.groups?.map(g => g.id));
  }, [utilisateur]);

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
      if (utilisateur) {
        // MODIFICATION - Utiliser PATCH pour mise à jour partielle
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
        console.log('📤 URL:', `/users/${utilisateur.id}/`);
        
        const response = await apiClient.patch(`/users/${utilisateur.id}/`, patchData);
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
      console.error('❌ Détails erreur:', err.response?.data);
      console.error('❌ Statut erreur:', err.response?.status);
      
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
        {/* Header du modal - COMPACT */}
        <div className="sticky top-0 bg-gradient-to-r from-violet-600 to-violet-500 text-white rounded-t-lg p-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-white/20 backdrop-blur-sm rounded">
                <FiUser className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-base font-bold">
                  {utilisateur ? 'Modifier l\'utilisateur' : 'Nouvel Utilisateur'}
                </h2>
                {!utilisateur && (
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
          {/* Section 1: Photo de profil - COMPACT */}
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

          {/* Section 2: Informations Générales - COMPACT */}
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
                {!utilisateur && (
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
                  <option value="suspendu">Suspendu</option>
                </select>
              </div>
            </div>
          </div>

          {/* Section 3: Groupes d'appartenance - COMPACT */}
          <div className="bg-gradient-to-br from-violet-50 to-purple-50 rounded-lg p-3 border border-violet-200">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-1 h-4 bg-gradient-to-b from-violet-600 to-violet-400 rounded"></div>
              <h3 className="text-sm font-semibold text-gray-900">Groupes d'appartenance</h3>
            </div>

            {loadingGroups ? (
              <div className="text-center py-3">
                <div className="inline-block animate-spin rounded-full h-5 w-5 border-b-2 border-violet-600"></div>
                <p className="text-gray-500 mt-1 text-sm">Chargement des groupes...</p>
              </div>
            ) : groupes.length === 0 ? (
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
          {!utilisateur && (
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
                      : formData.statut === 'inactif'
                      ? 'bg-red-100 text-red-800'
                      : 'bg-yellow-100 text-yellow-800'
                  }`}>
                    {formData.statut === 'actif' ? 'Actif' : formData.statut === 'inactif' ? 'Inactif' : 'Suspendu'}
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
          
          {/* Boutons d'action - COMPACT */}
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
                  <span>{utilisateur ? 'Mettre à jour' : 'Créer l\'utilisateur'}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}