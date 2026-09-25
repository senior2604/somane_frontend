// src/features/comptabilite/pages/frameworks/FrameworkList.jsx
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiEdit2, FiEye, FiPlus, FiTrash2 } from 'react-icons/fi';
import UnifiedIndexPage from '../../../../components/UnifiedIndexPage';
import useFrameworkStore from '../../../../stores/comptabilite/frameworkStore';

const MEMORY_KEY = 'comptabilite:frameworks:index:v2';
const DEFAULT_COLUMNS = ['code', 'name', 'version', 'country', 'scope', 'length', 'status'];

const Badge = ({ children, active = false }) => (
  <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-medium ${
    active ? 'bg-green-100 text-green-700' : 'bg-slate-200 text-slate-700'
  }`}>
    {children}
  </span>
);

const countryLabel = (framework) => {
  const country = framework?.country;
  if (country && typeof country === 'object') {
    return country.nom || country.name || country.label || country.code || '-';
  }
  return framework?.country_name
    || framework?.country_label
    || framework?.country_code
    || country
    || '-';
};

const companyCount = (framework) => {
  if (Array.isArray(framework?.company)) return framework.company.length;
  if (Array.isArray(framework?.company_ids)) return framework.company_ids.length;
  if (Array.isArray(framework?.company_names)) return framework.company_names.length;
  return 0;
};

const errorMessage = (error, fallback) => (
  error?.response?.data?.detail || error?.message || fallback
);

function FrameworkList() {
  const navigate = useNavigate();
  const {
    frameworks = [],
    loading,
    error: storeError,
    fetchFrameworks,
    deleteFramework,
  } = useFrameworkStore();

  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');
  const [selectedIds, setSelectedIds] = useState([]);
  const [visibleColumns, setVisibleColumns] = useState(DEFAULT_COLUMNS);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [localError, setLocalError] = useState('');
  const [success, setSuccess] = useState('');

  const loadData = useCallback(async () => {
    try {
      setLocalError('');
      await fetchFrameworks({ page_size: 500, ordering: 'code' });
    } catch (requestError) {
      setLocalError(errorMessage(requestError, 'Impossible de charger les référentiels comptables.'));
    }
  }, [fetchFrameworks]);

  useEffect(() => {
    if (!frameworks.length) loadData();
  }, [frameworks.length, loadData]);

  const filteredRows = useMemo(() => {
    const query = search.trim().toLocaleLowerCase('fr');
    return frameworks.filter((framework) => {
      if (status !== 'all' && Boolean(framework.active) !== (status === 'active')) return false;
      if (!query) return true;
      return [
        framework.code,
        framework.name,
        framework.version,
        framework.description,
        countryLabel(framework),
      ].filter(Boolean).join(' ').toLocaleLowerCase('fr').includes(query);
    });
  }, [frameworks, search, status]);

  const openFramework = useCallback((framework) => {
    navigate(`/comptabilite/frameworks/${framework.id}`, { state: { frameworkRecord: framework } });
  }, [navigate]);

  const editFramework = useCallback((framework) => {
    navigate(`/comptabilite/frameworks/${framework.id}/edit`, { state: { frameworkRecord: framework } });
  }, [navigate]);

  const selectedRows = useMemo(() => {
    const selected = new Set(selectedIds.map(String));
    return frameworks.filter((framework) => selected.has(String(framework.id)));
  }, [frameworks, selectedIds]);

  const deleteSelected = useCallback(async () => {
    if (!selectedRows.length) return;
    const label = selectedRows.length === 1
      ? `le référentiel « ${selectedRows[0].name || selectedRows[0].code} »`
      : `${selectedRows.length} référentiels comptables`;
    if (!window.confirm(`Supprimer ${label} ?`)) return;
    try {
      await Promise.all(selectedRows.map((row) => deleteFramework(row.id)));
      setSelectedIds([]);
      setSuccess('Suppression effectuée avec succès.');
    } catch (requestError) {
      setLocalError(errorMessage(requestError, 'Impossible de supprimer la sélection.'));
    }
  }, [deleteFramework, selectedRows]);

  const columns = useMemo(() => [
    {
      id: 'code', label: 'Code', width: 120, value: (row) => row.code || '',
      render: (_, row) => <span className="font-mono font-semibold text-purple-700">{row.code || '-'}</span>,
    },
    {
      id: 'name', label: 'Nom du plan', minWidth: 210, value: (row) => row.name || '',
      render: (_, row) => (
        <div className="min-w-0">
          <div className="truncate font-medium text-gray-900" title={row.name || ''}>{row.name || '-'}</div>
          {row.description && <div className="truncate text-[10px] text-gray-500" title={row.description}>{row.description}</div>}
        </div>
      ),
    },
    { id: 'version', label: 'Version', width: 100, value: (row) => row.version || '-' },
    { id: 'country', label: 'Pays', minWidth: 130, value: countryLabel },
    {
      id: 'scope', label: 'Portée', minWidth: 130,
      value: (row) => companyCount(row),
      render: (_, row) => {
        const count = companyCount(row);
        return <Badge active={!count}>{count ? `${count} entité(s)` : 'Toutes les entités'}</Badge>;
      },
    },
    {
      id: 'length', label: 'Longueur', width: 90, align: 'right',
      value: (row) => row.account_code_length || row.code_length || row.length || '-',
    },
    {
      id: 'status', label: 'Statut', width: 90, value: (row) => (row.active ? 'Actif' : 'Inactif'),
      render: (_, row) => <Badge active={Boolean(row.active)}>{row.active ? 'Actif' : 'Inactif'}</Badge>,
    },
  ], []);

  const filterChips = useMemo(() => (
    status === 'all' ? [] : [{ id: 'status', label: status === 'active' ? 'Actifs' : 'Inactifs' }]
  ), [status]);

  const renderFilters = useCallback(() => (
    <div className="p-3">
      <div className="mb-2 text-xs font-semibold text-gray-700">Statut</div>
      {[
        ['all', 'Tous'],
        ['active', 'Actifs'],
        ['inactive', 'Inactifs'],
      ].map(([value, label]) => (
        <button
          key={value}
          type="button"
          onClick={() => { setStatus(value); setPage(1); }}
          className={`block w-full rounded px-3 py-2 text-left text-xs transition-colors ${
            status === value ? 'bg-purple-50 font-medium text-purple-700' : 'text-gray-700 hover:bg-gray-50'
          }`}
        >
          {label}
        </button>
      ))}
    </div>
  ), [status]);

  const selectionActions = useMemo(() => [
    {
      id: 'view', label: 'Voir', icon: <FiEye size={13} />, disabled: selectedRows.length !== 1,
      onClick: () => selectedRows[0] && openFramework(selectedRows[0]),
    },
    {
      id: 'edit', label: 'Modifier', icon: <FiEdit2 size={13} />, disabled: selectedRows.length !== 1,
      onClick: () => selectedRows[0] && editFramework(selectedRows[0]),
    },
    { id: 'delete', label: 'Supprimer', icon: <FiTrash2 size={13} />, variant: 'danger', onClick: deleteSelected },
  ], [deleteSelected, editFramework, openFramework, selectedRows]);

  const renderRow = useCallback((row, rowIndex, context) => {
    const selected = context.selectedRowKeys.map(String).includes(String(row.id));
    return (
      <tr
        key={row.id}
        className={`cursor-pointer border-b border-gray-200 transition-colors ${
          selected ? 'bg-purple-50' : `${context.getStripeClassName(rowIndex)} hover:bg-purple-50/40`
        }`}
      >
        <td className="border-r border-gray-100 px-2 py-1.5 text-center">
          <input
            type="checkbox"
            checked={selected}
            onClick={(event) => event.stopPropagation()}
            onChange={() => context.toggleRow(row.id)}
            className="h-3.5 w-3.5 accent-teal-700"
            aria-label="Sélectionner ce référentiel"
          />
        </td>
        {context.columns.map((column) => {
          const value = column.value ? column.value(row) : row[column.id];
          return (
            <td key={`${row.id}-${column.id}`} title={String(value ?? '')} className="max-w-0 border-r border-gray-100 px-2 py-1.5 text-xs text-gray-700">
              <div className="truncate">{column.render ? column.render(value, row, rowIndex) : (value ?? '-')}</div>
            </td>
          );
        })}
        <td className="w-6 border-r border-gray-100 px-0.5 py-1.5" />
      </tr>
    );
  }, []);

  return (
    <UnifiedIndexPage
      title="Référentiels comptables"
      memoryKey={MEMORY_KEY}
      rows={filteredRows}
      rowKey="id"
      columns={columns}
      loading={loading && !frameworks.length}
      error={localError || storeError || ''}
      success={success}
      messageDuration={15000}
      onDismissError={() => setLocalError('')}
      onDismissSuccess={() => setSuccess('')}
      emptyText="Aucun référentiel comptable"
      searchValue={search}
      onSearchChange={(value) => { setSearch(value); setPage(1); }}
      searchPlaceholder="Rechercher un code ou un nom..."
      filterChips={filterChips}
      onRemoveFilterChip={() => { setStatus('all'); setPage(1); }}
      renderFilters={renderFilters}
      primaryAction={{ label: 'Nouveau plan', icon: <FiPlus size={14} />, onClick: () => navigate('/comptabilite/frameworks/new') }}
      selectedRowKeys={selectedIds}
      onSelectionChange={setSelectedIds}
      selectionActions={selectionActions}
      renderSelectionSummary={() => `${selectedIds.length} référentiel(s) sélectionné(s)`}
      onRowOpen={openFramework}
      renderRow={renderRow}
      page={page}
      onPageChange={setPage}
      pageSize={pageSize}
      onPageSizeChange={setPageSize}
      pageSizeOptions={[25, 50, 100, 200]}
      visibleColumnIds={visibleColumns}
      defaultVisibleColumnIds={DEFAULT_COLUMNS}
      onVisibleColumnsChange={setVisibleColumns}
      defaultSortColumn="code"
      defaultSortDirection="asc"
      footerText={`${filteredRows.length} référentiel(s)`}
    />
  );
}

export { FrameworkList };
export default FrameworkList;
