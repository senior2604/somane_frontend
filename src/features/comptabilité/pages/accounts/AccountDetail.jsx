// src/features/comptabilite/pages/accounts/AccountDetail.jsx
import { CloseOutlined } from '@ant-design/icons';
import {
  Form,
  Input,
  message,
  Select,
  Spin,
  Switch,
} from 'antd';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  FiAlertCircle,
  FiBarChart2,
  FiBookOpen,
  FiCheck,
  FiInfo,
  FiRefreshCw,
  FiSettings,
  FiUploadCloud,
} from 'react-icons/fi';
import { useNavigate, useParams } from 'react-router-dom';

import { ENDPOINTS } from '../../../../config/api';
import axiosInstance from '../../../../config/axiosInstance';
import useAccountStore from '../../../../stores/comptabilite/accountStore';
import useFrameworkStore from '../../../../stores/comptabilite/frameworkStore';

const { TextArea } = Input;

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
          <div className={`absolute w-2 h-2 bg-gray-800 transform rotate-45 ${
            position === 'top' ? 'top-full left-1/2 -translate-x-1/2 -mt-1' :
            position === 'bottom' ? 'bottom-full left-1/2 -translate-x-1/2 -mb-1' :
            position === 'left' ? 'left-full top-1/2 -translate-y-1/2 -ml-1' :
            'right-full top-1/2 -translate-y-1/2 -mr-1'
          }`} />
        </div>
      )}
    </div>
  );
};

const PieceDropdown = ({
  value,
  onChange,
  afterChange,
  options = [],
  placeholder = '',
  disabled = false,
  allowClear = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const [dropdownStyle, setDropdownStyle] = useState({});
  const inputRef = useRef(null);
  const dropdownRef = useRef(null);

  const getSelectedOption = useCallback(() => (
    options.find((option) => String(option.value) === String(value))
  ), [options, value]);

  useEffect(() => {
    const selected = getSelectedOption();
    setInputValue(selected?.label || '');
  }, [getSelectedOption]);

  const filteredOptions = options.filter((option) =>
    String(option.label || '').toLowerCase().includes(inputValue.toLowerCase())
  );

  const updateDropdownPosition = useCallback(() => {
    if (!inputRef.current) return;
    const rect = inputRef.current.getBoundingClientRect();
    setDropdownStyle({
      position: 'fixed',
      top: `${rect.bottom}px`,
      left: `${rect.left}px`,
      width: `${rect.width}px`,
      zIndex: 9999,
      maxHeight: '220px',
      overflowY: 'auto',
    });
  }, []);

  useEffect(() => {
    if (!isOpen) return undefined;
    updateDropdownPosition();
    const handleScroll = () => updateDropdownPosition();
    const handleResize = () => updateDropdownPosition();
    window.addEventListener('scroll', handleScroll, true);
    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('scroll', handleScroll, true);
      window.removeEventListener('resize', handleResize);
    };
  }, [isOpen, updateDropdownPosition]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target) &&
        inputRef.current &&
        !inputRef.current.contains(event.target)
      ) {
        setIsOpen(false);
        const selected = getSelectedOption();
        setInputValue(selected?.label || '');
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [getSelectedOption]);

  const selectOption = (option) => {
    if (disabled) return;
    setInputValue(option.label || '');
    setIsOpen(false);
    onChange?.(option.value);
    afterChange?.(option.value, option);
  };

  const clearSelection = (event) => {
    event.preventDefault();
    event.stopPropagation();
    if (disabled) return;
    setInputValue('');
    setIsOpen(false);
    onChange?.(null);
    afterChange?.(null, null);
  };

  const handleInputChange = (event) => {
    if (disabled) return;
    setInputValue(event.target.value);
    setIsOpen(true);
    setHighlightedIndex(0);
    if (value) {
      onChange?.(null);
      afterChange?.(null, null);
    }
  };

  const handleKeyDown = (event) => {
    if (disabled) return;

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setIsOpen(true);
      setHighlightedIndex((prev) => (prev < filteredOptions.length - 1 ? prev + 1 : prev));
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : 0));
    } else if (event.key === 'Enter' && isOpen && filteredOptions.length > 0) {
      event.preventDefault();
      selectOption(filteredOptions[highlightedIndex]);
    } else if (event.key === 'Escape') {
      setIsOpen(false);
      const selected = getSelectedOption();
      setInputValue(selected?.label || '');
    }
  };

  useEffect(() => {
    if (isOpen && dropdownRef.current && filteredOptions.length > 0) {
      const element = dropdownRef.current.children[highlightedIndex];
      if (element) element.scrollIntoView({ block: 'nearest' });
    }
  }, [filteredOptions.length, highlightedIndex, isOpen]);

  return (
    <>
      <div className="relative flex items-center">
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={() => {
            if (!disabled) {
              setIsOpen(true);
              updateDropdownPosition();
            }
          }}
          placeholder={placeholder}
          disabled={disabled}
          className={`w-full px-2 py-1 text-xs focus:ring-1 focus:ring-blue-500 focus:outline-none ${
            disabled ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : ''
          }`}
          style={{ height: '24px', border: 'none', backgroundColor: disabled ? '#f3f4f6' : 'transparent' }}
          autoComplete="off"
        />
        {allowClear && value && !disabled && (
          <button
            type="button"
            onClick={clearSelection}
            className="absolute right-1 top-1/2 -translate-y-1/2 px-1 text-xs text-gray-400 hover:text-gray-700"
            tabIndex={-1}
          >
            x
          </button>
        )}
      </div>
      {isOpen && !disabled && filteredOptions.length > 0 && (
        <div ref={dropdownRef} className="bg-white border border-gray-300 shadow-lg" style={dropdownStyle}>
          {filteredOptions.map((option, index) => (
            <div
              key={option.value}
              className={`px-2 py-1 text-xs cursor-pointer ${
                index === highlightedIndex ? 'bg-blue-100 text-blue-700' : 'hover:bg-blue-50'
              } ${String(option.value) === String(value) ? 'bg-blue-50' : ''}`}
              onClick={() => selectOption(option)}
              onMouseEnter={() => setHighlightedIndex(index)}
            >
              {option.label}
            </div>
          ))}
        </div>
      )}
    </>
  );
};

const FieldLine = ({ label, required = false, children }) => (
  <div className="flex items-center" style={{ height: '26px' }}>
    <label className="text-xs text-gray-700 min-w-[140px] font-medium">
      {label}{required ? ' *' : ''}
    </label>
    <div className="flex-1 ml-2 border border-gray-300 account-edit-control">
      {children}
    </div>
  </div>
);

const TableCell = ({ children, className = '' }) => (
  <div className={`border-r border-gray-300 p-1 last:border-r-0 ${className}`}>
    {children}
  </div>
);

const normalizeApiList = (data) => {
  const list = Array.isArray(data) ? data : (data?.results || []);
  return Array.isArray(list) ? list : [];
};

const relationId = (value) => {
  if (!value) return null;
  if (typeof value === 'object') return value.id ?? value.value ?? null;
  return value;
};

const relationIds = (value) => {
  if (!Array.isArray(value)) return [];
  return value.map((item) => relationId(item)).filter((item) => item !== null && item !== undefined);
};

const formatDateTime = (value) => {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleString('fr-FR');
};

const normalizeValue = (value) =>
  String(value || '').trim().toLowerCase();

const resolveAccountGroupId = (account, typesList, groupsList) => {
  const directGroupId =
    relationId(account.group) ??
    account.group_id ??
    account.type_group_id ??
    relationId(account.type_group);

  if (directGroupId) return directGroupId;

  const accountTypeId = relationId(account.type);
  const selectedType = typesList.find((type) => String(type.id) === String(accountTypeId));
  const typeGroupId =
    relationId(selectedType?.internal_group) ??
    selectedType?.internal_group_id ??
    selectedType?.type_group_id ??
    relationId(selectedType?.group);

  if (typeGroupId) return typeGroupId;

  const groupCode = normalizeValue(account.type_group_code || account.group_code);
  const groupName = normalizeValue(account.type_group_name || account.group_name);
  const groupLabel = normalizeValue(account.type_group_label || account.group_label);

  const matchedGroup = groupsList.find((group) => {
    const code = normalizeValue(group.code);
    const name = normalizeValue(group.name);
    const label = normalizeValue(`${group.code || ''} - ${group.name || ''}`);
    return (
      (groupCode && code === groupCode) ||
      (groupName && name === groupName) ||
      (groupLabel && label === groupLabel)
    );
  });

  return matchedGroup?.id ?? null;
};

const resolveAccountLength = (account) => {
  const explicitLength =
    account.length ??
    account.code_length ??
    account.account_code_length ??
    account.exact_length;

  if (explicitLength !== null && explicitLength !== undefined && explicitLength !== '') {
    return explicitLength;
  }

  const code = String(account.code || '').trim();
  return code ? code.length : '';
};

function AccountDetail() {
  const [form] = Form.useForm();
  const navigate = useNavigate();
  const { id } = useParams();

  const { updateAccount, fetchAccountById } = useAccountStore();
  const { frameworks, fetchFrameworks } = useFrameworkStore();
  const initialValuesRef = useRef({});

  const [pageLoading, setPageLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [sourceAccount, setSourceAccount] = useState(null);
  const [selectedFramework, setSelectedFramework] = useState(null);
  const [accountLabel, setAccountLabel] = useState('');
  const [activeTab, setActiveTab] = useState('classification');
  const [showActionsMenu, setShowActionsMenu] = useState(false);
  const [showTraceabilityPanel, setShowTraceabilityPanel] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  const [types, setTypes] = useState([]);
  const [groups, setGroups] = useState([]);
  const [entities, setEntities] = useState([]);
  const [currencies, setCurrencies] = useState([]);
  const [taxes, setTaxes] = useState([]);
  const [journals, setJournals] = useState([]);
  const [parentAccounts, setParentAccounts] = useState([]);

  const watchedFramework = Form.useWatch('framework', form);
  const watchedCode = Form.useWatch('code', form);
  const watchedName = Form.useWatch('name', form);
  const watchedType = Form.useWatch('type', form);
  const activeValue = Form.useWatch('active', form);
  const isActive = activeValue !== false;
  const readyForValidation = Boolean(watchedFramework && watchedCode && watchedName && watchedType);

  const loadTypesAndGroups = useCallback(async (fwId) => {
    try {
      const [typesRes, groupsRes] = await Promise.all([
        axiosInstance.get(ENDPOINTS.COMPTA.TYPES, { params: { framework: fwId } }),
        axiosInstance.get(ENDPOINTS.COMPTA.GROUPS, { params: { framework: fwId } }),
      ]);
      const loadedTypes = typesRes.data.results || typesRes.data || [];
      const loadedGroups = groupsRes.data.results || groupsRes.data || [];
      setTypes(loadedTypes);
      setGroups(loadedGroups);
      return { types: loadedTypes, groups: loadedGroups };
    } catch (err) {
      console.error('Erreur chargement types/groupes', err);
      setTypes([]);
      setGroups([]);
      return { types: [], groups: [] };
    }
  }, []);

  const loadParentAccounts = useCallback(async (fwId) => {
    if (!fwId) {
      setParentAccounts([]);
      return;
    }

    try {
      const res = await axiosInstance.get(ENDPOINTS.COMPTA.ACCOUNTS, {
        params: {
          framework: fwId,
          company__isnull: true,
          page_size: 500,
          ordering: 'code',
        },
      });

      const accounts = res.data.results || res.data || [];
      const options = accounts
        .filter((acc) => String(acc.id) !== String(id))
        .map((acc) => ({
          label: `${acc.code} - ${acc.name}`,
          value: acc.id,
        }));

      setParentAccounts(options);
    } catch (err) {
      console.error('Erreur chargement comptes parents', err);
      message.warning('Impossible de charger les comptes parents');
      setParentAccounts([]);
    }
  }, [id]);

  const initPage = useCallback(async () => {
    setPageLoading(true);
    setError(null);
    setSuccess(null);
    try {
      const [frameworksResponse, account, entitiesRes, currenciesRes, taxesRes, journalsRes] = await Promise.all([
        fetchFrameworks(),
        fetchAccountById(id),
        axiosInstance.get(ENDPOINTS.ENTITES),
        axiosInstance.get(ENDPOINTS.DEVISES),
        axiosInstance.get(ENDPOINTS.COMPTA.TAXES).catch(() => ({ data: [] })),
        axiosInstance.get(ENDPOINTS.COMPTA.JOURNALS).catch(() => ({ data: [] })),
      ]);

      setEntities(entitiesRes.data.results || entitiesRes.data);
      setCurrencies(currenciesRes.data.results || currenciesRes.data);
      setTaxes(normalizeApiList(taxesRes.data));
      setJournals(normalizeApiList(journalsRes.data));

      const availableFrameworks = normalizeApiList(frameworksResponse);
      const accountFrameworkId = relationId(account.framework);
      const accountFrameworkExists = availableFrameworks.some(
        (framework) => String(framework.id) === String(accountFrameworkId)
      );
      const fallbackFrameworkId = availableFrameworks[0]?.id ?? null;
      const fwId = accountFrameworkExists ? accountFrameworkId : fallbackFrameworkId;

      if (!fwId) {
        throw new Error('Aucun référentiel comptable disponible');
      }

      setSelectedFramework(fwId);
      setSourceAccount(account);
      setAccountLabel(`${account.code} - ${account.name}`);
      sessionStorage.setItem(FRAMEWORK_SESSION_KEY, String(fwId));

      const [{ types: loadedTypes, groups: loadedGroups }] = await Promise.all([
        loadTypesAndGroups(fwId),
        loadParentAccounts(fwId),
      ]);

      const resolvedGroupId = resolveAccountGroupId(account, loadedTypes, loadedGroups);
      const resolvedLength = resolveAccountLength(account);

      const initialValues = {
        framework: fwId,
        code: account.code,
        name: account.name,
        commercial_name: account.commercial_name ?? account.nom_commercial ?? account.trade_name ?? '',
        type: relationId(account.type),
        group: resolvedGroupId,
        parent: relationId(account.parent),
        company: relationId(account.company),
        currency: relationId(account.currency),
        default_tax_id: account.default_tax_id ?? relationId(account.default_tax),
        current_tax_id: account.current_tax_id ?? relationId(account.current_tax),
        allowed_journal_ids: relationIds(account.allowed_journal_ids || account.allowed_journals),
        analytic_account: account.analytic_account ?? '',
        ifrs_account: account.ifrs_account ?? '',
        reporting_account: account.reporting_account ?? '',
        reconcile: account.reconcile ?? false,
        active: account.active ?? true,
        note: account.note ?? '',
        account_type: account.account_type ?? 'total',
        locked: account.locked ?? false,
        closing_type: account.closing_type ?? true,
        length: resolvedLength,
      };

      form.setFieldsValue(initialValues);
      initialValuesRef.current = initialValues;
      setHasChanges(false);
    } catch (caughtError) {
      message.error('Impossible de charger le compte à modifier');
      console.error(caughtError);
      navigate('/comptabilite/accounts');
    } finally {
      setPageLoading(false);
    }
  }, [
    id,
    fetchFrameworks,
    fetchAccountById,
    loadTypesAndGroups,
    loadParentAccounts,
    form,
    navigate,
  ]);

  useEffect(() => {
    initPage();
  }, [initPage]);

  const onFinish = async (values) => {
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const updatedAccount = await updateAccount(id, values);
      initialValuesRef.current = values;
      setHasChanges(false);
      if (updatedAccount?.code || updatedAccount?.name) {
        setSourceAccount((previous) => ({ ...(previous || {}), ...updatedAccount }));
        setAccountLabel(`${updatedAccount.code || values.code} - ${updatedAccount.name || values.name}`);
      } else {
        setSourceAccount((previous) => ({ ...(previous || {}), ...values }));
        setAccountLabel(`${values.code} - ${values.name}`);
      }
      setSuccess('Compte modifié avec succès');
      message.success('Compte modifié avec succès');
    } catch (caughtError) {
      const errorData = caughtError.response?.data;
      if (errorData && typeof errorData === 'object') {
        Object.entries(errorData).forEach(([field, errors]) => {
          const msg = Array.isArray(errors) ? errors.join(', ') : String(errors);
          message.error(`${field.toUpperCase()} : ${msg}`);
          setError(`${field.toUpperCase()} : ${msg}`);
        });
      } else {
        const msg = caughtError.message || 'Erreur lors de la modification';
        message.error(msg);
        setError(msg);
      }
    } finally {
      setSaving(false);
    }
  };

  const handleIgnoreChanges = () => {
    form.setFieldsValue(initialValuesRef.current);
    setHasChanges(false);
    setError(null);
    setSuccess(null);
    message.info('Modifications ignorées');
  };

  const handleTypeChange = (typeId) => {
    const selectedType = types.find((type) => String(type.id) === String(typeId));
    const typeGroupId =
      relationId(selectedType?.internal_group) ??
      selectedType?.internal_group_id ??
      selectedType?.type_group_id ??
      relationId(selectedType?.group);

    if (typeGroupId) {
      form.setFieldValue('group', typeGroupId);
    }
  };

  const selectedFw = frameworks.find((f) => String(f.id) === String(selectedFramework));
  const traceabilityLogs = [
    {
      id: 'creation',
      action: 'Création du compte',
      target: sourceAccount?.code ? `${sourceAccount.code} - ${sourceAccount.name || ''}`.trim() : accountLabel,
      modelName: 'AccountAccount',
      date: sourceAccount?.created_at || sourceAccount?.create_date,
      user: sourceAccount?.created_by_name || sourceAccount?.create_uid_label || sourceAccount?.created_by,
    },
    {
      id: 'update',
      action: 'Dernière modification',
      target: sourceAccount?.code ? `${sourceAccount.code} - ${sourceAccount.name || ''}`.trim() : accountLabel,
      modelName: 'AccountAccount',
      date: sourceAccount?.updated_at || sourceAccount?.write_date,
      user: sourceAccount?.updated_by_name || sourceAccount?.write_uid_label || sourceAccount?.updated_by,
    },
  ].filter((log) => log.date || log.user || log.action);

  if (pageLoading) {
    return (
      <div className="min-h-screen bg-gray-50 p-4">
        <div className="max-w-7xl mx-auto bg-white border border-gray-300 min-h-[300px] flex items-center justify-center">
          <Spin size="large" tip="Chargement du compte..." />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <style>{`
        .account-edit-form .ant-form-item {
          margin-bottom: 0;
        }
        .account-edit-form .ant-input {
          height: 24px;
          min-height: 24px;
          border: 0 !important;
          border-radius: 0 !important;
          padding: 2px 8px !important;
          font-size: 12px !important;
          box-shadow: none !important;
        }
        .account-edit-form textarea.ant-input {
          height: 140px !important;
          min-height: 140px !important;
          line-height: 1.5 !important;
          resize: vertical;
        }
        .account-edit-form .ant-form-item-explain-error {
          font-size: 11px;
          margin-top: 2px;
        }
        .account-edit-control .ant-form-item-control-input {
          min-height: 24px;
        }
        .account-edit-control .ant-switch {
          min-width: 46px;
          transform: scale(0.85);
          transform-origin: left center;
        }
        .account-edit-form .ant-select-selector {
          min-height: 24px !important;
          border: 0 !important;
          border-radius: 0 !important;
          padding: 0 8px !important;
          font-size: 12px !important;
          box-shadow: none !important;
        }
        .account-edit-form .ant-select-selection-item,
        .account-edit-form .ant-select-selection-placeholder {
          font-size: 12px !important;
          line-height: 22px !important;
        }
      `}</style>

      <div className="max-w-7xl mx-auto bg-white border border-gray-300">
        <div className={`grid gap-0 ${showTraceabilityPanel ? 'lg:grid-cols-[minmax(0,1fr)_320px]' : 'grid-cols-1'}`}>
          <div className="min-w-0">
        <Form
          form={form}
          layout="vertical"
          onFinish={onFinish}
          onValuesChange={() => {
            setHasChanges(true);
            setSuccess(null);
          }}
          requiredMark={false}
          size="middle"
          className="account-edit-form"
        >
          <div className="border-b border-gray-300 px-4 py-3">
            <div className="flex items-start justify-between mb-2">
              <div className="flex items-start gap-3">
                <Tooltip text="Retour au plan comptable">
                  <button
                    type="button"
                    onClick={() => navigate('/comptabilite/accounts')}
                    className="h-12 px-4 bg-purple-600 text-white text-sm hover:bg-purple-700 transition-all flex items-center gap-1 font-medium"
                  >
                    <span>Plan comptable</span>
                  </button>
                </Tooltip>
                <div className="flex flex-col h-12 justify-center">
                  <div
                    className="text-lg font-bold text-gray-900 cursor-pointer hover:text-purple-600 transition-colors"
                    onClick={() => navigate('/comptabilite/accounts')}
                  >
                    Comptes comptables
                  </div>
                  <span className="text-xs text-gray-600 font-medium">
                    N° {watchedCode || accountLabel || 'Compte'}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2 flex-wrap justify-end">
                <div className="relative">
                  <Tooltip text="Menu des actions">
                    <button
                      type="button"
                      onClick={() => setShowActionsMenu(!showActionsMenu)}
                      className="h-8 px-3 border border-gray-300 text-gray-700 text-xs hover:bg-gray-50 flex items-center gap-1"
                    >
                      <FiSettings size={12} /><span>Actions</span>
                    </button>
                  </Tooltip>
                  {showActionsMenu && (
                    <div className="absolute right-0 mt-1 w-52 bg-white border border-gray-300 shadow-lg rounded-sm z-50">
                      <button
                        type="button"
                        onClick={() => {
                          setShowActionsMenu(false);
                          navigate('/comptabilite/accounts/new', { state: { frameworkId: selectedFramework } });
                        }}
                        className="w-full px-3 py-2 text-xs text-left hover:bg-gray-50 flex items-center gap-2 border-b border-gray-100"
                      >
                        <FiInfo size={12} /> Nouveau compte
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setShowActionsMenu(false);
                          navigate('/comptabilite/accounts');
                        }}
                        className="w-full px-3 py-2 text-xs text-left hover:bg-gray-50 flex items-center gap-2"
                      >
                        <FiInfo size={12} /> Retour à la liste
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setShowTraceabilityPanel((previous) => !previous);
                          setShowActionsMenu(false);
                        }}
                        className="w-full px-3 py-2 text-xs text-left hover:bg-gray-50 flex items-center gap-2"
                      >
                        <FiInfo size={12} /> {showTraceabilityPanel ? 'Masquer la traçabilité' : 'Afficher la traçabilité'}
                      </button>
                    </div>
                  )}
                </div>
                {hasChanges && (
                  <Tooltip text="Enregistrer les modifications">
                    <button
                      type="button"
                      onClick={() => form.submit()}
                      disabled={saving}
                      className="w-8 h-8 rounded-full bg-purple-600 text-white hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                    >
                      <FiUploadCloud size={16} />
                    </button>
                  </Tooltip>
                )}
                {hasChanges && (
                  <Tooltip text="Ignorer les modifications">
                    <button
                      type="button"
                      onClick={handleIgnoreChanges}
                      disabled={saving}
                      className="h-8 px-3 border border-gray-300 text-gray-700 text-xs hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                    >
                      <FiRefreshCw size={13} /><span>Ignorer les modifications</span>
                    </button>
                  </Tooltip>
                )}
                <Tooltip text="Grand-livre">
                  <button
                    type="button"
                    onClick={() => navigate(`/comptabilite/pieces?account=${id}&account_code=${encodeURIComponent(watchedCode || '')}`)}
                    className="h-8 px-3 border border-gray-300 text-gray-700 text-xs hover:bg-gray-50 flex items-center gap-1"
                  >
                    <FiBookOpen size={13} /><span>Grand-livre</span>
                  </button>
                </Tooltip>
                <Tooltip text="Solde du compte">
                  <button
                    type="button"
                    onClick={() => navigate(`/comptabilite/balance?account=${id}&account_code=${encodeURIComponent(watchedCode || '')}`)}
                    className="h-8 px-3 border border-gray-300 text-gray-700 text-xs hover:bg-gray-50 flex items-center gap-1"
                  >
                    <FiBarChart2 size={13} /><span>Solde du compte</span>
                  </button>
                </Tooltip>
                <Tooltip text="Fermer">
                  <button
                    type="button"
                    onClick={() => navigate('/comptabilite/accounts')}
                    className="w-8 h-8 rounded-full bg-black text-white hover:bg-gray-800 flex items-center justify-center"
                  >
                    <CloseOutlined />
                  </button>
                </Tooltip>
              </div>
            </div>
          </div>

          <div className="border-b border-gray-300 px-4 py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {error ? (
                  <div className="flex items-center gap-1 text-xs text-red-600">
                    <FiAlertCircle size={14} /><span>{error}</span>
                  </div>
                ) : success ? (
                  <div className="flex items-center gap-1 text-xs text-green-600">
                    <FiCheck size={14} /><span>{success}</span>
                  </div>
                ) : !readyForValidation ? (
                  <div className="flex items-center gap-1 text-xs text-amber-600">
                    <FiInfo size={14} /><span>Complétez référentiel, code, libellé et nature</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-1 text-xs text-green-600">
                    <FiCheck size={14} /><span>Compte prêt à être enregistré</span>
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2">
                <div className={`h-8 px-3 text-xs font-medium border flex items-center ${
                  isActive ? 'bg-green-100 text-green-700 border-green-300' : 'bg-gray-100 text-gray-500 border-gray-300'
                }`}>
                  Actif
                </div>
                <div className={`h-8 px-3 text-xs font-medium border flex items-center ${
                  !isActive ? 'bg-red-100 text-red-700 border-red-300' : 'bg-gray-100 text-gray-500 border-gray-300'
                }`}>
                  Inactif
                </div>
              </div>
            </div>
            <div className="mt-2 ml-1">
              <span className="text-xs text-gray-600 font-medium">
                {accountLabel || 'Compte en modification'}
              </span>
            </div>
          </div>

          {selectedFw && (
            <div className="px-4 py-1 bg-blue-50 text-blue-700 text-xs border-b border-blue-200">
              Référentiel actif : {selectedFw.code} - {selectedFw.name}
            </div>
          )}

          <div className="px-4 py-3 border-b border-gray-300">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <FieldLine label="Référentiel" required>
                  <Form.Item name="framework" rules={[{ required: true, message: 'Référentiel obligatoire' }]}>
                    <PieceDropdown
                      placeholder="Sélectionnez un plan comptable"
                      disabled
                      options={frameworks.map((fw) => ({
                        label: `${fw.code} - ${fw.name}`,
                        value: fw.id,
                      }))}
                    />
                  </Form.Item>
                </FieldLine>

                <FieldLine label="Numéro de compte" required>
                  <Form.Item name="code" rules={[{ required: true, message: 'Code obligatoire' }, { max: 64 }]}>
                    <Input placeholder="ex : 60110000" style={{ fontFamily: 'monospace' }} />
                  </Form.Item>
                </FieldLine>
              </div>

              <div className="space-y-2">
                <FieldLine label="Nom du compte" required>
                  <Form.Item name="name" rules={[{ required: true, message: 'Nom du compte obligatoire' }, { max: 255 }]}>
                    <Input placeholder="ex : Achats de marchandises" />
                  </Form.Item>
                </FieldLine>

                <FieldLine label="Nom commercial">
                  <Form.Item name="commercial_name" rules={[{ max: 255 }]}>
                    <Input placeholder="ex : MDKL" />
                  </Form.Item>
                </FieldLine>

                <FieldLine label="Compte parent">
                  <Form.Item name="parent">
                    <PieceDropdown
                      placeholder="Aucun (compte racine)"
                      allowClear
                      disabled={!selectedFramework}
                      options={parentAccounts}
                    />
                  </Form.Item>
                </FieldLine>
              </div>
            </div>
          </div>

          <div className="border-b border-gray-300">
            <div className="px-4 flex">
              {['classification', 'parametres', 'notes'].map((tab) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setActiveTab(tab)}
                  className={`px-4 py-2 text-xs font-medium border-b-2 transition-all ${
                    activeTab === tab
                      ? 'border-purple-600 text-purple-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  {tab === 'classification' ? 'Paramètres du compte' : tab === 'parametres' ? 'Paramètres avancés' : 'Notes'}
                </button>
              ))}
            </div>
          </div>

          <div className="p-4">
            {activeTab === 'classification' && (
              <div className="border border-gray-300">
                <div className="grid grid-cols-4 bg-gray-100 border-b border-gray-300">
                  {['Nature du compte', 'Classe du compte', 'Type de compte', 'Longueur'].map((heading) => (
                    <div key={heading} className="border-r border-gray-300 px-2 py-1.5 text-xs font-medium text-gray-700 last:border-r-0">
                      {heading}
                    </div>
                  ))}
                </div>
                <div className="grid grid-cols-4">
                  <TableCell>
                    <Form.Item name="type" rules={[{ required: true, message: 'Nature obligatoire' }]}>
                      <PieceDropdown
                        placeholder="Sélectionnez une nature"
                        disabled={!selectedFramework}
                        afterChange={handleTypeChange}
                        options={types.map((type) => ({
                          label: `${type.code || ''} - ${type.name}`,
                          value: type.id,
                        }))}
                      />
                    </Form.Item>
                  </TableCell>
                  <TableCell>
                    <Form.Item name="group">
                      <PieceDropdown
                        placeholder="Classe (optionnel)"
                        allowClear
                        disabled={!selectedFramework}
                        options={groups.map((group) => ({
                          label: `${group.code} - ${group.name}`,
                          value: group.id,
                        }))}
                      />
                    </Form.Item>
                  </TableCell>
                  <TableCell>
                    <Form.Item name="account_type">
                      <PieceDropdown
                        options={[
                          { label: 'Total', value: 'total' },
                          { label: 'Détail', value: 'detail' },
                        ]}
                      />
                    </Form.Item>
                  </TableCell>
                  <TableCell>
                    <Form.Item name="length">
                      <Input type="number" min={1} max={20} placeholder="ex: 10" />
                    </Form.Item>
                  </TableCell>
                </div>
                <div className="grid grid-cols-4 bg-gray-100 border-t border-b border-gray-300">
                  {['Société', 'Devise du compte', 'Lettrage autorisé', 'Activé'].map((heading) => (
                    <div key={heading} className="border-r border-gray-300 px-2 py-1.5 text-xs font-medium text-gray-700 last:border-r-0">
                      {heading}
                    </div>
                  ))}
                </div>
                <div className="grid grid-cols-4">
                  <TableCell>
                    <Form.Item name="company">
                      <PieceDropdown
                        placeholder="Toutes les sociétés"
                        allowClear
                        options={entities.map((entity) => ({
                          label: entity.raison_sociale || entity.name,
                          value: entity.id,
                        }))}
                      />
                    </Form.Item>
                  </TableCell>
                  <TableCell>
                    <Form.Item name="currency">
                      <PieceDropdown
                        placeholder="Devise par défaut"
                        allowClear
                        options={currencies.map((currency) => ({
                          label: `${currency.code} - ${currency.nom || currency.name}`,
                          value: currency.id,
                        }))}
                      />
                    </Form.Item>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-3 px-1 text-xs text-gray-700" style={{ height: '24px' }}>
                      <Form.Item name="reconcile" valuePropName="checked">
                        <Switch checkedChildren="Oui" unCheckedChildren="Non" />
                      </Form.Item>
                      <span>Lettrage autorisé</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-3 px-1 text-xs text-gray-700" style={{ height: '24px' }}>
                      <Form.Item name="active" valuePropName="checked">
                        <Switch checkedChildren="Oui" unCheckedChildren="Non" />
                      </Form.Item>
                      <span>Activé</span>
                    </div>
                  </TableCell>
                </div>
              </div>
            )}

            {activeTab === 'parametres' && (
              <div className="border border-gray-300">
                <div className="grid grid-cols-3 bg-gray-100 border-b border-gray-300">
                  {['Taxe par défaut', 'Taxe actuelle', 'Compte verrouillé'].map((heading) => (
                    <div key={heading} className="border-r border-gray-300 px-2 py-1.5 text-xs font-medium text-gray-700 last:border-r-0">
                      {heading}
                    </div>
                  ))}
                </div>
                <div className="grid grid-cols-3 border-b border-gray-300">
                  <TableCell>
                    <Form.Item name="default_tax_id">
                      <PieceDropdown
                        placeholder="Aucune taxe par défaut"
                        allowClear
                        options={taxes.map((tax) => ({
                          label: `${tax.name || tax.label || tax.code || 'Taxe'}${tax.amount ? ` (${tax.amount}%)` : ''}`,
                          value: tax.id,
                        }))}
                      />
                    </Form.Item>
                  </TableCell>
                  <TableCell>
                    <Form.Item name="current_tax_id">
                      <PieceDropdown
                        placeholder="Aucune taxe actuelle"
                        allowClear
                        options={taxes.map((tax) => ({
                          label: `${tax.name || tax.label || tax.code || 'Taxe'}${tax.amount ? ` (${tax.amount}%)` : ''}`,
                          value: tax.id,
                        }))}
                      />
                    </Form.Item>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-3 px-1 text-xs text-gray-700" style={{ height: '24px' }}>
                      <Form.Item name="locked" valuePropName="checked">
                        <Switch checkedChildren="Oui" unCheckedChildren="Non" />
                      </Form.Item>
                      <span>Compte verrouillé</span>
                    </div>
                  </TableCell>
                </div>
                <div className="grid grid-cols-3 bg-gray-100 border-b border-gray-300">
                  {['Journaux autorisés', 'Compte analytique', 'Compte IFRS'].map((heading) => (
                    <div key={heading} className="border-r border-gray-300 px-2 py-1.5 text-xs font-medium text-gray-700 last:border-r-0">
                      {heading}
                    </div>
                  ))}
                </div>
                <div className="grid grid-cols-3 border-b border-gray-300">
                  <TableCell>
                    <Form.Item name="allowed_journal_ids">
                      <Select
                        mode="multiple"
                        allowClear
                        placeholder="Tous les journaux"
                        maxTagCount="responsive"
                        options={journals.map((journal) => ({
                          label: `${journal.code || ''} - ${journal.name || journal.label || ''}`,
                          value: journal.id,
                        }))}
                      />
                    </Form.Item>
                  </TableCell>
                  <TableCell>
                    <Form.Item name="analytic_account" rules={[{ max: 255 }]}>
                      <Input placeholder="Compte analytique" />
                    </Form.Item>
                  </TableCell>
                  <TableCell>
                    <Form.Item name="ifrs_account" rules={[{ max: 255 }]}>
                      <Input placeholder="Compte IFRS" />
                    </Form.Item>
                  </TableCell>
                </div>
                <div className="grid grid-cols-3 bg-gray-100 border-b border-gray-300">
                  {['Compte de reporting', 'Clôture', ''].map((heading) => (
                    <div key={heading || 'empty'} className="border-r border-gray-300 px-2 py-1.5 text-xs font-medium text-gray-700 last:border-r-0">
                      {heading}
                    </div>
                  ))}
                </div>
                <div className="grid grid-cols-3">
                  <TableCell>
                    <Form.Item name="reporting_account" rules={[{ max: 255 }]}>
                      <Input placeholder="Compte de reporting" />
                    </Form.Item>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-3 px-1 text-xs text-gray-700" style={{ height: '24px' }}>
                      <Form.Item name="closing_type" valuePropName="checked">
                        <Switch checkedChildren="Clôturer" unCheckedChildren="Non" />
                      </Form.Item>
                      <span>Clôture</span>
                    </div>
                  </TableCell>
                  <TableCell />
                </div>
              </div>
            )}

            {activeTab === 'notes' && (
              <div className="border border-gray-300">
                <div className="bg-gray-100 border-b border-gray-300 px-2 py-1.5 text-xs font-medium text-gray-700">
                  Notes / Description
                </div>
                <div className="p-1">
                  <Form.Item name="note">
                    <TextArea
                      rows={5}
                      placeholder="Description détaillée, utilisation, remarques..."
                      showCount
                      maxLength={1000}
                    />
                  </Form.Item>
                </div>
              </div>
            )}
          </div>
        </Form>
          </div>

          {showTraceabilityPanel && (
            <aside className="border-l border-gray-300 bg-gray-50 min-h-[420px]">
              <div className="sticky top-0">
                <div className="px-4 py-3 border-b border-gray-300 bg-white flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FiInfo className="text-purple-600" size={14} />
                    <h3 className="text-xs font-semibold text-gray-800 uppercase tracking-wide">Traçabilité</h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowTraceabilityPanel(false)}
                    className="text-xs text-gray-500 hover:text-gray-900"
                  >
                    Fermer
                  </button>
                </div>
                <div className="px-4 py-3">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-medium text-gray-700">Activité liée au compte</span>
                    <span className="text-[11px] text-gray-500">{traceabilityLogs.length} événement(s)</span>
                  </div>
                  {traceabilityLogs.length > 0 ? (
                    <div className="space-y-2 max-h-[calc(100vh-240px)] overflow-y-auto pr-1">
                      {traceabilityLogs.map((log) => (
                        <div key={log.id} className="bg-white border border-gray-200 px-3 py-2">
                          <div className="text-xs font-medium text-gray-900">{log.action}</div>
                          {(log.target || log.modelName) && (
                            <div className="text-[11px] text-gray-500 mt-0.5">
                              {[log.target, log.modelName].filter(Boolean).join(' - ')}
                            </div>
                          )}
                          <div className="text-[11px] text-gray-500 mt-1">
                            {formatDateTime(log.date)}
                          </div>
                          {log.user && (
                            <div className="text-[11px] text-gray-500">
                              Par {log.user}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="bg-white border border-dashed border-gray-300 px-3 py-3 text-xs text-gray-500">
                      Aucune traçabilité disponible pour ce compte.
                    </div>
                  )}
                  <div className="mt-3 rounded-sm border border-blue-200 bg-blue-50 px-3 py-2 text-xs text-blue-700">
                    <FiAlertCircle className="mr-1 inline" size={12} />
                    Cette zone reprend les informations disponibles sur le compte.
                  </div>
                </div>
              </div>
            </aside>
          )}
        </div>
      </div>
    </div>
  );
}

export { AccountDetail };
export default AccountDetail;


