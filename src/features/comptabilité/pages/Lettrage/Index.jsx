// src/features/comptabilite/pages/Lettrage/Index.jsx

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FiAlertCircle,
  FiCheck,
  FiChevronDown,
  FiChevronLeft,
  FiChevronRight,
  FiChevronsLeft,
  FiChevronsRight,
  FiFilter,
  FiMoreHorizontal,
  FiSearch,
  FiSettings,
  FiStar,
  FiX,
} from 'react-icons/fi';
import { useEntity } from '../../../../context/EntityContext';
import { apiClient } from '../../services';

const API = {
  moveLines: 'compta/move-lines/',
};

const DEFAULT_FILTERS = [];

const DEFAULT_GROUPS = ['account', 'partner'];

const GROUP_LABELS = {
  move: 'Écriture comptable',
  account: 'Compte',
  partner: 'Partenaire',
  journal: 'Journal',
  date: 'Date',
  invoiceDate: 'Date de facturation',
};

const COLUMN_DEFINITIONS = [
  { id: 'invoiceDate', label: 'Date de facturation', defaultVisible: false },
  { id: 'company', label: 'Société', defaultVisible: false },
  { id: 'date', label: 'Date', defaultVisible: true },
  { id: 'journal', label: 'Journal', defaultVisible: true },
  { id: 'move', label: 'Écriture comptable', defaultVisible: true },
  { id: 'account', label: 'Compte', defaultVisible: true },
  { id: 'partner', label: 'Partenaire', defaultVisible: true },
  { id: 'reference', label: 'Référence', defaultVisible: false },
  { id: 'product', label: 'Produit', defaultVisible: false },
  { id: 'label', label: 'Libellé', defaultVisible: true },
  { id: 'taxes', label: 'Taxes', defaultVisible: true },
  { id: 'taxGrid', label: 'Grilles fiscales', defaultVisible: false },
  { id: 'discountDate', label: 'Date de la remise', defaultVisible: false },
  { id: 'discountAmount', label: 'Montant de la remise', defaultVisible: false },
  { id: 'withholding', label: 'Taxe à la source', defaultVisible: false },
  { id: 'dueDate', label: 'Échéance', defaultVisible: false },
  { id: 'debit', label: 'Débit', defaultVisible: true, numeric: true },
  { id: 'credit', label: 'Crédit', defaultVisible: true, numeric: true },
  { id: 'balance', label: 'Solde', defaultVisible: true, numeric: true },
  { id: 'matching', label: 'Correspondant', defaultVisible: true },
  { id: 'residual', label: 'Résiduel', defaultVisible: true, numeric: true },
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

const asNumber = (value) => {
  const normalized = typeof value === 'string'
    ? value.replace(/\s/g, '').replace(',', '.').replace(/[^\d.-]/g, '')
    : value;
  const number = Number(normalized || 0);
  return Number.isNaN(number) ? 0 : number;
};

const formatDate = (value) => {
  if (!value) return '';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return '';
  return parsed.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
};

const formatAmount = (value, currencyCode = 'XOF') => {
  const number = Math.round(asNumber(value));
  return `${number.toLocaleString('fr-FR')} ${currencyCode || 'XOF'}`;
};

const getLineId = (line) => line?.id || `${line?.move || 'move'}-${line?.account || 'account'}-${line?.date || ''}-${line?.name || ''}`;

const getAccountCode = (line) => line?.account_code || line?.account?.code || '';
const getAccountName = (line) => line?.account_name || line?.account?.name || '';
const getJournalCode = (line) => line?.journal_code || line?.journal?.code || '';
const getJournalName = (line) => line?.journal_name || line?.journal?.name || '';
const getMoveName = (line) => line?.move_name || line?.move?.name || '';
const getMoveId = (line) => line?.move?.id || line?.move_id || line?.move || null;
const getPartnerId = (line) => line?.partner || line?.partner_id || line?.partner?.id || '';
const getPartnerName = (line) => (
  line?.partner_name ||
  line?.partner?.raison_sociale ||
  line?.partner?.nom ||
  line?.partner?.name ||
  ''
);
const getPartnerType = (line) => normalizeText(line?.partner_type || line?.partner?.type_partenaire || '');

const getObjectLabel = (value) => {
  if (!value) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'number') return '';
  return (
    value.name ||
    value.label ||
    value.display_name ||
    value.displayName ||
    value.code ||
    ''
  );
};

const inferTaxFromLineLabel = (line) => {
  const label = String(line?.name || '').trim();
  const normalized = normalizeText(label);

  if (line?.withholding_tax_name) return line.withholding_tax_name;
  if (asNumber(line?.withholding_amount)) return 'Retenue';
  if (normalized.includes('retenue')) return label;
  if (normalized.includes('tva')) return label;

  return '';
};

const getTaxes = (line) => {
  const names = [
    ...(Array.isArray(line?.tax_names) ? line.tax_names.map(getObjectLabel) : []),
    ...(Array.isArray(line?.tax_ids) ? line.tax_ids.map(getObjectLabel) : []),
    line?.tax_line_name,
    getObjectLabel(line?.tax_line),
    line?.tax_group_name,
    getObjectLabel(line?.tax_group),
    line?.withholding_tax_name,
    inferTaxFromLineLabel(line),
  ].filter(Boolean);
  return [...new Set(names)].join(', ');
};

const getTaxGrid = (line) => {
  const names = Array.isArray(line?.tax_tag_names) ? line.tax_tag_names : [];
  return names.filter(Boolean).join(', ');
};

const getReference = (line) => line?.move_ref || line?.invoice_origin || line?.reference || '';

const getMatching = (line) => {
  if (line?.matching_number) return line.matching_number;
  if (line?.full_reconcile_name) return line.full_reconcile_name;
  if ((line?.matched_credit_ids || []).length || (line?.matched_debit_ids || []).length) return 'Partiel';
  return '';
};

const getMoveState = (line) => normalizeText(line?.move_state || line?.move?.state || line?.state || '');

const isPosted = (line) => ['posted', 'post', 'valid', 'valide', 'comptabilise', 'comptabilisee'].includes(getMoveState(line));
const isFullyReconciled = (line) => Boolean(line?.full_reconcile_id || line?.full_reconcile_name);
const isLettableAccount = (line) => Boolean(
  line?.account_reconcile ||
  line?.is_account_reconcile ||
  line?.account?.reconcile
);
const isMatched = (line) => Boolean(
  isFullyReconciled(line) ||
  line?.reconciled ||
  line?.matching_number ||
  (line?.matched_credit_ids || []).length ||
  (line?.matched_debit_ids || []).length
);

const getLineBalance = (line) => {
  const debit = asNumber(line?.debit);
  const credit = asNumber(line?.credit);
  const storedBalance = asNumber(line?.balance);

  if (storedBalance !== 0 || (!debit && !credit)) return storedBalance;
  return debit - credit;
};

const getLineResidual = (line) => {
  const storedResidual = asNumber(line?.amount_residual);
  if (isFullyReconciled(line)) return 0;
  if (storedResidual) return Math.abs(storedResidual);
  if (line?.reconciled) return 0;
  return Math.abs(getLineBalance(line));
};

const hasResidual = (line) => getLineResidual(line) > 0;

const getSearchText = (line) => [
  formatDate(line?.date),
  formatDate(line?.invoice_date || line?.move_invoice_date),
  getJournalCode(line),
  getJournalName(line),
  getMoveName(line),
  getReference(line),
  getAccountCode(line),
  getAccountName(line),
  getPartnerName(line),
  line?.name,
  getTaxes(line),
  getTaxGrid(line),
  getMatching(line),
].filter(Boolean).join(' ');

const getColumnValue = (line, columnId) => {
  if (columnId === 'invoiceDate') return formatDate(line?.invoice_date || line?.move_invoice_date);
  if (columnId === 'company') return line?.company_name || '';
  if (columnId === 'date') return formatDate(line?.date);
  if (columnId === 'journal') return getJournalCode(line);
  if (columnId === 'move') return getMoveName(line);
  if (columnId === 'account') return [getAccountCode(line), getAccountName(line)].filter(Boolean).join(' ');
  if (columnId === 'partner') return getPartnerName(line);
  if (columnId === 'reference') return getReference(line);
  if (columnId === 'product') return line?.product_name || '';
  if (columnId === 'label') return line?.name || '';
  if (columnId === 'taxes') return getTaxes(line);
  if (columnId === 'taxGrid') return getTaxGrid(line);
  if (columnId === 'discountDate') return formatDate(line?.discount_date);
  if (columnId === 'discountAmount') return asNumber(line?.discount_amount_currency || line?.discount_balance || 0);
  if (columnId === 'withholding') return line?.withholding_tax_name || (asNumber(line?.withholding_amount) ? formatAmount(line?.withholding_amount, line?.currency_code) : '');
  if (columnId === 'dueDate') return formatDate(line?.date_maturity || line?.move_invoice_date_due);
  if (columnId === 'debit') return asNumber(line?.debit);
  if (columnId === 'credit') return asNumber(line?.credit);
  if (columnId === 'balance') return getLineBalance(line);
  if (columnId === 'matching') return getMatching(line);
  if (columnId === 'residual') return getLineResidual(line);
  return '';
};

const buildGroupKey = (line, groupId) => {
  if (groupId === 'account') {
    const code = getAccountCode(line) || 'Sans compte';
    const name = getAccountName(line);
    return {
      key: `account-${code}`,
      label: [code, name].filter(Boolean).join(' '),
      shortLabel: code,
      emptyLabel: 'Sans compte',
    };
  }
  if (groupId === 'partner') {
    const name = getPartnerName(line) || 'Sans partenaire';
    return { key: `partner-${name}`, label: name, shortLabel: name, emptyLabel: 'Sans partenaire' };
  }
  if (groupId === 'journal') {
    const code = getJournalCode(line) || 'Sans journal';
    const name = getJournalName(line);
    return { key: `journal-${code}`, label: [code, name].filter(Boolean).join(' '), shortLabel: code, emptyLabel: 'Sans journal' };
  }
  if (groupId === 'move') {
    const name = getMoveName(line) || 'Sans écriture';
    return { key: `move-${name}`, label: name, emptyLabel: 'Sans écriture' };
  }
  if (groupId === 'date') {
    const date = formatDate(line?.date) || 'Sans date';
    return { key: `date-${date}`, label: date, shortLabel: date, emptyLabel: 'Sans date' };
  }
  if (groupId === 'invoiceDate') {
    const date = formatDate(line?.invoice_date || line?.move_invoice_date) || 'Sans date de facturation';
    return { key: `invoice-date-${date}`, label: date, shortLabel: date, emptyLabel: 'Sans date de facturation' };
  }
  return { key: 'all', label: 'Toutes les ecritures', shortLabel: 'Toutes les ecritures', emptyLabel: 'Toutes les ecritures' };
};

const summarizeLines = (lines) => ({
  debit: lines.reduce((sum, line) => sum + asNumber(line?.debit), 0),
  credit: lines.reduce((sum, line) => sum + asNumber(line?.credit), 0),
  balance: lines.reduce((sum, line) => sum + getLineBalance(line), 0),
  residual: lines.reduce((sum, line) => sum + getLineResidual(line), 0),
});

const sortLinesForDisplay = (lines) => [...lines].sort((a, b) => {
  const dateCompare = String(b?.date || '').localeCompare(String(a?.date || ''));
  if (dateCompare) return dateCompare;

  const moveCompare = getMoveName(a).localeCompare(getMoveName(b), 'fr', { numeric: true });
  if (moveCompare) return moveCompare;

  const accountCompare = getAccountCode(a).localeCompare(getAccountCode(b), 'fr', { numeric: true });
  if (accountCompare) return accountCompare;

  const partnerCompare = getPartnerName(a).localeCompare(getPartnerName(b), 'fr', { numeric: true });
  if (partnerCompare) return partnerCompare;

  const sequenceCompare = asNumber(a?.sequence) - asNumber(b?.sequence);
  if (sequenceCompare) return sequenceCompare;

  return asNumber(a?.id) - asNumber(b?.id);
});

const createGroupTree = (lines, groupBy, depth = 0, parentKey = 'root') => {
  if (depth >= groupBy.length) return lines;
  const groupId = groupBy[depth];
  const map = new Map();

  lines.forEach((line) => {
    const group = buildGroupKey(line, groupId);
    const treeKey = `${parentKey}::${group.key}`;
    if (!map.has(treeKey)) {
      map.set(treeKey, {
        ...group,
        key: treeKey,
        rawKey: group.key,
        groupId,
        depth,
        lines: [],
      });
    }
    map.get(treeKey).lines.push(line);
  });

  return Array.from(map.values())
    .sort((a, b) => String(a.shortLabel || a.label || '').localeCompare(String(b.shortLabel || b.label || ''), 'fr', { numeric: true }))
    .map((group) => ({
      ...group,
      summary: summarizeLines(group.lines),
      children: createGroupTree(group.lines, groupBy, depth + 1, group.key),
    }));
};

const StatusPill = ({ children, color = 'gray' }) => {
  const colors = {
    purple: 'bg-purple-100 text-purple-700',
    teal: 'bg-teal-100 text-teal-700',
    green: 'bg-green-100 text-green-700',
    amber: 'bg-amber-100 text-amber-700',
    gray: 'bg-gray-100 text-gray-700',
  };
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${colors[color] || colors.gray}`}>
      {children}
    </span>
  );
};

function LettrageIndex() {
  const navigate = useNavigate();
  const { activeEntity } = useEntity();
  const filterRef = useRef(null);
  const actionsRef = useRef(null);
  const autoReconcileRef = useRef(null);

  const [lines, setLines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [reconciling, setReconciling] = useState(false);
  const [autoReconciling, setAutoReconciling] = useState(false);
  const [unreconciling, setUnreconciling] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [search, setSearch] = useState('');
  const [activeFilters, setActiveFilters] = useState(DEFAULT_FILTERS);
  const [groupBy, setGroupBy] = useState(DEFAULT_GROUPS);
  const [openGroups, setOpenGroups] = useState({});
  const [selectedIds, setSelectedIds] = useState([]);
  const [showFilters, setShowFilters] = useState(false);
  const [showColumns, setShowColumns] = useState(false);
  const [showActions, setShowActions] = useState(false);
  const [showAutoMenu, setShowAutoMenu] = useState(false);
  const [columnsMenuPosition, setColumnsMenuPosition] = useState({ top: 0, left: 0 });
  const [itemsPerPage, setItemsPerPage] = useState(50);
  const [currentPage, setCurrentPage] = useState(1);
  const [visibleColumns, setVisibleColumns] = useState(() => (
    COLUMN_DEFINITIONS.reduce((acc, column) => ({ ...acc, [column.id]: column.defaultVisible }), {})
  ));

  const fetchLines = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const entityId = activeEntity?.id;
      const response = await apiClient.get(API.moveLines, {
        params: {
          company: entityId || undefined,
          company_id: entityId || undefined,
          move__state: 'posted',
          account__reconcile: true,
          page_size: 2000,
          ordering: '-date,move__name,sequence,id',
          _refresh: Date.now(),
        },
      });
      setLines(normalizeApiList(response?.data ?? response));
      setSelectedIds([]);
      setOpenGroups({});
      setCurrentPage(1);
    } catch (err) {
      setLines([]);
      setError('Impossible de charger le lettrage.');
      console.error('Erreur chargement lettrage', err);
    } finally {
      setLoading(false);
    }
  }, [activeEntity?.id]);

  useEffect(() => {
    fetchLines();
  }, [fetchLines]);

  useEffect(() => {
    setGroupBy(DEFAULT_GROUPS);
  }, []);

  useEffect(() => {
    const onClickOutside = (event) => {
      if (filterRef.current && !filterRef.current.contains(event.target)) setShowFilters(false);
      if (actionsRef.current && !actionsRef.current.contains(event.target)) setShowActions(false);
      if (autoReconcileRef.current && !autoReconcileRef.current.contains(event.target)) setShowAutoMenu(false);
      const columnsMenuElement = document.getElementById('columns-menu');
      if (columnsMenuElement && !columnsMenuElement.contains(event.target)) {
        const buttonElement = document.querySelector('.columns-menu-button');
        if (buttonElement && !buttonElement.contains(event.target)) {
          setShowColumns(false);
        }
      }
    };
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [search, activeFilters, groupBy, itemsPerPage]);

  const hasFilter = (id) => activeFilters.some((filter) => filter.id === id);

  const toggleFilter = (filter) => {
    setActiveFilters((prev) => (
      prev.some((item) => item.id === filter.id)
        ? prev.filter((item) => item.id !== filter.id)
        : [...prev, filter]
    ));
  };

  const toggleGroup = (groupId) => {
    setGroupBy((prev) => (
      prev.includes(groupId)
        ? prev.filter((id) => id !== groupId)
        : [...prev, groupId]
    ));
  };

  const filteredLines = useMemo(() => {
    const showCompleteReconciliations = hasFilter('completeReconciled');
    let next = lines.filter((line) => (
      isPosted(line) &&
      isLettableAccount(line) &&
      (showCompleteReconciliations ? isFullyReconciled(line) : !isFullyReconciled(line))
    ));

    if (search.trim()) {
      const value = normalizeText(search);
      next = next.filter((line) => normalizeText(getSearchText(line)).includes(value));
    }

    activeFilters.forEach((filter) => {
      if (filter.id === 'unreconciled') next = next.filter((line) => !isMatched(line));
      if (filter.id === 'withResidual') next = next.filter(hasResidual);
      if (filter.id === 'completeReconciled') next = next.filter(isFullyReconciled);
      if (filter.id === 'supplier') next = next.filter((line) => getPartnerType(line).includes('fournisseur') || getAccountCode(line).startsWith('401'));
      if (filter.id === 'customer') next = next.filter((line) => getPartnerType(line).includes('client') || getAccountCode(line).startsWith('411'));
      if (filter.id === 'posted') next = next.filter(isPosted);
    });

    return next;
  }, [activeFilters, lines, search]);

  const sortedLines = useMemo(() => sortLinesForDisplay(filteredLines), [filteredLines]);
  const totalSummary = useMemo(() => summarizeLines(sortedLines), [sortedLines]);
  const totalPages = Math.max(1, Math.ceil(sortedLines.length / itemsPerPage));
  const safePage = Math.min(currentPage, totalPages);
  const pagedLines = sortedLines.slice((safePage - 1) * itemsPerPage, safePage * itemsPerPage);
  const groupTree = useMemo(() => createGroupTree(pagedLines, groupBy), [groupBy, pagedLines]);
  const activeVisibleColumns = COLUMN_DEFINITIONS.filter((column) => visibleColumns[column.id]);
  const selectedAllPage = pagedLines.length > 0 && pagedLines.every((line) => selectedIds.includes(getLineId(line)));
  const selectedLineIds = useMemo(() => (
    sortedLines
      .filter((line) => selectedIds.includes(getLineId(line)))
      .map((line) => line.id)
      .filter(Boolean)
  ), [selectedIds, sortedLines]);
  const selectedLines = useMemo(() => (
    sortedLines.filter((line) => selectedIds.includes(getLineId(line)))
  ), [selectedIds, sortedLines]);
  const selectedSummary = useMemo(() => summarizeLines(selectedLines), [selectedLines]);
  const canReconcileSelection = useMemo(() => {
    if (selectedLines.length < 2) return false;
    const accountIds = new Set(selectedLines.map((line) => line?.account || line?.account_id || getAccountCode(line)).filter(Boolean));
    const partnerIds = new Set(selectedLines.map((line) => getPartnerId(line) || getPartnerName(line)).filter(Boolean));
    const hasDebit = selectedLines.some((line) => asNumber(line?.debit) > 0);
    const hasCredit = selectedLines.some((line) => asNumber(line?.credit) > 0);
    const allPosted = selectedLines.every(isPosted);
    const allOpen = selectedLines.every((line) => !isFullyReconciled(line) && getLineResidual(line) > 0);
    return accountIds.size === 1 && partnerIds.size === 1 && hasDebit && hasCredit && allPosted && allOpen;
  }, [selectedLines]);

  const toggleOpenGroup = (key) => {
    setOpenGroups((prev) => ({ ...prev, [key]: !(prev[key] ?? true) }));
  };

  const toggleLineSelection = (id) => {
    setSelectedIds((prev) => (
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    ));
  };

  const handleReconcileSelected = async () => {
    if (selectedLineIds.length < 2) {
      setError('Selectionnez au moins deux lignes a lettrer.');
      setSuccess('');
      return;
    }

    setReconciling(true);
    setError('');
    setSuccess('');
    try {
      const response = await apiClient.post('compta/move-lines/reconcile/', {
        line_ids: selectedLineIds,
      });
      const data = response?.data ?? response ?? {};
      setSuccess(data?.detail || `Lettrage effectue${data?.matching_number ? ` (${data.matching_number})` : ''}.`);
      setSelectedIds([]);
      await fetchLines();
    } catch (err) {
      const detail = err?.response?.data?.detail || err?.data?.detail || err?.message || 'Echec du lettrage.';
      setError(detail);
      console.error('Erreur lettrage', err);
    } finally {
      setReconciling(false);
    }
  };

  const handleAutoReconcile = async (mode = 'amount') => {
    setAutoReconciling(true);
    setError('');
    setSuccess('');
    try {
      const response = await apiClient.post('compta/move-lines/auto-reconcile/', { mode });
      const data = response?.data ?? response ?? {};
      setSuccess(data?.detail || 'Lettrage automatique termine.');
      setSelectedIds([]);
      await fetchLines();
    } catch (err) {
      const detail = err?.response?.data?.detail || err?.data?.detail || err?.message || 'Echec du lettrage automatique.';
      setError(detail);
      console.error('Erreur lettrage automatique', err);
    } finally {
      setAutoReconciling(false);
    }
  };

  const handleUnreconcileSelected = async () => {
    if (!selectedLineIds.length) {
      setError('Selectionnez au moins une ligne a delettrer.');
      setSuccess('');
      return;
    }

    setUnreconciling(true);
    setError('');
    setSuccess('');
    try {
      const response = await apiClient.post('compta/move-lines/unreconcile/', {
        line_ids: selectedLineIds,
      });
      const data = response?.data ?? response ?? {};
      setSuccess(data?.detail || 'Delettrage effectue.');
      setSelectedIds([]);
      await fetchLines();
    } catch (err) {
      const detail = err?.response?.data?.detail || err?.data?.detail || err?.message || 'Echec du delettrage.';
      setError(detail);
      console.error('Erreur delettrage', err);
    } finally {
      setUnreconciling(false);
    }
  };

  const renderAmount = (columnId, value, line) => {
    if (!['debit', 'credit', 'balance', 'residual', 'discountAmount'].includes(columnId)) return value || '';
    return formatAmount(value, line?.currency_code);
  };

  const renderCell = (line, column) => {
    const value = getColumnValue(line, column.id);
    if (column.id === 'move') {
      const moveId = getMoveId(line);
      return (
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            if (moveId) navigate(`/comptabilite/pieces/${moveId}`);
          }}
          className="text-left font-medium text-teal-700 hover:text-purple-700 hover:underline"
        >
          {value || '-'}
        </button>
      );
    }
    if (column.id === 'matching') {
      if (!value) return <span className="text-gray-400">Non lettré</span>;
      return <StatusPill color={String(value).toLowerCase() === 'partiel' ? 'amber' : 'teal'}>{value}</StatusPill>;
    }
    if (column.id === 'account') {
      return (
        <div>
          <div className="font-medium text-gray-900">{getAccountCode(line) || '-'}</div>
          {getAccountName(line) && <div className="text-[11px] text-gray-500">{getAccountName(line)}</div>}
        </div>
      );
    }
    if (column.id === 'taxes' || column.id === 'taxGrid') {
      return value || <span className="text-gray-400">-</span>;
    }
    if (column.numeric) return renderAmount(column.id, value, line);
    return value || '';
  };

  const renderGroupRows = (nodes, depth = 0) => nodes.flatMap((node) => {
    if (Array.isArray(node)) return node.map((line) => renderLineRow(line, depth));
    if (!node || !Array.isArray(node.lines) || !Array.isArray(node.children)) {
      return renderLineRow(node, depth);
    }

    const open = openGroups[node.key] ?? true;
    const summary = node.summary || summarizeLines(node.lines);
    const groupLabel = GROUP_LABELS[node.groupId] || node.groupId || 'Groupe';
    const groupIndent = depth * 22;
    const rows = [
      <tr key={node.key} className={depth === 0 ? 'bg-gray-50' : 'bg-white'}>
        <td className="border-r border-gray-200 px-2 py-1.5" />
        <td colSpan={Math.max(1, activeVisibleColumns.length + 1)} className="border-r border-gray-200 px-2 py-1.5">
          <div className="flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => toggleOpenGroup(node.key)}
              className="flex min-w-0 items-center gap-2 text-left"
              style={{ paddingLeft: groupIndent }}
            >
              {open ? <FiChevronDown size={14} /> : <FiChevronRight size={14} />}
              <span className={`rounded px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide ${depth === 0 ? 'bg-purple-100 text-purple-700' : 'bg-teal-100 text-teal-700'}`}>
                {groupLabel}
              </span>
              <span className={`font-semibold ${depth === 0 ? 'text-gray-900' : 'text-gray-700'}`}>
                {node.label || node.emptyLabel} ({node.lines.length})
              </span>
            </button>
            <div className="hidden items-center gap-5 text-xs font-semibold text-gray-700 lg:flex">
              <span>Débit {formatAmount(summary.debit)}</span>
              <span>Crédit {formatAmount(summary.credit)}</span>
              <span>Solde {formatAmount(summary.balance)}</span>
              <span>Résiduel {formatAmount(summary.residual)}</span>
            </div>
          </div>
        </td>
      </tr>,
    ];
    if (open) rows.push(...renderGroupRows(node.children || [], depth + 1));
    return rows;
  });

  const renderLineRow = (line, lineDepth = 0) => {
    if (!line) return null;
    const id = getLineId(line);
    const selected = selectedIds.includes(id);
    return (
      <tr
        key={id}
        onClick={() => toggleLineSelection(id)}
        className={`cursor-pointer border-b border-gray-200 ${selected ? 'bg-purple-50' : 'hover:bg-purple-50/40'}`}
      >
        <td className="border-r border-gray-200 px-2 py-1.5 text-center">
          <input
            type="checkbox"
            checked={selected}
            onClick={(event) => event.stopPropagation()}
            onChange={(event) => {
              setSelectedIds((prev) => (
                event.target.checked ? [...prev, id] : prev.filter((item) => item !== id)
              ));
            }}
            className="h-3.5 w-3.5 cursor-pointer accent-teal-700"
          />
        </td>
        {activeVisibleColumns.map((column, index) => (
          <td
            key={`${id}-${column.id}`}
            className={`border-r border-gray-200 px-2 py-1.5 text-xs text-gray-700 ${column.numeric ? 'text-right tabular-nums' : 'text-left'}`}
            style={index === 0 && lineDepth > 0 ? { paddingLeft: 12 + (lineDepth * 18) } : undefined}
          >
            {renderCell(line, column)}
          </td>
        ))}
        <td className="border-r border-gray-200 px-2 py-1.5" />
      </tr>
    );
  };

  if (loading && !lines.length) {
    return (
      <div className="min-h-screen bg-gray-50 p-4">
        <div className="mx-auto max-w-full border border-gray-300 bg-white">
          <div className="border-b border-gray-300 px-4 py-3">
            <h1 className="text-lg font-bold text-gray-900">Lettrage des comptes</h1>
          </div>
          <div className="flex items-center justify-center p-8">
            <div className="text-center">
              <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-purple-600 border-t-transparent" />
              <p className="mt-4 text-sm text-gray-600">Chargement...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="mx-auto max-w-full border border-gray-300 bg-white">
        <div className="border-b border-gray-300 px-4 py-2">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="relative" ref={autoReconcileRef}>
                <button
                  type="button"
                  onClick={() => setShowAutoMenu((value) => !value)}
                  disabled={autoReconciling}
                  className="inline-flex h-8 items-center gap-2 rounded bg-purple-600 px-3 text-xs font-medium text-white transition hover:bg-purple-700 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  <FiStar size={12} className={autoReconciling ? 'animate-pulse' : ''} />
                  {autoReconciling ? 'Lettrage auto...' : 'Lettrage automatique'}
                  <FiChevronDown size={12} />
                </button>
                {showAutoMenu && (
                  <div className="absolute left-0 z-50 mt-1 w-52 rounded border border-gray-300 bg-white py-1 shadow-lg">
                    <button
                      type="button"
                      onClick={() => {
                        setShowAutoMenu(false);
                        handleAutoReconcile('amount');
                      }}
                      className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs hover:bg-gray-50"
                    >
                      <FiCheck size={12} /> Par montant
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowAutoMenu(false);
                        handleAutoReconcile('reference');
                      }}
                      className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs hover:bg-gray-50"
                    >
                      <FiSearch size={12} /> Par référence
                    </button>
                  </div>
                )}
              </div>
              <button
                type="button"
                onClick={fetchLines}
                className="text-lg font-bold text-gray-900 transition hover:text-purple-700"
              >
                Lettrage des comptes
              </button>
              <div className="relative" ref={actionsRef}>
                <button
                  type="button"
                  onClick={() => setShowActions((value) => !value)}
                  className="flex h-8 w-8 items-center justify-center rounded-full border border-gray-300 text-gray-700 transition hover:bg-gray-50"
                  title="Actions"
                >
                  <FiSettings size={14} />
                </button>
                {showActions && (
                  <div className="absolute left-0 z-50 mt-1 w-52 rounded border border-gray-300 bg-white py-1 shadow-lg">
                    <button
                      type="button"
                      onClick={() => {
                        setShowActions(false);
                        handleReconcileSelected();
                      }}
                      disabled={reconciling || selectedLineIds.length < 2}
                      className="hidden"
                    >
                      <FiCheck size={12} className={reconciling ? 'animate-pulse' : ''} />
                      {reconciling ? 'Lettrage...' : 'Lettrer la sélection'}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowActions(false);
                        handleUnreconcileSelected();
                      }}
                      disabled={unreconciling || selectedLineIds.length < 1}
                      className="hidden"
                    >
                      <FiX size={12} className={unreconciling ? 'animate-pulse' : ''} />
                      {unreconciling ? 'Delettrage...' : 'Délettrer la sélection'}
                    </button>
                  </div>
                )}
              </div>
            </div>

            <div className="flex min-w-[320px] flex-1 justify-center">
              <div className="relative w-full max-w-4xl" ref={filterRef}>
                <div className="flex min-h-[38px] items-center gap-1 rounded border border-gray-300 bg-white p-1">
                  <FiSearch size={16} className="ml-2 text-gray-500" />
                  {activeFilters.map((filter) => (
                    <span key={filter.id} className="inline-flex items-center gap-1 rounded bg-gray-100 px-2 py-1 text-xs text-gray-700">
                      {filter.label}
                      <button type="button" onClick={() => toggleFilter(filter)} className="text-gray-500 hover:text-red-600">
                        <FiX size={12} />
                      </button>
                    </span>
                  ))}
                  {groupBy.map((id, index) => (
                    <span key={id} className="inline-flex items-center gap-1 rounded bg-teal-100 px-2 py-1 text-xs text-teal-700">
                      {index > 0 && <span className="text-teal-500">&gt;</span>}
                      {GROUP_LABELS[id] || COLUMN_DEFINITIONS.find((column) => column.id === id)?.label || id}
                      <button type="button" onClick={() => setGroupBy((prev) => prev.filter((groupId) => groupId !== id))} className="text-teal-700 hover:text-red-600">
                        <FiX size={12} />
                      </button>
                    </span>
                  ))}
                  <input
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Rechercher..."
                    className="min-w-[140px] flex-1 px-2 py-1 text-sm outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowFilters((value) => !value)}
                    className={`rounded p-1.5 ${showFilters ? 'bg-gray-100 text-purple-700' : 'text-gray-500 hover:bg-gray-100'}`}
                    title="Filtres"
                  >
                    <FiFilter size={15} />
                  </button>
                </div>

                {showFilters && (
                  <div className="absolute right-0 z-50 mt-1 w-72 rounded border border-gray-300 bg-white shadow-lg">
                    <div className="border-b border-gray-200 p-2">
                      <p className="mb-2 text-xs font-medium text-gray-700">Ajouter un filtre</p>
                      <div className="space-y-1">
                        {[
                          { id: 'unreconciled', label: 'Non lettré' },
                          { id: 'withResidual', label: 'Avec résidus' },
                          { id: 'completeReconciled', label: 'Lettrages complets' },
                          { id: 'supplier', label: 'Fournisseur' },
                          { id: 'customer', label: 'Client' },
                          { id: 'posted', label: 'Comptabilisé' },
                        ].map((filter) => (
                          <button
                            key={filter.id}
                            type="button"
                            onClick={() => toggleFilter({ ...filter, type: 'filter' })}
                            className="flex w-full items-center gap-2 rounded px-2 py-1 text-left text-xs hover:bg-gray-100"
                          >
                            <span className="w-4 text-purple-600">{hasFilter(filter.id) ? '✓' : ''}</span>
                            <span>{filter.label}</span>
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="border-b border-gray-200 p-2">
                      <p className="mb-2 text-xs font-medium text-gray-700">Regrouper par</p>
                      <div className="space-y-1">
                        {[
                          { id: 'move', label: 'Écriture comptable' },
                          { id: 'account', label: 'Compte' },
                          { id: 'partner', label: 'Partenaire' },
                          { id: 'journal', label: 'Journal' },
                          { id: 'date', label: 'Date' },
                          { id: 'invoiceDate', label: 'Date de facturation' },
                        ].map((group) => (
                          <button
                            key={group.id}
                            type="button"
                            onClick={() => toggleGroup(group.id)}
                            className="flex w-full items-center gap-2 rounded px-2 py-1 text-left text-xs hover:bg-gray-100"
                          >
                            <span className="w-4 text-purple-600">{groupBy.includes(group.id) ? '✓' : ''}</span>
                            <span>{group.label}</span>
                          </button>
                        ))}
                      </div>
                    </div>

                    {(activeFilters.length > 0 || search.trim() || groupBy.join('|') !== DEFAULT_GROUPS.join('|')) && (
                      <div className="p-2">
                        <button
                          type="button"
                          onClick={() => {
                            setActiveFilters([]);
                            setGroupBy(DEFAULT_GROUPS);
                            setSearch('');
                            setShowFilters(false);
                          }}
                          className="w-full py-1 text-center text-xs text-red-600 hover:text-red-700"
                        >
                          Effacer les filtres
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500">Afficher</span>
              <select
                value={itemsPerPage}
                onChange={(event) => setItemsPerPage(Number(event.target.value))}
                className="h-8 rounded border border-gray-300 px-2 text-xs outline-none focus:ring-1 focus:ring-purple-500"
              >
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
                <option value={200}>200</option>
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
          {success && (
            <div className="mt-2 flex items-center gap-2 rounded border border-green-200 bg-green-50 px-3 py-2 text-xs text-green-700">
              <FiCheck size={14} />
              {success}
            </div>
          )}

          {selectedLines.length > 0 && (
            <div className="border-b border-gray-300 bg-gray-50 px-4 py-2 flex items-center gap-2 text-xs">
              <div className="flex flex-wrap items-center gap-2 text-gray-700">
                <span className="text-xs text-gray-600">{selectedLines.length} opération(s) sélectionnée(s)</span>
                <span>Débit {formatAmount(selectedSummary.debit)}</span>
                <span>Crédit {formatAmount(selectedSummary.credit)}</span>
                <span>Solde {formatAmount(selectedSummary.balance)}</span>
                {!canReconcileSelection && selectedLines.length >= 2 && (
                  <span className="text-amber-700">Sélectionnez des lignes du même compte avec un débit et un crédit.</span>
                )}
              </div>
              <div className="flex items-center gap-2">
                {canReconcileSelection && (
                  <button
                    type="button"
                    onClick={handleReconcileSelected}
                    disabled={reconciling}
                    className="h-6 px-2 bg-green-600 text-white text-xs hover:bg-green-700 rounded disabled:opacity-50"
                  >
                    {reconciling ? 'Lettrage...' : 'Lettrer'}
                  </button>
                )}
                <button
                  type="button"
                  onClick={handleUnreconcileSelected}
                  disabled={unreconciling || selectedLineIds.length < 1}
                  className="h-6 px-2 bg-red-600 text-white text-xs hover:bg-red-700 rounded disabled:opacity-50"
                >
                  {unreconciling ? 'Délettrage...' : 'Délettrer'}
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedIds([])}
                  className="h-6 px-2 border border-gray-300 bg-white text-gray-700 text-xs hover:bg-gray-100 rounded"
                >
                  Annuler
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="border-b border-gray-300 bg-gray-50 px-4 py-2">
          <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-gray-700">
            <div className="flex flex-wrap items-center gap-2">
              <StatusPill color="purple">{filteredLines.length} ligne(s)</StatusPill>
              {selectedIds.length > 0 && <StatusPill color="purple">{selectedIds.length} sélectionnée(s)</StatusPill>}
            </div>

            <div className="flex flex-wrap items-center justify-end gap-2">
              <StatusPill color="green">Débit {formatAmount(totalSummary.debit)}</StatusPill>
              <StatusPill color="green">Crédit {formatAmount(totalSummary.credit)}</StatusPill>
              <StatusPill color="teal">Solde {formatAmount(totalSummary.balance)}</StatusPill>
              <StatusPill color="amber">Résiduel {formatAmount(totalSummary.residual)}</StatusPill>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-gray-300 bg-gray-100">
                <th className="w-8 border-r border-gray-300 px-2 py-1.5 text-center">
                  <input
                    type="checkbox"
                    checked={selectedAllPage}
                    onChange={(event) => setSelectedIds(event.target.checked ? pagedLines.map(getLineId) : [])}
                    className="h-3.5 w-3.5 cursor-pointer accent-teal-700"
                  />
                </th>
                {activeVisibleColumns.map((column) => (
                  <th
                    key={column.id}
                    className={`border-r border-gray-300 px-2 py-1.5 text-xs font-medium text-gray-700 ${column.numeric ? 'text-right' : 'text-left'}`}
                  >
                    {column.label}
                  </th>
                ))}
                <th className="w-10 border-r border-gray-300 px-1 py-1.5 text-center">
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      const rect = event.currentTarget.getBoundingClientRect();
                      setColumnsMenuPosition({
                        top: rect.bottom + window.scrollY + 5,
                        left: rect.right + window.scrollX - 260,
                      });
                      setShowColumns((value) => !value);
                    }}
                    className="columns-menu-button inline-flex h-7 w-7 items-center justify-center rounded text-gray-600 hover:bg-gray-200 hover:text-purple-700"
                    title="Afficher / masquer les colonnes"
                  >
                    <FiMoreHorizontal size={16} />
                  </button>
                </th>
              </tr>
            </thead>
            <tbody>
              {pagedLines.length === 0 ? (
                <tr>
                  <td colSpan={activeVisibleColumns.length + 2} className="px-4 py-12 text-center text-sm text-gray-500">
                    Aucune ligne à lettrer
                  </td>
                </tr>
              ) : groupBy.length ? (
                renderGroupRows(groupTree)
              ) : (
                pagedLines.map((line) => renderLineRow(line))
              )}
            </tbody>
          </table>
        </div>

        <div className="border-t border-gray-300 bg-gray-50 px-4 py-2">
          <div className="flex items-center justify-between">
            <div className="text-xs text-gray-600">
              Page {safePage} sur {totalPages}
            </div>
            <div className="flex items-center gap-1">
              <button type="button" onClick={() => setCurrentPage(1)} disabled={safePage === 1} className="rounded border border-gray-300 p-1 disabled:opacity-40">
                <FiChevronsLeft size={14} />
              </button>
              <button type="button" onClick={() => setCurrentPage((page) => Math.max(1, page - 1))} disabled={safePage === 1} className="rounded border border-gray-300 p-1 disabled:opacity-40">
                <FiChevronLeft size={14} />
              </button>
              <button type="button" onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))} disabled={safePage === totalPages} className="rounded border border-gray-300 p-1 disabled:opacity-40">
                <FiChevronRight size={14} />
              </button>
              <button type="button" onClick={() => setCurrentPage(totalPages)} disabled={safePage === totalPages} className="rounded border border-gray-300 p-1 disabled:opacity-40">
                <FiChevronsRight size={14} />
              </button>
            </div>
          </div>
        </div>

        {showColumns && (
          <div
            id="columns-menu"
            className="fixed z-50 rounded border border-gray-300 bg-white shadow-lg"
            style={{ top: columnsMenuPosition.top, left: columnsMenuPosition.left, width: '260px' }}
          >
            <div className="border-b border-gray-200 p-2">
              <p className="mb-2 text-xs font-medium text-gray-700">Colonnes à afficher</p>
              <div className="max-h-[360px] overflow-y-auto">
                {COLUMN_DEFINITIONS.map((column) => (
                  <label key={column.id} className="flex cursor-pointer items-center gap-2 rounded px-2 py-1 text-xs hover:bg-gray-100">
                    <input
                      type="checkbox"
                      checked={Boolean(visibleColumns[column.id])}
                      onChange={(event) => setVisibleColumns((prev) => ({ ...prev, [column.id]: event.target.checked }))}
                      className="h-3.5 w-3.5 accent-purple-600"
                    />
                    <span>{column.label}</span>
                  </label>
                ))}
              </div>
            </div>
            <div className="p-2">
              <button type="button" className="w-full rounded px-2 py-1 text-left text-xs text-gray-700 hover:bg-gray-100">
                + Ajouter un champ personnalisé
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default LettrageIndex;
