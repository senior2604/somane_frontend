// src/features/comptabilite/pages/frameworks/FrameworkList.jsx
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FiAlertCircle,
  FiChevronLeft,
  FiChevronRight,
  FiChevronsLeft,
  FiChevronsRight,
  FiEdit2,
  FiEye,
  FiFilter,
  FiMoreHorizontal,
  FiPlus,
  FiRefreshCw,
  FiSearch,
  FiSettings,
  FiTrash2,
  FiX,
} from 'react-icons/fi';
import useFrameworkStore from '../../../../stores/comptabilite/frameworkStore';

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

const getCountryLabel = (framework) => {
  const country = framework.country;
  if (country && typeof country === 'object') {
    return country.nom || country.name || country.label || country.code || '-';
  }
  return framework.country_name || framework.country_label || framework.country_code || country || '-';
};

const getCompanyCount = (framework) => {
  const company = framework.company;
  if (Array.isArray(company)) return company.length;
  if (Array.isArray(framework.company_ids)) return framework.company_ids.length;
  if (Array.isArray(framework.company_names)) return framework.company_names.length;
  return 0;
};

const getScopeLabel = (framework) => {
  const count = getCompanyCount(framework);
  if (!count) return 'Toutes les entités';
  return `${count} entité${count > 1 ? 's' : ''}`;
};

const getLengthLabel = (framework) => (
  framework.account_code_length ||
  framework.code_length ||
  framework.length ||
  '-'
);

function FrameworkList() {
  const navigate = useNavigate();
  const actionsMenuRef = useRef(null);
  const filterMenuRef = useRef(null);

  const {
    frameworks,
    loading,
    error,
    fetchFrameworks,
    deleteFramework,
    pagination,
  } = useFrameworkStore();

  const [searchText, setSearchText] = useState('');
  const [activeStatus, setActiveStatus] = useState(null);
  const [showActionsMenu, setShowActionsMenu] = useState(false);
  const [showFilterMenu, setShowFilterMenu] = useState(false);
  const [showColumnsMenu, setShowColumnsMenu] = useState(false);
  const [columnsMenuPosition, setColumnsMenuPosition] = useState({ top: 0, left: 0 });
  const [activeRowId, setActiveRowId] = useState(null);
  const [selectedFrameworkIds, setSelectedFrameworkIds] = useState([]);
  const [localError, setLocalError] = useState(null);
  const [visibleColumns, setVisibleColumns] = useState({
    code: true,
    name: true,
    version: true,
    country: true,
    scope: true,
    length: true,
    status: true,
  });
  const [query, setQuery] = useState({
    page: pagination?.current || 1,
    pageSize: pagination?.pageSize || 20,
    ordering: '',
  });

  const columns = [
    { id: 'code', label: 'Code' },
    { id: 'name', label: 'Nom du plan' },
    { id: 'version', label: 'Version' },
    { id: 'country', label: 'Pays' },
    { id: 'scope', label: 'Portée' },
    { id: 'length', label: 'Longueur' },
    { id: 'status', label: 'Statut' },
  ];

  const visibleColumnCount = Object.values(visibleColumns).filter(Boolean).length;
  const total = pagination?.total || frameworks.length || 0;
  const currentPage = pagination?.current || query.page || 1;
  const pageSize = pagination?.pageSize || query.pageSize || 20;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const selectedFramework = useMemo(
    () => frameworks.find((framework) => String(framework.id) === String(activeRowId)),
    [frameworks, activeRowId]
  );

  const selectedRecords = useMemo(
    () => frameworks.filter((framework) => selectedFrameworkIds.includes(framework.id)),
    [frameworks, selectedFrameworkIds]
  );

  const buildParams = useCallback((overrides = {}) => {
    const params = {
      page: overrides.page ?? query.page,
      page_size: overrides.pageSize ?? query.pageSize,
    };

    const search = overrides.search ?? searchText;
    const active = overrides.activeStatus ?? activeStatus;
    const ordering = overrides.ordering ?? query.ordering;

    if (search.trim()) params.search = search.trim();
    if (active !== null && active !== undefined) params.active = active;
    if (ordering) params.ordering = ordering;

    return params;
  }, [activeStatus, query.ordering, query.page, query.pageSize, searchText]);

  const loadFrameworks = useCallback(async (overrides = {}) => {
    try {
      setLocalError(null);
      await fetchFrameworks(buildParams(overrides));
    } catch (caughtError) {
      console.error('Erreur chargement plans comptables:', caughtError);
      setLocalError('Impossible de charger les plans comptables.');
    }
  }, [buildParams, fetchFrameworks]);

  useEffect(() => {
    loadFrameworks();
  }, [loadFrameworks]);

  useEffect(() => {
    if (error) setLocalError(error);
  }, [error]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (actionsMenuRef.current && !actionsMenuRef.current.contains(event.target)) {
        setShowActionsMenu(false);
      }
      if (filterMenuRef.current && !filterMenuRef.current.contains(event.target)) {
        setShowFilterMenu(false);
      }
      const columnsMenuElement = document.getElementById('frameworks-columns-menu');
      if (columnsMenuElement && !columnsMenuElement.contains(event.target)) {
        const buttonElement = document.querySelector('.frameworks-columns-menu-button');
        if (buttonElement && !buttonElement.contains(event.target)) {
          setShowColumnsMenu(false);
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const updateQueryAndLoad = (nextQuery = {}) => {
    const merged = { ...query, ...nextQuery };
    const loadOverrides = {
      page: merged.page,
      pageSize: merged.pageSize,
      ordering: merged.ordering,
    };

    if (Object.prototype.hasOwnProperty.call(nextQuery, 'search')) {
      loadOverrides.search = nextQuery.search;
    }
    if (Object.prototype.hasOwnProperty.call(nextQuery, 'activeStatus')) {
      loadOverrides.activeStatus = nextQuery.activeStatus;
    }

    setQuery(merged);
    loadFrameworks(loadOverrides);
  };

  const resetPageAndLoad = (next = {}) => {
    updateQueryAndLoad({ page: 1, ...next });
  };

  const handleSearchSubmit = () => {
    resetPageAndLoad();
  };

  const handleNew = () => navigate('/comptabilite/frameworks/new');
  const handleView = (record) => navigate(`/comptabilite/frameworks/${record.id}`);
  const handleEdit = (record) => navigate(`/comptabilite/frameworks/${record.id}/edit`);

  const handleSelectedView = () => {
    const record = selectedRecords[0] || selectedFramework;
    if (!record) {
      setLocalError('Sélectionnez un plan comptable.');
      return;
    }
    setShowActionsMenu(false);
    handleView(record);
  };

  const handleSelectedEdit = () => {
    const record = selectedRecords[0] || selectedFramework;
    if (!record) {
      setLocalError('Sélectionnez un plan comptable.');
      return;
    }
    setShowActionsMenu(false);
    handleEdit(record);
  };

  const handleDeleteSelected = async () => {
    const records = selectedRecords.length > 0
      ? selectedRecords
      : (selectedFramework ? [selectedFramework] : []);

    if (records.length === 0) {
      setLocalError('Aucun plan comptable sélectionné.');
      return;
    }

    const label = records.length === 1
      ? `"${records[0].name}"`
      : `${records.length} plans comptables`;

    if (!window.confirm(`Supprimer ${label} ?`)) return;

    try {
      for (const record of records) {
        await deleteFramework(record.id);
      }
      setSelectedFrameworkIds([]);
      setActiveRowId(null);
      setShowActionsMenu(false);
      await loadFrameworks();
    } catch (caughtError) {
      console.error('Erreur suppression plan comptable:', caughtError);
      setLocalError('Erreur lors de la suppression.');
    }
  };

  const changePageSize = (nextPageSize) => {
    updateQueryAndLoad({ page: 1, pageSize: nextPageSize });
  };

  const goToPage = (page) => {
    updateQueryAndLoad({ page: Math.min(Math.max(1, page), totalPages) });
  };

  const toggleStatusFilter = (value) => {
    const nextValue = activeStatus === value ? null : value;
    setActiveStatus(nextValue);
    setShowFilterMenu(false);
    resetPageAndLoad({ activeStatus: nextValue });
  };

  const handleSort = (field) => {
    const current = query.ordering;
    const nextOrdering = current === field ? `-${field}` : current === `-${field}` ? '' : field;
    updateQueryAndLoad({ page: 1, ordering: nextOrdering });
  };

  const getSortMark = (field) => {
    if (query.ordering === field) return ' ↑';
    if (query.ordering === `-${field}`) return ' ↓';
    return '';
  };

  const filteredFrameworks = useMemo(() => {
    return frameworks.filter((framework) => {
      if (activeStatus === null) return true;
      return Boolean(framework.active) === Boolean(activeStatus);
    });
  }, [activeStatus, frameworks]);

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-full mx-auto bg-white border border-gray-300">
        <div className="border-b border-gray-300 px-4 py-2">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 flex-shrink-0">
              <Tooltip text="Créer un nouveau plan comptable">
                <button
                  type="button"
                  onClick={handleNew}
                  className="h-8 px-3 bg-purple-600 text-white text-xs font-medium hover:bg-purple-700 hover:scale-105 transition-all duration-200 rounded flex items-center gap-1"
                >
                  <FiPlus size={12} /> Nouveau plan
                </button>
              </Tooltip>

              <Tooltip text="Actualiser la liste">
                <h1
                  className="text-lg font-bold text-gray-900 cursor-pointer hover:text-purple-600 hover:scale-105 transition-all duration-200"
                  onClick={() => loadFrameworks()}
                >
                  Plans comptables
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
                      disabled={!activeRowId && selectedFrameworkIds.length === 0}
                      className="w-full px-3 py-2 text-xs text-left hover:bg-gray-50 flex items-center gap-2 disabled:opacity-50"
                    >
                      <FiEye size={12} /> Voir
                    </button>
                    <button
                      type="button"
                      onClick={handleSelectedEdit}
                      disabled={!activeRowId && selectedFrameworkIds.length === 0}
                      className="w-full px-3 py-2 text-xs text-left hover:bg-gray-50 flex items-center gap-2 border-t border-gray-100 disabled:opacity-50"
                    >
                      <FiEdit2 size={12} /> Modifier
                    </button>
                    <button
                      type="button"
                      onClick={handleDeleteSelected}
                      disabled={!activeRowId && selectedFrameworkIds.length === 0}
                      className="w-full px-3 py-2 text-xs text-left hover:bg-red-50 hover:text-red-600 flex items-center gap-2 border-t border-gray-100 disabled:opacity-50"
                    >
                      <FiTrash2 size={12} /> Supprimer
                    </button>
                    <button
                      type="button"
                      onClick={() => { setShowActionsMenu(false); loadFrameworks(); }}
                      className="w-full px-3 py-2 text-xs text-left hover:bg-gray-50 flex items-center gap-2 border-t border-gray-100"
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
                  {activeStatus !== null && (
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs m-0.5 ${
                      activeStatus ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
                    }`}>
                      {activeStatus ? 'Actif' : 'Inactif'}
                      <button
                        type="button"
                        onClick={() => {
                          setActiveStatus(null);
                          resetPageAndLoad({ activeStatus: null });
                        }}
                        className="hover:text-red-600"
                      >
                        <FiX size={10} />
                      </button>
                    </span>
                  )}

                  <FiSearch size={14} className="text-gray-400 ml-1" />
                  <input
                    type="text"
                    value={searchText}
                    onChange={(event) => setSearchText(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') handleSearchSubmit();
                    }}
                    placeholder="Rechercher un code ou un nom..."
                    className="flex-1 px-2 py-1 text-sm focus:outline-none min-w-[160px]"
                  />

                  {searchText && (
                    <button
                      type="button"
                      onClick={() => {
                        setSearchText('');
                        resetPageAndLoad({ search: '' });
                      }}
                      className="p-1 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-700"
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
                        <FiFilter size={14} className={activeStatus !== null ? 'text-purple-600' : 'text-gray-400'} />
                      </button>
                    </Tooltip>

                    {showFilterMenu && (
                      <div className="absolute right-0 mt-1 w-56 bg-white border border-gray-300 shadow-lg rounded z-50">
                        <div className="p-2">
                          <p className="text-xs font-medium text-gray-700 mb-2">Statut</p>
                          <button
                            type="button"
                            onClick={() => toggleStatusFilter(true)}
                            className={`w-full text-left text-xs px-2 py-1 hover:bg-gray-100 rounded ${
                              activeStatus === true ? 'bg-green-50 text-green-700 font-medium' : ''
                            }`}
                          >
                            Actif
                          </button>
                          <button
                            type="button"
                            onClick={() => toggleStatusFilter(false)}
                            className={`w-full text-left text-xs px-2 py-1 hover:bg-gray-100 rounded ${
                              activeStatus === false ? 'bg-gray-100 text-gray-700 font-medium' : ''
                            }`}
                          >
                            Inactif
                          </button>
                          {(activeStatus !== null || searchText) && (
                            <button
                              type="button"
                              onClick={() => {
                                setSearchText('');
                                setActiveStatus(null);
                                setShowFilterMenu(false);
                                resetPageAndLoad({ search: '', activeStatus: null });
                              }}
                              className="w-full text-xs text-red-600 hover:text-red-700 text-center py-1 mt-2 border-t border-gray-100"
                            >
                              Effacer les filtres
                            </button>
                          )}
                        </div>
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
                <option value={20}>20</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
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

        {selectedFrameworkIds.length > 0 && (
          <div className="border-b border-gray-300 px-4 py-2 bg-gray-50 flex items-center gap-2">
            <span className="text-xs text-gray-600">{selectedFrameworkIds.length} plan(s) sélectionné(s)</span>
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="bg-gray-100 border-b border-gray-300">
                <th className="border-r border-gray-300 px-2 py-1.5 w-8 text-center">
                  <input
                    type="checkbox"
                    checked={selectedFrameworkIds.length === filteredFrameworks.length && filteredFrameworks.length > 0}
                    onChange={(event) => {
                      if (event.target.checked) {
                        setSelectedFrameworkIds(filteredFrameworks.map((framework) => framework.id));
                      } else {
                        setSelectedFrameworkIds([]);
                      }
                    }}
                    className="w-3.5 h-3.5 cursor-pointer"
                  />
                </th>
                {visibleColumns.code && (
                  <th
                    className="border-r border-gray-300 px-2 py-1.5 text-left text-xs font-medium text-gray-700 min-w-[120px] cursor-pointer hover:bg-gray-200"
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
                    Nom du plan{getSortMark('name')}
                  </th>
                )}
                {visibleColumns.version && (
                  <th className="border-r border-gray-300 px-2 py-1.5 text-left text-xs font-medium text-gray-700 min-w-[100px]">
                    Version
                  </th>
                )}
                {visibleColumns.country && (
                  <th className="border-r border-gray-300 px-2 py-1.5 text-left text-xs font-medium text-gray-700 min-w-[140px]">
                    Pays
                  </th>
                )}
                {visibleColumns.scope && (
                  <th className="border-r border-gray-300 px-2 py-1.5 text-left text-xs font-medium text-gray-700 min-w-[150px]">
                    Portée
                  </th>
                )}
                {visibleColumns.length && (
                  <th className="border-r border-gray-300 px-2 py-1.5 text-center text-xs font-medium text-gray-700 min-w-[90px]">
                    Longueur
                  </th>
                )}
                {visibleColumns.status && (
                  <th className="border-r border-gray-300 px-2 py-1.5 text-left text-xs font-medium text-gray-700 min-w-[90px]">
                    Statut
                  </th>
                )}
                <th className="border-l border-gray-300 px-2 py-1.5 w-10 text-center">
                  <Tooltip text="Choisir les colonnes à afficher">
                    <button
                      type="button"
                      className="frameworks-columns-menu-button p-1 rounded hover:bg-gray-200"
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
              {loading && filteredFrameworks.length === 0 ? (
                <tr>
                  <td colSpan={visibleColumnCount + 2} className="border border-gray-300 p-8 text-center text-gray-500 text-sm">
                    <div className="w-8 h-8 border-2 border-purple-600 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
                    Chargement...
                  </td>
                </tr>
              ) : filteredFrameworks.length === 0 ? (
                <tr>
                  <td colSpan={visibleColumnCount + 2} className="border border-gray-300 p-8 text-center text-gray-500 text-sm">
                    Aucun plan comptable
                  </td>
                </tr>
              ) : filteredFrameworks.map((framework) => (
                <tr
                  key={framework.id}
                  className={`hover:bg-gray-50 cursor-pointer transition-colors ${activeRowId === framework.id ? 'bg-purple-50' : ''}`}
                  onClick={() => setActiveRowId(framework.id)}
                  onDoubleClick={() => handleView(framework)}
                >
                  <td className="border border-gray-300 px-2 py-1.5 text-center" onClick={(event) => event.stopPropagation()}>
                    <input
                      type="checkbox"
                      checked={selectedFrameworkIds.includes(framework.id)}
                      onChange={(event) => {
                        if (event.target.checked) {
                          setSelectedFrameworkIds((prev) => [...prev, framework.id]);
                        } else {
                          setSelectedFrameworkIds((prev) => prev.filter((id) => id !== framework.id));
                        }
                      }}
                      className="w-3.5 h-3.5 cursor-pointer"
                    />
                  </td>
                  {visibleColumns.code && (
                    <td className="border border-gray-300 px-2 py-1.5 text-xs">
                      <span className="font-mono font-semibold text-purple-700">{framework.code || '-'}</span>
                    </td>
                  )}
                  {visibleColumns.name && (
                    <td className="border border-gray-300 px-2 py-1.5">
                      <div className="text-xs font-medium text-gray-900 truncate max-w-[320px]" title={framework.name}>
                        {framework.name || '-'}
                      </div>
                      {framework.description && (
                        <div className="text-[11px] text-gray-500 truncate max-w-[320px]" title={framework.description}>
                          {framework.description}
                        </div>
                      )}
                    </td>
                  )}
                  {visibleColumns.version && (
                    <td className="border border-gray-300 px-2 py-1.5 text-xs text-gray-700">
                      {framework.version || '-'}
                    </td>
                  )}
                  {visibleColumns.country && (
                    <td className="border border-gray-300 px-2 py-1.5 text-xs text-gray-700">
                      {getCountryLabel(framework)}
                    </td>
                  )}
                  {visibleColumns.scope && (
                    <td className="border border-gray-300 px-2 py-1.5">
                      <Badge className={getCompanyCount(framework) ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'}>
                        {getScopeLabel(framework)}
                      </Badge>
                    </td>
                  )}
                  {visibleColumns.length && (
                    <td className="border border-gray-300 px-2 py-1.5 text-center text-xs text-gray-700">
                      {getLengthLabel(framework)}
                    </td>
                  )}
                  {visibleColumns.status && (
                    <td className="border border-gray-300 px-2 py-1.5">
                      <Badge className={framework.active ? 'bg-green-100 text-green-700' : 'bg-slate-200 text-slate-700'}>
                        {framework.active ? 'Actif' : 'Inactif'}
                      </Badge>
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
            id="frameworks-columns-menu"
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
            Total : {total} plan(s) comptable(s)
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
      </div>
    </div>
  );
}

export { FrameworkList };
export default FrameworkList;
