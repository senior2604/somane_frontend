// src/features/comptabilite/pages/payement/PaymentList.jsx
import { useCallback, useEffect, useMemo, useState } from 'react';
import { FiCheck, FiEye, FiPlus, FiX } from 'react-icons/fi';
import { useLocation, useNavigate } from 'react-router-dom';

import UnifiedIndexPage from '../../../../components/UnifiedIndexPage';
import axiosInstance from '../../../../config/axiosInstance';
import {
  getActionErrorMessage,
  getActiveEntityId,
  normalizeApiList,
  normalizeText,
} from './paymentShared.jsx';

const API = { payments: 'compta/payments/' };
const MEMORY_KEY = 'comptabilite:payments:index:v3';
const CACHE_KEY = 'somane:payments:list-cache:v2';
const DEFAULT_COLUMNS = [
  'date', 'number', 'type', 'partner', 'journal',
  'method', 'reference', 'amount', 'state',
];
const PAYMENT_TYPES = {
  inbound: 'Encaissement',
  outbound: 'Décaissement',
  transfer: 'Transfert',
};
const STATES = {
  draft: 'Brouillon',
  posted: 'Validé',
  cancel: 'Annulé',
  cancelled: 'Annulé',
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

const paymentNumber = (payment) => (
  payment.name && payment.name !== '/' ? payment.name : 'Brouillon'
);
const partnerLabel = (payment) => (
  payment.partner_name
  || payment.partner_id_label
  || payment.partner?.nom
  || payment.partner?.name
  || '-'
);
const journalLabel = (payment) => (
  payment.journal_name
  || payment.journal_id_label
  || payment.journal?.name
  || payment.journal?.code
  || '-'
);
const methodLabel = (payment) => (
  payment.payment_method_name
  || payment.payment_method_id_label
  || payment.payment_method?.name
  || '-'
);
const currencyCode = (payment) => (
  payment.currency_code
  || payment.currency?.code
  || payment.currency_id_label?.split(' - ')[0]
  || 'XOF'
);
const formatDate = (value) => {
  if (!value) return '-';
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? String(value).slice(0, 10)
    : date.toLocaleDateString('fr-FR');
};
const formatAmount = (payment) => (
  `${new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 2 }).format(Number(payment.amount || 0))} ${currencyCode(payment)}`
);

const StateBadge = ({ state }) => {
  const normalized = ['cancelled', 'canceled'].includes(state) ? 'cancel' : (state || 'draft');
  const colors = {
    posted: 'border-green-200 bg-green-50 text-green-700',
    cancel: 'border-red-200 bg-red-50 text-red-700',
    draft: 'border-amber-200 bg-amber-50 text-amber-700',
  };
  return (
    <span className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-semibold ${colors[normalized] || colors.draft}`}>
      {STATES[normalized] || normalized}
    </span>
  );
};

export default function PaymentList() {
  const navigate = useNavigate();
  const location = useLocation();
  const entityId = getActiveEntityId();
  const [payments, setPayments] = useState(readCache);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [stateFilter, setStateFilter] = useState('all');
  const [selectedIds, setSelectedIds] = useState([]);
  const [visibleColumns, setVisibleColumns] = useState(DEFAULT_COLUMNS);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const loadPayments = useCallback(async ({ silent = false } = {}) => {
    if (!silent && !payments.length) setLoading(true);
    setError('');
    try {
      const response = await axiosInstance.get(API.payments, {
        params: {
          company: entityId || undefined,
          company_id: entityId || undefined,
          page_size: 1000,
          ordering: '-payment_date,-id',
        },
      });
      const rows = normalizeApiList(response.data);
      setPayments(rows);
      writeCache(rows);
    } catch (requestError) {
      setError(getActionErrorMessage(requestError, 'Impossible de charger les paiements.'));
    } finally {
      setLoading(false);
    }
  }, [entityId, payments.length]);

  useEffect(() => {
    const returned = location.state?.createdRecord || location.state?.updatedRecord;
    if (returned?.id) {
      setPayments((current) => {
        const exists = current.some((row) => String(row.id) === String(returned.id));
        const rows = exists
          ? current.map((row) => String(row.id) === String(returned.id) ? returned : row)
          : [returned, ...current];
        writeCache(rows);
        return rows;
      });
    }
    loadPayments({ silent: payments.length > 0 });
  }, [loadPayments, location.state, payments.length]);

  const filteredRows = useMemo(() => {
    const query = normalizeText(search);
    return payments.filter((payment) => {
      if (typeFilter !== 'all' && payment.payment_type !== typeFilter) return false;
      if (stateFilter !== 'all') {
        const state = ['cancelled', 'canceled'].includes(payment.state)
          ? 'cancel'
          : (payment.state || 'draft');
        if (state !== stateFilter) return false;
      }
      if (!query) return true;
      return normalizeText([
        paymentNumber(payment),
        PAYMENT_TYPES[payment.payment_type],
        partnerLabel(payment),
        journalLabel(payment),
        methodLabel(payment),
        payment.reference,
        payment.ref,
        payment.amount,
        currencyCode(payment),
        STATES[payment.state],
      ].filter(Boolean).join(' ')).includes(query);
    });
  }, [payments, search, stateFilter, typeFilter]);

  const selectedRows = useMemo(() => {
    const ids = new Set(selectedIds.map(String));
    return payments.filter((payment) => ids.has(String(payment.id)));
  }, [payments, selectedIds]);

  const openPayment = useCallback((payment) => {
    navigate(`/comptabilite/paiements/${payment.id}`, {
      state: { paymentRecord: payment },
    });
  }, [navigate]);

  const runAction = useCallback(async (action) => {
    if (!selectedRows.length || actionLoading) return;
    const verb = action === 'validate' ? 'valider' : 'annuler';
    if (!window.confirm(`Voulez-vous ${verb} ${selectedRows.length} paiement(s) ?`)) return;
    setActionLoading(true);
    setError('');
    try {
      await Promise.all(selectedRows.map((payment) => (
        axiosInstance.post(`${API.payments}${payment.id}/${action}/`)
      )));
      setSelectedIds([]);
      setSuccess('Action effectuée avec succès.');
      await loadPayments({ silent: true });
    } catch (requestError) {
      setError(getActionErrorMessage(requestError, "Impossible d'exécuter cette action."));
    } finally {
      setActionLoading(false);
    }
  }, [actionLoading, loadPayments, selectedRows]);

  const columns = useMemo(() => [
    {
      id: 'date', label: 'Date', width: 105,
      value: (row) => row.payment_date,
      render: (value) => formatDate(value),
    },
    {
      id: 'number', label: 'N° Paiement', minWidth: 145,
      value: paymentNumber,
      render: (value) => <span className="font-semibold text-teal-700">{value}</span>,
    },
    {
      id: 'type', label: 'Type', minWidth: 120,
      value: (row) => PAYMENT_TYPES[row.payment_type] || row.payment_type || '-',
    },
    { id: 'partner', label: 'Partenaire', minWidth: 170, value: partnerLabel },
    { id: 'journal', label: 'Journal', minWidth: 130, value: journalLabel },
    { id: 'method', label: 'Méthode', minWidth: 150, value: methodLabel },
    {
      id: 'reference', label: 'Référence', minWidth: 135,
      value: (row) => row.reference || row.ref || '-',
    },
    {
      id: 'amount', label: 'Montant', minWidth: 145, numeric: true,
      value: (row) => Number(row.amount || 0),
      render: (_, row) => <span className="font-semibold tabular-nums">{formatAmount(row)}</span>,
    },
    {
      id: 'state', label: 'État', width: 105,
      value: (row) => STATES[row.state] || row.state,
      render: (_, row) => <StateBadge state={row.state} />,
    },
  ], []);

  const filterChips = useMemo(() => {
    const chips = [];
    if (typeFilter !== 'all') chips.push({ id: 'type', label: PAYMENT_TYPES[typeFilter] });
    if (stateFilter !== 'all') chips.push({ id: 'state', label: STATES[stateFilter] });
    return chips;
  }, [stateFilter, typeFilter]);

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
          <option value="inbound">Encaissements</option>
          <option value="outbound">Décaissements</option>
          <option value="transfer">Transferts</option>
        </select>
      </div>
      <div>
        <label className="mb-1 block font-semibold text-gray-700">État</label>
        <select
          value={stateFilter}
          onChange={(event) => { setStateFilter(event.target.value); setPage(1); }}
          className="h-9 w-full border border-gray-300 bg-white px-2 outline-none focus:border-purple-500"
        >
          <option value="all">Tous</option>
          <option value="draft">Brouillons</option>
          <option value="posted">Validés</option>
          <option value="cancel">Annulés</option>
        </select>
      </div>
    </div>
  ), [stateFilter, typeFilter]);

  const selectionActions = useMemo(() => [
    {
      id: 'view', label: 'Ouvrir', icon: <FiEye size={13} />,
      disabled: selectedRows.length !== 1,
      onClick: () => selectedRows[0] && openPayment(selectedRows[0]),
    },
    {
      id: 'validate', label: 'Valider', icon: <FiCheck size={13} />, variant: 'success',
      disabled: actionLoading || !selectedRows.some((row) => !row.state || row.state === 'draft'),
      onClick: () => runAction('validate'),
    },
    {
      id: 'cancel', label: 'Annuler', icon: <FiX size={13} />, variant: 'danger',
      disabled: actionLoading || !selectedRows.some((row) => row.state === 'posted'),
      onClick: () => runAction('cancel'),
    },
  ], [actionLoading, openPayment, runAction, selectedRows]);

  return (
    <UnifiedIndexPage
      title="Paiements"
      memoryKey={MEMORY_KEY}
      rows={filteredRows}
      rowKey="id"
      columns={columns}
      loading={loading && !payments.length}
      error={error}
      success={success}
      messageDuration={15000}
      onDismissError={() => setError('')}
      onDismissSuccess={() => setSuccess('')}
      emptyText="Aucun paiement"
      searchValue={search}
      onSearchChange={(value) => { setSearch(value); setPage(1); }}
      searchPlaceholder="Rechercher un paiement..."
      filterChips={filterChips}
      onRemoveFilterChip={(chip) => {
        if (chip.id === 'type') setTypeFilter('all');
        if (chip.id === 'state') setStateFilter('all');
        setPage(1);
      }}
      renderFilters={renderFilters}
      filterPanelWidth={440}
      primaryAction={{
        label: 'Nouveau paiement',
        icon: <FiPlus size={14} />,
        onClick: () => navigate('/comptabilite/paiements/create'),
      }}
      selectedRowKeys={selectedIds}
      onSelectionChange={setSelectedIds}
      selectionActions={selectionActions}
      renderSelectionSummary={() => `${selectedIds.length} paiement(s) sélectionné(s)`}
      onRowOpen={openPayment}
      page={page}
      onPageChange={setPage}
      pageSize={pageSize}
      onPageSizeChange={setPageSize}
      pageSizeOptions={[15, 25, 50, 100]}
      visibleColumnIds={visibleColumns}
      defaultVisibleColumnIds={DEFAULT_COLUMNS}
      onVisibleColumnsChange={setVisibleColumns}
      defaultSortColumn="date"
      defaultSortDirection="desc"
      footerText={`${filteredRows.length} paiement(s)`}
    />
  );
}
