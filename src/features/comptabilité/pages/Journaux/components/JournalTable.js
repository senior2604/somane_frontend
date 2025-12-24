import React from 'react';
import JournalRow from './JournalRow';

export default function JournalTable({ 
  journaux, 
  selectedRows, 
  onSelectionChange,
  currentPage,
  itemsPerPage,
  totalItems,
  onPageChange,
  onItemsPerPageChange
}) {
  const allSelected = journaux.length > 0 && selectedRows.length === journaux.length;
  
  const handleSelectAll = () => {
    if (allSelected) {
      onSelectionChange([]);
    } else {
      onSelectionChange(journaux.map(j => j.id));
    }
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      {/* En-tête du tableau */}
      <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={allSelected}
              onChange={handleSelectAll}
              className="w-4 h-4 text-violet-600"
            />
            <span className="text-sm text-gray-700">
              {selectedRows.length} sélectionné(s)
            </span>
          </div>
          
          <select
            value={itemsPerPage}
            onChange={(e) => onItemsPerPageChange(Number(e.target.value))}
            className="text-sm border border-gray-300 rounded px-2 py-1"
          >
            <option value={10}>10 par page</option>
            <option value={25}>25 par page</option>
            <option value={50}>50 par page</option>
          </select>
        </div>
      </div>

      {/* Corps du tableau */}
      <table className="min-w-full">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Journal</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Entreprise</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Statut</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200">
          {journaux.map(journal => (
            <JournalRow
              key={journal.id}
              journal={journal}
              selected={selectedRows.includes(journal.id)}
              onSelect={(selected) => {
                if (selected) {
                  onSelectionChange([...selectedRows, journal.id]);
                } else {
                  onSelectionChange(selectedRows.filter(id => id !== journal.id));
                }
              }}
            />
          ))}
        </tbody>
      </table>

      {/* Message si vide */}
      {journaux.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          Aucun journal trouvé
        </div>
      )}
    </div>
  );
}