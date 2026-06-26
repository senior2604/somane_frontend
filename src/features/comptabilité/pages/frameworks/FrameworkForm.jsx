// src/features/comptabilite/pages/frameworks/FrameworkForm.jsx
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
import useFrameworkStore from '../../../../stores/comptabilite/frameworkStore';

const { TextArea } = Input;

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

const relationId = (value) => {
  if (!value) return null;
  if (typeof value === 'object') return value.id ?? value.value ?? null;
  return value;
};

const normalizeApiList = (data) => {
  const list = data?.results || data || [];
  return Array.isArray(list) ? list : [];
};

const getCountryLabel = (country) => (
  country?.nom ||
  country?.name ||
  country?.libelle ||
  country?.code ||
  `Pays ${country?.id || ''}`.trim()
);

const getEntityLabel = (entity) => (
  entity?.raison_sociale ||
  entity?.name ||
  entity?.nom ||
  `Entité ${entity?.id || ''}`.trim()
);

const getSelectedOption = (options, value) => (
  options.find((option) => String(option.value) === String(value))
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

  const selectedOption = useCallback(() => getSelectedOption(options, value), [options, value]);

  useEffect(() => {
    const selected = selectedOption();
    setInputValue(selected?.label || '');
  }, [selectedOption]);

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
        const selected = selectedOption();
        setInputValue(selected?.label || '');
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
      const selected = selectedOption();
      setInputValue(selected?.label || '');
    }
  };

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

const MultiPieceDropdown = ({
  value = [],
  onChange,
  options = [],
  placeholder = '',
  disabled = false,
}) => {
  const selectedValues = Array.isArray(value) ? value : [];
  const [isOpen, setIsOpen] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [dropdownStyle, setDropdownStyle] = useState({});
  const inputRef = useRef(null);
  const dropdownRef = useRef(null);

  const selectedOptions = options.filter((option) =>
    selectedValues.some((selectedValue) => String(selectedValue) === String(option.value))
  );

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
      maxHeight: '240px',
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
        setInputValue('');
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const toggleOption = (option) => {
    if (disabled) return;
    const exists = selectedValues.some((selectedValue) => String(selectedValue) === String(option.value));
    const nextValues = exists
      ? selectedValues.filter((selectedValue) => String(selectedValue) !== String(option.value))
      : [...selectedValues, option.value];
    onChange?.(nextValues);
  };

  const removeOption = (event, optionValue) => {
    event.preventDefault();
    event.stopPropagation();
    if (disabled) return;
    onChange?.(selectedValues.filter((selectedValue) => String(selectedValue) !== String(optionValue)));
  };

  return (
    <>
      <div
        ref={inputRef}
        className={`min-h-[24px] flex items-center gap-1 px-1 py-0.5 ${disabled ? 'bg-gray-100 cursor-not-allowed' : 'cursor-text'}`}
        onClick={() => {
          if (!disabled) {
            setIsOpen(true);
            updateDropdownPosition();
          }
        }}
      >
        {selectedOptions.slice(0, 3).map((option) => (
          <span key={option.value} className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-blue-100 text-blue-700 text-[10px] rounded">
            {option.label}
            <button type="button" onClick={(event) => removeOption(event, option.value)} className="hover:text-red-600">
              x
            </button>
          </span>
        ))}
        {selectedOptions.length > 3 && (
          <span className="text-[10px] text-gray-500">+{selectedOptions.length - 3}</span>
        )}
        <input
          type="text"
          value={inputValue}
          onChange={(event) => {
            setInputValue(event.target.value);
            setIsOpen(true);
          }}
          disabled={disabled}
          placeholder={selectedOptions.length ? '' : placeholder}
          className="flex-1 min-w-[80px] text-xs focus:outline-none bg-transparent"
        />
      </div>
      {isOpen && !disabled && (
        <div ref={dropdownRef} className="bg-white border border-gray-300 shadow-lg" style={dropdownStyle}>
          {filteredOptions.length === 0 ? (
            <div className="px-2 py-2 text-xs text-gray-400">Aucune option disponible</div>
          ) : filteredOptions.map((option) => {
            const checked = selectedValues.some((selectedValue) => String(selectedValue) === String(option.value));
            return (
              <div
                key={option.value}
                className={`px-2 py-1 text-xs cursor-pointer flex items-center gap-2 ${
                  checked ? 'bg-blue-50 text-blue-700' : 'hover:bg-blue-50'
                }`}
                onClick={() => toggleOption(option)}
              >
                <input type="checkbox" checked={checked} readOnly className="w-3.5 h-3.5" />
                <span>{option.label}</span>
              </div>
            );
          })}
        </div>
      )}
    </>
  );
};

const FieldLine = ({ label, required = false, children }) => (
  <div className="flex items-center" style={{ height: '26px' }}>
    <label className="text-xs text-gray-700 min-w-[150px] font-medium">
      {label}{required ? ' *' : ''}
    </label>
    <div className="flex-1 ml-2 border border-gray-300 framework-form-control">
      {children}
    </div>
  </div>
);

const TableCell = ({ children, className = '' }) => (
  <div className={`border-r border-gray-300 p-1 last:border-r-0 ${className}`}>
    {children}
  </div>
);

function FrameworkForm() {
  const [form] = Form.useForm();
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = Boolean(id);

  const { createFramework, updateFramework, fetchFrameworkById } = useFrameworkStore();

  const [loading, setLoading] = useState(false);
  const [countries, setCountries] = useState([]);
  const [entities, setEntities] = useState([]);
  const [isShared, setIsShared] = useState(true);
  const [activeTab, setActiveTab] = useState('general');
  const [showActionsMenu, setShowActionsMenu] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  const watchedCode = Form.useWatch('code', form);
  const watchedName = Form.useWatch('name', form);
  const activeValue = Form.useWatch('active', form);
  const sharedValue = Form.useWatch('shared', form);
  const isActive = activeValue !== false;
  const readyForValidation = Boolean(watchedCode && watchedName);

  const countryOptions = countries.map((country) => ({
    label: getCountryLabel(country),
    value: country.id,
  }));

  const entityOptions = entities.map((entity) => ({
    label: getEntityLabel(entity),
    value: entity.id,
  }));

  const loadFormData = useCallback(async () => {
    setLoading(true);
    setError(null);
    setSuccess(null);
    try {
      const [countriesRes, entitiesRes] = await Promise.allSettled([
        axiosInstance.get(ENDPOINTS.PAYS),
        axiosInstance.get(ENDPOINTS.ENTITES),
      ]);

      if (countriesRes.status === 'fulfilled') {
        setCountries(normalizeApiList(countriesRes.value.data));
      } else {
        console.error('Erreur chargement pays:', countriesRes.reason);
        setCountries([]);
        message.warning('Impossible de charger la liste des pays');
      }

      if (entitiesRes.status === 'fulfilled') {
        setEntities(normalizeApiList(entitiesRes.value.data));
      } else {
        console.error('Erreur chargement entités:', entitiesRes.reason);
        setEntities([]);
        message.warning('Impossible de charger la liste des entités');
      }

      if (id) {
        const framework = await fetchFrameworkById(id);
        const shared = !framework.company || framework.company.length === 0;
        const companyValues = Array.isArray(framework.company)
          ? framework.company.map((company) => relationId(company)).filter(Boolean)
          : [];

        setIsShared(shared);
        form.setFieldsValue({
          code: framework.code,
          name: framework.name,
          version: framework.version,
          country: relationId(framework.country),
          country_group: framework.country_group,
          account_code_length: framework.account_code_length ?? 10,
          shared,
          company: companyValues,
          description: framework.description,
          active: framework.active !== false,
        });
      } else {
        form.setFieldsValue({
          shared: true,
          active: true,
          account_code_length: 10,
        });
      }
    } catch (caughtError) {
      message.error('Impossible de charger les données du formulaire');
      setError('Impossible de charger les données du formulaire');
      console.error(caughtError);
    } finally {
      setLoading(false);
    }
  }, [id, fetchFrameworkById, form]);

  useEffect(() => {
    loadFormData();
  }, [loadFormData]);

  const onFinish = async (values) => {
    const payload = {
      ...values,
      company: values.shared ? [] : (values.company || []),
    };

    setLoading(true);
    setError(null);
    setSuccess(null);
    try {
      if (id) {
        await updateFramework(id, payload);
        setSuccess('Plan comptable modifié avec succès');
        message.success('Plan comptable modifié avec succès');
      } else {
        await createFramework(payload);
        setSuccess('Plan comptable créé avec succès');
        message.success('Plan comptable créé avec succès');
      }
      navigate('/comptabilite/frameworks');
    } catch (caughtError) {
      const errorMessage =
        caughtError.response?.data?.detail ||
        caughtError.response?.data?.non_field_errors?.[0] ||
        caughtError.message ||
        'Erreur lors de la sauvegarde';
      message.error(errorMessage);
      setError(errorMessage);
      console.error(caughtError);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <style>{`
        .framework-form .ant-form-item {
          margin-bottom: 0;
        }
        .framework-form .ant-input {
          height: 24px;
          min-height: 24px;
          border: 0 !important;
          border-radius: 0 !important;
          padding: 2px 8px !important;
          font-size: 12px !important;
          box-shadow: none !important;
        }
        .framework-form textarea.ant-input {
          height: 140px !important;
          min-height: 140px !important;
          line-height: 1.5 !important;
          resize: vertical;
        }
        .framework-form .ant-form-item-explain-error {
          font-size: 11px;
          margin-top: 2px;
        }
        .framework-form-control .ant-form-item-control-input {
          min-height: 24px;
        }
        .framework-form-control .ant-switch {
          min-width: 46px;
          transform: scale(0.85);
          transform-origin: left center;
        }
      `}</style>

      <div className="max-w-7xl mx-auto bg-white border border-gray-300">
        <Spin spinning={loading}>
          <Form
            form={form}
            layout="vertical"
            onFinish={onFinish}
            requiredMark={false}
            size="middle"
            className="framework-form"
          >
            <div className="border-b border-gray-300 px-4 py-3">
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-start gap-3">
                  <Tooltip text="Créer un nouveau plan comptable">
                    <button
                      type="button"
                      onClick={() => navigate('/comptabilite/frameworks/new')}
                      className="h-12 px-4 bg-purple-600 text-white text-sm hover:bg-purple-700 transition-all flex items-center gap-1 font-medium"
                    >
                      <FiPlus size={16} /><span>Nouveau</span>
                    </button>
                  </Tooltip>
                  <div className="flex flex-col h-12 justify-center">
                    <div
                      className="text-lg font-bold text-gray-900 cursor-pointer hover:text-purple-600 transition-colors"
                      onClick={() => navigate('/comptabilite/frameworks')}
                    >
                      Plans comptables
                    </div>
                    <span className="text-xs text-gray-600 font-medium">
                      N° {watchedCode || (isEdit ? 'Plan en modification' : 'Nouveau plan')}
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
                        {isEdit && (
                          <button
                            type="button"
                            onClick={() => {
                              setShowActionsMenu(false);
                              navigate(`/comptabilite/frameworks/${id}`);
                            }}
                            className="w-full px-3 py-2 text-xs text-left hover:bg-gray-50 flex items-center gap-2"
                          >
                            <FiEye size={12} /> Voir le détail
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => {
                            setShowActionsMenu(false);
                            navigate('/comptabilite/frameworks');
                          }}
                          className="w-full px-3 py-2 text-xs text-left hover:bg-gray-50 flex items-center gap-2 border-t border-gray-100"
                        >
                          <FiInfo size={12} /> Retour à la liste
                        </button>
                      </div>
                    )}
                  </div>
                  <Tooltip text="Enregistrer">
                    <button
                      type="button"
                      onClick={() => form.submit()}
                      disabled={loading}
                      className="w-8 h-8 rounded-full bg-purple-600 text-white hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                    >
                      <FiUploadCloud size={16} />
                    </button>
                  </Tooltip>
                  <Tooltip text="Annuler">
                    <button
                      type="button"
                      onClick={() => navigate('/comptabilite/frameworks')}
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
                      <FiInfo size={14} /><span>Complétez le code et le nom du plan</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1 text-xs text-green-600">
                      <FiCheck size={14} /><span>Plan prêt à être enregistré</span>
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
                    sharedValue !== false ? 'bg-blue-100 text-blue-700 border-blue-300' : 'bg-gray-100 text-gray-700 border-gray-300'
                  }`}>
                    {sharedValue !== false ? 'Partagé' : 'Spécifique'}
                  </div>
                </div>
              </div>
              <div className="mt-2 ml-1">
                <span className="text-xs text-gray-600 font-medium">
                  {isEdit ? 'Modification du référentiel comptable' : 'Création du référentiel comptable'}
                </span>
              </div>
            </div>

            <div className="px-4 py-3 border-b border-gray-300">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <FieldLine label="Code" required>
                    <Form.Item
                      name="code"
                      rules={[
                        { required: true, message: 'Code obligatoire' },
                        { max: 64, message: 'Maximum 64 caractères' },
                      ]}
                    >
                      <Input placeholder="ex : SYSCOHADA" style={{ fontFamily: 'monospace' }} />
                    </Form.Item>
                  </FieldLine>

                  <FieldLine label="Version">
                    <Form.Item name="version">
                      <Input placeholder="ex : 2018, v1.2" />
                    </Form.Item>
                  </FieldLine>
                </div>

                <div className="space-y-2">
                  <FieldLine label="Nom complet" required>
                    <Form.Item
                      name="name"
                      rules={[
                        { required: true, message: 'Nom obligatoire' },
                        { max: 255, message: 'Maximum 255 caractères' },
                      ]}
                    >
                      <Input placeholder="ex : SYSCOHADA Révisé 2018" />
                    </Form.Item>
                  </FieldLine>

                  <FieldLine label="Pays principal">
                    <Form.Item name="country">
                      <PieceDropdown
                        placeholder="Sélectionner un pays"
                        allowClear
                        options={countryOptions}
                      />
                    </Form.Item>
                  </FieldLine>
                </div>
              </div>
            </div>

            <div className="border-b border-gray-300">
              <div className="px-4 flex">
                {['general', 'portee', 'notes'].map((tab) => (
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
                    {tab === 'general' ? 'Paramètres' : tab === 'portee' ? 'Portée' : 'Notes'}
                  </button>
                ))}
              </div>
            </div>

            <div className="p-4">
              {activeTab === 'general' && (
                <div className="border border-gray-300">
                  <div className="grid grid-cols-4 bg-gray-100 border-b border-gray-300">
                    {['Groupement de pays', 'Longueur par défaut', 'Statut', 'Type de portée'].map((heading) => (
                      <div key={heading} className="border-r border-gray-300 px-2 py-1.5 text-xs font-medium text-gray-700 last:border-r-0">
                        {heading}
                      </div>
                    ))}
                  </div>
                  <div className="grid grid-cols-4">
                    <TableCell>
                      <Form.Item name="country_group">
                        <Input placeholder="ex : UEMOA" />
                      </Form.Item>
                    </TableCell>
                    <TableCell>
                      <Form.Item name="account_code_length">
                        <Input type="number" min={1} max={20} placeholder="ex : 10" />
                      </Form.Item>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-3 px-1 text-xs text-gray-700" style={{ height: '24px' }}>
                        <Form.Item name="active" valuePropName="checked">
                          <Switch checkedChildren="Oui" unCheckedChildren="Non" />
                        </Form.Item>
                        <span>Actif</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-3 px-1 text-xs text-gray-700" style={{ height: '24px' }}>
                        <Form.Item name="shared" valuePropName="checked">
                          <Switch
                            checkedChildren="Partagé"
                            unCheckedChildren="Spécifique"
                            onChange={(checked) => {
                              setIsShared(checked);
                              if (checked) form.setFieldValue('company', []);
                            }}
                          />
                        </Form.Item>
                      </div>
                    </TableCell>
                  </div>
                </div>
              )}

              {activeTab === 'portee' && (
                <div className="border border-gray-300">
                  <div className="grid grid-cols-2 bg-gray-100 border-b border-gray-300">
                    {['Plan partagé', 'Entités concernées'].map((heading) => (
                      <div key={heading} className="border-r border-gray-300 px-2 py-1.5 text-xs font-medium text-gray-700 last:border-r-0">
                        {heading}
                      </div>
                    ))}
                  </div>
                  <div className="grid grid-cols-2">
                    <TableCell>
                      <div className="flex items-center gap-3 px-1 text-xs text-gray-700" style={{ minHeight: '24px' }}>
                        <Form.Item name="shared" valuePropName="checked">
                          <Switch
                            checkedChildren="Oui"
                            unCheckedChildren="Non"
                            onChange={(checked) => {
                              setIsShared(checked);
                              if (checked) form.setFieldValue('company', []);
                            }}
                          />
                        </Form.Item>
                        <span>{isShared ? 'Toutes les entités' : 'Entités spécifiques'}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Form.Item
                        name="company"
                        rules={[
                          {
                            required: !isShared,
                            message: 'Sélectionnez au moins une entité',
                          },
                        ]}
                      >
                        <MultiPieceDropdown
                          placeholder={isShared ? 'Toutes les entités' : 'Sélectionnez les entités'}
                          disabled={isShared}
                          options={entityOptions}
                        />
                      </Form.Item>
                    </TableCell>
                  </div>
                </div>
              )}

              {activeTab === 'notes' && (
                <div className="border border-gray-300">
                  <div className="bg-gray-100 border-b border-gray-300 px-2 py-1.5 text-xs font-medium text-gray-700">
                    Description / Notes
                  </div>
                  <div className="p-1">
                    <Form.Item name="description">
                      <TextArea
                        rows={5}
                        placeholder="Description détaillée du plan, version, spécificités, remarques..."
                      />
                    </Form.Item>
                  </div>
                </div>
              )}
            </div>
          </Form>
        </Spin>
      </div>
    </div>
  );
}

export { FrameworkForm };
export default FrameworkForm;
