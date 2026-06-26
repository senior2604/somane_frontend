// src/features/comptabilité/pages/TaxGroups/Index.jsx

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
  FiTag,
  FiEye,
  FiEdit,
  FiBriefcase,
  FiCheck,
  FiGlobe,
  FiHash
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
// COMPOSANT BADGE ORDRE
// ==========================================
const SequenceBadge = ({ sequence }) => {
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-purple-50 text-purple-700 border border-purple-200">
      <FiHash size={10} className="mr-1" />
      {sequence}
    </span>
  );
};

// ==========================================
// COMPOSANT PRINCIPAL
// ==========================================
export default function TaxGroupsIndex() {
  const navigate = useNavigate();
  const { activeEntity } = useEntity();

  const [groups, setGroups] = useState([]);
  const [filteredGroups, setFilteredGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedGroupIds, setSelectedGroupIds] = useState([]);
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
    sequence: true,
    pays: true,
    entreprise: true
  });
  
  // États pour le tri
  const [sortColumn, setSortColumn] = useState('nom');
  const [sortDirection, setSortDirection] = useState('asc');
  
  // États pour les référentiels
  const [paysMap, setPaysMap] = useState({});
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
      const columnsMenuElement = document.getElementById('columns-menu-taxgroups');
      if (columnsMenuElement && !columnsMenuElement.contains(event.target)) {
        const buttonElement = document.querySelector('.columns-menu-button-taxgroups');
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
      
      const response = await apiClient.get(`/compta/tax-groups/?company=${activeEntity.id}`);
      
      let groupsData = [];
      if (response) {
        if (Array.isArray(response)) {
          groupsData = response;
        } else if (response.data) {
          if (Array.isArray(response.data)) {
            groupsData = response.data;
          } else if (response.data.results && Array.isArray(response.data.results)) {
            groupsData = response.data.results;
          } else if (response.data.data && Array.isArray(response.data.data)) {
            groupsData = response.data.data;
          }
        }
      }

      const enrichedGroups = groupsData.map(group => ({
        ...group,
        company_detail: group.company ? (typeof group.company === 'object' ? group.company : companiesMap[group.company]) : null,
        country_detail: group.country ? (typeof group.country === 'object' ? group.country : paysMap[group.country]) : null,
      }));

      setGroups(enrichedGroups);
      setFilteredGroups(enrichedGroups);
      setActiveRowId(null);
      setCurrentPage(1);
      
    } catch (err) {
      console.error('❌ Erreur chargement groupes de taxes:', err);
      setError('Impossible de charger les groupes de taxes.');
      setGroups([]);
      setFilteredGroups([]);
    } finally {
      setLoading(false);
    }
  }, [activeEntity, referentialsLoaded, companiesMap, paysMap]);

  useEffect(() => {
    if (referentialsLoaded && activeEntity) {
      loadData();
    }
  }, [referentialsLoaded, activeEntity, loadData]);

  // Fonction de filtrage
  const applyFiltersToGroups = (groupsList, filters) => {
    let filtered = [...groupsList];
    
    filters.forEach(filter => {
      filtered = filtered.filter(group => {
        let fieldValue = '';
        
        switch (filter.field) {
          case 'nom':
            fieldValue = group.name || '';
            break;
          case 'pays':
            fieldValue = group.country_detail?.nom_fr || group.country_detail?.nom || '';
            break;
          case 'entreprise':
            fieldValue = group.company_detail?.nom || group.company_detail?.raison_sociale || group.company_detail?.name || '';
            break;
          case 'recherche':
            fieldValue = `${group.name} ${group.sequence}`.toLowerCase();
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
  const getSortedGroups = (groupsToSort, column, direction) => {
    return [...groupsToSort].sort((a, b) => {
      let aVal, bVal;
      
      switch (column) {
        case 'nom':
          aVal = a.name || '';
          bVal = b.name || '';
          break;
        case 'sequence':
          aVal = a.sequence || 0;
          bVal = b.sequence || 0;
          break;
        case 'pays':
          aVal = a.country_detail?.nom_fr || a.country_detail?.nom || '';
          bVal = b.country_detail?.nom_fr || b.country_detail?.nom || '';
          break;
        case 'entreprise':
          aVal = a.company_detail?.nom || a.company_detail?.raison_sociale || a.company_detail?.name || '';
          bVal = b.company_detail?.nom || b.company_detail?.raison_sociale || b.company_detail?.name || '';
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
    
    const sorted = getSortedGroups(filteredGroups, newColumn, newDirection);
    setFilteredGroups(sorted);
  };

  // Appliquer les filtres
  useEffect(() => {
    if (groups.length > 0) {
      const filtered = applyFiltersToGroups(groups, activeFilters);
      const sorted = getSortedGroups(filtered, sortColumn, sortDirection);
      setFilteredGroups(sorted);
      setCurrentPage(1);
    }
  }, [groups, activeFilters, sortColumn, sortDirection]);

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
    if (selectedGroupIds.length === 0) {
      alert('Aucun groupe sélectionné');
      return;
    }
    if (!window.confirm(`Supprimer ${selectedGroupIds.length} groupe(s) de taxes ?`)) return;
    setShowActionsMenu(false);
    try {
      for (const id of selectedGroupIds) {
        await apiClient.delete(`/compta/tax-groups/${id}/?company=${activeEntity.id}`);
      }
      setSelectedGroupIds([]);
      loadData();
    } catch (err) {
      alert('Erreur suppression: ' + (err.message || 'Erreur inconnue'));
    }
  };

  const handleDuplicate = async () => {
    if (selectedGroupIds.length === 0) {
      alert('Aucun groupe sélectionné');
      return;
    }
    setShowActionsMenu(false);
    try {
      for (const id of selectedGroupIds) {
        const original = groups.find(g => g.id === id);
        if (original) {
          const newGroup = {
            ...original,
            name: `${original.name} (Copie)`,
            id: undefined,
            created_at: undefined,
            updated_at: undefined
          };
          await apiClient.post('/compta/tax-groups/', newGroup);
        }
      }
      loadData();
      alert(`${selectedGroupIds.length} groupe(s) dupliqué(s) avec succès`);
    } catch (err) {
      alert('Erreur duplication: ' + (err.message || 'Erreur inconnue'));
    }
  };

  // Pagination
  const totalPages = Math.ceil(filteredGroups.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedGroups = filteredGroups.slice(startIndex, startIndex + itemsPerPage);

  // Définition des colonnes
  const columns = [
    { id: 'nom', label: 'Nom', width: '250px' },
    { id: 'sequence', label: 'Ordre', width: '80px', align: 'center' },
    { id: 'pays', label: 'Pays', width: '150px' },
    { id: 'entreprise', label: 'Entreprise', width: '200px' }
  ];

  if (!activeEntity) {
    return (
      <div className="min-h-screen bg-gray-50 p-4">
        <div className="max-w-7xl mx-auto bg-white border border-gray-300">
          <div className="border-b border-gray-300 px-4 py-3">
            <div className="text-lg font-bold text-gray-900">Groupes de Taxes</div>
          </div>
          <div className="p-8">
            <div className="bg-yellow-50 border border-yellow-200 rounded p-6 text-center">
              <FiAlertCircle className="text-yellow-600 mx-auto mb-3" size={32} />
              <p className="text-yellow-800 font-medium text-lg mb-3">Aucune entité sélectionnée</p>
              <p className="text-sm text-gray-600 mb-4">Veuillez sélectionner une entité pour voir les groupes de taxes.</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (loading && groups.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 p-4">
        <div className="max-w-7xl mx-auto bg-white border border-gray-300">
          <div className="border-b border-gray-300 px-4 py-3">
            <div className="text-lg font-bold text-gray-900">Groupes de Taxes</div>
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
              <Tooltip text="Créer un nouveau groupe de taxes">
                <button
                  onClick={() => navigate('/comptabilite/tax-groups/create')}
                  className="h-8 px-3 bg-purple-600 text-white text-xs font-medium hover:bg-purple-700 hover:scale-105 transition-all duration-200 rounded flex items-center gap-1"
                >
                  <FiPlus size={12} /> Nouveau groupe
                </button>
              </Tooltip>
              <Tooltip text="Actualiser la liste">
                <h1 
                  className="text-lg font-bold text-gray-900 cursor-pointer hover:text-purple-600 hover:scale-105 transition-all duration-200"
                  onClick={loadData}
                >
                  Groupes de Taxes
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
                    <Tooltip text="Dupliquer les groupes sélectionnés" position="right">
                      <button
                        onClick={handleDuplicate}
                        className="w-full px-3 py-2 text-xs text-left hover:bg-gray-50 flex items-center gap-2"
                      >
                        <FiCopy size={12} /> Dupliquer
                      </button>
                    </Tooltip>
                    <Tooltip text="Supprimer les groupes sélectionnés" position="right">
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
                      case 'pays':
                        displayText = `Pays: ${filter.value}`;
                        displayColor = 'bg-purple-100 text-purple-700';
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
                    placeholder="Rechercher par nom..."
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
                              onClick={() => addFilter('pays', 'cameroun')}
                              className="w-full text-left text-xs px-2 py-1 hover:bg-gray-100 rounded flex items-center gap-2"
                            >
                              <span className="w-16">Pays</span>
                              <span className="text-purple-600">= Cameroun</span>
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
        {selectedGroupIds.length > 0 && (
          <div className="border-b border-gray-300 px-4 py-2 bg-gray-50 flex items-center gap-2">
            <span className="text-xs text-gray-600">{selectedGroupIds.length} groupe(s) sélectionné(s)</span>
            <Tooltip text="Supprimer les groupes sélectionnés">
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
                    checked={selectedGroupIds.length === paginatedGroups.length && paginatedGroups.length > 0}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedGroupIds(paginatedGroups.map(g => g.id));
                      } else {
                        setSelectedGroupIds([]);
                      }
                    }}
                    className="w-3.5 h-3.5 cursor-pointer"
                  />
                </th>
                {visibleColumns.nom && (
                  <th 
                    className="border-r border-gray-300 px-2 py-1.5 text-left text-xs font-medium text-gray-700 cursor-pointer hover:bg-gray-200 min-w-[250px]"
                    onClick={() => handleSort('nom')}
                  >
                    <div className="flex items-center gap-1">
                      <FiTag size={12} />
                      <span>Nom</span>
                      <SortIcon column="nom" sortColumn={sortColumn} sortDirection={sortDirection} />
                    </div>
                  </th>
                )}
                {visibleColumns.sequence && (
                  <th 
                    className="border-r border-gray-300 px-2 py-1.5 text-center text-xs font-medium text-gray-700 cursor-pointer hover:bg-gray-200 min-w-[80px]"
                    onClick={() => handleSort('sequence')}
                  >
                    <div className="flex items-center justify-center gap-1">
                      <FiHash size={12} />
                      <span>Ordre</span>
                      <SortIcon column="sequence" sortColumn={sortColumn} sortDirection={sortDirection} />
                    </div>
                  </th>
                )}
                {visibleColumns.pays && (
                  <th 
                    className="border-r border-gray-300 px-2 py-1.5 text-left text-xs font-medium text-gray-700 cursor-pointer hover:bg-gray-200 min-w-[150px]"
                    onClick={() => handleSort('pays')}
                  >
                    <div className="flex items-center gap-1">
                      <FiGlobe size={12} />
                      <span>Pays</span>
                      <SortIcon column="pays" sortColumn={sortColumn} sortDirection={sortDirection} />
                    </div>
                  </th>
                )}
                {visibleColumns.entreprise && (
                  <th 
                    className="border-r border-gray-300 px-2 py-1.5 text-left text-xs font-medium text-gray-700 cursor-pointer hover:bg-gray-200 min-w-[200px]"
                    onClick={() => handleSort('entreprise')}
                  >
                    <div className="flex items-center gap-1">
                      <FiBriefcase size={12} />
                      <span>Entreprise</span>
                      <SortIcon column="entreprise" sortColumn={sortColumn} sortDirection={sortDirection} />
                    </div>
                  </th>
                )}
                {/* Dernière colonne avec les trois points pour les colonnes */}
                <th className="border-l border-gray-300 px-2 py-1.5 w-10 text-center">
                  <Tooltip text="Choisir les colonnes à afficher">
                    <button
                      className="columns-menu-button-taxgroups p-1 rounded hover:bg-gray-200"
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
              ) : paginatedGroups.length === 0 ? (
                <tr>
                  <td colSpan={Object.values(visibleColumns).filter(v => v).length + 2} className="border border-gray-300 p-8 text-center text-gray-500 text-sm">
                    {activeFilters.length > 0 ? 'Aucun résultat pour ces filtres' : 'Aucun groupe de taxes'}
                  </td>
                </tr>
              ) : (
                paginatedGroups.map((group) => (
                  <tr
                    key={group.id}
                    className={`hover:bg-gray-50 cursor-pointer transition-colors ${activeRowId === group.id ? 'bg-purple-50' : ''}`}
                    onClick={() => setActiveRowId(group.id)}
                    onDoubleClick={() => navigate(`/comptabilite/tax-groups/${group.id}`)}
                  >
                    <td className="border border-gray-300 px-2 py-1.5 text-center" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={selectedGroupIds.includes(group.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedGroupIds([...selectedGroupIds, group.id]);
                          } else {
                            setSelectedGroupIds(selectedGroupIds.filter(id => id !== group.id));
                          }
                        }}
                        className="w-3.5 h-3.5 cursor-pointer"
                      />
                    </td>
                    {visibleColumns.nom && (
                      <td className="border border-gray-300 px-2 py-1.5">
                        <div className="flex items-center gap-2">
                          <FiTag className="text-gray-400" size={14} />
                          <span className="text-xs font-semibold text-gray-900">{group.name || '—'}</span>
                        </div>
                      </td>
                    )}
                    {visibleColumns.sequence && (
                      <td className="border border-gray-300 px-2 py-1.5 text-center">
                        <SequenceBadge sequence={group.sequence} />
                       </td>
                    )}
                    {visibleColumns.pays && (
                      <td className="border border-gray-300 px-2 py-1.5">
                        <div className="flex items-center gap-1.5">
                          <span className="text-base">{group.country_detail?.emoji || '🌍'}</span>
                          <span className="text-xs text-gray-600 truncate max-w-[100px]">
                            {group.country_detail?.nom_fr || group.country_detail?.nom || '-'}
                          </span>
                        </div>
                       </td>
                    )}
                    {visibleColumns.entreprise && (
                      <td className="border border-gray-300 px-2 py-1.5">
                        <div className="flex items-center gap-1.5">
                          <FiBriefcase className="text-gray-400" size={12} />
                          <span className="text-xs text-gray-900 truncate max-w-[150px]">
                            {group.company_detail?.nom || group.company_detail?.raison_sociale || group.company_detail?.name || '-'}
                          </span>
                        </div>
                       </td>
                    )}
                    <td className="border border-gray-300 px-2 py-1.5"> </td>
                   </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Menu colonnes flottant */}
        {showColumnsMenu && (
          <div 
            id="columns-menu-taxgroups"
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
              Page {currentPage} sur {totalPages} ({filteredGroups.length} total)
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