// src/features/comptabilite/pages/PositionsFiscales/Index.jsx

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FiCheck,
  FiCopy,
  FiPlus,
  FiRefreshCw,
  FiTrash2,
  FiX,
} from 'react-icons/fi';
import UnifiedIndexPage from '../../../../components/UnifiedIndexPage';
import { useEntity } from '../../../../context/EntityContext';
import { apiClient } from '../../../../services/apiClient';

const MEMORY_KEY = 'comptabilite:positions-fiscales:index';
const CACHE_PREFIX = 'comptabilite:positions-fiscales:cache:';
const DEFAULT_COLUMNS = [
  'nom',
  'pays',
  'entreprise',
  'application',
  'tva',
  'priorite',
  'statut',
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

const entityName = (entity) => (
  entity?.raison_sociale || entity?.nom || entity?.name || entity?.sigle || ''
);

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

function ChoiceBadge({ value, positive, negative, tone = 'purple' }) {
  const positiveClass = tone === 'blue'
    ? 'bg-blue-100 text-blue-700'
    : 'bg-purple-100 text-purple-700';
  return (
    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
      value ? positiveClass : 'bg-gray-100 text-gray-600'
    }`}>
      {value ? positive : negative}
    </span>
  );
}

export default function PositionsFiscalesIndex() {
  const navigate = useNavigate();
  const { activeEntity } = useEntity();
  const companyId = activeEntity?.id;
  const cacheKey = `${CACHE_PREFIX}${companyId || 'none'}`;
  const requestRef = useRef(0);

  const [positions, setPositions] = useState(() => readCache(cacheKey));
  const [countries, setCountries] = useState({});
  const [entities, setEntities] = useState({});
  const [loading, setLoading] = useState(() => readCache(cacheKey).length === 0);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState([]);
  const [selectedIds, setSelectedIds] = useState([]);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [visibleColumns, setVisibleColumns] = useState(DEFAULT_COLUMNS);

  const loadLabels = useCallback(async () => {
    const [countriesResult, entitiesResult] = await Promise.allSettled([
      apiClient.get('/pays/', { params: { page_size: 500 } }),
      apiClient.get('/entites/', { params: { page_size: 500 } }),
    ]);

    if (countriesResult.status === 'fulfilled') {
      const map = {};
      asArray(countriesResult.value).forEach((country) => { map[String(country.id)] = country; });
      setCountries(map);
    }
    if (entitiesResult.status === 'fulfilled') {
      const map = {};
      asArray(entitiesResult.value).forEach((entity) => { map[String(entity.id)] = entity; });
      setEntities(map);
    }
  }, []);

  const loadPositions = useCallback(async ({ force = false } = {}) => {
    if (!companyId) {
      setPositions([]);
      setLoading(false);
      return;
    }

    const cached = readCache(cacheKey);
    if (cached.length && !force) {
      setPositions(cached);
      setLoading(false);
    } else if (!cached.length) {
      setLoading(true);
    }

    const version = requestRef.current + 1;
    requestRef.current = version;
    setError('');

    try {
      const response = await apiClient.get('/compta/fiscal-positions/', {
        params: { company: companyId, company_id: companyId, page_size: 500 },
      });
      if (version !== requestRef.current) return;
      const rows = asArray(response).filter((position) => (
        !position.company || String(resolveId(position.company)) === String(companyId)
      ));
      setPositions(rows);
      writeCache(cacheKey, rows);
    } catch (requestError) {
      if (version !== requestRef.current) return;
      if (!cached.length) setPositions([]);
      setError(getErrorMessage(requestError, 'Impossible de charger les positions fiscales.'));
    } finally {
      if (version === requestRef.current) setLoading(false);
    }
  }, [cacheKey, companyId]);

  useEffect(() => {
    const cached = readCache(cacheKey);
    setPositions(cached);
    setSelectedIds([]);
    setPage(1);
    setLoading(Boolean(companyId) && cached.length === 0);
    loadPositions();
    loadLabels();
  }, [cacheKey, companyId, loadLabels, loadPositions]);

  const getCountry = useCallback((position) => {
    if (position.country && typeof position.country === 'object') return position.country;
    return countries[String(resolveId(position.country))] || null;
  }, [countries]);

  const getCompany = useCallback((position) => {
    if (position.company && typeof position.company === 'object') return position.company;
    return entities[String(resolveId(position.company))] || activeEntity || null;
  }, [activeEntity, entities]);

  const filteredPositions = useMemo(() => {
    const query = search.trim().toLocaleLowerCase('fr');
    return positions.filter((position) => {
      const content = [
        position.name,
        position.note,
        position.foreign_vat,
        position.fiscal_country_codes,
        countryName(getCountry(position)),
        entityName(getCompany(position)),
      ].filter(Boolean).join(' ').toLocaleLowerCase('fr');

      if (query && !content.includes(query)) return false;
      return filters.every((filter) => {
        if (filter.field === 'country') return String(resolveId(position.country)) === filter.value;
        if (filter.field === 'status') return String(Boolean(position.active)) === filter.value;
        if (filter.field === 'auto') return String(Boolean(position.auto_apply)) === filter.value;
        if (filter.field === 'vat') return String(Boolean(position.vat_required)) === filter.value;
        return true;
      });
    });
  }, [filters, getCompany, getCountry, positions, search]);

  const addFilter = useCallback((field, value, label) => {
    setFilters((current) => [
      ...current.filter((filter) => filter.id !== `${field}:${value}`),
      { id: `${field}:${value}`, field, value, label },
    ]);
    setPage(1);
  }, []);

  const runBulkUpdate = useCallback(async (payloadFactory, message) => {
    if (!selectedIds.length) return;
    try {
      await Promise.all(selectedIds.map((id) => {
        const position = positions.find((item) => item.id === id);
        const payload = typeof payloadFactory === 'function'
          ? payloadFactory(position)
          : payloadFactory;
        return apiClient.patch(`/compta/fiscal-positions/${id}/`, payload);
      }));
      setSuccess(message);
      setSelectedIds([]);
      await loadPositions({ force: true });
    } catch (requestError) {
      setError(getErrorMessage(requestError, 'Impossible de modifier les positions sélectionnées.'));
    }
  }, [loadPositions, positions, selectedIds]);

  const handleDelete = useCallback(async () => {
    if (!selectedIds.length) return;
    if (!window.confirm(`Supprimer ${selectedIds.length} position(s) fiscale(s) ?`)) return;
    try {
      await Promise.all(selectedIds.map((id) => apiClient.delete(`/compta/fiscal-positions/${id}/`)));
      setSuccess(`${selectedIds.length} position(s) fiscale(s) supprimée(s).`);
      setSelectedIds([]);
      await loadPositions({ force: true });
    } catch (requestError) {
      setError(getErrorMessage(requestError, 'Impossible de supprimer les positions sélectionnées.'));
    }
  }, [loadPositions, selectedIds]);

  const handleDuplicate = useCallback(async () => {
    if (!selectedIds.length || !companyId) return;
    try {
      const selected = positions.filter((position) => selectedIds.includes(position.id));
      await Promise.all(selected.map((position) => apiClient.post('/compta/fiscal-positions/', {
        name: `${position.name || 'Position fiscale'} (Copie)`,
        country: resolveId(position.country),
        company: companyId,
        auto_apply: Boolean(position.auto_apply),
        vat_required: Boolean(position.vat_required),
        active: Boolean(position.active),
        sequence: position.sequence || 10,
        note: position.note || '',
        foreign_vat: position.foreign_vat || '',
        foreign_vat_header_mode: position.foreign_vat_header_mode || '',
        fiscal_country_codes: position.fiscal_country_codes || '',
        zip_from: position.zip_from || '',
        zip_to: position.zip_to || '',
      })));
      setSuccess(`${selected.length} position(s) fiscale(s) dupliquée(s).`);
      setSelectedIds([]);
      await loadPositions({ force: true });
    } catch (requestError) {
      setError(getErrorMessage(requestError, 'Impossible de dupliquer les positions sélectionnées.'));
    }
  }, [companyId, loadPositions, positions, selectedIds]);

  const columns = useMemo(() => [
    {
      id: 'nom',
      label: 'Position',
      minWidth: 180,
      value: (position) => position.name || '',
      render: (_, position) => (
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            navigate(`/comptabilite/positions-fiscales/${position.id}`, {
              state: { fiscalPositionRecord: position },
            });
          }}
          className="block w-full truncate text-left font-medium text-teal-700 hover:text-purple-700 hover:underline"
          title={position.name}
        >
          {position.name || '-'}
        </button>
      ),
    },
    {
      id: 'pays',
      label: 'Pays',
      minWidth: 115,
      value: (position) => countryName(getCountry(position)) || 'Global',
    },
    {
      id: 'entreprise',
      label: 'Entreprise',
      minWidth: 130,
      value: (position) => entityName(getCompany(position)) || '-',
    },
    {
      id: 'application',
      label: 'Application',
      width: 105,
      value: (position) => (position.auto_apply ? 'Automatique' : 'Manuelle'),
      render: (_, position) => (
        <ChoiceBadge value={position.auto_apply} positive="Automatique" negative="Manuelle" />
      ),
    },
    {
      id: 'tva',
      label: 'TVA',
      width: 105,
      value: (position) => (position.vat_required ? 'TVA requise' : 'Sans TVA'),
      render: (_, position) => (
        <ChoiceBadge value={position.vat_required} positive="TVA requise" negative="Sans TVA" tone="blue" />
      ),
    },
    {
      id: 'priorite',
      label: 'Priorité',
      width: 75,
      numeric: true,
      value: (position) => Number(position.sequence || 0),
    },
    {
      id: 'statut',
      label: 'Statut',
      width: 90,
      value: (position) => (position.active ? 'Actif' : 'Inactif'),
      render: (_, position) => <StatusBadge active={position.active} />,
    },
  ], [getCompany, getCountry, navigate]);

  const filterChips = useMemo(() => filters.map((filter) => ({
    id: filter.id,
    label: filter.label,
    source: filter,
  })), [filters]);

  const countryOptions = useMemo(() => Object.values(countries)
    .sort((a, b) => countryName(a).localeCompare(countryName(b), 'fr')), [countries]);

  const renderFilters = useCallback(({ close }) => (
    <div className="grid grid-cols-1 text-xs text-gray-700 md:grid-cols-2">
      <div className="border-b border-gray-200 p-3 md:border-b-0 md:border-r">
        <p className="mb-2 font-semibold text-gray-800">Configuration</p>
        <div className="space-y-1">
          {[
            { field: 'auto', value: 'true', label: 'Application automatique' },
            { field: 'auto', value: 'false', label: 'Application manuelle' },
            { field: 'vat', value: 'true', label: 'TVA requise' },
            { field: 'vat', value: 'false', label: 'Sans TVA requise' },
            { field: 'status', value: 'true', label: 'Actives' },
            { field: 'status', value: 'false', label: 'Inactives' },
          ].map((option) => {
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

      <div className="p-3">
        <p className="mb-2 font-semibold text-gray-800">Pays</p>
        <div className="max-h-52 space-y-1 overflow-y-auto">
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
                className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left hover:bg-gray-100"
              >
                <span className="w-4 text-purple-600">{selected ? '✓' : ''}</span>
                <span className="truncate">{countryName(country)}</span>
              </button>
            );
          })}
        </div>
      </div>

      {(filters.length > 0 || search.trim()) && (
        <div className="border-t border-gray-200 p-3 md:col-span-2">
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
    {
      id: 'toggle-auto',
      label: 'Inverser application auto',
      icon: <FiRefreshCw size={13} />,
      onClick: () => runBulkUpdate(
        (position) => ({ auto_apply: !position?.auto_apply }),
        'Application automatique mise à jour.',
      ),
    },
    {
      id: 'activate',
      label: 'Activer',
      icon: <FiCheck size={13} />,
      variant: 'success',
      onClick: () => runBulkUpdate({ active: true }, 'Positions fiscales activées.'),
    },
    {
      id: 'deactivate',
      label: 'Désactiver',
      icon: <FiX size={13} />,
      onClick: () => runBulkUpdate({ active: false }, 'Positions fiscales désactivées.'),
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
      title="Positions fiscales"
      memoryKey={MEMORY_KEY}
      memoryState={{ filters }}
      onRestoreMemoryState={restoreMemory}
      rows={activeEntity ? filteredPositions : []}
      columns={columns}
      rowKey="id"
      loading={loading && positions.length === 0}
      error={!activeEntity ? 'Sélectionnez une entité pour afficher les positions fiscales.' : error}
      success={success}
      messageDuration={15000}
      onDismissError={() => setError('')}
      onDismissSuccess={() => setSuccess('')}
      emptyText="Aucune position fiscale"
      searchValue={search}
      onSearchChange={(value) => { setSearch(value); setPage(1); }}
      searchPlaceholder="Rechercher une position fiscale..."
      filterChips={filterChips}
      onRemoveFilterChip={(chip) => {
        setFilters((current) => current.filter((filter) => filter.id !== chip.source.id));
        setPage(1);
      }}
      renderFilters={renderFilters}
      filterPanelWidth={680}
      primaryAction={{
        label: 'Nouvelle position',
        icon: <FiPlus size={14} />,
        onClick: () => navigate('/comptabilite/positions-fiscales/create'),
      }}
      selectable={Boolean(activeEntity)}
      selectedRowKeys={selectedIds}
      onSelectionChange={setSelectedIds}
      selectionActions={selectionActions}
      renderSelectionSummary={() => <span>{selectedIds.length} position(s) sélectionnée(s)</span>}
      onRowOpen={(position, { saveNow }) => {
        saveNow();
        navigate(`/comptabilite/positions-fiscales/${position.id}`, {
          state: { fiscalPositionRecord: position },
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
      defaultSortColumn="priorite"
      defaultSortDirection="asc"
    />
  );
}
