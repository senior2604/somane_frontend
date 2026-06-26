// src/features/comptabilité/pages/WithholdingTaxes/Index.jsx
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
  FiCreditCard,
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
// COMPOSANT TYPE BADGE (Type de retenue)
// ==========================================
const WithholdingTypeBadge = ({ type }) => {
  const config = {
    partial: { bg: 'bg-amber-100', text: 'text-amber-800', label: 'Partielle', icon: FiPercent },
    full: { bg: 'bg-red-100', text: 'text-red-800', label: 'Totale', icon: FiCreditCard }
  }[type] || { bg: 'bg-gray-100', text: 'text-gray-800', label: type || '—', icon: FiAlertCircle };

  const Icon = config.icon;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${config.bg} ${config.text}`}>
      <Icon size={10} />
      {config.label}
    </span>
  );
};

// ==========================================
// COMPOSANT BASE BADGE (Base de calcul)
// ==========================================
const ScopeBadge = ({ scope }) => {
  const config = {
    percent: { bg: 'bg-purple-100', text: 'text-purple-800', label: '%' },
    fixed: { bg: 'bg-blue-100', text: 'text-blue-800', label: 'Fixe' }
  }[scope] || { bg: 'bg-gray-100', text: 'text-gray-800', label: '—' };

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${config.bg} ${config.text}`}>
      {config.label}
    </span>
  );
};

// ==========================================
// COMPOSANT PRINCIPAL
// ==========================================
export default function WithholdingTaxesIndex() {
  const navigate = useNavigate();
  const { activeEntity } = useEntity();

  const [withholdingTaxes, setWithholdingTaxes] = useState([]);
  const [filteredTaxes, setFilteredTaxes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedIds, setSelectedIds] = useState([]);
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
    taux: true,
    type: true,
    base: true,
    entreprise: true,
    actif: true
  });
  
  // États pour le tri
  const [sortColumn, setSortColumn] = useState('nom');
  const [sortDirection, setSortDirection] = useState('asc');
  
  // États pour les référentiels
  const [accountsMap, setAccountsMap] = useState({});
  const [companiesMap, setCompaniesMap] = useState({});
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
      const columnsMenuElement = document.getElementById('columns-menu-withholding');
      if (columnsMenuElement && !columnsMenuElement.contains(event.target)) {
        const buttonElement = document.querySelector('.columns-menu-button-withholding');
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
        const accountsRes = await apiClient.get(`/compta/accounts/?company=${activeEntity.id}&exclude_roots=true`).catch(() => ({ data: [] }));
        const accountsData = accountsRes.data?.results || accountsRes.data || [];
        const accountsObj = {};
        accountsData.forEach(a => { accountsObj[a.id] = a; });
        setAccountsMap(accountsObj);

        const companiesRes = await apiClient.get('/entites/').catch(() => ({ data: [] }));
        const companiesData = companiesRes.data?.results || companiesRes.data || [];
        const companiesObj = {};
        companiesData.forEach(c => { companiesObj[c.id] = c; });
        setCompaniesMap(companiesObj);

        setReferentialsLoaded(true);
      } catch (err) {
        console.error('❌ Erreur chargement référentiels:', err);
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
      
      const response = await apiClient.get(`/compta/withholding-taxes/?company_id=${activeEntity.id}`);
      
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
        company_detail: tax.company_id ? (typeof tax.company_id === 'object' ? tax.company_id : companiesMap[tax.company_id]) : null,
        account_detail: tax.account_id ? (typeof tax.account_id === 'object' ? tax.account_id : accountsMap[tax.account_id]) : null,
      }));

      setWithholdingTaxes(enrichedTaxes);
      setFilteredTaxes(enrichedTaxes);
      setActiveRowId(null);
      setCurrentPage(1);
      
    } catch (err) {
      console.error('❌ Erreur chargement retenues:', err);
      setError('Impossible de charger les retenues à la source.');
      setWithholdingTaxes([]);
      setFilteredTaxes([]);
    } finally {
      setLoading(false);
    }
  }, [activeEntity, referentialsLoaded, accountsMap, companiesMap]);

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
            fieldValue = tax.withholding_type || '';
            break;
          case 'base':
            fieldValue = tax.withholding_scope || '';
            break;
          case 'entreprise':
            fieldValue = tax.company_detail?.nom || tax.company_detail?.raison_sociale || tax.company_detail?.name || '';
            break;
          case 'actif':
            fieldValue = tax.active ? 'actif' : 'inactif';
            break;
          case 'recherche':
            fieldValue = `${tax.name} ${tax.amount} ${tax.withholding_type} ${tax.withholding_scope}`.toLowerCase();
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
        case 'taux':
          aVal = a.amount || 0;
          bVal = b.amount || 0;
          break;
        case 'type':
          aVal = a.withholding_type || '';
          bVal = b.withholding_type || '';
          break;
        case 'base':
          aVal = a.withholding_scope || '';
          bVal = b.withholding_scope || '';
          break;
        case 'entreprise':
          aVal = a.company_detail?.nom || a.company_detail?.raison_sociale || a.company_detail?.name || '';
          bVal = b.company_detail?.nom || b.company_detail?.raison_sociale || b.company_detail?.name || '';
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
    if (withholdingTaxes.length > 0) {
      const filtered = applyFiltersToTaxes(withholdingTaxes, activeFilters);
      const sorted = getSortedTaxes(filtered, sortColumn, sortDirection);
      setFilteredTaxes(sorted);
      setCurrentPage(1);
    }
  }, [withholdingTaxes, activeFilters, sortColumn, sortDirection]);

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
    if (selectedIds.length === 0) {
      alert('Aucune retenue sélectionnée');
      return;
    }
    if (!window.confirm(`Supprimer ${selectedIds.length} retenue(s) ?`)) return;
    setShowActionsMenu(false);
    try {
      for (const id of selectedIds) {
        await apiClient.delete(`/compta/withholding-taxes/${id}/`);
      }
      setSelectedIds([]);
      loadData();
    } catch (err) {
      alert('Erreur suppression: ' + (err.message || 'Erreur inconnue'));
    }
  };

  const handleBulkActivate = async () => {
    if (selectedIds.length === 0) return;
    setShowActionsMenu(false);
    try {
      for (const id of selectedIds) {
        await apiClient.patch(`/compta/withholding-taxes/${id}/`, { active: true });
      }
      loadData();
    } catch (err) {
      alert('Erreur: ' + (err.message || 'Erreur inconnue'));
    }
  };

  const handleBulkDeactivate = async () => {
    if (selectedIds.length === 0) return;
    setShowActionsMenu(false);
    try {
      for (const id of selectedIds) {
        await apiClient.patch(`/compta/withholding-taxes/${id}/`, { active: false });
      }
      loadData();
    } catch (err) {
      alert('Erreur: ' + (err.message || 'Erreur inconnue'));
    }
  };

  const handleDuplicate = async () => {
    if (selectedIds.length === 0) {
      alert('Aucune retenue sélectionnée');
      return;
    }
    setShowActionsMenu(false);
    try {
      for (const id of selectedIds) {
        const original = withholdingTaxes.find(t => t.id === id);
        if (original) {
          const newTax = {
            ...original,
            name: `${original.name} (Copie)`,
            id: undefined,
            created_at: undefined,
            updated_at: undefined
          };
          await apiClient.post('/compta/withholding-taxes/', newTax);
        }
      }
      loadData();
      alert(`${selectedIds.length} retenue(s) dupliquée(s) avec succès`);
    } catch (err) {
      alert('Erreur duplication: ' + (err.message || 'Erreur inconnue'));
    }
  };

  // Pagination
  const totalPages = Math.ceil(filteredTaxes.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedTaxes = filteredTaxes.slice(startIndex, startIndex + itemsPerPage);

  // Définition des colonnes
  const columns = [
    { id: 'nom', label: 'Nom', width: '200px' },
    { id: 'taux', label: 'Taux', width: '100px', align: 'right' },
    { id: 'type', label: 'Type', width: '100px' },
    { id: 'base', label: 'Base', width: '80px' },
    { id: 'entreprise', label: 'Entreprise', width: '160px' },
    { id: 'actif', label: 'Statut', width: '80px' }
  ];

  if (!activeEntity) {
    return (
      <div className="min-h-screen bg-gray-50 p-4">
        <div className="max-w-7xl mx-auto bg-white border border-gray-300">
          <div className="border-b border-gray-300 px-4 py-3">
            <div className="text-lg font-bold text-gray-900">Retenues à la Source</div>
          </div>
          <div className="p-8">
            <div className="bg-yellow-50 border border-yellow-200 rounded p-6 text-center">
              <FiAlertCircle className="text-yellow-600 mx-auto mb-3" size={32} />
              <p className="text-yellow-800 font-medium text-lg mb-3">Aucune entité sélectionnée</p>
              <p className="text-sm text-gray-600 mb-4">Veuillez sélectionner une entité pour voir les retenues.</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (loading && withholdingTaxes.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 p-4">
        <div className="max-w-7xl mx-auto bg-white border border-gray-300">
          <div className="border-b border-gray-300 px-4 py-3">
            <div className="text-lg font-bold text-gray-900">Retenues à la Source</div>
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
              <Tooltip text="Créer une nouvelle retenue">
                <button
                  onClick={() => navigate('/comptabilite/withholding-taxes/create')}
                  className="h-8 px-3 bg-purple-600 text-white text-xs font-medium hover:bg-purple-700 hover:scale-105 transition-all duration-200 rounded flex items-center gap-1"
                >
                  <FiPlus size={12} /> Nouvelle retenue
                </button>
              </Tooltip>
              <Tooltip text="Actualiser la liste">
                <h1 
                  className="text-lg font-bold text-gray-900 cursor-pointer hover:text-purple-600 hover:scale-105 transition-all duration-200"
                  onClick={loadData}
                >
                  Retenues à la Source
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
                    <Tooltip text="Dupliquer les retenues sélectionnées" position="right">
                      <button
                        onClick={handleDuplicate}
                        className="w-full px-3 py-2 text-xs text-left hover:bg-gray-50 flex items-center gap-2"
                      >
                        <FiCopy size={12} /> Dupliquer
                      </button>
                    </Tooltip>
                    <Tooltip text="Activer les retenues sélectionnées" position="right">
                      <button
                        onClick={handleBulkActivate}
                        className="w-full px-3 py-2 text-xs text-left hover:bg-green-50 hover:text-green-600 flex items-center gap-2"
                      >
                        <FiCheck size={12} /> Activer
                      </button>
                    </Tooltip>
                    <Tooltip text="Désactiver les retenues sélectionnées" position="right">
                      <button
                        onClick={handleBulkDeactivate}
                        className="w-full px-3 py-2 text-xs text-left hover:bg-yellow-50 hover:text-yellow-600 flex items-center gap-2"
                      >
                        <FiX size={12} /> Désactiver
                      </button>
                    </Tooltip>
                    <Tooltip text="Supprimer les retenues sélectionnées" position="right">
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
                        displayText = filter.value === 'partial' ? 'Partielle' : 'Totale';
                        displayColor = filter.value === 'partial' ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700';
                        break;
                      case 'base':
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
                    placeholder="Rechercher par nom, taux..."
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
                              onClick={() => addFilter('type', 'partial')}
                              className="w-full text-left text-xs px-2 py-1 hover:bg-gray-100 rounded flex items-center gap-2"
                            >
                              <span className="w-16">Type</span>
                              <span className="text-amber-600">= Partielle</span>
                            </button>
                            <button
                              onClick={() => addFilter('type', 'full')}
                              className="w-full text-left text-xs px-2 py-1 hover:bg-gray-100 rounded flex items-center gap-2"
                            >
                              <span className="w-16">Type</span>
                              <span className="text-red-600">= Totale</span>
                            </button>
                            <button
                              onClick={() => addFilter('base', 'percent')}
                              className="w-full text-left text-xs px-2 py-1 hover:bg-gray-100 rounded flex items-center gap-2"
                            >
                              <span className="w-16">Base</span>
                              <span className="text-purple-600">= Pourcentage</span>
                            </button>
                            <button
                              onClick={() => addFilter('base', 'fixed')}
                              className="w-full text-left text-xs px-2 py-1 hover:bg-gray-100 rounded flex items-center gap-2"
                            >
                              <span className="w-16">Base</span>
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
        {selectedIds.length > 0 && (
          <div className="border-b border-gray-300 px-4 py-2 bg-gray-50 flex items-center gap-2">
            <span className="text-xs text-gray-600">{selectedIds.length} retenue(s) sélectionnée(s)</span>
            <Tooltip text="Activer les retenues sélectionnées">
              <button
                onClick={handleBulkActivate}
                className="h-6 px-2 bg-green-600 text-white text-xs hover:bg-green-700 rounded"
              >
                Activer
              </button>
            </Tooltip>
            <Tooltip text="Désactiver les retenues sélectionnées">
              <button
                onClick={handleBulkDeactivate}
                className="h-6 px-2 bg-yellow-600 text-white text-xs hover:bg-yellow-700 rounded"
              >
                Désactiver
              </button>
            </Tooltip>
            <Tooltip text="Supprimer les retenues sélectionnées">
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
                    checked={selectedIds.length === paginatedTaxes.length && paginatedTaxes.length > 0}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedIds(paginatedTaxes.map(t => t.id));
                      } else {
                        setSelectedIds([]);
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
                {visibleColumns.taux && (
                  <th 
                    className="border-r border-gray-300 px-2 py-1.5 text-right text-xs font-medium text-gray-700 cursor-pointer hover:bg-gray-200 min-w-[100px]"
                    onClick={() => handleSort('taux')}
                  >
                    <div className="flex items-center justify-end gap-1">
                      <FiPercent size={12} />
                      <span>Taux</span>
                      <SortIcon column="taux" sortColumn={sortColumn} sortDirection={sortDirection} />
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
                {visibleColumns.base && (
                  <th 
                    className="border-r border-gray-300 px-2 py-1.5 text-left text-xs font-medium text-gray-700 cursor-pointer hover:bg-gray-200 min-w-[80px]"
                    onClick={() => handleSort('base')}
                  >
                    <div className="flex items-center gap-1">
                      <span>Base</span>
                      <SortIcon column="base" sortColumn={sortColumn} sortDirection={sortDirection} />
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
                {/* Dernière colonne avec les trois points pour les colonnes */}
                <th className="border-l border-gray-300 px-2 py-1.5 w-10 text-center">
                  <Tooltip text="Choisir les colonnes à afficher">
                    <button
                      className="columns-menu-button-withholding p-1 rounded hover:bg-gray-200"
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
                    {activeFilters.length > 0 ? 'Aucun résultat pour ces filtres' : 'Aucune retenue configurée'}
                  </td>
                </tr>
              ) : (
                paginatedTaxes.map((tax) => (
                  <tr
                    key={tax.id}
                    className={`hover:bg-gray-50 cursor-pointer transition-colors ${activeRowId === tax.id ? 'bg-purple-50' : ''}`}
                    onClick={() => setActiveRowId(tax.id)}
                    onDoubleClick={() => navigate(`/comptabilite/withholding-taxes/${tax.id}`)}
                  >
                    <td className="border border-gray-300 px-2 py-1.5 text-center" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(tax.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedIds([...selectedIds, tax.id]);
                          } else {
                            setSelectedIds(selectedIds.filter(id => id !== tax.id));
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
                            <div className="text-xs text-gray-500 truncate max-w-[160px]">
                              {tax.description || 'Aucune description'}
                            </div>
                          </div>
                        </div>
                      </td>
                    )}
                    {visibleColumns.taux && (
                      <td className="border border-gray-300 px-2 py-1.5 text-right">
                        <span className="px-2 py-0.5 bg-purple-50 text-purple-700 rounded-full border border-purple-200 text-xs font-medium font-mono">
                          {tax.amount}%
                        </span>
                      </td>
                    )}
                    {visibleColumns.type && (
                      <td className="border border-gray-300 px-2 py-1.5">
                        <WithholdingTypeBadge type={tax.withholding_type} />
                      </td>
                    )}
                    {visibleColumns.base && (
                      <td className="border border-gray-300 px-2 py-1.5">
                        <ScopeBadge scope={tax.withholding_scope} />
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
            id="columns-menu-withholding"
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