import React from 'react';
import { FiSearch, FiX, FiFilter, FiChevronDown, FiRefreshCw } from "react-icons/fi"; // <-- AJOUTER FiRefreshCw

export default function JournalFilters({ 
  filters, 
  companies, 
  journalTypes, 
  onFilterChange, 
  onReset, 
  onRefresh, 
  loading 
}) {
  return (
    <div className="bg-white p-3 rounded-lg border border-gray-200 shadow-sm">
      <div className="flex flex-wrap items-center gap-3">
        
        {/* Recherche textuelle */}
        <div className="relative">
          <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={14} />
          <input
            type="text"
            value={filters.search}
            onChange={(e) => onFilterChange('search', e.target.value)}
            placeholder="Rechercher journal..."
            className="pl-9 pr-3 py-1.5 border border-gray-300 rounded text-sm w-48"
          />
        </div>

        {/* Filtre entreprise */}
        <select
          value={filters.company}
          onChange={(e) => onFilterChange('company', e.target.value)}
          className="px-3 py-1.5 border border-gray-300 rounded text-sm"
        >
          <option value="">Toutes entreprises</option>
          {companies.map(c => (
            <option key={c.id} value={c.id}>
              {c.raison_sociale || c.nom}
            </option>
          ))}
        </select>

        {/* Filtre type */}
        <select
          value={filters.type}
          onChange={(e) => onFilterChange('type', e.target.value)}
          className="px-3 py-1.5 border border-gray-300 rounded text-sm"
        >
          <option value="">Tous types</option>
          {journalTypes.map(t => (
            <option key={t.id} value={t.id}>
              {t.name} ({t.code})
            </option>
          ))}
        </select>

        {/* Filtre statut */}
        <select
          value={filters.active}
          onChange={(e) => onFilterChange('active', e.target.value)}
          className="px-3 py-1.5 border border-gray-300 rounded text-sm"
        >
          <option value="">Tous statuts</option>
          <option value="true">Actifs</option>
          <option value="false">Inactifs</option>
        </select>

        {/* Actions */}
        <div className="flex items-center gap-2 ml-auto">
          <button
            onClick={onReset}
            className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded border border-gray-300 flex items-center gap-1"
          >
            <FiX size={12} />
            Réinitialiser
          </button>
          
          <button
            onClick={onRefresh}
            className="px-3 py-1.5 text-sm bg-gray-100 text-gray-700 rounded border border-gray-300 hover:bg-gray-200 flex items-center gap-1"
          >
            <FiRefreshCw className={loading ? 'animate-spin' : ''} size={12} />
            Actualiser
          </button>
        </div>
      </div>

      {/* Affichage filtres actifs */}
      {(filters.company || filters.type || filters.active) && (
        <div className="mt-3 pt-3 border-t border-gray-100">
          <div className="flex items-center gap-2 text-xs">
            <FiFilter className="text-gray-400" size={12} />
            <span className="text-gray-600">Filtres actifs :</span>
            {filters.company && companies.find(c => c.id.toString() === filters.company) && (
              <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full">
                {companies.find(c => c.id.toString() === filters.company).raison_sociale}
              </span>
            )}
            {filters.type && journalTypes.find(t => t.id.toString() === filters.type) && (
              <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded-full">
                {journalTypes.find(t => t.id.toString() === filters.type).name}
              </span>
            )}
            {filters.active && (
              <span className="px-2 py-0.5 bg-amber-100 text-amber-700 rounded-full">
                {filters.active === 'true' ? 'Actifs' : 'Inactifs'}
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}