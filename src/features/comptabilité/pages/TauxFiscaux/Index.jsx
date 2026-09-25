// src/features/comptabilite/pages/TauxFiscaux/Index.jsx

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FiCheck,
  FiCopy,
  FiPlus,
  FiTrash2,
  FiX,
} from 'react-icons/fi';
import UnifiedIndexPage from '../../../../components/UnifiedIndexPage';
import { useEntity } from '../../../../context/EntityContext';
import { apiClient } from '../../../../services/apiClient';

const TAXES_MEMORY_KEY = 'comptabilite:taux-fiscaux:index';
const TAXES_CACHE_PREFIX = 'comptabilite:taux-fiscaux:cache:';
const DEFAULT_VISIBLE_COLUMN_IDS = [
  'nom',
  'montant',
  'type',
  'calcul',
  'portee',
  'groupe',
  'entreprise',
  'pays',
  'sequence',
  'statut',
];

const TYPE_LABELS = {
  sale: 'Vente',
  purchase: 'Achat',
  none: 'Aucune / Divers',
  adjustment: 'Ajustement',
};

const AMOUNT_TYPE_LABELS = {
  percent: 'Pourcentage du prix',
  fixed: 'Montant fixe',
  division: 'Pourcentage du prix TTC',
};

const SCOPE_LABELS = {
  '': 'Tous',
  service: 'Services',
  consu: 'Biens consommables',
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
  if (typeof value === 'object') return value.id ?? null;
  return value;
};

const entityLabel = (entity) => (
  entity?.raison_sociale
  || entity?.nom
  || entity?.name
  || entity?.sigle
  || ''
);

const countryLabel = (country) => (
  country?.nom_fr
  || country?.nom
  || country?.name
  || country?.code
  || ''
);

const readCache = (companyId) => {
  if (!companyId) return [];
  try {
    return asArray(JSON.parse(sessionStorage.getItem(`${TAXES_CACHE_PREFIX}${companyId}`) || '[]'));
  } catch (_error) {
    return [];
  }
};

const writeCache = (companyId, rows) => {
  if (!companyId) return;
  try {
    sessionStorage.setItem(`${TAXES_CACHE_PREFIX}${companyId}`, JSON.stringify(rows));
  } catch (_error) {
    // Le cache est une optimisation : son indisponibilite ne bloque pas la page.
  }
};

const getErrorMessage = (error, fallback) => {
  const payload = error?.response?.data ?? error?.data;
  if (typeof payload === 'string' && payload.trim()) return payload;
  if (payload?.detail) return payload.detail;
  if (payload && typeof payload === 'object') {
    const first = Object.values(payload).flat().find(Boolean);
    if (first) return String(first);
  }
  return error?.message || fallback;
};

const formatNumber = (value, maximumFractionDigits = 4) => {
  const number = Number(value);
  if (!Number.isFinite(number)) return '0';
  return new Intl.NumberFormat('fr-FR', {
    minimumFractionDigits: 0,
    maximumFractionDigits,
  }).format(number);
};

function StatusBadge({ active }) {
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${
      active
        ? 'bg-emerald-100 text-emerald-700'
        : 'bg-gray-100 text-gray-600'
    }`}>
      {active ? <FiCheck size={11} /> : <FiX size={11} />}
      {active ? 'Actif' : 'Inactif'}
    </span>
  );
}

function TypeBadge({ type }) {
  const classes = {
    sale: 'bg-emerald-100 text-emerald-700',
    purchase: 'bg-amber-100 text-amber-700',
    adjustment: 'bg-blue-100 text-blue-700',
    none: 'bg-gray-100 text-gray-700',
  }[type] || 'bg-gray-100 text-gray-700';

  return (
    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${classes}`}>
      {TYPE_LABELS[type] || type || 'Aucune / Divers'}
    </span>
  );
}

export default function TauxFiscauxIndex() {
  const navigate = useNavigate();
  const { activeEntity } = useEntity();
  const companyId = activeEntity?.id;
  const requestVersionRef = useRef(0);

  const [taxes, setTaxes] = useState(() => readCache(activeEntity?.id));
  const [countries, setCountries] = useState({});
  const [loading, setLoading] = useState(() => readCache(activeEntity?.id).length === 0);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [search, setSearch] = useState('');
  const [selectedIds, setSelectedIds] = useState([]);
  const [activeFilters, setActiveFilters] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [visibleColumnIds, setVisibleColumnIds] = useState(DEFAULT_VISIBLE_COLUMN_IDS);

  const loadCountries = useCallback(async () => {
    try {
      const response = await apiClient.get('/pays/', { params: { page_size: 500 } });
      const map = {};
      asArray(response).forEach((country) => {
        map[String(country.id)] = country;
      });
      setCountries(map);
    } catch (_error) {
      // Le pays est informatif : son echec ne doit pas bloquer les taux.
    }
  }, []);

  const loadTaxes = useCallback(async ({ force = false } = {}) => {
    if (!companyId) {
      setTaxes([]);
      setLoading(false);
      return;
    }

    const cachedRows = readCache(companyId);
    if (cachedRows.length && !force) {
      setTaxes(cachedRows);
      setLoading(false);
    } else if (!cachedRows.length) {
      setLoading(true);
    }

    const requestVersion = requestVersionRef.current + 1;
    requestVersionRef.current = requestVersion;
    setError('');

    try {
      const response = await apiClient.get('/compta/taxes/', {
        params: { company: companyId, page_size: 500 },
      });
      if (requestVersion !== requestVersionRef.current) return;

      const rows = asArray(response);
      setTaxes(rows);
      writeCache(companyId, rows);
    } catch (requestError) {
      if (requestVersion !== requestVersionRef.current) return;
      if (!cachedRows.length) setTaxes([]);
      setError(getErrorMessage(requestError, 'Impossible de charger les taux fiscaux.'));
    } finally {
      if (requestVersion === requestVersionRef.current) setLoading(false);
    }
  }, [companyId]);

  useEffect(() => {
    setSelectedIds([]);
    setCurrentPage(1);
    const cachedRows = readCache(companyId);
    setTaxes(cachedRows);
    setLoading(Boolean(companyId) && cachedRows.length === 0);
    loadTaxes();
    loadCountries();
  }, [companyId, loadCountries, loadTaxes]);

  const getCompanyLabel = useCallback((tax) => {
    if (tax.company && typeof tax.company === 'object') return entityLabel(tax.company);
    return tax.company_name || entityLabel(activeEntity) || '-';
  }, [activeEntity]);

  const getCountryLabel = useCallback((tax) => {
    if (tax.country && typeof tax.country === 'object') return countryLabel(tax.country);
    const country = countries[String(resolveId(tax.country))];
    return tax.country_name || countryLabel(country) || '-';
  }, [countries]);

  const filteredTaxes = useMemo(() => {
    const query = search.trim().toLocaleLowerCase('fr');

    return taxes.filter((tax) => {
      const searchable = [
        tax.name,
        tax.description,
        tax.amount,
        TYPE_LABELS[tax.type_tax_use],
        AMOUNT_TYPE_LABELS[tax.amount_type],
        SCOPE_LABELS[tax.tax_scope || ''],
        tax.tax_group_name,
        getCompanyLabel(tax),
        getCountryLabel(tax),
      ].filter(Boolean).join(' ').toLocaleLowerCase('fr');

      if (query && !searchable.includes(query)) return false;

      return activeFilters.every((filter) => {
        if (filter.field === 'type') return tax.type_tax_use === filter.value;
        if (filter.field === 'amountType') return tax.amount_type === filter.value;
        if (filter.field === 'scope') return (tax.tax_scope || '') === filter.value;
        if (filter.field === 'status') return String(Boolean(tax.active)) === filter.value;
        return true;
      });
    });
  }, [activeFilters, getCompanyLabel, getCountryLabel, search, taxes]);

  const addFilter = useCallback((field, value, label) => {
    setActiveFilters((current) => {
      const withoutSameFilter = current.filter(
        (filter) => !(filter.field === field && filter.value === value),
      );
      return [...withoutSameFilter, {
        id: `${field}:${value}`,
        field,
        value,
        label,
      }];
    });
    setCurrentPage(1);
  }, []);

  const removeFilter = useCallback((filter) => {
    setActiveFilters((current) => current.filter((item) => item.id !== filter.id));
    setCurrentPage(1);
  }, []);

  const runBulkUpdate = useCallback(async (payload, successMessage) => {
    if (!selectedIds.length) return;
    try {
      setError('');
      await Promise.all(selectedIds.map((id) => apiClient.patch(`/compta/taxes/${id}/`, payload)));
      setSuccess(successMessage);
      setSelectedIds([]);
      await loadTaxes({ force: true });
    } catch (requestError) {
      setError(getErrorMessage(requestError, 'Impossible de modifier les taux selectionnes.'));
    }
  }, [loadTaxes, selectedIds]);

  const handleDelete = useCallback(async () => {
    if (!selectedIds.length) return;
    if (!window.confirm(`Supprimer ${selectedIds.length} taux fiscal(aux) ?`)) return;

    try {
      setError('');
      await Promise.all(selectedIds.map((id) => apiClient.delete(`/compta/taxes/${id}/`)));
      setSuccess(`${selectedIds.length} taux fiscal(aux) supprime(s).`);
      setSelectedIds([]);
      await loadTaxes({ force: true });
    } catch (requestError) {
      setError(getErrorMessage(requestError, 'Impossible de supprimer les taux selectionnes.'));
    }
  }, [loadTaxes, selectedIds]);

  const handleDuplicate = useCallback(async () => {
    if (!selectedIds.length || !companyId) return;

    try {
      setError('');
      const selectedTaxes = taxes.filter((tax) => selectedIds.includes(tax.id));
      await Promise.all(selectedTaxes.map((tax) => apiClient.post('/compta/taxes/', {
        name: `${tax.name || 'Taxe'} (Copie)`,
        description: tax.description || '',
        amount: tax.amount || 0,
        real_amount: tax.real_amount ?? null,
        amount_type: tax.amount_type || 'percent',
        type_tax_use: tax.type_tax_use || 'none',
        tax_scope: tax.tax_scope || '',
        sequence: tax.sequence || 1,
        company: companyId,
        country: resolveId(tax.country),
        tax_group_id: resolveId(tax.tax_group_id || tax.tax_group),
        account_id: resolveId(tax.account_id || tax.account),
        refund_account_id: resolveId(tax.refund_account_id || tax.refund_account),
        cash_basis_transition_account_id: resolveId(
          tax.cash_basis_transition_account_id || tax.cash_basis_transition_account,
        ),
        fiscal_position_id: resolveId(tax.fiscal_position_id || tax.fiscal_position),
        analytic: Boolean(tax.analytic),
        include_base_amount: Boolean(tax.include_base_amount),
        is_base_affected: tax.is_base_affected !== false,
        hide_tax_exigibility: Boolean(tax.hide_tax_exigibility),
        price_include: Boolean(tax.price_include),
        tax_exigibility: tax.tax_exigibility || 'on_invoice',
        note: tax.note || '',
        active: Boolean(tax.active),
      })));

      setSuccess(`${selectedTaxes.length} taux fiscal(aux) duplique(s).`);
      setSelectedIds([]);
      await loadTaxes({ force: true });
    } catch (requestError) {
      setError(getErrorMessage(requestError, 'Impossible de dupliquer les taux selectionnes.'));
    }
  }, [companyId, loadTaxes, selectedIds, taxes]);

  const columns = useMemo(() => [
    {
      id: 'nom',
      label: 'Nom',
      minWidth: 170,
      value: (tax) => tax.name || '',
      render: (_, tax) => (
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            navigate(`/comptabilite/taux-fiscaux/${tax.id}`, { state: { taxRecord: tax } });
          }}
          className="block w-full truncate text-left font-medium text-teal-700 hover:text-purple-700 hover:underline"
          title={tax.name || 'Ouvrir le taux fiscal'}
        >
          {tax.name || '-'}
        </button>
      ),
    },
    {
      id: 'montant',
      label: 'Valeur',
      width: 105,
      numeric: true,
      value: (tax) => Number(tax.amount || 0),
      render: (_, tax) => (
        <span className="font-medium tabular-nums">
          {formatNumber(tax.amount)}{tax.amount_type === 'fixed' ? '' : ' %'}
        </span>
      ),
    },
    {
      id: 'type',
      label: 'Application',
      minWidth: 110,
      value: (tax) => TYPE_LABELS[tax.type_tax_use] || tax.type_tax_use || '',
      render: (_, tax) => <TypeBadge type={tax.type_tax_use} />,
    },
    {
      id: 'calcul',
      label: 'Type de calcul',
      minWidth: 150,
      value: (tax) => AMOUNT_TYPE_LABELS[tax.amount_type] || tax.amount_type || '',
    },
    {
      id: 'portee',
      label: 'Portee',
      minWidth: 115,
      value: (tax) => SCOPE_LABELS[tax.tax_scope || ''] || tax.tax_scope || 'Tous',
    },
    {
      id: 'groupe',
      label: 'Groupe fiscal',
      minWidth: 125,
      value: (tax) => tax.tax_group_name || tax.tax_group?.name || '',
    },
    {
      id: 'entreprise',
      label: 'Entreprise',
      minWidth: 130,
      value: (tax) => getCompanyLabel(tax),
    },
    {
      id: 'pays',
      label: 'Pays',
      minWidth: 105,
      value: (tax) => getCountryLabel(tax),
    },
    {
      id: 'sequence',
      label: 'Sequence',
      width: 85,
      numeric: true,
      value: (tax) => Number(tax.sequence || 0),
    },
    {
      id: 'statut',
      label: 'Statut',
      width: 90,
      value: (tax) => (tax.active ? 'Actif' : 'Inactif'),
      sortValue: (tax) => (tax.active ? 1 : 0),
      render: (_, tax) => <StatusBadge active={tax.active} />,
    },
  ], [getCompanyLabel, getCountryLabel, navigate]);

  const filterChips = useMemo(() => activeFilters.map((filter) => ({
    id: filter.id,
    label: filter.label,
    source: filter,
  })), [activeFilters]);

  const renderFilterOptions = useCallback((title, field, options) => (
    <div className="border-b border-gray-200 p-3 md:border-b-0 md:border-r last:border-r-0">
      <p className="mb-2 font-semibold text-gray-800">{title}</p>
      <div className="space-y-1">
        {options.map((option) => {
          const selected = activeFilters.some(
            (filter) => filter.field === field && filter.value === option.value,
          );
          return (
            <button
              key={`${field}:${option.value}`}
              type="button"
              onClick={() => addFilter(field, option.value, option.label)}
              className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left hover:bg-gray-100"
            >
              <span className="w-4 shrink-0 font-semibold text-purple-600">{selected ? '✓' : ''}</span>
              <span className="truncate">{option.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  ), [activeFilters, addFilter]);

  const renderFilters = useCallback(({ close }) => (
    <div className="grid grid-cols-1 text-xs text-gray-700 md:grid-cols-3">
      {renderFilterOptions('Application', 'type', [
        { value: 'sale', label: 'Vente' },
        { value: 'purchase', label: 'Achat' },
        { value: 'none', label: 'Aucune / Divers' },
        { value: 'adjustment', label: 'Ajustement' },
      ])}
      {renderFilterOptions('Type de calcul', 'amountType', [
        { value: 'percent', label: 'Pourcentage du prix' },
        { value: 'division', label: 'Pourcentage du prix TTC' },
        { value: 'fixed', label: 'Montant fixe' },
      ])}
      <div className="p-3">
        <p className="mb-2 font-semibold text-gray-800">Statut et portee</p>
        <div className="space-y-1">
          {[
            { field: 'status', value: 'true', label: 'Actifs' },
            { field: 'status', value: 'false', label: 'Inactifs' },
            { field: 'scope', value: '', label: 'Tous les produits' },
            { field: 'scope', value: 'service', label: 'Services' },
            { field: 'scope', value: 'consu', label: 'Biens consommables' },
          ].map((option) => {
            const selected = activeFilters.some(
              (filter) => filter.field === option.field && filter.value === option.value,
            );
            return (
              <button
                key={`${option.field}:${option.value}`}
                type="button"
                onClick={() => addFilter(option.field, option.value, option.label)}
                className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left hover:bg-gray-100"
              >
                <span className="w-4 shrink-0 font-semibold text-purple-600">{selected ? '✓' : ''}</span>
                <span>{option.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {(activeFilters.length > 0 || search.trim()) && (
        <div className="border-t border-gray-200 p-3 md:col-span-3">
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
  ), [activeFilters, addFilter, renderFilterOptions, search]);

  const selectionActions = useMemo(() => [
    {
      id: 'duplicate',
      label: 'Dupliquer',
      icon: <FiCopy size={13} />,
      onClick: handleDuplicate,
    },
    {
      id: 'activate',
      label: 'Activer',
      icon: <FiCheck size={13} />,
      variant: 'success',
      onClick: () => runBulkUpdate({ active: true }, 'Taux fiscaux actives avec succes.'),
    },
    {
      id: 'deactivate',
      label: 'Desactiver',
      icon: <FiX size={13} />,
      onClick: () => runBulkUpdate({ active: false }, 'Taux fiscaux desactives avec succes.'),
    },
    {
      id: 'delete',
      label: 'Supprimer',
      icon: <FiTrash2 size={13} />,
      variant: 'danger',
      onClick: handleDelete,
    },
  ], [handleDelete, handleDuplicate, runBulkUpdate]);

  const memoryState = useMemo(() => ({ activeFilters }), [activeFilters]);

  const restoreMemoryState = useCallback((customState, savedState) => {
    if (Array.isArray(customState?.activeFilters)) setActiveFilters(customState.activeFilters);
    if (Array.isArray(savedState?.visibleColumnIds) && savedState.visibleColumnIds.length) {
      setVisibleColumnIds(savedState.visibleColumnIds);
    }
  }, []);

  if (!activeEntity) {
    return (
      <UnifiedIndexPage
        title="Taux fiscaux"
        rows={[]}
        columns={columns}
        selectable={false}
        loading={false}
        error="Selectionnez une entite pour afficher les taux fiscaux."
        emptyText="Aucun taux fiscal"
        allowColumnVisibility={false}
      />
    );
  }

  return (
    <UnifiedIndexPage
      title="Taux fiscaux"
      memoryKey={TAXES_MEMORY_KEY}
      memoryState={memoryState}
      onRestoreMemoryState={restoreMemoryState}
      rows={filteredTaxes}
      rowKey="id"
      columns={columns}
      loading={loading && taxes.length === 0}
      error={error}
      success={success}
      messageDuration={15000}
      onDismissError={() => setError('')}
      onDismissSuccess={() => setSuccess('')}
      emptyText="Aucun taux fiscal"
      searchValue={search}
      onSearchChange={(value) => {
        setSearch(value);
        setCurrentPage(1);
      }}
      searchPlaceholder="Rechercher un taux fiscal..."
      filterChips={filterChips}
      onRemoveFilterChip={(chip) => removeFilter(chip.source)}
      renderFilters={renderFilters}
      filterPanelWidth={760}
      primaryAction={{
        label: 'Nouveau taux',
        icon: <FiPlus size={14} />,
        onClick: () => navigate('/comptabilite/taux-fiscaux/create'),
      }}
      selectedRowKeys={selectedIds}
      onSelectionChange={setSelectedIds}
      selectionActions={selectionActions}
      renderSelectionSummary={() => (
        <span>{selectedIds.length} taux fiscal(aux) selectionne(s)</span>
      )}
      onRowOpen={(tax, { saveNow }) => {
        saveNow();
        navigate(`/comptabilite/taux-fiscaux/${tax.id}`, { state: { taxRecord: tax } });
      }}
      page={currentPage}
      onPageChange={setCurrentPage}
      pageSize={pageSize}
      onPageSizeChange={setPageSize}
      pageSizeOptions={[25, 50, 100, 200]}
      visibleColumnIds={visibleColumnIds}
      defaultVisibleColumnIds={DEFAULT_VISIBLE_COLUMN_IDS}
      onVisibleColumnsChange={setVisibleColumnIds}
      defaultSortColumn="nom"
      defaultSortDirection="asc"
    />
  );
}
