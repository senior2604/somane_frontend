import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  FiChevronDown,
  FiChevronRight,
  FiDownload,
  FiFileText,
  FiFilter,
  FiMoreHorizontal,
  FiMoreVertical,
  FiPrinter,
  FiRefreshCw,
  FiSettings,
  FiX,
} from 'react-icons/fi';
import { useNavigate } from 'react-router-dom';
import { apiClient } from '../../../../services/apiClient';
import { useEntity } from '../../../../context/EntityContext';

const getYearStart = () => `${new Date().getFullYear()}-01-01`;
const getYearEnd = () => `${new Date().getFullYear()}-12-31`;
const pad2 = (value) => String(value).padStart(2, '0');
const toISODate = (date) => `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
const parseISODate = (value) => {
  const parsed = value ? new Date(`${value}T00:00:00`) : new Date();
  return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
};

const normalizeList = (value) => {
  if (Array.isArray(value)) return value;
  if (Array.isArray(value?.results)) return value.results;
  if (Array.isArray(value?.data)) return value.data;
  return [];
};

const toNumber = (value) => {
  const number = Number(value || 0);
  return Number.isFinite(number) ? number : 0;
};

const formatAmount = (value) => {
  const rounded = Math.round(toNumber(value));
  return `${rounded.toLocaleString('fr-FR')} CFA`;
};

const formatDate = (value) => {
  if (!value) return '';
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

const getPartnerBalance = (partner) => (
  partner.balance ??
  partner.closing_balance ??
  partner.current_balance ??
  (toNumber(getPartnerDebit(partner)) - toNumber(getPartnerCredit(partner)))
);

const getPartnerLabel = (partner) => (
  partner?.raison_sociale ||
  partner?.display_name ||
  partner?.name ||
  partner?.nom ||
  (partner?.id ? `Partenaire ${partner.id}` : '')
);

const ACCOUNT_NATURES = [
  {
    value: 'client',
    label: 'Client',
    prefixes: ['411'],
    keywords: ['client', 'customer', 'receivable'],
  },
  {
    value: 'fournisseur',
    label: 'Fournisseur',
    prefixes: ['401'],
    keywords: ['fournisseur', 'supplier', 'payable'],
  },
  {
    value: 'personnel',
    label: 'Personnel',
    prefixes: ['42'],
    keywords: ['personnel', 'employee', 'salarie', 'salariÃ©', 'staff'],
  },
];

const normalizeText = (value) => String(value || '')
  .trim()
  .toLowerCase()
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '');

const getAccountNature = (line) => {
  const rawNature = normalizeText([
    line.account_nature,
    line.account_type,
    line.account_kind,
    line.nature,
    line.account?.nature,
    line.account?.type,
    line.account?.kind,
  ].filter(Boolean).join(' '));
  const accountCode = String(line.account_code || line.account?.code || '');

  return ACCOUNT_NATURES.find((nature) => (
    nature.keywords.some((keyword) => rawNature.includes(normalizeText(keyword))) ||
    nature.prefixes.some((prefix) => accountCode.startsWith(prefix))
  )) || null;
};

const getLineAccountingDate = (line) => (
  line.accounting_date ??
  line.move_line_date ??
  line.move_date ??
  line.posting_date ??
  line.entry_date ??
  line.date ??
  line.move?.date ??
  ''
);

const getLineInvoiceDate = (line) => (
  line.invoice_date ??
  line.billing_date ??
  line.facture_date ??
  line.date_invoice ??
  line.move?.invoice_date ??
  ''
);

const getDateByFilter = (line, dateField) => {
  if (dateField === 'invoice_date') return getLineInvoiceDate(line);
  if (dateField === 'date_maturity') return line.date_maturity || '';
  return getLineAccountingDate(line);
};

const normalizeDateValue = (value) => {
  if (!value) return '';
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}/.test(value)) return value.slice(0, 10);
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return String(value).slice(0, 10);
  return parsed.toISOString().slice(0, 10);
};

const isDateInRange = (value, dateFrom, dateTo) => {
  const normalizedValue = normalizeDateValue(value);
  if (!normalizedValue) return false;
  if (dateFrom && normalizedValue < dateFrom) return false;
  if (dateTo && normalizedValue > dateTo) return false;
  return true;
};

const DATE_FILTERS = [
  { value: 'accounting_date', label: 'Date comptable' },
  { value: 'invoice_date', label: 'Date de facturation' },
  { value: 'date_maturity', label: 'EchÃ©ance' },
];

const PERIOD_MODES = [
  { value: 'year', label: 'AnnÃ©e' },
  { value: 'quarter', label: 'Trimestre' },
  { value: 'month', label: 'Mois' },
  { value: 'week', label: 'Semaine' },
  { value: 'day', label: 'Jour' },
  { value: 'custom', label: 'Dates personnalisÃ©es' },
];

const getPeriodRange = (mode, anchorValue) => {
  const anchor = parseISODate(anchorValue);
  const year = anchor.getFullYear();
  const month = anchor.getMonth();

  if (mode === 'year') {
    return { date_from: `${year}-01-01`, date_to: `${year}-12-31`, anchor: `${year}-01-01`, label: String(year) };
  }

  if (mode === 'quarter') {
    const start = new Date(year, Math.floor(month / 3) * 3, 1);
    const end = new Date(year, start.getMonth() + 3, 0);
    return {
      date_from: toISODate(start),
      date_to: toISODate(end),
      anchor: toISODate(start),
      label: `${start.toLocaleDateString('fr-FR', { month: 'short' })} - ${end.toLocaleDateString('fr-FR', { month: 'short', year: 'numeric' })}`,
    };
  }

  if (mode === 'month') {
    const start = new Date(year, month, 1);
    const end = new Date(year, month + 1, 0);
    return {
      date_from: toISODate(start),
      date_to: toISODate(end),
      anchor: toISODate(start),
      label: start.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' }),
    };
  }

  if (mode === 'week') {
    const day = anchor.getDay() || 7;
    const start = new Date(anchor);
    start.setDate(anchor.getDate() - day + 1);
    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    return {
      date_from: toISODate(start),
      date_to: toISODate(end),
      anchor: toISODate(start),
      label: `${formatDate(toISODate(start))} - ${formatDate(toISODate(end))}`,
    };
  }

  const dayValue = toISODate(anchor);
  return { date_from: dayValue, date_to: dayValue, anchor: dayValue, label: formatDate(dayValue) };
};

const shiftPeriodAnchor = (mode, anchorValue, direction) => {
  const anchor = parseISODate(anchorValue);
  if (mode === 'year') anchor.setFullYear(anchor.getFullYear() + direction);
  if (mode === 'quarter') anchor.setMonth(anchor.getMonth() + direction * 3);
  if (mode === 'month') anchor.setMonth(anchor.getMonth() + direction);
  if (mode === 'week') anchor.setDate(anchor.getDate() + direction * 7);
  if (mode === 'day') anchor.setDate(anchor.getDate() + direction);
  return toISODate(anchor);
};

const getMoveId = (line) => (
  line.move_id ??
  line.account_move_id ??
  line.piece_id ??
  line.move?.id ??
  (typeof line.move === 'number' || typeof line.move === 'string' ? line.move : null)
);

const Tooltip = ({ children, text }) => {
  const [show, setShow] = useState(false);
  return (
    <div className="relative inline-block">
      <div onMouseEnter={() => setShow(true)} onMouseLeave={() => setShow(false)}>
        {children}
      </div>
      {show && (
        <div className="absolute z-50 px-2 py-1 text-xs text-white bg-gray-800 rounded whitespace-nowrap bottom-full left-1/2 transform -translate-x-1/2 mb-1">
          {text}
        </div>
      )}
    </div>
  );
};

export default function GrandLivrePartenaires() {
  const { activeEntity } = useEntity();
  const navigate = useNavigate();
  const filterMenuRef = useRef(null);
  const actionsMenuRef = useRef(null);
  const reportRef = useRef(null);

  const [filters, setFilters] = useState({
    date_from: getYearStart(),
    date_to: getYearEnd(),
    date_field: 'accounting_date',
    period_mode: 'custom',
    period_anchor: getYearStart(),
    partner: '',
    account_code: '',
    account_nature: 'all',
  });
  const [partners, setPartners] = useState([]);
  const [report, setReport] = useState(null);
  const [expandedPartners, setExpandedPartners] = useState({});
  const [searchText, setSearchText] = useState('');
  const [showFilterMenu, setShowFilterMenu] = useState(false);
  const [showActionsMenu, setShowActionsMenu] = useState(false);
  const [showColumnsMenu, setShowColumnsMenu] = useState(false);
  const [columnsMenuPosition, setColumnsMenuPosition] = useState({ top: 0, left: 0 });
  const [activeLineMenu, setActiveLineMenu] = useState(null);
  const [lineMenuPosition, setLineMenuPosition] = useState({ top: 0, left: 0 });
  const [loading, setLoading] = useState(false);
  const [loadingRefs, setLoadingRefs] = useState(false);
  const [error, setError] = useState('');

  const columns = useMemo(() => [
    { id: 'entry', label: 'Partenaire / Ecriture', width: 'w-[30%]', align: 'left' },
    { id: 'journal', label: 'Journal', width: 'w-[7%]', align: 'left' },
    { id: 'account', label: 'Compte', width: 'w-[10%]', align: 'left' },
    { id: 'accounting_date', label: 'Date compt.', width: 'w-[9%]', align: 'left' },
    { id: 'invoice_date', label: 'Fact. / Ech.', width: 'w-[11%]', align: 'left' },
    { id: 'matching', label: 'Let.', width: 'w-[5%]', align: 'left' },
    { id: 'debit', label: 'Debit', width: 'w-[9%]', align: 'right' },
    { id: 'credit', label: 'Credit', width: 'w-[9%]', align: 'right' },
    { id: 'balance', label: 'Solde', width: 'w-[10%]', align: 'right' },
  ], []);

  const defaultVisibleColumns = useMemo(() => ({
    entry: true,
    journal: true,
    account: true,
    accounting_date: true,
    invoice_date: true,
    matching: true,
    debit: true,
    credit: true,
    balance: true,
  }), []);
  const [visibleColumns, setVisibleColumns] = useState(defaultVisibleColumns);

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
        !event.target.closest('#grand-livre-partenaires-columns-menu') &&
        !event.target.closest('.grand-livre-partenaires-columns-button')
      ) {
        setShowColumnsMenu(false);
      }
      if (
        activeLineMenu &&
        !event.target.closest('#grand-livre-partenaires-line-menu') &&
        !event.target.closest('.grand-livre-partenaires-line-menu-button')
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
      let response;
      try {
        response = await apiClient.get('/tiers/partenaires/', {
          params: { company: activeEntity.id },
        });
      } catch (referenceError) {
        response = await apiClient.get('partenaires/', {
          params: { company: activeEntity.id },
        });
      }
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
      return;
    }

    try {
      setLoading(true);
      setError('');

      const params = {
        company: activeEntity.id,
        state: 'posted',
      };

      if (filters.date_field === 'accounting_date') {
        params.date_from = filters.date_from;
        params.date_to = filters.date_to;
      }

      if (filters.partner) params.partner = filters.partner;
      if (filters.account_code) params.account_code = filters.account_code;

      const response = await apiClient.get('/compta/move-lines/grand-livre-partenaires/', { params });
      const data = response?.data || response;
      const selectedPartnerId = String(filters.partner || '');
      const results = normalizeList(data?.results || data)
        .filter((partner) => {
          if (!selectedPartnerId) return true;
          return String(partner.partner_id ?? partner.partner?.id ?? partner.id ?? '') === selectedPartnerId;
        })
        .map((partner) => {
          const lines = normalizeList(partner.lines)
            .map((line) => {
              const accountNature = getAccountNature(line);
              return {
                ...line,
                account_nature_key: accountNature?.value || '',
                account_nature_label: accountNature?.label || '',
              };
            })
            .filter((line) => {
              if (!line.account_nature_key) return false;
              if (filters.account_nature === 'all') return true;
              return line.account_nature_key === filters.account_nature;
            })
            .filter((line) => (
              isDateInRange(getDateByFilter(line, filters.date_field), filters.date_from, filters.date_to)
            ));

          const totalDebit = lines.reduce((sum, line) => sum + toNumber(line.debit), 0);
          const totalCredit = lines.reduce((sum, line) => sum + toNumber(line.credit), 0);

          return {
            ...partner,
            lines,
            total_debit: totalDebit,
            total_credit: totalCredit,
            balance: totalDebit - totalCredit,
          };
        })
        .filter((partner) => normalizeList(partner.lines).length > 0);

      setReport({
        ...(data || {}),
        results,
      });

      const nextExpanded = {};
      results.forEach((partner) => {
        nextExpanded[partner.partner_id || partner.partner_name] = false;
      });
      setExpandedPartners(nextExpanded);
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

  const filteredResults = useMemo(() => {
    const results = report?.results || [];
    const query = searchText.trim().toLowerCase();
    if (!query) return results;

    return results
      .map((partner) => {
        const partnerLabel = `${partner.partner_name || ''}`.toLowerCase();
        const lines = partnerLabel.includes(query)
          ? (partner.lines || [])
          : (partner.lines || []).filter((line) => (
              `${line.move_name || ''} ${line.label || ''} ${line.journal_code || ''} ${line.account_code || ''} ${line.account_nature_label || ''} ${getLineAccountingDate(line)} ${getLineInvoiceDate(line)}`
                .toLowerCase()
                .includes(query)
            ));

        if (partnerLabel.includes(query) || lines.length) {
          const totalDebit = lines.reduce((sum, line) => sum + toNumber(line.debit), 0);
          const totalCredit = lines.reduce((sum, line) => sum + toNumber(line.credit), 0);

          return {
            ...partner,
            lines,
            total_debit: totalDebit,
            total_credit: totalCredit,
            balance: totalDebit - totalCredit,
          };
        }

        return null;
      })
      .filter(Boolean);
  }, [report, searchText]);

  const summary = useMemo(() => {
    return filteredResults.reduce(
      (acc, partner) => ({
        total_debit: acc.total_debit + toNumber(getPartnerDebit(partner)),
        total_credit: acc.total_credit + toNumber(getPartnerCredit(partner)),
        balance: acc.balance + toNumber(getPartnerBalance(partner)),
      }),
      { total_debit: 0, total_credit: 0, balance: 0 }
    );
  }, [filteredResults]);

  const handleFilterChange = (name, value) => {
    setFilters((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const applyPeriod = (mode, anchorValue = filters.period_anchor) => {
    if (mode === 'custom') {
      setFilters((prev) => ({ ...prev, period_mode: mode }));
      return;
    }

    const range = getPeriodRange(mode, anchorValue);
    setFilters((prev) => ({
      ...prev,
      period_mode: mode,
      period_anchor: range.anchor,
      date_from: range.date_from,
      date_to: range.date_to,
    }));
  };

  const shiftPeriod = (direction) => {
    if (filters.period_mode === 'custom') return;
    applyPeriod(filters.period_mode, shiftPeriodAnchor(filters.period_mode, filters.period_anchor, direction));
  };

  const currentPeriodLabel = filters.period_mode === 'custom'
    ? `${formatDate(filters.date_from)} - ${formatDate(filters.date_to)}`
    : getPeriodRange(filters.period_mode, filters.period_anchor).label;

  const resetFilters = () => {
    setFilters({
      date_from: getYearStart(),
      date_to: getYearEnd(),
      date_field: 'accounting_date',
      period_mode: 'custom',
      period_anchor: getYearStart(),
      partner: '',
      account_code: '',
      account_nature: 'all',
    });
    setSearchText('');
  };

  const activeFilterChips = useMemo(() => {
    const chips = [];
    if (searchText.trim()) chips.push({ key: 'search', label: searchText.trim(), cls: 'bg-blue-100 text-blue-700' });
    if (filters.account_nature !== 'all') {
      const nature = ACCOUNT_NATURES.find((item) => item.value === filters.account_nature);
      chips.push({ key: 'account_nature', label: `Nature: ${nature?.label || filters.account_nature}`, cls: 'bg-purple-100 text-purple-700' });
    }
    if (filters.account_code) chips.push({ key: 'account_code', label: `Compte: ${filters.account_code}`, cls: 'bg-purple-100 text-purple-700' });
    if (filters.partner) {
      const partner = partners.find((item) => String(item.id) === String(filters.partner));
      chips.push({ key: 'partner', label: `Partenaire: ${getPartnerLabel(partner) || filters.partner}`, cls: 'bg-gray-100 text-gray-700' });
    }
    return chips;
  }, [filters, partners, searchText]);

  const removeFilter = (key) => {
    if (key === 'search') setSearchText('');
    else if (key === 'account_nature') handleFilterChange('account_nature', 'all');
    else if (key === 'account_code') handleFilterChange('account_code', '');
    else if (key === 'partner') handleFilterChange('partner', '');
  };

  const togglePartner = (partnerKey) => {
    setExpandedPartners((prev) => ({
      ...prev,
      [partnerKey]: !prev[partnerKey],
    }));
  };

  const expandAll = () => {
    const nextExpanded = {};
    filteredResults.forEach((partner) => {
      nextExpanded[partner.partner_id || partner.partner_name] = true;
    });
    setExpandedPartners(nextExpanded);
    setShowActionsMenu(false);
  };

  const collapseAll = () => {
    const nextExpanded = {};
    filteredResults.forEach((partner) => {
      nextExpanded[partner.partner_id || partner.partner_name] = false;
    });
    setExpandedPartners(nextExpanded);
    setShowActionsMenu(false);
  };

  const openMove = (line) => {
    const moveId = getMoveId(line);
    setActiveLineMenu(null);
    if (moveId) navigate(`/comptabilite/pieces/${moveId}`);
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

  const exportCsv = () => {
    const rows = [
      ['Partenaire', 'Piece', 'Journal', 'Compte', 'Nature', 'Date comptable', 'Date de facturation', 'Echeance', 'Lettrage', 'Debit', 'Credit', 'Solde'],
    ];

    filteredResults.forEach((partner) => {
      rows.push([
        partner.partner_name || 'Sans partenaire',
        '', '', '', '', '', '', '',
        'Total partenaire',
        toNumber(getPartnerDebit(partner)),
        toNumber(getPartnerCredit(partner)),
        toNumber(getPartnerBalance(partner)),
      ]);

      (partner.lines || []).forEach((line) => {
        rows.push([
          partner.partner_name || 'Sans partenaire',
          line.move_name || '',
          line.journal_code || '',
          line.account_code || '',
          line.account_nature_label || '',
          getLineAccountingDate(line),
          getLineInvoiceDate(line),
          line.date_maturity || '',
          line.matching_number || '',
          toNumber(line.debit),
          toNumber(line.credit),
          toNumber(line.running_balance ?? line.balance),
        ]);
      });
    });

    rows.push(['Total', '', '', '', '', '', '', '', '', toNumber(summary.total_debit), toNumber(summary.total_credit), toNumber(summary.balance)]);

    const csv = rows
      .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(';'))
      .join('\n');

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

  const printReport = () => {
    if (!reportRef.current) return;
    const printWindow = window.open('', '_blank', 'width=1200,height=800');
    if (!printWindow) return;

    printWindow.document.write(`
      <!doctype html>
      <html>
        <head>
          <title>Grand Livre des Partenaires</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 16px; color: #111827; }
            table { width: 100%; border-collapse: collapse; table-layout: fixed; }
            th, td { border: 1px solid #d1d5db; padding: 6px; font-size: 11px; vertical-align: top; }
            th { background: #f3f4f6; font-weight: 600; }
            .no-print { display: none !important; }
            .truncate { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
          </style>
        </head>
        <body>${reportRef.current.innerHTML}</body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
    printWindow.close();
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div ref={reportRef} className="max-w-7xl mx-auto bg-white border border-gray-300">
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

              <div className="relative no-print" ref={actionsMenuRef}>
                <Tooltip text="Menu des actions">
                  <button
                    type="button"
                    onClick={() => setShowActionsMenu(!showActionsMenu)}
                    className="w-8 h-8 rounded-full border border-gray-300 text-gray-700 hover:bg-gray-50 hover:scale-110 hover:shadow-md active:scale-90 transition-all duration-200 flex items-center justify-center"
                  >
                    <FiSettings size={14} />
                  </button>
                </Tooltip>
                {showActionsMenu && (
                  <div
                    onMouseLeave={() => setShowActionsMenu(false)}
                    className="absolute left-0 mt-1 w-48 bg-white border border-gray-300 shadow-lg rounded z-50"
                  >
                    <button onClick={expandAll} className="w-full px-3 py-2 text-xs text-left hover:bg-gray-50 flex items-center gap-2">
                      <FiChevronDown size={12} /> Tout ouvrir
                    </button>
                    <button onClick={collapseAll} className="w-full px-3 py-2 text-xs text-left hover:bg-gray-50 flex items-center gap-2">
                      <FiChevronRight size={12} /> Tout fermer
                    </button>
                    <button
                      onClick={() => {
                        setShowActionsMenu(false);
                        setShowColumnsMenu(false);
                        setActiveLineMenu(null);
                        setTimeout(printReport, 0);
                      }}
                      className="w-full px-3 py-2 text-xs text-left hover:bg-gray-50 flex items-center gap-2"
                    >
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
                    onChange={(event) => setSearchText(event.target.value)}
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
                      <div
                        onMouseLeave={() => setShowFilterMenu(false)}
                        className="absolute right-0 mt-1 w-80 bg-white border border-gray-300 shadow-lg rounded z-50"
                      >
                        <div className="p-2 border-b border-gray-200">
                          <p className="text-xs font-medium text-gray-700 mb-2">Periode</p>
                          <div className="grid grid-cols-2 gap-2 mb-2">
                            <select
                              value={filters.date_field}
                              onChange={(event) => handleFilterChange('date_field', event.target.value)}
                              className="h-8 border border-gray-300 px-2 text-xs"
                            >
                              {DATE_FILTERS.map((dateFilter) => (
                                <option key={dateFilter.value} value={dateFilter.value}>
                                  {dateFilter.label}
                                </option>
                              ))}
                            </select>
                            <select
                              value={filters.period_mode}
                              onChange={(event) => applyPeriod(event.target.value)}
                              className="h-8 border border-gray-300 px-2 text-xs"
                            >
                              {PERIOD_MODES.map((periodMode) => (
                                <option key={periodMode.value} value={periodMode.value}>
                                  {periodMode.label}
                                </option>
                              ))}
                            </select>
                          </div>

                          <div className="flex items-center justify-between mb-2 bg-gray-50 rounded px-1">
                            <button
                              type="button"
                              onClick={() => shiftPeriod(-1)}
                              disabled={filters.period_mode === 'custom'}
                              className="p-1.5 rounded hover:bg-white disabled:opacity-30 disabled:cursor-not-allowed"
                              title="Periode precedente"
                            >
                              <FiChevronDown size={13} className="rotate-90 text-gray-600" />
                            </button>
                            <span className="text-xs font-medium text-gray-700">{currentPeriodLabel}</span>
                            <button
                              type="button"
                              onClick={() => shiftPeriod(1)}
                              disabled={filters.period_mode === 'custom'}
                              className="p-1.5 rounded hover:bg-white disabled:opacity-30 disabled:cursor-not-allowed"
                              title="Periode suivante"
                            >
                              <FiChevronRight size={13} className="text-gray-600" />
                            </button>
                          </div>

                          {filters.period_mode === 'custom' && (
                            <div className="grid grid-cols-2 gap-2">
                              <input
                                type="date"
                                value={filters.date_from}
                                onChange={(event) => handleFilterChange('date_from', event.target.value)}
                                className="h-8 border border-gray-300 px-2 text-xs"
                              />
                              <input
                                type="date"
                                value={filters.date_to}
                                onChange={(event) => handleFilterChange('date_to', event.target.value)}
                                className="h-8 border border-gray-300 px-2 text-xs"
                              />
                            </div>
                          )}
                        </div>

                        <div className="p-2 border-b border-gray-200">
                          <p className="text-xs font-medium text-gray-700 mb-2">Compte / Nature</p>
                          <input
                            type="text"
                            value={filters.account_code}
                            onChange={(event) => handleFilterChange('account_code', event.target.value)}
                            placeholder="Ex: 411, 401, 42"
                            className="mb-2 h-8 w-full border border-gray-300 px-2 text-xs"
                          />
                          <select
                            value={filters.account_nature}
                            onChange={(event) => handleFilterChange('account_nature', event.target.value)}
                            className="h-8 w-full border border-gray-300 px-2 text-xs"
                          >
                            <option value="all">Clients, fournisseurs et personnel</option>
                            {ACCOUNT_NATURES.map((nature) => (
                              <option key={nature.value} value={nature.value}>
                                {nature.label}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div className="p-2 border-b border-gray-200">
                          <p className="text-xs font-medium text-gray-700 mb-2">Partenaire</p>
                          <select
                            value={filters.partner}
                            onChange={(event) => handleFilterChange('partner', event.target.value)}
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

                        <div className="p-2">
                          <button onClick={resetFilters} className="w-full text-xs text-red-600 hover:text-red-700 text-center py-1">
                            Effacer tous les filtres
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-shrink-0 no-print">
              <Tooltip text="Actualiser">
                <button
                  onClick={loadGrandLivrePartenaires}
                  disabled={loading}
                  className="w-8 h-8 rounded-full border border-gray-300 text-gray-700 hover:bg-gray-50 hover:scale-110 hover:shadow-md active:scale-90 transition-all duration-200 flex items-center justify-center disabled:opacity-60"
                >
                  <FiRefreshCw size={14} className={loading ? 'animate-spin' : ''} />
                </button>
              </Tooltip>
            </div>
          </div>
        </div>

        <div className="border-b border-gray-300 px-4 py-2 bg-gray-50 flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-4 text-xs text-gray-600">
            <span>{filteredResults.length} partenaire(s)</span>
          </div>
          <div className="flex flex-wrap items-center gap-4 text-xs">
            <span><span className="text-gray-500">Debit </span><strong>{formatAmount(summary.total_debit)}</strong></span>
            <span><span className="text-gray-500">Credit </span><strong>{formatAmount(summary.total_credit)}</strong></span>
            <span><span className="text-gray-500">Solde </span><strong className={toNumber(summary.balance) < 0 ? 'text-red-600' : 'text-gray-900'}>{formatAmount(summary.balance)}</strong></span>
          </div>
        </div>

        {error && (
          <div className="border-b border-red-200 bg-red-50 px-5 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="overflow-visible">
          <table className="w-full table-fixed border-collapse">
            <colgroup>
              {columns.filter((column) => visibleColumns[column.id]).map((column) => (
                <col key={column.id} className={column.width} />
              ))}
              <col className="w-[3%]" />
            </colgroup>
            <thead>
              <tr className="border-b border-gray-300 bg-gray-100 text-xs text-gray-700">
                {columns.map((column) => visibleColumns[column.id] && (
                  <th key={column.id} className={`px-2 py-3 font-semibold ${column.align === 'right' ? 'text-right' : 'text-left'}`}>
                    {column.label}
                  </th>
                ))}
                <th className="px-1 py-2 text-center no-print">
                  <Tooltip text="Colonnes">
                    <button
                      type="button"
                      className="grand-livre-partenaires-columns-button inline-flex h-7 w-7 items-center justify-center rounded hover:bg-gray-200"
                      onClick={(event) => {
                        const rect = event.currentTarget.getBoundingClientRect();
                        setColumnsMenuPosition({
                          top: rect.bottom + window.scrollY + 5,
                          left: rect.right + window.scrollX - 220,
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
              {loading ? (
                <tr>
                  <td colSpan={visibleColumnCount + 1} className="px-4 py-12 text-center text-sm text-gray-500">
                    Chargement du grand livre des partenaires...
                  </td>
                </tr>
              ) : filteredResults.length === 0 ? (
                <tr>
                  <td colSpan={visibleColumnCount + 1} className="px-4 py-12 text-center text-sm text-gray-500">
                    Aucune ecriture trouvee pour ces criteres.
                  </td>
                </tr>
              ) : (
                filteredResults.map((partner) => {
                  const partnerKey = partner.partner_id || partner.partner_name;
                  const isExpanded = expandedPartners[partnerKey];

                  return (
                    <React.Fragment key={partnerKey}>
                      <tr className="border-b border-gray-300 bg-white">
                        {visibleColumns.entry && (
                          <td className="px-2 py-2 text-xs font-bold text-gray-900 truncate" title={partner.partner_name || 'Sans partenaire'}>
                            <button
                              type="button"
                              onClick={() => togglePartner(partnerKey)}
                              className="mr-1 inline-flex h-5 w-5 items-center justify-center text-gray-500 hover:text-gray-900"
                            >
                              {isExpanded ? <FiChevronDown size={14} /> : <FiChevronRight size={14} />}
                            </button>
                            {partner.partner_name || 'Sans partenaire'}
                            <span className="ml-1 rounded border border-gray-200 px-1 py-0.5 text-[10px] font-normal text-gray-400">
                              Partenaire
                            </span>
                          </td>
                        )}
                        {visibleColumns.journal && <td />}
                        {visibleColumns.account && <td />}
                        {visibleColumns.accounting_date && <td />}
                        {visibleColumns.invoice_date && <td />}
                        {visibleColumns.matching && <td />}
                        {visibleColumns.debit && (
                          <td className="px-2 py-2 text-right text-xs font-bold text-gray-900">
                            {formatAmount(getPartnerDebit(partner))}
                          </td>
                        )}
                        {visibleColumns.credit && (
                          <td className="px-2 py-2 text-right text-xs font-bold text-gray-900">
                            {formatAmount(getPartnerCredit(partner))}
                          </td>
                        )}
                        {visibleColumns.balance && (
                          <td className={`px-2 py-2 text-right text-xs font-bold ${toNumber(getPartnerBalance(partner)) < 0 ? 'text-red-600' : 'text-gray-900'}`}>
                            {formatAmount(getPartnerBalance(partner))}
                          </td>
                        )}
                        <td className="px-1 py-2 no-print" />
                      </tr>

                      {isExpanded && (partner.lines || []).map((line, index) => {
                        const lineKey = `${partnerKey}-${line.id || index}`;
                        const lineLabel = line.label || '';
                        const fullLineLabel = `${line.move_name || '-'} ${lineLabel}`.trim();

                        return (
                        <tr key={lineKey} className="border-b border-gray-200 hover:bg-gray-50">
                          {visibleColumns.entry && (
                            <td className="px-2 py-2 text-xs text-gray-700">
                              <div className="flex min-w-0 items-center gap-1">
                                <div className="min-w-0 flex-1 truncate" title={fullLineLabel}>
                                  <span className="font-medium">{line.move_name || '-'}</span>
                                  {lineLabel ? <span className="ml-1 text-gray-500">{lineLabel}</span> : null}
                                </div>
                                <button
                                  type="button"
                                  onClick={(event) => openLineMenu(event, line)}
                                  className="grand-livre-partenaires-line-menu-button inline-flex h-5 w-5 flex-shrink-0 items-center justify-center rounded text-gray-300 hover:bg-gray-100 hover:text-gray-700"
                                  title="Actions"
                                >
                                  <FiMoreVertical size={13} />
                                </button>
                              </div>
                            </td>
                          )}
                          {visibleColumns.journal && <td className="px-2 py-2 text-xs text-gray-700 truncate" title={line.journal_code || ''}>{line.journal_code || ''}</td>}
                          {visibleColumns.account && (
                            <td className="px-2 py-2 text-xs text-gray-700">
                              <div className="truncate" title={line.account_code || ''}>{line.account_code || ''}</div>
                              {line.account_nature_label ? <div className="truncate text-[10px] text-gray-400" title={line.account_nature_label}>{line.account_nature_label}</div> : null}
                            </td>
                          )}
                          {visibleColumns.accounting_date && <td className="px-2 py-2 text-xs text-gray-700 truncate">{formatDate(getLineAccountingDate(line))}</td>}
                          {visibleColumns.invoice_date && (
                            <td className="px-2 py-2 text-xs text-gray-700">
                              <div className="truncate">{formatDate(getLineInvoiceDate(line))}</div>
                              {line.date_maturity ? <div className="truncate text-[10px] text-red-500">{formatDate(line.date_maturity)}</div> : null}
                            </td>
                          )}
                          {visibleColumns.matching && <td className="px-2 py-2 text-xs text-gray-700 truncate" title={line.matching_number || ''}>{line.matching_number || ''}</td>}
                          {visibleColumns.debit && <td className="px-2 py-2 text-right text-xs text-gray-700">{formatAmount(line.debit)}</td>}
                          {visibleColumns.credit && <td className="px-2 py-2 text-right text-xs text-gray-700">{formatAmount(line.credit)}</td>}
                          {visibleColumns.balance && (
                            <td className={`px-2 py-2 text-right text-xs ${toNumber(line.running_balance ?? line.balance) < 0 ? 'text-red-600' : 'text-gray-700'}`}>
                              {formatAmount(line.running_balance ?? line.balance)}
                            </td>
                          )}
                          <td className="px-1 py-2 no-print" />
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
                  {visibleColumns.entry && <td className="px-2 py-3">Total</td>}
                  {visibleColumns.journal && <td />}
                  {visibleColumns.account && <td />}
                  {visibleColumns.accounting_date && <td />}
                  {visibleColumns.invoice_date && <td />}
                  {visibleColumns.matching && <td />}
                  {visibleColumns.debit && <td className="px-2 py-3 text-right">{formatAmount(summary.total_debit)}</td>}
                  {visibleColumns.credit && <td className="px-2 py-3 text-right">{formatAmount(summary.total_credit)}</td>}
                  {visibleColumns.balance && (
                    <td className={`px-2 py-3 text-right ${toNumber(summary.balance) < 0 ? 'text-red-600' : ''}`}>
                      {formatAmount(summary.balance)}
                    </td>
                  )}
                  <td className="px-1 py-3 no-print" />
                </tr>
              </tfoot>
            )}
          </table>
        </div>

        {showColumnsMenu && (
          <div
            id="grand-livre-partenaires-columns-menu"
            onMouseLeave={() => setShowColumnsMenu(false)}
            className="fixed bg-white border border-gray-300 shadow-lg rounded z-50 no-print"
            style={{
              top: columnsMenuPosition.top,
              left: columnsMenuPosition.left,
              width: '220px',
            }}
          >
            <div className="p-2 border-b border-gray-200">
              <p className="text-xs font-medium text-gray-700 mb-2">Colonnes a afficher</p>
              {columns.map((column) => (
                <label
                  key={column.id}
                  className="flex items-center gap-2 py-1 px-2 hover:bg-gray-50 rounded cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={visibleColumns[column.id]}
                    disabled={column.id === 'entry'}
                    onChange={() => setVisibleColumns((prev) => ({
                      ...prev,
                      [column.id]: !prev[column.id],
                    }))}
                    className="w-3.5 h-3.5 cursor-pointer disabled:cursor-not-allowed"
                  />
                  <span className={`text-xs ${column.id === 'entry' ? 'text-gray-400' : 'text-gray-700'}`}>
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
                  columns.forEach((column) => {
                    nextColumns[column.id] = true;
                  });
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
            id="grand-livre-partenaires-line-menu"
            onMouseLeave={() => setActiveLineMenu(null)}
            className="fixed bg-white border border-gray-300 shadow-lg rounded z-50 no-print"
            style={{
              top: lineMenuPosition.top,
              left: lineMenuPosition.left,
              width: '230px',
            }}
          >
            <button
              type="button"
              onClick={() => openMove(activeLineMenu)}
              disabled={!getMoveId(activeLineMenu)}
              className="w-full px-4 py-3 text-sm text-left text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 flex items-center gap-2"
            >
              <FiFileText size={15} />
              Voir la piece comptable
            </button>
          </div>
        )}
      </div>
    </div>
  );
}