// src/features/comptabilite/pages/types/TypeCreate.jsx
import { CloseOutlined } from '@ant-design/icons';
import {
  Form,
  Input,
  message,
  Spin,
  Switch,
} from 'antd';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  FiAlertCircle,
  FiCheck,
  FiEye,
  FiInfo,
  FiPlus,
  FiSettings,
  FiUploadCloud,
} from 'react-icons/fi';
import { useLocation, useNavigate } from 'react-router-dom';

import { ENDPOINTS } from '../../../../config/api';
import axiosInstance from '../../../../config/axiosInstance';
import useFrameworkStore from '../../../../stores/comptabilite/frameworkStore';
import useTypeStore from '../../../../stores/comptabilite/typeStore';

const { TextArea } = Input;

const FRAMEWORK_SESSION_KEY = 'type_list_selected_framework';

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

const FieldLine = ({ label, required = false, children }) => (
  <div className="flex items-center" style={{ height: '32px' }}>
    <label className="text-xs text-gray-700 min-w-[160px] font-medium">
      {label}{required ? ' *' : ''}
    </label>
    <div className="flex-1 ml-2 border border-gray-300 bg-white">
      {children}
    </div>
  </div>
);

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

  const selectedOption = useMemo(
    () => options.find((option) => String(option.value) === String(value)),
    [options, value]
  );

  useEffect(() => {
    setInputValue(selectedOption?.label || '');
  }, [selectedOption]);

  const filteredOptions = useMemo(() => (
    options.filter((option) =>
      String(option.label || '').toLowerCase().includes(inputValue.toLowerCase())
    )
  ), [inputValue, options]);

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
        setInputValue(selectedOption?.label || '');
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [selectedOption]);

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
      setInputValue(selectedOption?.label || '');
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
      <div className="relative flex items-center border border-gray-300">
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
          className={`w-full px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 ${
            disabled ? 'bg-gray-100 text-gray-500 cursor-not-allowed' : 'bg-white text-gray-900'
          }`}
          style={{ height: '30px', border: 'none' }}
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

const TableCell = ({ children, className = '' }) => (
  <div className={`border-r border-gray-300 p-1 last:border-r-0 ${className}`}>
    {children}
  </div>
);

const normalizeApiList = (data) => {
  const list = data?.results || data || [];
  return Array.isArray(list) ? list : [];
};

function TypeCreate() {
  const [form] = Form.useForm();
  const navigate = useNavigate();
  const location = useLocation();

  const { createType } = useTypeStore();
  const { frameworks, fetchFrameworks } = useFrameworkStore();

  const [loading, setLoading] = useState(false);
  const [selectedFramework, setSelectedFramework] = useState(null);
  const [groups, setGroups] = useState([]);
  const [parentTypes, setParentTypes] = useState([]);
  const [activeTab, setActiveTab] = useState('infos');
  const [showActionsMenu, setShowActionsMenu] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [pendingNavigation, setPendingNavigation] = useState({
    to: '/comptabilite/types',
    options: undefined,
  });

  const watchedCode = Form.useWatch('code', form);
  const watchedName = Form.useWatch('name', form);
  const activeValue = Form.useWatch('active', form);
  const balanceType = Form.useWatch('default_balance_type', form);
  const readyForValidation = Boolean(watchedCode && watchedName && selectedFramework);
  const isActive = activeValue !== false;

  const loadFrameworkData = useCallback(async (fwId) => {
    if (!fwId) {
      setGroups([]);
      setParentTypes([]);
      return;
    }

    try {
      const [groupsRes, typesRes] = await Promise.all([
        axiosInstance.get(ENDPOINTS.COMPTA.GROUPS, { params: { framework: fwId } }),
        axiosInstance.get(ENDPOINTS.COMPTA.TYPES, { params: { framework: fwId } }),
      ]);
      setGroups(normalizeApiList(groupsRes.data));
      setParentTypes(normalizeApiList(typesRes.data));
    } catch (caughtError) {
      console.error('Erreur chargement groupes/types:', caughtError);
      setGroups([]);
      setParentTypes([]);
      message.warning('Impossible de charger les groupes et les natures du référentiel');
    }
  }, []);

  const initPage = useCallback(async () => {
    setLoading(true);
    setError(null);
    setSuccess(null);
    try {
      await fetchFrameworks();

      const fromState = location.state?.frameworkId ?? null;
      const parentFromState = location.state?.parentId ?? null;
      const fromSession = sessionStorage.getItem(FRAMEWORK_SESSION_KEY);
      const fwId = fromState ?? (fromSession ? parseInt(fromSession, 10) : null);

      form.setFieldsValue({
        active: true,
        include_in_opening_balance: true,
        closing_behavior: 'none',
        default_balance_type: 'debit',
        allow_reconciliation: false,
        default_debit: true,
        default_credit: false,
        parent: parentFromState || null,
      });

      if (fwId) {
        setSelectedFramework(fwId);
        form.setFieldValue('framework', fwId);
        await loadFrameworkData(fwId);
      }
    } catch (caughtError) {
      console.error(caughtError);
      message.error('Erreur lors du chargement');
      setError('Erreur lors du chargement');
    } finally {
      setLoading(false);
    }
  }, [fetchFrameworks, form, loadFrameworkData, location.state]);

  useEffect(() => {
    initPage();
  }, [initPage]);

  useEffect(() => {
    const handleBeforeUnload = (event) => {
      if (hasUnsavedChanges) {
        event.preventDefault();
        event.returnValue = '';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasUnsavedChanges]);

  const selectedFw = useMemo(
    () => frameworks.find((framework) => String(framework.id) === String(selectedFramework)),
    [frameworks, selectedFramework]
  );

  const frameworkOptions = useMemo(() => (
    frameworks.map((framework) => ({
      value: framework.id,
      label: `${framework.code || ''} - ${framework.name || ''}`.trim(),
    }))
  ), [frameworks]);

  const groupOptions = useMemo(() => (
    groups.map((group) => ({
      value: group.id,
      label: `${group.code || ''} - ${group.name || ''}`.trim(),
    }))
  ), [groups]);

  const parentTypeOptions = useMemo(() => (
    parentTypes.map((type) => ({
      value: type.id,
      label: `${type.code || ''} - ${type.name || ''}`.trim(),
    }))
  ), [parentTypes]);

  const handleFrameworkChange = async (fwId) => {
    setSelectedFramework(fwId);
    form.setFieldsValue({ internal_group: null, parent: null });
    if (fwId) {
      sessionStorage.setItem(FRAMEWORK_SESSION_KEY, String(fwId));
      await loadFrameworkData(fwId);
    } else {
      setGroups([]);
      setParentTypes([]);
    }
  };

  const handleBalanceTypeChange = (value) => {
    if (value === 'debit') {
      form.setFieldsValue({ default_debit: true, default_credit: false });
    } else if (value === 'credit') {
      form.setFieldsValue({ default_debit: false, default_credit: true });
    }
  };

  const handleDefaultDebitChange = (checked) => {
    if (checked) {
      form.setFieldsValue({ default_balance_type: 'debit', default_credit: false });
    }
  };

  const handleDefaultCreditChange = (checked) => {
    if (checked) {
      form.setFieldsValue({ default_balance_type: 'credit', default_debit: false });
    }
  };

  const navigateWithGuard = (to, options) => {
    if (hasUnsavedChanges) {
      setPendingNavigation({ to, options });
      setShowConfirmDialog(true);
      return;
    }

    navigate(to, options);
  };

  const createValues = async (values, redirect = { to: '/comptabilite/types', options: undefined }) => {
    setLoading(true);
    setError(null);
    setSuccess(null);
    try {
      await createType(values);
      setSuccess('Nature créée avec succès');
      message.success('Nature créée avec succès');
      setHasUnsavedChanges(false);
      navigate(redirect.to, redirect.options);
    } catch (caughtError) {
      const errorData = caughtError.response?.data;
      if (errorData && typeof errorData === 'object') {
        Object.entries(errorData).forEach(([field, errors]) => {
          const msg = Array.isArray(errors) ? errors.join(', ') : String(errors);
          message.error(`${field} : ${msg}`);
          setError(`${field} : ${msg}`);
        });
      } else {
        const msg = caughtError.message || 'Erreur lors de la création';
        message.error(msg);
        setError(msg);
      }
    } finally {
      setLoading(false);
    }
  };

  const onFinish = async (values) => {
    await createValues(values, { to: '/comptabilite/types', options: undefined });
  };

  const saveBeforeLeaving = async () => {
    try {
      const values = await form.validateFields();
      setShowConfirmDialog(false);
      await createValues(values, pendingNavigation);
    } catch {
      setShowConfirmDialog(false);
    }
  };

  const discardChanges = () => {
    setHasUnsavedChanges(false);
    setShowConfirmDialog(false);
    navigate(pendingNavigation.to, pendingNavigation.options);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <style>{`
        .type-create-form .ant-form-item {
          margin-bottom: 0;
        }
        .type-create-form .ant-input {
          min-height: 30px !important;
          border-radius: 0 !important;
          border-color: #d1d5db !important;
          font-size: 12px !important;
          box-shadow: none !important;
          padding: 3px 8px !important;
        }
        .type-create-form textarea.ant-input {
          min-height: 110px !important;
          line-height: 1.5 !important;
          resize: vertical;
        }
        .type-create-form .ant-form-item-explain-error,
        .type-create-form .ant-form-item-extra {
          font-size: 11px;
          margin-top: 2px;
        }
        .type-create-form .ant-switch {
          transform: scale(0.85);
          transform-origin: left center;
        }
      `}</style>

      <div className="mx-auto max-w-7xl border border-gray-300 bg-white">
        <Spin spinning={loading && frameworks.length === 0}>
          <Form
            form={form}
            layout="vertical"
            onFinish={onFinish}
            onValuesChange={() => setHasUnsavedChanges(true)}
            requiredMark="optional"
            size="middle"
            className="type-create-form"
          >
            <div className="border-b border-gray-300 px-4 py-3">
              <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 items-start gap-3">
                  <Tooltip text="Créer une nouvelle nature">
                    <button
                      type="button"
                      onClick={() => navigateWithGuard('/comptabilite/types/new', { state: { frameworkId: selectedFramework } })}
                      className="flex h-12 items-center gap-1 bg-purple-600 px-4 text-sm font-medium text-white transition-all hover:bg-purple-700"
                    >
                      <FiPlus size={16} /><span>Nouveau</span>
                    </button>
                  </Tooltip>
                  <div className="flex min-h-[48px] min-w-0 flex-col justify-center">
                    <div
                      className="cursor-pointer text-lg font-bold text-gray-900 transition-colors hover:text-purple-600"
                      onClick={() => navigateWithGuard('/comptabilite/types')}
                    >
                      Créer une nature de compte
                    </div>
                    <div className="mt-1 text-xs font-medium text-gray-600">
                      {watchedCode || watchedName
                        ? `${watchedCode || 'Nouveau'} - ${watchedName || 'Nature de compte'}`
                        : 'Définissez un nouveau type de compte comptable'}
                    </div>
                    {selectedFw && (
                      <div className="mt-1 text-xs text-gray-500">
                        Référentiel actif : {selectedFw.code} - {selectedFw.name}
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <div className="relative">
                    <Tooltip text="Menu des actions">
                      <button
                        type="button"
                        onClick={() => setShowActionsMenu(!showActionsMenu)}
                        className="flex h-8 items-center gap-1 border border-gray-300 px-3 text-xs text-gray-700 hover:bg-gray-50"
                      >
                        <FiSettings size={12} /><span>Actions</span>
                      </button>
                    </Tooltip>
                    {showActionsMenu && (
                      <div className="absolute right-0 z-50 mt-1 w-52 rounded-sm border border-gray-300 bg-white shadow-lg">
                        <button
                          type="button"
                          onClick={() => {
                            setShowActionsMenu(false);
                            navigateWithGuard('/comptabilite/types');
                          }}
                          className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs hover:bg-gray-50"
                        >
                          <FiInfo size={12} /> Retour à la liste
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setShowActionsMenu(false);
                            navigateWithGuard('/comptabilite/types');
                          }}
                          className="flex w-full items-center gap-2 border-t border-gray-100 px-3 py-2 text-left text-xs hover:bg-gray-50"
                        >
                          <FiEye size={12} /> Voir les natures
                        </button>
                      </div>
                    )}
                  </div>
                  <Tooltip text="Enregistrer">
                    <button
                      type="button"
                      onClick={() => form.submit()}
                      disabled={loading}
                      className="flex h-8 w-8 items-center justify-center rounded-full bg-purple-600 text-white hover:bg-purple-700 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <FiUploadCloud size={16} />
                    </button>
                  </Tooltip>
                  <Tooltip text="Annuler">
                    <button
                      type="button"
                      onClick={() => navigateWithGuard('/comptabilite/types')}
                      className="flex h-8 w-8 items-center justify-center rounded-full bg-black text-white hover:bg-gray-800"
                    >
                      <CloseOutlined />
                    </button>
                  </Tooltip>
                </div>
              </div>
            </div>

            <div className="border-b border-gray-300 px-4 py-2">
              <div className="flex items-center justify-between gap-3">
                <div>
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
                      <FiInfo size={14} /><span>Complétez le référentiel, le code et le nom de la nature</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1 text-xs text-green-600">
                      <FiCheck size={14} /><span>Nature prête à être enregistrée</span>
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <div className={`flex h-8 items-center border px-3 text-xs font-medium ${
                    isActive ? 'border-green-300 bg-green-100 text-green-700' : 'border-gray-300 bg-gray-100 text-gray-500'
                  }`}>
                    {isActive ? 'Actif' : 'Inactif'}
                  </div>
                  <div className="flex h-8 items-center border border-blue-300 bg-blue-100 px-3 text-xs font-medium text-blue-700">
                    {balanceType === 'credit' ? 'Créditeur' : 'Débiteur'}
                  </div>
                </div>
              </div>
            </div>

            <div className="border-b border-gray-300">
              <div className="px-4 flex">
                {['infos', 'parametres', 'notes'].map((tab) => (
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
                    {tab === 'infos' ? 'Informations' : tab === 'parametres' ? 'Paramètres' : 'Notes'}
                  </button>
                ))}
              </div>
            </div>

            <div className="p-4">
              {activeTab === 'infos' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <FieldLine label="Référentiel" required>
                        <Form.Item name="framework" rules={[{ required: true, message: 'Sélectionnez un référentiel' }]}>
                          <PieceDropdown
                            placeholder="Sélectionnez un plan comptable"
                            options={frameworkOptions}
                            afterChange={handleFrameworkChange}
                          />
                        </Form.Item>
                      </FieldLine>
                      <FieldLine label="Code" required>
                        <Form.Item
                          name="code"
                          rules={[
                            { required: true, message: 'Le code est obligatoire' },
                            { max: 32, message: 'Maximum 32 caractères' },
                          ]}
                        >
                          <Input placeholder="ex : IMMO" style={{ fontFamily: 'monospace' }} />
                        </Form.Item>
                      </FieldLine>
                    </div>
                    <div className="space-y-2">
                      <FieldLine label="Nom" required>
                        <Form.Item
                          name="name"
                          rules={[
                            { required: true, message: 'Le nom est obligatoire' },
                            { max: 255, message: 'Maximum 255 caractères' },
                          ]}
                        >
                          <Input placeholder="ex : Immobilisations" />
                        </Form.Item>
                      </FieldLine>
                      <FieldLine label="Statut">
                        <div className="flex items-center gap-2 px-2 text-xs text-gray-700" style={{ height: '30px' }}>
                          <Form.Item name="active" valuePropName="checked">
                            <Switch checkedChildren="Actif" unCheckedChildren="Inactif" />
                          </Form.Item>
                        </div>
                      </FieldLine>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <FieldLine label="Groupe / Classe">
                        <Form.Item name="internal_group">
                          <PieceDropdown
                            allowClear
                            disabled={!selectedFramework}
                            placeholder={selectedFramework ? 'Sélectionnez un groupe' : "Sélectionnez d'abord un référentiel"}
                            options={groupOptions}
                          />
                        </Form.Item>
                      </FieldLine>
                    </div>
                    <div className="space-y-2">
                      <FieldLine label="Nature parente">
                        <Form.Item name="parent">
                          <PieceDropdown
                            allowClear
                            disabled={!selectedFramework}
                            placeholder={selectedFramework ? 'Aucune (niveau racine)' : "Sélectionnez d'abord un référentiel"}
                            options={parentTypeOptions}
                          />
                        </Form.Item>
                      </FieldLine>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'parametres' && (
                <div className="space-y-4">
                  <div className="border border-gray-300">
                    <div className="grid grid-cols-4 bg-gray-100 border-b border-gray-300">
                      {['Solde par défaut', 'Débiteur', 'Créditeur', 'Statut'].map((heading) => (
                        <div key={heading} className="border-r border-gray-300 px-2 py-1.5 text-xs font-medium text-gray-700 last:border-r-0">
                          {heading}
                        </div>
                      ))}
                    </div>
                    <div className="grid grid-cols-4">
                      <TableCell>
                        <Form.Item name="default_balance_type" rules={[{ required: true }]}>
                          <PieceDropdown
                            options={[
                              { label: 'Débit', value: 'debit' },
                              { label: 'Crédit', value: 'credit' },
                            ]}
                            afterChange={handleBalanceTypeChange}
                          />
                        </Form.Item>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2 px-1 text-xs text-gray-700" style={{ height: '30px' }}>
                          <Form.Item name="default_debit" valuePropName="checked">
                            <Switch checkedChildren="Oui" unCheckedChildren="Non" onChange={handleDefaultDebitChange} />
                          </Form.Item>
                          <span>Généralement débiteur</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2 px-1 text-xs text-gray-700" style={{ height: '30px' }}>
                          <Form.Item name="default_credit" valuePropName="checked">
                            <Switch checkedChildren="Oui" unCheckedChildren="Non" onChange={handleDefaultCreditChange} />
                          </Form.Item>
                          <span>Généralement créditeur</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2 px-1 text-xs text-gray-700" style={{ height: '30px' }}>
                          <Form.Item name="active" valuePropName="checked">
                            <Switch checkedChildren="Actif" unCheckedChildren="Inactif" />
                          </Form.Item>
                        </div>
                      </TableCell>
                    </div>
                  </div>

                  <div className="border border-gray-300">
                    <div className="grid grid-cols-3 bg-gray-100 border-b border-gray-300">
                      {['Lettrage autorisé', "Bilan d'ouverture", 'Comportement à la clôture'].map((heading) => (
                        <div key={heading} className="border-r border-gray-300 px-2 py-1.5 text-xs font-medium text-gray-700 last:border-r-0">
                          {heading}
                        </div>
                      ))}
                    </div>
                    <div className="grid grid-cols-3">
                      <TableCell>
                        <div className="flex items-center gap-2 px-1 text-xs text-gray-700" style={{ height: '30px' }}>
                          <Form.Item name="allow_reconciliation" valuePropName="checked">
                            <Switch checkedChildren="Oui" unCheckedChildren="Non" />
                          </Form.Item>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2 px-1 text-xs text-gray-700" style={{ height: '30px' }}>
                          <Form.Item name="include_in_opening_balance" valuePropName="checked">
                            <Switch checkedChildren="Oui" unCheckedChildren="Non" />
                          </Form.Item>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Form.Item name="closing_behavior">
                          <PieceDropdown
                            options={[
                              { label: 'Aucun', value: 'none' },
                              { label: 'Report à nouveau', value: 'carry_forward' },
                            ]}
                          />
                        </Form.Item>
                      </TableCell>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'notes' && (
                <div className="border border-gray-300">
                  <div className="bg-gray-100 border-b border-gray-300 px-2 py-1.5 text-xs font-medium text-gray-700">
                    Notes
                  </div>
                  <div className="p-1">
                    <Form.Item name="note">
                      <TextArea rows={5} placeholder="Description fonctionnelle, cas d'usage..." showCount maxLength={1000} />
                    </Form.Item>
                  </div>
                </div>
              )}
            </div>
          </Form>
        </Spin>
      </div>

      {showConfirmDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="mx-4 w-full max-w-md rounded-sm bg-white p-6 shadow-lg">
            <h3 className="mb-3 text-lg font-bold text-gray-900">Modifications non sauvegardées</h3>
            <p className="mb-6 text-sm text-gray-600">
              Voulez-vous enregistrer les informations avant de quitter ?
            </p>
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={saveBeforeLeaving}
                className="bg-purple-600 px-4 py-2 text-sm text-white transition-all hover:bg-purple-700"
              >
                Enregistrer
              </button>
              <button
                type="button"
                onClick={discardChanges}
                className="bg-red-600 px-4 py-2 text-sm text-white transition-all hover:bg-red-700"
              >
                Ne pas enregistrer
              </button>
              <button
                type="button"
                onClick={() => setShowConfirmDialog(false)}
                className="border border-gray-300 px-4 py-2 text-sm text-gray-700 transition-all hover:bg-gray-50"
              >
                Annuler
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export { TypeCreate };
export default TypeCreate;
