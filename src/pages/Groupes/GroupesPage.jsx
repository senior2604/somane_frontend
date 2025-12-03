import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { apiClient } from '../../services/apiClient';
import { 
  FiRefreshCw, FiPlus, FiEdit2, FiTrash2, FiSearch, FiFilter, FiX, 
  FiCheck, FiUsers, FiChevronLeft, FiChevronRight, FiDownload, FiUpload,
  FiChevronDown, FiChevronUp, FiCheckCircle, FiXCircle, FiShield, FiKey,
  FiUserCheck, FiLock, FiUnlock, FiEye, FiMoreVertical, FiFolder
} from "react-icons/fi";

export default function GroupsPage() {
  const [groupes, setGroupes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editingGroup, setEditingGroup] = useState(null);
  
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRows, setSelectedRows] = useState([]);
  const [expandedRow, setExpandedRow] = useState(null);

  useEffect(() => {
    fetchGroupes();
  }, []);

  const fetchGroupes = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await apiClient.get('/groupes/');
      
      let groupesData = [];
      if (Array.isArray(response)) {
        groupesData = response;
      } else if (response && Array.isArray(response.results)) {
        groupesData = response.results;
      } else if (response && Array.isArray(response.data)) {
        groupesData = response.data;
      } else {
        setError('Format de données inattendu');
        groupesData = [];
      }

      setGroupes(groupesData);
    } catch (err) {
      console.error('❌ Erreur lors du chargement des groupes:', err);
      setError('Erreur lors du chargement des groupes');
    } finally {
      setLoading(false);
    }
  };

  // Filtrage et recherche
  const filteredGroupes = useMemo(() => {
    return groupes.filter(group => 
      group.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (group.description && group.description.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  }, [groupes, searchTerm]);

  // Calculs pour la pagination
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentGroupes = useMemo(() => 
    filteredGroupes.slice(indexOfFirstItem, indexOfLastItem)
  , [filteredGroupes, indexOfFirstItem, indexOfLastItem]);
  
  const totalPages = Math.ceil(filteredGroupes.length / itemsPerPage);

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
    if (selectedRows.length === currentGroupes.length) {
      setSelectedRows([]);
    } else {
      setSelectedRows(currentGroupes.map(group => group.id));
    }
  }, [currentGroupes, selectedRows.length]);

  // Gestion des lignes expansibles
  const toggleExpandRow = (id) => {
    setExpandedRow(expandedRow === id ? null : id);
  };

  // Gestion des actions
  const handleNewGroup = () => {
    setEditingGroup(null);
    setShowForm(true);
  };

  const handleEdit = (group) => {
    setEditingGroup(group);
    setShowForm(true);
  };

  const handleDelete = async (group) => {
    if (window.confirm(`Êtes-vous sûr de vouloir supprimer le groupe "${group.name}" ? Cette action est irréversible.`)) {
      try {
        await apiClient.delete(`/groupes/${group.id}/`);
        fetchGroupes();
      } catch (err) {
        setError('Erreur lors de la suppression');
        console.error('Error deleting group:', err);
      }
    }
  };

  const handleFormSuccess = () => {
    setShowForm(false);
    setEditingGroup(null);
    fetchGroupes();
  };

  const handleRetry = () => {
    fetchGroupes();
  };

  const handleResetFilters = () => {
    setSearchTerm('');
    setCurrentPage(1);
  };

  // Statistiques - 3 cartes comme dans le design utilisateur
  const stats = useMemo(() => ({
    total: groupes.length,
    withPermissions: groupes.filter(g => g.modules_autorises && g.modules_autorises.length > 0).length,
    totalUsers: groupes.reduce((total, group) => total + (group.user_count || 0), 0),
  }), [groupes]);

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
              <FiUsers className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Gestion des Groupes</h1>
              <p className="text-gray-600 text-sm mt-1">
                Gérez les groupes d'utilisateurs et leurs permissions
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
              onClick={handleNewGroup}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-violet-500 text-white hover:from-violet-700 hover:to-violet-600 transition-all duration-300 hover:shadow-lg flex items-center gap-2 group shadow-md"
            >
              <FiPlus className="group-hover:rotate-90 transition-transform duration-300" />
              <span className="font-semibold">Nouveau Groupe</span>
            </button>
          </div>
        </div>

        {/* Statistiques en ligne - 3 CARTES - COULEUR VIOLETTE */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm hover:shadow-md transition-shadow duration-300">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total des groupes</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{stats.total}</p>
              </div>
              <div className="p-2 bg-violet-50 rounded-lg">
                <FiUsers className="w-5 h-5 text-violet-600" />
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm hover:shadow-md transition-shadow duration-300">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Avec permissions</p>
                <p className="text-2xl font-bold text-green-600 mt-1">{stats.withPermissions}</p>
              </div>
              <div className="p-2 bg-green-50 rounded-lg">
                <FiCheckCircle className="w-5 h-5 text-green-600" />
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm hover:shadow-md transition-shadow duration-300">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Utilisateurs totaux</p>
                <p className="text-2xl font-bold text-purple-600 mt-1">{stats.totalUsers}</p>
              </div>
              <div className="p-2 bg-purple-50 rounded-lg">
                <FiUserCheck className="w-5 h-5 text-purple-600" />
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

      {/* Barre d'outils - Filtres et Recherche - COULEUR VIOLETTE */}
      <div className="mb-6">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900">Filtres et Recherche</h3>
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">
                {filteredGroupes.length} résultat(s)
              </span>
              {searchTerm && (
                <button
                  onClick={handleResetFilters}
                  className="px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm font-medium flex items-center gap-1"
                >
                  <FiX size={14} />
                  Effacer
                </button>
              )}
            </div>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div>
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
                    placeholder="Rechercher un groupe..."
                  />
                </div>
              </div>
            </div>
            <div className="flex items-end">
              <button
                onClick={handleResetFilters}
                className="w-full px-4 py-3 bg-gradient-to-r from-gray-100 to-gray-50 text-gray-700 rounded-xl hover:from-gray-200 hover:to-gray-100 transition-all duration-300 border border-gray-300 font-medium flex items-center justify-center gap-2 group"
              >
                <FiX className="group-hover:rotate-90 transition-transform duration-300" />
                Réinitialiser tout
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Tableau Principal */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
        {/* En-tête du tableau avec actions - COULEUR VIOLETTE */}
        <div className="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={selectedRows.length === currentGroupes.length && currentGroupes.length > 0}
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
                      checked={selectedRows.length === currentGroupes.length && currentGroupes.length > 0}
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
                  Description
                </th>
                <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider border-r border-gray-300">
                  Modules
                </th>
                <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider border-r border-gray-300">
                  Utilisateurs
                </th>
                <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {currentGroupes.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center justify-center">
                      <div className="w-20 h-20 bg-gradient-to-br from-gray-100 to-gray-200 rounded-full flex items-center justify-center mb-4">
                        <FiUsers className="w-10 h-10 text-gray-400" />
                      </div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">
                        {groupes.length === 0 ? 'Aucun groupe trouvé' : 'Aucun résultat pour votre recherche'}
                      </h3>
                      <p className="text-gray-600 mb-6 max-w-md">
                        {groupes.length === 0 
                          ? 'Commencez par créer votre premier groupe' 
                          : 'Essayez de modifier vos critères de recherche'}
                      </p>
                      {groupes.length === 0 && (
                        <button 
                          onClick={handleNewGroup}
                          className="px-5 py-2.5 bg-gradient-to-r from-violet-600 to-violet-500 text-white rounded-xl hover:from-violet-700 hover:to-violet-600 transition-all duration-300 font-medium flex items-center gap-2"
                        >
                          <FiPlus />
                          Créer mon premier groupe
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                currentGroupes.map((group, index) => (
                  <React.Fragment key={group.id}>
                    <tr 
                      className={`hover:bg-gradient-to-r hover:from-gray-50 hover:to-white transition-all duration-200 ${
                        selectedRows.includes(group.id) ? 'bg-gradient-to-r from-violet-50 to-violet-25' : 'bg-white'
                      } ${expandedRow === group.id ? 'bg-gradient-to-r from-violet-50 to-violet-25' : ''}`}
                    >
                      <td className="px-6 py-4 whitespace-nowrap border-r border-gray-200">
                        <div className="flex items-center gap-3">
                          <input
                            type="checkbox"
                            checked={selectedRows.includes(group.id)}
                            onChange={() => toggleRowSelection(group.id)}
                            className="w-4 h-4 text-violet-600 rounded focus:ring-violet-500 border-gray-300"
                          />
                          <button
                            onClick={() => toggleExpandRow(group.id)}
                            className="p-1 hover:bg-gray-100 rounded transition-colors"
                          >
                            {expandedRow === group.id ? <FiChevronUp size={14} /> : <FiChevronDown size={14} />}
                          </button>
                          <span className="px-2 py-1 bg-gray-100 text-gray-800 rounded text-xs font-medium font-mono">
                            #{group.id}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 border-r border-gray-200">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-gradient-to-br from-violet-100 to-violet-200 rounded-full flex items-center justify-center">
                            <FiFolder className="w-5 h-5 text-violet-600" />
                          </div>
                          <div>
                            <div className="text-sm font-semibold text-gray-900">{group.name}</div>
                            <div className="text-xs text-gray-500">
                              {group.user_count || 0} membre(s)
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 border-r border-gray-200">
                        <div className="text-sm text-gray-600 line-clamp-2">
                          {group.description || 'Aucune description'}
                        </div>
                      </td>
                      <td className="px-6 py-4 border-r border-gray-200">
                        <div className="flex flex-wrap gap-1">
                          {group.modules_autorises && group.modules_autorises.length > 0 ? (
                            <>
                              {group.modules_autorises.slice(0, 3).map((module, idx) => (
                                <span key={idx} className="inline-flex px-2 py-1 rounded-lg text-xs bg-gradient-to-r from-violet-50 to-violet-100 text-violet-700 font-medium border border-violet-200">
                                  {module}
                                </span>
                              ))}
                              {group.modules_autorises.length > 3 && (
                                <span className="inline-flex px-2 py-1 rounded-lg text-xs bg-gradient-to-r from-gray-50 to-gray-100 text-gray-600 font-medium border border-gray-200">
                                  +{group.modules_autorises.length - 3}
                                </span>
                              )}
                            </>
                          ) : (
                            <span className="inline-flex px-2 py-1 rounded-lg text-xs bg-gradient-to-r from-gray-50 to-gray-100 text-gray-500 font-medium border border-gray-200">
                              Aucun module
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 border-r border-gray-200">
                        <span className="inline-flex px-3 py-1.5 rounded-lg text-sm font-medium bg-gradient-to-r from-green-50 to-emerald-50 text-green-700 border border-green-200">
                          {group.user_count || 0} utilisateur(s)
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleEdit(group)}
                            className="p-2.5 bg-gradient-to-r from-violet-50 to-violet-100 text-violet-700 rounded-xl hover:from-violet-100 hover:to-violet-200 transition-all duration-200 shadow-sm hover:shadow"
                            title="Modifier"
                          >
                            <FiEdit2 size={17} />
                          </button>
                          <button
                            onClick={() => handleDelete(group)}
                            className="p-2.5 bg-gradient-to-r from-red-50 to-red-100 text-red-700 rounded-xl hover:from-red-100 hover:to-red-200 transition-all duration-200 shadow-sm hover:shadow"
                            title="Supprimer"
                          >
                            <FiTrash2 size={17} />
                          </button>
                        </div>
                      </td>
                    </tr>
                    {expandedRow === group.id && (
                      <tr className="bg-gradient-to-r from-violet-50 to-violet-25">
                        <td colSpan="6" className="px-6 py-4">
                          <div className="bg-white rounded-xl border border-violet-200 p-5">
                            <div className="grid grid-cols-3 gap-6">
                              <div>
                                <div className="text-xs font-semibold text-gray-500 uppercase mb-2">ID</div>
                                <div className="text-sm text-gray-900 font-mono">#{group.id}</div>
                              </div>
                              <div>
                                <div className="text-xs font-semibold text-gray-500 uppercase mb-2">Nom</div>
                                <div className="text-sm text-gray-900 font-medium">{group.name}</div>
                              </div>
                              <div>
                                <div className="text-xs font-semibold text-gray-500 uppercase mb-2">Utilisateurs</div>
                                <div className="text-sm text-gray-900">{group.user_count || 0} membre(s)</div>
                              </div>
                              <div className="col-span-3">
                                <div className="text-xs font-semibold text-gray-500 uppercase mb-2">Description</div>
                                <div className="text-sm text-gray-900">{group.description || 'Aucune description'}</div>
                              </div>
                              {group.modules_autorises && group.modules_autorises.length > 0 && (
                                <div className="col-span-3">
                                  <div className="text-xs font-semibold text-gray-500 uppercase mb-2">Modules Autorisés</div>
                                  <div className="flex flex-wrap gap-2">
                                    {group.modules_autorises.map((module, idx) => (
                                      <span key={idx} className="inline-flex px-3 py-1.5 rounded-lg text-sm bg-gradient-to-r from-violet-50 to-violet-100 text-violet-700 font-medium border border-violet-200">
                                        {module}
                                      </span>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination - COULEUR VIOLETTE */}
        {filteredGroupes.length > 0 && (
          <div className="px-6 py-4 border-t border-gray-200 bg-gradient-to-r from-gray-50 to-white">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-700">
                    Page {currentPage} sur {totalPages}
                  </span>
                  <span className="text-gray-300">•</span>
                  <span className="text-sm text-gray-700">
                    {indexOfFirstItem + 1}-{Math.min(indexOfLastItem, filteredGroupes.length)} sur {filteredGroupes.length} groupes
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
        <GroupFormModal
          group={editingGroup}
          onClose={() => {
            setShowForm(false);
            setEditingGroup(null);
          }}
          onSuccess={handleFormSuccess}
        />
      )}
    </div>
  );
}

// COMPOSANT MODAL POUR LES GROUPES - DESIGN COORDONNÉ AVEC VIOLETTE
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

    try {
      const url = group 
        ? `/groupes/${group.id}/`
        : `/groupes/`;
      
      const method = group ? 'PUT' : 'POST';

      const response = await apiClient.request(url, {
        method: method,
        body: JSON.stringify(formData),
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      console.log('✅ Réponse:', response);
      onSuccess();
    } catch (err) {
      console.error('❌ Erreur sauvegarde groupe:', err);
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
                  {group ? 'Modifier le groupe' : 'Nouveau Groupe'}
                </h2>
                <p className="text-violet-100 text-xs mt-0.5">
                  Définissez les permissions d'accès aux modules
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
            
            <div className="grid grid-cols-1 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nom du Groupe <span className="text-red-500">*</span>
                </label>
                <div className="relative group">
                  <div className="absolute inset-0 bg-gradient-to-r from-violet-600 to-violet-500 rounded-xl blur opacity-0 group-hover:opacity-10 transition-opacity duration-300"></div>
                  <div className="relative">
                    <FiFolder className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 z-10" />
                    <input
                      type="text"
                      required
                      value={formData.name}
                      onChange={(e) => handleChange('name', e.target.value)}
                      className="relative w-full pl-12 pr-4 py-3.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent bg-white"
                      placeholder="Ex: Administrateurs, Managers, Opérateurs..."
                    />
                  </div>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => handleChange('description', e.target.value)}
                  rows={3}
                  className="w-full border border-gray-300 rounded-xl px-4 py-3.5 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                  placeholder="Description du groupe et de ses permissions..."
                />
              </div>
            </div>
          </div>

          {/* Section 2: Modules Autorisés - DESIGN AVEC VIOLETTE */}
          <div className="bg-gradient-to-br from-violet-50 to-purple-50 rounded-2xl p-6 border border-violet-200">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-1.5 h-8 bg-gradient-to-b from-violet-600 to-violet-400 rounded-full"></div>
              <h3 className="text-lg font-semibold text-gray-900">Modules Autorisés</h3>
            </div>
            <p className="text-sm text-gray-600 mb-6">
              Sélectionnez les modules auxquels ce groupe aura accès
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {availableModules.map(module => (
                <label 
                  key={module} 
                  className={`flex items-center gap-3 p-4 rounded-xl border transition-all duration-200 cursor-pointer ${
                    formData.modules_autorises.includes(module)
                      ? 'bg-white border-violet-400 shadow-sm'
                      : 'bg-white border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={formData.modules_autorises.includes(module)}
                    onChange={() => toggleModule(module)}
                    className="w-5 h-5 text-violet-600 rounded focus:ring-violet-500"
                  />
                  <div className="flex-1">
                    <div className="font-medium text-gray-900">{module}</div>
                  </div>
                  {formData.modules_autorises.includes(module) && (
                    <div className="p-1.5 bg-gradient-to-r from-violet-100 to-violet-200 rounded-lg">
                      <FiCheck className="w-4 h-4 text-violet-600" />
                    </div>
                  )}
                </label>
              ))}
            </div>
            
            <div className="mt-6 text-sm text-gray-600">
              <div className="flex items-center gap-2">
                <FiCheckCircle className="w-4 h-4 text-green-600" />
                <span>{formData.modules_autorises.length} module(s) sélectionné(s)</span>
              </div>
            </div>
          </div>

          {/* Aperçu */}
          <div className="bg-gradient-to-br from-violet-50 to-white rounded-2xl p-6 border border-violet-100">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-1.5 h-8 bg-gradient-to-b from-violet-600 to-violet-400 rounded-full"></div>
              <h3 className="text-lg font-semibold text-gray-900">Aperçu du groupe</h3>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white rounded-xl p-4 border border-gray-200">
                <div className="text-xs font-semibold text-gray-500 uppercase mb-2">Nom du groupe</div>
                <div className="text-sm font-medium text-gray-900">{formData.name || 'Non défini'}</div>
              </div>
              <div className="bg-white rounded-xl p-4 border border-gray-200">
                <div className="text-xs font-semibold text-gray-500 uppercase mb-2">Modules</div>
                <div className="text-sm font-medium text-gray-900">
                  {formData.modules_autorises.length > 0 
                    ? `${formData.modules_autorises.length} module(s)` 
                    : 'Aucun module'}
                </div>
              </div>
              <div className="col-span-2 bg-white rounded-xl p-4 border border-gray-200">
                <div className="text-xs font-semibold text-gray-500 uppercase mb-2">Modules sélectionnés</div>
                <div className="flex flex-wrap gap-2 mt-2">
                  {formData.modules_autorises.length > 0 ? (
                    formData.modules_autorises.map((module, idx) => (
                      <span key={idx} className="inline-flex px-3 py-1 rounded-lg text-xs bg-gradient-to-r from-violet-50 to-violet-100 text-violet-700 font-medium border border-violet-200">
                        {module}
                      </span>
                    ))
                  ) : (
                    <span className="text-sm text-gray-500">Aucun module sélectionné</span>
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