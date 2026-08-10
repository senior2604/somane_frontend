// src/features/comptabilite/pages/WithholdingTaxes/Index.jsx

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiCheck, FiCopy, FiPlus, FiTrash2, FiX } from 'react-icons/fi';
import UnifiedIndexPage from '../../../../components/UnifiedIndexPage';
import { useEntity } from '../../../../context/EntityContext';
import { apiClient } from '../../../../services/apiClient';

const MEMORY_KEY = 'comptabilite:retenues-source:index';
const CACHE_PREFIX = 'comptabilite:retenues-source:cache:';
const DEFAULT_COLUMNS = [
  'nom',
  'taux',
  'type',
  'base',
  'exigibilite',
  'compte',
  'taxe',
  'groupe',
  'entreprise',
  'sequence',
  'defaut',
  'statut',
];

const TYPE_LABELS = { partial: 'Partielle', full: 'Totale' };
const SCOPE_LABELS = {
  percent: 'Pourcentage du montant HT',
  on_total: 'Pourcentage du montant TTC',
  fixed: 'Montant fixe',
  on_tax: 'Precompte de TVA',
};
const ELIGIBILITY_LABELS = {
  on_invoice: 'Sur facture',
  on_payment: 'Sur paiement',
};

const asArray = (payload) => {
  const value = payload?.data ?? payload;
  if (Array.isArray(value)) return value;
  if (Array.isArray(value?.results)) return value.results;
  if (Array.isArray(value?.data)) return value.data;
  return [];
};

const resolveId = (value) => {
  if (value === null || value === undefined || value === '') return null;
  return typeof value === 'object' ? value.id ?? null : value;
};

const getErrorMessage = (error, fallback) => {
  const payload = error?.response?.data ?? error?.data;
  if (typeof payload === 'string' && payload.trim()) return payload;
  if (payload?.detail) return payload.detail;
  if (payload && typeof payload === 'object') {
    const value = Object.values(payload).flat().find(Boolean);
    if (value) return String(value);
  }
  return error?.message || fallback;
};

const readCache = (key) => {
  try {
    return asArray(JSON.parse(sessionStorage.getItem(key) || '[]'));
  } catch (_error) {
    return [];
  }
};

const writeCache = (key, rows) => {
  try {
    sessionStorage.setItem(key, JSON.stringify(rows));
  } catch (_error) {
    // Cache facultatif.
  }
};

const formatNumber = (value) => {
  const number = Number(value);
  if (!Number.isFinite(number)) return '0';
  return new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 4 }).format(number);
};

function StatusBadge({ active }) {
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${
      active ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-600'
    }`}>
      {active ? <FiCheck size={11} /> : <FiX size={11} />}
      {active ? 'Actif' : 'Inactif'}
    </span>
  );
}

function BooleanBadge({ value, yes, no, color = 'purple' }) {
  const activeClass = color === 'emerald'
    ? 'bg-emerald-100 text-emerald-700'
    : 'bg-purple-100 text-purple-700';
  return (
    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
      value ? activeClass : 'bg-gray-100 text-gray-600'
    }`}>
      {value ? yes : no}
    </span>
  );
}

export default function WithholdingTaxesIndex() {
  const navigate = useNavigate();
  const { activeEntity } = useEntity();
  const companyId = activeEntity?.id;
  const cacheKey = `${CACHE_PREFIX}${companyId || 'none'}`;
  const requestRef = useRef(0);

  const [taxes, setTaxes] = useState(() => readCache(cacheKey));
  const [loading, setLoading] = useState(() => readCache(cacheKey).length === 0);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState([]);
  const [selectedIds, setSelectedIds] = useState([]);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [visibleColumns, setVisibleColumns] = useState(DEFAULT_COLUMNS);

  const loadTaxes = useCallback(async ({ force = false } = {}) => {
    if (!companyId) {
      setTaxes([]);
      setLoading(false);
      return;
    }

    const cached = readCache(cacheKey);
    if (cached.length && !force) {
      setTaxes(cached);
      setLoading(false);
    } else if (!cached.length) {
      setLoading(true);
    }

    const version = requestRef.current + 1;
    requestRef.current = version;
    setError('');

    try {
      const response = await apiClient.get('/compta/withholding-taxes/', {
        params: { company_id: companyId, page_size: 500 },
      });
      if (version !== requestRef.current) return;
      const rows = asArray(response);
      setTaxes(rows);
      writeCache(cacheKey, rows);
    } catch (requestError) {
      if (version !== requestRef.current) return;
      if (!cached.length) setTaxes([]);
      setError(getErrorMessage(requestError, 'Impossible de charger les retenues à la source.'));
    } finally {
      if (version === requestRef.current) setLoading(false);
    }
  }, [cacheKey, companyId]);

  useEffect(() => {
    const cached = readCache(cacheKey);
    setTaxes(cached);
    setSelectedIds([]);
    setPage(1);
    setLoading(Boolean(companyId) && cached.length === 0);
    loadTaxes();
  }, [cacheKey, companyId, loadTaxes]);

  const companyName = useCallback((tax) => (
    tax.company_name
    || tax.company_id?.raison_sociale
    || tax.company_id?.nom
    || activeEntity?.raison_sociale
    || activeEntity?.nom
    || '-'
  ), [activeEntity]);

  const filteredTaxes = useMemo(() => {
    const query = search.trim().toLocaleLowerCase('fr');
    return taxes.filter((tax) => {
      const content = [
        tax.name,
        tax.description,
        tax.amount,
        TYPE_LABELS[tax.withholding_type],
        SCOPE_LABELS[tax.withholding_scope],
        ELIGIBILITY_LABELS[tax.withholding_eligibility],
        tax.account_label,
        tax.tax_name,
        tax.tax_group_name,
        companyName(tax),
      ].filter(Boolean).join(' ').toLocaleLowerCase('fr');

      if (query && !content.includes(query)) return false;
      return filters.every((filter) => {
        if (filter.field === 'type') return tax.withholding_type === filter.value;
        if (filter.field === 'scope') return tax.withholding_scope === filter.value;
        if (filter.field === 'eligibility') return tax.withholding_eligibility === filter.value;
        if (filter.field === 'status') return String(Boolean(tax.active)) === filter.value;
        if (filter.field === 'default') return String(Boolean(tax.is_default)) === filter.value;
        return true;
      });
    });
  }, [companyName, filters, search, taxes]);

  const addFilter = useCallback((field, value, label) => {
    setFilters((current) => [
      ...current.filter((filter) => filter.id !== `${field}:${value}`),
      { id: `${field}:${value}`, field, value, label },
    ]);
    setPage(1);
  }, []);

  const runBulkUpdate = useCallback(async (payload, message) => {
    if (!selectedIds.length) return;
    try {
      await Promise.all(selectedIds.map((id) => (
        apiClient.patch(`/compta/withholding-taxes/${id}/`, payload)
      )));
      setSuccess(message);
      setSelectedIds([]);
      await loadTaxes({ force: true });
    } catch (requestError) {
      setError(getErrorMessage(requestError, 'Impossible de modifier les retenues sélectionnées.'));
    }
  }, [loadTaxes, selectedIds]);

  const handleDelete = useCallback(async () => {
    if (!selectedIds.length) return;
    if (!window.confirm(`Supprimer ${selectedIds.length} retenue(s) ?`)) return;
    try {
      await Promise.all(selectedIds.map((id) => (
        apiClient.delete(`/compta/withholding-taxes/${id}/`)
      )));
      setSuccess(`${selectedIds.length} retenue(s) supprimée(s).`);
      setSelectedIds([]);
      await loadTaxes({ force: true });
    } catch (requestError) {
      setError(getErrorMessage(requestError, 'Impossible de supprimer les retenues sélectionnées.'));
    }
  }, [loadTaxes, selectedIds]);

  const handleDuplicate = useCallback(async () => {
    if (!selectedIds.length || !companyId) return;
    try {
      const selected = taxes.filter((tax) => selectedIds.includes(tax.id));
      await Promise.all(selected.map((tax) => apiClient.post('/compta/withholding-taxes/', {
        name: `${tax.name || 'Retenue'} (Copie)`,
        amount: tax.amount || 0,
        withholding_type: tax.withholding_type || 'partial',
        withholding_scope: tax.withholding_scope || 'percent',
        withholding_eligibility: tax.withholding_eligibility || 'on_invoice',
        account_id: resolveId(tax.account_id),
        company_id: companyId,
        tax_id: resolveId(tax.tax_id),
        journal_id: resolveId(tax.journal_id),
        analytic_account_id: resolveId(tax.analytic_account_id),
        currency_id: resolveId(tax.currency_id),
        partner_ids: (tax.partner_ids || []).map(resolveId).filter(Boolean),
        tag_ids: (tax.tag_ids || []).map(resolveId).filter(Boolean),
        tax_group_id: resolveId(tax.tax_group_id || tax.tax_group),
        active: Boolean(tax.active),
        is_default: false,
        sequence: tax.sequence || 10,
        description: tax.description || '',
      })));
      setSuccess(`${selected.length} retenue(s) dupliquée(s).`);
      setSelectedIds([]);
      await loadTaxes({ force: true });
    } catch (requestError) {
      setError(getErrorMessage(requestError, 'Impossible de dupliquer les retenues sélectionnées.'));
    }
  }, [companyId, loadTaxes, selectedIds, taxes]);

  const columns = useMemo(() => [
    {
      id: 'nom',
      label: 'Nom',
      minWidth: 175,
      value: (tax) => tax.name || '',
      render: (_, tax) => (
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            navigate(`/comptabilite/withholding-taxes/${tax.id}`, { state: { withholdingTaxRecord: tax } });
          }}
          className="block w-full truncate text-left font-medium text-teal-700 hover:text-purple-700 hover:underline"
          title={[tax.name, tax.description].filter(Boolean).join(' - ')}
        >
          {tax.name || '-'}
        </button>
      ),
    },
    {
      id: 'taux',
      label: 'Valeur',
      width: 90,
      numeric: true,
      value: (tax) => Number(tax.amount || 0),
      render: (_, tax) => (
        <span className="font-medium tabular-nums">
          {formatNumber(tax.amount)}{tax.withholding_scope === 'fixed' ? '' : ' %'}
        </span>
      ),
    },
    {
      id: 'type',
      label: 'Type',
      minWidth: 100,
      value: (tax) => TYPE_LABELS[tax.withholding_type] || tax.withholding_type || '',
    },
    {
      id: 'base',
      label: 'Base de calcul',
      minWidth: 155,
      value: (tax) => SCOPE_LABELS[tax.withholding_scope] || tax.withholding_scope || '',
    },
    {
      id: 'exigibilite',
      label: 'Exigibilité',
      minWidth: 115,
      value: (tax) => ELIGIBILITY_LABELS[tax.withholding_eligibility] || tax.withholding_eligibility || '',
    },
    {
      id: 'compte',
      label: 'Compte',
      minWidth: 115,
      value: (tax) => tax.account_label || tax.account_id?.code || '',
    },
    {
      id: 'taxe',
      label: 'Taxe de référence',
      minWidth: 140,
      value: (tax) => tax.tax_name || '',
    },
    {
      id: 'groupe',
      label: 'Groupe fiscal',
      minWidth: 120,
      value: (tax) => tax.tax_group_name || tax.tax_group?.name || '',
    },
    {
      id: 'entreprise',
      label: 'Entreprise',
      minWidth: 130,
      value: companyName,
    },
    {
      id: 'sequence',
      label: 'Ordre',
      width: 70,
      numeric: true,
      value: (tax) => Number(tax.sequence || 0),
    },
    {
      id: 'defaut',
      label: 'Par défaut',
      width: 95,
      value: (tax) => (tax.is_default ? 'Oui' : 'Non'),
      render: (_, tax) => <BooleanBadge value={tax.is_default} yes="Oui" no="Non" />,
    },
    {
      id: 'statut',
      label: 'Statut',
      width: 90,
      value: (tax) => (tax.active ? 'Actif' : 'Inactif'),
      render: (_, tax) => <StatusBadge active={tax.active} />,
    },
  ], [companyName, navigate]);

  const filterChips = useMemo(() => filters.map((filter) => ({
    id: filter.id,
    label: filter.label,
    source: filter,
  })), [filters]);

  const filterSection = useCallback((title, options) => (
    <div className="border-b border-gray-200 p-3 md:border-b-0 md:border-r last:border-r-0">
      <p className="mb-2 font-semibold text-gray-800">{title}</p>
      <div className="space-y-1">
        {options.map((option) => {
          const selected = filters.some(
            (filter) => filter.field === option.field && filter.value === option.value,
          );
          return (
            <button
              key={`${option.field}:${option.value}`}
              type="button"
              onClick={() => addFilter(option.field, option.value, option.label)}
              className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left hover:bg-gray-100"
            >
              <span className="w-4 text-purple-600">{selected ? '✓' : ''}</span>
              <span>{option.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  ), [addFilter, filters]);

  const renderFilters = useCallback(({ close }) => (
    <div className="grid grid-cols-1 text-xs text-gray-700 md:grid-cols-3">
      {filterSection('Type', [
        { field: 'type', value: 'partial', label: 'Partielle' },
        { field: 'type', value: 'full', label: 'Totale' },
      ])}
      {filterSection('Base de calcul', [
        { field: 'scope', value: 'percent', label: 'Montant HT' },
        { field: 'scope', value: 'on_total', label: 'Montant TTC' },
        { field: 'scope', value: 'fixed', label: 'Montant fixe' },
        { field: 'scope', value: 'on_tax', label: 'Précompte de TVA' },
      ])}
      {filterSection('État', [
        { field: 'eligibility', value: 'on_invoice', label: 'Sur facture' },
        { field: 'eligibility', value: 'on_payment', label: 'Sur paiement' },
        { field: 'status', value: 'true', label: 'Actives' },
        { field: 'status', value: 'false', label: 'Inactives' },
        { field: 'default', value: 'true', label: 'Par défaut' },
      ])}
      {(filters.length > 0 || search.trim()) && (
        <div className="border-t border-gray-200 p-3 md:col-span-3">
          <button
            type="button"
            onClick={() => {
              setFilters([]);
              setSearch('');
              setPage(1);
              close();
            }}
            className="w-full rounded py-1.5 text-red-600 hover:bg-red-50"
          >
            Effacer les filtres
          </button>
        </div>
      )}
    </div>
  ), [filterSection, filters.length, search]);

  const selectionActions = useMemo(() => [
    { id: 'duplicate', label: 'Dupliquer', icon: <FiCopy size={13} />, onClick: handleDuplicate },
    {
      id: 'activate',
      label: 'Activer',
      icon: <FiCheck size={13} />,
      variant: 'success',
      onClick: () => runBulkUpdate({ active: true }, 'Retenues activées avec succès.'),
    },
    {
      id: 'deactivate',
      label: 'Désactiver',
      icon: <FiX size={13} />,
      onClick: () => runBulkUpdate({ active: false }, 'Retenues désactivées avec succès.'),
    },
    { id: 'delete', label: 'Supprimer', icon: <FiTrash2 size={13} />, variant: 'danger', onClick: handleDelete },
  ], [handleDelete, handleDuplicate, runBulkUpdate]);

  const restoreMemory = useCallback((customState, savedState) => {
    if (Array.isArray(customState?.filters)) setFilters(customState.filters);
    if (Array.isArray(savedState?.visibleColumnIds) && savedState.visibleColumnIds.length) {
      setVisibleColumns(savedState.visibleColumnIds);
    }
  }, []);

  return (
    <UnifiedIndexPage
      title="Retenues à la source"
      memoryKey={MEMORY_KEY}
      memoryState={{ filters }}
      onRestoreMemoryState={restoreMemory}
      rows={activeEntity ? filteredTaxes : []}
      columns={columns}
      rowKey="id"
      loading={loading && taxes.length === 0}
      error={!activeEntity ? 'Sélectionnez une entité pour afficher les retenues.' : error}
      success={success}
      messageDuration={15000}
      onDismissError={() => setError('')}
      onDismissSuccess={() => setSuccess('')}
      emptyText="Aucune retenue configurée"
      searchValue={search}
      onSearchChange={(value) => { setSearch(value); setPage(1); }}
      searchPlaceholder="Rechercher une retenue..."
      filterChips={filterChips}
      onRemoveFilterChip={(chip) => {
        setFilters((current) => current.filter((filter) => filter.id !== chip.source.id));
        setPage(1);
      }}
      renderFilters={renderFilters}
      filterPanelWidth={760}
      primaryAction={{
        label: 'Nouvelle retenue',
        icon: <FiPlus size={14} />,
        onClick: () => navigate('/comptabilite/withholding-taxes/create'),
      }}
      selectable={Boolean(activeEntity)}
      selectedRowKeys={selectedIds}
      onSelectionChange={setSelectedIds}
      selectionActions={selectionActions}
      renderSelectionSummary={() => <span>{selectedIds.length} retenue(s) sélectionnée(s)</span>}
      onRowClick={(tax, { event }) => {
        if (event.detail > 1) return;
        setSelectedIds((current) => current.includes(tax.id)
          ? current.filter((id) => id !== tax.id)
          : [...current, tax.id]);
      }}
      onRowDoubleClick={(tax, { event, saveNow }) => {
        event.preventDefault();
        event.stopPropagation();
        saveNow();
        navigate(`/comptabilite/withholding-taxes/${tax.id}`, {
          state: { withholdingTaxRecord: tax },
        });
      }}
      page={page}
      onPageChange={setPage}
      pageSize={pageSize}
      onPageSizeChange={setPageSize}
      pageSizeOptions={[25, 50, 100, 200]}
      visibleColumnIds={visibleColumns}
      defaultVisibleColumnIds={DEFAULT_COLUMNS}
      onVisibleColumnsChange={setVisibleColumns}
      defaultSortColumn="sequence"
      defaultSortDirection="asc"
    />
  );
}
