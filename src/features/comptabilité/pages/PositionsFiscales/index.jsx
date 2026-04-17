import React, { useState, useEffect, useCallback } from 'react';
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
  FiCheckCircle,
  FiXCircle,
  FiShield,
  FiToggleRight,
  FiPercent,
  FiSearch
} from 'react-icons/fi';
import { apiClient } from '../../../../services/apiClient';
import { authService } from '../../../../services/authService';

// ==========================================
// COMPOSANT TOOLTIP
// ==========================================
const Tooltip = ({ children, text, position = 'top' }) => {
  const [show, setShow] = useState(false);
  
  return (
    <div className="relative inline-block">
      <div
        onMouseEnter={() => setShow(true)}
        onMouseLeave={() => setShow(false)}
      >
        {children}
      </div>
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

export default function PositionsFiscalesIndex() {
  const navigate = useNavigate();
  
  const [positions, setPositions] = useState([]);
  const [filteredPositions, setFilteredPositions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedPositionIds, setSelectedPositionIds] = useState([]);
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
  const filterMenuRef = React.useRef(null);
  const actionsMenuRef = React.useRef(null);
  const searchContainerRef = React.useRef(null);
  
  // États pour les référentiels
  const [companiesMap, setCompaniesMap] = useState({});
  const [paysMap, setPaysMap] = useState({});
  const [paysList, setPaysList] = useState([]);
  const [referentialsLoaded, setReferentialsLoaded] = useState(false);
  
  // État pour la recherche dans le filtre pays
  const [paysSearchText, setPaysSearchText] = useState('');
  
  // États pour les colonnes visibles
  const [visibleColumns, setVisibleColumns] = useState({
    name: true,
    country: true,
    company: true,
    config: true,
    status: true
  });
  
  // États pour le tri
  const [sortColumn, setSortColumn] = useState('name');
  const [sortDirection, setSortDirection] = useState('asc');

  // Fermer les menus au clic extérieur
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (filterMenuRef.current && !filterMenuRef.current.contains(event.target)) {
        setShowFilterMenu(false);
        setPaysSearchText('');
      }
      if (actionsMenuRef.current && !actionsMenuRef.current.contains(event.target)) {
        setShowActionsMenu(false);
      }
      const columnsMenuElement = document.getElementById('columns-menu');
      if (columnsMenuElement && !columnsMenuElement.contains(event.target)) {
        const buttonElement = document.querySelector('.columns-menu-button');
        if (buttonElement && !buttonElement.contains(event.target)) {
          setShowColumnsMenu(false);
        }
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Charger tous les référentiels
  useEffect(() => {
    const loadReferentials = async () => {
      try {
        setLoading(true);
        
        const paysRes = await apiClient.get('/pays/').catch(() => ({ data: [] }));
        const paysData = paysRes.data || paysRes || [];
        const paysObj = {};
        const paysArray = [];
        paysData.forEach(p => { 
          const displayName = p.nom_fr || p.nom || p.name || 'Pays';
          const paysItem = {
            id: p.id,
            displayName: displayName,
            emoji: p.emoji || '🌍',
            code: p.code
          };
          paysObj[p.id] = paysItem;
          paysArray.push(paysItem);
        });
        paysArray.sort((a, b) => a.displayName.localeCompare(b.displayName));
        setPaysMap(paysObj);
        setPaysList(paysArray);
        
        if (authService.isAuthenticated()) {
          const companiesRes = await apiClient.get('/entites/').catch(() => ({ data: [] }));
          const companiesData = companiesRes.data || companiesRes || [];
          const companiesObj = {};
          companiesData.forEach(c => { 
            companiesObj[c.id] = {
              ...c,
              displayName: c.raison_sociale || c.nom || c.name || 'Entreprise'
            }; 
          });
          setCompaniesMap(companiesObj);
        }
        
        setReferentialsLoaded(true);
        
      } catch (err) {
        console.error('❌ Erreur chargement référentiels:', err);
        setError('Erreur lors du chargement des référentiels');
      } finally {
        setLoading(false);
      }
    };
    
    loadReferentials();
  }, []);

  // Charger les positions
  const loadData = useCallback(async () => {
    if (!referentialsLoaded) return;
    
    try {
      setLoading(true);
      setError(null);
      
      const positionsRes = await apiClient.get('/compta/fiscal-positions/').catch(() => ({ data: [] }));
      const positionsData = positionsRes.data || positionsRes || [];
      
      const enrichedPositions = positionsData.map(position => ({
        ...position,
        country_detail: position.country ? paysMap[position.country] : null,
        company_detail: position.company ? companiesMap[position.company] : null,
      }));

      setPositions(enrichedPositions);
      setFilteredPositions(enrichedPositions);
      setActiveRowId(null);
      setSelectedPositionIds([]);
      setCurrentPage(1);
      
    } catch (err) {
      console.error('❌ Erreur chargement positions:', err);
      setError('Impossible de charger les positions fiscales.');
    } finally {
      setLoading(false);
    }
  }, [referentialsLoaded, paysMap, companiesMap]);

  useEffect(() => {
    if (referentialsLoaded) {
      loadData();
    }
  }, [referentialsLoaded, loadData]);

  // Fonction de filtrage
  const applyFiltersToPositions = (positionsList, filters) => {
    let filtered = [...positionsList];
    
    filters.forEach(filter => {
      filtered = filtered.filter(position => {
        let fieldValue = '';
        
        switch (filter.field) {
          case 'name':
            fieldValue = position.name || '';
            break;
          case 'country':
            fieldValue = position.country_detail?.displayName || '';
            break;
          case 'company':
            fieldValue = position.company_detail?.displayName || '';
            break;
          case 'status':
            fieldValue = position.active ? 'actif' : 'inactif';
            break;
          case 'config':
            fieldValue = position.auto_apply ? 'auto' : 'manuel';
            break;
          case 'recherche':
            fieldValue = `${position.name} ${position.description || ''} ${position.country_detail?.displayName || ''} ${position.company_detail?.displayName || ''}`;
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
  const getSortedPositions = (positionsToSort, column, direction) => {
    return [...positionsToSort].sort((a, b) => {
      let aVal, bVal;
      
      switch (column) {
        case 'name':
          aVal = a.name || '';
          bVal = b.name || '';
          break;
        case 'country':
          aVal = a.country_detail?.displayName || '';
          bVal = b.country_detail?.displayName || '';
          break;
        case 'company':
          aVal = a.company_detail?.displayName || '';
          bVal = b.company_detail?.displayName || '';
          break;
        case 'status':
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
    
    const sorted = getSortedPositions(filteredPositions, newColumn, newDirection);
    setFilteredPositions(sorted);
  };

  // Appliquer les filtres
  useEffect(() => {
    if (positions.length > 0) {
      const filtered = applyFiltersToPositions(positions, activeFilters);
      const sorted = getSortedPositions(filtered, sortColumn, sortDirection);
      setFilteredPositions(sorted);
      setCurrentPage(1);
    }
  }, [positions, activeFilters]);

  // Re-appliquer le tri
  useEffect(() => {
    if (filteredPositions.length > 0) {
      const sorted = getSortedPositions(filteredPositions, sortColumn, sortDirection);
      setFilteredPositions(sorted);
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
    setPaysSearchText('');
  };

  // Supprimer un filtre
  const removeFilter = (index) => {
    setActiveFilters(activeFilters.filter((_, i) => i !== index));
  };

  // Effacer tous les filtres
  const clearAllFilters = () => {
    setActiveFilters([]);
    setSearchText('');
    setPaysSearchText('');
  };

  // Filtrer les pays pour la recherche
  const filteredPaysList = paysList.filter(pays =>
    pays.displayName.toLowerCase().includes(paysSearchText.toLowerCase()) ||
    (pays.code && pays.code.toLowerCase().includes(paysSearchText.toLowerCase()))
  );

  const totalPages = Math.ceil(filteredPositions.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedPositions = filteredPositions.slice(startIndex, startIndex + itemsPerPage);

  // Actions groupées
  const handleBulkDelete = async () => {
    if (selectedPositionIds.length === 0) {
      alert('Aucune position sélectionnée');
      return;
    }
    
    if (!window.confirm(`Supprimer ${selectedPositionIds.length} position(s) ?`)) return;
    
    try {
      setShowActionsMenu(false);
      for (const id of selectedPositionIds) {
        await apiClient.delete(`/compta/fiscal-positions/${id}/`);
      }
      setSelectedPositionIds([]);
      loadData();
    } catch (err) {
      alert('Erreur suppression: ' + (err.response?.data?.detail || err.message));
    }
  };

  const handleBulkActivate = async () => {
    if (selectedPositionIds.length === 0) {
      alert('Aucune position sélectionnée');
      return;
    }
    
    try {
      setShowActionsMenu(false);
      for (const id of selectedPositionIds) {
        await apiClient.patch(`/compta/fiscal-positions/${id}/`, { active: true });
      }
      setSelectedPositionIds([]);
      loadData();
    } catch (err) {
      alert('Erreur activation: ' + (err.response?.data?.detail || err.message));
    }
  };

  const handleBulkDeactivate = async () => {
    if (selectedPositionIds.length === 0) {
      alert('Aucune position sélectionnée');
      return;
    }
    
    try {
      setShowActionsMenu(false);
      for (const id of selectedPositionIds) {
        await apiClient.patch(`/compta/fiscal-positions/${id}/`, { active: false });
      }
      setSelectedPositionIds([]);
      loadData();
    } catch (err) {
      alert('Erreur désactivation: ' + (err.response?.data?.detail || err.message));
    }
  };

  const handleBulkDuplicate = async () => {
    if (selectedPositionIds.length === 0) {
      alert('Aucune position sélectionnée');
      return;
    }
    
    try {
      setShowActionsMenu(false);
      for (const id of selectedPositionIds) {
        const position = positions.find(p => p.id === id);
        if (!position) continue;
        const { id: _, ...data } = position;
        data.name = `${data.name} (Copie)`;
        await apiClient.post('/compta/fiscal-positions/', data);
      }
      setSelectedPositionIds([]);
      loadData();
    } catch (err) {
      alert('Erreur duplication: ' + (err.response?.data?.detail || err.message));
    }
  };

  const handleBulkAutoApply = async () => {
    if (selectedPositionIds.length === 0) {
      alert('Aucune position sélectionnée');
      return;
    }
    
    try {
      setShowActionsMenu(false);
      for (const id of selectedPositionIds) {
        const position = positions.find(p => p.id === id);
        if (!position) continue;
        await apiClient.patch(`/compta/fiscal-positions/${id}/`, { auto_apply: !position.auto_apply });
      }
      setSelectedPositionIds([]);
      loadData();
    } catch (err) {
      alert('Erreur modification auto_apply: ' + (err.response?.data?.detail || err.message));
    }
  };

  // Création
  const handleCreate = () => {
    navigate('/comptabilite/positions-fiscales/create');
  };

  // Navigation vers les détails (double-clic)
  const handleRowDoubleClick = (position) => {
    navigate(`/comptabilite/positions-fiscales/${position.id}`);
  };

  // Composants d'affichage
  const StatusBadge = ({ active }) => {
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
        active
          ? 'bg-green-100 text-green-700'
          : 'bg-gray-100 text-gray-700'
      }`}>
        {active ? <FiCheckCircle size={10} /> : <FiXCircle size={10} />}
        {active ? 'Actif' : 'Inactif'}
      </span>
    );
  };

  const AutoApplyBadge = ({ autoApply }) => {
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
        autoApply
          ? 'bg-amber-100 text-amber-700'
          : 'bg-gray-100 text-gray-600'
      }`}>
        <FiToggleRight size={10} />
        {autoApply ? 'Auto' : 'Manuel'}
      </span>
    );
  };

  const VatBadge = ({ vatRequired }) => {
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
        vatRequired
          ? 'bg-blue-100 text-blue-700'
          : 'bg-gray-100 text-gray-600'
      }`}>
        <FiPercent size={10} />
        {vatRequired ? 'TVA requise' : 'Sans TVA'}
      </span>
    );
  };

  const CountryDisplay = ({ country }) => {
    if (!country) return <span className="text-gray-400 text-xs">🌍 Global</span>;
    
    return (
      <div className="flex items-center gap-1 text-sm">
        <span className="text-base">{country.emoji || '🌍'}</span>
        <span className="text-xs font-medium">{country.displayName}</span>
      </div>
    );
  };

  const CompanyDisplay = ({ company }) => {
    if (!company) return <span className="text-gray-400 italic text-xs">Toutes entreprises</span>;
    
    return (
      <div className="text-xs">
        <div className="font-medium truncate max-w-[150px]">{company.displayName}</div>
      </div>
    );
  };

  // Définition des colonnes
  const columns = [
    { id: 'name', label: 'Position', width: '220px' },
    { id: 'country', label: 'Pays', width: '150px' },
    { id: 'company', label: 'Entreprise', width: '180px' },
    { id: 'config', label: 'Configuration', width: '180px' },
    { id: 'status', label: 'Statut', width: '85px' }
  ];

  if (loading && positions.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 p-4">
        <div className="max-w-7xl mx-auto bg-white border border-gray-300">
          <div className="border-b border-gray-300 px-4 py-3">
            <div className="text-lg font-bold text-gray-900">Positions Fiscales</div>
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
              <Tooltip text="Créer une nouvelle position fiscale">
                <button
                  onClick={handleCreate}
                  className="h-8 px-3 bg-purple-600 text-white text-xs font-medium hover:bg-purple-700 hover:scale-105 transition-all duration-200 rounded flex items-center gap-1"
                >
                  <FiPlus size={12} /> Nouvelle position
                </button>
              </Tooltip>
              <Tooltip text="Actualiser la liste">
                <h1 
                  className="text-lg font-bold text-gray-900 cursor-pointer hover:text-purple-600 hover:scale-105 transition-all duration-200"
                  onClick={loadData}
                >
                  Positions Fiscales
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
                  <div className="absolute left-0 mt-1 w-56 bg-white border border-gray-300 shadow-lg rounded z-50">
                    <Tooltip text="Activer les positions sélectionnées" position="right">
                      <button
                        onClick={handleBulkActivate}
                        className="w-full px-3 py-2 text-xs text-left hover:bg-gray-50 flex items-center gap-2"
                      >
                        <FiCheckCircle size={12} /> Activer
                      </button>
                    </Tooltip>
                    <Tooltip text="Désactiver les positions sélectionnées" position="right">
                      <button
                        onClick={handleBulkDeactivate}
                        className="w-full px-3 py-2 text-xs text-left hover:bg-gray-50 flex items-center gap-2"
                      >
                        <FiXCircle size={12} /> Désactiver
                      </button>
                    </Tooltip>
                    <Tooltip text="Basculer en Auto/Manuel" position="right">
                      <button
                        onClick={handleBulkAutoApply}
                        className="w-full px-3 py-2 text-xs text-left hover:bg-gray-50 flex items-center gap-2"
                      >
                        <FiToggleRight size={12} /> Auto/Manuel
                      </button>
                    </Tooltip>
                    <Tooltip text="Dupliquer les positions sélectionnées" position="right">
                      <button
                        onClick={handleBulkDuplicate}
                        className="w-full px-3 py-2 text-xs text-left hover:bg-gray-50 flex items-center gap-2"
                      >
                        <FiCopy size={12} /> Dupliquer
                      </button>
                    </Tooltip>
                    <Tooltip text="Supprimer les positions sélectionnées" position="right">
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
                      case 'status':
                        displayText = filter.value === 'actif' ? 'Actif' : 'Inactif';
                        displayColor = filter.value === 'actif' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700';
                        break;
                      case 'country':
                        displayText = `Pays: ${filter.value}`;
                        displayColor = 'bg-indigo-100 text-indigo-700';
                        break;
                      case 'company':
                        displayText = `Entreprise: ${filter.value}`;
                        displayColor = 'bg-gray-100 text-gray-700';
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
                    placeholder="Rechercher par nom, description, pays..."
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
                      <div className="absolute right-0 mt-1 w-72 bg-white border border-gray-300 shadow-lg rounded z-50">
                        <div className="p-2 border-b border-gray-200">
                          <p className="text-xs font-medium text-gray-700 mb-2">Ajouter un filtre</p>
                          <div className="space-y-2">
                            <button
                              onClick={() => addFilter('status', 'actif')}
                              className="w-full text-left text-xs px-2 py-1 hover:bg-gray-100 rounded flex items-center gap-2"
                            >
                              <span className="w-20">Statut</span>
                              <span className="text-green-600">= Actif</span>
                            </button>
                            <button
                              onClick={() => addFilter('status', 'inactif')}
                              className="w-full text-left text-xs px-2 py-1 hover:bg-gray-100 rounded flex items-center gap-2"
                            >
                              <span className="w-20">Statut</span>
                              <span className="text-gray-600">= Inactif</span>
                            </button>
                          </div>
                        </div>
                        <div className="p-2 border-b border-gray-200">
                          <p className="text-xs font-medium text-gray-700 mb-2">Pays</p>
                          <div className="relative mb-2">
                            <FiSearch size={12} className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400" />
                            <input
                              type="text"
                              value={paysSearchText}
                              onChange={(e) => setPaysSearchText(e.target.value)}
                              placeholder="Rechercher un pays..."
                              className="w-full pl-7 pr-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-purple-500"
                              onClick={(e) => e.stopPropagation()}
                            />
                          </div>
                          <div className="max-h-48 overflow-y-auto">
                            {filteredPaysList.length === 0 ? (
                              <p className="text-xs text-gray-500 text-center py-2">Aucun pays trouvé</p>
                            ) : (
                              filteredPaysList.map((pays) => (
                                <button
                                  key={pays.id}
                                  onClick={() => addFilter('country', pays.displayName)}
                                  className="w-full text-left text-xs px-2 py-1.5 hover:bg-gray-100 rounded flex items-center gap-2"
                                >
                                  <span className="text-base">{pays.emoji || '🌍'}</span>
                                  <span className="flex-1 truncate">{pays.displayName}</span>
                                  {pays.code && <span className="text-gray-400 text-[10px]">{pays.code}</span>}
                                </button>
                              ))
                            )}
                          </div>
                        </div>
                        {activeFilters.length > 0 && (
                          <div className="p-2">
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
        {selectedPositionIds.length > 0 && (
          <div className="border-b border-gray-300 px-4 py-2 bg-gray-50 flex items-center gap-2">
            <span className="text-xs text-gray-600">{selectedPositionIds.length} position(s) sélectionnée(s)</span>
            <Tooltip text="Activer les positions sélectionnées">
              <button
                onClick={handleBulkActivate}
                className="h-6 px-2 bg-green-600 text-white text-xs hover:bg-green-700 rounded"
              >
                Activer
              </button>
            </Tooltip>
            <Tooltip text="Désactiver les positions sélectionnées">
              <button
                onClick={handleBulkDeactivate}
                className="h-6 px-2 bg-gray-600 text-white text-xs hover:bg-gray-700 rounded"
              >
                Désactiver
              </button>
            </Tooltip>
            <Tooltip text="Supprimer les positions sélectionnées">
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
                    checked={selectedPositionIds.length === paginatedPositions.length && paginatedPositions.length > 0}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedPositionIds(paginatedPositions.map(p => p.id));
                      } else {
                        setSelectedPositionIds([]);
                      }
                    }}
                    className="w-3.5 h-3.5 cursor-pointer"
                  />
                </th>
                {visibleColumns.name && (
                  <th 
                    className="border-r border-gray-300 px-2 py-1.5 text-left text-xs font-medium text-gray-700 cursor-pointer hover:bg-gray-200 min-w-[220px]"
                    onClick={() => handleSort('name')}
                  >
                    <div className="flex items-center gap-1">
                      <span>Position</span>
                      <SortIcon column="name" sortColumn={sortColumn} sortDirection={sortDirection} />
                    </div>
                  </th>
                )}
                {visibleColumns.country && (
                  <th 
                    className="border-r border-gray-300 px-2 py-1.5 text-left text-xs font-medium text-gray-700 cursor-pointer hover:bg-gray-200 min-w-[150px]"
                    onClick={() => handleSort('country')}
                  >
                    <div className="flex items-center gap-1">
                      <span>Pays</span>
                      <SortIcon column="country" sortColumn={sortColumn} sortDirection={sortDirection} />
                    </div>
                  </th>
                )}
                {visibleColumns.company && (
                  <th 
                    className="border-r border-gray-300 px-2 py-1.5 text-left text-xs font-medium text-gray-700 cursor-pointer hover:bg-gray-200 min-w-[180px]"
                    onClick={() => handleSort('company')}
                  >
                    <div className="flex items-center gap-1">
                      <span>Entreprise</span>
                      <SortIcon column="company" sortColumn={sortColumn} sortDirection={sortDirection} />
                    </div>
                  </th>
                )}
                {visibleColumns.config && (
                  <th className="border-r border-gray-300 px-2 py-1.5 text-left text-xs font-medium text-gray-700 min-w-[180px]">
                    <div className="flex items-center gap-1">
                      <span>Configuration</span>
                    </div>
                  </th>
                )}
                {visibleColumns.status && (
                  <th 
                    className="border-r border-gray-300 px-2 py-1.5 text-left text-xs font-medium text-gray-700 cursor-pointer hover:bg-gray-200 min-w-[85px]"
                    onClick={() => handleSort('status')}
                  >
                    <div className="flex items-center gap-1">
                      <span>Statut</span>
                      <SortIcon column="status" sortColumn={sortColumn} sortDirection={sortDirection} />
                    </div>
                  </th>
                )}
                <th className="border-l border-gray-300 px-2 py-1.5 w-10 text-center">
                  <Tooltip text="Choisir les colonnes à afficher">
                    <button
                      className="columns-menu-button p-1 rounded hover:bg-gray-200"
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
              ) : paginatedPositions.length === 0 ? (
                <tr>
                  <td colSpan={Object.values(visibleColumns).filter(v => v).length + 2} className="border border-gray-300 p-8 text-center text-gray-500 text-sm">
                    {activeFilters.length > 0 ? 'Aucun résultat pour ces filtres' : 'Aucune position fiscale'}
                  </td>
                </tr>
              ) : (
                paginatedPositions.map((position) => (
                  <tr
                    key={position.id}
                    className={`hover:bg-gray-50 cursor-pointer transition-colors ${activeRowId === position.id ? 'bg-purple-50' : ''}`}
                    onClick={() => setActiveRowId(position.id)}
                    onDoubleClick={() => handleRowDoubleClick(position)}
                  >
                    <td className="border border-gray-300 px-2 py-1.5 text-center" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={selectedPositionIds.includes(position.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedPositionIds([...selectedPositionIds, position.id]);
                          } else {
                            setSelectedPositionIds(selectedPositionIds.filter(id => id !== position.id));
                          }
                        }}
                        className="w-3.5 h-3.5 cursor-pointer"
                      />
                    </td>
                    {visibleColumns.name && (
                      <td className="border border-gray-300 px-2 py-1.5">
                        <div>
                          <div className="font-semibold text-sm flex items-center gap-1">
                            <FiShield className="text-purple-500" size={14} />
                            {position.name || '—'}
                          </div>
                          {position.description && (
                            <div className="text-xs text-gray-500 truncate max-w-[180px]" title={position.description}>
                              {position.description}
                            </div>
                          )}
                        </div>
                      </td>
                    )}
                    {visibleColumns.country && (
                      <td className="border border-gray-300 px-2 py-1.5">
                        <CountryDisplay country={position.country_detail} />
                      </td>
                    )}
                    {visibleColumns.company && (
                      <td className="border border-gray-300 px-2 py-1.5">
                        <CompanyDisplay company={position.company_detail} />
                      </td>
                    )}
                    {visibleColumns.config && (
                      <td className="border border-gray-300 px-2 py-1.5">
                        <div className="flex flex-wrap gap-1">
                          <AutoApplyBadge autoApply={position.auto_apply} />
                          <VatBadge vatRequired={position.vat_required} />
                        </div>
                      </td>
                    )}
                    {visibleColumns.status && (
                      <td className="border border-gray-300 px-2 py-1.5">
                        <StatusBadge active={position.active} />
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
            id="columns-menu"
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
              Page {currentPage} sur {totalPages}
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