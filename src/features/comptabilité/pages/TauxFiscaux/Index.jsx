// C:\Users\senio\Documents\somane_frontend\src\features\comptabilité\pages\TauxFiscaux\Index.jsx

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FiPlus,
  FiFilter,
  FiX,
  FiChevronLeft,
  FiChevronRight,
  FiChevronsLeft,
  FiChevronsRight,
  FiArrowUp,
  FiArrowDown,
  FiAlertCircle,
  FiSettings,
  FiCopy,
  FiTrash2,
  FiMoreHorizontal,
  FiPercent,
  FiTrendingUp,
  FiShoppingCart,
  FiTag,
  FiEye,
  FiEdit,
  FiBriefcase,
  FiCheck
} from 'react-icons/fi';
import { useEntity } from '../../../../context/EntityContext';
import { apiClient } from '../../../../services/apiClient';
import { authService } from '../../../../services/authService';

// ==========================================
// COMPOSANT TOOLTIP
// ==========================================
const Tooltip = ({ children, text, position = 'top' }) => {
  const [show, setShow] = useState(false);
  return (
    <div className="relative inline-block">
      <div onMouseEnter={() => setShow(true)} onMouseLeave={() => setShow(false)}>{children}</div>
      {show && (
        <div className={`absolute z-50 px-2 py-1 text-xs text-white bg-gray-800 rounded whitespace-nowrap ${
          position === 'top' ? 'bottom-full left-1/2 transform -translate-x-1/2 mb-1' :
          position === 'bottom' ? 'top-full left-1/2 transform -translate-x-1/2 mt-1' :
          position === 'left' ? 'right-full top-1/2 transform -translate-y-1/2 mr-1' :
          'left-full top-1/2 transform -translate-y-1/2 ml-1'
        }`}>
          {text}
          <div className={`absolute w-2 h-2 bg-gray-800 transform rotate-45 ${
            position === 'top' ? 'top-full left-1/2 -translate-x-1/2 -mt-1' :
            position === 'bottom' ? 'bottom-full left-1/2 -translate-x-1/2 -mb-1' :
            position === 'left' ? 'left-full top-1/2 -translate-y-1/2 -ml-1' :
            'right-full top-1/2 -translate-y-1/2 -mr-1'
          }`} />
        </div>
      )}
    </div>
  );
};

// ==========================================
// COMPOSANT POUR LE TRI
// ==========================================
const SortIcon = ({ column, sortColumn, sortDirection }) => {
  if (sortColumn !== column) return null;
  return sortDirection === 'asc' ? 
    <FiArrowUp size={12} className="ml-1 inline" /> : 
    <FiArrowDown size={12} className="ml-1 inline" />;
};

// ==========================================
// COMPOSANT BADGE ÉTAT
// ==========================================
const StatusBadge = ({ active }) => {
  return active ? (
    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
      Actif
    </span>
  ) : (
    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-500">
      Inactif
    </span>
  );
};

// ==========================================
// COMPOSANT TYPE BADGE
// ==========================================
const TypeBadge = ({ type }) => {
  const config = {
    sale: { bg: 'bg-green-100', text: 'text-green-800', label: 'Vente', icon: FiTrendingUp },
    purchase: { bg: 'bg-amber-100', text: 'text-amber-800', label: 'Achat', icon: FiShoppingCart },
    none: { bg: 'bg-gray-100', text: 'text-gray-800', label: 'Divers', icon: FiAlertCircle }
  }[type] || { bg: 'bg-gray-100', text: 'text-gray-800', label: type || 'Divers', icon: FiAlertCircle };

  const Icon = config.icon;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${config.bg} ${config.text}`}>
      <Icon size={10} />
      {config.label}
    </span>
  );
};

// ==========================================
// COMPOSANT PRINCIPAL
// ==========================================
export default function TauxFiscauxIndex() {
  const navigate = useNavigate();
  const { activeEntity } = useEntity();

  const [taxes, setTaxes] = useState([]);
  const [filteredTaxes, setFilteredTaxes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedTaxIds, setSelectedTaxIds] = useState([]);
  const [activeRowId, setActiveRowId] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(15);
  
  // États pour la recherche
  const [searchText, setSearchText] = useState('');
  const [activeFilters, setActiveFilters] = useState([]);
  const [showFilterMenu, setShowFilterMenu] = useState(false);
  const [showColumnsMenu, setShowColumnsMenu] = useState(false);
  const [showActionsMenu, setShowActionsMenu] = useState(false);
  const [columnsMenuPosition, setColumnsMenuPosition] = useState({ top: 0, left: 0 });
  const filterMenuRef = useRef(null);
  const actionsMenuRef = useRef(null);
  const searchContainerRef = useRef(null);
  
  // États pour les colonnes visibles
  const [visibleColumns, setVisibleColumns] = useState({
    nom: true,
    montant: true,
    type: true,
    entreprise: true,
    pays: true,
    actif: true
  });
  
  // États pour le tri
  const [sortColumn, setSortColumn] = useState('nom');
  const [sortDirection, setSortDirection] = useState('asc');
  
  // États pour les référentiels
  const [accountsMap, setAccountsMap] = useState({});
  const [companiesMap, setCompaniesMap] = useState({});
  const [paysMap, setPaysMap] = useState({});
  const [referentialsLoaded, setReferentialsLoaded] = useState(false);

  // Vérifier l'authentification
  useEffect(() => {
    const isAuthenticated = authService.isAuthenticated();
  }, []);

  // Fermer les menus au clic extérieur
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (filterMenuRef.current && !filterMenuRef.current.contains(event.target)) {
        setShowFilterMenu(false);
      }
      if (actionsMenuRef.current && !actionsMenuRef.current.contains(event.target)) {
        setShowActionsMenu(false);
      }
      const columnsMenuElement = document.getElementById('columns-menu-taxes');
      if (columnsMenuElement && !columnsMenuElement.contains(event.target)) {
        const buttonElement = document.querySelector('.columns-menu-button-taxes');
        if (buttonElement && !buttonElement.contains(event.target)) {
          setShowColumnsMenu(false);
        }
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Charger les référentiels
  useEffect(() => {
    if (!activeEntity) return;

    const loadReferentials = async () => {
      try {
        const accountsRes = await apiClient.get(`/compta/accounts/?company=${activeEntity.id}`).catch(() => ({ data: [] }));
        const accountsData = accountsRes.data?.results || accountsRes.data || [];
        const accountsObj = {};
        accountsData.forEach(a => { accountsObj[a.id] = a; });
        setAccountsMap(accountsObj);

        const companiesRes = await apiClient.get('/entites/').catch(() => ({ data: [] }));
        const companiesData = companiesRes.data?.results || companiesRes.data || [];
        const companiesObj = {};
        companiesData.forEach(c => { companiesObj[c.id] = c; });
        setCompaniesMap(companiesObj);

        const paysRes = await apiClient.get('/pays/').catch(() => ({ data: [] }));
        const paysData = paysRes.data?.results || paysRes.data || [];
        const paysObj = {};
        paysData.forEach(p => { paysObj[p.id] = p; });
        setPaysMap(paysObj);

        setReferentialsLoaded(true);
      } catch (err) {
        console.error('❌ Erreur chargement référentiels:', err);
        setError('Erreur lors du chargement des référentiels');
      } finally {
        setLoading(false);
      }
    };

    loadReferentials();
  }, [activeEntity]);

  // Charger les données
  const loadData = useCallback(async () => {
    if (!activeEntity || !referentialsLoaded) return;

    try {
      setLoading(true);
      setError(null);
      
      const response = await apiClient.get(`/compta/taxes/?company=${activeEntity.id}`);
      
      let taxesData = [];
      if (response) {
        if (Array.isArray(response)) {
          taxesData = response;
        } else if (response.data) {
          if (Array.isArray(response.data)) {
            taxesData = response.data;
          } else if (response.data.results && Array.isArray(response.data.results)) {
            taxesData = response.data.results;
          } else if (response.data.data && Array.isArray(response.data.data)) {
            taxesData = response.data.data;
          }
        }
      }

      const enrichedTaxes = taxesData.map(tax => ({
        ...tax,
        company_detail: tax.company ? (typeof tax.company === 'object' ? tax.company : companiesMap[tax.company]) : null,
        country_detail: tax.country ? (typeof tax.country === 'object' ? tax.country : paysMap[tax.country]) : null,
        account_detail: tax.account ? (typeof tax.account === 'object' ? tax.account : accountsMap[tax.account]) : null,
      }));

      setTaxes(enrichedTaxes);
      setFilteredTaxes(enrichedTaxes);
      setActiveRowId(null);
      setCurrentPage(1);
      
    } catch (err) {
      console.error('❌ Erreur chargement taxes:', err);
      setError('Impossible de charger les taux fiscaux.');
      setTaxes([]);
      setFilteredTaxes([]);
    } finally {
      setLoading(false);
    }
  }, [activeEntity, referentialsLoaded, accountsMap, companiesMap, paysMap]);

  useEffect(() => {
    if (referentialsLoaded && activeEntity) {
      loadData();
    }
  }, [referentialsLoaded, activeEntity, loadData]);

  // Fonction de filtrage
  const applyFiltersToTaxes = (taxesList, filters) => {
    let filtered = [...taxesList];
    
    filters.forEach(filter => {
      filtered = filtered.filter(tax => {
        let fieldValue = '';
        
        switch (filter.field) {
          case 'nom':
            fieldValue = tax.name || '';
            break;
          case 'type':
            fieldValue = tax.type_tax_use || '';
            break;
          case 'montant_type':
            fieldValue = tax.amount_type || '';
            break;
          case 'entreprise':
            fieldValue = tax.company_detail?.nom || tax.company_detail?.raison_sociale || tax.company_detail?.name || '';
            break;
          case 'pays':
            fieldValue = tax.country_detail?.nom_fr || tax.country_detail?.nom || '';
            break;
          case 'actif':
            fieldValue = tax.active ? 'actif' : 'inactif';
            break;
          case 'recherche':
            fieldValue = `${tax.name} ${tax.amount} ${tax.type_tax_use} ${tax.amount_type}`.toLowerCase();
            break;
          default:
            fieldValue = '';
        }
        
        return fieldValue.toLowerCase().includes(filter.value.toLowerCase());
      });
    });
    
    return filtered;
  };

  // Fonction de tri
  const getSortedTaxes = (taxesToSort, column, direction) => {
    return [...taxesToSort].sort((a, b) => {
      let aVal, bVal;
      
      switch (column) {
        case 'nom':
          aVal = a.name || '';
          bVal = b.name || '';
          break;
        case 'montant':
          aVal = a.amount || 0;
          bVal = b.amount || 0;
          break;
        case 'type':
          aVal = a.type_tax_use || '';
          bVal = b.type_tax_use || '';
          break;
        case 'entreprise':
          aVal = a.company_detail?.nom || a.company_detail?.raison_sociale || a.company_detail?.name || '';
          bVal = b.company_detail?.nom || b.company_detail?.raison_sociale || b.company_detail?.name || '';
          break;
        case 'pays':
          aVal = a.country_detail?.nom_fr || a.country_detail?.nom || '';
          bVal = b.country_detail?.nom_fr || b.country_detail?.nom || '';
          break;
        case 'actif':
          aVal = a.active ? 1 : 0;
          bVal = b.active ? 1 : 0;
          break;
        default:
          return 0;
      }
      
      if (aVal < bVal) return direction === 'asc' ? -1 : 1;
      if (aVal > bVal) return direction === 'asc' ? 1 : -1;
      return 0;
    });
  };

  // Gestionnaire de tri
  const handleSort = (column) => {
    let newDirection = sortDirection;
    let newColumn = column;
    
    if (sortColumn === column) {
      newDirection = sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      newColumn = column;
      newDirection = 'asc';
    }
    
    setSortColumn(newColumn);
    setSortDirection(newDirection);
    
    const sorted = getSortedTaxes(filteredTaxes, newColumn, newDirection);
    setFilteredTaxes(sorted);
  };

  // Appliquer les filtres
  useEffect(() => {
    if (taxes.length > 0) {
      const filtered = applyFiltersToTaxes(taxes, activeFilters);
      const sorted = getSortedTaxes(filtered, sortColumn, sortDirection);
      setFilteredTaxes(sorted);
      setCurrentPage(1);
    }
  }, [taxes, activeFilters, sortColumn, sortDirection]);

  // Re-appliquer le tri
  useEffect(() => {
    if (filteredTaxes.length > 0 && (sortColumn || sortDirection)) {
      const sorted = getSortedTaxes(filteredTaxes, sortColumn, sortDirection);
      if (JSON.stringify(sorted) !== JSON.stringify(filteredTaxes)) {
        setFilteredTaxes(sorted);
      }
    }
  }, [sortColumn, sortDirection]);

  // Ajouter une recherche comme filtre
  const addSearchAsFilter = () => {
    if (searchText.trim()) {
      setActiveFilters([...activeFilters, { field: 'recherche', value: searchText }]);
      setSearchText('');
    }
  };

  // Ajouter un filtre
  const addFilter = (field, value) => {
    setActiveFilters([...activeFilters, { field, value }]);
    setShowFilterMenu(false);
  };

  // Supprimer un filtre
  const removeFilter = (index) => {
    setActiveFilters(activeFilters.filter((_, i) => i !== index));
  };

  // Effacer tous les filtres
  const clearAllFilters = () => {
    setActiveFilters([]);
    setSearchText('');
  };

  // Actions groupées
  const handleBulkDelete = async () => {
    if (selectedTaxIds.length === 0) {
      alert('Aucun taux sélectionné');
      return;
    }
    if (!window.confirm(`Supprimer ${selectedTaxIds.length} taux fiscal/aux ?`)) return;
    setShowActionsMenu(false);
    try {
      for (const id of selectedTaxIds) {
        await apiClient.delete(`/compta/taxes/${id}/?company=${activeEntity.id}`);
      }
      setSelectedTaxIds([]);
      loadData();
    } catch (err) {
      alert('Erreur suppression: ' + (err.message || 'Erreur inconnue'));
    }
  };

  const handleBulkActivate = async () => {
    if (selectedTaxIds.length === 0) return;
    setShowActionsMenu(false);
    try {
      for (const id of selectedTaxIds) {
        await apiClient.patch(`/compta/taxes/${id}/`, { active: true });
      }
      loadData();
    } catch (err) {
      alert('Erreur: ' + (err.message || 'Erreur inconnue'));
    }
  };

  const handleBulkDeactivate = async () => {
    if (selectedTaxIds.length === 0) return;
    setShowActionsMenu(false);
    try {
      for (const id of selectedTaxIds) {
        await apiClient.patch(`/compta/taxes/${id}/`, { active: false });
      }
      loadData();
    } catch (err) {
      alert('Erreur: ' + (err.message || 'Erreur inconnue'));
    }
  };

  const handleDuplicate = async () => {
    if (selectedTaxIds.length === 0) {
      alert('Aucun taux sélectionné');
      return;
    }
    setShowActionsMenu(false);
    try {
      for (const id of selectedTaxIds) {
        const original = taxes.find(t => t.id === id);
        if (original) {
          const newTax = {
            ...original,
            name: `${original.name} (Copie)`,
            id: undefined,
            created_at: undefined,
            updated_at: undefined
          };
          await apiClient.post('/compta/taxes/', newTax);
        }
      }
      loadData();
      alert(`${selectedTaxIds.length} taux dupliqué(s) avec succès`);
    } catch (err) {
      alert('Erreur duplication: ' + (err.message || 'Erreur inconnue'));
    }
  };

  // Pagination
  const totalPages = Math.ceil(filteredTaxes.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedTaxes = filteredTaxes.slice(startIndex, startIndex + itemsPerPage);

  // Définition des colonnes (sans Actions et sans Ordre)
  const columns = [
    { id: 'nom', label: 'Nom', width: '200px' },
    { id: 'montant', label: 'Montant', width: '120px', align: 'right' },
    { id: 'type', label: 'Type', width: '100px' },
    { id: 'entreprise', label: 'Entreprise', width: '160px' },
    { id: 'pays', label: 'Pays', width: '120px' },
    { id: 'actif', label: 'Statut', width: '80px' }
  ];

  if (!activeEntity) {
    return (
      <div className="min-h-screen bg-gray-50 p-4">
        <div className="max-w-7xl mx-auto bg-white border border-gray-300">
          <div className="border-b border-gray-300 px-4 py-3">
            <div className="text-lg font-bold text-gray-900">Taux Fiscaux</div>
          </div>
          <div className="p-8">
            <div className="bg-yellow-50 border border-yellow-200 rounded p-6 text-center">
              <FiAlertCircle className="text-yellow-600 mx-auto mb-3" size={32} />
              <p className="text-yellow-800 font-medium text-lg mb-3">Aucune entité sélectionnée</p>
              <p className="text-sm text-gray-600 mb-4">Veuillez sélectionner une entité pour voir les taux fiscaux.</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (loading && taxes.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 p-4">
        <div className="max-w-7xl mx-auto bg-white border border-gray-300">
          <div className="border-b border-gray-300 px-4 py-3">
            <div className="text-lg font-bold text-gray-900">Taux Fiscaux</div>
          </div>
          <div className="p-8 flex items-center justify-center">
            <div className="text-center">
              <div className="w-8 h-8 border-2 border-purple-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
              <p className="mt-4 text-gray-600 text-sm">Chargement...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-full mx-auto bg-white border border-gray-300">
        
        {/* En-tête */}
        <div className="border-b border-gray-300 px-4 py-2">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 flex-shrink-0">
              <Tooltip text="Créer un nouveau taux fiscal">
                <button
                  onClick={() => navigate('/comptabilite/taux-fiscaux/create')}
                  className="h-8 px-3 bg-purple-600 text-white text-xs font-medium hover:bg-purple-700 hover:scale-105 transition-all duration-200 rounded flex items-center gap-1"
                >
                  <FiPlus size={12} /> Nouveau taux
                </button>
              </Tooltip>
              <Tooltip text="Actualiser la liste">
                <h1 
                  className="text-lg font-bold text-gray-900 cursor-pointer hover:text-purple-600 hover:scale-105 transition-all duration-200"
                  onClick={loadData}
                >
                  Taux Fiscaux
                </h1>
              </Tooltip>
              
              {/* Menu Actions */}
              <div className="relative" ref={actionsMenuRef}>
                <Tooltip text="Menu des actions">
                  <button
                    onClick={() => setShowActionsMenu(!showActionsMenu)}
                    className="w-8 h-8 rounded-full border border-gray-300 text-gray-700 hover:bg-gray-50 hover:scale-110 hover:shadow-md active:scale-90 transition-all duration-200 flex items-center justify-center"
                  >
                    <FiSettings size={14} />
                  </button>
                </Tooltip>
                {showActionsMenu && (
                  <div className="absolute left-0 mt-1 w-48 bg-white border border-gray-300 shadow-lg rounded z-50">
                    <Tooltip text="Dupliquer les taux sélectionnés" position="right">
                      <button
                        onClick={handleDuplicate}
                        className="w-full px-3 py-2 text-xs text-left hover:bg-gray-50 flex items-center gap-2"
                      >
                        <FiCopy size={12} /> Dupliquer
                      </button>
                    </Tooltip>
                    <Tooltip text="Activer les taux sélectionnés" position="right">
                      <button
                        onClick={handleBulkActivate}
                        className="w-full px-3 py-2 text-xs text-left hover:bg-green-50 hover:text-green-600 flex items-center gap-2"
                      >
                        <FiCheck size={12} /> Activer
                      </button>
                    </Tooltip>
                    <Tooltip text="Désactiver les taux sélectionnés" position="right">
                      <button
                        onClick={handleBulkDeactivate}
                        className="w-full px-3 py-2 text-xs text-left hover:bg-yellow-50 hover:text-yellow-600 flex items-center gap-2"
                      >
                        <FiX size={12} /> Désactiver
                      </button>
                    </Tooltip>
                    <Tooltip text="Supprimer les taux sélectionnés" position="right">
                      <button
                        onClick={handleBulkDelete}
                        className="w-full px-3 py-2 text-xs text-left hover:bg-red-50 hover:text-red-600 flex items-center gap-2"
                      >
                        <FiTrash2 size={12} /> Supprimer
                      </button>
                    </Tooltip>
                  </div>
                )}
              </div>
            </div>
            
            {/* Barre de recherche centrée */}
            <div className="flex-1 flex justify-center">
              <div className="relative w-full max-w-2xl" ref={searchContainerRef}>
                <div className="flex items-center flex-wrap border border-gray-300 rounded bg-white min-h-[38px] p-1">
                  {activeFilters.map((filter, index) => {
                    let displayText = '';
                    let displayColor = '';
                    switch (filter.field) {
                      case 'recherche':
                        displayText = filter.value;
                        displayColor = 'bg-blue-100 text-blue-700';
                        break;
                      case 'type':
                        displayText = filter.value === 'sale' ? 'Vente' : filter.value === 'purchase' ? 'Achat' : filter.value;
                        displayColor = filter.value === 'sale' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700';
                        break;
                      case 'montant_type':
                        displayText = filter.value === 'percent' ? 'Pourcentage' : 'Montant fixe';
                        displayColor = 'bg-purple-100 text-purple-700';
                        break;
                      case 'actif':
                        displayText = filter.value === 'actif' ? 'Actif' : 'Inactif';
                        displayColor = filter.value === 'actif' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700';
                        break;
                      default:
                        displayText = `${filter.field}: ${filter.value}`;
                        displayColor = 'bg-gray-100 text-gray-700';
                    }
                    return (
                      <span key={index} className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs ${displayColor} m-0.5`}>
                        {displayText}
                        <button onClick={() => removeFilter(index)} className="hover:text-red-600">
                          <FiX size={10} />
                        </button>
                      </span>
                    );
                  })}
                  
                  <input
                    type="text"
                    value={searchText}
                    onChange={(e) => setSearchText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        addSearchAsFilter();
                      }
                    }}
                    placeholder="Rechercher par nom, montant..."
                    className="flex-1 px-2 py-1 text-sm focus:outline-none min-w-[120px]"
                  />
                  
                  <div className="relative" ref={filterMenuRef}>
                    <Tooltip text="Ajouter un filtre">
                      <button
                        onClick={() => setShowFilterMenu(!showFilterMenu)}
                        className={`p-1.5 rounded hover:bg-gray-100 ${showFilterMenu ? 'bg-gray-100' : ''}`}
                      >
                        <FiFilter size={14} className={activeFilters.length > 0 ? 'text-purple-600' : 'text-gray-400'} />
                      </button>
                    </Tooltip>
                    
                    {showFilterMenu && (
                      <div className="absolute right-0 mt-1 w-64 bg-white border border-gray-300 shadow-lg rounded z-50">
                        <div className="p-2 border-b border-gray-200">
                          <p className="text-xs font-medium text-gray-700 mb-2">Ajouter un filtre</p>
                          <div className="space-y-2">
                            <button
                              onClick={() => addFilter('type', 'sale')}
                              className="w-full text-left text-xs px-2 py-1 hover:bg-gray-100 rounded flex items-center gap-2"
                            >
                              <span className="w-16">Type</span>
                              <span className="text-green-600">= Vente</span>
                            </button>
                            <button
                              onClick={() => addFilter('type', 'purchase')}
                              className="w-full text-left text-xs px-2 py-1 hover:bg-gray-100 rounded flex items-center gap-2"
                            >
                              <span className="w-16">Type</span>
                              <span className="text-amber-600">= Achat</span>
                            </button>
                            <button
                              onClick={() => addFilter('montant_type', 'percent')}
                              className="w-full text-left text-xs px-2 py-1 hover:bg-gray-100 rounded flex items-center gap-2"
                            >
                              <span className="w-16">Montant</span>
                              <span className="text-purple-600">= Pourcentage</span>
                            </button>
                            <button
                              onClick={() => addFilter('montant_type', 'fixed')}
                              className="w-full text-left text-xs px-2 py-1 hover:bg-gray-100 rounded flex items-center gap-2"
                            >
                              <span className="w-16">Montant</span>
                              <span className="text-blue-600">= Montant fixe</span>
                            </button>
                            <button
                              onClick={() => addFilter('actif', 'actif')}
                              className="w-full text-left text-xs px-2 py-1 hover:bg-gray-100 rounded flex items-center gap-2"
                            >
                              <span className="w-16">Statut</span>
                              <span className="text-green-600">= Actif</span>
                            </button>
                            <button
                              onClick={() => addFilter('actif', 'inactif')}
                              className="w-full text-left text-xs px-2 py-1 hover:bg-gray-100 rounded flex items-center gap-2"
                            >
                              <span className="w-16">Statut</span>
                              <span className="text-gray-600">= Inactif</span>
                            </button>
                          </div>
                        </div>
                        {activeFilters.length > 0 && (
                          <div className="p-2 border-t border-gray-200">
                            <button
                              onClick={clearAllFilters}
                              className="w-full text-xs text-red-600 hover:text-red-700 text-center py-1"
                            >
                              Effacer tous les filtres
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-2 flex-shrink-0">
              <span className="text-xs text-gray-500">Afficher</span>
              <select
                value={itemsPerPage}
                onChange={(e) => setItemsPerPage(Number(e.target.value))}
                className="h-8 px-2 border border-gray-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-purple-500"
              >
                <option value={10}>10</option>
                <option value={15}>15</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
              <span className="text-xs text-gray-500">lignes</span>
            </div>
          </div>
        </div>

        {/* Actions groupées */}
        {selectedTaxIds.length > 0 && (
          <div className="border-b border-gray-300 px-4 py-2 bg-gray-50 flex items-center gap-2">
            <span className="text-xs text-gray-600">{selectedTaxIds.length} taux sélectionné(s)</span>
            <Tooltip text="Activer les taux sélectionnés">
              <button
                onClick={handleBulkActivate}
                className="h-6 px-2 bg-green-600 text-white text-xs hover:bg-green-700 rounded"
              >
                Activer
              </button>
            </Tooltip>
            <Tooltip text="Désactiver les taux sélectionnés">
              <button
                onClick={handleBulkDeactivate}
                className="h-6 px-2 bg-yellow-600 text-white text-xs hover:bg-yellow-700 rounded"
              >
                Désactiver
              </button>
            </Tooltip>
            <Tooltip text="Supprimer les taux sélectionnés">
              <button
                onClick={handleBulkDelete}
                className="h-6 px-2 bg-red-600 text-white text-xs hover:bg-red-700 rounded"
              >
                Supprimer
              </button>
            </Tooltip>
          </div>
        )}

        {/* Tableau */}
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="bg-gray-100 border-b border-gray-300">
                <th className="border-r border-gray-300 px-2 py-1.5 w-8 text-center">
                  <input
                    type="checkbox"
                    checked={selectedTaxIds.length === paginatedTaxes.length && paginatedTaxes.length > 0}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedTaxIds(paginatedTaxes.map(t => t.id));
                      } else {
                        setSelectedTaxIds([]);
                      }
                    }}
                    className="w-3.5 h-3.5 cursor-pointer"
                  />
                </th>
                {visibleColumns.nom && (
                  <th 
                    className="border-r border-gray-300 px-2 py-1.5 text-left text-xs font-medium text-gray-700 cursor-pointer hover:bg-gray-200 min-w-[200px]"
                    onClick={() => handleSort('nom')}
                  >
                    <div className="flex items-center gap-1">
                      <FiTag size={12} />
                      <span>Nom</span>
                      <SortIcon column="nom" sortColumn={sortColumn} sortDirection={sortDirection} />
                    </div>
                  </th>
                )}
                {visibleColumns.montant && (
                  <th 
                    className="border-r border-gray-300 px-2 py-1.5 text-right text-xs font-medium text-gray-700 cursor-pointer hover:bg-gray-200 min-w-[120px]"
                    onClick={() => handleSort('montant')}
                  >
                    <div className="flex items-center justify-end gap-1">
                      <FiPercent size={12} />
                      <span>Montant</span>
                      <SortIcon column="montant" sortColumn={sortColumn} sortDirection={sortDirection} />
                    </div>
                  </th>
                )}
                {visibleColumns.type && (
                  <th 
                    className="border-r border-gray-300 px-2 py-1.5 text-left text-xs font-medium text-gray-700 cursor-pointer hover:bg-gray-200 min-w-[100px]"
                    onClick={() => handleSort('type')}
                  >
                    <div className="flex items-center gap-1">
                      <span>Type</span>
                      <SortIcon column="type" sortColumn={sortColumn} sortDirection={sortDirection} />
                    </div>
                  </th>
                )}
                {visibleColumns.entreprise && (
                  <th 
                    className="border-r border-gray-300 px-2 py-1.5 text-left text-xs font-medium text-gray-700 cursor-pointer hover:bg-gray-200 min-w-[160px]"
                    onClick={() => handleSort('entreprise')}
                  >
                    <div className="flex items-center gap-1">
                      <FiBriefcase size={12} />
                      <span>Entreprise</span>
                      <SortIcon column="entreprise" sortColumn={sortColumn} sortDirection={sortDirection} />
                    </div>
                  </th>
                )}
                {visibleColumns.pays && (
                  <th 
                    className="border-r border-gray-300 px-2 py-1.5 text-left text-xs font-medium text-gray-700 cursor-pointer hover:bg-gray-200 min-w-[120px]"
                    onClick={() => handleSort('pays')}
                  >
                    <div className="flex items-center gap-1">
                      <span>Pays</span>
                      <SortIcon column="pays" sortColumn={sortColumn} sortDirection={sortDirection} />
                    </div>
                  </th>
                )}
                {visibleColumns.actif && (
                  <th 
                    className="border-r border-gray-300 px-2 py-1.5 text-left text-xs font-medium text-gray-700 cursor-pointer hover:bg-gray-200 min-w-[80px]"
                    onClick={() => handleSort('actif')}
                  >
                    <div className="flex items-center gap-1">
                      <span>Statut</span>
                      <SortIcon column="actif" sortColumn={sortColumn} sortDirection={sortDirection} />
                    </div>
                  </th>
                )}
                {/* Dernière colonne avec les trois points pour les colonnes (pas de colonne Actions) */}
                <th className="border-l border-gray-300 px-2 py-1.5 w-10 text-center">
                  <Tooltip text="Choisir les colonnes à afficher">
                    <button
                      className="columns-menu-button-taxes p-1 rounded hover:bg-gray-200"
                      onClick={(e) => {
                        e.stopPropagation();
                        const rect = e.currentTarget.getBoundingClientRect();
                        setColumnsMenuPosition({
                          top: rect.bottom + window.scrollY + 5,
                          left: rect.right - 200
                        });
                        setShowColumnsMenu(!showColumnsMenu);
                      }}
                    >
                      <FiMoreHorizontal size={16} className="text-gray-500" />
                    </button>
                  </Tooltip>
                </th>
              </tr>
            </thead>
            <tbody>
              {error ? (
                <tr>
                  <td colSpan={Object.values(visibleColumns).filter(v => v).length + 2} className="border border-gray-300 p-4 text-center text-red-600 text-sm">
                    {error}
                  </td>
                </tr>
              ) : paginatedTaxes.length === 0 ? (
                <tr>
                  <td colSpan={Object.values(visibleColumns).filter(v => v).length + 2} className="border border-gray-300 p-8 text-center text-gray-500 text-sm">
                    {activeFilters.length > 0 ? 'Aucun résultat pour ces filtres' : 'Aucun taux fiscal'}
                  </td>
                </tr>
              ) : (
                paginatedTaxes.map((tax) => (
                  <tr
                    key={tax.id}
                    className={`hover:bg-gray-50 cursor-pointer transition-colors ${activeRowId === tax.id ? 'bg-purple-50' : ''}`}
                    onClick={() => setActiveRowId(tax.id)}
                    onDoubleClick={() => navigate(`/comptabilite/taux-fiscaux/${tax.id}`)}
                  >
                    <td className="border border-gray-300 px-2 py-1.5 text-center" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={selectedTaxIds.includes(tax.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedTaxIds([...selectedTaxIds, tax.id]);
                          } else {
                            setSelectedTaxIds(selectedTaxIds.filter(id => id !== tax.id));
                          }
                        }}
                        className="w-3.5 h-3.5 cursor-pointer"
                      />
                    </td>
                    {visibleColumns.nom && (
                      <td className="border border-gray-300 px-2 py-1.5">
                        <div className="flex items-center gap-2">
                          <FiTag className="text-gray-400" size={14} />
                          <div>
                            <div className="text-xs font-semibold text-gray-900">{tax.name || '—'}</div>
                            <div className="text-xs text-gray-500">
                              {tax.amount_type === 'percent' ? 'Pourcentage' : 'Montant fixe'}
                            </div>
                          </div>
                        </div>
                      </td>
                    )}
                    {visibleColumns.montant && (
                      <td className="border border-gray-300 px-2 py-1.5 text-right">
                        {tax.amount_type === 'percent' ? (
                          <span className="px-2 py-0.5 bg-purple-50 text-purple-700 rounded-full border border-purple-200 text-xs font-medium font-mono">
                            {tax.amount}%
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 bg-green-50 text-green-700 rounded-full border border-green-200 text-xs font-medium">
                            {tax.amount?.toLocaleString('fr-FR')} FCFA
                          </span>
                        )}
                      </td>
                    )}
                    {visibleColumns.type && (
                      <td className="border border-gray-300 px-2 py-1.5">
                        <TypeBadge type={tax.type_tax_use} />
                      </td>
                    )}
                    {visibleColumns.entreprise && (
                      <td className="border border-gray-300 px-2 py-1.5">
                        <div className="flex items-center gap-1.5">
                          <FiBriefcase className="text-gray-400" size={12} />
                          <span className="text-xs text-gray-900 truncate max-w-[120px]">
                            {tax.company_detail?.nom || tax.company_detail?.raison_sociale || tax.company_detail?.name || '-'}
                          </span>
                        </div>
                      </td>
                    )}
                    {visibleColumns.pays && (
                      <td className="border border-gray-300 px-2 py-1.5">
                        <div className="flex items-center gap-1.5">
                          <span className="text-base">{tax.country_detail?.emoji || '🌍'}</span>
                          <span className="text-xs text-gray-600 truncate max-w-[80px]">
                            {tax.country_detail?.nom_fr || tax.country_detail?.nom || '-'}
                          </span>
                        </div>
                      </td>
                    )}
                    {visibleColumns.actif && (
                      <td className="border border-gray-300 px-2 py-1.5">
                        <StatusBadge active={tax.active} />
                      </td>
                    )}
                    <td className="border border-gray-300 px-2 py-1.5"></td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Menu colonnes flottant */}
        {showColumnsMenu && (
          <div 
            id="columns-menu-taxes"
            className="fixed bg-white border border-gray-300 shadow-lg rounded z-50"
            style={{ top: columnsMenuPosition.top, left: columnsMenuPosition.left, width: '200px' }}
          >
            <div className="p-2 border-b border-gray-200">
              <p className="text-xs font-medium text-gray-700 mb-2">Colonnes à afficher</p>
              {columns.map(col => (
                <label key={col.id} className="flex items-center gap-2 py-1 px-2 hover:bg-gray-50 rounded cursor-pointer">
                  <input
                    type="checkbox"
                    checked={visibleColumns[col.id]}
                    onChange={() => setVisibleColumns({ ...visibleColumns, [col.id]: !visibleColumns[col.id] })}
                    className="w-3.5 h-3.5 cursor-pointer"
                  />
                  <span className="text-xs">{col.label}</span>
                </label>
              ))}
            </div>
            <div className="p-2">
              <button
                onClick={() => {
                  const allTrue = {};
                  columns.forEach(col => { allTrue[col.id] = true; });
                  setVisibleColumns(allTrue);
                }}
                className="w-full text-xs text-purple-600 hover:text-purple-700 text-center py-1"
              >
                Tout afficher
              </button>
              <button
                onClick={() => {
                  const allFalse = {};
                  columns.forEach(col => { allFalse[col.id] = false; });
                  setVisibleColumns(allFalse);
                }}
                className="w-full text-xs text-gray-500 hover:text-gray-600 text-center py-1"
              >
                Tout masquer
              </button>
            </div>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="border-t border-gray-300 px-4 py-2 flex items-center justify-between">
            <div className="text-xs text-gray-500">
              Page {currentPage} sur {totalPages} ({filteredTaxes.length} total)
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setCurrentPage(1)}
                disabled={currentPage === 1}
                className="p-1 rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <FiChevronsLeft size={14} />
              </button>
              <button
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className="p-1 rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <FiChevronLeft size={14} />
              </button>
              <span className="px-2 text-xs text-gray-700">
                {currentPage} / {totalPages}
              </span>
              <button
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
                className="p-1 rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <FiChevronRight size={14} />
              </button>
              <button
                onClick={() => setCurrentPage(totalPages)}
                disabled={currentPage === totalPages}
                className="p-1 rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <FiChevronsRight size={14} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}