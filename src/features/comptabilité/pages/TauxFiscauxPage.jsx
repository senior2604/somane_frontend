import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { apiClient } from '../../../services/apiClient';
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
  FiCheckCircle,
  FiXCircle,
  FiPercent,
  FiTrendingUp,
  FiGlobe,
  FiCreditCard,
  FiShoppingCart,
  FiExternalLink,
  FiInfo
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

  // Chargement initial des données
  useEffect(() => {
    fetchAllData();
  }, []);

  const fetchAllData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const [taxesRes, accountsRes, companiesRes, paysRes] = await Promise.all([
        apiClient.get('/compta/taxes/'),
        apiClient.get('/compta/accounts/'),
        apiClient.get('/entites/'),
        apiClient.get('/pays/')
      ]);
      
      // Fonction utilitaire pour extraire les données
      const extractData = (response) => {
        if (!response) return [];
        if (Array.isArray(response)) return response;
        if (response.data && Array.isArray(response.data)) return response.data;
        if (response.results && Array.isArray(response.results)) return response.results;
        return [];
      };
      
      setTaxes(extractData(taxesRes));
      setAccounts(extractData(accountsRes));
      setCompanies(extractData(companiesRes));
      setPays(extractData(paysRes));
      
      console.log('✅ Données chargées:', {
        taxes: extractData(taxesRes).length,
        accounts: extractData(accountsRes).length,
        companies: extractData(companiesRes).length,
        pays: extractData(paysRes).length
      });
      
    } catch (err) {
      console.error('❌ Erreur lors du chargement des données:', err);
      setError('Erreur lors du chargement des données. Vérifiez votre connexion.');
      setTaxes([]);
      setAccounts([]);
      setCompanies([]);
      setPays([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // Filtrage et recherche optimisé
  const filteredTaxes = useMemo(() => {
    if (!Array.isArray(taxes)) return [];
    
    return taxes.filter(tax => {
      const searchTermLower = searchTerm.toLowerCase();
      const matchesSearch = 
        (tax.name || '').toLowerCase().includes(searchTermLower) ||
        (tax.amount?.toString() || '').includes(searchTerm);
      
      const matchesType = !filterType || tax.type_tax_use === filterType;
      const matchesCompany = !filterCompany || 
        (tax.company?.id && tax.company.id.toString() === filterCompany);
      
      return matchesSearch && matchesType && matchesCompany;
    });
  }, [taxes, searchTerm, filterType, filterCompany]);

  // Calculs pour la pagination
  const totalItems = filteredTaxes.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentTaxes = filteredTaxes.slice(indexOfFirstItem, indexOfLastItem);

  // Gestion de la pagination
  const paginate = useCallback((pageNumber) => {
    setCurrentPage(Math.max(1, Math.min(pageNumber, totalPages)));
  }, [totalPages]);

  const nextPage = useCallback(() => {
    if (currentPage < totalPages) setCurrentPage(prev => prev + 1);
  }, [currentPage, totalPages]);

  const prevPage = useCallback(() => {
    if (currentPage > 1) setCurrentPage(prev => prev - 1);
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
    if (selectedRows.length === currentTaxes.length) {
      setSelectedRows([]);
    } else {
      setSelectedRows(currentTaxes.map(tax => tax.id));
    }
  }, [currentTaxes, selectedRows.length]);

  // Gestion des actions
  const handleNewTax = useCallback(() => {
    setEditingTax(null);
    setShowForm(true);
  }, []);

  const handleEdit = useCallback((tax) => {
    setEditingTax(tax);
    setShowForm(true);
  }, []);

  const handleDelete = useCallback(async (tax) => {
    if (window.confirm(`Êtes-vous sûr de vouloir supprimer le taux "${tax.name}" ? Cette action est irréversible.`)) {
      try {
        await apiClient.delete(`/compta/taxes/${tax.id}/`);
        fetchAllData();
      } catch (err) {
        console.error('Error deleting tax:', err);
        setError('Erreur lors de la suppression');
      }
    }
  }, [fetchAllData]);

  const handleViewDetails = useCallback((tax) => {
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
    fixedTaxes: taxes.filter(t => t.amount_type === 'fixed').length
  }), [taxes]);

  // Générer les numéros de page à afficher
  const pageNumbers = useMemo(() => {
    const pages = [];
    const maxVisiblePages = 5;
    
    if (totalPages <= maxVisiblePages) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      let start = Math.max(1, currentPage - 2);
      let end = Math.min(totalPages, start + maxVisiblePages - 1);
      
      if (end - start + 1 < maxVisiblePages) {
        start = Math.max(1, end - maxVisiblePages + 1);
      }
      
      for (let i = start; i <= end; i++) {
        pages.push(i);
      }
    }
    
    return pages;
  }, [currentPage, totalPages]);

  // Composant de chargement
  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="p-4 bg-gradient-to-br from-gray-50 to-white min-h-screen">
      {/* Header */}
      <Header 
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        loading={loading}
        handleRetry={handleRetry}
        handleNewTax={handleNewTax}
        stats={stats}
        filterType={filterType}
        setFilterType={setFilterType}
        setCurrentPage={setCurrentPage}
        resetFilters={resetFilters}
        selectedRows={selectedRows}
      />

      {/* Message d'erreur */}
      {error && <ErrorMessage error={error} handleRetry={handleRetry} />}

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
          pageNumbers={pageNumbers}
        />
      )}

      {/* Modaux */}
      {showForm && (
        <TaxFormModal
          tax={editingTax}
          accounts={accounts}
          companies={companies}
          pays={pays}
          onClose={() => {
            setShowForm(false);
            setEditingTax(null);
          }}
          onSuccess={handleFormSuccess}
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

// COMPOSANTS SÉPARÉS POUR MEILLEURE ORGANISATION

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

function Header({ 
  searchTerm, 
  setSearchTerm, 
  loading, 
  handleRetry, 
  handleNewTax, 
  stats, 
  filterType, 
  setFilterType,
  setCurrentPage,
  resetFilters,
  selectedRows 
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
          
          <button 
            onClick={handleNewTax}
            className="ml-2 px-3 py-2 rounded-lg bg-gradient-to-r from-violet-600 to-violet-500 text-white hover:from-violet-700 hover:to-violet-600 transition-all duration-300 flex items-center gap-1.5 text-sm shadow"
          >
            <FiPlus size={14} />
            <span>Nouveau Taux</span>
          </button>
        </div>
      </div>

      {/* Statistiques */}
      <div className="grid grid-cols-4 gap-2 mb-3">
        <StatCard 
          label="Total" 
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
          label="Pourcentage" 
          value={stats.percentTaxes} 
          color="blue" 
          icon={FiCreditCard} 
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

function StatCard({ label, value, color, icon: Icon }) {
  const colorClasses = {
    violet: { bg: 'bg-violet-50', text: 'text-violet-600' },
    green: { bg: 'bg-green-50', text: 'text-green-600' },
    amber: { bg: 'bg-amber-50', text: 'text-amber-600' },
    blue: { bg: 'bg-blue-50', text: 'text-blue-600' }
  };

  return (
    <div className="bg-white rounded-lg p-2 border border-gray-200 shadow-sm">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-600">{label}:</span>
          <span className={`text-sm font-bold ${colorClasses[color].text}`}>{value}</span>
        </div>
        <div className={`p-1 ${colorClasses[color].bg} rounded`}>
          <Icon className={`w-3 h-3 ${colorClasses[color].text}`} />
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
              <FiX className="w-3 h-3 text-red-600" />
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
            {tax.company?.nom || tax.company?.name || '-'}
          </div>
          <div className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
            {tax.country?.emoji || '🌍'}
            <span className="truncate max-w-[80px]">{tax.country?.nom_fr || tax.country?.nom || '-'}</span>
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
  nextPage, 
  pageNumbers 
}) {
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
              { label: 'Entreprise associée', value: tax.company?.nom || tax.company?.name || 'Non spécifiée' }
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

  return (
    <div className={`bg-gradient-to-br from-${color}-50 to-white rounded-lg p-4 border border-${color}-200`}>
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

// COMPOSANT MODAL DE FORMULAIRE (version optimisée)
function TaxFormModal({ tax, accounts, companies, pays, onClose, onSuccess }) {
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

    if (!formData.company) {
      setError('L\'entreprise est obligatoire');
      setLoading(false);
      return;
    }

    try {
      const url = tax ? `/compta/taxes/${tax.id}/` : `/compta/taxes/`;
      const method = tax ? 'PUT' : 'POST';

      const response = await apiClient.request(url, {
        method,
        body: JSON.stringify(formData),
        headers: { 'Content-Type': 'application/json' }
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

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-3 z-50 backdrop-blur-sm">
      <div className="bg-white rounded-lg w-full max-w-5xl max-h-[90vh] overflow-y-auto shadow-xl">
        {/* Header */}
        <ModalHeader 
          formData={formData}
          tax={tax}
          onClose={onClose}
        />
        
        {error && <FormError error={error} />}
        
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {/* Section 1: Informations de Base */}
          <FormSection 
            title="Informations de Base"
            color="violet"
            icon={FiPercent}
          >
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
              <div className="lg:col-span-2">
                <FormInput
                  label="Nom du Taux"
                  required
                  value={formData.name}
                  onChange={(e) => handleChange('name', e.target.value)}
                  placeholder="Ex: TVA 18%, IS 30%..."
                />
              </div>
              
              <FormSelect
                label="Type de Montant"
                required
                value={formData.amount_type}
                onChange={(e) => handleChange('amount_type', e.target.value)}
                options={[
                  { value: 'percent', label: 'Pourcentage (%)' },
                  { value: 'fixed', label: 'Montant fixe (FCFA)' }
                ]}
              />
              
              <FormInput
                label="Valeur"
                required
                type="number"
                min="0"
                step={formData.amount_type === 'percent' ? "0.01" : "1"}
                value={formData.amount}
                onChange={(e) => handleChange('amount', parseFloat(e.target.value))}
                placeholder={formData.amount_type === 'percent' ? "18.00" : "1000"}
                suffix={formData.amount_type === 'percent' ? '%' : 'FCFA'}
              />
            </div>
          </FormSection>

          {/* Section 2: Utilisation fiscale */}
          <FormSection 
            title="Utilisation Fiscale"
            color="green"
            icon={FiTrendingUp}
          >
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
              <FormSelect
                label="Type d'utilisation"
                required
                value={formData.type_tax_use}
                onChange={(e) => handleChange('type_tax_use', e.target.value)}
                options={[
                  { value: 'sale', label: 'Vente' },
                  { value: 'purchase', label: 'Achat' },
                  { value: 'none', label: 'Aucune' }
                ]}
              />
              
              <SearchableDropdown
                label="Entreprise"
                value={formData.company}
                onChange={(value) => handleChange('company', value)}
                options={companiesArray}
                searchValue={searchCompany}
                onSearchChange={setSearchCompany}
                placeholder="Sélectionnez une entreprise"
                required
                icon={FiCreditCard}
                getOptionLabel={(company) => company.nom || company.name || ''}
                getOptionValue={(company) => company.id}
              />
            </div>
          </FormSection>

          {/* Section 3: Configuration comptable */}
          <FormSection 
            title="Configuration Comptable"
            color="blue"
            icon={FiCreditCard}
          >
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
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
          </FormSection>

          {/* Section 4: Localisation */}
          <FormSection 
            title="Localisation"
            color="cyan"
            icon={FiGlobe}
          >
            <div className="grid grid-cols-1 gap-3">
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
          </FormSection>
          
          {/* Boutons d'action */}
          <FormActions 
            loading={loading}
            onClose={onClose}
            tax={tax}
          />
        </form>
      </div>
    </div>
  );
}

function ModalHeader({ formData, tax, onClose }) {
  const getHeaderColor = (type) => {
    switch(type) {
      case 'sale': return 'from-green-600 to-green-500';
      case 'purchase': return 'from-amber-600 to-amber-500';
      default: return 'from-violet-600 to-violet-500';
    }
  };

  return (
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
  );
}

function FormError({ error }) {
  return (
    <div className="mx-4 mt-3 bg-gradient-to-r from-red-50 to-red-100 border-l-3 border-red-500 rounded-r-lg p-3">
      <div className="flex items-center gap-2">
        <div className="p-1.5 bg-red-100 rounded">
          <FiX className="text-red-600" size={14} />
        </div>
        <span className="text-red-800 text-xs font-medium whitespace-pre-line">{error}</span>
      </div>
    </div>
  );
}

function FormSection({ title, color, icon: Icon, children }) {
  const colorClasses = {
    violet: 'from-gray-50 to-white border-gray-200',
    green: 'from-green-50 to-white border-green-100',
    blue: 'from-blue-50 to-white border-blue-100',
    cyan: 'from-cyan-50 to-white border-cyan-100'
  };

  const barColors = {
    violet: 'from-violet-600 to-violet-400',
    green: 'from-green-600 to-green-400',
    blue: 'from-blue-600 to-blue-400',
    cyan: 'from-cyan-600 to-cyan-400'
  };

  return (
    <div className={`bg-gradient-to-br ${colorClasses[color]} rounded-lg p-3 border`}>
      <div className="flex items-center gap-2 mb-3">
        <div className={`w-1 h-4 bg-gradient-to-b ${barColors[color]} rounded`}></div>
        <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
      </div>
      {children}
    </div>
  );
}

function FormInput({ label, required, type = "text", value, onChange, placeholder, suffix, ...props }) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-700 mb-1">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      <div className="relative">
        <input
          type={type}
          required={required}
          value={value}
          onChange={onChange}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-violet-500 focus:border-transparent bg-white text-sm"
          placeholder={placeholder}
          {...props}
        />
        {suffix && (
          <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 text-sm">
            {suffix}
          </span>
        )}
      </div>
    </div>
  );
}

function FormSelect({ label, required, value, onChange, options }) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-700 mb-1">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      <select
        value={value}
        onChange={onChange}
        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-violet-500 focus:border-transparent bg-white text-sm"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}

function FormActions({ loading, onClose, tax }) {
  return (
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
  );
}

// COMPOSANT SEARCHABLE DROPDOWN (identique à la version précédente)
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