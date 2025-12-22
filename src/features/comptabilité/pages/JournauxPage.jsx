import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { apiClient } from '../../../services/apiClient';
import { authService } from '../../../services/authService';
import { 
  FiRefreshCw, 
  FiPlus, 
  FiEdit2, 
  FiTrash2, 
  FiSearch, 
  FiFilter, 
  FiX, 
  FiCheck, 
  FiChevronLeft, 
  FiChevronRight,
  FiChevronDown,
  FiDownload,
  FiUpload,
  FiEye,
  FiPercent,
  FiTrendingUp,
  FiGlobe,
  FiCreditCard,
  FiShoppingCart,
  FiInfo,
  FiAlertCircle,
  FiLogIn,
  FiDatabase,
  FiUsers,
  FiMapPin,
  FiUser,
  FiDollarSign,
  FiBriefcase,
  FiShield,
  FiToggleLeft,
  FiToggleRight,
  FiLink,
  FiCopy,
  FiBook,
  FiFileText,
  FiCalendar,
  FiLayers,
  FiActivity,
  FiBarChart2,
  FiArchive,
  FiGrid,
  FiType
} from "react-icons/fi";

export default function JournauxComptablesPage() {
  // ÉTATS PRINCIPAUX - MÊME STRUCTURE
  const [journaux, setJournaux] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [journalTypes, setJournalTypes] = useState([]);
  const [comptes, setComptes] = useState([]);
  const [banques, setBanques] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editingJournal, setEditingJournal] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedJournal, setSelectedJournal] = useState(null);
  const [showConfigModal, setShowConfigModal] = useState(false);
  
  // PAGINATION ET FILTRES - MÊME STRUCTURE
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCompany, setFilterCompany] = useState('');
  const [filterType, setFilterType] = useState('');
  const [filterActive, setFilterActive] = useState('');
  const [selectedRows, setSelectedRows] = useState([]);
  const [authStatus, setAuthStatus] = useState({
    isAuthenticated: false,
    hasCompaniesAccess: false,
    showLoginPrompt: false
  });

  // MÊME FONCTION EXTRACTDATA
  const extractData = useCallback((response) => {
    if (!response) return [];
    if (Array.isArray(response)) return response;
    if (response.data && Array.isArray(response.data)) return response.data;
    if (response.results && Array.isArray(response.results)) return response.results;
    return [];
  }, []);

  // MÊME USE EFFECT INITIAL
  useEffect(() => {
    checkAuthStatus();
    fetchPublicData();
  }, []);

  // MÊME CHECK AUTH STATUS
  const checkAuthStatus = useCallback(() => {
    const isAuthenticated = authService.isAuthenticated();
    const token = authService.getToken();
    
    console.log('🔐 Statut auth journaux comptables:', {
      isAuthenticated,
      hasToken: !!token,
      tokenLength: token ? token.length : 0
    });
    
    setAuthStatus(prev => ({
      ...prev,
      isAuthenticated,
      showLoginPrompt: !isAuthenticated
    }));
    
    return isAuthenticated;
  }, []);

  // FETCH PUBLIC DATA - ADAPTÉ POUR LES JOURNAUX
  const fetchPublicData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Charger les données publiques
      const [journauxRes, typesRes, comptesRes] = await Promise.all([
        apiClient.get('/compta/journals/').catch(err => {
          console.warn('⚠️ Erreur journaux:', err.message);
          return { data: [] };
        }),
        apiClient.get('/compta/journal-types/').catch(err => {
          console.warn('⚠️ Erreur types de journal:', err.message);
          return { data: [] };
        }),
        apiClient.get('/compta/accounts/').catch(err => {
          console.warn('⚠️ Erreur comptes:', err.message);
          return { data: [] };
        })
      ]);

      setJournaux(extractData(journauxRes));
      setJournalTypes(extractData(typesRes));
      setComptes(extractData(comptesRes));

      // Si l'utilisateur est authentifié, charger les entreprises et banques
      if (authService.isAuthenticated()) {
        await fetchCompanies();
      } else {
        setCompanies([]);
        setAuthStatus(prev => ({ ...prev, hasCompaniesAccess: false }));
      }
      
      console.log('✅ Données publiques journaux chargées:', {
        journaux: extractData(journauxRes).length,
        types: extractData(typesRes).length,
        comptes: extractData(comptesRes).length
      });

    } catch (err) {
      console.error('❌ Erreur lors du chargement des données publiques:', err);
      setError('Erreur de connexion au serveur');
    } finally {
      setLoading(false);
    }
  }, [extractData]);

  // MÊME FETCH COMPANIES
  const fetchCompanies = useCallback(async () => {
    try {
      const token = authService.getToken();
      
      if (!token) {
        console.warn('🔐 Aucun token pour charger les entreprises');
        setAuthStatus(prev => ({ 
          ...prev, 
          hasCompaniesAccess: false,
          showLoginPrompt: true 
        }));
        return;
      }

      console.log('🔄 Chargement des entreprises avec token...');
      
      try {
        const companiesRes = await apiClient.get('/entites/');
        const banquesRes = await apiClient.get('/core/banques/').catch(() => ({ data: [] }));
        
        const companiesData = extractData(companiesRes);
        const banquesData = extractData(banquesRes);
        
        setCompanies(companiesData);
        setBanques(banquesData);
        
        setAuthStatus(prev => ({ 
          ...prev, 
          hasCompaniesAccess: true,
          showLoginPrompt: false 
        }));
        
        console.log(`✅ ${companiesData.length} entreprise(s) chargée(s), ${banquesData.length} banque(s)`);
        
      } catch (apiError) {
        console.error('❌ Erreur API entreprises:', apiError);
        
        if (apiError.status === 401) {
          console.log('🔐 Token probablement expiré, tentative de rafraîchissement...');
          
          try {
            await authService.refreshToken();
            console.log('✅ Token rafraîchi, nouvelle tentative...');
            
            const retryRes = await apiClient.get('/entites/');
            const retryData = extractData(retryRes);
            setCompanies(retryData);
            setAuthStatus(prev => ({ 
              ...prev, 
              hasCompaniesAccess: true,
              showLoginPrompt: false 
            }));
            
          } catch (refreshError) {
            console.error('❌ Échec du rafraîchissement:', refreshError);
            setAuthStatus(prev => ({ 
              ...prev, 
              hasCompaniesAccess: false,
              showLoginPrompt: true 
            }));
            setError('Session expirée. Veuillez vous reconnecter.');
          }
        } else {
          setAuthStatus(prev => ({ 
            ...prev, 
            hasCompaniesAccess: false 
          }));
          setError('Impossible de charger la liste des entreprises');
        }
      }
      
    } catch (err) {
      console.error('❌ Erreur générale chargement entreprises:', err);
      setAuthStatus(prev => ({ 
        ...prev, 
        hasCompaniesAccess: false 
      }));
    }
  }, [extractData]);

  // MÊME FETCH ALL DATA
  const fetchAllData = useCallback(async () => {
    await fetchPublicData();
  }, [fetchPublicData]);

  // MÊME HANDLE LOGIN
  const handleLogin = useCallback(() => {
    window.location.href = '/login?redirect=' + encodeURIComponent(window.location.pathname);
  }, []);

  // MÊME HANDLE FORCE REFRESH
  const handleForceRefresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    if (!authService.isAuthenticated()) {
      setAuthStatus(prev => ({ 
        ...prev, 
        showLoginPrompt: true 
      }));
      setLoading(false);
      return;
    }
    
    await fetchAllData();
  }, [fetchAllData]);

  // FILTERED DATA - ADAPTÉ POUR LES JOURNAUX
  const filteredJournaux = useMemo(() => {
    if (!Array.isArray(journaux)) return [];
    
    return journaux.filter(journal => {
      const searchTermLower = searchTerm.toLowerCase();
      const journalName = journal.name || '';
      const journalCode = journal.code || '';
      
      const matchesSearch = 
        journalName.toLowerCase().includes(searchTermLower) ||
        journalCode.toLowerCase().includes(searchTermLower);
      
      const matchesCompany = !filterCompany || 
        (journal.company?.id && journal.company.id.toString() === filterCompany);
      
      const matchesType = !filterType || 
        (journal.type?.id && journal.type.id.toString() === filterType);
      
      const matchesActive = filterActive === '' || 
        (filterActive === 'true' ? journal.active : !journal.active);
      
      return matchesSearch && matchesCompany && matchesType && matchesActive;
    });
  }, [journaux, searchTerm, filterCompany, filterType, filterActive]);

  // MÊME PAGINATION CALCULS
  const totalItems = filteredJournaux.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / itemsPerPage));
  const indexOfLastItem = Math.min(currentPage * itemsPerPage, totalItems);
  const indexOfFirstItem = Math.max(0, indexOfLastItem - itemsPerPage);
  const currentJournaux = filteredJournaux.slice(indexOfFirstItem, indexOfLastItem);

  // MÊME PAGINATION FUNCTIONS
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

  // MÊME ROW SELECTION
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
    } else {
      setSelectedRows(currentJournaux.map(journal => journal.id).filter(id => id != null));
    }
  }, [currentJournaux, selectedRows.length]);

  // ACTIONS - ADAPTÉES POUR LES JOURNAUX
  const handleNewJournal = useCallback(() => {
    if (!authStatus.hasCompaniesAccess && companies.length === 0) {
      setAuthStatus(prev => ({ ...prev, showLoginPrompt: true }));
      return;
    }
    
    setEditingJournal(null);
    setShowForm(true);
  }, [authStatus.hasCompaniesAccess, companies.length]);

  const handleEdit = useCallback((journal) => {
    setEditingJournal(journal);
    setShowForm(true);
  }, []);

  const handleDelete = useCallback(async (journal) => {
    if (!journal || !journal.id) return;
    
    if (window.confirm(`Êtes-vous sûr de vouloir supprimer le journal "${journal.name || 'sans nom'}" ? Cette action est irréversible.`)) {
      try {
        await apiClient.delete(`/compta/journals/${journal.id}/`);
        fetchAllData();
      } catch (err) {
        console.error('Error deleting journal:', err);
        setError('Erreur lors de la suppression du journal');
      }
    }
  }, [fetchAllData]);

  const handleViewDetails = useCallback((journal) => {
    if (!journal) return;
    setSelectedJournal(journal);
    setShowDetailModal(true);
  }, []);

  const handleViewConfig = useCallback((journal) => {
    if (!journal) return;
    setSelectedJournal(journal);
    setShowConfigModal(true);
  }, []);

  const handleToggleActive = useCallback(async (journal) => {
    try {
      await apiClient.patch(`/compta/journals/${journal.id}/`, {
        active: !journal.active
      });
      fetchAllData();
    } catch (err) {
      console.error('Error toggling active:', err);
      setError('Erreur lors de la modification du statut');
    }
  }, [fetchAllData]);

  const handleDuplicate = useCallback(async (journal) => {
    try {
      const { id, ...journalData } = journal;
      journalData.name = `${journalData.name} (Copie)`;
      journalData.code = `${journalData.code}_COPY`;
      
      await apiClient.post('/compta/journals/', journalData);
      fetchAllData();
    } catch (err) {
      console.error('Error duplicating journal:', err);
      setError('Erreur lors de la duplication');
    }
  }, [fetchAllData]);

  const handleFormSuccess = useCallback(() => {
    setShowForm(false);
    setEditingJournal(null);
    fetchAllData();
  }, [fetchAllData]);

  const handleRetry = useCallback(() => {
    fetchAllData();
  }, [fetchAllData]);

  const resetFilters = useCallback(() => {
    setSearchTerm('');
    setFilterCompany('');
    setFilterType('');
    setFilterActive('');
    setCurrentPage(1);
  }, []);

  // STATISTICS - ADAPTÉES POUR LES JOURNAUX
  const stats = useMemo(() => ({
    total: journaux.length,
    active: journaux.filter(j => j.active !== false).length,
    bank: journaux.filter(j => j.type?.code === 'BAN' || j.type?.name?.toLowerCase().includes('banque')).length,
    sale: journaux.filter(j => j.type?.code === 'VEN' || j.type?.name?.toLowerCase().includes('vente')).length,
    purchase: journaux.filter(j => j.type?.code === 'ACH' || j.type?.name?.toLowerCase().includes('achat')).length,
    companies: companies.length
  }), [journaux, companies]);

  // MÊME LOADING COMPONENT
  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="p-4 bg-gradient-to-br from-gray-50 to-white min-h-screen">
      {/* Bannière d'authentification */}
      {authStatus.showLoginPrompt && (
        <AuthBanner 
          onLogin={handleLogin}
          onContinue={() => setAuthStatus(prev => ({ ...prev, showLoginPrompt: false }))}
        />
      )}

      {/* Header */}
      <Header 
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        loading={loading}
        handleRetry={handleRetry}
        handleNewJournal={handleNewJournal}
        handleLogin={handleLogin}
        stats={stats}
        filterCompany={filterCompany}
        setFilterCompany={setFilterCompany}
        filterType={filterType}
        setFilterType={setFilterType}
        filterActive={filterActive}
        setFilterActive={setFilterActive}
        setCurrentPage={setCurrentPage}
        resetFilters={resetFilters}
        selectedRows={selectedRows}
        authStatus={authStatus}
        companiesCount={companies.length}
        companies={companies}
        journalTypes={journalTypes}
      />

      {/* Message d'erreur */}
      {error && <ErrorMessage error={error} handleRetry={handleRetry} />}

      {/* Message d'avertissement pour les entreprises */}
      {!authStatus.hasCompaniesAccess && companies.length === 0 && journaux.length > 0 && (
        <CompaniesWarning onLogin={handleLogin} />
      )}

      {/* Tableau principal */}
      <MainTable 
        currentJournaux={currentJournaux}
        journaux={journaux}
        selectedRows={selectedRows}
        selectAllRows={selectAllRows}
        toggleRowSelection={toggleRowSelection}
        handleViewDetails={handleViewDetails}
        handleViewConfig={handleViewConfig}
        handleToggleActive={handleToggleActive}
        handleDuplicate={handleDuplicate}
        handleEdit={handleEdit}
        handleDelete={handleDelete}
        handleNewJournal={handleNewJournal}
        itemsPerPage={itemsPerPage}
        setItemsPerPage={setItemsPerPage}
        setCurrentPage={setCurrentPage}
      />

      {/* Pagination */}
      {currentJournaux.length > 0 && (
        <Pagination 
          currentPage={currentPage}
          totalPages={totalPages}
          totalItems={totalItems}
          indexOfFirstItem={indexOfFirstItem}
          indexOfLastItem={indexOfLastItem}
          paginate={paginate}
          prevPage={prevPage}
          nextPage={nextPage}
        />
      )}

      {/* Modaux */}
      {showForm && (
        <JournalFormModal
          journal={editingJournal}
          companies={companies}
          journalTypes={journalTypes}
          comptes={comptes}
          banques={banques}
          authStatus={authStatus}
          onClose={() => {
            setShowForm(false);
            setEditingJournal(null);
          }}
          onSuccess={handleFormSuccess}
          onLogin={handleLogin}
        />
      )}

      {showDetailModal && selectedJournal && (
        <JournalDetailModal
          journal={selectedJournal}
          onClose={() => {
            setShowDetailModal(false);
            setSelectedJournal(null);
          }}
        />
      )}

      {showConfigModal && selectedJournal && (
        <JournalConfigModal
          journal={selectedJournal}
          onClose={() => {
            setShowConfigModal(false);
            setSelectedJournal(null);
          }}
        />
      )}
    </div>
  );
}

// MÊME COMPOSANTS AUXILIAIRES

function LoadingSpinner() {
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

function AuthBanner({ onLogin, onContinue }) {
  return (
    <div className="mb-4 p-3 bg-gradient-to-r from-blue-50 to-blue-100 border-l-3 border-blue-500 rounded-r-lg">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-blue-100 rounded">
            <FiLogIn className="w-4 h-4 text-blue-600" />
          </div>
          <div>
            <p className="text-blue-800 text-xs font-medium">
              Authentification requise
            </p>
            <p className="text-blue-700 text-xs mt-0.5">
              Connectez-vous pour accéder à toutes les fonctionnalités
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onContinue}
            className="px-3 py-1 border border-blue-300 text-blue-700 rounded hover:bg-blue-50 transition-colors text-xs font-medium"
          >
            Continuer sans
          </button>
          <button
            onClick={onLogin}
            className="px-3 py-1 bg-gradient-to-r from-blue-600 to-blue-500 text-white rounded hover:from-blue-700 hover:to-blue-600 transition-colors text-xs font-medium flex items-center gap-1"
          >
            <FiLogIn size={12} />
            Se connecter
          </button>
        </div>
      </div>
    </div>
  );
}

function CompaniesWarning({ onLogin }) {
  return (
    <div className="mb-4 p-3 bg-gradient-to-r from-amber-50 to-amber-100 border-l-3 border-amber-500 rounded-r-lg">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-amber-100 rounded">
            <FiAlertCircle className="w-4 h-4 text-amber-600" />
          </div>
          <div>
            <p className="text-amber-800 text-xs font-medium">
              Connectez-vous pour accéder à la liste complète des entreprises
            </p>
            <p className="text-amber-700 text-xs mt-0.5">
              Vous pouvez toujours créer des journaux avec une entreprise manuelle
            </p>
          </div>
        </div>
        <button
          onClick={onLogin}
          className="px-3 py-1 bg-gradient-to-r from-amber-600 to-amber-500 text-white rounded hover:from-amber-700 hover:to-amber-600 transition-colors text-xs font-medium flex items-center gap-1"
        >
          <FiLogIn size={12} />
          Se connecter
        </button>
      </div>
    </div>
  );
}

function Header({ 
  searchTerm, 
  setSearchTerm, 
  loading, 
  handleRetry, 
  handleNewJournal, 
  handleLogin,
  stats, 
  filterCompany, 
  setFilterCompany,
  filterType,
  setFilterType,
  filterActive,
  setFilterActive,
  setCurrentPage,
  resetFilters,
  selectedRows,
  authStatus,
  companiesCount,
  companies,
  journalTypes
}) {
  return (
    <div className="mb-6">
      {/* Barre de recherche - MÊME DESIGN */}
      <div className="flex items-center justify-center gap-3 mb-4">
        <div className="relative flex items-center">
          <div className="relative flex-1">
            <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 pr-24 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-violet-500 focus:border-transparent text-sm w-80"
              placeholder="Rechercher un journal..."
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-20 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1"
              >
                <FiX size={14} />
              </button>
            )}
            
            <div className="absolute right-1 top-1/2 transform -translate-y-1/2">
              <button
                onClick={() => {}}
                className="flex items-center gap-1 px-2 py-1.5 rounded text-xs font-medium bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors"
              >
                <FiChevronDown size={12} />
                <span>Filtre</span>
              </button>
            </div>
          </div>
          
          <button 
            onClick={handleRetry}
            className="ml-3 px-3 py-2 rounded-lg border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 transition-all duration-300 flex items-center gap-1.5 text-sm"
          >
            <FiRefreshCw className={`${loading ? 'animate-spin' : ''}`} size={14} />
            <span>Actualiser</span>
          </button>
          
          {!authStatus.isAuthenticated && (
            <button 
              onClick={handleLogin}
              className="ml-2 px-3 py-2 rounded-lg bg-gradient-to-r from-blue-600 to-blue-500 text-white hover:from-blue-700 hover:to-blue-600 transition-all duration-300 flex items-center gap-1.5 text-sm shadow"
            >
              <FiLogIn size={14} />
              <span>Connexion</span>
            </button>
          )}
          
          <button 
            onClick={handleNewJournal}
            disabled={!authStatus.hasCompaniesAccess && companiesCount === 0}
            className={`ml-2 px-3 py-2 rounded-lg transition-all duration-300 flex items-center gap-1.5 text-sm shadow ${
              (!authStatus.hasCompaniesAccess && companiesCount === 0)
                ? 'bg-gradient-to-r from-gray-400 to-gray-300 text-gray-100 cursor-not-allowed'
                : 'bg-gradient-to-r from-violet-600 to-violet-500 text-white hover:from-violet-700 hover:to-violet-600'
            }`}
          >
            <FiPlus size={14} />
            <span>Nouveau Journal</span>
          </button>
        </div>
      </div>

      {/* Statistiques - MÊME GRID */}
      <div className="grid grid-cols-5 gap-2 mb-3">
        <StatCard 
          label="Journaux" 
          value={stats.total} 
          color="violet" 
          icon={FiBook} 
        />
        <StatCard 
          label="Actifs" 
          value={stats.active} 
          color="green" 
          icon={FiCheck} 
        />
        <StatCard 
          label="Banques" 
          value={stats.bank} 
          color="blue" 
          icon={FiCreditCard} 
        />
        <StatCard 
          label="Ventes" 
          value={stats.sale} 
          color="amber" 
          icon={FiShoppingCart} 
        />
        <StatCard 
          label="Achats" 
          value={stats.purchase} 
          color="cyan" 
          icon={FiTrendingUp} 
        />
      </div>

      {/* Filtres rapides - MÊME DESIGN */}
      <div className="flex items-center gap-3 mb-3">
        <select
          value={filterCompany}
          onChange={(e) => {
            setCurrentPage(1);
            setFilterCompany(e.target.value);
          }}
          className="px-3 py-1.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-violet-500 text-sm bg-white"
        >
          <option value="">Toutes entreprises</option>
          {companies.map(c => (
            <option key={c.id} value={c.id}>
              {c.raison_sociale || c.nom}
            </option>
          ))}
        </select>

        <select
          value={filterType}
          onChange={(e) => {
            setCurrentPage(1);
            setFilterType(e.target.value);
          }}
          className="px-3 py-1.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-violet-500 text-sm bg-white"
        >
          <option value="">Tous types</option>
          {journalTypes.map(t => (
            <option key={t.id} value={t.id}>
              {t.name} ({t.code})
            </option>
          ))}
        </select>

        <select
          value={filterActive}
          onChange={(e) => {
            setCurrentPage(1);
            setFilterActive(e.target.value);
          }}
          className="px-3 py-1.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-violet-500 text-sm bg-white"
        >
          <option value="">Tous</option>
          <option value="true">Actifs</option>
          <option value="false">Inactifs</option>
        </select>

        <button
          onClick={resetFilters}
          className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg flex items-center gap-1 border border-gray-300"
        >
          <FiX size={12} />
          Réinitialiser
        </button>
      </div>
    </div>
  );
}

function StatCard({ label, value, color, icon: Icon, sublabel }) {
  const colorClasses = {
    violet: { bg: 'bg-violet-50', text: 'text-violet-600', iconBg: 'bg-violet-100' },
    green: { bg: 'bg-green-50', text: 'text-green-600', iconBg: 'bg-green-100' },
    amber: { bg: 'bg-amber-50', text: 'text-amber-600', iconBg: 'bg-amber-100' },
    blue: { bg: 'bg-blue-50', text: 'text-blue-600', iconBg: 'bg-blue-100' },
    cyan: { bg: 'bg-cyan-50', text: 'text-cyan-600', iconBg: 'bg-cyan-100' }
  };

  const colors = colorClasses[color];

  return (
    <div className="bg-white rounded-lg p-1.5 border border-gray-200 shadow-sm h-14 flex items-center">
      <div className="flex items-center gap-2 w-full">
        <div className={`p-1.5 ${colors.iconBg} rounded`}>
          <Icon className={`w-3.5 h-3.5 ${colors.text}`} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline justify-between">
            <span className="text-[10px] text-gray-600 truncate">{label}</span>
            <span className={`text-sm font-bold ${colors.text} ml-1`}>{value}</span>
          </div>
          {sublabel && (
            <div className="text-[9px] text-gray-500 truncate mt-0.5">{sublabel}</div>
          )}
        </div>
      </div>
    </div>
  );
}

function ErrorMessage({ error, handleRetry }) {
  return (
    <div className="mb-4">
      <div className="bg-gradient-to-r from-red-50 to-red-100 border-l-3 border-red-500 rounded-r-lg p-2 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1 bg-red-100 rounded">
              <FiAlertCircle className="w-3 h-3 text-red-600" />
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
  );
}

function MainTable({ 
  currentJournaux, 
  journaux, 
  selectedRows, 
  selectAllRows, 
  toggleRowSelection, 
  handleViewDetails, 
  handleViewConfig,
  handleToggleActive,
  handleDuplicate,
  handleEdit, 
  handleDelete, 
  handleNewJournal,
  itemsPerPage,
  setItemsPerPage,
  setCurrentPage
}) {
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
      {/* En-tête du tableau - MÊME DESIGN */}
      <div className="px-3 py-2 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5">
              <input
                type="checkbox"
                checked={selectedRows.length === currentJournaux.length && currentJournaux.length > 0}
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

      {/* Tableau - MÊME STRUCTURE */}
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead>
            <tr className="bg-gradient-to-r from-gray-50 to-gray-100">
              <th scope="col" className="px-3 py-2 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider border-r border-gray-300">
                <div className="flex items-center gap-1">
                  <input
                    type="checkbox"
                    checked={selectedRows.length === currentJournaux.length && currentJournaux.length > 0}
                    onChange={selectAllRows}
                    className="w-3 h-3 text-violet-600 rounded focus:ring-violet-500 border-gray-300"
                  />
                  Journal
                </div>
              </th>
              <th scope="col" className="px-3 py-2 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider border-r border-gray-300">
                Type
              </th>
              <th scope="col" className="px-3 py-2 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider border-r border-gray-300">
                Entreprise
              </th>
              <th scope="col" className="px-3 py-2 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider border-r border-gray-300">
                Compte
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
            {currentJournaux.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-3 py-4 text-center">
                  <EmptyState 
                    hasData={journaux.length > 0} 
                    onNewJournal={handleNewJournal} 
                  />
                </td>
              </tr>
            ) : (
              currentJournaux.map((journal) => (
                <JournalRow 
                  key={journal.id}
                  journal={journal}
                  isSelected={selectedRows.includes(journal.id)}
                  onToggleSelect={() => toggleRowSelection(journal.id)}
                  onViewDetails={() => handleViewDetails(journal)}
                  onViewConfig={() => handleViewConfig(journal)}
                  onToggleActive={() => handleToggleActive(journal)}
                  onDuplicate={() => handleDuplicate(journal)}
                  onEdit={() => handleEdit(journal)}
                  onDelete={() => handleDelete(journal)}
                />
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function EmptyState({ hasData, onNewJournal }) {
  return (
    <div className="flex flex-col items-center justify-center">
      <div className="w-12 h-12 bg-gradient-to-br from-gray-100 to-gray-200 rounded-full flex items-center justify-center mb-2">
        <FiBook className="w-6 h-6 text-gray-400" />
      </div>
      <h3 className="text-sm font-semibold text-gray-900 mb-1">
        {hasData ? 'Aucun résultat' : 'Aucun journal comptable trouvé'}
      </h3>
      <p className="text-gray-600 text-xs mb-3 max-w-md">
        {hasData 
          ? 'Essayez de modifier vos critères de recherche'
          : 'Commencez par créer votre premier journal comptable'
        }
      </p>
      {!hasData && (
        <button 
          onClick={onNewJournal}
          className="px-3 py-1 bg-gradient-to-r from-violet-600 to-violet-500 text-white rounded hover:from-violet-700 hover:to-violet-600 transition-all duration-300 font-medium flex items-center gap-1 text-xs"
        >
          <FiPlus size={12} />
          Créer journal
        </button>
      )}
    </div>
  );
}

function JournalRow({ journal, isSelected, onToggleSelect, onViewDetails, onViewConfig, onToggleActive, onDuplicate, onEdit, onDelete }) {
  const getTypeBadge = (type) => {
    const typeMap = {
      'ACH': { bg: 'from-amber-50 to-amber-100', text: 'text-amber-800', icon: FiTrendingUp, label: 'Achat' },
      'VEN': { bg: 'from-green-50 to-green-100', text: 'text-green-800', icon: FiShoppingCart, label: 'Vente' },
      'BAN': { bg: 'from-blue-50 to-blue-100', text: 'text-blue-800', icon: FiCreditCard, label: 'Banque' },
      'CAI': { bg: 'from-violet-50 to-violet-100', text: 'text-violet-800', icon: FiDollarSign, label: 'Caisse' },
      'OD': { bg: 'from-gray-50 to-gray-100', text: 'text-gray-800', icon: FiFileText, label: 'Divers' }
    };
    
    const code = type?.code || '';
    return typeMap[code] || { 
      bg: 'from-gray-50 to-gray-100', 
      text: 'text-gray-800', 
      icon: FiFileText, 
      label: type?.name || 'Autre' 
    };
  };

  const getStatusBadge = (active) => {
    if (active === false) {
      return {
        bg: 'bg-gradient-to-r from-gray-50 to-gray-100',
        text: 'text-gray-800',
        icon: FiX,
        label: 'Inactif'
      };
    }
    return {
      bg: 'bg-gradient-to-r from-green-50 to-green-100',
      text: 'text-green-800',
      icon: FiCheck,
      label: 'Actif'
    };
  };

  const typeBadge = getTypeBadge(journal.type);
  const statusBadge = getStatusBadge(journal.active);
  const StatusIcon = statusBadge.icon;

  return (
    <tr className={`hover:bg-gradient-to-r hover:from-gray-50 hover:to-white transition-all duration-200 ${
      isSelected ? 'bg-gradient-to-r from-violet-50 to-violet-25' : 'bg-white'
    }`}>
      {/* Journal avec checkbox */}
      <td className="px-3 py-2 whitespace-nowrap border-r border-gray-200">
        <div className="flex items-center gap-1.5">
          <input
            type="checkbox"
            checked={isSelected}
            onChange={onToggleSelect}
            className="w-3 h-3 text-violet-600 rounded focus:ring-violet-500 border-gray-300"
          />
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-semibold text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded border">
                {journal.code || '---'}
              </span>
              <div className="text-xs font-semibold text-gray-900 truncate max-w-[120px]">
                {journal.name}
              </div>
            </div>
            {journal.note && (
              <div className="text-xs text-gray-500 truncate max-w-[150px] mt-0.5">
                {journal.note.substring(0, 50)}...
              </div>
            )}
          </div>
        </div>
      </td>
      
      {/* Type */}
      <td className="px-3 py-2 border-r border-gray-200">
        <div className={`inline-flex items-center px-2 py-1 ${typeBadge.bg} ${typeBadge.text} rounded-full text-xs font-medium`}>
          <span className="text-xs font-medium">{typeBadge.label}</span>
        </div>
      </td>
      
      {/* Entreprise */}
      <td className="px-3 py-2 border-r border-gray-200">
        <div className="text-xs text-gray-900 truncate max-w-[100px]">
          {journal.company?.nom || 
           journal.company?.raison_sociale || 
           journal.company?.name || 
           journal.company?.raisonSociale || 
           journal.company?.display_name || 
           journal.company?.company_name ||
           'Toutes'}
        </div>
      </td>
      
      {/* Compte par défaut */}
      <td className="px-3 py-2 border-r border-gray-200">
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
      
      {/* Statut */}
      <td className="px-3 py-2 border-r border-gray-200">
        <div>
          <span className={`inline-flex items-center px-2 py-0.5 ${statusBadge.bg} ${statusBadge.text} rounded-full text-xs font-medium`}>
            <StatusIcon className="w-2.5 h-2.5 mr-1" />
            {statusBadge.label}
          </span>
        </div>
      </td>
      
      {/* Actions */}
      <td className="px-3 py-2 whitespace-nowrap">
        <div className="flex items-center gap-1">
          <ActionButton 
            onClick={onViewConfig}
            color="gray"
            icon={FiSettings}
            title="Configuration"
          />
          <ActionButton 
            onClick={onViewDetails}
            color="gray"
            icon={FiEye}
            title="Voir détails"
          />
          <ActionButton 
            onClick={onToggleActive}
            color={journal.active === false ? "green" : "gray"}
            icon={journal.active === false ? FiCheck : FiX}
            title={journal.active === false ? "Activer" : "Désactiver"}
          />
          <ActionButton 
            onClick={onDuplicate}
            color="purple"
            icon={FiCopy}
            title="Dupliquer"
          />
          <ActionButton 
            onClick={onEdit}
            color="violet"
            icon={FiEdit2}
            title="Modifier"
          />
          <ActionButton 
            onClick={onDelete}
            color="red"
            icon={FiTrash2}
            title="Supprimer"
          />
        </div>
      </td>
    </tr>
  );
}

function FiSettings(props) {
  return (
    <svg {...props} fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  );
}

function ActionButton({ onClick, color, icon: Icon, title }) {
  const colorClasses = {
    gray: 'from-gray-50 to-gray-100 text-gray-700 hover:from-gray-100 hover:to-gray-200',
    violet: 'from-violet-50 to-violet-100 text-violet-700 hover:from-violet-100 hover:to-violet-200',
    red: 'from-red-50 to-red-100 text-red-700 hover:from-red-100 hover:to-red-200',
    green: 'from-green-50 to-green-100 text-green-700 hover:from-green-100 hover:to-green-200',
    purple: 'from-purple-50 to-purple-100 text-purple-700 hover:from-purple-100 hover:to-purple-200',
    amber: 'from-amber-50 to-amber-100 text-amber-700 hover:from-amber-100 hover:to-amber-200',
    blue: 'from-blue-50 to-blue-100 text-blue-700 hover:from-blue-100 hover:to-blue-200'
  };

  return (
    <button
      onClick={onClick}
      className={`p-1 bg-gradient-to-r ${colorClasses[color]} rounded transition-all duration-200 shadow-sm hover:shadow`}
      title={title}
    >
      <Icon size={12} />
    </button>
  );
}

function Pagination({ 
  currentPage, 
  totalPages, 
  totalItems, 
  indexOfFirstItem, 
  indexOfLastItem, 
  paginate, 
  prevPage, 
  nextPage 
}) {
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

  return (
    <div className="px-3 py-2 border-t border-gray-200 bg-gradient-to-r from-gray-50 to-white">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1">
            <span className="text-xs text-gray-700">
              Page {currentPage} sur {totalPages}
            </span>
            <span className="text-gray-300">•</span>
            <span className="text-xs text-gray-700">
              {indexOfFirstItem + 1}-{Math.min(indexOfLastItem, totalItems)} sur {totalItems} journaux
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <PaginationButton 
            onClick={prevPage}
            disabled={currentPage === 1}
            icon={FiChevronLeft}
            title="Page précédente"
          />

          {/* Numéros de page */}
          <div className="flex items-center gap-0.5">
            {pageNumbers.map((pageNumber) => (
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
            ))}
          </div>

          <PaginationButton 
            onClick={nextPage}
            disabled={currentPage === totalPages}
            icon={FiChevronRight}
            title="Page suivante"
          />
        </div>
      </div>
    </div>
  );
}

function PaginationButton({ onClick, disabled, icon: Icon, title }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`p-1 rounded border transition-all duration-200 ${
        disabled
          ? 'bg-gray-100 text-gray-400 border-gray-300 cursor-not-allowed'
          : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50 hover:border-gray-400 hover:shadow-sm'
      }`}
      title={title}
    >
      <Icon size={12} />
    </button>
  );
}

// MODAL DE DÉTAILS
function JournalDetailModal({ journal, onClose }) {
  const getJournalColor = (typeCode) => {
    const colorMap = {
      'ACH': 'from-amber-600 to-amber-500',
      'VEN': 'from-green-600 to-green-500',
      'BAN': 'from-blue-600 to-blue-500',
      'CAI': 'from-violet-600 to-violet-500',
      'OD': 'from-gray-600 to-gray-500'
    };
    return colorMap[typeCode] || 'from-violet-600 to-violet-500';
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-3 z-50 backdrop-blur-sm">
      <div className="bg-white rounded-lg w-full max-w-4xl max-h-[90vh] overflow-y-auto shadow-xl">
        {/* Header */}
        <div className={`sticky top-0 bg-gradient-to-r ${getJournalColor(journal.type?.code)} text-white rounded-t-lg p-3`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-white/20 backdrop-blur-sm rounded">
                <FiBook className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-base font-bold">Détails du Journal Comptable</h2>
                <p className="text-white/90 text-xs mt-0.5">{journal.code} - {journal.name}</p>
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
          {/* En-tête avec badges */}
          <div className="flex flex-col md:flex-row items-center md:items-start gap-4 mb-6">
            <div className="w-32 h-32 bg-gradient-to-br from-violet-100 to-violet-200 rounded-lg flex items-center justify-center overflow-hidden border-2 border-violet-300">
              <FiBook className="w-16 h-16 text-violet-600" />
            </div>
            <div className="flex-1 text-center md:text-left">
              <h1 className="text-xl font-bold text-gray-900">{journal.name}</h1>
              <div className="flex flex-wrap gap-2 mt-3 justify-center md:justify-start">
                <span className="inline-flex items-center px-3 py-1 bg-gradient-to-r from-gray-800 to-gray-700 text-white rounded-full text-xs font-medium">
                  Code: {journal.code || '---'}
                </span>
                {journal.active === false ? (
                  <span className="inline-flex items-center px-3 py-1 bg-gradient-to-r from-gray-600 to-gray-500 text-white rounded-full text-xs font-medium">
                    Inactif
                  </span>
                ) : (
                  <span className="inline-flex items-center px-3 py-1 bg-gradient-to-r from-green-600 to-green-500 text-white rounded-full text-xs font-medium">
                    Actif
                  </span>
                )}
                {journal.type && (
                  <span className={`inline-flex items-center px-3 py-1 ${getJournalColor(journal.type.code).replace('600', '50').replace('500', '100')} text-gray-700 rounded-full text-xs font-medium border border-gray-200`}>
                    {journal.type.name} ({journal.type.code})
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Informations Générales */}
          <InfoSection 
            title="Informations Générales"
            color="violet"
            items={[
              { label: 'Identifiant', value: `#${journal.id}`, isCode: true },
              { label: 'Code', value: journal.code || 'Non défini', isBold: true },
              { label: 'Nom', value: journal.name, isBold: true },
              { label: 'Description', value: journal.note || 'Aucune note' }
            ]}
          />

          {/* Type et Configuration */}
          <InfoSection 
            title="Type et Configuration"
            color="blue"
            items={[
              { 
                label: 'Type de journal', 
                value: journal.type ? (
                  <div className="flex items-center gap-2">
                    <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${getJournalColor(journal.type.code).replace('600', '50').replace('500', '100')}`}>
                      {journal.type.name} ({journal.type.code})
                    </span>
                  </div>
                ) : 'Non spécifié'
              },
              { 
                label: 'Entreprise', 
                value: journal.company ? (
                  <div>
                    <div className="font-medium">{journal.company.raison_sociale || journal.company.nom}</div>
                    <div className="text-sm text-gray-600">
                      {journal.company.email || journal.company.telephone || ''}
                    </div>
                  </div>
                ) : 'Toutes les entreprises'
              }
            ]}
          />

          {/* Comptes Associés */}
          <InfoSection 
            title="Comptes Associés"
            color="green"
            items={[
              { 
                label: 'Compte par défaut', 
                value: journal.default_account ? (
                  <div>
                    <div className="font-mono text-violet-600 font-medium">
                      {journal.default_account.code || '---'}
                    </div>
                    <div className="text-sm text-gray-700">
                      {journal.default_account.name}
                    </div>
                  </div>
                ) : <span className="text-gray-400 italic">Non défini</span>
              },
              { 
                label: 'Compte bancaire', 
                value: journal.bank_account ? (
                  <div>
                    <div className="font-medium">{journal.bank_account.banque?.nom}</div>
                    <div className="text-sm text-gray-600">
                      {journal.bank_account.numero_compte}
                    </div>
                  </div>
                ) : <span className="text-gray-400 italic">Non associé</span>
              }
            ]}
          />
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

// MODAL DE CONFIGURATION
function JournalConfigModal({ journal, onClose }) {
  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-3 z-50 backdrop-blur-sm">
      <div className="bg-white rounded-lg w-full max-w-3xl max-h-[90vh] overflow-y-auto shadow-xl">
        <div className="sticky top-0 bg-gradient-to-r from-blue-600 to-blue-500 text-white rounded-t-lg p-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-white/20 backdrop-blur-sm rounded">
                <FiSettings className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-base font-bold">Configuration du Journal</h2>
                <p className="text-white/90 text-xs mt-0.5">{journal.name}</p>
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
        
        <div className="p-4">
          <p className="text-gray-600 mb-4">
            Configuration avancée du journal comptable
          </p>
          {/* À implémenter avec la configuration réelle */}
        </div>
      </div>
    </div>
  );
}

function InfoSection({ title, color, items }) {
  const colorClasses = {
    violet: 'from-violet-600 to-violet-400',
    green: 'from-green-600 to-green-400',
    blue: 'from-blue-600 to-blue-400',
    amber: 'from-amber-600 to-amber-400'
  };

  const borderColors = {
    violet: 'border-violet-200',
    green: 'border-green-200',
    blue: 'border-blue-200',
    amber: 'border-amber-200'
  };

  const bgColors = {
    violet: 'from-violet-50 to-white',
    green: 'from-green-50 to-white',
    blue: 'from-blue-50 to-white',
    amber: 'from-amber-50 to-white'
  };

  return (
    <div className={`bg-gradient-to-br ${bgColors[color]} rounded-lg p-4 border ${borderColors[color]}`}>
      <h3 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-1.5">
        <div className={`w-1 h-4 bg-gradient-to-b ${colorClasses[color]} rounded`}></div>
        {title}
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {items.map((item, index) => (
          <div key={index}>
            <p className="text-xs font-medium text-gray-500 mb-1">{item.label}</p>
            {typeof item.value === 'string' ? (
              <p className={`text-sm ${item.isBold ? 'font-bold' : ''} ${item.isCode ? 'text-gray-900 font-mono font-medium' : 'text-gray-900'}`}>
                {item.value}
              </p>
            ) : (
              item.value
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// MODAL DE FORMULAIRE
function JournalFormModal({ journal, companies, journalTypes, comptes, banques, authStatus, onClose, onSuccess, onLogin }) {
  const [formData, setFormData] = useState({
    code: journal?.code || '',
    name: journal?.name || '',
    type: journal?.type?.id || journal?.type || '',
    company: journal?.company?.id || journal?.company || '',
    default_account: journal?.default_account?.id || journal?.default_account || '',
    bank_account: journal?.bank_account?.id || journal?.bank_account || '',
    note: journal?.note || '',
    active: journal?.active !== false
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [searchCompany, setSearchCompany] = useState('');
  const [searchType, setSearchType] = useState('');
  const [searchCompte, setSearchCompte] = useState('');
  const [searchBanque, setSearchBanque] = useState('');
  const [manualCompany, setManualCompany] = useState('');

  const companiesArray = Array.isArray(companies) ? companies : [];
  const typesArray = Array.isArray(journalTypes) ? journalTypes : [];
  const comptesArray = Array.isArray(comptes) ? comptes : [];
  const banquesArray = Array.isArray(banques) ? banques : [];

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    // Validation
    if (!formData.code.trim()) {
      setError('Le code du journal est obligatoire');
      setLoading(false);
      return;
    }

    if (!formData.name.trim()) {
      setError('Le nom du journal est obligatoire');
      setLoading(false);
      return;
    }

    if (!formData.type) {
      setError('Le type de journal est obligatoire');
      setLoading(false);
      return;
    }

    try {
      const url = journal ? `/compta/journals/${journal.id}/` : `/compta/journals/`;
      const method = journal ? 'PUT' : 'POST';

      // Préparer les données
      const submitData = { ...formData };
      
      // Si entreprise manuelle
      if (!submitData.company && manualCompany.trim()) {
        submitData.company_name = manualCompany.trim();
      }

      const response = await apiClient.request(url, {
        method: method,
        body: JSON.stringify(submitData),
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      console.log('✅ Journal sauvegardé:', response);
      onSuccess();
    } catch (err) {
      console.error('❌ Erreur sauvegarde journal:', err);
      setError(err.message || 'Erreur lors de la sauvegarde');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const getHeaderColor = () => {
    const type = typesArray.find(t => t.id === formData.type);
    if (!type) return 'from-violet-600 to-violet-500';
    
    const colorMap = {
      'ACH': 'from-amber-600 to-amber-500',
      'VEN': 'from-green-600 to-green-500',
      'BAN': 'from-blue-600 to-blue-500',
      'CAI': 'from-violet-600 to-violet-500',
      'OD': 'from-gray-600 to-gray-500'
    };
    
    return colorMap[type.code] || 'from-violet-600 to-violet-500';
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-3 z-50 backdrop-blur-sm">
      <div className="bg-white rounded-lg w-full max-w-5xl max-h-[90vh] overflow-y-auto shadow-xl">
        {/* Header */}
        <div className={`sticky top-0 bg-gradient-to-r ${getHeaderColor()} text-white rounded-t-lg p-3`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-white/20 backdrop-blur-sm rounded">
                <FiBook className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-base font-bold">
                  {journal ? 'Modifier le journal comptable' : 'Nouveau Journal Comptable'}
                </h2>
                {!journal && (
                  <p className="text-white/90 text-xs mt-0.5">
                    Créez un nouveau journal comptable (Achat, Vente, Banque, Caisse, etc.)
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
        
        {/* Message d'avertissement pour les entreprises */}
        {!authStatus.hasCompaniesAccess && companiesArray.length === 0 && (
          <div className="mx-4 mt-3 bg-gradient-to-r from-amber-50 to-amber-100 border-l-3 border-amber-500 rounded-r-lg p-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-amber-100 rounded">
                  <FiAlertCircle className="text-amber-600" size={14} />
                </div>
                <div>
                  <p className="text-amber-800 text-xs font-medium">
                    Liste des entreprises non disponible
                  </p>
                  <p className="text-amber-700 text-xs mt-0.5">
                    Vous pouvez saisir manuellement le nom de l'entreprise
                  </p>
                </div>
              </div>
              <button
                onClick={onLogin}
                className="px-2 py-1 bg-amber-600 text-white rounded hover:bg-amber-700 transition-colors text-xs font-medium"
              >
                Se connecter
              </button>
            </div>
          </div>
        )}
        
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {/* Section 1: Informations de Base */}
          <div className="bg-gradient-to-br from-gray-50 to-white rounded-lg p-3 border border-gray-200">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-1 h-4 bg-gradient-to-b from-violet-600 to-violet-400 rounded"></div>
              <h3 className="text-sm font-semibold text-gray-900">Informations de Base</h3>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
              {/* Code */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Code du Journal <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.code}
                  onChange={(e) => handleChange('code', e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-violet-500 focus:border-transparent bg-white text-sm"
                  placeholder="Ex: VEN, ACH, BAN, CAI..."
                  maxLength={8}
                />
              </div>
              
              {/* Nom */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Nom du Journal <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => handleChange('name', e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-violet-500 focus:border-transparent bg-white text-sm"
                  placeholder="Ex: Journal des ventes..."
                />
              </div>
              
              {/* Type */}
              <div className="lg:col-span-2">
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Type de Journal <span className="text-red-500">*</span>
                </label>
                <SearchableDropdown
                  value={formData.type}
                  onChange={(value) => handleChange('type', value)}
                  options={typesArray}
                  searchValue={searchType}
                  onSearchChange={setSearchType}
                  placeholder="Sélectionnez un type..."
                  icon={FiType}
                  getOptionLabel={(type) => `${type.name} (${type.code})`}
                  getOptionValue={(type) => type.id}
                  required={true}
                />
              </div>
              
              {/* Note */}
              <div className="lg:col-span-2">
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Notes
                </label>
                <textarea
                  value={formData.note}
                  onChange={(e) => handleChange('note', e.target.value)}
                  rows={2}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-violet-500 focus:border-transparent bg-white text-sm"
                  placeholder="Notes additionnelles..."
                />
              </div>
            </div>
          </div>

          {/* Section 2: Entreprise */}
          <div className="bg-gradient-to-br from-green-50 to-white rounded-lg p-3 border border-green-100">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-1 h-4 bg-gradient-to-b from-green-600 to-green-400 rounded"></div>
              <h3 className="text-sm font-semibold text-gray-900">Entreprise</h3>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
              {/* Entreprise */}
              <div className="lg:col-span-2">
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Entreprise
                </label>
                
                {companiesArray.length > 0 ? (
                  <SearchableDropdown
                    value={formData.company}
                    onChange={(value) => handleChange('company', value)}
                    options={companiesArray}
                    searchValue={searchCompany}
                    onSearchChange={setSearchCompany}
                    placeholder="Sélectionnez une entreprise"
                    icon={FiBriefcase}
                    getOptionLabel={(company) => company.raison_sociale || company.nom}
                    getOptionValue={(company) => company.id}
                  />
                ) : (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-xs text-gray-500 mb-1">
                      <FiAlertCircle size={12} />
                      <span>Saisie manuelle</span>
                    </div>
                    <input
                      type="text"
                      value={manualCompany}
                      onChange={(e) => setManualCompany(e.target.value)}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-violet-500 focus:border-transparent bg-white text-sm"
                      placeholder="Nom de l'entreprise..."
                    />
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Section 3: Configuration des Comptes */}
          <div className="bg-gradient-to-br from-blue-50 to-white rounded-lg p-3 border border-blue-100">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-1 h-4 bg-gradient-to-b from-blue-600 to-blue-400 rounded"></div>
              <h3 className="text-sm font-semibold text-gray-900">Configuration des Comptes</h3>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
              {/* Compte par défaut */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Compte par défaut
                </label>
                <SearchableDropdown
                  value={formData.default_account}
                  onChange={(value) => handleChange('default_account', value)}
                  options={comptesArray}
                  searchValue={searchCompte}
                  onSearchChange={setSearchCompte}
                  placeholder="Sélectionnez un compte..."
                  icon={FiCreditCard}
                  getOptionLabel={(compte) => `${compte.code} - ${compte.name}`}
                  getOptionValue={(compte) => compte.id}
                />
              </div>
              
              {/* Compte bancaire */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Compte bancaire (optionnel)
                </label>
                <SearchableDropdown
                  value={formData.bank_account}
                  onChange={(value) => handleChange('bank_account', value)}
                  options={banquesArray}
                  searchValue={searchBanque}
                  onSearchChange={setSearchBanque}
                  placeholder="Sélectionnez un compte bancaire..."
                  icon={FiDatabase}
                  getOptionLabel={(banque) => 
                    banque.numero_compte 
                      ? `${banque.banque?.nom} - ${banque.numero_compte}`
                      : banque.banque?.nom || banque.nom || 'Banque'
                  }
                  getOptionValue={(banque) => banque.id}
                />
              </div>
            </div>
          </div>

          {/* Section 4: Statut */}
          <div className="bg-gradient-to-br from-amber-50 to-white rounded-lg p-3 border border-amber-100">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-1 h-4 bg-gradient-to-b from-amber-600 to-amber-400 rounded"></div>
              <h3 className="text-sm font-semibold text-gray-900">Statut</h3>
            </div>
            
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="active"
                  checked={formData.active}
                  onChange={(e) => handleChange('active', e.target.checked)}
                  className="w-4 h-4 text-violet-600 rounded focus:ring-violet-500"
                />
                <label htmlFor="active" className="text-xs font-medium text-gray-700">
                  Journal actif
                </label>
              </div>
              <p className="text-xs text-gray-500">
                Un journal inactif ne pourra pas être utilisé pour les écritures comptables
              </p>
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
                  <span>{journal ? 'Mettre à jour' : 'Créer le journal'}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// MÊME COMPOSANT SEARCHABLE DROPDOWN
function SearchableDropdown({ 
  label, 
  value, 
  onChange, 
  options, 
  searchValue,
  onSearchChange,
  placeholder,
  required = false,
  disabled = false,
  icon: Icon,
  getOptionLabel = (option) => option,
  getOptionValue = (option) => option,
  renderOption = (option) => getOptionLabel(option)
}) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);
  const inputRef = useRef(null);

  const filteredOptions = options.filter(option =>
    getOptionLabel(option).toLowerCase().includes(searchValue.toLowerCase())
  );

  const selectedOption = options.find(opt => getOptionValue(opt) === value);

  useEffect(() => {
    const handleMouseDown = (event) => {
      if (!dropdownRef.current?.contains(event.target)) {
        setIsOpen(false);
        onSearchChange('');
      }
    };

    document.addEventListener('mousedown', handleMouseDown, true);
    
    return () => {
      document.removeEventListener('mousedown', handleMouseDown, true);
    };
  }, [onSearchChange]);

  const handleToggle = () => {
    if (!disabled) {
      setIsOpen(!isOpen);
      if (!isOpen) {
        setTimeout(() => {
          inputRef.current?.focus();
        }, 0);
      } else {
        onSearchChange('');
      }
    }
  };

  const handleOptionClick = (optionValue) => {
    onChange(optionValue);
    setIsOpen(false);
    onSearchChange('');
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {label && (
        <label className="block text-xs font-medium text-gray-700 mb-1">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
      )}
      
      <button
        type="button"
        onClick={handleToggle}
        onMouseDown={(e) => e.preventDefault()}
        disabled={disabled}
        className={`w-full text-left border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-violet-500 focus:border-transparent transition-all text-sm ${
          disabled 
            ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
            : 'bg-white hover:border-gray-400'
        } ${isOpen ? 'ring-1 ring-violet-500 border-violet-500' : ''}`}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {Icon && <Icon className="text-gray-400" size={16} />}
            {selectedOption ? (
              <span className="text-gray-900 font-medium truncate">{getOptionLabel(selectedOption)}</span>
            ) : (
              <span className="text-gray-500 truncate">{placeholder || `Sélectionnez...`}</span>
            )}
          </div>
          <svg className={`h-4 w-4 text-gray-400 transition-transform ${isOpen ? 'transform rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>

      {isOpen && (
        <div 
          className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-56 overflow-hidden"
        >
          <div className="p-2 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-gray-100">
            <div className="relative">
              <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
              <input
                ref={inputRef}
                type="text"
                value={searchValue}
                onChange={(e) => onSearchChange(e.target.value)}
                className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-violet-500 focus:border-transparent text-sm bg-white"
                placeholder={`Rechercher...`}
                autoFocus
              />
            </div>
            <p className="text-xs text-gray-500 mt-1 px-1">
              {filteredOptions.length} résultat(s) trouvé(s)
            </p>
          </div>
          
          <div className="max-h-44 overflow-y-auto">
            {filteredOptions.length === 0 ? (
              <div className="p-4 text-center">
                <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-2">
                  <FiSearch className="text-gray-400" />
                </div>
                <p className="text-gray-500 text-xs">Aucun résultat trouvé</p>
              </div>
            ) : (
              filteredOptions.map((option, index) => (
                <div
                  key={index}
                  className={`px-3 py-2 cursor-pointer hover:bg-violet-50 text-sm border-b border-gray-100 last:border-b-0 transition-colors ${
                    value === getOptionValue(option) ? 'bg-gradient-to-r from-violet-50 to-violet-100 text-violet-700 font-medium' : 'text-gray-700'
                  }`}
                  onClick={() => handleOptionClick(getOptionValue(option))}
                >
                  {renderOption(option)}
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {selectedOption && !isOpen && (
        <p className="text-xs text-emerald-600 mt-1 flex items-center gap-1">
          <FiCheck size={12} />
          Sélectionné: <span className="font-medium truncate">{getOptionLabel(selectedOption)}</span>
        </p>
      )}
    </div>
  );
}