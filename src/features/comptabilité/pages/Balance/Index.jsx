import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  FiBarChart2,
  FiCalendar,
  FiChevronDown,
  FiChevronRight,
  FiDownload,
  FiFileText,
  FiFilter,
  FiMoreHorizontal,
  FiPrinter,
  FiRefreshCw,
  FiSettings,
  FiX,
} from 'react-icons/fi';
import { apiClient } from '../../../../services/apiClient';
import { useEntity } from '../../../../context/EntityContext';
import SomaneSelect from '../../../../components/SomaneSelect';

const getYearStart = () => `${new Date().getFullYear()}-01-01`;
const getYearEnd = () => `${new Date().getFullYear()}-12-31`;

const normalizeList = (value) => {
  if (Array.isArray(value)) return value;
  if (Array.isArray(value?.results)) return value.results;
  if (Array.isArray(value?.data)) return value.data;
  if (Array.isArray(value?.items)) return value.items;
  if (Array.isArray(value?.records)) return value.records;
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

const debitPart = (value) => Math.max(toNumber(value), 0);
const creditPart = (value) => Math.max(-toNumber(value), 0);

const formatAmount = (value) => {
  const rounded = Math.round(toNumber(value));
  return rounded.toLocaleString('fr-FR');
};

const formatDate = (value) => {
  if (!value) return '-';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
};

const getDebit = (account) => (
  account.total_debit ??
  account.movement_debit ??
  account.debit ??
  0
);

const getCredit = (account) => (
  account.total_credit ??
  account.movement_credit ??
  account.credit ??
  0
);

const getOpeningBalance = (account) => (
  account.opening_balance ??
  account.initial_balance ??
  account.balance_initial ??
  0
);

const getClosingBalance = (account) => (
  account.balance ??
  account.closing_balance ??
  account.current_balance ??
  (toNumber(getOpeningBalance(account)) + toNumber(getDebit(account)) - toNumber(getCredit(account)))
);

const AmountCell = ({ value, strong = false }) => {
  const amount = toNumber(value);
  return (
    <span className={`${amount === 0 ? 'text-gray-300' : 'text-gray-900'} ${strong ? 'font-semibold' : ''}`}>
      {formatAmount(amount)}
    </span>
  );
};

export default function BalanceGenerale() {
  const { activeEntity } = useEntity();
  const filterMenuRef = useRef(null);
  const actionsMenuRef = useRef(null);

  const [filters, setFilters] = useState({
    date_from: getYearStart(),
    date_to: getYearEnd(),
    account_code: '',
    state: 'all',
    show_zero: false,
    show_details: false,
  });
  const [accounts, setAccounts] = useState([]);
  const [expandedAccounts, setExpandedAccounts] = useState({});
  const [showColumnMenu, setShowColumnMenu] = useState(false);
  const [showActionsMenu, setShowActionsMenu] = useState(false);
  const [columnsMenuPosition, setColumnsMenuPosition] = useState({ top: 0, left: 0 });
  const [columnVisibility, setColumnVisibility] = useState({
    initialMovement: true,
    movement: true,
    opening: true,
    period: true,
    closing: true,
  });
  const [searchText, setSearchText] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  const columnGroups = [
    { key: 'initialMovement', label: 'Mouvement initial' },
    { key: 'opening', label: 'Solde initial' },
    { key: 'movement', label: 'Mouvement' },
    { key: 'period', label: 'Solde période' },
    { key: 'closing', label: 'Solde final' },
  ];
  const tableColumnCount = 3 + columnGroups.filter((column) => columnVisibility[column.key]).length * 2;

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (filterMenuRef.current && !filterMenuRef.current.contains(event.target)) {
        setShowFilters(false);
      }
      if (actionsMenuRef.current && !actionsMenuRef.current.contains(event.target)) {
        setShowActionsMenu(false);
      }
      if (
        showColumnMenu &&
        !event.target.closest('#balance-generale-columns-menu') &&
        !event.target.closest('.balance-generale-columns-button')
      ) {
        setShowColumnMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showColumnMenu]);

  const loadBalance = useCallback(async () => {
    if (!activeEntity?.id) {
      setError('Veuillez selectionner une entite.');
      setAccounts([]);
      return;
    }

    try {
      setLoading(true);
      setError('');

      const params = {
        company: activeEntity.id,
        date_from: filters.date_from,
        date_to: filters.date_to,
        state: filters.state,
      };

      if (filters.account_code) params.account_code = filters.account_code;

      const response = await apiClient.get('/compta/move-lines/grand-livre/', { params });
      const data = response?.data || response;
      const results = normalizeList(data?.results || data)
        .map((account) => {
          const lines = normalizeList(account.lines);
          const openingBalance = toNumber(getOpeningBalance(account));
          const movementDebit = toNumber(getDebit(account));
          const movementCredit = toNumber(getCredit(account));
          const initialMovementDebit = toNumber(account.initial_movement_debit ?? account.opening_movement_debit ?? account.previous_debit ?? 0);
          const initialMovementCredit = toNumber(account.initial_movement_credit ?? account.opening_movement_credit ?? account.previous_credit ?? 0);
          const closingBalance = toNumber(getClosingBalance(account));

          return {
            id: account.account_id || account.id || account.account_code,
            account_code: account.account_code || account.code || '',
            account_name: account.account_name || account.name || '',
            opening_debit: debitPart(openingBalance),
            opening_credit: creditPart(openingBalance),
            initial_movement_debit: initialMovementDebit,
            initial_movement_credit: initialMovementCredit,
            movement_debit: movementDebit,
            movement_credit: movementCredit,
            period_debit: debitPart(movementDebit - movementCredit),
            period_credit: creditPart(movementDebit - movementCredit),
            closing_debit: debitPart(closingBalance),
            closing_credit: creditPart(closingBalance),
            line_count: lines.length,
            lines,
          };
        })
        .filter((account) => (
          filters.show_zero ||
          account.opening_debit !== 0 ||
          account.opening_credit !== 0 ||
          account.initial_movement_debit !== 0 ||
          account.initial_movement_credit !== 0 ||
          account.movement_debit !== 0 ||
          account.movement_credit !== 0 ||
          account.period_debit !== 0 ||
          account.period_credit !== 0 ||
          account.closing_debit !== 0 ||
          account.closing_credit !== 0
        ))
        .sort((a, b) => String(a.account_code).localeCompare(String(b.account_code), 'fr'));

      const nextExpanded = {};
      results.forEach((account) => {
        nextExpanded[account.id] = filters.show_details && account.lines.length > 0;
      });

      setAccounts(results);
      setExpandedAccounts(nextExpanded);
    } catch (err) {
      console.error('Erreur chargement balance:', err);
      setError('Impossible de charger la balance.');
      setAccounts([]);
    } finally {
      setLoading(false);
    }
  }, [activeEntity, filters]);

  useEffect(() => {
    loadBalance();
  }, [loadBalance]);

  const filteredAccounts = useMemo(() => {
    const query = normalizeText(searchText);
    if (!query) return accounts;

    return accounts
      .map((account) => {
        const accountText = normalizeText(`${account.account_code} ${account.account_name}`);
        const lines = accountText.includes(query)
          ? account.lines
          : account.lines.filter((line) => normalizeText([
              line.date,
              line.move_name,
              line.journal_code,
              line.partner_name,
              line.label,
              line.name,
            ].filter(Boolean).join(' ')).includes(query));

        if (accountText.includes(query) || lines.length) return { ...account, lines };
        return null;
      })
      .filter(Boolean);
  }, [accounts, searchText]);

  const totals = useMemo(() => filteredAccounts.reduce(
    (acc, account) => ({
      opening_debit: acc.opening_debit + account.opening_debit,
      opening_credit: acc.opening_credit + account.opening_credit,
      initial_movement_debit: acc.initial_movement_debit + account.initial_movement_debit,
      initial_movement_credit: acc.initial_movement_credit + account.initial_movement_credit,
      movement_debit: acc.movement_debit + account.movement_debit,
      movement_credit: acc.movement_credit + account.movement_credit,
      period_debit: acc.period_debit + account.period_debit,
      period_credit: acc.period_credit + account.period_credit,
      closing_debit: acc.closing_debit + account.closing_debit,
      closing_credit: acc.closing_credit + account.closing_credit,
      line_count: acc.line_count + account.line_count,
    }),
    {
      opening_debit: 0,
      opening_credit: 0,
      initial_movement_debit: 0,
      initial_movement_credit: 0,
      movement_debit: 0,
      movement_credit: 0,
      period_debit: 0,
      period_credit: 0,
      closing_debit: 0,
      closing_credit: 0,
      line_count: 0,
    }
  ), [filteredAccounts]);

  const activeFilterChips = useMemo(() => {
    const chips = [];
    if (searchText.trim()) chips.push({ key: 'search', label: searchText.trim(), className: 'bg-blue-100 text-blue-700' });
    if (filters.account_code) chips.push({ key: 'account_code', label: `Compte : ${filters.account_code}`, className: 'bg-purple-100 text-purple-700' });
    if (filters.state !== 'all') chips.push({ key: 'state', label: filters.state === 'posted' ? 'Écritures validées' : 'Brouillons', className: 'bg-gray-100 text-gray-700' });
    if (filters.show_zero) chips.push({ key: 'show_zero', label: 'Soldes nuls', className: 'bg-gray-100 text-gray-700' });
    if (filters.show_details) chips.push({ key: 'show_details', label: 'Détails ouverts', className: 'bg-gray-100 text-gray-700' });
    return chips;
  }, [filters, searchText]);

  const removeFilter = (key) => {
    if (key === 'search') {
      setSearchText('');
    } else if (key === 'state') {
      setFilters((prev) => ({ ...prev, state: 'all' }));
    } else if (key === 'show_zero' || key === 'show_details') {
      setFilters((prev) => ({ ...prev, [key]: false }));
    } else {
      setFilters((prev) => ({ ...prev, [key]: '' }));
    }
  };

  const handleFilterChange = (name, value) => {
    setFilters((prev) => ({ ...prev, [name]: value }));
  };

  const resetFilters = () => {
    setFilters({
      date_from: getYearStart(),
      date_to: getYearEnd(),
      account_code: '',
      state: 'all',
      show_zero: false,
      show_details: false,
    });
    setSearchText('');
    setShowFilters(false);
  };

  const toggleAccount = (accountId) => {
    setExpandedAccounts((prev) => ({ ...prev, [accountId]: !prev[accountId] }));
  };

  const toggleColumn = (columnKey) => {
    setColumnVisibility((prev) => ({ ...prev, [columnKey]: !prev[columnKey] }));
  };

  const expandAll = () => {
    const nextExpanded = {};
    filteredAccounts.forEach((account) => {
      nextExpanded[account.id] = true;
    });
    setExpandedAccounts(nextExpanded);
  };

  const collapseAll = () => {
    const nextExpanded = {};
    filteredAccounts.forEach((account) => {
      nextExpanded[account.id] = false;
    });
    setExpandedAccounts(nextExpanded);
  };

  const exportCsv = (withDetails = false) => {
    const rows = [
      [
        'Compte',
        'Libelle',
        'Mouvement initial debit',
        'Mouvement initial credit',
        'Solde initial debit',
        'Solde initial credit',
        'Mouvement debit',
        'Mouvement credit',
        'Solde periode debit',
        'Solde periode credit',
        'Solde debit',
        'Solde credit',
        'Nb mouvements',
      ],
      ...filteredAccounts.map((account) => [
        account.account_code,
        account.account_name,
        account.initial_movement_debit,
        account.initial_movement_credit,
        account.opening_debit,
        account.opening_credit,
        account.movement_debit,
        account.movement_credit,
        account.period_debit,
        account.period_credit,
        account.closing_debit,
        account.closing_credit,
        account.line_count,
      ]),
      [
        'TOTAUX',
        '',
        totals.initial_movement_debit,
        totals.initial_movement_credit,
        totals.opening_debit,
        totals.opening_credit,
        totals.movement_debit,
        totals.movement_credit,
        totals.period_debit,
        totals.period_credit,
        totals.closing_debit,
        totals.closing_credit,
        totals.line_count,
      ],
    ];

    if (withDetails) {
      rows.push([]);
      rows.push(['Details mouvements']);
      rows.push(['Compte', 'Date', 'Piece', 'Journal', 'Partenaire', 'Libelle', 'Debit', 'Credit', 'Solde courant']);
      filteredAccounts.forEach((account) => {
        account.lines.forEach((line) => {
          rows.push([
            account.account_code,
            line.date || '',
            line.move_name || '',
            line.journal_code || '',
            line.partner_name || '',
            line.label || line.name || '',
            toNumber(line.debit),
            toNumber(line.credit),
            toNumber(line.running_balance ?? line.balance),
          ]);
        });
      });
    }

    const csv = rows
      .map((row) => row.map((cell) => `"${String(cell ?? '').replace(/"/g, '""')}"`).join(';'))
      .join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `balance-${withDetails ? 'detaillee' : 'generale'}-${filters.date_from}-${filters.date_to}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  if (!activeEntity?.id) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="bg-white border border-gray-300 p-8 text-center">
          <FiBarChart2 className="mx-auto mb-3 text-gray-400" size={34} />
          <h1 className="text-lg font-bold text-gray-900">Balance generale</h1>
          <p className="mt-2 text-sm text-gray-600">Veuillez selectionner une entite.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="bg-white border border-gray-300">
        <div className="border-b border-gray-300 px-4 py-3">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex shrink-0 items-center gap-3">
              <h1
                className="cursor-pointer text-lg font-bold text-gray-900 transition-all duration-200 hover:scale-105 hover:text-purple-600"
                onClick={loadBalance}
                title="Actualiser la balance générale"
              >
                Balance generale
              </h1>
              <div className="relative" ref={actionsMenuRef}>
                <button
                  type="button"
                  onClick={() => setShowActionsMenu((value) => !value)}
                  className="flex h-8 w-8 items-center justify-center rounded-full border border-gray-300 text-gray-700 transition-all duration-200 hover:scale-110 hover:bg-gray-50 hover:shadow-md active:scale-90"
                  title="Menu des actions"
                >
                  <FiSettings size={14} />
                </button>
                {showActionsMenu && (
                  <div onMouseLeave={() => setShowActionsMenu(false)} className="absolute left-0 z-50 mt-1 w-48 rounded border border-gray-300 bg-white shadow-lg">
                    <button type="button" onClick={() => { setShowActionsMenu(false); loadBalance(); }} className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs hover:bg-gray-50">
                      <FiRefreshCw size={12} className={loading ? 'animate-spin' : ''} /> Actualiser
                    </button>
                    <button type="button" onClick={() => { expandAll(); setShowActionsMenu(false); }} className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs hover:bg-gray-50">
                      <FiChevronDown size={12} /> Tout ouvrir
                    </button>
                    <button type="button" onClick={() => { collapseAll(); setShowActionsMenu(false); }} className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs hover:bg-gray-50">
                      <FiChevronRight size={12} /> Tout fermer
                    </button>
                    <button type="button" onClick={() => { setShowActionsMenu(false); setTimeout(() => window.print(), 0); }} className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs hover:bg-gray-50">
                      <FiPrinter size={12} /> Imprimer
                    </button>
                    <button type="button" onClick={() => { exportCsv(false); setShowActionsMenu(false); }} disabled={!filteredAccounts.length} className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs hover:bg-gray-50 disabled:opacity-50">
                      <FiDownload size={12} /> Export CSV
                    </button>
                    <button type="button" onClick={() => { exportCsv(true); setShowActionsMenu(false); }} disabled={!filteredAccounts.length} className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs hover:bg-gray-50 disabled:opacity-50">
                      <FiDownload size={12} /> Export détaillé
                    </button>
                  </div>
                )}
              </div>
            </div>

            <div className="flex min-w-[280px] flex-1 justify-center">
              <div ref={filterMenuRef} className="relative w-full max-w-2xl">
              <div className="flex min-h-[38px] flex-wrap items-center rounded border border-gray-300 bg-white p-1">
                {activeFilterChips.map((filter) => (
                  <span key={filter.key} className={`m-0.5 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs ${filter.className}`}>
                    {filter.label}
                    <button type="button" onClick={() => removeFilter(filter.key)} className="hover:text-red-600" title="Retirer ce filtre"><FiX size={10} /></button>
                  </span>
                ))}
                <input type="text" value={searchText} onChange={(event) => setSearchText(event.target.value)} placeholder="Rechercher..." className="min-w-[120px] flex-1 px-2 py-1 text-sm focus:outline-none" />
                <button type="button" onClick={() => setShowFilters((value) => !value)} className={`rounded p-1.5 hover:bg-gray-100 ${showFilters ? 'bg-gray-100' : ''}`} title="Ajouter un filtre">
                  <FiFilter size={14} className={activeFilterChips.length > 0 ? 'text-purple-600' : 'text-gray-400'} />
                </button>
              </div>

              {showFilters && (
                <div onMouseLeave={() => setShowFilters(false)} className="absolute right-0 z-50 mt-1 w-72 rounded border border-gray-300 bg-white shadow-lg">
                  <div className="border-b border-gray-200 p-2">
                    <p className="mb-2 text-xs font-medium text-gray-700">Période</p>
                    <div className="grid grid-cols-2 gap-2">
                      <input type="date" value={filters.date_from} onChange={(event) => handleFilterChange('date_from', event.target.value)} className="h-8 border border-gray-300 px-2 text-xs" />
                      <input type="date" value={filters.date_to} onChange={(event) => handleFilterChange('date_to', event.target.value)} className="h-8 border border-gray-300 px-2 text-xs" />
                    </div>
                  </div>
                  <div className="border-b border-gray-200 p-2">
                    <p className="mb-2 text-xs font-medium text-gray-700">Compte / État</p>
                    <input type="text" value={filters.account_code} onChange={(event) => handleFilterChange('account_code', event.target.value)} placeholder="Compte : 411" className="mb-2 h-8 w-full border border-gray-300 px-2 text-xs" />
                    <SomaneSelect value={filters.state} onChange={(event) => handleFilterChange('state', event.target.value)} className="h-8 w-full border border-gray-300 px-2 text-xs">
                      <option value="all">Toutes les écritures</option>
                      <option value="posted">Validées</option>
                      <option value="draft">Brouillons</option>
                    </SomaneSelect>
                  </div>
                  <div className="border-b border-gray-200 p-2 text-xs text-gray-700">
                    <label className="flex cursor-pointer items-center gap-2 rounded px-2 py-1 hover:bg-gray-50"><input type="checkbox" checked={filters.show_zero} onChange={(event) => handleFilterChange('show_zero', event.target.checked)} /> Soldes nuls</label>
                    <label className="flex cursor-pointer items-center gap-2 rounded px-2 py-1 hover:bg-gray-50"><input type="checkbox" checked={filters.show_details} onChange={(event) => handleFilterChange('show_details', event.target.checked)} /> Détails ouverts</label>
                  </div>
                  <div className="p-2"><button type="button" onClick={resetFilters} className="w-full py-1 text-center text-xs text-red-600 hover:text-red-700">Effacer tous les filtres</button></div>
                </div>
              )}
            </div>
            </div>

            <div className="shrink-0 text-right text-xs text-gray-500">
              <span className="block">Du {formatDate(filters.date_from)}</span>
              <span className="block">au {formatDate(filters.date_to)}</span>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-300 bg-gray-50 px-4 py-2">
          <div className="flex flex-wrap items-center gap-4 text-xs text-gray-600">
            <span>{filteredAccounts.length} compte(s)</span>
            <span>{totals.line_count} mouvement(s)</span>
          </div>
          <div className="flex flex-wrap gap-4 text-xs">
              <span>Mvt initial D <strong>{formatAmount(totals.initial_movement_debit)}</strong></span>
              <span>Mvt initial C <strong>{formatAmount(totals.initial_movement_credit)}</strong></span>
              <span>Initial D <strong>{formatAmount(totals.opening_debit)}</strong></span>
              <span>Initial C <strong>{formatAmount(totals.opening_credit)}</strong></span>
              <span>Mvt D <strong>{formatAmount(totals.movement_debit)}</strong></span>
              <span>Mvt C <strong>{formatAmount(totals.movement_credit)}</strong></span>
              <span>Période D <strong>{formatAmount(totals.period_debit)}</strong></span>
              <span>Période C <strong>{formatAmount(totals.period_credit)}</strong></span>
              <span>Solde D <strong>{formatAmount(totals.closing_debit)}</strong></span>
              <span>Solde C <strong>{formatAmount(totals.closing_credit)}</strong></span>
          </div>
        </div>

        {error && <div className="border-b border-red-200 bg-red-50 px-5 py-3 text-sm text-red-700">{error}</div>}

        <div className="overflow-x-auto">
          <table className="w-full min-w-[1420px] border-collapse">
            <thead>
              <tr className="border-b border-gray-300 bg-gray-100 text-sm text-gray-700">
                <th rowSpan="2" className="border-r border-gray-300 px-3 py-2 text-left font-semibold">Compte</th>
                <th rowSpan="2" className="border-r border-gray-300 px-3 py-2 text-left font-semibold">Libelle</th>
                {columnVisibility.initialMovement && <th colSpan="2" className="border-r border-gray-300 px-3 py-2 text-center font-semibold">Mouvement initial</th>}
                {columnVisibility.opening && <th colSpan="2" className="border-r border-gray-300 px-3 py-2 text-center font-semibold">Solde initial</th>}
                {columnVisibility.movement && <th colSpan="2" className="border-r border-gray-300 px-3 py-2 text-center font-semibold">Mouvement</th>}
                {columnVisibility.period && <th colSpan="2" className="border-r border-gray-300 px-3 py-2 text-center font-semibold">Solde période</th>}
                {columnVisibility.closing && <th colSpan="2" className="border-r border-gray-300 px-3 py-2 text-center font-semibold">Solde final</th>}
                <th rowSpan="2" className="w-10 border-l border-gray-300 px-2 py-1.5 text-center">
                  <button
                    type="button"
                    className="balance-generale-columns-button rounded p-1 hover:bg-gray-200"
                    title="Choisir les colonnes à afficher"
                    onClick={(event) => {
                      event.stopPropagation();
                      const rect = event.currentTarget.getBoundingClientRect();
                      setColumnsMenuPosition({
                        top: rect.bottom + 5,
                        left: Math.max(8, rect.right - 220),
                      });
                      setShowColumnMenu((value) => !value);
                    }}
                  >
                    <FiMoreHorizontal size={14} className="mx-auto text-gray-500" />
                  </button>
                </th>
              </tr>
              <tr className="border-b border-gray-300 bg-gray-100 text-xs text-gray-700">
                {columnGroups.filter((column) => columnVisibility[column.key]).map((column) => (
                  <React.Fragment key={column.key}>
                    <th className="border-r border-gray-300 px-3 py-2 text-right font-semibold">Debit</th>
                    <th className="border-r border-gray-300 px-3 py-2 text-right font-semibold">Credit</th>
                  </React.Fragment>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={tableColumnCount} className="px-4 py-10 text-center text-sm text-gray-500">Chargement de la balance...</td></tr>
              ) : filteredAccounts.length === 0 ? (
                <tr><td colSpan={tableColumnCount} className="px-4 py-10 text-center text-sm text-gray-500">Aucune donnee pour ces criteres.</td></tr>
              ) : (
                filteredAccounts.map((account) => {
                  const isExpanded = expandedAccounts[account.id] === true;
                  return (
                    <React.Fragment key={account.id}>
                      <tr className="border-b border-gray-200 hover:bg-purple-50">
                        <td className="border-r border-gray-200 px-3 py-2 text-sm font-semibold text-gray-900">
                          <div className="flex items-center gap-2">
                            <button type="button" onClick={() => toggleAccount(account.id)} className="inline-flex h-7 w-7 items-center justify-center text-gray-500 hover:text-purple-700" title="Voir les mouvements">
                              {isExpanded ? <FiChevronDown size={16} /> : <FiChevronRight size={16} />}
                            </button>
                            <span>{account.account_code}</span>
                            <span className="rounded border border-gray-200 bg-gray-50 px-2 py-0.5 text-xs font-normal text-gray-500">{account.line_count} mvt</span>
                          </div>
                        </td>
                        <td className="border-r border-gray-200 px-3 py-2 text-sm text-gray-700">{account.account_name}</td>
                        {columnVisibility.initialMovement && (
                          <>
                            <td className="border-r border-gray-200 px-3 py-2 text-right text-sm"><AmountCell value={account.initial_movement_debit} /></td>
                            <td className="border-r border-gray-200 px-3 py-2 text-right text-sm"><AmountCell value={account.initial_movement_credit} /></td>
                          </>
                        )}
                        {columnVisibility.opening && (
                          <>
                            <td className="border-r border-gray-200 px-3 py-2 text-right text-sm"><AmountCell value={account.opening_debit} /></td>
                            <td className="border-r border-gray-200 px-3 py-2 text-right text-sm"><AmountCell value={account.opening_credit} /></td>
                          </>
                        )}
                        {columnVisibility.movement && (
                          <>
                            <td className="border-r border-gray-200 px-3 py-2 text-right text-sm"><AmountCell value={account.movement_debit} /></td>
                            <td className="border-r border-gray-200 px-3 py-2 text-right text-sm"><AmountCell value={account.movement_credit} /></td>
                          </>
                        )}
                        {columnVisibility.period && (
                          <>
                            <td className="border-r border-gray-200 px-3 py-2 text-right text-sm bg-purple-50"><AmountCell value={account.period_debit} strong /></td>
                            <td className="border-r border-gray-200 px-3 py-2 text-right text-sm bg-purple-50"><AmountCell value={account.period_credit} strong /></td>
                          </>
                        )}
                        {columnVisibility.closing && (
                          <>
                            <td className="border-r border-gray-200 px-3 py-2 text-right text-sm"><AmountCell value={account.closing_debit} strong /></td>
                            <td className="border-r border-gray-200 px-3 py-2 text-right text-sm"><AmountCell value={account.closing_credit} strong /></td>
                          </>
                        )}
                        <td className="border-l border-gray-200" />
                      </tr>

                      {isExpanded && (
                        <tr className="border-b border-gray-200 bg-gray-50">
                          <td colSpan={tableColumnCount} className="px-6 py-3">
                            {account.lines.length === 0 ? (
                              <div className="text-sm text-gray-500">Aucune ecriture detaillee.</div>
                            ) : (
                              <div className="overflow-x-auto border border-gray-200 bg-white">
                                <table className="w-full min-w-[900px] border-collapse text-xs">
                                  <thead>
                                    <tr className="border-b border-gray-200 bg-gray-100 text-gray-600">
                                      <th className="px-3 py-2 text-left font-medium">Date</th>
                                      <th className="px-3 py-2 text-left font-medium">Piece</th>
                                      <th className="px-3 py-2 text-left font-medium">Journal</th>
                                      <th className="px-3 py-2 text-left font-medium">Partenaire</th>
                                      <th className="px-3 py-2 text-left font-medium">Libelle</th>
                                      <th className="px-3 py-2 text-right font-medium">Debit</th>
                                      <th className="px-3 py-2 text-right font-medium">Credit</th>
                                      <th className="px-3 py-2 text-right font-medium">Solde courant</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {account.lines.map((line, index) => (
                                      <tr key={line.id || index} className="border-b border-gray-100 hover:bg-gray-50">
                                        <td className="px-3 py-2 text-gray-700">{formatDate(line.date)}</td>
                                        <td className="px-3 py-2 font-medium text-gray-800">{line.move_name || '-'}</td>
                                        <td className="px-3 py-2 text-gray-700">{line.journal_code || '-'}</td>
                                        <td className="px-3 py-2 text-gray-700">{line.partner_name || '-'}</td>
                                        <td className="px-3 py-2 text-gray-700">{line.label || line.name || '-'}</td>
                                        <td className="px-3 py-2 text-right"><AmountCell value={line.debit} /></td>
                                        <td className="px-3 py-2 text-right"><AmountCell value={line.credit} /></td>
                                        <td className={`px-3 py-2 text-right ${toNumber(line.running_balance ?? line.balance) < 0 ? 'text-red-600' : 'text-gray-700'}`}>
                                          {formatAmount(line.running_balance ?? line.balance)}
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            )}
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })
              )}
            </tbody>
            {filteredAccounts.length > 0 && (
              <tfoot>
                <tr className="border-t border-gray-300 bg-gray-100 text-sm font-bold text-gray-900">
                  <td colSpan="2" className="border-r border-gray-300 px-3 py-3">TOTAUX</td>
                  {columnVisibility.initialMovement && (
                    <>
                      <td className="border-r border-gray-300 px-3 py-3 text-right">{formatAmount(totals.initial_movement_debit)}</td>
                      <td className="border-r border-gray-300 px-3 py-3 text-right">{formatAmount(totals.initial_movement_credit)}</td>
                    </>
                  )}
                  {columnVisibility.opening && (
                    <>
                      <td className="border-r border-gray-300 px-3 py-3 text-right">{formatAmount(totals.opening_debit)}</td>
                      <td className="border-r border-gray-300 px-3 py-3 text-right">{formatAmount(totals.opening_credit)}</td>
                    </>
                  )}
                  {columnVisibility.movement && (
                    <>
                      <td className="border-r border-gray-300 px-3 py-3 text-right">{formatAmount(totals.movement_debit)}</td>
                      <td className="border-r border-gray-300 px-3 py-3 text-right">{formatAmount(totals.movement_credit)}</td>
                    </>
                  )}
                  {columnVisibility.period && (
                    <>
                      <td className="border-r border-gray-300 px-3 py-3 text-right bg-purple-50">{formatAmount(totals.period_debit)}</td>
                      <td className="border-r border-gray-300 px-3 py-3 text-right bg-purple-50">{formatAmount(totals.period_credit)}</td>
                    </>
                  )}
                  {columnVisibility.closing && (
                    <>
                      <td className="border-r border-gray-300 px-3 py-3 text-right">{formatAmount(totals.closing_debit)}</td>
                      <td className="border-r border-gray-300 px-3 py-3 text-right">{formatAmount(totals.closing_credit)}</td>
                    </>
                  )}
                  <td className="border-l border-gray-300" />
                </tr>
              </tfoot>
            )}
          </table>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-gray-300 bg-gray-50 px-5 py-3 text-sm text-gray-600">
          <span className="flex items-center gap-2">
            <FiFileText size={15} />
            {filteredAccounts.length} comptes affiches, {totals.line_count} mouvements
          </span>
          <span className="flex items-center gap-2">
            <FiCalendar size={15} />
            Periode {formatDate(filters.date_from)} - {formatDate(filters.date_to)}
          </span>
          <span className="flex items-center gap-2">
            <button type="button" onClick={expandAll} className="text-purple-700 hover:text-purple-900">Ouvrir tous les details</button>
            <span className="text-gray-300">|</span>
            <button type="button" onClick={collapseAll} className="text-purple-700 hover:text-purple-900">Fermer</button>
          </span>
        </div>

        {showColumnMenu && (
          <div
            id="balance-generale-columns-menu"
            onMouseLeave={() => setShowColumnMenu(false)}
            className="fixed z-50 rounded border border-gray-300 bg-white shadow-lg"
            style={{
              top: columnsMenuPosition.top,
              left: columnsMenuPosition.left,
              width: '220px',
            }}
          >
            <div className="border-b border-gray-200 p-2">
              <p className="mb-2 text-xs font-medium text-gray-700">Colonnes à afficher</p>
              {columnGroups.map((column) => (
                <label key={column.key} className="flex cursor-pointer items-center gap-2 rounded px-2 py-1 hover:bg-gray-50">
                  <input type="checkbox" checked={columnVisibility[column.key]} onChange={() => toggleColumn(column.key)} className="h-3.5 w-3.5 cursor-pointer" />
                  <span className="text-xs text-gray-700">{column.label}</span>
                </label>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-2 p-2">
              <button type="button" onClick={() => setColumnVisibility(Object.fromEntries(columnGroups.map((column) => [column.key, true])))} className="py-1 text-center text-xs text-purple-600 hover:text-purple-700">Tout afficher</button>
              <button type="button" onClick={() => setColumnVisibility({ initialMovement: true, opening: true, movement: true, period: true, closing: true })} className="py-1 text-center text-xs text-gray-500 hover:text-gray-600">Défaut</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
