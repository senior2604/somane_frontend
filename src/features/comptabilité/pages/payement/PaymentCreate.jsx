// src/features/comptabilite/pages/payement/PaymentCreate.jsx

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FiAlertCircle,
  FiCheck,
  FiFileText,
  FiPlus,
  FiSettings,
  FiUploadCloud,
  FiX,
} from 'react-icons/fi';
import axiosInstance from '../../../../config/axiosInstance';

const API = {
  payments: 'compta/payments/',
  journals: 'compta/journals/',
  partners: 'partenaires/',
  currencies: 'devises/',
  paymentMethodLines: 'compta/payment-method-lines/',
};

const normalizeApiList = (data) => (Array.isArray(data) ? data : (data?.results || []));
const today = () => new Date().toISOString().slice(0, 10);

const PAYMENT_TYPE_OPTIONS = [
  { id: 'inbound', label: 'Encaissement' },
  { id: 'outbound', label: 'Décaissement' },
  { id: 'transfer', label: 'Transfert compte à compte' },
];

const PARTNER_TYPE_OPTIONS = [
  { id: 'customer', label: 'Client' },
  { id: 'supplier', label: 'Fournisseur' },
  { id: 'misc_debit', label: 'Débiteur divers' },
  { id: 'misc_credit', label: 'Créditeur divers' },
  { id: 'employee', label: 'Employé' },
];

const getActiveEntity = () => {
  const raw = localStorage.getItem('entiteActive');
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : { id: raw };
  } catch {
    return { id: raw };
  }
};

const optionLabel = (item, fields = ['code', 'name']) => {
  if (!item) return '';
  return fields.map((field) => item[field]).filter(Boolean).join(' - ')
    || item.display_name
    || item.nom
    || item.label
    || '';
};

const getPaymentMethodValues = (line) => {
  if (!line) {
    return {
      payment_method_id: '',
      payment_method_id_label: '',
      payment_method_line_id_label: '',
      payment_method_code: '',
      payment_method_name: '',
    };
  }

  const rawMethod = line.payment_method || line.payment_method_id || '';
  const methodId = rawMethod && typeof rawMethod === 'object' ? rawMethod.id : rawMethod;
  const methodLabel = line.payment_method_id_label
    || line.payment_method_name
    || (rawMethod && typeof rawMethod === 'object' ? (rawMethod.display_name || rawMethod.name || rawMethod.code || '') : '');
  const lineLabel = line.display_name || line.name || line.payment_method_line_id_label || line.payment_method_id_label || line.code || '';

  return {
    payment_method_id: methodId || '',
    payment_method_id_label: methodLabel || '',
    payment_method_line_id_label: lineLabel,
    payment_method_code: line.code || line.payment_method_code || '',
    payment_method_name: methodLabel || lineLabel,
  };
};

const getPartnerTypeFromPartner = (partner) => {
  if (!partner) return '';

  const rawType = partner.type_partenaire || partner.partner_type || partner.type || partner.category || '';
  const normalized = String(rawType)
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

  const mapping = {
    client: 'customer',
    customer: 'customer',
    fournisseur: 'supplier',
    supplier: 'supplier',
    vendor: 'supplier',
    employe: 'employee',
    employee: 'employee',
    debiteur: 'misc_debit',
    misc_debit: 'misc_debit',
    crediteur: 'misc_credit',
    misc_credit: 'misc_credit',
  };

  return mapping[normalized] || '';
};

const getActionErrorMessage = (err, fallback) => {
  const data = err?.response?.data || err?.data;
  if (typeof data === 'string') return data;
  if (data?.detail) return data.detail;
  if (data) return JSON.stringify(data);
  return err?.message || fallback;
};

const Tooltip = ({ children, text, position = 'top' }) => {
  const [show, setShow] = useState(false);

  return (
    <div className="relative inline-block">
      <div onMouseEnter={() => setShow(true)} onMouseLeave={() => setShow(false)}>
        {children}
      </div>
      {show && (
        <div className={`absolute z-50 whitespace-nowrap rounded bg-gray-800 px-2 py-1 text-xs text-white ${
          position === 'top' ? 'bottom-full left-1/2 mb-1 -translate-x-1/2' :
          position === 'bottom' ? 'top-full left-1/2 mt-1 -translate-x-1/2' :
          position === 'left' ? 'right-full top-1/2 mr-1 -translate-y-1/2' :
          'left-full top-1/2 ml-1 -translate-y-1/2'
        }`}>
          {text}
          <div className={`absolute h-2 w-2 rotate-45 bg-gray-800 ${
            position === 'top' ? 'top-full left-1/2 -mt-1 -translate-x-1/2' :
            position === 'bottom' ? 'bottom-full left-1/2 -mb-1 -translate-x-1/2' :
            position === 'left' ? 'left-full top-1/2 -ml-1 -translate-y-1/2' :
            'right-full top-1/2 -mr-1 -translate-y-1/2'
          }`} />
        </div>
      )}
    </div>
  );
};

const SearchSelect = ({ value, onChange, options, getLabel, placeholder = '', disabled = false }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const inputRef = useRef(null);
  const dropdownRef = useRef(null);
  const [dropdownStyle, setDropdownStyle] = useState({});

  const selected = options.find((option) => String(option.id) === String(value));
  const selectedLabel = selected ? getLabel(selected) : '';
  const filteredOptions = options
    .filter((option) => getLabel(option).toLowerCase().includes(inputValue.toLowerCase()))
    .slice(0, 60);

  useEffect(() => {
    setInputValue(selectedLabel || '');
  }, [selectedLabel]);

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
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (isOpen && dropdownRef.current && filteredOptions.length > 0) {
      const el = dropdownRef.current.children[highlightedIndex];
      if (el) el.scrollIntoView({ block: 'nearest' });
    }
  }, [highlightedIndex, isOpen, filteredOptions.length]);

  const handleInputChange = (event) => {
    if (disabled) return;
    setInputValue(event.target.value);
    setIsOpen(true);
    setHighlightedIndex(0);
    if (value) onChange('', null);
  };

  const handleSelectOption = (option) => {
    if (disabled) return;
    const label = getLabel(option);
    setInputValue(label);
    setIsOpen(false);
    setHighlightedIndex(0);
    onChange(option.id, option);
  };

  const handleKeyDown = (event) => {
    if (disabled) return;
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setIsOpen(true);
      setHighlightedIndex((previous) => Math.min(previous + 1, Math.max(filteredOptions.length - 1, 0)));
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setHighlightedIndex((previous) => Math.max(previous - 1, 0));
    } else if (event.key === 'Enter' && isOpen && filteredOptions.length > 0) {
      event.preventDefault();
      handleSelectOption(filteredOptions[highlightedIndex]);
    } else if (event.key === 'Escape') {
      setIsOpen(false);
    } else if (event.key === 'Tab' && isOpen && filteredOptions.length > 0) {
      event.preventDefault();
      handleSelectOption(filteredOptions[highlightedIndex]);
    }
  };

  return (
    <>
      <input
        ref={inputRef}
        type="text"
        value={inputValue}
        onChange={handleInputChange}
        onKeyDown={handleKeyDown}
        onFocus={() => {
          if (disabled) return;
          setIsOpen(true);
          updateDropdownPosition();
        }}
        placeholder={placeholder}
        disabled={disabled}
        className={`h-[26px] w-full border-0 bg-transparent px-2 py-1 text-left text-xs outline-none focus:ring-1 focus:ring-blue-500 ${
          disabled ? 'cursor-not-allowed bg-gray-100 text-gray-400' : ''
        }`}
        autoComplete="off"
      />

      {isOpen && !disabled && filteredOptions.length > 0 && (
        <div ref={dropdownRef} className="border border-gray-300 bg-white shadow-lg" style={dropdownStyle}>
          {filteredOptions.map((option, index) => (
            <button
              key={option.id}
              type="button"
              onClick={() => {
                handleSelectOption(option);
              }}
              onMouseEnter={() => setHighlightedIndex(index)}
              className={`w-full px-2 py-1 text-left text-xs ${
                index === highlightedIndex ? 'bg-blue-100 text-blue-700' : 'hover:bg-blue-50'
              } ${
                String(option.id) === String(value) ? 'bg-blue-50' : ''
              }`}
            >
              {getLabel(option)}
            </button>
          ))}
        </div>
      )}
    </>
  );
};

const AmountInput = ({ value, onChange, disabled = false }) => {
  const [displayValue, setDisplayValue] = useState('');

  const formatNumber = (num) => {
    if (num === '' || num === null || num === undefined) return '';
    const parsed = typeof num === 'string' ? Number(num.replace(/\s/g, '').replace(',', '.')) : Number(num);
    if (Number.isNaN(parsed)) return '';
    return Math.round(parsed).toLocaleString('fr-FR');
  };

  useEffect(() => {
    setDisplayValue(formatNumber(value));
  }, [value]);

  const handleChange = (event) => {
    const raw = event.target.value.replace(/\s/g, '').replace(/[^\d,.-]/g, '').replace(',', '.');
    const parsed = Number(raw);
    if (Number.isNaN(parsed)) {
      setDisplayValue('');
      onChange('');
      return;
    }
    setDisplayValue(formatNumber(parsed));
    onChange(parsed);
  };

  return (
    <input
      type="text"
      value={displayValue}
      onChange={handleChange}
      onFocus={(event) => {
        if (value !== '' && value !== null && value !== undefined) event.target.value = String(value);
      }}
      onBlur={() => setDisplayValue(formatNumber(value))}
      disabled={disabled}
      className={`h-[26px] w-full border-0 px-2 py-1 text-left text-xs outline-none focus:ring-1 focus:ring-blue-500 ${
        disabled ? 'bg-gray-50 text-gray-500' : ''
      }`}
      placeholder="0"
    />
  );
};

const Field = ({ label, required = false, children }) => (
  <div className="flex items-center" style={{ minHeight: 26 }}>
    <label className="min-w-[150px] text-xs font-medium text-gray-700">
      {label}{required ? ' *' : ''}
    </label>
    <div className="ml-2 flex-1 border border-gray-300 bg-white">
      {children}
    </div>
  </div>
);

export default function PaymentCreate() {
  const navigate = useNavigate();
  const activeEntity = getActiveEntity();
  const actionsMenuRef = useRef(null);

  const [formData, setFormData] = useState({
    name: '',
    payment_type: 'inbound',
    partner_type: 'customer',
    partner_id: '',
    amount: '',
    currency_id: '',
    journal_id: '',
    payment_method_id: '',
    payment_method_id_label: '',
    payment_method_line_id: '',
    payment_method_line_id_label: '',
    payment_method_code: '',
    payment_method_name: '',
    payment_date: today(),
    reference: '',
    narration: '',
    transfer_journal_id: '',
    state: 'draft',
  });
  const [options, setOptions] = useState({ journals: [], partners: [], currencies: [], methodLines: [] });
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [activeTab, setActiveTab] = useState('parametres');
  const [showActionsMenu, setShowActionsMenu] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  const treasuryJournals = useMemo(() => (
    options.journals.filter((journal) => {
      const typeText = [journal.type_code, journal.journal_type, journal.type, journal.type_name, journal.code, journal.name]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return journal.is_bank_or_cash_flag || typeText.includes('ban') || typeText.includes('bank') || typeText.includes('cai') || typeText.includes('cash') || typeText.includes('caisse');
    })
  ), [options.journals]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (actionsMenuRef.current && !actionsMenuRef.current.contains(event.target)) {
        setShowActionsMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const loadOptions = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const entityId = activeEntity?.id;
      const [journals, partners, currencies, methodLines] = await Promise.all([
        axiosInstance.get(API.journals, { params: { company: entityId, page_size: 500 } }).catch(() => ({ data: [] })),
        axiosInstance.get(API.partners, { params: { page_size: 500 } }).catch(() => ({ data: [] })),
        axiosInstance.get(API.currencies, { params: { page_size: 200 } }).catch(() => ({ data: [] })),
        axiosInstance.get(API.paymentMethodLines, { params: { company: entityId, page_size: 500 } }).catch(() => ({ data: [] })),
      ]);

      const nextOptions = {
        journals: normalizeApiList(journals.data),
        partners: normalizeApiList(partners.data),
        currencies: normalizeApiList(currencies.data),
        methodLines: normalizeApiList(methodLines.data),
      };

      setOptions(nextOptions);
      const xof = nextOptions.currencies.find((currency) => currency.code === 'XOF') || nextOptions.currencies[0];
      if (xof) {
        setFormData((previous) => ({ ...previous, currency_id: previous.currency_id || xof.id }));
      }
    } catch (err) {
      setError('Erreur lors du chargement des données.');
      console.error('Erreur chargement paiement', err);
    } finally {
      setLoading(false);
    }
  }, [activeEntity?.id]);

  useEffect(() => {
    loadOptions();
  }, [loadOptions]);

  const markAsModified = () => {
    setHasUnsavedChanges(true);
    setSuccess(null);
    setError(null);
  };

  const setField = (field, value) => {
    setFormData((previous) => ({ ...previous, [field]: value }));
    markAsModified();
  };

  const handlePartnerSelection = (id, partner) => {
    const partnerType = getPartnerTypeFromPartner(partner);
    setFormData((previous) => ({
      ...previous,
      partner_id: id || '',
      ...(partnerType ? { partner_type: partnerType } : {}),
    }));
    markAsModified();
  };

  const handlePaymentMethodSelection = (id, line) => {
    const methodValues = getPaymentMethodValues(line);
    setFormData((previous) => ({
      ...previous,
      payment_method_line_id: id || '',
      ...methodValues,
    }));
    markAsModified();
  };

  const validate = () => {
    const errors = [];
    if (!activeEntity?.id) errors.push('Sélectionnez une entité.');
    if (!formData.payment_type) errors.push('Le type de paiement est obligatoire.');
    if (!formData.amount || Number(formData.amount) <= 0) errors.push('Le montant doit être supérieur à 0.');
    if (!formData.currency_id) errors.push('La devise est obligatoire.');
    if (!formData.journal_id) errors.push('Le journal de paiement est obligatoire.');
    if (!formData.payment_date) errors.push('La date du paiement est obligatoire.');
    if (formData.payment_type === 'transfer' && !formData.transfer_journal_id) errors.push('Le journal de destination est obligatoire pour un transfert.');
    return errors;
  };

  const buildPayload = () => ({
    name: formData.name || '/',
    payment_type: formData.payment_type || '',
    partner_type: formData.partner_type || '',
    state: formData.state || 'draft',
    payment_date: formData.payment_date,
    reference: formData.reference || '',
    narration: formData.narration || '',
    company_id: activeEntity?.id,
    amount: Number(formData.amount || 0),
    partner_id: formData.partner_id || null,
    currency_id: formData.currency_id || null,
    journal_id: formData.journal_id || null,
    transfer_journal_id: formData.payment_type === 'transfer' ? String(formData.transfer_journal_id || '') : null,
    payment_method_id: formData.payment_method_id || '',
    payment_method_id_label: formData.payment_method_id_label || '',
    payment_method_line_id: formData.payment_method_line_id || '',
    payment_method_line_id_label: formData.payment_method_line_id_label || '',
    payment_method_code: formData.payment_method_code || '',
    payment_method_name: formData.payment_method_name || '',
  });

  const handleSave = async (stay = false) => {
    const errors = validate();
    if (errors.length) {
      setError(errors.join('\n'));
      return false;
    }
    setSaving(true);
    setError(null);
    try {
      await axiosInstance.post(API.payments, buildPayload());
      setSuccess('Paiement enregistré.');
      setHasUnsavedChanges(false);
      if (!stay) navigate('/comptabilite/paiements', { state: { refreshAt: Date.now() } });
      return true;
    } catch (err) {
      setError(`Échec enregistrement : ${getActionErrorMessage(err, 'Échec enregistrement du paiement.')}`);
      console.error('Erreur création paiement', err);
      return false;
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    if (hasUnsavedChanges) setShowConfirmDialog(true);
    else navigate('/comptabilite/paiements');
  };

  const confirmDiscardChanges = () => {
    setShowConfirmDialog(false);
    setHasUnsavedChanges(false);
    navigate('/comptabilite/paiements');
  };

  const isFormValid = validate().length === 0;
  const isDraft = true;
  const paymentLabel = formData.name || 'N° Sera généré lors de la validation';

  if (!activeEntity?.id) {
    return (
      <div className="min-h-screen bg-gray-50 p-4">
        <div className="mx-auto max-w-4xl border border-yellow-200 bg-yellow-50 p-6 text-center">
          <FiAlertCircle className="mx-auto mb-3 text-yellow-600" size={32} />
          <p className="mb-3 font-medium text-yellow-800">Aucune entité sélectionnée</p>
          <button onClick={() => navigate('/select-entite')} className="bg-purple-600 px-4 py-2 text-sm text-white hover:bg-purple-700">
            Sélectionner une entité
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="mx-auto max-w-7xl border border-gray-300 bg-white">
        <div className="border-b border-gray-300 px-4 py-2">
          <div className="flex items-center justify-between gap-4">
            <div className="flex flex-shrink-0 items-center gap-3">
              <Tooltip text="Nouveau paiement">
                <button
                  onClick={() => { if (hasUnsavedChanges) setShowConfirmDialog(true); else navigate('/comptabilite/paiements/create'); }}
                  className="flex h-8 items-center gap-1 rounded bg-purple-600 px-3 text-xs font-medium text-white transition-all duration-200 hover:scale-105 hover:bg-purple-700"
                >
                  <FiPlus size={12} />
                  Nouveau
                </button>
              </Tooltip>

              <div className="flex flex-col items-start">
                <Tooltip text="Retour à la liste des paiements">
                  <h1 onClick={handleCancel} className="cursor-pointer text-lg font-bold leading-5 text-gray-900 transition-colors hover:text-purple-600">
                    Paiements
                  </h1>
                </Tooltip>
                <span className="mt-1 block text-xs leading-4 text-gray-600">{paymentLabel}</span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <div className="relative" ref={actionsMenuRef}>
                <Tooltip text="Menu des actions">
                  <button
                    onClick={() => setShowActionsMenu((previous) => !previous)}
                    className="flex h-8 items-center gap-1 border border-gray-300 px-3 text-xs text-gray-700 transition-all duration-200 hover:bg-gray-50 hover:shadow-md active:scale-95"
                  >
                    <FiSettings size={12} />
                    <span>Actions</span>
                  </button>
                </Tooltip>
                {showActionsMenu && (
                  <div className="absolute right-0 z-50 mt-1 w-52 rounded border border-gray-300 bg-white shadow-lg">
                    <button onClick={() => navigate('/comptabilite/conditions-paiement')} className="w-full px-3 py-2 text-left text-xs hover:bg-gray-50">
                      Conditions de paiement
                    </button>
                    <button onClick={() => navigate('/comptabilite/methodes-paiement')} className="w-full px-3 py-2 text-left text-xs hover:bg-gray-50">
                      Méthodes de paiement
                    </button>
                    <button onClick={() => navigate('/comptabilite/paiements')} className="w-full px-3 py-2 text-left text-xs hover:bg-gray-50">
                      Retour à la liste
                    </button>
                  </div>
                )}
              </div>
              <Tooltip text="Enregistrer">
                <button
                  onClick={() => handleSave(false)}
                  disabled={saving || !isFormValid}
                  className={`flex h-8 w-8 items-center justify-center rounded-full text-white transition-all ${
                    isFormValid && !saving ? 'bg-purple-600 hover:scale-110 hover:bg-purple-700' : 'cursor-not-allowed bg-gray-300'
                  }`}
                >
                  <FiUploadCloud size={16} />
                </button>
              </Tooltip>
              <Tooltip text="Annuler">
                <button
                  onClick={handleCancel}
                  className="flex h-8 w-8 items-center justify-center rounded-full bg-black text-white transition-all hover:scale-110 hover:bg-gray-800"
                >
                  <FiX size={16} />
                </button>
              </Tooltip>
            </div>
          </div>
        </div>

        {(error || success) && (
          <div className={`border-b border-gray-300 px-4 py-3 text-sm ${error ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'}`}>
            <div className="flex items-start gap-2">
              {error ? <FiAlertCircle size={14} className="mt-0.5" /> : <FiCheck size={14} className="mt-0.5" />}
              <div className="whitespace-pre-wrap">{error || success}</div>
            </div>
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center p-8">
            <div className="text-center">
              <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-purple-600 border-t-transparent"></div>
              <p className="mt-4 text-sm text-gray-600">Chargement...</p>
            </div>
          </div>
        ) : (
          <>
            <div className="border-b border-gray-300 px-4 py-3">
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                <div className="space-y-2">
                  <Field label="Type de paiement" required>
                    <SearchSelect value={formData.payment_type} onChange={(id) => setField('payment_type', id)} options={PAYMENT_TYPE_OPTIONS} getLabel={(option) => option.label} placeholder="Type de paiement" disabled={!isDraft} />
                  </Field>
                  <Field label="Partenaire">
                    <SearchSelect value={formData.partner_id} onChange={handlePartnerSelection} options={options.partners} getLabel={(partner) => partner.nom || partner.name || partner.email || `Partenaire ${partner.id}`} placeholder="Sélectionner un partenaire" disabled={!isDraft} />
                  </Field>
                  <Field label="Type partenaire">
                    <SearchSelect value={formData.partner_type} onChange={(id) => setField('partner_type', id)} options={PARTNER_TYPE_OPTIONS} getLabel={(option) => option.label} placeholder="Type partenaire" disabled={!isDraft} />
                  </Field>
                  <Field label="Montant" required>
                    <AmountInput value={formData.amount} onChange={(value) => setField('amount', value)} disabled={!isDraft} />
                  </Field>
                  <Field label="Devise" required>
                    <SearchSelect value={formData.currency_id} onChange={(id) => setField('currency_id', id)} options={options.currencies} getLabel={(currency) => [currency.code, currency.name || currency.nom].filter(Boolean).join(' - ')} placeholder="Devise" disabled={!isDraft} />
                  </Field>
                </div>

                <div className="space-y-2">
                  <Field label="Date paiement" required>
                    <input type="date" value={formData.payment_date} onChange={(event) => setField('payment_date', event.target.value)} disabled={!isDraft} className="h-[26px] w-full border-0 px-2 text-xs outline-none focus:ring-1 focus:ring-blue-500" />
                  </Field>
                  <Field label="Journal" required>
                    <SearchSelect value={formData.journal_id} onChange={(id) => setField('journal_id', id)} options={treasuryJournals.length ? treasuryJournals : options.journals} getLabel={(journal) => optionLabel(journal)} placeholder="Journal de trésorerie" disabled={!isDraft} />
                  </Field>
                  {formData.payment_type === 'transfer' && (
                    <Field label="Journal destination" required>
                      <SearchSelect value={formData.transfer_journal_id} onChange={(id) => setField('transfer_journal_id', id)} options={treasuryJournals.length ? treasuryJournals : options.journals} getLabel={(journal) => optionLabel(journal)} placeholder="Journal destination" disabled={!isDraft} />
                    </Field>
                  )}
                  <Field label="Méthode">
                    <SearchSelect value={formData.payment_method_line_id} onChange={handlePaymentMethodSelection} options={options.methodLines} getLabel={(line) => line.name || line.display_name || line.payment_method_id_label || line.code || `Méthode ${line.id}`} placeholder="Méthode de paiement" disabled={!isDraft} />
                  </Field>
                  <Field label="Référence">
                    <input value={formData.reference} onChange={(event) => setField('reference', event.target.value)} disabled={!isDraft} className="h-[26px] w-full border-0 px-2 text-xs outline-none focus:ring-1 focus:ring-blue-500" placeholder="Référence externe" />
                  </Field>
                </div>
              </div>
            </div>

            <div className="border-b border-gray-300 px-4">
              {[
                ['parametres', 'Paramètres', FiSettings],
                ['notes', 'Notes', FiFileText],
              ].map(([key, label, Icon]) => (
                <button key={key} onClick={() => setActiveTab(key)} className={`border-b-2 px-4 py-2 text-xs font-medium ${activeTab === key ? 'border-purple-600 text-purple-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
                  <Icon size={12} className="mr-1 inline" />
                  {label}
                </button>
              ))}
            </div>

            <div className="p-4">
              {activeTab === 'parametres' && (
                <div className="border border-gray-300">
                  <div className="grid grid-cols-2 border-b border-gray-300 bg-gray-100">
                    {['État', 'Paiement'].map((header, index) => (
                      <div key={header} className={`${index < 1 ? 'border-r border-gray-300' : ''} px-2 py-1.5 text-xs font-medium text-gray-700`}>{header}</div>
                    ))}
                  </div>
                  <div className="grid grid-cols-2">
                    <div className="border-r border-gray-300 p-2 text-xs text-gray-700">Brouillon</div>
                    <div className="p-2 text-xs text-gray-700">{formData.payment_type === 'transfer' ? 'Transfert' : formData.payment_type === 'outbound' ? 'Décaissement' : 'Encaissement'}</div>
                  </div>
                </div>
              )}

              {activeTab === 'notes' && (
                <div className="border border-gray-300">
                  <textarea value={formData.narration} onChange={(event) => setField('narration', event.target.value)} disabled={!isDraft} className="h-48 w-full border-0 px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50" placeholder="Notes / libellé du paiement..." />
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {showConfirmDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
          <div className="mx-4 w-full max-w-md rounded-sm bg-white p-6 shadow-lg">
            <h3 className="mb-3 text-lg font-bold text-gray-900">Modifications non sauvegardées</h3>
            <p className="mb-6 text-sm text-gray-600">Voulez-vous enregistrer les modifications avant de quitter ?</p>
            <div className="flex justify-end gap-3">
              <button onClick={async () => { setShowConfirmDialog(false); const ok = await handleSave(true); if (ok) navigate('/comptabilite/paiements'); }} className="bg-purple-600 px-4 py-2 text-sm text-white transition-all hover:bg-purple-700">Enregistrer</button>
              <button onClick={confirmDiscardChanges} className="bg-red-600 px-4 py-2 text-sm text-white transition-all hover:bg-red-700">Ne pas enregistrer</button>
              <button onClick={() => setShowConfirmDialog(false)} className="border border-gray-300 px-4 py-2 text-sm text-gray-700 transition-all hover:bg-gray-50">Annuler</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
