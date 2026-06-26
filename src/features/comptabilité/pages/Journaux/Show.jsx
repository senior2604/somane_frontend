// C:\Users\IBM\Documents\somane_frontend\src\features\comptabilité\pages\Journaux\Create.jsx

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  FiPlus,
  FiEdit, 
  FiTrash2, 
  FiX,
  FiBriefcase,
  FiMail,
  FiCreditCard,
  FiDollarSign,
  FiInfo,
  FiAlertCircle,
  FiCheck,
  FiUploadCloud,
  FiCopy,
  FiRotateCcw,
  FiSettings,
  FiClock,
  FiSave,
  FiHome
} from "react-icons/fi";
import { useNavigate, useParams } from 'react-router-dom';
import { apiClient } from '../../../../services/apiClient';
import { useEntity } from '../../../../context/EntityContext';

// ==========================================
// COMPOSANT TOOLTIP
// ==========================================
const Tooltip = ({ children, text, position = 'top' }) => {
  const [show, setShow] = useState(false);
  
  return (
    <div className="relative inline-block">
      <div
        onMouseEnter={() => setShow(true)}
        onMouseLeave={() => setShow(false)}
      >
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
  required = false
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

  const filteredOptions = options.filter(option => {
    const label = getOptionLabel(option).toLowerCase();
    const search = inputValue.toLowerCase();
    return label.includes(search);
  });

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

  const handleKeyDown = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setIsOpen(true);
      setHighlightedIndex(prev =>
        prev < filteredOptions.length - 1 ? prev + 1 : prev
      );
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex(prev => prev > 0 ? prev - 1 : 0);
    } else if (e.key === 'Enter' && isOpen && filteredOptions.length > 0) {
      e.preventDefault();
      handleSelectOption(filteredOptions[highlightedIndex]);
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
      {isOpen && filteredOptions.length > 0 && (
        <div
          ref={dropdownRef}
          className="bg-white border border-gray-300 shadow-lg"
          style={dropdownStyle}
        >
          {filteredOptions.map((option, index) => (
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
  required = false
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const containerRef = useRef(null);
  const inputRef = useRef(null);

  const selectedOption = options.find(opt => opt.id === value);
  
  const filteredOptions = options.filter(option => {
    const label = `${option.code} ${option.name}`.toLowerCase();
    return label.includes(searchTerm.toLowerCase());
  });

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
        setSearchTerm('');
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div ref={containerRef} className="relative w-full">
      <div
        onClick={() => !disabled && setIsOpen(!isOpen)}
        className={`w-full h-[26px] px-2 border border-gray-300 text-xs flex items-center justify-between cursor-pointer hover:border-purple-400 bg-white ${disabled ? 'bg-gray-100 cursor-not-allowed' : ''}`}
      >
        <span className={selectedOption ? 'text-gray-900 truncate pr-1' : 'text-gray-400 truncate pr-1'}>
          {selectedOption ? `${selectedOption.code} - ${selectedOption.name}` : placeholder}
        </span>
        <svg className="w-3 h-3 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </div>

      {isOpen && !disabled && (
        <div className="absolute z-50 mt-1 w-full bg-white border border-gray-300 shadow-lg">
          <div className="p-1 border-b">
            <input
              ref={inputRef}
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-2 py-1 text-xs border border-gray-300 focus:ring-1 focus:ring-purple-500"
              style={{ height: '26px' }}
              placeholder="Rechercher..."
              autoFocus
            />
          </div>
          
          <div className="max-h-48 overflow-y-auto">
            {filteredOptions.length > 0 ? (
              filteredOptions.map((option) => (
                <div
                  key={option.id}
                  className={`px-2 py-1.5 text-xs cursor-pointer hover:bg-purple-50 ${
                    option.id === value ? 'bg-purple-100' : ''
                  }`}
                  onClick={() => {
                    onChange(option.id);
                    setIsOpen(false);
                    setSearchTerm('');
                  }}
                >
                  <span className="font-medium">{option.code}</span> - {option.name}
                </div>
              ))
            ) : (
              <div className="px-2 py-2 text-xs text-gray-500 text-center">
                Aucun type trouvé
              </div>
            )}
          </div>
        </div>
      )}
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
const getSequenceLabel = (sequence) => {
  if (!sequence) return '';
  const prefix = sequence.prefix || '';
  const suffix = sequence.suffix || '';
  return `${prefix}...${suffix} (${sequence.current_number || 0})`;
};

// ==========================================
// FORMATAGE LIBELLÉ BANQUE (core.Banque)
// ==========================================
const getBankLabel = (bank) => {
  if (!bank) return '';
  return bank.nom || bank.name || 'Banque sans nom';
};

const normalizeText = (value) =>
  String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();

const getAccountDescriptor = (account) => {
  if (!account) return '';
  const type = account.type || account.account_type || account.nature || {};
  const group = account.group || account.internal_group || type.internal_group || {};
  return normalizeText([
    account.name,
    account.label,
    account.note,
    account.internal_type,
    account.kind,
    account.category,
    account.account_kind,
    account.functional_type,
    type.code,
    type.name,
    type.internal_type,
    type.kind,
    type.category,
    group.code,
    group.name,
  ].filter(Boolean).join(' '));
};

const accountMatchesRole = (account, keywords) => {
  const descriptor = getAccountDescriptor(account);
  return keywords.some(keyword => descriptor.includes(keyword));
};

const isTreasuryAccount = (account) =>
  accountMatchesRole(account, [
    'tresorerie',
    'liquidite',
    'liquidity',
    'cash',
    'caisse',
    'banque',
    'bank',
    'compte bancaire',
  ]);

const isSuspenseAccount = (account) =>
  accountMatchesRole(account, [
    'attente',
    'suspens',
    'suspense',
    'clearing',
    'transitoire',
  ]);

const isProfitAccount = (account) =>
  accountMatchesRole(account, [
    'profit',
    'gain',
    'produit',
    'income',
    'revenu',
  ]);

const isLossAccount = (account) =>
  accountMatchesRole(account, [
    'perte',
    'loss',
    'charge',
    'expense',
  ]);

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

// ==========================================
// COMPOSANT D'ÉTIQUETTE AVEC ASTÉRISQUE
// ==========================================
const RequiredLabel = ({ children, required }) => (
  <label className="text-xs text-gray-700 w-40 font-medium">
    {children}
    {required && <span className="text-red-500 ml-1">*</span>}
  </label>
);

// ==========================================
// COMPOSANT PRINCIPAL
// ==========================================
export default function JournauxShow() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { activeEntity } = useEntity();

  const [loading, setLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [showActionsMenu, setShowActionsMenu] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [activeTab, setActiveTab] = useState('comptable');
  const [isAutoSaving, setIsAutoSaving] = useState(false);
  const [initialFormData, setInitialFormData] = useState(null);
  const [traceabilityLogs, setTraceabilityLogs] = useState([]);
  const [traceabilityLoading, setTraceabilityLoading] = useState(false);
  const [showTraceabilityPanel, setShowTraceabilityPanel] = useState(true);
  const [journalRecord, setJournalRecord] = useState(null);
  
  const [accounts, setAccounts] = useState([]);
  const [journalTypes, setJournalTypes] = useState([]);
  const [bankAccounts, setBankAccounts] = useState([]);
  const [banks, setBanks] = useState([]);
  const [paymentMethods, setPaymentMethods] = useState([]);
  const [sequences, setSequences] = useState([]);
  
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
    note: '',
    active: true,
    use_refund_sequence: false,
    sequence_id: '',
    sequence_name: '',
    refund_sequence_id: '',
    refund_sequence_name: '',
    import_bank_statements: false,
    counterpart_per_line: false
  });

  const actionsMenuRef = useRef(null);

  const getAccountById = useCallback((id) => {
    if (!id) return null;
    return accounts.find(account => String(account.id) === String(id)) || null;
  }, [accounts]);

  const filterAccountsByRole = useCallback((predicate) => {
    const filtered = accounts.filter(predicate);
    return filtered.length ? filtered : accounts;
  }, [accounts]);

  const treasuryAccounts = filterAccountsByRole(isTreasuryAccount);
  const suspenseAccounts = filterAccountsByRole(isSuspenseAccount);
  const profitAccounts = filterAccountsByRole(isProfitAccount);
  const lossAccounts = filterAccountsByRole(isLossAccount);
  const filteredBankAccounts = formData.bank_id
    ? bankAccounts.filter(item => {
        const linkedBank = getBankFromBankAccount(item);
        return String(linkedBank?.id || item.banque || item.banque_id || '') === String(formData.bank_id);
      })
    : bankAccounts;

  const hasSelectedOption = (id, name) => Boolean(id) || !String(name || '').trim();

  const validateSelectedAccountRole = (fieldId, label, predicate, silent) => {
    const selected = getAccountById(formData[fieldId]);
    if (!selected) return true;
    if (predicate(selected)) return true;
    if (!silent) {
      setError(`${label} : le compte choisi n'a pas la nature attendue.`);
    }
    return false;
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

  const normalizeTraceabilityItem = (log, index, source = 'journal') => {
    const userObj = log.user_detail || log.user || log.author || log.create_uid || log.created_by || {};
    const userName = log.created_by_name || log.createdByName || log.user_name || log.author_name || getUserLabel(userObj);
    return {
      id: log.id || `${source}-${log.created_at || log.date || index}`,
      source,
      action: log.action || log.event || log.type || 'Action',
      description: log.description || log.message || log.body || log.note || '',
      date: log.created_at || log.createdAt || log.date || log.timestamp || log.create_date || '',
      user: userName,
      objectLabel: log.object_label || log.objectLabel || log.move_name || log.name || '',
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

    return {
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
      payment_method_in: (record?.inbound_payment_methods || record?.inbound_payment_method_ids || []).map(String),
      payment_method_out: (record?.outbound_payment_methods || record?.outbound_payment_method_ids || []).map(String),
      note: record?.note || '',
      active: record?.active !== undefined ? Boolean(record.active) : true,
      use_refund_sequence: Boolean(record?.use_refund_sequence || record?.refund_sequence),
      sequence_id: getRecordId(record, 'sequence', 'sequence_id'),
      sequence_name: record?.sequence_name || getSequenceLabel(record?.sequence) || '',
      refund_sequence_id: getRecordId(record, 'refund_sequence', 'refund_sequence_id'),
      refund_sequence_name: record?.refund_sequence_name || getSequenceLabel(record?.refund_sequence) || '',
      import_bank_statements: Boolean(record?.import_bank_statements),
      counterpart_per_line: Boolean(record?.counterpart_per_line),
    };
  };

  const loadJournal = async () => {
    if (!id) return;
    try {
      const response = await apiClient.get(`/compta/journals/${id}/`);
      const data = response?.data || response;
      const normalized = normalizeJournalForForm(data);
      setJournalRecord(data);
      setFormData(normalized);
      setInitialFormData(normalized);
      setHasUnsavedChanges(false);
      return data;
    } catch (err) {
      console.error('Erreur chargement journal:', err);
      setError(err?.data?.detail || err?.response?.data?.detail || err?.message || 'Erreur de chargement du journal');
      return null;
    }
  };

  const loadJournalTraceability = async (recordOverride = null) => {
    if (!id || !activeEntity) return;
    setTraceabilityLoading(true);
    try {
      const sourceRecord = recordOverride || journalRecord;
      const [journalLogsResponse, movesResponse] = await Promise.allSettled([
        apiClient.get('/compta/module-traceability/', {
          params: {
            company: activeEntity.id,
            model_name: 'AccountJournal',
            object_id: id,
          },
        }),
        apiClient.get('/compta/moves/', {
          params: {
            company: activeEntity.id,
            journal: id,
            ordering: '-create_date',
          },
        }),
      ]);

      const journalLogs = journalLogsResponse.status === 'fulfilled'
        ? normalizeApiResponse(journalLogsResponse.value).map((log, index) => normalizeTraceabilityItem(log, index, 'journal'))
        : [];
      const hasCreationLog = journalLogs.some(log => {
        const action = normalizeText(log.action);
        return action.includes('creation') || action.includes('cree');
      });
      const syntheticJournalLogs = [];
      if (sourceRecord && !hasCreationLog && (sourceRecord.created_at || sourceRecord.create_date || sourceRecord.created_by)) {
        syntheticJournalLogs.push({
          id: `journal-created-${id}`,
          source: 'journal',
          action: 'Création du journal',
          description: `${sourceRecord.code || formData.code || ''} - ${sourceRecord.name || formData.name || ''}`.trim().replace(/^-|-$/g, '').trim(),
          date: sourceRecord.created_at || sourceRecord.create_date || '',
          user: getUserLabel(sourceRecord.created_by_name || sourceRecord.created_by || sourceRecord.create_uid, 'Utilisateur'),
          objectLabel: sourceRecord.name || formData.name || '',
        });
      }
      const moves = movesResponse.status === 'fulfilled'
        ? normalizeApiResponse(movesResponse.value)
        : [];
      const moveLogs = moves.flatMap(buildMoveActivityLogs);
      const mergedLogs = [...journalLogs, ...syntheticJournalLogs, ...moveLogs].sort((a, b) => {
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
      const boot = async () => {
        await loadOptions();
        const journalData = await loadJournal();
        await loadJournalTraceability(journalData);
      };
      boot();
    }
  }, [activeEntity, id]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (actionsMenuRef.current && !actionsMenuRef.current.contains(e.target)) {
        setShowActionsMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const loadOptions = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const typesResponse = await apiClient.get('/compta/journal-types/');
      const typesData = normalizeApiResponse(typesResponse);
      setJournalTypes(typesData);
      
      try {
        const accountsResponse = await apiClient.get('/compta/accounts/', {
          params: { company: activeEntity.id, exclude_roots: true }
        });
        const accountsData = normalizeApiResponse(accountsResponse);
        setAccounts(filterOperationalAccounts(accountsData));
      } catch (err) {
        console.warn('⚠️ Comptes non disponibles:', err.message);
      }
      
      try {
        const bankData = await fetchFirstAvailable([
          '/banques-partenaires/',
          '/api/banques-partenaires/',
        ]);
        setBankAccounts(bankData);
        const derivedBanks = bankData.map(getBankFromBankAccount).filter(Boolean);
        setBanks(prev => mergeBanks(prev, derivedBanks));
      } catch (err) {
        console.log('ℹ️ Banques partenaires non disponibles');
      }
      
      try {
        const banksData = await fetchFirstAvailable([
          '/banques/',
          '/api/banques/',
        ]);
        setBanks(prev => mergeBanks(banksData, prev));
      } catch (err) {
        console.log('ℹ️ Banques non disponibles');
      }
      
      try {
        const paymentResponse = await apiClient.get('/compta/payment-methods/');
        const paymentData = normalizeApiResponse(paymentResponse);
        setPaymentMethods(paymentData);
      } catch (err) {
        console.log('ℹ️ Méthodes de paiement non disponibles');
        setPaymentMethods([]);
      }
      
      try {
            const sequencesResponse = await apiClient.get('/sequences/');
            const sequencesData = normalizeApiResponse(sequencesResponse);
            const filteredSequences = sequencesData.filter(s => 
            !s.company || s.company === activeEntity?.id
           );
      setSequences(filteredSequences);
                  console.log(' Séquences chargées:', filteredSequences); 
} catch (err) {
  console.log('ℹ️ Séquences non disponibles', err); 
  setSequences([]);
}
      
    } catch (err) {
      console.error(' Erreur critique:', err);
      setError(`Erreur de chargement: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const handleBeforeUnload = () => {
      if (hasUnsavedChanges) {
        saveAutoDraft();
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasUnsavedChanges]);

  const saveAutoDraft = useCallback(async () => {
    if (!hasUnsavedChanges || isAutoSaving || !activeEntity || !id) return;
    setIsAutoSaving(true);
    try {
      const apiData = prepareDataForApi();
      await apiClient.patch(`/compta/journals/${id}/`, apiData);
      setHasUnsavedChanges(false);
    } catch (err) {
      console.error(' Erreur sauvegarde automatique:', err);
    } finally {
      setIsAutoSaving(false);
    }
  }, [hasUnsavedChanges, isAutoSaving, activeEntity]);

  const markAsModified = () => {
    if (!hasUnsavedChanges) setHasUnsavedChanges(true);
  };

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    markAsModified();
  };

  const handleBankAccountSelect = (id, label) => {
    const selectedBankAccount = bankAccounts.find(item => String(item.id) === String(id));
    const linkedBank = getBankFromBankAccount(selectedBankAccount);
    const accountNumber = getBankAccountNumber(selectedBankAccount);

    setFormData(prev => ({
      ...prev,
      bank_account_id: id || '',
      bank_account_name: label || '',
      bank_acc_number: accountNumber || prev.bank_acc_number || '',
      bank_id: linkedBank?.id || prev.bank_id || '',
      bank_name: linkedBank ? getBankLabel(linkedBank) : prev.bank_name || '',
    }));
    markAsModified();
  };

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
      suspense_account_out_name: ''
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

    if (isBankType()) {
      if (!formData.default_account_id) {
        if (!silent) setError('Le compte de tresorerie est obligatoire pour un journal de type Banque');
        return false;
      }
      if (!validateSelectedAccountRole('default_account_id', 'Compte de tresorerie', isTreasuryAccount, silent)) {
        return false;
      }
      if (!formData.bank_account_id) {
        if (!silent) setError('Le compte bancaire lié est obligatoire pour un journal de type Banque');
        return false;
      }
      if (!formData.bank_acc_number) {
        if (!silent) setError('Le numéro de compte (IBAN/RIB) est obligatoire pour un journal de type Banque');
        return false;
      }
      if (!formData.bank_id) {
        if (!silent) setError('La banque est obligatoire pour un journal de type Banque');
        return false;
      }
    } else if (isCashType()) {
      if (!formData.default_account_id) {
        if (!silent) setError('Le compte de tresorerie est obligatoire pour un journal de type Caisse');
        return false;
      }
      if (!validateSelectedAccountRole('default_account_id', 'Compte de tresorerie', isTreasuryAccount, silent)) {
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

    if (formData.profit_account_id && !validateSelectedAccountRole('profit_account_id', 'Compte de profit', isProfitAccount, silent)) {
      return false;
    }
    if (formData.loss_account_id && !validateSelectedAccountRole('loss_account_id', 'Compte de perte', isLossAccount, silent)) {
      return false;
    }

    return true;
  };

  const getRequiredFields = () => {
    if (!formData.type_id) return ['name', 'code', 'type_id'];
    
    if (isBankType()) {
      return ['name', 'code', 'type_id', 'default_account_id', 'bank_account_id', 'bank_acc_number', 'bank_id'];
    } else if (isCashType()) {
      return ['name', 'code', 'type_id', 'default_account_id'];
    } else {
      return ['name', 'code', 'type_id'];
    }
  };

  const prepareDataForApi = useCallback(() => {
    const apiData = {
      name: formData.name,
      code: formData.code.toUpperCase().slice(0, 8),
      type_id: formData.type_id || null,
      company_id: activeEntity?.id || null,
      default_account_id: formData.default_account_id || null,
      profit_account_id: formData.profit_account_id || null,
      loss_account_id: formData.loss_account_id || null,
      suspense_account_id: formData.suspense_account_id || null,
      bank_account_id: formData.bank_account_id || null,
      bank_acc_number: formData.bank_acc_number || null,
      bank_id: formData.bank_id || null,
      bank_statements_source: formData.bank_statements_source || 'manual',
      email: formData.email || null,
      note: formData.note || '',
      active: formData.active,
      use_refund_sequence: formData.use_refund_sequence || false,
      sequence_id: formData.sequence_id || null,
      refund_sequence_id: formData.refund_sequence_id || null,
      import_bank_statements: formData.import_bank_statements || false,
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

  // ==========================================
  // SAUVEGARDE - VERSION CORRIGÉE
  // ==========================================
const handleSave = async (silent = false) => {
  if (!validateForm(silent)) {
    return false;
  }

  setIsSubmitting(true);
  if (!silent) setError(null);

  try {
    const apiData = prepareDataForApi();
    await apiClient.patch(`/compta/journals/${id}/`, apiData);
    
    if (!silent) {
      setSuccess('Journal mis a jour avec succes !');
    }
    setHasUnsavedChanges(false);
    setInitialFormData(formData);
    await loadJournalTraceability();
    
    if (!silent) {
      setTimeout(() => {
        navigate('/comptabilite/journaux');
      }, 1500);
    }
    
    return true;
    
  } catch (err) {
    // Le message est dans err.data (pas err.response.data)
    let errorMessage = "Erreur lors de la mise a jour";
    
    // Essaye différents endroits où le message pourrait être
    if (err?.data?.code?.[0]) {
      errorMessage = err.data.code[0];
    } else if (err?.response?.data?.code?.[0]) {
      errorMessage = err.response.data.code[0];
    } else if (err?.data?.message) {
      errorMessage = err.data.message;
    } else if (err?.message) {
      errorMessage = err.message;
    }
    
    setError(errorMessage);
    return false;
  } finally {
    setIsSubmitting(false);
  }
};
  const handleDiscardChanges = () => setShowConfirmDialog(true);
  
  const confirmDiscardChanges = () => {
    if (initialFormData) {
      setFormData(initialFormData);
      setHasUnsavedChanges(false);
      setShowConfirmDialog(false);
      setSuccess('Modifications annulees.');
      return;
    }

    setFormData({
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
      email: activeEntity?.email || '',
      payment_method_in: [],
      payment_method_out: [],
      note: '',
      active: true,
      use_refund_sequence: false,
      sequence_id: '',
      sequence_name: '',
      refund_sequence_id: '',
      refund_sequence_name: '',
      import_bank_statements: false
    });
    setHasUnsavedChanges(false);
    setShowConfirmDialog(false);
    setSuccess('Modifications annulées.');
  };

  const handleNewJournal = () => {
    if (hasUnsavedChanges) {
      handleSave(true);
    }
    navigate('/comptabilite/journaux/create');
  };

  const handleGoToList = () => {
    if (hasUnsavedChanges) {
      handleSave(true);
    }
    navigate('/comptabilite/journaux');
  };

  const handleNewPiece = async () => {
    if (!id) {
      setError('Enregistrez le journal avant de créer une pièce avec ce journal.');
      return;
    }
    if (hasUnsavedChanges) {
      const saved = await handleSave(true);
      if (!saved) return;
    }
    const journalLabel = `${formData.code || ''} - ${formData.name || ''}`.trim().replace(/^-|-$/g, '').trim();
    const params = new URLSearchParams({
      journal_id: String(id),
      journal: String(id),
      journal_label: journalLabel,
    });
    navigate(`/comptabilite/pieces/create?${params.toString()}`, {
      state: {
        journal_id: String(id),
        journal: String(id),
        journal_label: journalLabel,
        journal_code: formData.code || '',
        journal_name: formData.name || '',
      },
    });
  };

  const handleDuplicate = () => {
    setSuccess('Duplication à implémenter');
    setShowActionsMenu(false);
  };

  const handleDelete = async () => {
    try {
      await apiClient.delete(`/compta/journals/${id}/`);
      setSuccess('Journal supprime.');
      setShowActionsMenu(false);
      navigate('/comptabilite/journaux');
    } catch (err) {
      setError(err?.data?.detail || err?.response?.data?.detail || err?.message || 'Erreur lors de la suppression');
    }
  };

  const handleExtourner = () => {
    setSuccess("Extourne à implémenter");
    setShowActionsMenu(false);
  };

  if (!activeEntity) {
    return (
      <div className="min-h-screen bg-gray-50 p-4">
        <div className="max-w-7xl mx-auto bg-white border border-gray-300">
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

  const showBankSpecific = isBankType();
  const showCashSpecific = isCashType();
  const requiredFields = getRequiredFields();
  const isFieldRequired = (fieldName) => requiredFields.includes(fieldName);

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-7xl mx-auto bg-white border border-gray-300">

        <div className="border-b border-gray-300 px-4 py-3">
          <div className="flex items-start justify-between mb-2">
            <div className="flex items-start gap-3">
              <Tooltip text="Créer un nouveau journal">
                <button 
                  onClick={handleNewJournal}
                  className="h-8 px-3 border border-purple-600 bg-purple-600 text-white text-xs hover:bg-purple-700 hover:border-purple-700 hover:scale-105 hover:shadow-md active:scale-95 transition-all duration-200 flex items-center gap-1"
                >
                  <FiPlus size={12} /><span>Nouveau</span>
                </button>
              </Tooltip>
              <div className="flex flex-col">
                <div 
                  className="text-lg font-bold text-gray-900 cursor-pointer hover:text-purple-600 hover:scale-105 transition-all duration-200"
                  onClick={handleGoToList}
                >
                  Journal
                </div>
                <div className="text-sm text-gray-600 mt-0.5">
                  État : <span className={`font-medium ${formData.active ? 'text-green-600' : 'text-gray-500'}`}>
                    {formData.active ? 'Actif' : 'Inactif'}
                  </span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="relative" ref={actionsMenuRef}>
                <Tooltip text="Menu des actions">
                  <button 
                    onClick={() => setShowActionsMenu(!showActionsMenu)}
                    className="h-8 px-3 border border-gray-300 text-gray-700 text-xs hover:bg-gray-50 hover:scale-105 hover:shadow-md active:scale-95 transition-all duration-200 flex items-center gap-1"
                  >
                    <FiSettings size={12} /><span>Actions</span>
                  </button>
                </Tooltip>
                {showActionsMenu && (
                  <div className="absolute right-0 mt-1 w-48 bg-white border border-gray-300 shadow-lg rounded-sm z-50">
                    <button onClick={handleDuplicate} className="w-full px-3 py-2 text-xs text-left hover:bg-gray-50 hover:pl-4 transition-all duration-200 flex items-center gap-2 border-b border-gray-100">
                      <FiCopy size={12} /> Dupliquer
                    </button>
                    <button onClick={handleDelete} className="w-full px-3 py-2 text-xs text-left hover:bg-gray-50 hover:pl-4 transition-all duration-200 flex items-center gap-2 border-b border-gray-100">
                      <FiTrash2 size={12} /> Supprimer
                    </button>
                    <button onClick={handleExtourner} className="w-full px-3 py-2 text-xs text-left hover:bg-gray-50 hover:pl-4 transition-all duration-200 flex items-center gap-2 border-b border-gray-100">
                      <FiRotateCcw size={12} /> Extourné
                    </button>
                    <button
                      type="button"
                      onClick={() => { setShowTraceabilityPanel(prev => !prev); setShowActionsMenu(false); }}
                      className="w-full px-3 py-2 text-xs text-left hover:bg-gray-50 hover:pl-4 transition-all duration-200 flex items-center gap-2"
                    >
                      <FiInfo size={12} /> {showTraceabilityPanel ? 'Masquer la traçabilité' : 'Afficher la traçabilité'}
                    </button>
                  </div>
                )}
              </div>
              <Tooltip text="Enregistrer le journal">
                <button 
                  onClick={() => handleSave(false)} 
                  disabled={isSubmitting}
                  className="w-8 h-8 rounded-full bg-purple-600 text-white hover:bg-purple-700 hover:scale-110 hover:shadow-lg active:scale-90 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center shadow-sm"
                >
                  <FiUploadCloud size={16} />
                </button>
              </Tooltip>
              <Tooltip text="Annuler les modifications">
                <button 
                  onClick={handleDiscardChanges}
                  className="w-8 h-8 rounded-full bg-black text-white hover:bg-gray-800 hover:scale-110 hover:shadow-lg active:scale-90 transition-all duration-200 flex items-center justify-center"
                >
                  <FiX size={16} />
                </button>
              </Tooltip>
            </div>
          </div>
        </div>

        <div className="border-b border-gray-300 px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
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
            <span className="text-sm text-gray-700 font-medium">Activer/Désactiver</span>
          </div>
          <div className="flex items-center gap-2">
            <Tooltip text="Créer une pièce avec ce journal">
              <button
                type="button"
                onClick={handleNewPiece}
                className="h-8 px-3 text-xs font-medium border border-purple-600 bg-purple-600 text-white hover:bg-purple-700 transition-all duration-200 flex items-center gap-1"
              >
                <FiPlus size={12} /> Nouvelle pièce
              </button>
            </Tooltip>
          </div>
        </div>

        {hasUnsavedChanges && (
          <div className="px-4 py-1 bg-blue-50 text-blue-700 text-xs border-b border-blue-200 flex items-center justify-between">
            <span>Modifications non sauvegardées</span>
            {isAutoSaving && <span className="animate-pulse">Sauvegarde en cours…</span>}
          </div>
        )}

        <div className={`grid gap-0 ${showTraceabilityPanel ? 'lg:grid-cols-[minmax(0,1fr)_320px]' : 'grid-cols-1'}`}>
          <div className="min-w-0">
        <div className="px-4 py-3 border-b border-gray-300">
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
              <RequiredLabel required={isFieldRequired('code')}>Code</RequiredLabel>
              <input
                type="text"
                value={formData.code}
                onChange={(e) => handleChange('code', e.target.value.toUpperCase().slice(0, 8))}
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
                {loading ? (
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
            </div>
          </div>
        </div>

        <div className="border-b border-gray-300">
          <div className="px-4 flex">
            {['comptable', 'avance', 'numerotation', 'notes'].map(tab => (
              <button 
                key={tab} 
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-2 text-xs font-medium border-b-2 transition-all duration-200 ${
                  activeTab === tab 
                    ? 'border-purple-600 text-purple-600 hover:text-purple-800' 
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {tab === 'comptable' ? 'Paramètres comptables' : 
                 tab === 'avance' ? 'Paramètres avancés' :
                 tab === 'numerotation' ? 'Numérotation' : 'Notes'}
              </button>
            ))}
          </div>
        </div>

        <div className="p-4">
          {activeTab === 'comptable' && (
            <div className="space-y-3">
              {loading && (
                <div className="text-xs text-purple-600 flex items-center gap-2 mb-2">
                  <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-purple-600"></div>
                  Chargement des comptes...
                </div>
              )}

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
                              options={treasuryAccounts}
                              getOptionLabel={(a) => a.code && a.name ? `${a.code} - ${a.name}` : (a.name || '')}
                              placeholder="Compte de tresorerie"
                              required={isFieldRequired('default_account_id')}
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
                            />
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="flex items-center" style={{ height: '26px' }}>
                          <RequiredLabel required={isFieldRequired('bank_account_id')}>Compte bancaire lié</RequiredLabel>
                          <div className="flex-1 ml-2 border border-gray-300 hover:border-purple-400 transition-colors" style={{ height: '26px' }}>
                            <AutocompleteInput
                              value={formData.bank_account_name}
                              selectedId={formData.bank_account_id}
                              onChange={(text) => handleChange('bank_account_name', text)}
                              onSelect={handleBankAccountSelect}
                              options={filteredBankAccounts}
                              getOptionLabel={getBankAccountLabel}
                              placeholder="Compte bancaire (obligatoire)"
                              required={isFieldRequired('bank_account_id')}
                            />
                          </div>
                        </div>
                        
                        <div className="flex items-center" style={{ height: '26px' }}>
                          <RequiredLabel required={isFieldRequired('bank_acc_number')}>Numéro de compte</RequiredLabel>
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
                              <option value="file">Fichier importé</option>
                              <option value="online">Connexion en ligne</option>
                            </select>
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="flex items-center" style={{ height: '26px' }}>
                          <RequiredLabel required={false}>Import relevés bancaires</RequiredLabel>
                          <div className="flex-1 ml-2 flex items-center">
                            <input
                              type="checkbox"
                              checked={formData.import_bank_statements}
                              onChange={(e) => handleChange('import_bank_statements', e.target.checked)}
                              className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded"
                            />
                            <span className="ml-2 text-xs text-gray-600">Activer l'import automatique</span>
                          </div>
                        </div>
                        <div className="flex items-center" style={{ height: '26px' }}>
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

                      <div className="mt-2 p-2 rounded bg-blue-50 border border-blue-200">
                        <p className="text-xs flex items-center gap-1 text-blue-700">
                          <FiInfo size={12} />
                          Journal de type Banque - Les informations bancaires et le compte de tresorerie sont obligatoires.
                        </p>
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
                              options={treasuryAccounts}
                              getOptionLabel={(a) => a.code && a.name ? `${a.code} - ${a.name}` : (a.name || '')}
                              placeholder="Compte de tresorerie"
                              required={isFieldRequired('default_account_id')}
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
                              options={suspenseAccounts}
                              getOptionLabel={(a) => a.code && a.name ? `${a.code} - ${a.name}` : (a.name || '')}
                              placeholder="Compte d'attente"
                              required={isFieldRequired('suspense_account_id')}
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
                              options={profitAccounts}
                              getOptionLabel={(a) => a.code && a.name ? `${a.code} - ${a.name}` : (a.name || '')}
                              placeholder="Compte de profit"
                              required={isFieldRequired('profit_account_id')}
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
                              options={lossAccounts}
                              getOptionLabel={(a) => a.code && a.name ? `${a.code} - ${a.name}` : (a.name || '')}
                              placeholder="Compte de perte"
                              required={isFieldRequired('loss_account_id')}
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

                      <div className="mt-2 p-2 rounded bg-blue-50 border border-blue-200">
                        <p className="text-xs flex items-center gap-1 text-blue-700">
                          <FiInfo size={12} />
                          Le compte de tresorerie est obligatoire. Les autres comptes restent optionnels selon votre parametrage.
                        </p>
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
                              getOptionLabel={(a) => a.code && a.name ? `${a.code} - ${a.name}` : (a.name || '')}
                              placeholder="Compte par defaut (optionnel)"
                            />
                          </div>
                        </div>
                        
                        <div className="flex items-center" style={{ height: '26px' }}>
                        </div>
                      </div>

                      <div className="mt-2 p-2 rounded bg-gray-50 border border-gray-200">
                        <p className="text-xs flex items-center gap-1 text-gray-600">
                          <FiInfo size={12} />
                          Le compte par defaut est optionnel pour ce type de journal.
                        </p>
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

          {activeTab === 'avance' && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center" style={{ height: '26px' }}>
                  <RequiredLabel required={false}>Société</RequiredLabel>
                  <div className="flex-1 ml-2 px-2 py-1 bg-gray-100 border border-gray-300 text-xs text-gray-700 flex items-center gap-2" style={{ height: '26px' }}>
                    <FiBriefcase size={12} className="text-purple-600" />
                    {activeEntity?.raison_sociale || activeEntity?.nom || 'Non définie'}
                  </div>
                </div>
                
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

              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center" style={{ height: '26px' }}>
                  <RequiredLabel required={false}>Mode de paiement entrant</RequiredLabel>
                  <div className="flex-1 ml-2 relative">
                    <FiCreditCard className="absolute left-2 top-1.5 text-gray-400" size={12} />
                    <select
                      value={formData.payment_method_in[0] || ''}
                      onChange={(e) => handleChange('payment_method_in', e.target.value ? [e.target.value] : [])}
                      className="w-full pl-7 pr-2 py-1 border border-gray-300 text-xs hover:border-purple-400 focus:border-purple-600 transition-colors appearance-none"
                      style={{ height: '26px' }}
                    >
                      <option value="">Sélectionner (optionnel)</option>
                      {paymentMethods.map(method => (
                        <option key={method.id} value={method.id}>{method.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
                
                <div className="flex items-center" style={{ height: '26px' }}>
                  <RequiredLabel required={false}>Mode de paiement sortant</RequiredLabel>
                  <div className="flex-1 ml-2 relative">
                    <FiDollarSign className="absolute left-2 top-1.5 text-gray-400" size={12} />
                    <select
                      value={formData.payment_method_out[0] || ''}
                      onChange={(e) => handleChange('payment_method_out', e.target.value ? [e.target.value] : [])}
                      className="w-full pl-7 pr-2 py-1 border border-gray-300 text-xs hover:border-purple-400 focus:border-purple-600 transition-colors appearance-none"
                      style={{ height: '26px' }}
                    >
                      <option value="">Sélectionner (optionnel)</option>
                      {paymentMethods.map(method => (
                        <option key={method.id} value={method.id}>{method.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center" style={{ height: '26px' }}>
                  <RequiredLabel required={false}>Compte suspens entrant</RequiredLabel>
                  <div className="flex-1 ml-2 border border-gray-300 hover:border-purple-400 transition-colors" style={{ height: '26px' }}>
                    <AutocompleteInput
                      value={formData.suspense_account_in_name}
                      selectedId={formData.suspense_account_in_id}
                      onChange={(text) => handleChange('suspense_account_in_name', text)}
                      onSelect={(id, label) => {
                        handleChange('suspense_account_in_id', id);
                        handleChange('suspense_account_in_name', label);
                      }}
                      options={suspenseAccounts}
                      getOptionLabel={(a) => a.code && a.name ? `${a.code} - ${a.name}` : (a.name || '')}
                      placeholder="Compte suspens entrant (optionnel)"
                    />
                  </div>
                </div>
                
                <div className="flex items-center" style={{ height: '26px' }}>
                  <RequiredLabel required={false}>Compte suspens sortant</RequiredLabel>
                  <div className="flex-1 ml-2 border border-gray-300 hover:border-purple-400 transition-colors" style={{ height: '26px' }}>
                    <AutocompleteInput
                      value={formData.suspense_account_out_name}
                      selectedId={formData.suspense_account_out_id}
                      onChange={(text) => handleChange('suspense_account_out_name', text)}
                      onSelect={(id, label) => {
                        handleChange('suspense_account_out_id', id);
                        handleChange('suspense_account_out_name', label);
                      }}
                      options={suspenseAccounts}
                      getOptionLabel={(a) => a.code && a.name ? `${a.code} - ${a.name}` : (a.name || '')}
                      placeholder="Compte suspens sortant (optionnel)"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'numerotation' && (
            <div className="space-y-3">
              {loading && (
                <div className="text-xs text-purple-600 flex items-center gap-2 mb-2">
                  <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-purple-600"></div>
                  Chargement des séquences...
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center" style={{ height: '26px' }}>
                  <RequiredLabel required={false}>Séquence de numérotation</RequiredLabel>
                  <div className="flex-1 ml-2 border border-gray-300 hover:border-purple-400 transition-colors" style={{ height: '26px' }}>
                    <AutocompleteInput
                      value={formData.sequence_name}
                      selectedId={formData.sequence_id}
                      onChange={(text) => handleChange('sequence_name', text)}
                      onSelect={(id, label) => {
                        handleChange('sequence_id', id);
                        handleChange('sequence_name', label);
                      }}
                      options={sequences}
                      getOptionLabel={getSequenceLabel}
                      placeholder="Séquence (optionnel)"
                    />
                  </div>
                </div>
                <div className="flex items-center" style={{ height: '26px' }}>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center" style={{ height: '26px' }}>
                  <RequiredLabel required={false}>Séquence séparée pour les avoirs</RequiredLabel>
                  <div className="flex-1 ml-2 flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={formData.use_refund_sequence}
                      onChange={(e) => {
                        handleChange('use_refund_sequence', e.target.checked);
                        if (!e.target.checked) {
                          handleChange('refund_sequence_id', '');
                          handleChange('refund_sequence_name', '');
                        }
                      }}
                      className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded"
                    />
                  </div>
                </div>
                
                <div className="flex items-center" style={{ height: '26px' }}>
                </div>
              </div>

              {formData.use_refund_sequence && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center" style={{ height: '26px' }}>
                    <RequiredLabel required={false}>Séquence des avoirs</RequiredLabel>
                    <div className="flex-1 ml-2 border border-gray-300 hover:border-purple-400 transition-colors" style={{ height: '26px' }}>
                      <AutocompleteInput
                        value={formData.refund_sequence_name}
                        selectedId={formData.refund_sequence_id}
                        onChange={(text) => handleChange('refund_sequence_name', text)}
                        onSelect={(id, label) => {
                          handleChange('refund_sequence_id', id);
                          handleChange('refund_sequence_name', label);
                        }}
                        options={sequences}
                        getOptionLabel={getSequenceLabel}
                        placeholder="Séquence des avoirs"
                      />
                    </div>
                  </div>
                  <div className="flex items-center" style={{ height: '26px' }}>
                  </div>
                </div>
              )}

              <div className="mt-2 p-2 rounded bg-gray-50 border border-gray-200">
                <p className="text-xs flex items-center gap-1 text-gray-600">
                  <FiInfo size={12} />
                  Les séquences définissent le format de numérotation des pièces comptables.
                </p>
              </div>
            </div>
          )}

          {activeTab === 'notes' && (
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
          {showTraceabilityPanel && (
            <aside className="border-l border-gray-300 bg-gray-50 min-h-[420px]">
              <div className="sticky top-0">
                <div className="px-4 py-3 border-b border-gray-300 bg-white flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FiInfo className="text-purple-600" size={14} />
                    <h3 className="text-xs font-semibold text-gray-800 uppercase tracking-wide">Traçabilité</h3>
                  </div>
                  <button type="button" onClick={() => setShowTraceabilityPanel(false)} className="text-xs text-gray-500 hover:text-gray-900">Fermer</button>
                </div>
                <div className="px-4 py-3">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-medium text-gray-700">Activité liée au journal</span>
                    <span className="text-[11px] text-gray-500">{traceabilityLogs.length} événement(s)</span>
                  </div>
                  {traceabilityLoading ? (
                    <div className="bg-white border border-gray-200 px-3 py-4 text-xs text-gray-500 text-center">
                      Chargement de la traçabilité...
                    </div>
                  ) : traceabilityLogs.length > 0 ? (
                    <div className="space-y-2 max-h-[calc(100vh-240px)] overflow-y-auto pr-1">
                      {traceabilityLogs.map(log => (
                        <div key={log.id} className="bg-white border border-gray-200 px-3 py-2">
                          <div className="flex items-center gap-2">
                            <span className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium ${
                              log.source === 'journal'
                                ? 'bg-purple-100 text-purple-700'
                                : 'bg-blue-100 text-blue-700'
                            }`}>
                              {log.source === 'journal' ? 'Journal' : 'Pièce'}
                            </span>
                            <div className="text-xs font-medium text-gray-900 truncate">{log.action}</div>
                          </div>
                          {(log.objectLabel || log.description) && (
                            <div className="text-[11px] text-gray-500 mt-1">
                              {[log.objectLabel, log.description].filter(Boolean).join(' - ')}
                            </div>
                          )}
                          <div className="flex items-center justify-between gap-2 text-[11px] text-gray-500 mt-2">
                            <span className="truncate">Par {log.user || 'Utilisateur'}</span>
                            <span className="whitespace-nowrap">{log.date ? getTraceDate(log.date) : ''}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="bg-white border border-gray-200 px-3 py-5 text-center">
                      <FiClock className="w-7 h-7 text-gray-400 mx-auto mb-2" />
                      <div className="text-xs text-gray-600">Aucune traçabilité trouvée</div>
                      <div className="text-[11px] text-gray-500 mt-1">
                        Les actions sur ce journal apparaîtront ici.
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </aside>
          )}
        </div>

        {(error || success) && (
          <div className={`px-4 py-3 text-sm border-t border-gray-300 transition-all duration-300 ${
            error ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'
          }`}>
            <div className="flex items-center gap-2">
              {error ? <FiAlertCircle size={14} /> : <FiCheck size={14} />}
              <span>{error || success}</span>
            </div>
          </div>
        )}
      </div>

      {showConfirmDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-sm shadow-lg max-w-md w-full mx-4">
            <h3 className="text-lg font-bold text-gray-900 mb-3">Ignorer les modifications ?</h3>
            <p className="text-sm text-gray-600 mb-6">
              Êtes-vous sûr de vouloir annuler toutes les modifications ?
            </p>
            <div className="flex justify-end gap-3">
              <button 
                onClick={() => setShowConfirmDialog(false)} 
                className="px-4 py-2 border border-gray-300 text-gray-700 text-sm hover:bg-gray-50 hover:scale-105 active:scale-95 transition-all duration-200"
              >
                Annuler
              </button>
              <button 
                onClick={confirmDiscardChanges} 
                className="px-4 py-2 bg-red-600 text-white text-sm hover:bg-red-700 hover:scale-105 active:scale-95 transition-all duration-200"
              >
                Ignorer les modifications
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
