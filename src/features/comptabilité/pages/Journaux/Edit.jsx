// src/features/comptabilité/pages/Journaux/Edit.jsx

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
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
  let accountNumber = bankAccount.numero_compte || '';
  
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
export default function JournauxEdit() {
  const { id } = useParams();
  const navigate = useNavigate();
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
  const [initialData, setInitialData] = useState(null);
  
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
    import_bank_statements: false
  });

  const actionsMenuRef = useRef(null);

  useEffect(() => {
    if (!activeEntity) {
      setError('Vous devez sélectionner une entité pour modifier un journal');
    }
  }, [activeEntity]);

  useEffect(() => {
    if (activeEntity && id) {
      loadJournal();
      loadOptions();
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

  const loadJournal = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await apiClient.get(`/compta/journals/${id}/`);
      const journalData = response;
      
      // Récupérer les noms des comptes pour l'affichage
      const defaultAccount = accounts.find(a => a.id === journalData.default_account_id);
      const profitAccount = accounts.find(a => a.id === journalData.profit_account_id);
      const lossAccount = accounts.find(a => a.id === journalData.loss_account_id);
      const suspenseAccount = accounts.find(a => a.id === journalData.suspense_account_id);
      const bankAccount = bankAccounts.find(b => b.id === journalData.bank_account_id);
      const bank = banks.find(b => b.id === journalData.bank_id);
      const sequence = sequences.find(s => s.id === journalData.sequence_id);
      const refundSequence = sequences.find(s => s.id === journalData.refund_sequence_id);
      
      const journalFormData = {
        name: journalData.name || '',
        code: journalData.code || '',
        type_id: journalData.type?.id || journalData.type_id || '',
        type_code: journalData.type?.code || '',
        default_account_id: journalData.default_account_id || '',
        default_account_name: defaultAccount ? `${defaultAccount.code} - ${defaultAccount.name}` : '',
        profit_account_id: journalData.profit_account_id || '',
        profit_account_name: profitAccount ? `${profitAccount.code} - ${profitAccount.name}` : '',
        loss_account_id: journalData.loss_account_id || '',
        loss_account_name: lossAccount ? `${lossAccount.code} - ${lossAccount.name}` : '',
        suspense_account_id: journalData.suspense_account_id || '',
        suspense_account_name: suspenseAccount ? `${suspenseAccount.code} - ${suspenseAccount.name}` : '',
        suspense_account_in_id: journalData.suspense_account_in_id || '',
        suspense_account_in_name: '',
        suspense_account_out_id: journalData.suspense_account_out_id || '',
        suspense_account_out_name: '',
        bank_account_id: journalData.bank_account_id || '',
        bank_account_name: bankAccount ? getBankAccountLabel(bankAccount) : '',
        bank_acc_number: journalData.bank_acc_number || '',
        bank_id: journalData.bank_id || '',
        bank_name: bank ? getBankLabel(bank) : '',
        bank_statements_source: journalData.bank_statements_source || 'manual',
        email: journalData.email || activeEntity?.email || '',
        payment_method_in: journalData.inbound_payment_methods?.map(m => m.id) || journalData.inbound_payment_method_ids || [],
        payment_method_out: journalData.outbound_payment_methods?.map(m => m.id) || journalData.outbound_payment_method_ids || [],
        note: journalData.note || '',
        active: journalData.active !== undefined ? journalData.active : true,
        use_refund_sequence: journalData.use_refund_sequence || false,
        sequence_id: journalData.sequence_id || '',
        sequence_name: sequence ? getSequenceLabel(sequence) : '',
        refund_sequence_id: journalData.refund_sequence_id || '',
        refund_sequence_name: refundSequence ? getSequenceLabel(refundSequence) : '',
        import_bank_statements: journalData.import_bank_statements || false
      };
      
      setFormData(journalFormData);
      setInitialData(journalFormData);
      
    } catch (err) {
      console.error('❌ Erreur chargement journal:', err);
      setError(`Erreur de chargement: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const loadOptions = async () => {
    setError(null);
    
    try {
      const typesResponse = await apiClient.get('/compta/journal-types/');
      const typesData = normalizeApiResponse(typesResponse);
      setJournalTypes(typesData);
      
      try {
        const accountsResponse = await apiClient.get('/compta/accounts/');
        const accountsData = normalizeApiResponse(accountsResponse);
        // Filtrer les comptes racines
        const operationalAccounts = accountsData.filter(account => {
          const code = account.code || '';
          return !/^\d{1,2}$/.test(code) || account.parent;
        });
        setAccounts(operationalAccounts);
      } catch (err) {
        console.warn('⚠️ Comptes non disponibles:', err.message);
      }
      
      try {
        const bankResponse = await apiClient.get('/banques-partenaires/');
        const bankData = normalizeApiResponse(bankResponse);
        setBankAccounts(bankData);
      } catch (err) {
        console.log('ℹ️ Banques partenaires non disponibles');
      }
      
      try {
        const banksResponse = await apiClient.get('/banques/');
        const banksData = normalizeApiResponse(banksResponse);
        setBanks(banksData);
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
        console.log('✅ Séquences chargées:', filteredSequences.length);
      } catch (err) {
        console.log('ℹ️ Séquences non disponibles', err);
        setSequences([]);
      }
      
    } catch (err) {
      console.error('❌ Erreur critique:', err);
      setError(`Erreur de chargement: ${err.message}`);
    }
  };

  useEffect(() => {
    const handleBeforeUnload = () => {
      if (hasUnsavedChanges) {
        // Ne pas sauvegarder automatiquement en modification
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

  const handleTypeChange = (typeId) => {
    const selectedType = journalTypes.find(t => t.id === typeId);
    
    setFormData(prev => ({ 
      ...prev, 
      type_id: typeId,
      type_code: selectedType?.code || '',
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
    const bankCodes = ['BQ', 'BN', 'BAN', 'BANQUE'];
    return bankCodes.includes(formData.type_code) || 
           formData.type_code === 'BAN' ||
           formData.type_code === 'BANQUE' ||
           formData.type_code?.startsWith('BQ') ||
           formData.type_code?.startsWith('BN');
  };

  const isCashType = () => {
    const cashCodes = ['CA', 'CS', 'CAI', 'CAISSE'];
    return cashCodes.includes(formData.type_code) || 
           formData.type_code?.startsWith('CA') ||
           formData.type_code?.startsWith('CS');
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
        if (!silent) setError('Le compte d\'achat par défaut est obligatoire pour un journal de type Caisse');
        return false;
      }
      if (!formData.suspense_account_id) {
        if (!silent) setError('Le compte d\'attente est obligatoire pour un journal de type Caisse');
        return false;
      }
      if (!formData.profit_account_id) {
        if (!silent) setError('Le compte de profit est obligatoire pour un journal de type Caisse');
        return false;
      }
      if (!formData.loss_account_id) {
        if (!silent) setError('Le compte de perte est obligatoire pour un journal de type Caisse');
        return false;
      }
    }

    return true;
  };

  const getRequiredFields = () => {
    if (!formData.type_id) return ['name', 'code', 'type_id'];
    
    if (isBankType()) {
      return ['name', 'code', 'type_id', 'bank_account_id', 'bank_acc_number', 'bank_id'];
    } else if (isCashType()) {
      return ['name', 'code', 'type_id', 'default_account_id', 'suspense_account_id', 'profit_account_id', 'loss_account_id'];
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
      suspense_account_in_id: formData.suspense_account_in_id || null,
      suspense_account_out_id: formData.suspense_account_out_id || null,
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
      inbound_payment_method_ids: formData.payment_method_in.length ? formData.payment_method_in : [],
      outbound_payment_method_ids: formData.payment_method_out.length ? formData.payment_method_out : []
    };
    
    Object.keys(apiData).forEach(key => {
      if (apiData[key] === undefined || apiData[key] === null || apiData[key] === '') {
        delete apiData[key];
      }
    });
    
    return apiData;
  }, [formData, activeEntity]);

  const handleSave = async (silent = false) => {
    if (!validateForm(silent)) {
      return false;
    }

    setIsSubmitting(true);
    if (!silent) setError(null);

    try {
      const apiData = prepareDataForApi();
      const result = await apiClient.put(`/compta/journals/${id}/`, apiData);
      
      if (!silent) {
        setSuccess('Journal modifié avec succès !');
      }
      setHasUnsavedChanges(false);
      setInitialData(formData);
      
      if (!silent) {
        setTimeout(() => {
          navigate('/comptabilite/journaux');
        }, 1500);
      }
      
      return true;
      
    } catch (err) {
      let errorMessage = "Erreur lors de la modification";
      
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
    if (initialData) {
      setFormData(initialData);
    }
    setHasUnsavedChanges(false);
    setShowConfirmDialog(false);
    setSuccess('Modifications annulées.');
  };

  const handleGoToList = () => {
    if (hasUnsavedChanges) {
      setShowConfirmDialog(true);
    } else {
      navigate('/comptabilite/journaux');
    }
  };

  const handleDuplicate = async () => {
    try {
      const apiData = prepareDataForApi();
      delete apiData.code;
      apiData.name = `${apiData.name} (Copie)`;
      apiData.code = `${formData.code}COPY`.slice(0, 8);
      await apiClient.post('/compta/journals/', apiData);
      setSuccess('Journal dupliqué avec succès !');
      setTimeout(() => {
        navigate('/comptabilite/journaux');
      }, 1500);
    } catch (err) {
      setError('Erreur lors de la duplication');
    }
    setShowActionsMenu(false);
  };

  const handleDelete = async () => {
    if (!window.confirm('Supprimer définitivement ce journal ?')) return;
    
    try {
      await apiClient.delete(`/compta/journals/${id}/`);
      setSuccess('Journal supprimé avec succès !');
      setTimeout(() => {
        navigate('/comptabilite/journaux');
      }, 1500);
    } catch (err) {
      setError('Erreur lors de la suppression');
    }
    setShowActionsMenu(false);
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
            <div className="text-lg font-bold text-gray-900">Modifier un journal</div>
          </div>
          <div className="p-8">
            <div className="bg-yellow-50 border border-yellow-200 rounded p-6 text-center">
              <FiAlertCircle className="text-yellow-600 mx-auto mb-3" size={32} />
              <p className="text-yellow-800 font-medium text-lg mb-3">Aucune entité sélectionnée</p>
              <p className="text-sm text-gray-600 mb-4">
                Vous devez sélectionner une entité pour modifier un journal.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (loading && !formData.name) {
    return (
      <div className="min-h-screen bg-gray-50 p-4">
        <div className="max-w-7xl mx-auto bg-white border border-gray-300">
          <div className="border-b border-gray-300 px-4 py-3">
            <div className="text-lg font-bold text-gray-900">Modifier un journal</div>
          </div>
          <div className="p-8 flex items-center justify-center">
            <div className="text-center">
              <div className="w-8 h-8 border-2 border-purple-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
              <p className="mt-4 text-gray-600 text-sm">Chargement du journal...</p>
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
                  onClick={() => navigate('/comptabilite/journaux/create')}
                  className="h-8 px-3 border border-gray-300 text-gray-700 text-xs hover:bg-gray-50 hover:scale-105 hover:shadow-md active:scale-95 transition-all duration-200 flex items-center gap-1"
                >
                  <FiPlus size={12} /><span>Nouveau</span>
                </button>
              </Tooltip>
              <div className="flex flex-col">
                <div 
                  className="text-lg font-bold text-gray-900 cursor-pointer hover:text-purple-600 hover:scale-105 transition-all duration-200"
                  onClick={handleGoToList}
                >
                  Journal - {formData.code || 'Modification'}
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
                    <button onClick={handleDelete} className="w-full px-3 py-2 text-xs text-left hover:bg-red-50 hover:text-red-600 hover:pl-4 transition-all duration-200 flex items-center gap-2 border-b border-gray-100">
                      <FiTrash2 size={12} /> Supprimer
                    </button>
                    <button onClick={handleExtourner} className="w-full px-3 py-2 text-xs text-left hover:bg-gray-50 hover:pl-4 transition-all duration-200 flex items-center gap-2">
                      <FiRotateCcw size={12} /> Extourné
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
            <div className={`h-8 px-3 text-xs font-medium border transition-all duration-200 flex items-center ${
              formData.active 
                ? 'bg-green-100 text-green-700 border-green-300' 
                : 'bg-gray-100 text-gray-500 border-gray-300'
            }`}>
              Actif
            </div>
            <div className={`h-8 px-3 text-xs font-medium border transition-all duration-200 flex items-center ${
              !formData.active 
                ? 'bg-red-100 text-red-700 border-red-300' 
                : 'bg-gray-100 text-gray-500 border-gray-300'
            }`}>
              Inactif
            </div>
          </div>
        </div>

        {hasUnsavedChanges && (
          <div className="px-4 py-1 bg-blue-50 text-blue-700 text-xs border-b border-blue-200 flex items-center justify-between">
            <span>Modifications non sauvegardées</span>
          </div>
        )}

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
                <JournalTypeSelect
                  value={formData.type_id}
                  onChange={handleTypeChange}
                  options={journalTypes}
                  placeholder="Type de journal"
                />
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
                          <RequiredLabel required={false}>Compte d'achat par défaut</RequiredLabel>
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
                              placeholder="Compte d'achat par défaut (optionnel)"
                            />
                          </div>
                        </div>
                        <div className="flex items-center" style={{ height: '26px' }}>
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
                              onSelect={(id, label) => {
                                handleChange('bank_account_id', id);
                                handleChange('bank_account_name', label);
                              }}
                              options={bankAccounts}
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
                        <div className="flex items-center" style={{ height: '26px' }}>
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

                      <div className="mt-2 p-2 rounded bg-blue-50 border border-blue-200">
                        <p className="text-xs flex items-center gap-1 text-blue-700">
                          <FiInfo size={12} />
                          Journal de type Banque - Les informations bancaires sont obligatoires. Le compte d'achat par défaut est optionnel.
                        </p>
                      </div>
                    </div>
                  )}

                  {showCashSpecific && (
                    <div className="space-y-3">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="flex items-center" style={{ height: '26px' }}>
                          <RequiredLabel required={isFieldRequired('default_account_id')}>Compte d'achat par défaut</RequiredLabel>
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
                              placeholder="Compte d'achat par défaut"
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
                              options={accounts}
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
                              options={accounts}
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
                              options={accounts}
                              getOptionLabel={(a) => a.code && a.name ? `${a.code} - ${a.name}` : (a.name || '')}
                              placeholder="Compte de perte"
                              required={isFieldRequired('loss_account_id')}
                            />
                          </div>
                        </div>
                      </div>

                      <div className="mt-2 p-2 rounded bg-blue-50 border border-blue-200">
                        <p className="text-xs flex items-center gap-1 text-blue-700">
                          <FiInfo size={12} />
                          Tous les comptes sont obligatoires pour les journaux de type Caisse.
                        </p>
                      </div>
                    </div>
                  )}

                  {!showBankSpecific && !showCashSpecific && (
                    <div className="space-y-3">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="flex items-center" style={{ height: '26px' }}>
                          <RequiredLabel required={false}>Compte d'achat par défaut</RequiredLabel>
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
                              placeholder="Compte d'achat par défaut (optionnel)"
                            />
                          </div>
                        </div>
                        
                        <div className="flex items-center" style={{ height: '26px' }}>
                        </div>
                      </div>

                      <div className="mt-2 p-2 rounded bg-gray-50 border border-gray-200">
                        <p className="text-xs flex items-center gap-1 text-gray-600">
                          <FiInfo size={12} />
                          Le compte d'achat par défaut est optionnel pour ce type de journal.
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
                      options={accounts}
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
                      options={accounts}
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
            <h3 className="text-lg font-bold text-gray-900 mb-3">Modifications non sauvegardées</h3>
            <p className="text-sm text-gray-600 mb-6">
              Voulez-vous enregistrer les modifications avant de quitter ?
            </p>
            <div className="flex justify-end gap-3">
              <button 
                onClick={async () => {
                  setShowConfirmDialog(false);
                  const saved = await handleSave(true);
                  if (saved) navigate('/comptabilite/journaux');
                }} 
                className="px-4 py-2 bg-purple-600 text-white text-sm hover:bg-purple-700 rounded"
              >
                Enregistrer
              </button>
              <button 
                onClick={() => {
                  confirmDiscardChanges();
                  navigate('/comptabilite/journaux');
                }} 
                className="px-4 py-2 bg-red-600 text-white text-sm hover:bg-red-700 rounded"
              >
                Ne pas enregistrer
              </button>
              <button 
                onClick={() => setShowConfirmDialog(false)} 
                className="px-4 py-2 border border-gray-300 text-gray-700 text-sm hover:bg-gray-50 rounded"
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