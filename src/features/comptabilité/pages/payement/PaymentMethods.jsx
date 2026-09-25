// src/features/comptabilite/pages/payement/PaymentMethods.jsx
import { useCallback, useEffect, useMemo, useState } from 'react';
import { FiEye, FiPlus, FiPower, FiTrash2 } from 'react-icons/fi';
import { useLocation, useNavigate } from 'react-router-dom';

import UnifiedIndexPage from '../../../../components/UnifiedIndexPage';
import axiosInstance from '../../../../config/axiosInstance';
import {
  getActionErrorMessage,
  getActiveEntityId,
  normalizeApiList,
  normalizeText,
} from './paymentShared.jsx';

const API = { methods: 'compta/payment-methods/' };
const MEMORY_KEY = 'comptabilite:payment-methods:index:v3';
const CACHE_KEY = 'somane:payment-methods:list-cache:v3';
const DEFAULT_COLUMNS = [
  'name', 'code', 'payment_type', 'receipts_account', 'payments_account', 'active',
];
const PAYMENT_TYPES = {
  inbound: 'Encaissement',
  outbound: 'Décaissement',
  both: 'Encaissement et décaissement',
};

const readCache = () => {
  try {
    const parsed = JSON.parse(sessionStorage.getItem(CACHE_KEY) || 'null');
    return Array.isArray(parsed?.rows) ? parsed.rows : [];
  } catch {
    return [];
  }
};

const writeCache = (rows) => {
  try {
    sessionStorage.setItem(CACHE_KEY, JSON.stringify({ rows, savedAt: Date.now() }));
  } catch {}
};

const relationCode = (method, type) => {
  const prefix = type === 'receipts' ? 'outstanding_receipts' : 'outstanding_payments';
  const account = method[`${prefix}_account`];
  return method[`${prefix}_account_code`]
    || account?.code
    || method[`${prefix}_account_id_label`]
    || '-';
};

const StatusBadge = ({ active }) => (
  <span className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-semibold ${
    active
      ? 'border-green-200 bg-green-50 text-green-700'
      : 'border-gray-300 bg-gray-100 text-gray-600'
  }`}>
    {active ? 'Active' : 'Inactive'}
  </span>
);

export default function PaymentMethods() {
  const navigate = useNavigate();
  const location = useLocation();
  const entityId = getActiveEntityId();
  const [methods, setMethods] = useState(readCache);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedIds, setSelectedIds] = useState([]);
  const [visibleColumns, setVisibleColumns] = useState(DEFAULT_COLUMNS);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const loadMethods = useCallback(async ({ silent = false } = {}) => {
    if (!silent && !methods.length) setLoading(true);
    setError('');
    try {
      const response = await axiosInstance.get(API.methods, {
        params: {
          company: entityId || undefined,
          company_id: entityId || undefined,
          page_size: 1000,
          ordering: 'name,code',
        },
      });
      const rows = normalizeApiList(response.data);
      setMethods(rows);
      writeCache(rows);
    } catch (requestError) {
      setError(getActionErrorMessage(
        requestError,
        'Impossible de charger les méthodes de paiement.',
      ));
    } finally {
      setLoading(false);
    }
  }, [entityId, methods.length]);

  useEffect(() => {
    const returned = location.state?.createdRecord || location.state?.updatedRecord;
    if (returned?.id) {
      setMethods((current) => {
        const exists = current.some((row) => String(row.id) === String(returned.id));
        const rows = exists
          ? current.map((row) => (String(row.id) === String(returned.id) ? returned : row))
          : [returned, ...current];
        writeCache(rows);
        return rows;
      });
    }
    loadMethods({ silent: methods.length > 0 });
  }, [loadMethods, location.state, methods.length]);

  const filteredRows = useMemo(() => {
    const query = normalizeText(search);
    return methods.filter((method) => {
      if (typeFilter !== 'all' && method.payment_type !== typeFilter) return false;
      if (statusFilter === 'active' && method.active === false) return false;
      if (statusFilter === 'inactive' && method.active !== false) return false;
      if (!query) return true;
      return normalizeText([
        method.name,
        method.code,
        PAYMENT_TYPES[method.payment_type],
        relationCode(method, 'receipts'),
        relationCode(method, 'payments'),
        method.active === false ? 'inactive' : 'active',
      ].filter(Boolean).join(' ')).includes(query);
    });
  }, [methods, search, statusFilter, typeFilter]);

  const selectedRows = useMemo(() => {
    const ids = new Set(selectedIds.map(String));
    return methods.filter((method) => ids.has(String(method.id)));
  }, [methods, selectedIds]);

  const openMethod = useCallback((method) => {
    navigate(`/comptabilite/methodes-paiement/${method.id}`, {
      state: { methodRecord: method },
    });
  }, [navigate]);

  const setSelectedActive = useCallback(async (active) => {
    if (!selectedRows.length || actionLoading) return;
    setActionLoading(true);
    setError('');
    try {
      const responses = await Promise.all(selectedRows.map((method) => (
        axiosInstance.patch(`${API.methods}${method.id}/`, { active })
      )));
      const updated = new Map(
        responses.map((response) => [String(response.data.id), response.data]),
      );
      setMethods((current) => {
        const rows = current.map((method) => updated.get(String(method.id)) || method);
        writeCache(rows);
        return rows;
      });
      setSelectedIds([]);
      setSuccess(active
        ? 'Méthode(s) activée(s) avec succès.'
        : 'Méthode(s) désactivée(s) avec succès.');
    } catch (requestError) {
      setError(getActionErrorMessage(
        requestError,
        "Impossible de modifier l'état des méthodes sélectionnées.",
      ));
    } finally {
      setActionLoading(false);
    }
  }, [actionLoading, selectedRows]);

  const deleteSelected = useCallback(async () => {
    if (!selectedRows.length || actionLoading) return;
    if (!window.confirm(`Supprimer ${selectedRows.length} méthode(s) de paiement ?`)) return;
    setActionLoading(true);
    setError('');
    try {
      await Promise.all(selectedRows.map((method) => (
        axiosInstance.delete(`${API.methods}${method.id}/`)
      )));
      const removed = new Set(selectedRows.map((method) => String(method.id)));
      setMethods((current) => {
        const rows = current.filter((method) => !removed.has(String(method.id)));
        writeCache(rows);
        return rows;
      });
      setSelectedIds([]);
      setSuccess('Méthode(s) supprimée(s) avec succès.');
    } catch (requestError) {
      setError(getActionErrorMessage(
        requestError,
        'Impossible de supprimer les méthodes sélectionnées.',
      ));
    } finally {
      setActionLoading(false);
    }
  }, [actionLoading, selectedRows]);

  const columns = useMemo(() => [
    {
      id: 'name', label: 'Méthode de paiement', minWidth: 190,
      value: (row) => row.name || '-',
      render: (value) => <span className="font-semibold text-teal-700">{value}</span>,
    },
    { id: 'code', label: 'Code', width: 120, value: (row) => row.code || '-' },
    {
      id: 'payment_type', label: 'Type de paiement', minWidth: 180,
      value: (row) => PAYMENT_TYPES[row.payment_type] || row.payment_type || '-',
    },
    {
      id: 'receipts_account', label: 'Compte des encaissements', minWidth: 190,
      value: (row) => relationCode(row, 'receipts'),
    },
    {
      id: 'payments_account', label: 'Compte des décaissements', minWidth: 190,
      value: (row) => relationCode(row, 'payments'),
    },
    {
      id: 'active', label: 'Statut', width: 105,
      value: (row) => row.active !== false,
      render: (_, row) => <StatusBadge active={row.active !== false} />,
    },
  ], []);

  const filterChips = useMemo(() => {
    const chips = [];
    if (typeFilter !== 'all') {
      chips.push({ id: 'type', label: PAYMENT_TYPES[typeFilter] || typeFilter });
    }
    if (statusFilter !== 'all') {
      chips.push({ id: 'status', label: statusFilter === 'active' ? 'Actives' : 'Inactives' });
    }
    return chips;
  }, [statusFilter, typeFilter]);

  const renderFilters = useCallback(() => (
    <div className="grid grid-cols-2 gap-4 p-4 text-xs">
      <div>
        <label className="mb-1 block font-semibold text-gray-700">Type de paiement</label>
        <select
          value={typeFilter}
          onChange={(event) => { setTypeFilter(event.target.value); setPage(1); }}
          className="h-9 w-full border border-gray-300 bg-white px-2 outline-none focus:border-purple-500"
        >
          <option value="all">Tous</option>
          <option value="inbound">Encaissement</option>
          <option value="outbound">Décaissement</option>
          <option value="both">Encaissement et décaissement</option>
        </select>
      </div>
      <div>
        <label className="mb-1 block font-semibold text-gray-700">Statut</label>
        <select
          value={statusFilter}
          onChange={(event) => { setStatusFilter(event.target.value); setPage(1); }}
          className="h-9 w-full border border-gray-300 bg-white px-2 outline-none focus:border-purple-500"
        >
          <option value="all">Tous</option>
          <option value="active">Actives</option>
          <option value="inactive">Inactives</option>
        </select>
      </div>
    </div>
  ), [statusFilter, typeFilter]);

  const selectionActions = useMemo(() => [
    {
      id: 'open', label: 'Ouvrir', icon: <FiEye size={13} />,
      disabled: selectedRows.length !== 1,
      onClick: () => selectedRows[0] && openMethod(selectedRows[0]),
    },
    {
      id: 'activate', label: 'Activer', icon: <FiPower size={13} />,
      disabled: actionLoading || !selectedRows.some((row) => row.active === false),
      onClick: () => setSelectedActive(true),
    },
    {
      id: 'deactivate', label: 'Désactiver', icon: <FiPower size={13} />,
      disabled: actionLoading || !selectedRows.some((row) => row.active !== false),
      onClick: () => setSelectedActive(false),
    },
    {
      id: 'delete', label: 'Supprimer', icon: <FiTrash2 size={13} />, variant: 'danger',
      disabled: actionLoading,
      onClick: deleteSelected,
    },
  ], [actionLoading, deleteSelected, openMethod, selectedRows, setSelectedActive]);

  return (
    <UnifiedIndexPage
      title="Méthodes de paiement"
      memoryKey={MEMORY_KEY}
      rows={filteredRows}
      rowKey="id"
      columns={columns}
      loading={loading && !methods.length}
      error={error}
      success={success}
      messageDuration={15000}
      onDismissError={() => setError('')}
      onDismissSuccess={() => setSuccess('')}
      emptyText="Aucune méthode de paiement"
      searchValue={search}
      onSearchChange={(value) => { setSearch(value); setPage(1); }}
      searchPlaceholder="Rechercher une méthode de paiement..."
      filterChips={filterChips}
      onRemoveFilterChip={(chip) => {
        if (chip.id === 'type') setTypeFilter('all');
        if (chip.id === 'status') setStatusFilter('all');
        setPage(1);
      }}
      renderFilters={renderFilters}
      filterPanelWidth={440}
      primaryAction={{
        label: 'Nouvelle méthode',
        icon: <FiPlus size={14} />,
        onClick: () => navigate('/comptabilite/methodes-paiement/create'),
      }}
      selectedRowKeys={selectedIds}
      onSelectionChange={setSelectedIds}
      selectionActions={selectionActions}
      renderSelectionSummary={() => `${selectedIds.length} méthode(s) sélectionnée(s)`}
      onRowOpen={openMethod}
      page={page}
      onPageChange={setPage}
      pageSize={pageSize}
      onPageSizeChange={setPageSize}
      pageSizeOptions={[15, 25, 50, 100]}
      visibleColumnIds={visibleColumns}
      defaultVisibleColumnIds={DEFAULT_COLUMNS}
      onVisibleColumnsChange={setVisibleColumns}
      defaultSortColumn="name"
      defaultSortDirection="asc"
      footerText={`${filteredRows.length} méthode(s)`}
    />
  );
}
