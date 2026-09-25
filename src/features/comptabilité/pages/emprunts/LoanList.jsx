// src/features/comptabilite/pages/emprunts/LoanList.jsx
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { FiAlertCircle, FiCheck, FiEye, FiPlus, FiRefreshCw, FiTrash2, FiX } from 'react-icons/fi';
import { useLocation, useNavigate } from 'react-router-dom';

import UnifiedIndexPage from '../../../../components/UnifiedIndexPage';
import axiosInstance from '../../../../config/axiosInstance';
import {
  getActionErrorMessage,
  getActiveEntityId,
  normalizeApiList,
  normalizeText,
} from '../payement/paymentShared.jsx';

const API = { loans: 'compta/loans/' };
const MEMORY_KEY = 'comptabilite:loans:index:v1';
const CACHE_KEY = 'somane:loans:list-cache:v1';
const debugLoanList = (message, details) => {
  if (typeof process !== 'undefined' && process.env?.NODE_ENV === 'production') return;
  if (details === undefined) console.log(`[Emprunts][Liste] ${message}`);
  else console.log(`[Emprunts][Liste] ${message}`, details);
};
const DEFAULT_COLUMNS = [
  'name', 'partner', 'amount', 'declared_total_interest', 'periodicity',
  'start_date', 'maturity_date', 'payment_amount', 'state',
];

const STATES = {
  draft: 'Brouillon',
  in_progress: 'En cours',
  closed: 'Clôturé',
  cancelled: 'Annulé',
};
const normalizeLoanState = (state) => {
  const value = String(state || 'draft').trim().toLowerCase();
  if (['confirmed', 'in_progress', 'validated', 'posted'].includes(value)) return 'in_progress';
  if (['cancel', 'canceled', 'cancelled'].includes(value)) return 'cancelled';
  if (value === 'closed') return 'closed';
  return 'draft';
};
const loanStateLabel = (state) => STATES[normalizeLoanState(state)];
const PERIODICITIES = {
  monthly: 'Mois',
  bimonthly: 'Deux mois',
  quarterly: 'Trimestre',
  semiannual: 'Semestre',
  annual: 'Année',
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

const formatDate = (value) => {
  if (!value) return '-';
  const date = new Date(`${String(value).slice(0, 10)}T00:00:00`);
  return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleDateString('fr-FR');
};

const formatMoney = (value, currency = 'XOF') => (
  `${new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 2 }).format(Number(value || 0))} ${currency || 'XOF'}`
);

const partnerLabel = (loan) => (
  loan.partner_name
  || loan.partner?.raison_sociale
  || loan.partner?.nom
  || loan.partner?.name
  || '-'
);

const StateBadge = ({ state }) => {
  const normalizedState = normalizeLoanState(state);
  const styles = {
    draft: 'border-amber-200 bg-amber-50 text-amber-700',
    in_progress: 'border-green-200 bg-green-50 text-green-700',
    closed: 'border-blue-200 bg-blue-50 text-blue-700',
    cancelled: 'border-red-200 bg-red-50 text-red-700',
  };
  return (
    <span className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-semibold ${styles[normalizedState]}`}>
      {STATES[normalizedState]}
    </span>
  );
};

export default function LoanList() {
  const navigate = useNavigate();
  const location = useLocation();
  const entityId = getActiveEntityId();
  const [loans, setLoans] = useState(readCache);
  const loansRef = useRef(loans);
  const [search, setSearch] = useState('');
  const [stateFilter, setStateFilter] = useState('all');
  const [partnerFilter, setPartnerFilter] = useState('all');
  const [selectedIds, setSelectedIds] = useState([]);
  const [visibleColumns, setVisibleColumns] = useState(DEFAULT_COLUMNS);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [pendingAction, setPendingAction] = useState(null);

  useEffect(() => {
    loansRef.current = loans;
  }, [loans]);

  const loadLoans = useCallback(async ({ silent = false } = {}) => {
    debugLoanList('Chargement de la liste demandé', {
      silent,
      entityId,
      currentPath: window.location.pathname,
      cachedRows: loansRef.current.length,
    });
    if (!silent && !loansRef.current.length) setLoading(true);
    setError('');
    try {
      const response = await axiosInstance.get(API.loans, {
        params: {
          company: entityId || undefined,
          company_id: entityId || undefined,
          page_size: 1000,
          ordering: '-created_at,-id',
        },
      });
      const rows = normalizeApiList(response.data);
      debugLoanList('Réponse API de la liste reçue', {
        status: response.status,
        rows: rows.length,
        firstRow: rows[0] || null,
      });
      setLoans(rows);
      writeCache(rows);
    } catch (requestError) {
      debugLoanList('Erreur API pendant le chargement de la liste', {
        message: getActionErrorMessage(requestError, 'Erreur inconnue'),
        status: requestError?.response?.status,
        response: requestError?.response?.data,
      });
      setError(getActionErrorMessage(requestError, 'Impossible de charger les emprunts.'));
    } finally {
      setLoading(false);
    }
  }, [entityId]);

  useEffect(() => {
    const returned = location.state?.createdRecord || location.state?.updatedRecord;
    debugLoanList('Index des emprunts monté ou actualisé', {
      currentPath: location.pathname,
      navigationStateKeys: Object.keys(location.state || {}),
      returnedId: returned?.id || returned?.pk || null,
      cachedRows: loans.length,
    });
    const returnedId = returned?.id || returned?.pk;
    if (returnedId) {
      setLoans((current) => {
        const exists = current.some((row) => String(row.id || row.pk) === String(returnedId));
        const rows = exists
          ? current.map((row) => String(row.id || row.pk) === String(returnedId) ? returned : row)
          : [returned, ...current];
        writeCache(rows);
        return rows;
      });
    }
    loadLoans({ silent: loansRef.current.length > 0 });
  }, [loadLoans, location.pathname, location.state]);

  const partners = useMemo(() => {
    const map = new Map();
    loans.forEach((loan) => {
      const id = loan.partner?.id || loan.partner;
      if (id) map.set(String(id), partnerLabel(loan));
    });
    return Array.from(map, ([id, label]) => ({ id, label })).sort((a, b) => a.label.localeCompare(b.label));
  }, [loans]);

  const filteredRows = useMemo(() => {
    const query = normalizeText(search);
    return loans.filter((loan) => {
      if (stateFilter !== 'all' && normalizeLoanState(loan.state) !== stateFilter) return false;
      const partnerId = loan.partner?.id || loan.partner;
      if (partnerFilter !== 'all' && String(partnerId) !== String(partnerFilter)) return false;
      if (!query) return true;
      return normalizeText([
        loan.name, partnerLabel(loan), loan.company_name, loan.currency_code,
        loan.journal_name, loan.loan_amount, loan.declared_total_interest,
        loan.rate, loan.total_interest,
        loan.outstanding_balance, loan.duration,
        PERIODICITIES[loan.periodicity], loanStateLabel(loan.state),
      ].filter(Boolean).join(' ')).includes(query);
    });
  }, [loans, partnerFilter, search, stateFilter]);

  const selectedRows = useMemo(() => {
    const ids = new Set(selectedIds.map(String));
    return loans.filter((loan) => ids.has(String(loan.id)));
  }, [loans, selectedIds]);

  const openLoan = useCallback((loan) => {
    const loanId = loan?.id || loan?.pk;
    debugLoanList('Ouverture d’un emprunt depuis la liste', {
      loanId: loanId || null,
      loanName: loan?.name || null,
    });
    if (!loanId) {
      debugLoanList('Ouverture impossible : identifiant absent', { loan });
      return;
    }
    const navigationDraft = location.state?.draftSchedule
      ? {
        draftSchedule: true,
        draftScheduleId: location.state.draftScheduleId || loanId,
        draftScheduleIncomplete: Boolean(location.state.draftScheduleIncomplete),
        draftLines: Array.isArray(location.state.draftLines) ? location.state.draftLines : [],
        draftAccruals: Array.isArray(location.state.draftAccruals) ? location.state.draftAccruals : [],
        draftAccountMaps: Array.isArray(location.state.draftAccountMaps) ? location.state.draftAccountMaps : [],
      }
      : {};
    navigate(`/comptabilite/emprunts/${loanId}`, {
      state: { loanRecord: loan, ...navigationDraft },
    });
  }, [location.state, navigate]);

  const executeSelectedState = useCallback(async (state, eligible) => {
    setPendingAction(null);
    setActionLoading(true);
    setError('');
    try {
      const endpointByState = {
        in_progress: 'confirm',
        draft: 'draft',
        closed: 'close',
        cancelled: 'cancel',
      };
      await Promise.all(
        eligible.map((loan) => axiosInstance.post(
          `${API.loans}${loan.id}/${endpointByState[state]}/`,
        )),
      );
      setSelectedIds([]);
      setSuccess('État des emprunts mis à jour.');
      await loadLoans({ silent: true });
    } catch (requestError) {
      setError(getActionErrorMessage(requestError, "Impossible de modifier l'état des emprunts."));
    } finally {
      setActionLoading(false);
    }
  }, [loadLoans]);

  const patchSelectedState = useCallback((state) => {
    if (!selectedRows.length || actionLoading) return;
    const allowedSources = {
      in_progress: ['draft'],
      draft: ['in_progress', 'cancelled'],
      closed: ['in_progress'],
      cancelled: ['draft', 'in_progress'],
    };
    const eligible = selectedRows.filter((loan) => (
      allowedSources[state]?.includes(normalizeLoanState(loan.state))
    ));
    if (!eligible.length) return;
    const label = STATES[state]?.toLowerCase() || state;
    setPendingAction({
      title: STATES[state] || 'Confirmer l’action',
      message: `Passer ${eligible.length} emprunt(s) à l'état « ${label} » ?`,
      danger: state === 'cancelled',
      onConfirm: () => executeSelectedState(state, eligible),
    });
  }, [actionLoading, executeSelectedState, selectedRows]);

  const executeDeleteSelected = useCallback(async (deletable) => {
    setPendingAction(null);
    setActionLoading(true);
    setError('');
    try {
      await Promise.all(deletable.map((loan) => axiosInstance.delete(`${API.loans}${loan.id}/`)));
      const removed = new Set(deletable.map((loan) => String(loan.id)));
      setLoans((current) => {
        const rows = current.filter((loan) => !removed.has(String(loan.id)));
        writeCache(rows);
        return rows;
      });
      setSelectedIds([]);
      setSuccess('Emprunt(s) supprimé(s).');
    } catch (requestError) {
      setError(getActionErrorMessage(requestError, 'Impossible de supprimer les emprunts.'));
    } finally {
      setActionLoading(false);
    }
  }, []);

  const deleteSelected = useCallback(() => {
    const deletable = selectedRows.filter((loan) => normalizeLoanState(loan.state) === 'draft');
    if (!deletable.length || actionLoading) return;
    setPendingAction({
      title: 'Supprimer les emprunts',
      message: `Supprimer définitivement ${deletable.length} emprunt(s) brouillon ?`,
      danger: true,
      onConfirm: () => executeDeleteSelected(deletable),
    });
  }, [actionLoading, executeDeleteSelected, selectedRows]);

  const columns = useMemo(() => [
    {
      id: 'name', label: 'N° / Emprunt', minWidth: 170,
      value: (row) => row.name || `Emprunt ${row.id}`,
      render: (value) => <span className="font-semibold text-teal-700">{value}</span>,
    },
    { id: 'partner', label: 'Prêteur', minWidth: 190, value: partnerLabel },
    {
      id: 'amount', label: 'Montant emprunté', minWidth: 160, numeric: true,
      value: (row) => Number(row.loan_amount || 0),
      render: (_, row) => <span className="font-semibold tabular-nums">{formatMoney(row.loan_amount, row.currency_code)}</span>,
    },
    {
      id: 'declared_total_interest', label: 'Total des intérêts', minWidth: 155, numeric: true,
      value: (row) => Number(row.declared_total_interest ?? row.rate ?? 0),
      render: (_, row) => formatMoney(row.declared_total_interest ?? row.rate, row.currency_code),
    },
    {
      id: 'total_interest', label: 'Intérêts calculés', minWidth: 155, numeric: true,
      value: (row) => Number(row.total_interest || 0),
      render: (_, row) => formatMoney(row.total_interest, row.currency_code),
    },
    {
      id: 'outstanding_balance', label: 'Solde impayé', minWidth: 155, numeric: true,
      value: (row) => Number(row.outstanding_balance ?? row.loan_amount ?? 0),
      render: (_, row) => formatMoney(row.outstanding_balance ?? row.loan_amount, row.currency_code),
    },
    { id: 'periodicity', label: 'Périodicité', width: 125, value: (row) => PERIODICITIES[row.periodicity] || row.periodicity || '-' },
    {
      id: 'duration', label: 'Durée', width: 90, numeric: true,
      value: (row) => Number(row.duration_periods ?? row.installment_num ?? row.duration ?? 0),
      render: (value) => String(value),
    },
    { id: 'start_date', label: 'Date de début', width: 115, value: (row) => row.start_date, render: formatDate },
    { id: 'maturity_date', label: "Date d'échéance", width: 125, value: (row) => row.maturity_date, render: formatDate },
    {
      id: 'payment_amount', label: 'Échéance', minWidth: 145, numeric: true,
      value: (row) => Number(row.payment_amount || 0),
      render: (_, row) => formatMoney(row.payment_amount, row.currency_code),
    },
    { id: 'journal', label: 'Journal', minWidth: 135, value: (row) => row.journal_name || '-' },
    { id: 'state', label: 'État', width: 105, value: (row) => loanStateLabel(row.state), render: (_, row) => <StateBadge state={row.state} /> },
  ], []);

  const filterChips = useMemo(() => {
    const chips = [];
    if (stateFilter !== 'all') chips.push({ id: 'state', label: STATES[stateFilter] });
    if (partnerFilter !== 'all') chips.push({ id: 'partner', label: partners.find((item) => item.id === partnerFilter)?.label || 'Prêteur' });
    return chips;
  }, [partnerFilter, partners, stateFilter]);

  const renderFilters = useCallback(() => (
    <div className="grid grid-cols-1 gap-4 p-4 text-xs sm:grid-cols-2">
      <div>
        <label className="mb-1 block font-semibold text-gray-700">État</label>
        <select value={stateFilter} onChange={(event) => { setStateFilter(event.target.value); setPage(1); }} className="h-9 w-full border border-gray-300 bg-white px-2 outline-none focus:border-purple-500">
          <option value="all">Tous les états</option>
          {Object.entries(STATES).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </select>
      </div>
      <div>
        <label className="mb-1 block font-semibold text-gray-700">Prêteur</label>
        <select value={partnerFilter} onChange={(event) => { setPartnerFilter(event.target.value); setPage(1); }} className="h-9 w-full border border-gray-300 bg-white px-2 outline-none focus:border-purple-500">
          <option value="all">Tous les prêteurs</option>
          {partners.map((partner) => <option key={partner.id} value={partner.id}>{partner.label}</option>)}
        </select>
      </div>
    </div>
  ), [partnerFilter, partners, stateFilter]);

  const selectionActions = useMemo(() => [
    { id: 'open', label: 'Ouvrir', icon: <FiEye size={13} />, disabled: selectedRows.length !== 1, onClick: () => selectedRows[0] && openLoan(selectedRows[0]) },
    { id: 'validate', label: 'Confirmer', icon: <FiCheck size={13} />, variant: 'success', disabled: actionLoading || !selectedRows.some((row) => normalizeLoanState(row.state) === 'draft'), onClick: () => patchSelectedState('in_progress') },
    { id: 'draft', label: 'Remettre en brouillon', icon: <FiRefreshCw size={13} />, disabled: actionLoading || !selectedRows.some((row) => ['in_progress', 'cancelled'].includes(normalizeLoanState(row.state))), onClick: () => patchSelectedState('draft') },
    { id: 'close', label: 'Clôturer', icon: <FiCheck size={13} />, disabled: actionLoading || !selectedRows.some((row) => normalizeLoanState(row.state) === 'in_progress'), onClick: () => patchSelectedState('closed') },
    { id: 'cancel', label: 'Annuler', icon: <FiX size={13} />, variant: 'danger', disabled: actionLoading || !selectedRows.some((row) => ['draft', 'in_progress'].includes(normalizeLoanState(row.state))), onClick: () => patchSelectedState('cancelled') },
    { id: 'delete', label: 'Supprimer', icon: <FiTrash2 size={13} />, variant: 'danger', disabled: actionLoading || !selectedRows.some((row) => normalizeLoanState(row.state) === 'draft'), onClick: deleteSelected },
  ], [actionLoading, deleteSelected, openLoan, patchSelectedState, selectedRows]);

  return (
    <>
      <UnifiedIndexPage
        title="Emprunts"
        memoryKey={MEMORY_KEY}
        rows={filteredRows}
        rowKey="id"
        columns={columns}
        loading={loading && !loans.length}
        error={error}
        success={success}
        messageDuration={15000}
        onDismissError={() => setError('')}
        onDismissSuccess={() => setSuccess('')}
        emptyText="Aucun emprunt"
        searchValue={search}
        onSearchChange={(value) => { setSearch(value); setPage(1); }}
        searchPlaceholder="Rechercher un emprunt..."
        filterChips={filterChips}
        onRemoveFilterChip={(chip) => {
          if (chip.id === 'state') setStateFilter('all');
          if (chip.id === 'partner') setPartnerFilter('all');
          setPage(1);
        }}
        renderFilters={renderFilters}
        filterPanelWidth={420}
        primaryAction={{ label: 'Nouvel emprunt', icon: <FiPlus size={14} />, onClick: () => navigate('/comptabilite/emprunts/create') }}
        selectedRowKeys={selectedIds}
        onSelectionChange={setSelectedIds}
        selectionActions={selectionActions}
        renderSelectionSummary={() => `${selectedIds.length} emprunt(s) sélectionné(s)`}
        onRowOpen={openLoan}
        page={page}
        onPageChange={setPage}
        pageSize={pageSize}
        onPageSizeChange={setPageSize}
        pageSizeOptions={[15, 25, 50, 100]}
        visibleColumnIds={visibleColumns}
        defaultVisibleColumnIds={DEFAULT_COLUMNS}
        onVisibleColumnsChange={setVisibleColumns}
        defaultSortColumn="start_date"
        defaultSortDirection="desc"
        footerText={`${filteredRows.length} emprunt(s)`}
      />

      {pendingAction && (
        <div className="fixed inset-0 z-[130] flex items-center justify-center bg-slate-900/35 p-4" role="presentation">
          <div role="dialog" aria-modal="true" aria-labelledby="loan-list-action-title" className="w-full max-w-md border border-gray-300 bg-white shadow-2xl">
            <div className="flex items-start gap-3 border-b border-gray-200 px-5 py-4">
              <FiAlertCircle className={pendingAction.danger ? 'mt-0.5 shrink-0 text-red-600' : 'mt-0.5 shrink-0 text-purple-600'} size={18} />
              <div>
                <h2 id="loan-list-action-title" className="text-sm font-semibold text-gray-900">{pendingAction.title}</h2>
                <p className="mt-1 text-xs leading-5 text-gray-600">{pendingAction.message}</p>
              </div>
            </div>
            <div className="flex justify-end gap-2 px-5 py-4">
              <button type="button" onClick={() => setPendingAction(null)} disabled={actionLoading} className="h-8 border border-gray-300 px-3 text-xs text-gray-700 hover:bg-gray-50 disabled:opacity-50">Fermer</button>
              <button type="button" onClick={pendingAction.onConfirm} disabled={actionLoading} className={`h-8 px-3 text-xs font-medium text-white disabled:opacity-50 ${pendingAction.danger ? 'bg-red-600 hover:bg-red-700' : 'bg-purple-600 hover:bg-purple-700'}`}>
                {actionLoading ? 'Traitement...' : 'Confirmer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
