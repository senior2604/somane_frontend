// src/features/comptabilité/pages/EcrituresComptables/List.jsx

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FiAlertCircle,
  FiArrowDown,
  FiArrowUp,
  FiChevronLeft,
  FiChevronRight,
  FiChevronsLeft,
  FiChevronsRight,
  FiFilter,
  FiMoreHorizontal,
  FiPlus,
  FiRefreshCw,
  FiSettings,
  FiX,
} from 'react-icons/fi';
import { useEntity } from '../../../../context/EntityContext';
import { apiClient } from '../../services';

const API = {
  moveLines: 'compta/move-lines/',
};

const columns = [
  { id: 'date', label: 'Date' },
  { id: 'account', label: 'Compte' },
  { id: 'journal', label: 'Journal' },
  { id: 'piece', label: 'N° Pièce' },
  { id: 'partner', label: 'Partenaire' },
  { id: 'label', label: 'Libellé' },
  { id: 'debit', label: 'Débit' },
  { id: 'credit', label: 'Crédit' },
  { id: 'reconcile', label: 'Lettrage' },
  { id: 'state', label: 'État' },
];

const normalizeApiList = (data) => {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.results)) return data.results;
  if (Array.isArray(data?.data)) return data.data;
  if (Array.isArray(data?.items)) return data.items;
  return [];
};

const normalizeText = (value) => String(value || '')
  .trim()
  .toLowerCase()
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '');

const formatDate = (value) => {
  if (!value) return '—';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return '—';
  return parsed.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
};

const formatAmount = (value) => {
  const number = Number(value || 0);
  if (Number.isNaN(number)) return '0';
  return Math.round(number).toLocaleString('fr-FR');
};

const getLineId = (line) => line?.id || `${line?.move || line?.move_id || 'move'}-${line?.account || line?.account_id || 'account'}-${line?.date || ''}-${line?.name || ''}`;

const getMoveId = (line) => (
  line?.move?.id ||
  line?.move_id ||
  line?.move ||
  line?.move_detail?.id ||
  line?.moveDetail?.id
);

const getMoveName = (line) => (
  line?.move_name ||
  line?.move?.name ||
  line?.move_detail?.name ||
  line?.moveDetail?.name ||
  line?.piece_name ||
  line?.pieceName ||
  '—'
);

const getJournalCode = (line) => (
  line?.journal_code ||
  line?.journal?.code ||
  line?.journal_detail?.code ||
  line?.journalDetail?.code ||
  line?.move?.journal?.code ||
  line?.move_detail?.journal?.code ||
  '—'
);

const getJournalName = (line) => (
  line?.journal_name ||
  line?.journal?.name ||
  line?.journal_detail?.name ||
  line?.journalDetail?.name ||
  ''
);

const getAccountCode = (line) => (
  line?.account_code ||
  line?.account?.code ||
  line?.account_detail?.code ||
  line?.accountDetail?.code ||
  '—'
);

const getAccountName = (line) => (
  line?.account_name ||
  line?.account?.name ||
  line?.account_detail?.name ||
  line?.accountDetail?.name ||
  ''
);

const getPartnerName = (line) => (
  line?.partner_name ||
  line?.partner?.displayName ||
  line?.partner?.raison_sociale ||
  line?.partner?.nom ||
  line?.partner?.name ||
  line?.partner_detail?.displayName ||
  line?.partner_detail?.nom ||
  line?.partnerDetail?.name ||
  '—'
);

const getLineState = (line) => (
  line?.move_state ||
  line?.move?.state ||
  line?.move_detail?.state ||
  line?.state ||
  ''
);

const getStateLabel = (state) => {
  const value = normalizeText(state);
  if (['posted', 'post', 'valid', 'valide', 'validated', 'comptabilise', 'comptabilisee'].includes(value)) return 'Comptabilisé';
  if (['cancel', 'cancelled', 'canceled', 'annule', 'annulee'].includes(value)) return 'Annulé';
  if (['deleted', 'delete', 'supprime', 'supprimee'].includes(value)) return 'Supprimé';
  if (['draft', 'brouillon'].includes(value)) return 'Brouillon';
  return state || '—';
};

const getStateClass = (state) => {
  const value = normalizeText(state);
  if (['posted', 'post', 'valid', 'valide', 'validated', 'comptabilise', 'comptabilisee'].includes(value)) {
    return 'bg-green-100 text-green-700';
  }
  if (['cancel', 'cancelled', 'canceled', 'annule', 'annulee'].includes(value)) {
    return 'bg-red-100 text-red-700';
  }
  if (['deleted', 'delete', 'supprime', 'supprimee'].includes(value)) {
    return 'bg-gray-200 text-gray-700';
  }
  return 'bg-gray-100 text-gray-700';
};

const getReconcileLabel = (line) => {
  if (line?.reconciled) return 'Lettré';
  if (line?.full_reconcile_id || line?.full_reconcile_name || line?.full_reconcile) return 'Lettré';
  if ((line?.matched_credit_ids || []).length || (line?.matched_debit_ids || []).length) return 'Partiel';
  return 'Non lettré';
};

const getReconcileClass = (line) => {
  const label = getReconcileLabel(line);
  if (label === 'Lettré') return 'bg-green-100 text-green-700';
  if (label === 'Partiel') return 'bg-amber-100 text-amber-700';
  return 'bg-gray-100 text-gray-700';
};

const getSearchText = (line) => [
  line?.date,
  getMoveName(line),
  getJournalCode(line),
  getJournalName(line),
  getAccountCode(line),
  getAccountName(line),
  getPartnerName(line),
  line?.name,
  getReconcileLabel(line),
  getStateLabel(getLineState(line)),
].filter(Boolean).join(' ');

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

const StatusBadge = ({ children, className = '' }) => (
  <span className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium ${className}`}>
    {children}
  </span>
);

export default function EcrituresComptablesList() {
  const navigate = useNavigate();
  const { activeEntity } = useEntity();

  const [lines, setLines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedLineIds, setSelectedLineIds] = useState([]);
  const [activeRowId, setActiveRowId] = useState(null);
  const [searchText, setSearchText] = useState('');
  const [activeFilters, setActiveFilters] = useState([]);
  const [showFilterMenu, setShowFilterMenu] = useState(false);
  const [showActionsMenu, setShowActionsMenu] = useState(false);
  const [showColumnsMenu, setShowColumnsMenu] = useState(false);
  const [columnsMenuPosition, setColumnsMenuPosition] = useState({ top: 0, left: 0 });
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(15);
  const [sortColumn, setSortColumn] = useState('date');
  const [sortDirection, setSortDirection] = useState('desc');
  const [visibleColumns, setVisibleColumns] = useState({
    date: true,
    piece: true,
    journal: true,
    account: true,
    partner: true,
    label: true,
    debit: true,
    credit: true,
    reconcile: true,
    state: true,
  });

  const filterMenuRef = useRef(null);
  const actionsMenuRef = useRef(null);
  const searchContainerRef = useRef(null);

  const fetchLines = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const entityId = activeEntity?.id;
      const response = await apiClient.get(API.moveLines, {
        params: {
          company: entityId || undefined,
          company_id: entityId || undefined,
          page_size: 1000,
          ordering: '-date,-id',
        },
      });
      setLines(normalizeApiList(response?.data ?? response));
      setSelectedLineIds([]);
      setActiveRowId(null);
    } catch (err) {
      setLines([]);
      setError('Impossible de charger les écritures comptables.');
      console.error('Erreur chargement écritures comptables', err);
    } finally {
      setLoading(false);
    }
  }, [activeEntity?.id]);

  useEffect(() => {
    fetchLines();
  }, [fetchLines]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (filterMenuRef.current && !filterMenuRef.current.contains(event.target)) {
        setShowFilterMenu(false);
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

  useEffect(() => {
    setCurrentPage(1);
  }, [searchText, activeFilters, itemsPerPage]);

  const addFilter = (field, label, value) => {
    const cleanValue = String(value || '').trim();
    if (!cleanValue) return;
    setActiveFilters((prev) => [...prev, { field, label, value: cleanValue }]);
    setSearchText('');
    setShowFilterMenu(false);
  };

  const addSearchAsFilter = () => {
    addFilter('search', 'Recherche', searchText);
  };

  const removeFilter = (index) => {
    setActiveFilters((prev) => prev.filter((_, filterIndex) => filterIndex !== index));
  };

  const clearAllFilters = () => {
    setActiveFilters([]);
    setSearchText('');
    setShowFilterMenu(false);
  };

  const getFilterDisplay = (filter) => {
    if (filter.field === 'search') return { text: filter.value, cls: 'bg-blue-100 text-blue-700' };
    if (filter.field === 'state') {
      return {
        text: ({
          draft: 'Brouillon',
          posted: 'Comptabilisé',
          cancel: 'Annulé',
          deleted: 'Supprimé',
        })[filter.value] || filter.value,
        cls: ({
          draft: 'bg-amber-100 text-amber-700',
          posted: 'bg-green-100 text-green-700',
          cancel: 'bg-red-100 text-red-700',
          deleted: 'bg-slate-200 text-slate-700',
        })[filter.value] || 'bg-gray-100 text-gray-700',
      };
    }
    if (filter.field === 'reconcile') {
      return {
        text: ({
          reconciled: 'Lettré',
          partial: 'Partiel',
          open: 'Non lettré',
        })[filter.value] || filter.value,
        cls: ({
          reconciled: 'bg-green-100 text-green-700',
          partial: 'bg-amber-100 text-amber-700',
          open: 'bg-gray-100 text-gray-700',
        })[filter.value] || 'bg-gray-100 text-gray-700',
      };
    }
    return { text: `${filter.label}: ${filter.value}`, cls: 'bg-gray-100 text-gray-700' };
  };

  const filteredLines = useMemo(() => {
    let nextLines = [...lines];

    if (searchText.trim()) {
      const value = normalizeText(searchText);
      nextLines = nextLines.filter((line) => normalizeText(getSearchText(line)).includes(value));
    }

    activeFilters.forEach((filter) => {
      const value = normalizeText(filter.value);
      nextLines = nextLines.filter((line) => {
        if (filter.field === 'search') return normalizeText(getSearchText(line)).includes(value);
        if (filter.field === 'date') return normalizeText(formatDate(line?.date)).includes(value);
        if (filter.field === 'piece') return normalizeText(getMoveName(line)).includes(value);
        if (filter.field === 'journal') return normalizeText(`${getJournalCode(line)} ${getJournalName(line)}`).includes(value);
        if (filter.field === 'account') return normalizeText(`${getAccountCode(line)} ${getAccountName(line)}`).includes(value);
        if (filter.field === 'partner') return normalizeText(getPartnerName(line)).includes(value);
        if (filter.field === 'label') return normalizeText(line?.name).includes(value);
        if (filter.field === 'reconcile') {
          const label = normalizeText(getReconcileLabel(line));
          if (filter.value === 'reconciled') return label.includes('lettre');
          if (filter.value === 'partial') return label.includes('partiel');
          if (filter.value === 'open') return label.includes('non lettre');
          return label.includes(value);
        }
        if (filter.field === 'state') {
          const state = normalizeText(getLineState(line));
          const label = normalizeText(getStateLabel(getLineState(line)));
          if (filter.value === 'posted') return ['posted', 'post', 'valid', 'valide'].includes(state) || label.includes('comptabilise');
          if (filter.value === 'draft') return state === 'draft' || label.includes('brouillon');
          if (filter.value === 'cancel') return ['cancel', 'cancelled', 'canceled'].includes(state) || label.includes('annule');
          if (filter.value === 'deleted') return ['deleted', 'delete'].includes(state) || label.includes('supprime');
          return label.includes(value) || state.includes(value);
        }
        return normalizeText(getSearchText(line)).includes(value);
      });
    });

    return nextLines;
  }, [activeFilters, lines, searchText]);

  const sortedLines = useMemo(() => {
    const getValue = (line) => {
      if (sortColumn === 'date') return line?.date || '';
      if (sortColumn === 'piece') return getMoveName(line);
      if (sortColumn === 'journal') return getJournalCode(line);
      if (sortColumn === 'account') return getAccountCode(line);
      if (sortColumn === 'partner') return getPartnerName(line);
      if (sortColumn === 'label') return line?.name || '';
      if (sortColumn === 'debit') return Number(line?.debit || 0);
      if (sortColumn === 'credit') return Number(line?.credit || 0);
      if (sortColumn === 'reconcile') return getReconcileLabel(line);
      if (sortColumn === 'state') return getStateLabel(getLineState(line));
      return '';
    };

    return [...filteredLines].sort((a, b) => {
      const aValue = getValue(a);
      const bValue = getValue(b);

      if (typeof aValue === 'number' || typeof bValue === 'number') {
        return sortDirection === 'asc' ? aValue - bValue : bValue - aValue;
      }

      return sortDirection === 'asc'
        ? String(aValue).localeCompare(String(bValue), 'fr')
        : String(bValue).localeCompare(String(aValue), 'fr');
    });
  }, [filteredLines, sortColumn, sortDirection]);

  const totalPages = Math.max(1, Math.ceil(sortedLines.length / itemsPerPage));
  const safePage = Math.min(currentPage, totalPages);
  const paginatedLines = sortedLines.slice((safePage - 1) * itemsPerPage, safePage * itemsPerPage);
  const visibleColumnCount = Object.values(visibleColumns).filter(Boolean).length;
  const selectedAllPage = paginatedLines.length > 0 && paginatedLines.every((line) => selectedLineIds.includes(getLineId(line)));

  const handleSort = (column) => {
    if (sortColumn === column) {
      setSortDirection((direction) => (direction === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortColumn(column);
      setSortDirection(column === 'date' ? 'desc' : 'asc');
    }
  };

  const openMove = (line) => {
    const moveId = getMoveId(line);
    if (moveId) navigate(`/comptabilite/pieces/${moveId}`);
  };

  if (loading && lines.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 p-4">
        <div className="max-w-7xl mx-auto bg-white border border-gray-300">
          <div className="border-b border-gray-300 px-4 py-3">
            <div className="text-lg font-bold text-gray-900">Écritures comptables</div>
          </div>
          <div className="p-8 flex items-center justify-center">
            <div className="text-center">
              <div className="w-8 h-8 border-2 border-purple-600 border-t-transparent rounded-full animate-spin mx-auto" />
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
              <Tooltip text="Créer une nouvelle pièce">
                <button
                  type="button"
                  onClick={() => navigate('/comptabilite/pieces/create')}
                  className="h-8 px-3 bg-purple-600 text-white text-xs font-medium hover:bg-purple-700 hover:scale-105 transition-all duration-200 rounded flex items-center gap-1"
                >
                  <FiPlus size={12} /> Nouvelle pièce
                </button>
              </Tooltip>

              <Tooltip text="Actualiser la liste">
                <h1
                  className="text-lg font-bold text-gray-900 cursor-pointer hover:text-purple-600 hover:scale-105 transition-all duration-200"
                  onClick={fetchLines}
                >
                  Écritures comptables
                </h1>
              </Tooltip>

              <div className="relative" ref={actionsMenuRef}>
                <Tooltip text="Menu des actions">
                  <button
                    type="button"
                    onClick={() => setShowActionsMenu((value) => !value)}
                    className="w-8 h-8 rounded-full border border-gray-300 text-gray-700 hover:bg-gray-50 hover:scale-110 hover:shadow-md active:scale-90 transition-all duration-200 flex items-center justify-center"
                  >
                    <FiSettings size={14} />
                  </button>
                </Tooltip>

                {showActionsMenu && (
                  <div className="absolute left-0 mt-1 w-48 bg-white border border-gray-300 shadow-lg rounded z-50">
                    <Tooltip text="Actualiser la liste" position="right">
                      <button
                        type="button"
                        onClick={() => {
                          setShowActionsMenu(false);
                          fetchLines();
                        }}
                        className="w-full px-3 py-2 text-xs text-left hover:bg-gray-50 flex items-center gap-2"
                      >
                        <FiRefreshCw size={12} /> Actualiser
                      </button>
                    </Tooltip>
                  </div>
                )}
              </div>
            </div>

            <div className="flex-1 flex justify-center">
              <div className="relative w-full max-w-2xl" ref={searchContainerRef}>
                <div className="flex items-center flex-wrap border border-gray-300 rounded bg-white min-h-[38px] p-1">
                  {activeFilters.map((filter, index) => {
                    const display = getFilterDisplay(filter);
                    return (
                      <span key={`${filter.field}-${index}`} className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs ${display.cls} m-0.5`}>
                        {display.text}
                        <button type="button" onClick={() => removeFilter(index)} className="hover:text-red-600">
                          <FiX size={10} />
                        </button>
                      </span>
                    );
                  })}

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
                        type="button"
                        onClick={() => setShowFilterMenu((value) => !value)}
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
                            {[
                              ['state', 'État', 'draft', 'Brouillon', 'text-amber-600'],
                              ['state', 'État', 'posted', 'Comptabilisé', 'text-green-600'],
                              ['state', 'État', 'cancel', 'Annulé', 'text-red-600'],
                              ['state', 'État', 'deleted', 'Supprimé', 'text-slate-600'],
                              ['reconcile', 'Lettrage', 'reconciled', 'Lettré', 'text-green-600'],
                              ['reconcile', 'Lettrage', 'partial', 'Partiel', 'text-amber-600'],
                              ['reconcile', 'Lettrage', 'open', 'Non lettré', 'text-gray-600'],
                            ].map(([field, label, value, display, color]) => (
                              <button
                                key={`${field}-${value}`}
                                type="button"
                                onClick={() => addFilter(field, label, value)}
                                className="w-full text-left text-xs px-2 py-1 hover:bg-gray-100 rounded flex items-center gap-2"
                              >
                                <span className="w-20">{label}</span>
                                <span className={color}>= {display}</span>
                              </button>
                            ))}
                          </div>
                        </div>

                        {searchText.trim() && (
                          <div className="p-2 border-b border-gray-200">
                            <button
                              type="button"
                              onClick={addSearchAsFilter}
                              className="w-full text-xs text-purple-600 hover:text-purple-700 text-center py-1"
                            >
                              Ajouter la recherche comme filtre
                            </button>
                          </div>
                        )}

                        {activeFilters.length > 0 && (
                          <div className="p-2">
                            <button
                              type="button"
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
                onChange={(event) => setItemsPerPage(Number(event.target.value))}
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

          {error && (
            <div className="mt-2 flex items-center gap-2 rounded border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
              <FiAlertCircle size={14} />
              {error}
            </div>
          )}
        </div>

        {selectedLineIds.length > 0 && (
          <div className="border-b border-gray-300 px-4 py-2 bg-gray-50 flex items-center gap-2">
            <span className="text-xs text-gray-600">{selectedLineIds.length} écriture(s) sélectionnée(s)</span>
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="bg-gray-100 border-b border-gray-300">
                <th className="border-r border-gray-300 px-2 py-1.5 w-8 text-center">
                  <input
                    type="checkbox"
                    checked={selectedAllPage}
                    onChange={(event) => {
                      setSelectedLineIds(event.target.checked ? paginatedLines.map(getLineId) : []);
                    }}
                    className="w-3.5 h-3.5 cursor-pointer"
                  />
                </th>

                {visibleColumns.date && (
                  <th className="border-r border-gray-300 px-2 py-1.5 text-left text-xs font-medium text-gray-700 cursor-pointer hover:bg-gray-200 min-w-[120px]" onClick={() => handleSort('date')}>
                    <div className="flex items-center gap-1">
                      <span>Date</span>
                      <SortIcon column="date" sortColumn={sortColumn} sortDirection={sortDirection} />
                    </div>
                  </th>
                )}
                {visibleColumns.account && (
                  <th className="border-r border-gray-300 px-2 py-1.5 text-left text-xs font-medium text-gray-700 cursor-pointer hover:bg-gray-200 min-w-[220px]" onClick={() => handleSort('account')}>
                    <div className="flex items-center gap-1">
                      <span>Compte</span>
                      <SortIcon column="account" sortColumn={sortColumn} sortDirection={sortDirection} />
                    </div>
                  </th>
                )}
                {visibleColumns.journal && (
                  <th className="border-r border-gray-300 px-2 py-1.5 text-left text-xs font-medium text-gray-700 cursor-pointer hover:bg-gray-200 min-w-[70px]" onClick={() => handleSort('journal')}>
                    <div className="flex items-center gap-1">
                      <span>Journal</span>
                      <SortIcon column="journal" sortColumn={sortColumn} sortDirection={sortDirection} />
                    </div>
                  </th>
                )}
                {visibleColumns.piece && (
                  <th className="border-r border-gray-300 px-2 py-1.5 text-left text-xs font-medium text-gray-700 cursor-pointer hover:bg-gray-200 min-w-[130px]" onClick={() => handleSort('piece')}>
                    <div className="flex items-center gap-1">
                      <span>N° Pièce</span>
                      <SortIcon column="piece" sortColumn={sortColumn} sortDirection={sortDirection} />
                    </div>
                  </th>
                )}
                {visibleColumns.partner && (
                  <th className="border-r border-gray-300 px-2 py-1.5 text-left text-xs font-medium text-gray-700 cursor-pointer hover:bg-gray-200 min-w-[140px]" onClick={() => handleSort('partner')}>
                    <div className="flex items-center gap-1">
                      <span>Partenaire</span>
                      <SortIcon column="partner" sortColumn={sortColumn} sortDirection={sortDirection} />
                    </div>
                  </th>
                )}
                {visibleColumns.label && (
                  <th className="border-r border-gray-300 px-2 py-1.5 text-left text-xs font-medium text-gray-700 cursor-pointer hover:bg-gray-200 min-w-[220px]" onClick={() => handleSort('label')}>
                    <div className="flex items-center gap-1">
                      <span>Libellé</span>
                      <SortIcon column="label" sortColumn={sortColumn} sortDirection={sortDirection} />
                    </div>
                  </th>
                )}
                {visibleColumns.debit && (
                  <th className="border-r border-gray-300 px-2 py-1.5 text-right text-xs font-medium text-gray-700 cursor-pointer hover:bg-gray-200 min-w-[90px]" onClick={() => handleSort('debit')}>
                    <div className="flex items-center justify-end gap-1">
                      <span>Débit</span>
                      <SortIcon column="debit" sortColumn={sortColumn} sortDirection={sortDirection} />
                    </div>
                  </th>
                )}
                {visibleColumns.credit && (
                  <th className="border-r border-gray-300 px-2 py-1.5 text-right text-xs font-medium text-gray-700 cursor-pointer hover:bg-gray-200 min-w-[90px]" onClick={() => handleSort('credit')}>
                    <div className="flex items-center justify-end gap-1">
                      <span>Crédit</span>
                      <SortIcon column="credit" sortColumn={sortColumn} sortDirection={sortDirection} />
                    </div>
                  </th>
                )}
                {visibleColumns.reconcile && (
                  <th className="border-r border-gray-300 px-2 py-1.5 text-left text-xs font-medium text-gray-700 cursor-pointer hover:bg-gray-200 min-w-[90px]" onClick={() => handleSort('reconcile')}>
                    <div className="flex items-center gap-1">
                      <span>Lettrage</span>
                      <SortIcon column="reconcile" sortColumn={sortColumn} sortDirection={sortDirection} />
                    </div>
                  </th>
                )}
                {visibleColumns.state && (
                  <th className="border-r border-gray-300 px-2 py-1.5 text-left text-xs font-medium text-gray-700 cursor-pointer hover:bg-gray-200 min-w-[85px]" onClick={() => handleSort('state')}>
                    <div className="flex items-center gap-1">
                      <span>État</span>
                      <SortIcon column="state" sortColumn={sortColumn} sortDirection={sortDirection} />
                    </div>
                  </th>
                )}
                <th className="border-l border-gray-300 px-2 py-1.5 w-10 text-center">
                  <Tooltip text="Choisir les colonnes à afficher">
                    <button
                      type="button"
                      className="columns-menu-button p-1 rounded hover:bg-gray-200"
                      onClick={(event) => {
                        event.stopPropagation();
                        const rect = event.currentTarget.getBoundingClientRect();
                        setColumnsMenuPosition({
                          top: rect.bottom + window.scrollY + 5,
                          left: rect.right - 200,
                        });
                        setShowColumnsMenu((value) => !value);
                      }}
                    >
                      <FiMoreHorizontal size={16} className="text-gray-500" />
                    </button>
                  </Tooltip>
                </th>
              </tr>
            </thead>

            <tbody>
              {paginatedLines.length === 0 ? (
                <tr>
                  <td colSpan={visibleColumnCount + 2} className="border border-gray-300 p-8 text-center text-sm text-gray-500">
                    {activeFilters.length > 0 || searchText ? 'Aucun résultat pour ces filtres' : 'Aucune écriture comptable'}
                  </td>
                </tr>
              ) : (
                paginatedLines.map((line) => {
                  const rowId = getLineId(line);
                  return (
                    <tr
                      key={rowId}
                      className={`hover:bg-gray-50 cursor-pointer transition-colors ${activeRowId === rowId ? 'bg-purple-50' : ''}`}
                      onClick={() => setActiveRowId(rowId)}
                      onDoubleClick={() => openMove(line)}
                    >
                      <td className="border border-gray-300 px-2 py-1.5 text-center" onClick={(event) => event.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={selectedLineIds.includes(rowId)}
                          onChange={(event) => {
                            if (event.target.checked) {
                              setSelectedLineIds((prev) => [...prev, rowId]);
                            } else {
                              setSelectedLineIds((prev) => prev.filter((id) => id !== rowId));
                            }
                          }}
                          className="w-3.5 h-3.5 cursor-pointer"
                        />
                      </td>

                      {visibleColumns.date && (
                        <td className="border border-gray-300 px-2 py-1.5 text-xs text-gray-700 whitespace-nowrap">
                          {formatDate(line?.date)}
                        </td>
                      )}
                      {visibleColumns.account && (
                        <td className="border border-gray-300 px-2 py-1.5">
                          <div className="text-xs">
                            <div className="font-medium text-gray-900">{getAccountCode(line)}</div>
                            <div className="truncate text-[11px] text-gray-500 max-w-[210px]" title={getAccountName(line)}>{getAccountName(line) || '—'}</div>
                          </div>
                        </td>
                      )}
                      {visibleColumns.journal && (
                        <td className="border border-gray-300 px-2 py-1.5 text-xs text-gray-700">
                          {getJournalCode(line)}
                        </td>
                      )}
                      {visibleColumns.piece && (
                        <td className="border border-gray-300 px-2 py-1.5">
                          <div className="text-xs">
                            <div className="font-medium truncate max-w-[120px]" title={getMoveName(line)}>{getMoveName(line)}</div>
                            <div className="text-gray-400 text-[10px] truncate max-w-[120px]">{getJournalCode(line)}</div>
                          </div>
                        </td>
                      )}
                      {visibleColumns.partner && (
                        <td className="border border-gray-300 px-2 py-1.5 text-xs text-gray-700 truncate max-w-[140px]" title={getPartnerName(line)}>
                          {getPartnerName(line)}
                        </td>
                      )}
                      {visibleColumns.label && (
                        <td className="border border-gray-300 px-2 py-1.5 text-xs text-gray-700 truncate max-w-[220px]" title={line?.name || ''}>
                          {line?.name || '—'}
                        </td>
                      )}
                      {visibleColumns.debit && (
                        <td className="border border-gray-300 px-2 py-1.5 text-right text-xs">
                          {formatAmount(line?.debit)}
                        </td>
                      )}
                      {visibleColumns.credit && (
                        <td className="border border-gray-300 px-2 py-1.5 text-right text-xs">
                          {formatAmount(line?.credit)}
                        </td>
                      )}
                      {visibleColumns.reconcile && (
                        <td className="border border-gray-300 px-2 py-1.5">
                          <StatusBadge className={getReconcileClass(line)}>
                            {getReconcileLabel(line)}
                          </StatusBadge>
                        </td>
                      )}
                      {visibleColumns.state && (
                        <td className="border border-gray-300 px-2 py-1.5">
                          <StatusBadge className={getStateClass(getLineState(line))}>
                            {getStateLabel(getLineState(line))}
                          </StatusBadge>
                        </td>
                      )}
                      <td className="border border-gray-300 px-2 py-1.5" />
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {showColumnsMenu && (
          <div
            id="columns-menu"
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
                    onChange={() => setVisibleColumns((prev) => ({ ...prev, [column.id]: !prev[column.id] }))}
                    className="w-3.5 h-3.5 cursor-pointer"
                  />
                  <span className="text-xs">{column.label}</span>
                </label>
              ))}
            </div>
            <div className="p-2">
              <button
                type="button"
                onClick={() => {
                  const allVisible = {};
                  columns.forEach((column) => { allVisible[column.id] = true; });
                  setVisibleColumns(allVisible);
                }}
                className="w-full text-xs text-purple-600 hover:text-purple-700 text-center py-1"
              >
                Tout afficher
              </button>
              <button
                type="button"
                onClick={() => {
                  const allHidden = {};
                  columns.forEach((column) => { allHidden[column.id] = false; });
                  setVisibleColumns(allHidden);
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
              Page {safePage} sur {totalPages}
            </div>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setCurrentPage(1)}
                disabled={safePage === 1}
                className="p-1 rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <FiChevronsLeft size={14} />
              </button>
              <button
                type="button"
                onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
                disabled={safePage === 1}
                className="p-1 rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <FiChevronLeft size={14} />
              </button>
              <span className="px-2 text-xs text-gray-700">
                {safePage} / {totalPages}
              </span>
              <button
                type="button"
                onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
                disabled={safePage === totalPages}
                className="p-1 rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <FiChevronRight size={14} />
              </button>
              <button
                type="button"
                onClick={() => setCurrentPage(totalPages)}
                disabled={safePage === totalPages}
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
