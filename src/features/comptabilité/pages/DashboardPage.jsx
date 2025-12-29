import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  FiPlus,
  FiRefreshCw,
  FiEye,
  FiDollarSign,
  FiShoppingCart,
  FiTrendingUp,
  FiBriefcase,
  FiSearch,
  FiFilter,
  FiChevronDown,
  FiChevronUp,
  FiX
} from "react-icons/fi";

// IMPORT SIMPLIFIÉ - Crée directement l'instance axios
import axios from 'axios';

// Configuration de base d'axios
const apiClient = axios.create({
  baseURL: 'http://localhost:8000/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Intercepteur pour ajouter le token automatiquement
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('access_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

export default function ComptabiliteDashboard() {
  const [journaux, setJournaux] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [selectedCompany, setSelectedCompany] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // État pour la recherche et filtres
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState({
    type: '',
    status: '',
    sortBy: 'name',
    sortOrder: 'asc'
  });
  const [showFilters, setShowFilters] = useState(false);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Récupère les journaux comptables
      const journauxRes = await apiClient.get('/compta/journals/');
      
      // Récupère les entreprises
      let companiesRes;
      try {
        companiesRes = await apiClient.get('/entites/');
      } catch (err) {
        console.log('Aucune entreprise trouvée ou erreur:', err);
        companiesRes = { data: [] };
      }

      // Fonction pour extraire les données proprement
      const extractData = (response) => {
        if (!response) return [];
        if (Array.isArray(response)) return response;
        if (response.data && Array.isArray(response.data)) return response.data;
        if (response.results && Array.isArray(response.results)) return response.results;
        return [];
      };

      const journauxData = extractData(journauxRes);
      const companiesData = extractData(companiesRes);

      setJournaux(journauxData);
      setCompanies(companiesData);

      // Sélectionne la première entreprise par défaut
      if (companiesData.length > 0 && !selectedCompany) {
        setSelectedCompany(companiesData[0].id.toString());
      }
    } catch (err) {
      console.error('Erreur lors du chargement du dashboard:', err);
      setError(err.response?.data?.detail || err.message || 'Erreur de connexion au serveur');
    } finally {
      setLoading(false);
    }
  }, [selectedCompany]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Types de journaux disponibles pour le filtre
  const journalTypes = [
    { code: 'BAN', name: 'Banque', color: 'from-blue-500 to-blue-600' },
    { code: 'CAI', name: 'Caisse', color: 'from-violet-500 to-violet-600' },
    { code: 'VEN', name: 'Ventes', color: 'from-green-500 to-green-600' },
    { code: 'ACH', name: 'Achats', color: 'from-amber-500 to-amber-600' },
    { code: 'OD', name: 'Divers', color: 'from-gray-500 to-gray-600' },
  ];

  // Filtrage et tri avancé
  const filteredJournaux = useMemo(() => {
    let filtered = [...journaux];

    // Filtre par entreprise (comme avant)
    if (selectedCompany) {
      filtered = filtered.filter(j => {
        const companyId = j.company?.id || j.company_id || j.company;
        return companyId?.toString() === selectedCompany;
      });
    }

    // Filtre par recherche texte
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(journal =>
        (journal.name?.toLowerCase().includes(query)) ||
        (journal.code?.toLowerCase().includes(query)) ||
        (journal.type?.name?.toLowerCase().includes(query)) ||
        (journal.default_account?.name?.toLowerCase().includes(query)) ||
        (journal.note?.toLowerCase().includes(query))
      );
    }

    // Filtre par type
    if (filters.type) {
      filtered = filtered.filter(journal => 
        journal.type?.code === filters.type || journal.type_code === filters.type
      );
    }

    // Filtre par statut
    if (filters.status === 'active') {
      filtered = filtered.filter(journal => journal.active);
    } else if (filters.status === 'inactive') {
      filtered = filtered.filter(journal => !journal.active);
    }

    // Tri
    filtered.sort((a, b) => {
      let aValue, bValue;
      
      switch (filters.sortBy) {
        case 'name':
          aValue = a.name || '';
          bValue = b.name || '';
          break;
        case 'code':
          aValue = a.code || '';
          bValue = b.code || '';
          break;
        case 'type':
          aValue = a.type?.code || a.type_code || '';
          bValue = b.type?.code || b.type_code || '';
          break;
        case 'active':
          aValue = a.active ? 1 : 0;
          bValue = b.active ? 1 : 0;
          break;
        default:
          aValue = a.name || '';
          bValue = b.name || '';
      }

      if (filters.sortOrder === 'asc') {
        return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
      } else {
        return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
      }
    });

    return filtered;
  }, [journaux, selectedCompany, searchQuery, filters]);

  // Style selon le type de journal (identique à l'original)
  const getJournalStyle = (journal) => {
    const typeCode = journal.type?.code || journal.type_code || '';
    
    switch (typeCode) {
      case 'BAN':
        return { 
          icon: FiDollarSign, 
          color: 'from-blue-500 to-blue-600', 
          text: 'text-blue-800', 
          bg: 'bg-blue-50',
          label: 'Banque'
        };
      case 'CAI':
        return { 
          icon: FiDollarSign, 
          color: 'from-violet-500 to-violet-600', 
          text: 'text-violet-800', 
          bg: 'bg-violet-50',
          label: 'Caisse'
        };
      case 'VEN':
        return { 
          icon: FiTrendingUp, 
          color: 'from-green-500 to-green-600', 
          text: 'text-green-800', 
          bg: 'bg-green-50',
          label: 'Ventes'
        };
      case 'ACH':
        return { 
          icon: FiShoppingCart, 
          color: 'from-amber-500 to-amber-600', 
          text: 'text-amber-800', 
          bg: 'bg-amber-50',
          label: 'Achats'
        };
      default:
        return { 
          icon: FiBriefcase, 
          color: 'from-gray-500 to-gray-600', 
          text: 'text-gray-800', 
          bg: 'bg-gray-50',
          label: 'Divers'
        };
    }
  };

  // Gestion des filtres
  const handleFilterChange = (key, value) => {
    setFilters(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const clearFilters = () => {
    setSearchQuery('');
    setFilters({
      type: '',
      status: '',
      sortBy: 'name',
      sortOrder: 'asc'
    });
  };

  // Vérifier si des filtres sont actifs
  const hasActiveFilters = searchQuery || filters.type || filters.status;

  // Écran de chargement
  if (loading) {
    return (
      <div className="p-8 bg-gradient-to-br from-gray-50 to-white min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="relative">
            <div className="w-16 h-16 border-4 border-gray-200 rounded-full"></div>
            <div className="absolute top-0 left-0 w-16 h-16 border-4 border-violet-600 border-t-transparent rounded-full animate-spin"></div>
          </div>
          <p className="mt-6 text-gray-600 text-lg">Chargement du tableau de bord...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-6 bg-gradient-to-br from-gray-50 to-white min-h-screen">
      {/* En-tête compact - BOUTONS CENTRÉS */}
      <div className="mb-6">
        <div className="flex justify-center mb-3">
          <div className="flex items-center gap-2">
            <button
              onClick={loadData}
              className="px-3 py-2 border border-gray-300 rounded-lg bg-white text-gray-700 hover:bg-gray-50 flex items-center gap-1.5 transition-colors text-sm"
              title="Actualiser les données"
            >
              <FiRefreshCw size={14} className={loading ? 'animate-spin' : ''} />
              <span>Actualiser</span>
            </button>

            <a
              href="/comptabilite/journaux/create"
              className="px-3 py-2 bg-gradient-to-r from-violet-600 to-violet-500 text-white rounded-lg hover:from-violet-700 hover:to-violet-600 flex items-center gap-1.5 transition-colors font-medium text-sm"
            >
              <FiPlus size={14} />
              <span>Nouveau journal</span>
            </a>
          </div>
        </div>

        {/* Barre de recherche Odoo-style */}
        <div className="bg-white rounded-lg border border-gray-300 shadow-xs p-3">
          <div className="flex flex-col lg:flex-row lg:items-center gap-3">
            {/* Recherche principale */}
            <div className="flex-1">
              <div className="relative">
                <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
                <input
                  type="text"
                  placeholder="Rechercher un journal..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-9 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-violet-500 focus:border-transparent text-sm"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    <FiX size={14} />
                  </button>
                )}
              </div>
            </div>

            {/* Filtre par entreprise */}
            {companies.length > 0 && (
              <div className="lg:w-48">
                <select
                  value={selectedCompany}
                  onChange={(e) => setSelectedCompany(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-violet-500 bg-white text-sm"
                >
                  <option value="">Toutes entreprises</option>
                  {companies.map((company) => (
                    <option key={company.id} value={company.id}>
                      {company.raison_sociale || company.nom || `Entreprise ${company.id}`}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Bouton filtre avancé */}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`px-3 py-2 border rounded-lg flex items-center gap-1.5 text-sm font-medium transition-colors ${
                hasActiveFilters 
                  ? 'border-violet-500 bg-violet-50 text-violet-700' 
                  : 'border-gray-300 hover:bg-gray-50 text-gray-700'
              }`}
            >
              <FiFilter size={14} />
              <span>Filtres</span>
              {hasActiveFilters && (
                <span className="bg-violet-600 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">
                  {Object.values(filters).filter(v => v).length + (searchQuery ? 1 : 0)}
                </span>
              )}
              {showFilters ? <FiChevronUp size={14} /> : <FiChevronDown size={14} />}
            </button>

            {/* Bouton effacer les filtres */}
            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                className="px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center gap-1.5 text-sm text-gray-700"
                title="Effacer tous les filtres"
              >
                <FiX size={14} />
                <span>Effacer</span>
              </button>
            )}
          </div>

          {/* Filtres avancés */}
          {showFilters && (
            <div className="mt-3 pt-3 border-t border-gray-200">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {/* Type de journal */}
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-2">
                    Type
                  </label>
                  <select
                    value={filters.type}
                    onChange={(e) => handleFilterChange('type', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-violet-500 bg-white text-sm"
                  >
                    <option value="">Tous types</option>
                    {journalTypes.map((type) => (
                      <option key={type.code} value={type.code}>
                        {type.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Statut */}
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-2">
                    Statut
                  </label>
                  <select
                    value={filters.status}
                    onChange={(e) => handleFilterChange('status', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-violet-500 bg-white text-sm"
                  >
                    <option value="">Tous statuts</option>
                    <option value="active">Actif</option>
                    <option value="inactive">Inactif</option>
                  </select>
                </div>

                {/* Tri */}
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-2">
                    Trier par
                  </label>
                  <div className="flex gap-1.5">
                    <select
                      value={filters.sortBy}
                      onChange={(e) => handleFilterChange('sortBy', e.target.value)}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-violet-500 bg-white text-sm"
                    >
                      <option value="name">Nom</option>
                      <option value="code">Code</option>
                      <option value="type">Type</option>
                      <option value="active">Statut</option>
                    </select>
                    <button
                      onClick={() => handleFilterChange('sortOrder', filters.sortOrder === 'asc' ? 'desc' : 'asc')}
                      className={`px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center justify-center text-sm ${
                        filters.sortOrder === 'desc' ? 'bg-gray-100' : ''
                      }`}
                      title={filters.sortOrder === 'asc' ? 'Croissant' : 'Décroissant'}
                    >
                      {filters.sortOrder === 'asc' ? 'A→Z' : 'Z→A'}
                    </button>
                  </div>
                </div>
              </div>

              {/* Badges des filtres actifs */}
              {hasActiveFilters && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {searchQuery && (
                    <div className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
                      <span className="truncate max-w-[120px]">"{searchQuery}"</span>
                      <button
                        onClick={() => setSearchQuery('')}
                        className="ml-1 hover:opacity-70 transition-opacity"
                      >
                        ×
                      </button>
                    </div>
                  )}
                  {filters.type && (
                    <div className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-sm font-medium bg-violet-100 text-violet-800">
                      <span>Type: {journalTypes.find(t => t.code === filters.type)?.name || filters.type}</span>
                      <button
                        onClick={() => handleFilterChange('type', '')}
                        className="ml-1 hover:opacity-70 transition-opacity"
                      >
                        ×
                      </button>
                    </div>
                  )}
                  {filters.status && (
                    <div className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-sm font-medium bg-green-100 text-green-800">
                      <span>{filters.status === 'active' ? 'Actif' : 'Inactif'}</span>
                      <button
                        onClick={() => handleFilterChange('status', '')}
                        className="ml-1 hover:opacity-70 transition-opacity"
                      >
                        ×
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Message d'erreur */}
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-800 flex items-center justify-between text-sm">
          <div className="flex items-center gap-2">
            <span className="font-medium">Erreur :</span>
            <span className="truncate">{error}</span>
          </div>
          <button 
            onClick={loadData} 
            className="px-3 py-1.5 bg-red-100 text-red-700 rounded hover:bg-red-200 font-medium text-sm whitespace-nowrap"
          >
            Réessayer
          </button>
        </div>
      )}

      {/* Grille des cartes journaux (EXACTEMENT comme l'original) */}
      {filteredJournaux.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mb-4">
            <FiBriefcase className="w-10 h-10 text-gray-400" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            Aucun journal comptable trouvé
          </h3>
          <p className="text-gray-600 max-w-md mb-6 text-sm">
            {journaux.length === 0 
              ? "Créez vos premiers journaux (Banque, Caisse, Ventes, Achats...) pour commencer."
              : hasActiveFilters
                ? "Aucun journal ne correspond à vos critères. Essayez de modifier vos filtres."
                : selectedCompany 
                  ? "Aucun journal pour cette entreprise. Essayez une autre entreprise."
                  : "Aucun journal disponible. Vérifiez vos permissions."
            }
          </p>
          <div className="flex gap-2">
            <a
              href="/comptabilite/journaux/create"
              className="px-4 py-2 bg-gradient-to-r from-violet-600 to-violet-500 text-white rounded-lg hover:from-violet-700 font-medium flex items-center gap-2 text-sm"
            >
              <FiPlus size={14} />
              Créer un journal
            </a>
            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-gray-700 font-medium text-sm"
              >
                Effacer les filtres
              </button>
            )}
            <a
              href="/comptabilite/journaux"
              className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-gray-700 font-medium text-sm"
            >
              Voir tous
            </a>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4">
          {filteredJournaux.map((journal) => {
            const style = getJournalStyle(journal);
            const Icon = style.icon;
            
            const journalTypeName = journal.type?.name || journal.type_name || style.label;
            const companyName = journal.company?.raison_sociale || 
                              journal.company?.nom || 
                              journal.company_name ||
                              'Entreprise non spécifiée';

            return (
              <div
                key={journal.id}
                className={`bg-white rounded-lg border border-gray-200 overflow-hidden hover:shadow-md transition-all duration-200 ${
                  !journal.active ? 'opacity-70' : ''
                }`}
              >
                <div className={`h-1 bg-gradient-to-r ${style.color}`}></div>

                <div className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className={`p-2 rounded-md ${style.bg}`}>
                        <Icon size={18} className={style.text} />
                      </div>
                      <div className="min-w-0">
                        <h3 className="font-semibold text-gray-900 text-sm truncate">
                          {journal.name || 'Journal sans nom'}
                        </h3>
                        <div className="flex items-center gap-1 text-xs text-gray-600">
                          <span className="font-mono bg-gray-100 px-1 py-0.5 rounded">
                            {journal.code}
                          </span>
                          <span>•</span>
                          <span className="truncate">{journalTypeName}</span>
                        </div>
                      </div>
                    </div>

                    <span
                      className={`px-2 py-0.5 rounded-full text-xs font-medium whitespace-nowrap ${
                        journal.active
                          ? 'bg-green-100 text-green-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {journal.active ? 'Actif' : 'Inactif'}
                    </span>
                  </div>

                  <div className="space-y-2 mb-4 text-xs">
                    <div>
                      <span className="text-gray-500">Entreprise:</span>
                      <p className="font-medium text-gray-900 truncate">
                        {companyName}
                      </p>
                    </div>

                    <div>
                      <span className="text-gray-500">Compte:</span>
                      <p className="font-medium text-gray-900 truncate">
                        {journal.default_account ? (
                          <>
                            <span className="font-mono text-violet-600 text-xs">
                              {journal.default_account.code}
                            </span>
                            {' - '}
                            <span className="truncate">{journal.default_account.name}</span>
                          </>
                        ) : journal.default_account_name ? (
                          journal.default_account_name
                        ) : (
                          <span className="text-gray-400 italic text-xs">Non configuré</span>
                        )}
                      </p>
                    </div>

                    {journal.note && (
                      <div>
                        <span className="text-gray-500">Note:</span>
                        <p className="text-gray-600 truncate text-xs">
                          {journal.note}
                        </p>
                      </div>
                    )}
                  </div>

                  <div className="flex gap-2">
                    <a
                      href={`/comptabilite/ecritures/create?journal=${journal.id}`}
                      className="flex-1 px-3 py-1.5 bg-gradient-to-r from-violet-600 to-violet-500 text-white rounded hover:from-violet-700 text-center font-medium text-xs transition-colors"
                    >
                      Nouvelle écriture
                    </a>
                    <a
                      href={`/comptabilite/journaux/${journal.id}`}
                      className="px-2 py-1.5 border border-gray-300 rounded hover:bg-gray-50 text-gray-700 text-center font-medium text-xs transition-colors flex items-center justify-center gap-1"
                      title="Voir le journal"
                    >
                      <FiEye size={12} />
                    </a>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Pied de page */}
      {filteredJournaux.length > 0 && (
        <div className="mt-6 pt-4 border-t border-gray-200 text-center text-xs text-gray-500">
          <p>
            {filteredJournaux.length} journal{filteredJournaux.length > 1 ? 'x' : ''} comptable{filteredJournaux.length > 1 ? 's' : ''}
            {selectedCompany && companies.find(c => c.id.toString() === selectedCompany) && (
              <> pour <span className="font-medium text-gray-700">
                {companies.find(c => c.id.toString() === selectedCompany).raison_sociale}
              </span></>
            )}
            {hasActiveFilters && ' (avec filtres appliqués)'}
          </p>
        </div>
      )}
    </div>
  );
}