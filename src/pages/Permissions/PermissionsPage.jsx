import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { apiClient } from '../../services/apiClient';
import { 
  FiRefreshCw, FiPlus, FiEdit2, FiTrash2, FiSearch, FiFilter, FiX, 
  FiCheck, FiUsers, FiChevronLeft, FiChevronRight, FiDownload, FiUpload,
  FiEye, FiCheckCircle, FiXCircle, FiShield, FiLayers, FiBriefcase
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
  const [permissions, setPermissions] = useState([]);
  const [groupes, setGroupes] = useState([]);
  const [modules, setModules] = useState([]);
  const [entites, setEntites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editingPermission, setEditingPermission] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedPermission, setSelectedPermission] = useState(null);
  
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterGroupe, setFilterGroupe] = useState('');
  const [filterModule, setFilterModule] = useState('');
  const [selectedRows, setSelectedRows] = useState([]);

  const fetchAllData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      console.log('🔄 Chargement des données...');

      // Chargement parallèle
      const [permissionsRes, groupesRes, modulesRes, entitesRes] = await Promise.all([
        apiClient.get('/permissions/'),
        apiClient.get('/groupes/'),
        apiClient.get('/modules/'),
        apiClient.get('/entites/')
      ]);

      console.log('📦 Données reçues:', {
        permissions: permissionsRes,
        groupes: groupesRes,
        modules: modulesRes,
        entites: entitesRes
      });

      // Extraction simple des données
      const getData = (response) => {
        if (!response) return [];
        if (Array.isArray(response)) return response;
        if (response.data && Array.isArray(response.data)) return response.data;
        if (response.results && Array.isArray(response.results)) return response.results;
        return [];
      };

      const permissionsData = getData(permissionsRes);
      const groupesData = getData(groupesRes);
      const modulesData = getData(modulesRes);
      const entitesData = getData(entitesRes);

      console.log('📊 Données extraites:', {
        permissionsCount: permissionsData.length,
        groupesCount: groupesData.length,
        modulesCount: modulesData.length,
        entitesCount: entitesData.length
      });

      if (permissionsData.length > 0) {
        console.log('🔍 Premier élément permissions:', permissionsData[0]);
      }

      setPermissions(permissionsData);
      setGroupes(groupesData);
      setModules(modulesData);
      setEntites(entitesData);

    } catch (err) {
      console.error('❌ Erreur détaillée:', err);
      setError('Erreur lors du chargement des données');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAllData();
  }, [fetchAllData]);

  // Filtrage et recherche
  const filteredPermissions = useMemo(() => {
    console.log('🔍 Filtrage des permissions:', {
      total: permissions.length,
      searchTerm,
      filterGroupe,
      filterModule
    });

    const result = permissions.filter(permission => {
      const searchLower = searchTerm.toLowerCase();
      
      // Recherche dans le nom du groupe
      const groupeName = permission.groupe_details?.name || permission.groupe?.name || '';
      const matchesSearch = 
        groupeName.toLowerCase().includes(searchLower) ||
        permission.module_details?.nom_affiche?.toLowerCase().includes(searchLower) ||
        permission.module_details?.name?.toLowerCase().includes(searchLower) ||
        permission.entite_details?.raison_sociale?.toLowerCase().includes(searchLower) ||
        permission.acces?.toLowerCase().includes(searchLower);
      
      // Filtre par groupe
      const matchesGroupe = !filterGroupe || 
        permission.groupe?.id?.toString() === filterGroupe ||
        permission.groupe?.toString() === filterGroupe;
      
      // Filtre par module
      const matchesModule = !filterModule || 
        permission.module?.id?.toString() === filterModule ||
        permission.module?.toString() === filterModule;
      
      return matchesSearch && matchesGroupe && matchesModule;
    });

    console.log('✅ Résultats filtrés:', result.length);
    return result;
  }, [permissions, searchTerm, filterGroupe, filterModule]);

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

  const handleViewDetails = (permission) => {
    setSelectedPermission(permission);
    setShowDetailModal(true);
  };

  const handleFormSuccess = () => {
    setShowForm(false);
    setEditingPermission(null);
    fetchAllData();
  };

  const handleRetry = () => {
    fetchAllData();
  };

  const handleResetFilters = () => {
    setSearchTerm('');
    setFilterGroupe('');
    setFilterModule('');
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

  // Obtenir le nom du module
  const getModuleName = (permission) => {
    return permission.module_details?.nom_affiche || 
           permission.module_details?.name || 
           permission.module?.nom_affiche ||
           permission.module?.name || 
           'N/A';
  };

  // Obtenir le nom du groupe
  const getGroupeName = (permission) => {
    return permission.groupe_details?.name || 
           permission.groupe?.name || 
           'N/A';
  };

  // Obtenir l'ID du groupe
  const getGroupeId = (permission) => {
    return permission.groupe_details?.id || 
           permission.groupe?.id || 
           permission.groupe ||
           'N/A';
  };

  // Obtenir l'ID du module
  const getModuleId = (permission) => {
    return permission.module_details?.id || 
           permission.module?.id || 
           permission.module ||
           'N/A';
  };

  // Obtenir le nom de l'entité
  const getEntiteName = (permission) => {
    return permission.entite_details?.raison_sociale || 
           permission.entite_details?.name ||
           'Toutes';
  };

  // Statistiques
  const stats = useMemo(() => ({
    total: permissions.length,
    actives: permissions.filter(p => p.statut).length,
    inactives: permissions.filter(p => !p.statut).length,
  }), [permissions]);

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
              <FiShield className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">Gestion des Permissions</h1>
              <p className="text-gray-600 text-xs mt-0.5">
                Gérez les permissions d'accès aux modules par groupe
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
              onClick={handleNewPermission}
              className="px-4 py-1.5 rounded-lg bg-gradient-to-r from-violet-600 to-violet-500 text-white hover:from-violet-700 hover:to-violet-600 transition-all duration-300 hover:shadow flex items-center gap-1.5 text-sm group shadow"
            >
              <FiPlus className="group-hover:rotate-90 transition-transform duration-300 text-sm" />
              <span className="font-semibold">Nouvelle Permission</span>
            </button>
          </div>
        </div>

        {/* Statistiques */}
        <div className="grid grid-cols-3 gap-3 mb-4">
          <div className="bg-white rounded-lg p-3 border border-gray-200 shadow-sm hover:shadow transition-shadow duration-300">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-600">Total des permissions</p>
                <p className="text-lg font-bold text-gray-900 mt-0.5">{stats.total}</p>
              </div>
              <div className="p-1.5 bg-violet-50 rounded">
                <FiShield className="w-4 h-4 text-violet-600" />
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg p-3 border border-gray-200 shadow-sm hover:shadow transition-shadow duration-300">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-600">Permissions actives</p>
                <p className="text-lg font-bold text-green-600 mt-0.5">{stats.actives}</p>
              </div>
              <div className="p-1.5 bg-green-50 rounded">
                <FiCheckCircle className="w-4 h-4 text-green-600" />
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg p-3 border border-gray-200 shadow-sm hover:shadow transition-shadow duration-300">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-600">Permissions inactives</p>
                <p className="text-lg font-bold text-red-600 mt-0.5">{stats.inactives}</p>
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

      {/* Barre d'outils */}
      <div className="mb-4">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-3">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-gray-900 text-sm">Filtres et Recherche</h3>
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-gray-600">
                {filteredPermissions.length} résultat(s)
              </span>
              {(searchTerm || filterGroupe || filterModule) && (
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
                    placeholder="Groupe, module, entité..."
                  />
                </div>
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Groupe</label>
              <div className="relative">
                <FiUsers className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 text-sm" />
                <select
                  value={filterGroupe}
                  onChange={(e) => setFilterGroupe(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-violet-500 focus:border-transparent bg-white appearance-none text-sm"
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
              <label className="block text-xs font-medium text-gray-700 mb-1">Module</label>
              <div className="relative">
                <FiLayers className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 text-sm" />
                <select
                  value={filterModule}
                  onChange={(e) => setFilterModule(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-violet-500 focus:border-transparent bg-white appearance-none text-sm"
                >
                  <option value="">Tous les modules</option>
                  {modules.map(module => (
                    <option key={module.id} value={module.id}>
                      {module.nom_affiche || module.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tableau Principal */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        {/* En-tête du tableau */}
        <div className="px-4 py-3 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5">
                <input
                  type="checkbox"
                  checked={selectedRows.length === currentPermissions.length && currentPermissions.length > 0}
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

        {/* Tableau */}
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead>
              <tr className="bg-gradient-to-r from-gray-50 to-gray-100">
                <th scope="col" className="px-3 py-2 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider border-r border-gray-300">
                  <div className="flex items-center gap-1.5">
                    <input
                      type="checkbox"
                      checked={selectedRows.length === currentPermissions.length && currentPermissions.length > 0}
                      onChange={selectAllRows}
                      className="w-3.5 h-3.5 text-violet-600 rounded focus:ring-violet-500 border-gray-300"
                    />
                    ID
                  </div>
                </th>
                <th scope="col" className="px-3 py-2 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider border-r border-gray-300">
                  Groupe
                </th>
                <th scope="col" className="px-3 py-2 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider border-r border-gray-300">
                  Module
                </th>
                <th scope="col" className="px-3 py-2 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider border-r border-gray-300">
                  Entité
                </th>
                <th scope="col" className="px-3 py-2 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider border-r border-gray-300">
                  Type d'accès
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
              {currentPermissions.length === 0 ? (
                <tr>
                  <td colSpan="7" className="px-3 py-6 text-center">
                    <div className="flex flex-col items-center justify-center">
                      <div className="w-16 h-16 bg-gradient-to-br from-gray-100 to-gray-200 rounded-full flex items-center justify-center mb-3">
                        <FiShield className="w-8 h-8 text-gray-400" />
                      </div>
                      <h3 className="text-base font-semibold text-gray-900 mb-1.5">
                        {permissions.length === 0 ? 'Aucune permission trouvée' : 'Aucun résultat pour votre recherche'}
                      </h3>
                      <p className="text-gray-600 mb-4 max-w-md text-sm">
                        {permissions.length === 0 
                          ? 'Commencez par créer votre première permission' 
                          : 'Essayez de modifier vos critères de recherche ou de filtres'}
                      </p>
                      {permissions.length === 0 && (
                        <button 
                          onClick={handleNewPermission}
                          className="px-4 py-1.5 bg-gradient-to-r from-violet-600 to-violet-500 text-white rounded-lg hover:from-violet-700 hover:to-violet-600 transition-all duration-300 font-medium flex items-center gap-1.5 text-sm"
                        >
                          <FiPlus />
                          Créer ma première permission
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                currentPermissions.map((permission) => (
                  <tr 
                    key={permission.id}
                    className={`hover:bg-gradient-to-r hover:from-gray-50 hover:to-white transition-all duration-200 ${
                      selectedRows.includes(permission.id) ? 'bg-gradient-to-r from-violet-50 to-violet-25' : 'bg-white'
                    }`}
                  >
                    <td className="px-3 py-2 whitespace-nowrap border-r border-gray-200">
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={selectedRows.includes(permission.id)}
                          onChange={() => toggleRowSelection(permission.id)}
                          className="w-3.5 h-3.5 text-violet-600 rounded focus:ring-violet-500 border-gray-300"
                        />
                        <span className="px-1.5 py-0.5 bg-gray-100 text-gray-800 rounded text-xs font-medium font-mono">
                          #{permission.id}
                        </span>
                      </div>
                    </td>
                    <td className="px-3 py-2 border-r border-gray-200">
                      <div className="text-sm font-semibold text-gray-900">{getGroupeName(permission)}</div>
                      <div className="text-xs text-gray-500">
                        ID: {getGroupeId(permission)}
                      </div>
                    </td>
                    <td className="px-3 py-2 border-r border-gray-200">
                      <div className="text-sm font-semibold text-gray-900">{getModuleName(permission)}</div>
                      <div className="text-xs text-gray-500">
                        ID: {getModuleId(permission)}
                      </div>
                    </td>
                    <td className="px-3 py-2 border-r border-gray-200">
                      <div className="text-sm text-gray-900">
                        {getEntiteName(permission)}
                      </div>
                      <div className="text-xs text-gray-500">
                        {permission.entite ? `ID: ${permission.entite}` : 'Toutes les entités'}
                      </div>
                    </td>
                    <td className="px-3 py-2 border-r border-gray-200">
                      <div className={`inline-flex items-center px-2 py-1 rounded border ${getAccesBadgeClasses(permission.acces)}`}>
                        <span className="text-xs font-medium">{getAccesLabel(permission.acces)}</span>
                      </div>
                    </td>
                    <td className="px-3 py-2 border-r border-gray-200">
                      <div className={`px-2 py-1 rounded flex items-center gap-1 ${
                        permission.statut
                          ? 'bg-gradient-to-r from-green-50 to-emerald-50 text-green-700 border border-green-200' 
                          : 'bg-gradient-to-r from-red-50 to-pink-50 text-red-700 border border-red-200'
                      }`}>
                        {permission.statut ? (
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
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => handleViewDetails(permission)}
                          className="p-1.5 bg-gradient-to-r from-gray-50 to-gray-100 text-gray-700 rounded-lg hover:from-gray-100 hover:to-gray-200 transition-all duration-200 shadow-sm hover:shadow"
                          title="Voir détails"
                        >
                          <FiEye size={14} />
                        </button>
                        <button
                          onClick={() => handleEdit(permission)}
                          className="p-1.5 bg-gradient-to-r from-violet-50 to-violet-100 text-violet-700 rounded-lg hover:from-violet-100 hover:to-violet-200 transition-all duration-200 shadow-sm hover:shadow"
                          title="Modifier"
                        >
                          <FiEdit2 size={14} />
                        </button>
                        <button
                          onClick={() => handleDelete(permission)}
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
        {filteredPermissions.length > 0 && (
          <div className="px-4 py-3 border-t border-gray-200 bg-gradient-to-r from-gray-50 to-white">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs text-gray-700">
                    Page {currentPage} sur {totalPages}
                  </span>
                  <span className="text-gray-300">•</span>
                  <span className="text-xs text-gray-700">
                    {indexOfFirstItem + 1}-{Math.min(indexOfLastItem, filteredPermissions.length)} sur {filteredPermissions.length} permissions
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

      {/* Modal de détails */}
      {showDetailModal && selectedPermission && (
        <PermissionDetailModal
          permission={selectedPermission}
          onClose={() => {
            setShowDetailModal(false);
            setSelectedPermission(null);
          }}
        />
      )}
    </div>
  );
}

// MODAL DE DÉTAILS
function PermissionDetailModal({ permission, onClose }) {
  const getAccesBadgeClasses = (accesValue) => {
    const type = TYPES_ACCES.find(t => t.value === accesValue);
    return type ? `${type.bgColor} ${type.textColor} ${type.borderColor}` : 'bg-gray-100 text-gray-800 border-gray-300';
  };

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
                  {getGroupeName(permission)} - {getModuleName(permission)}
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
          <div className="bg-gradient-to-br from-gray-50 to-white rounded-lg p-3 border border-gray-200">
            <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-1.5">
              <div className="w-1 h-4 bg-gradient-to-b from-violet-600 to-violet-400 rounded"></div>
              Informations Générales
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <p className="text-xs font-medium text-gray-500 mb-0.5">ID</p>
                <p className="text-sm text-gray-900 font-medium font-mono">#{permission.id}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500 mb-0.5">Groupe</p>
                <p className="text-sm text-gray-900 font-medium">{getGroupeName(permission)}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500 mb-0.5">Module</p>
                <p className="text-sm text-gray-900 font-medium">{getModuleName(permission)}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500 mb-0.5">Entité</p>
                <p className="text-sm text-gray-900">
                  {getEntiteName(permission)}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500 mb-0.5">Type d'accès</p>
                <div className={`inline-flex items-center px-2 py-1 rounded border ${getAccesBadgeClasses(permission.acces)}`}>
                  <span className="text-xs font-medium">
                    {TYPES_ACCES.find(t => t.value === permission.acces)?.label || 'Inconnu'}
                  </span>
                </div>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500 mb-0.5">Statut</p>
                <div className={`px-2 py-1 rounded inline-flex items-center gap-1 ${
                  permission.statut
                    ? 'bg-gradient-to-r from-green-50 to-emerald-50 text-green-700 border border-green-200' 
                    : 'bg-gradient-to-r from-red-50 to-pink-50 text-red-700 border border-red-200'
                }`}>
                  {permission.statut ? (
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

// COMPOSANT MODAL POUR LES PERMISSIONS
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
      <div className="bg-white rounded-lg w-full max-w-5xl max-h-[90vh] overflow-y-auto shadow-xl">
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
          {/* Section 1: Informations Générales */}
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
                  {TYPES_ACCES.map(type => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
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
                <div className={`inline-flex items-center px-2 py-1 rounded border ${TYPES_ACCES.find(t => t.value === formData.acces)?.bgColor || 'bg-gray-100'} ${TYPES_ACCES.find(t => t.value === formData.acces)?.textColor || 'text-gray-800'} ${TYPES_ACCES.find(t => t.value === formData.acces)?.borderColor || 'border-gray-300'}`}>
                  <span className="text-xs font-medium">{TYPES_ACCES.find(t => t.value === formData.acces)?.label || 'Inconnu'}</span>
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
