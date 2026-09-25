// src/features/comptabilite/pages/plans-comptables/PlanList.jsx
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiChevronDown, FiChevronRight, FiFolder, FiPlus } from 'react-icons/fi';
import UnifiedIndexPage from '../../../../components/UnifiedIndexPage';
import { ENDPOINTS } from '../../../../config/api';
import axiosInstance from '../../../../config/axiosInstance';
import useFrameworkStore from '../../../../stores/comptabilite/frameworkStore';

const FRAMEWORK_SESSION_KEY = 'plan_list_selected_framework';
const MEMORY_KEY = 'comptabilite:plan:index:v3';
const DEFAULT_COLUMNS = ['code', 'label', 'nature', 'classe', 'lettrable', 'status'];

const COLUMNS = [
  { id: 'code', label: 'Numéro de compte', minWidth: 150 },
  { id: 'label', label: 'Libellé', minWidth: 260 },
  { id: 'nature', label: 'Nature / Type', minWidth: 150 },
  { id: 'classe', label: 'Classe comptable', minWidth: 150 },
  { id: 'lettrable', label: 'Lettrage', width: 100 },
  { id: 'status', label: 'Statut', width: 100 },
  { id: 'id', label: 'ID', width: 80 },
  { id: 'framework', label: 'Référentiel', minWidth: 170 },
  { id: 'company', label: 'Entité', minWidth: 150 },
  { id: 'parent', label: 'Compte parent', minWidth: 150 },
  { id: 'currency', label: 'Devise', width: 100 },
  { id: 'account_type', label: 'Type de compte', minWidth: 130 },
  { id: 'level', label: 'Niveau', width: 85 },
  { id: 'length', label: 'Longueur', width: 90 },
  { id: 'locked', label: 'Verrouillé', width: 100 },
  { id: 'is_generated', label: 'Généré', width: 90 },
  { id: 'closing_type', label: 'Clôture', width: 100 },
  { id: 'opening_debit', label: 'Débit initial', minWidth: 120 },
  { id: 'opening_credit', label: 'Crédit initial', minWidth: 120 },
  { id: 'opening_balance', label: 'Solde initial', minWidth: 120 },
  { id: 'movement_debit', label: 'Mouvement débit', minWidth: 130 },
  { id: 'movement_credit', label: 'Mouvement crédit', minWidth: 130 },
  { id: 'current_balance', label: 'Solde courant', minWidth: 120 },
  { id: 'tax_ids', label: 'Taxes', width: 90 },
  { id: 'tag_ids', label: 'Étiquettes', width: 100 },
  { id: 'allowed_journal_ids', label: 'Journaux autorisés', minWidth: 130 },
  { id: 'analytic_account_id', label: 'Compte analytique', minWidth: 140 },
  { id: 'ifrs_id', label: 'Compte IFRS', minWidth: 120 },
  { id: 'reporting_id', label: 'Compte reporting', minWidth: 130 },
  { id: 'create_uid_name', label: 'Créé par', minWidth: 120 },
  { id: 'create_date', label: 'Date de création', minWidth: 125 },
  { id: 'write_uid_name', label: 'Modifié par', minWidth: 120 },
  { id: 'write_date', label: 'Date de modification', minWidth: 135 },
];

const normalizeList = (payload) => {
  const data = payload?.data ?? payload;
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.results)) return data.results;
  return [];
};

const relationId = (value) => {
  if (!value) return null;
  if (typeof value === 'object') return value.id ?? value.value ?? null;
  return value;
};

const relationLabel = (value) => {
  if (value === null || value === undefined || value === '') return '-';
  if (Array.isArray(value)) return value.length ? String(value.length) : '-';
  if (typeof value === 'object') {
    return [value.code, value.name || value.nom || value.label].filter(Boolean).join(' - ') || String(value.id || '-');
  }
  return String(value);
};

const formatDate = (value) => {
  if (!value) return '-';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleDateString('fr-FR');
};

const formatAmount = (value) => Number(value || 0).toLocaleString('fr-FR', { maximumFractionDigits: 2 });
const sortByCode = (a, b) => String(a?.code || '').localeCompare(String(b?.code || ''), 'fr', { numeric: true });

const groupParentId = (group) => relationId(group?.parent) ?? group?.parent_id;
const accountGroupId = (account) => relationId(account?.group) ?? relationId(account?.group_id) ?? relationId(account?.account_group);

const matchesGroup = (account, group) => {
  if (accountGroupId(account) && String(accountGroupId(account)) === String(group.id)) return true;
  const code = String(account?.code || '').trim();
  const start = String(group?.code_prefix_start || group?.code || '').trim();
  const end = String(group?.code_prefix_end || '').trim();
  if (!code || !start) return false;
  if (!end) return code.startsWith(start);
  const length = Math.max(start.length, end.length);
  const comparable = code.slice(0, length);
  return comparable >= start.padEnd(length, '0') && comparable <= end.padEnd(length, '9');
};

const buildPlanTree = (groups, accounts) => {
  const sortedGroups = [...groups].sort(sortByCode);
  const map = new Map(sortedGroups.map((group) => [String(group.id), { ...group, children: [], accounts: [] }]));
  const roots = [];
  sortedGroups.forEach((group) => {
    const node = map.get(String(group.id));
    const parent = map.get(String(groupParentId(group)));
    if (parent && parent.id !== node.id) parent.children.push(node); else roots.push(node);
  });
  const orphanAccounts = [];
  accounts.forEach((account) => {
    const direct = accountGroupId(account) ? map.get(String(accountGroupId(account))) : null;
    const matched = direct || [...sortedGroups]
      .filter((group) => matchesGroup(account, group))
      .sort((a, b) => String(b.code_prefix_start || b.code || '').length - String(a.code_prefix_start || a.code || '').length)[0];
    const node = matched ? map.get(String(matched.id)) : null;
    if (node) node.accounts.push({ ...account, __groupLabel: [matched.code, matched.name].filter(Boolean).join(' - ') });
    else orphanAccounts.push(account);
  });
  map.forEach((node) => { node.children.sort(sortByCode); node.accounts.sort(sortByCode); });
  return { roots: roots.sort(sortByCode), orphanAccounts: orphanAccounts.sort(sortByCode) };
};

const flattenAccountTree = (accounts, depth) => {
  const map = new Map(accounts.map((account) => [String(account.id), { ...account, children: [] }]));
  const roots = [];
  map.forEach((account) => {
    const parentId = relationId(account.parent) ?? account.parent_id;
    const parent = parentId ? map.get(String(parentId)) : null;
    if (parent && parent.id !== account.id) parent.children.push(account); else roots.push(account);
  });
  const rows = [];
  const visit = (account, level) => {
    rows.push({ id: `account-${account.id}`, kind: 'account', depth: level, data: account });
    account.children.sort(sortByCode).forEach((child) => visit(child, level + 1));
  };
  roots.sort(sortByCode).forEach((account) => visit(account, depth));
  return rows;
};

const flattenPlan = (nodes, expanded, depth = 0) => nodes.flatMap((group) => {
  const open = expanded[String(group.id)] !== false;
  const row = { id: `group-${group.id}`, kind: 'group', depth, data: group, expanded: open };
  if (!open) return [row];
  return [row, ...flattenPlan(group.children || [], expanded, depth + 1), ...flattenAccountTree(group.accounts || [], depth + 1)];
});

const accountTypeLabel = (account) => relationLabel(
  account?.type_details || account?.type || account?.account_type_details || account?.account_type,
);

const valueForColumn = (account, columnId, selectedFramework) => {
  const values = {
    id: account.id,
    framework: relationLabel(account.framework || account.framework_details || selectedFramework),
    company: relationLabel(account.company || account.company_details),
    parent: relationLabel(account.parent || account.parent_details || account.parent_id),
    currency: relationLabel(account.currency || account.currency_details),
    account_type: accountTypeLabel(account),
    level: account.level ?? '-',
    length: account.code_length ?? String(account.code || '').length,
    locked: account.locked ? 'Oui' : 'Non',
    is_generated: account.is_generated ? 'Oui' : 'Non',
    closing_type: relationLabel(account.closing_type),
    opening_debit: formatAmount(account.opening_debit),
    opening_credit: formatAmount(account.opening_credit),
    opening_balance: formatAmount(account.opening_balance),
    movement_debit: formatAmount(account.movement_debit || account.debit),
    movement_credit: formatAmount(account.movement_credit || account.credit),
    current_balance: formatAmount(account.current_balance || account.balance),
    tax_ids: Array.isArray(account.tax_ids) ? account.tax_ids.length : 0,
    tag_ids: Array.isArray(account.tag_ids) ? account.tag_ids.length : 0,
    allowed_journal_ids: Array.isArray(account.allowed_journal_ids) ? account.allowed_journal_ids.length : 0,
    analytic_account_id: relationLabel(account.analytic_account_id),
    ifrs_id: relationLabel(account.ifrs_id),
    reporting_id: relationLabel(account.reporting_id),
    create_uid_name: relationLabel(account.create_uid_name || account.create_uid),
    create_date: formatDate(account.create_date),
    write_uid_name: relationLabel(account.write_uid_name || account.write_uid),
    write_date: formatDate(account.write_date),
  };
  return values[columnId] ?? relationLabel(account[columnId]);
};

const errorMessage = (error, fallback) => error?.response?.data?.detail || error?.message || fallback;

function PlanList() {
  const navigate = useNavigate();
  const { frameworks = [], fetchFrameworks, loading: frameworksLoading } = useFrameworkStore();
  const [frameworkId, setFrameworkId] = useState(() => sessionStorage.getItem(FRAMEWORK_SESSION_KEY) || '');
  const [groups, setGroups] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [search, setSearch] = useState('');
  const [kind, setKind] = useState('all');
  const [status, setStatus] = useState('all');
  const [lettrable, setLettrable] = useState('all');
  const [classPrefixes, setClassPrefixes] = useState([]);
  const [quickPrefix, setQuickPrefix] = useState('');
  const [expanded, setExpanded] = useState({});
  const [savingAccountId, setSavingAccountId] = useState(null);
  const [visibleColumns, setVisibleColumns] = useState(DEFAULT_COLUMNS);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);

  useEffect(() => {
    if (!frameworks.length) fetchFrameworks({ page_size: 500 }).catch(() => {});
  }, [fetchFrameworks, frameworks.length]);

  useEffect(() => {
    if (!frameworks.length) return;
    const exists = frameworks.some((framework) => String(framework.id) === String(frameworkId));
    if (!exists) setFrameworkId(String(frameworks[0].id));
  }, [frameworkId, frameworks]);

  const loadPlan = useCallback(async () => {
    if (!frameworkId) return;
    setLoading(true);
    setError('');
    try {
      const lightEndpoint = `${ENDPOINTS.COMPTA.ACCOUNTS}plan-light/`;
      const response = await axiosInstance.get(lightEndpoint, { params: { framework: frameworkId }, timeout: 30000 });
      const nextGroups = normalizeList(response.data?.groups || []);
      const nextAccounts = normalizeList(response.data?.accounts || []);
      setGroups(nextGroups);
      setAccounts(nextAccounts.sort(sortByCode));
      setExpanded(Object.fromEntries(nextGroups.map((group) => [String(group.id), true])));
    } catch (lightError) {
      try {
        const [groupsResponse, accountsResponse] = await Promise.all([
          axiosInstance.get(ENDPOINTS.COMPTA.GROUPS, { params: { framework: frameworkId, page_size: 5000, ordering: 'code' } }),
          axiosInstance.get(ENDPOINTS.COMPTA.ACCOUNTS, { params: { framework: frameworkId, page_size: 5000, ordering: 'code' }, timeout: 60000 }),
        ]);
        const nextGroups = normalizeList(groupsResponse);
        setGroups(nextGroups);
        setAccounts(normalizeList(accountsResponse).sort(sortByCode));
        setExpanded(Object.fromEntries(nextGroups.map((group) => [String(group.id), true])));
      } catch (requestError) {
        setError(errorMessage(requestError, 'Impossible de charger le plan comptable.'));
      }
    } finally {
      setLoading(false);
    }
  }, [frameworkId]);

  useEffect(() => {
    if (!frameworkId) return;
    sessionStorage.setItem(FRAMEWORK_SESSION_KEY, String(frameworkId));
    setPage(1);
    setClassPrefixes([]);
    setQuickPrefix('');
    loadPlan();
  }, [frameworkId, loadPlan]);

  useEffect(() => {
    const handleTyping = (event) => {
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement?.tagName)) return;
      if (/^\d$/.test(event.key)) { setQuickPrefix((value) => `${value}${event.key}`); setPage(1); }
      if (event.key === 'Backspace' && quickPrefix) { event.preventDefault(); setQuickPrefix((value) => value.slice(0, -1)); setPage(1); }
      if (event.key === 'Escape') { setQuickPrefix(''); setClassPrefixes([]); setPage(1); }
    };
    window.addEventListener('keydown', handleTyping);
    return () => window.removeEventListener('keydown', handleTyping);
  }, [quickPrefix]);

  const selectedFramework = useMemo(() => frameworks.find((framework) => String(framework.id) === String(frameworkId)), [frameworkId, frameworks]);
  const { roots, orphanAccounts } = useMemo(() => buildPlanTree(groups, accounts), [accounts, groups]);

  const prefixes = useMemo(() => Array.from(new Set([...groups, ...accounts]
    .map((record) => String(record.code || '').charAt(0))
    .filter((value) => /^\d$/.test(value)))).sort(), [accounts, groups]);

  const filteredRows = useMemo(() => {
    const query = search.trim().toLocaleLowerCase('fr');
    const matchesAccount = (account) => {
      const code = String(account.code || '');
      if (classPrefixes.length && !classPrefixes.some((prefix) => code.startsWith(prefix))) return false;
      if (quickPrefix && !code.startsWith(quickPrefix)) return false;
      if (status !== 'all' && Boolean(account.active !== false) !== (status === 'active')) return false;
      if (lettrable !== 'all' && Boolean(account.reconcile) !== (lettrable === 'yes')) return false;
      if (!query) return true;
      return [account.code, account.name, account.label, accountTypeLabel(account)].filter(Boolean).join(' ').toLocaleLowerCase('fr').includes(query);
    };
    const filterNodes = (nodes) => nodes.map((node) => {
      const children = filterNodes(node.children || []);
      const nodeAccounts = (node.accounts || []).filter(matchesAccount);
      const groupMatches = kind !== 'account'
        && (!query || [node.code, node.name].filter(Boolean).join(' ').toLocaleLowerCase('fr').includes(query))
        && (!classPrefixes.length || classPrefixes.some((prefix) => String(node.code || '').startsWith(prefix)))
        && (!quickPrefix || String(node.code || '').startsWith(quickPrefix));
      if (!groupMatches && !children.length && !nodeAccounts.length) return null;
      return { ...node, children, accounts: kind === 'group' ? [] : nodeAccounts };
    }).filter(Boolean);
    const rows = flattenPlan(filterNodes(roots), expanded);
    if (kind !== 'group') {
      orphanAccounts.filter(matchesAccount).forEach((account) => rows.push({ id: `account-${account.id}`, kind: 'account', depth: 0, data: account }));
    }
    return rows;
  }, [classPrefixes, expanded, kind, lettrable, orphanAccounts, quickPrefix, roots, search, status]);

  const toggleReconcile = useCallback(async (account) => {
    if (!account?.id || savingAccountId) return;
    const nextValue = !account.reconcile;
    const previous = accounts;
    setSavingAccountId(account.id);
    setAccounts((current) => current.map((item) => String(item.id) === String(account.id) ? { ...item, reconcile: nextValue } : item));
    try {
      await axiosInstance.patch(`${ENDPOINTS.COMPTA.ACCOUNTS}${account.id}/`, { reconcile: nextValue });
      setSuccess('Lettrage du compte mis à jour.');
    } catch (requestError) {
      setAccounts(previous);
      setError(errorMessage(requestError, 'Impossible de modifier le lettrage du compte.'));
    } finally {
      setSavingAccountId(null);
    }
  }, [accounts, savingAccountId]);

  const filterChips = useMemo(() => {
    const chips = [];
    if (selectedFramework) chips.push({ id: 'framework', label: selectedFramework.code || selectedFramework.name });
    if (kind !== 'all') chips.push({ id: 'kind', label: kind === 'group' ? 'Classes' : 'Comptes' });
    if (status !== 'all') chips.push({ id: 'status', label: status === 'active' ? 'Actifs' : 'Inactifs' });
    if (lettrable !== 'all') chips.push({ id: 'lettrable', label: lettrable === 'yes' ? 'Lettrables' : 'Non lettrables' });
    if (classPrefixes.length) chips.push({ id: 'classes', label: `Classes ${classPrefixes.join(', ')}` });
    if (quickPrefix) chips.push({ id: 'quick', label: `Préfixe ${quickPrefix}` });
    return chips;
  }, [classPrefixes, kind, lettrable, quickPrefix, selectedFramework, status]);

  const removeChip = useCallback((chip) => {
    if (chip.id === 'kind') setKind('all');
    if (chip.id === 'status') setStatus('all');
    if (chip.id === 'lettrable') setLettrable('all');
    if (chip.id === 'classes') setClassPrefixes([]);
    if (chip.id === 'quick') setQuickPrefix('');
    setPage(1);
  }, []);

  const openPlanRow = useCallback((row) => {
    const record = row?.data;
    if (!record?.id) return;
    navigate(row.kind === 'group'
      ? `/comptabilite/groups/${record.id}`
      : `/comptabilite/accounts/${record.id}`);
  }, [navigate]);

  const renderFilters = useCallback(() => (
    <div className="grid grid-cols-2 gap-4 p-4 text-xs">
      <div className="col-span-2">
        <label className="mb-1 block font-semibold text-gray-700">Référentiel comptable</label>
        <select value={frameworkId} onChange={(event) => setFrameworkId(event.target.value)} className="h-9 w-full rounded border border-gray-300 bg-white px-2">
          {frameworks.map((framework) => <option key={framework.id} value={framework.id}>{relationLabel(framework)}</option>)}
        </select>
      </div>
      <label><span className="mb-1 block font-semibold text-gray-700">Éléments</span><select value={kind} onChange={(event) => setKind(event.target.value)} className="h-9 w-full rounded border border-gray-300 bg-white px-2"><option value="all">Tout</option><option value="group">Classes</option><option value="account">Comptes</option></select></label>
      <label><span className="mb-1 block font-semibold text-gray-700">Statut</span><select value={status} onChange={(event) => setStatus(event.target.value)} className="h-9 w-full rounded border border-gray-300 bg-white px-2"><option value="all">Tous</option><option value="active">Actifs</option><option value="inactive">Inactifs</option></select></label>
      <label className="col-span-2"><span className="mb-1 block font-semibold text-gray-700">Lettrage</span><select value={lettrable} onChange={(event) => setLettrable(event.target.value)} className="h-9 w-full rounded border border-gray-300 bg-white px-2"><option value="all">Tous</option><option value="yes">Lettrables</option><option value="no">Non lettrables</option></select></label>
    </div>
  ), [frameworkId, frameworks, kind, lettrable, status]);

  const renderContent = useCallback((context) => (
    <div className="flex min-h-full">
      <aside className="w-12 shrink-0 border-r border-gray-200 bg-gray-50 px-2 py-2">
        <div className="mb-2 text-center text-[10px] font-semibold text-gray-600">Classes</div>
        <div className="flex flex-col items-center gap-1">
          {prefixes.map((prefix) => {
            const active = classPrefixes.includes(prefix);
            return <button key={prefix} type="button" onClick={() => { setClassPrefixes((current) => active ? current.filter((value) => value !== prefix) : [...current, prefix].sort()); setPage(1); }} className={`flex h-7 w-7 items-center justify-center rounded border text-[11px] font-semibold ${active ? 'border-purple-600 bg-purple-600 text-white' : 'border-gray-300 bg-white text-gray-700 hover:border-purple-400 hover:text-purple-700'}`}>{prefix}</button>;
          })}
        </div>
        {quickPrefix && <div className="mt-3 truncate rounded bg-slate-200 px-1 py-1 text-center font-mono text-[10px] text-slate-700" title={quickPrefix}>{quickPrefix}</div>}
      </aside>
      <div className="min-w-0 flex-1 overflow-auto">
        <table className="w-full table-auto border-collapse text-sm">
          <thead className="sticky top-0 z-10 bg-gray-100">
            <tr className="border-b border-gray-300">
              <th className="w-11 min-w-11 border-r border-gray-200 px-2 py-1.5 text-center">
                <input
                  type="checkbox"
                  checked={context.allDisplayedSelected}
                  onChange={context.toggleDisplayedRows}
                  aria-label="Sélectionner les éléments affichés"
                  className="h-3.5 w-3.5 cursor-pointer accent-teal-700"
                />
              </th>
              {context.columns.map((column) => <th key={column.id} className="border-r border-gray-200 px-2 py-1.5 text-left text-xs font-semibold text-gray-700" style={{ minWidth: column.minWidth, width: column.width }}>{column.label}</th>)}
              <th className="w-6 px-0.5" />
            </tr>
          </thead>
          <tbody>
            {context.loading && <tr><td colSpan={context.columns.length + 2} className="px-4 py-12 text-center text-sm text-gray-500">Chargement du plan comptable...</td></tr>}
            {!context.loading && context.empty && <tr><td colSpan={context.columns.length + 2} className="px-4 py-12 text-center text-sm text-gray-500">Aucun compte comptable</td></tr>}
            {!context.loading && context.rows.map((row, rowIndex) => {
              const group = row.kind === 'group';
              const record = row.data;
              const selected = context.selectedRowKeys.map(String).includes(String(row.id));
              return (
                <tr
                  key={row.id}
                  {...context.getRowInteractionProps(row)}
                  className={`cursor-pointer border-b border-gray-200 transition-colors ${selected ? 'bg-purple-50' : (group ? 'bg-gray-50 font-semibold hover:bg-purple-50/40' : `${context.getStripeClassName(rowIndex)} hover:bg-purple-50/40`)}`}
                >
                  <td className="w-11 min-w-11 border-r border-gray-100 px-2 py-1.5 text-center" onClick={(event) => event.stopPropagation()}>
                    <input
                      type="checkbox"
                      checked={selected}
                      onChange={() => context.toggleRow(row.id)}
                      aria-label={`Sélectionner ${record.code || record.name || 'cette ligne'}`}
                      className="h-3.5 w-3.5 cursor-pointer accent-teal-700"
                    />
                  </td>
                  {context.columns.map((column) => {
                    let content = '';
                    if (column.id === 'code') content = <div className="flex items-center gap-1" style={{ paddingLeft: `${row.depth * 15}px` }}>{group && <button type="button" data-row-interaction-ignore="true" onClick={(event) => { event.stopPropagation(); setExpanded((current) => ({ ...current, [String(record.id)]: !row.expanded })); }} className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded text-gray-600 hover:bg-purple-100 hover:text-purple-700" title={row.expanded ? 'Replier' : 'Déplier'}>{row.expanded ? <FiChevronDown size={13} /> : <FiChevronRight size={13} />}</button>}{group && <FiFolder className="text-purple-600" size={13} />}<span className={`font-mono font-semibold ${group ? 'text-purple-700' : 'text-gray-900'}`}>{record.code || '-'}</span></div>;
                    else if (column.id === 'label') content = <span className="font-medium text-gray-900">{record.name || record.label || '-'}</span>;
                    else if (column.id === 'nature') content = group ? 'Classe comptable' : accountTypeLabel(record);
                    else if (column.id === 'classe') content = group ? relationLabel(record.parent || record.parent_name) : (record.__groupLabel || relationLabel(record.group));
                    else if (column.id === 'lettrable') content = group ? '' : <button type="button" onClick={(event) => { event.stopPropagation(); toggleReconcile(record); }} disabled={savingAccountId === record.id} className={`relative inline-flex h-5 w-11 items-center rounded-full transition-colors ${record.reconcile ? 'bg-green-500' : 'bg-gray-300'}`}><span className={`h-4 w-4 rounded-full bg-white shadow transition-transform ${record.reconcile ? 'translate-x-6' : 'translate-x-1'}`} /></button>;
                    else if (column.id === 'status') content = <span className={`rounded-full px-2 py-0.5 text-[10px] ${record.active !== false ? 'bg-green-100 text-green-700' : 'bg-slate-200 text-slate-700'}`}>{record.active !== false ? 'Actif' : 'Inactif'}</span>;
                    else content = group ? '' : valueForColumn(record, column.id, selectedFramework);
                    return <td key={`${row.id}-${column.id}`} title={typeof content === 'string' ? content : ''} className="max-w-0 border-r border-gray-100 px-2 py-1.5 text-xs text-gray-700"><div className="truncate">{content}</div></td>;
                  })}
                  <td className="w-6 px-0.5" />
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  ), [classPrefixes, prefixes, quickPrefix, savingAccountId, selectedFramework, toggleReconcile]);

  return (
    <UnifiedIndexPage
      title="Plans comptables"
      memoryKey={MEMORY_KEY}
      rows={filteredRows}
      rowKey="id"
      columns={COLUMNS}
      loading={(loading || frameworksLoading) && !filteredRows.length}
      error={error}
      success={success}
      messageDuration={15000}
      onDismissError={() => setError('')}
      onDismissSuccess={() => setSuccess('')}
      searchValue={search}
      onSearchChange={(value) => { setSearch(value); setPage(1); }}
      searchPlaceholder="Rechercher un numéro ou un libellé..."
      filterChips={filterChips}
      onRemoveFilterChip={removeChip}
      renderFilters={renderFilters}
      filterPanelWidth={520}
      primaryAction={{ label: 'Nouveau plan', icon: <FiPlus size={14} />, onClick: () => navigate('/comptabilite/plans/new') }}
      onRowOpen={openPlanRow}
      renderSelectionSummary={(selectedRows) => `${selectedRows.length} élément(s) sélectionné(s)`}
      renderContent={renderContent}
      page={page}
      onPageChange={setPage}
      pageSize={pageSize}
      onPageSizeChange={setPageSize}
      pageSizeOptions={[25, 50, 100, 200]}
      visibleColumnIds={visibleColumns}
      defaultVisibleColumnIds={DEFAULT_COLUMNS}
      onVisibleColumnsChange={setVisibleColumns}
      allowColumnSort={false}
      footerText={`${groups.length} classe(s) · ${accounts.length} compte(s)`}
    />
  );
}

export default PlanList;
