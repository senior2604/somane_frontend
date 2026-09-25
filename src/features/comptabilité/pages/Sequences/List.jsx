// src/features/comptabilite/pages/Sequences/List.jsx
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiCheck, FiEdit3, FiLoader } from 'react-icons/fi';
import UnifiedIndexPage from '../../../../components/UnifiedIndexPage';
import { useEntity } from '../../../../context/EntityContext';
import { sequencesService } from '../../services';

const DOCUMENT_SEQUENCE_TYPES = [
  {
    code: 'PIECE',
    backendCode: 'account.move',
    label: 'Pièces comptables',
    prefix: '{JOURNAL}/{YY}/',
    aliases: ['PIECE', 'ACCOUNT.MOVE', 'ACCOUNT_MOVE', 'ACCOUNT MOVE'],
  },
  {
    code: 'FACTURE',
    backendCode: 'account.invoice',
    label: 'Factures',
    prefix: 'FAC/{YY}/',
    aliases: ['FACTURE', 'FACTURES', 'ACCOUNT.INVOICE', 'ACCOUNT_INVOICE', 'ACCOUNT INVOICE'],
  },
  {
    code: 'PAIEMENT',
    backendCode: 'account.payment',
    label: 'Paiements',
    prefix: '{JOURNAL}/PAY/{YY}/',
    aliases: ['PAIEMENT', 'PAIEMENTS', 'PAYMENT', 'ACCOUNT.PAYMENT', 'ACCOUNT_PAYMENT', 'ACCOUNT PAYMENT'],
  },
  {
    code: 'AVOIR',
    backendCode: 'account.refund',
    label: 'Avoirs',
    prefix: 'AV/{YY}/',
    aliases: ['AVOIR', 'AVOIRS', 'REFUND', 'ACCOUNT.REFUND', 'ACCOUNT_REFUND', 'ACCOUNT REFUND'],
  },
  {
    code: 'RELEVE',
    backendCode: 'account.bank.statement',
    label: 'Relevés bancaires',
    prefix: 'REL/{YY}/',
    aliases: ['RELEVE', 'RELEVES', 'ACCOUNT.BANK.STATEMENT', 'ACCOUNT_BANK_STATEMENT', 'ACCOUNT BANK STATEMENT'],
  },
  {
    code: 'RAPPROCHEMENT',
    backendCode: 'account.reconcile',
    label: 'Rapprochements',
    prefix: 'LET/{YY}/',
    aliases: ['RAPPROCHEMENT', 'RAPPROCHEMENTS', 'LETTRAGE', 'ACCOUNT.RECONCILE', 'ACCOUNT_RECONCILE', 'ACCOUNT RECONCILE'],
  },
];

const CACHE_PREFIX = 'comptabilite:sequences:list:v2';
const memoryDataCache = new Map();
const pendingRequests = new Map();

const normalizeApiList = (data) => {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.results)) return data.results;
  if (Array.isArray(data?.data)) return data.data;
  if (Array.isArray(data?.items)) return data.items;
  if (Array.isArray(data?.records)) return data.records;
  return [];
};

const normalizeText = (value) => String(value ?? '')
  .trim()
  .toLowerCase()
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '');

const normalizeSequenceCode = (value) => normalizeText(value)
  .replace(/[_\s-]+/g, '.')
  .toUpperCase();

const getSequenceType = (code) => {
  const normalizedCode = normalizeSequenceCode(code);
  return DOCUMENT_SEQUENCE_TYPES.find((type) => (
    normalizeSequenceCode(type.code) === normalizedCode
    || normalizeSequenceCode(type.backendCode) === normalizedCode
    || type.aliases.some((alias) => normalizeSequenceCode(alias) === normalizedCode)
  ));
};

const getSequenceKey = (sequence) => String(sequence?.id || `default:${sequence?.display_code || sequence?.code}`);

const mergeDefinedSequences = (rows = []) => DOCUMENT_SEQUENCE_TYPES.map((type) => {
  const existing = rows.find((sequence) => getSequenceType(sequence.code)?.code === type.code);

  if (existing) {
    return {
      ...existing,
      display_code: type.code,
      display_label: type.label,
      backend_code: type.backendCode,
      missing: false,
    };
  }

  return {
    id: '',
    code: type.code,
    backendCode: type.backendCode,
    backend_code: type.backendCode,
    display_code: type.code,
    display_label: type.label,
    name: type.label,
    prefix: type.prefix,
    suffix: '',
    padding: 2,
    current_number: 0,
    number_increment: 1,
    active: false,
    missing: true,
  };
});

const padNumber = (value, padding) => String(Number(value || 0))
  .padStart(Math.max(1, Number(padding || 2)), '0');

const formatPattern = (sequence) => {
  const prefix = sequence?.prefix || '';
  const suffix = sequence?.suffix || '';
  const zeros = '0'.repeat(Math.max(1, Number(sequence?.padding || 2)));
  return `${prefix}${zeros}${suffix}` || '—';
};

const formatCurrentNumber = (sequence) => {
  if (sequence?.missing) return '—';
  return `${sequence.prefix || ''}${padNumber(sequence.current_number, sequence.padding)}${sequence.suffix || ''}`;
};

const formatNextNumber = (sequence) => {
  if (sequence?.missing) return '—';
  const nextNumber = Number(sequence.current_number || 0) + Number(sequence.number_increment || 1);
  return `${sequence.prefix || ''}${padNumber(nextNumber, sequence.padding)}${sequence.suffix || ''}`;
};

const getErrorMessage = (error, fallback) => {
  const payload = error?.response?.data;
  if (typeof payload === 'string' && payload.trim()) return payload;
  if (typeof payload?.detail === 'string') return payload.detail;
  if (typeof payload?.message === 'string') return payload.message;
  if (payload && typeof payload === 'object') {
    const firstValue = Object.values(payload).flat().find(Boolean);
    if (firstValue) return String(firstValue);
  }
  return error?.message || fallback;
};

const getCacheKey = (entityId) => `${CACHE_PREFIX}:${entityId || 'global'}`;

const readCachedSequences = (entityId) => {
  const key = getCacheKey(entityId);
  if (memoryDataCache.has(key)) return memoryDataCache.get(key);

  try {
    const value = JSON.parse(sessionStorage.getItem(key) || 'null');
    if (Array.isArray(value)) {
      memoryDataCache.set(key, value);
      return value;
    }
  } catch (error) {
    // Un cache illisible ne doit jamais bloquer l'affichage de la liste.
  }

  return null;
};

const writeCachedSequences = (entityId, rows) => {
  const key = getCacheKey(entityId);
  memoryDataCache.set(key, rows);
  try {
    sessionStorage.setItem(key, JSON.stringify(rows));
  } catch (error) {
    // Le cache mémoire reste disponible lorsque sessionStorage est indisponible.
  }
};

const fetchSequencesOnce = (entityId) => {
  const requestKey = String(entityId || 'global');
  if (pendingRequests.has(requestKey)) return pendingRequests.get(requestKey);

  const request = Promise.resolve(sequencesService.getAll(entityId))
    .finally(() => pendingRequests.delete(requestKey));
  pendingRequests.set(requestKey, request);
  return request;
};

const StatusBadge = ({ sequence, loading }) => {
  if (loading && sequence.missing) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-medium text-gray-600">
        <FiLoader className="animate-spin" size={11} />
        Chargement
      </span>
    );
  }

  if (sequence.missing) {
    return (
      <span className="inline-flex rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-medium text-amber-700">
        Non configurée
      </span>
    );
  }

  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ${
      sequence.active === false
        ? 'bg-gray-100 text-gray-700'
        : 'bg-green-100 text-green-700'
    }`}>
      {sequence.active === false ? null : <FiCheck size={11} />}
      {sequence.active === false ? 'Inactive' : 'Active'}
    </span>
  );
};

const FilterButton = ({ active, children, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    className={`flex w-full items-center justify-between rounded px-3 py-2 text-left text-sm transition-colors ${
      active
        ? 'bg-purple-50 font-medium text-purple-700'
        : 'text-gray-700 hover:bg-gray-50 hover:text-purple-700'
    }`}
  >
    <span>{children}</span>
    {active && <FiCheck size={14} />}
  </button>
);

export default function SequencesList() {
  const navigate = useNavigate();
  const { activeEntity } = useEntity();
  const entityId = activeEntity?.id || activeEntity?.company_id || '';

  const initialCacheRef = useRef(readCachedSequences(entityId));
  const [sequences, setSequences] = useState(() => mergeDefinedSequences(initialCacheRef.current || []));
  const [refreshing, setRefreshing] = useState(!initialCacheRef.current);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [searchText, setSearchText] = useState('');
  const [documentFilter, setDocumentFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [selectedRowKeys, setSelectedRowKeys] = useState([]);
  const [initializingCode, setInitializingCode] = useState('');

  const loadData = useCallback(async ({ silent = false } = {}) => {
    if (!entityId) {
      setSequences(mergeDefinedSequences([]));
      setRefreshing(false);
      return;
    }

    if (!silent) setRefreshing(true);
    setError('');

    try {
      const response = await fetchSequencesOnce(entityId);
      const mergedRows = mergeDefinedSequences(normalizeApiList(response));
      setSequences(mergedRows);
      writeCachedSequences(entityId, mergedRows);
    } catch (requestError) {
      setError(getErrorMessage(requestError, 'Impossible de charger les séquences.'));
      if (!readCachedSequences(entityId)) setSequences(mergeDefinedSequences([]));
    } finally {
      setRefreshing(false);
    }
  }, [entityId]);

  useEffect(() => {
    const cachedRows = readCachedSequences(entityId);
    if (cachedRows) {
      setSequences(mergeDefinedSequences(cachedRows));
      setRefreshing(false);
      loadData({ silent: true });
      return;
    }

    setSequences(mergeDefinedSequences([]));
    loadData();
  }, [entityId, loadData]);

  const buildMissingSequencePayload = useCallback((sequence) => {
    const type = getSequenceType(sequence.code)
      || DOCUMENT_SEQUENCE_TYPES.find((item) => item.code === sequence.display_code);

    return {
      name: type?.label || sequence.name || sequence.code,
      code: type?.backendCode || sequence.backendCode || sequence.code,
      prefix: type?.prefix || sequence.prefix || '',
      suffix: '',
      current_number: 0,
      padding: Number(sequence.padding || 2),
      number_increment: Number(sequence.number_increment || 1),
      active: true,
      ...(entityId ? { company: entityId, company_id: entityId } : {}),
    };
  }, [entityId]);

  const openSequence = useCallback(async (sequence) => {
    if (!sequence || initializingCode) return;

    if (sequence.id) {
      navigate(`/comptabilite/sequences/${sequence.id}`);
      return;
    }

    if (!sequence.missing || refreshing) return;
    if (typeof sequencesService.create !== 'function') {
      setError("Cette séquence n'existe pas encore et le service de création n'est pas disponible.");
      return;
    }

    try {
      setError('');
      setSuccess('');
      setInitializingCode(sequence.display_code || sequence.code);
      const response = await sequencesService.create(buildMissingSequencePayload(sequence), entityId);
      const createdId = response?.id || response?.data?.id || response?.result?.id;

      if (createdId) {
        const key = getCacheKey(entityId);
        memoryDataCache.delete(key);
        try { sessionStorage.removeItem(key); } catch (error) { /* sans effet sur la navigation */ }
        navigate(`/comptabilite/sequences/${createdId}`);
        return;
      }

      await loadData();
      setError("La séquence a été créée, mais son identifiant n'a pas été retourné par l'API.");
    } catch (requestError) {
      setError(getErrorMessage(requestError, 'Impossible de configurer cette séquence.'));
    } finally {
      setInitializingCode('');
    }
  }, [buildMissingSequencePayload, entityId, initializingCode, loadData, navigate, refreshing]);

  const filteredRows = useMemo(() => {
    const needle = normalizeText(searchText);

    return sequences.filter((sequence) => {
      if (documentFilter && sequence.display_code !== documentFilter) return false;

      if (statusFilter === 'configured' && sequence.missing) return false;
      if (statusFilter === 'missing' && !sequence.missing) return false;
      if (statusFilter === 'active' && (sequence.missing || sequence.active === false)) return false;
      if (statusFilter === 'inactive' && (sequence.missing || sequence.active !== false)) return false;

      if (!needle) return true;
      return normalizeText([
        sequence.display_label,
        sequence.name,
        sequence.backend_code,
        sequence.prefix,
        sequence.suffix,
        formatPattern(sequence),
        formatCurrentNumber(sequence),
        formatNextNumber(sequence),
      ].join(' ')).includes(needle);
    });
  }, [documentFilter, searchText, sequences, statusFilter]);

  const columns = useMemo(() => [
    {
      id: 'document',
      label: 'Type de document',
      width: 190,
      minWidth: 145,
      sortable: true,
      value: (sequence) => sequence.display_label,
      render: (value) => <span className="font-semibold text-gray-800" title={value}>{value}</span>,
    },
    {
      id: 'name',
      label: 'Nom',
      width: 190,
      minWidth: 140,
      sortable: true,
      value: (sequence) => sequence.name || sequence.display_label,
      render: (value) => <span className="block truncate" title={value}>{value}</span>,
    },
    {
      id: 'model',
      label: 'Modèle',
      width: 175,
      minWidth: 135,
      sortable: true,
      value: (sequence) => sequence.backend_code || getSequenceType(sequence.code)?.backendCode || sequence.code,
      render: (value) => <span className="font-mono text-[11px] text-gray-600" title={value}>{value}</span>,
    },
    {
      id: 'prefix',
      label: 'Préfixe',
      width: 165,
      minWidth: 120,
      sortable: true,
      value: (sequence) => sequence.prefix || '—',
      render: (value) => <span className="font-mono font-medium text-purple-700" title={value}>{value}</span>,
    },
    {
      id: 'pattern',
      label: 'Format',
      width: 170,
      minWidth: 125,
      sortable: true,
      value: formatPattern,
      render: (value) => <span className="font-mono text-gray-700" title={value}>{value}</span>,
    },
    {
      id: 'current',
      label: 'Numéro actuel',
      width: 180,
      minWidth: 135,
      sortable: true,
      value: formatCurrentNumber,
      render: (value) => <span className="font-mono text-gray-700" title={value}>{value}</span>,
    },
    {
      id: 'next',
      label: 'Prochain numéro',
      width: 180,
      minWidth: 135,
      sortable: true,
      value: formatNextNumber,
      render: (value) => <span className="font-mono font-semibold text-teal-700" title={value}>{value}</span>,
    },
    {
      id: 'increment',
      label: 'Incrément',
      width: 100,
      minWidth: 85,
      numeric: true,
      sortable: true,
      value: (sequence) => Number(sequence.number_increment || 1),
    },
    {
      id: 'status',
      label: 'Statut',
      width: 130,
      minWidth: 115,
      sortable: true,
      value: (sequence) => (sequence.missing ? 'missing' : (sequence.active === false ? 'inactive' : 'active')),
      render: (_, sequence) => (
        <StatusBadge
          sequence={sequence}
          loading={refreshing || initializingCode === (sequence.display_code || sequence.code)}
        />
      ),
    },
  ], [initializingCode, refreshing]);

  const filterChips = useMemo(() => {
    const chips = [];
    if (documentFilter) {
      const document = DOCUMENT_SEQUENCE_TYPES.find((item) => item.code === documentFilter);
      chips.push({ id: 'document', label: document?.label || documentFilter });
    }
    if (statusFilter) {
      const labels = {
        configured: 'Configurées',
        missing: 'Non configurées',
        active: 'Actives',
        inactive: 'Inactives',
      };
      chips.push({ id: 'status', label: labels[statusFilter] });
    }
    return chips;
  }, [documentFilter, statusFilter]);

  const selectedRows = useMemo(() => {
    const selectedSet = new Set(selectedRowKeys.map(String));
    return sequences.filter((row) => selectedSet.has(getSequenceKey(row)));
  }, [selectedRowKeys, sequences]);

  const selectedSequence = selectedRows.length === 1 ? selectedRows[0] : null;

  const renderFilters = useCallback(() => (
    <div className="p-3">
      <div className="border-b border-gray-200 pb-3">
        <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">Type de document</div>
        <FilterButton active={!documentFilter} onClick={() => setDocumentFilter('')}>Tous</FilterButton>
        {DOCUMENT_SEQUENCE_TYPES.map((type) => (
          <FilterButton
            key={type.code}
            active={documentFilter === type.code}
            onClick={() => setDocumentFilter((current) => (current === type.code ? '' : type.code))}
          >
            {type.label}
          </FilterButton>
        ))}
      </div>

      <div className="pt-3">
        <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">Statut</div>
        <FilterButton active={!statusFilter} onClick={() => setStatusFilter('')}>Tous</FilterButton>
        <FilterButton active={statusFilter === 'configured'} onClick={() => setStatusFilter('configured')}>Configurées</FilterButton>
        <FilterButton active={statusFilter === 'missing'} onClick={() => setStatusFilter('missing')}>Non configurées</FilterButton>
        <FilterButton active={statusFilter === 'active'} onClick={() => setStatusFilter('active')}>Actives</FilterButton>
        <FilterButton active={statusFilter === 'inactive'} onClick={() => setStatusFilter('inactive')}>Inactives</FilterButton>
      </div>
    </div>
  ), [documentFilter, statusFilter]);

  const selectionActions = useMemo(() => [{
    id: 'edit-sequence',
    label: selectedSequence?.missing ? 'Configurer' : 'Modifier',
    icon: <FiEdit3 size={14} />,
    variant: 'primary',
    disabled: selectedRows.length !== 1 || Boolean(initializingCode) || refreshing,
    onClick: () => openSequence(selectedSequence),
  }], [initializingCode, openSequence, refreshing, selectedRows.length, selectedSequence]);

  return (
    <UnifiedIndexPage
      title="Séquences"
      rows={filteredRows}
      columns={columns}
      rowKey={getSequenceKey}
      loading={false}
      error={error}
      success={success}
      messageDuration={15000}
      onDismissError={() => setError('')}
      onDismissSuccess={() => setSuccess('')}
      emptyText="Aucune séquence"
      memoryKey={`comptabilite:sequences:index:${entityId || 'global'}`}
      memoryState={{ searchText, documentFilter, statusFilter }}
      onRestoreMemoryState={(state) => {
        if (typeof state?.searchText === 'string') setSearchText(state.searchText);
        if (typeof state?.documentFilter === 'string') setDocumentFilter(state.documentFilter);
        if (typeof state?.statusFilter === 'string') setStatusFilter(state.statusFilter);
      }}
      searchValue={searchText}
      onSearchChange={setSearchText}
      searchPlaceholder="Rechercher une séquence..."
      filterChips={filterChips}
      onRemoveFilterChip={(chip) => {
        if (chip.id === 'document') setDocumentFilter('');
        if (chip.id === 'status') setStatusFilter('');
      }}
      renderFilters={renderFilters}
      filterPanelWidth={330}
      selectable
      selectedRowKeys={selectedRowKeys}
      onSelectionChange={setSelectedRowKeys}
      selectionActions={selectionActions}
      renderSelectionSummary={(rows) => `${rows.length} séquence(s) sélectionnée(s)`}
      onRowOpen={openSequence}
      defaultPageSize={15}
      pageSizeOptions={[15, 25, 50]}
      defaultVisibleColumnIds={columns.map((column) => column.id)}
      defaultSortColumn="document"
      defaultSortDirection="asc"
      footerText={`${filteredRows.length} séquence(s)`}
      allowColumnResize
      allowColumnVisibility
      allowColumnSort
    />
  );
}
