// src/features/comptabilite/pages/GrandLivrePartenaires/Index.jsx
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FiAlertCircle,
  FiChevronDown,
  FiChevronLeft,
  FiChevronRight,
  FiChevronsLeft,
  FiChevronsRight,
  FiDownload,
  FiFileText,
  FiFilter,
  FiMoreHorizontal,
  FiPrinter,
  FiSettings,
  FiX,
} from 'react-icons/fi';
import { apiClient } from '../../../../services/apiClient';
import { useEntity } from '../../../../context/EntityContext';

const getYearStart = () => `${new Date().getFullYear()}-01-01`;
const getYearEnd = () => `${new Date().getFullYear()}-12-31`;

const normalizeList = (value) => {
  if (Array.isArray(value)) return value;
  if (Array.isArray(value?.results)) return value.results;
  if (Array.isArray(value?.data)) return value.data;
  if (Array.isArray(value?.items)) return value.items;
  if (Array.isArray(value?.records)) return value.records;
  if (Array.isArray(value?.data?.results)) return value.data.results;
  return [];
};

const normalizeText = (value) => String(value || '')
  .trim()
  .toLowerCase()
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '');

const toNumber = (value) => {
  const number = Number(value || 0);
  return Number.isFinite(number) ? number : 0;
};

const formatAmount = (value) => {
  const rounded = Math.round(toNumber(value));
  return `${rounded.toLocaleString('fr-FR')} CFA`;
};

const formatDate = (value) => {
  if (!value) return '-';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
};

const getPartnerDebit = (partner) => partner.total_debit ?? partner.movement_debit ?? partner.debit ?? 0;
const getPartnerCredit = (partner) => partner.total_credit ?? partner.movement_credit ?? partner.credit ?? 0;
const getPartnerBalance = (partner) => (
  partner.balance ??
  partner.closing_balance ??
  partner.current_balance ??
  (toNumber(getPartnerDebit(partner)) - toNumber(getPartnerCredit(partner)))
);
const getPartnerKey = (partner) => partner.partner_id || partner.id || partner.partner_name;
const getPartnerLabel = (partner) => (
  partner?.raison_sociale ||
  partner?.display_name ||
  partner?.name ||
  partner?.nom ||
  (partner?.id ? `Partenaire ${partner.id}` : '')
);
const getLineLabel = (line) => line.label || line.name || '';
const getLineMoveId = (line) => (
  line.move_id ||
  line.moveId ||
  line.account_move_id ||
  line.accountMoveId ||
  (typeof line.move === 'object' ? line.move?.id : line.move)
);

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

const StateChip = ({ value }) => {
  const config = {
    all: { text: 'Toutes', cls: 'bg-gray-100 text-gray-700' },
    posted: { text: 'Validees', cls: 'bg-green-100 text-green-700' },
    draft: { text: 'Brouillons', cls: 'bg-amber-100 text-amber-700' },
  }[value] || { text: value || 'Toutes', cls: 'bg-gray-100 text-gray-700' };

  return <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs ${config.cls}`}>{config.text}</span>;
};

export default function GrandLivrePartenaires() {
  const navigate = useNavigate();
  const { activeEntity } = useEntity();
  const filterMenuRef = useRef(null);
  const actionsMenuRef = useRef(null);

  const [filters, setFilters] = useState({
    date_from: getYearStart(),
    date_to: getYearEnd(),
    partner: '',
    account_code: '',
    state: 'all',
  });
  const [partners, setPartners] = useState([]);
  const [report, setReport] = useState(null);
  const [expandedPartners, setExpandedPartners] = useState({});
  const [searchText, setSearchText] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingRefs, setLoadingRefs] = useState(false);
  const [error, setError] = useState('');

  const [showFilterMenu, setShowFilterMenu] = useState(false);
  const [showActionsMenu, setShowActionsMenu] = useState(false);
  const [showColumnsMenu, setShowColumnsMenu] = useState(false);
  const [columnsMenuPosition, setColumnsMenuPosition] = useState({ top: 0, left: 0 });
  const [activeLineMenu, setActiveLineMenu] = useState(null);
  const [lineMenuPosition, setLineMenuPosition] = useState({ top: 0, left: 0 });
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(15);

  const defaultVisibleColumns = useMemo(() => ({
    partner: true,
    journal: true,
    account: true,
    invoice_date: true,
    due_date: true,
    matching: true,
    debit: true,
    credit: true,
    balance: true,
  }), []);
  const [visibleColumns, setVisibleColumns] = useState(defaultVisibleColumns);

  const columns = useMemo(() => [
    { id: 'partner', label: 'Partenaire / Ecriture', width: 'min-w-[300px]' },
    { id: 'journal', label: 'Journal', width: 'w-[90px]' },
    { id: 'account', label: 'Compte', width: 'w-[100px]' },
    { id: 'invoice_date', label: 'Date facturation', width: 'w-[120px]' },
    { id: 'due_date', label: 'Echeance', width: 'w-[110px]' },
    { id: 'matching', label: 'Lettrage', width: 'w-[100px]' },
    { id: 'debit', label: 'Debit', width: 'w-[120px]', align: 'right' },
    { id: 'credit', label: 'Credit', width: 'w-[120px]', align: 'right' },
    { id: 'balance', label: 'Solde', width: 'w-[120px]', align: 'right' },
  ], []);

  const visibleColumnCount = useMemo(
    () => columns.filter((column) => visibleColumns[column.id]).length,
    [columns, visibleColumns]
  );

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (filterMenuRef.current && !filterMenuRef.current.contains(event.target)) {
        setShowFilterMenu(false);
      }
      if (actionsMenuRef.current && !actionsMenuRef.current.contains(event.target)) {
        setShowActionsMenu(false);
      }
      if (
        showColumnsMenu &&
        !event.target.closest('#glp-columns-menu') &&
        !event.target.closest('.glp-columns-button')
      ) {
        setShowColumnsMenu(false);
      }
      if (
        activeLineMenu &&
        !event.target.closest('#glp-line-menu') &&
        !event.target.closest('.glp-line-menu-button')
      ) {
        setActiveLineMenu(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [activeLineMenu, showColumnsMenu]);

  const loadReferences = useCallback(async () => {
    if (!activeEntity?.id) return;
    try {
      setLoadingRefs(true);
      const response = await apiClient.get('partenaires/', { params: { company: activeEntity.id } });
      setPartners(normalizeList(response?.data || response));
    } catch (err) {
      console.error('Erreur chargement partenaires:', err);
      setPartners([]);
    } finally {
      setLoadingRefs(false);
    }
  }, [activeEntity]);

  const loadGrandLivrePartenaires = useCallback(async () => {
    if (!activeEntity?.id) {
      setError('Veuillez selectionner une entite.');
      setReport({ results: [] });
      return;
    }

    try {
      setLoading(true);
      setError('');

      const params = Object.fromEntries(
        Object.entries({
          company: activeEntity.id,
          date_from: filters.date_from,
          date_to: filters.date_to,
          state: filters.state,
          partner: filters.partner,
          account_code: filters.account_code,
        }).filter(([, value]) => value !== undefined && value !== null && value !== '')
      );

      const response = await apiClient.get('/compta/move-lines/grand-livre-partenaires/', { params });
      const data = response?.data || response;
      const results = normalizeList(data?.results || data);

      setReport({ ...(data || {}), results });

      const nextExpanded = {};
      results.forEach((partner) => {
        nextExpanded[getPartnerKey(partner)] = true;
      });
      setExpandedPartners(nextExpanded);
      setCurrentPage(1);
    } catch (err) {
      console.error('Erreur chargement grand livre partenaires:', err);
      setError('Impossible de charger le grand livre des partenaires.');
      setReport({ results: [] });
    } finally {
      setLoading(false);
    }
  }, [activeEntity, filters]);

  useEffect(() => {
    loadReferences();
  }, [loadReferences]);

  useEffect(() => {
    loadGrandLivrePartenaires();
  }, [loadGrandLivrePartenaires]);

  const results = useMemo(() => report?.results || [], [report]);

  const activeFilterChips = useMemo(() => {
    const chips = [];
    if (searchText.trim()) chips.push({ key: 'search', label: searchText.trim(), cls: 'bg-blue-100 text-blue-700' });
    if (filters.state !== 'all') chips.push({ key: 'state', label: `Etat: ${filters.state === 'posted' ? 'Validees' : 'Brouillons'}`, cls: 'bg-green-100 text-green-700' });
    if (filters.account_code) chips.push({ key: 'account_code', label: `Compte: ${filters.account_code}`, cls: 'bg-purple-100 text-purple-700' });
    if (filters.partner) {
      const partner = partners.find((item) => String(item.id) === String(filters.partner));
      chips.push({ key: 'partner', label: `Partenaire: ${getPartnerLabel(partner) || filters.partner}`, cls: 'bg-gray-100 text-gray-700' });
    }
    return chips;
  }, [filters, partners, searchText]);

  const removeFilter = (key) => {
    if (key === 'search') setSearchText('');
    else if (key === 'state') setFilters((prev) => ({ ...prev, state: 'all' }));
    else setFilters((prev) => ({ ...prev, [key]: '' }));
  };

  const clearAllFilters = () => {
    setSearchText('');
    setFilters({
      date_from: getYearStart(),
      date_to: getYearEnd(),
      partner: '',
      account_code: '',
      state: 'all',
    });
  };

  const filteredResults = useMemo(() => {
    const query = normalizeText(searchText);
    if (!query) return results;

    return results
      .map((partner) => {
        const partnerLabel = normalizeText(partner.partner_name);
        const lines = normalizeList(partner.lines);
        const filteredLines = partnerLabel.includes(query)
          ? lines
          : lines.filter((line) => normalizeText([
              line.move_name,
              line.label,
              line.journal_code,
              line.account_code,
            ].filter(Boolean).join(' ')).includes(query));

        if (partnerLabel.includes(query) || filteredLines.length) {
          return { ...partner, lines: filteredLines };
        }
        return null;
      })
      .filter(Boolean);
  }, [results, searchText]);

  const totalPages = Math.max(1, Math.ceil(filteredResults.length / itemsPerPage));
  const pageStart = (currentPage - 1) * itemsPerPage;
  const paginatedPartners = filteredResults.slice(pageStart, pageStart + itemsPerPage);

  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages);
  }, [currentPage, totalPages]);

  const summary = useMemo(() => {
    if (!searchText && report?.summary) return report.summary;
    return filteredResults.reduce(
      (acc, partner) => ({
        total_debit: acc.total_debit + toNumber(getPartnerDebit(partner)),
        total_credit: acc.total_credit + toNumber(getPartnerCredit(partner)),
        balance: acc.balance + toNumber(getPartnerBalance(partner)),
      }),
      { total_debit: 0, total_credit: 0, balance: 0 }
    );
  }, [filteredResults, report, searchText]);

  const totalLineCount = useMemo(
    () => filteredResults.reduce((total, partner) => total + normalizeList(partner.lines).length, 0),
    [filteredResults]
  );

  const togglePartner = (partnerKey) => {
    setExpandedPartners((prev) => ({ ...prev, [partnerKey]: !prev[partnerKey] }));
  };

  const expandAll = () => {
    const nextExpanded = {};
    filteredResults.forEach((partner) => {
      nextExpanded[getPartnerKey(partner)] = true;
    });
    setExpandedPartners(nextExpanded);
    setShowActionsMenu(false);
  };

  const collapseAll = () => {
    const nextExpanded = {};
    filteredResults.forEach((partner) => {
      nextExpanded[getPartnerKey(partner)] = false;
    });
    setExpandedPartners(nextExpanded);
    setShowActionsMenu(false);
  };

  const openMove = (line) => {
    const moveId = getLineMoveId(line);
    if (!moveId) return;
    navigate(`/comptabilite/pieces/${moveId}`);
  };

  const openLineMenu = (event, line) => {
    event.stopPropagation();
    const rect = event.currentTarget.getBoundingClientRect();
    setLineMenuPosition({
      top: rect.bottom + window.scrollY + 5,
      left: rect.right + window.scrollX - 230,
    });
    setActiveLineMenu(line);
  };

  const openPartnerMoveLines = (partner) => {
    const params = new URLSearchParams();
    if (partner.partner_id) params.set('partner', partner.partner_id);
    if (filters.date_from) params.set('date_from', filters.date_from);
    if (filters.date_to) params.set('date_to', filters.date_to);
    if (filters.state) params.set('state', filters.state);
    navigate(`/comptabilite/pieces?${params.toString()}`);
  };

  const exportCsv = () => {
    const rows = [
      ['Partenaire', 'Piece', 'Journal', 'Compte', 'Date de facturation', 'Echeance', 'Lettrage', 'Debit', 'Credit', 'Solde'],
    ];

    filteredResults.forEach((partner) => {
      rows.push([
        partner.partner_name || 'Sans partenaire',
        '', '', '', '', '',
        'Total partenaire',
        toNumber(getPartnerDebit(partner)),
        toNumber(getPartnerCredit(partner)),
        toNumber(getPartnerBalance(partner)),
      ]);

      normalizeList(partner.lines).forEach((line) => {
        rows.push([
          partner.partner_name || 'Sans partenaire',
          line.move_name || '',
          line.journal_code || '',
          line.account_code || '',
          line.invoice_date || line.date || '',
          line.date_maturity || '',
          line.matching_number || '',
          toNumber(line.debit),
          toNumber(line.credit),
          toNumber(line.running_balance ?? line.balance),
        ]);
      });
    });

    rows.push(['Total', '', '', '', '', '', '', toNumber(summary.total_debit), toNumber(summary.total_credit), toNumber(summary.balance)]);

    const csv = rows.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(';')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `grand-livre-partenaires-${filters.date_from}-${filters.date_to}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    setShowActionsMenu(false);
  };

  if (!activeEntity?.id) {
    return (
      <div className="min-h-screen bg-gray-50 p-4">
        <div className="max-w-7xl mx-auto bg-white border border-gray-300">
          <div className="border-b border-gray-300 px-4 py-3">
            <div className="text-lg font-bold text-gray-900">Grand Livre des Partenaires</div>
          </div>
          <div className="p-8">
            <div className="bg-yellow-50 border border-yellow-200 rounded p-6 text-center">
              <FiAlertCircle className="text-yellow-600 mx-auto mb-3" size={32} />
              <p className="text-yellow-800 font-medium text-lg mb-3">Aucune entite selectionnee</p>
              <p className="text-sm text-gray-600">Veuillez selectionner une entite pour afficher le grand livre des partenaires.</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-7xl mx-auto bg-white border border-gray-300">
        <div className="border-b border-gray-300 px-4 py-3">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 flex-shrink-0">
              <Tooltip text="Actualiser le grand livre des partenaires">
                <h1
                  className="text-lg font-bold text-gray-900 cursor-pointer hover:text-purple-600 hover:scale-105 transition-all duration-200"
                  onClick={loadGrandLivrePartenaires}
                >
                  Grand Livre des Partenaires
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
                    <button onClick={expandAll} className="w-full px-3 py-2 text-xs text-left hover:bg-gray-50 flex items-center gap-2">
                      <FiChevronDown size={12} /> Tout ouvrir
                    </button>
                    <button onClick={collapseAll} className="w-full px-3 py-2 text-xs text-left hover:bg-gray-50 flex items-center gap-2">
                      <FiChevronRight size={12} /> Tout fermer
                    </button>
                    <button onClick={() => { window.print(); setShowActionsMenu(false); }} className="w-full px-3 py-2 text-xs text-left hover:bg-gray-50 flex items-center gap-2">
                      <FiPrinter size={12} /> Imprimer
                    </button>
                    <button onClick={exportCsv} disabled={!filteredResults.length} className="w-full px-3 py-2 text-xs text-left hover:bg-gray-50 flex items-center gap-2 disabled:opacity-50">
                      <FiDownload size={12} /> Export CSV
                    </button>
                  </div>
                )}
              </div>
            </div>

            <div className="flex-1 flex justify-center">
              <div className="relative w-full max-w-2xl">
                <div className="flex items-center flex-wrap border border-gray-300 rounded bg-white min-h-[38px] p-1">
                  {activeFilterChips.map((filter) => (
                    <span key={filter.key} className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs ${filter.cls} m-0.5`}>
                      {filter.label}
                      <button onClick={() => removeFilter(filter.key)} className="hover:text-red-600">
                        <FiX size={10} />
                      </button>
                    </span>
                  ))}

                  <input
                    type="text"
                    value={searchText}
                    onChange={(event) => {
                      setSearchText(event.target.value);
                      setCurrentPage(1);
                    }}
                    placeholder="Rechercher partenaire, piece, compte..."
                    className="flex-1 px-2 py-1 text-sm focus:outline-none min-w-[120px]"
                  />

                  <div className="relative" ref={filterMenuRef}>
                    <Tooltip text="Ajouter un filtre">
                      <button
                        onClick={() => setShowFilterMenu(!showFilterMenu)}
                        className={`p-1.5 rounded hover:bg-gray-100 ${showFilterMenu ? 'bg-gray-100' : ''}`}
                      >
                        <FiFilter size={14} className={activeFilterChips.length > 0 ? 'text-purple-600' : 'text-gray-400'} />
                      </button>
                    </Tooltip>

                    {showFilterMenu && (
                      <div className="absolute right-0 mt-1 w-72 bg-white border border-gray-300 shadow-lg rounded z-50">
                        <div className="p-2 border-b border-gray-200">
                          <p className="text-xs font-medium text-gray-700 mb-2">Etat</p>
                          <div className="grid grid-cols-2 gap-1">
                            {[
                              ['all', 'Toutes'],
                              ['posted', 'Validees'],
                              ['draft', 'Brouillons'],
                            ].map(([value, label]) => (
                              <button
                                key={value}
                                onClick={() => {
                                  setFilters((prev) => ({ ...prev, state: value }));
                                  setCurrentPage(1);
                                }}
                                className="text-left text-xs px-2 py-1 hover:bg-gray-100 rounded"
                              >
                                {label}
                              </button>
                            ))}
                          </div>
                        </div>

                        <div className="p-2 border-b border-gray-200">
                          <p className="text-xs font-medium text-gray-700 mb-2">Periode</p>
                          <div className="grid grid-cols-2 gap-2">
                            <input
                              type="date"
                              value={filters.date_from}
                              onChange={(event) => setFilters((prev) => ({ ...prev, date_from: event.target.value }))}
                              className="h-8 border border-gray-300 px-2 text-xs"
                            />
                            <input
                              type="date"
                              value={filters.date_to}
                              onChange={(event) => setFilters((prev) => ({ ...prev, date_to: event.target.value }))}
                              className="h-8 border border-gray-300 px-2 text-xs"
                            />
                          </div>
                        </div>

                        <div className="p-2 border-b border-gray-200">
                          <p className="text-xs font-medium text-gray-700 mb-2">Compte / Partenaire</p>
                          <input
                            type="text"
                            value={filters.account_code}
                            onChange={(event) => setFilters((prev) => ({ ...prev, account_code: event.target.value }))}
                            placeholder="Compte: 411 ou 401"
                            className="mb-2 h-8 w-full border border-gray-300 px-2 text-xs"
                          />
                          <select
                            value={filters.partner}
                            onChange={(event) => setFilters((prev) => ({ ...prev, partner: event.target.value }))}
                            disabled={loadingRefs}
                            className="h-8 w-full border border-gray-300 px-2 text-xs"
                          >
                            <option value="">Tous les partenaires</option>
                            {partners.map((partner) => (
                              <option key={partner.id} value={partner.id}>
                                {getPartnerLabel(partner)}
                              </option>
                            ))}
                          </select>
                        </div>

                        {activeFilterChips.length > 0 && (
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
              <span className="text-xs text-gray-500">partenaires</span>
            </div>
          </div>
        </div>

        <div className="border-b border-gray-300 px-4 py-2 bg-gray-50 flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-4 text-xs text-gray-600">
            <span>{filteredResults.length} partenaire(s)</span>
            <span>{totalLineCount} ecriture(s)</span>
            <StateChip value={filters.state} />
          </div>
          <div className="flex flex-wrap items-center gap-4 text-xs">
            <span><span className="text-gray-500">Debit </span><strong>{formatAmount(summary.total_debit)}</strong></span>
            <span><span className="text-gray-500">Credit </span><strong>{formatAmount(summary.total_credit)}</strong></span>
            <span><span className="text-gray-500">Solde </span><strong className={toNumber(summary.balance) < 0 ? 'text-red-600' : 'text-gray-900'}>{formatAmount(summary.balance)}</strong></span>
          </div>
        </div>

        {error && (
          <div className="border-b border-red-200 bg-red-50 px-4 py-2 text-xs text-red-700">
            {error}
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="bg-gray-100 border-b border-gray-300">
                {columns.map((column) => (
                  visibleColumns[column.id] && (
                    <th
                      key={column.id}
                      className={`border-r border-gray-300 px-2 py-1.5 text-xs font-medium text-gray-700 ${column.width} ${
                        column.align === 'right' ? 'text-right' : 'text-left'
                      }`}
                    >
                      {column.label}
                    </th>
                  )
                ))}
                <th className="border-l border-gray-300 px-2 py-1.5 w-10 text-center">
                  <Tooltip text="Choisir les colonnes a afficher">
                    <button
                      type="button"
                      className="glp-columns-button p-1 rounded hover:bg-gray-200"
                      onClick={(event) => {
                        event.stopPropagation();
                        const rect = event.currentTarget.getBoundingClientRect();
                        setColumnsMenuPosition({
                          top: rect.bottom + window.scrollY + 5,
                          left: rect.right - 220,
                        });
                        setShowColumnsMenu((value) => !value);
                      }}
                    >
                      <FiMoreHorizontal size={14} className="mx-auto text-gray-500" />
                    </button>
                  </Tooltip>
                </th>
              </tr>
            </thead>
            <tbody>
              {loading || loadingRefs ? (
                <tr>
                  <td colSpan={visibleColumnCount + 1} className="border border-gray-300 p-8 text-center text-gray-500 text-sm">
                    Chargement du grand livre des partenaires...
                  </td>
                </tr>
              ) : paginatedPartners.length === 0 ? (
                <tr>
                  <td colSpan={visibleColumnCount + 1} className="border border-gray-300 p-8 text-center text-gray-500 text-sm">
                    Aucune ecriture trouvee pour ces criteres.
                  </td>
                </tr>
              ) : (
                paginatedPartners.map((partner) => {
                  const partnerKey = getPartnerKey(partner);
                  const expanded = expandedPartners[partnerKey] !== false;
                  const lines = normalizeList(partner.lines);
                  const balance = getPartnerBalance(partner);

                  return (
                    <React.Fragment key={partnerKey}>
                      <tr className="hover:bg-gray-50 transition-colors bg-white font-semibold">
                        {visibleColumns.partner && (
                          <td className="border border-gray-300 px-2 py-1.5 text-xs text-gray-900">
                            <button
                              type="button"
                              onClick={() => togglePartner(partnerKey)}
                              className="mr-2 text-gray-500 hover:text-purple-600"
                            >
                              {expanded ? <FiChevronDown size={13} /> : <FiChevronRight size={13} />}
                            </button>
                            {partner.partner_name || 'Sans partenaire'}
                            <button
                              type="button"
                              onClick={(event) => {
                                event.stopPropagation();
                                openPartnerMoveLines(partner);
                              }}
                              className="ml-2 border border-gray-300 rounded px-1.5 py-0.5 text-[10px] font-normal text-gray-400 hover:border-purple-300 hover:bg-purple-50 hover:text-purple-700"
                              title="Voir les ecritures comptables de ce partenaire"
                            >
                              Ecritures comptables
                            </button>
                          </td>
                        )}
                        {visibleColumns.journal && <td className="border border-gray-300 px-2 py-1.5" />}
                        {visibleColumns.account && <td className="border border-gray-300 px-2 py-1.5" />}
                        {visibleColumns.invoice_date && <td className="border border-gray-300 px-2 py-1.5" />}
                        {visibleColumns.due_date && <td className="border border-gray-300 px-2 py-1.5" />}
                        {visibleColumns.matching && <td className="border border-gray-300 px-2 py-1.5" />}
                        {visibleColumns.debit && (
                          <td className="border border-gray-300 px-2 py-1.5 text-right text-xs">
                            {formatAmount(getPartnerDebit(partner))}
                          </td>
                        )}
                        {visibleColumns.credit && (
                          <td className="border border-gray-300 px-2 py-1.5 text-right text-xs">
                            {formatAmount(getPartnerCredit(partner))}
                          </td>
                        )}
                        {visibleColumns.balance && (
                          <td className={`border border-gray-300 px-2 py-1.5 text-right text-xs ${toNumber(balance) < 0 ? 'text-red-600' : 'text-gray-900'}`}>
                            {formatAmount(balance)}
                          </td>
                        )}
                        <td className="border border-gray-300 px-2 py-1.5" />
                      </tr>

                      {expanded && lines.map((line) => {
                        const runningBalance = line.running_balance ?? line.balance ?? 0;
                        const lineLabel = getLineLabel(line);
                        return (
                          <tr key={line.id} className="hover:bg-gray-50 transition-colors">
                            {visibleColumns.partner && (
                              <td className="border border-gray-300 px-2 py-1.5 text-xs text-gray-700 pl-8">
                                <div className="flex items-center gap-1">
                                  <div className="truncate max-w-[300px]" title={`${line.move_name || ''} ${lineLabel}`.trim()}>
                                    <span className="font-medium">{line.move_name || '-'}</span>
                                    {lineLabel ? <span className="ml-1 text-gray-500">{lineLabel}</span> : null}
                                  </div>
                                  <button
                                    type="button"
                                    onClick={(event) => openLineMenu(event, line)}
                                    className="glp-line-menu-button inline-flex h-5 w-5 flex-shrink-0 items-center justify-center rounded text-gray-300 hover:bg-gray-100 hover:text-gray-700"
                                    title="Actions"
                                  >
                                    <FiMoreHorizontal size={13} />
                                  </button>
                                </div>
                              </td>
                            )}
                            {visibleColumns.journal && (
                              <td className="border border-gray-300 px-2 py-1.5 text-xs text-gray-700">{line.journal_code || '-'}</td>
                            )}
                            {visibleColumns.account && (
                              <td className="border border-gray-300 px-2 py-1.5 text-xs text-gray-700">{line.account_code || '-'}</td>
                            )}
                            {visibleColumns.invoice_date && (
                              <td className="border border-gray-300 px-2 py-1.5 text-xs text-gray-700">{formatDate(line.invoice_date || line.date)}</td>
                            )}
                            {visibleColumns.due_date && (
                              <td className="border border-gray-300 px-2 py-1.5 text-xs text-red-500">{formatDate(line.date_maturity)}</td>
                            )}
                            {visibleColumns.matching && (
                              <td className="border border-gray-300 px-2 py-1.5 text-xs text-gray-700">{line.matching_number || '-'}</td>
                            )}
                            {visibleColumns.debit && (
                              <td className="border border-gray-300 px-2 py-1.5 text-right text-xs">
                                {toNumber(line.debit) ? formatAmount(line.debit) : <span className="text-gray-300">{formatAmount(0)}</span>}
                              </td>
                            )}
                            {visibleColumns.credit && (
                              <td className="border border-gray-300 px-2 py-1.5 text-right text-xs">
                                {toNumber(line.credit) ? formatAmount(line.credit) : <span className="text-gray-300">{formatAmount(0)}</span>}
                              </td>
                            )}
                            {visibleColumns.balance && (
                              <td className={`border border-gray-300 px-2 py-1.5 text-right text-xs ${toNumber(runningBalance) < 0 ? 'text-red-600' : 'text-gray-700'}`}>
                                {formatAmount(runningBalance)}
                              </td>
                            )}
                            <td className="border border-gray-300 px-2 py-1.5" />
                          </tr>
                        );
                      })}
                    </React.Fragment>
                  );
                })
              )}
            </tbody>
            {filteredResults.length > 0 && (
              <tfoot>
                <tr className="border-t border-gray-300 bg-gray-100 text-xs font-bold text-gray-900">
                  {visibleColumns.partner && <td className="border border-gray-300 px-2 py-2">Total</td>}
                  {visibleColumns.journal && <td className="border border-gray-300 px-2 py-2" />}
                  {visibleColumns.account && <td className="border border-gray-300 px-2 py-2" />}
                  {visibleColumns.invoice_date && <td className="border border-gray-300 px-2 py-2" />}
                  {visibleColumns.due_date && <td className="border border-gray-300 px-2 py-2" />}
                  {visibleColumns.matching && <td className="border border-gray-300 px-2 py-2" />}
                  {visibleColumns.debit && <td className="border border-gray-300 px-2 py-2 text-right">{formatAmount(summary.total_debit)}</td>}
                  {visibleColumns.credit && <td className="border border-gray-300 px-2 py-2 text-right">{formatAmount(summary.total_credit)}</td>}
                  {visibleColumns.balance && (
                    <td className={`border border-gray-300 px-2 py-2 text-right ${toNumber(summary.balance) < 0 ? 'text-red-600' : ''}`}>
                      {formatAmount(summary.balance)}
                    </td>
                  )}
                  <td className="border border-gray-300 px-2 py-2" />
                </tr>
              </tfoot>
            )}
          </table>
        </div>

        {showColumnsMenu && (
          <div
            id="glp-columns-menu"
            className="fixed bg-white border border-gray-300 shadow-lg rounded z-50"
            style={{ top: columnsMenuPosition.top, left: columnsMenuPosition.left, width: '220px' }}
          >
            <div className="p-2 border-b border-gray-200">
              <p className="text-xs font-medium text-gray-700 mb-2">Colonnes a afficher</p>
              {columns.map((column) => (
                <label key={column.id} className="flex items-center gap-2 py-1 px-2 hover:bg-gray-50 rounded cursor-pointer">
                  <input
                    type="checkbox"
                    checked={visibleColumns[column.id]}
                    disabled={column.id === 'partner'}
                    onChange={() => setVisibleColumns((prev) => ({ ...prev, [column.id]: !prev[column.id] }))}
                    className="w-3.5 h-3.5 cursor-pointer disabled:cursor-not-allowed"
                  />
                  <span className={`text-xs ${column.id === 'partner' ? 'text-gray-400' : 'text-gray-700'}`}>
                    {column.label}
                  </span>
                </label>
              ))}
            </div>
            <div className="p-2 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => {
                  const nextColumns = {};
                  columns.forEach((column) => { nextColumns[column.id] = true; });
                  setVisibleColumns(nextColumns);
                }}
                className="text-xs text-purple-600 hover:text-purple-700 text-center py-1"
              >
                Tout afficher
              </button>
              <button
                type="button"
                onClick={() => setVisibleColumns(defaultVisibleColumns)}
                className="text-xs text-gray-500 hover:text-gray-600 text-center py-1"
              >
                Defaut
              </button>
            </div>
          </div>
        )}

        {activeLineMenu && (
          <div
            id="glp-line-menu"
            className="fixed bg-white border border-gray-300 shadow-lg rounded z-50"
            style={{ top: lineMenuPosition.top, left: lineMenuPosition.left, width: '230px' }}
          >
            <button
              type="button"
              onClick={() => {
                openMove(activeLineMenu);
                setActiveLineMenu(null);
              }}
              disabled={!getLineMoveId(activeLineMenu)}
              className="w-full px-4 py-3 text-sm text-left text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 flex items-center gap-2"
            >
              <FiFileText size={15} />
              Voir la piece comptable
            </button>
          </div>
        )}

        {filteredResults.length > 0 && (
          <div className="border-t border-gray-300 px-4 py-2 bg-gray-50 flex items-center justify-between text-xs">
            <div className="text-gray-500">
              Affichage {pageStart + 1} - {Math.min(pageStart + itemsPerPage, filteredResults.length)} sur {filteredResults.length} partenaires
            </div>
            <div className="flex items-center gap-1">
              <button onClick={() => setCurrentPage(1)} disabled={currentPage === 1} className="p-1 border border-gray-300 rounded hover:bg-white disabled:opacity-40">
                <FiChevronsLeft size={13} />
              </button>
              <button onClick={() => setCurrentPage((page) => Math.max(1, page - 1))} disabled={currentPage === 1} className="p-1 border border-gray-300 rounded hover:bg-white disabled:opacity-40">
                <FiChevronLeft size={13} />
              </button>
              <span className="px-2 text-gray-600">Page {currentPage} / {totalPages}</span>
              <button onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))} disabled={currentPage === totalPages} className="p-1 border border-gray-300 rounded hover:bg-white disabled:opacity-40">
                <FiChevronRight size={13} />
              </button>
              <button onClick={() => setCurrentPage(totalPages)} disabled={currentPage === totalPages} className="p-1 border border-gray-300 rounded hover:bg-white disabled:opacity-40">
                <FiChevronsRight size={13} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}