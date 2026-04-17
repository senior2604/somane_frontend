// src/features/comptabilité/pages/Sequences/List.jsx
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
  FiEdit,
  FiMoreHorizontal,
  FiHash,
  FiCheck,
  FiLoader
} from 'react-icons/fi';
import { useEntity } from '../../../../context/EntityContext';
import { sequencesService } from "../../services";

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

// ==========================================
// COMPOSANT PRINCIPAL
// ==========================================
export default function SequencesList() {
  const navigate = useNavigate();
  const { activeEntity } = useEntity();
  
  const [sequences, setSequences] = useState([]);
  const [filteredSequences, setFilteredSequences] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [selectedSequenceIds, setSelectedSequenceIds] = useState([]);
  const [activeRowId, setActiveRowId] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(15);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  
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
  
  // États pour les colonnes visibles
  const [visibleColumns, setVisibleColumns] = useState({
    code: true,
    name: true,
    format: true,
    current_number: true,
    increment: true,
    active: true
  });
  
  // États pour le tri
  const [sortColumn, setSortColumn] = useState('name');
  const [sortDirection, setSortDirection] = useState('asc');

  // Fermer les menus au clic extérieur
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (filterMenuRef.current && !filterMenuRef.current.contains(event.target)) {
        setShowFilterMenu(false);
      }
      if (actionsMenuRef.current && !actionsMenuRef.current.contains(event.target)) {
        setShowActionsMenu(false);
      }
      const columnsMenuElement = document.getElementById('columns-menu-sequences');
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

  // Charger les séquences
  const loadData = useCallback(async () => {
    if (!activeEntity) return;
    
    try {
      setLoading(true);
      setError(null);
      
      const data = await sequencesService.getAll(activeEntity.id);
      setSequences(data);
      setFilteredSequences(data);
      
    } catch (err) {
      console.error('❌ Erreur chargement séquences:', err);
      setError('Impossible de charger les séquences.');
    } finally {
      setLoading(false);
    }
  }, [activeEntity]);

  useEffect(() => {
    if (activeEntity) {
      loadData();
    }
  }, [activeEntity, loadData]);

  // Formatage du modèle d'affichage
  const formatPattern = (sequence) => {
    const prefix = sequence.prefix || '';
    const suffix = sequence.suffix || '';
    const padding = sequence.padding || 5;
    const zeros = '0'.repeat(padding);
    return `${prefix}${zeros}${suffix}`;
  };

  const formatCurrentNumber = (sequence) => {
    const prefix = sequence.prefix || '';
    const suffix = sequence.suffix || '';
    const padding = sequence.padding || 5;
    const num = String(sequence.current_number || 0).padStart(padding, '0');
    return `${prefix}${num}${suffix}`;
  };

  // ==========================================
  // FONCTION DE FILTRAGE
  // ==========================================
  const applyFiltersToSequences = (sequencesList, filters) => {
    let filtered = [...sequencesList];
    
    filters.forEach(filter => {
      filtered = filtered.filter(seq => {
        let fieldValue = '';
        
        switch (filter.field) {
          case 'code':
            fieldValue = seq.code || '';
            break;
          case 'name':
            fieldValue = seq.name || '';
            break;
          case 'format':
            fieldValue = formatPattern(seq);
            break;
          case 'active':
            fieldValue = seq.active ? 'Actif' : 'Inactif';
            break;
          case 'recherche':
            fieldValue = `${seq.code} ${seq.name} ${seq.prefix || ''} ${seq.suffix || ''}`;
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
  const getSortedSequences = (sequencesToSort, column, direction) => {
    return [...sequencesToSort].sort((a, b) => {
      let aVal, bVal;
      
      switch (column) {
        case 'code':
          aVal = a.code || '';
          bVal = b.code || '';
          break;
        case 'name':
          aVal = a.name || '';
          bVal = b.name || '';
          break;
        case 'format':
          aVal = formatPattern(a);
          bVal = formatPattern(b);
          break;
        case 'current_number':
          aVal = a.current_number || 0;
          bVal = b.current_number || 0;
          break;
        case 'increment':
          aVal = a.number_increment || 1;
          bVal = b.number_increment || 1;
          break;
        case 'active':
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
    
    const sorted = getSortedSequences(filteredSequences, newColumn, newDirection);
    setFilteredSequences(sorted);
  };

  // Appliquer les filtres
  useEffect(() => {
    if (sequences.length > 0) {
      const filtered = applyFiltersToSequences(sequences, activeFilters);
      const sorted = getSortedSequences(filtered, sortColumn, sortDirection);
      setFilteredSequences(sorted);
      setCurrentPage(1);
    }
  }, [sequences, activeFilters]);

  // Re-appliquer le tri quand sortColumn/sortDirection change
  useEffect(() => {
    if (filteredSequences.length > 0) {
      const sorted = getSortedSequences(filteredSequences, sortColumn, sortDirection);
      setFilteredSequences(sorted);
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

  // Suppression d'une séquence
  const handleDelete = async () => {
    if (!deleteConfirm) return;
    
    try {
      await sequencesService.delete(deleteConfirm.id, activeEntity.id);
      setSuccess(`Séquence "${deleteConfirm.name}" supprimée avec succès`);
      loadData();
      setSelectedSequenceIds([]);
    } catch (err) {
      setError(`Erreur lors de la suppression: ${err.message}`);
    } finally {
      setDeleteConfirm(null);
      setTimeout(() => setSuccess(null), 3000);
      setTimeout(() => setError(null), 3000);
    }
  };

  // Duplication d'une séquence
  const handleDuplicate = async (sequence) => {
    try {
      const newSequence = {
        ...sequence,
        id: undefined,
        name: `${sequence.name} (copie)`,
        code: `${sequence.code}_COPY`,
        current_number: 0
      };
      await sequencesService.create(newSequence, activeEntity.id);
      setSuccess(`Séquence dupliquée avec succès`);
      loadData();
    } catch (err) {
      setError(`Erreur lors de la duplication: ${err.message}`);
    } finally {
      setTimeout(() => setSuccess(null), 3000);
      setTimeout(() => setError(null), 3000);
    }
  };

  // Actions groupées
  const handleBulkDelete = async () => {
    if (selectedSequenceIds.length === 0) {
      alert('Aucune séquence sélectionnée');
      return;
    }
    if (!window.confirm(`Supprimer ${selectedSequenceIds.length} séquence(s) ?`)) return;
    setShowActionsMenu(false);
    try {
      for (const id of selectedSequenceIds) {
        await sequencesService.delete(id, activeEntity.id);
      }
      setSelectedSequenceIds([]);
      loadData();
    } catch (err) {
      alert('Erreur: ' + (err.response?.data?.detail || err.message));
    }
  };

  const handleBulkActivate = async () => {
    if (selectedSequenceIds.length === 0) return;
    setShowActionsMenu(false);
    try {
      for (const id of selectedSequenceIds) {
        const seq = sequences.find(s => s.id === id);
        if (seq && !seq.active) {
          await sequencesService.update(id, { ...seq, active: true }, activeEntity.id);
        }
      }
      loadData();
      setSelectedSequenceIds([]);
    } catch (err) {
      alert('Erreur: ' + (err.response?.data?.detail || err.message));
    }
  };

  const handleBulkDeactivate = async () => {
    if (selectedSequenceIds.length === 0) return;
    setShowActionsMenu(false);
    try {
      for (const id of selectedSequenceIds) {
        const seq = sequences.find(s => s.id === id);
        if (seq && seq.active) {
          await sequencesService.update(id, { ...seq, active: false }, activeEntity.id);
        }
      }
      loadData();
      setSelectedSequenceIds([]);
    } catch (err) {
      alert('Erreur: ' + (err.response?.data?.detail || err.message));
    }
  };

  const totalPages = Math.ceil(filteredSequences.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedSequences = filteredSequences.slice(startIndex, startIndex + itemsPerPage);

  // Badge actif/inactif
  const ActiveBadge = ({ active }) => {
    return active ? (
      <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-green-100 text-green-700">
        Actif
      </span>
    ) : (
      <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-gray-100 text-gray-600">
        Inactif
      </span>
    );
  };

  // Définition des colonnes
  const columns = [
    { id: 'code', label: 'Code', width: '100px' },
    { id: 'name', label: 'Nom', width: '180px' },
    { id: 'format', label: 'Format', width: '120px' },
    { id: 'current_number', label: 'Numéro courant', width: '120px', align: 'center' },
    { id: 'increment', label: 'Incrément', width: '80px', align: 'center' },
    { id: 'active', label: 'Statut', width: '70px', align: 'center' }
  ];

  if (!activeEntity) {
    return (
      <div className="min-h-screen bg-gray-50 p-4">
        <div className="max-w-7xl mx-auto bg-white border border-gray-300">
          <div className="border-b border-gray-300 px-4 py-3">
            <div className="text-lg font-bold text-gray-900">Séquences</div>
          </div>
          <div className="p-8">
            <div className="bg-yellow-50 border border-yellow-200 rounded p-6 text-center">
              <FiAlertCircle className="text-yellow-600 mx-auto mb-3" size={32} />
              <p className="text-yellow-800 font-medium text-lg mb-3">Aucune entité sélectionnée</p>
              <p className="text-sm text-gray-600 mb-4">
                Veuillez sélectionner une entité pour voir les séquences.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (loading && sequences.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 p-4">
        <div className="max-w-7xl mx-auto bg-white border border-gray-300">
          <div className="border-b border-gray-300 px-4 py-3">
            <div className="text-lg font-bold text-gray-900">Séquences</div>
          </div>
          <div className="p-8 flex items-center justify-center">
            <div className="text-center">
              <FiLoader className="animate-spin text-purple-600 mx-auto" size={32} />
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
              <Tooltip text="Créer une nouvelle séquence">
                <button
                  onClick={() => navigate('/comptabilite/sequences/create')}
                  className="h-8 px-3 bg-purple-600 text-white text-xs font-medium hover:bg-purple-700 hover:scale-105 transition-all duration-200 rounded flex items-center gap-1"
                >
                  <FiPlus size={12} /> Nouvelle séquence
                </button>
              </Tooltip>
              <Tooltip text="Actualiser la liste">
                <h1 
                  className="text-lg font-bold text-gray-900 cursor-pointer hover:text-purple-600 hover:scale-105 transition-all duration-200 flex items-center gap-2"
                  onClick={loadData}
                >
                  <FiHash size={18} />
                  Séquences
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
                    <Tooltip text="Activer les séquences sélectionnées" position="right">
                      <button
                        onClick={handleBulkActivate}
                        className="w-full px-3 py-2 text-xs text-left hover:bg-gray-50 flex items-center gap-2"
                      >
                        <FiCheck size={12} /> Activer
                      </button>
                    </Tooltip>
                    <Tooltip text="Désactiver les séquences sélectionnées" position="right">
                      <button
                        onClick={handleBulkDeactivate}
                        className="w-full px-3 py-2 text-xs text-left hover:bg-gray-50 flex items-center gap-2"
                      >
                        <FiX size={12} /> Désactiver
                      </button>
                    </Tooltip>
                    <Tooltip text="Supprimer les séquences sélectionnées" position="right">
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
                      case 'active':
                        displayText = filter.value === 'Actif' ? 'Actif' : 'Inactif';
                        displayColor = filter.value === 'Actif' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600';
                        break;
                      case 'code':
                        displayText = `Code: ${filter.value}`;
                        displayColor = 'bg-gray-100 text-gray-700';
                        break;
                      case 'name':
                        displayText = `Nom: ${filter.value}`;
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
                    placeholder="Rechercher..."
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
                              onClick={() => addFilter('active', 'Actif')}
                              className="w-full text-left text-xs px-2 py-1 hover:bg-gray-100 rounded flex items-center gap-2"
                            >
                              <span className="w-20">Statut</span>
                              <span className="text-green-600">= Actif</span>
                            </button>
                            <button
                              onClick={() => addFilter('active', 'Inactif')}
                              className="w-full text-left text-xs px-2 py-1 hover:bg-gray-100 rounded flex items-center gap-2"
                            >
                              <span className="w-20">Statut</span>
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
        {selectedSequenceIds.length > 0 && (
          <div className="border-b border-gray-300 px-4 py-2 bg-gray-50 flex items-center gap-2">
            <span className="text-xs text-gray-600">{selectedSequenceIds.length} séquence(s) sélectionnée(s)</span>
            <Tooltip text="Activer les séquences sélectionnées">
              <button
                onClick={handleBulkActivate}
                className="h-6 px-2 bg-green-600 text-white text-xs hover:bg-green-700 rounded"
              >
                Activer
              </button>
            </Tooltip>
            <Tooltip text="Désactiver les séquences sélectionnées">
              <button
                onClick={handleBulkDeactivate}
                className="h-6 px-2 bg-gray-600 text-white text-xs hover:bg-gray-700 rounded"
              >
                Désactiver
              </button>
            </Tooltip>
            <Tooltip text="Supprimer les séquences sélectionnées">
              <button
                onClick={handleBulkDelete}
                className="h-6 px-2 bg-red-600 text-white text-xs hover:bg-red-700 rounded"
              >
                Supprimer
              </button>
            </Tooltip>
          </div>
        )}

        {/* Messages */}
        {error && (
          <div className="m-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-700">
            <FiAlertCircle size={16} />
            <span className="text-sm">{error}</span>
          </div>
        )}
        {success && (
          <div className="m-4 p-3 bg-green-50 border border-green-200 rounded-lg flex items-center gap-2 text-green-700">
            <FiCheck size={16} />
            <span className="text-sm">{success}</span>
          </div>
        )}

        {/* Tableau avec menu colonnes flottant */}
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="bg-gray-100 border-b border-gray-300">
                <th className="border-r border-gray-300 px-2 py-1.5 w-8 text-center">
                  <input
                    type="checkbox"
                    checked={selectedSequenceIds.length === paginatedSequences.length && paginatedSequences.length > 0}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedSequenceIds(paginatedSequences.map(s => s.id));
                      } else {
                        setSelectedSequenceIds([]);
                      }
                    }}
                    className="w-3.5 h-3.5 cursor-pointer"
                  />
                </th>
                {visibleColumns.code && (
                  <th 
                    className="border-r border-gray-300 px-2 py-1.5 text-left text-xs font-medium text-gray-700 cursor-pointer hover:bg-gray-200 min-w-[100px]"
                    onClick={() => handleSort('code')}
                  >
                    <div className="flex items-center gap-1">
                      <span>Code</span>
                      <SortIcon column="code" sortColumn={sortColumn} sortDirection={sortDirection} />
                    </div>
                  </th>
                )}
                {visibleColumns.name && (
                  <th 
                    className="border-r border-gray-300 px-2 py-1.5 text-left text-xs font-medium text-gray-700 cursor-pointer hover:bg-gray-200 min-w-[180px]"
                    onClick={() => handleSort('name')}
                  >
                    <div className="flex items-center gap-1">
                      <span>Nom</span>
                      <SortIcon column="name" sortColumn={sortColumn} sortDirection={sortDirection} />
                    </div>
                  </th>
                )}
                {visibleColumns.format && (
                  <th 
                    className="border-r border-gray-300 px-2 py-1.5 text-left text-xs font-medium text-gray-700 cursor-pointer hover:bg-gray-200 min-w-[120px]"
                    onClick={() => handleSort('format')}
                  >
                    <div className="flex items-center gap-1">
                      <span>Format</span>
                      <SortIcon column="format" sortColumn={sortColumn} sortDirection={sortDirection} />
                    </div>
                  </th>
                )}
                {visibleColumns.current_number && (
                  <th 
                    className="border-r border-gray-300 px-2 py-1.5 text-center text-xs font-medium text-gray-700 cursor-pointer hover:bg-gray-200 min-w-[120px]"
                    onClick={() => handleSort('current_number')}
                  >
                    <div className="flex items-center justify-center gap-1">
                      <span>Numéro courant</span>
                      <SortIcon column="current_number" sortColumn={sortColumn} sortDirection={sortDirection} />
                    </div>
                  </th>
                )}
                {visibleColumns.increment && (
                  <th 
                    className="border-r border-gray-300 px-2 py-1.5 text-center text-xs font-medium text-gray-700 cursor-pointer hover:bg-gray-200 min-w-[80px]"
                    onClick={() => handleSort('increment')}
                  >
                    <div className="flex items-center justify-center gap-1">
                      <span>Inc</span>
                      <SortIcon column="increment" sortColumn={sortColumn} sortDirection={sortDirection} />
                    </div>
                  </th>
                )}
                {visibleColumns.active && (
                  <th 
                    className="border-r border-gray-300 px-2 py-1.5 text-center text-xs font-medium text-gray-700 cursor-pointer hover:bg-gray-200 min-w-[70px]"
                    onClick={() => handleSort('active')}
                  >
                    <div className="flex items-center justify-center gap-1">
                      <span>Statut</span>
                      <SortIcon column="active" sortColumn={sortColumn} sortDirection={sortDirection} />
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
              ) : paginatedSequences.length === 0 ? (
                <tr>
                  <td colSpan={Object.values(visibleColumns).filter(v => v).length + 2} className="border border-gray-300 p-8 text-center text-gray-500 text-sm">
                    {activeFilters.length > 0 ? 'Aucun résultat pour ces filtres' : 'Aucune séquence'}
                  </td>
                </tr>
              ) : (
                paginatedSequences.map((sequence) => (
                  <tr
                    key={sequence.id}
                    className={`hover:bg-gray-50 cursor-pointer transition-colors ${activeRowId === sequence.id ? 'bg-purple-50' : ''}`}
                    onClick={() => setActiveRowId(sequence.id)}
                    onDoubleClick={() => navigate(`/comptabilite/sequences/${sequence.id}`)}
                  >
                    <td className="border border-gray-300 px-2 py-1.5 text-center" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={selectedSequenceIds.includes(sequence.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedSequenceIds([...selectedSequenceIds, sequence.id]);
                          } else {
                            setSelectedSequenceIds(selectedSequenceIds.filter(id => id !== sequence.id));
                          }
                        }}
                        className="w-3.5 h-3.5 cursor-pointer"
                      />
                    </td>
                    {visibleColumns.code && (
                      <td className="border border-gray-300 px-2 py-1.5 text-xs font-mono text-gray-900">
                        {sequence.code}
                      </td>
                    )}
                    {visibleColumns.name && (
                      <td className="border border-gray-300 px-2 py-1.5 text-xs text-gray-700">
                        {sequence.name}
                      </td>
                    )}
                    {visibleColumns.format && (
                      <td className="border border-gray-300 px-2 py-1.5 text-xs font-mono text-purple-600">
                        {formatPattern(sequence)}
                      </td>
                    )}
                    {visibleColumns.current_number && (
                      <td className="border border-gray-300 px-2 py-1.5 text-xs font-mono text-gray-900 text-center">
                        {formatCurrentNumber(sequence)}
                      </td>
                    )}
                    {visibleColumns.increment && (
                      <td className="border border-gray-300 px-2 py-1.5 text-xs text-gray-700 text-center">
                        +{sequence.number_increment || 1}
                      </td>
                    )}
                    {visibleColumns.active && (
                      <td className="border border-gray-300 px-2 py-1.5 text-center">
                        <ActiveBadge active={sequence.active} />
                      </td>
                    )}
                    <td className="border border-gray-300 px-2 py-1.5 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Tooltip text="Dupliquer">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDuplicate(sequence);
                            }}
                            className="p-1 text-gray-400 hover:text-emerald-600 transition-colors"
                          >
                            <FiCopy size={14} />
                          </button>
                        </Tooltip>
                        <Tooltip text="Modifier">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/comptabilite/sequences/${sequence.id}`);
                            }}
                            className="p-1 text-gray-400 hover:text-blue-600 transition-colors"
                          >
                            <FiEdit size={14} />
                          </button>
                        </Tooltip>
                        <Tooltip text="Supprimer">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setDeleteConfirm({ id: sequence.id, name: sequence.name });
                            }}
                            className="p-1 text-gray-400 hover:text-red-600 transition-colors"
                          >
                            <FiTrash2 size={14} />
                          </button>
                        </Tooltip>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Menu colonnes flottant */}
        {showColumnsMenu && (
          <div 
            id="columns-menu-sequences"
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

      {/* Modal confirmation suppression */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-red-100 rounded-full">
                <FiTrash2 className="text-red-600" size={20} />
              </div>
              <h3 className="text-lg font-semibold text-gray-900">Confirmer la suppression</h3>
            </div>
            <p className="text-gray-600 mb-6">
              Êtes-vous sûr de vouloir supprimer la séquence <span className="font-medium">"{deleteConfirm.name}"</span> ?
              Cette action est irréversible.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={handleDelete}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                Supprimer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}