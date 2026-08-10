// C:\Users\IBM\Documents\somane_frontend\src\features\comptabilité\pages\Journaux\Create.jsx

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { 
  FiPlus,
  FiTrash2, 
  FiBriefcase,
  FiMail,
  FiInfo,
  FiAlertCircle,
  FiCopy,
  FiSettings,
  FiBookOpen,
  FiClock
} from "react-icons/fi";
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { apiClient } from '../../../../services/apiClient';
import { useEntity } from '../../../../context/EntityContext';
import UnifiedFormPage from '../../../../components/UnifiedFormPage';

// ==========================================
// COMPOSANT TOOLTIP
// ==========================================
const Tooltip = ({ children, text, position = 'top' }) => {
  const [show, setShow] = useState(false);
  const triggerRef = useRef(null);
  const [tooltipStyle, setTooltipStyle] = useState({});

  const updateTooltipPosition = useCallback(() => {
    if (!triggerRef.current) return;

    const rect = triggerRef.current.getBoundingClientRect();
    const gap = 6;

    if (position === 'bottom') {
      setTooltipStyle({
        left: rect.left + rect.width / 2,
        top: rect.bottom + gap,
        transform: 'translateX(-50%)'
      });
    } else if (position === 'left') {
      setTooltipStyle({
        left: rect.left - gap,
        top: rect.top + rect.height / 2,
        transform: 'translate(-100%, -50%)'
      });
    } else if (position === 'right') {
      setTooltipStyle({
        left: rect.right + gap,
        top: rect.top + rect.height / 2,
        transform: 'translateY(-50%)'
      });
    } else {
      setTooltipStyle({
        left: rect.left + rect.width / 2,
        top: rect.top - gap,
        transform: 'translate(-50%, -100%)'
      });
    }
  }, [position]);

  useEffect(() => {
    if (!show) return undefined;

    updateTooltipPosition();
    window.addEventListener('resize', updateTooltipPosition);
    window.addEventListener('scroll', updateTooltipPosition, true);

    return () => {
      window.removeEventListener('resize', updateTooltipPosition);
      window.removeEventListener('scroll', updateTooltipPosition, true);
    };
  }, [show, updateTooltipPosition]);
  
  return (
    <div ref={triggerRef} className="relative inline-block">
      <div
        onMouseEnter={() => setShow(true)}
        onMouseLeave={() => setShow(false)}
      >
        {children}
      </div>
      {show && typeof document !== 'undefined' && createPortal(
        <div
          className="pointer-events-none fixed z-[10000] whitespace-nowrap rounded bg-gray-800 px-2 py-1 text-xs text-white shadow-lg"
          style={tooltipStyle}
        >
          {text}
          <div className={`absolute h-2 w-2 rotate-45 bg-gray-800 ${
            position === 'top' ? 'left-1/2 top-full -mt-1 -translate-x-1/2' :
            position === 'bottom' ? 'bottom-full left-1/2 -mb-1 -translate-x-1/2' :
            position === 'left' ? 'left-full top-1/2 -ml-1 -translate-y-1/2' :
            'right-full top-1/2 -mr-1 -translate-y-1/2'
          }`} />
        </div>,
        document.body
      )}
    </div>
  );
};

// ==========================================
// COMPOSANT AUTOCOMPLETE
// ==========================================
const AutocompleteInput = ({
  value,
  selectedId,
  onChange,
  onSelect,
  options,
  getOptionLabel,
  placeholder = "",
  className = "",
  disabled = false,
  required = false,
  loading = false,
  onCreateOption = null,
  createOptionLabel = "Créer",
  onTab = null,
  onOpen = null
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [inputValue, setInputValue] = useState(value || '');
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const inputRef = useRef(null);
  const dropdownRef = useRef(null);
  const [dropdownStyle, setDropdownStyle] = useState({});

  useEffect(() => {
    if (value !== undefined) {
      setInputValue(value);
    }
  }, [value]);

  const normalizedInput = inputValue.trim().toLowerCase();
  const filteredOptions = useMemo(() => {
    if (!isOpen) return [];
    return (options || []).filter(option => (
      String(getOptionLabel(option) || '').toLowerCase().includes(normalizedInput)
    ));
  }, [getOptionLabel, isOpen, normalizedInput, options]);
  const visibleOptions = useMemo(() => filteredOptions.slice(0, 100), [filteredOptions]);
  const canCreate = !!onCreateOption && inputValue.trim() && !filteredOptions.some(option => getOptionLabel(option).trim().toLowerCase() === normalizedInput);

  const updateDropdownPosition = () => {
    if (inputRef.current) {
      const rect = inputRef.current.getBoundingClientRect();
      setDropdownStyle({
        position: 'fixed',
        top: `${rect.bottom}px`,
        left: `${rect.left}px`,
        width: `${rect.width}px`,
        zIndex: 9999,
        maxHeight: '200px',
        overflowY: 'auto'
      });
    }
  };

  useEffect(() => {
    if (isOpen) {
      updateDropdownPosition();
      const handleScroll = () => updateDropdownPosition();
      const handleResize = () => updateDropdownPosition();
      window.addEventListener('scroll', handleScroll, true);
      window.addEventListener('resize', handleResize);
      return () => {
        window.removeEventListener('scroll', handleScroll, true);
        window.removeEventListener('resize', handleResize);
      };
    }
  }, [isOpen]);

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

  const handleInputChange = (e) => {
    const newValue = e.target.value;
    setInputValue(newValue);
    setIsOpen(true);
    setHighlightedIndex(0);
    onChange(newValue);
    if (selectedId) {
      onSelect(null, '');
    }
  };

  const handleSelectOption = (option) => {
    const label = getOptionLabel(option);
    const id = option.id;
    setInputValue(label);
    setIsOpen(false);
    onSelect(id, label);
  };

  const handleCreateOption = () => {
    if (!canCreate || disabled) return;
    const query = inputValue.trim();
    setIsOpen(false);
    onCreateOption(query);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Tab' && !e.shiftKey && onTab) {
      e.preventDefault();

      if (isOpen && visibleOptions.length > 0) {
        handleSelectOption(visibleOptions[highlightedIndex] || visibleOptions[0]);
      } else {
        setIsOpen(false);
      }

      window.setTimeout(onTab, 0);
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setIsOpen(true);
      setHighlightedIndex(prev =>
        prev < visibleOptions.length - 1 ? prev + 1 : prev
      );
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex(prev => prev > 0 ? prev - 1 : 0);
    } else if (e.key === 'Enter' && isOpen && visibleOptions.length > 0) {
      e.preventDefault();
      handleSelectOption(visibleOptions[highlightedIndex]);
    } else if (e.key === 'Enter' && isOpen && visibleOptions.length === 0 && canCreate) {
      e.preventDefault();
      handleCreateOption();
    } else if (e.key === 'Escape') {
      setIsOpen(false);
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
          onOpen?.();
          setIsOpen(true);
          updateDropdownPosition();
        }}
        placeholder={placeholder}
        disabled={disabled}
        required={required}
        className={`w-full px-2 py-1 text-xs focus:ring-1 focus:ring-purple-500 focus:outline-none ${className}`}
        style={{ height: '26px', border: 'none', backgroundColor: 'transparent' }}
        autoComplete="off"
      />
      {isOpen && (filteredOptions.length > 0 || canCreate || loading) && (
        <div
          ref={dropdownRef}
          className="bg-white border border-gray-300 shadow-lg"
          style={dropdownStyle}
        >
          {loading && filteredOptions.length === 0 && (
            <div className="flex items-center gap-2 px-2 py-2 text-xs text-purple-600">
              <span className="h-3 w-3 animate-spin rounded-full border-b-2 border-purple-600" />
              Chargement...
            </div>
          )}
          {visibleOptions.map((option, index) => (
            <div
              key={option.id}
              className={`px-2 py-1 text-xs cursor-pointer ${
                index === highlightedIndex
                  ? 'bg-purple-100 text-purple-700'
                  : 'hover:bg-purple-50'
              } ${option.id === selectedId ? 'bg-purple-50' : ''}`}
              onClick={() => handleSelectOption(option)}
              onMouseEnter={() => setHighlightedIndex(index)}
            >
              {getOptionLabel(option)}
            </div>
          ))}
          {canCreate && (
            <button
              type="button"
              onClick={handleCreateOption}
              className="flex w-full items-center gap-1 border-t border-gray-200 px-2 py-1.5 text-left text-xs font-medium text-purple-700 hover:bg-purple-50"
            >
              <span>+</span><span>{createOptionLabel} "{inputValue.trim()}"</span>
            </button>
          )}
        </div>
      )}
    </>
  );
};

// ==========================================
// COMPOSANT SELECT POUR TYPE JOURNAL
// ==========================================
const JournalTypeSelect = ({
  value,
  onChange,
  options,
  placeholder = "Sélectionner",
  disabled = false,
  required = false,
  embedded = false,
  onTab = null
}) => {
  const selectedOption = options.find(opt => String(opt.id) === String(value));
  const [displayValue, setDisplayValue] = useState(selectedOption?.name || '');

  useEffect(() => {
    const currentOption = options.find(opt => String(opt.id) === String(value));
    setDisplayValue(currentOption?.name || '');
  }, [options, value]);

  return (
    <div className={`h-[26px] w-full bg-white transition-colors ${embedded ? '' : 'border border-gray-300 hover:border-purple-400 focus-within:border-purple-600'} ${disabled ? 'cursor-not-allowed bg-gray-100' : ''}`}>
      <AutocompleteInput
        value={displayValue}
        selectedId={value}
        onChange={setDisplayValue}
        onSelect={(id, label) => {
          if (id === null || id === undefined || id === '') return;
          setDisplayValue(label);
          onChange(id);
        }}
        options={options}
        getOptionLabel={(option) => option?.name || ''}
        placeholder={placeholder}
        disabled={disabled}
        required={required}
        onTab={onTab}
      />
    </div>
  );
};

// ==========================================
// NORMALISATION DES DONNÉES API
// ==========================================
const normalizeApiResponse = (data) => {
  if (!data) return [];
  if (Array.isArray(data)) return data;
  if (data.data && Array.isArray(data.data)) return data.data;
  if (data.results && Array.isArray(data.results)) return data.results;
  if (data.items && Array.isArray(data.items)) return data.items;
  console.warn('⚠️ Format de réponse non reconnu:', data);
  return [];
};

// ==========================================
// FORMATAGE LIBELLÉ BANQUE
// ==========================================
const getBankAccountLabel = (bankAccount) => {
  if (!bankAccount) return '';
  
  let bankName = '';
  let accountNumber = bankAccount.numero_compte || bankAccount.account_number || bankAccount.iban || bankAccount.rib || bankAccount.bank_acc_number || '';
  
  if (bankAccount.banque && typeof bankAccount.banque === 'object') {
    bankName = bankAccount.banque.nom || 
               bankAccount.banque.name || 
               bankAccount.banque.raison_sociale || 
               'Banque sans nom';
  }
  else if (bankAccount.banque_details) {
    bankName = bankAccount.banque_details.nom || 
               bankAccount.banque_details.name || 
               bankAccount.banque_details.raison_sociale || 
               'Banque sans nom';
  }
  else if (bankAccount.banque_nom) {
    bankName = bankAccount.banque_nom;
  }
  else if (bankAccount.nom_banque) {
    bankName = bankAccount.nom_banque;
  }
  else {
    bankName = bankAccount.nom || 
               bankAccount.name || 
               bankAccount.libelle || 
               (bankAccount.id ? `Banque #${bankAccount.id}` : 'Compte bancaire');
  }
  
  let partnerInfo = '';
  if (bankAccount.partenaire && typeof bankAccount.partenaire === 'object') {
    partnerInfo = bankAccount.partenaire.nom || '';
  } else if (bankAccount.partenaire_nom) {
    partnerInfo = bankAccount.partenaire_nom;
  }
  
  let label = bankName;
  if (accountNumber) label += ` - ${accountNumber}`;
  if (partnerInfo) label += ` (${partnerInfo})`;
  
  return label;
};

const getBankAccountNumber = (bankAccount) =>
  bankAccount?.numero_compte ||
  bankAccount?.account_number ||
  bankAccount?.iban ||
  bankAccount?.rib ||
  bankAccount?.bank_acc_number ||
  '';

const getBankFromBankAccount = (bankAccount) => {
  if (!bankAccount) return null;

  if (bankAccount.banque_details) {
    return {
      ...bankAccount.banque_details,
      id: bankAccount.banque_details.id || bankAccount.banque,
      nom: bankAccount.banque_details.nom || bankAccount.banque_details.name || bankAccount.banque_details.raison_sociale,
    };
  }

  if (bankAccount.banque && typeof bankAccount.banque === 'object') {
    return {
      ...bankAccount.banque,
      id: bankAccount.banque.id,
      nom: bankAccount.banque.nom || bankAccount.banque.name || bankAccount.banque.raison_sociale,
    };
  }

  if (bankAccount.bank && typeof bankAccount.bank === 'object') {
    return {
      ...bankAccount.bank,
      id: bankAccount.bank.id,
      nom: bankAccount.bank.nom || bankAccount.bank.name || bankAccount.bank.raison_sociale,
    };
  }

  const bankId = bankAccount.banque || bankAccount.banque_id || bankAccount.bank_id;
  const bankName = bankAccount.banque_nom || bankAccount.nom_banque || bankAccount.bank_name;
  if (bankId || bankName) {
    return { id: bankId || bankName, nom: bankName || `Banque #${bankId}` };
  }

  return null;
};

const mergeBanks = (...bankLists) => {
  const merged = [];
  const seen = new Set();

  bankLists.flat().filter(Boolean).forEach(bank => {
    const label = getBankLabel(bank);
    const key = bank.id ? `id:${bank.id}` : `name:${label}`;
    if (!seen.has(key)) {
      seen.add(key);
      merged.push(bank);
    }
  });

  return merged;
};

// ==========================================
// FORMATAGE LIBELLÉ SÉQUENCE
// ==========================================
const sanitizeJournalPrefix = (value) =>
  String(value || '')
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .slice(0, 8);

const getCurrentYearShort = () => String(new Date().getFullYear()).slice(-2);

const buildJournalSequencePrefix = (journalPrefix, yearShort = getCurrentYearShort()) => {
  const prefix = sanitizeJournalPrefix(journalPrefix);
  return prefix ? `${prefix}/${yearShort}/` : '';
};

const buildJournalSequenceCode = (journalPrefix, yearShort = getCurrentYearShort()) => {
  const prefix = sanitizeJournalPrefix(journalPrefix);
  return prefix ? `SEQ_${prefix}_${yearShort}` : '';
};

const getSequenceRecordId = (sequence) => {
  if (!sequence) return '';
  if (sequence.id) return sequence.id;
  if (sequence.pk) return sequence.pk;
  return '';
};

// ==========================================
// FORMATAGE LIBELLÉ BANQUE (core.Banque)
// ==========================================
const getBankLabel = (bank) => {
  if (!bank) return '';
  return bank.nom || bank.name || 'Banque sans nom';
};

const JOURNAL_CONTEXT_DRAFT_KEY = 'somane_journal_context_draft';

const getJournalContextCreateRoute = (field) => ({
  account: '/comptabilite/accounts/new',
  bank: '/banks',
  bankAccount: '/PartnerBanks',
}[field] || '');

const normalizeText = (value) =>
  String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();

const isOperationalAccount = (account) => {
  if (!account) return false;
  if (account.is_root === true || account.is_root_account === true) return false;
  if (String(account.account_type || '').toLowerCase() === 'root') return false;
  return true;
};

const getAccountFrameworkId = (account) => {
  const framework = account?.framework;
  if (framework && typeof framework === 'object') return framework.id;
  return framework || account?.framework_id || 'default';
};

const getAccountCodeLength = (account) => {
  const explicitLength = Number(account?.length || account?.code_length);
  if (Number.isFinite(explicitLength) && explicitLength > 0) return explicitLength;
  return String(account?.code || '').trim().length;
};

const filterOperationalAccounts = (accountsList) => {
  if (!Array.isArray(accountsList)) return [];
  const targetLengthByFramework = accountsList.reduce((acc, account) => {
    const frameworkId = getAccountFrameworkId(account);
    const codeLength = getAccountCodeLength(account);
    if (!codeLength) return acc;
    acc[frameworkId] = Math.max(acc[frameworkId] || 0, codeLength);
    return acc;
  }, {});

  return accountsList.filter(account => {
    if (!isOperationalAccount(account)) return false;
    const frameworkId = getAccountFrameworkId(account);
    const targetLength = targetLengthByFramework[frameworkId];
    if (!targetLength) return true;
    return getAccountCodeLength(account) === targetLength;
  });
};

const DRAFT_JOURNAL_NAME_PATTERN = /^Brouillon\s+(\d{5})$/i;

const getDraftJournalNumber = (journal) => {
  const nameMatch = String(journal?.name || '').trim().match(DRAFT_JOURNAL_NAME_PATTERN);
  if (nameMatch) return Number(nameMatch[1]) || 0;

  const codeMatch = String(journal?.code || '').trim().match(/^BR(\d{5})$/i);
  return codeMatch ? Number(codeMatch[1]) || 0 : 0;
};

const ACCOUNT_OPTIONS_CACHE_DURATION = 30 * 60 * 1000;
const accountOptionsCache = new Map();
const accountOptionsRequests = new Map();

const JOURNAL_LOOKUP_CACHE_DURATION = 30 * 60 * 1000;
const JOURNAL_RECORD_CACHE_DURATION = 5 * 60 * 1000;
const journalLookupCache = new Map();
const journalLookupRequests = new Map();
const journalRecordCache = new Map();

const getFreshCacheValue = (cache, key, duration) => {
  const cached = cache.get(String(key));
  if (!cached || Date.now() - cached.loadedAt >= duration) return null;
  return cached.value;
};

const fetchCachedJournalLookup = (key, loader) => {
  const cacheKey = String(key);
  const cachedValue = getFreshCacheValue(
    journalLookupCache,
    cacheKey,
    JOURNAL_LOOKUP_CACHE_DURATION,
  );
  if (cachedValue) return Promise.resolve(cachedValue);
  if (journalLookupRequests.has(cacheKey)) return journalLookupRequests.get(cacheKey);

  const request = Promise.resolve()
    .then(loader)
    .then(value => {
      journalLookupCache.set(cacheKey, { value, loadedAt: Date.now() });
      return value;
    })
    .finally(() => journalLookupRequests.delete(cacheKey));

  journalLookupRequests.set(cacheKey, request);
  return request;
};

const cacheJournalRecord = record => {
  if (!record?.id) return;
  journalRecordCache.set(String(record.id), {
    value: record,
    loadedAt: Date.now(),
  });
};

const runWhenBrowserIdle = task => new Promise((resolve, reject) => {
  const execute = () => Promise.resolve().then(task).then(resolve).catch(reject);
  if (typeof window !== 'undefined' && typeof window.requestIdleCallback === 'function') {
    window.requestIdleCallback(execute, { timeout: 500 });
    return;
  }
  window.setTimeout(execute, 0);
});

const fetchJournalAccountOptions = (companyId) => {
  const cacheKey = String(companyId || 'global');
  const cached = accountOptionsCache.get(cacheKey);

  if (cached && Date.now() - cached.loadedAt < ACCOUNT_OPTIONS_CACHE_DURATION) {
    return Promise.resolve(cached.accounts);
  }

  if (accountOptionsRequests.has(cacheKey)) {
    return accountOptionsRequests.get(cacheKey);
  }

  const request = apiClient.get('/compta/accounts/', {
    params: { company: companyId, exclude_roots: true }
  })
    .then(response => filterOperationalAccounts(normalizeApiResponse(response)))
    .then(accountsList => {
      accountOptionsCache.set(cacheKey, {
        accounts: accountsList,
        loadedAt: Date.now(),
      });
      return accountsList;
    })
    .finally(() => {
      accountOptionsRequests.delete(cacheKey);
    });

  accountOptionsRequests.set(cacheKey, request);
  return request;
};

// ==========================================
// COMPOSANT D'ÉTIQUETTE AVEC ASTÉRISQUE
// ==========================================
const RequiredLabel = ({ children, required }) => (
  <label className="text-xs text-gray-700 w-40 font-medium">
    {children}
    {required && <span className="text-red-500 ml-1">*</span>}
  </label>
);

const createPaymentMethodRow = (overrides = {}) => ({
  id: `payment-method-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
  payment_type: '',
  payment_method_id: '',
  ...overrides,
});

const PAYMENT_TYPE_OPTIONS = [
  { id: 'inbound', name: 'Encaissement' },
  { id: 'outbound', name: 'Décaissement' },
];

// ==========================================
// COMPOSANT PRINCIPAL
// ==========================================
export default function JournalForm({ mode = 'create' }) {
  const isShowMode = mode === 'show';
  const navigate = useNavigate();
  const location = useLocation();
  const { id } = useParams();
  const { activeEntity } = useEntity();

  const companyCacheKey = String(activeEntity?.id || 'global');
  const cachedAccountOptions = accountOptionsCache.get(companyCacheKey)?.accounts || [];
  const cachedJournalTypes = getFreshCacheValue(
    journalLookupCache,
    `${companyCacheKey}:types`,
    JOURNAL_LOOKUP_CACHE_DURATION,
  ) || [];

  const [journalTypesLoading, setJournalTypesLoading] = useState(cachedJournalTypes.length === 0);
  const [accountsLoading, setAccountsLoading] = useState(cachedAccountOptions.length === 0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [dismissedTypeInformation, setDismissedTypeInformation] = useState('');
  const [showActionsMenu, setShowActionsMenu] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [activeTab, setActiveTab] = useState('comptable');
  const [traceabilityLogs, setTraceabilityLogs] = useState([]);
  const [traceabilityLoading, setTraceabilityLoading] = useState(false);
  const [showTraceabilityPanel, setShowTraceabilityPanel] = useState(true);
  const [journalRecord, setJournalRecord] = useState(null);
  const [createdJournalId, setCreatedJournalId] = useState('');
  const bootRequestKeyRef = useRef('');
  
  const [accounts, setAccounts] = useState(cachedAccountOptions);
  const [journalTypes, setJournalTypes] = useState(cachedJournalTypes);
  const [banks, setBanks] = useState([]);
  const [paymentMethods, setPaymentMethods] = useState([]);
  
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    type_id: '',
    type_code: '',
    type_name: '',
    default_account_id: '',
    default_account_name: '',
    profit_account_id: '',
    profit_account_name: '',
    loss_account_id: '',
    loss_account_name: '',
    suspense_account_id: '',
    suspense_account_name: '',
    suspense_account_in_id: '',
    suspense_account_in_name: '',
    suspense_account_out_id: '',
    suspense_account_out_name: '',
    bank_account_id: '',
    bank_account_name: '',
    bank_acc_number: '',
    bank_id: '',
    bank_name: '',
    bank_statements_source: 'manual',
    email: '',
    payment_method_in: [],
    payment_method_out: [],
    payment_method_rows: [createPaymentMethodRow()],
    note: '',
    active: true,
    import_bank_statements: false,
    counterpart_per_line: false
  });

  const actionsMenuRef = useRef(null);
  const paymentMethodsTableRef = useRef(null);
  const currentJournalId = id || createdJournalId || journalRecord?.id || '';


  const getAccountById = useCallback((id) => {
    if (!id) return null;
    return accounts.find(account => String(account.id) === String(id)) || null;
  }, [accounts]);

  const paymentMethodSupports = (method, paymentType) => {
    const supportedType = String(method?.payment_type || 'both').toLowerCase();
    return supportedType === 'both' || supportedType === paymentType;
  };

  const inboundPaymentMethods = paymentMethods.filter(method => paymentMethodSupports(method, 'inbound'));
  const outboundPaymentMethods = paymentMethods.filter(method => paymentMethodSupports(method, 'outbound'));

  const getPaymentSuspenseAccountLabel = (method, paymentType) => {
    if (!method) return 'Sélectionnez un mode de paiement';

    const accountField = paymentType === 'inbound'
      ? 'outstanding_receipts_account'
      : 'outstanding_payments_account';
    const accountValue = method?.[accountField];
    const accountId = typeof accountValue === 'object'
      ? accountValue?.id
      : accountValue || method?.[`${accountField}_id`];
    const account = typeof accountValue === 'object' ? accountValue : getAccountById(accountId);
    const accountCode = account?.code || method?.[`${accountField}_code`] || '';
    const accountName = account?.name || account?.display_name || '';
    const accountLabel = [accountCode, accountName].filter(Boolean).join(' - ');

    return accountLabel || (accountId ? `Compte ${accountId}` : 'Compte en suspens non configuré');
  };
  const hasSelectedOption = (id, name) => Boolean(id) || !String(name || '').trim();

  const formatApiErrorMessage = (err, fallback) => {
    const data = err?.data || err?.response?.data || err;
    if (!data) return err?.message || fallback;

    if (typeof data === 'string') return data;
    if (Array.isArray(data)) return data.join('\n');

    const fieldLabels = {
      non_field_errors: 'Erreur',
      detail: 'Erreur',
      code: 'Préfixe de la séquence',
      name: 'Nom',
      type_id: 'Type',
      default_account_id: 'Compte de tresorerie',
      suspense_account_id: "Compte d'attente",
      profit_account_id: 'Compte de profit',
      loss_account_id: 'Compte de perte',
      bank_account_id: 'Compte bancaire',
      bank_acc_number: 'Numéro de compte bancaire',
      bank_id: 'Banque',
      company_id: 'Entite',
    };

    if (data.detail) return Array.isArray(data.detail) ? data.detail.join('\n') : String(data.detail);
    if (data.message) return Array.isArray(data.message) ? data.message.join('\n') : String(data.message);

    const lines = Object.entries(data).flatMap(([field, value]) => {
      const label = fieldLabels[field] || field;
      const messages = Array.isArray(value)
        ? value
        : value && typeof value === 'object'
          ? Object.values(value).flat()
          : [value];
      return messages.filter(Boolean).map(message => `${label} : ${message}`);
    });

    return lines.length ? lines.join('\n') : (err?.message || fallback);
  };

  const fetchFirstAvailable = async (urls) => {
    let lastError = null;
    for (const url of urls) {
      try {
        const response = await apiClient.get(url);
        return normalizeApiResponse(response);
      } catch (err) {
        lastError = err;
      }
    }
    throw lastError;
  };

  const getRecordId = (record, ...fields) => {
    for (const field of fields) {
      const value = record?.[field];
      if (value && typeof value === 'object' && value.id) return value.id;
      if (value !== undefined && value !== null && value !== '') return value;
    }
    return '';
  };

  const getAccountLabelFromRecord = (record, objectField, codeField, nameField) => {
    const account = record?.[objectField];
    if (account && typeof account === 'object') {
      return account.code && account.name ? `${account.code} - ${account.name}` : (account.name || account.code || '');
    }
    const code = record?.[codeField] || '';
    const name = record?.[nameField] || '';
    return code && name ? `${code} - ${name}` : (name || code || '');
  };

  const getBankAccountLabelFromRecord = (record) => {
    const bankAccount = record?.bank_account;
    if (bankAccount && typeof bankAccount === 'object') {
      return getBankAccountLabel(bankAccount);
    }
    return record?.bank_account_code || record?.bank_acc_number || '';
  };

  const getUserLabel = (value, fallback = 'Utilisateur') => {
    if (!value) return fallback;
    if (typeof value === 'string') return value;
    if (typeof value === 'number') return `Utilisateur #${value}`;
    return (
      value.display_name ||
      value.name ||
      value.username ||
      value.email ||
      value.label ||
      fallback
    );
  };

  const getTraceDate = (value) => {
    if (!value) return '';
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return String(value);
    return parsed.toLocaleString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const sanitizeTraceabilityText = (value) => String(value || '')
    .replace(/__DRAFT__\d+\s*-\s*/gi, '')
    .replace(/__DRAFT__\d+/gi, 'Brouillon')
    .trim();

  const normalizeTraceabilityItem = (log, index, source = 'journal') => {
    const userObj = log.user_detail || log.user || log.author || log.create_uid || log.created_by || {};
    const userName = log.created_by_name || log.createdByName || log.user_name || log.author_name || getUserLabel(userObj);
    return {
      id: log.id || `${source}-${log.created_at || log.date || index}`,
      source,
      action: log.action || log.event || log.type || 'Action',
      description: sanitizeTraceabilityText(log.description || log.message || log.body || log.note || ''),
      date: log.created_at || log.createdAt || log.date || log.timestamp || log.create_date || '',
      user: userName,
      objectLabel: sanitizeTraceabilityText(log.object_label || log.objectLabel || log.move_name || log.name || ''),
      moveId: log.move || log.move_id || log.object_id || null,
    };
  };

  const getMoveTraceabilityLogs = (move) => {
    const rawLogs =
      move?.traceability ||
      move?.module_traceability ||
      move?.moduleTraceability ||
      move?.audit_logs ||
      move?.auditLogs ||
      move?.history ||
      move?.activity_logs ||
      move?.activityLogs ||
      move?.logs ||
      [];
    return Array.isArray(rawLogs) ? rawLogs : (rawLogs?.results || []);
  };

  const buildMoveActivityLogs = (move) => {
    const moveLabel = move.name || move.display_name || move.ref || `Pièce #${move.id}`;
    const createdBy =
      move.create_uid_name ||
      move.create_uid_label ||
      move.created_by_name ||
      getUserLabel(move.create_uid, 'Utilisateur');
    const syntheticCreation = {
      id: `move-created-${move.id}`,
      source: 'piece',
      action: 'Pièce créée avec ce journal',
      description: moveLabel,
      date: move.create_date || move.created_at || move.date || '',
      user: createdBy,
      objectLabel: moveLabel,
      moveId: move.id,
    };
    const logs = getMoveTraceabilityLogs(move).map((log, index) => ({
      ...normalizeTraceabilityItem(log, index, 'piece'),
      action: log.action || 'Action sur pièce',
      description: log.description || log.message || moveLabel,
      objectLabel: log.object_label || log.objectLabel || moveLabel,
      moveId: log.move || log.move_id || move.id,
    }));
    return [syntheticCreation, ...logs];
  };

  const getTypeInfoFromRecord = (record) => {
    const type = record?.type;
    if (type && typeof type === 'object') {
      return {
        id: type.id || '',
        code: type.code || '',
        name: type.name || type.label || type.libelle || '',
      };
    }
    const selectedType = journalTypes.find(item => String(item.id) === String(record?.type || record?.type_id));
    return {
      id: record?.type || record?.type_id || '',
      code: selectedType?.code || record?.type_code || '',
      name: selectedType?.name || selectedType?.label || selectedType?.libelle || record?.type_name || '',
    };
  };

  const normalizeJournalForForm = (record) => {
    const typeInfo = getTypeInfoFromRecord(record);
    const bankAccount = record?.bank_account && typeof record.bank_account === 'object' ? record.bank_account : null;
    const linkedBank = bankAccount ? getBankFromBankAccount(bankAccount) : null;
    const bank = record?.bank && typeof record.bank === 'object' ? record.bank : linkedBank;
    const inboundMethodIds = (record?.inbound_payment_methods || record?.inbound_payment_method_ids || [])
      .map(method => String(typeof method === 'object' ? method?.id || '' : method || ''))
      .filter(Boolean);
    const outboundMethodIds = (record?.outbound_payment_methods || record?.outbound_payment_method_ids || [])
      .map(method => String(typeof method === 'object' ? method?.id || '' : method || ''))
      .filter(Boolean);
    const configuredPaymentMethodRows = [
      ...inboundMethodIds.map(methodId => createPaymentMethodRow({
        payment_type: 'inbound',
        payment_method_id: methodId,
      })),
      ...outboundMethodIds.map(methodId => createPaymentMethodRow({
        payment_type: 'outbound',
        payment_method_id: methodId,
      })),
    ];
    const paymentMethodRows = configuredPaymentMethodRows.length
      ? configuredPaymentMethodRows
      : [createPaymentMethodRow()];

    const normalizedForm = {
      name: record?.name || '',
      code: record?.code || '',
      type_id: typeInfo.id || '',
      type_code: typeInfo.code || '',
      type_name: typeInfo.name || '',
      default_account_id: getRecordId(record, 'default_account', 'default_account_id'),
      default_account_name: getAccountLabelFromRecord(record, 'default_account', 'default_account_code', 'default_account_name'),
      profit_account_id: getRecordId(record, 'profit_account', 'profit_account_id'),
      profit_account_name: getAccountLabelFromRecord(record, 'profit_account', 'profit_account_code', 'profit_account_name'),
      loss_account_id: getRecordId(record, 'loss_account', 'loss_account_id'),
      loss_account_name: getAccountLabelFromRecord(record, 'loss_account', 'loss_account_code', 'loss_account_name'),
      suspense_account_id: getRecordId(record, 'suspense_account', 'suspense_account_id'),
      suspense_account_name: getAccountLabelFromRecord(record, 'suspense_account', 'suspense_account_code', 'suspense_account_name'),
      suspense_account_in_id: getRecordId(record, 'suspense_account_in', 'suspense_account_in_id'),
      suspense_account_in_name: getAccountLabelFromRecord(record, 'suspense_account_in', 'suspense_account_in_code', 'suspense_account_in_name'),
      suspense_account_out_id: getRecordId(record, 'suspense_account_out', 'suspense_account_out_id'),
      suspense_account_out_name: getAccountLabelFromRecord(record, 'suspense_account_out', 'suspense_account_out_code', 'suspense_account_out_name'),
      bank_account_id: getRecordId(record, 'bank_account', 'bank_account_id'),
      bank_account_name: getBankAccountLabelFromRecord(record),
      bank_acc_number: record?.bank_acc_number || getBankAccountNumber(bankAccount) || '',
      bank_id: getRecordId(record, 'bank', 'bank_id') || linkedBank?.id || '',
      bank_name: bank ? getBankLabel(bank) : (record?.bank_name || ''),
      bank_statements_source: record?.bank_statements_source || 'manual',
      email: record?.email || activeEntity?.email || '',
      payment_method_in: inboundMethodIds,
      payment_method_out: outboundMethodIds,
      payment_method_rows: paymentMethodRows,
      note: record?.note || '',
      active: record?.active !== undefined ? Boolean(record.active) : true,
      import_bank_statements: Boolean(record?.import_bank_statements),
      counterpart_per_line: Boolean(record?.counterpart_per_line),
    };

    try {
      const dashboardData = typeof record?.kanban_dashboard === 'string'
        ? JSON.parse(record.kanban_dashboard || '{}')
        : record?.kanban_dashboard;
      if (dashboardData?.somane_draft === true && dashboardData?.formData) {
        const storedForm = { ...dashboardData.formData };
        if (!Array.isArray(storedForm.payment_method_rows) || storedForm.payment_method_rows.length === 0) {
          storedForm.payment_method_rows = [createPaymentMethodRow()];
        }
        return { ...normalizedForm, ...storedForm };
      }
    } catch (draftError) {
      console.warn('Impossible de restaurer les données du brouillon du journal', draftError);
    }

    return normalizedForm;
  };

  const loadJournal = async () => {
    if (!isShowMode || !id) return null;

    const routeRecord = location.state?.journalRecord
      || location.state?.selectedRecord
      || location.state?.record
      || null;
    const cachedRecord = getFreshCacheValue(
      journalRecordCache,
      id,
      JOURNAL_RECORD_CACHE_DURATION,
    );
    const immediateRecord = String(routeRecord?.id || '') === String(id)
      ? routeRecord
      : cachedRecord;

    if (immediateRecord) {
      setJournalRecord(immediateRecord);
      setFormData(normalizeJournalForForm(immediateRecord));
      setHasUnsavedChanges(false);
    }

    try {
      const refresh = apiClient.get(`/compta/journals/${id}/`).then(response => {
        const data = response?.data || response;
        cacheJournalRecord(data);
        setJournalRecord(data);
        setFormData(normalizeJournalForForm(data));
        setHasUnsavedChanges(false);
        return data;
      });

      if (immediateRecord) {
        void refresh.catch(err => {
          console.warn('Actualisation silencieuse du journal impossible:', err);
        });
        return immediateRecord;
      }

      return await refresh;
    } catch (err) {
      console.error('Erreur chargement journal:', err);
      setError(err?.data?.detail || err?.response?.data?.detail || err?.message || 'Erreur de chargement du journal');
      return null;
    }
  };

  const loadJournalTraceability = async (recordOverride = null) => {
    const journalIdForTraceability = recordOverride?.id || currentJournalId;
    if (!journalIdForTraceability || !activeEntity) return;
    setTraceabilityLoading(true);
    try {
      const sourceRecord = recordOverride || journalRecord;
      const [journalLogsResponse, movesResponse] = await Promise.allSettled([
        apiClient.get('/compta/module-traceability/', {
          params: {
            company: activeEntity.id,
            journal: journalIdForTraceability,
            page_size: 100,
          },
        }),
        apiClient.get('/compta/moves/', {
          params: {
            company: activeEntity.id,
            journal: journalIdForTraceability,
            ordering: '-create_date',
            page_size: 100,
          },
        }),
      ]);

      const expectedJournalId = String(journalIdForTraceability);
      const getRelatedId = (value) => {
        if (value && typeof value === 'object') {
          return value.id || value.pk || value.value || '';
        }
        return value ?? '';
      };
      const isCurrentJournalMove = (move) => {
        const relatedId = getRelatedId(move?.journal_id ?? move?.journal);
        return relatedId !== '' && String(relatedId) === expectedJournalId;
      };
      const rawMoves = movesResponse.status === 'fulfilled'
        ? normalizeApiResponse(movesResponse.value)
        : [];
      const moves = rawMoves.filter(isCurrentJournalMove);
      const currentMoveIds = new Set(moves.map(move => String(move?.id || '')).filter(Boolean));
      const isCurrentJournalLog = (log) => {
        const linkedMoveId = getRelatedId(log?.move_id ?? log?.move);
        if (linkedMoveId !== '') {
          return currentMoveIds.has(String(linkedMoveId));
        }

        const relatedId = getRelatedId(
          log?.object_id ?? log?.objectId ?? log?.journal_id ?? log?.journal ?? log?.record_id,
        );
        return relatedId !== '' && String(relatedId) === expectedJournalId;
      };

      const journalLogs = journalLogsResponse.status === 'fulfilled'
        ? normalizeApiResponse(journalLogsResponse.value)
            .filter(isCurrentJournalLog)
            .map((log, index) => normalizeTraceabilityItem(
              log,
              index,
              getRelatedId(log?.move_id ?? log?.move) ? 'piece' : 'journal',
            ))
        : [];
      const hasCreationLog = journalLogs.some(log => {
        const action = normalizeText(log.action);
        return log.source === 'journal' && (action.includes('creation') || action.includes('cree'));
      });
      const syntheticJournalLogs = [];
      if (sourceRecord && !hasCreationLog && (sourceRecord.created_at || sourceRecord.create_date || sourceRecord.created_by)) {
        syntheticJournalLogs.push({
          id: `journal-created-${journalIdForTraceability}`,
          source: 'journal',
          action: 'Création du journal',
          description: [formData.code, sourceRecord.name || formData.name]
            .map(value => sanitizeTraceabilityText(value))
            .filter(Boolean)
            .join(' - '),
          date: sourceRecord.created_at || sourceRecord.create_date || '',
          user: getUserLabel(sourceRecord.created_by_name || sourceRecord.created_by || sourceRecord.create_uid, 'Utilisateur'),
          objectLabel: sourceRecord.name || formData.name || '',
        });
      }
      const moveLogs = moves.flatMap(move => {
        const moveId = String(move?.id || '');
        const hasRecordedCreation = journalLogs.some(log => {
          const action = normalizeText(log.action);
          return String(getRelatedId(log.moveId)) === moveId
            && (action.includes('creation') || action.includes('cree'));
        });
        return buildMoveActivityLogs(move).filter(log => (
          !hasRecordedCreation || String(log.id) !== `move-created-${moveId}`
        ));
      });
      const uniqueLogs = new Map();
      [...journalLogs, ...syntheticJournalLogs, ...moveLogs].forEach(log => {
        uniqueLogs.set(`${log.source}:${log.id}`, log);
      });
      const mergedLogs = Array.from(uniqueLogs.values()).sort((a, b) => {
        const dateA = a.date ? new Date(a.date).getTime() : 0;
        const dateB = b.date ? new Date(b.date).getTime() : 0;
        return dateB - dateA;
      });
      setTraceabilityLogs(mergedLogs);
    } catch (err) {
      console.error('Erreur chargement traçabilité journal:', err);
      setTraceabilityLogs([]);
    } finally {
      setTraceabilityLoading(false);
    }
  };

  useEffect(() => {
    if (activeEntity?.email) {
      setFormData(prev => ({ ...prev, email: activeEntity.email }));
    }
  }, [activeEntity]);

  useEffect(() => {
    if (!activeEntity) {
      setError('Vous devez selectionner une entite pour consulter ce journal');
    }
  }, [activeEntity]);

  useEffect(() => {
    if (activeEntity) {
      const bootKey = `${activeEntity.id}:${id || 'new'}:${location.state?.restoreJournalDraft ? 'restore' : 'load'}`;
      if (bootRequestKeyRef.current === bootKey) return;
      bootRequestKeyRef.current = bootKey;

      const boot = async () => {
        if (location.state?.restoreJournalDraft) {
          void loadOptions();
          return;
        }
        void loadOptions();
        const journalData = isShowMode && id ? await loadJournal() : null;
        if (journalData) {
          void runWhenBrowserIdle(() => loadJournalTraceability(journalData));
        }
      };
      void boot();
    }
  }, [activeEntity, id, isShowMode, location.state]);

  useEffect(() => {
    const state = location.state || {};
    let contextState = state.restoreJournalDraft ? state : null;

    if (!contextState) {
      try {
        const saved = JSON.parse(sessionStorage.getItem(JOURNAL_CONTEXT_DRAFT_KEY) || 'null');
        if (saved?.restoreJournalDraft?.journalId && String(saved.restoreJournalDraft.journalId) === String(currentJournalId)) {
          contextState = saved;
        }
      } catch (storageError) {
        console.warn('Impossible de restaurer le brouillon du journal', storageError);
      }
    }

    const draft = contextState?.restoreJournalDraft;
    if (!draft?.formData) return;

    const createdRecord = state.createdRecord || state.created_record || state.record || null;
    const targetFields = contextState.targetFields || {};
    const createdId = createdRecord?.id || createdRecord?.pk || '';
    const getCreatedLabel = () => {
      if (!createdRecord) return contextState.returnQuery || '';
      if (contextState.returnField === 'account') {
        return [createdRecord.code, createdRecord.name].filter(Boolean).join(' - ') || createdRecord.display_name || contextState.returnQuery || '';
      }
      if (contextState.returnField === 'bank') return getBankLabel(createdRecord) || contextState.returnQuery || '';
      if (contextState.returnField === 'bankAccount') return getBankAccountLabel(createdRecord) || contextState.returnQuery || '';
      return createdRecord.display_name || createdRecord.name || contextState.returnQuery || '';
    };

    const restoredForm = { ...draft.formData };
    if (!Array.isArray(restoredForm.payment_method_rows)) {
      const restoredPaymentMethodRows = [
        ...(restoredForm.payment_method_in || []).map(methodId => createPaymentMethodRow({
          payment_type: 'inbound',
          payment_method_id: String(methodId),
        })),
        ...(restoredForm.payment_method_out || []).map(methodId => createPaymentMethodRow({
          payment_type: 'outbound',
          payment_method_id: String(methodId),
        })),
      ];
      restoredForm.payment_method_rows = restoredPaymentMethodRows.length
        ? restoredPaymentMethodRows
        : [createPaymentMethodRow()];
    }
    if (restoredForm.payment_method_rows.length === 0) {
      restoredForm.payment_method_rows = [createPaymentMethodRow()];
    }
    if (createdId && targetFields.idField) {
      restoredForm[targetFields.idField] = createdId;
      if (targetFields.nameField) restoredForm[targetFields.nameField] = getCreatedLabel();
    }

    setFormData(restoredForm);
    setActiveTab(['comptable', 'avance', 'paiement', 'notes'].includes(draft.activeTab) ? draft.activeTab : 'comptable');
    setShowTraceabilityPanel(draft.showTraceabilityPanel !== false);
    setHasUnsavedChanges(true);

    try {
      sessionStorage.removeItem(JOURNAL_CONTEXT_DRAFT_KEY);
    } catch {}
  }, [id, location.state]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (actionsMenuRef.current && !actionsMenuRef.current.contains(e.target)) {
        setShowActionsMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const ensureAccountsLoaded = useCallback(async () => {
    if (!activeEntity?.id) return [];
    const entityKey = String(activeEntity.id);
    const cachedAccounts = accountOptionsCache.get(entityKey)?.accounts || [];
    if (cachedAccounts.length) {
      setAccounts(cachedAccounts);
      setAccountsLoading(false);
    } else {
      setAccountsLoading(true);
    }

    try {
      const accountsList = await fetchJournalAccountOptions(activeEntity.id);
      setAccounts(accountsList);
      return accountsList;
    } catch (requestError) {
      console.warn('Comptes non disponibles:', requestError?.message);
      return [];
    } finally {
      setAccountsLoading(false);
    }
  }, [activeEntity?.id]);

  const loadOptions = async () => {
    const entityKey = String(activeEntity?.id || 'global');
    const typesCacheKey = `${entityKey}:types`;
    const banksCacheKey = `${entityKey}:banks`;
    const bankAccountsCacheKey = `${entityKey}:bank-accounts`;
    const paymentMethodsCacheKey = `${entityKey}:payment-methods`;
    const availableCachedTypes = getFreshCacheValue(
      journalLookupCache,
      typesCacheKey,
      JOURNAL_LOOKUP_CACHE_DURATION,
    );
    const availableCachedAccounts = accountOptionsCache.get(entityKey)?.accounts || [];

    if (availableCachedTypes?.length) setJournalTypes(availableCachedTypes);
    if (availableCachedAccounts.length) setAccounts(availableCachedAccounts);
    setJournalTypesLoading(!availableCachedTypes?.length);
    setAccountsLoading(availableCachedAccounts.length === 0);
    
    try {
      const [typesResult, accountsResult, bankAccountsResult, banksResult, paymentMethodsResult] = await Promise.allSettled([
        fetchCachedJournalLookup(typesCacheKey, () => (
          apiClient.get('/compta/journal-types/').then(normalizeApiResponse)
        )).then(typesData => {
          setJournalTypes(typesData);
          setJournalTypesLoading(false);
          return typesData;
        }),
        runWhenBrowserIdle(ensureAccountsLoaded),
        runWhenBrowserIdle(() => fetchCachedJournalLookup(bankAccountsCacheKey, () => (
          fetchFirstAvailable([
            '/banques-partenaires/',
            '/api/banques-partenaires/',
          ])
        ))),
        runWhenBrowserIdle(() => fetchCachedJournalLookup(banksCacheKey, () => (
          fetchFirstAvailable([
            '/banques/',
            '/api/banques/',
          ])
        ))),
        runWhenBrowserIdle(() => fetchCachedJournalLookup(paymentMethodsCacheKey, () => (
          apiClient.get('/compta/payment-methods/').then(normalizeApiResponse)
        ))),
      ]);

      if (typesResult.status === 'rejected') {
        setError(`Erreur de chargement des types de journal: ${typesResult.reason?.message || 'Erreur inconnue'}`);
      }

      if (accountsResult.status === 'fulfilled') {
        setAccounts(accountsResult.value);
      } else {
        console.warn('⚠️ Comptes non disponibles:', accountsResult.reason?.message);
      }
      setAccountsLoading(false);

      const availableBankAccounts = bankAccountsResult.status === 'fulfilled'
        ? bankAccountsResult.value
        : [];
      const availableBanks = banksResult.status === 'fulfilled'
        ? banksResult.value
        : [];

      setBanks(mergeBanks(
        availableBanks,
        availableBankAccounts.map(getBankFromBankAccount).filter(Boolean)
      ));

      if (bankAccountsResult.status === 'rejected') {
        console.log('ℹ️ Banques partenaires non disponibles');
      }
      if (banksResult.status === 'rejected') {
        console.log('ℹ️ Banques non disponibles');
      }

      if (paymentMethodsResult.status === 'fulfilled') {
        setPaymentMethods(paymentMethodsResult.value);
      } else {
        console.log('ℹ️ Méthodes de paiement non disponibles');
        setPaymentMethods([]);
      }
    } catch (err) {
      console.error(' Erreur critique:', err);
      setError(`Erreur de chargement: ${err.message}`);
    } finally {
      setJournalTypesLoading(false);
      setAccountsLoading(false);
    }
  };

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

  const markAsModified = () => {
    if (!hasUnsavedChanges) setHasUnsavedChanges(true);
  };

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    markAsModified();
  };

  const buildContextReturnState = useCallback((field, query = '', targetFields = null) => ({
    returnTo: `${location.pathname}${location.search || ''}`,
    returnField: field,
    returnQuery: query,
    suggestedValue: query,
    targetFields,
    fromJournal: true,
    restoreJournalDraft: {
      formData,
      activeTab,
      journalId: currentJournalId,
      showTraceabilityPanel,
    },
  }), [activeTab, formData, currentJournalId, location.pathname, location.search, showTraceabilityPanel]);

  const navigateToContextCreate = useCallback((field, query = '', targetFields = null) => {
    const route = getJournalContextCreateRoute(field);
    if (!route) return;

    const returnState = buildContextReturnState(field, query, targetFields);
    try {
      sessionStorage.setItem(JOURNAL_CONTEXT_DRAFT_KEY, JSON.stringify(returnState));
    } catch (storageError) {
      console.warn('Impossible de sauvegarder le brouillon du journal', storageError);
    }
    navigate(route, { state: returnState });
  }, [buildContextReturnState, navigate]);

  const handleBankSelect = (id, label) => {
    setFormData(prev => ({
      ...prev,
      bank_id: id || '',
      bank_name: label || '',
      bank_account_id: '',
      bank_account_name: '',
      bank_acc_number: '',
    }));
    markAsModified();
  };

  const syncPaymentMethodArrays = (rows) => ({
    payment_method_in: rows
      .filter(row => row.payment_type === 'inbound' && row.payment_method_id)
      .map(row => String(row.payment_method_id)),
    payment_method_out: rows
      .filter(row => row.payment_type === 'outbound' && row.payment_method_id)
      .map(row => String(row.payment_method_id)),
  });

  const addPaymentMethodRow = (focusNewRow = false) => {
    setFormData(prev => {
      const rows = [...(prev.payment_method_rows || []), createPaymentMethodRow()];
      return { ...prev, payment_method_rows: rows, ...syncPaymentMethodArrays(rows) };
    });
    markAsModified();

    if (focusNewRow) {
      window.setTimeout(() => {
        const rows = paymentMethodsTableRef.current?.querySelectorAll('[data-payment-method-row]');
        const lastRow = rows?.[rows.length - 1];
        lastRow?.querySelector('input:not([disabled])')?.focus();
      }, 0);
    }
  };

  const focusPaymentMethodInput = (rowIndex, inputIndex) => {
    window.setTimeout(() => {
      const rows = paymentMethodsTableRef.current?.querySelectorAll('[data-payment-method-row]');
      const inputs = rows?.[rowIndex]?.querySelectorAll('input:not([disabled])');
      inputs?.[inputIndex]?.focus();
    }, 0);
  };

  const updatePaymentMethodRow = (rowId, field, value) => {
    setFormData(prev => {
      const rows = (prev.payment_method_rows || []).map(row => {
        if (row.id !== rowId) return row;
        if (field === 'payment_type') {
          return { ...row, payment_type: value, payment_method_id: '' };
        }
        return { ...row, [field]: value };
      });
      return { ...prev, payment_method_rows: rows, ...syncPaymentMethodArrays(rows) };
    });
    markAsModified();
  };

  const removePaymentMethodRow = (rowId) => {
    setFormData(prev => {
      const rows = (prev.payment_method_rows || []).filter(row => row.id !== rowId);
      return { ...prev, payment_method_rows: rows, ...syncPaymentMethodArrays(rows) };
    });
    markAsModified();
  };

  const handleTypeChange = (typeId) => {
    const selectedType = journalTypes.find(t => String(t.id) === String(typeId));
    
    setFormData(prev => ({ 
      ...prev, 
      type_id: typeId,
      type_code: selectedType?.code || '',
      type_name: selectedType?.name || '',
      default_account_id: '',
      default_account_name: '',
      profit_account_id: '',
      profit_account_name: '',
      loss_account_id: '',
      loss_account_name: '',
      suspense_account_id: '',
      suspense_account_name: '',
      suspense_account_in_id: '',
      suspense_account_in_name: '',
      suspense_account_out_id: '',
      suspense_account_out_name: '',
      bank_id: '',
      bank_name: '',
      bank_account_id: '',
      bank_account_name: '',
      bank_acc_number: '',
      bank_statements_source: 'manual',
    }));
    markAsModified();
  };

  const isBankType = () => {
    const bankCodes = ['BQ', 'BN', 'BAN', 'BANQUE', 'BANK'];
    const typeCode = String(formData.type_code || '').toUpperCase();
    const selectedType = journalTypes.find(t => String(t.id) === String(formData.type_id));
    const typeText = normalizeText([
      formData.type_code,
      formData.type_name,
      selectedType?.code,
      selectedType?.name,
      selectedType?.label,
      selectedType?.libelle,
    ].filter(Boolean).join(' '));
    return bankCodes.includes(typeCode) ||
           typeCode.startsWith('BQ') ||
           typeCode.startsWith('BN') ||
           typeText.includes('banque') ||
           typeText.includes('bank');
  };

  const isCashType = () => {
    const cashCodes = ['CA', 'CS', 'CAI', 'CAISSE', 'CASH'];
    const typeCode = String(formData.type_code || '').toUpperCase();
    const selectedType = journalTypes.find(t => String(t.id) === String(formData.type_id));
    const typeText = normalizeText([
      formData.type_code,
      formData.type_name,
      selectedType?.code,
      selectedType?.name,
      selectedType?.label,
      selectedType?.libelle,
    ].filter(Boolean).join(' '));
    return cashCodes.includes(typeCode) ||
           typeCode.startsWith('CA') ||
           typeCode.startsWith('CS') ||
           typeText.includes('caisse') ||
           typeText.includes('cash');
  };

  const usesBankConfiguration = () => {
    const selectedType = journalTypes.find(t => String(t.id) === String(formData.type_id));
    const typeCode = String(formData.type_code || selectedType?.code || '').toUpperCase();
    const typeText = normalizeText([
      formData.type_code,
      formData.type_name,
      selectedType?.code,
      selectedType?.name,
      selectedType?.label,
      selectedType?.libelle,
    ].filter(Boolean).join(' '));

    return isBankType()
      || ['CB', 'MEL'].includes(typeCode)
      || typeText.includes('carte bancaire')
      || typeText.includes('bank card')
      || typeText.includes('monnaie electronique')
      || typeText.includes('electronic money');
  };

  const getSelectedJournalTypeName = () => {
    const selectedType = journalTypes.find(t => String(t.id) === String(formData.type_id));
    return formData.type_name
      || selectedType?.name
      || selectedType?.label
      || selectedType?.libelle
      || selectedType?.code
      || 'Trésorerie';
  };

  const validateForm = (silent = false) => {
    if (!activeEntity) { 
      if (!silent) setError('Vous devez sélectionner une entité'); 
      return false; 
    }

    if (!formData.name.trim()) {
      if (!silent) setError('Le nom du journal est obligatoire');
      return false;
    }

    if (!formData.code.trim()) {
      if (!silent) setError('Le code du journal est obligatoire');
      return false;
    }
    
    if (formData.code.length > 8) {
      if (!silent) setError('Le code ne doit pas dépasser 8 caractères');
      return false;
    }

    if (!formData.type_id) {
      if (!silent) setError('Le type de journal est obligatoire');
      return false;
    }

    if (usesBankConfiguration()) {
      const journalTypeName = getSelectedJournalTypeName();
      if (!formData.default_account_id) {
        if (!silent) setError(`Le compte de tresorerie est obligatoire pour un journal de type ${journalTypeName}`);
        return false;
      }
      if (!formData.suspense_account_id) {
        if (!silent) setError(`Le compte d'attente des transactions sur le relevé bancaire est obligatoire pour un journal de type ${journalTypeName}`);
        return false;
      }
      if (!formData.bank_acc_number) {
        if (!silent) setError(`Le numéro de compte bancaire (IBAN/RIB) est obligatoire pour un journal de type ${journalTypeName}`);
        return false;
      }
      if (!formData.bank_id) {
        if (!silent) setError(`La banque est obligatoire pour un journal de type ${journalTypeName}`);
        return false;
      }
    }

    if (isCashType()) {
      if (!formData.default_account_id) {
        if (!silent) setError('Le compte de tresorerie est obligatoire pour un journal de type Caisse');
        return false;
      }
    }

    if (!hasSelectedOption(formData.default_account_id, formData.default_account_name)) {
      if (!silent) setError('Selectionnez le compte par defaut dans la liste.');
      return false;
    }
    if (!hasSelectedOption(formData.suspense_account_id, formData.suspense_account_name)) {
      if (!silent) setError('Selectionnez le compte d\'attente dans la liste.');
      return false;
    }
    if (!hasSelectedOption(formData.profit_account_id, formData.profit_account_name)) {
      if (!silent) setError('Selectionnez le compte de profit dans la liste.');
      return false;
    }
    if (!hasSelectedOption(formData.loss_account_id, formData.loss_account_name)) {
      if (!silent) setError('Selectionnez le compte de perte dans la liste.');
      return false;
    }

    return true;
  };

  const getRequiredFields = () => {
    if (!formData.type_id) return ['name', 'code', 'type_id'];
    
    if (usesBankConfiguration()) {
      return ['name', 'code', 'type_id', 'default_account_id', 'suspense_account_id', 'bank_acc_number', 'bank_id'];
    } else if (isCashType()) {
      return ['name', 'code', 'type_id', 'default_account_id'];
    } else {
      return ['name', 'code', 'type_id'];
    }
  };

  const prepareDataForApi = useCallback(() => {
    const journalPrefix = sanitizeJournalPrefix(formData.code);
    const apiData = {
      name: formData.name,
      code: journalPrefix,
      type_id: formData.type_id || null,
      company_id: activeEntity?.id || null,
      default_account_id: formData.default_account_id || null,
      profit_account_id: formData.profit_account_id || null,
      loss_account_id: formData.loss_account_id || null,
      suspense_account_id: formData.suspense_account_id || null,
      bank_account_id: usesBankConfiguration() ? (formData.bank_account_id || null) : null,
      bank_acc_number: usesBankConfiguration() ? (formData.bank_acc_number || null) : null,
      bank_id: usesBankConfiguration() ? (formData.bank_id || null) : null,
      bank_statements_source: usesBankConfiguration() ? (formData.bank_statements_source || 'manual') : 'manual',
      email: formData.email || null,
      note: formData.note || '',
      active: formData.active,
      import_bank_statements: usesBankConfiguration() ? (formData.import_bank_statements || false) : false,
      counterpart_per_line: formData.counterpart_per_line || false,
      inbound_payment_method_ids: formData.payment_method_in.map(Number).filter(Boolean),
      outbound_payment_method_ids: formData.payment_method_out.map(Number).filter(Boolean)
    };
    
    Object.keys(apiData).forEach(key => {
      if (apiData[key] === undefined || apiData[key] === null || apiData[key] === '') {
        delete apiData[key];
      }
    });
    
    return apiData;
  }, [formData, activeEntity]);

  const ensureJournalSequence = useCallback(async () => {
    const journalPrefix = sanitizeJournalPrefix(formData.code);
    if (!journalPrefix || !activeEntity?.id) return null;

    const yearShort = getCurrentYearShort();
    const sequencePrefix = buildJournalSequencePrefix(journalPrefix, yearShort);
    const sequenceCode = buildJournalSequenceCode(journalPrefix, yearShort);
    const companyId = String(activeEntity.id);

    const findMatchingSequence = (items) => normalizeApiResponse(items).find(sequence => {
      const sequenceCompanyId = String(getRecordId(sequence, 'company', 'company_id') || companyId);
      return (
        String(sequence.prefix || '').toUpperCase() === sequencePrefix.toUpperCase() &&
        String(sequence.suffix || '') === '' &&
        sequenceCompanyId === companyId
      );
    });

    try {
      const response = await apiClient.get(`/sequences/?company=${activeEntity.id}`);
      const existing = findMatchingSequence(response);
      const existingId = getSequenceRecordId(existing);
      if (existingId) return existingId;
    } catch (err) {
      console.warn('Recherche de sequence automatique indisponible, tentative de creation directe.', err);
    }

    const payload = {
      name: `Sequence ${journalPrefix} ${yearShort}`,
      code: sequenceCode,
      prefix: sequencePrefix,
      suffix: '',
      padding: 2,
      current_number: 0,
      number_increment: 1,
      active: true,
      company: activeEntity.id,
    };

    try {
      const created = await apiClient.post('/sequences/', payload);
      return getSequenceRecordId(created?.data || created);
    } catch (err) {
      const retryResponse = await apiClient.get(`/sequences/?company=${activeEntity.id}`);
      const existing = findMatchingSequence(retryResponse);
      const existingId = getSequenceRecordId(existing);
      if (existingId) return existingId;
      throw err;
    }
  }, [activeEntity, formData.code]);

  const findDuplicateJournalName = useCallback(async () => {
    const targetName = normalizeText(formData.name);
    if (!targetName || !activeEntity?.id) return null;

    try {
      const response = await apiClient.get('/compta/journals/', {
        params: { company: activeEntity.id, page_size: 500 }
      });
      const journals = normalizeApiResponse(response);
      const currentId = String(currentJournalId || '');

      return journals.find(journal => {
        const journalId = String(journal?.id || '');
        return journalId !== currentId && normalizeText(journal?.name) === targetName;
      }) || null;
    } catch (err) {
      console.warn('Verification du nom de journal indisponible.', err);
      return null;
    }
  }, [activeEntity, formData.name, currentJournalId]);

  // ==========================================
  // SAUVEGARDE - VERSION CORRIGÉE
  // ==========================================
const getNextDatabaseDraftIdentity = useCallback(async () => {
  const response = await apiClient.get('/compta/journals/', {
    params: {
      company: activeEntity?.id,
      active: false,
      search: 'Brouillon',
      page_size: 500,
    },
  });
  const lastNumber = normalizeApiResponse(response).reduce(
    (maximum, journal) => Math.max(maximum, getDraftJournalNumber(journal)),
    0,
  );
  const number = String(lastNumber + 1).padStart(5, '0');
  return {
    name: `Brouillon ${number}`,
    technicalCode: `__DRAFT__${number}`,
  };
}, [activeEntity?.id]);

const saveDatabaseDraft = useCallback(async (silent = false) => {
  if (!activeEntity?.id) {
    setError('Vous devez sélectionner une entité avant d’enregistrer le brouillon.');
    return false;
  }

  if (!formData.type_id) {
    setError('Sélectionnez au moins le type du journal pour enregistrer le brouillon dans la base.');
    return false;
  }

  setIsSubmitting(true);

  try {
    const existingDraftName = String(journalRecord?.name || '').trim();
    const isExistingDraft = journalRecord?.active === false && DRAFT_JOURNAL_NAME_PATTERN.test(existingDraftName);
    const draftIdentity = isExistingDraft
      ? { name: existingDraftName, technicalCode: '' }
      : await getNextDatabaseDraftIdentity();
    const enteredPrefix = sanitizeJournalPrefix(formData.code);
    const apiData = {
      ...prepareDataForApi(),
      name: draftIdentity.name,
      type_id: formData.type_id,
      company_id: activeEntity.id,
      active: false,
      show_on_dashboard: false,
      kanban_dashboard: JSON.stringify({
        somane_draft: true,
        formData,
        activeTab,
        showTraceabilityPanel,
        savedAt: new Date().toISOString(),
      }),
    };

    if (enteredPrefix) {
      apiData.code = enteredPrefix;
    } else if (!currentJournalId) {
      // Le modele impose un code unique. Cette valeur reste strictement interne
      // et le serializer restitue le prefixe utilisateur, donc une chaine vide.
      apiData.code = draftIdentity.technicalCode;
    } else {
      delete apiData.code;
    }

    const response = currentJournalId
      ? await apiClient.patch(`/compta/journals/${currentJournalId}/`, apiData)
      : await apiClient.post('/compta/journals/', apiData);
    const savedRecord = response?.data || response || {};
    const savedJournalId = savedRecord.id || currentJournalId;

    if (savedJournalId) setCreatedJournalId(String(savedJournalId));
    if (savedRecord && Object.keys(savedRecord).length) {
      cacheJournalRecord(savedRecord);
      setJournalRecord(savedRecord);
    }

    setHasUnsavedChanges(false);
    setError(null);
    if (!silent) setSuccess(`${draftIdentity.name} enregistré dans la base de données.`);
    await loadJournalTraceability(savedRecord);
    return { ...savedRecord, isDatabaseDraft: true };
  } catch (err) {
    console.error('Impossible d’enregistrer le brouillon du journal', err);
    setError(formatApiErrorMessage(err, 'Impossible d’enregistrer le brouillon'));
    return false;
  } finally {
    setIsSubmitting(false);
  }
}, [
  activeEntity,
  activeTab,
  currentJournalId,
  formData,
  getNextDatabaseDraftIdentity,
  journalRecord,
  prepareDataForApi,
  showTraceabilityPanel,
]);

const handleSave = async (silent = false) => {
  const isComplete = validateForm(true);

  if (!isComplete) {
    return saveDatabaseDraft(silent);
  }

  setIsSubmitting(true);
  if (!silent) setError(null);

  try {
    const duplicateJournal = await findDuplicateJournalName();
    if (duplicateJournal) {
      const duplicateCode = duplicateJournal.code ? ` (${duplicateJournal.code})` : '';
      const message = `Un journal avec le nom "${formData.name}" existe deja${duplicateCode}. Utilisez un autre nom pour eviter la confusion.`;
      setError(message);
      return false;
    }

    const apiData = prepareDataForApi();
    apiData.kanban_dashboard = '';
    apiData.show_on_dashboard = Boolean(formData.active);
    const sequenceId = await ensureJournalSequence();
    if (sequenceId) {
      apiData.sequence_id = sequenceId;
    }
    const response = currentJournalId
      ? await apiClient.patch(`/compta/journals/${currentJournalId}/`, apiData)
      : await apiClient.post('/compta/journals/', apiData);
    const savedRecord = response?.data || response || {};
    const savedJournalId = savedRecord.id || currentJournalId;
    if (savedJournalId) {
      setCreatedJournalId(String(savedJournalId));
    }
    if (savedRecord && Object.keys(savedRecord).length) {
      cacheJournalRecord(savedRecord);
      setJournalRecord(savedRecord);
    }

    if (!silent) {
      setSuccess(currentJournalId ? 'Journal mis a jour avec succes !' : 'Journal cree avec succes !');
    }
    setHasUnsavedChanges(false);
    await loadJournalTraceability(savedRecord);
    
    return savedRecord || true;
    
  } catch (err) {
    // Le message est dans err.data (pas err.response.data)
    const errorMessage = formatApiErrorMessage(err, currentJournalId ? 'Erreur lors de la mise a jour' : 'Erreur lors de la creation');
    
    // Essaye différents endroits où le message pourrait être
    setError(errorMessage);
    return false;
  } finally {
    setIsSubmitting(false);
  }
};
  const buildJournalReturnState = useCallback((savedJournal = null) => {
    const originState = location.state || {};
    const returnTo = originState.returnTo || originState.returnContext?.returnTo || '';
    const nextState = {
      ...originState,
      restoredFromSmartBack: true,
      returnContext: originState.returnContext || null,
      restorePieceDraft: originState.restorePieceDraft ?? returnTo.includes('/pieces'),
      restoreJournalDraft: originState.restoreJournalDraft,
      restorePaymentDraft: originState.restorePaymentDraft
        ?? (returnTo.includes('/paiement') || returnTo.includes('/payement')),
    };

    if (savedJournal) {
      const label = [savedJournal.code || formData.code, savedJournal.name || formData.name]
        .filter(Boolean)
        .join(' - ');
      Object.assign(nextState, {
        createdRecord: savedJournal,
        created_record: savedJournal,
        selectedRecord: savedJournal,
        updatedRecord: savedJournal,
        returnField: originState.returnField || originState.selectedField || 'journal',
        selectedField: originState.selectedField || originState.returnField || 'journal',
        returnQuery: originState.returnQuery || originState.suggestedValue || label,
        suggestedValue: originState.suggestedValue || originState.returnQuery || label,
      });
    }

    return nextState;
  }, [formData.code, formData.name, location.state]);

  const handleDuplicate = async () => {
    if (!activeEntity?.id || !formData.type_id) {
      setError('Sélectionnez au moins le type du journal avant de le dupliquer.');
      setShowActionsMenu(false);
      return;
    }

    setIsSubmitting(true);
    setError(null);
    setShowActionsMenu(false);

    try {
      const draftIdentity = await getNextDatabaseDraftIdentity();
      const duplicatedFormData = {
        ...formData,
        name: formData.name?.trim() ? `${formData.name.trim()} (copie)` : '',
        code: '',
        active: false,
      };
      const apiData = {
        ...prepareDataForApi(),
        name: draftIdentity.name,
        code: draftIdentity.technicalCode,
        company_id: activeEntity.id,
        active: false,
        show_on_dashboard: false,
        kanban_dashboard: JSON.stringify({
          somane_draft: true,
          formData: duplicatedFormData,
          activeTab,
          showTraceabilityPanel,
          duplicatedFrom: currentJournalId || null,
          savedAt: new Date().toISOString(),
        }),
      };
      const response = await apiClient.post('/compta/journals/', apiData);
      const duplicatedJournal = response?.data || response || {};

      if (!duplicatedJournal?.id) {
        throw new Error('Le journal dupliqué ne possède aucun identifiant.');
      }

      setHasUnsavedChanges(false);
      navigate(`/comptabilite/journaux/${duplicatedJournal.id}`, {
        state: {
          returnTo: `${location.pathname}${location.search || ''}`,
        },
      });
    } catch (err) {
      setError(formatApiErrorMessage(err, 'Erreur lors de la duplication du journal'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!currentJournalId) {
      setError('Enregistrez le journal avant de le supprimer.');
      return;
    }
    if (!window.confirm('Supprimer définitivement ce journal ?')) return;
    try {
      await apiClient.delete(`/compta/journals/${currentJournalId}/`);
      setSuccess('Journal supprime.');
      setShowActionsMenu(false);
      navigate('/comptabilite/journaux');
    } catch (err) {
      setError(err?.data?.detail || err?.response?.data?.detail || err?.message || 'Erreur lors de la suppression');
    }
  };

  const showBankSpecific = usesBankConfiguration();
  const showCashSpecific = isCashType();
  const showPaymentMethods = showBankSpecific || showCashSpecific;
  const journalTabs = showPaymentMethods
    ? ['comptable', 'paiement', 'avance', 'notes']
    : ['comptable', 'avance', 'notes'];
  const visibleActiveTab = activeTab === 'paiement' && !showPaymentMethods
    ? 'comptable'
    : activeTab;
  const typeInformationMessage = showBankSpecific
    ? `Journal de type ${getSelectedJournalTypeName()} - Les informations bancaires et le compte de trésorerie sont obligatoires.`
    : showCashSpecific
      ? "Journal de type Caisse - Seul le compte de trésorerie est obligatoire. Les comptes d'attente, de profit et de perte sont facultatifs."
      : formData.type_id
        ? 'Le compte par défaut est optionnel pour ce type de journal.'
        : '';
  const visibleTypeInformationMessage =
    !isShowMode && typeInformationMessage && dismissedTypeInformation !== typeInformationMessage
      ? typeInformationMessage
      : '';
  const feedbackMessage = error || success || visibleTypeInformationMessage;

  const closeFeedbackMessage = () => {
    if (error) {
      setError(null);
      return;
    }
    if (success) {
      setSuccess(null);
      return;
    }
    if (visibleTypeInformationMessage) {
      setDismissedTypeInformation(typeInformationMessage);
    }
  };

  useEffect(() => {
    if (!feedbackMessage) return undefined;

    const timer = window.setTimeout(() => {
      if (error) {
        setError(null);
      } else if (success) {
        setSuccess(null);
      } else if (visibleTypeInformationMessage) {
        setDismissedTypeInformation(typeInformationMessage);
      }
    }, 30000);

    return () => window.clearTimeout(timer);
  }, [error, success, visibleTypeInformationMessage, typeInformationMessage, feedbackMessage]);

  if (!activeEntity) {
    return (
      <div
        className="flex min-h-0 flex-col overflow-hidden bg-gray-50"
        style={{ height: 'calc(100% + 16px)', marginTop: '-16px' }}
      >
        <div className="flex min-h-0 w-full flex-1 flex-col overflow-hidden border border-gray-300 bg-white">
          <div className="border-b border-gray-300 px-4 py-3">
            <div className="text-lg font-bold text-gray-900">Journal</div>
          </div>
          <div className="p-8">
            <div className="bg-yellow-50 border border-yellow-200 rounded p-6 text-center">
              <FiAlertCircle className="text-yellow-600 mx-auto mb-3" size={32} />
              <p className="text-yellow-800 font-medium text-lg mb-3">Aucune entité sélectionnée</p>
              <p className="text-sm text-gray-600 mb-4">
                Vous devez selectionner une entite pour consulter ce journal.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const requiredFields = getRequiredFields();
  const isFieldRequired = (fieldName) => requiredFields.includes(fieldName);
  const isJournalComplete = validateForm(true);
  const saveButtonLabel = 'Enregistrer';
  const exitSaveButtonLabel = isJournalComplete ? 'Enregistrer' : 'Enregistrer comme brouillon';
  const storedDraftName = journalRecord?.active === false
    && DRAFT_JOURNAL_NAME_PATTERN.test(String(journalRecord?.name || '').trim())
    ? journalRecord.name
    : '';
  const journalDisplayName = storedDraftName || formData.name?.trim() || 'Brouillon';

  const accountingEntriesState = {
    journal_id: currentJournalId || createdJournalId || journalRecord?.id || '',
    journal_code: formData.code || '',
    journal_name: formData.name || '',
  };

  const actionsMenu = (
    <div className="relative" ref={actionsMenuRef}>
      <Tooltip text="Menu des actions">
        <button
          type="button"
          onClick={() => setShowActionsMenu(previous => !previous)}
          className="flex h-8 items-center gap-1 border border-gray-300 px-3 text-xs text-gray-700 transition-all duration-200 hover:scale-105 hover:bg-gray-50 hover:shadow-md active:scale-95"
        >
          <FiSettings size={12} />
          <span>Actions</span>
        </button>
      </Tooltip>
      {showActionsMenu && (
        <div className="absolute right-0 z-50 mt-1 w-48 border border-gray-300 bg-white shadow-lg">
          <button onClick={handleDuplicate} className="flex w-full items-center gap-2 border-b border-gray-100 px-3 py-2 text-left text-xs transition-all duration-200 hover:bg-gray-50 hover:pl-4">
            <FiCopy size={12} /> Dupliquer
          </button>
          <button onClick={handleDelete} className="flex w-full items-center gap-2 border-b border-gray-100 px-3 py-2 text-left text-xs transition-all duration-200 hover:bg-gray-50 hover:pl-4">
            <FiTrash2 size={12} /> Supprimer
          </button>
          <button
            type="button"
            onClick={() => {
              setShowTraceabilityPanel(previous => !previous);
              setShowActionsMenu(false);
            }}
            className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs transition-all duration-200 hover:bg-gray-50 hover:pl-4"
          >
            <FiInfo size={12} />
            {showTraceabilityPanel ? 'Masquer la traçabilité' : 'Afficher la traçabilité'}
          </button>
        </div>
      )}
    </div>
  );

  const traceabilityContent = (
    <div className="px-4 py-3">
      <div className="mb-3 flex items-center justify-between">
        <span className="text-xs font-medium text-gray-700">Activité liée au journal</span>
        <span className="text-[11px] text-gray-500">{traceabilityLogs.length} événement(s)</span>
      </div>
      {traceabilityLoading ? (
        <div className="border border-gray-200 bg-white px-3 py-4 text-center text-xs text-gray-500">
          Chargement de la traçabilité...
        </div>
      ) : traceabilityLogs.length > 0 ? (
        <div className="space-y-2 pr-1">
          {traceabilityLogs.map(log => (
            <div key={log.id} className="border border-gray-200 bg-white px-3 py-2">
              <div className="flex items-center gap-2">
                <span className={log.source === 'journal'
                  ? 'inline-flex items-center rounded-full bg-purple-100 px-1.5 py-0.5 text-[10px] font-medium text-purple-700'
                  : 'inline-flex items-center rounded-full bg-blue-100 px-1.5 py-0.5 text-[10px] font-medium text-blue-700'
                }>
                  {log.source === 'journal' ? 'Journal' : 'Pièce'}
                </span>
                <div className="truncate text-xs font-medium text-gray-900">{log.action}</div>
              </div>
              {(log.objectLabel || log.description) && (
                <div className="mt-1 text-[11px] text-gray-500">
                  {[log.objectLabel, log.description].filter(Boolean).join(' - ')}
                </div>
              )}
              <div className="mt-2 flex items-center justify-between gap-2 text-[11px] text-gray-500">
                <span className="truncate">Par {log.user || 'Utilisateur'}</span>
                <span className="whitespace-nowrap">{log.date ? getTraceDate(log.date) : ''}</span>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="border border-gray-200 bg-white px-3 py-5 text-center">
          <FiClock className="mx-auto mb-2 h-7 w-7 text-gray-400" />
          <div className="text-xs text-gray-600">Aucune traçabilité trouvée</div>
          <div className="mt-1 text-[11px] text-gray-500">Les actions sur ce journal apparaîtront ici.</div>
        </div>
      )}
    </div>
  );

  return (
    <UnifiedFormPage
      title="Journal"
      recordLabel={journalDisplayName}
      pageLabel={isShowMode ? 'Détail du journal' : 'Création du journal'}
      mode={mode}
      fallbackPath="/comptabilite/journaux"
      primaryAction={{
        label: 'Nouveau',
        icon: <FiPlus size={12} />,
        path: '/comptabilite/journaux/create',
        state: { newJournal: Date.now() },
      }}
      headerActions={[
        {
          id: 'accounting-entries',
          label: 'Écritures comptables',
          icon: <FiBookOpen size={12} />,
          path: '/comptabilite/ecritures',
          state: accountingEntriesState,
        },
      ]}
      actionsMenu={actionsMenu}
      onSave={() => handleSave(false, { navigateAfterSave: false })}
      saveLabel={saveButtonLabel}
      saving={isSubmitting}
      autoReturnAfterSave
      buildReturnState={buildJournalReturnState}
      hasUnsavedChanges={hasUnsavedChanges}
      exitSaveLabel={exitSaveButtonLabel}
      rememberForm={false}
      feedback={feedbackMessage ? {
        type: error ? 'error' : success ? 'success' : 'info',
        message: feedbackMessage,
      } : null}
      onDismissFeedback={closeFeedbackMessage}
      messageDuration={30000}
      traceability={{
        open: showTraceabilityPanel,
        onOpen: () => setShowTraceabilityPanel(true),
        onClose: () => setShowTraceabilityPanel(false),
        title: 'Traçabilité',
        content: traceabilityContent,
      }}
    >
          <div className="min-w-0">
        <div className="border-b border-gray-300 px-4 py-3">
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center" style={{ height: '26px' }}>
              <RequiredLabel required={isFieldRequired('name')}>Nom</RequiredLabel>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => handleChange('name', e.target.value)}
                className="flex-1 px-2 py-1 border text-xs ml-2 hover:border-purple-400 focus:border-purple-600 transition-colors border-gray-300"
                style={{ height: '26px' }}
                placeholder="Journal des achats"
                maxLength="64"
              />
            </div>
            <div className="flex items-center" style={{ height: '26px' }}>
              <RequiredLabel required={isFieldRequired('code')}>Préfixe de la séquence</RequiredLabel>
              <input
                type="text"
                value={formData.code}
                onChange={(e) => handleChange('code', sanitizeJournalPrefix(e.target.value))}
                className="flex-1 px-2 py-1 border text-xs ml-2 hover:border-purple-400 focus:border-purple-600 transition-colors border-gray-300"
                style={{ height: '26px' }}
                placeholder="ACH"
                maxLength="8"
              />
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4 mt-2">
            <div className="flex items-center" style={{ height: '26px' }}>
              <RequiredLabel required={isFieldRequired('type_id')}>Type</RequiredLabel>
              <div className="flex-1 ml-2" style={{ height: '26px' }}>
                {journalTypesLoading ? (
                  <div className="h-[26px] px-2 border border-gray-300 bg-gray-50 text-xs flex items-center text-gray-500">
                    Chargement...
                  </div>
                ) : (
                  <JournalTypeSelect
                    value={formData.type_id}
                    onChange={handleTypeChange}
                    options={journalTypes}
                    placeholder="Type de journal"
                  />
                )}
              </div>
            </div>
            <div className="flex items-center" style={{ height: '26px' }}>
              <RequiredLabel required={false}>Société</RequiredLabel>
              <div className="flex-1 ml-2 px-2 py-1 bg-gray-100 border border-gray-300 text-xs text-gray-700 flex items-center gap-2" style={{ height: '26px' }}>
                <FiBriefcase size={12} className="text-purple-600" />
                {activeEntity?.raison_sociale || activeEntity?.nom || 'Non définie'}
              </div>
            </div>
          </div>
        </div>

        <div className="border-b border-gray-300">
          <div className="px-4 flex">
            {journalTabs.map(tab => (
              <button 
                key={tab} 
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-2 text-xs font-medium border-b-2 transition-all duration-200 ${
                  visibleActiveTab === tab 
                    ? 'border-purple-600 text-purple-600 hover:text-purple-800' 
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {tab === 'comptable' ? 'Paramètres comptables' : 
                 tab === 'avance' ? 'Paramètres avancés' :
                 tab === 'paiement' ? 'Modes de paiement' : 'Notes'}
              </button>
            ))}
          </div>
        </div>

        <div className="p-4">
          {visibleActiveTab === 'comptable' && (
            <div className="space-y-3">
              {formData.type_id ? (
                <>
                  {showBankSpecific && (
                    <div className="space-y-3">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="flex items-center" style={{ height: '26px' }}>
                          <RequiredLabel required={isFieldRequired('default_account_id')}>Compte de tresorerie</RequiredLabel>
                          <div className="flex-1 ml-2 border border-gray-300 hover:border-purple-400 transition-colors" style={{ height: '26px' }}>
                            <AutocompleteInput
                              value={formData.default_account_name}
                              selectedId={formData.default_account_id}
                              onChange={(text) => handleChange('default_account_name', text)}
                              onSelect={(id, label) => {
                                handleChange('default_account_id', id);
                                handleChange('default_account_name', label);
                              }}
                              options={accounts}
                              onOpen={ensureAccountsLoaded}
                              loading={accountsLoading}
                              getOptionLabel={(a) => a.code && a.name ? `${a.code} - ${a.name}` : (a.name || '')}
                              placeholder="Compte de tresorerie"
                              required={isFieldRequired('default_account_id')}
                              onCreateOption={(query) => navigateToContextCreate('account', query, { idField: 'default_account_id', nameField: 'default_account_name' })}
                              createOptionLabel="Créer le compte"
                            />
                          </div>
                        </div>
                        <div className="flex items-center" style={{ height: '26px' }}>
                          <RequiredLabel required={isFieldRequired('bank_id')}>Banque</RequiredLabel>
                          <div className="flex-1 ml-2 border border-gray-300 hover:border-purple-400 transition-colors" style={{ height: '26px' }}>
                            <AutocompleteInput
                              value={formData.bank_name}
                              selectedId={formData.bank_id}
                              onChange={(text) => handleChange('bank_name', text)}
                              onSelect={handleBankSelect}
                              options={banks}
                              getOptionLabel={getBankLabel}
                              placeholder="Selectionner une banque (obligatoire)"
                              required={isFieldRequired('bank_id')}
                              onCreateOption={(query) => navigateToContextCreate('bank', query, { idField: 'bank_id', nameField: 'bank_name' })}
                              createOptionLabel="Créer la banque"
                            />
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="flex items-center" style={{ height: '26px' }}>
                          <RequiredLabel required={isFieldRequired('suspense_account_id')}>Compte d'attente des transactions sur le relevé bancaire</RequiredLabel>
                          <div className="flex-1 ml-2 border border-gray-300 hover:border-purple-400 transition-colors" style={{ height: '26px' }}>
                            <AutocompleteInput
                              value={formData.suspense_account_name}
                              selectedId={formData.suspense_account_id}
                              onChange={(text) => handleChange('suspense_account_name', text)}
                              onSelect={(id, label) => {
                                handleChange('suspense_account_id', id);
                                handleChange('suspense_account_name', label);
                              }}
                              options={accounts}
                              onOpen={ensureAccountsLoaded}
                              loading={accountsLoading}
                              getOptionLabel={(a) => a.code && a.name ? `${a.code} - ${a.name}` : (a.name || '')}
                              placeholder="Compte d'attente des transactions sur le relevé bancaire"
                              required={isFieldRequired('suspense_account_id')}
                              onCreateOption={(query) => navigateToContextCreate('account', query, { idField: 'suspense_account_id', nameField: 'suspense_account_name' })}
                              createOptionLabel="Creer le compte"
                            />
                          </div>
                        </div>
                        <div className="flex items-center" style={{ height: '26px' }}>
                          <label className="w-40 flex-shrink-0 whitespace-nowrap text-[11px] font-medium text-gray-700">
                            Numéro de compte bancaire
                            {isFieldRequired('bank_acc_number') && <span className="ml-1 text-red-500">*</span>}
                          </label>
                          <input
                            type="text"
                            value={formData.bank_acc_number || ''}
                            onChange={(e) => handleChange('bank_acc_number', e.target.value)}
                            className="flex-1 ml-2 px-2 py-1 border text-xs hover:border-purple-400 focus:border-purple-600 transition-colors border-gray-300"
                            style={{ height: '26px' }}
                            placeholder="FR76 3000 4001 2300 0123 4567 89"
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="hidden" style={{ height: '26px' }}>
                          <RequiredLabel required={isFieldRequired('bank_id')}>Banque</RequiredLabel>
                          <div className="flex-1 ml-2 border border-gray-300 hover:border-purple-400 transition-colors" style={{ height: '26px' }}>
                            <AutocompleteInput
                              value={formData.bank_name}
                              selectedId={formData.bank_id}
                              onChange={(text) => handleChange('bank_name', text)}
                              onSelect={(id, label) => {
                                handleChange('bank_id', id);
                                handleChange('bank_name', label);
                              }}
                              options={banks}
                              getOptionLabel={getBankLabel}
                              placeholder="Sélectionner une banque (obligatoire)"
                              required={isFieldRequired('bank_id')}
                              onCreateOption={(query) => navigateToContextCreate('bank', query, { idField: 'bank_id', nameField: 'bank_name' })}
                              createOptionLabel="Créer la banque"
                            />
                          </div>
                        </div>
                        
                        <div className="flex items-center" style={{ height: '26px' }}>
                          <RequiredLabel required={false}>Source des relevés</RequiredLabel>
                          <div className="flex-1 ml-2 relative">
                            <select
                              value={formData.bank_statements_source || 'manual'}
                              onChange={(e) => handleChange('bank_statements_source', e.target.value)}
                              className="w-full px-2 py-1 border border-gray-300 text-xs hover:border-purple-400 focus:border-purple-600 transition-colors appearance-none"
                              style={{ height: '26px' }}
                            >
                              <option value="manual">Saisie manuelle</option>
                              <option value="file">Importer le relevé</option>
                              <option value="online">Synchronisation en ligne</option>
                              <option value="all">Tous</option>
                            </select>
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="flex items-center" style={{ height: '26px' }}>
                          <RequiredLabel required={false}>Contrepartie par ligne</RequiredLabel>
                          <div className="flex-1 ml-2 flex items-center">
                            <input
                              type="checkbox"
                              checked={formData.counterpart_per_line}
                              onChange={(e) => handleChange('counterpart_per_line', e.target.checked)}
                              className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded"
                            />
                            <span className="ml-2 text-xs text-gray-600">Creer une contrepartie pour chaque ligne</span>
                          </div>
                        </div>
                        <div className="flex items-center" style={{ height: '26px' }}>
                        </div>
                      </div>

                    </div>
                  )}

                  {showCashSpecific && (
                    <div className="space-y-3">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="flex items-center" style={{ height: '26px' }}>
                          <RequiredLabel required={isFieldRequired('default_account_id')}>Compte de tresorerie</RequiredLabel>
                          <div className="flex-1 ml-2 border border-gray-300 hover:border-purple-400 transition-colors" style={{ height: '26px' }}>
                            <AutocompleteInput
                              value={formData.default_account_name}
                              selectedId={formData.default_account_id}
                              onChange={(text) => handleChange('default_account_name', text)}
                              onSelect={(id, label) => {
                                handleChange('default_account_id', id);
                                handleChange('default_account_name', label);
                              }}
                              options={accounts}
                              onOpen={ensureAccountsLoaded}
                              loading={accountsLoading}
                              getOptionLabel={(a) => a.code && a.name ? `${a.code} - ${a.name}` : (a.name || '')}
                              placeholder="Compte de tresorerie"
                              required={isFieldRequired('default_account_id')}
                              onCreateOption={(query) => navigateToContextCreate('account', query, { idField: 'default_account_id', nameField: 'default_account_name' })}
                              createOptionLabel="Créer le compte"
                            />
                          </div>
                        </div>
                        
                        <div className="flex items-center" style={{ height: '26px' }}>
                          <RequiredLabel required={isFieldRequired('suspense_account_id')}>Compte d'attente</RequiredLabel>
                          <div className="flex-1 ml-2 border border-gray-300 hover:border-purple-400 transition-colors" style={{ height: '26px' }}>
                            <AutocompleteInput
                              value={formData.suspense_account_name}
                              selectedId={formData.suspense_account_id}
                              onChange={(text) => handleChange('suspense_account_name', text)}
                              onSelect={(id, label) => {
                                handleChange('suspense_account_id', id);
                                handleChange('suspense_account_name', label);
                              }}
                              options={accounts}
                              onOpen={ensureAccountsLoaded}
                              loading={accountsLoading}
                              getOptionLabel={(a) => a.code && a.name ? `${a.code} - ${a.name}` : (a.name || '')}
                              placeholder="Compte d'attente"
                              required={isFieldRequired('suspense_account_id')}
                              onCreateOption={(query) => navigateToContextCreate('account', query, { idField: 'suspense_account_id', nameField: 'suspense_account_name' })}
                              createOptionLabel="Créer le compte"
                            />
                          </div>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4">
                        <div className="flex items-center" style={{ height: '26px' }}>
                          <RequiredLabel required={isFieldRequired('profit_account_id')}>Compte de profit</RequiredLabel>
                          <div className="flex-1 ml-2 border border-gray-300 hover:border-purple-400 transition-colors" style={{ height: '26px' }}>
                            <AutocompleteInput
                              value={formData.profit_account_name}
                              selectedId={formData.profit_account_id}
                              onChange={(text) => handleChange('profit_account_name', text)}
                              onSelect={(id, label) => {
                                handleChange('profit_account_id', id);
                                handleChange('profit_account_name', label);
                              }}
                              options={accounts}
                              onOpen={ensureAccountsLoaded}
                              loading={accountsLoading}
                              getOptionLabel={(a) => a.code && a.name ? `${a.code} - ${a.name}` : (a.name || '')}
                              placeholder="Compte de profit"
                              required={isFieldRequired('profit_account_id')}
                              onCreateOption={(query) => navigateToContextCreate('account', query, { idField: 'profit_account_id', nameField: 'profit_account_name' })}
                              createOptionLabel="Créer le compte"
                            />
                          </div>
                        </div>
                        <div className="flex items-center" style={{ height: '26px' }}>
                          <RequiredLabel required={isFieldRequired('loss_account_id')}>Compte de perte</RequiredLabel>
                          <div className="flex-1 ml-2 border border-gray-300 hover:border-purple-400 transition-colors" style={{ height: '26px' }}>
                            <AutocompleteInput
                              value={formData.loss_account_name}
                              selectedId={formData.loss_account_id}
                              onChange={(text) => handleChange('loss_account_name', text)}
                              onSelect={(id, label) => {
                                handleChange('loss_account_id', id);
                                handleChange('loss_account_name', label);
                              }}
                              options={accounts}
                              onOpen={ensureAccountsLoaded}
                              loading={accountsLoading}
                              getOptionLabel={(a) => a.code && a.name ? `${a.code} - ${a.name}` : (a.name || '')}
                              placeholder="Compte de perte"
                              required={isFieldRequired('loss_account_id')}
                              onCreateOption={(query) => navigateToContextCreate('account', query, { idField: 'loss_account_id', nameField: 'loss_account_name' })}
                              createOptionLabel="Créer le compte"
                            />
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="flex items-center" style={{ height: '26px' }}>
                          <RequiredLabel required={false}>Contrepartie par ligne</RequiredLabel>
                          <div className="flex-1 ml-2 flex items-center">
                            <input
                              type="checkbox"
                              checked={formData.counterpart_per_line}
                              onChange={(e) => handleChange('counterpart_per_line', e.target.checked)}
                              className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded"
                            />
                            <span className="ml-2 text-xs text-gray-600">Creer une contrepartie pour chaque ligne</span>
                          </div>
                        </div>
                        <div className="flex items-center" style={{ height: '26px' }}>
                        </div>
                      </div>

                    </div>
                  )}

                  {!showBankSpecific && !showCashSpecific && (
                    <div className="space-y-3">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="flex items-center" style={{ height: '26px' }}>
                          <RequiredLabel required={false}>Compte par defaut</RequiredLabel>
                          <div className="flex-1 ml-2 border border-gray-300 hover:border-purple-400 transition-colors" style={{ height: '26px' }}>
                            <AutocompleteInput
                              value={formData.default_account_name}
                              selectedId={formData.default_account_id}
                              onChange={(text) => handleChange('default_account_name', text)}
                              onSelect={(id, label) => {
                                handleChange('default_account_id', id);
                                handleChange('default_account_name', label);
                              }}
                              options={accounts}
                              onOpen={ensureAccountsLoaded}
                              loading={accountsLoading}
                              getOptionLabel={(a) => a.code && a.name ? `${a.code} - ${a.name}` : (a.name || '')}
                              placeholder="Compte par defaut (optionnel)"
                              onCreateOption={(query) => navigateToContextCreate('account', query, { idField: 'default_account_id', nameField: 'default_account_name' })}
                              createOptionLabel="Créer le compte"
                            />
                          </div>
                        </div>
                        
                        <div className="flex items-center" style={{ height: '26px' }}>
                        </div>
                      </div>

                    </div>
                  )}
                </>
              ) : (
                <div className="text-xs text-gray-400 italic">
                  Sélectionnez un type pour voir les champs correspondants.
                </div>
              )}
            </div>
          )}

          {visibleActiveTab === 'avance' && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center" style={{ height: '26px' }}>
                  <RequiredLabel required={false}>Activer/Désactiver</RequiredLabel>
                  <div className="ml-2 flex flex-1 items-center gap-2">
                    <Tooltip text={formData.active ? "Désactiver le journal" : "Activer le journal"}>
                      <button
                        type="button"
                        onClick={() => handleChange('active', !formData.active)}
                        className={`
                          relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent
                          transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2
                          ${formData.active ? 'bg-purple-600' : 'bg-gray-200'}
                        `}
                        role="switch"
                        aria-checked={formData.active}
                      >
                        <span
                          aria-hidden="true"
                          className={`
                            pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0
                            transition duration-200 ease-in-out
                            ${formData.active ? 'translate-x-5' : 'translate-x-0'}
                          `}
                        />
                      </button>
                    </Tooltip>
                    <span className={`text-xs font-medium ${formData.active ? 'text-green-700' : 'text-gray-500'}`}>
                      {formData.active ? 'Actif' : 'Inactif'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center" style={{ height: '26px' }}>
                  <RequiredLabel required={false}>E-mail</RequiredLabel>
                  <div className="flex-1 ml-2 relative">
                    <FiMail className="absolute left-2 top-1.5 text-gray-400" size={12} />
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => handleChange('email', e.target.value)}
                      className="w-full pl-7 pr-2 py-1 border border-gray-300 text-xs hover:border-purple-400 focus:border-purple-600 transition-colors"
                      style={{ height: '26px' }}
                      placeholder="email@exemple.com (optionnel)"
                    />
                  </div>
                </div>
              </div>

            </div>
          )}

          {showPaymentMethods && visibleActiveTab === 'paiement' && (
            <div>
              <div className="mb-3 overflow-x-auto border border-gray-300">
                <table className="w-full border-collapse text-xs">
                  <thead>
                    <tr className="bg-gray-100">
                      <th className="border border-gray-300 px-2 py-1.5 text-left text-xs font-medium text-gray-700" style={{ minWidth: '150px' }}>Type de paiement</th>
                      <th className="border border-gray-300 px-2 py-1.5 text-left text-xs font-medium text-gray-700" style={{ minWidth: '180px' }}>Mode de paiement</th>
                      <th className="border border-gray-300 px-2 py-1.5 text-left text-xs font-medium text-gray-700" style={{ minWidth: '220px' }}>Compte de paiement en suspens</th>
                    </tr>
                  </thead>
                  <tbody ref={paymentMethodsTableRef}>
                    {(formData.payment_method_rows || []).length === 0 ? (
                      <tr>
                        <td colSpan="3" className="border border-gray-300 px-3 py-5 text-center text-xs italic text-gray-400">
                          Aucune ligne de mode de paiement
                        </td>
                      </tr>
                    ) : (
                      (formData.payment_method_rows || []).map((row, rowIndex, rows) => {
                        const availableMethods = row.payment_type === 'inbound'
                          ? inboundPaymentMethods
                          : row.payment_type === 'outbound'
                            ? outboundPaymentMethods
                            : [];
                        const selectedMethod = paymentMethods.find(
                          method => String(method.id) === String(row.payment_method_id || '')
                        );
                        const suspenseAccountLabel = row.payment_type
                          ? getPaymentSuspenseAccountLabel(selectedMethod, row.payment_type)
                          : 'Choisissez d’abord le type de paiement';

                        return (
                          <tr key={row.id} data-payment-method-row className="hover:bg-gray-50">
                            <td className="border border-gray-300 p-1" style={{ minWidth: '150px' }}>
                              <JournalTypeSelect
                                value={row.payment_type}
                                onChange={(id) => updatePaymentMethodRow(row.id, 'payment_type', id || '')}
                                options={PAYMENT_TYPE_OPTIONS}
                                placeholder="Sélectionner le type"
                                onTab={() => focusPaymentMethodInput(rowIndex, 1)}
                                embedded
                              />
                            </td>
                            <td className="border border-gray-300 p-1" style={{ minWidth: '180px' }}>
                              <JournalTypeSelect
                                value={row.payment_method_id}
                                onChange={(id) => updatePaymentMethodRow(row.id, 'payment_method_id', id || '')}
                                options={availableMethods}
                                placeholder="Sélectionner un mode"
                                disabled={!row.payment_type}
                                onTab={() => {
                                  if (rowIndex < rows.length - 1) {
                                    focusPaymentMethodInput(rowIndex + 1, 0);
                                  } else {
                                    addPaymentMethodRow(true);
                                  }
                                }}
                                embedded
                              />
                            </td>
                            <td className="border border-gray-300 p-1" style={{ minWidth: '220px' }}>
                              <div className="flex h-[26px] items-center justify-between gap-2 px-2">
                                <span
                                  className={`min-w-0 flex-1 truncate ${selectedMethod ? 'text-gray-700' : 'text-gray-400'}`}
                                  title={suspenseAccountLabel}
                                >
                                  {suspenseAccountLabel}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => removePaymentMethodRow(row.id)}
                                  className="flex h-6 w-6 flex-shrink-0 items-center justify-center text-gray-400 transition-colors hover:text-red-600"
                                  title="Supprimer la ligne"
                                >
                                  <FiTrash2 size={13} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              <Tooltip text="Ajouter une ligne de mode de paiement">
                <button
                  type="button"
                  onClick={() => addPaymentMethodRow(false)}
                  className="flex h-8 items-center gap-1 bg-purple-600 px-3 text-xs text-white transition-colors hover:bg-purple-700"
                >
                  <FiPlus size={12} />
                  <span>Ajouter une ligne</span>
                </button>
              </Tooltip>
            </div>
          )}

          {visibleActiveTab === 'notes' && (
            <div className="border border-gray-300 hover:border-purple-400 transition-colors">
              <textarea
                value={formData.note}
                onChange={(e) => handleChange('note', e.target.value)}
                rows={8}
                className="w-full px-3 py-2 border-0 text-xs focus:ring-2 focus:ring-purple-500"
                placeholder="Ajouter des notes… (optionnel)"
              />
            </div>
          )}

        </div>

          </div>
    </UnifiedFormPage>
  );
}
