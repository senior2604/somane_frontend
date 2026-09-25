// src/features/comptabilite/pages/groups/GroupList.jsx
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { FiChevronDown, FiChevronRight, FiEdit2, FiEye, FiFolder, FiPlus, FiTrash2 } from 'react-icons/fi';
import UnifiedIndexPage from '../../../../components/UnifiedIndexPage';
import useFrameworkStore from '../../../../stores/comptabilite/frameworkStore';
import useGroupStore from '../../../../stores/comptabilite/groupStore';

const FRAMEWORK_SESSION_KEY = 'group_list_selected_framework';
const MEMORY_KEY = 'comptabilite:groups:index:v2';
const DEFAULT_COLUMNS = ['code', 'name', 'range', 'parent', 'children', 'sequence'];

const relationId = (value) => {
  if (!value) return null;
  if (typeof value === 'object') return value.id ?? value.value ?? null;
  return value;
};

const groupFrameworkId = (group) => (
  relationId(group?.framework)
  ?? relationId(group?.framework_id)
  ?? relationId(group?.framework_details)
);

const frameworkLabel = (framework) => [framework?.code, framework?.name].filter(Boolean).join(' - ');

const rangeLabel = (group) => (
  group?.code_prefix_start && group?.code_prefix_end
    ? `${group.code_prefix_start} à ${group.code_prefix_end}`
    : '-'
);

const collectGroups = (items, parentId = null, map = new Map()) => {
  (items || []).forEach((item) => {
    const id = relationId(item.id);
    if (!id) return;
    const existing = map.get(String(id)) || {};
    const ownParentId = relationId(item.parent) ?? parentId ?? existing._parentId ?? null;
    map.set(String(id), { ...existing, ...item, _parentId: ownParentId, _treeChildren: [] });
    if (Array.isArray(item.children)) collectGroups(item.children, id, map);
  });
  return map;
};

const buildTree = (items) => {
  const map = collectGroups(items);
  const roots = [];
  map.forEach((group) => { group._treeChildren = []; });
  map.forEach((group) => {
    const parentId = relationId(group.parent) ?? group._parentId;
    const parent = parentId ? map.get(String(parentId)) : null;
    if (parent && String(parent.id) !== String(group.id)) parent._treeChildren.push(group);
    else roots.push(group);
  });
  const sort = (nodes) => nodes
    .sort((a, b) => (a.sequence ?? 0) - (b.sequence ?? 0) || String(a.code || '').localeCompare(String(b.code || ''), 'fr', { numeric: true }))
    .map((node) => ({ ...node, _treeChildren: sort(node._treeChildren || []) }));
  return { roots: sort(roots), all: Array.from(map.values()) };
};

const flattenTree = (nodes, expanded, depth = 0) => nodes.flatMap((node) => [
  { ...node, _depth: depth },
  ...(expanded.has(String(node.id)) ? flattenTree(node._treeChildren || [], expanded, depth + 1) : []),
]);

const errorMessage = (error, fallback) => error?.response?.data?.detail || error?.message || fallback;

function GroupList() {
  const navigate = useNavigate();
  const location = useLocation();
  const { groups = [], loading, error: storeError, fetchGroups, deleteGroup } = useGroupStore();
  const { frameworks = [], fetchFrameworks } = useFrameworkStore();

  const [frameworkId, setFrameworkId] = useState(() => (
    new URLSearchParams(location.search).get('framework')
      || sessionStorage.getItem(FRAMEWORK_SESSION_KEY)
      || ''
  ));
  const [search, setSearch] = useState('');
  const [expandedIds, setExpandedIds] = useState(new Set());
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
      await fetchGroups({ framework: frameworkId });
    } catch (requestError) {
      setLocalError(errorMessage(requestError, 'Impossible de charger les classes comptables.'));
    }
  }, [fetchGroups, frameworkId]);

  useEffect(() => {
    if (!frameworkId) return;
    sessionStorage.setItem(FRAMEWORK_SESSION_KEY, String(frameworkId));
    setSelectedIds([]);
    setExpandedIds(new Set());
    setPage(1);
    loadData();
  }, [frameworkId, loadData]);

  const scopedGroups = useMemo(() => groups.filter((group) => {
    const ownerId = groupFrameworkId(group);
    return !ownerId || String(ownerId) === String(frameworkId);
  }), [frameworkId, groups]);

  const { roots, all } = useMemo(() => buildTree(scopedGroups), [scopedGroups]);

  const parentLabel = useCallback((group) => {
    const parentId = relationId(group.parent) ?? group._parentId;
    if (!parentId) return 'Racine';
    const parent = all.find((item) => String(item.id) === String(parentId));
    return parent ? [parent.code, parent.name].filter(Boolean).join(' - ') : `Classe #${parentId}`;
  }, [all]);

  const filteredTree = useMemo(() => {
    const query = search.trim().toLocaleLowerCase('fr');
    const filter = (nodes) => nodes.map((node) => {
      const children = filter(node._treeChildren || []);
      const haystack = [node.code, node.name, node.code_prefix_start, node.code_prefix_end, parentLabel(node)]
        .filter(Boolean).join(' ').toLocaleLowerCase('fr');
      if (query && !haystack.includes(query) && !children.length) return null;
      return { ...node, _treeChildren: children };
    }).filter(Boolean);
    return filter(roots);
  }, [parentLabel, roots, search]);

  const effectiveExpanded = useMemo(() => {
    if (!search.trim()) return expandedIds;
    const next = new Set(expandedIds);
    const visit = (nodes) => nodes.forEach((node) => {
      if (node._treeChildren?.length) { next.add(String(node.id)); visit(node._treeChildren); }
    });
    visit(filteredTree);
    return next;
  }, [expandedIds, filteredTree, search]);

  const rows = useMemo(() => flattenTree(filteredTree, effectiveExpanded), [effectiveExpanded, filteredTree]);
  const selectedRows = useMemo(() => {
    const selected = new Set(selectedIds.map(String));
    return all.filter((group) => selected.has(String(group.id)));
  }, [all, selectedIds]);

  const openGroup = useCallback((group) => {
    const groupId = relationId(group?.id);
    if (!groupId) {
      setLocalError('Impossible d’ouvrir cette classe : identifiant introuvable.');
      return;
    }
    navigate(`/comptabilite/groups/${groupId}`, {
      state: {
        groupRecord: group,
        frameworkId,
        returnTo: `/comptabilite/groups?framework=${frameworkId}`,
      },
    });
  }, [frameworkId, navigate]);

  const editGroup = useCallback((group) => {
    navigate(`/comptabilite/groups/${group.id}/edit`, { state: { groupRecord: group, frameworkId } });
  }, [frameworkId, navigate]);

  const deleteSelected = useCallback(async () => {
    if (!selectedRows.length) return;
    if (!window.confirm(`Supprimer ${selectedRows.length} classe(s) comptable(s) ?`)) return;
    try {
      await Promise.all(selectedRows.map((group) => deleteGroup(group.id)));
      setSelectedIds([]);
      setSuccess('Suppression effectuée avec succès.');
      await loadData();
    } catch (requestError) {
      setLocalError(errorMessage(requestError, 'Impossible de supprimer la sélection.'));
    }
  }, [deleteGroup, loadData, selectedRows]);

  const toggleExpanded = useCallback((groupId) => {
    setExpandedIds((current) => {
      const next = new Set(current);
      const key = String(groupId);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  }, []);

  const columns = useMemo(() => [
    {
      id: 'code', label: 'Code', minWidth: 140, value: (row) => row.code || '',
      render: (_, row) => (
        <div className="flex min-w-0 items-center gap-1" style={{ paddingLeft: `${row._depth * 18}px` }}>
          <button
            type="button"
            data-row-interaction-ignore="true"
            disabled={!row._treeChildren?.length}
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
              toggleExpanded(row.id);
            }}
            className="flex h-5 w-5 shrink-0 items-center justify-center rounded hover:bg-purple-50 disabled:opacity-20"
            title={effectiveExpanded.has(String(row.id)) ? 'Fermer' : 'Ouvrir'}
          >
            {effectiveExpanded.has(String(row.id)) ? <FiChevronDown size={13} /> : <FiChevronRight size={13} />}
          </button>
          <FiFolder className="shrink-0 text-purple-600" size={13} />
          <span className="truncate font-mono font-semibold text-purple-700">{row.code || '-'}</span>
        </div>
      ),
    },
    {
      id: 'name', label: 'Nom', minWidth: 220, value: (row) => row.name || '',
      render: (_, row) => (
        <div className="min-w-0">
          <div className="truncate font-medium text-gray-900">{row.name || '-'}</div>
          {row.note && <div className="truncate text-[10px] text-gray-500">{row.note}</div>}
        </div>
      ),
    },
    { id: 'range', label: 'Plage de comptes', minWidth: 150, value: rangeLabel },
    { id: 'parent', label: 'Parent', minWidth: 170, value: parentLabel },
    { id: 'children', label: 'Sous-classes', width: 100, align: 'right', value: (row) => row._treeChildren?.length || row.children_count || 0 },
    { id: 'sequence', label: 'Séq.', width: 75, align: 'right', value: (row) => row.sequence ?? 0 },
  ], [effectiveExpanded, parentLabel, toggleExpanded]);

  const filterChips = useMemo(() => {
    const framework = frameworks.find((item) => String(item.id) === String(frameworkId));
    return framework ? [{ id: 'framework', label: frameworkLabel(framework) }] : [];
  }, [frameworkId, frameworks]);

  const renderFilters = useCallback(() => (
    <div className="p-4 text-xs">
      <label className="mb-1 block font-semibold text-gray-700">Référentiel comptable</label>
      <select value={frameworkId} onChange={(event) => setFrameworkId(event.target.value)} className="h-9 w-full rounded border border-gray-300 bg-white px-2 outline-none focus:border-purple-500">
        {frameworks.map((framework) => <option key={framework.id} value={framework.id}>{frameworkLabel(framework)}</option>)}
      </select>
      <div className="mt-3 flex gap-2 border-t border-gray-200 pt-3">
        <button type="button" onClick={() => { const next = new Set(all.filter((group) => group._treeChildren?.length).map((group) => String(group.id))); setExpandedIds(next); }} className="rounded border border-gray-300 px-3 py-1.5 text-gray-700 hover:bg-purple-50">Tout ouvrir</button>
        <button type="button" onClick={() => setExpandedIds(new Set())} className="rounded border border-gray-300 px-3 py-1.5 text-gray-700 hover:bg-purple-50">Tout fermer</button>
      </div>
    </div>
  ), [all, frameworkId, frameworks]);

  const selectionActions = useMemo(() => [
    { id: 'view', label: 'Voir', icon: <FiEye size={13} />, disabled: selectedRows.length !== 1, onClick: () => selectedRows[0] && openGroup(selectedRows[0]) },
    { id: 'edit', label: 'Modifier', icon: <FiEdit2 size={13} />, disabled: selectedRows.length !== 1, onClick: () => selectedRows[0] && editGroup(selectedRows[0]) },
    { id: 'delete', label: 'Supprimer', icon: <FiTrash2 size={13} />, variant: 'danger', onClick: deleteSelected },
  ], [deleteSelected, editGroup, openGroup, selectedRows]);

  const renderRow = useCallback((row, rowIndex, context) => {
    const selected = context.selectedRowKeys.map(String).includes(String(row.id));
    return (
      <tr
        key={row.id}
        className={`cursor-pointer border-b border-gray-200 transition-colors ${selected ? 'bg-purple-50' : `${context.getStripeClassName(rowIndex)} hover:bg-purple-50/40`}`}
      >
        <td className="border-r border-gray-100 px-2 py-1.5 text-center"><input type="checkbox" checked={selected} onClick={(event) => event.stopPropagation()} onChange={() => context.toggleRow(row.id)} className="h-3.5 w-3.5 accent-teal-700" aria-label="Sélectionner cette classe" /></td>
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
      title="Classes / Groupes"
      memoryKey={MEMORY_KEY}
      rows={rows}
      rowKey="id"
      columns={columns}
      loading={loading && !groups.length}
      error={localError || storeError || ''}
      success={success}
      messageDuration={15000}
      onDismissError={() => setLocalError('')}
      onDismissSuccess={() => setSuccess('')}
      emptyText={frameworkId ? 'Aucune classe comptable' : 'Sélectionnez un référentiel comptable'}
      searchValue={search}
      onSearchChange={(value) => { setSearch(value); setPage(1); }}
      searchPlaceholder="Rechercher une classe..."
      filterChips={filterChips}
      renderFilters={renderFilters}
      primaryAction={{ label: 'Nouvelle classe', icon: <FiPlus size={14} />, onClick: () => navigate('/comptabilite/groups/new', { state: { frameworkId } }) }}
      selectedRowKeys={selectedIds}
      onSelectionChange={setSelectedIds}
      selectionActions={selectionActions}
      renderSelectionSummary={() => `${selectedIds.length} classe(s) sélectionnée(s)`}
      onRowOpen={openGroup}
      renderRow={renderRow}
      page={page}
      onPageChange={setPage}
      pageSize={pageSize}
      onPageSizeChange={setPageSize}
      pageSizeOptions={[25, 50, 100, 200]}
      visibleColumnIds={visibleColumns}
      defaultVisibleColumnIds={DEFAULT_COLUMNS}
      onVisibleColumnsChange={setVisibleColumns}
      allowColumnSort={false}
      footerText={`${rows.length} classe(s)`}
    />
  );
}

export { GroupList };
export default GroupList;
