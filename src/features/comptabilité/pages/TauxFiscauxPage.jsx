import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
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
  FiBriefcase
} from "react-icons/fi";

export default function TauxFiscauxPage() {
  const [taxes, setTaxes] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [pays, setPays] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editingTax, setEditingTax] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedTax, setSelectedTax] = useState(null);
  
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('');
  const [filterCompany, setFilterCompany] = useState('');
  const [selectedRows, setSelectedRows] = useState([]);
  const [authStatus, setAuthStatus] = useState({
    isAuthenticated: false,
    hasCompaniesAccess: false,
    showLoginPrompt: false
  });

  // Fonction utilitaire pour extraire les données
  const extractData = useCallback((response) => {
    if (!response) return [];
    if (Array.isArray(response)) return response;
    if (response.data && Array.isArray(response.data)) return response.data;
    if (response.results && Array.isArray(response.results)) return response.results;
    return [];
  }, []);

  // Vérifier l'authentification au chargement
  useEffect(() => {
    checkAuthStatus();
    fetchPublicData();
  }, []);

  // Vérifier le statut d'authentification
  const checkAuthStatus = useCallback(() => {
    const isAuthenticated = authService.isAuthenticated();
    const token = authService.getToken();
    
    console.log('🔐 Statut auth:', {
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

  // Charger les données publiques (qui ne nécessitent pas d'auth)
  const fetchPublicData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Charger les données publiques
      const [taxesRes, accountsRes, paysRes] = await Promise.all([
        apiClient.get('/compta/taxes/').catch(err => {
          console.warn('⚠️ Erreur taxes:', err.message);
          return { data: [] };
        }),
        apiClient.get('/compta/accounts/').catch(err => {
          console.warn('⚠️ Erreur comptes:', err.message);
          return { data: [] };
        }),
        apiClient.get('/pays/').catch(err => {
          console.warn('⚠️ Erreur pays:', err.message);
          return { data: [] };
        })
      ]);

      setTaxes(extractData(taxesRes));
      setAccounts(extractData(accountsRes));
      setPays(extractData(paysRes));

      // Si l'utilisateur est authentifié, charger les entreprises
      if (authService.isAuthenticated()) {
        await fetchCompanies();
      } else {
        setCompanies([]);
        setAuthStatus(prev => ({ ...prev, hasCompaniesAccess: false }));
      }
      
      console.log('✅ Données publiques chargées:', {
        taxes: extractData(taxesRes).length,
        accounts: extractData(accountsRes).length,
        pays: extractData(paysRes).length,
        companies: companies.length
      });

    } catch (err) {
      console.error('❌ Erreur lors du chargement des données publiques:', err);
      setError('Erreur de connexion au serveur');
    } finally {
      setLoading(false);
    }
  }, [extractData]);

  // Charger les entreprises (nécessite une authentification)
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
        
        const companiesData = extractData(companiesRes);
        setCompanies(companiesData);
        
        // Debug: Afficher la structure des données
        if (companiesData.length > 0) {
          console.log('📊 Données entreprises reçues:', {
            count: companiesData.length,
            sample: companiesData[0],
            allKeys: Object.keys(companiesData[0])
          });
        }
        
        setAuthStatus(prev => ({ 
          ...prev, 
          hasCompaniesAccess: true,
          showLoginPrompt: false 
        }));
        
        console.log(`✅ ${companiesData.length} entreprise(s) chargée(s)`);
        
      } catch (apiError) {
        console.error('❌ Erreur API entreprises:', apiError);
        
        if (apiError.status === 401) {
          console.log('🔐 Token probablement expiré, tentative de rafraîchissement...');
          
          try {
            await authService.refreshToken();
            console.log('✅ Token rafraîchi, nouvelle tentative...');
            
            // Réessayer avec le nouveau token
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

  // Recharger toutes les données
  const fetchAllData = useCallback(async () => {
    await fetchPublicData();
  }, [fetchPublicData]);

  // Gestion de la connexion
  const handleLogin = useCallback(() => {
    // Rediriger vers la page de login
    window.location.href = '/login?redirect=' + encodeURIComponent(window.location.pathname);
  }, []);

  // Force le rechargement avec vérification d'auth
  const handleForceRefresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    // Vérifier et rafraîchir l'authentification si nécessaire
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

  // Filtrage et recherche
  const filteredTaxes = useMemo(() => {
    if (!Array.isArray(taxes)) return [];
    
    return taxes.filter(tax => {
      const searchTermLower = searchTerm.toLowerCase();
      const taxName = tax.name || '';
      const taxAmount = tax.amount?.toString() || '';
      
      const matchesSearch = 
        taxName.toLowerCase().includes(searchTermLower) ||
        taxAmount.includes(searchTerm);
      
      const matchesType = !filterType || tax.type_tax_use === filterType;
      const matchesCompany = !filterCompany || 
        (tax.company?.id && tax.company.id.toString() === filterCompany);
      
      return matchesSearch && matchesType && matchesCompany;
    });
  }, [taxes, searchTerm, filterType, filterCompany]);

  // Calculs pour la pagination
  const totalItems = filteredTaxes.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / itemsPerPage));
  const indexOfLastItem = Math.min(currentPage * itemsPerPage, totalItems);
  const indexOfFirstItem = Math.max(0, indexOfLastItem - itemsPerPage);
  const currentTaxes = filteredTaxes.slice(indexOfFirstItem, indexOfLastItem);

  // Gestion de la pagination
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

  // Gestion des sélections de lignes
  const toggleRowSelection = useCallback((id) => {
    setSelectedRows(prev => 
      prev.includes(id) 
        ? prev.filter(rowId => rowId !== id)
        : [...prev, id]
    );
  }, []);

  const selectAllRows = useCallback(() => {
    if (selectedRows.length === currentTaxes.length && currentTaxes.length > 0) {
      setSelectedRows([]);
    } else {
      setSelectedRows(currentTaxes.map(tax => tax.id).filter(id => id != null));
    }
  }, [currentTaxes, selectedRows.length]);

  // Gestion des actions
  const handleNewTax = useCallback(() => {
    // Vérifier si l'utilisateur a accès aux entreprises
    if (!authStatus.hasCompaniesAccess && companies.length === 0) {
      setAuthStatus(prev => ({ ...prev, showLoginPrompt: true }));
      return;
    }
    
    setEditingTax(null);
    setShowForm(true);
  }, [authStatus.hasCompaniesAccess, companies.length]);

  const handleEdit = useCallback((tax) => {
    setEditingTax(tax);
    setShowForm(true);
  }, []);

  const handleDelete = useCallback(async (tax) => {
    if (!tax || !tax.id) return;
    
    if (window.confirm(`Êtes-vous sûr de vouloir supprimer le taux "${tax.name || 'sans nom'}" ? Cette action est irréversible.`)) {
      try {
        await apiClient.delete(`/compta/taxes/${tax.id}/`);
        fetchAllData();
      } catch (err) {
        console.error('Error deleting tax:', err);
        setError('Erreur lors de la suppression du taux');
      }
    }
  }, [fetchAllData]);

  const handleViewDetails = useCallback((tax) => {
    if (!tax) return;
    setSelectedTax(tax);
    setShowDetailModal(true);
  }, []);

  const handleFormSuccess = useCallback(() => {
    setShowForm(false);
    setEditingTax(null);
    fetchAllData();
  }, [fetchAllData]);

  const handleRetry = useCallback(() => {
    fetchAllData();
  }, [fetchAllData]);

  const resetFilters = useCallback(() => {
    setSearchTerm('');
    setFilterType('');
    setFilterCompany('');
    setCurrentPage(1);
  }, []);

  // Statistiques
  const stats = useMemo(() => ({
    total: taxes.length,
    saleTaxes: taxes.filter(t => t.type_tax_use === 'sale').length,
    purchaseTaxes: taxes.filter(t => t.type_tax_use === 'purchase').length,
    percentTaxes: taxes.filter(t => t.amount_type === 'percent').length,
    fixedTaxes: taxes.filter(t => t.amount_type === 'fixed').length,
    companies: companies.length
  }), [taxes, companies]);

  // Composant de chargement
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
        handleNewTax={handleNewTax}
        handleLogin={handleLogin}
        stats={stats}
        filterType={filterType}
        setFilterType={setFilterType}
        setCurrentPage={setCurrentPage}
        resetFilters={resetFilters}
        selectedRows={selectedRows}
        authStatus={authStatus}
        companiesCount={companies.length}
      />

      {/* Message d'erreur */}
      {error && <ErrorMessage error={error} handleRetry={handleRetry} />}

      {/* Message d'avertissement pour les entreprises */}
      {!authStatus.hasCompaniesAccess && companies.length === 0 && taxes.length > 0 && (
        <CompaniesWarning onLogin={handleLogin} />
      )}

      {/* Tableau principal */}
      <MainTable 
        currentTaxes={currentTaxes}
        taxes={taxes}
        selectedRows={selectedRows}
        selectAllRows={selectAllRows}
        toggleRowSelection={toggleRowSelection}
        handleViewDetails={handleViewDetails}
        handleEdit={handleEdit}
        handleDelete={handleDelete}
        handleNewTax={handleNewTax}
        itemsPerPage={itemsPerPage}
        setItemsPerPage={setItemsPerPage}
        setCurrentPage={setCurrentPage}
      />

      {/* Pagination */}
      {currentTaxes.length > 0 && (
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
        <TaxFormModal
          tax={editingTax}
          accounts={accounts}
          companies={companies}
          pays={pays}
          authStatus={authStatus}
          onClose={() => {
            setShowForm(false);
            setEditingTax(null);
          }}
          onSuccess={handleFormSuccess}
          onLogin={handleLogin}
        />
      )}

      {showDetailModal && selectedTax && (
        <TaxDetailModal
          tax={selectedTax}
          onClose={() => {
            setShowDetailModal(false);
            setSelectedTax(null);
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
          <p className="text-gray-500 text-sm mt-4">Chargement des taux fiscaux...</p>
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
              Vous pouvez toujours créer des taux avec une entreprise manuelle
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
  handleNewTax, 
  handleLogin,
  stats, 
  filterType, 
  setFilterType,
  setCurrentPage,
  resetFilters,
  selectedRows,
  authStatus,
  companiesCount
}) {
  return (
    <div className="mb-6">
      {/* Barre de recherche */}
      <div className="flex items-center justify-center gap-3 mb-4">
        <div className="relative flex items-center">
          <div className="relative flex-1">
            <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 pr-24 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-violet-500 focus:border-transparent text-sm w-80"
              placeholder="Rechercher un taux..."
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
            onClick={handleNewTax}
            disabled={!authStatus.hasCompaniesAccess && companiesCount === 0}
            className={`ml-2 px-3 py-2 rounded-lg transition-all duration-300 flex items-center gap-1.5 text-sm shadow ${
              (!authStatus.hasCompaniesAccess && companiesCount === 0)
                ? 'bg-gradient-to-r from-gray-400 to-gray-300 text-gray-100 cursor-not-allowed'
                : 'bg-gradient-to-r from-violet-600 to-violet-500 text-white hover:from-violet-700 hover:to-violet-600'
            }`}
          >
            <FiPlus size={14} />
            <span>Nouveau Taux</span>
          </button>
        </div>
      </div>

      {/* Statistiques - Grid modifié pour réduire la hauteur */}
      <div className="grid grid-cols-5 gap-2 mb-3">
        <StatCard 
          label="Taux" 
          value={stats.total} 
          color="violet" 
          icon={FiPercent} 
        />
        <StatCard 
          label="Vente" 
          value={stats.saleTaxes} 
          color="green" 
          icon={FiTrendingUp} 
        />
        <StatCard 
          label="Achat" 
          value={stats.purchaseTaxes} 
          color="amber" 
          icon={FiShoppingCart} 
        />
        <StatCard 
          label="Entreprises" 
          value={stats.companies} 
          color="blue" 
          icon={FiUsers} 
          sublabel={authStatus.hasCompaniesAccess ? "Accès complet" : "Limité"}
        />
        <StatCard 
          label="Pourcentage" 
          value={stats.percentTaxes} 
          color="cyan" 
          icon={FiPercent} 
        />
      </div>

      {/* Onglets */}
      <div className="flex border-b border-gray-200 mb-3">
        <TabButton 
          active={!filterType}
          onClick={() => {
            setCurrentPage(1);
            setFilterType('');
          }}
          label="Tous les taux"
          color="violet"
        />
        <TabButton 
          active={filterType === 'sale'}
          onClick={() => {
            setCurrentPage(1);
            setFilterType('sale');
          }}
          label="TVA Vente"
          color="green"
        />
        <TabButton 
          active={filterType === 'purchase'}
          onClick={() => {
            setCurrentPage(1);
            setFilterType('purchase');
          }}
          label="TVA Achat"
          color="amber"
        />
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

function TabButton({ active, onClick, label, color }) {
  const colorClasses = {
    violet: 'border-violet-600 text-violet-600',
    green: 'border-green-600 text-green-600',
    amber: 'border-amber-600 text-amber-600'
  };

  return (
    <button
      onClick={onClick}
      className={`px-4 py-1.5 text-xs font-medium border-b-2 ${
        active ? colorClasses[color] : 'border-transparent text-gray-500 hover:text-gray-700'
      } transition-colors`}
    >
      {label}
    </button>
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
  currentTaxes, 
  taxes, 
  selectedRows, 
  selectAllRows, 
  toggleRowSelection, 
  handleViewDetails, 
  handleEdit, 
  handleDelete, 
  handleNewTax,
  itemsPerPage,
  setItemsPerPage,
  setCurrentPage
}) {
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
      {/* En-tête du tableau */}
      <div className="px-3 py-2 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5">
              <input
                type="checkbox"
                checked={selectedRows.length === currentTaxes.length && currentTaxes.length > 0}
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
                    checked={selectedRows.length === currentTaxes.length && currentTaxes.length > 0}
                    onChange={selectAllRows}
                    className="w-3 h-3 text-violet-600 rounded focus:ring-violet-500 border-gray-300"
                  />
                  ID
                </div>
              </th>
              <th scope="col" className="px-3 py-2 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider border-r border-gray-300">
                Taux
              </th>
              <th scope="col" className="px-3 py-2 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider border-r border-gray-300">
                Montant
              </th>
              <th scope="col" className="px-3 py-2 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider border-r border-gray-300">
                Utilisation
              </th>
              <th scope="col" className="px-3 py-2 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider border-r border-gray-300">
                Entreprise / Pays
              </th>
              <th scope="col" className="px-3 py-2 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          
          <tbody className="divide-y divide-gray-200">
            {currentTaxes.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-3 py-4 text-center">
                  <EmptyState 
                    hasData={taxes.length > 0} 
                    onNewTax={handleNewTax} 
                  />
                </td>
              </tr>
            ) : (
              currentTaxes.map((tax) => (
                <TaxRow 
                  key={tax.id}
                  tax={tax}
                  isSelected={selectedRows.includes(tax.id)}
                  onToggleSelect={() => toggleRowSelection(tax.id)}
                  onViewDetails={() => handleViewDetails(tax)}
                  onEdit={() => handleEdit(tax)}
                  onDelete={() => handleDelete(tax)}
                />
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function EmptyState({ hasData, onNewTax }) {
  return (
    <div className="flex flex-col items-center justify-center">
      <div className="w-12 h-12 bg-gradient-to-br from-gray-100 to-gray-200 rounded-full flex items-center justify-center mb-2">
        <FiPercent className="w-6 h-6 text-gray-400" />
      </div>
      <h3 className="text-sm font-semibold text-gray-900 mb-1">
        {hasData ? 'Aucun résultat' : 'Aucun taux fiscal trouvé'}
      </h3>
      <p className="text-gray-600 text-xs mb-3 max-w-md">
        {hasData 
          ? 'Essayez de modifier vos critères de recherche'
          : 'Commencez par créer votre premier taux fiscal'
        }
      </p>
      {!hasData && (
        <button 
          onClick={onNewTax}
          className="px-3 py-1 bg-gradient-to-r from-violet-600 to-violet-500 text-white rounded hover:from-violet-700 hover:to-violet-600 transition-all duration-300 font-medium flex items-center gap-1 text-xs"
        >
          <FiPlus size={12} />
          Créer taux
        </button>
      )}
    </div>
  );
}

function TaxRow({ tax, isSelected, onToggleSelect, onViewDetails, onEdit, onDelete }) {
  const getTaxUseBadge = (type) => {
    switch(type) {
      case 'sale':
        return {
          bg: 'bg-gradient-to-r from-green-50 to-green-100',
          text: 'text-green-800',
          icon: FiTrendingUp,
          label: 'Vente'
        };
      case 'purchase':
        return {
          bg: 'bg-gradient-to-r from-amber-50 to-amber-100',
          text: 'text-amber-800',
          icon: FiShoppingCart,
          label: 'Achat'
        };
      default:
        return {
          bg: 'bg-gradient-to-r from-gray-50 to-gray-100',
          text: 'text-gray-800',
          icon: FiInfo,
          label: 'Divers'
        };
    }
  };

  const badge = getTaxUseBadge(tax.type_tax_use);
  const Icon = badge.icon;

  // Debug pour voir la structure des données
  console.log('Tax data:', {
    id: tax.id,
    company: tax.company,
    country: tax.country,
    companyKeys: tax.company ? Object.keys(tax.company) : 'No company',
    countryKeys: tax.country ? Object.keys(tax.country) : 'No country'
  });

  return (
    <tr className={`hover:bg-gradient-to-r hover:from-gray-50 hover:to-white transition-all duration-200 ${
      isSelected ? 'bg-gradient-to-r from-violet-50 to-violet-25' : 'bg-white'
    }`}>
      {/* ID avec checkbox */}
      <td className="px-3 py-2 whitespace-nowrap border-r border-gray-200">
        <div className="flex items-center gap-1.5">
          <input
            type="checkbox"
            checked={isSelected}
            onChange={onToggleSelect}
            className="w-3 h-3 text-violet-600 rounded focus:ring-violet-500 border-gray-300"
          />
          <span className="px-1 py-0.5 bg-gray-100 text-gray-800 rounded text-xs font-medium font-mono">
            #{tax.id}
          </span>
        </div>
      </td>
      
      {/* Nom du taux */}
      <td className="px-3 py-2 border-r border-gray-200">
        <div>
          <div className="text-xs font-semibold text-gray-900 truncate max-w-[150px]">{tax.name}</div>
          <div className="text-xs text-gray-500 truncate max-w-[150px]">
            {tax.amount_type === 'percent' ? 'Pourcentage' : 'Montant fixe'}
          </div>
        </div>
      </td>
      
      {/* Montant */}
      <td className="px-3 py-2 border-r border-gray-200">
        <div className="text-xs">
          {tax.amount_type === 'percent' ? (
            <span className="px-1.5 py-0.5 bg-gradient-to-r from-blue-50 to-blue-100 text-blue-700 rounded border border-blue-200 text-xs font-medium font-mono">
              {tax.amount}%
            </span>
          ) : (
            <span className="px-1.5 py-0.5 bg-gradient-to-r from-green-50 to-green-100 text-green-700 rounded border border-green-200 text-xs font-medium">
              {tax.amount} FCFA
            </span>
          )}
        </div>
      </td>
      
      {/* Utilisation */}
      <td className="px-3 py-2 border-r border-gray-200">
        <div>
          <span className={`inline-flex items-center px-2 py-0.5 ${badge.bg} ${badge.text} rounded-full text-xs font-medium`}>
            <Icon className="w-2.5 h-2.5 mr-1" />
            {badge.label}
          </span>
        </div>
      </td>
      
      {/* Entreprise / Pays */}
      <td className="px-3 py-2 border-r border-gray-200">
        <div className="flex flex-col">
          <div className="text-xs text-gray-900 truncate max-w-[100px]">
            {tax.company?.nom || 
             tax.company?.raison_sociale || 
             tax.company?.name || 
             tax.company?.raisonSociale || 
             tax.company?.display_name || 
             tax.company?.company_name ||
             '-'}
          </div>
          <div className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
            {tax.country?.emoji || '🌍'}
            <span className="truncate max-w-[80px]">
              {tax.country?.nom_fr || 
               tax.country?.nom || 
               tax.country?.name || 
               tax.country?.country_name ||
               tax.country?.display_name ||
               '-'}
            </span>
          </div>
        </div>
      </td>
      
      {/* Actions */}
      <td className="px-3 py-2 whitespace-nowrap">
        <div className="flex items-center gap-1">
          <ActionButton 
            onClick={onViewDetails}
            color="gray"
            icon={FiEye}
            title="Voir détails"
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

function ActionButton({ onClick, color, icon: Icon, title }) {
  const colorClasses = {
    gray: 'from-gray-50 to-gray-100 text-gray-700 hover:from-gray-100 hover:to-gray-200',
    violet: 'from-violet-50 to-violet-100 text-violet-700 hover:from-violet-100 hover:to-violet-200',
    red: 'from-red-50 to-red-100 text-red-700 hover:from-red-100 hover:to-red-200'
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
              {indexOfFirstItem + 1}-{Math.min(indexOfLastItem, totalItems)} sur {totalItems} taux
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
function TaxDetailModal({ tax, onClose }) {
  const getTaxTypeColor = (type) => {
    switch(type) {
      case 'sale': return 'from-green-600 to-green-500';
      case 'purchase': return 'from-amber-600 to-amber-500';
      default: return 'from-gray-600 to-gray-500';
    }
  };

  const getTaxTypeText = (type) => {
    switch(type) {
      case 'sale': return 'Vente';
      case 'purchase': return 'Achat';
      default: return 'Divers';
    }
  };

  const getAmountTypeText = (type) => {
    switch(type) {
      case 'percent': return 'Pourcentage';
      case 'fixed': return 'Montant fixe';
      default: return type;
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-3 z-50 backdrop-blur-sm">
      <div className="bg-white rounded-lg w-full max-w-4xl max-h-[90vh] overflow-y-auto shadow-xl">
        {/* Header */}
        <div className={`sticky top-0 bg-gradient-to-r ${getTaxTypeColor(tax.type_tax_use)} text-white rounded-t-lg p-3`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-white/20 backdrop-blur-sm rounded">
                <FiPercent className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-base font-bold">Détails du Taux Fiscal</h2>
                <p className="text-white/90 text-xs mt-0.5">{tax.name}</p>
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
              <FiPercent className="w-16 h-16 text-violet-600" />
            </div>
            <div className="flex-1 text-center md:text-left">
              <h1 className="text-xl font-bold text-gray-900">{tax.name}</h1>
              <div className="flex flex-wrap gap-2 mt-3 justify-center md:justify-start">
                <span className={`inline-flex items-center px-3 py-1 bg-gradient-to-r ${getTaxTypeColor(tax.type_tax_use)} text-white rounded-full text-xs font-medium`}>
                  {getTaxTypeText(tax.type_tax_use)}
                </span>
                {tax.amount_type === 'percent' ? (
                  <span className="inline-flex items-center px-3 py-1 bg-gradient-to-r from-blue-50 to-blue-100 text-blue-700 rounded-full text-xs font-medium border border-blue-200">
                    <FiPercent className="w-3 h-3 mr-1" />
                    {tax.amount}%
                  </span>
                ) : (
                  <span className="inline-flex items-center px-3 py-1 bg-gradient-to-r from-green-50 to-green-100 text-green-700 rounded-full text-xs font-medium border border-green-200">
                    {tax.amount} FCFA
                  </span>
                )}
                {tax.country && (
                  <span className="inline-flex items-center px-3 py-1 bg-gradient-to-r from-gray-50 to-gray-100 text-gray-700 rounded-full text-xs font-medium border border-gray-200">
                    <FiGlobe className="w-3 h-3 mr-1" />
                    {tax.country.nom_fr || tax.country.nom}
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
              { label: 'Identifiant', value: `#${tax.id}`, isCode: true },
              { label: 'Nom du taux', value: tax.name },
              { label: 'Type de taux', value: getAmountTypeText(tax.amount_type) },
              { label: 'Montant', value: tax.amount_type === 'percent' ? `${tax.amount}%` : `${tax.amount} FCFA`, isBold: true }
            ]}
          />

          {/* Utilisation fiscale */}
          <InfoSection 
            title="Utilisation Fiscale"
            color="green"
            items={[
              { 
                label: 'Type d\'utilisation', 
                value: (
                  <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${
                    tax.type_tax_use === 'sale' 
                      ? 'bg-gradient-to-r from-green-50 to-green-100 text-green-700 border border-green-200'
                      : tax.type_tax_use === 'purchase'
                      ? 'bg-gradient-to-r from-amber-50 to-amber-100 text-amber-700 border border-amber-200'
                      : 'bg-gradient-to-r from-gray-50 to-gray-100 text-gray-700 border border-gray-200'
                  }`}>
                    {getTaxTypeText(tax.type_tax_use)}
                  </span>
                ) 
              },
              { label: 'Entreprise associée', value: tax.company?.nom || tax.company?.raison_sociale || tax.company?.name || 'Non spécifiée' }
            ]}
          />

          {/* Informations supplémentaires */}
          <InfoSection 
            title="Informations Supplémentaires"
            color="blue"
            items={[
              { 
                label: 'Pays', 
                value: (
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{tax.country?.emoji || '🌍'}</span>
                    <span>{tax.country?.nom_fr || tax.country?.nom || 'Non spécifié'}</span>
                  </div>
                ) 
              },
              { label: 'Compte de taxe', value: tax.account?.code ? `${tax.account.code} - ${tax.account.name}` : 'Non défini' },
              ...(tax.refund_account ? [{
                label: 'Compte de remboursement', 
                value: tax.refund_account.code ? `${tax.refund_account.code} - ${tax.refund_account.name}` : 'Non défini'
              }] : [])
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

// MODAL DE FORMULAIRE AVEC GESTION D'AUTH
function TaxFormModal({ tax, accounts, companies, pays, authStatus, onClose, onSuccess, onLogin }) {
  const [formData, setFormData] = useState({
    name: tax?.name || '',
    amount: tax?.amount || 0,
    amount_type: tax?.amount_type || 'percent',
    type_tax_use: tax?.type_tax_use || 'sale',
    company: tax?.company?.id || tax?.company || '',
    account: tax?.account?.id || tax?.account || '',
    refund_account: tax?.refund_account?.id || tax?.refund_account || '',
    country: tax?.country?.id || tax?.country || ''
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [searchCompany, setSearchCompany] = useState('');
  const [searchAccount, setSearchAccount] = useState('');
  const [searchCountry, setSearchCountry] = useState('');
  const [manualCompany, setManualCompany] = useState('');

  const companiesArray = Array.isArray(companies) ? companies : [];
  const accountsArray = Array.isArray(accounts) ? accounts : [];
  const paysArray = Array.isArray(pays) ? pays : [];

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    // Validation
    if (!formData.name.trim()) {
      setError('Le nom du taux est obligatoire');
      setLoading(false);
      return;
    }

    if (!formData.amount || formData.amount <= 0) {
      setError('Le montant doit être supérieur à 0');
      setLoading(false);
      return;
    }

    // Si pas d'entreprise sélectionnée mais saisie manuelle
    if (!formData.company && !manualCompany.trim()) {
      setError('L\'entreprise est obligatoire');
      setLoading(false);
      return;
    }

    try {
      const url = tax ? `/compta/taxes/${tax.id}/` : `/compta/taxes/`;
      const method = tax ? 'PUT' : 'POST';

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
      
      console.log('✅ Taux sauvegardé:', response);
      onSuccess();
    } catch (err) {
      console.error('❌ Erreur sauvegarde taux:', err);
      setError(err.message || 'Erreur lors de la sauvegarde');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const getHeaderColor = (type) => {
    switch(type) {
      case 'sale': return 'from-green-600 to-green-500';
      case 'purchase': return 'from-amber-600 to-amber-500';
      default: return 'from-violet-600 to-violet-500';
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-3 z-50 backdrop-blur-sm">
      <div className="bg-white rounded-lg w-full max-w-5xl max-h-[90vh] overflow-y-auto shadow-xl">
        {/* Header */}
        <div className={`sticky top-0 bg-gradient-to-r ${getHeaderColor(formData.type_tax_use)} text-white rounded-t-lg p-3`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-white/20 backdrop-blur-sm rounded">
                <FiPercent className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-base font-bold">
                  {tax ? 'Modifier le taux fiscal' : 'Nouveau Taux Fiscal'}
                </h2>
                {!tax && (
                  <p className="text-white/90 text-xs mt-0.5">
                    Créez un nouveau taux fiscal (TVA, IS, etc.)
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
              {/* Nom du taux */}
              <div className="lg:col-span-2">
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Nom du Taux <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => handleChange('name', e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-violet-500 focus:border-transparent bg-white text-sm"
                  placeholder="Ex: TVA 18%, IS 30%..."
                />
              </div>
              
              {/* Type de montant */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Type de Montant <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.amount_type}
                  onChange={(e) => handleChange('amount_type', e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-violet-500 focus:border-transparent bg-white text-sm"
                >
                  <option value="percent">Pourcentage (%)</option>
                  <option value="fixed">Montant fixe (FCFA)</option>
                </select>
              </div>
              
              {/* Valeur */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Valeur <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type="number"
                    required
                    min="0"
                    step={formData.amount_type === 'percent' ? "0.01" : "1"}
                    value={formData.amount}
                    onChange={(e) => handleChange('amount', parseFloat(e.target.value))}
                    className="w-full border border-gray-300 rounded-lg pl-3 pr-8 py-2 focus:outline-none focus:ring-1 focus:ring-violet-500 focus:border-transparent bg-white text-sm"
                    placeholder={formData.amount_type === 'percent' ? "18.00" : "1000"}
                  />
                  <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 text-sm">
                    {formData.amount_type === 'percent' ? '%' : 'FCFA'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Section 2: Utilisation fiscale */}
          <div className="bg-gradient-to-br from-green-50 to-white rounded-lg p-3 border border-green-100">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-1 h-4 bg-gradient-to-b from-green-600 to-green-400 rounded"></div>
              <h3 className="text-sm font-semibold text-gray-900">Utilisation Fiscale</h3>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Type d'utilisation <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.type_tax_use}
                  onChange={(e) => handleChange('type_tax_use', e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-violet-500 focus:border-transparent bg-white text-sm"
                >
                  <option value="sale">Vente</option>
                  <option value="purchase">Achat</option>
                  <option value="none">Aucune</option>
                </select>
              </div>
              
              {/* Entreprise - Select ou saisie manuelle */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Entreprise <span className="text-red-500">*</span>
                </label>
                
                {companiesArray.length > 0 ? (
                  <SearchableDropdown
                    value={formData.company}
                    onChange={(value) => handleChange('company', value)}
                    options={companiesArray}
                    searchValue={searchCompany}
                    onSearchChange={setSearchCompany}
                    placeholder="Sélectionnez une entreprise"
                    required
                    icon={FiBriefcase}
                    getOptionLabel={(company) => company.raison_sociale || company.nom || company.name || 'Sans nom'}
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

          {/* Section 3: Configuration comptable */}
          <div className="bg-gradient-to-br from-blue-50 to-white rounded-lg p-3 border border-blue-100">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-1 h-4 bg-gradient-to-b from-blue-600 to-blue-400 rounded"></div>
              <h3 className="text-sm font-semibold text-gray-900">Configuration Comptable</h3>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
              <div>
                <SearchableDropdown
                  label="Compte de taxe"
                  value={formData.account}
                  onChange={(value) => handleChange('account', value)}
                  options={accountsArray}
                  searchValue={searchAccount}
                  onSearchChange={setSearchAccount}
                  placeholder="Sélectionnez un compte"
                  icon={FiCreditCard}
                  getOptionLabel={(account) => `${account.code} - ${account.name}`}
                  getOptionValue={(account) => account.id}
                />
              </div>
              
              <div>
                <SearchableDropdown
                  label="Compte de remboursement (optionnel)"
                  value={formData.refund_account}
                  onChange={(value) => handleChange('refund_account', value)}
                  options={accountsArray}
                  searchValue={searchAccount}
                  onSearchChange={setSearchAccount}
                  placeholder="Sélectionnez un compte"
                  icon={FiCreditCard}
                  getOptionLabel={(account) => `${account.code} - ${account.name}`}
                  getOptionValue={(account) => account.id}
                />
              </div>
            </div>
          </div>

          {/* Section 4: Localisation */}
          <div className="bg-gradient-to-br from-cyan-50 to-white rounded-lg p-3 border border-cyan-100">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-1 h-4 bg-gradient-to-b from-cyan-600 to-cyan-400 rounded"></div>
              <h3 className="text-sm font-semibold text-gray-900">Localisation</h3>
            </div>
            
            <div className="grid grid-cols-1 gap-3">
              <div>
                <SearchableDropdown
                  label="Pays (optionnel)"
                  value={formData.country}
                  onChange={(value) => handleChange('country', value)}
                  options={paysArray}
                  searchValue={searchCountry}
                  onSearchChange={setSearchCountry}
                  placeholder="Sélectionnez un pays"
                  icon={FiGlobe}
                  getOptionLabel={(paysItem) => `${paysItem.emoji || '🌍'} ${paysItem.nom_fr || paysItem.nom} (${paysItem.code_iso})`}
                  getOptionValue={(paysItem) => paysItem.id}
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
                  <span>{tax ? 'Mettre à jour' : 'Créer le taux'}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// COMPOSANT SEARCHABLE DROPDOWN
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