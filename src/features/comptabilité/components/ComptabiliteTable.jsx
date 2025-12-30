// features/comptabilité/components/ComptabiliteTable.jsx
import React from 'react';
import { 
  FiChevronLeft, 
  FiChevronRight,
  FiUpload,
  FiCheckSquare,
  FiSquare
} from "react-icons/fi";

export default function ComptabiliteTable({
  // Props de données
  data = [],
  moduleType = 'journaux',
  visibleColumns = {},
  
  // Props de sélection
  enableSelection = true,
  selectedRows = [],
  onSelectionChange,
  
  // Props de pagination
  filteredData = [],
  totalItems = 0,
  currentPage = 1,
  totalPages = 1,
  itemsPerPage = 10,
  onPageChange,
  onItemsPerPageChange,
  
  // Props de rendu
  renderTableBody,
  renderEmptyState,
  
  // Props enfants
  children
}) {
  // Gestion de la sélection
  const handleSelectAll = () => {
    if (!onSelectionChange) return;
    
    const allIds = data.map(item => item.id).filter(id => id != null);
    
    if (selectedRows.length === allIds.length && allIds.length > 0) {
      onSelectionChange([]);
    } else {
      onSelectionChange(allIds);
    }
  };

  const handleSelectRow = (id) => {
    if (!onSelectionChange) return;
    
    const newSelection = selectedRows.includes(id)
      ? selectedRows.filter(rowId => rowId !== id)
      : [...selectedRows, id];
    
    onSelectionChange(newSelection);
  };

  // Rendu des en-têtes de colonnes
  const renderTableHeaders = () => {
    const columnHeaders = {
      journaux: [
        { id: 'code', label: 'Code', className: 'w-20' },
        { id: 'nom', label: 'Nom', className: 'w-48' },
        { id: 'type', label: 'Type', className: 'w-32' },
        { id: 'entreprise', label: 'Entreprise', className: 'w-40' },
        { id: 'compte', label: 'Compte', className: 'w-32' },
        { id: 'statut', label: 'Statut', className: 'w-24' },
        { id: 'actions', label: 'Actions', className: 'w-28' }
      ],
      pieces: [
        { id: 'numero', label: 'N°', className: 'w-20' },
        { id: 'date', label: 'Date', className: 'w-24' },
        { id: 'journal', label: 'Journal', className: 'w-32' },
        { id: 'tiers', label: 'Tiers', className: 'w-40' },
        { id: 'libelle', label: 'Libellé', className: 'w-64' },
        { id: 'montant', label: 'Montant', className: 'w-32' },
        { id: 'statut', label: 'Statut', className: 'w-24' },
        { id: 'actions', label: 'Actions', className: 'w-28' }
      ],
      comptes: [
        { id: 'code', label: 'Code', className: 'w-20' },
        { id: 'libelle', label: 'Libellé', className: 'w-64' },
        { id: 'classe', label: 'Classe', className: 'w-24' },
        { id: 'type', label: 'Type', className: 'w-32' },
        { id: 'solde_debut', label: 'Solde début', className: 'w-32' },
        { id: 'solde_fin', label: 'Solde fin', className: 'w-32' },
        { id: 'actions', label: 'Actions', className: 'w-28' }
      ]
    };

    const headers = columnHeaders[moduleType] || columnHeaders.journaux;
    
    return (
      <thead>
        <tr className="bg-gradient-to-r from-gray-50 to-gray-100">
          {/* Colonne sélection */}
          {enableSelection && (
            <th scope="col" className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider border-r border-gray-200 w-12">
              <div className="flex items-center gap-2">
                <button
                  onClick={handleSelectAll}
                  className="flex items-center justify-center w-4 h-4"
                >
                  {selectedRows.length === data.length && data.length > 0 ? (
                    <FiCheckSquare className="w-4 h-4 text-violet-600" />
                  ) : (
                    <FiSquare className="w-4 h-4 text-gray-400 hover:text-gray-600" />
                  )}
                </button>
              </div>
            </th>
          )}
          
          {/* Colonnes dynamiques */}
          {headers.map((header) => (
            visibleColumns[header.id] && (
              <th
                key={header.id}
                scope="col"
                className={`px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider border-r border-gray-200 ${header.className}`}
              >
                {header.label}
              </th>
            )
          ))}
        </tr>
      </thead>
    );
  };

  // Rendu par défaut du corps du tableau
  const defaultRenderTableBody = () => {
    if (data.length === 0) {
      return (
        <tr>
          <td 
            colSpan={
              Object.values(visibleColumns).filter(v => v).length + 
              (enableSelection ? 1 : 0)
            } 
            className="px-4 py-12 text-center"
          >
            {renderEmptyState ? (
              renderEmptyState()
            ) : (
              <div className="flex flex-col items-center justify-center">
                <div className="w-16 h-16 bg-gradient-to-br from-gray-100 to-gray-200 rounded-full flex items-center justify-center mb-4">
                  <span className="text-2xl">📊</span>
                </div>
                <h3 className="text-base font-semibold text-gray-900 mb-1">
                  Aucune donnée disponible
                </h3>
                <p className="text-gray-600 text-sm mb-4 max-w-md text-center">
                  {filteredData.length === 0 && data.length > 0
                    ? 'Aucun résultat ne correspond à vos critères de recherche'
                    : 'Commencez par créer votre premier élément'
                  }
                </p>
              </div>
            )}
          </td>
        </tr>
      );
    }

    return (
      <tbody className="divide-y divide-gray-200">
        {data.map((item, index) => (
          <tr 
            key={item.id || index}
            className={`hover:bg-gradient-to-r hover:from-gray-50 hover:to-white transition-all duration-200 ${
              selectedRows.includes(item.id) ? 'bg-gradient-to-r from-violet-50 to-violet-25' : 'bg-white'
            }`}
          >
            {/* Colonne sélection */}
            {enableSelection && (
              <td className="px-4 py-3 whitespace-nowrap border-r border-gray-200">
                <button
                  onClick={() => handleSelectRow(item.id)}
                  className="flex items-center justify-center w-4 h-4"
                >
                  {selectedRows.includes(item.id) ? (
                    <FiCheckSquare className="w-4 h-4 text-violet-600" />
                  ) : (
                    <FiSquare className="w-4 h-4 text-gray-400 hover:text-gray-600" />
                  )}
                </button>
              </td>
            )}
            
            {/* Contenu par module */}
            {moduleType === 'journaux' && (
              <>
                {visibleColumns.code && (
                  <td className="px-4 py-3 whitespace-nowrap border-r border-gray-200">
                    <span className="text-xs font-semibold text-gray-500 bg-gray-100 px-2 py-1 rounded border">
                      {item.code || '---'}
                    </span>
                  </td>
                )}
                {visibleColumns.nom && (
                  <td className="px-4 py-3 border-r border-gray-200">
                    <div className="text-xs font-medium text-gray-900">
                      {item.name || 'Sans nom'}
                    </div>
                  </td>
                )}
                {/* ... autres colonnes pour journaux */}
              </>
            )}
            
            {/* Ajouter d'autres conditions pour chaque moduleType */}
            
            {/* Colonne actions par défaut */}
            {visibleColumns.actions && (
              <td className="px-4 py-3 whitespace-nowrap">
                <div className="flex items-center gap-1">
                  {/* Actions par défaut - à personnaliser */}
                  <button className="p-1.5 text-gray-600 hover:text-violet-600 hover:bg-violet-50 rounded">
                    👁️
                  </button>
                  <button className="p-1.5 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded">
                    ✏️
                  </button>
                  <button className="p-1.5 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded">
                    🗑️
                  </button>
                </div>
              </td>
            )}
          </tr>
        ))}
      </tbody>
    );
  };

  // Rendu de la pagination
  const renderPagination = () => {
    if (totalPages <= 1) return null;

    const paginate = (pageNumber) => {
      const validPage = Math.max(1, Math.min(pageNumber, totalPages));
      if (onPageChange) onPageChange(validPage);
    };

    const nextPage = () => {
      if (currentPage < totalPages) {
        paginate(currentPage + 1);
      }
    };

    const prevPage = () => {
      if (currentPage > 1) {
        paginate(currentPage - 1);
      }
    };

    return (
      <div className="px-4 py-3 border-t border-gray-200 bg-gradient-to-r from-gray-50 to-white">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="text-xs text-gray-700">
            Affichage de {Math.min((currentPage - 1) * itemsPerPage + 1, totalItems)} à{' '}
            {Math.min(currentPage * itemsPerPage, totalItems)} sur {totalItems} éléments
          </div>

          <div className="flex items-center gap-4">
            {/* Sélection nombre d'éléments par page */}
            <div className="flex items-center gap-2">
              <label className="text-xs text-gray-600">Lignes par page:</label>
              <select
                value={itemsPerPage}
                onChange={(e) => onItemsPerPageChange && onItemsPerPageChange(Number(e.target.value))}
                className="border border-gray-300 rounded px-2 py-1 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-violet-500"
              >
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
              </select>
            </div>

            {/* Navigation des pages */}
            <div className="flex items-center gap-1">
              <button
                onClick={prevPage}
                disabled={currentPage === 1}
                className={`p-1.5 rounded border transition-all duration-200 ${
                  currentPage === 1
                    ? 'bg-gray-100 text-gray-400 border-gray-300 cursor-not-allowed'
                    : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50 hover:border-gray-400'
                }`}
              >
                <FiChevronLeft size={14} />
              </button>

              <div className="flex items-center gap-0.5">
                {(() => {
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

                  return pageNumbers.map((pageNumber) => (
                    <button
                      key={pageNumber}
                      onClick={() => paginate(pageNumber)}
                      className={`min-w-[30px] h-8 rounded border text-xs font-medium transition-all duration-200 ${
                        currentPage === pageNumber
                          ? 'bg-gradient-to-r from-violet-600 to-violet-500 text-white border-violet-600'
                          : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50 hover:border-gray-400'
                      }`}
                    >
                      {pageNumber}
                    </button>
                  ));
                })()}
              </div>

              <button
                onClick={nextPage}
                disabled={currentPage === totalPages}
                className={`p-1.5 rounded border transition-all duration-200 ${
                  currentPage === totalPages
                    ? 'bg-gray-100 text-gray-400 border-gray-300 cursor-not-allowed'
                    : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50 hover:border-gray-400'
                }`}
              >
                <FiChevronRight size={14} />
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
      {/* En-tête avec sélection et options */}
      {enableSelection && selectedRows.length > 0 && (
        <div className="px-4 py-3 border-b border-gray-200 bg-gradient-to-r from-violet-50 to-violet-25">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FiCheckSquare className="text-violet-600" size={16} />
              <span className="text-sm font-medium text-gray-900">
                {selectedRows.length} élément(s) sélectionné(s)
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button className="px-3 py-1.5 text-xs text-violet-600 hover:bg-violet-100 rounded">
                Actions groupées
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tableau */}
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          {renderTableHeaders()}
          {renderTableBody ? renderTableBody() : defaultRenderTableBody()}
        </table>
      </div>

      {/* Pagination */}
      {renderPagination()}
    </div>
  );
}