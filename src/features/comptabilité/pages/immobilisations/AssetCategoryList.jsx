import { useCallback, useEffect, useMemo, useState } from 'react';
import { FiEye, FiPlus, FiTrash2 } from 'react-icons/fi';
import { useLocation, useNavigate } from 'react-router-dom';

import UnifiedIndexPage from '../../../../components/UnifiedIndexPage';
import axiosInstance from '../../../../config/axiosInstance';
import {
  API,
  METHODS,
  PERIODS,
  getActionErrorMessage,
  getActiveEntityId,
  normalizeApiList,
  normalizeText,
} from './assetShared.jsx';

const CACHE_KEY = 'somane:asset-categories:list-cache:v1';
const DEFAULT_COLUMNS = ['code', 'name', 'method', 'duration', 'asset_account', 'journal', 'active'];

const readCache = () => {
  try {
    const parsed = JSON.parse(sessionStorage.getItem(CACHE_KEY) || 'null');
    return Array.isArray(parsed?.rows) ? parsed.rows : [];
  } catch { return []; }
};
const writeCache = (rows) => { try { sessionStorage.setItem(CACHE_KEY, JSON.stringify({ rows, savedAt: Date.now() })); } catch {} };

export default function AssetCategoryList() {
  const navigate = useNavigate();
  const location = useLocation();
  const entityId = getActiveEntityId();
  const [rows, setRows] = useState(readCache);
  const [search, setSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState('all');
  const [methodFilter, setMethodFilter] = useState('all');
  const [selectedIds, setSelectedIds] = useState([]);
  const [visibleColumns, setVisibleColumns] = useState(DEFAULT_COLUMNS);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [loading, setLoading] = useState(() => !rows.length);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const loadRows = useCallback(async ({ silent = false } = {}) => {
    if (!silent) setLoading(true);
    try {
      const response = await axiosInstance.get(API.categories, { params: { company_id: entityId || undefined, page_size: 1000, ordering: 'code' } });
      const data = normalizeApiList(response.data);
      setRows(data);
      writeCache(data);
    } catch (requestError) {
      setError(getActionErrorMessage(requestError, "Impossible de charger les catégories d'immobilisations."));
    } finally { setLoading(false); }
  }, [entityId]);

  useEffect(() => {
    const returned = location.state?.createdRecord || location.state?.updatedRecord;
    if (returned?.id) {
      setRows((current) => {
        const exists = current.some((row) => String(row.id) === String(returned.id));
        const next = exists ? current.map((row) => String(row.id) === String(returned.id) ? returned : row) : [returned, ...current];
        writeCache(next);
        return next;
      });
    }
    loadRows({ silent: true });
  }, [loadRows, location.state]);

  const filteredRows = useMemo(() => {
    const query = normalizeText(search);
    return rows.filter((row) => {
      if (activeFilter !== 'all' && String(row.active) !== activeFilter) return false;
      if (methodFilter !== 'all' && row.method !== methodFilter) return false;
      return !query || normalizeText([row.code, row.name, row.account_asset_label, row.journal_label, METHODS.find((item) => item.id === row.method)?.label].filter(Boolean).join(' ')).includes(query);
    });
  }, [activeFilter, methodFilter, rows, search]);

  const selectedRows = useMemo(() => {
    const ids = new Set(selectedIds.map(String));
    return rows.filter((row) => ids.has(String(row.id)));
  }, [rows, selectedIds]);

  const openRow = useCallback((row) => row?.id && navigate(`/comptabilite/categories-immobilisations/${row.id}`, { state: { assetCategoryRecord: row } }), [navigate]);

  const deleteSelected = useCallback(async () => {
    if (!selectedRows.length || !window.confirm(`Supprimer ${selectedRows.length} catégorie(s) ?`)) return;
    try {
      await Promise.all(selectedRows.map((row) => axiosInstance.delete(`${API.categories}${row.id}/`)));
      const removed = new Set(selectedRows.map((row) => String(row.id)));
      setRows((current) => {
        const next = current.filter((row) => !removed.has(String(row.id)));
        writeCache(next);
        return next;
      });
      setSelectedIds([]);
      setSuccess('Catégorie(s) supprimée(s).');
    } catch (requestError) {
      setError(getActionErrorMessage(requestError, 'Suppression impossible. Une catégorie utilisée ne peut pas être supprimée.'));
    }
  }, [selectedRows]);

  const columns = useMemo(() => [
    { id: 'code', label: 'Code', width: 120, value: (row) => row.code, render: (value) => <span className="font-semibold text-teal-700">{value}</span> },
    { id: 'name', label: 'Catégorie', minWidth: 230, value: (row) => row.name },
    { id: 'method', label: 'Méthode', minWidth: 190, value: (row) => METHODS.find((item) => item.id === row.method)?.label || row.method },
    { id: 'duration', label: 'Durée', width: 130, numeric: true, value: (row) => Number(row.method_number || 0), render: (_, row) => `${row.method_number || 0} ${PERIODS.find((item) => item.id === row.method_period)?.label || row.method_period}` },
    { id: 'salvage', label: 'Valeur résiduelle', width: 145, numeric: true, value: (row) => Number(row.salvage_value_percent || 0), render: (_, row) => `${Number(row.salvage_value_percent || 0).toLocaleString('fr-FR')} %` },
    { id: 'asset_account', label: "Compte d'immobilisation", minWidth: 230, value: (row) => row.account_asset_label || '-' },
    { id: 'journal', label: 'Journal', minWidth: 160, value: (row) => row.journal_label || '-' },
    { id: 'assets_count', label: 'Immobilisations', width: 125, numeric: true, value: (row) => Number(row.assets_count || 0) },
    { id: 'active', label: 'État', width: 100, value: (row) => row.active ? 'Actif' : 'Inactif', render: (_, row) => <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${row.active ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-600'}`}>{row.active ? 'Actif' : 'Inactif'}</span> },
  ], []);

  const filterChips = useMemo(() => {
    const chips = [];
    if (activeFilter !== 'all') chips.push({ id: 'active', label: activeFilter === 'true' ? 'Actif' : 'Inactif' });
    if (methodFilter !== 'all') chips.push({ id: 'method', label: METHODS.find((item) => item.id === methodFilter)?.label });
    return chips;
  }, [activeFilter, methodFilter]);

  const renderFilters = useCallback(() => (
    <div className="grid grid-cols-2 gap-4 p-4 text-xs">
      <label><span className="mb-1 block font-semibold text-gray-700">État</span><select className="h-9 w-full border border-gray-300 bg-white px-2" value={activeFilter} onChange={(event) => { setActiveFilter(event.target.value); setPage(1); }}><option value="all">Tous</option><option value="true">Actif</option><option value="false">Inactif</option></select></label>
      <label><span className="mb-1 block font-semibold text-gray-700">Méthode</span><select className="h-9 w-full border border-gray-300 bg-white px-2" value={methodFilter} onChange={(event) => { setMethodFilter(event.target.value); setPage(1); }}><option value="all">Toutes les méthodes</option>{METHODS.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}</select></label>
    </div>
  ), [activeFilter, methodFilter]);

  return (
    <UnifiedIndexPage
      title="Catégories d'immobilisations"
      memoryKey="comptabilite:asset-categories:index:v1"
      rows={filteredRows}
      rowKey="id"
      columns={columns}
      loading={loading && !rows.length}
      error={error}
      success={success}
      onDismissError={() => setError('')}
      onDismissSuccess={() => setSuccess('')}
      emptyText="Aucune catégorie"
      searchValue={search}
      onSearchChange={(value) => { setSearch(value); setPage(1); }}
      searchPlaceholder="Rechercher une catégorie..."
      filterChips={filterChips}
      onRemoveFilterChip={(chip) => { if (chip.id === 'active') setActiveFilter('all'); if (chip.id === 'method') setMethodFilter('all'); }}
      renderFilters={renderFilters}
      primaryAction={{ label: 'Nouvelle catégorie', icon: <FiPlus size={14} />, onClick: () => navigate('/comptabilite/categories-immobilisations/create') }}
      selectedRowKeys={selectedIds}
      onSelectionChange={setSelectedIds}
      selectionActions={[
        { id: 'open', label: 'Ouvrir', icon: <FiEye size={13} />, disabled: selectedRows.length !== 1, onClick: () => selectedRows[0] && openRow(selectedRows[0]) },
        { id: 'delete', label: 'Supprimer', icon: <FiTrash2 size={13} />, variant: 'danger', disabled: !selectedRows.length, onClick: deleteSelected },
      ]}
      renderSelectionSummary={() => `${selectedIds.length} catégorie(s) sélectionnée(s)`}
      onRowOpen={openRow}
      page={page}
      onPageChange={setPage}
      pageSize={pageSize}
      onPageSizeChange={setPageSize}
      pageSizeOptions={[15, 25, 50, 100]}
      visibleColumnIds={visibleColumns}
      defaultVisibleColumnIds={DEFAULT_COLUMNS}
      onVisibleColumnsChange={setVisibleColumns}
      defaultSortColumn="code"
      footerText={`${filteredRows.length} catégorie(s)`}
    />
  );
}
