// features/comptabilité/components/ComptabiliteTableContainer.jsx
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { 
  FiSearch, 
  FiX, 
  FiFilter, 
  FiPlus, 
  FiRefreshCw,
  FiEye,
  FiEdit2,
  FiTrash2,
  FiChevronLeft,
  FiChevronRight,
  FiCopy,
  FiCheckCircle,
  FiXCircle,
  FiRotateCcw,
  FiSettings
} from "react-icons/fi";
import { FaFileExcel, FaFilePdf } from "react-icons/fa";
import { TbBuildingSkyscraper } from "react-icons/tb";

export default function ComptabiliteTableContainer({
  data = [],
  loading = false,
  error = null,
  title = "Tableau",
  moduleType = 'journaux',
  columns = [],
  defaultVisibleColumns = [],
  filterConfigs = [],
  onFilterChange = () => {},
  onRefresh = null,
  onExport = null,
  onImport = null,
  onCreate = null,
  onSearch = null,
  onConfirm = null,
  onDuplicate = null,
  onCancel = null,
  onReverse = null,
  onModify = null,
  onSelectionChange = null,
  itemsPerPage: initialItemsPerPage = 10,
  onItemsPerPageChange = null,
  pagination = null,
  onRowClick = null,
  onView = null,
  onEdit = null,
  onDelete = null,
  emptyState = null,
  children,
  activeRowId = null
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);
  const [showActionsDropdown, setShowActionsDropdown] = useState(false);
  const [selectedRows, setSelectedRows] = useState([]);
  const [activeFilters, setActiveFilters] = useState([]);
  const [itemsPerPage, setItemsPerPage] = useState(initialItemsPerPage);
  const [currentPage, setCurrentPage] = useState(1);
  const [visibleColumns, setVisibleColumns] = useState(
    defaultVisibleColumns.length > 0 ? defaultVisibleColumns : columns.map(col => col.id)
  );
  const [showColumnMenu, setShowColumnMenu] = useState(false);
  const [menuPosition, setMenuPosition] = useState({ top: 0, right: 0 });
  const columnButtonRef = useRef(null);

  // Fermer le menu au clic extérieur
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (
        showColumnMenu &&
        !e.target.closest('.column-menu-trigger') &&
        !e.target.closest('.column-menu')
      ) {
        setShowColumnMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showColumnMenu]);

  const moduleConfigs = {
    journaux: {
      title: 'Journaux Comptables',
      searchPlaceholder: 'Rechercher un journal...',
      createButtonText: 'Nouveau Journal',
      emptyMessage: 'Aucun journal disponible',
      icon: TbBuildingSkyscraper
    },
    pieces: {
      title: 'Pièces Comptables',
      searchPlaceholder: 'Rechercher une pièce...',
      createButtonText: 'Nouvelle Pièce',
      emptyMessage: 'Aucune pièce disponible',
      icon: TbBuildingSkyscraper
    },
    comptes: {
      title: 'Plan Comptable',
      searchPlaceholder: 'Rechercher un compte...',
      createButtonText: 'Nouveau Compte',
      emptyMessage: 'Aucun compte disponible',
      icon: TbBuildingSkyscraper
    }
  };
  
  const config = moduleConfigs[moduleType] || moduleConfigs.journaux;
  const finalTitle = title || config.title;
  
  const visibleColumnDefs = useMemo(() => {
    return columns.filter(col => visibleColumns.includes(col.id));
  }, [columns, visibleColumns]);
  
  const handleSearch = (e) => {
    const value = e.target.value;
    setSearchTerm(value);
    if (onSearch) {
      onSearch(value);
    }
  };
  
  const handleAddFilter = (filter) => {
    const newFilter = {
      id: `${filter.id}-${Date.now()}`,
      ...filter,
      label: filterConfigs.find(f => f.id === filter.id)?.label || filter.id
    };
    setActiveFilters([...activeFilters, newFilter]);
    setShowFilterDropdown(false);
    onFilterChange([...activeFilters, newFilter]);
  };
  
  const handleRemoveFilter = (filterId) => {
    const newFilters = activeFilters.filter(f => f.id !== filterId);
    setActiveFilters(newFilters);
    onFilterChange(newFilters);
  };
  
  const handleClearAllFilters = () => {
    setActiveFilters([]);
    onFilterChange([]);
  };
  
  const toggleRowSelection = (id) => {
    setSelectedRows(prev => {
      const newSelected = prev.includes(id)
        ? prev.filter(rowId => rowId !== id)
        : [...prev, id];
      
      if (onSelectionChange) {
        onSelectionChange(newSelected);
      }
      
      return newSelected;
    });
  };

  const selectAllRows = () => {
    setSelectedRows(prev => {
      const allIds = paginatedData.map(item => item.id).filter(id => id != null);
      const newSelected = (prev.length === allIds.length && allIds.length > 0) ? [] : allIds;
      
      if (onSelectionChange) {
        onSelectionChange(newSelected);
      }
      
      return newSelected;
    });
  };
  
  const totalItems = pagination?.totalItems || data.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  
  const paginatedData = pagination 
    ? data
    : data.slice(startIndex, endIndex);
  
  const handlePageChange = (page) => {
    setCurrentPage(page);
    if (pagination?.onPageChange) {
      pagination.onPageChange(page);
    }
  };
  
  const handleItemsPerPageChange = (value) => {
    setItemsPerPage(value);
    setCurrentPage(1);
    if (onItemsPerPageChange) {
      onItemsPerPageChange(value);
    }
  };
  
  const handleExport = (format) => {
    if (onExport) {
      onExport(format);
    }
  };

  const renderStatus = (item) => {
    if (item.active !== undefined) {
      return (
        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
          item.active
            ? 'bg-green-100 text-green-800'
            : 'bg-gray-100 text-gray-800'
        }`}>
          {item.active ? 'Actif' : 'Inactif'}
        </span>
      );
    }
    if (item.statut !== undefined) {
      return (
        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
          item.statut
            ? 'bg-green-100 text-green-800'
            : 'bg-red-100 text-red-800'
        }`}>
          {item.statut ? 'Active' : 'Inactive'}
        </span>
      );
    }
    return '-';
  };
  
  const renderDefaultActions = (item) => {
    return (
      <div className="flex items-center gap-1">
        {(onView || onRowClick) && (
          <button
            onClick={() => onView ? onView(item) : onRowClick(item)}
            className="p-1 bg-gradient-to-r from-gray-50 to-gray-100 text-gray-700 rounded hover:from-gray-100 hover:to-gray-200 transition-all duration-200 shadow-sm hover:shadow"
            title="Voir détails"
          >
            <FiEye size={12} />
          </button>
        )}
        {onEdit && (
          <button
            onClick={() => onEdit(item)}
            className="p-1 bg-gradient-to-r from-violet-50 to-violet-100 text-violet-700 rounded hover:from-violet-100 hover:to-violet-200 transition-all duration-200 shadow-sm hover:shadow"
            title="Modifier"
          >
            <FiEdit2 size={12} />
          </button>
        )}
        {onDelete && (
          <button
            onClick={() => onDelete(item)}
            className="p-1 bg-gradient-to-r from-red-50 to-red-100 text-red-700 rounded hover:from-red-100 hover:to-red-200 transition-all duration-200 shadow-sm hover:shadow"
            title="Supprimer"
          >
            <FiTrash2 size={12} />
          </button>
        )}
      </div>
    );
  };
  
  const renderCell = (item, column) => {
    if (column.render) {
      return column.render(item);
    }
    
    if (column.type === 'actions') {
      return renderDefaultActions(item);
    }
    
    if (column.field === 'statut' || column.field === 'active') {
      return renderStatus(item);
    }
    
    if (column.field && column.field.includes('.')) {
      const fields = column.field.split('.');
      let value = item;
      for (const field of fields) {
        value = value?.[field];
        if (value === undefined) break;
      }
      return value || '-';
    }
    
    return item[column.field] || '-';
  };

  if (loading) {
    return (
      <div className="px-4 pt-0 pb-4 bg-gradient-to-br from-gray-50 to-white min-h-screen"> {/* 👈 pt-0 ici aussi */}
        <div className="flex flex-col items-center justify-center h-96">
          <div className="relative">
            <div className="w-12 h-12 border-3 border-gray-200 rounded-full"></div>
            <div className="absolute top-0 left-0 w-12 h-12 border-3 border-violet-600 border-t-transparent rounded-full animate-spin"></div>
          </div>
          <div className="mt-4">
            <div className="h-2 bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 rounded-full w-32 animate-pulse"></div>
            <div className="h-2 bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 rounded-full w-24 mt-2 animate-pulse mx-auto"></div>
          </div>
        </div>
      </div>
    );
  }

  // 👇 CHANGEMENT PRINCIPAL ICI : pt-0 au lieu de p-4
  return (
    <div className="px-4 pt-0 pb-4 bg-gradient-to-br from-gray-50 to-white min-h-screen">
      
      {/* === BARRE D'EN-TÊTE EXCEL-LIKE === */}
      <div className="flex items-center gap-2 mb-0 flex-wrap p-2 border border-gray-300 rounded-lg bg-white">
        {onCreate && (
          <button 
            onClick={onCreate}
            className="px-3 py-1.5 bg-gradient-to-r from-violet-600 to-violet-500 text-white rounded hover:from-violet-700 hover:to-violet-600 transition-all duration-300 font-medium flex items-center gap-1 shadow text-sm"
          >
            <FiPlus size={14} />
            <span>Nouveau</span>
          </button>
        )}

        <button
          onClick={onRefresh || onCreate}
          className="text-base font-bold text-gray-900 hover:text-violet-700 transition-colors px-2 py-1.5 h-full flex items-center"
        >
          {finalTitle}
        </button>

        {(
          onConfirm || onDuplicate || onCancel || onReverse || onModify || onDelete || onExport || onRefresh
        ) && (
          <div className="relative h-full flex items-center">
            <button
              onClick={() => setShowActionsDropdown(!showActionsDropdown)}
              className="p-1.5 rounded-lg border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 transition-all text-sm flex items-center gap-1 h-full"
              title="Menu d'actions"
            >
              <FiSettings size={16} />
            </button>
            
            {showActionsDropdown && (
              <div className="absolute left-0 top-full mt-1 w-48 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
                <div className="p-2">
                  <p className="text-xs font-medium text-gray-700 mb-2">Actions</p>
                  
                  {onModify && (
                    <button
                      onClick={() => { onModify(); setShowActionsDropdown(false); }}
                      className="w-full text-left px-2 py-1.5 rounded text-sm text-gray-700 hover:bg-gray-50 transition-colors flex items-center gap-2"
                    >
                      <FiEdit2 size={12} />
                      Modifier
                    </button>
                  )}
                  
                  {onConfirm && (
                    <button
                      onClick={() => { onConfirm(); setShowActionsDropdown(false); }}
                      className="w-full text-left px-2 py-1.5 rounded text-sm text-gray-700 hover:bg-gray-50 transition-colors flex items-center gap-2"
                    >
                      <FiCheckCircle size={12} />
                      Confirmer
                    </button>
                  )}
                  
                  {onDuplicate && (
                    <button
                      onClick={() => { onDuplicate(); setShowActionsDropdown(false); }}
                      className="w-full text-left px-2 py-1.5 rounded text-sm text-gray-700 hover:bg-gray-50 transition-colors flex items-center gap-2"
                    >
                      <FiCopy size={12} />
                      Dupliquer
                    </button>
                  )}
                  
                  {onDelete && (
                    <button
                      onClick={() => { onDelete(); setShowActionsDropdown(false); }}
                      className="w-full text-left px-2 py-1.5 rounded text-sm text-gray-700 hover:bg-gray-50 transition-colors flex items-center gap-2"
                    >
                      <FiTrash2 size={12} />
                      Supprimer
                    </button>
                  )}
                  
                  {onCancel && (
                    <button
                      onClick={() => { onCancel(); setShowActionsDropdown(false); }}
                      className="w-full text-left px-2 py-1.5 rounded text-sm text-gray-700 hover:bg-gray-50 transition-colors flex items-center gap-2"
                    >
                      <FiXCircle size={12} />
                      Annuler
                    </button>
                  )}
                  
                  {onReverse && (
                    <button
                      onClick={() => { onReverse(); setShowActionsDropdown(false); }}
                      className="w-full text-left px-2 py-1.5 rounded text-sm text-gray-700 hover:bg-gray-50 transition-colors flex items-center gap-2"
                    >
                      <FiRotateCcw size={12} />
                      Extourner
                    </button>
                  )}
                  
                  {onExport && (
                    <>
                      <div className="border-t border-gray-200 my-1"></div>
                      <button
                        onClick={() => { handleExport('excel'); setShowActionsDropdown(false); }}
                        className="w-full text-left px-2 py-1.5 rounded text-sm text-gray-700 hover:bg-gray-50 transition-colors flex items-center gap-2"
                      >
                        <FaFileExcel size={12} className="text-green-500" />
                        Export Excel
                      </button>
                      <button
                        onClick={() => { handleExport('pdf'); setShowActionsDropdown(false); }}
                        className="w-full text-left px-2 py-1.5 rounded text-sm text-gray-700 hover:bg-gray-50 transition-colors flex items-center gap-2"
                      >
                        <FaFilePdf size={12} className="text-red-500" />
                        Export PDF
                      </button>
                    </>
                  )}
                  
                  {onRefresh && (
                    <>
                      <div className="border-t border-gray-200 my-1"></div>
                      <button
                        onClick={() => { onRefresh(); setShowActionsDropdown(false); }}
                        className="w-full text-left px-2 py-1.5 rounded text-sm text-gray-700 hover:bg-gray-50 transition-colors flex items-center gap-2"
                      >
                        <FiRefreshCw size={12} />
                        Actualiser
                      </button>
                    </>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        <div className="relative flex-1 max-w-2xl">
          <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
          <input
            type="text"
            value={searchTerm}
            onChange={handleSearch}
            className="pl-9 pr-8 py-1.5 w-full border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-violet-500 focus:border-transparent text-sm h-full"
            placeholder={config.searchPlaceholder}
          />
          {searchTerm && (
            <button
              onClick={() => {
                setSearchTerm('');
                onSearch && onSearch('');
              }}
              className="absolute right-6 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1"
            >
              <FiX size={14} />
            </button>
          )}
          
          <div className="absolute right-1 top-1/2 transform -translate-y-1/2">
            <button
              onClick={() => setShowFilterDropdown(!showFilterDropdown)}
              className={`flex items-center gap-1 px-2 py-1.5 rounded text-xs font-medium h-full ${
                activeFilters.length > 0 ? 'bg-violet-100 text-violet-700' : 'bg-gray-100 text-gray-700'
              } hover:bg-gray-200 transition-colors`}
            >
              <FiFilter size={12} />
              Filtre
              {activeFilters.length > 0 && (
                <span className="ml-1 bg-violet-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">
                  {activeFilters.length}
                </span>
              )}
            </button>
            
            {showFilterDropdown && (
              <div className="absolute right-0 top-full mt-1 w-48 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
                <div className="p-2">
                  <p className="text-xs font-medium text-gray-700 mb-2">Ajouter un filtre</p>
                  <div className="space-y-1 max-h-48 overflow-y-auto">
                    {filterConfigs.map(filter => (
                      <button
                        key={filter.id}
                        onClick={() => handleAddFilter({
                          id: filter.id,
                          value: filter.options?.[0]?.value || '',
                          label: filter.label,
                          type: filter.type
                        })}
                        className="w-full text-left px-2 py-1.5 rounded text-xs text-gray-700 hover:bg-gray-50 transition-colors flex items-center justify-between"
                      >
                        <span>{filter.label}</span>
                        <FiPlus size={10} />
                      </button>
                    ))}
                  </div>
                  
                  {activeFilters.length > 0 && (
                    <div className="mt-3 pt-2 border-t border-gray-200">
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-xs font-medium text-gray-700">Filtres actifs</p>
                        <button
                          onClick={handleClearAllFilters}
                          className="text-xs text-red-600 hover:text-red-800"
                        >
                          Tout effacer
                        </button>
                      </div>
                      {activeFilters.map(filter => (
                        <div key={filter.id} className="flex items-center justify-between text-xs py-1">
                          <span className="text-gray-600 truncate">{filter.label}: {filter.value}</span>
                          <button
                            onClick={() => handleRemoveFilter(filter.id)}
                            className="text-gray-400 hover:text-gray-600"
                          >
                            <FiX size={10} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ✅ SELECT "10 LIGNES" — ISOLÉ À DROITE */}
        <select
          value={itemsPerPage}
          onChange={(e) => handleItemsPerPageChange(Number(e.target.value))}
          className="ml-auto border border-gray-300 rounded px-2 py-1 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-violet-500 focus:border-transparent"
        >
          <option value={5}>5 lignes</option>
          <option value={10}>10 lignes</option>
          <option value={20}>20 lignes</option>
          <option value={50}>50 lignes</option>
        </select>
      </div>

      {error && (
        <div className="mb-3">
          <div className="bg-gradient-to-r from-red-50 to-red-100 border-l-3 border-red-500 rounded-r-lg p-2 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-1 bg-red-100 rounded">
                  <FiX className="w-3 h-3 text-red-600" />
                </div>
                <div>
                  <p className="font-medium text-red-900 text-sm">{error}</p>
                </div>
              </div>
              {onRefresh && (
                <button
                  onClick={onRefresh}
                  className="px-2 py-1 bg-red-600 text-white rounded hover:bg-red-700 transition-colors text-xs font-medium"
                >
                  Réessayer
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="px-3 py-1 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-white">
          <div className="flex items-center justify-between">
            {activeFilters.length > 0 && (
              <div className="flex items-center gap-1">
                <span className="text-xs text-gray-500">Filtres:</span>
                {activeFilters.map(filter => (
                  <span 
                    key={filter.id}
                    className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-violet-50 text-violet-700 text-xs rounded border border-violet-200"
                  >
                    {filter.label}: {filter.value}
                    <button
                      onClick={() => handleRemoveFilter(filter.id)}
                      className="hover:text-violet-900"
                    >
                      <FiX size={8} />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            {visibleColumnDefs.length > 0 && (
              <thead>
                <tr className="bg-gradient-to-r from-gray-50 to-gray-100">
                  <th scope="col" className="px-2 py-1.5 text-left text-xs font-semibold text-gray-700 tracking-wider border-r border-gray-300 w-8">
                    <input
                      type="checkbox"
                      checked={selectedRows.length === paginatedData.length && paginatedData.length > 0}
                      onChange={selectAllRows}
                      className="w-2.5 h-2.5 text-violet-600 rounded focus:ring-violet-500 border-gray-300"
                    />
                  </th>
                  
                  {visibleColumnDefs.map(column => (
                    <th 
                      key={column.id}
                      scope="col" 
                      className="px-3 py-1.5 text-left text-xs font-semibold text-gray-700 tracking-wider border-r border-gray-300 whitespace-nowrap"
                      style={column.width ? { width: column.width } : {}}
                    >
                      {column.label}
                    </th>
                  ))}

                  {/* ✅ BOUTON ⋯ ICI — APRÈS TOUTES LES COLONNES, Y COMPRIS "ACTIONS" */}
                  <th 
                    scope="col" 
                    className="px-2 py-1.5 text-left text-xs font-semibold text-gray-700 tracking-wider border-r border-gray-300 whitespace-nowrap w-8"
                  >
                    <div className="relative flex justify-center">
                      <button
                        ref={columnButtonRef}
                        onClick={(e) => {
                          e.stopPropagation();
                          if (columnButtonRef.current) {
                            const rect = columnButtonRef.current.getBoundingClientRect();
                            setMenuPosition({
                              top: rect.bottom + window.scrollY,
                              right: window.innerWidth - rect.right
                            });
                          }
                          setShowColumnMenu(true);
                        }}
                        className="column-menu-trigger p-0.5 text-gray-500 hover:text-gray-700 rounded"
                        title="Afficher/masquer les colonnes"
                      >
                        <span className="text-lg">⋯</span>
                      </button>
                    </div>
                  </th>
                </tr>
              </thead>
            )}
            
            <tbody className="divide-y divide-gray-200">
              {paginatedData.length === 0 ? (
                <tr>
                  <td colSpan={visibleColumnDefs.length + 1} className="px-3 py-4 text-center">
                    <div className="flex flex-col items-center justify-center">
                      <div className="w-12 h-12 bg-gradient-to-br from-gray-100 to-gray-200 rounded-full flex items-center justify-center mb-2">
                        <config.icon className="w-6 h-6 text-gray-400" />
                      </div>
                      <h3 className="text-sm font-semibold text-gray-900 mb-1">
                        {emptyState?.title || (data.length === 0 ? 'Aucune donnée trouvée' : 'Aucun résultat')}
                      </h3>
                      <p className="text-gray-600 text-sm mb-3 max-w-md">
                        {emptyState?.description || 
                          (data.length === 0 
                            ? 'Commencez par créer votre premier élément' 
                            : 'Essayez de modifier vos critères de recherche')
                        }
                      </p>
                      {data.length === 0 && onCreate && (
                        <button 
                          onClick={onCreate}
                          className="px-3 py-1 bg-gradient-to-r from-violet-600 to-violet-500 text-white rounded hover:from-violet-700 hover:to-violet-600 transition-all duration-300 font-medium flex items-center gap-1 text-sm"
                        >
                          <FiPlus size={12} />
                          {emptyState?.action?.label || config.createButtonText}
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                paginatedData.map((item, index) => (
                  <tr 
                    key={item.id || `row-${index}`}
                    className={`transition-all duration-150 cursor-pointer ${
                      item.id === activeRowId
                        ? 'bg-gradient-to-r from-violet-100 to-violet-50 border-l-4 border-l-violet-500'
                        : selectedRows.includes(item.id)
                          ? 'bg-gradient-to-r from-violet-50 to-violet-25 hover:bg-gradient-to-r hover:from-violet-100 hover:to-violet-50'
                          : 'bg-white hover:bg-gradient-to-r hover:from-gray-50 hover:to-gray-100'
                    }`}
                    onClick={() => onRowClick && onRowClick(item)}
                  >
                    <td className="px-2 py-2 whitespace-nowrap border-r border-gray-200 w-8">
                      <input
                        type="checkbox"
                        checked={selectedRows.includes(item.id)}
                        onChange={(e) => {
                          e.stopPropagation();
                          toggleRowSelection(item.id);
                        }}
                        className="w-2.5 h-2.5 text-violet-600 rounded focus:ring-violet-500 border-gray-300"
                      />
                    </td>
                    
                    {visibleColumnDefs.map(column => (
                      <td 
                        key={column.id}
                        className="px-3 py-2 border-r border-gray-200 text-sm whitespace-nowrap"
                      >
                        {renderCell(item, column)}
                      </td>
                    ))}

                    {/* ❌ PAS DE COLONNE ⋯ ICI */}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {paginatedData.length > 0 && totalPages > 1 && (
          <div className="px-3 py-2 border-t border-gray-200 bg-gradient-to-r from-gray-50 to-white">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-2">
              <div className="flex items-center gap-1">
                <span className="text-xs text-gray-700">
                  Page {currentPage} sur {totalPages}
                </span>
                <span className="text-gray-300">•</span>
                <span className="text-xs text-gray-700">
                  {startIndex + 1}-{Math.min(endIndex, totalItems)} sur {totalItems} éléments
                </span>
              </div>

              <div className="flex items-center gap-1">
                <button
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                  className={`p-1 rounded border transition-all duration-200 ${
                    currentPage === 1
                      ? 'bg-gray-100 text-gray-400 border-gray-300 cursor-not-allowed'
                      : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50 hover:border-gray-400 hover:shadow-sm'
                  }`}
                  title="Page précédente"
                >
                  <FiChevronLeft size={12} />
                </button>

                <div className="flex items-center gap-0.5">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNumber;
                    if (totalPages <= 5) {
                      pageNumber = i + 1;
                    } else if (currentPage <= 3) {
                      pageNumber = i + 1;
                    } else if (currentPage >= totalPages - 2) {
                      pageNumber = totalPages - 4 + i;
                    } else {
                      pageNumber = currentPage - 2 + i;
                    }

                    return (
                      <button
                        key={pageNumber}
                        onClick={() => handlePageChange(pageNumber)}
                        className={`min-w-[28px] h-7 rounded border text-xs font-medium transition-all duration-200 ${
                          currentPage === pageNumber
                            ? 'bg-gradient-to-r from-violet-600 to-violet-500 text-white border-violet-600 shadow'
                            : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50 hover:border-gray-400'
                        }`}
                      >
                        {pageNumber}
                      </button>
                    );
                  })}
                </div>

                <button
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className={`p-1 rounded border transition-all duration-200 ${
                    currentPage === totalPages
                      ? 'bg-gray-100 text-gray-400 border-gray-300 cursor-not-allowed'
                      : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50 hover:border-gray-400 hover:shadow-sm'
                  }`}
                  title="Page suivante"
                >
                  <FiChevronRight size={12} />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ✅ MENU ⋯ — SANS DOUBLE SCROLL */}
      {showColumnMenu && (
        <div
          className="column-menu fixed z-50 w-56 bg-white rounded-lg shadow-lg border border-gray-200"
          style={{
            top: `${menuPosition.top}px`,
            right: `${menuPosition.right}px`,
          }}
        >
          <div className="p-2">
            <p className="text-xs font-medium text-gray-700 mb-2">Colonnes à afficher</p>
            <div 
              className="space-y-1 overflow-y-auto pr-1"
              style={{ maxHeight: 'min(320px, 80vh)' }}
            >
              {columns.map((col) => (
                <label key={col.id} className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={visibleColumns.includes(col.id)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setVisibleColumns((prev) => [...prev, col.id]);
                      } else {
                        setVisibleColumns((prev) => prev.filter((id) => id !== col.id));
                      }
                    }}
                    className="w-3 h-3 text-violet-600 rounded focus:ring-violet-500 border-gray-300"
                  />
                  <span className="truncate">{col.label || col.id}</span>
                </label>
              ))}
            </div>
            <div className="mt-2 pt-2 border-t border-gray-200">
              <button
                onClick={() => {
                  setVisibleColumns(
                    defaultVisibleColumns.length > 0
                      ? defaultVisibleColumns
                      : columns.map((col) => col.id)
                  );
                  setShowColumnMenu(false);
                }}
                className="w-full text-center px-2 py-1 text-xs text-violet-600 hover:bg-violet-50 rounded transition-colors"
              >
                Réinitialiser
              </button>
            </div>
          </div>
        </div>
      )}

      {children}
    </div>
  );
}