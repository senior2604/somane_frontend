// components/shared/DataTableContainer.jsx
import React, { useState, useMemo, useCallback } from 'react';
import { 
  FiSearch, 
  FiX, 
  FiFilter, 
  FiChevronDown,
  FiDownload,
  FiUpload,
  FiRefreshCw,
  FiColumns,
  FiPlus
} from "react-icons/fi";

export default function DataTableContainer({
  // Props de données
  data = [],
  loading = false,
  error = null,
  
  // Props de configuration
  title = "Tableau",
  searchPlaceholder = "Rechercher...",
  allowCreate = true,
  createButtonText = "Nouveau",
  onCreateClick,
  onExportClick,
  onImportClick,
  onRefreshClick,
  
  // Props de colonnes
  columnConfig = [],
  defaultVisibleColumns = {},
  
  // Props de filtres
  filterConfigs = [],
  onFilterChange,
  
  // Props de pagination
  pagination = true,
  itemsPerPageOptions = [10, 20, 50],
  
  // Props de rendu
  renderTable,
  renderEmptyState,
  renderToolbarActions,
  
  // Props de children
  children
}) {
  // États locaux
  const [searchTerm, setSearchTerm] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [activeFilters, setActiveFilters] = useState({});
  const [showColumnMenu, setShowColumnMenu] = useState(false);
  const [visibleColumns, setVisibleColumns] = useState(defaultVisibleColumns);
  const [itemsPerPage, setItemsPerPage] = useState(itemsPerPageOptions[0]);
  const [currentPage, setCurrentPage] = useState(1);

  // Filtrage des données
  const filteredData = useMemo(() => {
    if (!Array.isArray(data)) return [];
    
    return data.filter(item => {
      // Filtre de recherche textuelle
      const matchesSearch = !searchTerm || 
        Object.values(item).some(value => 
          String(value).toLowerCase().includes(searchTerm.toLowerCase())
        );
      
      // Filtres personnalisés
      const matchesFilters = Object.entries(activeFilters).every(([key, value]) => {
        if (!value) return true;
        return item[key] === value;
      });
      
      return matchesSearch && matchesFilters;
    });
  }, [data, searchTerm, activeFilters]);

  // Pagination
  const totalItems = filteredData.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / itemsPerPage));
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentData = filteredData.slice(indexOfFirstItem, indexOfLastItem);

  // Gestion des filtres
  const activeFiltersCount = Object.values(activeFilters).filter(Boolean).length;
  
  const handleFilterChange = (filterKey, value) => {
    const newFilters = { ...activeFilters, [filterKey]: value };
    setActiveFilters(newFilters);
    setCurrentPage(1);
    if (onFilterChange) onFilterChange(newFilters);
  };

  const resetFilters = () => {
    setSearchTerm('');
    setActiveFilters({});
    setShowFilters(false);
    setCurrentPage(1);
  };

  return (
    <div className="p-4 bg-gradient-to-br from-gray-50 to-white min-h-screen">
      {/* Barre d'outils supérieure */}
      <div className="mb-6">
        <div className="flex items-center justify-center gap-4 mb-4">
          {/* Actions de base */}
          {onRefreshClick && (
            <button 
              onClick={onRefreshClick}
              disabled={loading}
              className="px-3 py-2 border border-gray-300 rounded-lg bg-white text-gray-700 hover:bg-gray-50 flex items-center gap-1.5 text-sm"
            >
              <FiRefreshCw className={loading ? 'animate-spin' : ''} size={14} />
              Actualiser
            </button>
          )}
          
          {/* Menu colonnes */}
          {columnConfig.length > 0 && (
            <div className="relative">
              <button
                onClick={() => setShowColumnMenu(!showColumnMenu)}
                className="px-3 py-2 border border-gray-300 rounded-lg bg-white text-gray-700 hover:bg-gray-50 flex items-center gap-1.5 text-sm"
              >
                <FiColumns size={14} />
                Colonnes
              </button>
              
              {showColumnMenu && (
                <ColumnMenu 
                  columns={columnConfig}
                  visibleColumns={visibleColumns}
                  onChange={setVisibleColumns}
                  onClose={() => setShowColumnMenu(false)}
                />
              )}
            </div>
          )}
          
          {/* Bouton création */}
          {allowCreate && onCreateClick && (
            <button 
              onClick={onCreateClick}
              className="px-3 py-2 bg-gradient-to-r from-violet-600 to-violet-500 text-white rounded-lg hover:from-violet-700 hover:to-violet-600 flex items-center gap-1.5 text-sm"
            >
              <FiPlus size={14} />
              {createButtonText}
            </button>
          )}
        </div>

        {/* Barre de recherche et filtres */}
        <div className="flex items-center justify-center gap-4 mb-4">
          {/* Champ de recherche */}
          <div className="relative">
            <div className="relative flex items-center">
              <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1);
                }}
                className="pl-9 pr-32 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-violet-500 text-sm w-96"
                placeholder={searchPlaceholder}
              />
              
              {/* Bouton filtres */}
              <div className="absolute right-1 top-1/2 transform -translate-y-1/2">
                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className="flex items-center gap-1 px-3 py-1.5 rounded text-xs font-medium bg-gray-100 text-gray-700 hover:bg-gray-200"
                >
                  <FiFilter size={12} />
                  <span>Filtre</span>
                  {activeFiltersCount > 0 && (
                    <span className="ml-1 bg-violet-600 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">
                      {activeFiltersCount}
                    </span>
                  )}
                  <FiChevronDown className={`ml-1 transition-transform ${showFilters ? 'rotate-180' : ''}`} size={10} />
                </button>
              </div>
            </div>
          </div>
          
          {/* Actions supplémentaires */}
          {renderToolbarActions && renderToolbarActions()}
          
          {/* Boutons export/import */}
          {onExportClick && (
            <button 
              onClick={onExportClick}
              disabled={filteredData.length === 0}
              className="px-3 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 flex items-center gap-1.5 text-sm"
            >
              <FiDownload size={14} />
              Exporter
            </button>
          )}
          
          {onImportClick && (
            <label className="px-3 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 flex items-center gap-1.5 text-sm cursor-pointer">
              <FiUpload size={14} />
              Importer
              <input
                type="file"
                accept=".csv,.xlsx,.xls"
                onChange={onImportClick}
                className="hidden"
              />
            </label>
          )}
        </div>
        
        {/* Panneau des filtres */}
        {showFilters && filterConfigs.length > 0 && (
          <div className="flex justify-center">
            <div className="relative w-full max-w-4xl">
              <FilterPanel
                filters={filterConfigs}
                activeFilters={activeFilters}
                onChange={handleFilterChange}
                onReset={resetFilters}
                onClose={() => setShowFilters(false)}
              />
            </div>
          </div>
        )}
        
        {/* Affichage des filtres actifs */}
        {(searchTerm || activeFiltersCount > 0) && (
          <ActiveFiltersDisplay
            searchTerm={searchTerm}
            activeFilters={activeFilters}
            filterConfigs={filterConfigs}
            onSearchClear={() => setSearchTerm('')}
            onFilterClear={(key) => handleFilterChange(key, '')}
          />
        )}
      </div>

      {/* Contenu principal */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        {renderTable ? (
          renderTable({
            data: currentData,
            visibleColumns,
            filteredData,
            totalItems,
            currentPage,
            totalPages,
            itemsPerPage,
            onPageChange: setCurrentPage,
            onItemsPerPageChange: setItemsPerPage
          })
        ) : (
          children
        )}
      </div>
    </div>
  );
}