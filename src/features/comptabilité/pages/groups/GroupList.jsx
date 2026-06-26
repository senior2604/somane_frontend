// src/features/comptabilite/pages/groups/GroupList.jsx
import { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  FiAlertCircle,
  FiChevronLeft,
  FiChevronRight,
  FiChevronsLeft,
  FiChevronsRight,
  FiEdit2,
  FiEye,
  FiFilter,
  FiFolder,
  FiGitBranch,
  FiMinusSquare,
  FiMoreHorizontal,
  FiPlus,
  FiPlusSquare,
  FiRefreshCw,
  FiSearch,
  FiSettings,
  FiTrash2,
  FiX,
} from 'react-icons/fi';

import useFrameworkStore from '../../../../stores/comptabilite/frameworkStore';
import useGroupStore from '../../../../stores/comptabilite/groupStore';

const FRAMEWORK_SESSION_KEY = 'group_list_selected_framework';

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

const normalizeText = (value) => String(value || '')
  .trim()
  .toLowerCase()
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '');

const getFrameworkLabel = (framework) => {
  if (!framework) return '';
  return [framework.code, framework.name].filter(Boolean).join(' - ');
};

const getRangeLabel = (group) => {
  if (group.code_prefix_start && group.code_prefix_end) {
    return `${group.code_prefix_start} a ${group.code_prefix_end}`;
  }
  return '-';
};

const getChildrenCount = (group) => {
  if (Array.isArray(group._treeChildren)) return group._treeChildren.length;
  if (Array.isArray(group.children)) return group.children.length;
  if (typeof group.children_count === 'number') return group.children_count;
  return 0;
};

const relationId = (value) => {
  if (!value) return null;
  if (typeof value === 'object') return value.id ?? value.value ?? null;
  return value;
};

const getParentLabel = (group, groups) => {
  if (!group.parent) return 'Racine';
  if (typeof group.parent === 'object') {
    return [group.parent.code, group.parent.name].filter(Boolean).join(' - ') || `Classe #${group.parent.id}`;
  }
  const parent = groups.find((item) => String(item.id) === String(group.parent));
  return parent ? `${parent.code} - ${parent.name}` : `Classe #${group.parent}`;
};

const collectGroups = (items, parentId = null, map = new Map()) => {
  (items || []).forEach((item) => {
    const id = relationId(item.id);
    if (!id) return;

    const existing = map.get(String(id)) || {};
    const ownParentId = relationId(item.parent) ?? parentId ?? existing._parentId ?? null;
    map.set(String(id), {
      ...existing,
      ...item,
      _parentId: ownParentId,
      _rawChildren: Array.isArray(item.children) ? item.children : [],
      _treeChildren: [],
    });

    if (Array.isArray(item.children) && item.children.length > 0) {
      collectGroups(item.children, id, map);
    }
  });

  return map;
};

const buildGroupTree = (items) => {
  const byId = collectGroups(items);

  byId.forEach((group) => {
    group._treeChildren = [];
  });

  const roots = [];
  byId.forEach((group) => {
    const parentId = relationId(group.parent) ?? group._parentId;
    const parent = parentId ? byId.get(String(parentId)) : null;
    if (parent && String(parent.id) !== String(group.id)) {
      parent._treeChildren.push(group);
    } else {
      roots.push(group);
    }
  });

  const sortTree = (nodes) => {
    nodes.sort((a, b) => {
      const sequenceDiff = (a.sequence ?? 0) - (b.sequence ?? 0);
      if (sequenceDiff !== 0) return sequenceDiff;
      return String(a.code || '').localeCompare(String(b.code || ''));
    });
    nodes.forEach((node) => sortTree(node._treeChildren));
    return nodes;
  };

  return sortTree(roots);
};

const flattenExpandedTree = (nodes, expandedIds, depth = 0) => {
  const rows = [];
  nodes.forEach((node) => {
    rows.push({ ...node, _depth: depth });
    if (expandedIds.has(String(node.id)) && node._treeChildren?.length > 0) {
      rows.push(...flattenExpandedTree(node._treeChildren, expandedIds, depth + 1));
    }
  });
  return rows;
};

function GroupList() {
  const navigate = useNavigate();
  const location = useLocation();
  const actionsMenuRef = useRef(null);
  const filterMenuRef = useRef(null);

  const { groups, loading, fetchGroups, deleteGroup } = useGroupStore();
  const { frameworks, fetchFrameworks } = useFrameworkStore();

  const initialFramework = () => {
    const fromUrl = new URLSearchParams(location.search).get('framework');
    if (fromUrl) return parseInt(fromUrl, 10);
    const saved = sessionStorage.getItem(FRAMEWORK_SESSION_KEY);
    return saved ? parseInt(saved, 10) : null;
  };

  const [selectedFramework, setSelectedFramework] = useState(initialFramework);
  const [searchText, setSearchText] = useState('');
  const [sortBy, setSortBy] = useState('code');
  const [showActionsMenu, setShowActionsMenu] = useState(false);
  const [showFilterMenu, setShowFilterMenu] = useState(false);
  const [showColumnsMenu, setShowColumnsMenu] = useState(false);
  const [columnsMenuPosition, setColumnsMenuPosition] = useState({ top: 0, left: 0 });
  const [activeRowId, setActiveRowId] = useState(null);
  const [selectedGroupIds, setSelectedGroupIds] = useState([]);
  const [expandedGroupIds, setExpandedGroupIds] = useState(new Set());
  const [localError, setLocalError] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [visibleColumns, setVisibleColumns] = useState({
    code: true,
    name: true,
    range: true,
    parent: true,
    children: true,
    sequence: true,
  });

  const columns = [
    { id: 'code', label: 'Code' },
    { id: 'name', label: 'Nom' },
    { id: 'range', label: 'Plage de comptes' },
    { id: 'parent', label: 'Parent' },
    { id: 'children', label: 'Sous-classes' },
    { id: 'sequence', label: 'Séq.' },
  ];

  const visibleColumnCount = Object.values(visibleColumns).filter(Boolean).length;

  const allGroups = useMemo(
    () => Array.from(collectGroups(groups).values()),
    [groups]
  );

  const selectedFw = useMemo(
    () => frameworks.find((framework) => String(framework.id) === String(selectedFramework)),
    [frameworks, selectedFramework]
  );

  const selectedGroup = useMemo(
    () => allGroups.find((group) => String(group.id) === String(activeRowId)),
    [allGroups, activeRowId]
  );

  const selectedRecords = useMemo(
    () => allGroups.filter((group) => selectedGroupIds.includes(group.id)),
    [allGroups, selectedGroupIds]
  );

  const frameworkOptions = frameworks.map((framework) => ({
    value: framework.id,
    label: getFrameworkLabel(framework),
  }));

  const loadGroups = () => {
    if (!selectedFramework) return;
    if (!frameworks.some((framework) => String(framework.id) === String(selectedFramework))) return;
    setLocalError(null);
    fetchGroups({ framework: selectedFramework }).catch(() => {});
  };

  useEffect(() => {
    fetchFrameworks();
  }, []);

  useEffect(() => {
    if (!frameworks.length) return;

    const selectedExists = selectedFramework && frameworks.some(
      (framework) => String(framework.id) === String(selectedFramework)
    );
    if (selectedExists) return;

    const nextFramework = frameworks[0]?.id ? parseInt(frameworks[0].id, 10) : null;
    setSelectedFramework(nextFramework);
    setCurrentPage(1);
    setActiveRowId(null);
    setSelectedGroupIds([]);
    setExpandedGroupIds(new Set());

    if (nextFramework) sessionStorage.setItem(FRAMEWORK_SESSION_KEY, String(nextFramework));
    else sessionStorage.removeItem(FRAMEWORK_SESSION_KEY);
  }, [frameworks, selectedFramework]);

  useEffect(() => {
    if (!frameworks.length) return;
    if (!selectedFramework) return;
    if (!frameworks.some((framework) => String(framework.id) === String(selectedFramework))) return;
    sessionStorage.setItem(FRAMEWORK_SESSION_KEY, String(selectedFramework));
    setCurrentPage(1);
    setActiveRowId(null);
    setSelectedGroupIds([]);
    setExpandedGroupIds(new Set());
    fetchGroups({ framework: selectedFramework }).catch(() => {});
  }, [selectedFramework, frameworks]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (actionsMenuRef.current && !actionsMenuRef.current.contains(event.target)) {
        setShowActionsMenu(false);
      }
      if (filterMenuRef.current && !filterMenuRef.current.contains(event.target)) {
        setShowFilterMenu(false);
      }
      const columnsMenuElement = document.getElementById('groups-columns-menu');
      if (columnsMenuElement && !columnsMenuElement.contains(event.target)) {
        const buttonElement = document.querySelector('.groups-columns-menu-button');
        if (buttonElement && !buttonElement.contains(event.target)) {
          setShowColumnsMenu(false);
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleFrameworkChange = (value) => {
    const nextValue = value ? parseInt(value, 10) : null;
    setSelectedFramework(nextValue);
    setShowFilterMenu(false);
    if (nextValue) {
      sessionStorage.setItem(FRAMEWORK_SESSION_KEY, String(nextValue));
    } else {
      sessionStorage.removeItem(FRAMEWORK_SESSION_KEY);
    }
  };

  const handleNew = () => navigate('/comptabilite/groups/new', { state: { frameworkId: selectedFramework } });
  const handleView = (record) => navigate(`/comptabilite/groups/${record.id}`);
  const handleEdit = (record) => navigate(`/comptabilite/groups/${record.id}/edit`, { state: { frameworkId: selectedFramework } });

  const getActionTarget = () => selectedRecords[0] || selectedGroup;

  const handleSelectedView = () => {
    const record = getActionTarget();
    if (!record) {
      setLocalError('Sélectionnez une classe.');
      return;
    }
    setShowActionsMenu(false);
    handleView(record);
  };

  const handleSelectedEdit = () => {
    const record = getActionTarget();
    if (!record) {
      setLocalError('Sélectionnez une classe.');
      return;
    }
    setShowActionsMenu(false);
    handleEdit(record);
  };

  const handleDeleteSelected = async () => {
    const records = selectedRecords.length > 0
      ? selectedRecords
      : (selectedGroup ? [selectedGroup] : []);

    if (records.length === 0) {
      setLocalError('Aucune classe sélectionnée.');
      return;
    }

    const label = records.length === 1
      ? `"${records[0].code} - ${records[0].name}"`
      : `${records.length} classes`;

    if (!window.confirm(`Supprimer ${label} ? Cette action est irréversible.`)) return;

    try {
      for (const record of records) {
        await deleteGroup(record.id);
      }
      setSelectedGroupIds([]);
      setActiveRowId(null);
      setShowActionsMenu(false);
      fetchGroups({ framework: selectedFramework }).catch(() => {});
    } catch (caughtError) {
      console.error('Erreur suppression classes:', caughtError);
      setLocalError('Erreur lors de la suppression.');
    }
  };

  const filteredGroups = useMemo(() => {
    const search = normalizeText(searchText);
    const tree = buildGroupTree(groups);

    const matchesSearch = (group) => {
      if (!search) return true;
      return normalizeText([
        group.code,
        group.name,
        group.code_prefix_start,
        group.code_prefix_end,
        getParentLabel(group, allGroups),
      ].filter(Boolean).join(' ')).includes(search);
    };

    const filterTree = (nodes) => nodes
      .map((node) => {
        const children = filterTree(node._treeChildren || []);
        const matches = matchesSearch(node);
        if (!matches && children.length === 0) return null;
        return { ...node, _treeChildren: children };
      })
      .filter(Boolean);

    const compareNodes = (a, b) => {
      if (sortBy === 'name') return String(a.name || '').localeCompare(String(b.name || ''));
      if (sortBy === '-name') return String(b.name || '').localeCompare(String(a.name || ''));
      if (sortBy === 'sequence') return (a.sequence ?? 0) - (b.sequence ?? 0);
      if (sortBy === '-sequence') return (b.sequence ?? 0) - (a.sequence ?? 0);
      if (sortBy === '-code') return String(b.code || '').localeCompare(String(a.code || ''));
      return String(a.code || '').localeCompare(String(b.code || ''));
    };

    const sortTree = (nodes) => nodes
      .sort(compareNodes)
      .map((node) => ({ ...node, _treeChildren: sortTree(node._treeChildren || []) }));

    return sortTree(search ? filterTree(tree) : tree);
  }, [allGroups, groups, searchText, sortBy]);

  const autoExpandedIds = useMemo(() => {
    if (!searchText.trim()) return expandedGroupIds;
    const ids = new Set(expandedGroupIds);
    const collectParents = (nodes) => {
      nodes.forEach((node) => {
        if (node._treeChildren?.length > 0) {
          ids.add(String(node.id));
          collectParents(node._treeChildren);
        }
      });
    };
    collectParents(filteredGroups);
    return ids;
  }, [expandedGroupIds, filteredGroups, searchText]);

  const visibleRows = useMemo(
    () => flattenExpandedTree(filteredGroups, autoExpandedIds),
    [autoExpandedIds, filteredGroups]
  );

  const total = visibleRows.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const paginatedGroups = visibleRows.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const goToPage = (page) => {
    setCurrentPage(Math.min(Math.max(1, page), totalPages));
  };

  const changePageSize = (nextPageSize) => {
    setPageSize(nextPageSize);
    setCurrentPage(1);
  };

  const handleSort = (field) => {
    const current = sortBy;
    const nextSort = current === field ? `-${field}` : current === `-${field}` ? '' : field;
    setSortBy(nextSort || 'code');
  };

  const getSortMark = (field) => {
    if (sortBy === field) return ' ↑';
    if (sortBy === `-${field}`) return ' ↓';
    return '';
  };

  const clearFilters = () => {
    setSearchText('');
    setSelectedFramework(null);
    sessionStorage.removeItem(FRAMEWORK_SESSION_KEY);
    setCurrentPage(1);
  };

  const toggleExpanded = (event, groupId) => {
    event.preventDefault();
    event.stopPropagation();
    setExpandedGroupIds((prev) => {
      const next = new Set(prev);
      const key = String(groupId);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-full mx-auto bg-white border border-gray-300">
        <div className="border-b border-gray-300 px-4 py-2">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 flex-shrink-0">
              <Tooltip text="Créer une nouvelle classe">
                <button
                  type="button"
                  onClick={handleNew}
                  disabled={!selectedFramework}
                  className="h-8 px-3 bg-purple-600 text-white text-xs font-medium hover:bg-purple-700 hover:scale-105 transition-all duration-200 rounded flex items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <FiPlus size={12} /> Nouvelle classe
                </button>
              </Tooltip>

              <Tooltip text="Actualiser la liste">
                <h1
                  className="text-lg font-bold text-gray-900 cursor-pointer hover:text-purple-600 hover:scale-105 transition-all duration-200"
                  onClick={loadGroups}
                >
                  Classes / Groupes
                </h1>
              </Tooltip>

              <div className="relative" ref={actionsMenuRef}>
                <Tooltip text="Menu des actions">
                  <button
                    type="button"
                    onClick={() => setShowActionsMenu((prev) => !prev)}
                    className="w-8 h-8 rounded-full border border-gray-300 text-gray-700 hover:bg-gray-50 hover:scale-110 hover:shadow-md active:scale-90 transition-all duration-200 flex items-center justify-center"
                  >
                    <FiSettings size={14} />
                  </button>
                </Tooltip>

                {showActionsMenu && (
                  <div className="absolute left-0 mt-1 w-52 bg-white border border-gray-300 shadow-lg rounded z-50">
                    <button
                      type="button"
                      onClick={handleSelectedView}
                      disabled={!activeRowId && selectedGroupIds.length === 0}
                      className="w-full px-3 py-2 text-xs text-left hover:bg-gray-50 flex items-center gap-2 disabled:opacity-50"
                    >
                      <FiEye size={12} /> Voir
                    </button>
                    <button
                      type="button"
                      onClick={handleSelectedEdit}
                      disabled={!activeRowId && selectedGroupIds.length === 0}
                      className="w-full px-3 py-2 text-xs text-left hover:bg-gray-50 flex items-center gap-2 border-t border-gray-100 disabled:opacity-50"
                    >
                      <FiEdit2 size={12} /> Modifier
                    </button>
                    <button
                      type="button"
                      onClick={handleDeleteSelected}
                      disabled={!activeRowId && selectedGroupIds.length === 0}
                      className="w-full px-3 py-2 text-xs text-left hover:bg-red-50 hover:text-red-600 flex items-center gap-2 border-t border-gray-100 disabled:opacity-50"
                    >
                      <FiTrash2 size={12} /> Supprimer
                    </button>
                    <button
                      type="button"
                      onClick={() => { setShowActionsMenu(false); loadGroups(); }}
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
                  {selectedFw && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-purple-100 text-purple-700 m-0.5">
                      {selectedFw.code || selectedFw.name}
                      <button type="button" onClick={() => handleFrameworkChange(null)} className="hover:text-red-600">
                        <FiX size={10} />
                      </button>
                    </span>
                  )}

                  <FiSearch size={14} className="text-gray-400 ml-1" />
                  <input
                    type="text"
                    value={searchText}
                    onChange={(event) => {
                      setSearchText(event.target.value);
                      setCurrentPage(1);
                    }}
                    placeholder="Rechercher code, nom, parent..."
                    className="flex-1 px-2 py-1 text-sm focus:outline-none min-w-[160px]"
                    disabled={!selectedFramework}
                  />

                  {searchText && (
                    <button
                      type="button"
                      onClick={() => {
                        setSearchText('');
                        setCurrentPage(1);
                      }}
                      className="p-1 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-700"
                    >
                      <FiX size={14} />
                    </button>
                  )}

                  <div className="relative" ref={filterMenuRef}>
                    <Tooltip text="Choisir un référentiel">
                      <button
                        type="button"
                        onClick={() => setShowFilterMenu((prev) => !prev)}
                        className={`p-1.5 rounded hover:bg-gray-100 ${showFilterMenu ? 'bg-gray-100' : ''}`}
                      >
                        <FiFilter size={14} className={selectedFramework ? 'text-purple-600' : 'text-gray-400'} />
                      </button>
                    </Tooltip>

                    {showFilterMenu && (
                      <div className="absolute right-0 mt-1 w-72 bg-white border border-gray-300 shadow-lg rounded z-50">
                        <div className="p-2 border-b border-gray-200">
                          <p className="text-xs font-medium text-gray-700 mb-2">Référentiel comptable</p>
                          <div className="max-h-56 overflow-y-auto space-y-1">
                            {frameworkOptions.length === 0 ? (
                              <div className="text-xs text-gray-400 px-2 py-1">Aucun référentiel</div>
                            ) : frameworkOptions.map((framework) => (
                              <button
                                type="button"
                                key={framework.value}
                                onClick={() => handleFrameworkChange(framework.value)}
                                className={`w-full text-left text-xs px-2 py-1 hover:bg-gray-100 rounded truncate ${
                                  String(framework.value) === String(selectedFramework) ? 'bg-purple-50 text-purple-700 font-medium' : ''
                                }`}
                              >
                                {framework.label}
                              </button>
                            ))}
                          </div>
                        </div>
                        {(selectedFramework || searchText) && (
                          <div className="p-2">
                            <button
                              type="button"
                              onClick={clearFilters}
                              className="w-full text-xs text-red-600 hover:text-red-700 text-center py-1"
                            >
                              Effacer les filtres
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
                value={pageSize}
                onChange={(event) => changePageSize(Number(event.target.value))}
                className="h-8 px-2 border border-gray-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-purple-500"
              >
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
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

        {selectedGroupIds.length > 0 && (
          <div className="border-b border-gray-300 px-4 py-2 bg-gray-50 flex items-center gap-2">
            <span className="text-xs text-gray-600">{selectedGroupIds.length} classe(s) sélectionnée(s)</span>
          </div>
        )}

        {!selectedFramework ? (
          <div className="p-10 text-center">
            <div className="mx-auto w-12 h-12 rounded-full border border-gray-300 flex items-center justify-center text-gray-400 mb-3">
              <FiFilter size={22} />
            </div>
            <p className="text-sm font-medium text-gray-700">Sélectionnez un référentiel comptable</p>
            <p className="text-xs text-gray-500 mt-1">Les classes du plan choisi apparaîtront ici.</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="bg-gray-100 border-b border-gray-300">
                    <th className="border-r border-gray-300 px-2 py-1.5 w-8 text-center">
                      <input
                        type="checkbox"
                        checked={selectedGroupIds.length === paginatedGroups.length && paginatedGroups.length > 0}
                        onChange={(event) => {
                          if (event.target.checked) {
                            setSelectedGroupIds(paginatedGroups.map((group) => group.id));
                          } else {
                            setSelectedGroupIds([]);
                          }
                        }}
                        className="w-3.5 h-3.5 cursor-pointer"
                      />
                    </th>
                    {visibleColumns.code && (
                      <th
                        className="border-r border-gray-300 px-2 py-1.5 text-left text-xs font-medium text-gray-700 min-w-[110px] cursor-pointer hover:bg-gray-200"
                        onClick={() => handleSort('code')}
                      >
                        Code{getSortMark('code')}
                      </th>
                    )}
                    {visibleColumns.name && (
                      <th
                        className="border-r border-gray-300 px-2 py-1.5 text-left text-xs font-medium text-gray-700 min-w-[260px] cursor-pointer hover:bg-gray-200"
                        onClick={() => handleSort('name')}
                      >
                        Nom{getSortMark('name')}
                      </th>
                    )}
                    {visibleColumns.range && (
                      <th className="border-r border-gray-300 px-2 py-1.5 text-left text-xs font-medium text-gray-700 min-w-[170px]">
                        Plage de comptes
                      </th>
                    )}
                    {visibleColumns.parent && (
                      <th className="border-r border-gray-300 px-2 py-1.5 text-left text-xs font-medium text-gray-700 min-w-[180px]">
                        Parent
                      </th>
                    )}
                    {visibleColumns.children && (
                      <th className="border-r border-gray-300 px-2 py-1.5 text-center text-xs font-medium text-gray-700 min-w-[105px]">
                        Sous-classes
                      </th>
                    )}
                    {visibleColumns.sequence && (
                      <th
                        className="border-r border-gray-300 px-2 py-1.5 text-center text-xs font-medium text-gray-700 min-w-[70px] cursor-pointer hover:bg-gray-200"
                        onClick={() => handleSort('sequence')}
                      >
                        Séq.{getSortMark('sequence')}
                      </th>
                    )}
                    <th className="border-l border-gray-300 px-2 py-1.5 w-10 text-center">
                      <Tooltip text="Choisir les colonnes à afficher">
                        <button
                          type="button"
                          className="groups-columns-menu-button p-1 rounded hover:bg-gray-200"
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
                  {loading && paginatedGroups.length === 0 ? (
                    <tr>
                      <td colSpan={visibleColumnCount + 2} className="border border-gray-300 p-8 text-center text-gray-500 text-sm">
                        <div className="w-8 h-8 border-2 border-purple-600 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
                        Chargement...
                      </td>
                    </tr>
                  ) : paginatedGroups.length === 0 ? (
                    <tr>
                      <td colSpan={visibleColumnCount + 2} className="border border-gray-300 p-8 text-center text-gray-500 text-sm">
                        Aucune classe
                      </td>
                    </tr>
                  ) : paginatedGroups.map((group) => (
                    <tr
                      key={group.id}
                      className={`hover:bg-gray-50 cursor-pointer transition-colors ${activeRowId === group.id ? 'bg-purple-50' : ''}`}
                      onClick={() => setActiveRowId(group.id)}
                      onDoubleClick={() => handleView(group)}
                    >
                      <td className="border border-gray-300 px-2 py-1.5 text-center" onClick={(event) => event.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={selectedGroupIds.includes(group.id)}
                          onChange={(event) => {
                            if (event.target.checked) {
                              setSelectedGroupIds((prev) => [...prev, group.id]);
                            } else {
                              setSelectedGroupIds((prev) => prev.filter((groupId) => groupId !== group.id));
                            }
                          }}
                          className="w-3.5 h-3.5 cursor-pointer"
                        />
                      </td>
                      {visibleColumns.code && (
                        <td className="border border-gray-300 px-2 py-1.5 text-xs">
                          <div className="flex items-center gap-2" style={{ paddingLeft: `${(group._depth || 0) * 18}px` }}>
                            {getChildrenCount(group) > 0 ? (
                              <button
                                type="button"
                                onClick={(event) => toggleExpanded(event, group.id)}
                                className="text-gray-500 hover:text-purple-700"
                                title={autoExpandedIds.has(String(group.id)) ? 'Fermer' : 'Ouvrir'}
                              >
                                {autoExpandedIds.has(String(group.id)) ? (
                                  <FiMinusSquare size={14} />
                                ) : (
                                  <FiPlusSquare size={14} />
                                )}
                              </button>
                            ) : (
                              <span className="w-[14px] inline-block" />
                            )}
                            <FiFolder size={14} className={getChildrenCount(group) > 0 ? 'text-amber-600' : 'text-gray-500'} />
                            <span className="font-mono font-semibold text-purple-700">{group.code || '-'}</span>
                          </div>
                        </td>
                      )}
                      {visibleColumns.name && (
                        <td className="border border-gray-300 px-2 py-1.5">
                          <div className="text-xs font-medium text-gray-900 truncate max-w-[320px]" title={group.name}>
                            {group.name || '-'}
                          </div>
                          {group.note && (
                            <div className="text-[11px] text-gray-500 truncate max-w-[320px]" title={group.note}>
                              {group.note}
                            </div>
                          )}
                        </td>
                      )}
                      {visibleColumns.range && (
                        <td className="border border-gray-300 px-2 py-1.5">
                          {getRangeLabel(group) !== '-' ? (
                            <Badge className="bg-blue-100 text-blue-700 font-mono">{getRangeLabel(group)}</Badge>
                          ) : (
                            <span className="text-xs text-gray-400">-</span>
                          )}
                        </td>
                      )}
                      {visibleColumns.parent && (
                        <td className="border border-gray-300 px-2 py-1.5">
                          <Badge className={group.parent ? 'bg-slate-100 text-slate-700' : 'bg-green-100 text-green-700'}>
                            <FiGitBranch size={10} className="mr-1" />
                            {getParentLabel(group, allGroups)}
                          </Badge>
                        </td>
                      )}
                      {visibleColumns.children && (
                        <td className="border border-gray-300 px-2 py-1.5 text-center">
                          <Badge className={getChildrenCount(group) > 0 ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}>
                            {getChildrenCount(group)}
                          </Badge>
                        </td>
                      )}
                      {visibleColumns.sequence && (
                        <td className="border border-gray-300 px-2 py-1.5 text-center text-xs text-gray-700 font-mono">
                          {group.sequence ?? 0}
                        </td>
                      )}
                      <td className="border border-gray-300 px-2 py-1.5"></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {showColumnsMenu && (
              <div
                id="groups-columns-menu"
                className="fixed bg-white border border-gray-300 shadow-lg rounded z-50"
                style={{ top: columnsMenuPosition.top, left: columnsMenuPosition.left, width: '200px' }}
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
                  <button
                    type="button"
                    onClick={() => {
                      const allFalse = {};
                      columns.forEach((column) => { allFalse[column.id] = false; });
                      setVisibleColumns(allFalse);
                    }}
                    className="w-full text-xs text-gray-500 hover:text-gray-600 text-center py-1"
                  >
                    Tout masquer
                  </button>
                </div>
              </div>
            )}

            <div className="border-t border-gray-300 px-4 py-2 flex items-center justify-between">
              <div className="text-xs text-gray-500">
                Total : {total} classe(s)
              </div>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => goToPage(1)}
                  disabled={currentPage === 1}
                  className="p-1 rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <FiChevronsLeft size={14} />
                </button>
                <button
                  type="button"
                  onClick={() => goToPage(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="p-1 rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <FiChevronLeft size={14} />
                </button>
                <span className="px-2 text-xs text-gray-700">
                  {currentPage} / {totalPages}
                </span>
                <button
                  type="button"
                  onClick={() => goToPage(currentPage + 1)}
                  disabled={currentPage >= totalPages}
                  className="p-1 rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <FiChevronRight size={14} />
                </button>
                <button
                  type="button"
                  onClick={() => goToPage(totalPages)}
                  disabled={currentPage >= totalPages}
                  className="p-1 rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
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

export { GroupList };
export default GroupList;
