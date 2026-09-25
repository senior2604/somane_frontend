// src/features/comptabilite/pages/accounts/AccountForm.jsx
import { Form, Input, Select, Spin } from 'antd';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { FiBarChart2, FiBookOpen, FiInfo, FiPlus, FiSettings } from 'react-icons/fi';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import UnifiedFormPage from '../../../../components/UnifiedFormPage';
import { ENDPOINTS } from '../../../../config/api';
import axiosInstance from '../../../../config/axiosInstance';
import useAccountStore from '../../../../stores/comptabilite/accountStore';
import useFrameworkStore from '../../../../stores/comptabilite/frameworkStore';

const { TextArea } = Input;
const FRAMEWORK_SESSION_KEY = 'account_list_selected_framework';
const ACCOUNT_COLUMN_WIDTHS_KEY = 'accountFormColumnWidths';
const requestCache = new Map();
const DEFAULT_ACCOUNT_COLUMN_WIDTHS = {
  type: 210,
  group: 220,
  account_type: 150,
  length: 100,
  company: 190,
  currency: 170,
  reconcile: 160,
  active: 140,
  default_tax_id: 190,
  current_tax_id: 190,
  allowed_journal_ids: 250,
  analytic_account: 180,
  ifrs_account: 160,
  reporting_account: 190,
  locked: 160,
  closing_type: 150,
};
const CLASSIFICATION_COLUMNS = [
  { key: 'type', label: 'Nature du compte *' },
  { key: 'group', label: 'Classe / Groupe' },
  { key: 'account_type', label: 'Type de compte' },
  { key: 'length', label: 'Longueur' },
  { key: 'company', label: 'Société' },
  { key: 'currency', label: 'Devise du compte' },
  { key: 'reconcile', label: 'Lettrage autorisé' },
  { key: 'active', label: 'Compte actif' },
];
const ADVANCED_COLUMNS = [
  { key: 'default_tax_id', label: 'Taxe par défaut' },
  { key: 'current_tax_id', label: 'Taxe actuelle' },
  { key: 'allowed_journal_ids', label: 'Journaux autorisés' },
  { key: 'analytic_account', label: 'Compte analytique' },
  { key: 'ifrs_account', label: 'Compte IFRS' },
  { key: 'reporting_account', label: 'Compte de reporting' },
  { key: 'locked', label: 'Compte verrouillé' },
  { key: 'closing_type', label: 'Clôture' },
];

const normalizeList = (payload) => (Array.isArray(payload) ? payload : payload?.results || []);
const relationId = (value) => {
  if (value === null || value === undefined || value === '') return null;
  if (typeof value === 'object') return value.id ?? value.value ?? null;
  return value;
};
const relationIds = (values) => normalizeList(values).map(relationId).filter((value) => value !== null);
const relationLabel = (value) => {
  if (!value) return '';
  if (typeof value === 'string') return value;
  return [value.code, value.name || value.label || value.display_name].filter(Boolean).join(' - ');
};
const labelOf = (record) => [record?.code, record?.name || record?.label].filter(Boolean).join(' - ');
const errorMessage = (error, fallback) => {
  const data = error?.response?.data;
  if (typeof data?.detail === 'string') return data.detail;
  if (data && typeof data === 'object') {
    return Object.entries(data).map(([field, value]) => `${field} : ${Array.isArray(value) ? value.join(', ') : value}`).join('\n');
  }
  return error?.message || fallback;
};
const formatDateTime = (value) => {
  if (!value) return '-';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleString('fr-FR');
};
const cachedRequest = (key, loader) => {
  if (!requestCache.has(key)) {
    requestCache.set(key, Promise.resolve().then(loader).catch((error) => {
      requestCache.delete(key);
      throw error;
    }));
  }
  return requestCache.get(key);
};

const RequiredLabel = ({ children, required = false }) => (
  <span className="w-40 shrink-0 text-xs font-medium text-gray-700">
    {children}{required && <span className="ml-0.5 text-red-500">*</span>}
  </span>
);

const FieldLine = ({ label, required = false, children }) => (
  <div className="flex min-w-0 items-center" style={{ height: 26 }}>
    <RequiredLabel required={required}>{label}</RequiredLabel>
    <div className="ml-2 min-w-0 flex-1">{children}</div>
  </div>
);

const TableHeader = ({ children, columnKey, onResize }) => (
  <th className="relative border border-gray-300 px-2 py-1.5 text-left text-xs font-medium text-gray-700">
    {children}
    <span
      role="separator"
      aria-label={`Redimensionner ${children || 'la colonne'}`}
      onMouseDown={(event) => onResize?.(event, columnKey)}
      className="absolute right-0 top-0 z-20 h-full w-1 cursor-col-resize select-none hover:bg-purple-400"
    />
  </th>
);

const TableCell = ({ children }) => (
  <td className="min-w-0 border border-gray-300 p-1 align-middle">{children}</td>
);

const CompactSelect = ({
  value,
  onChange,
  onBlur,
  onFocus,
  options = [],
  placeholder = '',
  disabled = false,
  allowClear = false,
  id,
}) => {
  const inputRef = useRef(null);
  const dropdownRef = useRef(null);
  const [isOpen, setIsOpen] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const [dropdownStyle, setDropdownStyle] = useState({});

  const selectedOption = options.find((option) => String(option.value) === String(value));
  const normalizedInput = inputValue.trim().toLocaleLowerCase('fr');
  const filteredOptions = options.filter((option) => String(option.label || '').toLocaleLowerCase('fr').includes(normalizedInput));

  useEffect(() => {
    if (!isOpen) setInputValue(selectedOption?.label || '');
  }, [isOpen, selectedOption?.label]);

  const updateDropdownPosition = useCallback(() => {
    if (!inputRef.current) return;
    const rect = inputRef.current.getBoundingClientRect();
    setDropdownStyle({
      position: 'fixed',
      top: `${rect.bottom}px`,
      left: `${rect.left}px`,
      width: `${Math.max(rect.width, 180)}px`,
      zIndex: 1200,
      maxHeight: '220px',
      overflowY: 'auto',
    });
  }, []);

  useEffect(() => {
    if (!isOpen) return undefined;
    updateDropdownPosition();
    const reposition = () => updateDropdownPosition();
    window.addEventListener('scroll', reposition, true);
    window.addEventListener('resize', reposition);
    return () => {
      window.removeEventListener('scroll', reposition, true);
      window.removeEventListener('resize', reposition);
    };
  }, [isOpen, updateDropdownPosition]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (inputRef.current?.contains(event.target) || dropdownRef.current?.contains(event.target)) return;
      setIsOpen(false);
      onBlur?.(event);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onBlur]);

  useEffect(() => {
    if (!isOpen || !dropdownRef.current) return;
    dropdownRef.current.children[highlightedIndex]?.scrollIntoView({ block: 'nearest' });
  }, [highlightedIndex, isOpen]);

  const selectOption = (option) => {
    setInputValue(String(option.label || ''));
    setIsOpen(false);
    onChange?.(option.value);
  };

  const handleKeyDown = (event) => {
    if (disabled) return;
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setIsOpen(true);
      setHighlightedIndex((current) => Math.min(current + 1, Math.max(filteredOptions.length - 1, 0)));
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setHighlightedIndex((current) => Math.max(current - 1, 0));
    } else if (event.key === 'Enter' && isOpen && filteredOptions[highlightedIndex]) {
      event.preventDefault();
      selectOption(filteredOptions[highlightedIndex]);
    } else if (event.key === 'Escape') {
      setIsOpen(false);
    } else if (event.key === 'Tab' && isOpen && filteredOptions[highlightedIndex]) {
      event.preventDefault();
      selectOption(filteredOptions[highlightedIndex]);
      setTimeout(() => {
        const cell = inputRef.current?.closest('td');
        const nextControl = cell?.nextElementSibling?.querySelector('input:not([disabled]), button:not([disabled]), textarea:not([disabled])');
        nextControl?.focus();
      }, 0);
    }
  };

  return (
    <>
      <input
        ref={inputRef}
        id={id}
        type="text"
        value={inputValue}
        title={selectedOption?.label || inputValue || placeholder}
        placeholder={placeholder}
        disabled={disabled}
        autoComplete="off"
        className={`account-form-autocomplete w-full px-2 py-1 text-xs focus:outline-none ${disabled ? 'cursor-not-allowed bg-gray-100 text-gray-400' : ''}`}
        onChange={(event) => {
          const nextValue = event.target.value;
          setInputValue(nextValue);
          setIsOpen(true);
          setHighlightedIndex(0);
          if (!nextValue && allowClear) onChange?.(null);
          else if (value !== null && value !== undefined && value !== '') onChange?.(null);
        }}
        onFocus={(event) => {
          if (disabled) return;
          setIsOpen(true);
          setHighlightedIndex(0);
          updateDropdownPosition();
          onFocus?.(event);
        }}
        onKeyDown={handleKeyDown}
      />
      {isOpen && !disabled && (
        <div ref={dropdownRef} className="account-form-autocomplete-menu bg-white" style={dropdownStyle}>
          {filteredOptions.length ? filteredOptions.map((option, index) => (
            <button
              key={option.value}
              type="button"
              className={`block w-full cursor-pointer px-2 py-1 text-left text-xs ${index === highlightedIndex ? 'bg-purple-100 text-purple-700' : 'text-gray-700 hover:bg-purple-50'} ${String(option.value) === String(value) ? 'font-semibold text-purple-700' : ''}`}
              onMouseDown={(event) => event.preventDefault()}
              onMouseEnter={() => setHighlightedIndex(index)}
              onClick={() => selectOption(option)}
            >
              {option.label}
            </button>
          )) : <div className="px-2 py-2 text-xs text-gray-400">Aucun résultat</div>}
        </div>
      )}
    </>
  );
};

const CompactToggle = ({ checked = false, onChange, checkedLabel = 'Oui', uncheckedLabel = 'Non' }) => (
  <div className="flex h-[26px] items-center gap-2">
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange?.(!checked)}
      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-1 ${checked ? 'bg-purple-600' : 'bg-gray-200'}`}
    >
      <span className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow transition-transform duration-200 ${checked ? 'translate-x-5' : 'translate-x-0'}`} />
    </button>
    <span className={`text-xs font-medium ${checked ? 'text-green-700' : 'text-gray-500'}`}>
      {checked ? checkedLabel : uncheckedLabel}
    </span>
  </div>
);

const normalizeAccountValues = (account, fallbackFramework) => ({
  framework: relationId(account?.framework) || fallbackFramework || null,
  code: account?.code || '',
  name: account?.name || '',
  commercial_name: account?.commercial_name ?? account?.nom_commercial ?? account?.trade_name ?? '',
  type: relationId(account?.type),
  group: relationId(account?.group) ?? account?.group_id ?? null,
  parent: relationId(account?.parent),
  company: relationId(account?.company),
  currency: relationId(account?.currency),
  default_tax_id: account?.default_tax_id ?? relationId(account?.default_tax),
  current_tax_id: account?.current_tax_id ?? relationId(account?.current_tax),
  allowed_journal_ids: relationIds(account?.allowed_journal_ids || account?.allowed_journals),
  analytic_account: account?.analytic_account || '',
  ifrs_account: account?.ifrs_account || '',
  reporting_account: account?.reporting_account || '',
  reconcile: Boolean(account?.reconcile),
  active: account?.active !== false,
  note: account?.note || '',
  account_type: account?.account_type || 'detail',
  locked: Boolean(account?.locked),
  closing_type: account?.closing_type !== false,
  length: account?.length ?? account?.code_length ?? (account?.code ? String(account.code).length : undefined),
});

const buildReturnState = (savedRecord, context) => {
  const state = context.location.state || {};
  const label = labelOf(savedRecord);
  return {
    ...state,
    createdRecord: savedRecord,
    created_record: savedRecord,
    selectedRecord: savedRecord,
    updatedRecord: savedRecord,
    returnField: state.returnField || state.selectedField || 'account',
    selectedField: state.selectedField || state.returnField || 'account',
    returnLineId: state.returnLineId ?? state.lineId ?? null,
    lineId: state.lineId ?? state.returnLineId ?? null,
    returnQuery: state.returnQuery || state.suggestedValue || label,
    suggestedValue: state.suggestedValue || state.returnQuery || label,
    restorePieceDraft: state.restorePieceDraft ?? String(state.returnTo || '').includes('/pieces'),
    restoreJournalDraft: state.restoreJournalDraft ?? String(state.returnTo || '').includes('/journaux'),
    restoreAccountDraft: state.restoreAccountDraft,
  };
};

export default function AccountForm({ mode = 'create' }) {
  const isShowMode = mode === 'show';
  const [form] = Form.useForm();
  const navigate = useNavigate();
  const location = useLocation();
  const { id } = useParams();
  const { createAccount, updateAccount, fetchAccountById } = useAccountStore();
  const { frameworks = [], fetchFrameworks } = useFrameworkStore();
  const initialValuesRef = useRef({});

  const [pageLoading, setPageLoading] = useState(isShowMode && !location.state?.accountRecord);
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [account, setAccount] = useState(() => location.state?.accountRecord || null);
  const [frameworkId, setFrameworkId] = useState(() => location.state?.frameworkId || sessionStorage.getItem(FRAMEWORK_SESSION_KEY) || '');
  const [activeTab, setActiveTab] = useState('classification');
  const [actionsOpen, setActionsOpen] = useState(false);
  const [traceabilityOpen, setTraceabilityOpen] = useState(isShowMode);
  const [feedback, setFeedback] = useState(null);
  const [types, setTypes] = useState([]);
  const [groups, setGroups] = useState([]);
  const [entities, setEntities] = useState([]);
  const [currencies, setCurrencies] = useState([]);
  const [taxes, setTaxes] = useState([]);
  const [journals, setJournals] = useState([]);
  const [parentAccounts, setParentAccounts] = useState([]);
  const columnResizeRef = useRef(null);
  const [columnWidths, setColumnWidths] = useState(() => {
    try {
      return {
        ...DEFAULT_ACCOUNT_COLUMN_WIDTHS,
        ...JSON.parse(localStorage.getItem(ACCOUNT_COLUMN_WIDTHS_KEY) || '{}'),
      };
    } catch {
      return DEFAULT_ACCOUNT_COLUMN_WIDTHS;
    }
  });

  const watchedCode = Form.useWatch('code', form);
  const watchedName = Form.useWatch('name', form);
  const watchedActive = Form.useWatch('active', form);
  const recordLabel = isShowMode
    ? labelOf({ code: watchedCode || account?.code, name: watchedName || account?.name })
    : (watchedName || watchedCode || 'Nouveau compte');

  const loadFrameworkData = useCallback(async (selectedFrameworkId) => {
    if (!selectedFrameworkId) {
      setTypes([]); setGroups([]); setParentAccounts([]);
      return;
    }
    const key = String(selectedFrameworkId);
    try {
      const [typeResponse, groupResponse, accountResponse] = await Promise.all([
        cachedRequest(`account-types:${key}`, () => axiosInstance.get(ENDPOINTS.COMPTA.TYPES, { params: { framework: key, page_size: 500 } })),
        cachedRequest(`account-groups:${key}`, () => axiosInstance.get(ENDPOINTS.COMPTA.GROUPS, { params: { framework: key, page_size: 500 } })),
        cachedRequest(`account-parents:${key}`, () => axiosInstance.get(ENDPOINTS.COMPTA.ACCOUNTS, { params: { framework: key, page_size: 1000, ordering: 'code' } })),
      ]);
      setTypes(normalizeList(typeResponse.data));
      setGroups(normalizeList(groupResponse.data));
      setParentAccounts(normalizeList(accountResponse.data)
        .filter((item) => String(item.id) !== String(id || ''))
        .map((item) => ({ value: item.id, label: labelOf(item) })));
    } catch (error) {
      setFeedback({ type: 'error', message: errorMessage(error, 'Impossible de charger les paramètres du référentiel.') });
    }
  }, [id]);

  const applyValues = useCallback((values) => {
    form.setFieldsValue(values);
    initialValuesRef.current = values;
    setHasChanges(false);
  }, [form]);

  useEffect(() => {
    let active = true;
    const initialize = async () => {
      setPageLoading(isShowMode && !account);
      if (isShowMode && account) {
        const immediateFramework = relationId(account.framework) || frameworkId || null;
        applyValues(normalizeAccountValues(account, immediateFramework));
      }
      try {
        const accountPromise = isShowMode
          ? fetchAccountById(id)
          : Promise.resolve(null);
        const [frameworkPayload, loadedAccount, entityResponse, currencyResponse, taxResponse, journalResponse] = await Promise.all([
          frameworks.length ? frameworks : fetchFrameworks({ page_size: 500 }),
          accountPromise,
          cachedRequest('account-entities', () => axiosInstance.get(ENDPOINTS.ENTITES)),
          cachedRequest('account-currencies', () => axiosInstance.get(ENDPOINTS.DEVISES)),
          cachedRequest('account-taxes', () => axiosInstance.get(ENDPOINTS.COMPTA.TAXES, { params: { page_size: 500 } })).catch(() => ({ data: [] })),
          cachedRequest('account-journals', () => axiosInstance.get(ENDPOINTS.COMPTA.JOURNALS, { params: { page_size: 500 } })).catch(() => ({ data: [] })),
        ]);
        if (!active) return;
        const availableFrameworks = normalizeList(frameworkPayload);
        const source = loadedAccount || account;
        const sourceFrameworkId = relationId(source?.framework);
        const preferred = sourceFrameworkId || frameworkId;
        const exists = availableFrameworks.some((item) => String(item.id) === String(preferred));
        const selectedId = exists ? preferred : availableFrameworks[0]?.id || '';

        setEntities(normalizeList(entityResponse.data));
        setCurrencies(normalizeList(currencyResponse.data));
        setTaxes(normalizeList(taxResponse.data));
        setJournals(normalizeList(journalResponse.data));
        setFrameworkId(String(selectedId || ''));
        if (selectedId) sessionStorage.setItem(FRAMEWORK_SESSION_KEY, String(selectedId));

        if (isShowMode) {
          if (!source) throw new Error('Compte introuvable');
          setAccount(source);
          applyValues(normalizeAccountValues(source, selectedId));
        } else {
          applyValues(normalizeAccountValues({ active: true, account_type: 'detail' }, selectedId));
        }
        await loadFrameworkData(selectedId);
      } catch (error) {
        if (!active) return;
        setFeedback({ type: 'error', message: errorMessage(error, 'Impossible de charger le compte.') });
      } finally {
        if (active) setPageLoading(false);
      }
    };
    initialize();
    return () => { active = false; };
  // L'initialisation ne doit pas redémarrer à chaque mise à jour du store.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, isShowMode]);

  const handleFrameworkChange = useCallback(async (value) => {
    setFrameworkId(String(value || ''));
    form.setFieldsValue({ type: null, group: null, parent: null });
    setHasChanges(true);
    if (value) sessionStorage.setItem(FRAMEWORK_SESSION_KEY, String(value));
    await loadFrameworkData(value);
  }, [form, loadFrameworkData]);

  useEffect(() => {
    localStorage.setItem(ACCOUNT_COLUMN_WIDTHS_KEY, JSON.stringify(columnWidths));
  }, [columnWidths]);

  const startColumnResize = useCallback((event, key) => {
    event.preventDefault();
    event.stopPropagation();
    const startX = event.clientX;
    const startWidth = columnWidths[key] || DEFAULT_ACCOUNT_COLUMN_WIDTHS[key] || 120;
    const onMouseMove = (moveEvent) => {
      setColumnWidths((current) => ({
        ...current,
        [key]: Math.max(90, startWidth + moveEvent.clientX - startX),
      }));
    };
    const onMouseUp = () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      columnResizeRef.current = null;
    };
    columnResizeRef.current = { onMouseMove, onMouseUp };
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  }, [columnWidths]);

  useEffect(() => () => {
    const listeners = columnResizeRef.current;
    if (!listeners) return;
    window.removeEventListener('mousemove', listeners.onMouseMove);
    window.removeEventListener('mouseup', listeners.onMouseUp);
  }, []);

  const columnStyle = useCallback((key) => {
    const width = columnWidths[key] || DEFAULT_ACCOUNT_COLUMN_WIDTHS[key] || 120;
    return { width: `${width}px`, minWidth: `${width}px` };
  }, [columnWidths]);

  const tableWidth = useCallback(
    (columns) => columns.reduce((total, column) => total + (columnWidths[column.key] || DEFAULT_ACCOUNT_COLUMN_WIDTHS[column.key] || 120), 0),
    [columnWidths],
  );

  const handleTypeChange = useCallback((value) => {
    const selected = types.find((item) => String(item.id) === String(value));
    const suggestedGroup = relationId(selected?.internal_group) || selected?.internal_group_id || selected?.type_group_id || relationId(selected?.group);
    if (suggestedGroup) form.setFieldValue('group', suggestedGroup);
  }, [form, types]);

  const save = useCallback(async () => {
    setSaving(true);
    setFeedback(null);
    try {
      const values = await form.validateFields();
      const response = isShowMode ? await updateAccount(id, values) : await createAccount(values);
      const saved = { ...(account || {}), ...values, ...(response?.data || response || {}), id: response?.id || response?.data?.id || id };
      setAccount(saved);
      applyValues(values);
      setFeedback({ type: 'success', message: isShowMode ? 'Compte modifié avec succès.' : 'Compte créé avec succès.' });
      return saved;
    } catch (error) {
      if (error?.errorFields) {
        setFeedback({ type: 'error', message: 'Complétez les champs obligatoires du compte.' });
      } else {
        setFeedback({ type: 'error', message: errorMessage(error, isShowMode ? 'Impossible de modifier le compte.' : 'Impossible de créer le compte.') });
      }
      return false;
    } finally {
      setSaving(false);
    }
  }, [account, applyValues, createAccount, form, id, isShowMode, updateAccount]);

  const options = useMemo(() => ({
    frameworks: frameworks.map((item) => ({ value: item.id, label: labelOf(item) })),
    types: types.map((item) => ({ value: item.id, label: labelOf(item) })),
    groups: groups.map((item) => ({ value: item.id, label: labelOf(item) })),
    entities: entities.map((item) => ({ value: item.id, label: item.raison_sociale || item.nom || item.name })),
    currencies: currencies.map((item) => ({ value: item.id, label: [item.code, item.nom || item.name].filter(Boolean).join(' - ') })),
    taxes: taxes.map((item) => ({ value: item.id, label: `${item.name || item.label || item.code || 'Taxe'}${item.amount !== undefined ? ` (${item.amount} %)` : ''}` })),
    journals: journals.map((item) => ({ value: item.id, label: labelOf(item) })),
  }), [currencies, entities, frameworks, groups, journals, taxes, types]);

  const traceabilityContent = useMemo(() => {
    const logs = [
      { id: 'created', label: 'Création du compte', date: account?.created_at || account?.create_date, user: account?.created_by_name || account?.create_uid_label || account?.created_by },
      { id: 'updated', label: 'Dernière modification', date: account?.updated_at || account?.write_date, user: account?.updated_by_name || account?.write_uid_label || account?.updated_by },
    ].filter((item) => item.date || item.user);
    return (
      <div className="p-4">
        <div className="mb-3 flex items-center justify-between text-xs"><span className="font-semibold text-gray-700">Activité liée au compte</span><span className="text-gray-500">{logs.length} événement(s)</span></div>
        {logs.length ? <div className="space-y-2">{logs.map((log) => <div key={log.id} className="border border-gray-200 bg-white p-3 text-xs"><div className="font-semibold text-gray-900">{log.label}</div><div className="mt-1 text-gray-500">{labelOf(account)}</div><div className="mt-1 text-gray-500">{formatDateTime(log.date)}</div>{log.user && <div className="text-gray-500">Par {relationLabel(log.user)}</div>}</div>)}</div> : <div className="border border-dashed border-gray-300 bg-white p-4 text-center text-xs text-gray-500">Aucune traçabilité disponible pour ce compte.</div>}
      </div>
    );
  }, [account]);

  const actionsMenu = (
    <div className="relative">
      <button type="button" onClick={() => setActionsOpen((value) => !value)} className="flex h-8 items-center gap-1 border border-gray-300 px-3 text-xs text-gray-700 transition-all hover:border-purple-500 hover:bg-purple-50 hover:text-purple-700"><FiSettings size={12} /> Actions</button>
      {actionsOpen && <div className="absolute right-0 top-full z-50 mt-1 w-52 border border-gray-300 bg-white shadow-lg">
        <button type="button" onClick={() => navigate('/comptabilite/accounts/new', { state: { frameworkId } })} className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs hover:bg-purple-50"><FiPlus size={12} /> Nouveau compte</button>
        {isShowMode && <button type="button" onClick={() => { setTraceabilityOpen((value) => !value); setActionsOpen(false); }} className="flex w-full items-center gap-2 border-t border-gray-100 px-3 py-2 text-left text-xs hover:bg-purple-50"><FiInfo size={12} /> {traceabilityOpen ? 'Masquer la traçabilité' : 'Afficher la traçabilité'}</button>}
      </div>}
    </div>
  );

  if (pageLoading) {
    return <div className="flex h-full items-center justify-center bg-white"><Spin size="large" tip="Chargement du compte..." /></div>;
  }

  return (
    <UnifiedFormPage
      title="Comptes comptables"
      recordLabel={recordLabel}
      pageLabel={isShowMode ? 'Détail du compte comptable' : 'Création d’un compte comptable'}
      mode={mode}
      fallbackPath="/comptabilite/accounts"
      primaryAction={{ label: 'Nouveau', icon: <FiPlus size={12} />, path: '/comptabilite/accounts/new', state: { frameworkId } }}
      headerActions={isShowMode ? [
        { id: 'ledger', label: 'Grand-livre', icon: <FiBookOpen size={12} />, path: `/comptabilite/grand-livre?account=${id}` },
        { id: 'balance', label: 'Solde du compte', icon: <FiBarChart2 size={12} />, path: `/comptabilite/balance?account=${id}` },
      ] : []}
      actionsMenu={actionsMenu}
      onSave={save}
      saveLabel={isShowMode ? 'Enregistrer les modifications' : 'Enregistrer'}
      saving={saving}
      autoReturnAfterSave={!isShowMode}
      buildReturnState={buildReturnState}
      hasUnsavedChanges={hasChanges}
      rememberForm={!isShowMode}
      memoryKey="comptabilite:account:form:v3"
      memoryState={!isShowMode ? form.getFieldsValue() : undefined}
      onRestoreMemoryState={!isShowMode ? (values) => form.setFieldsValue(values || {}) : undefined}
      feedback={feedback}
      onDismissFeedback={() => setFeedback(null)}
      messageDuration={15000}
      process={<div className="flex items-center justify-end gap-2 px-4 py-2"><span className={`border px-3 py-1 text-xs font-semibold ${watchedActive !== false ? 'border-green-300 bg-green-50 text-green-700' : 'border-gray-300 bg-gray-50 text-gray-500'}`}>Actif</span><span className={`border px-3 py-1 text-xs font-semibold ${watchedActive === false ? 'border-red-300 bg-red-50 text-red-700' : 'border-gray-300 bg-gray-50 text-gray-500'}`}>Inactif</span></div>}
      traceability={isShowMode ? { open: traceabilityOpen, onOpen: () => setTraceabilityOpen(true), onClose: () => setTraceabilityOpen(false), title: 'Traçabilité', content: traceabilityContent } : null}
    >
      <Form form={form} layout="vertical" requiredMark={false} onValuesChange={() => { setHasChanges(true); setFeedback(null); }} className="account-form">
        <style>{`
          .account-form .ant-form-item { margin-bottom: 0; }
          .account-form .ant-input, .account-form .ant-select-selector { min-height: 26px !important; border-radius: 0 !important; font-size: 12px !important; box-shadow: none !important; }
          .account-form .ant-input { height: 26px; padding: 2px 8px; }
          .account-form .ant-select-selector { padding: 0 8px !important; }
          .account-form .ant-select-selection-item, .account-form .ant-select-selection-placeholder { line-height: 24px !important; font-size: 12px !important; }
          .account-form textarea.ant-input { height: 150px !important; resize: vertical; }
          .account-form .ant-input:hover,
          .account-form .ant-select:hover .ant-select-selector {
            border-color: #c084fc !important;
          }
          .account-form .ant-input:focus,
          .account-form .ant-select-focused .ant-select-selector {
            border-color: #9333ea !important;
            box-shadow: 0 0 0 1px #9333ea !important;
          }
          .account-form .ant-select-multiple .ant-select-selector {
            min-height: 26px !important;
            height: 26px !important;
            overflow: hidden;
            padding: 0 4px !important;
          }
          .account-form .ant-select-multiple .ant-select-selection-overflow {
            flex-wrap: nowrap;
          }
          .account-form .ant-select-multiple .ant-select-selection-item {
            height: 20px;
            line-height: 18px !important;
            margin-block: 2px;
            border-radius: 2px;
          }
          .account-form-autocomplete {
            height: 26px;
            border: 1px solid #d1d5db;
            border-radius: 0;
            background: #fff;
            box-shadow: none;
          }
          .account-form-autocomplete:hover { border-color: #c084fc; }
          .account-form-autocomplete:focus {
            border-color: #9333ea;
            box-shadow: 0 0 0 1px #9333ea;
          }
          .account-form-table .account-form-autocomplete,
          .account-form-table .account-form-autocomplete:hover,
          .account-form-table .account-form-autocomplete:focus {
            border: 0;
            background: transparent;
            box-shadow: none;
          }
          .account-form-autocomplete-menu,
          .account-form-select-dropdown {
            border: 1px solid #d1d5db !important;
            border-radius: 0 !important;
            padding: 0 !important;
            box-shadow: 0 10px 24px rgba(15, 23, 42, 0.14) !important;
            scrollbar-width: thin;
            scrollbar-color: #e2e8f0 transparent;
          }
          .account-form-autocomplete-menu::-webkit-scrollbar,
          .account-form-select-dropdown .rc-virtual-list-holder::-webkit-scrollbar {
            width: 3px;
          }
          .account-form-autocomplete-menu::-webkit-scrollbar-thumb,
          .account-form-select-dropdown .rc-virtual-list-holder::-webkit-scrollbar-thumb {
            background: #e2e8f0;
          }
          .account-form-select-dropdown .ant-select-item {
            min-height: 26px;
            border-radius: 0;
            padding: 4px 8px;
            font-size: 12px;
          }
          .account-form-select-dropdown .ant-select-item-option-active { background: #faf5ff !important; }
          .account-form-select-dropdown .ant-select-item-option-selected {
            background: #f3e8ff !important;
            color: #7e22ce;
          }
          .account-form-table .ant-form-item,
          .account-form-table .ant-form-item-control,
          .account-form-table .ant-form-item-control-input,
          .account-form-table .ant-form-item-control-input-content {
            min-height: 26px !important;
            height: 26px;
          }
          .account-form-table .ant-input,
          .account-form-table .ant-select-selector,
          .account-form-table .ant-input:hover,
          .account-form-table .ant-input:focus,
          .account-form-table .ant-select:hover .ant-select-selector,
          .account-form-table .ant-select-focused .ant-select-selector {
            height: 26px !important;
            border: 0 !important;
            border-radius: 0 !important;
            background: transparent !important;
            box-shadow: none !important;
          }
          .account-form-table .ant-input { padding: 2px 7px !important; }
          .account-form-table .ant-select {
            display: block;
            width: 100%;
          }
          .account-form-table .ant-select-selection-item,
          .account-form-table .ant-select-selection-placeholder {
            line-height: 24px !important;
          }
          .account-form-table td {
            height: 34px;
            background: #fff;
            transition: background-color 150ms ease, box-shadow 150ms ease;
          }
          .account-form-table tbody tr:hover td { background: #fafafa; }
          .account-form-table td:focus-within {
            background: #faf5ff;
            box-shadow: inset 0 0 0 1px #9333ea;
          }
          .account-fields-scroll {
            scrollbar-width: thin;
            scrollbar-color: #e2e8f0 transparent;
          }
          .account-fields-scroll::-webkit-scrollbar {
            width: 1px;
            height: 1px;
          }
          .account-fields-scroll::-webkit-scrollbar-track { background: transparent; }
          .account-fields-scroll::-webkit-scrollbar-thumb {
            background: #e2e8f0;
            border-radius: 999px;
          }
          .account-fields-scroll::-webkit-scrollbar-thumb:hover { background: #cbd5e1; }
          .account-form-notes textarea.ant-input {
            height: 150px !important;
            border: 0 !important;
            border-radius: 0 !important;
            box-shadow: none !important;
            padding: 9px 12px;
          }
          .account-form-notes textarea.ant-input:hover,
          .account-form-notes textarea.ant-input:focus {
            border: 0 !important;
            box-shadow: inset 0 0 0 1px #c084fc !important;
          }
          .account-form-notes .ant-input-data-count {
            right: 8px;
            bottom: 6px;
            font-size: 11px;
            color: #6b7280;
          }
        `}</style>

        <div className="border-b border-gray-300 px-4 py-3">
          <div className="grid grid-cols-2 gap-x-8 gap-y-2">
            <FieldLine label="Référentiel" required><Form.Item name="framework" rules={[{ required: true, message: 'Référentiel obligatoire' }]}><CompactSelect options={options.frameworks} disabled={isShowMode} placeholder="Sélectionner un référentiel" onChange={handleFrameworkChange} /></Form.Item></FieldLine>
            <FieldLine label="Nom du compte" required><Form.Item name="name" rules={[{ required: true, message: 'Nom obligatoire' }, { max: 255 }]}><Input placeholder="Achats de marchandises" /></Form.Item></FieldLine>
            <FieldLine label="Numéro de compte" required><Form.Item name="code" rules={[{ required: true, message: 'Numéro obligatoire' }, { max: 64 }]}><Input placeholder="6011000000" className="font-mono" /></Form.Item></FieldLine>
            <FieldLine label="Nom commercial"><Form.Item name="commercial_name" rules={[{ max: 255 }]}><Input placeholder="Nom commercial" /></Form.Item></FieldLine>
            <FieldLine label="Compte parent"><Form.Item name="parent"><CompactSelect options={parentAccounts} allowClear disabled={!frameworkId} placeholder="Aucun compte parent" /></Form.Item></FieldLine>
          </div>
        </div>

        <div className="border-b border-gray-300 px-4">
          {[
            ['classification', 'Paramètres du compte'], ['advanced', 'Paramètres avancés'], ['notes', 'Notes'],
          ].map(([key, label]) => <button key={key} type="button" onClick={() => setActiveTab(key)} className={`border-b-2 px-4 py-2 text-xs font-semibold transition-colors ${activeTab === key ? 'border-purple-600 text-purple-600' : 'border-transparent text-gray-500 hover:text-purple-600'}`}>{label}</button>)}
        </div>

        <div className="p-4">
          {activeTab === 'classification' && (
            <div className="account-fields-scroll mb-3 max-h-[52vh] overflow-auto">
              <table className="account-form-table table-fixed border-collapse text-xs" style={{ minWidth: `${tableWidth(CLASSIFICATION_COLUMNS)}px` }}>
                <colgroup>
                  {CLASSIFICATION_COLUMNS.map((column) => <col key={column.key} style={columnStyle(column.key)} />)}
                </colgroup>
                <thead className="sticky top-0 z-10">
                  <tr className="bg-gray-100">
                    {CLASSIFICATION_COLUMNS.map((column) => (
                      <TableHeader key={column.key} columnKey={column.key} onResize={startColumnResize}>{column.label}</TableHeader>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  <tr className="hover:bg-gray-50">
                    <TableCell><Form.Item name="type" rules={[{ required: true, message: 'Nature obligatoire' }]}><CompactSelect options={options.types} placeholder="Sélectionner une nature" onChange={handleTypeChange} /></Form.Item></TableCell>
                    <TableCell><Form.Item name="group"><CompactSelect options={options.groups} allowClear placeholder="Classe (optionnel)" /></Form.Item></TableCell>
                    <TableCell><Form.Item name="account_type"><CompactSelect options={[{ value: 'detail', label: 'Détail' }, { value: 'total', label: 'Total' }]} /></Form.Item></TableCell>
                    <TableCell><Form.Item name="length"><Input type="number" min={1} max={20} placeholder="10" /></Form.Item></TableCell>
                    <TableCell><Form.Item name="company"><CompactSelect options={options.entities} allowClear placeholder="Toutes les sociétés" /></Form.Item></TableCell>
                    <TableCell><Form.Item name="currency"><CompactSelect options={options.currencies} allowClear placeholder="Devise par défaut" /></Form.Item></TableCell>
                    <TableCell><Form.Item name="reconcile" valuePropName="checked"><CompactToggle /></Form.Item></TableCell>
                    <TableCell><Form.Item name="active" valuePropName="checked"><CompactToggle checkedLabel="Actif" uncheckedLabel="Inactif" /></Form.Item></TableCell>
                  </tr>
                </tbody>
              </table>
            </div>
          )}

          {activeTab === 'advanced' && (
            <div className="account-fields-scroll mb-3 max-h-[52vh] overflow-auto">
              <table className="account-form-table table-fixed border-collapse text-xs" style={{ minWidth: `${tableWidth(ADVANCED_COLUMNS)}px` }}>
                <colgroup>
                  {ADVANCED_COLUMNS.map((column) => <col key={column.key} style={columnStyle(column.key)} />)}
                </colgroup>
                <thead className="sticky top-0 z-10">
                  <tr className="bg-gray-100">
                    {ADVANCED_COLUMNS.map((column) => (
                      <TableHeader key={column.key} columnKey={column.key} onResize={startColumnResize}>{column.label}</TableHeader>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  <tr className="hover:bg-gray-50">
                    <TableCell><Form.Item name="default_tax_id"><CompactSelect options={options.taxes} allowClear placeholder="Aucune taxe" /></Form.Item></TableCell>
                    <TableCell><Form.Item name="current_tax_id"><CompactSelect options={options.taxes} allowClear placeholder="Aucune taxe" /></Form.Item></TableCell>
                    <TableCell><Form.Item name="allowed_journal_ids"><Select mode="multiple" size="small" allowClear showSearch optionFilterProp="label" maxTagCount="responsive" options={options.journals} className="account-form-cell-control w-full" popupClassName="account-form-select-dropdown" listHeight={220} placeholder="Tous les journaux" /></Form.Item></TableCell>
                    <TableCell><Form.Item name="analytic_account"><Input placeholder="Compte analytique" /></Form.Item></TableCell>
                    <TableCell><Form.Item name="ifrs_account"><Input placeholder="Compte IFRS" /></Form.Item></TableCell>
                    <TableCell><Form.Item name="reporting_account"><Input placeholder="Compte de reporting" /></Form.Item></TableCell>
                    <TableCell><Form.Item name="locked" valuePropName="checked"><CompactToggle checkedLabel="Verrouillé" uncheckedLabel="Déverrouillé" /></Form.Item></TableCell>
                    <TableCell><Form.Item name="closing_type" valuePropName="checked"><CompactToggle checkedLabel="Activée" uncheckedLabel="Désactivée" /></Form.Item></TableCell>
                  </tr>
                </tbody>
              </table>
            </div>
          )}

          {activeTab === 'notes' && <div className="account-form-notes border border-gray-300"><div className="border-b border-gray-300 bg-gray-100 px-3 py-1.5 text-xs font-medium text-gray-700">Notes / Description</div><Form.Item name="note"><TextArea maxLength={1000} showCount placeholder="Description, utilisation et remarques..." /></Form.Item></div>}
        </div>
      </Form>
    </UnifiedFormPage>
  );
}
