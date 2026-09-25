// src/features/comptabilite/pages/PiecesComptables/List.jsx

import React, {
  useCallback,
  useDeferredValue,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useNavigate } from 'react-router-dom';
import { FiCalendar, FiCopy, FiPlus, FiRotateCcw, FiTrash2 } from 'react-icons/fi';
import UnifiedIndexPage from '../../../../components/UnifiedIndexPage';
import { useEntity } from '../../../../context/EntityContext';
import { piecesService } from '../../services';

const PIECES_MEMORY_KEY = 'comptabilite:pieces:index:v1';
const PIECES_DATA_CACHE_PREFIX = 'comptabilite:pieces:data:v2';
// La première réponse doit rester légère : la page affiche 15 lignes par défaut.
// Les pages suivantes sont récupérées discrètement après le premier rendu.
const PIECES_PAGE_SIZE = 25;
const PIECES_PAGE_CONCURRENCY = 2;
const piecesDataMemoryCache = new Map();
const piecesPageRequestCache = new Map();

const waitForBrowserIdle = () => new Promise((resolve) => {
  if (typeof window === 'undefined') {
    resolve();
    return;
  }

  if (typeof window.requestIdleCallback === 'function') {
    window.requestIdleCallback(resolve, { timeout: 250 });
    return;
  }

  window.requestAnimationFrame(() => window.setTimeout(resolve, 0));
});

const getPiecesDataCacheKey = (entityId) => `${PIECES_DATA_CACHE_PREFIX}:${entityId}`;

const readPiecesDataCache = (entityId) => {
  if (!entityId) return null;
  const cacheKey = String(entityId);
  if (piecesDataMemoryCache.has(cacheKey)) return piecesDataMemoryCache.get(cacheKey);
  if (typeof window === 'undefined') return null;

  try {
    const cached = JSON.parse(window.sessionStorage.getItem(getPiecesDataCacheKey(entityId)) || 'null');
    if (!cached || !Array.isArray(cached.pieces)) return null;
    piecesDataMemoryCache.set(cacheKey, cached);
    return cached;
  } catch (cacheError) {
    console.warn('Cache local des pièces illisible:', cacheError);
    return null;
  }
};

const compactPieceForCache = (piece) => {
  const compactPiece = { ...piece };
  [
    'lines',
    'traceability',
    'module_traceability',
    'moduleTraceability',
    'audit_logs',
    'auditLogs',
    'history',
    'activity_logs',
    'activityLogs',
    'logs',
  ].forEach((field) => delete compactPiece[field]);
  return compactPiece;
};

const writePiecesDataCache = (entityId, pieces) => {
  if (!entityId || !Array.isArray(pieces)) return;
  const cached = {
    pieces: pieces.map(compactPieceForCache),
    updatedAt: Date.now(),
  };
  piecesDataMemoryCache.set(String(entityId), cached);
  if (typeof window === 'undefined') return;

  try {
    window.sessionStorage.setItem(getPiecesDataCacheKey(entityId), JSON.stringify(cached));
  } catch (cacheError) {
    // Le cache mémoire reste disponible si le quota du navigateur est atteint.
    console.warn('Cache local des pièces indisponible:', cacheError);
  }
};

const DEFAULT_VISIBLE_COLUMN_IDS = [
  'date',
  'numero',
  'journal_name',
  'journal_prefix',
  'reference',
  'partenaire',
  'montant_ht',
  'montant_taxes',
  'montant_ttc',
  'etat',
  'paiement',
];

const normalizeApiList = (response) => {
  if (Array.isArray(response)) return response;
  if (Array.isArray(response?.results)) return response.results;
  if (Array.isArray(response?.data)) return response.data;
  if (Array.isArray(response?.data?.results)) return response.data.results;
  return [];
};

const normalizeApiPage = (response) => {
  const payload = response?.data && !Array.isArray(response.data) ? response.data : response;
  const results = normalizeApiList(response);
  const rawCount = payload?.count ?? response?.count;
  const count = Number.isFinite(Number(rawCount)) ? Number(rawCount) : results.length;
  return {
    results,
    count,
    hasPagination: Boolean(payload?.next || response?.next || count > results.length),
  };
};

const requestPiecesPage = (entityId, page, force = false) => {
  const requestKey = `${entityId}:${page}`;
  if (!force && piecesPageRequestCache.has(requestKey)) {
    return piecesPageRequestCache.get(requestKey);
  }

  const request = piecesService.getAll(entityId, {
    page,
    page_size: PIECES_PAGE_SIZE,
  });
  piecesPageRequestCache.set(requestKey, request);
  const releaseRequest = () => {
    setTimeout(() => {
      if (piecesPageRequestCache.get(requestKey) === request) {
        piecesPageRequestCache.delete(requestKey);
      }
    }, 1000);
  };
  request.then(releaseRequest, releaseRequest);
  return request;
};

const loadRemainingPiecePages = async (entityId, pageCount, force = false) => {
  if (pageCount <= 1) return [];
  const pageNumbers = Array.from({ length: pageCount - 1 }, (_, index) => index + 2);
  const pageResults = new Array(pageNumbers.length);
  let nextIndex = 0;

  const worker = async () => {
    while (nextIndex < pageNumbers.length) {
      const resultIndex = nextIndex;
      nextIndex += 1;
      const response = await requestPiecesPage(entityId, pageNumbers[resultIndex], force);
      pageResults[resultIndex] = normalizeApiList(response);
    }
  };

  const workerCount = Math.min(PIECES_PAGE_CONCURRENCY, pageNumbers.length);
  await Promise.all(Array.from({ length: workerCount }, () => worker()));
  return pageResults.flat();
};

const formatAmount = (value) => {
  const number = Number.parseFloat(value);
  if (!Number.isFinite(number)) return '0';
  return Math.round(number).toLocaleString('fr-FR');
};

const formatListDate = (value) => {
  if (!value) return '—';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return '—';
  return parsed.toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
};

const getRegistrationDate = (piece) => (
  piece?.registration_date
  || piece?.create_date
  || piece?.created_at
  || piece?.date_created
  || piece?.write_date
  || ''
);

const getPieceDateByMode = (piece, mode) => (
  mode === 'registration' ? getRegistrationDate(piece) : (piece?.date || '')
);

const normalizeText = (value) => String(value || '')
  .trim()
  .toLowerCase()
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '');

const getLineSignedAmount = (line) => {
  const debit = Number.parseFloat(line?.debit) || 0;
  const credit = Number.parseFloat(line?.credit) || 0;
  return Math.abs(debit) >= Math.abs(credit) ? debit : credit;
};

const hasLineTaxes = (line) => Array.isArray(line?.tax_ids) && line.tax_ids.length > 0;

const isGeneratedTaxLine = (line) => {
  const text = normalizeText(`${line?.name || ''} ${line?.tax_line_name || ''} ${line?.account_name || ''}`);
  const accountCode = String(line?.account_code || '').trim();
  return Boolean(
    line?.tax_line
    || line?.tax_line_name
    || line?.tax_repartition_line
    || text.includes('tva')
    || (accountCode.startsWith('442') && !text.includes('retenue'))
  );
};

const isGeneratedWithholdingLine = (line) => {
  const text = normalizeText(`${line?.name || ''} ${line?.withholding_tax_name || ''}`);
  return text.includes('retenue');
};

const isCounterpartLine = (line) => {
  const text = normalizeText(line?.name);
  return Boolean(line?.is_counterpart || text.includes('contrepartie'));
};

const getTaxRate = (tax, taxesMap) => {
  if (!tax) return 0;
  if (typeof tax === 'object') return Number.parseFloat(tax.amount) || 0;
  const mappedTax = taxesMap?.[tax] || taxesMap?.[Number.parseInt(tax, 10)];
  return Number.parseFloat(mappedTax?.amount) || 0;
};

const calculateTaxFromBaseLines = (lines, taxesMap) => lines.reduce((total, line) => {
  if (!hasLineTaxes(line)) return total;
  const signedAmount = getLineSignedAmount(line);
  const sign = signedAmount < 0 ? -1 : 1;
  const baseAmount = Math.abs(Number.parseFloat(line.tax_base_amount) || signedAmount || 0);
  const lineTaxAmount = line.tax_ids.reduce((lineTotal, tax) => (
    lineTotal + ((baseAmount * getTaxRate(tax, taxesMap)) / 100)
  ), 0);
  return total + (lineTaxAmount * sign);
}, 0);

const calculateAmounts = (piece, taxesMap) => {
  const lines = Array.isArray(piece?.lines) ? piece.lines : [];
  if (!lines.length) {
    return {
      amount_untaxed: Number.parseFloat(piece?.amount_untaxed) || 0,
      amount_tax: Number.parseFloat(piece?.amount_tax) || 0,
      amount_total: Number.parseFloat(piece?.amount_total) || 0,
    };
  }

  const taxLines = lines.filter(isGeneratedTaxLine);
  const commercialLines = lines.filter((line) => (
    !isGeneratedTaxLine(line)
    && !isGeneratedWithholdingLine(line)
    && !isCounterpartLine(line)
  ));

  const taxAmount = taxLines.length
    ? taxLines.reduce((total, line) => total + getLineSignedAmount(line), 0)
    : calculateTaxFromBaseLines(commercialLines, taxesMap);

  const totals = commercialLines.reduce((result, line) => ({
    debit: result.debit + (Number.parseFloat(line.debit) || 0),
    credit: result.credit + (Number.parseFloat(line.credit) || 0),
  }), { debit: 0, credit: 0 });

  const amountUntaxed = Math.abs(totals.debit) >= Math.abs(totals.credit)
    ? totals.debit
    : totals.credit;

  return {
    amount_untaxed: amountUntaxed,
    amount_tax: taxAmount,
    amount_total: amountUntaxed + taxAmount,
  };
};

const normalizeMoveState = (state) => {
  const value = normalizeText(state || 'draft');
  if (['posted', 'post', 'valid', 'valide', 'validee', 'validated'].includes(value) || value.includes('comptabilis')) return 'posted';
  if (['cancel', 'cancelled', 'canceled', 'annule', 'annulee'].includes(value)) return 'cancel';
  if (['deleted', 'delete', 'supprime', 'supprimee'].includes(value)) return 'deleted';
  if (['draft', 'brouillon'].includes(value)) return 'draft';
  return value || 'draft';
};

const getActionErrorMessage = (error, fallback) => {
  const data = error?.response?.data || error?.data;
  if (typeof data === 'string') return data;
  if (data?.detail) return data.detail;
  if (data) return JSON.stringify(data);
  return error?.message || fallback;
};

const getPieceTraceabilityLogs = (piece) => {
  const logs = piece?.traceability
    || piece?.module_traceability
    || piece?.moduleTraceability
    || piece?.audit_logs
    || piece?.auditLogs
    || piece?.history
    || piece?.activity_logs
    || piece?.activityLogs
    || piece?.logs
    || [];
  return Array.isArray(logs) ? logs : (logs?.results || []);
};

const getPieceBusinessStatuses = (piece) => {
  const logs = getPieceTraceabilityLogs(piece);
  const traceText = logs.map((log) => [
    log.action,
    log.description,
    log.object_label,
    log.objectLabel,
    log.metadata?.source_move_name,
  ].filter(Boolean).join(' ')).join(' ').toLowerCase();
  const searchable = `${String(piece?.name || '').toLowerCase()} ${String(piece?.ref || '').toLowerCase()} ${traceText}`;
  const statuses = [];

  if (searchable.includes('création par duplication') || searchable.includes('creation par duplication') || searchable.includes('(copie)')) statuses.push('duplicated');
  if (searchable.includes('création par extourne') || searchable.includes('creation par extourne') || String(piece?.name || '').toLowerCase().startsWith('extourne de')) statuses.push('reversal');
  if (searchable.includes('extourne créée') || searchable.includes('extourne creee')) statuses.push('reversed');
  return statuses;
};

const businessStatusConfig = {
  duplicated: { text: 'Dupliquée', className: 'bg-blue-100 text-blue-700' },
  reversal: { text: 'Extourne', className: 'bg-purple-100 text-purple-700' },
  reversed: { text: 'Extournée', className: 'bg-indigo-100 text-indigo-700' },
};

const getJournalCode = (piece) => {
  if (piece?.journal_detail) return piece.journal_detail.prefix || piece.journal_detail.code || '—';
  if (piece?.journal && typeof piece.journal === 'object') return piece.journal.prefix || piece.journal.code || '—';
  return piece?.journal_prefix || piece?.journal_code || piece?.journal || '—';
};

const getJournalName = (piece) => {
  if (piece?.journal_detail) return piece.journal_detail.name || piece.journal_detail.nom || '—';
  if (piece?.journal && typeof piece.journal === 'object') return piece.journal.name || piece.journal.nom || '—';
  return piece?.journal_name || piece?.journal_id_label || piece?.journal_label || '—';
};

const getPartnerDisplay = (piece) => {
  if (piece?.partner_detail) return piece.partner_detail;
  if (piece?.partner && typeof piece.partner === 'object') {
    return {
      ...piece.partner,
      displayName: piece.partner.raison_sociale || piece.partner.nom || piece.partner.name || 'Partenaire',
    };
  }
  return null;
};

const getCurrencyCode = (piece) => {
  if (piece?.currency_detail?.code) return piece.currency_detail.code;
  if (piece?.currency && typeof piece.currency === 'object') return piece.currency.code || 'XOF';
  if (typeof piece?.currency === 'string') return piece.currency;
  return 'XOF';
};

const StateBadge = ({ piece }) => {
  const state = normalizeMoveState(piece?.state);
  const config = {
    posted: { text: 'Comptabilisé', className: 'bg-green-100 text-green-700' },
    draft: { text: 'Brouillon', className: 'bg-amber-100 text-amber-700' },
    cancel: { text: 'Annulé', className: 'bg-red-100 text-red-700' },
    deleted: { text: 'Supprimé', className: 'bg-slate-200 text-slate-700' },
  }[state] || { text: piece?.state || 'Inconnu', className: 'bg-gray-100 text-gray-700' };

  return (
    <div className="flex min-w-0 flex-wrap items-center gap-1">
      <span className={`inline-flex whitespace-nowrap rounded-full px-1.5 py-0.5 text-[10px] font-medium ${config.className}`}>
        {config.text}
      </span>
      {(piece?._business_statuses || getPieceBusinessStatuses(piece)).map((status) => {
        const item = businessStatusConfig[status];
        return item ? (
          <span key={status} className={`inline-flex whitespace-nowrap rounded-full px-1.5 py-0.5 text-[10px] font-medium ${item.className}`}>
            {item.text}
          </span>
        ) : null;
      })}
    </div>
  );
};

const PaymentBadge = ({ state }) => {
  const config = {
    not_paid: { text: 'Non payé', className: 'bg-gray-100 text-gray-700' },
    paid: { text: 'Payé', className: 'bg-green-100 text-green-700' },
    partial: { text: 'Partiel', className: 'bg-yellow-100 text-yellow-700' },
  }[state] || { text: state || '—', className: 'bg-gray-100 text-gray-700' };
  return (
    <span className={`inline-flex whitespace-nowrap rounded-full px-1.5 py-0.5 text-[10px] font-medium ${config.className}`}>
      {config.text}
    </span>
  );
};

const PartnerDisplay = ({ partner }) => {
  if (!partner) return <span className="text-xs text-gray-400">—</span>;
  const name = partner.displayName || partner.raison_sociale || partner.nom || partner.name || 'Partenaire';
  return (
    <div className="min-w-0 leading-tight" title={[name, partner.email].filter(Boolean).join(' - ')}>
      <div className="truncate text-xs font-medium text-gray-800">{name}</div>
      {partner.email && <div className="truncate text-[10px] text-gray-400">{partner.email}</div>}
    </div>
  );
};

const AmountDisplay = ({ value, currency, tone = 'default' }) => {
  const tones = {
    default: 'text-gray-800',
    tax: 'text-blue-700',
    total: 'text-red-700',
  };
  return (
    <span className={`whitespace-nowrap text-xs font-medium ${tones[tone]}`}>
      {formatAmount(value)} <span className="text-[10px] font-normal text-gray-400">{currency}</span>
    </span>
  );
};

const referentialCache = new Map();
const referentialValueCache = new Map();

const buildReferentialData = (partnersResponse, journalsResponse, currenciesResponse, taxesResponse) => {
  const partners = normalizeApiList(partnersResponse);
  const journals = normalizeApiList(journalsResponse);
  const currencies = normalizeApiList(currenciesResponse);
  const taxes = normalizeApiList(taxesResponse);

  return {
    partners,
    journals,
    partnersMap: Object.fromEntries(partners.map((partner) => [String(partner.id), {
      ...partner,
      displayName: partner.raison_sociale || partner.nom || partner.name || 'Partenaire',
    }])),
    journalsMap: Object.fromEntries(journals.map((journal) => [String(journal.id), journal])),
    currenciesMap: Object.fromEntries(currencies.map((currency) => [String(currency.id), currency])),
    taxesMap: Object.fromEntries(taxes.map((tax) => [String(tax.id), tax])),
  };
};

const getReferentialData = (entityId) => {
  const cacheKey = String(entityId);
  if (referentialCache.has(cacheKey)) return referentialCache.get(cacheKey);

  const request = Promise.all([
    piecesService.getPartners(entityId),
    piecesService.getJournals(entityId),
    piecesService.getDevises(entityId),
    piecesService.getTaxes ? piecesService.getTaxes(entityId) : Promise.resolve([]),
  ])
    .then((responses) => {
      const data = buildReferentialData(...responses);
      referentialValueCache.set(cacheKey, data);
      return data;
    })
    .catch((error) => {
      referentialCache.delete(cacheKey);
      throw error;
    });

  referentialCache.set(cacheKey, request);
  return request;
};

const enrichPieces = (rawPieces, referentials = {}) => rawPieces.map((piece) => {
  const getId = (value) => (value && typeof value === 'object' ? value.id : value);
  let partnerId = getId(piece.partner);
  if (!partnerId) partnerId = getId((piece.lines || []).find((line) => line.partner)?.partner);
  const journalId = getId(piece.journal);
  const currencyId = getId(piece.currency);
  const partnerObject = piece.partner && typeof piece.partner === 'object' ? piece.partner : null;
  const journalObject = piece.journal && typeof piece.journal === 'object' ? piece.journal : null;
  const currencyObject = piece.currency && typeof piece.currency === 'object' ? piece.currency : null;

  const enrichedPiece = {
    ...piece,
    ...calculateAmounts(piece, referentials.taxesMap || {}),
    state: normalizeMoveState(piece.state),
    partner_detail: referentials.partnersMap?.[String(partnerId)] || piece.partner_detail || partnerObject,
    journal_detail: referentials.journalsMap?.[String(journalId)] || piece.journal_detail || journalObject,
    currency_detail: referentials.currenciesMap?.[String(currencyId)] || piece.currency_detail || currencyObject,
    lines: Array.isArray(piece.lines) ? piece.lines : [],
  };

  enrichedPiece._business_statuses = getPieceBusinessStatuses(enrichedPiece);
  const partner = getPartnerDisplay(enrichedPiece);
  enrichedPiece._search_text = normalizeText([
    enrichedPiece.name,
    enrichedPiece.ref,
    getJournalCode(enrichedPiece),
    getJournalName(enrichedPiece),
    partner?.displayName,
    partner?.email,
    enrichedPiece.payment_state,
    enrichedPiece.state,
    ...enrichedPiece._business_statuses,
  ].filter(Boolean).join(' '));
  return enrichedPiece;
});

export default function PiecesComptablesList() {
  const navigate = useNavigate();
  const { activeEntity } = useEntity();
  const entityId = activeEntity?.id;
  const loadRequestRef = useRef(0);
  const [initialCachedData] = useState(() => readPiecesDataCache(entityId));

  const [pieces, setPieces] = useState(() => (
    initialCachedData?.pieces || []
  ));
  const [loading, setLoading] = useState(() => Boolean(entityId && !initialCachedData));
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [actionLoading, setActionLoading] = useState('');
  const [search, setSearch] = useState('');
  const deferredSearch = useDeferredValue(search);
  const [selectedPieceIds, setSelectedPieceIds] = useState([]);
  const [activeFilters, setActiveFilters] = useState([]);
  const [dateDisplayMode, setDateDisplayMode] = useState('accounting');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(15);
  const [visibleColumnIds, setVisibleColumnIds] = useState(DEFAULT_VISIBLE_COLUMN_IDS);
  const [partnerOptions, setPartnerOptions] = useState([]);
  const [journalOptions, setJournalOptions] = useState([]);

  const loadData = useCallback(async (force = false) => {
    const requestId = loadRequestRef.current + 1;
    loadRequestRef.current = requestId;
    let firstPageDisplayed = false;

    if (!entityId) {
      setPieces([]);
      setLoading(false);
      setError('Veuillez sélectionner une entité pour voir les pièces comptables.');
      return;
    }

    const cachedData = readPiecesDataCache(entityId);
    if (cachedData) {
      setPieces(cachedData.pieces);
      setLoading(false);
    } else {
      setPieces([]);
      setLoading(true);
    }
    setSelectedPieceIds([]);

    try {
      setError('');

      const piecesResponse = await requestPiecesPage(entityId, 1, force);
      if (loadRequestRef.current !== requestId) return;

      const firstPage = normalizeApiPage(piecesResponse);
      const knownReferentials = referentialValueCache.get(String(entityId)) || {};
      const firstPieces = enrichPieces(firstPage.results, knownReferentials);
      setPieces(firstPieces);
      writePiecesDataCache(entityId, firstPieces);
      setLoading(false);
      firstPageDisplayed = true;

      // Le navigateur peint d'abord les premières lignes. Les requêtes moins
      // urgentes ne ralentissent donc plus l'arrivée de la liste à l'écran.
      await waitForBrowserIdle();
      if (loadRequestRef.current !== requestId) return;

      const referentialsRequest = getReferentialData(entityId)
        .then((data) => ({ data, error: null }))
        .catch((referentialError) => ({ data: null, error: referentialError }));

      const effectivePageSize = firstPage.results.length || PIECES_PAGE_SIZE;
      const pageCount = firstPage.hasPagination
        ? Math.max(1, Math.ceil(firstPage.count / effectivePageSize))
        : 1;
      const remainingPieces = await loadRemainingPiecePages(entityId, pageCount, force);
      if (loadRequestRef.current !== requestId) return;

      const rawPieces = remainingPieces.length
        ? [...firstPage.results, ...remainingPieces]
        : firstPage.results;
      const piecesWithKnownReferentials = remainingPieces.length
        ? enrichPieces(rawPieces, knownReferentials)
        : firstPieces;
      setPieces(piecesWithKnownReferentials);
      writePiecesDataCache(entityId, piecesWithKnownReferentials);

      const referentialResult = await referentialsRequest;
      if (loadRequestRef.current !== requestId) return;

      if (referentialResult.data) {
        const enrichedPieces = enrichPieces(rawPieces, referentialResult.data);
        setPieces(enrichedPieces);
        writePiecesDataCache(entityId, enrichedPieces);
        setPartnerOptions(referentialResult.data.partners);
        setJournalOptions(referentialResult.data.journals);
      } else {
        console.warn('Référentiels chargés partiellement:', referentialResult.error);
      }
    } catch (loadError) {
      if (loadRequestRef.current !== requestId) return;
      console.error('Erreur chargement pièces:', loadError);
      setError((cachedData || firstPageDisplayed)
        ? 'Impossible d\'actualiser les pièces comptables. La dernière liste disponible reste affichée.'
        : 'Impossible de charger les pièces comptables.');
      if (!cachedData && !firstPageDisplayed) setPieces([]);
    } finally {
      if (loadRequestRef.current === requestId) setLoading(false);
    }
  }, [entityId]);

  useEffect(() => {
    loadData();
    return () => {
      loadRequestRef.current += 1;
    };
  }, [loadData]);

  const toggleFilter = useCallback((filter) => {
    setActiveFilters((previous) => {
      const exists = previous.some((item) => item.id === filter.id);
      return exists ? previous.filter((item) => item.id !== filter.id) : [...previous, filter];
    });
    setCurrentPage(1);
  }, []);

  const hasFilter = useCallback((id) => activeFilters.some((filter) => filter.id === id), [activeFilters]);

  const filteredPieces = useMemo(() => {
    const query = normalizeText(deferredSearch);
    return pieces.filter((piece) => {
      const partner = getPartnerDisplay(piece);
      const businessStatuses = piece._business_statuses || getPieceBusinessStatuses(piece);
      const searchable = piece._search_text || '';

      if (query && !searchable.includes(query)) return false;

      return activeFilters.every((filter) => {
        if (filter.kind === 'state') return normalizeMoveState(piece.state) === filter.value;
        if (filter.kind === 'business') return businessStatuses.includes(filter.value);
        if (filter.kind === 'payment') return String(piece.payment_state || 'not_paid') === filter.value;
        if (filter.kind === 'journal') return String(piece.journal_detail?.id || piece.journal?.id || piece.journal) === filter.value;
        if (filter.kind === 'partner') return String(partner?.id || piece.partner?.id || piece.partner) === filter.value;
        return true;
      });
    });
  }, [activeFilters, deferredSearch, pieces]);

  const runAction = useCallback(async (actionId, callback, successMessage) => {
    try {
      setActionLoading(actionId);
      setError('');
      await callback();
      setSelectedPieceIds([]);
      setSuccess(successMessage);
      await loadData(true);
    } catch (actionError) {
      setError(getActionErrorMessage(actionError, 'Action impossible.'));
    } finally {
      setActionLoading('');
    }
  }, [loadData]);

  const getSelectedPieces = useCallback(() => {
    const selected = new Set(selectedPieceIds.map(String));
    return pieces.filter((piece) => selected.has(String(piece.id)));
  }, [pieces, selectedPieceIds]);

  const handleBulkValidate = useCallback(async () => {
    const selected = getSelectedPieces();
    if (selected.some((piece) => normalizeMoveState(piece.state) !== 'draft')) {
      setError('Seules les pièces en brouillon peuvent être validées.');
      return;
    }
    if (!window.confirm(`Valider ${selected.length} pièce(s) ?`)) return;
    await runAction('validate', async () => {
      const { apiClient } = await import('../../services');
      await Promise.all(selected.map((piece) => apiClient.post(`compta/moves/${piece.id}/post/`, {})));
    }, `${selected.length} pièce(s) comptabilisée(s).`);
  }, [getSelectedPieces, runAction]);

  const handleBulkCancel = useCallback(async () => {
    const selected = getSelectedPieces();
    if (selected.some((piece) => !['draft', 'posted'].includes(normalizeMoveState(piece.state)))) {
      setError('Seules les pièces brouillon ou comptabilisées peuvent être annulées.');
      return;
    }
    if (!window.confirm(`Annuler ${selected.length} pièce(s) ?`)) return;
    await runAction('cancel', async () => {
      const { apiClient } = await import('../../services');
      await Promise.all(selected.map((piece) => apiClient.post(`compta/moves/${piece.id}/cancel/`, {})));
    }, `${selected.length} pièce(s) annulée(s).`);
  }, [getSelectedPieces, runAction]);

  const handleDuplicate = useCallback(async () => {
    const selected = getSelectedPieces();
    if (selected.some((piece) => normalizeMoveState(piece.state) === 'deleted')) {
      setError('Une pièce supprimée ne peut pas être dupliquée.');
      return;
    }
    if (!window.confirm(`Dupliquer ${selected.length} pièce(s) ?`)) return;
    await runAction('duplicate', async () => {
      const { apiClient } = await import('../../services');
      await Promise.all(selected.map((piece) => apiClient.post(`compta/moves/${piece.id}/duplicate/`, {})));
    }, `${selected.length} pièce(s) dupliquée(s).`);
  }, [getSelectedPieces, runAction]);

  const handleReverse = useCallback(async () => {
    const selected = getSelectedPieces();
    if (selected.some((piece) => normalizeMoveState(piece.state) !== 'posted')) {
      setError('Seules les pièces comptabilisées peuvent être extournées.');
      return;
    }
    const reason = window.prompt(
      "Motif de l'extourne",
      selected.length === 1 ? `Extourne de ${selected[0]?.name || 'la pièce'}` : `Extourne de ${selected.length} pièces`,
    );
    if (reason === null) return;
    await runAction('reverse', async () => {
      const { apiClient } = await import('../../services');
      await Promise.all(selected.map((piece) => apiClient.post(`compta/moves/${piece.id}/reverse/`, { reason })));
    }, `${selected.length} extourne(s) créée(s).`);
  }, [getSelectedPieces, runAction]);

  const handleDelete = useCallback(async () => {
    const selected = getSelectedPieces();
    if (selected.some((piece) => normalizeMoveState(piece.state) === 'deleted')) {
      setError('Certaines pièces sélectionnées sont déjà supprimées.');
      return;
    }
    if (!window.confirm(`Supprimer ${selected.length} pièce(s) ? Elles resteront consultables dans le filtre Supprimé.`)) return;
    await runAction('delete', async () => {
      const { apiClient } = await import('../../services');
      await Promise.all(selected.map(async (piece) => {
        if (piecesService.delete) return piecesService.delete(piece.id, entityId);
        return apiClient.delete(`compta/moves/${piece.id}/`);
      }));
    }, `${selected.length} pièce(s) supprimée(s).`);
  }, [entityId, getSelectedPieces, runAction]);

  const columns = useMemo(() => [
    {
      id: 'date',
      label: (
        <span className="inline-flex items-center gap-1">
          {dateDisplayMode === 'registration' ? "Date d'enregistrement" : 'Date comptable'}
          <span
            role="button"
            tabIndex={0}
            title="Changer le type de date"
            onClick={(event) => {
              event.stopPropagation();
              setDateDisplayMode((mode) => (mode === 'accounting' ? 'registration' : 'accounting'));
            }}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                event.stopPropagation();
                setDateDisplayMode((mode) => (mode === 'accounting' ? 'registration' : 'accounting'));
              }
            }}
            className="inline-flex h-5 w-5 items-center justify-center rounded text-gray-500 hover:bg-purple-100 hover:text-purple-700"
          >
            <FiCalendar size={11} />
          </span>
        </span>
      ),
      minWidth: 112,
      value: (piece) => getPieceDateByMode(piece, dateDisplayMode),
      sortValue: (piece) => getPieceDateByMode(piece, dateDisplayMode),
      render: (_, piece) => <span className="whitespace-nowrap text-xs">{formatListDate(getPieceDateByMode(piece, dateDisplayMode))}</span>,
    },
    {
      id: 'numero',
      label: 'N° Pièce',
      minWidth: 120,
      value: (piece) => piece.name || '',
      render: (_, piece) => (
        <div className="min-w-0 leading-tight" title={piece.name || '—'}>
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              navigate(`/comptabilite/pieces/${piece.id}`);
            }}
            className="block max-w-full truncate text-left text-xs font-semibold text-teal-700 transition-colors hover:text-purple-700 hover:underline"
            title={`Ouvrir la pièce ${piece.name || ''}`}
          >
            {piece.name || '—'}
          </button>
        </div>
      ),
    },
    {
      id: 'journal_name',
      label: 'Nom du journal',
      minWidth: 120,
      value: getJournalName,
      render: (_, piece) => (
        <span className="block truncate text-xs" title={getJournalName(piece)}>
          {getJournalName(piece)}
        </span>
      ),
    },
    {
      id: 'journal_prefix',
      label: 'Préfixe',
      minWidth: 70,
      value: getJournalCode,
      render: (_, piece) => (
        <span className="whitespace-nowrap font-mono text-xs font-semibold text-gray-700">
          {getJournalCode(piece)}
        </span>
      ),
    },
    {
      id: 'reference',
      label: 'Référence',
      minWidth: 90,
      value: (piece) => piece.ref || '',
      render: (_, piece) => <span className="block truncate text-xs" title={piece.ref || '—'}>{piece.ref || '—'}</span>,
    },
    {
      id: 'partenaire',
      label: 'Partenaire',
      minWidth: 130,
      value: (piece) => getPartnerDisplay(piece)?.displayName || '',
      render: (_, piece) => <PartnerDisplay partner={getPartnerDisplay(piece)} />,
    },
    {
      id: 'montant_ht',
      label: 'HT',
      minWidth: 105,
      align: 'right',
      value: (piece) => piece.amount_untaxed || 0,
      sortValue: (piece) => Number(piece.amount_untaxed) || 0,
      render: (_, piece) => <AmountDisplay value={piece.amount_untaxed} currency={getCurrencyCode(piece)} />,
    },
    {
      id: 'montant_taxes',
      label: 'Taxes',
      minWidth: 105,
      align: 'right',
      value: (piece) => piece.amount_tax || 0,
      sortValue: (piece) => Number(piece.amount_tax) || 0,
      render: (_, piece) => <AmountDisplay value={piece.amount_tax} currency={getCurrencyCode(piece)} tone="tax" />,
    },
    {
      id: 'montant_ttc',
      label: 'TTC',
      minWidth: 105,
      align: 'right',
      value: (piece) => piece.amount_total || 0,
      sortValue: (piece) => Number(piece.amount_total) || 0,
      render: (_, piece) => <AmountDisplay value={piece.amount_total} currency={getCurrencyCode(piece)} tone="total" />,
    },
    {
      id: 'etat',
      label: 'État',
      minWidth: 110,
      value: (piece) => [normalizeMoveState(piece.state), ...(piece._business_statuses || getPieceBusinessStatuses(piece))].join(' '),
      render: (_, piece) => <StateBadge piece={piece} />,
    },
    {
      id: 'paiement',
      label: 'Paiement',
      minWidth: 82,
      value: (piece) => piece.payment_state || '',
      render: (_, piece) => <PaymentBadge state={piece.payment_state} />,
    },
  ], [dateDisplayMode, navigate]);

  const renderFilters = useCallback(({ close }) => (
    <div className="grid grid-cols-1 text-xs text-gray-700 md:grid-cols-[minmax(220px,0.8fr)_minmax(360px,1.4fr)]">
      <div className="border-b border-gray-200 p-3 md:border-b-0 md:border-r">
        <p className="mb-2 font-semibold text-gray-800">Ajouter un filtre</p>
        <div className="space-y-1">
          {[
            { id: 'state:draft', kind: 'state', value: 'draft', label: 'Brouillon' },
            { id: 'state:posted', kind: 'state', value: 'posted', label: 'Comptabilisé' },
            { id: 'state:cancel', kind: 'state', value: 'cancel', label: 'Annulé' },
            { id: 'state:deleted', kind: 'state', value: 'deleted', label: 'Supprimé' },
            { id: 'business:duplicated', kind: 'business', value: 'duplicated', label: 'Dupliquée' },
            { id: 'business:reversal', kind: 'business', value: 'reversal', label: 'Extourne' },
            { id: 'business:reversed', kind: 'business', value: 'reversed', label: 'Extournée' },
            { id: 'payment:not_paid', kind: 'payment', value: 'not_paid', label: 'Non payé' },
            { id: 'payment:partial', kind: 'payment', value: 'partial', label: 'Paiement partiel' },
            { id: 'payment:paid', kind: 'payment', value: 'paid', label: 'Payé' },
          ].map((filter) => (
            <button
              key={filter.id}
              type="button"
              onClick={() => toggleFilter(filter)}
              className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left hover:bg-gray-100"
            >
              <span className="w-4 font-semibold text-purple-600">{hasFilter(filter.id) ? '✓' : ''}</span>
              <span>{filter.label}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="p-3">
        <p className="mb-2 font-semibold text-gray-800">Affichage et référentiels</p>
        <div className="space-y-1">
          {[
            { value: 'accounting', label: 'Date comptable' },
            { value: 'registration', label: "Date d'enregistrement" },
          ].map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => setDateDisplayMode(option.value)}
              className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left hover:bg-gray-100"
            >
              <span className="w-4 font-semibold text-purple-600">{dateDisplayMode === option.value ? '✓' : ''}</span>
              <span>{option.label}</span>
            </button>
          ))}
        </div>

        {journalOptions.length > 0 && (
          <div className="mt-3 border-t border-gray-200 pt-3">
            <p className="mb-2 font-semibold text-gray-800">Journal</p>
            <div className="max-h-36 space-y-1 overflow-y-auto">
              {journalOptions.map((journal) => {
                const id = `journal:${journal.id}`;
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => toggleFilter({ id, kind: 'journal', value: String(journal.id), label: journal.name || journal.nom || journal.code })}
                    className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left hover:bg-gray-100"
                  >
                    <span className="w-4 shrink-0 font-semibold text-purple-600">{hasFilter(id) ? '✓' : ''}</span>
                    <span className="truncate">{journal.name || journal.nom || journal.code}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {partnerOptions.length > 0 && (
          <div className="mt-3 border-t border-gray-200 pt-3">
            <p className="mb-2 font-semibold text-gray-800">Partenaire</p>
            <div className="max-h-36 space-y-1 overflow-y-auto">
              {partnerOptions.map((partner) => {
                const id = `partner:${partner.id}`;
                const label = partner.raison_sociale || partner.nom || partner.name || 'Partenaire';
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => toggleFilter({ id, kind: 'partner', value: String(partner.id), label })}
                    className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left hover:bg-gray-100"
                  >
                    <span className="w-4 shrink-0 font-semibold text-purple-600">{hasFilter(id) ? '✓' : ''}</span>
                    <span className="truncate">{label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {(activeFilters.length > 0 || search.trim()) && (
        <div className="border-t border-gray-200 p-3 md:col-span-2">
          <button
            type="button"
            onClick={() => {
              setActiveFilters([]);
              setSearch('');
              setCurrentPage(1);
              close();
            }}
            className="w-full rounded py-1.5 text-center text-red-600 hover:bg-red-50"
          >
            Effacer les filtres
          </button>
        </div>
      )}
    </div>
  ), [activeFilters.length, dateDisplayMode, hasFilter, journalOptions, partnerOptions, search, toggleFilter]);

  const selectionActions = useMemo(() => [
    {
      id: 'validate',
      label: actionLoading === 'validate' ? 'Validation...' : 'Comptabiliser',
      variant: 'success',
      disabled: Boolean(actionLoading),
      onClick: handleBulkValidate,
    },
    {
      id: 'cancel',
      label: actionLoading === 'cancel' ? 'Annulation...' : 'Annuler',
      variant: 'danger',
      disabled: Boolean(actionLoading),
      onClick: handleBulkCancel,
    },
    {
      id: 'duplicate',
      label: actionLoading === 'duplicate' ? 'Duplication...' : 'Dupliquer',
      icon: <FiCopy size={13} />,
      disabled: Boolean(actionLoading),
      onClick: handleDuplicate,
    },
    {
      id: 'reverse',
      label: actionLoading === 'reverse' ? 'Extourne...' : 'Extourner',
      icon: <FiRotateCcw size={13} />,
      disabled: Boolean(actionLoading),
      onClick: handleReverse,
    },
    {
      id: 'delete',
      label: actionLoading === 'delete' ? 'Suppression...' : 'Supprimer',
      icon: <FiTrash2 size={13} />,
      variant: 'danger',
      disabled: Boolean(actionLoading),
      onClick: handleDelete,
    },
  ], [actionLoading, handleBulkCancel, handleBulkValidate, handleDelete, handleDuplicate, handleReverse]);

  const memoryState = useMemo(() => ({
    activeFilters,
    dateDisplayMode,
  }), [activeFilters, dateDisplayMode]);

  const restoreMemoryState = useCallback((customState, savedState) => {
    if (Array.isArray(customState?.activeFilters)) setActiveFilters(customState.activeFilters);
    if (customState?.dateDisplayMode) setDateDisplayMode(customState.dateDisplayMode);
    if (Array.isArray(savedState?.visibleColumnIds) && savedState.visibleColumnIds.length) {
      const restoredColumns = savedState.visibleColumnIds.flatMap((columnId) => (
        columnId === 'type_journal' ? ['journal_name', 'journal_prefix'] : [columnId]
      ));
      setVisibleColumnIds([...new Set(restoredColumns)]);
    }
  }, []);

  const handleRowClick = useCallback((piece, context) => {
    if (context?.event?.defaultPrevented) return;
    navigate(`/comptabilite/pieces/${piece.id}`);
  }, [navigate]);

  return (
    <UnifiedIndexPage
      title="Pièces comptables"
      rows={filteredPieces}
      columns={columns}
      rowKey="id"
      loading={loading}
      error={error}
      success={success}
      onDismissError={() => setError('')}
      onDismissSuccess={() => setSuccess('')}
      emptyText={activeFilters.length || search.trim() ? 'Aucun résultat pour ces filtres' : 'Aucune pièce comptable'}
      loadingText="Chargement des pièces comptables..."
      searchValue={search}
      onSearchChange={(value) => {
        setSearch(value);
        setCurrentPage(1);
      }}
      searchPlaceholder="Rechercher une pièce..."
      filterChips={activeFilters.map((filter) => ({ id: filter.id, label: filter.label }))}
      onRemoveFilterChip={(filterId) => setActiveFilters((previous) => previous.filter((filter) => filter.id !== filterId))}
      renderFilters={renderFilters}
      filterPanelWidth={720}
      primaryAction={{
        label: 'Nouvelle pièce',
        icon: <FiPlus size={14} />,
        onClick: () => navigate('/comptabilite/pieces/create'),
      }}
      selectedRowKeys={selectedPieceIds}
      onSelectionChange={setSelectedPieceIds}
      selectionActions={selectionActions}
      renderSelectionSummary={() => <span>{selectedPieceIds.length} pièce(s) sélectionnée(s)</span>}
      onRowOpen={handleRowClick}
      page={currentPage}
      onPageChange={setCurrentPage}
      pageSize={itemsPerPage}
      onPageSizeChange={setItemsPerPage}
      pageSizeOptions={[15, 25, 50, 100, 200]}
      visibleColumnIds={visibleColumnIds}
      defaultVisibleColumnIds={DEFAULT_VISIBLE_COLUMN_IDS}
      onVisibleColumnsChange={setVisibleColumnIds}
      defaultSortColumn="date"
      defaultSortDirection="desc"
      memoryKey={PIECES_MEMORY_KEY}
      memoryState={memoryState}
      onRestoreMemoryState={restoreMemoryState}
    />
  );
}
