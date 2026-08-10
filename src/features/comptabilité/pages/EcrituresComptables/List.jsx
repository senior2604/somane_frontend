// src/features/comptabilité/pages/EcrituresComptables/List.jsx

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  FiCheck,
  FiPlus,
  FiRefreshCw,
  FiX,
} from 'react-icons/fi';
import UnifiedIndexPage from '../../../../components/UnifiedIndexPage';
import { useEntity } from '../../../../context/EntityContext';
import { apiClient } from '../../services';

const API = { moveLines: 'compta/move-lines/' };
const MEMORY_KEY = 'comptabilite:ecritures:index:v1';
const DEFAULT_COLUMNS = [
  'date', 'piece', 'journal', 'account', 'partner',
  'label', 'debit', 'credit', 'reconcile', 'state',
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
  return parsed.toLocaleDateString('fr-FR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
  });
};

const formatAmount = (value, currency = 'XOF') => {
  const amount = Number(value || 0);
  const formatted = Number.isFinite(amount)
    ? Math.round(amount).toLocaleString('fr-FR')
    : '0';
  return `${formatted} ${currency || 'XOF'}`;
};

const getObjectId = (value) => (typeof value === 'object' ? value?.id : value);

const getMoveId = (line) => getObjectId(
  line?.move?.id
  || line?.move_id
  || line?.move
  || line?.move_detail?.id
  || line?.moveDetail?.id,
);

const getMoveName = (line) => (
  line?.move_name
  || line?.move?.name
  || line?.move_detail?.name
  || line?.moveDetail?.name
  || line?.piece_name
  || line?.pieceName
  || '—'
);

const getJournalCode = (line) => (
  line?.journal_code
  || line?.journal?.code
  || line?.journal_detail?.code
  || line?.move?.journal?.code
  || line?.move_detail?.journal?.code
  || '—'
);

const getJournalName = (line) => (
  line?.journal_name
  || line?.journal?.name
  || line?.journal_detail?.name
  || line?.move?.journal?.name
  || line?.move_detail?.journal?.name
  || ''
);

const getAccountId = (line) => getObjectId(
  line?.account?.id || line?.account_id || line?.account_detail?.id || line?.accountDetail?.id,
);

const getAccountCode = (line) => (
  line?.account_code
  || line?.account?.code
  || line?.account_detail?.code
  || line?.accountDetail?.code
  || '—'
);

const getAccountName = (line) => (
  line?.account_name
  || line?.account?.name
  || line?.account_detail?.name
  || line?.accountDetail?.name
  || ''
);

const getPartnerName = (line) => (
  line?.partner_name
  || line?.partner?.displayName
  || line?.partner?.raison_sociale
  || line?.partner?.nom
  || line?.partner?.name
  || line?.partner_detail?.displayName
  || line?.partner_detail?.nom
  || line?.partnerDetail?.name
  || '—'
);

const getLineState = (line) => (
  line?.move_state || line?.move?.state || line?.move_detail?.state || line?.state || ''
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
  if (['posted', 'post', 'valid', 'valide', 'validated', 'comptabilise', 'comptabilisee'].includes(value)) return 'bg-emerald-100 text-emerald-700';
  if (['cancel', 'cancelled', 'canceled', 'annule', 'annulee'].includes(value)) return 'bg-red-100 text-red-700';
  if (['deleted', 'delete', 'supprime', 'supprimee'].includes(value)) return 'bg-slate-200 text-slate-700';
  return 'bg-amber-100 text-amber-700';
};

const getReconcileLabel = (line) => {
  if (line?.reconciled || line?.full_reconcile_id || line?.full_reconcile_name || line?.full_reconcile) return 'Lettré';
  if ((line?.matched_credit_ids || []).length || (line?.matched_debit_ids || []).length) return 'Partiel';
  return 'Non lettré';
};

const getReconcileClass = (line) => {
  const value = getReconcileLabel(line);
  if (value === 'Lettré') return 'bg-emerald-100 text-emerald-700';
  if (value === 'Partiel') return 'bg-amber-100 text-amber-700';
  return 'bg-slate-100 text-slate-600';
};

const getLineId = (line) => line?.id || `${getMoveId(line) || 'move'}-${getAccountId(line) || 'account'}-${line?.date || ''}-${line?.name || ''}`;

const getSearchText = (line) => [
  line?.date, getMoveName(line), getJournalCode(line), getJournalName(line),
  getAccountCode(line), getAccountName(line), getPartnerName(line), line?.name,
  getReconcileLabel(line), getStateLabel(getLineState(line)),
].filter(Boolean).join(' ');

const getErrorMessage = (error, fallback) => {
  const data = error?.response?.data;
  if (typeof data?.detail === 'string') return data.detail;
  if (typeof data === 'string' && data.trim()) return data;
  return error?.message || fallback;
};

export default function EcrituresComptablesList() {
  const navigate = useNavigate();
  const location = useLocation();
  const { activeEntity } = useEntity();
  const moveIdFilter = useMemo(
    () => new URLSearchParams(location.search).get('move_id'),
    [location.search],
  );

  const [lines, setLines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [activeFilters, setActiveFilters] = useState([]);
  const [selectedIds, setSelectedIds] = useState([]);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);
  const [total, setTotal] = useState(0);
  const [visibleColumnIds, setVisibleColumnIds] = useState(DEFAULT_COLUMNS);
  const requestIdRef = useRef(0);

  const loadLines = useCallback(async () => {
    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;
    setLoading(true);
    setError('');
    try {
      const entityId = activeEntity?.id;
      const stateFilter = activeFilters.find((filter) => filter.field === 'state')?.value;
      const response = await apiClient.get(API.moveLines, {
        params: {
          company: entityId || undefined,
          company_id: entityId || undefined,
          move_id: moveIdFilter || undefined,
          page,
          page_size: pageSize,
          search: search.trim() || undefined,
          state: stateFilter || undefined,
          ordering: '-date,-id',
        },
      });
      if (requestId !== requestIdRef.current) return;
      const payload = response?.data ?? response;
      const nextLines = normalizeApiList(payload);
      setLines(nextLines);
      setTotal(Number(payload?.count ?? payload?.total ?? nextLines.length));
      setSelectedIds([]);
    } catch (requestError) {
      if (requestId !== requestIdRef.current) return;
      setLines([]);
      setTotal(0);
      setError(getErrorMessage(requestError, 'Impossible de charger les écritures comptables.'));
    } finally {
      if (requestId === requestIdRef.current) setLoading(false);
    }
  }, [activeEntity?.id, activeFilters, moveIdFilter, page, pageSize, search]);

  useEffect(() => {
    const delay = search.trim() ? 250 : 0;
    const timer = window.setTimeout(() => { void loadLines(); }, delay);
    return () => window.clearTimeout(timer);
  }, [loadLines, search]);

  useEffect(() => { setPage(1); }, [search, activeFilters, moveIdFilter, pageSize]);

  const clearMoveFilter = useCallback(() => {
    const params = new URLSearchParams(location.search);
    params.delete('move_id');
    navigate(`/comptabilite/ecritures${params.toString() ? `?${params.toString()}` : ''}`, { replace: true });
  }, [location.search, navigate]);

  const addFilter = useCallback((field, value, label) => {
    setActiveFilters((current) => current.some((item) => item.field === field && item.value === value)
      ? current
      : [...current, { id: `${field}:${value}`, field, value, label }]);
  }, []);

  const removeFilter = useCallback((id) => {
    if (id === 'move') {
      clearMoveFilter();
      return;
    }
    setActiveFilters((current) => current.filter((item) => item.id !== id));
  }, [clearMoveFilter]);

  const filteredLines = useMemo(() => lines.filter((line) => {
    if (moveIdFilter && String(getMoveId(line)) !== String(moveIdFilter)) return false;
    if (search.trim() && !normalizeText(getSearchText(line)).includes(normalizeText(search))) return false;
    return activeFilters.every((filter) => {
      if (filter.field === 'state') return normalizeText(getLineState(line)) === filter.value;
      if (filter.field === 'reconcile') return normalizeText(getReconcileLabel(line)) === filter.value;
      return true;
    });
  }), [activeFilters, lines, moveIdFilter, search]);

  const columns = useMemo(() => [
    { id: 'date', label: 'Date comptable', width: 132, minWidth: 110, value: (line) => line?.date || '', render: (_, line) => <span>{formatDate(line?.date)}</span> },
    {
      id: 'piece', label: 'N° Pièce', width: 155, minWidth: 120, value: getMoveName,
      render: (_, line) => {
        const moveId = getMoveId(line);
        return moveId ? <button type="button" className="font-medium text-teal-700 hover:text-purple-700 hover:underline" onClick={(event) => { event.stopPropagation(); navigate(`/comptabilite/pieces/${moveId}`); }}>{getMoveName(line)}</button> : '—';
      },
    },
    { id: 'journal', label: 'Journal', width: 110, minWidth: 90, value: (line) => `${getJournalCode(line)} ${getJournalName(line)}`, render: (_, line) => <div className="min-w-0" title={`${getJournalCode(line)} - ${getJournalName(line)}`}><div className="truncate font-medium">{getJournalCode(line)}</div>{getJournalName(line) && <div className="truncate text-[11px] text-gray-500">{getJournalName(line)}</div>}</div> },
    {
      id: 'account', label: 'Compte', width: 190, minWidth: 145, value: (line) => `${getAccountCode(line)} ${getAccountName(line)}`,
      render: (_, line) => {
        const accountId = getAccountId(line);
        return <div className="min-w-0" title={`${getAccountCode(line)} - ${getAccountName(line)}`}><button type="button" disabled={!accountId} onClick={(event) => { event.stopPropagation(); if (accountId) navigate(`/comptabilite/accounts/${accountId}`); }} className="block truncate font-semibold text-teal-700 hover:text-purple-700 hover:underline disabled:text-gray-700 disabled:no-underline">{getAccountCode(line)}</button>{getAccountName(line) && <div className="truncate text-[11px] text-gray-500">{getAccountName(line)}</div>}</div>;
      },
    },
    { id: 'partner', label: 'Partenaire', width: 170, minWidth: 120, value: getPartnerName, render: (value) => <span className="block truncate" title={value}>{value}</span> },
    { id: 'label', label: 'Libellé', width: 235, minWidth: 140, value: (line) => line?.name || '', render: (value) => <span className="block truncate" title={value}>{value || '—'}</span> },
    { id: 'debit', label: 'Débit', width: 145, minWidth: 120, align: 'right', value: (line) => Number(line?.debit || 0), render: (value, line) => <span className="whitespace-nowrap">{formatAmount(value, line?.currency_code || line?.currency?.name)}</span> },
    { id: 'credit', label: 'Crédit', width: 145, minWidth: 120, align: 'right', value: (line) => Number(line?.credit || 0), render: (value, line) => <span className="whitespace-nowrap">{formatAmount(value, line?.currency_code || line?.currency?.name)}</span> },
    { id: 'reconcile', label: 'Lettrage', width: 115, minWidth: 95, value: getReconcileLabel, render: (_, line) => <span className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium ${getReconcileClass(line)}`}>{getReconcileLabel(line)}</span> },
    { id: 'state', label: 'État', width: 120, minWidth: 95, value: (line) => getStateLabel(getLineState(line)), render: (_, line) => <span className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium ${getStateClass(getLineState(line))}`}>{getStateLabel(getLineState(line))}</span> },
  ], [navigate]);

  const filteredMoveName = useMemo(() => {
    if (!moveIdFilter) return '';
    const line = lines.find((item) => String(getMoveId(item)) === String(moveIdFilter));
    return line ? getMoveName(line) : '';
  }, [lines, moveIdFilter]);

  const filterChips = useMemo(() => [
    ...(moveIdFilter ? [{
      id: 'move',
      label: `Pièce : ${filteredMoveName || moveIdFilter}`,
      className: 'bg-purple-100 text-purple-700',
    }] : []),
    ...activeFilters.map((filter) => ({ id: filter.id, label: filter.label })),
  ], [activeFilters, filteredMoveName, moveIdFilter]);

  const renderFilters = useCallback(({ close }) => (
    <div className="text-sm text-gray-700">
      <div className="flex items-center justify-between border-b border-gray-200 px-3 py-2"><span className="font-semibold">Filtres des écritures</span><button type="button" onClick={close} className="p-1 text-gray-500 hover:text-red-600"><FiX size={15} /></button></div>
      <div className="p-2 space-y-1">
        <p className="px-2 pt-1 text-xs font-semibold uppercase tracking-wide text-gray-500">État</p>
        {[['draft', 'Brouillon'], ['posted', 'Comptabilisé'], ['cancel', 'Annulé'], ['deleted', 'Supprimé']].map(([value, label]) => <button key={value} type="button" onClick={() => { addFilter('state', value, label); close(); }} className="block w-full rounded px-2 py-1.5 text-left hover:bg-purple-50 hover:text-purple-700">{label}</button>)}
        <p className="px-2 pt-3 text-xs font-semibold uppercase tracking-wide text-gray-500">Lettrage</p>
        {[['non lettre', 'Non lettré'], ['partiel', 'Partiel'], ['lettre', 'Lettré']].map(([value, label]) => <button key={value} type="button" onClick={() => { addFilter('reconcile', value, label); close(); }} className="block w-full rounded px-2 py-1.5 text-left hover:bg-purple-50 hover:text-purple-700">{label}</button>)}
      </div>
    </div>
  ), [addFilter]);

  return <UnifiedIndexPage
    title="Écritures comptables"
    memoryKey={MEMORY_KEY}
    rows={filteredLines}
    columns={columns}
    rowKey={getLineId}
    loading={loading}
    error={error}
    onDismissError={() => setError('')}
    emptyText={moveIdFilter ? 'Aucune écriture comptable pour cette pièce' : 'Aucune écriture comptable'}
    searchValue={search}
    onSearchChange={setSearch}
    searchPlaceholder="Rechercher..."
    filterChips={filterChips}
    onRemoveFilterChip={removeFilter}
    renderFilters={renderFilters}
    filterPanelWidth={360}
    primaryAction={{ label: 'Nouvelle pièce', icon: <FiPlus size={14} />, onClick: () => navigate('/comptabilite/pieces/create') }}
    trailingActions={[{ id: 'refresh', label: '', title: 'Actualiser la liste', icon: <FiRefreshCw size={15} className={loading ? 'animate-spin' : ''} />, onClick: loadLines, disabled: loading, className: 'w-9 justify-center px-0' }]}
    selectedRowKeys={selectedIds}
    onSelectionChange={setSelectedIds}
    renderSelectionSummary={(selectedRows) => <span><FiCheck className="mr-1 inline" size={13} />{selectedRows.length} sélectionnée(s)</span>}
    onRowDoubleClick={(line) => { const moveId = getMoveId(line); if (moveId) navigate(`/comptabilite/pieces/${moveId}`); }}
    page={page}
    onPageChange={setPage}
    pageSize={pageSize}
    onPageSizeChange={(nextPageSize) => { setPage(1); setPageSize(nextPageSize); }}
    pageSizeOptions={[10, 15, 25, 50, 100]}
    total={total}
    serverSide
    visibleColumnIds={visibleColumnIds}
    onVisibleColumnsChange={setVisibleColumnIds}
    defaultVisibleColumnIds={DEFAULT_COLUMNS}
    defaultSortColumn="date"
    defaultSortDirection="desc"
    footerText={`${total} écriture(s)`}
  />;
}
