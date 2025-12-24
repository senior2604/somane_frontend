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
  FiFileText,
  FiCreditCard,
  FiShoppingCart,
  FiTrendingUp,
  FiDollarSign,
  FiInfo,
  FiAlertCircle,
  FiLogIn,
  FiUsers,
  FiBriefcase,
  FiCalendar,
  FiPercent,
  FiBook,
  FiArchive,
  FiLock,
  FiUnlock,
  FiPrinter,
  FiCopy,
  FiLink,
  FiPaperclip,
  FiCheckCircle,
  FiXCircle,
  FiClock,
  FiSend,
  FiCornerUpLeft,
  FiCornerUpRight,
  FiFilter as FiFilterIcon,
  FiGrid,
  FiLayers,
  FiActivity
} from "react-icons/fi";

export default function PiecesComptablesPage() {
  // ÉTATS PRINCIPAUX - STRUCTURE COMPLÈTE
  const [pieces, setPieces] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [journaux, setJournaux] = useState([]);
  const [partenaires, setPartenaires] = useState([]);
  const [comptes, setComptes] = useState([]);
  const [taxes, setTaxes] = useState([]);
  const [devises, setDevises] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editingPiece, setEditingPiece] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showLinesModal, setShowLinesModal] = useState(false);
  const [selectedPiece, setSelectedPiece] = useState(null);
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  
  // PAGINATION ET FILTRES COMPLETS
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCompany, setFilterCompany] = useState('');
  const [filterJournal, setFilterJournal] = useState('');
  const [filterType, setFilterType] = useState('');
  const [filterState, setFilterState] = useState('');
  const [filterPartner, setFilterPartner] = useState('');
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo] = useState('');
  const [filterAmountMin, setFilterAmountMin] = useState('');
  const [filterAmountMax, setFilterAmountMax] = useState('');
  const [filterPaymentState, setFilterPaymentState] = useState('');
  
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

  // USE EFFECT INITIAL
  useEffect(() => {
    checkAuthStatus();
    fetchPublicData();
  }, []);

  // CHECK AUTH STATUS
  const checkAuthStatus = useCallback(() => {
    const isAuthenticated = authService.isAuthenticated();
    const token = authService.getToken();
    
    console.log('🔐 Statut auth pièces comptables:', {
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

  // FETCH PUBLIC DATA - TOUTES LES DONNÉES NÉCESSAIRES
  const fetchPublicData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Charger les données publiques de base
      const [piecesRes, journauxRes, comptesRes, taxesRes, devisesRes] = await Promise.all([
        apiClient.get('/compta/moves/').catch(err => {
          console.warn('⚠️ Erreur pièces:', err.message);
          return { data: [] };
        }),
        apiClient.get('/compta/journals/').catch(err => {
          console.warn('⚠️ Erreur journaux:', err.message);
          return { data: [] };
        }),
        apiClient.get('/compta/accounts/').catch(err => {
          console.warn('⚠️ Erreur comptes:', err.message);
          return { data: [] };
        }),
        apiClient.get('/compta/taxes/').catch(err => {
          console.warn('⚠️ Erreur taxes:', err.message);
          return { data: [] };
        }),
        apiClient.get('/core/devises/').catch(err => {
          console.warn('⚠️ Erreur devises:', err.message);
          return { data: [] };
        })
      ]);

      setPieces(extractData(piecesRes));
      setJournaux(extractData(journauxRes));
      setComptes(extractData(comptesRes));
      setTaxes(extractData(taxesRes));
      setDevises(extractData(devisesRes));

      // Si l'utilisateur est authentifié, charger entreprises et partenaires
      if (authService.isAuthenticated()) {
        await fetchCompaniesAndPartners();
      } else {
        setCompanies([]);
        setPartenaires([]);
        setAuthStatus(prev => ({ ...prev, hasCompaniesAccess: false }));
      }
      
      console.log('✅ Données publiques pièces chargées:', {
        pieces: extractData(piecesRes).length,
        journaux: extractData(journauxRes).length,
        comptes: extractData(comptesRes).length,
        taxes: extractData(taxesRes).length,
        devises: extractData(devisesRes).length
      });

    } catch (err) {
      console.error('❌ Erreur lors du chargement des données publiques:', err);
      setError('Erreur de connexion au serveur');
    } finally {
      setLoading(false);
    }
  }, [extractData]);

  // FETCH COMPANIES AND PARTNERS
  const fetchCompaniesAndPartners = useCallback(async () => {
    try {
      const token = authService.getToken();
      
      if (!token) {
        console.warn('🔐 Aucun token pour charger entreprises/partenaires');
        setAuthStatus(prev => ({ 
          ...prev, 
          hasCompaniesAccess: false,
          showLoginPrompt: true 
        }));
        return;
      }

      console.log('🔄 Chargement des entreprises et partenaires...');
      
      try {
        const [companiesRes, partenairesRes] = await Promise.all([
          apiClient.get('/entites/'),
          apiClient.get('/core/partenaires/').catch(() => ({ data: [] }))
        ]);
        
        const companiesData = extractData(companiesRes);
        const partenairesData = extractData(partenairesRes);
        
        setCompanies(companiesData);
        setPartenaires(partenairesData);
        
        setAuthStatus(prev => ({ 
          ...prev, 
          hasCompaniesAccess: true,
          showLoginPrompt: false 
        }));
        
        console.log(`✅ ${companiesData.length} entreprise(s), ${partenairesData.length} partenaire(s) chargé(s)`);
        
      } catch (apiError) {
        console.error('❌ Erreur API entreprises/partenaires:', apiError);
        
        if (apiError.status === 401) {
          console.log('🔐 Token probablement expiré, tentative de rafraîchissement...');
          
          try {
            await authService.refreshToken();
            console.log('✅ Token rafraîchi, nouvelle tentative...');
            
            const [retryCompanies, retryPartenaires] = await Promise.all([
              apiClient.get('/entites/'),
              apiClient.get('/core/partenaires/').catch(() => ({ data: [] }))
            ]);
            
            setCompanies(extractData(retryCompanies));
            setPartenaires(extractData(retryPartenaires));
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
          setError('Impossible de charger les données');
        }
      }
      
    } catch (err) {
      console.error('❌ Erreur générale chargement données:', err);
      setAuthStatus(prev => ({ 
        ...prev, 
        hasCompaniesAccess: false 
      }));
    }
  }, [extractData]);

  // FETCH ALL DATA
  const fetchAllData = useCallback(async () => {
    await fetchPublicData();
  }, [fetchPublicData]);

  // HANDLE LOGIN
  const handleLogin = useCallback(() => {
    window.location.href = '/login?redirect=' + encodeURIComponent(window.location.pathname);
  }, []);

  // HANDLE FORCE REFRESH
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

  // FILTERED DATA - FILTRES COMPLETS
  const filteredPieces = useMemo(() => {
    if (!Array.isArray(pieces)) return [];
    
    return pieces.filter(piece => {
      const searchTermLower = searchTerm.toLowerCase();
      const pieceName = piece.name || '';
      const pieceRef = piece.ref || '';
      const journalName = piece.journal?.name || '';
      
      // Recherche texte
      const matchesSearch = 
        searchTerm === '' ||
        pieceName.toLowerCase().includes(searchTermLower) ||
        pieceRef.toLowerCase().includes(searchTermLower) ||
        journalName.toLowerCase().includes(searchTermLower);
      
      // Filtres de base
      const matchesCompany = !filterCompany || 
        (piece.company?.id && piece.company.id.toString() === filterCompany);
      
      const matchesJournal = !filterJournal || 
        (piece.journal?.id && piece.journal.id.toString() === filterJournal);
      
      const matchesType = !filterType || piece.move_type === filterType;
      
      const matchesState = !filterState || piece.state === filterState;
      
      const matchesPartner = !filterPartner || 
        (piece.partner?.id && piece.partner.id.toString() === filterPartner);
      
      const matchesPaymentState = !filterPaymentState || 
        piece.payment_state === filterPaymentState;
      
      // Filtres avancés (dates)
      let matchesDate = true;
      if (filterDateFrom && piece.date) {
        const pieceDate = new Date(piece.date);
        const fromDate = new Date(filterDateFrom);
        matchesDate = pieceDate >= fromDate;
      }
      
      if (filterDateTo && piece.date && matchesDate) {
        const pieceDate = new Date(piece.date);
        const toDate = new Date(filterDateTo);
        toDate.setHours(23, 59, 59, 999);
        matchesDate = pieceDate <= toDate;
      }
      
      // Filtres montants
      let matchesAmount = true;
      if (filterAmountMin && piece.amount_total) {
        matchesAmount = parseFloat(piece.amount_total) >= parseFloat(filterAmountMin);
      }
      
      if (filterAmountMax && piece.amount_total && matchesAmount) {
        matchesAmount = parseFloat(piece.amount_total) <= parseFloat(filterAmountMax);
      }
      
      return matchesSearch && matchesCompany && matchesJournal && 
             matchesType && matchesState && matchesPartner && 
             matchesDate && matchesAmount && matchesPaymentState;
    });
  }, [pieces, searchTerm, filterCompany, filterJournal, filterType, 
      filterState, filterPartner, filterDateFrom, filterDateTo, 
      filterAmountMin, filterAmountMax, filterPaymentState]);

  // PAGINATION CALCULS
  const totalItems = filteredPieces.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / itemsPerPage));
  const indexOfLastItem = Math.min(currentPage * itemsPerPage, totalItems);
  const indexOfFirstItem = Math.max(0, indexOfLastItem - itemsPerPage);
  const currentPieces = filteredPieces.slice(indexOfFirstItem, indexOfLastItem);

  // PAGINATION FUNCTIONS
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

  // ROW SELECTION
  const toggleRowSelection = useCallback((id) => {
    setSelectedRows(prev => 
      prev.includes(id) 
        ? prev.filter(rowId => rowId !== id)
        : [...prev, id]
    );
  }, []);

  const selectAllRows = useCallback(() => {
    if (selectedRows.length === currentPieces.length && currentPieces.length > 0) {
      setSelectedRows([]);
    } else {
      setSelectedRows(currentPieces.map(piece => piece.id).filter(id => id != null));
    }
  }, [currentPieces, selectedRows.length]);

  // ACTIONS - COMPLÈTES
  const handleNewPiece = useCallback((type = 'entry') => {
    if (!authStatus.hasCompaniesAccess && companies.length === 0) {
      setAuthStatus(prev => ({ ...prev, showLoginPrompt: true }));
      return;
    }
    
    setEditingPiece({ move_type: type });
    setShowForm(true);
  }, [authStatus.hasCompaniesAccess, companies.length]);

  const handleEdit = useCallback((piece) => {
    setEditingPiece(piece);
    setShowForm(true);
  }, []);

  const handleDelete = useCallback(async (piece) => {
    if (!piece || !piece.id) return;
    
    if (window.confirm(`Êtes-vous sûr de vouloir supprimer la pièce "${piece.name || 'sans nom'}" ? Cette action est irréversible.`)) {
      try {
        await apiClient.delete(`/compta/moves/${piece.id}/`);
        fetchAllData();
      } catch (err) {
        console.error('Error deleting piece:', err);
        setError('Erreur lors de la suppression de la pièce');
      }
    }
  }, [fetchAllData]);

  const handleViewDetails = useCallback((piece) => {
    if (!piece) return;
    setSelectedPiece(piece);
    setShowDetailModal(true);
  }, []);

  const handleViewLines = useCallback((piece) => {
    if (!piece) return;
    setSelectedPiece(piece);
    setShowLinesModal(true);
  }, []);

  const handleValidate = useCallback(async (piece) => {
    try {
      await apiClient.patch(`/compta/moves/${piece.id}/`, {
        state: 'posted'
      });
      fetchAllData();
    } catch (err) {
      console.error('Error validating piece:', err);
      setError('Erreur lors de la validation');
    }
  }, [fetchAllData]);

  const handleCancel = useCallback(async (piece) => {
    try {
      await apiClient.patch(`/compta/moves/${piece.id}/`, {
        state: 'cancel'
      });
      fetchAllData();
    } catch (err) {
      console.error('Error cancelling piece:', err);
      setError('Erreur lors de l\'annulation');
    }
  }, [fetchAllData]);

  const handleDuplicate = useCallback(async (piece) => {
    try {
      const { id, name, ...pieceData } = piece;
      pieceData.name = `${name} (Copie)`;
      
      await apiClient.post('/compta/moves/', pieceData);
      fetchAllData();
    } catch (err) {
      console.error('Error duplicating piece:', err);
      setError('Erreur lors de la duplication');
    }
  }, [fetchAllData]);

  const handlePrint = useCallback((piece) => {
    console.log('Impression de la pièce:', piece);
    // Implémenter l'impression/PDF
  }, []);

  const handleFormSuccess = useCallback(() => {
    setShowForm(false);
    setEditingPiece(null);
    fetchAllData();
  }, [fetchAllData]);

  const handleRetry = useCallback(() => {
    fetchAllData();
  }, [fetchAllData]);

  const resetFilters = useCallback(() => {
    setSearchTerm('');
    setFilterCompany('');
    setFilterJournal('');
    setFilterType('');
    setFilterState('');
    setFilterPartner('');
    setFilterDateFrom('');
    setFilterDateTo('');
    setFilterAmountMin('');
    setFilterAmountMax('');
    setFilterPaymentState('');
    setCurrentPage(1);
  }, []);

  // STATISTIQUES SIMPLIFIÉES - SEULEMENT LES 3 CARTES DEMANDÉES
  const stats = useMemo(() => {
    return {
      total: pieces.length,
      posted: pieces.filter(p => p.state === 'posted').length,
      canceled: pieces.filter(p => p.state === 'cancel').length
    };
  }, [pieces]);

  // LOADING COMPONENT
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
        handleNewPiece={handleNewPiece}
        handleLogin={handleLogin}
        stats={stats}
        filterCompany={filterCompany}
        setFilterCompany={setFilterCompany}
        filterJournal={filterJournal}
        setFilterJournal={setFilterJournal}
        filterType={filterType}
        setFilterType={setFilterType}
        filterState={filterState}
        setFilterState={setFilterState}
        filterPartner={filterPartner}
        setFilterPartner={setFilterPartner}
        filterDateFrom={filterDateFrom}
        setFilterDateFrom={setFilterDateFrom}
        filterDateTo={filterDateTo}
        setFilterDateTo={setFilterDateTo}
        filterAmountMin={filterAmountMin}
        setFilterAmountMin={setFilterAmountMin}
        filterAmountMax={filterAmountMax}
        setFilterAmountMax={setFilterAmountMax}
        filterPaymentState={filterPaymentState}
        setFilterPaymentState={setFilterPaymentState}
        setCurrentPage={setCurrentPage}
        resetFilters={resetFilters}
        showAdvancedFilters={showAdvancedFilters}
        setShowAdvancedFilters={setShowAdvancedFilters}
        selectedRows={selectedRows}
        authStatus={authStatus}
        companiesCount={companies.length}
        companies={companies}
        journaux={journaux}
        partenaires={partenaires}
      />

      {/* Message d'erreur */}
      {error && <ErrorMessage error={error} handleRetry={handleRetry} />}

      {/* Message d'avertissement pour les entreprises */}
      {!authStatus.hasCompaniesAccess && companies.length === 0 && pieces.length > 0 && (
        <CompaniesWarning onLogin={handleLogin} />
      )}

      {/* Tableau principal */}
      <MainTable 
        currentPieces={currentPieces}
        pieces={pieces}
        selectedRows={selectedRows}
        selectAllRows={selectAllRows}
        toggleRowSelection={toggleRowSelection}
        handleViewDetails={handleViewDetails}
        handleViewLines={handleViewLines}
        handleValidate={handleValidate}
        handleCancel={handleCancel}
        handleDuplicate={handleDuplicate}
        handlePrint={handlePrint}
        handleEdit={handleEdit}
        handleDelete={handleDelete}
        handleNewPiece={handleNewPiece}
        itemsPerPage={itemsPerPage}
        setItemsPerPage={setItemsPerPage}
        setCurrentPage={setCurrentPage}
      />

      {/* Pagination */}
      {currentPieces.length > 0 && (
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
        <PieceFormModal
          piece={editingPiece}
          companies={companies}
          journaux={journaux}
          partenaires={partenaires}
          comptes={comptes}
          taxes={taxes}
          devises={devises}
          authStatus={authStatus}
          onClose={() => {
            setShowForm(false);
            setEditingPiece(null);
          }}
          onSuccess={handleFormSuccess}
          onLogin={handleLogin}
        />
      )}

      {showDetailModal && selectedPiece && (
        <PieceDetailModal
          piece={selectedPiece}
          onClose={() => {
            setShowDetailModal(false);
            setSelectedPiece(null);
          }}
        />
      )}

      {showLinesModal && selectedPiece && (
        <PieceLinesModal
          piece={selectedPiece}
          onClose={() => {
            setShowLinesModal(false);
            setSelectedPiece(null);
          }}
        />
      )}
    </div>
  );
}

// COMPOSANTS AUXILIAIRES

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
          <p className="text-gray-500 text-sm mt-4">Chargement des pièces comptables...</p>
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
              Vous pouvez toujours créer des pièces avec une entreprise manuelle
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
  handleNewPiece, 
  handleLogin,
  stats, 
  filterCompany, 
  setFilterCompany,
  filterJournal,
  setFilterJournal,
  filterType,
  setFilterType,
  filterState,
  setFilterState,
  filterPartner,
  setFilterPartner,
  filterDateFrom,
  setFilterDateFrom,
  filterDateTo,
  setFilterDateTo,
  filterAmountMin,
  setFilterAmountMin,
  filterAmountMax,
  setFilterAmountMax,
  filterPaymentState,
  setFilterPaymentState,
  setCurrentPage,
  resetFilters,
  showAdvancedFilters,
  setShowAdvancedFilters,
  selectedRows,
  authStatus,
  companiesCount,
  companies,
  journaux,
  partenaires
}) {
  const pieceTypes = [
    { value: '', label: 'Tous types' },
    { value: 'entry', label: 'Écriture' },
    { value: 'out_invoice', label: 'Facture client' },
    { value: 'out_refund', label: 'Avoir client' },
    { value: 'in_invoice', label: 'Facture fournisseur' },
    { value: 'in_refund', label: 'Avoir fournisseur' },
    { value: 'out_receipt', label: 'Règlement client' },
    { value: 'in_receipt', label: 'Règlement fournisseur' }
  ];

  const pieceStates = [
    { value: '', label: 'Tous états' },
    { value: 'draft', label: 'Brouillon' },
    { value: 'posted', label: 'Validé' },
    { value: 'cancel', label: 'Annulé' }
  ];

  const paymentStates = [
    { value: '', label: 'Tous paiements' },
    { value: 'not_paid', label: 'Non payé' },
    { value: 'partial', label: 'Partiel' },
    { value: 'paid', label: 'Payé' }
  ];

  return (
    <div className="mb-6">
      {/* Barre de recherche et boutons */}
      <div className="flex items-center justify-center gap-3 mb-4">
        <div className="relative flex items-center">
          <div className="relative flex-1">
            <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 pr-24 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-violet-500 focus:border-transparent text-sm w-80"
              placeholder="Rechercher une pièce..."
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
                onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                className="flex items-center gap-1 px-2 py-1.5 rounded text-xs font-medium bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors"
              >
                <FiFilterIcon size={12} />
                <span>Filtres {showAdvancedFilters ? '▼' : '▶'}</span>
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
          
          <div className="ml-2 relative">
            <button 
              onClick={() => handleNewPiece('entry')}
              disabled={!authStatus.hasCompaniesAccess && companiesCount === 0}
              className={`px-3 py-2 rounded-lg transition-all duration-300 flex items-center gap-1.5 text-sm shadow ${
                (!authStatus.hasCompaniesAccess && companiesCount === 0)
                  ? 'bg-gradient-to-r from-gray-400 to-gray-300 text-gray-100 cursor-not-allowed'
                  : 'bg-gradient-to-r from-violet-600 to-violet-500 text-white hover:from-violet-700 hover:to-violet-600'
              }`}
            >
              <FiPlus size={14} />
              <span>Nouvelle pièce</span>
            </button>
            
            {/* Menu déroulant pour les types de pièces */}
            <div className="absolute left-0 mt-1 w-48 bg-white rounded-lg shadow-lg border border-gray-200 z-50 hidden group-hover:block">
              <button 
                onClick={() => handleNewPiece('entry')}
                className="w-full text-left px-3 py-2 hover:bg-violet-50 text-gray-700 rounded-t-lg text-sm"
              >
                <div className="flex items-center gap-2">
                  <FiFileText size={14} />
                  <span>Écriture comptable</span>
                </div>
              </button>
              <button 
                onClick={() => handleNewPiece('out_invoice')}
                className="w-full text-left px-3 py-2 hover:bg-green-50 text-gray-700 text-sm"
              >
                <div className="flex items-center gap-2">
                  <FiShoppingCart size={14} />
                  <span>Facture client</span>
                </div>
              </button>
              <button 
                onClick={() => handleNewPiece('in_invoice')}
                className="w-full text-left px-3 py-2 hover:bg-amber-50 text-gray-700 text-sm"
              >
                <div className="flex items-center gap-2">
                  <FiTrendingUp size={14} />
                  <span>Facture fournisseur</span>
                </div>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Statistiques - SEULEMENT LES 3 CARTES DEMANDÉES */}
      <div className="grid grid-cols-3 gap-2 mb-3">
        <StatCard 
          label="Total pièces" 
          value={stats.total} 
          color="violet" 
          icon={FiFileText} 
        />
        <StatCard 
          label="Validées" 
          value={stats.posted} 
          color="green" 
          icon={FiCheckCircle} 
        />
        <StatCard 
          label="Annulées" 
          value={stats.canceled} 
          color="red" 
          icon={FiXCircle} 
        />
      </div>

      {/* Filtres rapides */}
      <div className="flex items-center gap-2 mb-3 flex-wrap">
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
          value={filterJournal}
          onChange={(e) => {
            setCurrentPage(1);
            setFilterJournal(e.target.value);
          }}
          className="px-3 py-1.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-violet-500 text-sm bg-white"
        >
          <option value="">Tous journaux</option>
          {journaux.map(j => (
            <option key={j.id} value={j.id}>
              {j.code} - {j.name}
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
          {pieceTypes.map(t => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </select>

        <select
          value={filterState}
          onChange={(e) => {
            setCurrentPage(1);
            setFilterState(e.target.value);
          }}
          className="px-3 py-1.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-violet-500 text-sm bg-white"
        >
          {pieceStates.map(s => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>

        <button
          onClick={resetFilters}
          className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg flex items-center gap-1 border border-gray-300"
        >
          <FiX size={12} />
          Réinitialiser
        </button>
      </div>

      {/* Filtres avancés */}
      {showAdvancedFilters && (
        <div className="bg-gradient-to-br from-gray-50 to-white rounded-lg p-3 border border-gray-200 mb-3">
          <div className="flex items-center gap-2 mb-2">
            <FiFilter className="text-violet-600" size={14} />
            <h3 className="text-sm font-semibold text-gray-900">Filtres avancés</h3>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            {/* Partenaire */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Partenaire
              </label>
              <select
                value={filterPartner}
                onChange={(e) => {
                  setCurrentPage(1);
                  setFilterPartner(e.target.value);
                }}
                className="w-full px-3 py-1.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-violet-500 text-sm bg-white"
              >
                <option value="">Tous partenaires</option>
                {partenaires.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.nom} ({p.type_partenaire})
                  </option>
                ))}
              </select>
            </div>

            {/* Dates */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Du
              </label>
              <input
                type="date"
                value={filterDateFrom}
                onChange={(e) => {
                  setCurrentPage(1);
                  setFilterDateFrom(e.target.value);
                }}
                className="w-full px-3 py-1.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-violet-500 text-sm bg-white"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Au
              </label>
              <input
                type="date"
                value={filterDateTo}
                onChange={(e) => {
                  setCurrentPage(1);
                  setFilterDateTo(e.target.value);
                }}
                className="w-full px-3 py-1.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-violet-500 text-sm bg-white"
              />
            </div>

            {/* État de paiement */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                État paiement
              </label>
              <select
                value={filterPaymentState}
                onChange={(e) => {
                  setCurrentPage(1);
                  setFilterPaymentState(e.target.value);
                }}
                className="w-full px-3 py-1.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-violet-500 text-sm bg-white"
              >
                {paymentStates.map(s => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Montants */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Montant min
              </label>
              <input
                type="number"
                step="0.01"
                value={filterAmountMin}
                onChange={(e) => {
                  setCurrentPage(1);
                  setFilterAmountMin(e.target.value);
                }}
                className="w-full px-3 py-1.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-violet-500 text-sm bg-white"
                placeholder="0.00"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Montant max
              </label>
              <input
                type="number"
                step="0.01"
                value={filterAmountMax}
                onChange={(e) => {
                  setCurrentPage(1);
                  setFilterAmountMax(e.target.value);
                }}
                className="w-full px-3 py-1.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-violet-500 text-sm bg-white"
                placeholder="999999.99"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value, color, icon: Icon, sublabel, isAmount = false }) {
  const colorClasses = {
    violet: { bg: 'bg-violet-50', text: 'text-violet-600', iconBg: 'bg-violet-100' },
    green: { bg: 'bg-green-50', text: 'text-green-600', iconBg: 'bg-green-100' },
    amber: { bg: 'bg-amber-50', text: 'text-amber-600', iconBg: 'bg-amber-100' },
    blue: { bg: 'bg-blue-50', text: 'text-blue-600', iconBg: 'bg-blue-100' },
    cyan: { bg: 'bg-cyan-50', text: 'text-cyan-600', iconBg: 'bg-cyan-100' },
    red: { bg: 'bg-red-50', text: 'text-red-600', iconBg: 'bg-red-100' },
    orange: { bg: 'bg-orange-50', text: 'text-orange-600', iconBg: 'bg-orange-100' },
    emerald: { bg: 'bg-emerald-50', text: 'text-emerald-600', iconBg: 'bg-emerald-100' },
    indigo: { bg: 'bg-indigo-50', text: 'text-indigo-600', iconBg: 'bg-indigo-100' }
  };

  const colors = colorClasses[color] || colorClasses.violet;

  return (
    <div className="bg-white rounded-lg p-1.5 border border-gray-200 shadow-sm h-14 flex items-center">
      <div className="flex items-center gap-2 w-full">
        <div className={`p-1.5 ${colors.iconBg} rounded`}>
          <Icon className={`w-3.5 h-3.5 ${colors.text}`} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline justify-between">
            <span className="text-[10px] text-gray-600 truncate">{label}</span>
            <span className={`text-sm font-bold ${colors.text} ml-1 ${isAmount ? 'font-mono' : ''}`}>
              {value}
            </span>
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
  currentPieces, 
  pieces, 
  selectedRows, 
  selectAllRows, 
  toggleRowSelection, 
  handleViewDetails, 
  handleViewLines,
  handleValidate,
  handleCancel,
  handleDuplicate,
  handlePrint,
  handleEdit, 
  handleDelete, 
  handleNewPiece,
  itemsPerPage,
  setItemsPerPage,
  setCurrentPage
}) {
  const getTypeBadge = (type) => {
    const typeMap = {
      'entry': { bg: 'from-gray-50 to-gray-100', text: 'text-gray-800', icon: FiFileText, label: 'Écriture' },
      'out_invoice': { bg: 'from-green-50 to-green-100', text: 'text-green-800', icon: FiShoppingCart, label: 'Facture' },
      'out_refund': { bg: 'from-blue-50 to-blue-100', text: 'text-blue-800', icon: FiCornerUpLeft, label: 'Avoir' },
      'in_invoice': { bg: 'from-amber-50 to-amber-100', text: 'text-amber-800', icon: FiTrendingUp, label: 'Facture' },
      'in_refund': { bg: 'from-cyan-50 to-cyan-100', text: 'text-cyan-800', icon: FiCornerUpRight, label: 'Avoir' },
      'out_receipt': { bg: 'from-violet-50 to-violet-100', text: 'text-violet-800', icon: FiDollarSign, label: 'Règlement' },
      'in_receipt': { bg: 'from-purple-50 to-purple-100', text: 'text-purple-800', icon: FiCreditCard, label: 'Règlement' }
    };
    
    return typeMap[type] || { 
      bg: 'from-gray-50 to-gray-100', 
      text: 'text-gray-800', 
      icon: FiFileText, 
      label: 'Autre' 
    };
  };

  const getStateBadge = (state) => {
    const stateMap = {
      'draft': { bg: 'from-amber-50 to-amber-100', text: 'text-amber-800', icon: FiClock, label: 'Brouillon' },
      'posted': { bg: 'from-green-50 to-green-100', text: 'text-green-800', icon: FiCheckCircle, label: 'Validé' },
      'cancel': { bg: 'from-red-50 to-red-100', text: 'text-red-800', icon: FiXCircle, label: 'Annulé' }
    };
    
    return stateMap[state] || { 
      bg: 'from-gray-50 to-gray-100', 
      text: 'text-gray-800', 
      icon: FiInfo, 
      label: 'Inconnu' 
    };
  };

  const getPaymentBadge = (paymentState) => {
    const paymentMap = {
      'not_paid': { bg: 'from-red-50 to-red-100', text: 'text-red-800', label: 'Non payé' },
      'partial': { bg: 'from-orange-50 to-orange-100', text: 'text-orange-800', label: 'Partiel' },
      'paid': { bg: 'from-green-50 to-green-100', text: 'text-green-800', label: 'Payé' }
    };
    
    return paymentMap[paymentState] || { 
      bg: 'from-gray-50 to-gray-100', 
      text: 'text-gray-800', 
      label: 'N/A' 
    };
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
      {/* En-tête du tableau */}
      <div className="px-3 py-2 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5">
              <input
                type="checkbox"
                checked={selectedRows.length === currentPieces.length && currentPieces.length > 0}
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

      {/* Tableau */}
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead>
            <tr className="bg-gradient-to-r from-gray-50 to-gray-100">
              <th scope="col" className="px-3 py-2 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider border-r border-gray-300">
                <div className="flex items-center gap-1">
                  <input
                    type="checkbox"
                    checked={selectedRows.length === currentPieces.length && currentPieces.length > 0}
                    onChange={selectAllRows}
                    className="w-3 h-3 text-violet-600 rounded focus:ring-violet-500 border-gray-300"
                  />
                  Pièce
                </div>
              </th>
              <th scope="col" className="px-3 py-2 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider border-r border-gray-300">
                Date
              </th>
              <th scope="col" className="px-3 py-2 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider border-r border-gray-300">
                Journal
              </th>
              <th scope="col" className="px-3 py-2 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider border-r border-gray-300">
                Partenaire
              </th>
              <th scope="col" className="px-3 py-2 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider border-r border-gray-300">
                Montant
              </th>
              <th scope="col" className="px-3 py-2 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider border-r border-gray-300">
                État
              </th>
              <th scope="col" className="px-3 py-2 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          
          <tbody className="divide-y divide-gray-200">
            {currentPieces.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-3 py-4 text-center">
                  <EmptyState 
                    hasData={pieces.length > 0} 
                    onNewPiece={handleNewPiece} 
                  />
                </td>
              </tr>
            ) : (
              currentPieces.map((piece) => {
                const typeBadge = getTypeBadge(piece.move_type);
                const stateBadge = getStateBadge(piece.state);
                const paymentBadge = getPaymentBadge(piece.payment_state);
                const TypeIcon = typeBadge.icon;
                const StateIcon = stateBadge.icon;

                return (
                  <PieceRow 
                    key={piece.id}
                    piece={piece}
                    typeBadge={typeBadge}
                    stateBadge={stateBadge}
                    paymentBadge={paymentBadge}
                    TypeIcon={TypeIcon}
                    StateIcon={StateIcon}
                    isSelected={selectedRows.includes(piece.id)}
                    onToggleSelect={() => toggleRowSelection(piece.id)}
                    onViewDetails={() => handleViewDetails(piece)}
                    onViewLines={() => handleViewLines(piece)}
                    onValidate={() => handleValidate(piece)}
                    onCancel={() => handleCancel(piece)}
                    onDuplicate={() => handleDuplicate(piece)}
                    onPrint={() => handlePrint(piece)}
                    onEdit={() => handleEdit(piece)}
                    onDelete={() => handleDelete(piece)}
                  />
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function EmptyState({ hasData, onNewPiece }) {
  return (
    <div className="flex flex-col items-center justify-center">
      <div className="w-12 h-12 bg-gradient-to-br from-gray-100 to-gray-200 rounded-full flex items-center justify-center mb-2">
        <FiFileText className="w-6 h-6 text-gray-400" />
      </div>
      <h3 className="text-sm font-semibold text-gray-900 mb-1">
        {hasData ? 'Aucun résultat' : 'Aucune pièce comptable trouvée'}
      </h3>
      <p className="text-gray-600 text-xs mb-3 max-w-md">
        {hasData 
          ? 'Essayez de modifier vos critères de recherche'
          : 'Commencez par créer votre première pièce comptable'
        }
      </p>
      {!hasData && (
        <button 
          onClick={() => onNewPiece('entry')}
          className="px-3 py-1 bg-gradient-to-r from-violet-600 to-violet-500 text-white rounded hover:from-violet-700 hover:to-violet-600 transition-all duration-300 font-medium flex items-center gap-1 text-xs"
        >
          <FiPlus size={12} />
          Créer pièce
        </button>
      )}
    </div>
  );
}

function PieceRow({ 
  piece, 
  typeBadge, 
  stateBadge, 
  paymentBadge, 
  TypeIcon, 
  StateIcon,
  isSelected, 
  onToggleSelect, 
  onViewDetails, 
  onViewLines,
  onValidate,
  onCancel,
  onDuplicate,
  onPrint,
  onEdit, 
  onDelete 
}) {
  const formattedDate = piece.date ? new Date(piece.date).toLocaleDateString('fr-FR') : '-';
  const amount = parseFloat(piece.amount_total || 0).toFixed(2);

  return (
    <tr className={`hover:bg-gradient-to-r hover:from-gray-50 hover:to-white transition-all duration-200 ${
      isSelected ? 'bg-gradient-to-r from-violet-50 to-violet-25' : 'bg-white'
    }`}>
      {/* Pièce avec checkbox */}
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
              <span className={`inline-flex items-center px-1.5 py-0.5 ${typeBadge.bg} ${typeBadge.text} rounded text-xs font-medium`}>
                <TypeIcon className="w-2.5 h-2.5 mr-0.5" />
                {typeBadge.label}
              </span>
              <div className="text-xs font-semibold text-gray-900 truncate max-w-[120px]">
                {piece.name}
              </div>
            </div>
            {piece.ref && (
              <div className="text-xs text-gray-500 truncate max-w-[150px] mt-0.5">
                Réf: {piece.ref}
              </div>
            )}
          </div>
        </div>
      </td>
      
      {/* Date */}
      <td className="px-3 py-2 border-r border-gray-200">
        <div className="text-xs text-gray-900 font-medium">
          {formattedDate}
        </div>
      </td>
      
      {/* Journal */}
      <td className="px-3 py-2 border-r border-gray-200">
        <div className="text-xs text-gray-900 truncate max-w-[100px]">
          {piece.journal?.code} - {piece.journal?.name}
        </div>
      </td>
      
      {/* Partenaire */}
      <td className="px-3 py-2 border-r border-gray-200">
        <div className="text-xs text-gray-900 truncate max-w-[120px]">
          {piece.partner?.nom || piece.partner?.raison_sociale || '-'}
        </div>
      </td>
      
      {/* Montant */}
      <td className="px-3 py-2 border-r border-gray-200">
        <div className="text-xs font-mono font-semibold text-gray-900">
          {amount} €
        </div>
        {piece.payment_state && piece.payment_state !== 'paid' && (
          <span className={`inline-flex items-center px-1.5 py-0.5 ${paymentBadge.bg} ${paymentBadge.text} rounded-full text-[10px] font-medium mt-0.5`}>
            {paymentBadge.label}
          </span>
        )}
      </td>
      
      {/* État */}
      <td className="px-3 py-2 border-r border-gray-200">
        <div className="flex flex-col gap-1">
          <span className={`inline-flex items-center px-2 py-0.5 ${stateBadge.bg} ${stateBadge.text} rounded-full text-xs font-medium`}>
            <StateIcon className="w-2.5 h-2.5 mr-1" />
            {stateBadge.label}
          </span>
        </div>
      </td>
      
      {/* Actions */}
      <td className="px-3 py-2 whitespace-nowrap">
        <div className="flex items-center gap-1">
          <ActionButton 
            onClick={onViewLines}
            color="gray"
            icon={FiLayers}
            title="Voir lignes"
          />
          <ActionButton 
            onClick={onViewDetails}
            color="gray"
            icon={FiEye}
            title="Voir détails"
          />
          {piece.state === 'draft' && (
            <ActionButton 
              onClick={onValidate}
              color="green"
              icon={FiCheck}
              title="Valider"
            />
          )}
          {piece.state === 'posted' && (
            <ActionButton 
              onClick={onCancel}
              color="red"
              icon={FiX}
              title="Annuler"
            />
          )}
          <ActionButton 
            onClick={onPrint}
            color="blue"
            icon={FiPrinter}
            title="Imprimer"
          />
          <ActionButton 
            onClick={onDuplicate}
            color="purple"
            icon={FiCopy}
            title="Dupliquer"
          />
          {piece.state === 'draft' && (
            <ActionButton 
              onClick={onEdit}
              color="violet"
              icon={FiEdit2}
              title="Modifier"
            />
          )}
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

function ActionButton({ onClick, color, icon: Icon, title }) {
  const colorClasses = {
    gray: 'from-gray-50 to-gray-100 text-gray-700 hover:from-gray-100 hover:to-gray-200',
    violet: 'from-violet-50 to-violet-100 text-violet-700 hover:from-violet-100 hover:to-violet-200',
    red: 'from-red-50 to-red-100 text-red-700 hover:from-red-100 hover:to-red-200',
    green: 'from-green-50 to-green-100 text-green-700 hover:from-green-100 hover:to-green-200',
    blue: 'from-blue-50 to-blue-100 text-blue-700 hover:from-blue-100 hover:to-blue-200',
    purple: 'from-purple-50 to-purple-100 text-purple-700 hover:from-purple-100 hover:to-purple-200',
    amber: 'from-amber-50 to-amber-100 text-amber-700 hover:from-amber-100 hover:to-amber-200'
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
              {indexOfFirstItem + 1}-{Math.min(indexOfLastItem, totalItems)} sur {totalItems} pièces
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
function PieceDetailModal({ piece, onClose }) {
  const getPieceColor = (type) => {
    const colorMap = {
      'entry': 'from-gray-600 to-gray-500',
      'out_invoice': 'from-green-600 to-green-500',
      'out_refund': 'from-blue-600 to-blue-500',
      'in_invoice': 'from-amber-600 to-amber-500',
      'in_refund': 'from-cyan-600 to-cyan-500',
      'out_receipt': 'from-violet-600 to-violet-500',
      'in_receipt': 'from-purple-600 to-purple-500'
    };
    return colorMap[type] || 'from-violet-600 to-violet-500';
  };

  const getTypeLabel = (type) => {
    const typeMap = {
      'entry': 'Écriture comptable',
      'out_invoice': 'Facture client',
      'out_refund': 'Avoir client',
      'in_invoice': 'Facture fournisseur',
      'in_refund': 'Avoir fournisseur',
      'out_receipt': 'Règlement client',
      'in_receipt': 'Règlement fournisseur'
    };
    return typeMap[type] || 'Pièce comptable';
  };

  const getStateLabel = (state) => {
    const stateMap = {
      'draft': 'Brouillon',
      'posted': 'Validé',
      'cancel': 'Annulé'
    };
    return stateMap[state] || 'Inconnu';
  };

  const getPaymentLabel = (paymentState) => {
    const paymentMap = {
      'not_paid': 'Non payé',
      'partial': 'Partiellement payé',
      'paid': 'Payé'
    };
    return paymentMap[paymentState] || 'Non spécifié';
  };

  const formattedDate = piece.date ? new Date(piece.date).toLocaleDateString('fr-FR', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  }) : 'Non spécifiée';

  const invoiceDate = piece.invoice_date ? new Date(piece.invoice_date).toLocaleDateString('fr-FR') : 'Non spécifiée';

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-3 z-50 backdrop-blur-sm">
      <div className="bg-white rounded-lg w-full max-w-5xl max-h-[90vh] overflow-y-auto shadow-xl">
        {/* Header */}
        <div className={`sticky top-0 bg-gradient-to-r ${getPieceColor(piece.move_type)} text-white rounded-t-lg p-3`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-white/20 backdrop-blur-sm rounded">
                <FiFileText className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-base font-bold">Détails de la Pièce Comptable</h2>
                <p className="text-white/90 text-xs mt-0.5">{piece.name} - {getTypeLabel(piece.move_type)}</p>
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
              <FiFileText className="w-16 h-16 text-violet-600" />
            </div>
            <div className="flex-1 text-center md:text-left">
              <h1 className="text-xl font-bold text-gray-900">{piece.name}</h1>
              <div className="flex flex-wrap gap-2 mt-3 justify-center md:justify-start">
                <span className="inline-flex items-center px-3 py-1 bg-gradient-to-r from-gray-800 to-gray-700 text-white rounded-full text-xs font-medium">
                  {piece.ref || 'Sans référence'}
                </span>
                <span className={`inline-flex items-center px-3 py-1 bg-gradient-to-r ${getPieceColor(piece.move_type)} text-white rounded-full text-xs font-medium`}>
                  {getTypeLabel(piece.move_type)}
                </span>
                <span className={`inline-flex items-center px-3 py-1 ${
                  piece.state === 'posted' ? 'bg-gradient-to-r from-green-600 to-green-500' :
                  piece.state === 'draft' ? 'bg-gradient-to-r from-amber-600 to-amber-500' :
                  'bg-gradient-to-r from-red-600 to-red-500'
                } text-white rounded-full text-xs font-medium`}>
                  {getStateLabel(piece.state)}
                </span>
                {piece.payment_state && piece.payment_state !== 'paid' && (
                  <span className={`inline-flex items-center px-3 py-1 ${
                    piece.payment_state === 'not_paid' ? 'bg-gradient-to-r from-red-50 to-red-100 text-red-700' :
                    'bg-gradient-to-r from-amber-50 to-amber-100 text-amber-700'
                  } rounded-full text-xs font-medium border border-gray-200`}>
                    {getPaymentLabel(piece.payment_state)}
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
              { label: 'Identifiant', value: `#${piece.id}`, isCode: true },
              { label: 'Numéro', value: piece.name, isBold: true },
              { label: 'Référence', value: piece.ref || 'Aucune référence' },
              { label: 'Date', value: formattedDate },
              { label: 'Date de facture', value: invoiceDate }
            ]}
          />

          {/* Montants */}
          <InfoSection 
            title="Montants"
            color="green"
            items={[
              { 
                label: 'Montant HT', 
                value: `${parseFloat(piece.amount_untaxed || 0).toFixed(2)} €`,
                isAmount: true 
              },
              { 
                label: 'Montant TVA', 
                value: `${parseFloat(piece.amount_tax || 0).toFixed(2)} €`,
                isAmount: true 
              },
              { 
                label: 'Montant TTC', 
                value: `${parseFloat(piece.amount_total || 0).toFixed(2)} €`,
                isAmount: true,
                isBold: true 
              }
            ]}
          />

          {/* Journal et Entreprise */}
          <InfoSection 
            title="Journal et Entreprise"
            color="blue"
            items={[
              { 
                label: 'Journal', 
                value: piece.journal ? (
                  <div>
                    <div className="font-medium">{piece.journal.name}</div>
                    <div className="text-sm text-gray-600">
                      Code: {piece.journal.code}
                    </div>
                  </div>
                ) : 'Non spécifié'
              },
              { 
                label: 'Entreprise', 
                value: piece.company ? (
                  <div>
                    <div className="font-medium">{piece.company.raison_sociale || piece.company.nom}</div>
                  </div>
                ) : 'Toutes les entreprises'
              }
            ]}
          />

          {/* Partenaire */}
          {piece.partner && (
            <InfoSection 
              title="Partenaire"
              color="amber"
              items={[
                { 
                  label: 'Partenaire', 
                  value: (
                    <div>
                      <div className="font-medium">{piece.partner.nom || piece.partner.raison_sociale}</div>
                      <div className="text-sm text-gray-600">
                        {piece.partner.type_partenaire} • {piece.partner.email || piece.partner.telephone || ''}
                      </div>
                    </div>
                  )
                }
              ]}
            />
          )}

          {/* Devise */}
          {piece.currency && (
            <InfoSection 
              title="Devise"
              color="cyan"
              items={[
                { 
                  label: 'Devise', 
                  value: `${piece.currency.code} - ${piece.currency.nom}`
                }
              ]}
            />
          )}
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

// MODAL DES LIGNES
function PieceLinesModal({ piece, onClose }) {
  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-3 z-50 backdrop-blur-sm">
      <div className="bg-white rounded-lg w-full max-w-6xl max-h-[90vh] overflow-y-auto shadow-xl">
        <div className="sticky top-0 bg-gradient-to-r from-blue-600 to-blue-500 text-white rounded-t-lg p-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-white/20 backdrop-blur-sm rounded">
                <FiLayers className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-base font-bold">Lignes de la pièce</h2>
                <p className="text-white/90 text-xs mt-0.5">{piece.name}</p>
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
            Détail des écritures comptables de cette pièce
          </p>
          {/* À implémenter avec les lignes réelles */}
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
    amber: 'from-amber-600 to-amber-400',
    cyan: 'from-cyan-600 to-cyan-400'
  };

  const borderColors = {
    violet: 'border-violet-200',
    green: 'border-green-200',
    blue: 'border-blue-200',
    amber: 'border-amber-200',
    cyan: 'border-cyan-200'
  };

  const bgColors = {
    violet: 'from-violet-50 to-white',
    green: 'from-green-50 to-white',
    blue: 'from-blue-50 to-white',
    amber: 'from-amber-50 to-white',
    cyan: 'from-cyan-50 to-white'
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
              <p className={`text-sm ${item.isBold ? 'font-bold' : ''} ${item.isCode ? 'text-gray-900 font-mono font-medium' : 'text-gray-900'} ${item.isAmount ? 'font-mono' : ''}`}>
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

// MODAL DE FORMULAIRE (version simplifiée pour l'exemple)
function PieceFormModal({ piece, companies, journaux, partenaires, comptes, taxes, devises, authStatus, onClose, onSuccess, onLogin }) {
  const [formData, setFormData] = useState({
    name: piece?.name || '',
    move_type: piece?.move_type || 'entry',
    state: piece?.state || 'draft',
    journal: piece?.journal?.id || piece?.journal || '',
    date: piece?.date || new Date().toISOString().split('T')[0],
    ref: piece?.ref || '',
    partner: piece?.partner?.id || piece?.partner || '',
    company: piece?.company?.id || piece?.company || '',
    currency: piece?.currency?.id || piece?.currency || '',
    invoice_date: piece?.invoice_date || '',
    amount_untaxed: piece?.amount_untaxed || 0,
    amount_tax: piece?.amount_tax || 0,
    amount_total: piece?.amount_total || 0,
    payment_state: piece?.payment_state || 'not_paid'
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    // Validation
    if (!formData.name.trim()) {
      setError('Le nom de la pièce est obligatoire');
      setLoading(false);
      return;
    }

    if (!formData.journal) {
      setError('Le journal est obligatoire');
      setLoading(false);
      return;
    }

    try {
      const url = piece ? `/compta/moves/${piece.id}/` : `/compta/moves/`;
      const method = piece ? 'PUT' : 'POST';

      const response = await apiClient.request(url, {
        method: method,
        body: JSON.stringify(formData),
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      console.log('✅ Pièce sauvegardée:', response);
      onSuccess();
    } catch (err) {
      console.error('❌ Erreur sauvegarde pièce:', err);
      setError(err.message || 'Erreur lors de la sauvegarde');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const getHeaderColor = () => {
    const colorMap = {
      'entry': 'from-gray-600 to-gray-500',
      'out_invoice': 'from-green-600 to-green-500',
      'out_refund': 'from-blue-600 to-blue-500',
      'in_invoice': 'from-amber-600 to-amber-500',
      'in_refund': 'from-cyan-600 to-cyan-500',
      'out_receipt': 'from-violet-600 to-violet-500',
      'in_receipt': 'from-purple-600 to-purple-500'
    };
    return colorMap[formData.move_type] || 'from-violet-600 to-violet-500';
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-3 z-50 backdrop-blur-sm">
      <div className="bg-white rounded-lg w-full max-w-5xl max-h-[90vh] overflow-y-auto shadow-xl">
        {/* Header */}
        <div className={`sticky top-0 bg-gradient-to-r ${getHeaderColor()} text-white rounded-t-lg p-3`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-white/20 backdrop-blur-sm rounded">
                <FiFileText className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-base font-bold">
                  {piece ? 'Modifier la pièce comptable' : 'Nouvelle Pièce Comptable'}
                </h2>
                {!piece && (
                  <p className="text-white/90 text-xs mt-0.5">
                    Créez une nouvelle pièce comptable (facture, avoir, écriture, règlement)
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
          {/* Section 1: Informations de Base */}
          <div className="bg-gradient-to-br from-gray-50 to-white rounded-lg p-3 border border-gray-200">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-1 h-4 bg-gradient-to-b from-violet-600 to-violet-400 rounded"></div>
              <h3 className="text-sm font-semibold text-gray-900">Informations de Base</h3>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
              {/* Type de pièce */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Type de pièce <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.move_type}
                  onChange={(e) => handleChange('move_type', e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-violet-500 focus:border-transparent bg-white text-sm"
                >
                  <option value="entry">Écriture comptable</option>
                  <option value="out_invoice">Facture client</option>
                  <option value="out_refund">Avoir client</option>
                  <option value="in_invoice">Facture fournisseur</option>
                  <option value="in_refund">Avoir fournisseur</option>
                  <option value="out_receipt">Règlement client</option>
                  <option value="in_receipt">Règlement fournisseur</option>
                </select>
              </div>
              
              {/* Nom */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Numéro/Nom <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => handleChange('name', e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-violet-500 focus:border-transparent bg-white text-sm"
                  placeholder="Ex: FACT-2023-001"
                />
              </div>
              
              {/* Journal */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Journal <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.journal}
                  onChange={(e) => handleChange('journal', e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-violet-500 focus:border-transparent bg-white text-sm"
                >
                  <option value="">Sélectionnez un journal</option>
                  {journaux.map(j => (
                    <option key={j.id} value={j.id}>
                      {j.code} - {j.name}
                    </option>
                  ))}
                </select>
              </div>
              
              {/* Date */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Date <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  required
                  value={formData.date}
                  onChange={(e) => handleChange('date', e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-violet-500 focus:border-transparent bg-white text-sm"
                />
              </div>
              
              {/* Référence */}
              <div className="lg:col-span-2">
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Référence
                </label>
                <input
                  type="text"
                  value={formData.ref}
                  onChange={(e) => handleChange('ref', e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-violet-500 focus:border-transparent bg-white text-sm"
                  placeholder="Référence externe..."
                />
              </div>
            </div>
          </div>

          {/* Section 2: Partenaire et Entreprise */}
          <div className="bg-gradient-to-br from-blue-50 to-white rounded-lg p-3 border border-blue-100">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-1 h-4 bg-gradient-to-b from-blue-600 to-blue-400 rounded"></div>
              <h3 className="text-sm font-semibold text-gray-900">Partenaire et Entreprise</h3>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
              {/* Partenaire */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Partenaire
                </label>
                <select
                  value={formData.partner}
                  onChange={(e) => handleChange('partner', e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-violet-500 focus:border-transparent bg-white text-sm"
                >
                  <option value="">Aucun partenaire</option>
                  {partenaires.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.nom} ({p.type_partenaire})
                    </option>
                  ))}
                </select>
              </div>
              
              {/* Entreprise */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Entreprise <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.company}
                  onChange={(e) => handleChange('company', e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-violet-500 focus:border-transparent bg-white text-sm"
                >
                  <option value="">Sélectionnez une entreprise</option>
                  {companies.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.raison_sociale || c.nom}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Section 3: Montants */}
          <div className="bg-gradient-to-br from-green-50 to-white rounded-lg p-3 border border-green-100">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-1 h-4 bg-gradient-to-b from-green-600 to-green-400 rounded"></div>
              <h3 className="text-sm font-semibold text-gray-900">Montants</h3>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
              {/* Montant HT */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Montant HT (€)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.amount_untaxed}
                  onChange={(e) => handleChange('amount_untaxed', e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-violet-500 focus:border-transparent bg-white text-sm"
                  placeholder="0.00"
                />
              </div>
              
              {/* Montant TVA */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Montant TVA (€)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.amount_tax}
                  onChange={(e) => handleChange('amount_tax', e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-violet-500 focus:border-transparent bg-white text-sm"
                  placeholder="0.00"
                />
              </div>
              
              {/* Montant TTC */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Montant TTC (€)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.amount_total}
                  onChange={(e) => handleChange('amount_total', e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-violet-500 focus:border-transparent bg-white text-sm"
                  placeholder="0.00"
                />
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
                  <span>{piece ? 'Mettre à jour' : 'Créer la pièce'}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}