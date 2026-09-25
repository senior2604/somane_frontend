// src/features/comptabilite/pages/types/TypeList.jsx
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiEdit2, FiEye, FiPlus, FiTrash2 } from 'react-icons/fi';
import UnifiedIndexPage from '../../../../components/UnifiedIndexPage';
import useFrameworkStore from '../../../../stores/comptabilite/frameworkStore';
import useTypeStore from '../../../../stores/comptabilite/typeStore';

const FRAMEWORK_SESSION_KEY = 'type_list_selected_framework';
const MEMORY_KEY = 'comptabilite:types:index:v2';
const DEFAULT_COLUMNS = ['code', 'name', 'internal_group', 'parent', 'balance', 'reconciliation', 'closing', 'status'];
const CLOSING_LABELS = { none: 'Aucun', carry_forward: 'Report à nouveau' };

const Badge = ({ children, color = 'slate' }) => {
  const colors = {
    green: 'bg-green-100 text-green-700',
    blue: 'bg-blue-100 text-blue-700',
    purple: 'bg-purple-100 text-purple-700',
    slate: 'bg-slate-100 text-slate-700',
  };
  return <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-medium ${colors[color]}`}>{children}</span>;
};

const frameworkLabel = (framework) => [framework?.code, framework?.name].filter(Boolean).join(' - ');
const errorMessage = (error, fallback) => error?.response?.data?.detail || error?.message || fallback;

export default function TypeList() {
  const navigate = useNavigate();
  const { types = [], loading, error: storeError, fetchTypes, deleteType } = useTypeStore();
  const { frameworks = [], fetchFrameworks } = useFrameworkStore();

  const [frameworkId, setFrameworkId] = useState(() => sessionStorage.getItem(FRAMEWORK_SESSION_KEY) || '');
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');
  const [balance, setBalance] = useState('all');
  const [reconciliation, setReconciliation] = useState('all');
  const [selectedIds, setSelectedIds] = useState([]);
  const [visibleColumns, setVisibleColumns] = useState(DEFAULT_COLUMNS);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [localError, setLocalError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    if (!frameworks.length) fetchFrameworks({ page_size: 500 }).catch(() => {});
  }, [fetchFrameworks, frameworks.length]);

  useEffect(() => {
    if (!frameworks.length) return;
    const exists = frameworks.some((framework) => String(framework.id) === String(frameworkId));
    if (!exists) setFrameworkId(String(frameworks[0].id));
  }, [frameworkId, frameworks]);

  const loadData = useCallback(async () => {
    if (!frameworkId) return;
    try {
      setLocalError('');
      await fetchTypes({ framework: frameworkId });
    } catch (requestError) {
      setLocalError(errorMessage(requestError, 'Impossible de charger les natures de comptes.'));
    }
  }, [fetchTypes, frameworkId]);

  useEffect(() => {
    if (!frameworkId) return;
    sessionStorage.setItem(FRAMEWORK_SESSION_KEY, String(frameworkId));
    loadData();
  }, [frameworkId, loadData]);

  const filteredRows = useMemo(() => {
    const query = search.trim().toLocaleLowerCase('fr');
    return types.filter((type) => {
      if (status !== 'all' && Boolean(type.active) !== (status === 'active')) return false;
      if (balance !== 'all' && type.default_balance_type !== balance) return false;
      if (reconciliation !== 'all' && Boolean(type.allow_reconciliation) !== (reconciliation === 'yes')) return false;
      if (!query) return true;
      return [
        type.code,
        type.name,
        type.internal_group_name,
        type.parent_name,
        type.default_balance_type,
        CLOSING_LABELS[type.closing_behavior],
      ].filter(Boolean).join(' ').toLocaleLowerCase('fr').includes(query);
    });
  }, [balance, reconciliation, search, status, types]);

  const selectedRows = useMemo(() => {
    const selected = new Set(selectedIds.map(String));
    return types.filter((type) => selected.has(String(type.id)));
  }, [selectedIds, types]);

  const openType = useCallback((type) => {
    navigate(`/comptabilite/types/${type.id}`, { state: { typeRecord: type, frameworkId } });
  }, [frameworkId, navigate]);

  const editType = useCallback((type) => {
    navigate(`/comptabilite/types/${type.id}/edit`, { state: { typeRecord: type, frameworkId } });
  }, [frameworkId, navigate]);

  const deleteSelected = useCallback(async () => {
    if (!selectedRows.length) return;
    if (!window.confirm(`Supprimer ${selectedRows.length} nature(s) de comptes ?`)) return;
    try {
      await Promise.all(selectedRows.map((type) => deleteType(type.id)));
      setSelectedIds([]);
      setSuccess('Suppression effectuée avec succès.');
    } catch (requestError) {
      setLocalError(errorMessage(requestError, 'Impossible de supprimer la sélection.'));
    }
  }, [deleteType, selectedRows]);

  const columns = useMemo(() => [
    {
      id: 'code', label: 'Code', width: 100, value: (row) => row.code || '',
      render: (_, row) => <span className="font-mono font-semibold text-purple-700">{row.code || '-'}</span>,
    },
    {
      id: 'name', label: 'Nom', minWidth: 190, value: (row) => row.name || '',
      render: (_, row) => <span className="font-medium text-gray-900">{row.name || '-'}</span>,
    },
    {
      id: 'internal_group', label: 'Groupe / Classe', minWidth: 150,
      value: (row) => row.internal_group_name || row.internal_group || '-',
      render: (value) => value && value !== '-' ? <Badge color="purple">{value}</Badge> : '-',
    },
    { id: 'parent', label: 'Nature parente', minWidth: 150, value: (row) => row.parent_name || row.parent?.name || '-' },
    {
      id: 'balance', label: 'Solde par défaut', width: 120, value: (row) => row.default_balance_type || '',
      render: (value) => value === 'debit'
        ? <Badge color="blue">Débit</Badge>
        : value === 'credit' ? <Badge color="green">Crédit</Badge> : '-',
    },
    {
      id: 'reconciliation', label: 'Lettrage', width: 90,
      value: (row) => (row.allow_reconciliation ? 'Oui' : 'Non'),
      render: (_, row) => <Badge color={row.allow_reconciliation ? 'green' : 'slate'}>{row.allow_reconciliation ? 'Oui' : 'Non'}</Badge>,
    },
    {
      id: 'closing', label: 'Clôture', minWidth: 130,
      value: (row) => CLOSING_LABELS[row.closing_behavior] || row.closing_behavior || '-',
    },
    {
      id: 'status', label: 'Statut', width: 90, value: (row) => (row.active ? 'Actif' : 'Inactif'),
      render: (_, row) => <Badge color={row.active ? 'green' : 'slate'}>{row.active ? 'Actif' : 'Inactif'}</Badge>,
    },
  ], []);

  const filterChips = useMemo(() => {
    const chips = [];
    const framework = frameworks.find((item) => String(item.id) === String(frameworkId));
    if (framework) chips.push({ id: 'framework', label: frameworkLabel(framework) });
    if (status !== 'all') chips.push({ id: 'status', label: status === 'active' ? 'Actifs' : 'Inactifs' });
    if (balance !== 'all') chips.push({ id: 'balance', label: balance === 'debit' ? 'Solde débiteur' : 'Solde créditeur' });
    if (reconciliation !== 'all') chips.push({ id: 'reconciliation', label: reconciliation === 'yes' ? 'Lettrables' : 'Non lettrables' });
    return chips;
  }, [balance, frameworkId, frameworks, reconciliation, status]);

  const removeFilterChip = useCallback((chip) => {
    if (chip.id === 'status') setStatus('all');
    if (chip.id === 'balance') setBalance('all');
    if (chip.id === 'reconciliation') setReconciliation('all');
    setPage(1);
  }, []);

  const renderFilters = useCallback(() => (
    <div className="grid grid-cols-2 gap-4 p-4 text-xs">
      <div className="col-span-2">
        <label className="mb-1 block font-semibold text-gray-700">Référentiel comptable</label>
        <select value={frameworkId} onChange={(event) => { setFrameworkId(event.target.value); setPage(1); }} className="h-9 w-full rounded border border-gray-300 bg-white px-2 outline-none focus:border-purple-500">
          {frameworks.map((framework) => <option key={framework.id} value={framework.id}>{frameworkLabel(framework)}</option>)}
        </select>
      </div>
      <div>
        <label className="mb-1 block font-semibold text-gray-700">Statut</label>
        <select value={status} onChange={(event) => { setStatus(event.target.value); setPage(1); }} className="h-9 w-full rounded border border-gray-300 bg-white px-2">
          <option value="all">Tous</option><option value="active">Actifs</option><option value="inactive">Inactifs</option>
        </select>
      </div>
      <div>
        <label className="mb-1 block font-semibold text-gray-700">Solde par défaut</label>
        <select value={balance} onChange={(event) => { setBalance(event.target.value); setPage(1); }} className="h-9 w-full rounded border border-gray-300 bg-white px-2">
          <option value="all">Tous</option><option value="debit">Débit</option><option value="credit">Crédit</option>
        </select>
      </div>
      <div className="col-span-2">
        <label className="mb-1 block font-semibold text-gray-700">Lettrage</label>
        <select value={reconciliation} onChange={(event) => { setReconciliation(event.target.value); setPage(1); }} className="h-9 w-full rounded border border-gray-300 bg-white px-2">
          <option value="all">Tous</option><option value="yes">Lettrables</option><option value="no">Non lettrables</option>
        </select>
      </div>
    </div>
  ), [balance, frameworkId, frameworks, reconciliation, status]);

  const selectionActions = useMemo(() => [
    { id: 'view', label: 'Voir', icon: <FiEye size={13} />, disabled: selectedRows.length !== 1, onClick: () => selectedRows[0] && openType(selectedRows[0]) },
    { id: 'edit', label: 'Modifier', icon: <FiEdit2 size={13} />, disabled: selectedRows.length !== 1, onClick: () => selectedRows[0] && editType(selectedRows[0]) },
    { id: 'delete', label: 'Supprimer', icon: <FiTrash2 size={13} />, variant: 'danger', onClick: deleteSelected },
  ], [deleteSelected, editType, openType, selectedRows]);

  const renderRow = useCallback((row, rowIndex, context) => {
    const selected = context.selectedRowKeys.map(String).includes(String(row.id));
    return (
      <tr
        key={row.id}
        className={`cursor-pointer border-b border-gray-200 transition-colors ${selected ? 'bg-purple-50' : `${context.getStripeClassName(rowIndex)} hover:bg-purple-50/40`}`}
      >
        <td className="border-r border-gray-100 px-2 py-1.5 text-center">
          <input type="checkbox" checked={selected} onClick={(event) => event.stopPropagation()} onChange={() => context.toggleRow(row.id)} className="h-3.5 w-3.5 accent-teal-700" aria-label="Sélectionner cette nature" />
        </td>
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
      title="Types / Natures de comptes"
      memoryKey={MEMORY_KEY}
      rows={filteredRows}
      rowKey="id"
      columns={columns}
      loading={loading && !types.length}
      error={localError || storeError || ''}
      success={success}
      messageDuration={15000}
      onDismissError={() => setLocalError('')}
      onDismissSuccess={() => setSuccess('')}
      emptyText={frameworkId ? 'Aucune nature de compte' : 'Sélectionnez un référentiel comptable'}
      searchValue={search}
      onSearchChange={(value) => { setSearch(value); setPage(1); }}
      searchPlaceholder="Rechercher une nature..."
      filterChips={filterChips}
      onRemoveFilterChip={removeFilterChip}
      renderFilters={renderFilters}
      filterPanelWidth={520}
      primaryAction={{ label: 'Nouvelle nature', icon: <FiPlus size={14} />, onClick: () => navigate('/comptabilite/types/new', { state: { frameworkId } }) }}
      selectedRowKeys={selectedIds}
      onSelectionChange={setSelectedIds}
      selectionActions={selectionActions}
      renderSelectionSummary={() => `${selectedIds.length} nature(s) sélectionnée(s)`}
      onRowOpen={openType}
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
      footerText={`${filteredRows.length} nature(s)`}
    />
  );
}

export { TypeList };
