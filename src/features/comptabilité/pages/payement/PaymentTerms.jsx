// src/features/comptabilite/pages/payement/PaymentTerms.jsx
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FiChevronLeft,
  FiChevronRight,
  FiChevronsLeft,
  FiChevronsRight,
  FiFilter,
  FiMoreHorizontal,
  FiPlus,
  FiRefreshCw,
  FiSearch,
  FiSettings,
  FiX,
} from 'react-icons/fi';
import axiosInstance from '../../../../config/axiosInstance';
import {
  PAGE_SIZE_OPTIONS,
  SearchSelect,
  Tooltip,
  getActiveEntityId,
  normalizeApiList,
  normalizeText,
} from './paymentShared.jsx';

const API = {
  terms: 'compta/payment-terms/',
};

const statusOptions = [
  { id: 'active', label: 'Actif' },
  { id: 'inactive', label: 'Inactif' },
  { id: 'invoice', label: 'Sur facture' },
];

export default function PaymentTerms() {
  const navigate = useNavigate();
  const actionsMenuRef = useRef(null);
  const filterMenuRef = useRef(null);
  const columnsButtonRef = useRef(null);
  const [terms, setTerms] = useState([]);
  const [searchText, setSearchText] = useState('');
  const [activeFilters, setActiveFilters] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showActionsMenu, setShowActionsMenu] = useState(false);
  const [showFilterMenu, setShowFilterMenu] = useState(false);
  const [showColumnsMenu, setShowColumnsMenu] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(50);
  const [visibleColumns, setVisibleColumns] = useState({
    name: true,
    sequence: true,
    invoice: true,
    preview: true,
    status: true,
  });

  const columns = [
    { id: 'name', label: 'Condition' },
    { id: 'sequence', label: 'Séq.' },
    { id: 'invoice', label: 'Sur facture' },
    { id: 'preview', label: 'Aperçu' },
    { id: 'status', label: 'Statut' },
  ];

  const loadData = useCallback(async () => {
    setLoading(true);
    const entityId = getActiveEntityId();
    const attempts = [
      { company: entityId || undefined, page_size: 1000, ordering: 'sequence,name' },
      { company_id: entityId || undefined, page_size: 1000, ordering: 'sequence,name' },
      { entity_id: entityId || undefined, page_size: 1000, ordering: 'sequence,name' },
      { page_size: 1000, ordering: 'sequence,name' },
    ];

    let lastError = null;
    for (const params of attempts) {
      try {
        const response = await axiosInstance.get(API.terms, { params });
        setTerms(normalizeApiList(response.data));
        setLoading(false);
        return;
      } catch (err) {
        lastError = err;
      }
    }

    setTerms([]);
    console.warn('Conditions de paiement indisponibles pour le moment.', lastError);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (actionsMenuRef.current && !actionsMenuRef.current.contains(event.target)) setShowActionsMenu(false);
      if (filterMenuRef.current && !filterMenuRef.current.contains(event.target)) setShowFilterMenu(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const addFilter = (filterId) => {
    if (activeFilters.includes(filterId)) return;
    setActiveFilters((previous) => [...previous, filterId]);
    setCurrentPage(1);
    setShowFilterMenu(false);
  };

  const removeFilter = (filterId) => {
    setActiveFilters((previous) => previous.filter((item) => item !== filterId));
    setCurrentPage(1);
  };

  const clearAllFilters = () => {
    setActiveFilters([]);
    setCurrentPage(1);
  };

  const filteredTerms = useMemo(() => {
    const search = normalizeText(searchText);
    return terms.filter((term) => {
      const value = normalizeText([term.name, term.display_name, term.note, term.example_preview].filter(Boolean).join(' '));
      const matchesSearch = !search || value.includes(search);
      const matchesFilters = activeFilters.every((filterId) => {
        if (filterId === 'active') return term.active !== false;
        if (filterId === 'inactive') return term.active === false;
        if (filterId === 'invoice') return !!term.display_on_invoice;
        return true;
      });
      return matchesSearch && matchesFilters;
    });
  }, [terms, searchText, activeFilters]);

  const totalPages = Math.max(1, Math.ceil(filteredTerms.length / itemsPerPage));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const paginatedTerms = filteredTerms.slice((safeCurrentPage - 1) * itemsPerPage, safeCurrentPage * itemsPerPage);
  const visibleColumnCount = Object.values(visibleColumns).filter(Boolean).length;

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="mx-auto max-w-7xl border border-gray-300 bg-white">
        <div className="border-b border-gray-300 px-4 py-3">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex flex-shrink-0 items-center gap-3">
              <Tooltip text="Nouvelle condition">
                <button
                  onClick={() => navigate('/comptabilite/conditions-paiement/create')}
                  className="flex h-8 items-center gap-1 rounded bg-purple-600 px-3 text-xs font-medium text-white transition-all duration-200 hover:scale-105 hover:bg-purple-700"
                >
                  <FiPlus size={12} />
                  <span>Nouveau</span>
                </button>
              </Tooltip>

              <Tooltip text="Actualiser la liste">
                <h1
                  onClick={loadData}
                  className="cursor-pointer text-lg font-bold text-gray-900 transition-all duration-200 hover:scale-105 hover:text-purple-600"
                >
                  Conditions de paiement
                </h1>
              </Tooltip>

              <div className="relative" ref={actionsMenuRef}>
                <Tooltip text="Menu des actions">
                  <button
                    onClick={() => setShowActionsMenu((previous) => !previous)}
                    className="flex h-8 w-8 items-center justify-center rounded-full border border-gray-300 text-gray-700 transition-all duration-200 hover:scale-110 hover:bg-gray-50 hover:shadow-md active:scale-90"
                  >
                    <FiSettings size={14} />
                  </button>
                </Tooltip>
                {showActionsMenu && (
                  <div className="absolute left-0 z-50 mt-1 w-56 rounded border border-gray-300 bg-white shadow-lg">
                    <button onClick={() => { setShowActionsMenu(false); navigate('/comptabilite/paiements'); }} className="w-full px-3 py-2 text-left text-xs hover:bg-gray-50">Paiements</button>
                    <button onClick={() => { setShowActionsMenu(false); navigate('/comptabilite/methodes-paiement'); }} className="w-full px-3 py-2 text-left text-xs hover:bg-gray-50">Méthodes de paiement</button>
                    <button onClick={() => { setShowActionsMenu(false); loadData(); }} className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs hover:bg-gray-50"><FiRefreshCw size={12} />Actualiser</button>
                  </div>
                )}
              </div>
            </div>

            <div className="flex min-w-[280px] flex-1 justify-center">
              <div className="relative w-full max-w-2xl">
                <div className="flex min-h-[38px] flex-wrap items-center rounded border border-gray-300 bg-white p-1">
                  {activeFilters.map((filterId) => {
                    const filter = statusOptions.find((item) => item.id === filterId);
                    return (
                      <span key={filterId} className="m-0.5 inline-flex items-center gap-1 rounded-full bg-purple-50 px-2 py-0.5 text-xs text-purple-700">
                        {filter?.label || filterId}
                        <button onClick={() => removeFilter(filterId)} className="hover:text-red-600">
                          <FiX size={10} />
                        </button>
                      </span>
                    );
                  })}
                  <FiSearch size={14} className="ml-1 text-gray-400" />
                  <input
                    type="text"
                    value={searchText}
                    onChange={(event) => { setSearchText(event.target.value); setCurrentPage(1); }}
                    className="min-w-[140px] flex-1 px-2 py-1 text-sm outline-none"
                    placeholder="Rechercher..."
                  />
                  <div className="relative" ref={filterMenuRef}>
                    <Tooltip text="Ajouter un filtre">
                      <button
                        onClick={() => setShowFilterMenu((previous) => !previous)}
                        className={`rounded p-1.5 hover:bg-gray-100 ${showFilterMenu ? 'bg-gray-100' : ''}`}
                      >
                        <FiFilter size={14} className={activeFilters.length > 0 ? 'text-purple-600' : 'text-gray-400'} />
                      </button>
                    </Tooltip>
                    {showFilterMenu && (
                      <div className="absolute right-0 z-50 mt-1 w-56 rounded border border-gray-300 bg-white shadow-lg">
                        <div className="border-b border-gray-200 p-2">
                          <p className="mb-2 text-xs font-medium text-gray-700">Ajouter un filtre</p>
                          {statusOptions.map((option) => (
                            <button
                              key={option.id}
                              onClick={() => addFilter(option.id)}
                              className="flex w-full items-center gap-2 rounded px-2 py-1 text-left text-xs hover:bg-gray-100"
                            >
                              {option.label}
                            </button>
                          ))}
                        </div>
                        {activeFilters.length > 0 && (
                          <div className="border-t border-gray-200 p-2">
                            <button onClick={clearAllFilters} className="w-full py-1 text-center text-xs text-red-600 hover:text-red-700">
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

            <div className="flex flex-shrink-0 items-center gap-2">
              <span className="text-xs text-gray-500">Afficher</span>
              <div className="w-20 border border-gray-300">
                <SearchSelect
                  value={itemsPerPage}
                  onChange={(id) => { setItemsPerPage(Number(id)); setCurrentPage(1); }}
                  options={PAGE_SIZE_OPTIONS}
                  getLabel={(option) => option.label}
                  placeholder="50"
                />
              </div>
              <span className="text-xs text-gray-500">lignes</span>
            </div>
          </div>
        </div>

        <div className="border-b border-gray-300 px-4 py-2">
          <span className="text-xs text-gray-600">{filteredTerms.length} condition(s)</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b border-gray-300 bg-gray-100">
                {columns.map((column) => visibleColumns[column.id] && (
                  <th key={column.id} className="border-r border-gray-300 px-2 py-1.5 text-left text-xs font-medium text-gray-700">{column.label}</th>
                ))}
                <th className="w-10 border-l border-gray-300 px-2 py-1.5 text-center">
                  <button ref={columnsButtonRef} onClick={() => setShowColumnsMenu((previous) => !previous)} className="rounded p-1 hover:bg-gray-200">
                    <FiMoreHorizontal size={16} />
                  </button>
                </th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={visibleColumnCount + 1} className="border border-gray-300 p-8 text-center text-sm text-gray-500">Chargement...</td></tr>
              ) : paginatedTerms.length === 0 ? (
                <tr><td colSpan={visibleColumnCount + 1} className="border border-gray-300 p-8 text-center text-sm text-gray-500">Aucune condition</td></tr>
              ) : paginatedTerms.map((term) => (
                <tr key={term.id} onClick={() => navigate(`/comptabilite/conditions-paiement/${term.id}`)} className="cursor-pointer hover:bg-gray-50">
                  {visibleColumns.name && <td className="border border-gray-300 px-2 py-1.5 text-xs font-medium text-gray-900">{term.name || '-'}</td>}
                  {visibleColumns.sequence && <td className="border border-gray-300 px-2 py-1.5 text-xs">{term.sequence ?? '-'}</td>}
                  {visibleColumns.invoice && <td className="border border-gray-300 px-2 py-1.5 text-xs">{term.display_on_invoice ? 'Oui' : 'Non'}</td>}
                  {visibleColumns.preview && <td className="border border-gray-300 px-2 py-1.5 text-xs text-gray-600">{term.example_preview || term.note || '-'}</td>}
                  {visibleColumns.status && <td className="border border-gray-300 px-2 py-1.5 text-xs">{term.active === false ? 'Inactif' : 'Actif'}</td>}
                  <td className="border border-gray-300 px-2 py-1.5"></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between border-t border-gray-300 px-4 py-2">
          <span className="text-xs text-gray-500">Page {safeCurrentPage} sur {totalPages}</span>
          <div className="flex items-center gap-1">
            <button onClick={() => setCurrentPage(1)} disabled={safeCurrentPage === 1} className="rounded p-1 hover:bg-gray-100 disabled:opacity-50"><FiChevronsLeft size={14} /></button>
            <button onClick={() => setCurrentPage((page) => Math.max(1, page - 1))} disabled={safeCurrentPage === 1} className="rounded p-1 hover:bg-gray-100 disabled:opacity-50"><FiChevronLeft size={14} /></button>
            <button onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))} disabled={safeCurrentPage === totalPages} className="rounded p-1 hover:bg-gray-100 disabled:opacity-50"><FiChevronRight size={14} /></button>
            <button onClick={() => setCurrentPage(totalPages)} disabled={safeCurrentPage === totalPages} className="rounded p-1 hover:bg-gray-100 disabled:opacity-50"><FiChevronsRight size={14} /></button>
          </div>
        </div>
      </div>

      {showColumnsMenu && (
        <div className="fixed z-50 w-56 rounded border border-gray-300 bg-white shadow-lg" style={{ top: (columnsButtonRef.current?.getBoundingClientRect().bottom || 120) + 6, left: Math.max(12, (columnsButtonRef.current?.getBoundingClientRect().right || 260) - 224) }}>
          <div className="border-b border-gray-200 p-2">
            <p className="mb-2 text-xs font-medium text-gray-700">Colonnes à afficher</p>
            {columns.map((column) => (
              <label key={column.id} className="flex cursor-pointer items-center gap-2 rounded px-2 py-1 hover:bg-gray-50">
                <input type="checkbox" checked={visibleColumns[column.id]} onChange={() => setVisibleColumns((previous) => ({ ...previous, [column.id]: !previous[column.id] }))} className="h-3.5 w-3.5" />
                <span className="text-xs">{column.label}</span>
              </label>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
