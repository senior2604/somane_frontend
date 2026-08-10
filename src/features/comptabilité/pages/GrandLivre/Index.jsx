// src/features/comptabilite/pages/GrandLivre/Index.jsx
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
  FiMoreVertical,
  FiPrinter,
  FiRefreshCw,
  FiSettings,
  FiX,
} from 'react-icons/fi';
import { useEntity } from '../../../../context/EntityContext';
import { piecesService } from '../../services';

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

const formatAmount = (value, currency = 'CFA') => {
  const number = Math.round(toNumber(value));
  return `${number.toLocaleString('fr-FR')} ${currency}`;
};

const formatDate = (value) => {
  if (!value) return '-';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
};

const getAccountDebit = (account) => account.total_debit ?? account.movement_debit ?? account.debit ?? 0;
const getAccountCredit = (account) => account.total_credit ?? account.movement_credit ?? account.credit ?? 0;
const getAccountBalance = (account) => (
  account.balance ??
  account.closing_balance ??
  account.current_balance ??
  (toNumber(getAccountDebit(account)) - toNumber(getAccountCredit(account)))
);

const getCurrencyCode = (report, accounts) => (
  report?.currency_code ||
  report?.currency ||
  accounts?.[0]?.currency_code ||
  'CFA'
);

const getAccountKey = (account) => account.account_id || account.id || account.account_code || account.code;
const getPartnerLabel = (partner) => (
  partner?.raison_sociale ||
  partner?.display_name ||
  partner?.name ||
  partner?.nom ||
  partner?.label ||
  (partner?.id ? `Partenaire ${partner.id}` : '')
);
const getLineLabel = (line) => line.label || line.name || line.ref || line.move_ref || '';
const getLineMoveId = (line) => (
  line.move_id ||
  line.moveId ||
  line.account_move_id ||
  line.accountMoveId ||
  (typeof line.move === 'object' ? line.move?.id : line.move)
);
const getLineJournalId = (line) => (
  line.journal_id ||
  line.journalId ||
  (typeof line.journal === 'object' ? line.journal?.id : line.journal) ||
  ''
);
const getLinePartnerId = (line) => (
  line.partner_id ||
  line.partnerId ||
  line.partenaire_id ||
  (typeof line.partner === 'object' ? line.partner?.id : line.partner) ||
  (typeof line.partenaire === 'object' ? line.partenaire?.id : line.partenaire) ||
  ''
);
const getLineDebit = (line) => line.debit ?? line.debit_amount ?? 0;
const getLineCredit = (line) => line.credit ?? line.credit_amount ?? 0;
const getLineBalance = (line) => line.balance ?? line.solde ?? line.running_balance;

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
    posted: { text: 'Comptabilisees', cls: 'bg-green-100 text-green-700' },
    draft: { text: 'Brouillons', cls: 'bg-amber-100 text-amber-700' },
    cancel: { text: 'Annulees', cls: 'bg-red-100 text-red-700' },
  }[value] || { text: value || 'Toutes', cls: 'bg-gray-100 text-gray-700' };

  return <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs ${config.cls}`}>{config.text}</span>;
};

export default function GrandLivre() {
  const navigate = useNavigate();
  const { activeEntity } = useEntity();
  const filterMenuRef = useRef(null);
  const actionsMenuRef = useRef(null);
  const reportRef = useRef(null);

  const [filters, setFilters] = useState({
    date_from: getYearStart(),
    date_to: getYearEnd(),
    account_code: '',
    journal: '',
    partner: '',
    state: 'posted',
  });
  const [accounts, setAccounts] = useState([]);
  const [journals, setJournals] = useState([]);
  const [partners, setPartners] = useState([]);
  const [report, setReport] = useState(null);
  const [expandedAccounts, setExpandedAccounts] = useState({});
  const [loading, setLoading] = useState(false);
  const [loadingRefs, setLoadingRefs] = useState(false);
  const [error, setError] = useState('');
  const [searchText, setSearchText] = useState('');
  const [showFilterMenu, setShowFilterMenu] = useState(false);
  const [showActionsMenu, setShowActionsMenu] = useState(false);
  const [showColumnsMenu, setShowColumnsMenu] = useState(false);
  const [columnsMenuPosition, setColumnsMenuPosition] = useState({ top: 0, left: 0 });
  const [activeLineMenu, setActiveLineMenu] = useState(null);
  const [lineMenuPosition, setLineMenuPosition] = useState({ top: 0, left: 0 });
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(15);
  const [visibleColumns, setVisibleColumns] = useState({
    account: true,
    date: true,
    journal: true,
    move: true,
    reference: false,
    partner: true,
    label: true,
    debit: true,
    credit: true,
    balance: true,
  });

  const results = useMemo(() => report?.results || [], [report]);
  const currency = useMemo(() => getCurrencyCode(report, results), [report, results]);

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
        !event.target.closest('#grand-livre-columns-menu') &&
        !event.target.closest('.grand-livre-columns-button')
      ) {
        setShowColumnsMenu(false);
      }
      if (
        activeLineMenu &&
        !event.target.closest('#grand-livre-line-menu') &&
        !event.target.closest('.grand-livre-line-menu-button')
      ) {
        setActiveLineMenu(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [activeLineMenu, showColumnsMenu]);

  const columns = useMemo(() => [
    { id: 'account', label: 'Compte / Ecriture', width: 'w-[22%]' },
    { id: 'date', label: 'Date', width: 'w-[7%]' },
    { id: 'journal', label: 'Journal', width: 'w-[6%]' },
    { id: 'move', label: 'Piece', width: 'w-[9%]' },
    { id: 'reference', label: 'Reference', width: 'w-[8%]' },
    { id: 'partner', label: 'Partenaire', width: 'w-[12%]' },
    { id: 'label', label: 'Libelle', width: 'w-[14%]' },
    { id: 'debit', label: 'Debit', width: 'w-[7%]', align: 'right' },
    { id: 'credit', label: 'Credit', width: 'w-[7%]', align: 'right' },
    { id: 'balance', label: 'Solde', width: 'w-[8%]', align: 'right' },
  ], []);

  const defaultVisibleColumns = useMemo(() => ({
    account: true,
    date: true,
    journal: true,
    move: true,
    reference: false,
    partner: true,
    label: true,
    debit: true,
    credit: true,
    balance: true,
  }), []);

  const visibleColumnCount = useMemo(
    () => columns.filter((column) => visibleColumns[column.id]).length,
    [columns, visibleColumns]
  );

  const loadReferences = useCallback(async () => {
    if (!activeEntity?.id) return;
    try {
      setLoadingRefs(true);
      const [accountsData, journalsData, partnersData] = await Promise.all([
        piecesService.getAccounts?.(activeEntity.id),
        piecesService.getJournals?.(activeEntity.id),
        piecesService.getPartners?.(activeEntity.id),
      ]);
      setAccounts(normalizeList(accountsData));
      setJournals(normalizeList(journalsData));
      setPartners(normalizeList(partnersData));
    } catch (err) {
      console.error('Erreur chargement referentiels grand livre:', err);
    } finally {
      setLoadingRefs(false);
    }
  }, [activeEntity]);

  const loadGrandLivre = useCallback(async () => {
    if (!activeEntity?.id) {
      setError('Veuillez selectionner une entite.');
      setReport({ results: [] });
      return;
    }

    try {
      setLoading(true);
      setError('');
      const cleanFilters = Object.fromEntries(
        Object.entries({ ...filters, state: 'posted' }).filter(([, value]) => value !== undefined && value !== null && value !== '')
      );
      const data = await piecesService.getGrandLivre(activeEntity.id, cleanFilters);
      const nextResults = normalizeList(data?.results || data);
      const selectedJournal = String(filters.journal || '');
      const selectedPartner = String(filters.partner || '');
      const selectedJournalRef = journals.find((journal) => String(journal.id) === selectedJournal);
      const selectedPartnerRef = partners.find((partner) => String(partner.id) === selectedPartner);
      const nextFilteredResults = (!selectedJournal && !selectedPartner)
        ? nextResults
        : nextResults
            .map((account) => {
              const lines = normalizeList(account.lines).filter((line) => {
                const journalCandidates = [
                  getLineJournalId(line),
                  line.journal_code,
                  line.journal_name,
                  typeof line.journal === 'object' ? line.journal?.code : line.journal,
                  typeof line.journal === 'object' ? line.journal?.name : '',
                ].filter(Boolean);
                const partnerCandidates = [
                  getLinePartnerId(line),
                  line.partner_name,
                  line.partenaire_name,
                  typeof line.partner === 'object' ? getPartnerLabel(line.partner) : line.partner,
                  typeof line.partenaire === 'object' ? getPartnerLabel(line.partenaire) : line.partenaire,
                ].filter(Boolean);
                const journalOk = !selectedJournal || journalCandidates.some((value) => (
                  String(value) === selectedJournal ||
                  normalizeText(value) === normalizeText(selectedJournalRef?.code) ||
                  normalizeText(value) === normalizeText(selectedJournalRef?.name)
                ));
                const partnerOk = !selectedPartner || partnerCandidates.some((value) => (
                  String(value) === selectedPartner ||
                  normalizeText(value) === normalizeText(getPartnerLabel(selectedPartnerRef))
                ));
                return journalOk && partnerOk;
              });
              const totalDebit = lines.reduce((sum, line) => sum + toNumber(getLineDebit(line)), 0);
              const totalCredit = lines.reduce((sum, line) => sum + toNumber(getLineCredit(line)), 0);
              const lastBalance = lines.length ? getLineBalance(lines[lines.length - 1]) : undefined;

              return {
                ...account,
                lines,
                total_debit: totalDebit,
                total_credit: totalCredit,
                movement_debit: totalDebit,
                movement_credit: totalCredit,
                debit: totalDebit,
                credit: totalCredit,
                balance: lastBalance ?? (totalDebit - totalCredit),
                closing_balance: lastBalance ?? (totalDebit - totalCredit),
              };
            })
            .filter((account) => normalizeList(account.lines).length > 0);
      setReport({ ...(data || {}), results: nextFilteredResults });

      const nextExpanded = {};
      nextFilteredResults.forEach((account) => {
        nextExpanded[getAccountKey(account)] = true;
      });
      setExpandedAccounts(nextExpanded);
      setCurrentPage(1);
    } catch (err) {
      console.error('Erreur chargement grand livre:', err);
      setError('Impossible de charger le grand livre.');
      setReport({ results: [] });
    } finally {
      setLoading(false);
    }
  }, [activeEntity, filters, journals, partners]);

  useEffect(() => {
    loadReferences();
  }, [loadReferences]);

  useEffect(() => {
    loadGrandLivre();
  }, [loadGrandLivre]);

  const activeFilterChips = useMemo(() => {
    const chips = [];
    if (searchText.trim()) chips.push({ key: 'search', label: searchText.trim(), cls: 'bg-blue-100 text-blue-700' });
    if (filters.account_code) chips.push({ key: 'account_code', label: `Compte: ${filters.account_code}`, cls: 'bg-purple-100 text-purple-700' });
    if (filters.journal) {
      const journal = journals.find((item) => String(item.id) === String(filters.journal));
      chips.push({ key: 'journal', label: `Journal: ${journal?.code || journal?.name || filters.journal}`, cls: 'bg-gray-100 text-gray-700' });
    }
    if (filters.partner) {
      const partner = partners.find((item) => String(item.id) === String(filters.partner));
      chips.push({ key: 'partner', label: `Partenaire: ${getPartnerLabel(partner) || filters.partner}`, cls: 'bg-gray-100 text-gray-700' });
    }
    return chips;
  }, [filters, journals, partners, searchText]);

  const removeFilter = (key) => {
    if (key === 'search') setSearchText('');
    else setFilters((prev) => ({ ...prev, [key]: '' }));
  };

  const clearAllFilters = () => {
    setSearchText('');
    setFilters({
      date_from: getYearStart(),
      date_to: getYearEnd(),
      account_code: '',
      journal: '',
      partner: '',
      state: 'posted',
    });
  };

  const filteredResults = useMemo(() => {
    const query = normalizeText(searchText);
    if (!query) return results;

    return results
      .map((account) => {
        const accountLabel = normalizeText(`${account.account_code || ''} ${account.account_name || ''}`);
        const lines = normalizeList(account.lines);
        const filteredLines = accountLabel.includes(query)
          ? lines
          : lines.filter((line) => normalizeText([
              line.move_name,
              line.name,
              line.label,
              line.partner_name,
              line.journal_code,
              line.ref,
            ].filter(Boolean).join(' ')).includes(query));

        if (accountLabel.includes(query) || filteredLines.length) {
          return { ...account, lines: filteredLines };
        }
        return null;
      })
      .filter(Boolean);
  }, [results, searchText]);

  const totalPages = Math.max(1, Math.ceil(filteredResults.length / itemsPerPage));
  const pageStart = (currentPage - 1) * itemsPerPage;
  const paginatedAccounts = filteredResults.slice(pageStart, pageStart + itemsPerPage);

  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages);
  }, [currentPage, totalPages]);

  const summary = useMemo(() => filteredResults.reduce(
    (acc, account) => ({
      total_debit: acc.total_debit + toNumber(getAccountDebit(account)),
      total_credit: acc.total_credit + toNumber(getAccountCredit(account)),
      balance: acc.balance + toNumber(getAccountBalance(account)),
    }),
    { total_debit: 0, total_credit: 0, balance: 0 }
  ), [filteredResults]);

  const totalLineCount = useMemo(
    () => filteredResults.reduce((total, account) => total + normalizeList(account.lines).length, 0),
    [filteredResults]
  );

  const toggleAccount = (accountKey) => {
    setExpandedAccounts((prev) => ({ ...prev, [accountKey]: !prev[accountKey] }));
  };

  const openAccountMoveLines = (account) => {
    const params = new URLSearchParams();
    if (account.account_id) params.set('account', account.account_id);
    if (account.account_code) params.set('account_code', account.account_code);
    if (filters.date_from) params.set('date_from', filters.date_from);
    if (filters.date_to) params.set('date_to', filters.date_to);
    if (filters.state) params.set('state', filters.state);

    navigate(`/comptabilite/pieces?${params.toString()}`);
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

  const expandAll = () => {
    const nextExpanded = {};
    filteredResults.forEach((account) => {
      nextExpanded[getAccountKey(account)] = true;
    });
    setExpandedAccounts(nextExpanded);
    setShowActionsMenu(false);
  };

  const collapseAll = () => {
    const nextExpanded = {};
    filteredResults.forEach((account) => {
      nextExpanded[getAccountKey(account)] = false;
    });
    setExpandedAccounts(nextExpanded);
    setShowActionsMenu(false);
  };

  const exportCsv = () => {
    const rows = [['Compte', 'Date', 'Piece', 'Journal', 'Partenaire', 'Libelle', 'Debit', 'Credit', 'Solde']];
    filteredResults.forEach((account) => {
      rows.push([
        `${account.account_code || ''} ${account.account_name || ''}`.trim(),
        '',
        '',
        '',
        '',
        'Total compte',
        toNumber(getAccountDebit(account)),
        toNumber(getAccountCredit(account)),
        toNumber(getAccountBalance(account)),
      ]);
      normalizeList(account.lines).forEach((line) => {
        rows.push([
          account.account_code || '',
          line.date || '',
          line.move_name || '',
          line.journal_code || '',
          line.partner_name || '',
          getLineLabel(line),
          toNumber(line.debit),
          toNumber(line.credit),
          toNumber(line.running_balance ?? line.balance),
        ]);
      });
    });

    const csv = rows.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(';')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `grand-livre-${filters.date_from || 'debut'}-${filters.date_to || 'fin'}.csv`;
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
          <title>Grand Livre</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 16px; color: #111827; }
            table { width: 100%; border-collapse: collapse; table-layout: fixed; }
            th, td { border: 1px solid #d1d5db; padding: 6px; font-size: 11px; }
            th { background: #f3f4f6; font-weight: 600; }
            .no-print { display: none !important; }
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

  if (!activeEntity?.id) {
    return (
      <div className="min-h-screen bg-gray-50 p-4">
        <div className="max-w-7xl mx-auto bg-white border border-gray-300">
          <div className="border-b border-gray-300 px-4 py-3">
            <div className="text-lg font-bold text-gray-900">Grand Livre</div>
          </div>
          <div className="p-8">
            <div className="bg-yellow-50 border border-yellow-200 rounded p-6 text-center">
              <FiAlertCircle className="text-yellow-600 mx-auto mb-3" size={32} />
              <p className="text-yellow-800 font-medium text-lg mb-3">Aucune entite selectionnee</p>
              <p className="text-sm text-gray-600">Veuillez selectionner une entite pour afficher le grand livre.</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div ref={reportRef} className="max-w-7xl mx-auto bg-white border border-gray-300">
        <div className="border-b border-gray-300 px-4 py-3">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 flex-shrink-0">
              <Tooltip text="Actualiser le grand livre">
                <h1
                  className="text-lg font-bold text-gray-900 cursor-pointer hover:text-purple-600 hover:scale-105 transition-all duration-200"
                  onClick={loadGrandLivre}
                >
                  Grand Livre
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
                    onChange={(event) => {
                      setSearchText(event.target.value);
                      setCurrentPage(1);
                    }}
                    placeholder="Rechercher..."
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
                        className="absolute right-0 mt-1 w-72 bg-white border border-gray-300 shadow-lg rounded z-50"
                      >
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
                          <p className="text-xs font-medium text-gray-700 mb-2">Compte / Journal</p>
                          <input
                            list="grand-livre-accounts"
                            value={filters.account_code}
                            onChange={(event) => setFilters((prev) => ({ ...prev, account_code: event.target.value }))}
                            placeholder="Compte: 411"
                            className="mb-2 h-8 w-full border border-gray-300 px-2 text-xs"
                          />
                          <datalist id="grand-livre-accounts">
                            {accounts.map((account) => (
                              <option key={account.id || account.code} value={account.code}>
                                {account.code} - {account.name}
                              </option>
                            ))}
                          </datalist>
                          <select
                            value={filters.journal}
                            onChange={(event) => setFilters((prev) => ({ ...prev, journal: event.target.value }))}
                            disabled={loadingRefs}
                            className="h-8 w-full border border-gray-300 px-2 text-xs"
                          >
                            <option value="">Tous les journaux</option>
                            {journals.map((journal) => (
                              <option key={journal.id} value={journal.id}>
                                {journal.code ? `${journal.code} - ` : ''}{journal.name}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div className="p-2 border-b border-gray-200">
                          <p className="text-xs font-medium text-gray-700 mb-2">Partenaire</p>
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
              <span className="text-xs text-gray-500">lignes</span>
            </div>
          </div>
        </div>

        <div className="border-b border-gray-300 px-4 py-2 bg-gray-50 flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-4 text-xs text-gray-600">
            <span>{filteredResults.length} compte(s)</span>
            <span>{totalLineCount} ecriture(s)</span>
            <StateChip value={filters.state} />
          </div>
          <div className="flex flex-wrap items-center gap-4 text-xs">
            <span><span className="text-gray-500">Debit </span><strong>{formatAmount(summary.total_debit, currency)}</strong></span>
            <span><span className="text-gray-500">Credit </span><strong>{formatAmount(summary.total_credit, currency)}</strong></span>
            <span><span className="text-gray-500">Solde </span><strong className={toNumber(summary.balance) < 0 ? 'text-red-600' : 'text-gray-900'}>{formatAmount(summary.balance, currency)}</strong></span>
          </div>
        </div>

        <div className="overflow-visible">
          <table className="w-full table-fixed border-collapse text-sm">
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
                      className="grand-livre-columns-button p-1 rounded hover:bg-gray-200"
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
              {error ? (
                <tr>
                  <td colSpan={visibleColumnCount + 1} className="border border-gray-300 p-4 text-center text-red-600 text-sm">
                    {error}
                  </td>
                </tr>
              ) : loading || loadingRefs ? (
                <tr>
                  <td colSpan={visibleColumnCount + 1} className="border border-gray-300 p-8 text-center text-gray-500 text-sm">
                    Chargement du grand livre...
                  </td>
                </tr>
              ) : paginatedAccounts.length === 0 ? (
                <tr>
                  <td colSpan={visibleColumnCount + 1} className="border border-gray-300 p-8 text-center text-gray-500 text-sm">
                    Aucun resultat pour ces filtres
                  </td>
                </tr>
              ) : (
                paginatedAccounts.map((account) => {
                  const accountKey = getAccountKey(account);
                  const expanded = expandedAccounts[accountKey] !== false;
                  const lines = normalizeList(account.lines);
                  const balance = getAccountBalance(account);

                  return (
                    <React.Fragment key={accountKey}>
                      <tr className="hover:bg-gray-50 transition-colors bg-white font-semibold">
                        {visibleColumns.account && (
                          <td className="border border-gray-300 px-2 py-1.5 text-xs text-gray-900">
                            <div className="flex min-w-0 items-center">
                              <button
                                type="button"
                                onClick={() => toggleAccount(accountKey)}
                                className="mr-2 flex-shrink-0 text-gray-500 hover:text-purple-600"
                              >
                                {expanded ? <FiChevronDown size={13} /> : <FiChevronRight size={13} />}
                              </button>
                              <span
                                className="truncate"
                                title={`${account.account_code || ''} ${account.account_name || ''}`.trim()}
                              >
                                {account.account_code} {account.account_name}
                              </span>
                              <button
                                type="button"
                                onClick={(event) => {
                                  event.stopPropagation();
                                  openAccountMoveLines(account);
                                }}
                                className="ml-2 flex-shrink-0 border border-gray-300 rounded px-1.5 py-0.5 text-[10px] font-normal text-gray-400 hover:border-purple-300 hover:bg-purple-50 hover:text-purple-700"
                                title="Voir les ecritures comptables de ce compte"
                              >
                                Ecritures comptables
                              </button>
                            </div>
                          </td>
                        )}
                        {visibleColumns.date && <td className="border border-gray-300 px-2 py-1.5" />}
                        {visibleColumns.journal && <td className="border border-gray-300 px-2 py-1.5" />}
                        {visibleColumns.move && <td className="border border-gray-300 px-2 py-1.5" />}
                        {visibleColumns.reference && <td className="border border-gray-300 px-2 py-1.5" />}
                        {visibleColumns.partner && <td className="border border-gray-300 px-2 py-1.5" />}
                        {visibleColumns.label && <td className="border border-gray-300 px-2 py-1.5" />}
                        {visibleColumns.debit && (
                          <td className="border border-gray-300 px-2 py-1.5 text-right text-xs">
                            {formatAmount(getAccountDebit(account), currency)}
                          </td>
                        )}
                        {visibleColumns.credit && (
                          <td className="border border-gray-300 px-2 py-1.5 text-right text-xs">
                            {formatAmount(getAccountCredit(account), currency)}
                          </td>
                        )}
                        {visibleColumns.balance && (
                          <td className={`border border-gray-300 px-2 py-1.5 text-right text-xs ${toNumber(balance) < 0 ? 'text-red-600' : 'text-gray-900'}`}>
                            {formatAmount(balance, currency)}
                          </td>
                        )}
                        <td className="border border-gray-300 px-2 py-1.5" />
                      </tr>

                      {expanded && lines.map((line) => {
                        const runningBalance = line.running_balance ?? line.balance ?? 0;
                        const lineLabel = getLineLabel(line);
                        return (
                          <tr key={line.id} className="hover:bg-gray-50 transition-colors">
                            {visibleColumns.account && (
                              <td className="border border-gray-300 px-2 py-1.5 text-xs text-gray-700 pl-8">
                                <div className="flex min-w-0 items-center gap-1">
                                  <div className="min-w-0 flex-1 truncate" title={`${line.move_name || ''} ${lineLabel}`.trim()}>
                                    <span className="font-medium">{line.move_name || '-'}</span>
                                    {lineLabel ? <span className="ml-1 text-gray-500">{lineLabel}</span> : null}
                                  </div>
                                  <button
                                    type="button"
                                    onClick={(event) => openLineMenu(event, line)}
                                    className="grand-livre-line-menu-button inline-flex h-5 w-5 flex-shrink-0 items-center justify-center rounded text-gray-300 hover:bg-gray-100 hover:text-gray-700"
                                    title="Actions"
                                  >
                                    <FiMoreVertical size={13} />
                                  </button>
                                </div>
                              </td>
                            )}
                            {visibleColumns.date && (
                              <td className="border border-gray-300 px-2 py-1.5 text-xs text-gray-700 truncate" title={formatDate(line.date)}>{formatDate(line.date)}</td>
                            )}
                            {visibleColumns.journal && (
                              <td className="border border-gray-300 px-2 py-1.5 text-xs text-gray-700 truncate" title={line.journal_code || ''}>{line.journal_code || '-'}</td>
                            )}
                            {visibleColumns.move && (
                              <td className="border border-gray-300 px-2 py-1.5 text-xs text-gray-700">
                                <div className="truncate" title={line.move_name || ''}>
                                  {line.move_name || '-'}
                                </div>
                              </td>
                            )}
                            {visibleColumns.reference && (
                              <td className="border border-gray-300 px-2 py-1.5 text-xs text-gray-700">
                                <div className="truncate" title={line.ref || line.move_ref || line.reference || ''}>
                                  {line.ref || line.move_ref || line.reference || '-'}
                                </div>
                              </td>
                            )}
                            {visibleColumns.partner && (
                              <td className="border border-gray-300 px-2 py-1.5 text-xs text-gray-700">
                                <div className="truncate" title={line.partner_name || ''}>{line.partner_name || '-'}</div>
                              </td>
                            )}
                            {visibleColumns.label && (
                              <td className="border border-gray-300 px-2 py-1.5 text-xs text-gray-700">
                                <div className="truncate" title={lineLabel}>
                                  {lineLabel || '-'}
                                </div>
                              </td>
                            )}
                            {visibleColumns.debit && (
                              <td className="border border-gray-300 px-2 py-1.5 text-right text-xs truncate" title={formatAmount(line.debit, currency)}>
                                {toNumber(line.debit) ? formatAmount(line.debit, currency) : <span className="text-gray-300">{formatAmount(0, currency)}</span>}
                              </td>
                            )}
                            {visibleColumns.credit && (
                              <td className="border border-gray-300 px-2 py-1.5 text-right text-xs truncate" title={formatAmount(line.credit, currency)}>
                                {toNumber(line.credit) ? formatAmount(line.credit, currency) : <span className="text-gray-300">{formatAmount(0, currency)}</span>}
                              </td>
                            )}
                            {visibleColumns.balance && (
                              <td className={`border border-gray-300 px-2 py-1.5 text-right text-xs truncate ${toNumber(runningBalance) < 0 ? 'text-red-600' : 'text-gray-700'}`} title={formatAmount(runningBalance, currency)}>
                                {formatAmount(runningBalance, currency)}
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
          </table>
        </div>

        {showColumnsMenu && (
          <div
            id="grand-livre-columns-menu"
            onMouseLeave={() => setShowColumnsMenu(false)}
            className="fixed bg-white border border-gray-300 shadow-lg rounded z-50"
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
                    disabled={column.id === 'account'}
                    onChange={() => setVisibleColumns((prev) => ({
                      ...prev,
                      [column.id]: !prev[column.id],
                    }))}
                    className="w-3.5 h-3.5 cursor-pointer disabled:cursor-not-allowed"
                  />
                  <span className={`text-xs ${column.id === 'account' ? 'text-gray-400' : 'text-gray-700'}`}>
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
            id="grand-livre-line-menu"
            onMouseLeave={() => setActiveLineMenu(null)}
            className="fixed bg-white border border-gray-300 shadow-lg rounded z-50"
            style={{
              top: lineMenuPosition.top,
              left: lineMenuPosition.left,
              width: '230px',
            }}
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
              Affichage {pageStart + 1} - {Math.min(pageStart + itemsPerPage, filteredResults.length)} sur {filteredResults.length} comptes
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setCurrentPage(1)}
                disabled={currentPage === 1}
                className="p-1 border border-gray-300 rounded hover:bg-white disabled:opacity-40"
              >
                <FiChevronsLeft size={13} />
              </button>
              <button
                onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
                disabled={currentPage === 1}
                className="p-1 border border-gray-300 rounded hover:bg-white disabled:opacity-40"
              >
                <FiChevronLeft size={13} />
              </button>
              <span className="px-2 text-gray-600">Page {currentPage} / {totalPages}</span>
              <button
                onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
                disabled={currentPage === totalPages}
                className="p-1 border border-gray-300 rounded hover:bg-white disabled:opacity-40"
              >
                <FiChevronRight size={13} />
              </button>
              <button
                onClick={() => setCurrentPage(totalPages)}
                disabled={currentPage === totalPages}
                className="p-1 border border-gray-300 rounded hover:bg-white disabled:opacity-40"
              >
                <FiChevronsRight size={13} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
