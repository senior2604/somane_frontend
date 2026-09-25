import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FiActivity,
  FiArrowDown,
  FiArrowUp,
  FiBarChart2,
  FiCalendar,
  FiCircle,
  FiCreditCard,
  FiFileText,
  FiGrid,
  FiMoreVertical,
  FiPieChart,
  FiPlus,
  FiRefreshCcw,
  FiStar,
  FiTrendingUp,
  FiUsers,
  FiX
} from 'react-icons/fi';
import { useEntity } from '../../../context/EntityContext';
import UnifiedIndexPage from '../../../components/UnifiedIndexPage';
import { dashboardService, journauxService } from '../services';

const COLORS = ['#7c3aed', '#14b8a6', '#2563eb', '#f59e0b', '#ef4444', '#0f766e', '#334155', '#db2777', '#10b981', '#8b5cf6'];
const DASHBOARD_CACHE_PREFIX = 'somane:compta-dashboard';

const readDashboardCache = (entityId) => {
  if (!entityId || typeof window === 'undefined') return null;
  try {
    const cached = JSON.parse(window.sessionStorage.getItem(`${DASHBOARD_CACHE_PREFIX}:${entityId}`) || 'null');
    return cached?.dashboard ? cached : null;
  } catch {
    return null;
  }
};

const writeDashboardCache = (entityId, dashboard, journalCards) => {
  if (!entityId || !dashboard || typeof window === 'undefined') return;
  try {
    window.sessionStorage.setItem(`${DASHBOARD_CACHE_PREFIX}:${entityId}`, JSON.stringify({
      dashboard,
      journalCards,
      savedAt: Date.now(),
    }));
  } catch {}
};

const formatAmount = (value) => {
  const number = Number(value || 0);
  if (Number.isNaN(number)) return '0';
  return Math.round(number).toLocaleString('fr-FR');
};

const formatDate = (value) => {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString('fr-FR');
};

const compactLabel = (value) => {
  if (!value) return '-';
  return String(value).length > 20 ? `${String(value).slice(0, 20)}...` : String(value);
};

const getJournalAccent = (journal) => COLORS[Number(journal?.color || 0) % COLORS.length];

const getJournalActionRoute = (journal) => {
  const type = getNormalizedJournalType(journal);
  if (type === 'sale' || type === 'purchase' || type === 'misc') {
    return '/comptabilite/pieces/create';
  }
  return '/comptabilite/paiements/create';
};

const getJournalViewRoute = (journal, item) => {
  const label = String(item || '').toLowerCase();
  if (label.includes('transaction') || label.includes('paiement') || label.includes('mouvement') || label.includes('caisse')) return '/comptabilite/paiements';
  if (label.includes('releve')) return '/comptabilite/releves';
  return '/comptabilite/pieces';
};

const getJournalNewRoute = (journal, item) => {
  const label = String(item || '').toLowerCase();
  if (label.includes('facture') || label.includes('avoir')) return '/comptabilite/pieces/create';
  if (label.includes('transaction') || label.includes('paiement') || label.includes('mouvement') || label.includes('encaissement') || label.includes('decaissement') || label.includes('décaissement') || label.includes('caisse')) return '/comptabilite/paiements/create';
  if (label.includes('releve') || label.includes('relevé')) return '/comptabilite/releves/create';
  return '/comptabilite/pieces/create';
};

const unwrapList = (response) => {
  if (Array.isArray(response)) return response;
  if (Array.isArray(response?.results)) return response.results;
  if (Array.isArray(response?.data)) return response.data;
  if (Array.isArray(response?.data?.results)) return response.data.results;
  return [];
};

const getJournalTypeLabel = (journal) => {
  const type = journal?.type;
  if (typeof type === 'object') return type.name || type.code || '';
  return journal?.type_name || journal?.type_code || type || '';
};

const getJournalTypeKey = (journal) => {
  const raw = `${journal?.code || ''} ${journal?.name || ''} ${getJournalTypeLabel(journal)}`.toLowerCase();
  if (raw.includes('achat') || raw.includes('purchase') || raw.includes('ach')) return 'purchase';
  if (raw.includes('vente') || raw.includes('sale') || raw.includes('ven')) return 'sale';
  if (raw.includes('caisse') || raw.includes('cash') || raw.includes('cai') || raw.includes('banque') || raw.includes('bank') || raw.includes('ban')) return 'treasury';
  return 'misc';
};

const getNormalizedJournalType = (journal) => {
  const type = journal?.type;
  if (typeof type === 'string' && ['purchase', 'sale', 'treasury', 'misc'].includes(type)) return type;
  return getJournalTypeKey(journal);
};

const isCashJournal = (journal) => {
  const raw = `${journal?.code || ''} ${journal?.name || ''} ${getJournalTypeLabel(journal)}`.toLowerCase();
  return raw.includes('caisse') || raw.includes('cash') || raw.includes('cai');
};

const getJournalSpecificTerms = (journal) => {
  const type = getNormalizedJournalType(journal);

  if (type === 'purchase') {
    return {
      typeLabel: 'Achat',
      actionLabel: 'Télécharger',
      manualLabel: 'Créer manuellement',
      viewLabels: ['Factures', 'Avoirs'],
      newLabels: ['Facture', 'Avoir', 'Importer factures'],
      analysisLabel: 'Analyse des écritures',
      entriesLabel: 'Écritures comptables',
      matchingLabel: 'Lettrage des comptes',
      toValidate: 'Factures à valider',
      overdue: 'Factures échues impayées',
      notDue: 'Factures non échues',
    };
  }

  if (type === 'sale') {
    return {
      typeLabel: 'Vente',
      actionLabel: 'Télécharger',
      manualLabel: 'Créer manuellement',
      viewLabels: ['Factures', 'Avoirs'],
      newLabels: ['Facture', 'Avoir', 'Importer factures'],
      analysisLabel: 'Analyse des écritures',
      entriesLabel: 'Écritures comptables',
      matchingLabel: 'Lettrage des comptes',
      toValidate: 'Factures à valider',
      overdue: 'Factures échues impayées',
      notDue: 'Factures non échues',
    };
  }

  if (type === 'treasury') {
    const cash = isCashJournal(journal);
    return {
      typeLabel: cash ? 'Caisse' : 'Banque',
      actionLabel: 'Nouvelle transaction',
      manualLabel: 'Créer ou importer relevés',
      viewLabels: ['Transactions', 'Pièces'],
      newLabels: ['Nouvelle transaction', 'Importer relevés'],
      analysisLabel: 'Solde du journal',
      entriesLabel: 'Écritures comptables',
      matchingLabel: 'Lettrage',
      currentBalance: 'Solde actuel',
      paymentsToValidate: 'Paiements à valider',
      unreconciledPayments: 'Paiements non rapprochés',
    };
  }

  return {
    typeLabel: 'Opérations diverses',
    actionLabel: 'Nouvelle entrée',
    manualLabel: 'Créer manuellement',
    viewLabels: ['Pièces'],
    newLabels: ['Nouvelle entrée'],
    analysisLabel: 'Analyse des écritures',
    entriesLabel: 'Écritures comptables',
    matchingLabel: 'Lettrage des comptes',
    operationsToValidate: 'Opérations à valider',
  };
};

const buildJournalCardsFromList = (journals = []) => journals.map((journal, index) => {
  const type = getNormalizedJournalType(journal);
  const isTreasury = type === 'treasury';
  const terms = getJournalSpecificTerms({ ...journal, type });
  return {
    id: journal.id,
    code: journal.code,
    name: journal.name,
    type,
    color: journal.color ?? index,
    action_label: terms.actionLabel,
    manual_label: terms.manualLabel,
    menu: {
      view: terms.viewLabels,
      new: terms.newLabels,
      analysis: [terms.analysisLabel]
    },
    draft_count: 0,
    posted_count: Number(journal.entries_count || 0),
    total_count: Math.max(Number(journal.entries_count || 0), 1),
    amount_to_process: 0,
    unpaid_amount: 0,
    debit: 0,
    credit: 0,
    balance: 0,
    show_on_dashboard: journal.show_on_dashboard !== false,
    has_sequence: Boolean(journal.sequence || journal.sequence_id),
    has_default_account: Boolean(journal.default_account || journal.default_account_id || journal.suspense_account || journal.suspense_account_id),
    is_treasury: isTreasury,
    series: [
      { label: 'Du', value: 0 },
      { label: '15-21', value: 0 },
      { label: 'Cette sem.', value: Math.max(Number(journal.entries_count || 0), 1) },
      { label: '29-05', value: 0 },
      { label: 'Pas du', value: 0 }
    ]
  };
});

const getMetricNumber = (journal, keys = [], fallback = 0) => {
  for (const key of keys) {
    const value = journal?.[key];
    if (value !== null && value !== undefined && value !== '') {
      const number = Number(value);
      if (!Number.isNaN(number)) return number;
    }
  }
  return fallback;
};

const isSameJournal = (journal, item) => {
  const journalId = journal?.id;
  const journalCode = String(journal?.code || '').trim().toLowerCase();
  const journalName = String(journal?.name || '').trim().toLowerCase();
  const itemJournalId = item?.journal_id || item?.journal?.id || item?.journalId;
  const itemJournalCode = String(item?.journal_code || item?.journal?.code || '').trim().toLowerCase();
  const itemJournalName = String(item?.journal_name || item?.journal?.name || '').trim().toLowerCase();
  const itemJournalLabel = String(item?.journal || item?.journal_label || '').trim().toLowerCase();

  if (journalId && itemJournalId && String(journalId) === String(itemJournalId)) return true;
  if (journalCode && itemJournalCode && journalCode === itemJournalCode) return true;
  if (journalCode && itemJournalLabel && (itemJournalLabel === journalCode || itemJournalLabel.startsWith(`${journalCode} `) || itemJournalLabel.startsWith(`${journalCode} -`))) return true;
  if (journalName && itemJournalName && journalName === itemJournalName) return true;
  if (journalName && itemJournalLabel && itemJournalLabel.includes(journalName)) return true;
  return false;
};

const getMoveAmount = (move) => Math.abs(Number(
  move?.amount_total ??
  move?.amount_total_signed ??
  move?.total ??
  move?.amount ??
  move?.balance ??
  0
) || 0);

const getPaymentAmount = (payment) => Math.abs(Number(
  payment?.amount ??
  payment?.payment_amount ??
  payment?.amount_total ??
  payment?.amount_company_currency_signed ??
  payment?.amount_signed ??
  0
) || 0);

const getMoveResidual = (move) => Math.abs(Number(
  move?.amount_residual ??
  move?.amount_residual_signed ??
  move?.residual ??
  move?.residual_amount ??
  0
) || 0);

const hasMoveResidualInfo = (move) => (
  move?.amount_residual !== undefined ||
  move?.amount_residual_signed !== undefined ||
  move?.residual !== undefined ||
  move?.residual_amount !== undefined
);

const getMovePaidAmount = (move) => Math.abs(Number(
  move?.amount_paid ??
  move?.paid_amount ??
  0
) || 0);

const getMovePaymentState = (move) => String(
  move?.payment_state ||
  move?.invoice_payment_state ||
  move?.payment_status ||
  move?.payment_label ||
  move?.payment ||
  ''
).toLowerCase();

const getDueDate = (move) => (
  move?.invoice_date_due ||
  move?.due_date ||
  move?.date_maturity ||
  move?.date_due ||
  null
);

const isMoveUnpaid = (move) => {
  const paymentState = getMovePaymentState(move);

  if (['paid', 'paye', 'payé', 'reconciled', 'matched'].includes(paymentState)) return false;
  if (paymentState.includes('pay') && !paymentState.includes('non') && !paymentState.includes('un')) return false;
  if (['not_paid', 'unpaid', 'partial', 'partially_paid'].includes(paymentState)) return true;
  if (paymentState.includes('non') || paymentState.includes('impay') || paymentState.includes('unpaid') || paymentState.includes('partial') || paymentState.includes('partiel')) return true;

  if (hasMoveResidualInfo(move)) return getMoveResidual(move) > 0;

  if (move?.is_paid !== undefined || move?.paid !== undefined) {
    return !(move?.is_paid ?? move?.paid);
  }

  if (String(move?.state || '').toLowerCase() === 'posted') return getMoveAmount(move) > 0;

  return false;
};

const getMoveOpenAmount = (move) => {
  if (!isMoveUnpaid(move)) return 0;
  const residual = getMoveResidual(move);
  if (hasMoveResidualInfo(move) && residual > 0) return residual;
  const remaining = getMoveAmount(move) - getMovePaidAmount(move);
  if (remaining > 0) return remaining;
  return getMoveAmount(move);
};

const getSignedPaymentAmount = (payment) => {
  const signedAmount = Number(
    payment?.amount_company_currency_signed ??
    payment?.amount_signed ??
    0
  );
  if (!Number.isNaN(signedAmount) && signedAmount !== 0) return signedAmount;

  const amount = getPaymentAmount(payment);
  const directionSign = Number(payment?.direction_sign || 0);
  if (directionSign < 0) return -amount;
  if (directionSign > 0) return amount;
  const type = String(payment?.payment_type || payment?.type || payment?.direction || '').toLowerCase();
  if (type.includes('out') || type.includes('decaisse') || type.includes('décaisse') || type.includes('supplier')) {
    return -amount;
  }
  return amount;
};

const getPaymentState = (payment) => String(payment?.state || '').toLowerCase();

const getMoveState = (move) => String(move?.state || '').toLowerCase();

const getMoveId = (move) => {
  const id = move?.id ?? move?.move_id ?? move?.account_move_id;
  return id === undefined || id === null || id === '' ? null : String(id);
};

const getPaymentMoveId = (payment) => {
  const id = (
    payment?.account_move?.id ??
    payment?.account_move_id ??
    payment?.move?.id ??
    payment?.move_id ??
    null
  );
  return id === undefined || id === null || id === '' ? null : String(id);
};

const getSignedMoveAmount = (move) => {
  const signedAmount = Number(
    move?.amount_total_signed ??
    move?.amount_residual_signed ??
    0
  );
  if (!Number.isNaN(signedAmount) && signedAmount !== 0) return signedAmount;

  const amount = getMoveAmount(move);
  const directionSign = Number(move?.direction_sign || 0);
  if (directionSign < 0) return -amount;
  if (directionSign > 0) return amount;

  return amount;
};

const isMoveReconciled = (move) => {
  const explicit = move?.is_reconciled ?? move?.reconciled ?? move?.has_reconciled_entries ?? move?.matched ?? move?.is_matched;
  if (explicit !== undefined && explicit !== null) return Boolean(explicit);

  const paymentState = getMovePaymentState(move);
  if (['paid', 'paye', 'payé', 'reconciled', 'matched'].includes(paymentState)) return true;

  const matchingState = String(move?.reconciliation_state || move?.matching_state || '').toLowerCase();
  return ['reconciled', 'matched', 'lettered', 'lettré', 'lettre'].includes(matchingState);
};

const isPaymentReconciled = (payment) => {
  const explicit = payment?.is_reconciled ?? payment?.has_reconciled_entries ?? payment?.reconciled ?? payment?.matched ?? payment?.is_matched;
  if (explicit !== undefined && explicit !== null) return Boolean(explicit);
  const state = String(payment?.reconciliation_state || payment?.matching_state || '').toLowerCase();
  if (!state) return false;
  return ['reconciled', 'matched', 'lettered', 'lettré', 'lettre'].includes(state);
};

const sumAmount = (items, resolver) => items.reduce((sum, item) => sum + resolver(item), 0);

const buildJournalActivityMetrics = (journal, moves = [], payments = [], referenceDate = null) => {
  const journalMoves = moves.filter((move) => isSameJournal(journal, move));
  const journalPayments = payments.filter((payment) => isSameJournal(journal, payment));
  const type = getNormalizedJournalType(journal);
  const isTreasury = type === 'treasury';
  const today = referenceDate ? new Date(referenceDate) : new Date();
  const paymentMoveIds = new Set(
    journalPayments
      .map(getPaymentMoveId)
      .filter(Boolean)
  );
  const directTreasuryMoves = isTreasury
    ? journalMoves.filter((move) => {
      const moveId = getMoveId(move);
      return !moveId || !paymentMoveIds.has(moveId);
    })
    : [];

  const draftMoves = journalMoves.filter((move) => getMoveState(move) === 'draft');
  const postedUnpaidMoves = journalMoves.filter((move) => (
    getMoveState(move) === 'posted' && isMoveUnpaid(move)
  ));
  const overdueMoves = postedUnpaidMoves.filter((move) => {
    const dueDate = getDueDate(move);
    return dueDate && new Date(dueDate) < today;
  });
  const notDueMoves = postedUnpaidMoves.filter((move) => {
    const dueDate = getDueDate(move);
    return !dueDate || new Date(dueDate) >= today;
  });
  const draftPayments = journalPayments.filter((payment) => getPaymentState(payment) === 'draft');
  const postedPayments = journalPayments.filter((payment) => getPaymentState(payment) === 'posted');
  const unreconciledPayments = journalPayments.filter((payment) => (
    getPaymentState(payment) === 'posted' && !isPaymentReconciled(payment)
  ));
  const draftTreasuryMoves = directTreasuryMoves.filter((move) => getMoveState(move) === 'draft');
  const postedTreasuryMoves = directTreasuryMoves.filter((move) => getMoveState(move) === 'posted');
  const unreconciledTreasuryMoves = postedTreasuryMoves.filter((move) => !isMoveReconciled(move));

  return {
    draft_moves_count: draftMoves.length,
    draft_moves_amount: sumAmount(draftMoves, getMoveAmount),
    overdue_unpaid_count: overdueMoves.length,
    overdue_unpaid_amount: sumAmount(overdueMoves, getMoveOpenAmount),
    not_due_count: notDueMoves.length,
    not_due_amount: sumAmount(notDueMoves, getMoveOpenAmount),
    draft_payments_count: draftPayments.length + draftTreasuryMoves.length,
    draft_payments_amount: sumAmount(draftPayments, getPaymentAmount) + sumAmount(draftTreasuryMoves, getMoveAmount),
    current_balance_amount: sumAmount(postedPayments, getSignedPaymentAmount) + sumAmount(postedTreasuryMoves, getSignedMoveAmount),
    unreconciled_payments_count: unreconciledPayments.length + unreconciledTreasuryMoves.length,
    unreconciled_payments_amount: sumAmount(unreconciledPayments, getPaymentAmount) + sumAmount(unreconciledTreasuryMoves, getMoveAmount),
  };
};

const getJournalDashboardTypeLabel = (journal) => {
  return getJournalSpecificTerms(journal).typeLabel;
};

const normalizeJournalDashboardRows = (rows = []) => rows.map((row) => {
  const amount = Number(row.amount || 0);
  const count = row.count === null ? null : Number(row.count || 0);

  return {
    ...row,
    count,
    amount: count !== null && count <= 0 ? 0 : amount,
  };
});

const getTreasuryBalanceAmount = (journal, metrics = {}) => {
  const backendBalance = getMetricNumber(journal, ['current_balance', 'balance', 'ending_balance']);
  const activityBalance = getMetricNumber(metrics, ['current_balance_amount']);
  return backendBalance !== 0 ? backendBalance : activityBalance;
};

const buildJournalDashboardRows = (journal) => {
  const type = getNormalizedJournalType(journal);
  const isPurchase = type === 'purchase';
  const isSale = type === 'sale';
  const isTreasury = type === 'treasury';
  const metrics = journal?.dashboard_metrics || {};
  const terms = getJournalSpecificTerms(journal);

  if (isPurchase || isSale) {
    return normalizeJournalDashboardRows([
      {
        key: 'invoices_to_validate',
        count: getMetricNumber(metrics, ['draft_moves_count'], getMetricNumber(journal, ['invoices_to_validate_count', 'bills_to_validate_count', 'draft_count'])),
        label: terms.toValidate,
        amount: getMetricNumber(metrics, ['draft_moves_amount'], getMetricNumber(journal, ['invoices_to_validate_amount', 'bills_to_validate_amount', 'amount_to_process'])),
        linkLabel: terms.entriesLabel,
        linkType: 'entries',
      },
      {
        key: 'overdue_unpaid_invoices',
        count: getMetricNumber(metrics, ['overdue_unpaid_count'], getMetricNumber(journal, ['overdue_unpaid_count', 'overdue_invoices_count', 'unpaid_overdue_count'])),
        label: terms.overdue,
        amount: getMetricNumber(metrics, ['overdue_unpaid_amount'], getMetricNumber(journal, ['overdue_unpaid_amount', 'overdue_invoices_amount', 'unpaid_overdue_amount'])),
        linkLabel: terms.entriesLabel,
        linkType: 'entries',
      },
      {
        key: 'not_due_invoices',
        count: getMetricNumber(metrics, ['not_due_count'], getMetricNumber(journal, ['not_due_count', 'not_due_invoices_count', 'unmatured_count'])),
        label: terms.notDue,
        amount: getMetricNumber(metrics, ['not_due_amount'], getMetricNumber(journal, ['not_due_amount', 'not_due_invoices_amount', 'unmatured_amount', 'unpaid_amount', 'posted_amount'])),
        linkLabel: terms.entriesLabel,
        linkType: 'entries',
      },
    ]);
  }

  if (isTreasury) {
    return normalizeJournalDashboardRows([
      {
        key: 'current_balance',
        count: null,
        label: terms.currentBalance,
        amount: getTreasuryBalanceAmount(journal, metrics),
        linkLabel: terms.entriesLabel,
        linkType: 'entries',
      },
      {
        key: 'payments_to_validate',
        count: getMetricNumber(metrics, ['draft_payments_count'], getMetricNumber(journal, ['payments_to_validate_count', 'draft_payments_count', 'draft_count'])),
        label: terms.paymentsToValidate,
        amount: getMetricNumber(metrics, ['draft_payments_amount'], getMetricNumber(journal, ['payments_to_validate_amount', 'draft_payments_amount', 'amount_to_process'])),
        linkLabel: terms.entriesLabel,
        linkType: 'entries',
      },
      {
        key: 'unreconciled_payments',
        count: getMetricNumber(metrics, ['unreconciled_payments_count'], getMetricNumber(journal, ['unreconciled_payments_count', 'payments_unreconciled_count', 'unreconciled_count'])),
        label: terms.unreconciledPayments,
        amount: getMetricNumber(metrics, ['unreconciled_payments_amount'], getMetricNumber(journal, ['unreconciled_payments_amount', 'payments_unreconciled_amount', 'unreconciled_amount', 'unpaid_amount'])),
        linkLabel: terms.matchingLabel,
        linkType: 'matching',
      },
    ]);
  }

  return normalizeJournalDashboardRows([
    {
      key: 'operations_to_validate',
      count: getMetricNumber(metrics, ['draft_moves_count'], getMetricNumber(journal, ['operations_to_validate_count', 'draft_count'])),
      label: terms.operationsToValidate,
      amount: getMetricNumber(metrics, ['draft_moves_amount'], getMetricNumber(journal, ['operations_to_validate_amount', 'amount_to_process'])),
      linkLabel: terms.entriesLabel,
      linkType: 'entries',
    },
  ]);
};

const getJournalDashboardRowRoute = (row) => (
  row?.linkType === 'matching' ? '/comptabilite/lettrage' : '/comptabilite/ecritures'
);

const getJournalDashboardActionLinks = (journal) => {
  const rows = buildJournalDashboardRows(journal);
  const links = [];
  const terms = getJournalSpecificTerms(journal);

  rows.forEach((row) => {
    if (!row.linkType || links.some((link) => link.linkType === row.linkType)) return;
    links.push({
      key: `journal-link-${row.linkType}`,
      linkType: row.linkType,
      label: row.linkType === 'matching' ? terms.matchingLabel : terms.entriesLabel,
    });
  });

  return links;
};

const getStateLabel = (state) => {
  const labels = {
    draft: 'Brouillon',
    posted: 'Comptabilise',
    cancel: 'Annule',
    cancelled: 'Annule'
  };
  return labels[state] || state || '-';
};

const MiniBars = ({ data = [], color = '#14b8a6' }) => {
  const [hoveredIndex, setHoveredIndex] = useState(null);
  const max = Math.max(...data.map((item) => Number(item.value || 0)), 1);
  return (
    <div className="h-16 flex items-end gap-2 border-l border-b border-gray-100 pl-2 pb-1">
      {data.map((item, index) => {
        const value = Number(item.value || 0);
        const ratio = max > 0 ? Math.abs(value) / max : 0;
        const height = value === 0 ? '0%' : `${Math.max(ratio * 100, 18)}%`;
        const isZero = value === 0;
        return (
          <div key={`${item.label}-${index}`} className="flex-1 min-w-0 h-full flex flex-col justify-end">
            <div
              className="relative w-full bg-gray-100 rounded-t overflow-visible h-full flex items-end"
              onMouseEnter={() => setHoveredIndex(index)}
              onMouseLeave={() => setHoveredIndex(null)}
            >
              {hoveredIndex === index && (
                <div className="absolute left-1/2 bottom-full mb-2 -translate-x-1/2 z-40 px-2 py-1 bg-gray-900 text-white text-[11px] rounded shadow-lg whitespace-nowrap">
                  <div className="font-medium">{item.label}</div>
                  <div>{formatAmount(item.value)} CFA</div>
                  <div className="absolute left-1/2 top-full -translate-x-1/2 w-2 h-2 bg-gray-900 rotate-45 -mt-1" />
                </div>
              )}
              <div
                className={`w-full rounded-t cursor-pointer transition-all ${isZero ? 'border-t border-gray-300 bg-gray-300' : ''}`}
                style={{
                  height,
                  minHeight: isZero ? '1px' : undefined,
                  backgroundColor: isZero ? '#d1d5db' : color,
                  opacity: hoveredIndex === index ? 1 : (isZero ? 0.45 : 0.82),
                }}
              />
            </div>
            <div className="text-[10px] text-gray-500 mt-1 truncate -rotate-12 origin-left">{item.label}</div>
          </div>
        );
      })}
    </div>
  );
};

const ChartTypeButton = ({ active, icon: Icon, label, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    className={`h-8 px-3 border rounded text-xs font-medium flex items-center gap-2 transition-colors ${
      active ? 'bg-purple-600 text-white border-purple-600' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
    }`}
  >
    <Icon size={14} />
    {label}
  </button>
);

const MainChart = ({ data, chartType, colors = COLORS }) => {
  const normalized = data.map((item) => ({ ...item, value: Number(item.value || 0) }));
  const hasData = normalized.some((item) => item.value !== 0);
  const max = Math.max(...normalized.map((item) => Math.abs(item.value)), 1);
  const getColor = (index) => colors[index % colors.length] || COLORS[index % COLORS.length];
  const getVisualPercent = (value, minimum = 8) => {
    const absolute = Math.abs(Number(value || 0));
    if (absolute <= 0) return 0;
    const maxLog = Math.log10(max + 1);
    const valueLog = Math.log10(absolute + 1);
    return Math.min(100, Math.max((valueLog / maxLog) * 100, minimum));
  };

  if (!hasData) {
    return <div className="h-40 flex items-center justify-center text-sm text-gray-500">Aucune donnee a afficher.</div>;
  }

  if (chartType === 'pie' || chartType === 'donut') {
    const pieData = normalized
      .map((item, index) => ({ ...item, colorIndex: index, amount: Math.abs(item.value) }))
      .filter((item) => item.amount > 0);
    const total = pieData.reduce((sum, item) => sum + item.amount, 0);
    const isDonut = chartType === 'donut';
    let startAngle = -90;
    const polarToCartesian = (cx, cy, radius, angle) => {
      const radians = (angle * Math.PI) / 180;
      return { x: cx + radius * Math.cos(radians), y: cy + radius * Math.sin(radians) };
    };
    const arc = (cx, cy, radius, start, end) => {
      const startPoint = polarToCartesian(cx, cy, radius, end);
      const endPoint = polarToCartesian(cx, cy, radius, start);
      const largeArcFlag = end - start <= 180 ? '0' : '1';
      return `M ${cx} ${cy} L ${startPoint.x} ${startPoint.y} A ${radius} ${radius} 0 ${largeArcFlag} 0 ${endPoint.x} ${endPoint.y} Z`;
    };
    const percentageLabel = (amount) => {
      const percentage = total > 0 ? (amount / total) * 100 : 0;
      if (percentage > 0 && percentage < 0.01) return '< 0,01 %';
      return `${percentage.toLocaleString('fr-FR', { minimumFractionDigits: percentage < 1 ? 2 : 1, maximumFractionDigits: percentage < 1 ? 2 : 1 })} %`;
    };

    return (
      <div className="grid min-h-44 grid-cols-1 items-center gap-4 md:grid-cols-[210px_1fr]">
        <svg viewBox="0 0 240 240" className="h-44 w-full" role="img" aria-label={`${isDonut ? 'Diagramme en anneau' : 'Diagramme en camembert'} des journaux`}>
          {pieData.length === 1 ? (
            <circle cx="120" cy="120" r="100" fill={getColor(pieData[0].colorIndex)} stroke="white" strokeWidth="2">
              <title>{`${pieData[0].name} : ${formatAmount(pieData[0].amount)} (${percentageLabel(pieData[0].amount)})`}</title>
            </circle>
          ) : pieData.map((item) => {
            const angle = total > 0 ? (item.amount / total) * 360 : 0;
            const endAngle = startAngle + angle;
            const path = arc(120, 120, 100, startAngle, endAngle);
            const middleAngle = startAngle + angle / 2;
            const labelPoint = polarToCartesian(120, 120, isDonut ? 78 : 66, middleAngle);
            const percentage = total > 0 ? (item.amount / total) * 100 : 0;
            startAngle = endAngle;
            return (
              <g key={`${item.name}-${item.colorIndex}`}>
                <path d={path} fill={getColor(item.colorIndex)} stroke="white" strokeWidth="2">
                  <title>{`${item.name} : ${formatAmount(item.amount)} (${percentageLabel(item.amount)})`}</title>
                </path>
                {percentage >= 4 && (
                  <text x={labelPoint.x} y={labelPoint.y} textAnchor="middle" dominantBaseline="middle" className="fill-white text-[11px] font-semibold">
                    {percentageLabel(item.amount)}
                  </text>
                )}
              </g>
            );
          })}
          {isDonut && <circle cx="120" cy="120" r="56" fill="white" />}
          {isDonut && <text x="120" y="115" textAnchor="middle" className="fill-gray-500 text-xs">Total</text>}
          {isDonut && <text x="120" y="135" textAnchor="middle" className="fill-gray-900 text-sm font-semibold">{formatAmount(total)}</text>}
        </svg>
        <div className="max-h-44 space-y-1 overflow-y-auto pr-1">
          {normalized.map((item, index) => (
            <div key={`${item.name}-legend-${index}`} className="grid grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-3 border-b border-gray-100 py-1 text-sm last:border-b-0">
              <div className="flex items-center gap-2 min-w-0">
                <span className="w-3 h-3 rounded-sm shrink-0" style={{ backgroundColor: getColor(index) }} />
                <span className="text-gray-600 truncate">{item.name}</span>
              </div>
              <span className="whitespace-nowrap text-xs font-medium text-purple-700">{percentageLabel(Math.abs(item.value))}</span>
              <span className="font-semibold text-gray-900 whitespace-nowrap">{formatAmount(item.value)}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (chartType === 'horizontal') {
    return (
      <div className="h-40 flex flex-col justify-center gap-2 px-3 overflow-y-auto">
        {normalized.map((item, index) => {
          const visualWidth = getVisualPercent(item.value, 10);
          return (
            <div key={`${item.name}-${index}`} className="grid grid-cols-1 sm:grid-cols-[120px_1fr_100px] items-center gap-2 sm:gap-3">
              <div className="text-xs text-gray-600 truncate">{item.name}</div>
              <div className="h-6 bg-gray-100 rounded overflow-hidden border border-gray-100">
                <div
                  className="h-6 rounded transition-all"
                  style={{
                    width: `${visualWidth}%`,
                    minWidth: visualWidth > 0 ? '8px' : 0,
                    backgroundColor: visualWidth > 0 ? getColor(index) : '#d1d5db',
                    opacity: visualWidth > 0 ? 0.92 : 0.35,
                  }}
                />
              </div>
              <div className="text-xs font-semibold text-gray-900 text-right">{formatAmount(item.value)}</div>
            </div>
          );
        })}
      </div>
    );
  }

  if (chartType === 'line' || chartType === 'area') {
    const width = 760;
    const height = 170;
    const padding = 36;
    const step = normalized.length > 1 ? (width - padding * 2) / (normalized.length - 1) : 0;
    const points = normalized.map((item, index) => ({
      ...item,
      x: padding + index * step,
      y: height - padding - (Math.abs(item.value) / max) * (height - padding * 2)
    }));
    const linePath = points.map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`).join(' ');
    const areaPath = `${linePath} L ${points[points.length - 1]?.x || padding} ${height - padding} L ${padding} ${height - padding} Z`;
    const lineColor = getColor(0);

    return (
      <div className="h-40">
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full">
          {[0, 1, 2, 3].map((line) => {
            const y = padding + line * ((height - padding * 2) / 3);
            return <line key={line} x1={padding} y1={y} x2={width - padding} y2={y} stroke="#e5e7eb" strokeDasharray="4 4" />;
          })}
          {chartType === 'area' && <path d={areaPath} fill={lineColor} opacity="0.14" />}
          <path d={linePath} fill="none" stroke={lineColor} strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
          {points.map((point, index) => (
            <g key={`${point.name}-${index}`}>
              <circle cx={point.x} cy={point.y} r="5" fill={lineColor} />
              <text x={point.x} y={height - 10} textAnchor="middle" className="fill-gray-500 text-xs">{compactLabel(point.name)}</text>
              <text x={point.x} y={point.y - 12} textAnchor="middle" className="fill-gray-900 text-xs font-semibold">{formatAmount(point.value)}</text>
            </g>
          ))}
        </svg>
      </div>
    );
  }

  return (
    <div className="h-40 flex items-end gap-4 px-3 pt-5 pb-3">
      {normalized.map((item, index) => (
        <div key={`${item.name}-${index}`} className="h-full flex-1 min-w-0 flex flex-col items-center justify-end gap-2">
          <div className="text-xs font-semibold text-gray-900">{formatAmount(item.value)}</div>
          <div className="w-full h-full flex items-end justify-center">
            <div
              className="w-full max-w-20 rounded-t"
              style={{
                height: `${getVisualPercent(item.value, 12)}%`,
                minHeight: Number(item.value || 0) !== 0 ? '8px' : '1px',
                backgroundColor: Number(item.value || 0) !== 0 ? getColor(index) : '#d1d5db',
                opacity: Number(item.value || 0) !== 0 ? 0.92 : 0.35,
              }}
            />
          </div>
          <div className="h-8 text-xs text-gray-600 text-center truncate w-full">{item.name}</div>
        </div>
      ))}
    </div>
  );
};

const HealthPanel = ({ health, selectedKey, onSelect }) => {
  const score = Number(health?.score ?? 100);
  const items = health?.items || [];
  const selectedItem = items.find((item) => item.key === selectedKey) || items.find((item) => item.count > 0) || items[0];
  const scoreColor = score >= 80 ? 'text-emerald-700 bg-emerald-50 border-emerald-100' : score >= 50 ? 'text-amber-700 bg-amber-50 border-amber-100' : 'text-rose-700 bg-rose-50 border-rose-100';

  return (
    <div className="h-full flex flex-col relative">
      <div className="flex items-start justify-between gap-3">
        <div className={`px-3 py-2 border rounded ${scoreColor}`}>
          <div className="text-xs font-medium">Score</div>
          <div className="text-xl font-bold">{score}/100</div>
        </div>
        {selectedItem && (
          <div className="flex-1 min-w-0 text-right">
            <div className="text-xs text-gray-500">Focus</div>
            <div className="text-sm font-semibold text-gray-900 truncate">{selectedItem.label}</div>
            <div className="text-xs text-gray-500 truncate">{selectedItem.message}</div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-2 mt-3">
        {items.length === 0 ? (
          <div className="col-span-2 text-sm text-gray-500 text-center py-4">Aucun indicateur disponible.</div>
        ) : items.map((item) => {
          const selected = selectedItem?.key === item.key;
          const color = item.severity === 'danger'
            ? 'border-rose-200 bg-rose-50 text-rose-700'
            : item.severity === 'warning'
              ? 'border-amber-200 bg-amber-50 text-amber-700'
              : 'border-emerald-200 bg-emerald-50 text-emerald-700';
          return (
            <button
              key={item.key}
              type="button"
              onClick={() => onSelect(item.key)}
              className={`relative group border px-3 py-2 rounded text-left transition-all hover:shadow-sm ${color} ${selected ? 'ring-2 ring-purple-500 ring-offset-1' : ''}`}
            >
              <div className="flex items-center justify-between gap-3">
                <p className="text-xs font-medium truncate">{item.label}</p>
                <p className="text-base font-bold">{item.count}</p>
              </div>
              <div className="pointer-events-none absolute left-0 top-full mt-2 hidden group-hover:block z-50 w-80 max-w-[calc(100vw-2rem)] bg-gray-900 text-white text-xs rounded shadow-lg p-3">
                <div className="font-semibold">{item.label}</div>
                <div className="mt-1">Nombre : {item.count}</div>
                <div className="mt-1 text-gray-200">{item.message}</div>
                {item.details?.length > 0 && (
                  <div className="mt-2 border-t border-gray-700 pt-2 space-y-1">
                    {item.details.slice(0, 6).map((detail) => (
                      <div key={`${item.key}-${detail.id}-${detail.name}`} className="truncate">
                        {detail.name}{detail.journal ? ` - ${detail.journal}` : ''}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};

const FinancialFlowPanel = ({ flows, selectedKey, onSelect }) => {
  const items = flows?.items?.length ? flows.items : [
    { key: 'inbound', label: 'Encaissements', amount: flows?.inbound_amount || 0, count: flows?.inbound_count || 0, message: 'Paiements entrants comptabilises.' },
    { key: 'outbound', label: 'Decaissements', amount: flows?.outbound_amount || 0, count: flows?.outbound_count || 0, message: 'Paiements sortants comptabilises.' },
    { key: 'net', label: 'Solde net', amount: flows?.net_amount || 0, count: flows?.posted_count || 0, message: 'Encaissements moins decaissements.' },
    { key: 'draft', label: 'A valider', amount: flows?.draft_amount || 0, count: flows?.draft_count || 0, message: 'Paiements encore en brouillon.' }
  ];
  const selectedItem = items.find((item) => item.key === selectedKey) || items.find((item) => Number(item.amount || 0) !== 0 || item.count > 0) || items[0];
  const net = Number(flows?.net_amount || 0);

  return (
    <div className="h-full flex flex-col relative">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-gray-900">Flux financiers</p>
          <p className={`text-lg font-bold ${net >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>{formatAmount(net)} CFA</p>
        </div>
        {selectedItem && (
          <div className="flex-1 min-w-0 text-right">
            <div className="text-xs text-gray-500">Focus</div>
            <div className="text-sm font-semibold text-gray-900 truncate">{selectedItem.label}</div>
            <div className="text-xs text-gray-500 truncate">{selectedItem.message}</div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-2 mt-3">
        {items.map((item) => {
          const selected = selectedItem?.key === item.key;
          const positive = item.key === 'inbound' || (item.key === 'net' && Number(item.amount || 0) >= 0);
          const color = positive ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : item.key === 'draft' ? 'border-amber-200 bg-amber-50 text-amber-700' : 'border-rose-200 bg-rose-50 text-rose-700';
          const Icon = positive ? FiArrowDown : item.key === 'draft' ? FiCalendar : FiArrowUp;
          return (
            <button
              key={item.key}
              type="button"
              onClick={() => onSelect(item.key)}
              className={`relative group border px-3 py-2 rounded text-left transition-all hover:shadow-sm ${color} ${selected ? 'ring-2 ring-purple-500 ring-offset-1' : ''}`}
            >
              <div className="flex items-center justify-between gap-3">
                <span className="flex items-center gap-2 min-w-0">
                  <Icon size={14} className="shrink-0" />
                  <span className="text-xs font-medium truncate">{item.label}</span>
                </span>
                <span className="text-xs font-bold">{item.count || 0}</span>
              </div>
              <div className="mt-1 text-sm font-bold truncate">{formatAmount(item.amount)} CFA</div>
              <div className="pointer-events-none absolute left-0 top-full mt-2 hidden group-hover:block z-50 w-80 max-w-[calc(100vw-2rem)] bg-gray-900 text-white text-xs rounded shadow-lg p-3">
                <div className="font-semibold">{item.label}</div>
                <div className="mt-1">Montant : {formatAmount(item.amount)} CFA</div>
                <div className="mt-1">Nombre : {item.count || 0}</div>
                <div className="mt-1 text-gray-200">{item.message}</div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};

const ActivityPanel = ({ items, onOpen }) => {
  const [typeFilter, setTypeFilter] = useState('all');
  const [stateFilter, setStateFilter] = useState('all');

  const filteredItems = useMemo(() => items.filter((item) => {
    const typeMatches = typeFilter === 'all' || item.type === typeFilter;
    const stateMatches = stateFilter === 'all' || item.state === stateFilter;
    return typeMatches && stateMatches;
  }), [items, typeFilter, stateFilter]);

  return (
    <div className="overflow-hidden border border-gray-200 bg-white">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-200 px-4 py-3">
        <div className="min-w-0">
          <h2 className="text-sm font-semibold text-gray-900">Activité & actions récentes</h2>
          <p className="text-xs text-gray-500">Chronologie des pièces et des paiements</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={typeFilter}
            onChange={(event) => setTypeFilter(event.target.value)}
            className="h-8 border border-gray-300 bg-white px-2 text-xs focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
          >
            <option value="all">Tous</option>
            <option value="move">Pièces</option>
            <option value="payment">Paiements</option>
          </select>
          <select
            value={stateFilter}
            onChange={(event) => setStateFilter(event.target.value)}
            className="h-8 border border-gray-300 bg-white px-2 text-xs focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
          >
            <option value="all">Tous les états</option>
            <option value="draft">Brouillon</option>
            <option value="posted">Comptabilisé / validé</option>
            <option value="cancel">Annulé</option>
          </select>
          <FiActivity size={18} className="shrink-0 text-purple-600" />
        </div>
      </div>
      <div className="unified-index-scroll max-h-80 divide-y divide-gray-100 overflow-y-auto">
        {filteredItems.length === 0 ? (
          <div className="px-4 py-8 text-center text-sm text-gray-500">Aucune activité pour ce filtre.</div>
        ) : filteredItems.map((item, index) => {
          const ItemIcon = item.type === 'payment' ? FiCreditCard : FiFileText;
          const isPosted = item.state === 'posted';
          return (
          <button
            key={`${item.type}-${item.id}`}
            type="button"
            onClick={() => onOpen(item)}
            className="group grid w-full grid-cols-[76px_22px_minmax(0,1fr)_auto] items-center gap-2 px-3 py-2.5 text-left transition-colors hover:bg-purple-50"
          >
            <span className="text-[11px] tabular-nums text-gray-500">
              {formatDate(item.date || item.payment_date)}
            </span>
            <span className="relative flex h-full items-center justify-center">
              <span className={`absolute left-1/2 w-px -translate-x-1/2 bg-gray-200 ${index === 0 ? 'top-1/2' : 'top-[-11px]'} bottom-[-11px]`} />
              <span className={`relative z-10 inline-flex h-6 w-6 items-center justify-center rounded-full border ${item.type === 'payment' ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-purple-200 bg-purple-50 text-purple-700'}`}>
                <ItemIcon size={12} />
              </span>
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-gray-900 group-hover:text-purple-800">{item.name || item.label || '-'}</p>
              <p className="truncate text-[11px] text-gray-500">
                {item.journal || '-'}{item.partner ? ` · ${item.partner}` : ''}
              </p>
            </div>
            <div className="shrink-0 text-right">
              <p className="whitespace-nowrap text-sm font-semibold tabular-nums text-gray-900">{formatAmount(item.amount || item.amount_total)} CFA</p>
              <span className={`inline-flex rounded px-1.5 py-0.5 text-[10px] font-medium ${isPosted ? 'bg-emerald-50 text-emerald-700' : item.state === 'draft' ? 'bg-amber-50 text-amber-700' : 'bg-gray-100 text-gray-600'}`}>
                {item.label || getStateLabel(item.state)}
              </span>
            </div>
          </button>
          );
        })}
      </div>
    </div>
  );
};

const PartnerHighlightsPanel = ({ partners, onOpen }) => {
  const maximumAmount = Math.max(0, ...partners.map((partner) => Number(partner.amount || 0)));

  return (
  <div className="overflow-hidden border border-gray-200 bg-white">
    <div className="flex items-center justify-between gap-3 border-b border-gray-200 px-4 py-3">
      <div className="min-w-0">
        <h2 className="text-sm font-semibold text-gray-900">Partenaires à suivre</h2>
        <p className="text-xs text-gray-500">Classement par volume comptabilisé</p>
      </div>
      <FiUsers size={18} className="shrink-0 text-purple-600" />
    </div>
    <div className="unified-index-scroll max-h-80 divide-y divide-gray-100 overflow-y-auto">
      {partners.length === 0 ? (
        <div className="px-4 py-8 text-center text-sm text-gray-500">Aucun partenaire à afficher.</div>
      ) : partners.map((partner, index) => {
        const progress = maximumAmount > 0 ? Math.min(100, (Number(partner.amount || 0) / maximumAmount) * 100) : 0;
        const residual = Number(partner.residual || 0);
        return (
        <button
          key={partner.id || partner.name}
          type="button"
          onClick={() => onOpen(partner)}
          className="group grid w-full grid-cols-[26px_minmax(0,1fr)_auto] items-center gap-3 px-4 py-2.5 text-left transition-colors hover:bg-purple-50"
        >
          <span className="inline-flex h-6 w-6 items-center justify-center rounded bg-purple-50 text-[11px] font-bold text-purple-700">
            {index + 1}
          </span>
          <div className="min-w-0">
            <div className="flex min-w-0 items-center justify-between gap-3">
              <p className="truncate text-sm font-semibold text-gray-900 group-hover:text-purple-800">{partner.name || '-'}</p>
              <p className="shrink-0 text-[11px] text-gray-500">{partner.moves_count || 0} pièce(s) · {partner.payments_count || 0} paiement(s)</p>
            </div>
            <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-gray-100">
              <div className="h-full rounded-full bg-purple-500 transition-all" style={{ width: `${progress}%` }} />
            </div>
          </div>
          <div className="shrink-0 text-right">
            <p className="whitespace-nowrap text-sm font-semibold tabular-nums text-gray-900">{formatAmount(partner.amount)} CFA</p>
            <p className={`text-[11px] ${residual > 0 ? 'text-rose-700' : 'text-emerald-700'}`}>
              Reste {formatAmount(residual)} CFA
            </p>
          </div>
        </button>
        );
      })}
    </div>
  </div>
  );
};

const KpiStrip = ({ summary, amounts, onNavigate }) => {
  const kpis = [
    { label: 'Pieces', value: summary.moves_total || 0, detail: `${summary.moves_posted || 0} comptabilisees`, icon: FiFileText, route: '/comptabilite/pieces' },
    { label: 'Paiements', value: summary.payments_total || 0, detail: `${summary.payments_posted || 0} valides`, icon: FiCreditCard, route: '/comptabilite/paiements' },
    { label: 'Debit', value: `${formatAmount(amounts.posted_debit)} CFA`, detail: 'Lignes comptabilisees', icon: FiArrowDown },
    { label: 'Credit', value: `${formatAmount(amounts.posted_credit)} CFA`, detail: 'Lignes comptabilisees', icon: FiArrowUp }
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
      {kpis.map((kpi) => {
        const Icon = kpi.icon;
        return (
          <button
            key={kpi.label}
            type="button"
            onClick={() => kpi.route && onNavigate(kpi.route)}
            className="group bg-purple-700 text-white px-4 py-4 text-left shadow-sm transition-all hover:bg-purple-800 hover:-translate-y-0.5 disabled:cursor-default"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-xs text-purple-100">{kpi.label}</p>
                <p className="mt-1 text-xl font-bold truncate">{kpi.value}</p>
                <p className="mt-1 text-xs text-purple-100 truncate">{kpi.detail}</p>
              </div>
              <Icon size={22} className="text-purple-100 transition-transform group-hover:scale-110 shrink-0" />
            </div>
          </button>
        );
      })}
    </div>
  );
};

const InsightPanel = ({ activeTab, setActiveTab, health, financialFlows, selectedHealthKey, setSelectedHealthKey, selectedFlowKey, setSelectedFlowKey }) => (
  <div className="bg-white border border-gray-200 overflow-visible h-full">
    <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between gap-3">
      <div>
        <h2 className="text-sm font-semibold text-gray-900">Controle comptable</h2>
        <p className="text-xs text-gray-500">Sante ou flux financiers</p>
      </div>
      <div className="flex items-center border border-gray-300 rounded overflow-hidden">
        <button
          type="button"
          onClick={() => setActiveTab('health')}
          className={`h-8 px-3 text-xs ${activeTab === 'health' ? 'bg-purple-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-50'}`}
        >
          Sante
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('flows')}
          className={`h-8 px-3 text-xs border-l border-gray-300 ${activeTab === 'flows' ? 'bg-purple-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-50'}`}
        >
          Flux
        </button>
      </div>
    </div>
    <div className="p-4 min-h-[176px]">
      {activeTab === 'health' ? (
        <HealthPanel health={health} selectedKey={selectedHealthKey} onSelect={setSelectedHealthKey} />
      ) : (
        <FinancialFlowPanel flows={financialFlows} selectedKey={selectedFlowKey} onSelect={setSelectedFlowKey} />
      )}
    </div>
  </div>
);

const JournalMenu = ({ journal, onView, onNew, onAnalyze, onColor, onFavorite, onConfigure, onOpenLine, onClose }) => {
  const actionLinks = getJournalDashboardActionLinks(journal);

  return (
    <div
      className="absolute inset-y-3 right-3 z-30 flex w-[min(310px,calc(100%-1.5rem))] flex-col overflow-hidden rounded-lg border border-gray-200 bg-white/95 shadow-2xl backdrop-blur-sm"
      onClick={(event) => event.stopPropagation()}
    >
      <div className="flex h-9 shrink-0 items-center justify-between border-b border-gray-100 bg-gray-50/90 px-3">
        <div className="min-w-0">
          <p className="truncate text-xs font-semibold text-gray-900">Actions du journal</p>
          <p className="truncate text-[10px] text-gray-500">{journal.name || journal.code}</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="ml-2 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-gray-500 transition-colors hover:bg-purple-100 hover:text-purple-700"
          title="Fermer"
          aria-label="Fermer le menu"
        >
          <FiX size={13} />
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-3 py-2 [scrollbar-width:thin]">
        <div className="grid grid-cols-2 gap-3">
          <section>
            <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-gray-400">Suivi</p>
            {actionLinks.map((item) => (
              <button
                key={item.key}
                type="button"
                onClick={() => onOpenLine(journal, item)}
                className="block w-full truncate rounded px-2 py-1 text-left text-xs text-gray-700 transition-colors hover:bg-purple-50 hover:text-purple-700"
                title={item.label}
              >
                {item.label}
              </button>
            ))}
            {(journal.menu?.view || getJournalSpecificTerms(journal).viewLabels).map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => onView(journal, item)}
                className="block w-full truncate rounded px-2 py-1 text-left text-xs text-gray-600 transition-colors hover:bg-purple-50 hover:text-purple-700"
                title={item}
              >
                {item}
              </button>
            ))}
          </section>

          <section>
            <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-gray-400">Nouveau</p>
            {(journal.menu?.new || getJournalSpecificTerms(journal).newLabels).map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => onNew(journal, item)}
                className="block w-full truncate rounded px-2 py-1 text-left text-xs text-gray-700 transition-colors hover:bg-purple-50 hover:text-purple-700"
                title={item}
              >
                {item}
              </button>
            ))}

            <p className="mb-1 mt-2 text-[10px] font-semibold uppercase tracking-wide text-gray-400">Analyse</p>
            {(journal.menu?.analysis || [getJournalSpecificTerms(journal).analysisLabel]).map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => onAnalyze(journal, item)}
                className="block w-full truncate rounded px-2 py-1 text-left text-xs text-gray-700 transition-colors hover:bg-purple-50 hover:text-purple-700"
                title={item}
              >
                {item}
              </button>
            ))}
          </section>
        </div>

        <div className="mt-2 border-t border-gray-100 pt-2">
          <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-gray-400">Couleur</p>
          <div className="flex flex-wrap gap-1.5">
            <button type="button" onClick={() => onColor(journal, 0)} className="relative h-5 w-5 rounded-full border border-gray-300 bg-white" title="Aucune couleur">
              <span className="absolute left-0 top-1/2 h-px w-full -rotate-45 bg-rose-500" />
            </button>
            {COLORS.map((color, index) => (
              <button
                key={color}
                type="button"
                onClick={() => onColor(journal, index)}
                className="h-5 w-5 rounded-full border-2 border-white shadow-sm ring-1 ring-gray-200 transition-transform hover:scale-110"
                style={{ backgroundColor: color }}
                aria-label={`Couleur ${index + 1}`}
              />
            ))}
          </div>
        </div>
      </div>

      <div className="flex shrink-0 items-center justify-between gap-2 border-t border-gray-100 bg-gray-50/80 px-3 py-2">
        <button type="button" onClick={() => onFavorite(journal)} className="flex min-w-0 items-center gap-1.5 truncate text-xs text-gray-600 transition-colors hover:text-purple-700">
          <FiStar className="shrink-0 text-yellow-400" size={13} />
          <span className="truncate">{journal.show_on_dashboard === false ? 'Ajouter aux favoris' : 'Retirer des favoris'}</span>
        </button>
        <button type="button" onClick={() => onConfigure(journal)} className="shrink-0 rounded px-2 py-1 text-xs font-medium text-purple-700 transition-colors hover:bg-purple-100">
          Configurer
        </button>
      </div>
    </div>
  );
};

const JournalCard = ({ journal, openMenuId, setOpenMenuId, onAction, onView, onNew, onAnalyze, onColor, onFavorite, onConfigure, onOpenLine }) => {
  const accent = getJournalAccent(journal);
  const isOpen = openMenuId === journal.id;
  const title = `${journal.name || journal.code || 'Journal'}`.toUpperCase();
  const typeLabel = getJournalDashboardTypeLabel(journal);
  const dashboardRows = buildJournalDashboardRows(journal);
  const terms = getJournalSpecificTerms(journal);
  const manualLabel = journal.manual_label || terms.manualLabel;

  return (
    <div className="relative bg-white border border-gray-200 min-h-[172px] min-w-0" style={{ borderLeft: `3px solid ${accent}` }}>
      <div className="px-4 py-3 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-sm font-semibold truncate" style={{ color: accent }}>{title}</h2>
          <div className="text-xs text-gray-500 mt-1">
            <span className="font-semibold text-gray-700">Type de journal :</span> {typeLabel}
          </div>
        </div>
        <button
          type="button"
          onClick={() => setOpenMenuId(isOpen ? null : journal.id)}
          className={`relative z-10 flex h-7 w-7 items-center justify-center rounded-full transition-all ${isOpen ? 'bg-purple-100 text-purple-700' : 'text-gray-500 hover:bg-purple-50 hover:text-purple-700'}`}
          aria-expanded={isOpen}
          aria-label="Ouvrir les actions du journal"
        >
          <FiMoreVertical size={16} />
        </button>
      </div>

      <div className="px-4 pb-3 grid grid-cols-1 sm:grid-cols-[135px_1fr] gap-4">
        <div className="flex flex-col items-start gap-2">
          <button
            type="button"
            onClick={() => onAction(journal)}
            className="px-3 py-2 text-xs font-medium text-white"
            style={{ backgroundColor: accent }}
          >
            {journal.action_label || terms.actionLabel}
          </button>
          {manualLabel && (
            <button
              type="button"
              onClick={() => onNew(journal, manualLabel)}
              className="text-xs text-gray-500 hover:text-gray-800"
            >
              {manualLabel}
            </button>
          )}
        </div>

        <div className="min-w-0">
          <div className="space-y-1 text-xs">
            {dashboardRows.map((row) => (
              <button
                key={row.key}
                type="button"
                onClick={() => onOpenLine(journal, row)}
                className="group w-full grid grid-cols-[36px_minmax(0,1fr)_auto] gap-x-3 items-center py-0.5 text-left hover:bg-purple-50 hover:text-purple-700 transition-colors"
                title={`${row.label} - ouvrir le détail`}
              >
                <span className="text-right tabular-nums text-gray-700 group-hover:text-purple-700">{row.count === null ? '' : formatAmount(row.count)}</span>
                <span className="text-left text-gray-700 truncate">
                  {row.label}
                </span>
                <span className="text-gray-700 text-right whitespace-nowrap tabular-nums">{formatAmount(row.amount)} CFA</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="px-4 pb-4">
        <MiniBars data={journal.series || []} color={accent} />
      </div>

      {isOpen && (
        <>
          <button
            type="button"
            className="absolute inset-0 z-20 bg-slate-900/10 backdrop-blur-[1px]"
            onClick={() => setOpenMenuId(null)}
            aria-label="Fermer le menu du journal"
          />
          <JournalMenu
            journal={journal}
            onView={onView}
            onNew={onNew}
            onAnalyze={onAnalyze}
            onColor={onColor}
            onFavorite={onFavorite}
            onConfigure={onConfigure}
            onOpenLine={onOpenLine}
            onClose={() => setOpenMenuId(null)}
          />
        </>
      )}
    </div>
  );
};

export default function ComptaDashboard() {
  const navigate = useNavigate();
  const { activeEntity } = useEntity();
  const initialCacheRef = useRef(readDashboardCache(activeEntity?.id));
  const lastAutoLoadedEntityRef = useRef(null);

  const today = useMemo(() => new Date(), []);
  const defaultDateFrom = useMemo(() => `${today.getFullYear()}-01-01`, [today]);
  const defaultDateTo = useMemo(() => today.toISOString().slice(0, 10), [today]);

  const [dateFrom, setDateFrom] = useState(defaultDateFrom);
  const [dateTo, setDateTo] = useState(defaultDateTo);
  const [dashboard, setDashboard] = useState(() => initialCacheRef.current?.dashboard || null);
  const [fallbackJournalCards, setFallbackJournalCards] = useState(() => initialCacheRef.current?.journalCards || []);
  const latestDashboardRequest = useRef(0);
  const [loading, setLoading] = useState(() => !initialCacheRef.current?.dashboard);
  const [error, setError] = useState('');
  const [openMenuId, setOpenMenuId] = useState(null);
  const [searchText, setSearchText] = useState('');
  const [activeFilters, setActiveFilters] = useState([]);
  const [groupBy, setGroupBy] = useState('none');
  const [favoriteOnly, setFavoriteOnly] = useState(false);
  const [journalsPerPage, setJournalsPerPage] = useState(6);
  const [journalPage, setJournalPage] = useState(1);
  const [chartType, setChartType] = useState('pie');
  const [analysis, setAnalysis] = useState('journals');
  const [chartColors, setChartColors] = useState(COLORS);
  const [insightTab, setInsightTab] = useState('health');
  const [selectedHealthKey, setSelectedHealthKey] = useState(null);
  const [selectedFlowKey, setSelectedFlowKey] = useState(null);

  const normalizedDashboard = useMemo(() => ({
    summary: dashboard?.summary || {},
    amounts: dashboard?.amounts || {},
    accountingHealth: dashboard?.accounting_health || { score: 100, items: [] },
    recentMoves: dashboard?.recent_moves || [],
    recentPayments: dashboard?.recent_payments || [],
    financialFlows: dashboard?.financial_flows || {},
    partnerHighlights: dashboard?.partner_highlights || [],
  }), [dashboard]);
  const {
    summary,
    amounts,
    accountingHealth,
    recentMoves,
    recentPayments,
    financialFlows,
    partnerHighlights,
  } = normalizedDashboard;
  const baseJournalCards = useMemo(() => (
    dashboard?.journal_cards?.length ? dashboard.journal_cards : fallbackJournalCards
  ), [dashboard, fallbackJournalCards]);
  const journalCards = useMemo(() => baseJournalCards.map((journal) => ({
    ...journal,
    dashboard_metrics: Object.keys(journal?.dashboard_metrics || {}).length
      ? journal.dashboard_metrics
      : buildJournalActivityMetrics(journal, recentMoves, recentPayments, dateTo),
  })), [baseJournalCards, recentMoves, recentPayments, dateTo]);

  const loadDashboard = useCallback(async () => {
    if (!activeEntity?.id) {
      setLoading(false);
      setDashboard(null);
      setFallbackJournalCards([]);
      return;
    }

    setLoading(true);
    setError('');
    const requestId = latestDashboardRequest.current + 1;
    latestDashboardRequest.current = requestId;
    const filters = {
      date_from: dateFrom,
      date_to: dateTo
    };

    try {
      const [data, journalsResponse] = await Promise.all([
        dashboardService.getSummary(activeEntity.id, filters),
        journauxService.getAll(activeEntity.id)
      ]);
      const fallbackCards = buildJournalCardsFromList(unwrapList(journalsResponse));
      if (requestId !== latestDashboardRequest.current) return;
      setDashboard(data);
      setFallbackJournalCards(fallbackCards);
      writeDashboardCache(activeEntity.id, data, fallbackCards);
    } catch (err) {
      if (requestId !== latestDashboardRequest.current) return;
      console.error('Erreur chargement dashboard compta:', err);
      setError(err?.response?.data?.detail || err?.message || 'Erreur de chargement du tableau de bord.');
    } finally {
      if (requestId === latestDashboardRequest.current) {
        setLoading(false);
      }
    }
  }, [activeEntity, dateFrom, dateTo]);

  useEffect(() => {
    const entityId = activeEntity?.id;
    if (!entityId || lastAutoLoadedEntityRef.current === entityId) return;

    lastAutoLoadedEntityRef.current = entityId;
    const cached = readDashboardCache(entityId);
    if (cached) {
      setDashboard(cached.dashboard);
      setFallbackJournalCards(cached.journalCards || []);
      setLoading(false);
    } else {
      setDashboard(null);
      setFallbackJournalCards([]);
    }
    loadDashboard();
  }, [activeEntity?.id, loadDashboard]);

  const addFilter = (field, value) => {
    setActiveFilters((filters) => {
      const exists = filters.some((filter) => filter.field === field && filter.value === value);
      return exists ? filters : [...filters, { field, value }];
    });
  };

  const removeFilter = (index) => {
    setActiveFilters((filters) => filters.filter((_, filterIndex) => filterIndex !== index));
  };

  const clearAllFilters = () => {
    setActiveFilters([]);
    setSearchText('');
    setFavoriteOnly(false);
  };

  const getFilterDisplay = (filter) => {
    if (filter.field === 'recherche') return { text: filter.value, color: 'bg-blue-100 text-blue-700' };
    if (filter.field === 'type') {
      const labels = { sale: 'Ventes', purchase: 'Achats', treasury: 'Tresorerie', misc: 'Operations diverses' };
      return { text: `Type: ${labels[filter.value] || filter.value}`, color: 'bg-purple-100 text-purple-700' };
    }
    if (filter.field === 'status') {
      const labels = { todo: 'A traiter', configured: 'Configure', alert: 'A verifier' };
      return { text: labels[filter.value] || filter.value, color: 'bg-amber-100 text-amber-700' };
    }
    return { text: `${filter.field}: ${filter.value}`, color: 'bg-gray-100 text-gray-700' };
  };

  const filteredJournals = useMemo(() => {
    let journals = [...journalCards];

    const normalizedSearch = searchText.trim().toLowerCase();
    if (normalizedSearch) {
      journals = journals.filter((journal) => (
        `${journal.code || ''} ${journal.name || ''} ${journal.type || ''}`
          .toLowerCase()
          .includes(normalizedSearch)
      ));
    }

    if (favoriteOnly) {
      journals = journals.filter((journal) => journal.show_on_dashboard !== false);
    }

    activeFilters.forEach((filter) => {
      if (filter.field === 'recherche') {
        const value = String(filter.value || '').toLowerCase();
        journals = journals.filter((journal) => (
          `${journal.code || ''} ${journal.name || ''} ${journal.type || ''}`.toLowerCase().includes(value)
        ));
      }

      if (filter.field === 'type') {
        journals = journals.filter((journal) => journal.type === filter.value);
      }

      if (filter.field === 'status') {
        if (filter.value === 'todo') {
          journals = journals.filter((journal) => Number(journal.draft_count || 0) > 0 || Number(journal.amount_to_process || 0) > 0);
        }
        if (filter.value === 'configured') {
          journals = journals.filter((journal) => journal.has_sequence && journal.has_default_account);
        }
        if (filter.value === 'alert') {
          journals = journals.filter((journal) => !journal.has_sequence || !journal.has_default_account);
        }
      }
    });

    if (groupBy === 'type') {
      journals.sort((a, b) => String(a.type || '').localeCompare(String(b.type || '')));
    }
    if (groupBy === 'name') {
      journals.sort((a, b) => String(a.name || '').localeCompare(String(b.name || '')));
    }
    if (groupBy === 'balance') {
      journals.sort((a, b) => Math.abs(Number(b.balance || 0)) - Math.abs(Number(a.balance || 0)));
    }

    return journals;
  }, [journalCards, activeFilters, favoriteOnly, groupBy, searchText]);

  const totalJournalPages = Math.max(Math.ceil(filteredJournals.length / journalsPerPage), 1);
  const currentJournalPage = Math.min(journalPage, totalJournalPages);
  const journalStartIndex = filteredJournals.length ? (currentJournalPage - 1) * journalsPerPage : 0;
  const journalEndIndex = Math.min(journalStartIndex + journalsPerPage, filteredJournals.length);
  const displayedJournals = filteredJournals.slice(journalStartIndex, journalEndIndex);

  useEffect(() => {
    setJournalPage(1);
  }, [activeFilters, favoriteOnly, groupBy, journalsPerPage]);

  useEffect(() => {
    if (journalPage > totalJournalPages) {
      setJournalPage(totalJournalPages);
    }
  }, [journalPage, totalJournalPages]);

  const analysisData = useMemo(() => {
    if (analysis === 'states') {
      return [
        { name: 'Brouillons', value: summary.moves_draft || 0 },
        { name: 'Comptabilisees', value: summary.moves_posted || 0 },
        { name: 'Annulees', value: summary.moves_cancelled || 0 }
      ];
    }
    if (analysis === 'payments') {
      return [
        { name: 'Encaissements', value: amounts.payments_inbound || 0 },
        { name: 'Decaissements', value: amounts.payments_outbound || 0 }
      ];
    }
    if (analysis === 'balance') {
      return [
        { name: 'Debit', value: amounts.posted_debit || 0 },
        { name: 'Credit', value: amounts.posted_credit || 0 }
      ];
    }
    return filteredJournals.map((journal) => {
      const rows = buildJournalDashboardRows(journal).filter((row) => row.key !== 'current_balance');
      const amountValue = rows.reduce((sum, row) => sum + Math.abs(Number(row.amount || 0)), 0);
      const countValue = rows.reduce((sum, row) => sum + Math.abs(Number(row.count || 0)), 0);
      return {
        name: compactLabel(journal.code || journal.name),
        value: amountValue > 0 ? amountValue : countValue
      };
    });
  }, [analysis, summary, amounts, filteredJournals]);

  const activityItems = useMemo(() => {
    if (dashboard?.activity_items?.length) return dashboard.activity_items;
    const movesActivity = recentMoves.map((move) => ({
      ...move,
      type: 'move',
      date: move.date,
      amount: move.amount_total,
      label: move.state === 'posted' ? 'Piece comptabilisee' : move.state === 'draft' ? 'Piece brouillon' : getStateLabel(move.state)
    }));
    const paymentsActivity = recentPayments.map((payment) => ({
      ...payment,
      type: 'payment',
      date: payment.payment_date,
      amount: payment.amount,
      label: payment.state === 'posted' ? 'Paiement valide' : payment.state === 'draft' ? 'Paiement brouillon' : getStateLabel(payment.state)
    }));
    return [...movesActivity, ...paymentsActivity]
      .sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0))
      .slice(0, 10);
  }, [dashboard, recentMoves, recentPayments]);

  const displayPartnerHighlights = useMemo(() => {
    if (partnerHighlights.length) return partnerHighlights;
    const grouped = {};
    [...recentMoves, ...recentPayments].forEach((item) => {
      const name = item.partner;
      if (!name) return;
      grouped[name] = grouped[name] || {
        id: item.partner_id,
        name,
        moves_count: 0,
        payments_count: 0,
        amount: 0,
        payments_amount: 0,
        residual: 0,
        last_date: item.date || item.payment_date
      };
      if (item.payment_date) {
        grouped[name].payments_count += 1;
        grouped[name].payments_amount += Number(item.amount || 0);
      } else {
        grouped[name].moves_count += 1;
        grouped[name].amount += Number(item.amount_total || 0);
        grouped[name].residual += Number(item.amount_residual || 0);
      }
      const itemDate = item.date || item.payment_date;
      if (itemDate && (!grouped[name].last_date || new Date(itemDate) > new Date(grouped[name].last_date))) {
        grouped[name].last_date = itemDate;
      }
    });
    return Object.values(grouped).slice(0, 8);
  }, [partnerHighlights, recentMoves, recentPayments]);

  const handleJournalAction = (journal) => {
    navigate(getJournalActionRoute(journal), { state: { journalId: journal.id } });
  };

  const updateJournalCard = (journalId, updater) => {
    setFallbackJournalCards((cards) => cards.map((card) => (
      card.id === journalId ? updater(card) : card
    )));
    setDashboard((current) => {
      if (!current?.journal_cards?.length) return current;
      return {
        ...current,
        journal_cards: current.journal_cards.map((card) => (
          card.id === journalId ? updater(card) : card
        ))
      };
    });
  };

  const closeJournalMenu = () => setOpenMenuId(null);

  const handleJournalView = (journal, item) => {
    closeJournalMenu();
    navigate(getJournalViewRoute(journal, item), {
      state: {
        journalId: journal.id,
        journalCode: journal.code,
        source: 'dashboard'
      }
    });
  };

  const handleJournalNew = (journal, item) => {
    closeJournalMenu();
    navigate(getJournalNewRoute(journal, item), {
      state: {
        journalId: journal.id,
        journalCode: journal.code,
        source: 'dashboard'
      }
    });
  };

  const handleJournalAnalyze = (journal) => {
    closeJournalMenu();
    setAnalysis('journals');
    setChartType('pie');
    setActiveFilters((filters) => {
      const withoutJournalSearch = filters.filter((filter) => !(filter.field === 'recherche' && filter.value === journal.code));
      return [...withoutJournalSearch, { field: 'recherche', value: journal.code || journal.name }];
    });
  };

  const handleJournalLineOpen = (journal, row) => {
    navigate(getJournalDashboardRowRoute(row), {
      state: {
        journalId: journal.id,
        journalCode: journal.code,
        journalType: journal.type,
        dashboardMetric: row.key,
        source: 'dashboard'
      }
    });
  };

  const handleJournalColor = (journal, colorIndex) => {
    updateJournalCard(journal.id, (card) => ({ ...card, color: colorIndex }));
  };

  const handleJournalFavorite = (journal) => {
    updateJournalCard(journal.id, (card) => ({
      ...card,
      show_on_dashboard: card.show_on_dashboard === false
    }));
    closeJournalMenu();
  };

  const handleJournalConfigure = (journal) => {
    closeJournalMenu();
    navigate(`/comptabilite/journaux/${journal.id}`);
  };

  const updateChartColor = (index, color) => {
    setChartColors((colors) => {
      const nextColors = [...colors];
      nextColors[index] = color;
      return nextColors;
    });
  };

  const dashboardFilterChips = [
    ...((dateFrom !== defaultDateFrom || dateTo !== defaultDateTo) ? [{
      id: 'period',
      label: `${formatDate(dateFrom)} - ${formatDate(dateTo)}`,
      kind: 'period',
    }] : []),
    ...activeFilters.map((filter, index) => ({
      id: `filter-${filter.field}-${filter.value}-${index}`,
      label: getFilterDisplay(filter).text,
      kind: 'filter',
      index,
    })),
    ...(groupBy !== 'none' ? [{
      id: 'group-by',
      label: `Regroupement : ${{ type: 'Type', name: 'Nom', balance: 'Solde' }[groupBy] || groupBy}`,
      kind: 'group',
    }] : []),
    ...(favoriteOnly ? [{ id: 'favorites', label: 'Favoris', kind: 'favorite' }] : []),
  ];

  const dashboardMemoryState = {
    searchText,
    activeFilters,
    groupBy,
    favoriteOnly,
    journalsPerPage,
    journalPage: currentJournalPage,
    dateFrom,
    dateTo,
    chartType,
    analysis,
    insightTab,
  };

  const restoreDashboardMemory = (saved = {}) => {
    if (typeof saved.searchText === 'string') setSearchText(saved.searchText);
    if (Array.isArray(saved.activeFilters)) setActiveFilters(saved.activeFilters);
    if (typeof saved.groupBy === 'string') setGroupBy(saved.groupBy);
    if (typeof saved.favoriteOnly === 'boolean') setFavoriteOnly(saved.favoriteOnly);
    if (Number(saved.journalsPerPage) > 0) setJournalsPerPage(Number(saved.journalsPerPage));
    if (Number(saved.journalPage) > 0) setJournalPage(Number(saved.journalPage));
    if (typeof saved.dateFrom === 'string') setDateFrom(saved.dateFrom);
    if (typeof saved.dateTo === 'string') setDateTo(saved.dateTo);
    if (typeof saved.chartType === 'string') setChartType(saved.chartType);
    if (typeof saved.analysis === 'string') setAnalysis(saved.analysis);
    if (typeof saved.insightTab === 'string') setInsightTab(saved.insightTab);
  };

  const renderDashboardFilters = ({ close }) => (
    <div className="grid grid-cols-1 text-xs text-gray-700 md:grid-cols-2">
      <section className="border-b border-gray-200 p-3 md:col-span-2">
        <div className="mb-2 flex items-center gap-2 font-semibold text-gray-800">
          <FiCalendar size={14} className="text-purple-600" />
          <span>Période</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex h-8 min-w-0 items-center overflow-hidden rounded border border-gray-300 bg-white transition-colors focus-within:border-purple-500 focus-within:ring-1 focus-within:ring-purple-100">
            <input
              type="date"
              value={dateFrom}
              onChange={(event) => setDateFrom(event.target.value)}
              aria-label="Date de début"
              title="Date de début"
              className="h-full w-[132px] border-0 bg-transparent px-2 text-xs text-gray-700 outline-none"
            />
            <span className="h-4 w-px shrink-0 bg-gray-300" />
            <span className="shrink-0 px-1 text-[11px] text-gray-400">au</span>
            <span className="h-4 w-px shrink-0 bg-gray-300" />
            <input
              type="date"
              value={dateTo}
              onChange={(event) => setDateTo(event.target.value)}
              aria-label="Date de fin"
              title="Date de fin"
              className="h-full w-[132px] border-0 bg-transparent px-2 text-xs text-gray-700 outline-none"
            />
          </div>
          {(dateFrom !== defaultDateFrom || dateTo !== defaultDateTo) && (
            <button
              type="button"
              onClick={() => {
                setDateFrom(defaultDateFrom);
                setDateTo(defaultDateTo);
              }}
              className="h-8 rounded px-2 text-gray-500 transition-colors hover:bg-gray-100 hover:text-purple-700"
            >
              Réinitialiser
            </button>
          )}
        </div>
      </section>

      <div className="border-b border-gray-200 p-3 md:border-b-0 md:border-r">
        <section>
          <p className="mb-2 font-semibold text-gray-800">Type de journal</p>
          <div className="space-y-1">
          {[
            ['sale', 'Ventes'],
            ['purchase', 'Achats'],
            ['treasury', 'Trésorerie'],
            ['misc', 'Opérations diverses'],
          ].map(([value, label]) => {
            const selected = activeFilters.some((filter) => filter.field === 'type' && filter.value === value);
            return (
              <button
                key={value}
                type="button"
                onClick={() => addFilter('type', value)}
                className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left transition-colors hover:bg-gray-100"
              >
                <span className="w-4 font-semibold text-purple-600">{selected ? '✓' : ''}</span>
                <span>{label}</span>
              </button>
            );
          })}
          </div>
        </section>

        <section className="mt-3 border-t border-gray-200 pt-3">
          <p className="mb-2 font-semibold text-gray-800">Statut</p>
          <div className="space-y-1">
            {[
              ['todo', 'À traiter'],
              ['configured', 'Journaux configurés'],
              ['alert', 'À vérifier'],
            ].map(([value, label]) => {
              const selected = activeFilters.some((filter) => filter.field === 'status' && filter.value === value);
              return (
                <button
                  key={value}
                  type="button"
                  onClick={() => addFilter('status', value)}
                  className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left transition-colors hover:bg-gray-100"
                >
                  <span className="w-4 font-semibold text-purple-600">{selected ? '✓' : ''}</span>
                  <span>{label}</span>
                </button>
              );
            })}
          </div>
        </section>
      </div>

      <div className="p-3">
        <section>
          <p className="mb-2 font-semibold text-gray-800">Regrouper par</p>
          <div className="space-y-1">
          {[
            ['none', 'Aucun'],
            ['type', 'Type'],
            ['name', 'Nom'],
            ['balance', 'Solde'],
          ].map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => setGroupBy(value)}
              className={`flex w-full items-center gap-2 rounded px-2 py-1.5 text-left transition-colors ${groupBy === value ? 'bg-purple-50 font-medium text-purple-700' : 'hover:bg-gray-100'}`}
            >
              <span className="w-4 font-semibold text-purple-600">{groupBy === value ? '✓' : ''}</span>
              <span>{label}</span>
            </button>
          ))}
          </div>
        </section>

        <section className="mt-3 border-t border-gray-200 pt-3">
          <p className="mb-2 font-semibold text-gray-800">Favoris</p>
          <button
            type="button"
            onClick={() => setFavoriteOnly((value) => !value)}
            className={`flex w-full items-center gap-2 rounded px-2 py-1.5 text-left transition-colors ${favoriteOnly ? 'bg-purple-50 font-medium text-purple-700' : 'hover:bg-gray-100'}`}
          >
            <span className="w-4 font-semibold text-purple-600">{favoriteOnly ? '✓' : ''}</span>
            <FiStar size={13} />
            <span>Favoris uniquement</span>
          </button>
        </section>
      </div>

      {(activeFilters.length > 0 || favoriteOnly || groupBy !== 'none' || dateFrom !== defaultDateFrom || dateTo !== defaultDateTo) && (
        <section className="border-t border-gray-200 p-3 md:col-span-2">
          <button
            type="button"
            onClick={() => {
              clearAllFilters();
              setGroupBy('none');
              setDateFrom(defaultDateFrom);
              setDateTo(defaultDateTo);
              close();
            }}
            className="w-full rounded py-1.5 text-center text-red-600 hover:bg-red-50"
          >
            Effacer les filtres
          </button>
        </section>
      )}
    </div>
  );

  if (!activeEntity) {
    return (
      <UnifiedIndexPage
        title="Tableau de bord"
        rows={[]}
        columns={[]}
        selectable={false}
        allowColumnResize={false}
        allowColumnVisibility={false}
        allowColumnSort={false}
        renderContent={() => (
          <div className="p-6 text-sm text-gray-600">Vous devez sélectionner une entité.</div>
        )}
      />
    );
  }

  return (
    <UnifiedIndexPage
      title="Tableau de bord"
      rows={displayedJournals}
      columns={[]}
      rowKey="id"
      loading={loading}
      error={error}
      messageDuration={15000}
      onDismissError={() => setError('')}
      memoryKey={`comptabilite:dashboard:v2:${activeEntity.id}`}
      memoryState={dashboardMemoryState}
      onRestoreMemoryState={restoreDashboardMemory}
      searchValue={searchText}
      onSearchChange={setSearchText}
      searchPlaceholder="Rechercher un journal..."
      searchActions={[
        {
          id: 'refresh-dashboard',
          label: 'Actualiser',
          title: 'Actualiser le tableau de bord',
          showLabel: true,
          onClick: loadDashboard,
          disabled: loading,
          active: loading,
          icon: <FiRefreshCcw size={16} className={loading ? 'animate-spin' : ''} />,
        },
      ]}
      filterChips={dashboardFilterChips}
      onRemoveFilterChip={(chip) => {
        if (chip.kind === 'period') {
          setDateFrom(defaultDateFrom);
          setDateTo(defaultDateTo);
        }
        if (chip.kind === 'filter') removeFilter(chip.index);
        if (chip.kind === 'group') setGroupBy('none');
        if (chip.kind === 'favorite') setFavoriteOnly(false);
      }}
      renderFilters={renderDashboardFilters}
      filterPanelWidth={720}
      primaryAction={{
        label: 'Nouveau',
        icon: <FiPlus size={13} />,
        onClick: () => navigate('/comptabilite/pieces/create'),
      }}
      trailingActions={[
        {
          id: 'journals',
          label: 'Journaux',
          icon: <FiGrid size={13} />,
          onClick: () => navigate('/comptabilite/journaux'),
        },
      ]}
      selectable={false}
      page={currentJournalPage}
      onPageChange={setJournalPage}
      pageSize={journalsPerPage}
      onPageSizeChange={(size) => {
        setJournalsPerPage(Number(size));
        setJournalPage(1);
      }}
      pageSizeOptions={[3, 6, 9, 12]}
      total={filteredJournals.length}
      serverSide
      footerText={`${filteredJournals.length ? journalStartIndex + 1 : 0}-${journalEndIndex} / ${filteredJournals.length} journal(aux)`}
      allowColumnResize={false}
      allowColumnVisibility={false}
      allowColumnSort={false}
      renderContent={() => (
        <div className="space-y-4 px-4 pb-4 pt-4 text-gray-800">
        {loading && !dashboard && fallbackJournalCards.length === 0 ? (
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-2 xl:grid-cols-3" aria-label="Chargement du tableau de bord">
            {[0, 1, 2, 3, 4, 5].map((item) => (
              <div key={item} className="h-[210px] animate-pulse border border-gray-200 bg-white p-4">
                <div className="h-4 w-2/5 bg-gray-200" />
                <div className="mt-2 h-3 w-1/3 bg-gray-100" />
                <div className="mt-6 space-y-3">
                  <div className="h-3 w-full bg-gray-100" />
                  <div className="h-3 w-5/6 bg-gray-100" />
                  <div className="h-3 w-4/6 bg-gray-100" />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-3">
              {filteredJournals.length === 0 ? (
                <div className="lg:col-span-2 xl:col-span-3 bg-white border border-gray-200 p-8 text-center text-sm text-gray-500">
                  Aucun journal a afficher.
                </div>
              ) : displayedJournals.map((journal) => (
                <JournalCard
                  key={journal.id}
                  journal={journal}
                  openMenuId={openMenuId}
                  setOpenMenuId={setOpenMenuId}
                  onAction={handleJournalAction}
                  onView={handleJournalView}
                  onNew={handleJournalNew}
                  onAnalyze={handleJournalAnalyze}
                  onColor={handleJournalColor}
                  onFavorite={handleJournalFavorite}
                  onConfigure={handleJournalConfigure}
                  onOpenLine={handleJournalLineOpen}
                />
              ))}
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 items-stretch">
              <div className="bg-white border border-gray-200 h-full">
                <div className="px-4 py-3 border-b border-gray-200 flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h2 className="text-sm font-semibold text-gray-900">Analyse visuelle</h2>
                    <p className="text-xs text-gray-500">Vue compacte des indicateurs</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <select
                      value={analysis}
                      onChange={(event) => setAnalysis(event.target.value)}
                      className="h-8 px-2 border border-gray-300 bg-white text-xs focus:ring-1 focus:ring-purple-500 focus:border-purple-500"
                    >
                      <option value="journals">Journaux</option>
                      <option value="states">Etat des pieces</option>
                      <option value="payments">Paiements</option>
                      <option value="balance">Debit / Credit</option>
                    </select>
                    <ChartTypeButton active={chartType === 'pie'} icon={FiPieChart} label="Camembert" onClick={() => setChartType('pie')} />
                    <ChartTypeButton active={chartType === 'donut'} icon={FiCircle} label="Anneau" onClick={() => setChartType('donut')} />
                    <ChartTypeButton active={chartType === 'bar'} icon={FiBarChart2} label="Batons" onClick={() => setChartType('bar')} />
                    <ChartTypeButton active={chartType === 'horizontal'} icon={FiGrid} label="Bandes" onClick={() => setChartType('horizontal')} />
                    <ChartTypeButton active={chartType === 'line'} icon={FiTrendingUp} label="Courbe" onClick={() => setChartType('line')} />
                    <ChartTypeButton active={chartType === 'area'} icon={FiTrendingUp} label="Aire" onClick={() => setChartType('area')} />
                  </div>
                </div>
                <div className="px-4 pt-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs text-gray-500">Couleurs</span>
                    {analysisData.slice(0, Math.min(analysisData.length, 8)).map((item, index) => (
                      <label key={`${item.name}-${index}-color`} className="relative group w-7 h-7 border border-gray-300 rounded overflow-hidden cursor-pointer" title={item.name}>
                        <input
                          type="color"
                          value={chartColors[index % chartColors.length] || COLORS[index % COLORS.length]}
                          onChange={(event) => updateChartColor(index, event.target.value)}
                          className="absolute inset-0 w-10 h-10 -m-1 cursor-pointer"
                        />
                        <span className="sr-only">Couleur {item.name}</span>
                      </label>
                    ))}
                    <button
                      type="button"
                      onClick={() => setChartColors(COLORS)}
                      className="h-7 px-2 border border-gray-300 text-xs text-gray-600 hover:bg-gray-50 rounded"
                    >
                      Reinitialiser
                    </button>
                  </div>
                </div>
                <div className="px-4 py-3">
                  <MainChart data={analysisData} chartType={chartType} colors={chartColors} />
                </div>
              </div>

              <InsightPanel
                activeTab={insightTab}
                setActiveTab={setInsightTab}
                health={accountingHealth}
                selectedHealthKey={selectedHealthKey}
                setSelectedHealthKey={setSelectedHealthKey}
                financialFlows={financialFlows}
                selectedFlowKey={selectedFlowKey}
                setSelectedFlowKey={setSelectedFlowKey}
              />
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
              <ActivityPanel
                items={activityItems}
                onOpen={(item) => navigate(item.type === 'payment' ? `/comptabilite/paiements/${item.id}` : `/comptabilite/pieces/${item.id}`)}
              />
              <PartnerHighlightsPanel
                partners={displayPartnerHighlights}
                onOpen={(partner) => partner.id && navigate('/comptabilite/pieces', { state: { partnerId: partner.id } })}
              />
            </div>

            <KpiStrip summary={summary} amounts={amounts} onNavigate={navigate} />
          </>
        )}
        </div>
      )}
    />
  );
}
