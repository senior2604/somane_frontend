import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { apiClient } from '../../services/apiClient';
import { 
  FiRefreshCw, FiPlus, FiEdit2, FiTrash2, FiSearch, FiFilter, FiX, 
  FiCheck, FiUsers, FiChevronLeft, FiChevronRight, FiDownload, FiUpload,
  FiChevronDown, FiChevronUp, FiCheckCircle, FiXCircle, FiShield, FiKey,
  FiLock, FiUnlock, FiEye, FiMoreVertical, FiFolder, FiLayers,
  FiDatabase, FiBriefcase, FiSettings, FiEyeOff
} from "react-icons/fi";

// Types d'accès comme spécifié dans l'Excel (sans les emojis et sans icônes)
const TYPES_ACCES = [
  { value: 'aucun', label: 'Aucun accès', color: 'red', bgColor: 'bg-red-100', textColor: 'text-red-800', borderColor: 'border-red-300' },
  { value: 'lecture', label: 'Lecture seule', color: 'blue', bgColor: 'bg-blue-100', textColor: 'text-blue-800', borderColor: 'border-blue-300' },
  { value: 'ecriture', label: 'Lecture/Écriture', color: 'green', bgColor: 'bg-green-100', textColor: 'text-green-800', borderColor: 'border-green-300' },
  { value: 'validation', label: 'Validation', color: 'purple', bgColor: 'bg-purple-100', textColor: 'text-purple-800', borderColor: 'border-purple-300' },
  { value: 'suppression', label: 'Suppression', color: 'orange', bgColor: 'bg-orange-100', textColor: 'text-orange-800', borderColor: 'border-orange-300' },
  { value: 'personnalise', label: 'Personnalisé', color: 'gray', bgColor: 'bg-gray-100', textColor: 'text-gray-800', borderColor: 'border-gray-300' }
];

export default function PermissionsPage() {
  const [permissions, setPermissions] = useState([]);
  const [groupes, setGroupes] = useState([]);
  const [modules, setModules] = useState([]);
  const [entites, setEntites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editingPermission, setEditingPermission] = useState(null);
  
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterGroupe, setFilterGroupe] = useState('');
  const [filterModule, setFilterModule] = useState('');
  const [filterStatut, setFilterStatut] = useState('actif'); // Garder seulement Groupe et Statut comme filtres principaux
  const [selectedRows, setSelectedRows] = useState([]);
  const [expandedRow, setExpandedRow] = useState(null);

  // Fonction pour extraire les données de la réponse API
  const extractData = useCallback((response) => {
    if (!response) return [];
    if (Array.isArray(response)) return response;
    if (response.data && Array.isArray(response.data)) return response.data;
    if (response.results && Array.isArray(response.results)) return response.results;
    return [];
  }, []);

  const fetchAllData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      console.log('🔄 Début du chargement des données permissions...');

      // Chargement parallèle de toutes les données
      const [permissionsRes, groupesRes, modulesRes, entitesRes] = await Promise.all([
        apiClient.get('/permissions/'),
        apiClient.get('/groupes/'),
        apiClient.get('/modules/'),
        apiClient.get('/entites/')
      ]);

      console.log('✅ Réponses API reçues');

      // Extraction des données
      const permissionsData = extractData(permissionsRes);
      const groupesData = extractData(groupesRes);
      const modulesData = extractData(modulesRes);
      const entitesData = extractData(entitesRes);

      setPermissions(permissionsData);
      setGroupes(groupesData);
      setModules(modulesData);
      setEntites(entitesData);

      console.log(`📊 ${permissionsData.length} permissions chargées`);
      console.log(`👥 ${groupesData.length} groupes chargés`);
      console.log(`📦 ${modulesData.length} modules chargés`);
      console.log(`🏢 ${entitesData.length} entités chargées`);

    } catch (err) {
      console.error('❌ Erreur détaillée:', err);
      let errorMessage = 'Erreur lors du chargement des données';
      
      if (err.response) {
        const status = err.response.status;
        if (status === 401) errorMessage = 'Non authentifié';
        else if (status === 403) errorMessage = 'Accès refusé';
        else if (status === 404) errorMessage = 'API non trouvée';
        else if (status >= 500) errorMessage = 'Erreur serveur';
        else errorMessage = `Erreur ${status}`;
      } else if (err.request) {
        errorMessage = 'Serveur inaccessible';
      } else {
        errorMessage = err.message || 'Erreur inconnue';
      }

      setError(errorMessage);
      setPermissions([]);
      setGroupes([]);
      setModules([]);
      setEntites([]);
    } finally {
      setLoading(false);
    }
  }, [extractData]);

  useEffect(() => {
    fetchAllData();
  }, [fetchAllData]);

  // Filtrage et recherche avec useMemo
  const filteredPermissions = useMemo(() => {
    return permissions.filter(permission => {
      const searchLower = searchTerm.toLowerCase();
      const matchesSearch = 
        permission.groupe_details?.name?.toLowerCase().includes(searchLower) ||
        permission.module_details?.nom_affiche?.toLowerCase().includes(searchLower) ||
        permission.entite_details?.raison_sociale?.toLowerCase().includes(searchLower) ||
        permission.acces?.toLowerCase().includes(searchLower);
      
      const matchesGroupe = !filterGroupe || permission.groupe?.id?.toString() === filterGroupe;
      const matchesModule = !filterModule || permission.module?.id?.toString() === filterModule;
      const matchesStatut = filterStatut === 'actif' ? permission.statut : 
                           filterStatut === 'inactif' ? !permission.statut : true;
      
      return matchesSearch && matchesGroupe && matchesModule && matchesStatut;
    });
  }, [permissions, searchTerm, filterGroupe, filterModule, filterStatut]);

  // Calculs pour la pagination
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentPermissions = useMemo(() => 
    filteredPermissions.slice(indexOfFirstItem, indexOfLastItem),
    [filteredPermissions, indexOfFirstItem, indexOfLastItem]
  );
  const totalPages = Math.ceil(filteredPermissions.length / itemsPerPage);

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
    if (selectedRows.length === currentPermissions.length) {
      setSelectedRows([]);
    } else {
      setSelectedRows(currentPermissions.map(permission => permission.id));
    }
  }, [currentPermissions, selectedRows.length]);

  // Gestion des lignes expansibles
  const toggleExpandRow = (id) => {
    setExpandedRow(expandedRow === id ? null : id);
  };

  // Gestion des actions
  const handleNewPermission = () => {
    setEditingPermission(null);
    setShowForm(true);
  };

  const handleEdit = (permission) => {
    setEditingPermission(permission);
    setShowForm(true);
  };

  const handleDelete = async (permission) => {
    if (window.confirm(`Êtes-vous sûr de vouloir supprimer la permission du groupe "${permission.groupe_details?.name}" sur le module "${permission.module_details?.nom_affiche}" ? Cette action est irréversible.`)) {
      try {
        await apiClient.delete(`/permissions/${permission.id}/`);
        fetchAllData();
      } catch (err) {
        setError('Erreur lors de la suppression: ' + (err.message || 'Erreur inconnue'));
        console.error('Error deleting permission:', err);
      }
    }
  };

  const handleToggleStatut = async (permission) => {
    try {
      await apiClient.patch(`/permissions/${permission.id}/`, {
        statut: !permission.statut
      });
      fetchAllData();
    } catch (err) {
      setError('Erreur lors de la modification du statut: ' + (err.message || 'Erreur inconnue'));
      console.error('Error toggling permission status:', err);
    }
  };

  const handleFormSuccess = () => {
    setShowForm(false);
    setEditingPermission(null);
    fetchAllData();
  };

  const handleRetry = () => {
    fetchAllData();
  };

  const resetFilters = () => {
    setSearchTerm('');
    setFilterGroupe('');
    setFilterModule('');
    setFilterStatut('actif');
    setCurrentPage(1);
  };

  // Obtenir le libellé du type d'accès
  const getAccesLabel = (accesValue) => {
    const type = TYPES_ACCES.find(t => t.value === accesValue);
    return type ? type.label : 'Inconnu';
  };

  // Obtenir les classes CSS pour le badge d'accès
  const getAccesBadgeClasses = (accesValue) => {
    const type = TYPES_ACCES.find(t => t.value === accesValue);
    return type ? `${type.bgColor} ${type.textColor} ${type.borderColor}` : 'bg-gray-100 text-gray-800 border-gray-300';
  };

  // Statistiques
  const stats = useMemo(() => ({
    total: permissions.length,
    actives: permissions.filter(p => p.statut).length,
    inactives: permissions.filter(p => !p.statut).length,
    groupesUniques: new Set(permissions.map(p => p.groupe?.id)).size
  }), [permissions]);

  if (loading) {
    return (
      <div className="p-6 bg-gradient-to-br from-gray-50 to-white min-h-screen">
        <div className="flex flex-col items-center justify-center h-96">
          <div className="relative">
            <div className="w-16 h-16 border-4 border-gray-200 rounded-full"></div>
            <div className="absolute top-0 left-0 w-16 h-16 border-4 border-violet-600 border-t-transparent rounded-full animate-spin"></div>
          </div>
          <div className="mt-6">
            <div className="h-2 bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 rounded-full w-48 animate-pulse"></div>
            <div className="h-2 bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 rounded-full w-32 mt-3 animate-pulse mx-auto"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 bg-gradient-to-br from-gray-50 to-white min-h-screen">
      {/* Header avec gradient - COULEUR VIOLETTE */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-gradient-to-br from-violet-600 to-violet-500 rounded-xl shadow-lg">
              <FiShield className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Gestion des Permissions</h1>
              <p className="text-gray-600 text-sm mt-1">
                Gérez les permissions d'accès aux modules par groupe
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button 
              onClick={handleRetry}
              className="px-4 py-2.5 rounded-xl border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 transition-all duration-300 hover:shadow-md flex items-center gap-2 group"
            >
              <FiRefreshCw className={`${loading ? 'animate-spin' : 'group-hover:rotate-180 transition-transform duration-500'}`} />
              <span className="font-medium">Actualiser</span>
            </button>
            <button 
              onClick={handleNewPermission}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-violet-500 text-white hover:from-violet-700 hover:to-violet-600 transition-all duration-300 hover:shadow-lg flex items-center gap-2 group shadow-md"
            >
              <FiPlus className="group-hover:rotate-90 transition-transform duration-300" />
              <span className="font-semibold">Nouvelle Permission</span>
            </button>
          </div>
        </div>

        {/* Statistiques en ligne - 4 CARTES - COULEUR VIOLETTE */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm hover:shadow-md transition-shadow duration-300">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total des permissions</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{stats.total}</p>
              </div>
              <div className="p-2 bg-violet-50 rounded-lg">
                <FiShield className="w-5 h-5 text-violet-600" />
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm hover:shadow-md transition-shadow duration-300">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Permissions actives</p>
                <p className="text-2xl font-bold text-green-600 mt-1">{stats.actives}</p>
              </div>
              <div className="p-2 bg-green-50 rounded-lg">
                <FiCheckCircle className="w-5 h-5 text-green-600" />
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm hover:shadow-md transition-shadow duration-300">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Permissions inactives</p>
                <p className="text-2xl font-bold text-red-600 mt-1">{stats.inactives}</p>
              </div>
              <div className="p-2 bg-red-50 rounded-lg">
                <FiXCircle className="w-5 h-5 text-red-600" />
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm hover:shadow-md transition-shadow duration-300">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Groupes concernés</p>
                <p className="text-2xl font-bold text-purple-600 mt-1">{stats.groupesUniques}</p>
              </div>
              <div className="p-2 bg-purple-50 rounded-lg">
                <FiUsers className="w-5 h-5 text-purple-600" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Message d'erreur */}
      {error && (
        <div className="mb-6">
          <div className="bg-gradient-to-r from-red-50 to-red-100 border-l-4 border-red-500 rounded-r-xl p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-red-100 rounded-lg">
                  <FiX className="w-5 h-5 text-red-600" />
                </div>
                <div>
                  <p className="font-medium text-red-900">{error}</p>
                  <p className="text-sm text-red-700 mt-1">Veuillez réessayer</p>
                </div>
              </div>
              <button
                onClick={handleRetry}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm font-medium shadow-sm"
              >
                Réessayer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* États vides */}
      {!error && permissions.length === 0 && (
        <div className="mb-6">
          <div className="bg-gradient-to-r from-yellow-50 to-yellow-100 border-l-4 border-yellow-500 rounded-r-xl p-4 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <FiShield className="w-5 h-5 text-yellow-600" />
              </div>
              <div>
                <p className="font-medium text-yellow-900">Aucune donnée disponible</p>
                <p className="text-sm text-yellow-700 mt-1">
                  Aucune permission n'a été trouvée. Créez une nouvelle permission ou vérifiez la configuration de l'API.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Barre d'outils - Filtres et Recherche - COULEUR VIOLETTE */}
      {(permissions.length > 0 || searchTerm || filterGroupe || filterStatut !== 'actif') && (
        <div className="mb-6">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-900">Filtres et Recherche</h3>
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600">
                  {filteredPermissions.length} résultat(s)
                </span>
                {(searchTerm || filterGroupe || filterStatut !== 'actif') && (
                  <button
                    onClick={resetFilters}
                    className="px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm font-medium flex items-center gap-1"
                  >
                    <FiX size={14} />
                    Effacer
                  </button>
                )}
              </div>
            </div>
            
            {/* RÉDUIT À 2 FILTRES AU LIEU DE 4 */}
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
              <div className="lg:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">Recherche</label>
                <div className="relative group">
                  <div className="absolute inset-0 bg-gradient-to-r from-violet-600 to-violet-500 rounded-xl blur opacity-0 group-hover:opacity-20 transition-opacity duration-300"></div>
                  <div className="relative">
                    <FiSearch className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 z-10" />
                    <input
                      type="text"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent bg-white relative z-10"
                      placeholder="Groupe, module, entité, accès..."
                    />
                  </div>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Groupe</label>
                <div className="relative">
                  <FiUsers className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  <select
                    value={filterGroupe}
                    onChange={(e) => setFilterGroupe(e.target.value)}
                    className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent bg-white appearance-none"
                  >
                    <option value="">Tous les groupes</option>
                    {groupes.map(groupe => (
                      <option key={groupe.id} value={groupe.id}>
                        {groupe.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Statut</label>
                <div className="relative">
                  <FiFilter className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  <select
                    value={filterStatut}
                    onChange={(e) => setFilterStatut(e.target.value)}
                    className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent bg-white appearance-none"
                  >
                    <option value="actif">Actives</option>
                    <option value="inactif">Inactives</option>
                  </select>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tableau Principal */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
        {/* En-tête du tableau avec actions - COULEUR VIOLETTE */}
        <div className="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={selectedRows.length === currentPermissions.length && currentPermissions.length > 0}
                  onChange={selectAllRows}
                  className="w-4 h-4 text-violet-600 rounded focus:ring-violet-500 border-gray-300"
                />
                <span className="text-sm text-gray-700">
                  {selectedRows.length} sélectionné(s)
                </span>
              </div>
              {selectedRows.length > 0 && (
                <div className="flex items-center gap-2">
                  <button className="px-3 py-1.5 bg-violet-50 text-violet-700 rounded-lg text-sm font-medium hover:bg-violet-100 transition-colors">
                    <FiDownload size={14} />
                  </button>
                  <button className="px-3 py-1.5 bg-red-50 text-red-700 rounded-lg text-sm font-medium hover:bg-red-100 transition-colors">
                    <FiTrash2 size={14} />
                  </button>
                </div>
              )}
            </div>
            <div className="flex items-center gap-3">
              <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors text-gray-600">
                <FiDownload size={18} />
              </button>
              <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors text-gray-600">
                <FiUpload size={18} />
              </button>
              <select
                value={itemsPerPage}
                onChange={(e) => {
                  setItemsPerPage(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
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
                <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider border-r border-gray-300">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={selectedRows.length === currentPermissions.length && currentPermissions.length > 0}
                      onChange={selectAllRows}
                      className="w-4 h-4 text-violet-600 rounded focus:ring-violet-500 border-gray-300"
                    />
                    ID
                  </div>
                </th>
                <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider border-r border-gray-300">
                  Groupe
                </th>
                <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider border-r border-gray-300">
                  Module
                </th>
                <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider border-r border-gray-300">
                  Entité
                </th>
                <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider border-r border-gray-300">
                  Type d'accès
                </th>
                <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider border-r border-gray-300">
                  Statut
                </th>
                <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {currentPermissions.length === 0 ? (
                <tr>
                  <td colSpan="7" className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center justify-center">
                      <div className="w-20 h-20 bg-gradient-to-br from-gray-100 to-gray-200 rounded-full flex items-center justify-center mb-4">
                        <FiShield className="w-10 h-10 text-gray-400" />
                      </div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">
                        {permissions.length === 0 ? 'Aucune permission trouvée' : 'Aucun résultat pour votre recherche'}
                      </h3>
                      <p className="text-gray-600 mb-6 max-w-md">
                        {permissions.length === 0 
                          ? 'Commencez par créer votre première permission' 
                          : 'Essayez de modifier vos critères de recherche ou de filtres'}
                      </p>
                      {permissions.length === 0 && (
                        <button 
                          onClick={handleNewPermission}
                          className="px-5 py-2.5 bg-gradient-to-r from-violet-600 to-violet-500 text-white rounded-xl hover:from-violet-700 hover:to-violet-600 transition-all duration-300 font-medium flex items-center gap-2"
                        >
                          <FiPlus />
                          Créer ma première permission
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                currentPermissions.map((permission) => {
                  return (
                    <React.Fragment key={permission.id}>
                      <tr 
                        className={`hover:bg-gradient-to-r hover:from-gray-50 hover:to-white transition-all duration-200 ${
                          selectedRows.includes(permission.id) ? 'bg-gradient-to-r from-violet-50 to-violet-25' : 'bg-white'
                        } ${expandedRow === permission.id ? 'bg-gradient-to-r from-violet-50 to-violet-25' : ''}`}
                      >
                        <td className="px-6 py-4 whitespace-nowrap border-r border-gray-200">
                          <div className="flex items-center gap-3">
                            <input
                              type="checkbox"
                              checked={selectedRows.includes(permission.id)}
                              onChange={() => toggleRowSelection(permission.id)}
                              className="w-4 h-4 text-violet-600 rounded focus:ring-violet-500 border-gray-300"
                            />
                            <button
                              onClick={() => toggleExpandRow(permission.id)}
                              className="p-1 hover:bg-gray-100 rounded transition-colors"
                            >
                              {expandedRow === permission.id ? <FiChevronUp size={14} /> : <FiChevronDown size={14} />}
                            </button>
                            <span className="px-2 py-1 bg-gray-100 text-gray-800 rounded text-xs font-medium font-mono">
                              #{permission.id}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 border-r border-gray-200">
                          <div className="flex items-start gap-3">
                            {/* ICÔNE RETIRÉE */}
                            <div>
                              <div className="text-sm font-semibold text-gray-900">{permission.groupe_details?.name || 'N/A'}</div>
                              <div className="text-xs text-gray-500">
                                Groupe ID: {permission.groupe?.id || 'N/A'}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 border-r border-gray-200">
                          <div className="flex items-start gap-3">
                            {/* ICÔNE RETIRÉE */}
                            <div>
                              <div className="text-sm font-semibold text-gray-900">{permission.module_details?.nom_affiche || 'N/A'}</div>
                              <div className="text-xs text-gray-500">
                                Module ID: {permission.module?.id || 'N/A'}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 border-r border-gray-200">
                          <div className="flex items-start gap-3">
                            {/* ICÔNE RETIRÉE */}
                            <div>
                              <div className="text-sm font-semibold text-gray-900">
                                {permission.entite_details?.raison_sociale || 'Toutes'}
                              </div>
                              <div className="text-xs text-gray-500">
                                {permission.entite ? `Entité ID: ${permission.entite}` : 'Toutes les entités'}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 border-r border-gray-200">
                          <div className={`inline-flex items-center px-3 py-1.5 rounded-lg border ${getAccesBadgeClasses(permission.acces)}`}>
                            {/* ICÔNE RETIRÉE */}
                            <span className="text-sm font-medium">{getAccesLabel(permission.acces)}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 border-r border-gray-200">
                          <button
                            onClick={() => handleToggleStatut(permission)}
                            className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border text-sm font-medium transition-all duration-200 shadow-sm hover:shadow ${
                              permission.statut
                                ? 'bg-gradient-to-r from-green-50 to-emerald-50 text-green-700 border-green-200 hover:from-green-100 hover:to-emerald-100' 
                                : 'bg-gradient-to-r from-gray-50 to-gray-100 text-gray-700 border-gray-200 hover:from-gray-100 hover:to-gray-200'
                            }`}
                          >
                            {permission.statut ? (
                              <>
                                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                                <span>Active</span>
                              </>
                            ) : (
                              <>
                                <div className="w-2 h-2 bg-gray-500 rounded-full"></div>
                                <span>Inactive</span>
                              </>
                            )}
                          </button>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleEdit(permission)}
                              className="p-2.5 bg-gradient-to-r from-violet-50 to-violet-100 text-violet-700 rounded-xl hover:from-violet-100 hover:to-violet-200 transition-all duration-200 shadow-sm hover:shadow"
                              title="Modifier"
                            >
                              <FiEdit2 size={17} />
                            </button>
                            <button
                              onClick={() => handleDelete(permission)}
                              className="p-2.5 bg-gradient-to-r from-red-50 to-red-100 text-red-700 rounded-xl hover:from-red-100 hover:to-red-200 transition-all duration-200 shadow-sm hover:shadow"
                              title="Supprimer"
                            >
                              <FiTrash2 size={17} />
                            </button>
                          </div>
                        </td>
                      </tr>
                      {expandedRow === permission.id && (
                        <tr className="bg-gradient-to-r from-violet-50 to-violet-25">
                          <td colSpan="7" className="px-6 py-4">
                            <div className="bg-white rounded-xl border border-violet-200 p-5">
                              <div className="grid grid-cols-3 gap-6">
                                <div>
                                  <div className="text-xs font-semibold text-gray-500 uppercase mb-2">ID Permission</div>
                                  <div className="text-sm text-gray-900 font-mono">#{permission.id}</div>
                                </div>
                                <div>
                                  <div className="text-xs font-semibold text-gray-500 uppercase mb-2">Groupe</div>
                                  <div className="text-sm text-gray-900 font-medium">{permission.groupe_details?.name || 'N/A'}</div>
                                </div>
                                <div>
                                  <div className="text-xs font-semibold text-gray-500 uppercase mb-2">Module</div>
                                  <div className="text-sm text-gray-900 font-medium">{permission.module_details?.nom_affiche || 'N/A'}</div>
                                </div>
                                <div>
                                  <div className="text-xs font-semibold text-gray-500 uppercase mb-2">Entité</div>
                                  <div className="text-sm text-gray-900">
                                    {permission.entite_details?.raison_sociale || 'Toutes les entités'}
                                  </div>
                                </div>
                                <div>
                                  <div className="text-xs font-semibold text-gray-500 uppercase mb-2">Type d'accès</div>
                                  <div className={`inline-flex items-center px-3 py-1.5 rounded-lg border ${getAccesBadgeClasses(permission.acces)}`}>
                                    {/* ICÔNE RETIRÉE */}
                                    <span className="text-sm font-medium">{getAccesLabel(permission.acces)}</span>
                                  </div>
                                </div>
                                <div>
                                  <div className="text-xs font-semibold text-gray-500 uppercase mb-2">Statut</div>
                                  <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border text-sm font-medium ${
                                    permission.statut
                                      ? 'bg-gradient-to-r from-green-50 to-emerald-50 text-green-700 border-green-200' 
                                      : 'bg-gradient-to-r from-gray-50 to-gray-100 text-gray-700 border-gray-200'
                                  }`}>
                                    {permission.statut ? (
                                      <>
                                        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                                        <span>Active</span>
                                      </>
                                    ) : (
                                      <>
                                        <div className="w-2 h-2 bg-gray-500 rounded-full"></div>
                                        <span>Inactive</span>
                                      </>
                                    )}
                                  </div>
                                </div>
                                {permission.description && (
                                  <div className="col-span-3">
                                    <div className="text-xs font-semibold text-gray-500 uppercase mb-2">Description</div>
                                    <div className="text-sm text-gray-900">{permission.description}</div>
                                  </div>
                                )}
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination - COULEUR VIOLETTE */}
        {filteredPermissions.length > 0 && (
          <div className="px-6 py-4 border-t border-gray-200 bg-gradient-to-r from-gray-50 to-white">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-700">
                    Page {currentPage} sur {totalPages}
                  </span>
                  <span className="text-gray-300">•</span>
                  <span className="text-sm text-gray-700">
                    {indexOfFirstItem + 1}-{Math.min(indexOfLastItem, filteredPermissions.length)} sur {filteredPermissions.length} permissions
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={prevPage}
                  disabled={currentPage === 1}
                  className={`p-2 rounded-lg border transition-all duration-200 ${
                    currentPage === 1
                      ? 'bg-gray-100 text-gray-400 border-gray-300 cursor-not-allowed'
                      : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50 hover:border-gray-400 hover:shadow-sm'
                  }`}
                  title="Page précédente"
                >
                  <FiChevronLeft />
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
                        className={`min-w-[40px] h-10 rounded-lg border text-sm font-medium transition-all duration-200 ${
                          currentPage === pageNumber
                            ? 'bg-gradient-to-r from-violet-600 to-violet-500 text-white border-violet-600 shadow-md'
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
                  className={`p-2 rounded-lg border transition-all duration-200 ${
                    currentPage === totalPages
                      ? 'bg-gray-100 text-gray-400 border-gray-300 cursor-not-allowed'
                      : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50 hover:border-gray-400 hover:shadow-sm'
                  }`}
                  title="Page suivante"
                >
                  <FiChevronRight />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Formulaire Modal */}
      {showForm && (
        <PermissionFormModal
          permission={editingPermission}
          groupes={groupes}
          modules={modules}
          entites={entites}
          onClose={() => {
            setShowForm(false);
            setEditingPermission(null);
          }}
          onSuccess={handleFormSuccess}
        />
      )}
    </div>
  );
}

// COMPOSANT MODAL POUR LES PERMISSIONS - DESIGN AVEC VIOLETTE
function PermissionFormModal({ permission, groupes, modules, entites, onClose, onSuccess }) {
  const [formData, setFormData] = useState({
    groupe: permission?.groupe?.id || '',
    module: permission?.module?.id || '',
    entite: permission?.entite?.id || '',
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

      await apiClient.request(url, {
        method: method,
        body: JSON.stringify(apiData),
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      onSuccess();
    } catch (err) {
      console.error('❌ Erreur formulaire:', err);
      const errorMessage = err.response?.data?.detail || err.message || 'Erreur lors de la sauvegarde';
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

  // Calcul des données pour l'aperçu
  const previewData = {
    groupe: groupes.find(g => g.id === parseInt(formData.groupe))?.name || 'Non sélectionné',
    module: modules.find(m => m.id === parseInt(formData.module))?.nom_affiche || 'Non sélectionné',
    entite: formData.entite 
      ? entites.find(e => e.id === parseInt(formData.entite))?.raison_sociale 
      : 'Toutes les entités',
    acces: TYPES_ACCES.find(t => t.value === formData.acces),
    statut: formData.statut ? 'Active' : 'Inactive'
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl">
        {/* Header du modal avec gradient - COULEUR VIOLETTE */}
        <div className="sticky top-0 bg-gradient-to-r from-violet-600 to-violet-500 text-white rounded-t-2xl p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white/20 backdrop-blur-sm rounded-lg">
                <FiShield className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg font-bold">
                  {permission ? 'Modifier la permission' : 'Nouvelle Permission'}
                </h2>
                <p className="text-violet-100 text-xs mt-0.5">
                  Définissez les accès d'un groupe à un module
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 hover:bg-white/20 rounded-lg transition-colors"
            >
              <FiX size={20} />
            </button>
          </div>
        </div>
        
        {error && (
          <div className="mx-6 mt-4 bg-gradient-to-r from-red-50 to-red-100 border-l-4 border-red-500 rounded-r-xl p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-100 rounded-lg">
                <FiX className="text-red-600" />
              </div>
              <span className="text-red-800 text-sm font-medium">{error}</span>
            </div>
          </div>
        )}
        
        <form onSubmit={handleSubmit} className="p-6 space-y-8">
          {/* Section 1: Informations Générales - COULEUR VIOLETTE */}
          <div className="bg-gradient-to-br from-gray-50 to-white rounded-2xl p-6 border border-gray-200">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-1.5 h-8 bg-gradient-to-b from-violet-600 to-violet-400 rounded-full"></div>
              <h3 className="text-lg font-semibold text-gray-900">Informations Générales</h3>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Groupe */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Groupe d'utilisateurs <span className="text-red-500">*</span>
                </label>
                <div className="relative group">
                  <div className="absolute inset-0 bg-gradient-to-r from-violet-600 to-violet-500 rounded-xl blur opacity-0 group-hover:opacity-10 transition-opacity duration-300"></div>
                  <div className="relative">
                    <FiUsers className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 z-10" />
                    <select
                      required
                      value={formData.groupe}
                      onChange={(e) => handleChange('groupe', e.target.value)}
                      className="relative w-full pl-12 pr-4 py-3.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent bg-white appearance-none"
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
              </div>
              
              {/* Module */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Module <span className="text-red-500">*</span>
                </label>
                <div className="relative group">
                  <div className="absolute inset-0 bg-gradient-to-r from-violet-600 to-violet-500 rounded-xl blur opacity-0 group-hover:opacity-10 transition-opacity duration-300"></div>
                  <div className="relative">
                    <FiLayers className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 z-10" />
                    <select
                      required
                      value={formData.module}
                      onChange={(e) => handleChange('module', e.target.value)}
                      className="relative w-full pl-12 pr-4 py-3.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent bg-white appearance-none"
                    >
                      <option value="">Sélectionnez un module</option>
                      {modules.map(module => (
                        <option key={module.id} value={module.id}>
                          {module.nom_affiche}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
              
              {/* Entité */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Entité (optionnel)
                </label>
                <div className="relative">
                  <FiBriefcase className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  <select
                    value={formData.entite}
                    onChange={(e) => handleChange('entite', e.target.value)}
                    className="w-full pl-12 pr-4 py-3.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent bg-white appearance-none"
                  >
                    <option value="">Toutes les entités</option>
                    {entites.map(entite => (
                      <option key={entite.id} value={entite.id}>
                        {entite.raison_sociale}
                      </option>
                    ))}
                  </select>
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  Laisser vide pour appliquer à toutes les entités
                </p>
              </div>
              
              {/* Type d'accès */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Type d'accès <span className="text-red-500">*</span>
                </label>
                <select
                  required
                  value={formData.acces}
                  onChange={(e) => handleChange('acces', e.target.value)}
                  className="w-full border border-gray-300 rounded-xl px-4 py-3.5 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                >
                  {TYPES_ACCES.map(type => {
                    return (
                      <option key={type.value} value={type.value}>
                        {type.label}
                      </option>
                    );
                  })}
                </select>
              </div>
              
              <div className="md:col-span-2">
                <label className="flex items-center gap-3 p-4 bg-gradient-to-r from-gray-50 to-gray-100 rounded-xl border border-gray-200 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.statut}
                    onChange={(e) => handleChange('statut', e.target.checked)}
                    className="w-5 h-5 text-violet-600 rounded focus:ring-violet-500 border-gray-300"
                  />
                  <div>
                    <span className="text-sm font-medium text-gray-700">Permission active</span>
                    <p className="text-xs text-gray-500 mt-1">
                      Les permissions inactives ne seront pas appliquées
                    </p>
                  </div>
                </label>
              </div>
            </div>
          </div>

          {/* Section 2: Aperçu - DESIGN AMÉLIORÉ */}
          <div className="bg-gradient-to-br from-violet-50 to-white rounded-2xl p-6 border border-violet-100">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-1.5 h-8 bg-gradient-to-b from-violet-600 to-violet-400 rounded-full"></div>
              <h3 className="text-lg font-semibold text-gray-900">Aperçu de la permission</h3>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white rounded-xl p-4 border border-gray-200">
                <div className="text-xs font-semibold text-gray-500 uppercase mb-2">Groupe</div>
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-violet-50 rounded-lg">
                    <FiUsers className="w-4 h-4 text-violet-600" />
                  </div>
                  <span className="text-sm font-medium text-gray-900">{previewData.groupe}</span>
                </div>
              </div>
              <div className="bg-white rounded-xl p-4 border border-gray-200">
                <div className="text-xs font-semibold text-gray-500 uppercase mb-2">Module</div>
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-50 rounded-lg">
                    <FiLayers className="w-4 h-4 text-blue-600" />
                  </div>
                  <span className="text-sm font-medium text-gray-900">{previewData.module}</span>
                </div>
              </div>
              <div className="bg-white rounded-xl p-4 border border-gray-200">
                <div className="text-xs font-semibold text-gray-500 uppercase mb-2">Entité</div>
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-green-50 rounded-lg">
                    <FiBriefcase className="w-4 h-4 text-green-600" />
                  </div>
                  <span className="text-sm font-medium text-gray-900">{previewData.entite}</span>
                </div>
              </div>
              <div className="bg-white rounded-xl p-4 border border-gray-200">
                <div className="text-xs font-semibold text-gray-500 uppercase mb-2">Type d'accès</div>
                <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border ${previewData.acces?.bgColor || 'bg-gray-100'} ${previewData.acces?.textColor || 'text-gray-800'} ${previewData.acces?.borderColor || 'border-gray-300'}`}>
                  <span className="text-sm font-medium">{previewData.acces?.label || 'Inconnu'}</span>
                </div>
              </div>
              <div className="col-span-2 bg-white rounded-xl p-4 border border-gray-200">
                <div className="text-xs font-semibold text-gray-500 uppercase mb-2">Statut</div>
                <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border text-sm font-medium ${
                  formData.statut
                    ? 'bg-gradient-to-r from-green-50 to-emerald-50 text-green-700 border-green-200' 
                    : 'bg-gradient-to-r from-gray-50 to-gray-100 text-gray-700 border-gray-200'
                }`}>
                  {formData.statut ? (
                    <>
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      <span>Active</span>
                    </>
                  ) : (
                    <>
                      <div className="w-2 h-2 bg-gray-500 rounded-full"></div>
                      <span>Inactive</span>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
          
          {/* Boutons d'action - COULEUR VIOLETTE */}
          <div className="flex justify-end gap-3 pt-6 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-3.5 border border-gray-300 rounded-xl text-gray-700 hover:bg-gray-50 transition-all duration-200 font-medium hover:shadow-sm"
              disabled={loading}
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-3.5 bg-gradient-to-r from-violet-600 to-violet-500 text-white rounded-xl hover:from-violet-700 hover:to-violet-600 disabled:opacity-50 transition-all duration-200 font-semibold flex items-center space-x-2 shadow-md hover:shadow-lg"
            >
              {loading ? (
                <>
                  <FiRefreshCw className="animate-spin" />
                  <span>Sauvegarde...</span>
                </>
              ) : (
                <>
                  <FiCheck />
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