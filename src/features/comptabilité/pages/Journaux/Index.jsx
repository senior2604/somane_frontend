import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  FiRefreshCw, 
  FiPlus, 
  FiSearch, 
  FiX, 
  FiFilter, 
  FiColumns,
  FiChevronDown,
  FiEye, 
  FiDownload, 
  FiUpload, 
  FiChevronLeft, 
  FiChevronRight,
  FiEdit2,
  FiTrash2,
  FiCheck,
  FiCheckSquare,
  FiSquare,
  FiExternalLink
} from "react-icons/fi";
import { apiClient, authService } from "./services";
import { useNavigate } from 'react-router-dom';

export default function Index() {
  const navigate = useNavigate();
  
  // États principaux
  const [journaux, setJournaux] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [journalTypes, setJournalTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // États pour navigation
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [selectedRows, setSelectedRows] = useState([]);
  
  // États pour filtres
  const [searchTerm, setSearchTerm] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [filterCompany, setFilterCompany] = useState('');
  const [filterType, setFilterType] = useState('');
  const [filterActive, setFilterActive] = useState('');

  // État pour le menu des colonnes
  const [showColumnMenu, setShowColumnMenu] = useState(false);
  const [visibleColumns, setVisibleColumns] = useState({
    code: true,
    nom: true,
    type: true,
    entreprise: true,
    compte: true,
    statut: true,
    actions: true
  });

  // États pour les actions batch
  const [showBatchActions, setShowBatchActions] = useState(false);
  const [batchActionLoading, setBatchActionLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  // Extraire les données
  const extractData = useCallback((response) => {
    if (!response) return [];
    if (Array.isArray(response)) return response;
    if (response.data && Array.isArray(response.data)) return response.data;
    if (response.results && Array.isArray(response.results)) return response.results;
    return [];
  }, []);

  // Charger les données
  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      setSuccessMessage('');
      
      const [journauxRes, typesRes] = await Promise.all([
        apiClient.get('/compta/journals/'),
        apiClient.get('/compta/journal-types/')
      ]);

      const journauxData = extractData(journauxRes);
      const typesData = extractData(typesRes);

      // DEBUG: Voir la structure des données
      console.log('Journaux chargés:', journauxData);
      console.log('Types chargés:', typesData);
      
      if (journauxData.length > 0) {
        console.log('Structure du premier journal:', {
          id: journauxData[0].id,
          type: journauxData[0].type,
          type_name: journauxData[0].type_name,
          company: journauxData[0].company,
          default_account: journauxData[0].default_account
        });
      }

      setJournaux(journauxData);
      setJournalTypes(typesData);

      if (authService.isAuthenticated()) {
        try {
          const companiesRes = await apiClient.get('/entites/');
          setCompanies(extractData(companiesRes));
        } catch (err) {
          console.log('Erreur chargement entreprises:', err);
          setCompanies([]);
        }
      }

    } catch (err) {
      console.error('Erreur chargement journaux:', err);
      setError(err.response?.data?.detail || err.message || 'Erreur de connexion au serveur');
    } finally {
      setLoading(false);
    }
  }, [extractData]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Réinitialiser tous les filtres
  const resetFilters = useCallback(() => {
    setSearchTerm('');
    setFilterCompany('');
    setFilterType('');
    setFilterActive('');
    setCurrentPage(1);
    setShowFilters(false);
  }, []);

  // CORRECTION DU FILTRAGE
  const filteredJournaux = useMemo(() => {
    if (!Array.isArray(journaux)) return [];
    
    return journaux.filter(journal => {
      if (!journal) return false;
      
      const searchTermLower = searchTerm.toLowerCase();
      const journalName = journal.name || '';
      const journalCode = journal.code || '';
      
      const matchesSearch = 
        !searchTerm ||
        journalName.toLowerCase().includes(searchTermLower) ||
        journalCode.toLowerCase().includes(searchTermLower);
      
      // CORRECTION : journal.company peut être un ID ou un objet
      const companyId = journal.company?.id || journal.company || journal.company_id;
      const matchesCompany = !filterCompany || 
        (companyId && companyId.toString() === filterCompany);
      
      // CORRECTION : journal.type peut être un ID ou un objet
      const typeId = journal.type?.id || journal.type || journal.type_id;
      const matchesType = !filterType || 
        (typeId && typeId.toString() === filterType);
      
      const matchesActive = filterActive === '' || 
        (filterActive === 'true' ? journal.active : !journal.active);
      
      return matchesSearch && matchesCompany && matchesType && matchesActive;
    });
  }, [journaux, searchTerm, filterCompany, filterType, filterActive]);

  // Pagination
  const totalItems = filteredJournaux.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / itemsPerPage));
  const indexOfLastItem = Math.min(currentPage * itemsPerPage, totalItems);
  const indexOfFirstItem = Math.max(0, indexOfLastItem - itemsPerPage);
  const currentJournaux = filteredJournaux.slice(indexOfFirstItem, indexOfLastItem);

  // Sélection des lignes
  const toggleRowSelection = useCallback((id) => {
    setSelectedRows(prev => 
      prev.includes(id) 
        ? prev.filter(rowId => rowId !== id)
        : [...prev, id]
    );
  }, []);

  const selectAllRows = useCallback(() => {
    if (selectedRows.length === currentJournaux.length && currentJournaux.length > 0) {
      setSelectedRows([]);
      setShowBatchActions(false);
    } else {
      const ids = currentJournaux.map(journal => journal?.id).filter(id => id != null);
      setSelectedRows(ids);
      setShowBatchActions(ids.length > 0);
    }
  }, [currentJournaux, selectedRows.length]);

  // Navigation de pagination
  const paginate = useCallback((pageNumber) => {
    const validPage = Math.max(1, Math.min(pageNumber, totalPages));
    setCurrentPage(validPage);
  }, [totalPages]);

  const nextPage = useCallback(() => {
    if (currentPage < totalPages) {
      setCurrentPage(prev => prev + 1);
    }
  }, [currentPage, totalPages]);

  const prevPage = useCallback(() => {
    if (currentPage > 1) {
      setCurrentPage(prev => prev - 1);
    }
  }, [currentPage]);

  // Menu des colonnes
  const toggleColumn = useCallback((column) => {
    setVisibleColumns(prev => ({
      ...prev,
      [column]: !prev[column]
    }));
  }, []);

  // Compter les filtres actifs
  const activeFiltersCount = [
    filterCompany,
    filterType,
    filterActive
  ].filter(Boolean).length;

  // ACTIONS BATCH (massives)
  const handleBatchActivate = async () => {
    if (selectedRows.length === 0) return;
    
    setBatchActionLoading(true);
    try {
      const promises = selectedRows.map(id => 
        apiClient.patch(`/compta/journals/${id}/`, { active: true })
      );
      await Promise.all(promises);
      
      setSuccessMessage(`${selectedRows.length} journal(s) activé(s) avec succès`);
      setSelectedRows([]);
      setShowBatchActions(false);
      loadData();
    } catch (err) {
      setError('Erreur lors de l\'activation des journaux');
    } finally {
      setBatchActionLoading(false);
    }
  };

  const handleBatchDeactivate = async () => {
    if (selectedRows.length === 0) return;
    
    setBatchActionLoading(true);
    try {
      const promises = selectedRows.map(id => 
        apiClient.patch(`/compta/journals/${id}/`, { active: false })
      );
      await Promise.all(promises);
      
      setSuccessMessage(`${selectedRows.length} journal(s) désactivé(s) avec succès`);
      setSelectedRows([]);
      setShowBatchActions(false);
      loadData();
    } catch (err) {
      setError('Erreur lors de la désactivation des journaux');
    } finally {
      setBatchActionLoading(false);
    }
  };

  const handleBatchDelete = async () => {
    if (selectedRows.length === 0) return;
    
    if (!window.confirm(`Êtes-vous sûr de vouloir supprimer ${selectedRows.length} journal(s) ? Cette action est irréversible.`)) {
      return;
    }
    
    setBatchActionLoading(true);
    try {
      const promises = selectedRows.map(id => 
        apiClient.delete(`/compta/journals/${id}/`)
      );
      await Promise.all(promises);
      
      setSuccessMessage(`${selectedRows.length} journal(s) supprimé(s) avec succès`);
      setSelectedRows([]);
      setShowBatchActions(false);
      loadData();
    } catch (err) {
      setError('Erreur lors de la suppression des journaux');
    } finally {
      setBatchActionLoading(false);
    }
  };

  // Exporter les données
  const handleExport = () => {
    const dataToExport = filteredJournaux.map(journal => ({
      Code: journal.code || '',
      Nom: journal.name || '',
      Type: journal.type?.name || journal.type_name || '',
      Entreprise: journal.company?.raison_sociale || journal.company?.nom || '',
      Compte: journal.default_account?.code || '',
      Statut: journal.active ? 'Actif' : 'Inactif',
      Note: journal.note || ''
    }));

    const csv = [
      Object.keys(dataToExport[0] || {}).join(','),
      ...dataToExport.map(row => Object.values(row).map(value => 
        `"${String(value).replace(/"/g, '""')}"`
      ).join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `journaux_comptables_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Importer (simulation)
  const handleImport = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    // Simuler l'import
    setTimeout(() => {
      setSuccessMessage(`Fichier "${file.name}" importé avec succès (simulation)`);
      // Pour un vrai import, il faudrait envoyer le fichier à l'API
    }, 1500);
  };

  // Chargement simplifié
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
            <p className="text-gray-500 text-sm mt-4">Chargement des journaux comptables...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 bg-gradient-to-br from-gray-50 to-white min-h-screen">
      {/* Barre supérieure CENTRÉE */}
      <div className="mb-6">
        <div className="flex items-center justify-center gap-4 mb-4">
          {/* Bouton Actualiser */}
          <button 
            onClick={loadData}
            disabled={loading}
            className="px-3 py-2 border border-gray-300 rounded-lg bg-white text-gray-700 hover:bg-gray-50 flex items-center gap-1.5 text-sm whitespace-nowrap disabled:opacity-50"
          >
            <FiRefreshCw className={loading ? 'animate-spin' : ''} size={14} />
            Actualiser
          </button>
          
          {/* Bouton Colonnes */}
          <div className="relative">
            <button
              onClick={() => setShowColumnMenu(!showColumnMenu)}
              className="px-3 py-2 border border-gray-300 rounded-lg bg-white text-gray-700 hover:bg-gray-50 flex items-center gap-1.5 text-sm whitespace-nowrap"
              title="Colonnes visibles"
            >
              <FiColumns size={14} />
              Colonnes
            </button>
            
            {showColumnMenu && (
              <div className="absolute right-0 mt-2 w-48 bg-white border border-gray-300 rounded-lg shadow-lg z-50">
                <div className="p-3 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-gray-100">
                  <p className="text-sm font-semibold text-gray-700">Colonnes visibles</p>
                </div>
                <div className="p-2 space-y-1 max-h-60 overflow-y-auto">
                  {Object.entries(visibleColumns).map(([key, value]) => (
                    <label key={key} className="flex items-center gap-2 px-2 py-1.5 hover:bg-gray-50 rounded cursor-pointer">
                      <input
                        type="checkbox"
                        checked={value}
                        onChange={() => toggleColumn(key)}
                        className="w-3.5 h-3.5 text-violet-600 rounded focus:ring-violet-500 border-gray-300"
                      />
                      <span className="text-xs text-gray-700 capitalize">{key}</span>
                    </label>
                  ))}
                </div>
                <div className="p-2 border-t border-gray-200">
                  <button
                    onClick={() => {
                      setVisibleColumns({
                        code: true,
                        nom: true,
                        type: true,
                        entreprise: true,
                        compte: true,
                        statut: true,
                        actions: true
                      });
                    }}
                    className="w-full px-2 py-1.5 text-xs text-violet-600 hover:bg-violet-50 rounded transition-colors font-medium"
                  >
                    Tout afficher
                  </button>
                </div>
              </div>
            )}
          </div>
          
          {/* Bouton Nouveau Journal */}
          <button 
            onClick={() => navigate('/comptabilite/journaux/create')}
            className="px-3 py-2 bg-gradient-to-r from-violet-600 to-violet-500 text-white rounded-lg hover:from-violet-700 hover:to-violet-600 flex items-center gap-1.5 text-sm whitespace-nowrap"
          >
            <FiPlus size={14} />
            Nouveau Journal
          </button>
        </div>

        {/* Barre de recherche et Filtres */}
        <div className="flex items-center justify-center gap-4 mb-4">
          {/* Champ de recherche */}
          <div className="relative">
            <div className="relative flex items-center">
              <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1);
                }}
                className="pl-9 pr-32 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-violet-500 focus:border-transparent text-sm w-96"
                placeholder="Rechercher un journal..."
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="absolute right-28 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1"
                >
                  <FiX size={14} />
                </button>
              )}
              
              {/* Bouton Filtres */}
              <div className="absolute right-1 top-1/2 transform -translate-y-1/2">
                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className="flex items-center gap-1 px-3 py-1.5 rounded text-xs font-medium bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors whitespace-nowrap"
                >
                  <FiFilter size={12} />
                  <span>Filtre</span>
                  {activeFiltersCount > 0 && (
                    <span className="ml-1 bg-violet-600 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">
                      {activeFiltersCount}
                    </span>
                  )}
                  <FiChevronDown className={`ml-1 transition-transform ${showFilters ? 'rotate-180' : ''}`} size={10} />
                </button>
              </div>
            </div>
          </div>
          
          {/* Bouton Exporter */}
          <button 
            onClick={handleExport}
            disabled={filteredJournaux.length === 0}
            className="px-3 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 flex items-center gap-1.5 text-sm whitespace-nowrap disabled:opacity-50"
          >
            <FiDownload size={14} />
            Exporter
          </button>

          {/* Bouton Importer (masqué) */}
          <label className="px-3 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 flex items-center gap-1.5 text-sm whitespace-nowrap cursor-pointer">
            <FiUpload size={14} />
            Importer
            <input
              type="file"
              accept=".csv,.xlsx,.xls"
              onChange={handleImport}
              className="hidden"
            />
          </label>
        </div>
        
        {/* Panneau des filtres */}
        {showFilters && (
          <div className="flex justify-center">
            <div className="relative w-full max-w-4xl">
              <div className="absolute left-0 right-0 mt-1 bg-white border border-gray-300 rounded-lg shadow-lg z-40">
                <div className="p-6">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Entreprise
                      </label>
                      <select
                        value={filterCompany}
                        onChange={(e) => {
                          setFilterCompany(e.target.value);
                          setCurrentPage(1);
                        }}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent text-sm bg-white"
                      >
                        <option value="">Toutes entreprises</option>
                        {companies.map(c => (
                          <option key={c.id} value={c.id}>
                            {c.raison_sociale || c.nom || `Entreprise ${c.id}`}
                          </option>
                        ))}
                      </select>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Type de journal
                      </label>
                      <select
                        value={filterType}
                        onChange={(e) => {
                          setFilterType(e.target.value);
                          setCurrentPage(1);
                        }}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent text-sm bg-white"
                      >
                        <option value="">Tous types</option>
                        {journalTypes.map(t => (
                          <option key={t.id} value={t.id}>
                            {t.code} - {t.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Statut
                      </label>
                      <select
                        value={filterActive}
                        onChange={(e) => {
                          setFilterActive(e.target.value);
                          setCurrentPage(1);
                        }}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent text-sm bg-white"
                      >
                        <option value="">Tous</option>
                        <option value="true">Actifs</option>
                        <option value="false">Inactifs</option>
                      </select>
                    </div>
                  </div>
                  
                  <div className="flex justify-end gap-3 mt-6 pt-6 border-t border-gray-200">
                    <button
                      onClick={resetFilters}
                      className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 text-sm font-medium"
                    >
                      Réinitialiser
                    </button>
                    <button
                      onClick={() => setShowFilters(false)}
                      className="px-4 py-2 bg-gradient-to-r from-violet-600 to-violet-500 text-white rounded-lg hover:from-violet-700 hover:to-violet-600 text-sm font-medium"
                    >
                      Appliquer
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
        
        {/* Affichage des filtres actifs */}
        {(searchTerm || activeFiltersCount > 0) && (
          <div className="mt-3 flex justify-center">
            <div className="flex flex-wrap gap-2 justify-center">
              {searchTerm && (
                <div className="inline-flex items-center px-3 py-1.5 bg-blue-50 text-blue-700 rounded-lg text-sm border border-blue-200">
                  <span>Recherche: "{searchTerm}"</span>
                  <button
                    onClick={() => setSearchTerm('')}
                    className="ml-2 hover:bg-blue-100 rounded p-1"
                  >
                    <FiX size={12} />
                  </button>
                </div>
              )}
              
              {filterCompany && (
                <div className="inline-flex items-center px-3 py-1.5 bg-violet-50 text-violet-700 rounded-lg text-sm border border-violet-200">
                  <span>Entreprise: {companies.find(c => c.id.toString() === filterCompany)?.raison_sociale || 'Sélectionnée'}</span>
                  <button
                    onClick={() => setFilterCompany('')}
                    className="ml-2 hover:bg-violet-100 rounded p-1"
                  >
                    <FiX size={12} />
                  </button>
                </div>
              )}
              
              {filterType && (
                <div className="inline-flex items-center px-3 py-1.5 bg-green-50 text-green-700 rounded-lg text-sm border border-green-200">
                  <span>Type: {journalTypes.find(t => t.id.toString() === filterType)?.name || 'Sélectionné'}</span>
                  <button
                    onClick={() => setFilterType('')}
                    className="ml-2 hover:bg-green-100 rounded p-1"
                  >
                    <FiX size={12} />
                  </button>
                </div>
              )}
              
              {filterActive && (
                <div className="inline-flex items-center px-3 py-1.5 bg-amber-50 text-amber-700 rounded-lg text-sm border border-amber-200">
                  <span>Statut: {filterActive === 'true' ? 'Actifs' : 'Inactifs'}</span>
                  <button
                    onClick={() => setFilterActive('')}
                    className="ml-2 hover:bg-amber-100 rounded p-1"
                  >
                    <FiX size={12} />
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Messages d'état */}
      {successMessage && (
        <div className="mb-4">
          <div className="bg-gradient-to-r from-green-50 to-green-100 border-l-3 border-green-500 rounded-r-lg p-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-green-100 rounded">
                  <FiCheck className="w-4 h-4 text-green-600" />
                </div>
                <div>
                  <p className="font-medium text-green-900 text-sm">{successMessage}</p>
                </div>
              </div>
              <button
                onClick={() => setSuccessMessage('')}
                className="text-green-600 hover:text-green-800"
              >
                <FiX size={16} />
              </button>
            </div>
          </div>
        </div>
      )}

      {error && (
        <div className="mb-4">
          <div className="bg-gradient-to-r from-red-50 to-red-100 border-l-3 border-red-500 rounded-r-lg p-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-red-100 rounded">
                  <FiX className="w-4 h-4 text-red-600" />
                </div>
                <div>
                  <p className="font-medium text-red-900 text-sm">{error}</p>
                </div>
              </div>
              <button
                onClick={loadData}
                className="px-3 py-1.5 bg-red-600 text-white rounded hover:bg-red-700 transition-colors text-sm font-medium"
              >
                Réessayer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Actions batch */}
      {showBatchActions && selectedRows.length > 0 && (
        <div className="mb-4 bg-white rounded-lg border border-gray-200 p-3 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FiCheckSquare className="text-violet-600" size={16} />
              <span className="text-sm font-medium text-gray-900">
                {selectedRows.length} journal(s) sélectionné(s)
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleBatchActivate}
                disabled={batchActionLoading}
                className="px-3 py-1.5 bg-green-50 text-green-700 hover:bg-green-100 rounded text-xs font-medium flex items-center gap-1 disabled:opacity-50"
              >
                <FiCheck size={12} />
                Activer
              </button>
              <button
                onClick={handleBatchDeactivate}
                disabled={batchActionLoading}
                className="px-3 py-1.5 bg-gray-50 text-gray-700 hover:bg-gray-100 rounded text-xs font-medium flex items-center gap-1 disabled:opacity-50"
              >
                <FiX size={12} />
                Désactiver
              </button>
              <button
                onClick={handleBatchDelete}
                disabled={batchActionLoading}
                className="px-3 py-1.5 bg-red-50 text-red-700 hover:bg-red-100 rounded text-xs font-medium flex items-center gap-1 disabled:opacity-50"
              >
                <FiTrash2 size={12} />
                Supprimer
              </button>
              <button
                onClick={() => {
                  setSelectedRows([]);
                  setShowBatchActions(false);
                }}
                className="px-3 py-1.5 text-gray-500 hover:text-gray-700"
              >
                <FiX size={16} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tableau principal */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        {/* En-tête du tableau */}
        <div className="px-4 py-3 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5">
                <input
                  type="checkbox"
                  checked={selectedRows.length === currentJournaux.length && currentJournaux.length > 0}
                  onChange={selectAllRows}
                  className="w-3.5 h-3.5 text-violet-600 rounded focus:ring-violet-500 border-gray-300"
                />
                <span className="text-xs text-gray-700">
                  {selectedRows.length} sélectionné(s)
                </span>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <label className="p-1.5 hover:bg-gray-100 rounded transition-colors text-gray-600 cursor-pointer">
                <FiUpload size={14} />
                <input
                  type="file"
                  accept=".csv,.xlsx,.xls"
                  onChange={handleImport}
                  className="hidden"
                />
              </label>
              <select
                value={itemsPerPage}
                onChange={(e) => {
                  setItemsPerPage(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="border border-gray-300 rounded px-2 py-1 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-violet-500 focus:border-transparent"
              >
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
                {/* Colonne sélection */}
                <th scope="col" className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider border-r border-gray-200">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={selectedRows.length === currentJournaux.length && currentJournaux.length > 0}
                      onChange={selectAllRows}
                      className="w-3.5 h-3.5 text-violet-600 rounded focus:ring-violet-500 border-gray-300"
                    />
                    <span className="text-xs">#</span>
                  </div>
                </th>
                
                {visibleColumns.code && (
                  <th scope="col" className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider border-r border-gray-200">
                    Code
                  </th>
                )}
                
                {visibleColumns.nom && (
                  <th scope="col" className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider border-r border-gray-200">
                    Nom
                  </th>
                )}
                
                {visibleColumns.type && (
                  <th scope="col" className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider border-r border-gray-200">
                    Type
                  </th>
                )}
                
                {visibleColumns.entreprise && (
                  <th scope="col" className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider border-r border-gray-200">
                    Entreprise
                  </th>
                )}
                
                {visibleColumns.compte && (
                  <th scope="col" className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider border-r border-gray-200">
                    Compte
                  </th>
                )}
                
                {visibleColumns.statut && (
                  <th scope="col" className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider border-r border-gray-200">
                    Statut
                  </th>
                )}
                
                {visibleColumns.actions && (
                  <th scope="col" className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Actions
                  </th>
                )}
              </tr>
            </thead>
            
            <tbody className="divide-y divide-gray-200">
              {currentJournaux.length === 0 ? (
                <tr>
                  <td colSpan={Object.values(visibleColumns).filter(v => v).length + 1} className="px-4 py-12 text-center">
                    <div className="flex flex-col items-center justify-center">
                      <div className="w-16 h-16 bg-gradient-to-br from-gray-100 to-gray-200 rounded-full flex items-center justify-center mb-4">
                        <FiSearch className="w-8 h-8 text-gray-400" />
                      </div>
                      <h3 className="text-base font-semibold text-gray-900 mb-1">
                        {journaux.length > 0 ? 'Aucun résultat trouvé' : 'Aucun journal comptable'}
                      </h3>
                      <p className="text-gray-600 text-sm mb-4 max-w-md text-center">
                        {journaux.length > 0 
                          ? 'Modifiez vos critères de recherche ou de filtrage'
                          : 'Commencez par créer votre premier journal comptable'
                        }
                      </p>
                      {journaux.length === 0 && (
                        <button 
                          onClick={() => navigate('/comptabilite/journaux/create')}
                          className="px-4 py-2 bg-gradient-to-r from-violet-600 to-violet-500 text-white rounded-lg hover:from-violet-700 hover:to-violet-600 transition-all duration-300 font-medium flex items-center gap-1.5 text-sm"
                        >
                          <FiPlus size={14} />
                          Créer un journal
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                currentJournaux.map((journal, index) => (
                  journal ? (
                    <JournalRow 
                      key={journal.id || Math.random()}
                      journal={journal}
                      index={indexOfFirstItem + index + 1}
                      isSelected={selectedRows.includes(journal.id)}
                      visibleColumns={visibleColumns}
                      onToggleSelect={() => toggleRowSelection(journal.id)}
                      onShowDetails={() => navigate(`/comptabilite/journaux/${journal.id}`)}
                    />
                  ) : null
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {currentJournaux.length > 0 && (
          <div className="px-4 py-3 border-t border-gray-200 bg-gradient-to-r from-gray-50 to-white">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-2">
              <div className="text-xs text-gray-700">
                {indexOfFirstItem + 1}-{Math.min(indexOfLastItem, totalItems)} sur {totalItems} journaux
              </div>

              {totalPages > 1 && (
                <div className="flex items-center gap-1">
                  <button
                    onClick={prevPage}
                    disabled={currentPage === 1}
                    className={`p-1.5 rounded border transition-all duration-200 ${
                      currentPage === 1
                        ? 'bg-gray-100 text-gray-400 border-gray-300 cursor-not-allowed'
                        : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50 hover:border-gray-400 hover:shadow-sm'
                    }`}
                  >
                    <FiChevronLeft size={14} />
                  </button>

                  <div className="flex items-center gap-0.5">
                    {(() => {
                      const pageNumbers = [];
                      const maxVisiblePages = 5;
                      
                      if (totalPages <= maxVisiblePages) {
                        for (let i = 1; i <= totalPages; i++) {
                          pageNumbers.push(i);
                        }
                      } else {
                        let start = Math.max(1, currentPage - 2);
                        let end = Math.min(totalPages, start + maxVisiblePages - 1);
                        
                        if (end - start + 1 < maxVisiblePages) {
                          start = Math.max(1, end - maxVisiblePages + 1);
                        }
                        
                        for (let i = start; i <= end; i++) {
                          pageNumbers.push(i);
                        }
                      }

                      return pageNumbers.map((pageNumber) => (
                        <button
                          key={pageNumber}
                          onClick={() => paginate(pageNumber)}
                          className={`min-w-[30px] h-8 rounded border text-xs font-medium transition-all duration-200 ${
                            currentPage === pageNumber
                              ? 'bg-gradient-to-r from-violet-600 to-violet-500 text-white border-violet-600 shadow-sm'
                              : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50 hover:border-gray-400'
                          }`}
                        >
                          {pageNumber}
                        </button>
                      ));
                    })()}
                  </div>

                  <button
                    onClick={nextPage}
                    disabled={currentPage === totalPages}
                    className={`p-1.5 rounded border transition-all duration-200 ${
                      currentPage === totalPages
                        ? 'bg-gray-100 text-gray-400 border-gray-300 cursor-not-allowed'
                        : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50 hover:border-gray-400 hover:shadow-sm'
                    }`}
                  >
                    <FiChevronRight size={14} />
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Composant JournalRow MIS À JOUR
function JournalRow({ 
  journal, 
  index,
  isSelected, 
  visibleColumns,
  onToggleSelect,
  onShowDetails
}) {
  // Vérifier si journal est défini
  if (!journal) return null;

  // Fonction pour obtenir les informations du type
  const getJournalTypeInfo = () => {
    // Si journal.type est un objet
    if (journal.type && typeof journal.type === 'object') {
      return {
        name: journal.type.name,
        code: journal.type.code
      };
    }
    
    // Si type_name existe (depuis serializer)
    if (journal.type_name) {
      return {
        name: journal.type_name,
        code: journal.type?.code || journal.type_code || ''
      };
    }
    
    // Fallback
    return { name: 'Non défini', code: '' };
  };

  // Fonction pour obtenir le nom de l'entreprise
  const getCompanyName = () => {
    // Si journal.company est un objet
    if (journal.company && typeof journal.company === 'object') {
      return journal.company.raison_sociale || 
             journal.company.nom || 
             journal.company.name || 
             'Entreprise';
    }
    
    // Fallback
    if (journal.company_name) {
      return journal.company_name;
    }
    
    if (journal.company) {
      return `Entreprise ${journal.company}`;
    }
    
    return 'Toutes';
  };

  const typeInfo = getJournalTypeInfo();
  const companyName = getCompanyName();

  const getTypeBadge = () => {
    const typeCode = typeInfo.code;
    
    const typeMap = {
      'ACH': { bg: 'from-amber-50 to-amber-100', text: 'text-amber-800', label: 'Achat' },
      'VEN': { bg: 'from-green-50 to-green-100', text: 'text-green-800', label: 'Vente' },
      'BAN': { bg: 'from-blue-50 to-blue-100', text: 'text-blue-800', label: 'Banque' },
      'CAI': { bg: 'from-violet-50 to-violet-100', text: 'text-violet-800', label: 'Caisse' },
      'OD': { bg: 'from-gray-50 to-gray-100', text: 'text-gray-800', label: 'Divers' }
    };
    
    return typeMap[typeCode] || { 
      bg: 'from-gray-50 to-gray-100', 
      text: 'text-gray-800', 
      label: typeInfo.name 
    };
  };

  const typeBadge = getTypeBadge();

  // Fonctions de gestion des actions
  const handleViewDetails = () => {
    if (onShowDetails) {
      onShowDetails();
    } else {
      window.location.href = `/comptabilite/journaux/${journal.id}`;
    }
  };

  const handleEdit = () => {
    window.location.href = `/comptabilite/journaux/${journal.id}/edit`;
  };

  const handleDelete = async () => {
    if (window.confirm(`Êtes-vous sûr de vouloir supprimer "${journal.name || 'ce journal'}" ?`)) {
      try {
        await apiClient.delete(`/compta/journals/${journal.id}/`);
        window.location.reload(); // Recharger la page pour voir les changements
      } catch (err) {
        console.error('Erreur suppression:', err);
        alert('Erreur lors de la suppression');
      }
    }
  };

  return (
    <tr className={`hover:bg-gradient-to-r hover:from-gray-50 hover:to-white transition-all duration-200 ${
      isSelected ? 'bg-gradient-to-r from-violet-50 to-violet-25' : 'bg-white'
    }`}>
      {/* Colonne sélection */}
      <td className="px-4 py-3 whitespace-nowrap border-r border-gray-200">
        <div className="flex items-center gap-2">
          <button
            onClick={() => onToggleSelect(journal.id)}
            className="flex items-center justify-center w-4 h-4"
            title={isSelected ? 'Désélectionner' : 'Sélectionner'}
          >
            {isSelected ? (
              <FiCheckSquare className="w-4 h-4 text-violet-600" />
            ) : (
              <FiSquare className="w-4 h-4 text-gray-400 hover:text-gray-600" />
            )}
          </button>
          <span className="text-xs font-mono text-gray-500">{index}</span>
        </div>
      </td>
      
      {visibleColumns.code && (
        <td className="px-4 py-3 whitespace-nowrap border-r border-gray-200">
          <span className="text-xs font-semibold text-gray-500 bg-gray-100 px-2 py-1 rounded border">
            {journal.code || '---'}
          </span>
        </td>
      )}
      
      {visibleColumns.nom && (
        <td className="px-4 py-3 border-r border-gray-200">
          <div>
            <div className="text-xs font-medium text-gray-900 truncate max-w-[120px]">
              {journal.name || 'Sans nom'}
            </div>
            {journal.note && (
              <div className="text-xs text-gray-500 truncate max-w-[150px] mt-0.5">
                {journal.note.substring(0, 40)}...
              </div>
            )}
          </div>
        </td>
      )}
      
      {visibleColumns.type && (
        <td className="px-4 py-3 border-r border-gray-200">
          <div className={`inline-flex items-center px-2 py-1 ${typeBadge.bg} ${typeBadge.text} rounded-full text-xs font-medium`}>
            <span className="text-xs font-medium">{typeBadge.label}</span>
          </div>
        </td>
      )}
      
      {visibleColumns.entreprise && (
        <td className="px-4 py-3 border-r border-gray-200">
          <div className="text-xs text-gray-900 truncate max-w-[100px]" title={companyName}>
            {companyName}
          </div>
        </td>
      )}
      
      {visibleColumns.compte && (
        <td className="px-4 py-3 border-r border-gray-200">
          <div className="text-xs truncate max-w-[120px]">
            {journal.default_account ? (
              <div className="flex items-center gap-1">
                <span className="font-mono text-violet-600 font-medium">
                  {journal.default_account.code || '---'}
                </span>
                <span className="text-gray-700">
                  {journal.default_account.name?.substring(0, 15)}...
                </span>
              </div>
            ) : (
              <span className="text-gray-400 italic">Non défini</span>
            )}
          </div>
        </td>
      )}
      
      {visibleColumns.statut && (
        <td className="px-4 py-3 border-r border-gray-200">
          <div>
            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
              journal.active
                ? 'bg-gradient-to-r from-green-50 to-green-100 text-green-800'
                : 'bg-gradient-to-r from-gray-50 to-gray-100 text-gray-800'
            }`}>
              {journal.active ? (
                <>
                  <FiCheck className="w-2.5 h-2.5 mr-1" />
                  Actif
                </>
              ) : (
                <>
                  <FiX className="w-2.5 h-2.5 mr-1" />
                  Inactif
                </>
              )}
            </span>
          </div>
        </td>
      )}
      
      {visibleColumns.actions && (
        <td className="px-4 py-3 whitespace-nowrap">
          <div className="flex items-center gap-1">
            <button
              onClick={handleViewDetails}
              className="p-1.5 bg-gradient-to-r from-gray-50 to-gray-100 text-gray-700 hover:from-gray-100 hover:to-gray-200 rounded transition-all duration-200 shadow-sm hover:shadow"
              title="Voir détails"
            >
              <FiEye size={14} />
            </button>
            <button
              onClick={handleEdit}
              className="p-1.5 bg-gradient-to-r from-violet-50 to-violet-100 text-violet-700 hover:from-violet-100 hover:to-violet-200 rounded transition-all duration-200 shadow-sm hover:shadow"
              title="Modifier"
            >
              <FiEdit2 size={14} />
            </button>
            <button
              onClick={handleDelete}
              className="p-1.5 bg-gradient-to-r from-red-50 to-red-100 text-red-700 hover:from-red-100 hover:to-red-200 rounded transition-all duration-200 shadow-sm hover:shadow"
              title="Supprimer"
            >
              <FiTrash2 size={14} />
            </button>
          </div>
        </td>
      )}
    </tr>
  );
}