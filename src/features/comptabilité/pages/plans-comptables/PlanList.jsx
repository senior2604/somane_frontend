// src/features/comptabilite/pages/plans-comptables/PlanList.jsx
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FiAlertCircle,
  FiChevronDown,
  FiChevronLeft,
  FiChevronRight,
  FiChevronsLeft,
  FiChevronsRight,
  FiEdit2,
  FiEye,
  FiFilter,
  FiFolder,
  FiMoreHorizontal,
  FiPlus,
  FiRefreshCw,
  FiSearch,
  FiSettings,
  FiX,
} from 'react-icons/fi';

import { ENDPOINTS } from '../../../../config/api';
import axiosInstance from '../../../../config/axiosInstance';
import useFrameworkStore from '../../../../stores/comptabilite/frameworkStore';

const FRAMEWORK_SESSION_KEY = 'plan_list_selected_framework';

const Tooltip = ({ children, text, position = 'top' }) => {
  const [show, setShow] = useState(false);

  return (
    <div className="relative inline-block">
      <div onMouseEnter={() => setShow(true)} onMouseLeave={() => setShow(false)}>
        {children}
      </div>
      {show && (
        <div className={`absolute z-50 px-2 py-1 text-xs text-white bg-gray-800 rounded whitespace-nowrap ${
          position === 'top' ? 'bottom-full left-1/2 transform -translate-x-1/2 mb-1' :
          position === 'bottom' ? 'top-full left-1/2 transform -translate-x-1/2 mt-1' :
          position === 'left' ? 'right-full top-1/2 transform -translate-y-1/2 mr-1' :
          'left-full top-1/2 transform -translate-y-1/2 ml-1'
        }`}>
          {text}
        </div>
      )}
    </div>
  );
};

const Badge = ({ children, className = '' }) => (
  <span className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium ${className}`}>
    {children}
  </span>
);

const normalizeApiList = (data) => {
  const list = Array.isArray(data) ? data : (data?.results || []);
  return Array.isArray(list) ? list : [];
};

const logAxiosError = (label, error) => {
  console.error(label, {
    status: error?.response?.status,
    url: error?.config?.url,
    params: error?.config?.params,
    data: error?.response?.data,
    message: error?.message,
  }, error);
};

const fetchPagedList = async (endpoint, params = {}) => {
  const pageSize = params.page_size || 500;
  const firstResponse = await axiosInstance.get(endpoint, {
    params: { ...params, page: 1, page_size: pageSize },
    timeout: 60000,
  });

  if (Array.isArray(firstResponse.data)) {
    return firstResponse.data;
  }

  const firstResults = normalizeApiList(firstResponse.data);
  const count = Number(firstResponse.data?.count || firstResults.length || 0);
  const totalPages = Math.max(1, Math.ceil(count / pageSize));
  const allResults = [...firstResults];

  const requests = [];
  for (let page = 2; page <= totalPages; page += 1) {
    requests.push(
      axiosInstance.get(endpoint, {
        params: { ...params, page, page_size: pageSize },
        timeout: 60000,
      })
    );
  }

  const responses = await Promise.all(requests);
  responses.forEach((response) => {
    allResults.push(...normalizeApiList(response.data));
  });

  return allResults;
};

const mergeByIdAndSort = (current, incoming) => {
  const map = new Map();
  [...current, ...incoming].forEach((item) => {
    if (item?.id !== undefined && item?.id !== null) {
      map.set(String(item.id), item);
    }
  });
  return Array.from(map.values()).sort(sortByCode);
};

const getPlanLightEndpoint = () => `${ENDPOINTS.COMPTA.ACCOUNTS}plan-light/`;

const relationId = (value) => {
  if (!value) return null;
  if (typeof value === 'object') return value.id ?? value.value ?? null;
  return value;
};

const normalizeText = (value) => String(value || '')
  .trim()
  .toLowerCase()
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '');

const sortByCode = (a, b) => String(a.code || '').localeCompare(String(b.code || ''), 'fr', { numeric: true });

const formatAmount = (value) => {
  if (value === null || value === undefined || value === '') return '-';
  const number = Number(value);
  if (Number.isNaN(number)) return String(value);
  return Math.round(number).toLocaleString('fr-FR');
};

const formatDate = (value) => {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
};

const formatBoolean = (value) => (value ? 'Oui' : 'Non');

const formatRelationValue = (value) => {
  if (Array.isArray(value)) return value.length ? `${value.length}` : '-';
  if (!value && value !== 0) return '-';
  if (typeof value === 'object') {
    return [value.code, value.name || value.label || value.display_name || value.nom || value.raison_sociale]
      .filter(Boolean)
      .join(' - ') || String(value.id || '-');
  }
  return String(value);
};

const getFrameworkLabel = (framework) => {
  if (!framework) return '';
  return [framework.code, framework.name].filter(Boolean).join(' - ');
};

const getRelationLabel = (value) => {
  if (!value) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'number') return '';
  return [value.code, value.name || value.label || value.display_name]
    .filter(Boolean)
    .join(' - ');
};

const getGroupParentId = (group) => (
  relationId(group.parent) ??
  group.parent_id ??
  relationId(group.parent_group) ??
  group.parent_group_id ??
  null
);

const getAccountGroupId = (account) => (
  relationId(account.group) ??
  account.group_id ??
  relationId(account.account_group) ??
  account.account_group_id ??
  relationId(account.type_group) ??
  account.type_group_id ??
  null
);

const getRecordFrameworkId = (record) => (
  relationId(record.framework) ??
  record.framework_id ??
  relationId(record.account_framework) ??
  record.account_framework_id ??
  null
);

const getAccountGroupLabel = (account) => (
  account.__display_group_label ||
  account.group_label ||
  [account.group_code, account.group_name].filter(Boolean).join(' - ') ||
  account.group_name ||
  account.type_group_label ||
  [account.type_group_code, account.type_group_name].filter(Boolean).join(' - ') ||
  account.type_group_name ||
  account.group_display ||
  getRelationLabel(account.group) ||
  ''
);

const getAccountTypeLabel = (account) => (
  account.type_name ||
  account.account_type_label ||
  account.account_type_name ||
  account.internal_group ||
  account.account_type ||
  getRelationLabel(account.type) ||
  '-'
);

const getAccountFrameworkLabel = (account, selectedPlan) => (
  account.framework_name ||
  getRelationLabel(account.framework) ||
  getFrameworkLabel(selectedPlan) ||
  formatRelationValue(account.framework)
);

const getAccountParentLabel = (account) => (
  account.parent_label ||
  account.parent_name ||
  getRelationLabel(account.parent) ||
  formatRelationValue(account.parent)
);

const renderAccountColumnValue = (account, columnId, selectedPlan) => {
  switch (columnId) {
    case 'code':
      return account.code || '-';
    case 'label':
      return account.name || account.display_name || account.label || '-';
    case 'nature':
      return getAccountTypeLabel(account);
    case 'classe':
      return getAccountGroupLabel(account) || '-';
    case 'lettrable':
      return formatBoolean(account.reconcile);
    case 'status':
      return account.active !== false ? 'Actif' : 'Inactif';
    case 'framework':
      return getAccountFrameworkLabel(account, selectedPlan);
    case 'company':
      return account.company_name || getRelationLabel(account.company) || formatRelationValue(account.company);
    case 'parent':
      return getAccountParentLabel(account);
    case 'currency':
      return account.currency_name || account.currency_code || getRelationLabel(account.currency) || formatRelationValue(account.currency);
    case 'type_id':
      return formatRelationValue(account.type);
    case 'group_id':
      return formatRelationValue(account.group);
    case 'account_type':
      return account.account_type || '-';
    case 'level':
      return formatRelationValue(account.level);
    case 'length':
      return formatRelationValue(account.length);
    case 'locked':
      return formatBoolean(account.locked);
    case 'is_generated':
      return formatBoolean(account.is_generated);
    case 'closing_type':
      return formatBoolean(account.closing_type);
    case 'opening_debit':
    case 'opening_credit':
    case 'opening_balance':
    case 'movement_debit':
    case 'movement_credit':
    case 'current_balance':
      return formatAmount(account[columnId]);
    case 'tax_ids':
    case 'tag_ids':
    case 'allowed_journal_ids':
      return formatRelationValue(account[columnId]);
    case 'analytic_account_id':
    case 'ifrs_id':
    case 'reporting_id':
      return formatRelationValue(account[columnId]);
    case 'create_uid_name':
      return account.create_uid_name || formatRelationValue(account.create_uid);
    case 'create_date':
      return formatDate(account.create_date);
    case 'write_uid_name':
      return account.write_uid_name || formatRelationValue(account.write_uid);
    case 'write_date':
      return formatDate(account.write_date);
    case 'id':
      return formatRelationValue(account.id);
    default:
      return formatRelationValue(account[columnId]);
  }
};

const PLAN_COLUMNS = [
  { id: 'code', label: 'Numéro de compte', minWidth: '150px', defaultVisible: true },
  { id: 'label', label: 'Libellé', minWidth: '280px', defaultVisible: true },
  { id: 'nature', label: 'Nature / Type', minWidth: '150px', defaultVisible: true },
  { id: 'classe', label: 'Classe comptable', minWidth: '150px', defaultVisible: true },
  { id: 'lettrable', label: 'Lettrage', minWidth: '100px', align: 'center', defaultVisible: true },
  { id: 'status', label: 'Statut', minWidth: '100px', defaultVisible: true },
  { id: 'id', label: 'ID', minWidth: '80px' },
  { id: 'framework', label: 'Référentiel', minWidth: '180px' },
  { id: 'company', label: 'Entité', minWidth: '160px' },
  { id: 'parent', label: 'Compte parent', minWidth: '160px' },
  { id: 'currency', label: 'Devise', minWidth: '110px' },
  { id: 'type_id', label: 'ID nature', minWidth: '100px' },
  { id: 'group_id', label: 'ID classe', minWidth: '100px' },
  { id: 'account_type', label: 'Type compte', minWidth: '120px' },
  { id: 'level', label: 'Niveau', minWidth: '90px', align: 'center' },
  { id: 'length', label: 'Longueur', minWidth: '100px', align: 'center' },
  { id: 'locked', label: 'Verrouillé', minWidth: '110px', align: 'center' },
  { id: 'is_generated', label: 'Généré', minWidth: '100px', align: 'center' },
  { id: 'closing_type', label: 'Clôture', minWidth: '100px', align: 'center' },
  { id: 'opening_debit', label: 'Débit initial', minWidth: '120px', align: 'right' },
  { id: 'opening_credit', label: 'Crédit initial', minWidth: '120px', align: 'right' },
  { id: 'opening_balance', label: 'Solde initial', minWidth: '120px', align: 'right' },
  { id: 'movement_debit', label: 'Mouvement débit', minWidth: '130px', align: 'right' },
  { id: 'movement_credit', label: 'Mouvement crédit', minWidth: '130px', align: 'right' },
  { id: 'current_balance', label: 'Solde courant', minWidth: '120px', align: 'right' },
  { id: 'tax_ids', label: 'Taxes', minWidth: '90px', align: 'center' },
  { id: 'tag_ids', label: 'Étiquettes', minWidth: '100px', align: 'center' },
  { id: 'allowed_journal_ids', label: 'Journaux autorisés', minWidth: '140px', align: 'center' },
  { id: 'analytic_account_id', label: 'Compte analytique', minWidth: '140px' },
  { id: 'ifrs_id', label: 'Compte IFRS', minWidth: '120px' },
  { id: 'reporting_id', label: 'Compte reporting', minWidth: '130px' },
  { id: 'create_uid_name', label: 'Créé par', minWidth: '120px' },
  { id: 'create_date', label: 'Date création', minWidth: '120px' },
  { id: 'write_uid_name', label: 'Modifié par', minWidth: '120px' },
  { id: 'write_date', label: 'Date modification', minWidth: '130px' },
];

const getDefaultVisibleColumns = () => PLAN_COLUMNS.reduce((acc, column) => {
  acc[column.id] = Boolean(column.defaultVisible);
  return acc;
}, {});

const accountMatchesGroupRange = (account, group) => {
  const accountCode = String(account.code || '').trim();
  const start = String(group.code_prefix_start || '').trim();
  const end = String(group.code_prefix_end || '').trim();
  if (!accountCode || (!start && !end)) return false;

  if (start && !end) return accountCode.startsWith(start);
  if (!start && end) {
    const endPrefix = accountCode.slice(0, end.length);
    return endPrefix <= end;
  }

  const length = Math.max(start.length, end.length);
  const comparable = accountCode.slice(0, length);
  return comparable >= start.padEnd(length, '0') && comparable <= end.padEnd(length, '9');
};

const getGroupMatchScore = (account, group) => {
  const accountCode = String(account.code || '').trim();
  if (!accountCode) return 0;

  const start = String(group.code_prefix_start || '').trim();
  const end = String(group.code_prefix_end || '').trim();
  if ((start || end) && accountMatchesGroupRange(account, group)) {
    return Math.max(start.length, end.length, String(group.code || '').length);
  }

  const groupCode = String(group.code || '').trim();
  if (groupCode && accountCode.startsWith(groupCode)) {
    return groupCode.length;
  }

  return 0;
};

const findBestGroup = (account, groups) => {
  const directId = getAccountGroupId(account);
  const matchingGroups = groups
    .map((group) => ({
      group,
      score: getGroupMatchScore(account, group),
      direct: directId && String(group.id) === String(directId),
    }))
    .filter((item) => item.score > 0 || item.direct)
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return String(b.group.code || '').length - String(a.group.code || '').length;
    });

  return matchingGroups[0]?.group || null;
};

const buildPlanTree = (groups, accounts) => {
  const sortedGroups = [...groups].sort(sortByCode);
  const groupMap = new Map(sortedGroups.map((group) => [String(group.id), { ...group, children: [], accounts: [] }]));
  const roots = [];

  sortedGroups.forEach((group) => {
    const node = groupMap.get(String(group.id));
    const parentId = getGroupParentId(group);
    const parent = parentId ? groupMap.get(String(parentId)) : null;
    if (parent) parent.children.push(node);
    else roots.push(node);
  });

  const orphanAccounts = [];
  accounts.forEach((account) => {
    const group = findBestGroup(account, sortedGroups);
    const node = group ? groupMap.get(String(group.id)) : null;
    if (node) {
      node.accounts.push({
        ...account,
        __display_group_id: group.id,
        __display_group_label: [group.code, group.name].filter(Boolean).join(' - '),
      });
    }
    else orphanAccounts.push(account);
  });

  groupMap.forEach((node) => {
    node.children.sort(sortByCode);
    node.accounts.sort(sortByCode);
  });

  return { roots: roots.sort(sortByCode), orphanAccounts: orphanAccounts.sort(sortByCode) };
};

const countAccountsDeep = (node) => (
  (node.accounts?.length || 0) + (node.children || []).reduce((total, child) => total + countAccountsDeep(child), 0)
);

const accountSearchText = (account) => normalizeText([
  account.code,
  account.name,
  account.label,
  getAccountTypeLabel(account),
  getAccountGroupLabel(account),
].filter(Boolean).join(' '));

const groupSearchText = (group) => normalizeText([
  group.code,
  group.name,
  group.display_name,
  group.parent_name,
].filter(Boolean).join(' '));

const matchesClassSelection = (record, selectedClassPrefixes, quickClassPrefix) => {
  const code = String(record?.code || '').trim();
  if (!code) return false;
  const selected = selectedClassPrefixes || [];
  const quick = String(quickClassPrefix || '').trim();
  const matchesSelected = selected.length === 0 || selected.some((prefix) => code.startsWith(prefix));
  const matchesQuick = !quick || code.startsWith(quick);
  return matchesSelected && matchesQuick;
};

const filterTree = (nodes, searchText, kindFilter, statusFilter, lettrableFilter, selectedClassPrefixes, quickClassPrefix) => {
  const normalized = normalizeText(searchText);

  return nodes.reduce((acc, node) => {
    const children = filterTree(
      node.children || [],
      searchText,
      kindFilter,
      statusFilter,
      lettrableFilter,
      selectedClassPrefixes,
      quickClassPrefix
    );
    const accounts = (node.accounts || []).filter((account) => {
      const matchesSearch = !normalized || accountSearchText(account).includes(normalized);
      const matchesClass = matchesClassSelection(account, selectedClassPrefixes, quickClassPrefix);
      const matchesKind = kindFilter === 'all' || kindFilter === 'account';
      const matchesStatus = statusFilter === 'all' || (
        statusFilter === 'active' ? account.active !== false : account.active === false
      );
      const matchesLettrable = lettrableFilter === 'all' || (
        lettrableFilter === 'yes' ? Boolean(account.reconcile) : !account.reconcile
      );
      return matchesSearch && matchesClass && matchesKind && matchesStatus && matchesLettrable;
    });

    const groupMatchesSearch = !normalized || groupSearchText(node).includes(normalized);
    const groupMatchesClass = matchesClassSelection(node, selectedClassPrefixes, quickClassPrefix);
    const groupMatchesKind = kindFilter === 'all' || kindFilter === 'group';
    const groupVisible = groupMatchesSearch && groupMatchesClass && groupMatchesKind && statusFilter === 'all' && lettrableFilter === 'all';

    if (groupVisible || children.length || accounts.length) {
      acc.push({
        ...node,
        children,
        accounts: groupVisible && kindFilter !== 'account' ? node.accounts : accounts,
      });
    }

    return acc;
  }, []);
};

const flattenTree = (nodes, expandedGroups, depth = 0) => {
  const rows = [];

  nodes.forEach((node) => {
    const hasChildren = Boolean((node.children && node.children.length) || (node.accounts && node.accounts.length));
    const expanded = expandedGroups[node.id] !== false;
    rows.push({ id: `group-${node.id}`, kind: 'group', depth, data: node, hasChildren, expanded });

    if (expanded) {
      rows.push(...flattenTree(node.children || [], expandedGroups, depth + 1));
      rows.push(...flattenAccounts(node.accounts || [], depth + 1));
    }
  });

  return rows;
};

const flattenAccounts = (accounts, depth = 0) => {
  const accountMap = new Map();
  const roots = [];

  [...accounts].sort(sortByCode).forEach((account) => {
    accountMap.set(String(account.id), { ...account, children: [] });
  });

  accountMap.forEach((account) => {
    const parentId = relationId(account.parent) ?? account.parent_id;
    let parent = parentId ? accountMap.get(String(parentId)) : null;
    if (!parent) {
      const accountCode = String(account.code || '').trim();
      parent = Array.from(accountMap.values())
        .filter((candidate) => {
          const candidateCode = String(candidate.code || '').trim();
          return candidate.id !== account.id &&
            candidateCode &&
            accountCode.startsWith(candidateCode) &&
            candidateCode.length < accountCode.length;
        })
        .sort((a, b) => String(b.code || '').length - String(a.code || '').length)[0] || null;
    }
    if (parent) parent.children.push(account);
    else roots.push(account);
  });

  const rows = [];
  const visit = (account, currentDepth) => {
    rows.push({ id: `account-${account.id}`, kind: 'account', depth: currentDepth, data: account });
    account.children.sort(sortByCode).forEach((child) => visit(child, currentDepth + 1));
  };

  roots.sort(sortByCode).forEach((account) => visit(account, depth));
  return rows;
};

function PlanList() {
  const navigate = useNavigate();
  const actionsMenuRef = useRef(null);
  const filterMenuRef = useRef(null);

  const { frameworks, fetchFrameworks, loading } = useFrameworkStore();

  const [selectedFramework, setSelectedFramework] = useState(() => {
    const saved = sessionStorage.getItem(FRAMEWORK_SESSION_KEY);
    return saved ? parseInt(saved, 10) : null;
  });
  const [groups, setGroups] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [loadingPlan, setLoadingPlan] = useState(false);
  const [loadingAccounts, setLoadingAccounts] = useState(false);
  const [localError, setLocalError] = useState(null);
  const [searchText, setSearchText] = useState('');
  const [kindFilter, setKindFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [lettrableFilter, setLettrableFilter] = useState('all');
  const [selectedClassPrefixes, setSelectedClassPrefixes] = useState([]);
  const [quickClassPrefix, setQuickClassPrefix] = useState('');
  const [reconcileSavingId, setReconcileSavingId] = useState(null);
  const [showActionsMenu, setShowActionsMenu] = useState(false);
  const [showFilterMenu, setShowFilterMenu] = useState(false);
  const [showColumnsMenu, setShowColumnsMenu] = useState(false);
  const [columnsMenuPosition, setColumnsMenuPosition] = useState({ top: 0, left: 0 });
  const [activeRowId, setActiveRowId] = useState(null);
  const [expandedGroups, setExpandedGroups] = useState({});
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(50);
  const [visibleColumns, setVisibleColumns] = useState(() => getDefaultVisibleColumns());

  const selectedPlan = useMemo(
    () => frameworks.find((framework) => String(framework.id) === String(selectedFramework)),
    [frameworks, selectedFramework]
  );

  const columns = PLAN_COLUMNS;
  const visibleColumnList = useMemo(
    () => columns.filter((column) => visibleColumns[column.id]),
    [columns, visibleColumns]
  );

  const visibleColumnCount = visibleColumnList.length;

  const { roots, orphanAccounts } = useMemo(
    () => buildPlanTree(groups, accounts),
    [groups, accounts]
  );

  const classPrefixes = useMemo(() => {
    const prefixes = new Set();
    [...groups, ...accounts].forEach((record) => {
      const first = String(record?.code || '').trim().charAt(0);
      if (/^\d$/.test(first)) prefixes.add(first);
    });
    return Array.from(prefixes).sort((a, b) => Number(a) - Number(b));
  }, [groups, accounts]);

  const filteredRoots = useMemo(
    () => filterTree(
      roots,
      searchText,
      kindFilter,
      statusFilter,
      lettrableFilter,
      selectedClassPrefixes,
      quickClassPrefix
    ),
    [roots, searchText, kindFilter, statusFilter, lettrableFilter, selectedClassPrefixes, quickClassPrefix]
  );

  const filteredOrphans = useMemo(() => {
    const normalized = normalizeText(searchText);
    return orphanAccounts.filter((account) => {
      const matchesSearch = !normalized || accountSearchText(account).includes(normalized);
      const matchesClass = matchesClassSelection(account, selectedClassPrefixes, quickClassPrefix);
      const matchesKind = kindFilter === 'all' || kindFilter === 'account';
      const matchesStatus = statusFilter === 'all' || (
        statusFilter === 'active' ? account.active !== false : account.active === false
      );
      const matchesLettrable = lettrableFilter === 'all' || (
        lettrableFilter === 'yes' ? Boolean(account.reconcile) : !account.reconcile
      );
      return matchesSearch && matchesClass && matchesKind && matchesStatus && matchesLettrable;
    });
  }, [orphanAccounts, searchText, kindFilter, statusFilter, lettrableFilter, selectedClassPrefixes, quickClassPrefix]);

  const flatRows = useMemo(() => {
    const rows = flattenTree(filteredRoots, expandedGroups);
    if (filteredOrphans.length > 0) {
      rows.push({ id: 'orphans-title', kind: 'section', depth: 0, label: 'Comptes sans classe comptable' });
      filteredOrphans.forEach((account) => {
        rows.push({ id: `orphan-${account.id}`, kind: 'account', depth: 0, data: account });
      });
    }
    return rows;
  }, [filteredRoots, filteredOrphans, expandedGroups]);

  const totalRows = flatRows.length;
  const totalPages = Math.max(1, Math.ceil(totalRows / itemsPerPage));
  const paginatedRows = flatRows.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
  const totalAccounts = accounts.length;
  const totalGroups = groups.length;

  const activeFilters = useMemo(() => {
    const filters = [];
    if (selectedPlan) filters.push({ id: 'framework', label: selectedPlan.code || selectedPlan.name, color: 'bg-purple-100 text-purple-700' });
    if (kindFilter !== 'all') filters.push({ id: 'kind', label: kindFilter === 'group' ? 'Classes comptables' : 'Comptes', color: 'bg-blue-100 text-blue-700' });
    if (statusFilter !== 'all') filters.push({ id: 'status', label: statusFilter === 'active' ? 'Actifs' : 'Inactifs', color: 'bg-green-100 text-green-700' });
    if (lettrableFilter !== 'all') filters.push({ id: 'lettrable', label: lettrableFilter === 'yes' ? 'Lettrables' : 'Non lettrables', color: 'bg-amber-100 text-amber-700' });
    if (selectedClassPrefixes.length) filters.push({ id: 'classes', label: `Classes: ${selectedClassPrefixes.join(', ')}`, color: 'bg-indigo-100 text-indigo-700' });
    if (quickClassPrefix) filters.push({ id: 'quickClass', label: `Préfixe: ${quickClassPrefix}`, color: 'bg-slate-100 text-slate-700' });
    return filters;
  }, [selectedPlan, kindFilter, statusFilter, lettrableFilter, selectedClassPrefixes, quickClassPrefix]);

  const expandAll = useCallback(() => {
    const next = {};
    const visit = (node) => {
      next[node.id] = true;
      (node.children || []).forEach(visit);
    };
    roots.forEach(visit);
    setExpandedGroups(next);
  }, [roots]);

  const collapseAll = () => setExpandedGroups({});

  const loadAccountsContent = useCallback(async (frameworkId) => {
    if (!frameworkId) {
      setAccounts([]);
      return;
    }

    setLoadingAccounts(true);
    try {
      const pageSize = 250;
      const firstResponse = await axiosInstance.get(ENDPOINTS.COMPTA.ACCOUNTS, {
        params: {
          framework: frameworkId,
          ordering: 'code',
          page: 1,
          page_size: pageSize,
        },
        timeout: 30000,
      });

      const filterAccount = (account) => {
        const accountFrameworkId = getRecordFrameworkId(account);
        return !accountFrameworkId || String(accountFrameworkId) === String(frameworkId);
      };

      const firstAccounts = normalizeApiList(firstResponse.data).filter(filterAccount);
      const count = Array.isArray(firstResponse.data)
        ? firstAccounts.length
        : Number(firstResponse.data?.count || firstAccounts.length || 0);
      const totalPages = Math.max(1, Math.ceil(count / pageSize));

      setAccounts(firstAccounts.sort(sortByCode));
      setCurrentPage(1);

      if (totalPages > 1) {
        const requests = [];
        for (let page = 2; page <= totalPages; page += 1) {
          requests.push(
            axiosInstance.get(ENDPOINTS.COMPTA.ACCOUNTS, {
              params: {
                framework: frameworkId,
                ordering: 'code',
                page,
                page_size: pageSize,
              },
              timeout: 30000,
            })
          );
        }

        const responses = await Promise.allSettled(requests);
        responses.forEach((result) => {
          if (result.status === 'fulfilled') {
            const pageAccounts = normalizeApiList(result.value.data).filter(filterAccount);
            setAccounts((current) => mergeByIdAndSort(current, pageAccounts));
          } else {
            logAxiosError('Erreur chargement page comptes du plan comptable', result.reason);
          }
        });
      }
    } catch (error) {
      logAxiosError('Erreur chargement comptes du plan comptable', error);
      setLocalError('Les classes comptables sont affichées. Les comptes se chargeront après actualisation si le serveur répond plus vite.');
    } finally {
      setLoadingAccounts(false);
    }
  }, []);

  const loadPlanLightContent = useCallback(async (frameworkId) => {
    const response = await axiosInstance.get(getPlanLightEndpoint(), {
      params: { framework: frameworkId },
      timeout: 30000,
    });

    const loadedGroups = normalizeApiList(response.data?.groups || []);
    const loadedAccounts = normalizeApiList(response.data?.accounts || []);

    const nextGroups = loadedGroups.filter((group) => {
      const groupFrameworkId = getRecordFrameworkId(group);
      return !groupFrameworkId || String(groupFrameworkId) === String(frameworkId);
    });
    const nextAccounts = loadedAccounts.filter((account) => {
      const accountFrameworkId = getRecordFrameworkId(account);
      return !accountFrameworkId || String(accountFrameworkId) === String(frameworkId);
    });

    setGroups(nextGroups);
    setAccounts(nextAccounts.sort(sortByCode));
    setSelectedClassPrefixes([]);
    setQuickClassPrefix('');
    setCurrentPage(1);

    const nextExpanded = {};
    nextGroups.forEach((group) => { nextExpanded[group.id] = true; });
    setExpandedGroups(nextExpanded);
  }, []);

  const loadPlanContent = useCallback(async (frameworkId) => {
    if (!frameworkId) {
      setGroups([]);
      setAccounts([]);
      return;
    }

    setLoadingPlan(true);
    setLoadingAccounts(false);
    setLocalError(null);
    setGroups([]);
    setAccounts([]);
    try {
      await loadPlanLightContent(frameworkId);
    } catch (lightError) {
      logAxiosError('Erreur chargement plan comptable rapide', lightError);
      try {
      const loadedGroups = await fetchPagedList(ENDPOINTS.COMPTA.GROUPS, {
        framework: frameworkId,
        ordering: 'code',
        page_size: 1000,
      });

      const nextGroups = loadedGroups.filter((group) => {
        const groupFrameworkId = getRecordFrameworkId(group);
        return !groupFrameworkId || String(groupFrameworkId) === String(frameworkId);
      });

      setGroups(nextGroups);
      setSelectedClassPrefixes([]);
      setQuickClassPrefix('');
      setCurrentPage(1);

      const nextExpanded = {};
      nextGroups.forEach((group) => { nextExpanded[group.id] = true; });
      setExpandedGroups(nextExpanded);
      loadAccountsContent(frameworkId);
      setLocalError("Endpoint rapide indisponible. Ajoutez l'action backend plan_light pour afficher les numéros de comptes rapidement.");
    } catch (error) {
      logAxiosError('Erreur chargement plan comptable', error);
      setLocalError(
        error?.code === 'ECONNABORTED'
          ? 'Chargement trop long des classes comptables. Réessayez dans quelques secondes.'
          : 'Impossible de charger les classes comptables et les comptes du plan comptable.'
      );
      setGroups([]);
      setAccounts([]);
      }
    } finally {
      setLoadingPlan(false);
    }
  }, [loadAccountsContent, loadPlanLightContent]);

  useEffect(() => {
    fetchFrameworks();
  }, [fetchFrameworks]);

  useEffect(() => {
    if (!frameworks.length) return;

    const selectedExists = selectedFramework && frameworks.some(
      (framework) => String(framework.id) === String(selectedFramework)
    );
    if (selectedExists) return;

    const firstFramework = frameworks[0]?.id ? parseInt(frameworks[0].id, 10) : null;
    setSelectedFramework(firstFramework);
    if (firstFramework) sessionStorage.setItem(FRAMEWORK_SESSION_KEY, String(firstFramework));
    else sessionStorage.removeItem(FRAMEWORK_SESSION_KEY);
  }, [frameworks, selectedFramework]);

  useEffect(() => {
    loadPlanContent(selectedFramework);
  }, [selectedFramework, loadPlanContent]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (actionsMenuRef.current && !actionsMenuRef.current.contains(event.target)) {
        setShowActionsMenu(false);
      }
      if (filterMenuRef.current && !filterMenuRef.current.contains(event.target)) {
        setShowFilterMenu(false);
      }
      const columnsMenuElement = document.getElementById('plan-columns-menu');
      if (columnsMenuElement && !columnsMenuElement.contains(event.target)) {
        const buttonElement = document.querySelector('.plan-columns-menu-button');
        if (buttonElement && !buttonElement.contains(event.target)) {
          setShowColumnsMenu(false);
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages);
  }, [currentPage, totalPages]);

  useEffect(() => {
    const handleSageTyping = (event) => {
      const target = event.target;
      const tagName = String(target?.tagName || '').toLowerCase();
      const isTypingInControl = ['input', 'textarea', 'select'].includes(tagName) || target?.isContentEditable;
      if (isTypingInControl || !selectedFramework) return;

      if (/^\d$/.test(event.key)) {
        event.preventDefault();
        setQuickClassPrefix((current) => `${current}${event.key}`);
        setCurrentPage(1);
        return;
      }

      if (event.key === 'Backspace' && quickClassPrefix) {
        event.preventDefault();
        setQuickClassPrefix((current) => current.slice(0, -1));
        setCurrentPage(1);
        return;
      }

      if (event.key === 'Escape' && (quickClassPrefix || selectedClassPrefixes.length > 0)) {
        event.preventDefault();
        setQuickClassPrefix('');
        setSelectedClassPrefixes([]);
        setCurrentPage(1);
      }
    };

    window.addEventListener('keydown', handleSageTyping);
    return () => window.removeEventListener('keydown', handleSageTyping);
  }, [quickClassPrefix, selectedClassPrefixes.length, selectedFramework]);

  const refresh = async () => {
    await fetchFrameworks();
    await loadPlanContent(selectedFramework);
  };

  const handleFrameworkChange = (frameworkId) => {
    const value = frameworkId ? parseInt(frameworkId, 10) : null;
    setSelectedFramework(value);
    setSearchText('');
    setCurrentPage(1);
    if (value) sessionStorage.setItem(FRAMEWORK_SESSION_KEY, String(value));
    else sessionStorage.removeItem(FRAMEWORK_SESSION_KEY);
  };

  const clearAllFilters = () => {
    setSearchText('');
    setKindFilter('all');
    setStatusFilter('all');
    setLettrableFilter('all');
    setSelectedClassPrefixes([]);
    setQuickClassPrefix('');
    setCurrentPage(1);
  };

  const removeFilter = (id) => {
    if (id === 'kind') setKindFilter('all');
    if (id === 'status') setStatusFilter('all');
    if (id === 'lettrable') setLettrableFilter('all');
    if (id === 'classes') setSelectedClassPrefixes([]);
    if (id === 'quickClass') setQuickClassPrefix('');
    setCurrentPage(1);
  };

  const toggleClassPrefix = (prefix) => {
    setSelectedClassPrefixes((current) => (
      current.includes(prefix)
        ? current.filter((item) => item !== prefix)
        : [...current, prefix].sort((a, b) => Number(a) - Number(b))
    ));
    setCurrentPage(1);
  };

  const toggleAccountReconcile = async (account) => {
    if (!account?.id || reconcileSavingId) return;
    const nextValue = !account.reconcile;
    const previousAccounts = accounts;
    setReconcileSavingId(account.id);
    setAccounts((current) => current.map((item) => (
      String(item.id) === String(account.id) ? { ...item, reconcile: nextValue } : item
    )));

    try {
      const response = await axiosInstance.patch(`${ENDPOINTS.COMPTA.ACCOUNTS}${account.id}/`, {
        reconcile: nextValue,
      });
      const updatedAccount = response?.data || {};
      setAccounts((current) => current.map((item) => (
        String(item.id) === String(account.id) ? { ...item, ...updatedAccount, reconcile: nextValue } : item
      )));
    } catch (error) {
      logAxiosError('Erreur mise à jour lettrage', error);
      setAccounts(previousAccounts);
      setLocalError('Impossible de modifier le lettrage du compte.');
    } finally {
      setReconcileSavingId(null);
    }
  };

  const toggleGroup = (groupId) => {
    setExpandedGroups((current) => ({ ...current, [groupId]: !current[groupId] }));
  };

  const handleRowOpen = (row) => {
    if (row.kind === 'group') navigate(`/comptabilite/groups/${row.data.id}`);
    if (row.kind === 'account') navigate(`/comptabilite/accounts/${row.data.id}`);
  };

  const renderRow = (row) => {
    if (row.kind === 'section') {
      return (
        <tr key={row.id} className="bg-gray-50">
          <td className="border border-gray-300 px-2 py-1.5 text-xs font-bold text-gray-700" colSpan={visibleColumnCount + 1}>
            {row.label}
          </td>
        </tr>
      );
    }

    const isGroup = row.kind === 'group';
    const record = row.data;
    const rowKey = row.id;

    return (
      <tr
        key={rowKey}
        className={`hover:bg-gray-50 cursor-pointer transition-colors ${activeRowId === rowKey ? 'bg-purple-50' : ''} ${isGroup ? 'bg-gray-50/70' : ''}`}
        onClick={() => setActiveRowId(rowKey)}
        onDoubleClick={() => handleRowOpen(row)}
      >
        {visibleColumnList.map((column) => {
          const isCodeColumn = column.id === 'code';
          const isLabelColumn = column.id === 'label';
          const isNatureColumn = column.id === 'nature';
          const isLettrageColumn = column.id === 'lettrable';
          const isStatusColumn = column.id === 'status';
          const alignClass = column.align === 'right'
            ? 'text-right'
            : column.align === 'center'
              ? 'text-center'
              : 'text-left';

          if (isCodeColumn) {
            return (
              <td key={column.id} className="border border-gray-300 px-2 py-1.5 text-xs" style={{ paddingLeft: `${10 + row.depth * 18}px` }}>
                {isGroup ? (
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        if (row.hasChildren) toggleGroup(record.id);
                      }}
                      className="inline-flex items-center justify-center w-5 h-5 rounded hover:bg-gray-200 disabled:opacity-30"
                      disabled={!row.hasChildren}
                    >
                      {row.expanded ? <FiChevronDown size={13} /> : <FiChevronRight size={13} />}
                    </button>
                    <FiFolder size={13} className="text-purple-600" />
                    <span className="font-mono font-semibold text-purple-700">{record.code || '-'}</span>
                  </div>
                ) : (
                  <span className="font-mono font-semibold text-gray-800">{record.code || '-'}</span>
                )}
              </td>
            );
          }

          if (isLabelColumn) {
            return (
              <td key={column.id} className="border border-gray-300 px-2 py-1.5">
                <div className={`text-xs truncate max-w-[360px] ${isGroup ? 'font-semibold text-gray-900' : 'font-medium text-gray-900'}`} title={record.name || record.display_name || record.label}>
                  {record.name || record.display_name || record.label || '-'}
                </div>
                {isGroup && (
                  <div className="text-[11px] text-gray-500">
                    {countAccountsDeep(record)} compte(s)
                  </div>
                )}
              </td>
            );
          }

          if (isNatureColumn) {
            return (
              <td key={column.id} className="border border-gray-300 px-2 py-1.5">
                {isGroup ? (
                  <Badge className="bg-purple-100 text-purple-700">Classe comptable</Badge>
                ) : (
                  <Badge className="bg-blue-100 text-blue-700">{getAccountTypeLabel(record)}</Badge>
                )}
              </td>
            );
          }

          if (isLettrageColumn) {
            return (
              <td key={column.id} className="border border-gray-300 px-2 py-1.5 text-center">
                {isGroup ? (
                  null
                ) : (
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      toggleAccountReconcile(record);
                    }}
                    disabled={reconcileSavingId === record.id}
                    className={`relative inline-flex h-5 w-11 items-center rounded-full transition-colors disabled:opacity-60 ${
                      record.reconcile ? 'bg-green-500' : 'bg-gray-300'
                    }`}
                    title="Cliquer pour changer le lettrage"
                  >
                    <span
                      className={`inline-block h-4 w-4 rounded-full bg-white shadow transform transition-transform ${
                        record.reconcile ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                    <span className={`absolute text-[9px] font-semibold ${record.reconcile ? 'left-1 text-white' : 'right-1 text-gray-700'}`}>
                      {reconcileSavingId === record.id ? '...' : (record.reconcile ? 'On' : 'Off')}
                    </span>
                  </button>
                )}
              </td>
            );
          }

          if (isStatusColumn) {
            return (
              <td key={column.id} className="border border-gray-300 px-2 py-1.5">
                <Badge className={record.active !== false ? 'bg-green-100 text-green-700' : 'bg-slate-200 text-slate-700'}>
                  {record.active !== false ? 'Actif' : 'Inactif'}
                </Badge>
              </td>
            );
          }

          return (
            <td key={column.id} className={`border border-gray-300 px-2 py-1.5 text-xs text-gray-700 ${alignClass}`}>
              {isGroup ? null : renderAccountColumnValue(record, column.id, selectedPlan)}
            </td>
          );
        })}
        <td className="border border-gray-300 px-2 py-1.5"></td>
      </tr>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-full mx-auto bg-white border border-gray-300">
        <div className="border-b border-gray-300 px-4 py-2">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-3 flex-shrink-0">
              <Tooltip text="Créer un nouveau plan comptable">
                <button
                  type="button"
                  onClick={() => navigate('/comptabilite/plans/new')}
                  className="h-8 px-3 bg-purple-600 text-white text-xs font-medium hover:bg-purple-700 transition-all rounded flex items-center gap-1"
                >
                  <FiPlus size={12} /> Nouveau
                </button>
              </Tooltip>

              <Tooltip text="Actualiser">
                <h1
                  className="text-lg font-bold text-gray-900 cursor-pointer hover:text-purple-600 transition-all"
                  onClick={refresh}
                >
                  Plan comptable
                </h1>
              </Tooltip>

              <div className="relative" ref={actionsMenuRef}>
                <Tooltip text="Actions">
                  <button
                    type="button"
                    onClick={() => setShowActionsMenu((prev) => !prev)}
                    className={`h-8 px-3 border border-gray-300 text-gray-700 text-xs hover:bg-gray-50 rounded flex items-center gap-1 ${
                      showActionsMenu ? 'bg-gray-50' : ''
                    }`}
                  >
                    <FiSettings size={13} /> Actions
                  </button>
                </Tooltip>

                {showActionsMenu && (
                  <div className="absolute left-0 mt-1 w-52 bg-white border border-gray-300 shadow-lg rounded z-50">
                    <button
                      type="button"
                      onClick={() => { setShowActionsMenu(false); navigate('/comptabilite/plans/new'); }}
                      className="w-full px-3 py-2 text-xs text-left hover:bg-gray-50 flex items-center gap-2"
                    >
                      <FiPlus size={12} /> Nouveau plan
                    </button>
                    <button
                      type="button"
                      onClick={() => { setShowActionsMenu(false); selectedPlan && navigate(`/comptabilite/plans/${selectedPlan.id}`); }}
                      disabled={!selectedPlan}
                      className="w-full px-3 py-2 text-xs text-left hover:bg-gray-50 flex items-center gap-2 border-t border-gray-100 disabled:opacity-50"
                    >
                      <FiEye size={12} /> Voir le plan
                    </button>
                    <button
                      type="button"
                      onClick={() => { setShowActionsMenu(false); selectedPlan && navigate(`/comptabilite/plans/${selectedPlan.id}/edit`); }}
                      disabled={!selectedPlan}
                      className="w-full px-3 py-2 text-xs text-left hover:bg-gray-50 flex items-center gap-2 border-t border-gray-100 disabled:opacity-50"
                    >
                      <FiEdit2 size={12} /> Modifier le plan
                    </button>
                    <button
                      type="button"
                      onClick={() => { setShowActionsMenu(false); expandAll(); }}
                      disabled={!selectedFramework}
                      className="w-full px-3 py-2 text-xs text-left hover:bg-gray-50 flex items-center gap-2 border-t border-gray-100 disabled:opacity-50"
                    >
                      <FiChevronDown size={12} /> Tout ouvrir
                    </button>
                    <button
                      type="button"
                      onClick={() => { setShowActionsMenu(false); collapseAll(); }}
                      disabled={!selectedFramework}
                      className="w-full px-3 py-2 text-xs text-left hover:bg-gray-50 flex items-center gap-2 border-t border-gray-100 disabled:opacity-50"
                    >
                      <FiChevronRight size={12} /> Tout fermer
                    </button>
                    <button
                      type="button"
                      onClick={() => { setShowActionsMenu(false); refresh(); }}
                      disabled={!selectedFramework}
                      className="w-full px-3 py-2 text-xs text-left hover:bg-gray-50 flex items-center gap-2 border-t border-gray-100 disabled:opacity-50"
                    >
                      <FiRefreshCw size={12} /> Actualiser
                    </button>
                  </div>
                )}
              </div>
            </div>

            <div className="flex-1 flex justify-center">
              <div className="relative w-full max-w-2xl">
                <div className="flex items-center flex-wrap border border-gray-300 rounded bg-white min-h-[38px] p-1">
                  {activeFilters.map((filter) => (
                    <span key={filter.id} className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs ${filter.color} m-0.5`}>
                      {filter.label}
                      {filter.id !== 'framework' && (
                        <button type="button" onClick={() => removeFilter(filter.id)} className="hover:text-red-600">
                          <FiX size={10} />
                        </button>
                      )}
                    </span>
                  ))}

                  <FiSearch size={14} className="text-gray-400 ml-1" />
                  <input
                    type="text"
                    value={searchText}
                    onChange={(event) => { setSearchText(event.target.value); setCurrentPage(1); }}
                    placeholder="Rechercher une classe comptable ou un compte..."
                    className="flex-1 px-2 py-1 text-sm focus:outline-none min-w-[180px]"
                    disabled={!selectedFramework}
                  />

                  {searchText && (
                    <button
                      type="button"
                      onClick={() => { setSearchText(''); setCurrentPage(1); }}
                      className="p-1 text-gray-400 hover:text-gray-700"
                    >
                      <FiX size={14} />
                    </button>
                  )}

                  <div className="relative" ref={filterMenuRef}>
                    <Tooltip text="Ajouter un filtre">
                      <button
                        type="button"
                        onClick={() => setShowFilterMenu((prev) => !prev)}
                        className={`p-1.5 rounded hover:bg-gray-100 ${showFilterMenu ? 'bg-gray-100' : ''}`}
                      >
                        <FiFilter size={14} className={activeFilters.length > 1 ? 'text-purple-600' : 'text-gray-400'} />
                      </button>
                    </Tooltip>

                    {showFilterMenu && (
                      <div className="absolute right-0 mt-1 w-72 bg-white border border-gray-300 shadow-lg rounded z-50">
                        <div className="p-2 border-b border-gray-200">
                          <p className="text-xs font-medium text-gray-700 mb-2">Référentiel</p>
                          <div className="max-h-40 overflow-y-auto space-y-1">
                            {frameworks.map((framework) => (
                              <button
                                type="button"
                                key={framework.id}
                                onClick={() => handleFrameworkChange(framework.id)}
                                className={`w-full text-left text-xs px-2 py-1 hover:bg-gray-100 rounded truncate ${
                                  String(framework.id) === String(selectedFramework) ? 'bg-purple-50 text-purple-700 font-medium' : ''
                                }`}
                              >
                                {getFrameworkLabel(framework)}
                              </button>
                            ))}
                          </div>
                        </div>

                        <div className="p-2 border-b border-gray-200">
                          <p className="text-xs font-medium text-gray-700 mb-2">Afficher</p>
                          {[
                            { value: 'all', label: 'Tout le plan' },
                            { value: 'group', label: 'Classes comptables seulement' },
                            { value: 'account', label: 'Comptes seulement' },
                          ].map((option) => (
                            <button
                              type="button"
                              key={option.value}
                              onClick={() => { setKindFilter(option.value); setCurrentPage(1); }}
                              className={`w-full text-left text-xs px-2 py-1 hover:bg-gray-100 rounded ${
                                kindFilter === option.value ? 'bg-purple-50 text-purple-700 font-medium' : ''
                              }`}
                            >
                              {option.label}
                            </button>
                          ))}
                        </div>

                        <div className="p-2 border-b border-gray-200">
                          <p className="text-xs font-medium text-gray-700 mb-2">Statut</p>
                          {[
                            { value: 'all', label: 'Tous' },
                            { value: 'active', label: 'Actifs' },
                            { value: 'inactive', label: 'Inactifs' },
                          ].map((option) => (
                            <button
                              type="button"
                              key={option.value}
                              onClick={() => { setStatusFilter(option.value); setCurrentPage(1); }}
                              className={`w-full text-left text-xs px-2 py-1 hover:bg-gray-100 rounded ${
                                statusFilter === option.value ? 'bg-purple-50 text-purple-700 font-medium' : ''
                              }`}
                            >
                              {option.label}
                            </button>
                          ))}
                        </div>

                        <div className="p-2">
                          <p className="text-xs font-medium text-gray-700 mb-2">Lettrage</p>
                          {[
                            { value: 'all', label: 'Tous' },
                            { value: 'yes', label: 'Lettrables' },
                            { value: 'no', label: 'Non lettrables' },
                          ].map((option) => (
                            <button
                              type="button"
                              key={option.value}
                              onClick={() => { setLettrableFilter(option.value); setCurrentPage(1); }}
                              className={`w-full text-left text-xs px-2 py-1 hover:bg-gray-100 rounded ${
                                lettrableFilter === option.value ? 'bg-purple-50 text-purple-700 font-medium' : ''
                              }`}
                            >
                              {option.label}
                            </button>
                          ))}
                        </div>

                        {(searchText || kindFilter !== 'all' || statusFilter !== 'all' || lettrableFilter !== 'all') && (
                          <div className="p-2 border-t border-gray-200">
                            <button
                              type="button"
                              onClick={clearAllFilters}
                              className="w-full text-xs text-red-600 hover:text-red-700 text-center py-1"
                            >
                              Effacer tous les filtres
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-shrink-0">
              <span className="text-xs text-gray-500">Afficher</span>
              <select
                value={itemsPerPage}
                onChange={(event) => { setItemsPerPage(Number(event.target.value)); setCurrentPage(1); }}
                className="h-8 px-2 border border-gray-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-purple-500"
              >
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
                <option value={200}>200</option>
              </select>
              <span className="text-xs text-gray-500">lignes</span>
            </div>
          </div>
        </div>

        {localError && (
          <div className="border-b border-red-200 bg-red-50 px-4 py-2 text-xs text-red-700 flex items-center gap-2">
            <FiAlertCircle size={14} />
            <span>{localError}</span>
            <button type="button" onClick={() => setLocalError(null)} className="ml-auto text-red-500 hover:text-red-700">
              <FiX size={12} />
            </button>
          </div>
        )}

        <div className="border-b border-gray-300 px-4 py-2 bg-gray-50 flex items-center gap-2 text-xs text-gray-600">
          <span>{selectedPlan ? getFrameworkLabel(selectedPlan) : 'Aucun plan sélectionné'}</span>
          {loadingAccounts && (
            <span className="inline-flex items-center gap-1 text-purple-600">
              <span className="w-3 h-3 border border-purple-600 border-t-transparent rounded-full animate-spin" />
              Chargement des comptes...
            </span>
          )}
          <span className="ml-auto">{totalGroups} classe(s) comptable(s) · {totalAccounts} compte(s)</span>
        </div>

        {!selectedFramework ? (
          <div className="p-10 text-center">
            <div className="mx-auto w-12 h-12 rounded-full border border-gray-300 flex items-center justify-center text-gray-400 mb-3">
              <FiFilter size={22} />
            </div>
            <p className="text-sm font-medium text-gray-700">Sélectionnez un référentiel comptable</p>
            <p className="text-xs text-gray-500 mt-1">Les classes et comptes du plan choisi apparaîtront ici.</p>
          </div>
        ) : (
          <>
            <div className="flex min-h-[320px]">
              <aside className="w-12 shrink-0 border-r border-gray-300 bg-gray-50 p-2">
                <div className="text-[11px] font-semibold text-gray-700 mb-2">Classes</div>
                <div className="flex flex-col items-center gap-1">
                  {classPrefixes.length === 0 ? (
                    <div className="text-[11px] text-gray-400">Aucune</div>
                  ) : classPrefixes.map((prefix) => {
                    const checked = selectedClassPrefixes.includes(prefix);
                    return (
                      <button
                        type="button"
                        key={prefix}
                        onClick={() => toggleClassPrefix(prefix)}
                        className={`w-7 h-6 rounded border text-[11px] font-semibold flex items-center justify-center transition-colors ${
                          checked
                            ? 'border-purple-600 bg-purple-600 text-white'
                            : 'border-gray-300 bg-white text-gray-700 hover:bg-purple-50 hover:text-purple-700'
                        }`}
                        title={`Afficher les comptes de la classe ${prefix}`}
                      >
                        {prefix}
                      </button>
                    );
                  })}
                </div>

                <div className="mt-3 pt-3 border-t border-gray-200">
                  <div className="text-[10px] text-gray-500 leading-tight">
                    Tapez un préfixe
                  </div>
                  {quickClassPrefix && (
                    <div className="mt-1 px-1.5 py-1 rounded bg-slate-100 text-slate-700 text-[11px] font-mono text-center">
                      {quickClassPrefix}
                    </div>
                  )}
                  {(selectedClassPrefixes.length > 0 || quickClassPrefix) && (
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedClassPrefixes([]);
                        setQuickClassPrefix('');
                        setCurrentPage(1);
                      }}
                      className="mt-2 w-full text-[11px] text-red-600 hover:text-red-700"
                    >
                      Effacer
                    </button>
                  )}
                </div>
              </aside>

              <div className="overflow-x-auto flex-1">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="bg-gray-100 border-b border-gray-300">
                    {visibleColumnList.map((column) => (
                      <th
                        key={column.id}
                        className={`border-r border-gray-300 px-2 py-1.5 text-xs font-medium text-gray-700 ${
                          column.align === 'right'
                            ? 'text-right'
                            : column.align === 'center'
                              ? 'text-center'
                              : 'text-left'
                        }`}
                        style={{ minWidth: column.minWidth || '120px' }}
                      >
                        {column.label}
                      </th>
                    ))}
                    <th className="border-l border-gray-300 px-2 py-1.5 w-10 text-center">
                      <Tooltip text="Choisir les colonnes à afficher">
                        <button
                          type="button"
                          className="plan-columns-menu-button p-1 rounded hover:bg-gray-200"
                          onClick={(event) => {
                            event.stopPropagation();
                            const rect = event.currentTarget.getBoundingClientRect();
                            setColumnsMenuPosition({
                              top: rect.bottom + window.scrollY + 5,
                              left: rect.right - 200,
                            });
                            setShowColumnsMenu((prev) => !prev);
                          }}
                        >
                          <FiMoreHorizontal size={16} className="text-gray-500" />
                        </button>
                      </Tooltip>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {(loading || loadingPlan) && flatRows.length === 0 ? (
                    <tr>
                      <td colSpan={visibleColumnCount + 1} className="border border-gray-300 p-8 text-center text-gray-500 text-sm">
                        <div className="w-8 h-8 border-2 border-purple-600 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
                        Chargement du plan comptable...
                      </td>
                    </tr>
                  ) : paginatedRows.length === 0 ? (
                    <tr>
                      <td colSpan={visibleColumnCount + 1} className="border border-gray-300 p-8 text-center text-gray-500 text-sm">
                        Aucune classe comptable ou compte trouvé pour ce plan.
                      </td>
                    </tr>
                  ) : (
                    paginatedRows.map(renderRow)
                  )}
                </tbody>
              </table>
              </div>
            </div>

            {showColumnsMenu && (
              <div
                id="plan-columns-menu"
                className="fixed bg-white border border-gray-300 shadow-lg rounded z-50"
                style={{ top: columnsMenuPosition.top, left: columnsMenuPosition.left, width: '210px' }}
              >
                <div className="p-2 border-b border-gray-200">
                  <p className="text-xs font-medium text-gray-700 mb-2">Colonnes à afficher</p>
                  {columns.map((column) => (
                    <label key={column.id} className="flex items-center gap-2 py-1 px-2 hover:bg-gray-50 rounded cursor-pointer">
                      <input
                        type="checkbox"
                        checked={visibleColumns[column.id]}
                        onChange={() => setVisibleColumns((prev) => ({ ...prev, [column.id]: !prev[column.id] }))}
                        className="w-3.5 h-3.5 cursor-pointer"
                      />
                      <span className="text-xs">{column.label}</span>
                    </label>
                  ))}
                </div>
                <div className="p-2">
                  <button
                    type="button"
                    onClick={() => {
                      const allTrue = {};
                      columns.forEach((column) => { allTrue[column.id] = true; });
                      setVisibleColumns(allTrue);
                    }}
                    className="w-full text-xs text-purple-600 hover:text-purple-700 text-center py-1"
                  >
                    Tout afficher
                  </button>
                </div>
              </div>
            )}

            <div className="border-t border-gray-300 px-4 py-2 bg-gray-50 flex items-center justify-between">
              <div className="text-xs text-gray-600">
                {totalRows === 0
                  ? '0 ligne'
                  : `${((currentPage - 1) * itemsPerPage) + 1}-${Math.min(currentPage * itemsPerPage, totalRows)} sur ${totalRows}`}
              </div>

              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setCurrentPage(1)}
                  disabled={currentPage === 1}
                  className="p-1 rounded border border-gray-300 disabled:opacity-50 hover:bg-white"
                >
                  <FiChevronsLeft size={14} />
                </button>
                <button
                  type="button"
                  onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
                  disabled={currentPage === 1}
                  className="p-1 rounded border border-gray-300 disabled:opacity-50 hover:bg-white"
                >
                  <FiChevronLeft size={14} />
                </button>
                <span className="px-3 text-xs text-gray-600">
                  Page {currentPage} / {totalPages}
                </span>
                <button
                  type="button"
                  onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
                  disabled={currentPage === totalPages}
                  className="p-1 rounded border border-gray-300 disabled:opacity-50 hover:bg-white"
                >
                  <FiChevronRight size={14} />
                </button>
                <button
                  type="button"
                  onClick={() => setCurrentPage(totalPages)}
                  disabled={currentPage === totalPages}
                  className="p-1 rounded border border-gray-300 disabled:opacity-50 hover:bg-white"
                >
                  <FiChevronsRight size={14} />
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default PlanList;
