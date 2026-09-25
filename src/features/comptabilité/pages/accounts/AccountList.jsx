// src/features/comptabilite/pages/accounts/AccountList.jsx
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiDownload, FiEye, FiPlus, FiTrash2, FiUpload } from 'react-icons/fi';
import UnifiedIndexPage from '../../../../components/UnifiedIndexPage';
import { ENDPOINTS } from '../../../../config/api';
import axiosInstance from '../../../../config/axiosInstance';
import useAccountStore from '../../../../stores/comptabilite/accountStore';
import useFrameworkStore from '../../../../stores/comptabilite/frameworkStore';

const FRAMEWORK_SESSION_KEY = 'account_list_selected_framework';
const MEMORY_KEY = 'comptabilite:accounts:index:v3';
const DEFAULT_COLUMNS = [
  'number', 'name', 'commercial_name', 'nature', 'class', 'account_type',
  'parent', 'company', 'currency', 'reconcile', 'status',
];

const normalizeList = (payload) => (Array.isArray(payload) ? payload : payload?.results || []);
const relationLabel = (value) => {
  if (!value) return '-';
  if (typeof value === 'string') return value;
  if (typeof value === 'number') return String(value);
  return [value.code, value.name || value.label || value.display_name].filter(Boolean).join(' - ') || '-';
};
const optionLabel = (value) => [value?.code, value?.name || value?.label].filter(Boolean).join(' - ');
const errorMessage = (error, fallback) => error?.response?.data?.detail || error?.message || fallback;

const Badge = ({ children, color = 'slate' }) => {
  const colors = {
    green: 'bg-green-100 text-green-700',
    blue: 'bg-blue-100 text-blue-700',
    purple: 'bg-purple-100 text-purple-700',
    slate: 'bg-slate-100 text-slate-700',
  };
  return <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-medium ${colors[color]}`}>{children}</span>;
};

export default function AccountList() {
  const navigate = useNavigate();
  const { frameworks = [], fetchFrameworks } = useFrameworkStore();
  const {
    accounts = [], loading, pagination = {}, fetchAccounts, deleteAccount, setPagination,
  } = useAccountStore();

  const [frameworkId, setFrameworkId] = useState(() => sessionStorage.getItem(FRAMEWORK_SESSION_KEY) || '');
  const [search, setSearch] = useState('');
  const [typeId, setTypeId] = useState('');
  const [groupId, setGroupId] = useState('');
  const [status, setStatus] = useState('all');
  const [reconcile, setReconcile] = useState('all');
  const [types, setTypes] = useState([]);
  const [groups, setGroups] = useState([]);
  const [filtersLoadedFor, setFiltersLoadedFor] = useState('');
  const [selectedIds, setSelectedIds] = useState([]);
  const [visibleColumns, setVisibleColumns] = useState(DEFAULT_COLUMNS);
  const [localError, setLocalError] = useState('');
  const [success, setSuccess] = useState('');

  const page = Number(pagination.current || 1);
  const pageSize = Number(pagination.pageSize || 25);
  const total = Number(pagination.total || accounts.length);

  useEffect(() => {
    if (!frameworks.length) fetchFrameworks({ page_size: 500 }).catch(() => {});
  }, [fetchFrameworks, frameworks.length]);

  useEffect(() => {
    if (!frameworks.length) return;
    const exists = frameworks.some((item) => String(item.id) === String(frameworkId));
    if (!exists) setFrameworkId(String(frameworks[0].id));
  }, [frameworkId, frameworks]);

  useEffect(() => {
    if (!frameworkId) return;
    sessionStorage.setItem(FRAMEWORK_SESSION_KEY, frameworkId);
    const timer = window.setTimeout(() => {
      const params = { framework: frameworkId, page, page_size: pageSize };
      if (search.trim()) params.search = search.trim();
      if (typeId) params.type = typeId;
      if (groupId) params.group = groupId;
      if (status !== 'all') params.active = status === 'active';
      if (reconcile !== 'all') params.reconcile = reconcile === 'yes';
      setLocalError('');
      fetchAccounts(params).catch((error) => {
        setLocalError(errorMessage(error, 'Impossible de charger les comptes comptables.'));
      });
    }, search ? 180 : 0);
    return () => window.clearTimeout(timer);
  }, [fetchAccounts, frameworkId, groupId, page, pageSize, reconcile, search, status, typeId]);

  const loadFilterOptions = useCallback(async () => {
    if (!frameworkId || filtersLoadedFor === String(frameworkId)) return;
    const [typeResult, groupResult] = await Promise.allSettled([
      axiosInstance.get(ENDPOINTS.COMPTA.TYPES, { params: { framework: frameworkId, page_size: 500 } }),
      axiosInstance.get(ENDPOINTS.COMPTA.GROUPS, { params: { framework: frameworkId, page_size: 500 } }),
    ]);
    setTypes(typeResult.status === 'fulfilled' ? normalizeList(typeResult.value.data) : []);
    setGroups(groupResult.status === 'fulfilled' ? normalizeList(groupResult.value.data) : []);
    setFiltersLoadedFor(String(frameworkId));
  }, [filtersLoadedFor, frameworkId]);

  const changeFramework = useCallback((value) => {
    setFrameworkId(value);
    setTypeId('');
    setGroupId('');
    setTypes([]);
    setGroups([]);
    setFiltersLoadedFor('');
    setPagination((previous) => ({ ...previous, current: 1 }));
  }, [setPagination]);

  const openAccount = useCallback((account) => {
    navigate(`/comptabilite/accounts/${account.id}`, { state: { accountRecord: account, frameworkId } });
  }, [frameworkId, navigate]);

  const selectedRows = useMemo(() => {
    const ids = new Set(selectedIds.map(String));
    return accounts.filter((account) => ids.has(String(account.id)));
  }, [accounts, selectedIds]);

  const exportAccounts = useCallback(() => {
    try {
      const csv = useAccountStore.getState().exportAccountsToCSV();
      const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }));
      const link = document.createElement('a');
      link.href = url;
      link.download = `comptes_${frameworkId}_${new Date().toISOString().slice(0, 10)}.csv`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      setLocalError(errorMessage(error, "Impossible d'exporter les comptes."));
    }
  }, [frameworkId]);

  const deleteSelected = useCallback(async () => {
    if (!selectedRows.length) return;
    if (!window.confirm(`Supprimer ${selectedRows.length} compte(s) ?`)) return;
    try {
      await Promise.all(selectedRows.map((account) => deleteAccount(account.id)));
      setSelectedIds([]);
      setSuccess('Suppression effectuée avec succès.');
      const params = { framework: frameworkId, page, page_size: pageSize };
      await fetchAccounts(params);
    } catch (error) {
      setLocalError(errorMessage(error, 'Impossible de supprimer la sélection.'));
    }
  }, [deleteAccount, fetchAccounts, frameworkId, page, pageSize, selectedRows]);

  const columns = useMemo(() => [
    {
      id: 'number', label: 'Numéro de compte', minWidth: 145, value: (row) => row.code || '',
      render: (_, row) => <span className="font-mono font-semibold text-purple-700">{row.code || '-'}</span>,
    },
    { id: 'name', label: 'Libellé', minWidth: 220, value: (row) => row.name || '-' },
    { id: 'commercial_name', label: 'Nom commercial', minWidth: 150, value: (row) => row.commercial_name || row.nom_commercial || '-' },
    { id: 'nature', label: 'Nature', minWidth: 150, value: (row) => row.type_name || relationLabel(row.type) },
    {
      id: 'class', label: 'Classe / Groupe', minWidth: 160,
      value: (row) => row.group_label || [row.group_code, row.group_name].filter(Boolean).join(' - ') || relationLabel(row.group),
    },
    { id: 'account_type', label: 'Type de compte', width: 115, value: (row) => row.account_type === 'detail' ? 'Détail' : row.account_type === 'total' ? 'Total' : row.account_type || '-' },
    { id: 'parent', label: 'Compte parent', minWidth: 170, value: (row) => row.parent_label || relationLabel(row.parent) },
    { id: 'company', label: 'Société', minWidth: 150, value: (row) => row.company_name || relationLabel(row.company) },
    { id: 'currency', label: 'Devise', width: 95, value: (row) => row.currency_code || relationLabel(row.currency) },
    {
      id: 'reconcile', label: 'Lettrable', width: 90, value: (row) => row.reconcile ? 'Oui' : 'Non',
      render: (_, row) => <Badge color={row.reconcile ? 'green' : 'slate'}>{row.reconcile ? 'Oui' : 'Non'}</Badge>,
    },
    {
      id: 'status', label: 'Statut', width: 90, value: (row) => row.active === false ? 'Inactif' : 'Actif',
      render: (_, row) => <Badge color={row.active === false ? 'slate' : 'green'}>{row.active === false ? 'Inactif' : 'Actif'}</Badge>,
    },
  ], []);

  const filterChips = useMemo(() => {
    const chips = [];
    const framework = frameworks.find((item) => String(item.id) === String(frameworkId));
    const type = types.find((item) => String(item.id) === String(typeId));
    const group = groups.find((item) => String(item.id) === String(groupId));
    if (framework) chips.push({ id: 'framework', label: optionLabel(framework) });
    if (type) chips.push({ id: 'type', label: `Nature : ${optionLabel(type)}` });
    if (group) chips.push({ id: 'group', label: `Classe : ${optionLabel(group)}` });
    if (status !== 'all') chips.push({ id: 'status', label: status === 'active' ? 'Actifs' : 'Inactifs' });
    if (reconcile !== 'all') chips.push({ id: 'reconcile', label: reconcile === 'yes' ? 'Lettrables' : 'Non lettrables' });
    return chips;
  }, [frameworkId, frameworks, groupId, groups, reconcile, status, typeId, types]);

  const removeFilterChip = useCallback((chip) => {
    if (chip.id === 'type') setTypeId('');
    if (chip.id === 'group') setGroupId('');
    if (chip.id === 'status') setStatus('all');
    if (chip.id === 'reconcile') setReconcile('all');
    setPagination((previous) => ({ ...previous, current: 1 }));
  }, [setPagination]);

  const renderFilters = useCallback(() => (
    <div className="grid grid-cols-2 gap-4 p-4 text-xs">
      <label className="col-span-2"><span className="mb-1 block font-semibold text-gray-700">Référentiel comptable</span><select value={frameworkId} onChange={(event) => changeFramework(event.target.value)} className="h-9 w-full border border-gray-300 bg-white px-2 outline-none focus:border-purple-500">{frameworks.map((item) => <option key={item.id} value={item.id}>{optionLabel(item)}</option>)}</select></label>
      <label><span className="mb-1 block font-semibold text-gray-700">Nature</span><select value={typeId} onChange={(event) => setTypeId(event.target.value)} className="h-9 w-full border border-gray-300 bg-white px-2"><option value="">Toutes</option>{types.map((item) => <option key={item.id} value={item.id}>{optionLabel(item)}</option>)}</select></label>
      <label><span className="mb-1 block font-semibold text-gray-700">Classe / Groupe</span><select value={groupId} onChange={(event) => setGroupId(event.target.value)} className="h-9 w-full border border-gray-300 bg-white px-2"><option value="">Tous</option>{groups.map((item) => <option key={item.id} value={item.id}>{optionLabel(item)}</option>)}</select></label>
      <label><span className="mb-1 block font-semibold text-gray-700">Statut</span><select value={status} onChange={(event) => setStatus(event.target.value)} className="h-9 w-full border border-gray-300 bg-white px-2"><option value="all">Tous</option><option value="active">Actifs</option><option value="inactive">Inactifs</option></select></label>
      <label><span className="mb-1 block font-semibold text-gray-700">Lettrage</span><select value={reconcile} onChange={(event) => setReconcile(event.target.value)} className="h-9 w-full border border-gray-300 bg-white px-2"><option value="all">Tous</option><option value="yes">Lettrables</option><option value="no">Non lettrables</option></select></label>
    </div>
  ), [changeFramework, frameworkId, frameworks, groupId, groups, reconcile, status, typeId, types]);

  const selectionActions = useMemo(() => [
    { id: 'view', label: 'Ouvrir', icon: <FiEye size={13} />, disabled: selectedRows.length !== 1, onClick: () => selectedRows[0] && openAccount(selectedRows[0]) },
    { id: 'export', label: 'Exporter', icon: <FiDownload size={13} />, onClick: exportAccounts },
    { id: 'delete', label: 'Supprimer', icon: <FiTrash2 size={13} />, variant: 'danger', onClick: deleteSelected },
  ], [deleteSelected, exportAccounts, openAccount, selectedRows]);

  const renderRow = useCallback((row, rowIndex, context) => {
    const selected = context.selectedRowKeys.map(String).includes(String(row.id));
    return (
      <tr
        key={row.id}
        className={`cursor-pointer border-b border-gray-200 transition-colors ${selected ? 'bg-purple-50' : `${context.getStripeClassName(rowIndex)} hover:bg-purple-50/40`}`}
      >
        <td className="border-r border-gray-100 px-2 py-1.5 text-center"><input type="checkbox" checked={selected} onClick={(event) => event.stopPropagation()} onChange={() => context.toggleRow(row.id)} className="h-3.5 w-3.5 accent-teal-700" aria-label="Sélectionner ce compte" /></td>
        {context.columns.map((column) => {
          const value = column.value ? column.value(row) : row[column.id];
          return <td key={`${row.id}-${column.id}`} title={String(value ?? '')} className="max-w-0 border-r border-gray-100 px-2 py-1.5 text-xs text-gray-700"><div className="truncate">{column.render ? column.render(value, row, rowIndex) : (value ?? '-')}</div></td>;
        })}
        <td className="w-6 border-r border-gray-100 px-0.5 py-1.5" />
      </tr>
    );
  }, []);

  return (
    <UnifiedIndexPage
      title="Comptes comptables"
      memoryKey={MEMORY_KEY}
      rows={accounts}
      rowKey="id"
      columns={columns}
      loading={loading && !accounts.length}
      error={localError}
      success={success}
      messageDuration={15000}
      onDismissError={() => setLocalError('')}
      onDismissSuccess={() => setSuccess('')}
      emptyText={frameworkId ? 'Aucun compte comptable' : 'Sélectionnez un référentiel comptable'}
      searchValue={search}
      onSearchChange={(value) => { setSearch(value); setPagination((previous) => ({ ...previous, current: 1 })); }}
      searchPlaceholder="Rechercher un numéro ou un libellé..."
      filterChips={filterChips}
      onRemoveFilterChip={removeFilterChip}
      renderFilters={renderFilters}
      onFiltersOpen={loadFilterOptions}
      filterPanelWidth={540}
      primaryAction={{ label: 'Nouveau compte', icon: <FiPlus size={14} />, onClick: () => navigate('/comptabilite/accounts/new', { state: { frameworkId } }) }}
      trailingActions={[{ id: 'import', label: 'Importer', icon: <FiUpload size={13} />, onClick: () => navigate('/comptabilite/accounts/import', { state: { frameworkId } }) }]}
      selectedRowKeys={selectedIds}
      onSelectionChange={setSelectedIds}
      selectionActions={selectionActions}
      renderSelectionSummary={() => `${selectedIds.length} compte(s) sélectionné(s)`}
      onRowOpen={openAccount}
      renderRow={renderRow}
      serverSide
      page={page}
      onPageChange={(value) => setPagination((previous) => ({ ...previous, current: value }))}
      pageSize={pageSize}
      onPageSizeChange={(value) => setPagination((previous) => ({ ...previous, current: 1, pageSize: value }))}
      pageSizeOptions={[25, 50, 100, 200]}
      total={total}
      visibleColumnIds={visibleColumns}
      defaultVisibleColumnIds={DEFAULT_COLUMNS}
      onVisibleColumnsChange={setVisibleColumns}
      defaultSortColumn="number"
      defaultSortDirection="asc"
      footerText={`${total} compte(s)`}
    />
  );
}

export { AccountList };
