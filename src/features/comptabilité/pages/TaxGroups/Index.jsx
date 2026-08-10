// src/features/comptabilite/pages/TaxGroups/Index.jsx

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiCopy, FiPlus, FiTrash2 } from 'react-icons/fi';
import UnifiedIndexPage from '../../../../components/UnifiedIndexPage';
import { useEntity } from '../../../../context/EntityContext';
import { apiClient } from '../../../../services/apiClient';

const MEMORY_KEY = 'comptabilite:groupes-taxes:index';
const CACHE_PREFIX = 'comptabilite:groupes-taxes:cache:';
const DEFAULT_COLUMNS = [
  'nom',
  'sequence',
  'pays',
  'compte_du',
  'compte_credit',
  'compte_acompte',
  'sous_total',
];

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

const countryName = (country) => (
  country?.nom_fr || country?.nom || country?.name || country?.code || ''
);

const accountText = (group, prefix) => {
  const relation = group[prefix];
  const code = group[`${prefix}_code`] || relation?.code || '';
  const name = group[`${prefix}_name`] || relation?.name || relation?.nom || '';
  return [code, name].filter(Boolean).join(' - ') || '-';
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
    // Le cache ne doit jamais bloquer l'interface.
  }
};

export default function TaxGroupsIndex() {
  const navigate = useNavigate();
  const { activeEntity } = useEntity();
  const companyId = activeEntity?.id;
  const cacheKey = `${CACHE_PREFIX}${companyId || 'global'}`;
  const requestRef = useRef(0);

  const [groups, setGroups] = useState(() => readCache(cacheKey));
  const [countries, setCountries] = useState({});
  const [loading, setLoading] = useState(() => readCache(cacheKey).length === 0);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState([]);
  const [selectedIds, setSelectedIds] = useState([]);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [visibleColumns, setVisibleColumns] = useState(DEFAULT_COLUMNS);

  const loadCountries = useCallback(async () => {
    try {
      const response = await apiClient.get('/pays/', { params: { page_size: 500 } });
      const map = {};
      asArray(response).forEach((country) => { map[String(country.id)] = country; });
      setCountries(map);
    } catch (_error) {
      // Le pays reste informatif.
    }
  }, []);

  const loadGroups = useCallback(async ({ force = false } = {}) => {
    if (!companyId) {
      setGroups([]);
      setLoading(false);
      return;
    }

    const cached = readCache(cacheKey);
    if (cached.length && !force) {
      setGroups(cached);
      setLoading(false);
    } else if (!cached.length) {
      setLoading(true);
    }

    const version = requestRef.current + 1;
    requestRef.current = version;
    setError('');

    try {
      const response = await apiClient.get('/compta/tax-groups/', {
        params: { company: companyId, page_size: 500 },
      });
      if (version !== requestRef.current) return;
      const rows = asArray(response);
      setGroups(rows);
      writeCache(cacheKey, rows);
    } catch (requestError) {
      if (version !== requestRef.current) return;
      if (!cached.length) setGroups([]);
      setError(getErrorMessage(requestError, 'Impossible de charger les groupes de taxes.'));
    } finally {
      if (version === requestRef.current) setLoading(false);
    }
  }, [cacheKey, companyId]);

  useEffect(() => {
    const cached = readCache(cacheKey);
    setGroups(cached);
    setSelectedIds([]);
    setPage(1);
    setLoading(Boolean(companyId) && cached.length === 0);
    loadGroups();
    loadCountries();
  }, [cacheKey, companyId, loadCountries, loadGroups]);

  const getCountry = useCallback((group) => {
    if (group.country && typeof group.country === 'object') return group.country;
    return countries[String(resolveId(group.country))] || null;
  }, [countries]);

  const filteredGroups = useMemo(() => {
    const query = search.trim().toLocaleLowerCase('fr');
    return groups.filter((group) => {
      const country = countryName(getCountry(group));
      const content = [
        group.name,
        group.sequence,
        country,
        accountText(group, 'property_tax_payable_account'),
        accountText(group, 'property_tax_receivable_account'),
        accountText(group, 'property_advance_tax_payment_account'),
        group.preceding_subtotal,
      ].filter(Boolean).join(' ').toLocaleLowerCase('fr');

      if (query && !content.includes(query)) return false;
      return filters.every((filter) => (
        filter.field !== 'country'
        || String(resolveId(group.country)) === filter.value
      ));
    });
  }, [filters, getCountry, groups, search]);

  const addFilter = useCallback((field, value, label) => {
    setFilters((current) => [
      ...current.filter((filter) => filter.id !== `${field}:${value}`),
      { id: `${field}:${value}`, field, value, label },
    ]);
    setPage(1);
  }, []);

  const handleDelete = useCallback(async () => {
    if (!selectedIds.length) return;
    if (!window.confirm(`Supprimer ${selectedIds.length} groupe(s) de taxes ?`)) return;
    try {
      await Promise.all(selectedIds.map((id) => apiClient.delete(`/compta/tax-groups/${id}/`)));
      setSuccess(`${selectedIds.length} groupe(s) de taxes supprimé(s).`);
      setSelectedIds([]);
      await loadGroups({ force: true });
    } catch (requestError) {
      setError(getErrorMessage(requestError, 'Impossible de supprimer les groupes sélectionnés.'));
    }
  }, [loadGroups, selectedIds]);

  const handleDuplicate = useCallback(async () => {
    if (!selectedIds.length) return;
    try {
      const selected = groups.filter((group) => selectedIds.includes(group.id));
      await Promise.all(selected.map((group) => apiClient.post('/compta/tax-groups/', {
        name: `${group.name || 'Groupe de taxes'} (Copie)`,
        sequence: group.sequence || 10,
        country: resolveId(group.country),
        property_tax_payable_account_id: resolveId(group.property_tax_payable_account),
        property_tax_receivable_account_id: resolveId(group.property_tax_receivable_account),
        property_advance_tax_payment_account_id: resolveId(group.property_advance_tax_payment_account),
        preceding_subtotal: group.preceding_subtotal || '',
      })));
      setSuccess(`${selected.length} groupe(s) de taxes dupliqué(s).`);
      setSelectedIds([]);
      await loadGroups({ force: true });
    } catch (requestError) {
      setError(getErrorMessage(requestError, 'Impossible de dupliquer les groupes sélectionnés.'));
    }
  }, [groups, loadGroups, selectedIds]);

  const columns = useMemo(() => [
    {
      id: 'nom',
      label: 'Nom',
      minWidth: 170,
      value: (group) => group.name || '',
      render: (_, group) => (
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            navigate(`/comptabilite/tax-groups/${group.id}`, { state: { taxGroupRecord: group } });
          }}
          className="block w-full truncate text-left font-medium text-teal-700 hover:text-purple-700 hover:underline"
          title={group.name}
        >
          {group.name || '-'}
        </button>
      ),
    },
    {
      id: 'sequence',
      label: 'Ordre',
      width: 75,
      numeric: true,
      value: (group) => Number(group.sequence || 0),
    },
    {
      id: 'pays',
      label: 'Pays',
      minWidth: 110,
      value: (group) => countryName(getCountry(group)) || 'Global',
    },
    {
      id: 'compte_du',
      label: 'Compte fiscal à payer',
      minWidth: 170,
      value: (group) => accountText(group, 'property_tax_payable_account'),
    },
    {
      id: 'compte_credit',
      label: 'Compte fiscal à recevoir',
      minWidth: 170,
      value: (group) => accountText(group, 'property_tax_receivable_account'),
    },
    {
      id: 'compte_acompte',
      label: 'Compte des acomptes',
      minWidth: 160,
      value: (group) => accountText(group, 'property_advance_tax_payment_account'),
    },
    {
      id: 'sous_total',
      label: 'Sous-total précédent',
      minWidth: 135,
      value: (group) => group.preceding_subtotal || '',
    },
  ], [getCountry, navigate]);

  const filterChips = useMemo(() => filters.map((filter) => ({
    id: filter.id,
    label: filter.label,
    source: filter,
  })), [filters]);

  const countryOptions = useMemo(() => Object.values(countries)
    .sort((a, b) => countryName(a).localeCompare(countryName(b), 'fr')), [countries]);

  const renderFilters = useCallback(({ close }) => (
    <div className="text-xs text-gray-700">
      <div className="p-3">
        <p className="mb-2 font-semibold text-gray-800">Pays</p>
        <div className="grid max-h-64 grid-cols-1 gap-1 overflow-y-auto sm:grid-cols-2">
          {countryOptions.map((country) => {
            const value = String(country.id);
            const selected = filters.some(
              (filter) => filter.field === 'country' && filter.value === value,
            );
            return (
              <button
                key={value}
                type="button"
                onClick={() => addFilter('country', value, countryName(country))}
                className="flex items-center gap-2 rounded px-2 py-1.5 text-left hover:bg-gray-100"
              >
                <span className="w-4 text-purple-600">{selected ? '✓' : ''}</span>
                <span className="truncate">{countryName(country)}</span>
              </button>
            );
          })}
        </div>
      </div>
      {(filters.length > 0 || search.trim()) && (
        <div className="border-t border-gray-200 p-3">
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
  ), [addFilter, countryOptions, filters, search]);

  const selectionActions = useMemo(() => [
    { id: 'duplicate', label: 'Dupliquer', icon: <FiCopy size={13} />, onClick: handleDuplicate },
    { id: 'delete', label: 'Supprimer', icon: <FiTrash2 size={13} />, variant: 'danger', onClick: handleDelete },
  ], [handleDelete, handleDuplicate]);

  const restoreMemory = useCallback((customState, savedState) => {
    if (Array.isArray(customState?.filters)) setFilters(customState.filters);
    if (Array.isArray(savedState?.visibleColumnIds) && savedState.visibleColumnIds.length) {
      setVisibleColumns(savedState.visibleColumnIds);
    }
  }, []);

  return (
    <UnifiedIndexPage
      title="Groupes de taxes"
      memoryKey={MEMORY_KEY}
      memoryState={{ filters }}
      onRestoreMemoryState={restoreMemory}
      rows={activeEntity ? filteredGroups : []}
      columns={columns}
      rowKey="id"
      loading={loading && groups.length === 0}
      error={!activeEntity ? 'Sélectionnez une entité pour afficher les groupes de taxes.' : error}
      success={success}
      messageDuration={15000}
      onDismissError={() => setError('')}
      onDismissSuccess={() => setSuccess('')}
      emptyText="Aucun groupe de taxes"
      searchValue={search}
      onSearchChange={(value) => { setSearch(value); setPage(1); }}
      searchPlaceholder="Rechercher un groupe de taxes..."
      filterChips={filterChips}
      onRemoveFilterChip={(chip) => {
        setFilters((current) => current.filter((filter) => filter.id !== chip.source.id));
        setPage(1);
      }}
      renderFilters={renderFilters}
      filterPanelWidth={560}
      primaryAction={{
        label: 'Nouveau groupe',
        icon: <FiPlus size={14} />,
        onClick: () => navigate('/comptabilite/tax-groups/create'),
      }}
      selectable={Boolean(activeEntity)}
      selectedRowKeys={selectedIds}
      onSelectionChange={setSelectedIds}
      selectionActions={selectionActions}
      renderSelectionSummary={() => <span>{selectedIds.length} groupe(s) sélectionné(s)</span>}
      onRowClick={(group, { event }) => {
        if (event.detail > 1) return;
        setSelectedIds((current) => current.includes(group.id)
          ? current.filter((id) => id !== group.id)
          : [...current, group.id]);
      }}
      onRowDoubleClick={(group, { event, saveNow }) => {
        event.preventDefault();
        event.stopPropagation();
        saveNow();
        navigate(`/comptabilite/tax-groups/${group.id}`, { state: { taxGroupRecord: group } });
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
