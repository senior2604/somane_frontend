import React, { useCallback, useEffect, useMemo, useState } from 'react';
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
  FiSearch,
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
    { key: 'movement', label: 'Mouvement' },
    { key: 'opening', label: 'Solde initial' },
    { key: 'period', label: 'Solde période' },
    { key: 'closing', label: 'Solde final' },
  ];
  const tableColumnCount = 1 + columnGroups.filter((column) => columnVisibility[column.key]).length * 2;

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
        'Solde initial debit',
        'Solde initial credit',
        'Mouvement initial debit',
        'Mouvement initial credit',
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
        partner.opening_debit,
        partner.opening_credit,
        partner.initial_movement_debit,
        partner.initial_movement_credit,
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
        totals.opening_debit,
        totals.opening_credit,
        totals.initial_movement_debit,
        totals.initial_movement_credit,
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
              <button type="button" onClick={() => setShowFilters((value) => !value)} className="h-10 border border-gray-300 px-3 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2">
                <FiFilter size={15} />
                Filtres
              </button>
              <div className="relative">
                <button type="button" onClick={() => setShowColumnMenu((value) => !value)} className="h-10 border border-gray-300 px-3 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2" title="Afficher les colonnes">
                  <FiMoreHorizontal size={17} />
                  Colonnes
                </button>
                {showColumnMenu && (
                  <div className="absolute right-0 top-11 z-30 w-60 border border-gray-200 bg-white p-2 shadow-lg">
                    {columnGroups.map((column) => (
                      <label key={column.key} className="flex cursor-pointer items-center gap-2 px-2 py-2 text-sm text-gray-700 hover:bg-gray-50">
                        <input type="checkbox" checked={columnVisibility[column.key]} onChange={() => toggleColumn(column.key)} />
                        {column.label}
                      </label>
                    ))}
                  </div>
                )}
              </div>
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

        {showFilters && (
          <div className="border-b border-gray-300 bg-gray-50 px-5 py-4">
            <div className="grid gap-3 md:grid-cols-6">
              <label className="text-xs font-medium text-gray-700">
                Date debut
                <input type="date" value={filters.date_from} onChange={(event) => handleFilterChange('date_from', event.target.value)} className="mt-1 h-10 w-full border border-gray-300 bg-white px-3 text-sm" />
              </label>
              <label className="text-xs font-medium text-gray-700">
                Date fin
                <input type="date" value={filters.date_to} onChange={(event) => handleFilterChange('date_to', event.target.value)} className="mt-1 h-10 w-full border border-gray-300 bg-white px-3 text-sm" />
              </label>
              <label className="text-xs font-medium text-gray-700">
                Partenaire
                <select value={filters.partner} onChange={(event) => handleFilterChange('partner', event.target.value)} disabled={loadingRefs} className="mt-1 h-10 w-full border border-gray-300 bg-white px-3 text-sm">
                  <option value="">Tous</option>
                  {partnerOptions.map((partner) => (
                    <option key={partner.id} value={partner.id}>
                      {partner.raison_sociale || partner.display_name || partner.name || partner.nom || `Partenaire ${partner.id}`}
                    </option>
                  ))}
                </select>
              </label>
              <label className="text-xs font-medium text-gray-700">
                Compte
                <input type="text" value={filters.account_code} onChange={(event) => handleFilterChange('account_code', event.target.value)} placeholder="Ex: 411 ou 401" className="mt-1 h-10 w-full border border-gray-300 bg-white px-3 text-sm" />
              </label>
              <label className="text-xs font-medium text-gray-700">
                Etat
                <select value={filters.state} onChange={(event) => handleFilterChange('state', event.target.value)} className="mt-1 h-10 w-full border border-gray-300 bg-white px-3 text-sm">
                  <option value="all">Tous</option>
                  <option value="posted">Validees</option>
                  <option value="draft">Brouillons</option>
                </select>
              </label>
              <div className="flex items-end gap-2">
                <label className="flex h-10 items-center gap-2 text-sm text-gray-700">
                  <input type="checkbox" checked={filters.show_zero} onChange={(event) => handleFilterChange('show_zero', event.target.checked)} />
                  Soldes nuls
                </label>
                <button type="button" onClick={resetFilters} className="h-10 border border-gray-300 px-3 text-sm text-gray-700 hover:bg-white" title="Reinitialiser">
                  <FiX size={15} />
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="border-b border-gray-300 px-5 py-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <label className="relative w-full max-w-md">
              <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
              <input type="text" value={searchText} onChange={(event) => setSearchText(event.target.value)} placeholder="Rechercher partenaire, piece, compte..." className="h-10 w-full border border-gray-300 pl-10 pr-3 text-sm" />
            </label>
            <div className="flex flex-wrap gap-5 text-sm">
              <span>Initial D <strong>{formatAmount(totals.opening_debit)}</strong></span>
              <span>Initial C <strong>{formatAmount(totals.opening_credit)}</strong></span>
              <span>Mvt initial D <strong>{formatAmount(totals.initial_movement_debit)}</strong></span>
              <span>Mvt initial C <strong>{formatAmount(totals.initial_movement_credit)}</strong></span>
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
                {columnVisibility.movement && <th colSpan="2" className="border-r border-gray-300 px-3 py-2 text-center font-semibold">Mouvement</th>}
                {columnVisibility.opening && <th colSpan="2" className="border-r border-gray-300 px-3 py-2 text-center font-semibold">Solde initial</th>}
                {columnVisibility.period && <th colSpan="2" className="border-r border-gray-300 px-3 py-2 text-center font-semibold">Solde période</th>}
                {columnVisibility.closing && <th colSpan="2" className="border-r border-gray-300 px-3 py-2 text-center font-semibold">Solde final</th>}
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
                        {columnVisibility.movement && (
                          <>
                            <td className="border-r border-gray-200 px-3 py-2 text-right text-sm"><AmountCell value={partner.movement_debit} /></td>
                            <td className="border-r border-gray-200 px-3 py-2 text-right text-sm"><AmountCell value={partner.movement_credit} /></td>
                          </>
                        )}
                        {columnVisibility.opening && (
                          <>
                            <td className="border-r border-gray-200 px-3 py-2 text-right text-sm"><AmountCell value={partner.opening_debit} /></td>
                            <td className="border-r border-gray-200 px-3 py-2 text-right text-sm"><AmountCell value={partner.opening_credit} /></td>
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
                  {columnVisibility.movement && (
                    <>
                      <td className="border-r border-gray-300 px-3 py-3 text-right">{formatAmount(totals.movement_debit)}</td>
                      <td className="border-r border-gray-300 px-3 py-3 text-right">{formatAmount(totals.movement_credit)}</td>
                    </>
                  )}
                  {columnVisibility.opening && (
                    <>
                      <td className="border-r border-gray-300 px-3 py-3 text-right">{formatAmount(totals.opening_debit)}</td>
                      <td className="border-r border-gray-300 px-3 py-3 text-right">{formatAmount(totals.opening_credit)}</td>
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
      </div>
    </div>
  );
}
