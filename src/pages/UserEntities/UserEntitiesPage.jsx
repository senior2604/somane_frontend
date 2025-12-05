import React, { useState, useEffect, useMemo, useCallback } from 'react';
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
  FiUser, 
  FiBriefcase,
  FiCheckCircle,
  FiXCircle,
  FiStar,
  FiUsers,
  FiChevronLeft, 
  FiChevronRight,
  FiDownload,
  FiUpload,
  FiCalendar,
  FiToggleLeft,
  FiToggleRight,
  FiGlobe,
  FiEye,
  FiInfo
} from "react-icons/fi";

export default function UtilisateurEntitePage() {
  const [affiliations, setAffiliations] = useState([]);
  const [utilisateurs, setUtilisateurs] = useState([]);
  const [entites, setEntites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editingAffiliation, setEditingAffiliation] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedAffiliation, setSelectedAffiliation] = useState(null);
  
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterEntite, setFilterEntite] = useState('');
  const [filterActif, setFilterActif] = useState('');
  const [selectedRows, setSelectedRows] = useState([]);

  useEffect(() => {
    fetchAffiliations();
    fetchUtilisateurs();
    fetchEntites();
  }, []);

  const fetchAffiliations = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await apiClient.get('/utilisateurentites/');
      
      let affiliationsData = [];
      if (Array.isArray(response)) {
        affiliationsData = response;
      } else if (response && Array.isArray(response.results)) {
        affiliationsData = response.results;
      } else {
        setError('Format de données inattendu');
        affiliationsData = [];
      }

      setAffiliations(affiliationsData);
    } catch (err) {
      console.error('❌ Erreur lors du chargement des affiliations:', err);
      setError('Erreur lors du chargement des affiliations utilisateur-entité');
    } finally {
      setLoading(false);
    }
  };

  const fetchUtilisateurs = async () => {
    try {
      const response = await apiClient.get('/users/');
      
      let utilisateursData = [];
      if (Array.isArray(response)) {
        utilisateursData = response;
      } else if (response && Array.isArray(response.results)) {
        utilisateursData = response.results;
      } else {
        utilisateursData = [];
      }

      setUtilisateurs(utilisateursData);
    } catch (err) {
      console.error('Error fetching utilisateurs:', err);
      setUtilisateurs([]);
    }
  };

  const fetchEntites = async () => {
    try {
      const response = await apiClient.get('/entites/');
      
      let entitesData = [];
      if (Array.isArray(response)) {
        entitesData = response;
      } else if (response && Array.isArray(response.results)) {
        entitesData = response.results;
      } else {
        entitesData = [];
      }

      setEntites(entitesData);
    } catch (err) {
      console.error('Error fetching entites:', err);
      setEntites([]);
    }
  };

  // Filtrage et recherche
  const filteredAffiliations = useMemo(() => {
    return affiliations.filter(affiliation => {
      const matchesSearch = 
        affiliation.utilisateur_details?.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        affiliation.utilisateur_details?.username?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        affiliation.entite_details?.raison_sociale?.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesEntite = filterEntite === '' || 
        (affiliation.entite && affiliation.entite.id.toString() === filterEntite);
      
      const matchesActif = filterActif === '' || 
        affiliation.actif.toString() === filterActif;
      
      return matchesSearch && matchesEntite && matchesActif;
    });
  }, [affiliations, searchTerm, filterEntite, filterActif]);

  // Calculs pour la pagination
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentAffiliations = useMemo(() => 
    Array.isArray(filteredAffiliations) 
      ? filteredAffiliations.slice(indexOfFirstItem, indexOfLastItem) 
      : []
  , [filteredAffiliations, indexOfFirstItem, indexOfLastItem]);
  
  const totalPages = Math.ceil((Array.isArray(filteredAffiliations) ? filteredAffiliations.length : 0) / itemsPerPage);

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
    if (selectedRows.length === currentAffiliations.length) {
      setSelectedRows([]);
    } else {
      setSelectedRows(currentAffiliations.map(affiliation => affiliation.id));
    }
  }, [currentAffiliations, selectedRows.length]);

  // Gestion des actions
  const handleNewAffiliation = () => {
    setEditingAffiliation(null);
    setShowForm(true);
  };

  const handleEdit = (affiliation) => {
    setEditingAffiliation(affiliation);
    setShowForm(true);
  };

  const handleDelete = async (affiliation) => {
    const utilisateurNom = affiliation.utilisateur?.email || affiliation.utilisateur?.username;
    const entiteNom = affiliation.entite?.raison_sociale;
    
    if (window.confirm(`Êtes-vous sûr de vouloir supprimer l'affiliation "${utilisateurNom} @ ${entiteNom}" ?`)) {
      try {
        await apiClient.delete(`/utilisateurentites/${affiliation.id}/`);
        fetchAffiliations();
      } catch (err) {
        setError('Erreur lors de la suppression');
        console.error('Error deleting affiliation:', err);
      }
    }
  };

  const handleToggleActif = async (affiliation) => {
    try {
      await apiClient.patch(`/utilisateurentites/${affiliation.id}/`, {
        actif: !affiliation.actif
      });
      fetchAffiliations();
    } catch (err) {
      setError('Erreur lors de la modification');
      console.error('Error toggling actif:', err);
    }
  };

  const handleSetDefault = async (affiliation) => {
    try {
      // Désactiver toutes les entités par défaut pour cet utilisateur
      const autresAffiliations = affiliations.filter(
        aff => aff.utilisateur.id === affiliation.utilisateur.id && aff.id !== affiliation.id
      );
      
      for (const aff of autresAffiliations) {
        await apiClient.patch(`/utilisateurentites/${aff.id}/`, {
          est_defaut: false
        });
      }
      
      // Définir celle-ci comme défaut
      await apiClient.patch(`/utilisateurentites/${affiliation.id}/`, {
        est_defaut: true
      });
      
      fetchAffiliations();
    } catch (err) {
      setError('Erreur lors de la modification');
      console.error('Error setting default:', err);
    }
  };

  const handleViewDetails = (affiliation) => {
    setSelectedAffiliation(affiliation);
    setShowDetailModal(true);
  };

  const handleFormSuccess = () => {
    setShowForm(false);
    setEditingAffiliation(null);
    fetchAffiliations();
  };

  const handleRetry = () => {
    fetchAffiliations();
  };

  const handleResetFilters = () => {
    setSearchTerm('');
    setFilterEntite('');
    setFilterActif('');
    setCurrentPage(1);
  };

  // Statistiques - SIMPLIFIÉES (3 cartes seulement)
  const stats = useMemo(() => ({
    total: affiliations.length,
    actives: affiliations.filter(a => a.actif).length,
    defaut: affiliations.filter(a => a.est_defaut).length,
  }), [affiliations]);

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
              <h1 className="text-xl font-bold text-gray-900">Affiliations Utilisateur-Entité</h1>
              <p className="text-gray-600 text-xs mt-0.5">
                Gérez les affiliations entre utilisateurs et entités
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
              onClick={handleNewAffiliation}
              className="px-4 py-1.5 rounded-lg bg-gradient-to-r from-violet-600 to-violet-500 text-white hover:from-violet-700 hover:to-violet-600 transition-all duration-300 hover:shadow flex items-center gap-1.5 text-sm group shadow"
            >
              <FiPlus className="group-hover:rotate-90 transition-transform duration-300 text-sm" />
              <span className="font-semibold">Nouvelle Affiliation</span>
            </button>
          </div>
        </div>

        {/* Statistiques en ligne - 3 CARTES SEULEMENT - COMPACT */}
        <div className="grid grid-cols-3 gap-3 mb-4">
          <div className="bg-white rounded-lg p-3 border border-gray-200 shadow-sm hover:shadow transition-shadow duration-300">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-600">Total des affiliations</p>
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
                <p className="text-xs text-gray-600">Affiliations actives</p>
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
                <p className="text-xs text-gray-600">Entités par défaut</p>
                <p className="text-lg font-bold text-purple-600 mt-0.5">{stats.defaut}</p>
              </div>
              <div className="p-1.5 bg-purple-50 rounded">
                <FiStar className="w-4 h-4 text-purple-600" />
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
                {filteredAffiliations.length} résultat(s)
              </span>
              {(searchTerm || filterEntite || filterActif) && (
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
                    placeholder="Rechercher une affiliation..."
                  />
                </div>
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Entité</label>
              <div className="relative">
                <FiBriefcase className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 text-sm" />
                <select
                  value={filterEntite}
                  onChange={(e) => setFilterEntite(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-violet-500 focus:border-transparent bg-white appearance-none text-sm"
                >
                  <option value="">Toutes les entités</option>
                  {entites.map(entite => (
                    <option key={entite.id} value={entite.id}>
                      {entite.raison_sociale}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Statut</label>
              <div className="relative">
                <FiFilter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 text-sm" />
                <select
                  value={filterActif}
                  onChange={(e) => setFilterActif(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-violet-500 focus:border-transparent bg-white appearance-none text-sm"
                >
                  <option value="">Tous les statuts</option>
                  <option value="true">Actif</option>
                  <option value="false">Inactif</option>
                </select>
              </div>
            </div>
            <div className="lg:col-span-3 flex items-end">
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

      {/* Tableau Principal - SIMPLIFIÉ (6 colonnes seulement) */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        {/* En-tête du tableau avec actions - COMPACT */}
        <div className="px-4 py-3 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5">
                <input
                  type="checkbox"
                  checked={selectedRows.length === currentAffiliations.length && currentAffiliations.length > 0}
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
                      checked={selectedRows.length === currentAffiliations.length && currentAffiliations.length > 0}
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
                  Entité
                </th>
                <th scope="col" className="px-3 py-2 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider border-r border-gray-300">
                  Statut
                </th>
                <th scope="col" className="px-3 py-2 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider border-r border-gray-300">
                  Défaut
                </th>
                <th scope="col" className="px-3 py-2 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {currentAffiliations.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-3 py-6 text-center">
                    <div className="flex flex-col items-center justify-center">
                      <div className="w-16 h-16 bg-gradient-to-br from-gray-100 to-gray-200 rounded-full flex items-center justify-center mb-3">
                        <FiUsers className="w-8 h-8 text-gray-400" />
                      </div>
                      <h3 className="text-base font-semibold text-gray-900 mb-1.5">
                        {affiliations.length === 0 ? 'Aucune affiliation trouvée' : 'Aucun résultat pour votre recherche'}
                      </h3>
                      <p className="text-gray-600 mb-4 max-w-md text-sm">
                        {affiliations.length === 0 
                          ? 'Commencez par créer votre première affiliation' 
                          : 'Essayez de modifier vos critères de recherche ou de filtres'}
                      </p>
                      {affiliations.length === 0 && (
                        <button 
                          onClick={handleNewAffiliation}
                          className="px-4 py-1.5 bg-gradient-to-r from-violet-600 to-violet-500 text-white rounded-lg hover:from-violet-700 hover:to-violet-600 transition-all duration-300 font-medium flex items-center gap-1.5 text-sm"
                        >
                          <FiPlus />
                          Créer ma première affiliation
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                currentAffiliations.map((affiliation) => (
                  <tr 
                    key={affiliation.id} 
                    className={`hover:bg-gradient-to-r hover:from-gray-50 hover:to-white transition-all duration-200 ${
                      selectedRows.includes(affiliation.id) ? 'bg-gradient-to-r from-violet-50 to-violet-25' : 'bg-white'
                    }`}
                  >
                    <td className="px-3 py-2 whitespace-nowrap border-r border-gray-200">
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={selectedRows.includes(affiliation.id)}
                          onChange={() => toggleRowSelection(affiliation.id)}
                          className="w-3.5 h-3.5 text-violet-600 rounded focus:ring-violet-500 border-gray-300"
                        />
                        <span className="px-1.5 py-0.5 bg-gray-100 text-gray-800 rounded text-xs font-medium font-mono">
                          #{affiliation.id}
                        </span>
                      </div>
                    </td>
                    <td className="px-3 py-2 border-r border-gray-200">
                      <div>
                        <div className="text-sm font-semibold text-gray-900 truncate max-w-[150px]">
                          {affiliation.utilisateur_details?.email || '-'}
                        </div>
                        <div className="text-xs text-gray-500">
                          @{affiliation.utilisateur_details?.username}
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-2 border-r border-gray-200">
                      <div className="text-sm font-medium text-gray-900 truncate max-w-[150px]">
                        {affiliation.entite_details?.raison_sociale || '-'}
                      </div>
                      <div className="text-xs text-gray-500 truncate max-w-[150px]">
                        {affiliation.entite_details?.telephone || '-'}
                      </div>
                    </td>
                    <td className="px-3 py-2 border-r border-gray-200">
                      <div className="flex items-center">
                        <div className={`px-2 py-1 rounded flex items-center gap-1 ${
                          affiliation.actif
                            ? 'bg-gradient-to-r from-green-50 to-emerald-50 text-green-700 border border-green-200' 
                            : 'bg-gradient-to-r from-red-50 to-pink-50 text-red-700 border border-red-200'
                        }`}>
                          {affiliation.actif ? (
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
                    <td className="px-3 py-2 border-r border-gray-200">
                      <div className="flex items-center justify-center">
                        {affiliation.est_defaut ? (
                          <div className="px-2 py-1 bg-gradient-to-r from-purple-50 to-purple-100 text-purple-700 rounded border border-purple-200 flex items-center gap-1">
                            <FiStar className="w-2.5 h-2.5" />
                            <span className="text-xs font-medium">Défaut</span>
                          </div>
                        ) : (
                          <span className="text-gray-400 text-xs">-</span>
                        )}
                      </div>
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => handleViewDetails(affiliation)}
                          className="p-1.5 bg-gradient-to-r from-gray-50 to-gray-100 text-gray-700 rounded-lg hover:from-gray-100 hover:to-gray-200 transition-all duration-200 shadow-sm hover:shadow"
                          title="Voir détails"
                        >
                          <FiEye size={14} />
                        </button>
                        <button
                          onClick={() => handleToggleActif(affiliation)}
                          className={`p-1.5 rounded-lg transition-all duration-200 shadow-sm hover:shadow ${
                            affiliation.actif
                              ? 'bg-gradient-to-r from-orange-50 to-orange-100 text-orange-700 hover:from-orange-100 hover:to-orange-200'
                              : 'bg-gradient-to-r from-green-50 to-green-100 text-green-700 hover:from-green-100 hover:to-green-200'
                          }`}
                          title={affiliation.actif ? 'Désactiver' : 'Activer'}
                        >
                          {affiliation.actif ? (
                            <FiToggleRight size={14} />
                          ) : (
                            <FiToggleLeft size={14} />
                          )}
                        </button>
                        {!affiliation.est_defaut && (
                          <button
                            onClick={() => handleSetDefault(affiliation)}
                            className="p-1.5 bg-gradient-to-r from-purple-50 to-purple-100 text-purple-700 rounded-lg hover:from-purple-100 hover:to-purple-200 transition-all duration-200 shadow-sm hover:shadow"
                            title="Définir comme défaut"
                          >
                            <FiStar size={14} />
                          </button>
                        )}
                        <button
                          onClick={() => handleEdit(affiliation)}
                          className="p-1.5 bg-gradient-to-r from-violet-50 to-violet-100 text-violet-700 rounded-lg hover:from-violet-100 hover:to-violet-200 transition-all duration-200 shadow-sm hover:shadow"
                          title="Modifier"
                        >
                          <FiEdit2 size={14} />
                        </button>
                        <button
                          onClick={() => handleDelete(affiliation)}
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
        {filteredAffiliations.length > 0 && (
          <div className="px-4 py-3 border-t border-gray-200 bg-gradient-to-r from-gray-50 to-white">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs text-gray-700">
                    Page {currentPage} sur {totalPages}
                  </span>
                  <span className="text-gray-300">•</span>
                  <span className="text-xs text-gray-700">
                    {indexOfFirstItem + 1}-{Math.min(indexOfLastItem, filteredAffiliations.length)} sur {filteredAffiliations.length} affiliations
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
        <UtilisateurEntiteFormModal
          affiliation={editingAffiliation}
          utilisateurs={utilisateurs}
          entites={entites}
          onClose={() => {
            setShowForm(false);
            setEditingAffiliation(null);
          }}
          onSuccess={handleFormSuccess}
        />
      )}

      {/* Modal de détails */}
      {showDetailModal && selectedAffiliation && (
        <UtilisateurEntiteDetailModal
          affiliation={selectedAffiliation}
          onClose={() => {
            setShowDetailModal(false);
            setSelectedAffiliation(null);
          }}
        />
      )}
    </div>
  );
}

// MODAL DE DÉTAILS POUR LES AFFILIATIONS
function UtilisateurEntiteDetailModal({ affiliation, onClose }) {
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
                <h2 className="text-base font-bold">Détails de l'affiliation</h2>
                <p className="text-violet-100 text-xs mt-0.5">
                  {affiliation.utilisateur_details?.email} @ {affiliation.entite_details?.raison_sociale}
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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <p className="text-xs font-medium text-gray-500 mb-0.5">ID</p>
                <p className="text-sm text-gray-900 font-medium">#{affiliation.id}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500 mb-0.5">Date de création</p>
                <p className="text-sm text-gray-900">
                  {new Date(affiliation.date_creation).toLocaleDateString('fr-FR')} à{' '}
                  {new Date(affiliation.date_creation).toLocaleTimeString('fr-FR')}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500 mb-0.5">Dernière modification</p>
                <p className="text-sm text-gray-900">
                  {affiliation.date_modification 
                    ? `${new Date(affiliation.date_modification).toLocaleDateString('fr-FR')} à ${new Date(affiliation.date_modification).toLocaleTimeString('fr-FR')}`
                    : 'Jamais modifiée'}
                </p>
              </div>
            </div>
          </div>

          {/* Informations Utilisateur */}
          <div className="bg-gradient-to-br from-violet-50 to-white rounded-lg p-3 border border-violet-100">
            <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-1.5">
              <div className="w-1 h-4 bg-gradient-to-b from-violet-600 to-violet-400 rounded"></div>
              Informations Utilisateur
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <p className="text-xs font-medium text-gray-500 mb-0.5">Email</p>
                <p className="text-sm text-gray-900 font-medium">{affiliation.utilisateur_details?.email || '-'}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500 mb-0.5">Nom d'utilisateur</p>
                <p className="text-sm text-gray-900">@{affiliation.utilisateur_details?.username}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500 mb-0.5">Nom complet</p>
                <p className="text-sm text-gray-900">
                  {affiliation.utilisateur_details?.first_name} {affiliation.utilisateur_details?.last_name}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500 mb-0.5">Téléphone</p>
                <p className="text-sm text-gray-900">{affiliation.utilisateur_details?.telephone || '-'}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500 mb-0.5">Statut utilisateur</p>
                <div className={`px-2 py-1 rounded inline-flex items-center gap-1 ${
                  affiliation.utilisateur_details?.statut === 'actif'
                    ? 'bg-gradient-to-r from-green-50 to-emerald-50 text-green-700 border border-green-200' 
                    : 'bg-gradient-to-r from-red-50 to-pink-50 text-red-700 border border-red-200'
                }`}>
                  {affiliation.utilisateur_details?.statut === 'actif' ? (
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

          {/* Informations Entité */}
          <div className="bg-gradient-to-br from-purple-50 to-white rounded-lg p-3 border border-purple-100">
            <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-1.5">
              <div className="w-1 h-4 bg-gradient-to-b from-purple-600 to-purple-400 rounded"></div>
              Informations Entité
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <p className="text-xs font-medium text-gray-500 mb-0.5">Raison Sociale</p>
                <p className="text-sm text-gray-900 font-medium">{affiliation.entite_details?.raison_sociale || '-'}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500 mb-0.5">Téléphone</p>
                <p className="text-sm text-gray-900">{affiliation.entite_details?.telephone || '-'}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500 mb-0.5">Email</p>
                <p className="text-sm text-gray-900">{affiliation.entite_details?.email || '-'}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500 mb-0.5">Activité</p>
                <p className="text-sm text-gray-900">{affiliation.entite_details?.activite || '-'}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500 mb-0.5">Adresse</p>
                <p className="text-sm text-gray-900">{affiliation.entite_details?.adresse || '-'}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500 mb-0.5">Statut entité</p>
                <div className={`px-2 py-1 rounded inline-flex items-center gap-1 ${
                  affiliation.entite_details?.statut
                    ? 'bg-gradient-to-r from-green-50 to-emerald-50 text-green-700 border border-green-200' 
                    : 'bg-gradient-to-r from-red-50 to-pink-50 text-red-700 border border-red-200'
                }`}>
                  {affiliation.entite_details?.statut ? (
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

          {/* Paramètres de l'affiliation */}
          <div className="bg-gradient-to-br from-blue-50 to-white rounded-lg p-3 border border-blue-100">
            <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-1.5">
              <div className="w-1 h-4 bg-gradient-to-b from-blue-600 to-blue-400 rounded"></div>
              Paramètres de l'affiliation
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <p className="text-xs font-medium text-gray-500 mb-0.5">Statut de l'affiliation</p>
                <div className={`px-2 py-1 rounded inline-flex items-center gap-1 ${
                  affiliation.actif
                    ? 'bg-gradient-to-r from-green-50 to-emerald-50 text-green-700 border border-green-200' 
                    : 'bg-gradient-to-r from-red-50 to-pink-50 text-red-700 border border-red-200'
                }`}>
                  {affiliation.actif ? (
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
              <div>
                <p className="text-xs font-medium text-gray-500 mb-0.5">Entité par défaut</p>
                <div className={`px-2 py-1 rounded inline-flex items-center gap-1 ${
                  affiliation.est_defaut
                    ? 'bg-gradient-to-r from-purple-50 to-purple-100 text-purple-700 border border-purple-200' 
                    : 'bg-gradient-to-r from-gray-50 to-gray-100 text-gray-700 border border-gray-200'
                }`}>
                  {affiliation.est_defaut ? (
                    <>
                      <FiStar className="w-3 h-3" />
                      <span className="text-xs font-medium">Entité par défaut</span>
                    </>
                  ) : (
                    <>
                      <span className="text-xs font-medium">Non</span>
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

// COMPOSANT MODAL POUR LES AFFILIATIONS - FORMULAIRE COMPACT
function UtilisateurEntiteFormModal({ affiliation, utilisateurs, entites, onClose, onSuccess }) {
  const [formData, setFormData] = useState({
    utilisateur: affiliation?.utilisateur?.id || '',
    entite: affiliation?.entite?.id || '',
    est_defaut: affiliation?.est_defaut || false,
    actif: affiliation?.actif ?? true
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Fonction pour trouver l'utilisateur sélectionné
  const getSelectedUtilisateur = () => {
    if (!formData.utilisateur) return null;
    
    const utilisateurId = formData.utilisateur.toString();
    return utilisateurs.find(u => 
      u.id?.toString() === utilisateurId ||
      u.id === formData.utilisateur
    );
  };

  // Fonction pour trouver l'entité sélectionnée
  const getSelectedEntite = () => {
    if (!formData.entite) return null;
    
    const entiteId = formData.entite.toString();
    return entites.find(e => 
      e.id?.toString() === entiteId ||
      e.id === formData.entite
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    // Validation
    if (!formData.utilisateur || !formData.entite) {
      setError('L\'utilisateur et l\'entité sont obligatoires');
      setLoading(false);
      return;
    }

    try {
      const url = affiliation 
        ? `/utilisateurentites/${affiliation.id}/`
        : `/utilisateurentites/`;
      
      const method = affiliation ? 'PUT' : 'POST';

      console.log('📤 Sauvegarde affiliation:', { url, method, formData });

      const response = await apiClient.request(url, {
        method: method,
        body: JSON.stringify(formData),
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      console.log('✅ Affiliation sauvegardée:', response);
      onSuccess();
    } catch (err) {
      console.error('❌ Erreur sauvegarde affiliation:', err);
      
      let errorMessage = 'Erreur lors de la sauvegarde';
      if (err.response?.data) {
        errorMessage = `Erreur ${err.response.status}: ${JSON.stringify(err.response.data)}`;
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

  // Rendu conditionnel si les données ne sont pas chargées
  if (utilisateurs.length === 0 || entites.length === 0) {
    return (
      <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-3 z-50 backdrop-blur-sm">
        <div className="bg-white rounded-lg w-full max-w-2xl p-4">
          <div className="flex flex-col items-center justify-center py-8">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-violet-600 mb-3"></div>
            <p className="text-gray-600 text-sm">Chargement des données utilisateurs et entités...</p>
          </div>
        </div>
      </div>
    );
  }

  const selectedUtilisateur = getSelectedUtilisateur();
  const selectedEntite = getSelectedEntite();

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-3 z-50 backdrop-blur-sm">
      <div className="bg-white rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-xl">
        {/* Header du modal - COMPACT */}
        <div className="sticky top-0 bg-gradient-to-r from-violet-600 to-violet-500 text-white rounded-t-lg p-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-white/20 backdrop-blur-sm rounded">
                <FiUsers className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-base font-bold">
                  {affiliation ? 'Modifier l\'affiliation' : 'Nouvelle Affiliation'}
                </h2>
                {!affiliation && (
                  <p className="text-violet-100 text-xs mt-0.5">
                    Créez une nouvelle affiliation utilisateur-entité
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
          {/* Section 1: Sélection - COMPACT */}
          <div className="bg-gradient-to-br from-gray-50 to-white rounded-lg p-3 border border-gray-200">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-1 h-4 bg-gradient-to-b from-violet-600 to-violet-400 rounded"></div>
              <h3 className="text-sm font-semibold text-gray-900">Sélection</h3>
            </div>
            
            <div className="grid grid-cols-1 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Utilisateur <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <FiUser className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 z-10" size={16} />
                  <select
                    required
                    value={formData.utilisateur}
                    onChange={(e) => handleChange('utilisateur', e.target.value)}
                    className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-violet-500 focus:border-transparent bg-white appearance-none text-sm"
                  >
                    <option value="">Sélectionnez un utilisateur</option>
                    {utilisateurs.map(utilisateur => (
                      <option key={utilisateur.id} value={utilisateur.id}>
                        {utilisateur.email} ({utilisateur.username})
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Entité <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <FiBriefcase className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 z-10" size={16} />
                  <select
                    required
                    value={formData.entite}
                    onChange={(e) => handleChange('entite', e.target.value)}
                    className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-violet-500 focus:border-transparent bg-white appearance-none text-sm"
                  >
                    <option value="">Sélectionnez une entité</option>
                    {entites.map(entite => (
                      <option key={entite.id} value={entite.id}>
                        {entite.raison_sociale}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* Section 2: Paramètres - COMPACT */}
          <div className="bg-gradient-to-br from-violet-50 to-white rounded-lg p-3 border border-violet-100">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-1 h-4 bg-gradient-to-b from-violet-600 to-violet-400 rounded"></div>
              <h3 className="text-sm font-semibold text-gray-900">Paramètres</h3>
            </div>
            
            <div className="space-y-3">
              <label className="flex items-center gap-2 p-2 bg-white rounded-lg border border-gray-300 hover:border-violet-300 transition-colors cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.actif}
                  onChange={(e) => handleChange('actif', e.target.checked)}
                  className="w-4 h-4 text-violet-600 border-gray-300 rounded focus:ring-violet-500"
                />
                <div>
                  <span className="text-sm font-medium text-gray-900">
                    Affiliation active
                  </span>
                  <p className="text-xs text-gray-500 mt-0.5">
                    L'utilisateur pourra accéder à cette entité
                  </p>
                </div>
              </label>
              
              <label className="flex items-center gap-2 p-2 bg-white rounded-lg border border-gray-300 hover:border-violet-300 transition-colors cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.est_defaut}
                  onChange={(e) => handleChange('est_defaut', e.target.checked)}
                  className="w-4 h-4 text-violet-600 border-gray-300 rounded focus:ring-violet-500"
                />
                <div>
                  <span className="text-sm font-medium text-gray-900">
                    Entité par défaut
                  </span>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Cette entité sera sélectionnée par défaut
                  </p>
                </div>
              </label>
            </div>
          </div>

          {/* Aperçu */}
          <div className="bg-gradient-to-br from-blue-50 to-white rounded-lg p-3 border border-blue-100">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-1 h-4 bg-gradient-to-b from-blue-600 to-blue-400 rounded"></div>
              <h3 className="text-sm font-semibold text-gray-900">Aperçu de l'affiliation</h3>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-white rounded-lg p-2 border border-gray-200">
                <div className="text-xs font-semibold text-gray-500 uppercase mb-1">Utilisateur</div>
                <div className="text-xs font-medium text-gray-900 truncate">
                  {selectedUtilisateur ? 
                    selectedUtilisateur.email || selectedUtilisateur.username || `Utilisateur #${formData.utilisateur}`
                    : 'Non défini'}
                </div>
                {selectedUtilisateur && (
                  <div className="text-xs text-gray-500 mt-0.5 truncate">
                    @{selectedUtilisateur.username}
                  </div>
                )}
              </div>
              <div className="bg-white rounded-lg p-2 border border-gray-200">
                <div className="text-xs font-semibold text-gray-500 uppercase mb-1">Entité</div>
                <div className="text-xs font-medium text-gray-900 truncate">
                  {selectedEntite ? 
                    selectedEntite.raison_sociale || `Entité #${formData.entite}`
                    : 'Non défini'}
                </div>
                {selectedEntite && (
                  <div className="text-xs text-gray-500 mt-0.5 truncate">
                    {selectedEntite.telephone || 'Aucun téléphone'}
                  </div>
                )}
              </div>
              <div className="bg-white rounded-lg p-2 border border-gray-200">
                <div className="text-xs font-semibold text-gray-500 uppercase mb-1">Statut</div>
                <div>
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                    formData.actif 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-red-100 text-red-800'
                  }`}>
                    {formData.actif ? 'Actif' : 'Inactif'}
                  </span>
                </div>
              </div>
              <div className="bg-white rounded-lg p-2 border border-gray-200">
                <div className="text-xs font-semibold text-gray-500 uppercase mb-1">Par défaut</div>
                <div>
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                    formData.est_defaut 
                      ? 'bg-purple-100 text-purple-800' 
                      : 'bg-gray-100 text-gray-800'
                  }`}>
                    {formData.est_defaut ? 'Oui' : 'Non'}
                  </span>
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
                  <span>{affiliation ? 'Mettre à jour' : 'Créer l\'affiliation'}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}