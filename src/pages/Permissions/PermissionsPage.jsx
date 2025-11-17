import React, { useState, useEffect } from 'react';
import { apiClient } from '../../services/apiClient';

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
  const [filterEntite, setFilterEntite] = useState('');
  const [filterStatut, setFilterStatut] = useState('');

  // Types d'accès comme spécifié dans l'Excel
  const typesAcces = [
    { value: 'aucun', label: '❌ Aucun accès', color: 'red', bgColor: 'bg-red-100', textColor: 'text-red-800', borderColor: 'border-red-300' },
    { value: 'lecture', label: '👁️ Lecture seule', color: 'blue', bgColor: 'bg-blue-100', textColor: 'text-blue-800', borderColor: 'border-blue-300' },
    { value: 'ecriture', label: '✏️ Lecture/Écriture', color: 'green', bgColor: 'bg-green-100', textColor: 'text-green-800', borderColor: 'border-green-300' },
    { value: 'validation', label: '✅ Validation', color: 'purple', bgColor: 'bg-purple-100', textColor: 'text-purple-800', borderColor: 'border-purple-300' },
    { value: 'suppression', label: '🗑️ Suppression', color: 'orange', bgColor: 'bg-orange-100', textColor: 'text-orange-800', borderColor: 'border-orange-300' },
    { value: 'personnalise', label: '🔧 Personnalisé', color: 'gray', bgColor: 'bg-gray-100', textColor: 'text-gray-800', borderColor: 'border-gray-300' }
  ];

  // Debug initial
  useEffect(() => {
    console.log('🔧 Composant Permissions monté');
    fetchAllData();
  }, []);

 const fetchAllData = async () => {
  try {
    setLoading(true);
    setError(null);
    console.log('🔄 Début du chargement des données...');

    // Chargement parallèle de toutes les données avec apiClient
    const [permissionsRes, groupesRes, modulesRes, entitesRes] = await Promise.all([
      apiClient.get('/permissions/'),
      apiClient.get('/groupes/'), // ← CHANGEMENT ICI : /groupes/ (avec 's' à la fin)
      apiClient.get('/modules/'),
      apiClient.get('/entites/')
    ]);

    console.log('✅ Toutes les données chargées avec succès');

    // Traitement des permissions
    let permissionsData = [];
    if (Array.isArray(permissionsRes)) {
      permissionsData = permissionsRes;
    } else if (permissionsRes && Array.isArray(permissionsRes.results)) {
      permissionsData = permissionsRes.results;
    } else {
      permissionsData = [];
    }

    setPermissions(permissionsData);
    setGroupes(Array.isArray(groupesRes) ? groupesRes : []);
    setModules(Array.isArray(modulesRes) ? modulesRes : []);
    setEntites(Array.isArray(entitesRes) ? entitesRes : []);

    console.log(`📊 ${permissionsData.length} permissions chargées`);
    console.log(`👥 ${groupesRes?.length || 0} groupes chargés`);
    console.log(`📦 ${modulesRes?.length || 0} modules chargés`);
    console.log(`🏢 ${entitesRes?.length || 0} entités chargées`);

    } catch (err) {
      console.error('❌ Erreur détaillée:', err);
      
      let errorMessage = 'Erreur lors du chargement des données';
      
      if (err.code === 'NETWORK_ERROR' || err.message === 'Network Error') {
        errorMessage = 'Erreur de réseau - Vérifiez votre connexion';
      } else if (err.response) {
        const status = err.response.status;
        if (status === 401) {
          errorMessage = 'Non authentifié - Veuillez vous reconnecter';
        } else if (status === 403) {
          errorMessage = 'Accès refusé - Permissions insuffisantes';
        } else if (status === 404) {
          errorMessage = 'API non trouvée - Contactez l\'administrateur';
        } else if (status >= 500) {
          errorMessage = 'Erreur serveur - Réessayez plus tard';
        } else {
          errorMessage = `Erreur ${status}: ${err.response.data?.detail || 'Erreur inconnue'}`;
        }
      } else if (err.request) {
        errorMessage = 'Serveur inaccessible - Vérifiez que le backend est démarré';
      } else {
        errorMessage = err.message || 'Erreur inconnue';
      }

      setError(errorMessage);
      
      // Les tableaux restent vides en cas d'erreur
      setPermissions([]);
      setGroupes([]);
      setModules([]);
      setEntites([]);
      
    } finally {
      setLoading(false);
    }
  };

  // Filtrage et recherche
  const filteredPermissions = permissions.filter(permission => {
    const matchesSearch = 
      permission.groupe?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      permission.module?.nom_affiche?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      permission.entite?.raison_sociale?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      permission.acces?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesGroupe = !filterGroupe || permission.groupe?.id === parseInt(filterGroupe);
    const matchesModule = !filterModule || permission.module?.id === parseInt(filterModule);
    const matchesEntite = !filterEntite || permission.entite?.id === parseInt(filterEntite);
    const matchesStatut = filterStatut === '' || 
      (filterStatut === 'actif' ? permission.statut : !permission.statut);
    
    return matchesSearch && matchesGroupe && matchesModule && matchesEntite && matchesStatut;
  });

  // Calculs pour la pagination
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentPermissions = Array.isArray(filteredPermissions) ? filteredPermissions.slice(indexOfFirstItem, indexOfLastItem) : [];
  const totalPages = Math.ceil((Array.isArray(filteredPermissions) ? filteredPermissions.length : 0) / itemsPerPage);

  // Changement de page
  const paginate = (pageNumber) => setCurrentPage(pageNumber);
  const nextPage = () => currentPage < totalPages && setCurrentPage(currentPage + 1);
  const prevPage = () => currentPage > 1 && setCurrentPage(currentPage - 1);

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
        setError('Erreur lors de la suppression: ' + (err.message || 'Erreur inconnue'));
        console.error('Error deleting permission:', err);
      }
    }
  };

  const handleToggleStatut = async (permission) => {
    try {
      await apiClient.request(`/permissions/${permission.id}/`, {
        method: 'PATCH',
        body: JSON.stringify({
          statut: !permission.statut
        }),
        headers: {
          'Content-Type': 'application/json'
        }
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

  // Obtenir le libellé du type d'accès
  const getAccesLabel = (accesValue) => {
    const type = typesAcces.find(t => t.value === accesValue);
    return type ? type.label : 'Inconnu';
  };

  // Obtenir les classes CSS pour le badge d'accès
  const getAccesBadgeClasses = (accesValue) => {
    const type = typesAcces.find(t => t.value === accesValue);
    return type ? `${type.bgColor} ${type.textColor} ${type.borderColor}` : 'bg-gray-100 text-gray-800 border-gray-300';
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex justify-center items-center p-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-2">Chargement des permissions...</span>
        </div>
        <div className="text-center text-sm text-gray-500">
          Connexion aux APIs en cours...
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Gestion des Permissions</h1>
          <p className="text-gray-600 mt-1">
            {filteredPermissions.length} permission(s) trouvée(s)
            {(filterGroupe || filterModule || filterEntite || filterStatut) && ' • Filtres actifs'}
          </p>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={handleRetry}
            className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Actualiser
          </button>
          <button 
            onClick={handleNewPermission}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Nouvelle Permission
          </button>
        </div>
      </div>

      {/* Message d'erreur amélioré */}
      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <svg className="w-5 h-5 text-red-600 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
              <div>
                <span className="text-red-800 font-medium">{error}</span>
                <p className="text-red-700 text-sm mt-1">
                  Vérifiez la console (F12) pour plus de détails.
                </p>
              </div>
            </div>
            <button
              onClick={handleRetry}
              className="bg-red-600 text-white px-3 py-1 rounded text-sm hover:bg-red-700 transition-colors"
            >
              Réessayer
            </button>
          </div>
        </div>
      )}

      {/* Si pas d'erreur mais données vides */}
      {!error && permissions.length === 0 && (
        <div className="mb-6 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-center">
            <svg className="w-5 h-5 text-yellow-600 mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            <div>
              <span className="text-yellow-800 font-medium">Aucune donnée disponible</span>
              <p className="text-yellow-700 text-sm mt-1">
                Aucune permission n'a été trouvée. Créez une nouvelle permission ou vérifiez la configuration de l'API.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Filtres et Recherche - Masqués si pas de données */}
      {(permissions.length > 0 || searchTerm || filterGroupe || filterModule || filterEntite || filterStatut) && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-300 p-4 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">Rechercher</label>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Groupe, module, entité, accès..."
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Groupe</label>
              <select
                value={filterGroupe}
                onChange={(e) => setFilterGroupe(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Tous les groupes</option>
                {groupes.map(groupe => (
                  <option key={groupe.id} value={groupe.id}>
                    {groupe.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Module</label>
              <select
                value={filterModule}
                onChange={(e) => setFilterModule(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Tous les modules</option>
                {modules.map(module => (
                  <option key={module.id} value={module.id}>
                    {module.nom_affiche}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Entité</label>
              <select
                value={filterEntite}
                onChange={(e) => setFilterEntite(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Toutes les entités</option>
                {entites.map(entite => (
                  <option key={entite.id} value={entite.id}>
                    {entite.raison_sociale}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Statut</label>
              <select
                value={filterStatut}
                onChange={(e) => setFilterStatut(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Tous les statuts</option>
                <option value="actif">Actives</option>
                <option value="inactif">Inactives</option>
              </select>
            </div>
          </div>
          <div className="mt-4 flex justify-end">
            <button
              onClick={() => {
                setSearchTerm('');
                setFilterGroupe('');
                setFilterModule('');
                setFilterEntite('');
                setFilterStatut('');
                setCurrentPage(1);
              }}
              className="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200 transition-colors border border-gray-300"
            >
              Réinitialiser tous les filtres
            </button>
          </div>
        </div>
      )}

      {/* Statistiques - Masquées si pas de données */}
      {permissions.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow-sm border border-gray-300 p-4">
            <div className="text-2xl font-bold text-blue-600">{permissions.length}</div>
            <div className="text-sm text-gray-600">Total des permissions</div>
          </div>
          <div className="bg-white rounded-lg shadow-sm border border-gray-300 p-4">
            <div className="text-2xl font-bold text-green-600">
              {permissions.filter(p => p.statut).length}
            </div>
            <div className="text-sm text-gray-600">Permissions actives</div>
          </div>
          <div className="bg-white rounded-lg shadow-sm border border-gray-300 p-4">
            <div className="text-2xl font-bold text-gray-600">
              {permissions.filter(p => !p.statut).length}
            </div>
            <div className="text-sm text-gray-600">Permissions inactives</div>
          </div>
          <div className="bg-white rounded-lg shadow-sm border border-gray-300 p-4">
            <div className="text-2xl font-bold text-purple-600">
              {new Set(permissions.map(p => p.groupe?.id)).size}
            </div>
            <div className="text-sm text-gray-600">Groupes concernés</div>
          </div>
        </div>
      )}

      {/* Tableau */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-300 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-300">
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700 border-r border-gray-300">
                  ID
                </th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700 border-r border-gray-300">
                  Groupe
                </th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700 border-r border-gray-300">
                  Module
                </th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700 border-r border-gray-300">
                  Entité
                </th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700 border-r border-gray-300">
                  Type d'accès
                </th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700 border-r border-gray-300">
                  Statut
                </th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {currentPermissions.length === 0 ? (
                <tr>
                  <td colSpan="7" className="px-6 py-8 text-center text-gray-500 border-b border-gray-300">
                    {permissions.length === 0 ? 'Aucune permission trouvée' : 'Aucun résultat pour votre recherche'}
                  </td>
                </tr>
              ) : (
                currentPermissions.map((permission, index) => (
                  <tr 
                    key={permission.id} 
                    className={`${
                      index % 2 === 0 ? 'bg-white' : 'bg-gray-50'
                    } hover:bg-gray-100 transition-colors border-b border-gray-300`}
                  >
                    <td className="px-6 py-4 text-sm text-gray-900 border-r border-gray-300 font-mono">
                      {permission.id}
                    </td>
                    <td className="px-6 py-4 text-sm font-medium text-gray-900 border-r border-gray-300">
                      <span className="bg-blue-50 px-2 py-1 rounded border border-blue-200">
                        {permission.groupe?.name || 'N/A'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600 border-r border-gray-300">
                      {permission.module?.nom_affiche || 'N/A'}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600 border-r border-gray-300">
                      {permission.entite?.raison_sociale || 'Toutes'}
                    </td>
                    <td className="px-6 py-4 border-r border-gray-300">
                      <span className={`inline-flex px-3 py-1 rounded-full text-xs font-medium border ${getAccesBadgeClasses(permission.acces)}`}>
                        {getAccesLabel(permission.acces)}
                      </span>
                    </td>
                    <td className="px-6 py-4 border-r border-gray-300">
                      <button
                        onClick={() => handleToggleStatut(permission)}
                        className={`inline-flex px-3 py-1 rounded-full text-xs font-medium border transition-colors cursor-pointer ${
                          permission.statut
                            ? 'bg-green-100 text-green-800 border-green-300 hover:bg-green-200' 
                            : 'bg-gray-100 text-gray-800 border-gray-300 hover:bg-gray-200'
                        }`}
                      >
                        {permission.statut ? 'Active' : 'Inactive'}
                      </button>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex space-x-3">
                        <button 
                          onClick={() => handleEdit(permission)}
                          className="text-blue-600 hover:text-blue-800 text-sm font-medium transition-colors flex items-center gap-1"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                          Éditer
                        </button>
                        <button 
                          onClick={() => handleDelete(permission)}
                          className="text-red-600 hover:text-red-800 text-sm font-medium transition-colors flex items-center gap-1"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                          Supprimer
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination - Masquée si pas de données */}
        {filteredPermissions.length > 0 && (
          <div className="px-6 py-4 bg-gray-50 border-t border-gray-300">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <span className="text-sm text-gray-700">
                  Lignes par page:
                </span>
                <select
                  value={itemsPerPage}
                  onChange={(e) => {
                    setItemsPerPage(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                  className="border border-gray-300 rounded px-3 py-1 text-sm"
                >
                  <option value={5}>5</option>
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                  <option value={50}>50</option>
                </select>
                <span className="text-sm text-gray-700">
                  {indexOfFirstItem + 1}-{Math.min(indexOfLastItem, filteredPermissions.length)} sur {filteredPermissions.length}
                </span>
              </div>

              <div className="flex items-center space-x-2">
                <button
                  onClick={prevPage}
                  disabled={currentPage === 1}
                  className={`px-3 py-1 rounded border text-sm ${
                    currentPage === 1
                      ? 'bg-gray-100 text-gray-400 border-gray-300 cursor-not-allowed'
                      : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  Précédent
                </button>

                {/* Numéros de page */}
                <div className="flex space-x-1">
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
                        className={`w-8 h-8 rounded border text-sm ${
                          currentPage === pageNumber
                            ? 'bg-blue-600 text-white border-blue-600'
                            : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
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
                  className={`px-3 py-1 rounded border text-sm ${
                    currentPage === totalPages
                      ? 'bg-gray-100 text-gray-400 border-gray-300 cursor-not-allowed'
                      : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  Suivant
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
          typesAcces={typesAcces}
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

// Composant Modal pour le formulaire des permissions
function PermissionFormModal({ permission, groupes, modules, entites, typesAcces, onClose, onSuccess }) {
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
        groupe: formData.groupe,
        module: formData.module,
        entite: formData.entite || null, // Peut être null pour toutes les entités
        acces: formData.acces,
        statut: formData.statut
      };

      await apiClient.request(url, {
        method: method,
        body: JSON.stringify(apiData),
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

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-800">
            {permission ? 'Modifier la permission' : 'Créer une nouvelle permission'}
          </h2>
        </div>
        
        {error && (
          <div className="mx-6 mt-4 bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-center">
              <svg className="w-5 h-5 text-red-600 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
              <span className="text-red-800 text-sm">{error}</span>
            </div>
          </div>
        )}
        
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Groupe */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Groupe d'utilisateurs *
              </label>
              <select
                required
                value={formData.groupe}
                onChange={(e) => handleChange('groupe', e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Sélectionnez un groupe</option>
                {groupes.map(groupe => (
                  <option key={groupe.id} value={groupe.id}>
                    {groupe.name}
                  </option>
                ))}
              </select>
            </div>
            
            {/* Module */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Module *
              </label>
              <select
                required
                value={formData.module}
                onChange={(e) => handleChange('module', e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Sélectionnez un module</option>
                {modules.map(module => (
                  <option key={module.id} value={module.id}>
                    {module.nom_affiche}
                  </option>
                ))}
              </select>
            </div>
            
            {/* Entité */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Entité (optionnel)
              </label>
              <select
                value={formData.entite}
                onChange={(e) => handleChange('entite', e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Toutes les entités</option>
                {entites.map(entite => (
                  <option key={entite.id} value={entite.id}>
                    {entite.raison_sociale}
                  </option>
                ))}
              </select>
              <p className="text-xs text-gray-500 mt-1">
                Laisser vide pour appliquer à toutes les entités
              </p>
            </div>
            
            {/* Type d'accès */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Type d'accès *
              </label>
              <select
                required
                value={formData.acces}
                onChange={(e) => handleChange('acces', e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                {typesAcces.map(type => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
            </div>
            
            <div className="md:col-span-2">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={formData.statut}
                  onChange={(e) => handleChange('statut', e.target.checked)}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="ml-2 text-sm text-gray-700">Permission active</span>
              </label>
              <p className="text-xs text-gray-500 mt-1">
                Les permissions inactives ne seront pas appliquées
              </p>
            </div>
          </div>

          {/* Aperçu */}
          <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
            <h3 className="text-sm font-medium text-gray-700 mb-2">Aperçu de la permission</h3>
            <div className="space-y-2 text-sm">
              <div className="flex items-center space-x-2">
                <span className="font-medium">Groupe:</span>
                <span className="bg-blue-50 px-2 py-1 rounded border border-blue-200">
                  {groupes.find(g => g.id === parseInt(formData.groupe))?.name || 'Non sélectionné'}
                </span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="font-medium">Module:</span>
                <span className="text-gray-600">
                  {modules.find(m => m.id === parseInt(formData.module))?.nom_affiche || 'Non sélectionné'}
                </span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="font-medium">Entité:</span>
                <span className="text-gray-600">
                  {formData.entite 
                    ? entites.find(e => e.id === formData.entite)?.raison_sociale 
                    : 'Toutes les entités'}
                </span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="font-medium">Accès:</span>
                <span className={`inline-flex px-2 py-1 rounded text-xs font-medium border ${
                  typesAcces.find(t => t.value === formData.acces)?.bgColor || 'bg-gray-100'
                } ${typesAcces.find(t => t.value === formData.acces)?.textColor || 'text-gray-800'} ${
                  typesAcces.find(t => t.value === formData.acces)?.borderColor || 'border-gray-300'
                }`}>
                  {typesAcces.find(t => t.value === formData.acces)?.label || 'Inconnu'}
                </span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="font-medium">Statut:</span>
                <span className={`text-xs px-2 py-1 rounded ${
                  formData.statut 
                    ? 'bg-green-100 text-green-800' 
                    : 'bg-gray-100 text-gray-800'
                }`}>
                  {formData.statut ? 'Active' : 'Inactive'}
                </span>
              </div>
            </div>
          </div>
          
          <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors duration-200"
              disabled={loading}
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors duration-200 flex items-center space-x-2"
            >
              {loading && (
                <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
                </svg>
              )}
              <span>{loading ? 'Sauvegarde...' : permission ? 'Mettre à jour' : 'Créer la permission'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}