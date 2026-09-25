import { useCallback, useEffect, useMemo, useState } from 'react';
import { FiCheck, FiEye, FiFolder, FiPause, FiPlus, FiTrash2, FiX } from 'react-icons/fi';
import { useLocation, useNavigate } from 'react-router-dom';

import UnifiedIndexPage from '../../../../components/UnifiedIndexPage';
import axiosInstance from '../../../../config/axiosInstance';
import {
  API,
  ASSET_STATES,
  ASSET_TYPES,
  METHODS,
  StateBadge,
  formatDate,
  formatMoney,
  getActionErrorMessage,
  getActiveEntityId,
  normalizeApiList,
  normalizeText,
  relationId,
} from './assetShared.jsx';

const MEMORY_KEY = 'comptabilite:assets:index:v1';
const CACHE_KEY = 'somane:assets:list-cache:v1';
const DEFAULT_COLUMNS = ['code', 'name', 'category', 'original_value', 'book_value', 'acquisition_date', 'method', 'state'];

const readCache = () => {
  try {
    const parsed = JSON.parse(sessionStorage.getItem(CACHE_KEY) || 'null');
    return Array.isArray(parsed?.rows) ? parsed.rows : [];
  } catch {
    return [];
  }
};

const writeCache = (rows) => {
  try { sessionStorage.setItem(CACHE_KEY, JSON.stringify({ rows, savedAt: Date.now() })); } catch {}
};

const categoryName = (asset) => asset.category_name || asset.category_id_label || asset.category?.name || '-';
const currencyCode = (asset) => asset.currency_code || asset.currency_id_label || asset.currency?.code || 'XOF';

export default function AssetList() {
  const navigate = useNavigate();
  const location = useLocation();
  const entityId = getActiveEntityId();
  const [assets, setAssets] = useState(readCache);
  const [search, setSearch] = useState('');
  const [stateFilter, setStateFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [selectedIds, setSelectedIds] = useState([]);
  const [visibleColumns, setVisibleColumns] = useState(DEFAULT_COLUMNS);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [loading, setLoading] = useState(() => !assets.length);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const loadAssets = useCallback(async ({ silent = false } = {}) => {
    if (!silent) setLoading(true);
    setError('');
    try {
      const response = await axiosInstance.get(API.assets, {
        params: { company_id: entityId || undefined, page_size: 1000, ordering: '-acquisition_date,-id' },
      });
      const rows = normalizeApiList(response.data);
      setAssets(rows);
      writeCache(rows);
    } catch (requestError) {
      setError(getActionErrorMessage(requestError, 'Impossible de charger les immobilisations.'));
    } finally {
      setLoading(false);
    }
  }, [entityId]);

  useEffect(() => {
    const returned = location.state?.createdRecord || location.state?.updatedRecord;
    const returnedId = returned?.id || returned?.pk;
    if (returnedId) {
      setAssets((current) => {
        const exists = current.some((row) => String(row.id) === String(returnedId));
        const rows = exists ? current.map((row) => String(row.id) === String(returnedId) ? returned : row) : [returned, ...current];
        writeCache(rows);
        return rows;
      });
    }
    loadAssets({ silent: true });
  }, [loadAssets, location.state]);

  const categories = useMemo(() => {
    const values = new Map();
    assets.forEach((asset) => {
      const id = relationId(asset.category_id || asset.category);
      if (id) values.set(String(id), categoryName(asset));
    });
    return Array.from(values, ([id, label]) => ({ id, label })).sort((a, b) => a.label.localeCompare(b.label));
  }, [assets]);

  const filteredRows = useMemo(() => {
    const query = normalizeText(search);
    return assets.filter((asset) => {
      if (stateFilter !== 'all' && asset.state !== stateFilter) return false;
      if (typeFilter !== 'all' && asset.asset_type !== typeFilter) return false;
      if (categoryFilter !== 'all' && String(relationId(asset.category_id || asset.category)) !== String(categoryFilter)) return false;
      if (!query) return true;
      return normalizeText([
        asset.code, asset.name, categoryName(asset), asset.asset_group, asset.location,
        asset.barcode, ASSET_STATES[asset.state], ASSET_TYPES.find((item) => item.id === asset.asset_type)?.label,
      ].filter(Boolean).join(' ')).includes(query);
    });
  }, [assets, categoryFilter, search, stateFilter, typeFilter]);

  const selectedRows = useMemo(() => {
    const ids = new Set(selectedIds.map(String));
    return assets.filter((asset) => ids.has(String(asset.id)));
  }, [assets, selectedIds]);

  const openAsset = useCallback((asset) => {
    if (!asset?.id) return;
    navigate(`/comptabilite/immobilisations/${asset.id}`, { state: { assetRecord: asset } });
  }, [navigate]);

  const runStateAction = useCallback(async (action, allowedStates, confirmation) => {
    const targets = selectedRows.filter((asset) => allowedStates.includes(asset.state));
    if (!targets.length || actionLoading || !window.confirm(confirmation.replace('{count}', targets.length))) return;
    setActionLoading(true);
    setError('');
    try {
      await Promise.all(targets.map((asset) => axiosInstance.post(`${API.assets}${asset.id}/${action}/`)));
      setSelectedIds([]);
      setSuccess('État des immobilisations mis à jour.');
      await loadAssets({ silent: true });
    } catch (requestError) {
      setError(getActionErrorMessage(requestError, "Impossible d'exécuter cette action."));
    } finally {
      setActionLoading(false);
    }
  }, [actionLoading, loadAssets, selectedRows]);

  const deleteSelected = useCallback(async () => {
    const targets = selectedRows.filter((asset) => asset.state === 'draft');
    if (!targets.length || actionLoading || !window.confirm(`Supprimer ${targets.length} immobilisation(s) en brouillon ?`)) return;
    setActionLoading(true);
    try {
      await Promise.all(targets.map((asset) => axiosInstance.delete(`${API.assets}${asset.id}/`)));
      const removed = new Set(targets.map((asset) => String(asset.id)));
      setAssets((current) => {
        const rows = current.filter((asset) => !removed.has(String(asset.id)));
        writeCache(rows);
        return rows;
      });
      setSelectedIds([]);
      setSuccess('Immobilisation(s) supprimée(s).');
    } catch (requestError) {
      setError(getActionErrorMessage(requestError, 'Impossible de supprimer les immobilisations.'));
    } finally {
      setActionLoading(false);
    }
  }, [actionLoading, selectedRows]);

  const columns = useMemo(() => [
    { id: 'code', label: "N° d'inventaire", minWidth: 145, value: (row) => row.code || '-', render: (value) => <span className="font-semibold text-teal-700">{value}</span> },
    { id: 'name', label: 'Immobilisation', minWidth: 220, value: (row) => row.name || '-' },
    { id: 'category', label: 'Catégorie', minWidth: 190, value: categoryName },
    { id: 'nature', label: 'Nature', minWidth: 150, value: (row) => ASSET_TYPES.find((item) => item.id === row.asset_type)?.label || row.asset_type || '-' },
    { id: 'original_value', label: "Valeur d'origine", minWidth: 155, numeric: true, value: (row) => Number(row.original_value || 0), render: (_, row) => formatMoney(row.original_value, currencyCode(row)) },
    { id: 'depreciated_value', label: 'Amortissements', minWidth: 150, numeric: true, value: (row) => Number(row.depreciated_value || 0), render: (_, row) => formatMoney(row.depreciated_value, currencyCode(row)) },
    { id: 'book_value', label: 'Valeur comptable', minWidth: 155, numeric: true, value: (row) => Number(row.book_value || 0), render: (_, row) => <span className="font-semibold tabular-nums">{formatMoney(row.book_value, currencyCode(row))}</span> },
    { id: 'residual', label: 'Valeur amortissable', minWidth: 165, numeric: true, value: (row) => Number(row.value_residual || 0), render: (_, row) => formatMoney(row.value_residual, currencyCode(row)) },
    { id: 'acquisition_date', label: "Date d'acquisition", width: 130, value: (row) => row.acquisition_date, render: formatDate },
    { id: 'method', label: 'Méthode', minWidth: 160, value: (row) => METHODS.find((item) => item.id === row.depreciate_method)?.label || row.depreciate_method || '-' },
    { id: 'state', label: 'État', width: 130, value: (row) => ASSET_STATES[row.state] || row.state, render: (_, row) => <StateBadge state={row.state} /> },
  ], []);

  const filterChips = useMemo(() => {
    const chips = [];
    if (stateFilter !== 'all') chips.push({ id: 'state', label: ASSET_STATES[stateFilter] });
    if (typeFilter !== 'all') chips.push({ id: 'type', label: ASSET_TYPES.find((item) => item.id === typeFilter)?.label });
    if (categoryFilter !== 'all') chips.push({ id: 'category', label: categories.find((item) => item.id === categoryFilter)?.label || 'Catégorie' });
    return chips;
  }, [categories, categoryFilter, stateFilter, typeFilter]);

  const renderFilters = useCallback(() => (
    <div className="grid grid-cols-1 gap-4 p-4 text-xs sm:grid-cols-3">
      <label><span className="mb-1 block font-semibold text-gray-700">État</span><select className="h-9 w-full border border-gray-300 bg-white px-2 outline-none focus:border-purple-500" value={stateFilter} onChange={(event) => { setStateFilter(event.target.value); setPage(1); }}><option value="all">Tous les états</option>{Object.entries(ASSET_STATES).map(([id, label]) => <option key={id} value={id}>{label}</option>)}</select></label>
      <label><span className="mb-1 block font-semibold text-gray-700">Nature</span><select className="h-9 w-full border border-gray-300 bg-white px-2 outline-none focus:border-purple-500" value={typeFilter} onChange={(event) => { setTypeFilter(event.target.value); setPage(1); }}><option value="all">Toutes les natures</option>{ASSET_TYPES.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}</select></label>
      <label><span className="mb-1 block font-semibold text-gray-700">Catégorie</span><select className="h-9 w-full border border-gray-300 bg-white px-2 outline-none focus:border-purple-500" value={categoryFilter} onChange={(event) => { setCategoryFilter(event.target.value); setPage(1); }}><option value="all">Toutes les catégories</option>{categories.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}</select></label>
    </div>
  ), [categories, categoryFilter, stateFilter, typeFilter]);

  const selectionActions = useMemo(() => [
    { id: 'open', label: 'Ouvrir', icon: <FiEye size={13} />, disabled: selectedRows.length !== 1, onClick: () => selectedRows[0] && openAsset(selectedRows[0]) },
    { id: 'start', label: 'Mettre en service', icon: <FiCheck size={13} />, variant: 'success', disabled: actionLoading || !selectedRows.some((row) => ['draft', 'waiting'].includes(row.state)), onClick: () => runStateAction('start', ['draft', 'waiting'], 'Mettre {count} immobilisation(s) en service ?') },
    { id: 'pause', label: 'Mettre en attente', icon: <FiPause size={13} />, disabled: actionLoading || !selectedRows.some((row) => row.state === 'running'), onClick: () => runStateAction('pause', ['running'], 'Mettre {count} immobilisation(s) en attente ?') },
    { id: 'cancel', label: 'Annuler', icon: <FiX size={13} />, variant: 'danger', disabled: actionLoading || !selectedRows.some((row) => ['draft', 'waiting'].includes(row.state)), onClick: () => runStateAction('cancel', ['draft', 'waiting'], 'Annuler {count} immobilisation(s) ?') },
    { id: 'delete', label: 'Supprimer', icon: <FiTrash2 size={13} />, variant: 'danger', disabled: actionLoading || !selectedRows.some((row) => row.state === 'draft'), onClick: deleteSelected },
  ], [actionLoading, deleteSelected, openAsset, runStateAction, selectedRows]);

  return (
    <UnifiedIndexPage
      title="Immobilisations"
      memoryKey={MEMORY_KEY}
      rows={filteredRows}
      rowKey="id"
      columns={columns}
      loading={loading && !assets.length}
      error={error}
      success={success}
      messageDuration={15000}
      onDismissError={() => setError('')}
      onDismissSuccess={() => setSuccess('')}
      emptyText="Aucune immobilisation"
      searchValue={search}
      onSearchChange={(value) => { setSearch(value); setPage(1); }}
      searchPlaceholder="Rechercher une immobilisation..."
      filterChips={filterChips}
      onRemoveFilterChip={(chip) => {
        if (chip.id === 'state') setStateFilter('all');
        if (chip.id === 'type') setTypeFilter('all');
        if (chip.id === 'category') setCategoryFilter('all');
        setPage(1);
      }}
      renderFilters={renderFilters}
      filterPanelWidth={620}
      primaryAction={{ label: 'Nouvelle immobilisation', icon: <FiPlus size={14} />, onClick: () => navigate('/comptabilite/immobilisations/create') }}
      trailingActions={[{ id: 'categories', label: 'Catégories', icon: <FiFolder size={13} />, onClick: () => navigate('/comptabilite/categories-immobilisations') }]}
      selectedRowKeys={selectedIds}
      onSelectionChange={setSelectedIds}
      selectionActions={selectionActions}
      renderSelectionSummary={() => `${selectedIds.length} immobilisation(s) sélectionnée(s)`}
      onRowOpen={openAsset}
      page={page}
      onPageChange={setPage}
      pageSize={pageSize}
      onPageSizeChange={setPageSize}
      pageSizeOptions={[15, 25, 50, 100]}
      visibleColumnIds={visibleColumns}
      defaultVisibleColumnIds={DEFAULT_COLUMNS}
      onVisibleColumnsChange={setVisibleColumns}
      defaultSortColumn="acquisition_date"
      defaultSortDirection="desc"
      footerText={`${filteredRows.length} immobilisation(s)`}
    />
  );
}
