// src/features/comptabilite/pages/types/TypeList.jsx
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FiAlertCircle,
  FiArrowDown,
  FiArrowUp,
  FiCheckCircle,
  FiChevronLeft,
  FiChevronRight,
  FiChevronsLeft,
  FiChevronsRight,
  FiEdit2,
  FiEye,
  FiFilter,
  FiMoreHorizontal,
  FiPlus,
  FiSettings,
  FiTrash2,
  FiX,
  FiXCircle,
} from 'react-icons/fi';
import useFrameworkStore from '../../../../stores/comptabilite/frameworkStore';
import useTypeStore from '../../../../stores/comptabilite/typeStore';

const FRAMEWORK_SESSION_KEY = 'type_list_selected_framework';

const CLOSING_BEHAVIOR_LABEL = {
  none: 'Aucun',
  carry_forward: 'Report à nouveau',
};

const Tooltip = ({ children, text, position = 'top' }) => {
  const [show, setShow] = useState(false);

  return (
    <div className="relative inline-block">
      <div onMouseEnter={() => setShow(true)} onMouseLeave={() => setShow(false)}>
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

const SortIcon = ({ column, sortColumn, sortDirection }) => {
  if (sortColumn !== column) return null;
  return sortDirection === 'asc'
    ? <FiArrowUp size={12} className="ml-1 inline" />
    : <FiArrowDown size={12} className="ml-1 inline" />;
};

const normalizeText = (value) => String(value || '')
  .trim()
  .toLowerCase()
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '');

const getFrameworkLabel = (framework) => {
  if (!framework) return '';
  return `${framework.code || ''} - ${framework.name || ''}`.trim();
};

const PieceDropdown = ({
  value,
  onChange,
  options = [],
  placeholder = '',
  disabled = false,
  allowClear = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const [dropdownStyle, setDropdownStyle] = useState({});
  const inputRef = useRef(null);
  const dropdownRef = useRef(null);

  const selectedOption = useMemo(
    () => options.find((option) => String(option.value) === String(value)),
    [options, value]
  );

  useEffect(() => {
    setInputValue(selectedOption?.label || '');
  }, [selectedOption]);

  const filteredOptions = useMemo(() => (
    options.filter((option) =>
      normalizeText(option.label).includes(normalizeText(inputValue))
    )
  ), [inputValue, options]);

  const updateDropdownPosition = useCallback(() => {
    if (!inputRef.current) return;
    const rect = inputRef.current.getBoundingClientRect();
    setDropdownStyle({
      position: 'fixed',
      top: `${rect.bottom}px`,
      left: `${rect.left}px`,
      width: `${rect.width}px`,
      zIndex: 9999,
      maxHeight: '220px',
      overflowY: 'auto',
    });
  }, []);

  useEffect(() => {
    if (!isOpen) return undefined;
    updateDropdownPosition();
    const handleScroll = () => updateDropdownPosition();
    const handleResize = () => updateDropdownPosition();
    window.addEventListener('scroll', handleScroll, true);
    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('scroll', handleScroll, true);
      window.removeEventListener('resize', handleResize);
    };
  }, [isOpen, updateDropdownPosition]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target) &&
        inputRef.current &&
        !inputRef.current.contains(event.target)
      ) {
        setIsOpen(false);
        setInputValue(selectedOption?.label || '');
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [selectedOption]);

  const selectOption = (option) => {
    if (disabled) return;
    setInputValue(option.label || '');
    setIsOpen(false);
    onChange?.(option.value);
  };

  const clearSelection = (event) => {
    event.preventDefault();
    event.stopPropagation();
    if (disabled) return;
    setInputValue('');
    setIsOpen(false);
    onChange?.(null);
  };

  const handleInputChange = (event) => {
    if (disabled) return;
    setInputValue(event.target.value);
    setIsOpen(true);
    setHighlightedIndex(0);
    if (value) onChange?.(null);
  };

  const handleKeyDown = (event) => {
    if (disabled) return;

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setIsOpen(true);
      setHighlightedIndex((prev) => (prev < filteredOptions.length - 1 ? prev + 1 : prev));
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : 0));
    } else if (event.key === 'Enter' && isOpen && filteredOptions.length > 0) {
      event.preventDefault();
      selectOption(filteredOptions[highlightedIndex]);
    } else if (event.key === 'Escape') {
      setIsOpen(false);
      setInputValue(selectedOption?.label || '');
    }
  };

  return (
    <>
      <div className="relative flex items-center border border-gray-300 rounded bg-white">
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={() => {
            if (!disabled) {
              setIsOpen(true);
              updateDropdownPosition();
            }
          }}
          placeholder={placeholder}
          disabled={disabled}
          className={`w-full px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-purple-500 rounded ${
            disabled ? 'bg-gray-100 text-gray-500 cursor-not-allowed' : 'bg-white text-gray-900'
          }`}
          style={{ height: '30px', border: 'none' }}
          autoComplete="off"
        />
        {allowClear && value && !disabled && (
          <button
            type="button"
            onClick={clearSelection}
            className="absolute right-1 top-1/2 -translate-y-1/2 px-1 text-xs text-gray-400 hover:text-gray-700"
            tabIndex={-1}
          >
            x
          </button>
        )}
      </div>
      {isOpen && !disabled && filteredOptions.length > 0 && (
        <div ref={dropdownRef} className="bg-white border border-gray-300 shadow-lg rounded" style={dropdownStyle}>
          {filteredOptions.map((option, index) => (
            <div
              key={option.value}
              className={`px-2 py-1 text-xs cursor-pointer ${
                index === highlightedIndex ? 'bg-purple-100 text-purple-700' : 'hover:bg-purple-50'
              } ${String(option.value) === String(value) ? 'bg-purple-50' : ''}`}
              onClick={() => selectOption(option)}
              onMouseEnter={() => setHighlightedIndex(index)}
            >
              {option.label}
            </div>
          ))}
        </div>
      )}
    </>
  );
};

const StatusBadge = ({ active }) => (
  <span className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium ${
    active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
  }`}>
    {active ? 'Actif' : 'Inactif'}
  </span>
);

const BalanceBadge = ({ value }) => {
  if (value === 'debit') {
    return <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-blue-100 text-blue-700">Débit</span>;
  }
  if (value === 'credit') {
    return <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-green-100 text-green-700">Crédit</span>;
  }
  return <span className="text-gray-400 text-xs">-</span>;
};

export default function TypeList() {
  const navigate = useNavigate();
  const filterMenuRef = React.useRef(null);
  const actionsMenuRef = React.useRef(null);

  const { types, loading, fetchTypes, deleteType } = useTypeStore();
  const { frameworks, fetchFrameworks } = useFrameworkStore();

  const [selectedFramework, setSelectedFramework] = useState(() => {
    const saved = sessionStorage.getItem(FRAMEWORK_SESSION_KEY);
    return saved ? parseInt(saved, 10) : null;
  });
  const [searchText, setSearchText] = useState('');
  const [activeFilters, setActiveFilters] = useState([]);
  const [showFilterMenu, setShowFilterMenu] = useState(false);
  const [showColumnsMenu, setShowColumnsMenu] = useState(false);
  const [showActionsMenu, setShowActionsMenu] = useState(false);
  const [columnsMenuPosition, setColumnsMenuPosition] = useState({ top: 0, left: 0 });
  const [selectedTypeIds, setSelectedTypeIds] = useState([]);
  const [activeRowId, setActiveRowId] = useState(null);
  const [actionLoading, setActionLoading] = useState(null);
  const [localError, setLocalError] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(15);
  const [sortColumn, setSortColumn] = useState('code');
  const [sortDirection, setSortDirection] = useState('asc');
  const [visibleColumns, setVisibleColumns] = useState({
    code: true,
    name: true,
    internal_group: true,
    parent: true,
    balance: true,
    reconciliation: true,
    closing: true,
    status: true,
  });

  const selectedFw = useMemo(
    () => frameworks.find((framework) => String(framework.id) === String(selectedFramework)),
    [frameworks, selectedFramework]
  );

  const frameworkOptions = useMemo(() => (
    frameworks.map((framework) => ({
      value: framework.id,
      label: getFrameworkLabel(framework),
    }))
  ), [frameworks]);

  const columns = [
    { id: 'code', label: 'Code', width: '90px' },
    { id: 'name', label: 'Nom', width: '180px' },
    { id: 'internal_group', label: 'Groupe / Classe', width: '150px' },
    { id: 'parent', label: 'Nature parente', width: '150px' },
    { id: 'balance', label: 'Solde par défaut', width: '115px' },
    { id: 'reconciliation', label: 'Lettrage', width: '75px', align: 'center' },
    { id: 'closing', label: 'Clôture', width: '120px' },
    { id: 'status', label: 'Statut', width: '80px' },
  ];

  useEffect(() => {
    fetchFrameworks();
  }, [fetchFrameworks]);

  const loadData = useCallback(async () => {
    if (!selectedFramework) return;
    try {
      setLocalError(null);
      await Promise.resolve(fetchTypes({ framework: selectedFramework }));
      setSelectedTypeIds([]);
      setActiveRowId(null);
    } catch {
      // Le store gere deja son etat; on evite d'afficher une erreur bloquante en boucle.
    }
  }, [fetchTypes, selectedFramework]);

  useEffect(() => {
    if (!selectedFramework) return;
    sessionStorage.setItem(FRAMEWORK_SESSION_KEY, String(selectedFramework));
    setCurrentPage(1);
    loadData();
  }, [selectedFramework, loadData]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (filterMenuRef.current && !filterMenuRef.current.contains(event.target)) {
        setShowFilterMenu(false);
      }
      if (actionsMenuRef.current && !actionsMenuRef.current.contains(event.target)) {
        setShowActionsMenu(false);
      }
      const columnsMenuElement = document.getElementById('types-columns-menu');
      if (columnsMenuElement && !columnsMenuElement.contains(event.target)) {
        const buttonElement = document.querySelector('.types-columns-menu-button');
        if (buttonElement && !buttonElement.contains(event.target)) {
          setShowColumnsMenu(false);
        }
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleFrameworkChange = (value) => {
    const nextValue = value ? parseInt(value, 10) : null;
    setSelectedFramework(nextValue);
    if (nextValue) sessionStorage.setItem(FRAMEWORK_SESSION_KEY, String(nextValue));
    else sessionStorage.removeItem(FRAMEWORK_SESSION_KEY);
  };

  const getSortedTypes = (items, column, direction) => [...items].sort((a, b) => {
    let aVal = '';
    let bVal = '';

    switch (column) {
      case 'code':
        aVal = a.code || '';
        bVal = b.code || '';
        break;
      case 'name':
        aVal = a.name || '';
        bVal = b.name || '';
        break;
      case 'internal_group':
        aVal = a.internal_group_name || '';
        bVal = b.internal_group_name || '';
        break;
      case 'parent':
        aVal = a.parent_name || '';
        bVal = b.parent_name || '';
        break;
      case 'balance':
        aVal = a.default_balance_type || '';
        bVal = b.default_balance_type || '';
        break;
      case 'reconciliation':
        aVal = a.allow_reconciliation ? 1 : 0;
        bVal = b.allow_reconciliation ? 1 : 0;
        break;
      case 'closing':
        aVal = CLOSING_BEHAVIOR_LABEL[a.closing_behavior] || a.closing_behavior || '';
        bVal = CLOSING_BEHAVIOR_LABEL[b.closing_behavior] || b.closing_behavior || '';
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

  const applyFiltersToTypes = (items, filters) => {
    let filtered = [...items];
    filters.forEach((filter) => {
      filtered = filtered.filter((type) => {
        let fieldValue = '';
        switch (filter.field) {
          case 'recherche':
            fieldValue = [
              type.code,
              type.name,
              type.internal_group_name,
              type.parent_name,
              type.default_balance_type,
              CLOSING_BEHAVIOR_LABEL[type.closing_behavior],
            ].filter(Boolean).join(' ');
            break;
          case 'status':
            fieldValue = type.active ? 'active actif' : 'inactive inactif';
            break;
          case 'balance':
            fieldValue = type.default_balance_type || '';
            break;
          case 'reconciliation':
            fieldValue = type.allow_reconciliation ? 'yes oui true' : 'no non false';
            break;
          default:
            fieldValue = '';
        }
        return normalizeText(fieldValue).includes(normalizeText(filter.value));
      });
    });
    return filtered;
  };

  const filteredTypes = useMemo(() => {
    const filtered = applyFiltersToTypes(types, activeFilters);
    return getSortedTypes(filtered, sortColumn, sortDirection);
  }, [types, activeFilters, sortColumn, sortDirection]);

  const totalPages = Math.max(1, Math.ceil(filteredTypes.length / itemsPerPage));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const startIndex = (safeCurrentPage - 1) * itemsPerPage;
  const paginatedTypes = filteredTypes.slice(startIndex, startIndex + itemsPerPage);

  const handleSort = (column) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
  };

  const addSearchAsFilter = () => {
    if (searchText.trim()) {
      setActiveFilters([...activeFilters, { field: 'recherche', value: searchText.trim() }]);
      setSearchText('');
      setCurrentPage(1);
    }
  };

  const addFilter = (field, value) => {
    setActiveFilters([...activeFilters, { field, value }]);
    setShowFilterMenu(false);
    setCurrentPage(1);
  };

  const removeFilter = (index) => {
    setActiveFilters(activeFilters.filter((_, i) => i !== index));
  };

  const clearAllFilters = () => {
    setActiveFilters([]);
    setSearchText('');
  };

  const handleNew = () => navigate('/comptabilite/types/new', { state: { frameworkId: selectedFramework } });
  const handleView = (record) => navigate(`/comptabilite/types/${record.id}`);
  const handleEdit = (record) => navigate(`/comptabilite/types/${record.id}/edit`, { state: { frameworkId: selectedFramework } });

  const getSelectedRecords = () => {
    const selectedIds = new Set(selectedTypeIds.map((value) => String(value)));
    if (selectedIds.size > 0) return types.filter((type) => selectedIds.has(String(type.id)));
    const activeType = types.find((type) => String(type.id) === String(activeRowId));
    return activeType ? [activeType] : [];
  };

  const handleActionView = () => {
    const records = getSelectedRecords();
    if (records.length === 0) {
      setLocalError('Sélectionnez une nature.');
      return;
    }
    setShowActionsMenu(false);
    handleView(records[0]);
  };

  const handleActionEdit = () => {
    const records = getSelectedRecords();
    if (records.length === 0) {
      setLocalError('Sélectionnez une nature.');
      return;
    }
    setShowActionsMenu(false);
    handleEdit(records[0]);
  };

  const handleDelete = async () => {
    const records = getSelectedRecords();
    if (records.length === 0) {
      setLocalError('Aucune nature sélectionnée.');
      return;
    }
    const label = records.length === 1 ? `"${records[0].code} - ${records[0].name}"` : `${records.length} natures`;
    if (!window.confirm(`Supprimer ${label} ? Cette action est irréversible.`)) return;

    setShowActionsMenu(false);
    setActionLoading('delete');
    try {
      for (const record of records) {
        await deleteType(record.id);
      }
      await loadData();
    } catch {
      setLocalError('Erreur lors de la suppression.');
    } finally {
      setActionLoading(null);
    }
  };

  const displayFilter = (filter) => {
    if (filter.field === 'status') return filter.value === 'active' ? 'Actif' : 'Inactif';
    if (filter.field === 'balance') return filter.value === 'debit' ? 'Débit' : 'Crédit';
    if (filter.field === 'reconciliation') return filter.value === 'yes' ? 'Lettrable' : 'Non lettrable';
    return filter.value;
  };

  if (loading && types.length === 0 && selectedFramework) {
    return (
      <div className="min-h-screen bg-gray-50 p-4">
        <div className="max-w-full mx-auto bg-white border border-gray-300">
          <div className="border-b border-gray-300 px-4 py-3">
            <div className="text-lg font-bold text-gray-900">Natures de comptes</div>
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
        <div className="border-b border-gray-300 px-4 py-2">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 flex-shrink-0">
              <Tooltip text="Créer une nouvelle nature">
                <button
                  onClick={handleNew}
                  disabled={!selectedFramework}
                  className="h-8 px-3 bg-purple-600 text-white text-xs font-medium hover:bg-purple-700 hover:scale-105 transition-all duration-200 rounded flex items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <FiPlus size={12} /> Nouvelle nature
                </button>
              </Tooltip>
              <Tooltip text="Actualiser la liste">
                <h1
                  className="text-lg font-bold text-gray-900 cursor-pointer hover:text-purple-600 hover:scale-105 transition-all duration-200"
                  onClick={loadData}
                >
                  Natures de comptes
                </h1>
              </Tooltip>

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
                    <Tooltip text="Voir la nature sélectionnée" position="right">
                      <button
                        onClick={handleActionView}
                        disabled={!!actionLoading}
                        className="w-full px-3 py-2 text-xs text-left hover:bg-gray-50 flex items-center gap-2 disabled:opacity-50"
                      >
                        <FiEye size={12} /> Voir le détail
                      </button>
                    </Tooltip>
                    <Tooltip text="Modifier la nature sélectionnée" position="right">
                      <button
                        onClick={handleActionEdit}
                        disabled={!!actionLoading}
                        className="w-full px-3 py-2 text-xs text-left hover:bg-gray-50 flex items-center gap-2 disabled:opacity-50"
                      >
                        <FiEdit2 size={12} /> Modifier
                      </button>
                    </Tooltip>
                    <Tooltip text="Supprimer les natures sélectionnées" position="right">
                      <button
                        onClick={handleDelete}
                        disabled={!!actionLoading}
                        className="w-full px-3 py-2 text-xs text-left hover:bg-red-50 hover:text-red-600 flex items-center gap-2 disabled:opacity-50"
                      >
                        <FiTrash2 size={12} /> Supprimer
                      </button>
                    </Tooltip>
                  </div>
                )}
              </div>
            </div>

            <div className="flex-1 flex justify-center">
              <div className="relative w-full max-w-2xl">
                <div className="flex items-center flex-wrap border border-gray-300 rounded bg-white min-h-[38px] p-1">
                  {activeFilters.map((filter, index) => (
                    <span key={`${filter.field}-${index}`} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-blue-100 text-blue-700 m-0.5">
                      {displayFilter(filter)}
                      <button onClick={() => removeFilter(index)} className="hover:text-red-600">
                        <FiX size={10} />
                      </button>
                    </span>
                  ))}

                  <input
                    type="text"
                    value={searchText}
                    onChange={(event) => setSearchText(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') addSearchAsFilter();
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
                          <p className="text-xs font-medium text-gray-700 mb-2">Référentiel comptable</p>
                          <PieceDropdown
                            value={selectedFramework}
                            onChange={handleFrameworkChange}
                            allowClear
                            placeholder="Sélectionnez un plan..."
                            options={frameworkOptions}
                          />
                        </div>
                        <div className="p-2 border-b border-gray-200">
                          <p className="text-xs font-medium text-gray-700 mb-2">Ajouter un filtre</p>
                          <div className="space-y-2">
                            <button onClick={() => addFilter('status', 'active')} className="w-full text-left text-xs px-2 py-1 hover:bg-gray-100 rounded flex items-center gap-2">
                              <span className="w-20">Statut</span><span className="text-green-600">= Actif</span>
                            </button>
                            <button onClick={() => addFilter('status', 'inactive')} className="w-full text-left text-xs px-2 py-1 hover:bg-gray-100 rounded flex items-center gap-2">
                              <span className="w-20">Statut</span><span className="text-gray-600">= Inactif</span>
                            </button>
                            <button onClick={() => addFilter('balance', 'debit')} className="w-full text-left text-xs px-2 py-1 hover:bg-gray-100 rounded flex items-center gap-2">
                              <span className="w-20">Solde</span><span className="text-blue-600">= Débit</span>
                            </button>
                            <button onClick={() => addFilter('balance', 'credit')} className="w-full text-left text-xs px-2 py-1 hover:bg-gray-100 rounded flex items-center gap-2">
                              <span className="w-20">Solde</span><span className="text-green-600">= Crédit</span>
                            </button>
                            <button onClick={() => addFilter('reconciliation', 'yes')} className="w-full text-left text-xs px-2 py-1 hover:bg-gray-100 rounded flex items-center gap-2">
                              <span className="w-20">Lettrage</span><span className="text-green-600">= Oui</span>
                            </button>
                            <button onClick={() => addFilter('reconciliation', 'no')} className="w-full text-left text-xs px-2 py-1 hover:bg-gray-100 rounded flex items-center gap-2">
                              <span className="w-20">Lettrage</span><span className="text-red-600">= Non</span>
                            </button>
                          </div>
                        </div>
                        {activeFilters.length > 0 && (
                          <div className="p-2">
                            <button onClick={clearAllFilters} className="w-full text-xs text-red-600 hover:text-red-700 text-center py-1">
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
                onChange={(event) => {
                  setItemsPerPage(Number(event.target.value));
                  setCurrentPage(1);
                }}
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

        {selectedTypeIds.length > 0 && (
          <div className="border-b border-gray-300 px-4 py-2 bg-gray-50 flex items-center gap-2">
            <span className="text-xs text-gray-600">{selectedTypeIds.length} nature(s) sélectionnée(s)</span>
            <button
              onClick={handleActionEdit}
              disabled={!!actionLoading || selectedTypeIds.length !== 1}
              className="h-6 px-2 bg-purple-600 text-white text-xs hover:bg-purple-700 rounded disabled:opacity-50"
            >
              Modifier
            </button>
            <button
              onClick={handleDelete}
              disabled={!!actionLoading}
              className="h-6 px-2 bg-red-600 text-white text-xs hover:bg-red-700 rounded disabled:opacity-50"
            >
              Supprimer
            </button>
          </div>
        )}

        {localError && (
          <div className="border-b border-red-200 bg-red-50 px-4 py-2 flex items-center gap-2 text-xs text-red-700">
            <FiAlertCircle size={14} />
            <span>{localError}</span>
            <button onClick={() => setLocalError(null)} className="ml-auto text-red-500 hover:text-red-700">Fermer</button>
          </div>
        )}

        {!selectedFramework ? (
          <div className="p-8 text-center text-gray-500 text-sm">
            Sélectionnez un référentiel comptable depuis le filtre pour afficher les natures.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="bg-gray-100 border-b border-gray-300">
                  <th className="border-r border-gray-300 px-2 py-1.5 w-8 text-center">
                    <input
                      type="checkbox"
                      checked={selectedTypeIds.length === paginatedTypes.length && paginatedTypes.length > 0}
                      onChange={(event) => {
                        if (event.target.checked) setSelectedTypeIds(paginatedTypes.map((type) => type.id));
                        else setSelectedTypeIds([]);
                      }}
                      className="w-3.5 h-3.5 cursor-pointer"
                    />
                  </th>
                  {columns.map((column) => visibleColumns[column.id] && (
                    <th
                      key={column.id}
                      className={`border-r border-gray-300 px-2 py-1.5 text-xs font-medium text-gray-700 cursor-pointer hover:bg-gray-200 ${
                        column.align === 'center' ? 'text-center' : 'text-left'
                      }`}
                      style={{ minWidth: column.width }}
                      onClick={() => handleSort(column.id)}
                    >
                      <div className={`flex items-center gap-1 ${column.align === 'center' ? 'justify-center' : ''}`}>
                        <span>{column.label}</span>
                        <SortIcon column={column.id} sortColumn={sortColumn} sortDirection={sortDirection} />
                      </div>
                    </th>
                  ))}
                  <th className="border-l border-gray-300 px-2 py-1.5 w-10 text-center">
                    <Tooltip text="Choisir les colonnes à afficher">
                      <button
                        className="types-columns-menu-button p-1 rounded hover:bg-gray-200"
                        onClick={(event) => {
                          event.stopPropagation();
                          const rect = event.currentTarget.getBoundingClientRect();
                          setColumnsMenuPosition({
                            top: rect.bottom + window.scrollY + 5,
                            left: rect.right - 200,
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
                {paginatedTypes.length === 0 ? (
                  <tr>
                    <td colSpan={Object.values(visibleColumns).filter(Boolean).length + 2} className="border border-gray-300 p-8 text-center text-gray-500 text-sm">
                      {activeFilters.length > 0 ? 'Aucun résultat pour ces filtres' : 'Aucune nature de compte'}
                    </td>
                  </tr>
                ) : (
                  paginatedTypes.map((type) => (
                    <tr
                      key={type.id}
                      className={`hover:bg-gray-50 cursor-pointer transition-colors ${activeRowId === type.id ? 'bg-purple-50' : ''}`}
                      onClick={() => setActiveRowId(type.id)}
                      onDoubleClick={() => handleView(type)}
                    >
                      <td className="border border-gray-300 px-2 py-1.5 text-center" onClick={(event) => event.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={selectedTypeIds.includes(type.id)}
                          onChange={(event) => {
                            if (event.target.checked) setSelectedTypeIds([...selectedTypeIds, type.id]);
                            else setSelectedTypeIds(selectedTypeIds.filter((id) => id !== type.id));
                          }}
                          className="w-3.5 h-3.5 cursor-pointer"
                        />
                      </td>
                      {visibleColumns.code && (
                        <td className="border border-gray-300 px-2 py-1.5 text-xs font-mono font-medium text-blue-700">
                          {type.code || '-'}
                        </td>
                      )}
                      {visibleColumns.name && (
                        <td className="border border-gray-300 px-2 py-1.5">
                          <div className="text-xs">
                            <div className="font-medium truncate max-w-[180px]">{type.name || '-'}</div>
                            <div className="text-gray-400 text-[10px] truncate max-w-[180px]">{type.code || ''}</div>
                          </div>
                        </td>
                      )}
                      {visibleColumns.internal_group && (
                        <td className="border border-gray-300 px-2 py-1.5">
                          {type.internal_group_name ? (
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-purple-100 text-purple-700">
                              {type.internal_group_name}
                            </span>
                          ) : (
                            <span className="text-gray-400 text-xs">-</span>
                          )}
                        </td>
                      )}
                      {visibleColumns.parent && (
                        <td className="border border-gray-300 px-2 py-1.5">
                          {type.parent_name ? (
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-orange-100 text-orange-700">
                              {type.parent_name}
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-gray-100 text-gray-700">
                              Racine
                            </span>
                          )}
                        </td>
                      )}
                      {visibleColumns.balance && (
                        <td className="border border-gray-300 px-2 py-1.5">
                          <BalanceBadge value={type.default_balance_type} />
                        </td>
                      )}
                      {visibleColumns.reconciliation && (
                        <td className="border border-gray-300 px-2 py-1.5 text-center">
                          {type.allow_reconciliation ? (
                            <FiCheckCircle className="inline text-green-600" size={16} />
                          ) : (
                            <FiXCircle className="inline text-gray-300" size={16} />
                          )}
                        </td>
                      )}
                      {visibleColumns.closing && (
                        <td className="border border-gray-300 px-2 py-1.5">
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-gray-100 text-gray-700">
                            {CLOSING_BEHAVIOR_LABEL[type.closing_behavior] || type.closing_behavior || '-'}
                          </span>
                        </td>
                      )}
                      {visibleColumns.status && (
                        <td className="border border-gray-300 px-2 py-1.5">
                          <StatusBadge active={type.active} />
                        </td>
                      )}
                      <td className="border border-gray-300 px-2 py-1.5"></td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {showColumnsMenu && (
          <div
            id="types-columns-menu"
            className="fixed bg-white border border-gray-300 shadow-lg rounded z-50"
            style={{ top: columnsMenuPosition.top, left: columnsMenuPosition.left, width: '200px' }}
          >
            <div className="p-2 border-b border-gray-200">
              <p className="text-xs font-medium text-gray-700 mb-2">Colonnes à afficher</p>
              {columns.map((column) => (
                <label key={column.id} className="flex items-center gap-2 py-1 px-2 hover:bg-gray-50 rounded cursor-pointer">
                  <input
                    type="checkbox"
                    checked={visibleColumns[column.id]}
                    onChange={() => setVisibleColumns({ ...visibleColumns, [column.id]: !visibleColumns[column.id] })}
                    className="w-3.5 h-3.5 cursor-pointer"
                  />
                  <span className="text-xs">{column.label}</span>
                </label>
              ))}
            </div>
            <div className="p-2">
              <button
                onClick={() => {
                  const allTrue = {};
                  columns.forEach((column) => { allTrue[column.id] = true; });
                  setVisibleColumns(allTrue);
                }}
                className="w-full text-xs text-purple-600 hover:text-purple-700 text-center py-1"
              >
                Tout afficher
              </button>
              <button
                onClick={() => {
                  const allFalse = {};
                  columns.forEach((column) => { allFalse[column.id] = false; });
                  setVisibleColumns(allFalse);
                }}
                className="w-full text-xs text-gray-500 hover:text-gray-600 text-center py-1"
              >
                Tout masquer
              </button>
            </div>
          </div>
        )}

        {totalPages > 1 && (
          <div className="border-t border-gray-300 px-4 py-2 flex items-center justify-between">
            <div className="text-xs text-gray-500">
              Page {safeCurrentPage} sur {totalPages}
            </div>
            <div className="flex items-center gap-1">
              <button onClick={() => setCurrentPage(1)} disabled={safeCurrentPage === 1} className="p-1 rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed">
                <FiChevronsLeft size={14} />
              </button>
              <button onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))} disabled={safeCurrentPage === 1} className="p-1 rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed">
                <FiChevronLeft size={14} />
              </button>
              <span className="px-2 text-xs text-gray-700">
                {safeCurrentPage} / {totalPages}
              </span>
              <button onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))} disabled={safeCurrentPage === totalPages} className="p-1 rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed">
                <FiChevronRight size={14} />
              </button>
              <button onClick={() => setCurrentPage(totalPages)} disabled={safeCurrentPage === totalPages} className="p-1 rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed">
                <FiChevronsRight size={14} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export { TypeList };
