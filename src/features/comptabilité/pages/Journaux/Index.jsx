import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { FiRefreshCw, FiPlus, FiSearch, FiX } from "react-icons/fi";
import { apiClient, authService } from "./services";
import JournalFilters from './components/JournalFilters';
import JournalTable from './components/JournalTable';

export default function Index() {
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

  // États pour filtres - regroupés dans un objet
  const [filters, setFilters] = useState({
    search: '',
    company: '',
    type: '',
    active: ''
  });

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
      
      const [journauxRes, typesRes] = await Promise.all([
        apiClient.get('/compta/journals/'),
        apiClient.get('/compta/journal-types/')
      ]);

      setJournaux(extractData(journauxRes));
      setJournalTypes(extractData(typesRes));

      if (authService.isAuthenticated()) {
        const companiesRes = await apiClient.get('/entites/').catch(() => ({ data: [] }));
        setCompanies(extractData(companiesRes));
      }

    } catch (err) {
      console.error('Erreur chargement journaux:', err);
      setError(err.message || 'Erreur de connexion');
    } finally {
      setLoading(false);
    }
  }, [extractData]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Mettre à jour les filtres
  const updateFilter = useCallback((key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setCurrentPage(1);
  }, []);

  // Réinitialiser tous les filtres
  const resetFilters = useCallback(() => {
    setFilters({
      search: '',
      company: '',
      type: '',
      active: ''
    });
    setCurrentPage(1);
  }, []);

  // Filtrer les journaux
  const filteredJournaux = useMemo(() => {
    if (!Array.isArray(journaux)) return [];
    
    return journaux.filter(journal => {
      const searchTerm = filters.search.toLowerCase();
      const matchesSearch = 
        !filters.search ||
        (journal.name || '').toLowerCase().includes(searchTerm) ||
        (journal.code || '').toLowerCase().includes(searchTerm);
      
      const matchesCompany = 
        !filters.company || 
        (journal.company?.id && journal.company.id.toString() === filters.company);
      
      const matchesType = 
        !filters.type || 
        (journal.type?.id && journal.type.id.toString() === filters.type);
      
      const matchesActive = filters.active === '' || 
        (filters.active === 'true' ? journal.active : !journal.active);
      
      return matchesSearch && matchesCompany && matchesType && matchesActive;
    });
  }, [journaux, filters]);

  // Pagination
  const totalItems = filteredJournaux.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / itemsPerPage));
  const currentJournaux = filteredJournaux.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Chargement simplifié
  if (loading) {
    return (
      <div className="p-4 bg-gray-50 min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-violet-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Chargement des journaux...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 bg-gray-50 min-h-screen">
      {/* En-tête avec bouton de création */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold text-gray-900">Journaux Comptables</h1>
          <div className="flex items-center gap-2">
            <button
              onClick={loadData}
              className="px-3 py-2 border border-gray-300 rounded-lg bg-white text-gray-700 hover:bg-gray-50 flex items-center gap-1.5 text-sm"
            >
              <FiRefreshCw className={loading ? 'animate-spin' : ''} size={14} />
              Actualiser
            </button>
            <button
              onClick={() => window.location.href = '/comptabilite/journaux/create'}
              className="px-3 py-2 bg-gradient-to-r from-violet-600 to-violet-500 text-white rounded-lg hover:from-violet-700 hover:to-violet-600 flex items-center gap-1.5 text-sm"
            >
              <FiPlus size={14} />
              Nouveau Journal
            </button>
          </div>
        </div>

        {/* Barre de filtres en ligne */}
        <div className="mb-4">
          <JournalFilters
            filters={filters}
            companies={companies}
            journalTypes={journalTypes}
            onFilterChange={updateFilter}
            onReset={resetFilters}
            onRefresh={loadData}
            loading={loading}
          />
        </div>

        {/* Message d'erreur simplifié */}
        {error && (
          <div className="mb-4 bg-red-50 border-l-4 border-red-500 p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                <p className="text-red-800">{error}</p>
              </div>
              <button
                onClick={loadData}
                className="ml-4 px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700"
              >
                Réessayer
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Tableau principal */}
      <JournalTable
        journaux={currentJournaux}
        selectedRows={selectedRows}
        onSelectionChange={setSelectedRows}
        currentPage={currentPage}
        itemsPerPage={itemsPerPage}
        totalItems={totalItems}
        onPageChange={setCurrentPage}
        onItemsPerPageChange={setItemsPerPage}
      />

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between">
          <div className="text-sm text-gray-700">
            {totalItems} journal{totalItems > 1 ? 'aux' : ''} au total
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="px-3 py-1 border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Précédent
            </button>
            <span className="text-sm text-gray-700">
              Page {currentPage} sur {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="px-3 py-1 border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Suivant
            </button>
          </div>
        </div>
      )}
    </div>
  );
}