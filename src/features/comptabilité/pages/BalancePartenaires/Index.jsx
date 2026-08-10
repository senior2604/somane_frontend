import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  FiCalendar,
  FiChevronDown,
  FiChevronRight,
  FiDownload,
  FiFileText,
  FiFilter,
  FiMoreHorizontal,
  FiPrinter,
  FiRefreshCw,
  FiUsers,
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

const formatAmount = (value) => Math.round(toNumber(value)).toLocaleString('fr-FR');

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

const getPartnerDebit = (partner) => (
  partner.total_debit ??
  partner.movement_debit ??
  partner.debit ??
  0
);

const getPartnerCredit = (partner) => (
  partner.total_credit ??
  partner.movement_credit ??
  partner.credit ??
  0
);

const getOpeningBalance = (partner) => (
  partner.opening_balance ??
  partner.initial_balance ??
  partner.balance_initial ??
  0
);

const getClosingBalance = (partner) => (
  partner.balance ??
  partner.closing_balance ??
  partner.current_balance ??
  (toNumber(getOpeningBalance(partner)) + toNumber(getPartnerDebit(partner)) - toNumber(getPartnerCredit(partner)))
);

const AmountCell = ({ value, strong = false }) => {
  const amount = toNumber(value);
  return (
    <span className={`${amount === 0 ? 'text-gray-300' : 'text-gray-900'} ${strong ? 'font-semibold' : ''}`}>
      {formatAmount(amount)}
    </span>
  );
};

export default function BalancePartenaires() {
  const { activeEntity } = useEntity();
  const filterMenuRef = useRef(null);

  const [filters, setFilters] = useState({
    date_from: getYearStart(),
    date_to: getYearEnd(),
    partner: '',
    account_code: '',
    state: 'all',
    show_zero: false,
    show_details: false,
  });
  const [partners, setPartners] = useState([]);
  const [partnerOptions, setPartnerOptions] = useState([]);
  const [expandedPartners, setExpandedPartners] = useState({});
  const [showColumnMenu, setShowColumnMenu] = useState(false);
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
  const [loadingRefs, setLoadingRefs] = useState(false);
  const [error, setError] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  const columnGroups = [
    { key: 'initialMovement', label: 'Mouvement initial' },
    { key: 'opening', label: 'Solde initial' },
    { key: 'movement', label: 'Mouvement' },
    { key: 'period', label: 'Solde période' },
    { key: 'closing', label: 'Solde final' },
  ];
  const tableColumnCount = 2 + columnGroups.filter((column) => columnVisibility[column.key]).length * 2;

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (filterMenuRef.current && !filterMenuRef.current.contains(event.target)) {
        setShowFilters(false);
      }
      if (
        showColumnMenu &&
        !event.target.closest('#balance-partenaires-columns-menu') &&
        !event.target.closest('.balance-partenaires-columns-button')
      ) {
        setShowColumnMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showColumnMenu]);

  const loadPartnerOptions = useCallback(async () => {
    if (!activeEntity?.id) return;

    try {
      setLoadingRefs(true);
      const response = await apiClient.get('partenaires/', {
        params: { company: activeEntity.id },
      });
      setPartnerOptions(normalizeList(response?.data || response));
    } catch (err) {
      console.error('Erreur chargement partenaires:', err);
      setPartnerOptions([]);
    } finally {
      setLoadingRefs(false);
    }
  }, [activeEntity]);

  const loadBalance = useCallback(async () => {
    if (!activeEntity?.id) {
      setError('Veuillez selectionner une entite.');
      setPartners([]);
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

      if (filters.partner) params.partner = filters.partner;
      if (filters.account_code) params.account_code = filters.account_code;

      const response = await apiClient.get('/compta/move-lines/grand-livre-partenaires/', { params });
      const data = response?.data || response;
      const results = normalizeList(data?.results || data)
        .map((partner) => {
          const lines = normalizeList(partner.lines);
          const openingBalance = toNumber(getOpeningBalance(partner));
          const movementDebit = toNumber(getPartnerDebit(partner));
          const movementCredit = toNumber(getPartnerCredit(partner));
          const initialMovementDebit = toNumber(partner.initial_movement_debit ?? partner.opening_movement_debit ?? partner.previous_debit ?? 0);
          const initialMovementCredit = toNumber(partner.initial_movement_credit ?? partner.opening_movement_credit ?? partner.previous_credit ?? 0);
          const closingBalance = toNumber(getClosingBalance(partner));

          return {
            id: partner.partner_id || partner.id || partner.partner_name || 'no_partner',
            partner_id: partner.partner_id || partner.id || null,
            partner_name: partner.partner_name || partner.name || 'Sans partenaire',
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
        .filter((partner) => (
          filters.show_zero ||
          partner.opening_debit !== 0 ||
          partner.opening_credit !== 0 ||
          partner.initial_movement_debit !== 0 ||
          partner.initial_movement_credit !== 0 ||
          partner.movement_debit !== 0 ||
          partner.movement_credit !== 0 ||
          partner.period_debit !== 0 ||
          partner.period_credit !== 0 ||
          partner.closing_debit !== 0 ||
          partner.closing_credit !== 0
        ))
        .sort((a, b) => String(a.partner_name).localeCompare(String(b.partner_name), 'fr'));

      const nextExpanded = {};
      results.forEach((partner) => {
        nextExpanded[partner.id] = filters.show_details && partner.lines.length > 0;
      });

      setPartners(results);
      setExpandedPartners(nextExpanded);
    } catch (err) {
      console.error('Erreur chargement balance partenaires:', err);
      setError('Impossible de charger la balance des partenaires.');
      setPartners([]);
    } finally {
      setLoading(false);
    }
  }, [activeEntity, filters]);

  useEffect(() => {
    loadPartnerOptions();
  }, [loadPartnerOptions]);

  useEffect(() => {
    loadBalance();
  }, [loadBalance]);

  const filteredPartners = useMemo(() => {
    const query = normalizeText(searchText);
    if (!query) return partners;

    return partners
      .map((partner) => {
        const partnerText = normalizeText(partner.partner_name);
        const lines = partnerText.includes(query)
          ? partner.lines
          : partner.lines.filter((line) => normalizeText([
              line.date,
              line.move_name,
              line.journal_code,
              line.account_code,
              line.label,
              line.matching_number,
            ].filter(Boolean).join(' ')).includes(query));

        if (partnerText.includes(query) || lines.length) return { ...partner, lines };
        return null;
      })
      .filter(Boolean);
  }, [partners, searchText]);

  const totals = useMemo(() => filteredPartners.reduce(
    (acc, partner) => ({
      opening_debit: acc.opening_debit + partner.opening_debit,
      opening_credit: acc.opening_credit + partner.opening_credit,
      initial_movement_debit: acc.initial_movement_debit + partner.initial_movement_debit,
      initial_movement_credit: acc.initial_movement_credit + partner.initial_movement_credit,
      movement_debit: acc.movement_debit + partner.movement_debit,
      movement_credit: acc.movement_credit + partner.movement_credit,
      period_debit: acc.period_debit + partner.period_debit,
      period_credit: acc.period_credit + partner.period_credit,
      closing_debit: acc.closing_debit + partner.closing_debit,
      closing_credit: acc.closing_credit + partner.closing_credit,
      line_count: acc.line_count + partner.line_count,
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
  ), [filteredPartners]);

  const activeFilterChips = useMemo(() => {
    const chips = [];
    if (searchText.trim()) chips.push({ key: 'search', label: searchText.trim(), className: 'bg-blue-100 text-blue-700' });
    if (filters.partner) {
      const partner = partnerOptions.find((item) => String(item.id) === String(filters.partner));
      const label = partner?.raison_sociale || partner?.display_name || partner?.name || partner?.nom || filters.partner;
      chips.push({ key: 'partner', label: `Partenaire : ${label}`, className: 'bg-purple-100 text-purple-700' });
    }
    if (filters.account_code) chips.push({ key: 'account_code', label: `Compte : ${filters.account_code}`, className: 'bg-purple-100 text-purple-700' });
    if (filters.state !== 'all') chips.push({ key: 'state', label: filters.state === 'posted' ? 'Écritures validées' : 'Brouillons', className: 'bg-gray-100 text-gray-700' });
    if (filters.show_zero) chips.push({ key: 'show_zero', label: 'Soldes nuls', className: 'bg-gray-100 text-gray-700' });
    if (filters.show_details) chips.push({ key: 'show_details', label: 'Détails ouverts', className: 'bg-gray-100 text-gray-700' });
    return chips;
  }, [filters, partnerOptions, searchText]);

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
      partner: '',
      account_code: '',
      state: 'all',
      show_zero: false,
      show_details: false,
    });
    setSearchText('');
    setShowFilters(false);
  };

  const togglePartner = (partnerId) => {
    setExpandedPartners((prev) => ({ ...prev, [partnerId]: !prev[partnerId] }));
  };

  const toggleColumn = (columnKey) => {
    setColumnVisibility((prev) => ({ ...prev, [columnKey]: !prev[columnKey] }));
  };

  const expandAll = () => {
    const nextExpanded = {};
    filteredPartners.forEach((partner) => {
      nextExpanded[partner.id] = true;
    });
    setExpandedPartners(nextExpanded);
  };

  const collapseAll = () => {
    const nextExpanded = {};
    filteredPartners.forEach((partner) => {
      nextExpanded[partner.id] = false;
    });
    setExpandedPartners(nextExpanded);
  };

  const exportCsv = (withDetails = false) => {
    const rows = [
      [
        'Partenaire',
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
      ...filteredPartners.map((partner) => [
        partner.partner_name,
        partner.initial_movement_debit,
        partner.initial_movement_credit,
        partner.opening_debit,
        partner.opening_credit,
        partner.movement_debit,
        partner.movement_credit,
        partner.period_debit,
        partner.period_credit,
        partner.closing_debit,
        partner.closing_credit,
        partner.line_count,
      ]),
      [
        'TOTAUX',
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
      rows.push(['Partenaire', 'Date', 'Piece', 'Journal', 'Compte', 'Echeance', 'Lettrage', 'Libelle', 'Debit', 'Credit', 'Solde courant']);
      filteredPartners.forEach((partner) => {
        partner.lines.forEach((line) => {
          rows.push([
            partner.partner_name,
            line.date || '',
            line.move_name || '',
            line.journal_code || '',
            line.account_code || '',
            line.date_maturity || '',
            line.matching_number || '',
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
    link.download = `balance-partenaires-${withDetails ? 'detaillee' : 'generale'}-${filters.date_from}-${filters.date_to}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  if (!activeEntity?.id) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="bg-white border border-gray-300 p-8 text-center">
          <FiUsers className="mx-auto mb-3 text-gray-400" size={34} />
          <h1 className="text-lg font-bold text-gray-900">Balance des partenaires</h1>
          <p className="mt-2 text-sm text-gray-600">Veuillez selectionner une entite.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="bg-white border border-gray-300">
        <div className="border-b border-gray-300 px-5 py-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 className="flex items-center gap-2 text-lg font-bold text-gray-900">
                <FiUsers className="text-purple-600" />
                Balance des partenaires
              </h1>
              <p className="mt-1 text-sm text-gray-600">
                Solde initial, mouvements et solde final du {formatDate(filters.date_from)} au {formatDate(filters.date_to)}
                <span className="block text-xs text-gray-500">Le solde période est calculé uniquement sur les mouvements de la période.</span>
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button type="button" onClick={loadBalance} disabled={loading} className="h-10 border border-purple-200 px-3 text-sm text-purple-700 hover:bg-purple-50 disabled:opacity-60 flex items-center gap-2">
                <FiRefreshCw size={15} className={loading ? 'animate-spin' : ''} />
                Actualiser
              </button>
              <button type="button" onClick={() => exportCsv(false)} className="h-10 border border-gray-300 px-3 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2">
                <FiDownload size={15} />
                Export
              </button>
              <button type="button" onClick={() => exportCsv(true)} className="h-10 bg-purple-600 px-3 text-sm text-white hover:bg-purple-700 flex items-center gap-2">
                <FiDownload size={15} />
                Export detaille
              </button>
              <button type="button" onClick={() => window.print()} className="h-10 border border-gray-300 px-3 text-sm text-gray-700 hover:bg-gray-50" title="Imprimer">
                <FiPrinter size={15} />
              </button>
            </div>
          </div>
        </div>

        <div className="border-b border-gray-300 px-5 py-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
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
                    <p className="mb-2 text-xs font-medium text-gray-700">Partenaire</p>
                    <select value={filters.partner} onChange={(event) => handleFilterChange('partner', event.target.value)} disabled={loadingRefs} className="h-8 w-full border border-gray-300 px-2 text-xs">
                      <option value="">Tous les partenaires</option>
                      {partnerOptions.map((partner) => <option key={partner.id} value={partner.id}>{partner.raison_sociale || partner.display_name || partner.name || partner.nom || `Partenaire ${partner.id}`}</option>)}
                    </select>
                  </div>
                  <div className="border-b border-gray-200 p-2">
                    <p className="mb-2 text-xs font-medium text-gray-700">Compte / État</p>
                    <input type="text" value={filters.account_code} onChange={(event) => handleFilterChange('account_code', event.target.value)} placeholder="Compte : 411 ou 401" className="mb-2 h-8 w-full border border-gray-300 px-2 text-xs" />
                    <select value={filters.state} onChange={(event) => handleFilterChange('state', event.target.value)} className="h-8 w-full border border-gray-300 px-2 text-xs">
                      <option value="all">Toutes les écritures</option>
                      <option value="posted">Validées</option>
                      <option value="draft">Brouillons</option>
                    </select>
                  </div>
                  <div className="border-b border-gray-200 p-2 text-xs text-gray-700">
                    <label className="flex cursor-pointer items-center gap-2 rounded px-2 py-1 hover:bg-gray-50"><input type="checkbox" checked={filters.show_zero} onChange={(event) => handleFilterChange('show_zero', event.target.checked)} /> Soldes nuls</label>
                    <label className="flex cursor-pointer items-center gap-2 rounded px-2 py-1 hover:bg-gray-50"><input type="checkbox" checked={filters.show_details} onChange={(event) => handleFilterChange('show_details', event.target.checked)} /> Détails ouverts</label>
                  </div>
                  <div className="p-2"><button type="button" onClick={resetFilters} className="w-full py-1 text-center text-xs text-red-600 hover:text-red-700">Effacer tous les filtres</button></div>
                </div>
              )}
            </div>
            <div className="flex flex-wrap gap-5 text-sm">
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
        </div>

        {error && <div className="border-b border-red-200 bg-red-50 px-5 py-3 text-sm text-red-700">{error}</div>}

        <div className="overflow-x-auto">
          <table className="w-full min-w-[1320px] border-collapse">
            <thead>
              <tr className="border-b border-gray-300 bg-gray-100 text-sm text-gray-700">
                <th rowSpan="2" className="border-r border-gray-300 px-3 py-2 text-left font-semibold">Partenaire</th>
                {columnVisibility.initialMovement && <th colSpan="2" className="border-r border-gray-300 px-3 py-2 text-center font-semibold">Mouvement initial</th>}
                {columnVisibility.opening && <th colSpan="2" className="border-r border-gray-300 px-3 py-2 text-center font-semibold">Solde initial</th>}
                {columnVisibility.movement && <th colSpan="2" className="border-r border-gray-300 px-3 py-2 text-center font-semibold">Mouvement</th>}
                {columnVisibility.period && <th colSpan="2" className="border-r border-gray-300 px-3 py-2 text-center font-semibold">Solde période</th>}
                {columnVisibility.closing && <th colSpan="2" className="border-r border-gray-300 px-3 py-2 text-center font-semibold">Solde final</th>}
                <th rowSpan="2" className="w-10 border-l border-gray-300 px-2 py-1.5 text-center">
                  <button
                    type="button"
                    className="balance-partenaires-columns-button rounded p-1 hover:bg-gray-200"
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
                <tr><td colSpan={tableColumnCount} className="px-4 py-10 text-center text-sm text-gray-500">Chargement de la balance des partenaires...</td></tr>
              ) : filteredPartners.length === 0 ? (
                <tr><td colSpan={tableColumnCount} className="px-4 py-10 text-center text-sm text-gray-500">Aucune donnee pour ces criteres.</td></tr>
              ) : (
                filteredPartners.map((partner) => {
                  const isExpanded = expandedPartners[partner.id] === true;
                  return (
                    <React.Fragment key={partner.id}>
                      <tr className="border-b border-gray-200 hover:bg-purple-50">
                        <td className="border-r border-gray-200 px-3 py-2 text-sm font-semibold text-gray-900">
                          <div className="flex items-center gap-2">
                            <button type="button" onClick={() => togglePartner(partner.id)} className="inline-flex h-7 w-7 items-center justify-center text-gray-500 hover:text-purple-700" title="Voir les mouvements">
                              {isExpanded ? <FiChevronDown size={16} /> : <FiChevronRight size={16} />}
                            </button>
                            <span className="truncate">{partner.partner_name}</span>
                            <span className="shrink-0 rounded border border-gray-200 bg-gray-50 px-2 py-0.5 text-xs font-normal text-gray-500">{partner.line_count} mvt</span>
                          </div>
                        </td>
                        {columnVisibility.initialMovement && (
                          <>
                            <td className="border-r border-gray-200 px-3 py-2 text-right text-sm"><AmountCell value={partner.initial_movement_debit} /></td>
                            <td className="border-r border-gray-200 px-3 py-2 text-right text-sm"><AmountCell value={partner.initial_movement_credit} /></td>
                          </>
                        )}
                        {columnVisibility.opening && (
                          <>
                            <td className="border-r border-gray-200 px-3 py-2 text-right text-sm"><AmountCell value={partner.opening_debit} /></td>
                            <td className="border-r border-gray-200 px-3 py-2 text-right text-sm"><AmountCell value={partner.opening_credit} /></td>
                          </>
                        )}
                        {columnVisibility.movement && (
                          <>
                            <td className="border-r border-gray-200 px-3 py-2 text-right text-sm"><AmountCell value={partner.movement_debit} /></td>
                            <td className="border-r border-gray-200 px-3 py-2 text-right text-sm"><AmountCell value={partner.movement_credit} /></td>
                          </>
                        )}
                        {columnVisibility.period && (
                          <>
                            <td className="border-r border-gray-200 px-3 py-2 text-right text-sm bg-purple-50"><AmountCell value={partner.period_debit} strong /></td>
                            <td className="border-r border-gray-200 px-3 py-2 text-right text-sm bg-purple-50"><AmountCell value={partner.period_credit} strong /></td>
                          </>
                        )}
                        {columnVisibility.closing && (
                          <>
                            <td className="border-r border-gray-200 px-3 py-2 text-right text-sm"><AmountCell value={partner.closing_debit} strong /></td>
                            <td className="border-r border-gray-200 px-3 py-2 text-right text-sm"><AmountCell value={partner.closing_credit} strong /></td>
                          </>
                        )}
                        <td className="border-l border-gray-200" />
                      </tr>

                      {isExpanded && (
                        <tr className="border-b border-gray-200 bg-gray-50">
                          <td colSpan={tableColumnCount} className="px-6 py-3">
                            {partner.lines.length === 0 ? (
                              <div className="text-sm text-gray-500">Aucune ecriture detaillee.</div>
                            ) : (
                              <div className="overflow-x-auto border border-gray-200 bg-white">
                                <table className="w-full min-w-[980px] border-collapse text-xs">
                                  <thead>
                                    <tr className="border-b border-gray-200 bg-gray-100 text-gray-600">
                                      <th className="px-3 py-2 text-left font-medium">Date</th>
                                      <th className="px-3 py-2 text-left font-medium">Piece</th>
                                      <th className="px-3 py-2 text-left font-medium">Journal</th>
                                      <th className="px-3 py-2 text-left font-medium">Compte</th>
                                      <th className="px-3 py-2 text-left font-medium">Echeance</th>
                                      <th className="px-3 py-2 text-left font-medium">Lettrage</th>
                                      <th className="px-3 py-2 text-left font-medium">Libelle</th>
                                      <th className="px-3 py-2 text-right font-medium">Debit</th>
                                      <th className="px-3 py-2 text-right font-medium">Credit</th>
                                      <th className="px-3 py-2 text-right font-medium">Solde courant</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {partner.lines.map((line, index) => (
                                      <tr key={line.id || index} className="border-b border-gray-100 hover:bg-gray-50">
                                        <td className="px-3 py-2 text-gray-700">{formatDate(line.date)}</td>
                                        <td className="px-3 py-2 font-medium text-gray-800">{line.move_name || '-'}</td>
                                        <td className="px-3 py-2 text-gray-700">{line.journal_code || '-'}</td>
                                        <td className="px-3 py-2 text-gray-700">{line.account_code || '-'}</td>
                                        <td className="px-3 py-2 text-gray-700">{formatDate(line.date_maturity)}</td>
                                        <td className="px-3 py-2 text-gray-700">{line.matching_number || '-'}</td>
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
            {filteredPartners.length > 0 && (
              <tfoot>
                <tr className="border-t border-gray-300 bg-gray-100 text-sm font-bold text-gray-900">
                  <td className="border-r border-gray-300 px-3 py-3">TOTAUX</td>
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
            {filteredPartners.length} partenaires affiches, {totals.line_count} mouvements
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
            id="balance-partenaires-columns-menu"
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
