import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  FiCalendar,
  FiChevronDown,
  FiChevronRight,
  FiChevronUp,
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

const todayIso = () => new Date().toISOString().slice(0, 10);
const getYearStart = () => `${new Date().getFullYear()}-01-01`;

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

const daysBetween = (fromDate, toDate) => {
  if (!fromDate || !toDate) return 0;
  const from = new Date(fromDate);
  const to = new Date(toDate);
  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) return 0;
  return Math.floor((to - from) / 86400000);
};

const getLineAmount = (line, mode) => {
  const debit = toNumber(line.debit);
  const credit = toNumber(line.credit);
  if (mode === 'suppliers') return Math.max(credit - debit, 0);
  if (mode === 'customers') return Math.max(debit - credit, 0);
  return Math.abs(debit - credit);
};

const getAgingThresholds = (first, second, third) => {
  const threshold1 = Math.max(1, Math.floor(toNumber(first) || 30));
  const threshold2 = Math.max(threshold1 + 1, Math.floor(toNumber(second) || 60));
  const threshold3 = Math.max(threshold2 + 1, Math.floor(toNumber(third) || 90));
  return [threshold1, threshold2, threshold3];
};

const getBucketKey = (dueDate, asOfDate, thresholds) => {
  const [threshold1, threshold2, threshold3] = thresholds;
  const delay = daysBetween(dueDate || asOfDate, asOfDate);
  if (delay <= 0) return 'not_due';
  if (delay <= threshold1) return 'd0_30';
  if (delay <= threshold2) return 'd31_60';
  if (delay <= threshold3) return 'd61_90';
  return 'd90_plus';
};

const getBucketLabels = ([threshold1, threshold2, threshold3]) => ({
  not_due: 'Non echu',
  d0_30: `0-${threshold1}`,
  d31_60: `${threshold1 + 1}-${threshold2}`,
  d61_90: `${threshold2 + 1}-${threshold3}`,
  d90_plus: `+${threshold3}`,
});

const emptyBuckets = () => ({
  not_due: 0,
  d0_30: 0,
  d31_60: 0,
  d61_90: 0,
  d90_plus: 0,
});

const AmountCell = ({ value, strong = false, danger = false }) => {
  const amount = toNumber(value);
  return (
    <span className={`${amount === 0 ? 'text-gray-300' : danger ? 'text-red-600' : 'text-gray-900'} ${strong ? 'font-semibold' : ''}`}>
      {formatAmount(amount)}
    </span>
  );
};

export default function BalanceAgee() {
  const { activeEntity } = useEntity();
  const filterMenuRef = useRef(null);
  const actionsMenuRef = useRef(null);

  const [filters, setFilters] = useState({
    date_from: getYearStart(),
    as_of_date: todayIso(),
    type: 'customers',
    partner: '',
    state: 'all',
    aging_threshold_1: 30,
    aging_threshold_2: 60,
    aging_threshold_3: 90,
    hide_zero: true,
    show_details: false,
  });
  const [partners, setPartners] = useState([]);
  const [partnerOptions, setPartnerOptions] = useState([]);
  const [expandedPartners, setExpandedPartners] = useState({});
  const [searchText, setSearchText] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingRefs, setLoadingRefs] = useState(false);
  const [error, setError] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [showActionsMenu, setShowActionsMenu] = useState(false);
  const [showColumnsMenu, setShowColumnsMenu] = useState(false);
  const [columnsMenuPosition, setColumnsMenuPosition] = useState({ top: 0, left: 0 });
  const [visibleColumns, setVisibleColumns] = useState({
    partner: true,
    not_due: true,
    d0_30: true,
    d31_60: true,
    d61_90: true,
    d90_plus: true,
    total: true,
    line_count: true,
  });

  const agingThresholds = useMemo(
    () => getAgingThresholds(filters.aging_threshold_1, filters.aging_threshold_2, filters.aging_threshold_3),
    [filters.aging_threshold_1, filters.aging_threshold_2, filters.aging_threshold_3]
  );
  const bucketLabels = useMemo(() => getBucketLabels(agingThresholds), [agingThresholds]);
  const columns = useMemo(() => [
    { id: 'partner', label: 'Partenaire', align: 'left', locked: true },
    { id: 'not_due', label: bucketLabels.not_due, align: 'right' },
    { id: 'd0_30', label: bucketLabels.d0_30, align: 'right' },
    { id: 'd31_60', label: bucketLabels.d31_60, align: 'right' },
    { id: 'd61_90', label: bucketLabels.d61_90, align: 'right' },
    { id: 'd90_plus', label: bucketLabels.d90_plus, align: 'right' },
    { id: 'total', label: 'Total', align: 'right' },
    { id: 'line_count', label: 'Lignes', align: 'center' },
  ], [bucketLabels]);
  const defaultVisibleColumns = useMemo(() => ({
    partner: true,
    not_due: true,
    d0_30: true,
    d31_60: true,
    d61_90: true,
    d90_plus: true,
    total: true,
    line_count: true,
  }), []);
  const visibleColumnCount = useMemo(
    () => columns.filter((column) => visibleColumns[column.id]).length,
    [columns, visibleColumns]
  );

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (filterMenuRef.current && !filterMenuRef.current.contains(event.target)) setShowFilters(false);
      if (actionsMenuRef.current && !actionsMenuRef.current.contains(event.target)) setShowActionsMenu(false);
      if (
        showColumnsMenu &&
        !event.target.closest('#balance-agee-columns-menu') &&
        !event.target.closest('.balance-agee-columns-button')
      ) {
        setShowColumnsMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showColumnsMenu]);

  const accountCode = useMemo(() => {
    if (filters.type === 'customers') return '411';
    if (filters.type === 'suppliers') return '401';
    return '';
  }, [filters.type]);

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

  const loadBalanceAgee = useCallback(async () => {
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
        date_to: filters.as_of_date,
        state: filters.state,
      };
      if (filters.partner) params.partner = filters.partner;
      if (accountCode) params.account_code = accountCode;

      const response = await apiClient.get('/compta/move-lines/grand-livre-partenaires/', { params });
      const data = response?.data || response;
      const results = normalizeList(data?.results || data)
        .map((partner) => {
          const buckets = emptyBuckets();
          const detailLines = normalizeList(partner.lines)
            .map((line) => {
              const amount = getLineAmount(line, filters.type);
              const dueDate = line.date_maturity || line.invoice_date || line.date;
              const bucket = getBucketKey(dueDate, filters.as_of_date, agingThresholds);
              const delay = Math.max(daysBetween(dueDate, filters.as_of_date), 0);

              buckets[bucket] += amount;

              return {
                ...line,
                due_date: dueDate,
                aging_bucket: bucket,
                aging_label: bucketLabels[bucket],
                delay,
                aging_amount: amount,
              };
            })
            .filter((line) => line.aging_amount !== 0);

          const total = Object.values(buckets).reduce((sum, value) => sum + value, 0);

          return {
            id: partner.partner_id || partner.id || partner.partner_name || 'no_partner',
            partner_id: partner.partner_id || partner.id || null,
            partner_name: partner.partner_name || partner.name || 'Sans partenaire',
            ...buckets,
            total,
            line_count: detailLines.length,
            lines: detailLines,
          };
        })
        .filter((partner) => !filters.hide_zero || partner.total !== 0)
        .sort((a, b) => String(a.partner_name).localeCompare(String(b.partner_name), 'fr'));

      const nextExpanded = {};
      results.forEach((partner) => {
        nextExpanded[partner.id] = filters.show_details && partner.lines.length > 0;
      });

      setPartners(results);
      setExpandedPartners(nextExpanded);
    } catch (err) {
      console.error('Erreur chargement balance agee:', err);
      setError('Impossible de charger la balance agee.');
      setPartners([]);
    } finally {
      setLoading(false);
    }
  }, [accountCode, activeEntity, agingThresholds, bucketLabels, filters]);

  useEffect(() => {
    loadPartnerOptions();
  }, [loadPartnerOptions]);

  useEffect(() => {
    loadBalanceAgee();
  }, [loadBalanceAgee]);

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
              line.due_date,
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
      not_due: acc.not_due + partner.not_due,
      d0_30: acc.d0_30 + partner.d0_30,
      d31_60: acc.d31_60 + partner.d31_60,
      d61_90: acc.d61_90 + partner.d61_90,
      d90_plus: acc.d90_plus + partner.d90_plus,
      total: acc.total + partner.total,
      line_count: acc.line_count + partner.line_count,
    }),
    { ...emptyBuckets(), total: 0, line_count: 0 }
  ), [filteredPartners]);

  const activeFilterChips = useMemo(() => {
    const chips = [];
    if (searchText) chips.push({ key: 'search', label: `Recherche : ${searchText}`, className: 'bg-purple-100 text-purple-700' });
    chips.push({ key: 'aging_thresholds', label: `Tranches : ${agingThresholds.join(' / ')} jours`, className: 'bg-purple-100 text-purple-700' });
    if (filters.type !== 'all') chips.push({ key: 'type', label: filters.type === 'customers' ? 'Clients' : 'Fournisseurs', className: 'bg-gray-100 text-gray-700' });
    if (filters.partner) {
      const partner = partnerOptions.find((item) => String(item.id) === String(filters.partner));
      chips.push({ key: 'partner', label: partner?.raison_sociale || partner?.display_name || partner?.name || partner?.nom || `Partenaire ${filters.partner}`, className: 'bg-gray-100 text-gray-700' });
    }
    if (filters.state !== 'all') chips.push({ key: 'state', label: filters.state === 'posted' ? 'Validées' : 'Brouillons', className: 'bg-gray-100 text-gray-700' });
    if (!filters.hide_zero) chips.push({ key: 'hide_zero', label: 'Afficher les zéros', className: 'bg-gray-100 text-gray-700' });
    if (filters.show_details) chips.push({ key: 'show_details', label: 'Détails ouverts', className: 'bg-gray-100 text-gray-700' });
    return chips;
  }, [agingThresholds, filters, partnerOptions, searchText]);

  const removeFilter = (key) => {
    if (key === 'search') setSearchText('');
    else if (key === 'aging_thresholds') setFilters((prev) => ({ ...prev, aging_threshold_1: 30, aging_threshold_2: 60, aging_threshold_3: 90 }));
    else if (key === 'type') setFilters((prev) => ({ ...prev, type: 'all' }));
    else if (key === 'state') setFilters((prev) => ({ ...prev, state: 'all' }));
    else if (key === 'hide_zero') setFilters((prev) => ({ ...prev, hide_zero: true }));
    else if (key === 'show_details') setFilters((prev) => ({ ...prev, show_details: false }));
    else setFilters((prev) => ({ ...prev, [key]: '' }));
  };

  const handleFilterChange = (name, value) => {
    setFilters((prev) => ({ ...prev, [name]: value }));
  };

  const resetFilters = () => {
    setFilters({
      date_from: getYearStart(),
      as_of_date: todayIso(),
      type: 'customers',
      partner: '',
      state: 'all',
      aging_threshold_1: 30,
      aging_threshold_2: 60,
      aging_threshold_3: 90,
      hide_zero: true,
      show_details: false,
    });
    setSearchText('');
    setShowFilters(false);
  };

  const togglePartner = (partnerId) => {
    setExpandedPartners((prev) => ({ ...prev, [partnerId]: !prev[partnerId] }));
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
      ['Partenaire', bucketLabels.not_due, bucketLabels.d0_30, bucketLabels.d31_60, bucketLabels.d61_90, bucketLabels.d90_plus, 'Total', 'Nb lignes'],
      ...filteredPartners.map((partner) => [
        partner.partner_name,
        partner.not_due,
        partner.d0_30,
        partner.d31_60,
        partner.d61_90,
        partner.d90_plus,
        partner.total,
        partner.line_count,
      ]),
      ['TOTAUX', totals.not_due, totals.d0_30, totals.d31_60, totals.d61_90, totals.d90_plus, totals.total, totals.line_count],
    ];

    if (withDetails) {
      rows.push([]);
      rows.push(['Details']);
      rows.push(['Partenaire', 'Date', 'Echeance', 'Retard', 'Tranche', 'Piece', 'Journal', 'Compte', 'Lettrage', 'Libelle', 'Montant']);
      filteredPartners.forEach((partner) => {
        partner.lines.forEach((line) => {
          rows.push([
            partner.partner_name,
            line.date || '',
            line.due_date || '',
            line.delay,
            line.aging_label,
            line.move_name || '',
            line.journal_code || '',
            line.account_code || '',
            line.matching_number || '',
            line.label || line.name || '',
            line.aging_amount,
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
    link.download = `balance-agee-${filters.type}-${filters.as_of_date}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  if (!activeEntity?.id) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="bg-white border border-gray-300 p-8 text-center">
          <FiCalendar className="mx-auto mb-3 text-gray-400" size={34} />
          <h1 className="text-lg font-bold text-gray-900">Balance agee</h1>
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
                onClick={loadBalanceAgee}
                title="Actualiser la balance âgée"
              >
                Balance agee
              </h1>
              <div className="relative" ref={actionsMenuRef}>
                <button type="button" onClick={() => setShowActionsMenu((value) => !value)} className="flex h-8 w-8 items-center justify-center rounded-full border border-gray-300 text-gray-700 transition-all duration-200 hover:scale-110 hover:bg-gray-50 hover:shadow-md active:scale-90" title="Menu des actions">
                  <FiSettings size={14} />
                </button>
                {showActionsMenu && (
                  <div onMouseLeave={() => setShowActionsMenu(false)} className="absolute left-0 z-50 mt-1 w-48 rounded border border-gray-300 bg-white shadow-lg">
                    <button type="button" onClick={() => { setShowActionsMenu(false); loadBalanceAgee(); }} className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs hover:bg-gray-50"><FiRefreshCw size={12} className={loading ? 'animate-spin' : ''} /> Actualiser</button>
                    <button type="button" onClick={() => { expandAll(); setShowActionsMenu(false); }} className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs hover:bg-gray-50"><FiChevronDown size={12} /> Tout ouvrir</button>
                    <button type="button" onClick={() => { collapseAll(); setShowActionsMenu(false); }} className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs hover:bg-gray-50"><FiChevronRight size={12} /> Tout fermer</button>
                    <button type="button" onClick={() => { setShowActionsMenu(false); setTimeout(() => window.print(), 0); }} className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs hover:bg-gray-50"><FiPrinter size={12} /> Imprimer</button>
                    <button type="button" onClick={() => { exportCsv(false); setShowActionsMenu(false); }} disabled={!filteredPartners.length} className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs hover:bg-gray-50 disabled:opacity-50"><FiDownload size={12} /> Export CSV</button>
                    <button type="button" onClick={() => { exportCsv(true); setShowActionsMenu(false); }} disabled={!filteredPartners.length} className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs hover:bg-gray-50 disabled:opacity-50"><FiDownload size={12} /> Export détaillé</button>
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
                        <input type="date" value={filters.as_of_date} onChange={(event) => handleFilterChange('as_of_date', event.target.value)} className="h-8 border border-gray-300 px-2 text-xs" />
                      </div>
                    </div>
                    <div className="border-b border-gray-200 p-2">
                      <p className="mb-2 text-xs font-medium text-gray-700">Seuils des tranches (jours)</p>
                      <div className="grid grid-cols-3 gap-2">
                        <input type="number" min="1" step="1" value={filters.aging_threshold_1} onChange={(event) => handleFilterChange('aging_threshold_1', event.target.value)} className="h-8 w-full border border-gray-300 px-2 text-xs" title="Premier seuil" />
                        <input type="number" min="2" step="1" value={filters.aging_threshold_2} onChange={(event) => handleFilterChange('aging_threshold_2', event.target.value)} className="h-8 w-full border border-gray-300 px-2 text-xs" title="Deuxième seuil" />
                        <input type="number" min="3" step="1" value={filters.aging_threshold_3} onChange={(event) => handleFilterChange('aging_threshold_3', event.target.value)} className="h-8 w-full border border-gray-300 px-2 text-xs" title="Troisième seuil" />
                      </div>
                      <p className="mt-1 text-[11px] text-gray-500">Tranches actuelles : {bucketLabels.d0_30}, {bucketLabels.d31_60}, {bucketLabels.d61_90}, {bucketLabels.d90_plus}</p>
                    </div>
                    <div className="border-b border-gray-200 p-2">
                      <p className="mb-2 text-xs font-medium text-gray-700">Type / Partenaire</p>
                      <select value={filters.type} onChange={(event) => handleFilterChange('type', event.target.value)} className="mb-2 h-8 w-full border border-gray-300 px-2 text-xs">
                        <option value="customers">Clients</option><option value="suppliers">Fournisseurs</option><option value="all">Tous</option>
                      </select>
                      <select value={filters.partner} onChange={(event) => handleFilterChange('partner', event.target.value)} disabled={loadingRefs} className="h-8 w-full border border-gray-300 px-2 text-xs">
                        <option value="">Tous les partenaires</option>
                        {partnerOptions.map((partner) => <option key={partner.id} value={partner.id}>{partner.raison_sociale || partner.display_name || partner.name || partner.nom || `Partenaire ${partner.id}`}</option>)}
                      </select>
                    </div>
                    <div className="border-b border-gray-200 p-2">
                      <p className="mb-2 text-xs font-medium text-gray-700">État</p>
                      <select value={filters.state} onChange={(event) => handleFilterChange('state', event.target.value)} className="h-8 w-full border border-gray-300 px-2 text-xs">
                        <option value="all">Toutes les écritures</option><option value="posted">Validées</option><option value="draft">Brouillons</option>
                      </select>
                    </div>
                    <div className="border-b border-gray-200 p-2 text-xs text-gray-700">
                      <label className="flex cursor-pointer items-center gap-2 rounded px-2 py-1 hover:bg-gray-50"><input type="checkbox" checked={filters.hide_zero} onChange={(event) => handleFilterChange('hide_zero', event.target.checked)} /> Masquer les zéros</label>
                      <label className="flex cursor-pointer items-center gap-2 rounded px-2 py-1 hover:bg-gray-50"><input type="checkbox" checked={filters.show_details} onChange={(event) => handleFilterChange('show_details', event.target.checked)} /> Détails ouverts</label>
                    </div>
                    <div className="p-2"><button type="button" onClick={resetFilters} className="w-full py-1 text-center text-xs text-red-600 hover:text-red-700">Effacer tous les filtres</button></div>
                  </div>
                )}
              </div>
            </div>

            <div className="shrink-0 text-right text-xs text-gray-500">
              <span className="block">Analyse au</span>
              <span className="block">{formatDate(filters.as_of_date)}</span>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-300 bg-gray-50 px-4 py-2">
          <div className="flex flex-wrap items-center gap-4 text-xs text-gray-600">
            <span>{filteredPartners.length} partenaire(s)</span>
            <span>{totals.line_count} ligne(s)</span>
          </div>
          <div className="flex flex-wrap gap-4 text-xs">
            <span>{bucketLabels.not_due} <strong>{formatAmount(totals.not_due)}</strong></span>
            <span>{bucketLabels.d0_30} <strong>{formatAmount(totals.d0_30)}</strong></span>
            <span>{bucketLabels.d31_60} <strong>{formatAmount(totals.d31_60)}</strong></span>
            <span>{bucketLabels.d61_90} <strong>{formatAmount(totals.d61_90)}</strong></span>
            <span>{bucketLabels.d90_plus} <strong className="text-red-600">{formatAmount(totals.d90_plus)}</strong></span>
            <span>Total <strong>{formatAmount(totals.total)}</strong></span>
          </div>
        </div>

        {error && <div className="border-b border-red-200 bg-red-50 px-5 py-3 text-sm text-red-700">{error}</div>}

        <div className="overflow-x-auto">
          <table className="w-full min-w-[1100px] border-collapse">
            <thead>
              <tr className="border-b border-gray-300 bg-gray-100 text-sm text-gray-700">
                {columns.map((column) => visibleColumns[column.id] && (
                  <th key={column.id} className={`border-r border-gray-300 px-3 py-2 font-semibold ${column.align === 'right' ? 'text-right' : column.align === 'center' ? 'text-center' : 'text-left'}`}>
                    {column.label}
                  </th>
                ))}
                <th className="w-10 border-l border-gray-300 px-2 py-1.5 text-center">
                  <button
                    type="button"
                    className="balance-agee-columns-button rounded p-1 hover:bg-gray-200"
                    title="Choisir les colonnes à afficher"
                    onClick={(event) => {
                      event.stopPropagation();
                      const rect = event.currentTarget.getBoundingClientRect();
                      setColumnsMenuPosition({ top: rect.bottom + 5, left: Math.max(8, rect.right - 220) });
                      setShowColumnsMenu((value) => !value);
                    }}
                  >
                    <FiMoreHorizontal size={14} className="mx-auto text-gray-500" />
                  </button>
                </th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={visibleColumnCount + 1} className="px-4 py-10 text-center text-sm text-gray-500">Chargement de la balance agee...</td></tr>
              ) : filteredPartners.length === 0 ? (
                <tr><td colSpan={visibleColumnCount + 1} className="px-4 py-10 text-center text-sm text-gray-500">Aucune donnee pour ces criteres.</td></tr>
              ) : (
                filteredPartners.map((partner) => {
                  const isExpanded = expandedPartners[partner.id] === true;
                  return (
                    <React.Fragment key={partner.id}>
                      <tr className="border-b border-gray-200 hover:bg-purple-50">
                        {visibleColumns.partner && <td className="border-r border-gray-200 px-3 py-2 text-sm font-semibold text-gray-900">{partner.partner_name}</td>}
                        {visibleColumns.not_due && <td className="border-r border-gray-200 px-3 py-2 text-right text-sm"><AmountCell value={partner.not_due} /></td>}
                        {visibleColumns.d0_30 && <td className="border-r border-gray-200 px-3 py-2 text-right text-sm"><AmountCell value={partner.d0_30} /></td>}
                        {visibleColumns.d31_60 && <td className="border-r border-gray-200 px-3 py-2 text-right text-sm"><AmountCell value={partner.d31_60} /></td>}
                        {visibleColumns.d61_90 && <td className="border-r border-gray-200 px-3 py-2 text-right text-sm"><AmountCell value={partner.d61_90} /></td>}
                        {visibleColumns.d90_plus && <td className="border-r border-gray-200 px-3 py-2 text-right text-sm"><AmountCell value={partner.d90_plus} danger /></td>}
                        {visibleColumns.total && <td className="border-r border-gray-200 px-3 py-2 text-right text-sm"><AmountCell value={partner.total} strong /></td>}
                        {visibleColumns.line_count && <td className="border-r border-gray-200 px-3 py-2 text-center text-sm text-gray-700">{partner.line_count}</td>}
                        <td className="px-3 py-2 text-center">
                          <button type="button" onClick={() => togglePartner(partner.id)} className="inline-flex h-8 w-8 items-center justify-center text-gray-600 hover:text-purple-700" title="Voir les lignes">
                            {isExpanded ? <FiChevronUp size={16} /> : <FiChevronDown size={16} />}
                          </button>
                        </td>
                      </tr>

                      {isExpanded && (
                        <tr className="border-b border-gray-200 bg-gray-50">
                          <td colSpan={visibleColumnCount + 1} className="px-6 py-3">
                            {partner.lines.length === 0 ? (
                              <div className="text-sm text-gray-500">Aucune ligne detaillee.</div>
                            ) : (
                              <div className="overflow-x-auto border border-gray-200 bg-white">
                                <table className="w-full min-w-[980px] border-collapse text-xs">
                                  <thead>
                                    <tr className="border-b border-gray-200 bg-gray-100 text-gray-600">
                                      <th className="px-3 py-2 text-left font-medium">Date</th>
                                      <th className="px-3 py-2 text-left font-medium">Echeance</th>
                                      <th className="px-3 py-2 text-right font-medium">Retard</th>
                                      <th className="px-3 py-2 text-left font-medium">Tranche</th>
                                      <th className="px-3 py-2 text-left font-medium">Piece</th>
                                      <th className="px-3 py-2 text-left font-medium">Journal</th>
                                      <th className="px-3 py-2 text-left font-medium">Compte</th>
                                      <th className="px-3 py-2 text-left font-medium">Lettrage</th>
                                      <th className="px-3 py-2 text-left font-medium">Libelle</th>
                                      <th className="px-3 py-2 text-right font-medium">Montant</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {partner.lines.map((line, index) => (
                                      <tr key={line.id || index} className="border-b border-gray-100 hover:bg-gray-50">
                                        <td className="px-3 py-2 text-gray-700">{formatDate(line.date)}</td>
                                        <td className="px-3 py-2 text-gray-700">{formatDate(line.due_date)}</td>
                                        <td className="px-3 py-2 text-right text-gray-700">{line.delay}</td>
                                        <td className="px-3 py-2 text-gray-700">{line.aging_label}</td>
                                        <td className="px-3 py-2 font-medium text-gray-800">{line.move_name || '-'}</td>
                                        <td className="px-3 py-2 text-gray-700">{line.journal_code || '-'}</td>
                                        <td className="px-3 py-2 text-gray-700">{line.account_code || '-'}</td>
                                        <td className="px-3 py-2 text-gray-700">{line.matching_number || '-'}</td>
                                        <td className="px-3 py-2 text-gray-700">{line.label || line.name || '-'}</td>
                                        <td className="px-3 py-2 text-right"><AmountCell value={line.aging_amount} /></td>
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
                  {visibleColumns.partner && <td className="border-r border-gray-300 px-3 py-3">TOTAUX</td>}
                  {visibleColumns.not_due && <td className="border-r border-gray-300 px-3 py-3 text-right">{formatAmount(totals.not_due)}</td>}
                  {visibleColumns.d0_30 && <td className="border-r border-gray-300 px-3 py-3 text-right">{formatAmount(totals.d0_30)}</td>}
                  {visibleColumns.d31_60 && <td className="border-r border-gray-300 px-3 py-3 text-right">{formatAmount(totals.d31_60)}</td>}
                  {visibleColumns.d61_90 && <td className="border-r border-gray-300 px-3 py-3 text-right">{formatAmount(totals.d61_90)}</td>}
                  {visibleColumns.d90_plus && <td className="border-r border-gray-300 px-3 py-3 text-right text-red-600">{formatAmount(totals.d90_plus)}</td>}
                  {visibleColumns.total && <td className="border-r border-gray-300 px-3 py-3 text-right">{formatAmount(totals.total)}</td>}
                  {visibleColumns.line_count && <td className="border-r border-gray-300 px-3 py-3 text-center">{totals.line_count}</td>}
                  <td />
                </tr>
              </tfoot>
            )}
          </table>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-gray-300 bg-gray-50 px-5 py-3 text-sm text-gray-600">
          <span className="flex items-center gap-2">
            <FiFileText size={15} />
            {filteredPartners.length} partenaires affiches, {totals.line_count} lignes
          </span>
          <span className="flex items-center gap-2">
            <FiCalendar size={15} />
            Analyse au {formatDate(filters.as_of_date)}
          </span>
          <span className="flex items-center gap-2">
            <button type="button" onClick={expandAll} className="text-purple-700 hover:text-purple-900">Ouvrir tous les details</button>
            <span className="text-gray-300">|</span>
            <button type="button" onClick={collapseAll} className="text-purple-700 hover:text-purple-900">Fermer</button>
          </span>
        </div>

        {showColumnsMenu && (
          <div
            id="balance-agee-columns-menu"
            onMouseLeave={() => setShowColumnsMenu(false)}
            className="fixed z-50 rounded border border-gray-300 bg-white shadow-lg"
            style={{ top: columnsMenuPosition.top, left: columnsMenuPosition.left, width: '220px' }}
          >
            <div className="border-b border-gray-200 p-2">
              <p className="mb-2 text-xs font-medium text-gray-700">Colonnes à afficher</p>
              {columns.map((column) => (
                <label key={column.id} className="flex cursor-pointer items-center gap-2 rounded px-2 py-1 hover:bg-gray-50">
                  <input
                    type="checkbox"
                    checked={visibleColumns[column.id]}
                    disabled={column.locked}
                    onChange={() => setVisibleColumns((prev) => ({ ...prev, [column.id]: !prev[column.id] }))}
                    className="h-3.5 w-3.5 cursor-pointer disabled:cursor-not-allowed"
                  />
                  <span className={`text-xs ${column.locked ? 'text-gray-400' : 'text-gray-700'}`}>{column.label}</span>
                </label>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-2 p-2">
              <button type="button" onClick={() => setVisibleColumns(Object.fromEntries(columns.map((column) => [column.id, true])))} className="py-1 text-center text-xs text-purple-600 hover:text-purple-700">Tout afficher</button>
              <button type="button" onClick={() => setVisibleColumns(defaultVisibleColumns)} className="py-1 text-center text-xs text-gray-500 hover:text-gray-600">Défaut</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}