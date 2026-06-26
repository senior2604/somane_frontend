// src/features/comptabilite/pages/accounts/AccountEdit.jsx
import { CloseOutlined } from '@ant-design/icons';
import {
  Form,
  Input,
  message,
  Spin,
  Switch,
} from 'antd';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  FiAlertCircle,
  FiCheck,
  FiEye,
  FiInfo,
  FiPlus,
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

function AccountEdit() {
  const [form] = Form.useForm();
  const navigate = useNavigate();
  const { id } = useParams();

  const { updateAccount, fetchAccountById } = useAccountStore();
  const { frameworks, fetchFrameworks } = useFrameworkStore();

  const [pageLoading, setPageLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedFramework, setSelectedFramework] = useState(null);
  const [accountLabel, setAccountLabel] = useState('');
  const [activeTab, setActiveTab] = useState('classification');
  const [showActionsMenu, setShowActionsMenu] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  const [types, setTypes] = useState([]);
  const [groups, setGroups] = useState([]);
  const [entities, setEntities] = useState([]);
  const [currencies, setCurrencies] = useState([]);
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
      const [frameworksResponse, account, entitiesRes, currenciesRes] = await Promise.all([
        fetchFrameworks(),
        fetchAccountById(id),
        axiosInstance.get(ENDPOINTS.ENTITES),
        axiosInstance.get(ENDPOINTS.DEVISES),
      ]);

      setEntities(entitiesRes.data.results || entitiesRes.data);
      setCurrencies(currenciesRes.data.results || currenciesRes.data);

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
      setAccountLabel(`${account.code} - ${account.name}`);
      sessionStorage.setItem(FRAMEWORK_SESSION_KEY, String(fwId));

      const [{ types: loadedTypes, groups: loadedGroups }] = await Promise.all([
        loadTypesAndGroups(fwId),
        loadParentAccounts(fwId),
      ]);

      const resolvedGroupId = resolveAccountGroupId(account, loadedTypes, loadedGroups);
      const resolvedLength = resolveAccountLength(account);

      form.setFieldsValue({
        framework: fwId,
        code: account.code,
        name: account.name,
        type: account.type ?? null,
        group: resolvedGroupId,
        parent: account.parent ?? null,
        company: account.company ?? null,
        currency: account.currency ?? null,
        reconcile: account.reconcile ?? false,
        active: account.active ?? true,
        note: account.note ?? '',
        account_type: account.account_type ?? 'total',
        locked: account.locked ?? false,
        closing_type: account.closing_type ?? true,
        length: resolvedLength,
      });
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
      await updateAccount(id, values);
      setSuccess('Compte modifié avec succès');
      message.success('Compte modifié avec succès');
      navigate('/comptabilite/accounts');
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
      `}</style>

      <div className="max-w-7xl mx-auto bg-white border border-gray-300">
        <Form
          form={form}
          layout="vertical"
          onFinish={onFinish}
          requiredMark={false}
          size="middle"
          className="account-edit-form"
        >
          <div className="border-b border-gray-300 px-4 py-3">
            <div className="flex items-start justify-between mb-2">
              <div className="flex items-start gap-3">
                <Tooltip text="Créer un nouveau compte">
                  <button
                    type="button"
                    onClick={() => navigate('/comptabilite/accounts/new', { state: { frameworkId: selectedFramework } })}
                    className="h-12 px-4 bg-purple-600 text-white text-sm hover:bg-purple-700 transition-all flex items-center gap-1 font-medium"
                  >
                    <FiPlus size={16} /><span>Nouveau</span>
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

              <div className="flex items-center gap-2">
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
                          navigate(`/comptabilite/accounts/${id}`);
                        }}
                        className="w-full px-3 py-2 text-xs text-left hover:bg-gray-50 flex items-center gap-2"
                      >
                        <FiEye size={12} /> Voir le détail
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
                    </div>
                  )}
                </div>
                <Tooltip text="Voir le détail">
                  <button
                    type="button"
                    onClick={() => navigate(`/comptabilite/accounts/${id}`)}
                    className="h-8 px-3 border border-gray-300 text-gray-700 text-xs hover:bg-gray-50 flex items-center gap-1"
                  >
                    <FiEye size={12} /><span>Détail</span>
                  </button>
                </Tooltip>
                <Tooltip text="Enregistrer">
                  <button
                    type="button"
                    onClick={() => form.submit()}
                    disabled={saving}
                    className="w-8 h-8 rounded-full bg-purple-600 text-white hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                  >
                    <FiUploadCloud size={16} />
                  </button>
                </Tooltip>
                <Tooltip text="Annuler">
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

                <FieldLine label="Code" required>
                  <Form.Item name="code" rules={[{ required: true, message: 'Code obligatoire' }, { max: 64 }]}>
                    <Input placeholder="ex : 411001" style={{ fontFamily: 'monospace' }} />
                  </Form.Item>
                </FieldLine>
              </div>

              <div className="space-y-2">
                <FieldLine label="Libellé" required>
                  <Form.Item name="name" rules={[{ required: true, message: 'Libellé obligatoire' }, { max: 255 }]}>
                    <Input placeholder="ex : Clients - ventes de produits" />
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
                  {tab === 'classification' ? 'Classification' : tab === 'parametres' ? 'Paramètres comptables' : 'Notes'}
                </button>
              ))}
            </div>
          </div>

          <div className="p-4">
            {activeTab === 'classification' && (
              <div className="border border-gray-300">
                <div className="grid grid-cols-4 bg-gray-100 border-b border-gray-300">
                  {['Nature du compte', 'Classe / Groupe', 'Type de compte', 'Longueur'].map((heading) => (
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
              </div>
            )}

            {activeTab === 'parametres' && (
              <div className="border border-gray-300">
                <div className="grid grid-cols-3 bg-gray-100 border-b border-gray-300">
                  {['Devise', 'Entité spécifique', 'Options'].map((heading) => (
                    <div key={heading} className="border-r border-gray-300 px-2 py-1.5 text-xs font-medium text-gray-700 last:border-r-0">
                      {heading}
                    </div>
                  ))}
                </div>
                <div className="grid grid-cols-3 border-b border-gray-300">
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
                    <Form.Item name="company">
                      <PieceDropdown
                        placeholder="Toutes les entités"
                        allowClear
                        options={entities.map((entity) => ({
                          label: entity.raison_sociale || entity.name,
                          value: entity.id,
                        }))}
                      />
                    </Form.Item>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-4 px-1 text-xs text-gray-700" style={{ height: '24px' }}>
                      <Form.Item name="active" valuePropName="checked">
                        <Switch checkedChildren="Oui" unCheckedChildren="Non" />
                      </Form.Item>
                      <span>Actif</span>
                    </div>
                  </TableCell>
                </div>
                <div className="grid grid-cols-3">
                  <TableCell>
                    <div className="flex items-center gap-3 px-1 text-xs text-gray-700" style={{ height: '24px' }}>
                      <Form.Item name="reconcile" valuePropName="checked">
                        <Switch checkedChildren="Oui" unCheckedChildren="Non" />
                      </Form.Item>
                      <span>Lettrable</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-3 px-1 text-xs text-gray-700" style={{ height: '24px' }}>
                      <Form.Item name="locked" valuePropName="checked">
                        <Switch checkedChildren="Oui" unCheckedChildren="Non" />
                      </Form.Item>
                      <span>Verrouillé</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-3 px-1 text-xs text-gray-700" style={{ height: '24px' }}>
                      <Form.Item name="closing_type" valuePropName="checked">
                        <Switch checkedChildren="Clôturer" unCheckedChildren="Non" />
                      </Form.Item>
                      <span>Clôture</span>
                    </div>
                  </TableCell>
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
    </div>
  );
}

export { AccountEdit };
export default AccountEdit;
