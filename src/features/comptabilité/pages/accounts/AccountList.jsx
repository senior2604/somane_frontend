// src/features/comptabilité/pages/accounts/AccountList.jsx
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FiAlertCircle,
  FiChevronLeft,
  FiChevronRight,
  FiChevronsLeft,
  FiChevronsRight,
  FiDownload,
  FiFilter,
  FiMoreHorizontal,
  FiPlus,
  FiRefreshCw,
  FiSearch,
  FiSettings,
  FiTrash2,
  FiUpload,
  FiX,
} from 'react-icons/fi';
import { ENDPOINTS } from '../../../../config/api';
import axiosInstance from '../../../../config/axiosInstance';
import useAccountStore from '../../../../stores/comptabilite/accountStore';
import useFrameworkStore from '../../../../stores/comptabilite/frameworkStore';

const FRAMEWORK_SESSION_KEY = 'account_list_selected_framework';

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

const normalizeApiList = (data) => Array.isArray(data) ? data : (data?.results || []);

const logAxiosError = (label, error) => {
  console.error(label, {
    status: error?.response?.status,
    url: error?.config?.url,
    params: error?.config?.params,
    data: error?.response?.data,
    message: error?.message,
  }, error);
};

const normalizeText = (value) => String(value || '')
  .trim()
  .toLowerCase()
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '');

const getFrameworkLabel = (framework) => {
  if (!framework) return '';
  return [framework.code, framework.name].filter(Boolean).join(' - ');
};

const getOptionLabel = (item) => {
  if (!item) return '';
  return [item.code, item.name].filter(Boolean).join(' - ') || item.label || '';
};

const getRelationLabel = (value) => {
  if (!value) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'number') return '';
  return [value.code, value.name || value.label || value.display_name]
    .filter(Boolean)
    .join(' - ');
};

const getAccountGroupLabel = (account) => (
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

const Badge = ({ children, className = '' }) => (
  <span className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium ${className}`}>
    {children}
  </span>
);

function AccountList() {
  const navigate = useNavigate();
  const filterMenuRef = useRef(null);
  const actionsMenuRef = useRef(null);

  const { frameworks, fetchFrameworks } = useFrameworkStore();
  const {
    accounts,
    loading,
    pagination,
    fetchAccounts,
    deleteAccount,
    setPagination,
  } = useAccountStore();

  const [selectedFramework, setSelectedFramework] = useState(() => {
    const saved = sessionStorage.getItem(FRAMEWORK_SESSION_KEY);
    return saved ? parseInt(saved, 10) : null;
  });
  const [selectedType, setSelectedType] = useState(null);
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [searchText, setSearchText] = useState('');
  const [activeFilters, setActiveFilters] = useState([]);
  const [showFilterMenu, setShowFilterMenu] = useState(false);
  const [showActionsMenu, setShowActionsMenu] = useState(false);
  const [showColumnsMenu, setShowColumnsMenu] = useState(false);
  const [columnsMenuPosition, setColumnsMenuPosition] = useState({ top: 0, left: 0 });
  const [activeRowId, setActiveRowId] = useState(null);
  const [selectedAccountIds, setSelectedAccountIds] = useState([]);
  const [error, setError] = useState(null);
  const [types, setTypes] = useState([]);
  const [groups, setGroups] = useState([]);
  const [visibleColumns, setVisibleColumns] = useState({
    code: true,
    name: true,
    nature: true,
    classe: true,
    lettrable: true,
    statut: true,
  });

  const selectedFw = useMemo(
    () => frameworks.find((framework) => String(framework.id) === String(selectedFramework)),
    [frameworks, selectedFramework]
  );

  const totalPages = Math.max(1, Math.ceil((pagination.total || 0) / (pagination.pageSize || 20)));

  const columns = [
    { id: 'code', label: 'Code' },
    { id: 'name', label: 'Libellé' },
    { id: 'nature', label: 'Nature' },
    { id: 'classe', label: 'Classe' },
    { id: 'lettrable', label: 'Lettrable' },
    { id: 'statut', label: 'Statut' },
  ];

  const visibleColumnCount = Object.values(visibleColumns).filter(Boolean).length;

  const loadFilterOptions = useCallback(async (frameworkId) => {
    if (!frameworkId) return;

    const [typesResult, groupsResult] = await Promise.allSettled([
      axiosInstance.get(ENDPOINTS.COMPTA.TYPES, { params: { framework: frameworkId, page_size: 200 } }),
      axiosInstance.get(ENDPOINTS.COMPTA.GROUPS, { params: { framework: frameworkId, page_size: 200 } }),
    ]);

    if (typesResult.status === 'fulfilled') {
      setTypes(normalizeApiList(typesResult.value.data));
    } else {
      setTypes([]);
      logAxiosError('Erreur chargement filtre types de comptes', typesResult.reason);
    }

    if (groupsResult.status === 'fulfilled') {
      setGroups(normalizeApiList(groupsResult.value.data));
    } else {
      setGroups([]);
      logAxiosError('Erreur chargement filtre groupes de comptes', groupsResult.reason);
    }

    if (typesResult.status === 'rejected' && groupsResult.status === 'rejected') {
      setError('Erreur lors du chargement des filtres.');
    }
  }, []);

  const buildParams = useCallback(() => {
    const params = {
      framework: selectedFramework,
      page: pagination.current,
      page_size: pagination.pageSize,
    };
    if (selectedType) params.type = selectedType;
    if (selectedGroup) params.group = selectedGroup;
    if (searchText.trim()) params.search = searchText.trim();
    return params;
  }, [selectedFramework, selectedType, selectedGroup, searchText, pagination.current, pagination.pageSize]);

  const loadAccounts = useCallback(async () => {
    if (!selectedFramework) return;
    if (!frameworks.some((framework) => String(framework.id) === String(selectedFramework))) return;
    try {
      setError(null);
      await fetchAccounts(buildParams());
    } catch (err) {
      logAxiosError('Erreur chargement comptes', err);
      setError('Impossible de charger les comptes comptables.');
    }
  }, [selectedFramework, frameworks, fetchAccounts, buildParams]);

  useEffect(() => {
    fetchFrameworks();
  }, [fetchFrameworks]);

  useEffect(() => {
    if (!frameworks.length) return;

    const selectedExists = selectedFramework && frameworks.some(
      (framework) => String(framework.id) === String(selectedFramework)
    );
    if (selectedExists) return;

    const nextFramework = frameworks[0]?.id ? parseInt(frameworks[0].id, 10) : null;
    setSelectedFramework(nextFramework);
    setSelectedType(null);
    setSelectedGroup(null);
    setTypes([]);
    setGroups([]);
    setActiveFilters([]);
    setPagination((prev) => ({ ...prev, current: 1 }));

    if (nextFramework) sessionStorage.setItem(FRAMEWORK_SESSION_KEY, String(nextFramework));
    else sessionStorage.removeItem(FRAMEWORK_SESSION_KEY);
  }, [frameworks, selectedFramework, setPagination]);

  useEffect(() => {
    if (!frameworks.length) return;
    if (!selectedFramework) {
      setTypes([]);
      setGroups([]);
      return;
    }
    loadFilterOptions(selectedFramework);
  }, [selectedFramework, loadFilterOptions]);

  useEffect(() => {
    loadAccounts();
  }, [loadAccounts]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (filterMenuRef.current && !filterMenuRef.current.contains(event.target)) {
        setShowFilterMenu(false);
      }
      if (actionsMenuRef.current && !actionsMenuRef.current.contains(event.target)) {
        setShowActionsMenu(false);
      }
      const columnsMenuElement = document.getElementById('accounts-columns-menu');
      if (columnsMenuElement && !columnsMenuElement.contains(event.target)) {
        const buttonElement = document.querySelector('.accounts-columns-menu-button');
        if (buttonElement && !buttonElement.contains(event.target)) {
          setShowColumnsMenu(false);
        }
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const resetPage = () => setPagination((prev) => ({ ...prev, current: 1 }));

  const handleFrameworkChange = (value) => {
    const nextValue = value ? parseInt(value, 10) : null;
    setSelectedFramework(nextValue);
    setSelectedType(null);
    setSelectedGroup(null);
    setTypes([]);
    setGroups([]);
    setActiveFilters([]);
    resetPage();
    if (nextValue) sessionStorage.setItem(FRAMEWORK_SESSION_KEY, String(nextValue));
    else sessionStorage.removeItem(FRAMEWORK_SESSION_KEY);
  };

  const addFilter = (field, value, label, color = 'bg-gray-100 text-gray-700') => {
    setActiveFilters((prev) => [
      ...prev.filter((filter) => filter.field !== field),
      { field, value, label, color },
    ]);
    if (field === 'framework') handleFrameworkChange(value);
    if (field === 'type') {
      setSelectedType(value || null);
      resetPage();
    }
    if (field === 'group') {
      setSelectedGroup(value || null);
      resetPage();
    }
    setShowFilterMenu(false);
  };

  const removeFilter = (index) => {
    const filter = activeFilters[index];
    if (filter?.field === 'type') setSelectedType(null);
    if (filter?.field === 'group') setSelectedGroup(null);
    setActiveFilters((prev) => prev.filter((_, itemIndex) => itemIndex !== index));
    resetPage();
  };

  const clearAllFilters = () => {
    setSelectedType(null);
    setSelectedGroup(null);
    setSearchText('');
    setActiveFilters([]);
    resetPage();
  };

  const handleSearchSubmit = () => {
    resetPage();
    loadAccounts();
  };

  const handleNew = () => navigate('/comptabilite/accounts/new', { state: { frameworkId: selectedFramework } });
  const handleView = (record) => navigate(`/comptabilite/accounts/${record.id}`);
  const handleImport = () => navigate('/comptabilite/accounts/import', { state: { frameworkId: selectedFramework } });

  const handleExport = () => {
    try {
      const { exportAccountsToCSV } = useAccountStore.getState();
      const csv = exportAccountsToCSV();
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `comptes_${selectedFramework}_${new Date().toISOString().slice(0, 10)}.csv`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err.message || "Erreur lors de l'export.");
    }
  };

  const handleBulkDelete = async () => {
    if (selectedAccountIds.length === 0) {
      setError('Aucun compte sélectionné.');
      return;
    }
    if (!window.confirm(`Supprimer ${selectedAccountIds.length} compte(s) ?`)) return;
    try {
      for (const accountId of selectedAccountIds) {
        await deleteAccount(accountId);
      }
      setSelectedAccountIds([]);
      setShowActionsMenu(false);
      await loadAccounts();
    } catch (err) {
      console.error('Erreur suppression comptes:', err);
      setError('Erreur lors de la suppression des comptes sélectionnés.');
    }
  };

  const frameworkOptions = frameworks.map((framework) => ({
    value: framework.id,
    label: getFrameworkLabel(framework),
  }));

  const filteredTypeOptions = types.filter((type) =>
    normalizeText(getOptionLabel(type)).includes(normalizeText(searchText)) || !searchText
  );

  const filteredGroupOptions = groups.filter((group) =>
    normalizeText(getOptionLabel(group)).includes(normalizeText(searchText)) || !searchText
  );

  const goToPage = (page) => {
    setPagination((prev) => ({
      ...prev,
      current: Math.min(Math.max(1, page), totalPages),
    }));
  };

  const changePageSize = (pageSize) => {
    setPagination((prev) => ({ ...prev, pageSize, current: 1 }));
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-full mx-auto bg-white border border-gray-300">
        <div className="border-b border-gray-300 px-4 py-2">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 flex-shrink-0">
              <Tooltip text="Créer un nouveau compte">
                <button
                  type="button"
                  onClick={handleNew}
                  disabled={!selectedFramework}
                  className="h-8 px-3 bg-purple-600 text-white text-xs font-medium hover:bg-purple-700 hover:scale-105 transition-all duration-200 rounded flex items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <FiPlus size={12} /> Nouveau compte
                </button>
              </Tooltip>

              <Tooltip text="Actualiser la liste">
                <h1
                  className="text-lg font-bold text-gray-900 cursor-pointer hover:text-purple-600 hover:scale-105 transition-all duration-200"
                  onClick={loadAccounts}
                >
                  Comptes comptables
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
                  <div className="absolute left-0 mt-1 w-48 bg-white border border-gray-300 shadow-lg rounded z-50">
                    <button
                      type="button"
                      onClick={() => { setShowActionsMenu(false); handleImport(); }}
                      disabled={!selectedFramework}
                      className="w-full px-3 py-2 text-xs text-left hover:bg-gray-50 flex items-center gap-2 disabled:opacity-50"
                    >
                      <FiUpload size={12} /> Importer
                    </button>
                    <button
                      type="button"
                      onClick={() => { setShowActionsMenu(false); handleExport(); }}
                      disabled={!selectedFramework || accounts.length === 0}
                      className="w-full px-3 py-2 text-xs text-left hover:bg-gray-50 flex items-center gap-2 border-t border-gray-100 disabled:opacity-50"
                    >
                      <FiDownload size={12} /> Exporter
                    </button>
                    <button
                      type="button"
                      onClick={handleBulkDelete}
                      disabled={!selectedFramework || selectedAccountIds.length === 0}
                      className="w-full px-3 py-2 text-xs text-left hover:bg-red-50 hover:text-red-600 flex items-center gap-2 border-t border-gray-100 disabled:opacity-50"
                    >
                      <FiTrash2 size={12} /> Supprimer
                    </button>
                    <button
                      type="button"
                      onClick={() => { setShowActionsMenu(false); loadAccounts(); }}
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
                    </span>
                  )}

                  {activeFilters.map((filter, index) => (
                    <span key={`${filter.field}-${filter.value}`} className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs ${filter.color} m-0.5`}>
                      {filter.label}
                      <button type="button" onClick={() => removeFilter(index)} className="hover:text-red-600">
                        <FiX size={10} />
                      </button>
                    </span>
                  ))}

                  <FiSearch size={14} className="text-gray-400 ml-1" />
                  <input
                    type="text"
                    value={searchText}
                    onChange={(event) => { setSearchText(event.target.value); resetPage(); }}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') handleSearchSubmit();
                    }}
                    placeholder="Rechercher un code ou un libellé..."
                    className="flex-1 px-2 py-1 text-sm focus:outline-none min-w-[160px]"
                    disabled={!selectedFramework}
                  />

                  <div className="relative" ref={filterMenuRef}>
                    <Tooltip text="Ajouter un filtre">
                      <button
                        type="button"
                        onClick={() => setShowFilterMenu((prev) => !prev)}
                        className={`p-1.5 rounded hover:bg-gray-100 ${showFilterMenu ? 'bg-gray-100' : ''}`}
                      >
                        <FiFilter size={14} className={activeFilters.length > 0 ? 'text-purple-600' : 'text-gray-400'} />
                      </button>
                    </Tooltip>

                    {showFilterMenu && (
                      <div className="absolute right-0 mt-1 w-72 bg-white border border-gray-300 shadow-lg rounded z-50">
                        <div className="p-2 border-b border-gray-200">
                          <p className="text-xs font-medium text-gray-700 mb-2">Référentiel</p>
                          <div className="max-h-40 overflow-y-auto space-y-1">
                            {frameworkOptions.map((framework) => (
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

                        <div className="p-2 border-b border-gray-200">
                          <p className="text-xs font-medium text-gray-700 mb-2">Nature</p>
                          <div className="max-h-36 overflow-y-auto space-y-1">
                            {filteredTypeOptions.length === 0 ? (
                              <div className="text-xs text-gray-400 px-2 py-1">Aucune nature</div>
                            ) : filteredTypeOptions.map((type) => (
                              <button
                                type="button"
                                key={type.id}
                                onClick={() => addFilter('type', type.id, `Nature: ${getOptionLabel(type)}`, 'bg-blue-100 text-blue-700')}
                                className="w-full text-left text-xs px-2 py-1 hover:bg-gray-100 rounded truncate"
                                disabled={!selectedFramework}
                              >
                                {getOptionLabel(type)}
                              </button>
                            ))}
                          </div>
                        </div>

                        <div className="p-2">
                          <p className="text-xs font-medium text-gray-700 mb-2">Classe</p>
                          <div className="max-h-36 overflow-y-auto space-y-1">
                            {filteredGroupOptions.length === 0 ? (
                              <div className="text-xs text-gray-400 px-2 py-1">Aucune classe</div>
                            ) : filteredGroupOptions.map((group) => (
                              <button
                                type="button"
                                key={group.id}
                                onClick={() => addFilter('group', group.id, `Classe: ${getOptionLabel(group)}`, 'bg-amber-100 text-amber-700')}
                                className="w-full text-left text-xs px-2 py-1 hover:bg-gray-100 rounded truncate"
                                disabled={!selectedFramework}
                              >
                                {getOptionLabel(group)}
                              </button>
                            ))}
                          </div>
                        </div>

                        {(activeFilters.length > 0 || selectedType || selectedGroup || searchText) && (
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
                value={pagination.pageSize || 20}
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

        {error && (
          <div className="border-b border-red-200 bg-red-50 px-4 py-2 text-xs text-red-700 flex items-center gap-2">
            <FiAlertCircle size={14} />
            <span>{error}</span>
            <button type="button" onClick={() => setError(null)} className="ml-auto text-red-500 hover:text-red-700">
              <FiX size={12} />
            </button>
          </div>
        )}

        {selectedAccountIds.length > 0 && (
          <div className="border-b border-gray-300 px-4 py-2 bg-gray-50 flex items-center gap-2">
            <span className="text-xs text-gray-600">{selectedAccountIds.length} compte(s) sélectionné(s)</span>
          </div>
        )}

        {!selectedFramework ? (
          <div className="p-10 text-center">
            <div className="mx-auto w-12 h-12 rounded-full border border-gray-300 flex items-center justify-center text-gray-400 mb-3">
              <FiFilter size={22} />
            </div>
            <p className="text-sm font-medium text-gray-700">Sélectionnez un référentiel comptable</p>
            <p className="text-xs text-gray-500 mt-1">Les comptes du plan choisi apparaîtront ici.</p>
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
                        checked={selectedAccountIds.length === accounts.length && accounts.length > 0}
                        onChange={(event) => {
                          if (event.target.checked) {
                            setSelectedAccountIds(accounts.map((account) => account.id));
                          } else {
                            setSelectedAccountIds([]);
                          }
                        }}
                        className="w-3.5 h-3.5 cursor-pointer"
                      />
                    </th>
                    {visibleColumns.code && (
                      <th className="border-r border-gray-300 px-2 py-1.5 text-left text-xs font-medium text-gray-700 min-w-[120px]">Code</th>
                    )}
                    {visibleColumns.name && (
                      <th className="border-r border-gray-300 px-2 py-1.5 text-left text-xs font-medium text-gray-700 min-w-[240px]">Libellé</th>
                    )}
                    {visibleColumns.nature && (
                      <th className="border-r border-gray-300 px-2 py-1.5 text-left text-xs font-medium text-gray-700 min-w-[160px]">Nature</th>
                    )}
                    {visibleColumns.classe && (
                      <th className="border-r border-gray-300 px-2 py-1.5 text-left text-xs font-medium text-gray-700 min-w-[140px]">Classe</th>
                    )}
                    {visibleColumns.lettrable && (
                      <th className="border-r border-gray-300 px-2 py-1.5 text-center text-xs font-medium text-gray-700 min-w-[90px]">Lettrable</th>
                    )}
                    {visibleColumns.statut && (
                      <th className="border-r border-gray-300 px-2 py-1.5 text-left text-xs font-medium text-gray-700 min-w-[90px]">Statut</th>
                    )}
                    <th className="border-l border-gray-300 px-2 py-1.5 w-10 text-center">
                      <Tooltip text="Choisir les colonnes à afficher">
                        <button
                          type="button"
                          className="accounts-columns-menu-button p-1 rounded hover:bg-gray-200"
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
                  {loading && accounts.length === 0 ? (
                    <tr>
                      <td colSpan={visibleColumnCount + 2} className="border border-gray-300 p-8 text-center text-gray-500 text-sm">
                        <div className="w-8 h-8 border-2 border-purple-600 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
                        Chargement...
                      </td>
                    </tr>
                  ) : accounts.length === 0 ? (
                    <tr>
                      <td colSpan={visibleColumnCount + 2} className="border border-gray-300 p-8 text-center text-gray-500 text-sm">
                        Aucun compte comptable
                      </td>
                    </tr>
                  ) : accounts.map((account) => (
                    <tr
                      key={account.id}
                      className={`hover:bg-gray-50 cursor-pointer transition-colors ${activeRowId === account.id ? 'bg-purple-50' : ''}`}
                      onClick={() => setActiveRowId(account.id)}
                      onDoubleClick={() => handleView(account)}
                    >
                      <td className="border border-gray-300 px-2 py-1.5 text-center" onClick={(event) => event.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={selectedAccountIds.includes(account.id)}
                          onChange={(event) => {
                            if (event.target.checked) {
                              setSelectedAccountIds((prev) => [...prev, account.id]);
                            } else {
                              setSelectedAccountIds((prev) => prev.filter((id) => id !== account.id));
                            }
                          }}
                          className="w-3.5 h-3.5 cursor-pointer"
                        />
                      </td>
                      {visibleColumns.code && (
                        <td className="border border-gray-300 px-2 py-1.5 text-xs">
                          <span className="font-mono font-semibold text-purple-700">{account.code}</span>
                        </td>
                      )}
                      {visibleColumns.name && (
                        <td className="border border-gray-300 px-2 py-1.5">
                          <div className="text-xs font-medium text-gray-900 truncate max-w-[260px]" title={account.name}>
                            {account.name || '—'}
                          </div>
                        </td>
                      )}
                      {visibleColumns.nature && (
                        <td className="border border-gray-300 px-2 py-1.5">
                          {account.type_name ? (
                            <Badge className="bg-blue-100 text-blue-700">{account.type_name}</Badge>
                          ) : (
                            <span className="text-xs text-gray-400">—</span>
                          )}
                        </td>
                      )}
                      {visibleColumns.classe && (
                        <td className="border border-gray-300 px-2 py-1.5 text-xs text-gray-700">
                          {getAccountGroupLabel(account) || '—'}
                        </td>
                      )}
                      {visibleColumns.lettrable && (
                        <td className="border border-gray-300 px-2 py-1.5 text-center">
                          <Badge className={account.reconcile ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}>
                            {account.reconcile ? 'Oui' : 'Non'}
                          </Badge>
                        </td>
                      )}
                      {visibleColumns.statut && (
                        <td className="border border-gray-300 px-2 py-1.5">
                          <Badge className={account.active ? 'bg-green-100 text-green-700' : 'bg-slate-200 text-slate-700'}>
                            {account.active ? 'Actif' : 'Inactif'}
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
                id="accounts-columns-menu"
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
                Total : {pagination.total || accounts.length || 0} compte(s)
              </div>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => goToPage(1)}
                  disabled={(pagination.current || 1) === 1}
                  className="p-1 rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <FiChevronsLeft size={14} />
                </button>
                <button
                  type="button"
                  onClick={() => goToPage((pagination.current || 1) - 1)}
                  disabled={(pagination.current || 1) === 1}
                  className="p-1 rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <FiChevronLeft size={14} />
                </button>
                <span className="px-2 text-xs text-gray-700">
                  {pagination.current || 1} / {totalPages}
                </span>
                <button
                  type="button"
                  onClick={() => goToPage((pagination.current || 1) + 1)}
                  disabled={(pagination.current || 1) >= totalPages}
                  className="p-1 rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <FiChevronRight size={14} />
                </button>
                <button
                  type="button"
                  onClick={() => goToPage(totalPages)}
                  disabled={(pagination.current || 1) >= totalPages}
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

export { AccountList };
export default AccountList;
