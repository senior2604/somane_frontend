// C:\Users\IBM\Documents\somane_frontend\src\features\comptabilité\pages\Journaux\Edit.jsx

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { 
  FiPlus,
  FiTrash2, 
  FiX,
  FiBriefcase,
  FiMail,
  FiCreditCard,
  FiDollarSign,
  FiInfo,
  FiAlertCircle,
  FiCheck,
  FiCopy,
  FiRotateCcw,
  FiSettings,
  FiSave,
  FiArrowLeft
} from "react-icons/fi";
import { useParams, useNavigate } from 'react-router-dom';
import { journauxService, comptesService, apiClient } from "../../services";
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
// COMPOSANT AUTOCOMPLETE OPTIMISÉ
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
  error = false
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

  const filteredOptions = useMemo(() => {
    if (!inputValue) return options;
    const search = inputValue.toLowerCase();
    return options.filter(option => {
      const label = getOptionLabel(option).toLowerCase();
      return label.includes(search);
    });
  }, [options, inputValue, getOptionLabel]);

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
        placeholder={loading ? 'Chargement...' : placeholder}
        disabled={disabled || loading}
        required={required}
        className={`w-full px-2 py-1 text-xs focus:ring-1 focus:ring-purple-500 focus:outline-none ${className} ${loading ? 'bg-gray-50' : ''}`}
        style={{ height: '26px', border: 'none', backgroundColor: 'transparent' }}
        autoComplete="off"
      />
      {isOpen && filteredOptions.length > 0 && !loading && (
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
// COMPOSANT SELECT POUR TYPE JOURNAL OPTIMISÉ
// ==========================================
const JournalTypeSelect = ({
  value,
  onChange,
  options,
  placeholder = "Sélectionner",
  disabled = false,
  required = false,
  loading = false,
  error = false
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const containerRef = useRef(null);
  const inputRef = useRef(null);

  const selectedOption = options.find(opt => opt.id === value);
  
  const filteredOptions = useMemo(() => {
    if (!searchTerm) return options;
    return options.filter(option => {
      const label = `${option.code} ${option.name}`.toLowerCase();
      return label.includes(searchTerm.toLowerCase());
    });
  }, [options, searchTerm]);

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
        onClick={() => !disabled && !loading && setIsOpen(!isOpen)}
        className={`w-full h-[26px] px-2 border text-xs flex items-center justify-between cursor-pointer hover:border-purple-400 bg-white ${
          disabled || loading ? 'bg-gray-100 cursor-not-allowed' : ''
        } ${error ? 'border-red-300' : 'border-gray-300'}`}
      >
        <span className={selectedOption ? 'text-gray-900 truncate pr-1' : 'text-gray-400 truncate pr-1'}>
          {loading ? 'Chargement...' : (selectedOption ? `${selectedOption.code} - ${selectedOption.name}` : placeholder)}
        </span>
        <svg className="w-3 h-3 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </div>

      {isOpen && !disabled && !loading && (
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
export default function Edit() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { activeEntity } = useEntity();

  const [loading, setLoading] = useState(true);
  const [loadingAccounts, setLoadingAccounts] = useState(false);
  const [loadingTypes, setLoadingTypes] = useState(false);
  const [loadingBanks, setLoadingBanks] = useState(false);
  const [loadingBankAccounts, setLoadingBankAccounts] = useState(false);
  const [loadingPayments, setLoadingPayments] = useState(false);
  const [loadingSequences, setLoadingSequences] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [showActionsMenu, setShowActionsMenu] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [activeTab, setActiveTab] = useState('comptable');
  const [isAutoSaving, setIsAutoSaving] = useState(false);
  const [notFound, setNotFound] = useState(false);
  
  const [accounts, setAccounts] = useState([]);
  const [journalTypes, setJournalTypes] = useState([]);
  const [bankAccounts, setBankAccounts] = useState([]);
  const [banks, setBanks] = useState([]);
  const [paymentMethods, setPaymentMethods] = useState([]);
  const [sequences, setSequences] = useState([]);
  
  // État du formulaire - on garde TOUS les champs pour l'UI
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
  const initialLoadDone = useRef(false);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (actionsMenuRef.current && !actionsMenuRef.current.contains(e.target)) {
        setShowActionsMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // ==========================================
  // CHARGEMENT DES DONNÉES
  // ==========================================
  const loadAccounts = useCallback(async () => {
    if (accounts.length > 0) return;
    
    setLoadingAccounts(true);
    try {
      const response = await comptesService.getAll();
      setAccounts(normalizeApiResponse(response));
      console.log('✅ Comptes chargés:', response?.length || 0);
    } catch (err) {
      console.warn('⚠️ Erreur chargement comptes:', err);
    } finally {
      setLoadingAccounts(false);
    }
  }, [accounts.length]);

  const loadJournalTypes = useCallback(async () => {
    if (journalTypes.length > 0) return;
    
    setLoadingTypes(true);
    try {
      const response = await apiClient.get('/compta/journal-types/');
      setJournalTypes(normalizeApiResponse(response));
      console.log('✅ Types de journal chargés:', response?.length || 0);
    } catch (err) {
      console.warn('⚠️ Erreur chargement types:', err);
    } finally {
      setLoadingTypes(false);
    }
  }, [journalTypes.length]);

  const loadBankAccounts = useCallback(async () => {
    if (bankAccounts.length > 0) return;
    
    setLoadingBankAccounts(true);
    try {
      const response = await apiClient.get('/banques-partenaires/');
      setBankAccounts(normalizeApiResponse(response));
      console.log('✅ Banques partenaires chargées:', response?.length || 0);
    } catch (err) {
      console.warn('⚠️ Erreur chargement banques partenaires:', err);
    } finally {
      setLoadingBankAccounts(false);
    }
  }, [bankAccounts.length]);

  const loadBanks = useCallback(async () => {
    if (banks.length > 0) return;
    
    setLoadingBanks(true);
    try {
      const response = await apiClient.get('/banques/');
      setBanks(normalizeApiResponse(response));
      console.log('✅ Banques chargées:', response?.length || 0);
    } catch (err) {
      console.warn('⚠️ Erreur chargement banques:', err);
    } finally {
      setLoadingBanks(false);
    }
  }, [banks.length]);

  // Méthodes de paiement - DÉSACTIVÉ TEMPORAIREMENT
  const loadPaymentMethods = useCallback(async () => {
    setPaymentMethods([]);
    console.log('ℹ️ Méthodes de paiement désactivées (endpoint à créer)');
  }, []);

  // Séquences - DÉSACTIVÉ TEMPORAIREMENT
  const loadSequences = useCallback(async () => {
    setSequences([]);
    console.log('ℹ️ Séquences désactivées (endpoint à créer)');
  }, []);

  // Chargement du journal
  const loadJournal = useCallback(async () => {
    if (!activeEntity) {
      setError('Vous devez sélectionner une entité');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    setNotFound(false);
    
    try {
      console.log('🔍 Chargement du journal ID:', id);
      const journalData = await journauxService.getById(id);
      console.log('📋 Journal chargé:', journalData);
      
      if (!journalData) {
        setNotFound(true);
        setLoading(false);
        return;
      }
      
      // Pré-remplir le formulaire avec tous les champs
      setFormData({
        name: journalData.name || '',
        code: journalData.code || '',
        type_id: journalData.type?.id || journalData.type_id || '',
        type_code: journalData.type?.code || journalData.type_code || '',
        default_account_id: journalData.default_account?.id || journalData.default_account_id || '',
        default_account_name: journalData.default_account ? 
          `${journalData.default_account.code || ''} - ${journalData.default_account.name || ''}`.trim() : '',
        profit_account_id: journalData.profit_account?.id || journalData.profit_account_id || '',
        profit_account_name: journalData.profit_account && typeof journalData.profit_account === 'object' ? 
          `${journalData.profit_account.code || ''} - ${journalData.profit_account.name || ''}`.trim() : '',
        loss_account_id: journalData.loss_account?.id || journalData.loss_account_id || '',
        loss_account_name: journalData.loss_account && typeof journalData.loss_account === 'object' ? 
          `${journalData.loss_account.code || ''} - ${journalData.loss_account.name || ''}`.trim() : '',
        suspense_account_id: journalData.suspense_account?.id || journalData.suspense_account_id || '',
        suspense_account_name: journalData.suspense_account && typeof journalData.suspense_account === 'object' ? 
          `${journalData.suspense_account.code || ''} - ${journalData.suspense_account.name || ''}`.trim() : '',
        // Champs en attente backend - on les initialise vides car ils ne viennent pas de l'API
        suspense_account_in_id: '',
        suspense_account_in_name: '',
        suspense_account_out_id: '',
        suspense_account_out_name: '',
        bank_account_id: journalData.bank_account?.id || journalData.bank_account_id || '',
        bank_account_name: journalData.bank_account ? getBankAccountLabel(journalData.bank_account) : '',
        bank_acc_number: journalData.bank_acc_number || '',
        bank_id: journalData.bank?.id || journalData.bank_id || '',
        bank_name: journalData.bank ? getBankLabel(journalData.bank) : '',
        bank_statements_source: journalData.bank_statements_source || 'manual',
        email: journalData.email || activeEntity?.email || '',
        payment_method_in: journalData.inbound_payment_methods?.map(m => m.id) || 
                          journalData.inbound_payment_method_ids || [],
        payment_method_out: journalData.outbound_payment_methods?.map(m => m.id) || 
                           journalData.outbound_payment_method_ids || [],
        note: journalData.note || '',
        active: journalData.active !== false,
        use_refund_sequence: journalData.use_refund_sequence || false,
        sequence_id: journalData.sequence?.id || journalData.sequence_id || '',
        sequence_name: journalData.sequence ? getSequenceLabel(journalData.sequence) : '',
        refund_sequence_id: journalData.refund_sequence?.id || journalData.refund_sequence_id || '',
        refund_sequence_name: journalData.refund_sequence ? getSequenceLabel(journalData.refund_sequence) : '',
        import_bank_statements: journalData.import_bank_statements || false
      });

    } catch (err) {
      console.error('❌ Erreur chargement:', err);
      
      // Détecter les erreurs 404
      if (err.response?.status === 404 || err.message?.includes('404')) {
        setNotFound(true);
      } else {
        setError(err.message || 'Erreur lors du chargement du journal');
      }
    } finally {
      setLoading(false);
    }
  }, [id, activeEntity]);

  // Chargement initial unique
  useEffect(() => {
    if (!activeEntity) return;
    
    if (initialLoadDone.current) {
      console.log('⏭️ Chargement déjà effectué, ignoré');
      return;
    }
    
    initialLoadDone.current = true;
    console.log('🚀 Chargement initial des données');
    
    const loadData = async () => {
      await loadJournal();
      await Promise.allSettled([
        loadAccounts(),
        loadJournalTypes(),
        loadBankAccounts(),
        loadBanks(),
        loadPaymentMethods(),
        loadSequences()
      ]);
    };
    
    loadData();
    
    return () => {
      console.log('🧹 Nettoyage du composant');
    };
  }, [activeEntity, loadJournal, loadAccounts, loadJournalTypes, loadBankAccounts, loadBanks, loadPaymentMethods, loadSequences]);

  // Sauvegarde automatique
  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasUnsavedChanges]);

  const markAsModified = useCallback(() => {
    if (!hasUnsavedChanges) setHasUnsavedChanges(true);
  }, [hasUnsavedChanges]);

  const handleChange = useCallback((field, value) => {
    setFormData(prev => {
      // Éviter les mises à jour inutiles
      if (prev[field] === value) return prev;
      return { ...prev, [field]: value };
    });
    markAsModified();
  }, [markAsModified]);

  // Vérifier si le type est Banque
  const isBankType = useCallback(() => {
    const bankCodes = ['BQ', 'BN', 'BAN', 'BANQUE'];
    return bankCodes.includes(formData.type_code) || 
           formData.type_code === 'BAN' ||
           formData.type_code === 'BANQUE' ||
           formData.type_code?.startsWith('BQ') ||
           formData.type_code?.startsWith('BN');
  }, [formData.type_code]);

  // Vérifier si le type est Caisse
  const isCashType = useCallback(() => {
    const cashCodes = ['CA', 'CS', 'CAI', 'CAISSE'];
    return cashCodes.includes(formData.type_code) || 
           formData.type_code?.startsWith('CA') ||
           formData.type_code?.startsWith('CS');
  }, [formData.type_code]);

  // Vérifier si le type est Banque ou Caisse (pour validation)
  const isBankOrCashType = useCallback(() => {
    return isBankType() || isCashType();
  }, [isBankType, isCashType]);

  const showFullAccounting = isBankOrCashType();
  const showBankSpecific = isBankType();
  const showCashSpecific = isCashType();

  // ==========================================
  // FONCTION DE VALIDATION DU FORMULAIRE
  // ==========================================
  const validateForm = useCallback((silent = false) => {
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
      
    } else {
      if (!formData.default_account_id) {
        if (!silent) setError('Le compte d\'achat par défaut est obligatoire');
        return false;
      }
    }

    return true;
  }, [activeEntity, formData, isBankType, isCashType]);

  // ==========================================
  // FONCTION POUR OBTENIR LES CHAMPS OBLIGATOIRES
  // ==========================================
  const getRequiredFields = useCallback(() => {
    if (!formData.type_id) return ['name', 'code', 'type_id'];
    
    if (isBankType()) {
      return [
        'name', 'code', 'type_id', 
        'bank_account_id', 'bank_acc_number', 'bank_id'
      ];
    } else if (isCashType()) {
      return [
        'name', 'code', 'type_id',
        'default_account_id', 'suspense_account_id', 
        'profit_account_id', 'loss_account_id'
      ];
    } else {
      return [
        'name', 'code', 'type_id', 'default_account_id'
      ];
    }
  }, [formData.type_id, isBankType, isCashType]);

  // Fonction pour obtenir les erreurs de champ
  const getFieldError = useCallback((field) => {
    if (!formData.type_id) return null;
    
    const requiredFields = getRequiredFields();
    if (!requiredFields.includes(field)) return null;
    
    const value = formData[field];
    if (!value || value === '') {
      return 'Ce champ est requis';
    }
    
    return null;
  }, [formData, getRequiredFields]);

  // ==========================================
  // PRÉPARATION DES DONNÉES POUR L'API - MODIFIÉE
  // ==========================================
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
      // ⚠️ Champs qui n'existent pas encore dans le backend - IGNORÉS
      // suspense_in_account_id: formData.suspense_account_in_id || null,
      // suspense_out_account_id: formData.suspense_account_out_id || null,
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
    
    // Nettoyer les valeurs vides
    Object.keys(apiData).forEach(key => {
      if (apiData[key] === undefined || apiData[key] === null || apiData[key] === '') {
        delete apiData[key];
      }
    });
    
    // Optionnel : Sauvegarder les champs ignorés dans la note pour ne pas perdre l'info
    if (formData.suspense_account_in_id || formData.suspense_account_out_id) {
      const ignoredFields = {
        suspense_in: formData.suspense_account_in_id,
        suspense_out: formData.suspense_account_out_id
      };
      apiData.note = apiData.note 
        ? apiData.note + '\n[Champs en attente backend] ' + JSON.stringify(ignoredFields)
        : '[Champs en attente backend] ' + JSON.stringify(ignoredFields);
    }
    
    return apiData;
  }, [formData, activeEntity]);

  // ==========================================
  // SAUVEGARDE
  // ==========================================
  const handleSave = async (silent = false) => {
    if (!validateForm(silent)) {
      return false;
    }

    setIsSubmitting(true);
    if (!silent) setError(null);

    try {
      const apiData = prepareDataForApi();
      console.log('📤 Données envoyées:', JSON.stringify(apiData, null, 2));
      
      await journauxService.update(id, apiData);

      if (!silent) {
        setSuccess('Journal mis à jour avec succès !');
      }
      setHasUnsavedChanges(false);
      
      if (!silent) {
        setTimeout(() => {
          navigate(`/comptabilite/journaux`);
        }, 1500);
      }
      
      return true;
      
    } catch (err) {
      console.error('❌ Erreur mise à jour:', err);
      
      if (err.response?.data) {
        console.error('📄 Détails erreur serveur:', err.response.data);
        if (!silent) {
          const errorData = err.response.data;
          let errorMsg = '';
          
          if (typeof errorData === 'object') {
            const messages = [];
            for (const [field, errors] of Object.entries(errorData)) {
              if (Array.isArray(errors)) {
                messages.push(`${field}: ${errors.join(', ')}`);
              } else if (typeof errors === 'string') {
                messages.push(`${field}: ${errors}`);
              }
            }
            errorMsg = messages.join(' • ');
          } else {
            errorMsg = JSON.stringify(errorData);
          }
          
          setError(`Erreur: ${errorMsg || 'Données invalides'}`);
        }
      } else {
        if (!silent) setError(`Erreur: ${err.message}`);
      }
      return false;
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDiscardChanges = () => setShowConfirmDialog(true);
  
  const confirmDiscardChanges = () => {
    navigate(`/comptabilite/journaux`);
  };

  const handleNewJournal = () => {
    if (hasUnsavedChanges) {
      if (window.confirm('Vous avez des modifications non sauvegardées. Voulez-vous vraiment quitter ?')) {
        navigate('/comptabilite/journaux/create');
      }
    } else {
      navigate('/comptabilite/journaux/create');
    }
  };

  const handleGoToList = () => {
    if (hasUnsavedChanges) {
      if (window.confirm('Vous avez des modifications non sauvegardées. Voulez-vous vraiment quitter ?')) {
        navigate('/comptabilite/journaux');
      }
    } else {
      navigate('/comptabilite/journaux');
    }
  };

  const handleDuplicate = () => {
    setShowActionsMenu(false);
    navigate(`/comptabilite/journaux/create?duplicate_from=${id}`);
  };

  const handleDelete = async () => {
    setShowActionsMenu(false);
    if (!window.confirm('Êtes-vous sûr de vouloir supprimer ce journal ?')) {
      return;
    }
    
    try {
      await journauxService.delete(id);
      setSuccess('Journal supprimé avec succès !');
      setTimeout(() => {
        navigate('/comptabilite/journaux');
      }, 1500);
    } catch (err) {
      console.error('❌ Erreur suppression:', err);
      setError(`Erreur lors de la suppression: ${err.message}`);
    }
  };

  const handleExtourner = () => {
    setShowActionsMenu(false);
    // TODO: Implémenter l'extourne
  };

  // ==========================================
  // RENDU CONDITIONNEL
  // ==========================================
  if (!activeEntity) {
    return (
      <div className="min-h-screen bg-gray-50 p-4">
        <div className="max-w-7xl mx-auto bg-white border border-gray-300">
          <div className="border-b border-gray-300 px-4 py-3">
            <div className="text-lg font-bold text-gray-900">Modifier le journal</div>
          </div>
          <div className="p-8">
            <div className="bg-yellow-50 border border-yellow-200 rounded p-6 text-center">
              <FiAlertCircle className="text-yellow-600 mx-auto mb-3" size={32} />
              <p className="text-yellow-800 font-medium text-lg mb-3">Aucune entité sélectionnée</p>
              <p className="text-sm text-gray-600 mb-4">
                Vous devez sélectionner une entité pour modifier un journal.
              </p>
              <button
                onClick={() => navigate('/comptabilite/journaux')}
                className="px-4 py-2 bg-purple-600 text-white text-sm hover:bg-purple-700 hover:scale-105 active:scale-95 transition-all duration-200"
              >
                Retour à la liste
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-4">
        <div className="max-w-7xl mx-auto bg-white border border-gray-300">
          <div className="border-b border-gray-300 px-4 py-3">
            <div className="text-lg font-bold text-gray-900">Chargement...</div>
          </div>
          <div className="p-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto"></div>
            <p className="text-sm text-gray-600 mt-4">Chargement des informations du journal...</p>
          </div>
        </div>
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="min-h-screen bg-gray-50 p-4">
        <div className="max-w-7xl mx-auto bg-white border border-gray-300">
          <div className="border-b border-gray-300 px-4 py-3">
            <div className="text-lg font-bold text-gray-900">Journal non trouvé</div>
          </div>
          <div className="p-8 text-center">
            <FiAlertCircle className="text-red-500 mx-auto mb-4" size={48} />
            <p className="text-gray-600 mb-4">
              Le journal que vous cherchez à modifier n'existe pas ou a été supprimé.
            </p>
            <button
              onClick={() => navigate('/comptabilite/journaux')}
              className="px-4 py-2 bg-purple-600 text-white text-sm hover:bg-purple-700 hover:scale-105 active:scale-95 transition-all duration-200"
            >
              Retour à la liste
            </button>
          </div>
        </div>
      </div>
    );
  }

  const requiredFields = getRequiredFields();
  const isFieldRequired = (fieldName) => requiredFields.includes(fieldName);

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-7xl mx-auto bg-white border border-gray-300">

        {/* En-tête ligne 1 */}
        <div className="border-b border-gray-300 px-4 py-3">
          <div className="flex items-start justify-between mb-2">
            <div className="flex items-start gap-3">
              <Tooltip text="Retour à la liste">
                <button 
                  onClick={handleGoToList}
                  className="h-8 px-3 border border-gray-300 text-gray-700 text-xs hover:bg-gray-50 hover:scale-105 hover:shadow-md active:scale-95 transition-all duration-200 flex items-center gap-1"
                >
                  <FiArrowLeft size={12} /><span>Liste</span>
                </button>
              </Tooltip>
              <Tooltip text="Créer un nouveau journal">
                <button 
                  onClick={handleNewJournal}
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
                    <button 
                      onClick={handleDuplicate} 
                      className="w-full px-3 py-2 text-xs text-left hover:bg-gray-50 hover:pl-4 transition-all duration-200 flex items-center gap-2 border-b border-gray-100"
                    >
                      <FiCopy size={12} /> Dupliquer
                    </button>
                    <button 
                      onClick={handleDelete} 
                      className="w-full px-3 py-2 text-xs text-left hover:bg-gray-50 hover:pl-4 transition-all duration-200 flex items-center gap-2 border-b border-gray-100 text-red-600"
                    >
                      <FiTrash2 size={12} /> Supprimer
                    </button>
                    <button 
                      onClick={handleExtourner} 
                      className="w-full px-3 py-2 text-xs text-left hover:bg-gray-50 hover:pl-4 transition-all duration-200 flex items-center gap-2"
                    >
                      <FiRotateCcw size={12} /> Extourné
                    </button>
                  </div>
                )}
              </div>
              <Tooltip text="Annuler les modifications">
                <button 
                  onClick={handleDiscardChanges}
                  className="h-8 px-3 border border-gray-300 text-gray-700 text-xs hover:bg-gray-50 hover:scale-105 hover:shadow-md active:scale-95 transition-all duration-200 flex items-center gap-1"
                >
                  <FiX size={12} /><span>Ignorer</span>
                </button>
              </Tooltip>
              <Tooltip text="Enregistrer les modifications">
                <button 
                  onClick={() => handleSave(false)} 
                  disabled={isSubmitting}
                  className="h-8 px-3 bg-purple-600 text-white text-xs hover:bg-purple-700 hover:scale-105 hover:shadow-md active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center gap-1"
                >
                  <FiSave size={12} /><span>Enregistrer</span>
                </button>
              </Tooltip>
            </div>
          </div>
        </div>

        {/* En-tête ligne 2 - Toggle Switch */}
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

        {/* Indicateur modifications */}
        {hasUnsavedChanges && (
          <div className="px-4 py-1 bg-blue-50 text-blue-700 text-xs border-b border-blue-200 flex items-center justify-between">
            <span>Modifications non sauvegardées</span>
            {isAutoSaving && <span className="animate-pulse">Sauvegarde en cours…</span>}
          </div>
        )}

        {/* Informations de base */}
        <div className="px-4 py-3 border-b border-gray-300">
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-start" style={{ minHeight: '26px' }}>
              <RequiredLabel required={isFieldRequired('name')}>Nom</RequiredLabel>
              <div className="flex-1 ml-2">
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => handleChange('name', e.target.value)}
                  className={`w-full px-2 py-1 border text-xs hover:border-purple-400 focus:border-purple-600 transition-colors ${
                    getFieldError('name') ? 'border-red-300 bg-red-50' : 'border-gray-300'
                  }`}
                  style={{ height: '26px' }}
                  placeholder="Journal des achats"
                  maxLength="64"
                />
                {getFieldError('name') && (
                  <p className="text-red-500 text-xs mt-1">{getFieldError('name')}</p>
                )}
              </div>
            </div>
            <div className="flex items-start" style={{ minHeight: '26px' }}>
              <RequiredLabel required={isFieldRequired('code')}>Code</RequiredLabel>
              <div className="flex-1 ml-2">
                <input
                  type="text"
                  value={formData.code}
                  onChange={(e) => handleChange('code', e.target.value.toUpperCase().slice(0, 8))}
                  className={`w-full px-2 py-1 border text-xs hover:border-purple-400 focus:border-purple-600 transition-colors ${
                    getFieldError('code') ? 'border-red-300 bg-red-50' : 'border-gray-300'
                  }`}
                  style={{ height: '26px' }}
                  placeholder="ACH"
                  maxLength="8"
                />
                {getFieldError('code') && (
                  <p className="text-red-500 text-xs mt-1">{getFieldError('code')}</p>
                )}
              </div>
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4 mt-2">
            <div className="flex items-start" style={{ minHeight: '26px' }}>
              <RequiredLabel required={isFieldRequired('type_id')}>Type</RequiredLabel>
              <div className="flex-1 ml-2">
                <JournalTypeSelect
                  value={formData.type_id}
                  onChange={(id) => {
                    const selectedType = journalTypes.find(t => t.id === id);
                    handleChange('type_id', id);
                    handleChange('type_code', selectedType?.code || '');
                  }}
                  options={journalTypes}
                  placeholder="Type de journal"
                  loading={loadingTypes}
                  error={!!getFieldError('type_id')}
                />
                {getFieldError('type_id') && (
                  <p className="text-red-500 text-xs mt-1">{getFieldError('type_id')}</p>
                )}
              </div>
            </div>
            <div className="flex items-center" style={{ height: '26px' }}>
            </div>
          </div>
        </div>

        {/* Onglets - 4 ONGLETS */}
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

        {/* Contenu onglets */}
        <div className="p-4">
          {activeTab === 'comptable' && (
            <div className="space-y-3">
              {loadingAccounts && (
                <div className="text-xs text-purple-600 flex items-center gap-2 mb-2">
                  <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-purple-600"></div>
                  Chargement des comptes...
                </div>
              )}

              {formData.type_id ? (
                <>
                  {/* SECTION POUR TYPE BANQUE */}
                  {showBankSpecific && (
                    <div className="space-y-3">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="flex items-start" style={{ minHeight: '26px' }}>
                          <RequiredLabel required={isFieldRequired('bank_account_id')}>
                            Compte bancaire lié
                          </RequiredLabel>
                          <div className="flex-1 ml-2">
                            <div className={`border ${
                              getFieldError('bank_account_id') ? 'border-red-300' : 'border-gray-300 hover:border-purple-400'
                            } transition-colors`} style={{ height: '26px' }}>
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
                                loading={loadingBankAccounts}
                                error={!!getFieldError('bank_account_id')}
                              />
                            </div>
                            {getFieldError('bank_account_id') && (
                              <p className="text-red-500 text-xs mt-1">{getFieldError('bank_account_id')}</p>
                            )}
                          </div>
                        </div>
                        
                        <div className="flex items-start" style={{ minHeight: '26px' }}>
                          <RequiredLabel required={isFieldRequired('bank_acc_number')}>
                            Numéro de compte
                          </RequiredLabel>
                          <div className="flex-1 ml-2">
                            <input
                              type="text"
                              value={formData.bank_acc_number || ''}
                              onChange={(e) => handleChange('bank_acc_number', e.target.value)}
                              className={`w-full px-2 py-1 border text-xs hover:border-purple-400 focus:border-purple-600 transition-colors ${
                                getFieldError('bank_acc_number') ? 'border-red-300 bg-red-50' : 'border-gray-300'
                              }`}
                              style={{ height: '26px' }}
                              placeholder="FR76 3000 4001 2300 0123 4567 89"
                            />
                            {getFieldError('bank_acc_number') && (
                              <p className="text-red-500 text-xs mt-1">{getFieldError('bank_acc_number')}</p>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="flex items-start" style={{ minHeight: '26px' }}>
                          <RequiredLabel required={isFieldRequired('bank_id')}>
                            Banque
                          </RequiredLabel>
                          <div className="flex-1 ml-2">
                            <div className={`border ${
                              getFieldError('bank_id') ? 'border-red-300' : 'border-gray-300 hover:border-purple-400'
                            } transition-colors`} style={{ height: '26px' }}>
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
                                loading={loadingBanks}
                                error={!!getFieldError('bank_id')}
                              />
                            </div>
                            {getFieldError('bank_id') && (
                              <p className="text-red-500 text-xs mt-1">{getFieldError('bank_id')}</p>
                            )}
                          </div>
                        </div>
                        
                        <div className="flex items-center" style={{ height: '26px' }}>
                          <RequiredLabel required={false}>
                            Source des relevés
                          </RequiredLabel>
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
                          <RequiredLabel required={false}>
                            Import relevés bancaires
                          </RequiredLabel>
                          <div className="flex-1 ml-2 flex items-center">
                            <input
                              type="checkbox"
                              checked={formData.import_bank_statements}
                              onChange={(e) => handleChange('import_bank_statements', e.target.checked)}
                              className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded"
                            />
                            <span className="ml-2 text-xs text-gray-600">
                              Activer l'import automatique
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center" style={{ height: '26px' }}>
                        </div>
                      </div>

                      <div className="mt-2 p-2 rounded bg-blue-50 border border-blue-200">
                        <p className="text-xs flex items-center gap-1 text-blue-700">
                          <FiInfo size={12} />
                          Journal de type Banque - Les informations bancaires remplacent les comptes standard.
                        </p>
                      </div>
                    </div>
                  )}

                  {/* SECTION POUR TYPE CAISSE */}
                  {showCashSpecific && (
                    <div className="space-y-3">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="flex items-start" style={{ minHeight: '26px' }}>
                          <RequiredLabel required={isFieldRequired('default_account_id')}>
                            Compte d'achat par défaut
                          </RequiredLabel>
                          <div className="flex-1 ml-2">
                            <div className={`border ${
                              getFieldError('default_account_id') ? 'border-red-300' : 'border-gray-300 hover:border-purple-400'
                            } transition-colors`} style={{ height: '26px' }}>
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
                                loading={loadingAccounts}
                                error={!!getFieldError('default_account_id')}
                              />
                            </div>
                            {getFieldError('default_account_id') && (
                              <p className="text-red-500 text-xs mt-1">{getFieldError('default_account_id')}</p>
                            )}
                          </div>
                        </div>
                        
                        <div className="flex items-start" style={{ minHeight: '26px' }}>
                          <RequiredLabel required={isFieldRequired('suspense_account_id')}>
                            Compte d'attente
                          </RequiredLabel>
                          <div className="flex-1 ml-2">
                            <div className={`border ${
                              getFieldError('suspense_account_id') ? 'border-red-300' : 'border-gray-300 hover:border-purple-400'
                            } transition-colors`} style={{ height: '26px' }}>
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
                                loading={loadingAccounts}
                                error={!!getFieldError('suspense_account_id')}
                              />
                            </div>
                            {getFieldError('suspense_account_id') && (
                              <p className="text-red-500 text-xs mt-1">{getFieldError('suspense_account_id')}</p>
                            )}
                          </div>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4">
                        <div className="flex items-start" style={{ minHeight: '26px' }}>
                          <RequiredLabel required={isFieldRequired('profit_account_id')}>
                            Compte de profit
                          </RequiredLabel>
                          <div className="flex-1 ml-2">
                            <div className={`border ${
                              getFieldError('profit_account_id') ? 'border-red-300' : 'border-gray-300 hover:border-purple-400'
                            } transition-colors`} style={{ height: '26px' }}>
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
                                loading={loadingAccounts}
                                error={!!getFieldError('profit_account_id')}
                              />
                            </div>
                            {getFieldError('profit_account_id') && (
                              <p className="text-red-500 text-xs mt-1">{getFieldError('profit_account_id')}</p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-start" style={{ minHeight: '26px' }}>
                          <RequiredLabel required={isFieldRequired('loss_account_id')}>
                            Compte de perte
                          </RequiredLabel>
                          <div className="flex-1 ml-2">
                            <div className={`border ${
                              getFieldError('loss_account_id') ? 'border-red-300' : 'border-gray-300 hover:border-purple-400'
                            } transition-colors`} style={{ height: '26px' }}>
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
                                loading={loadingAccounts}
                                error={!!getFieldError('loss_account_id')}
                              />
                            </div>
                            {getFieldError('loss_account_id') && (
                              <p className="text-red-500 text-xs mt-1">{getFieldError('loss_account_id')}</p>
                            )}
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

                  {/* SECTION POUR AUTRES TYPES */}
                  {!showBankSpecific && !showCashSpecific && (
                    <div className="space-y-3">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="flex items-start" style={{ minHeight: '26px' }}>
                          <RequiredLabel required={isFieldRequired('default_account_id')}>
                            Compte d'achat par défaut
                          </RequiredLabel>
                          <div className="flex-1 ml-2">
                            <div className={`border ${
                              getFieldError('default_account_id') ? 'border-red-300' : 'border-gray-300 hover:border-purple-400'
                            } transition-colors`} style={{ height: '26px' }}>
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
                                loading={loadingAccounts}
                                error={!!getFieldError('default_account_id')}
                              />
                            </div>
                            {getFieldError('default_account_id') && (
                              <p className="text-red-500 text-xs mt-1">{getFieldError('default_account_id')}</p>
                            )}
                          </div>
                        </div>
                        
                        <div className="flex items-center" style={{ height: '26px' }}>
                        </div>
                      </div>

                      <div className="mt-2 p-2 rounded bg-gray-50 border border-gray-200">
                        <p className="text-xs flex items-center gap-1 text-gray-600">
                          <FiInfo size={12} />
                          Seul le compte d'achat par défaut est requis pour ce type de journal.
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
              {loadingBanks && (
                <div className="text-xs text-purple-600 flex items-center gap-2 mb-2">
                  <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-purple-600"></div>
                  Chargement des banques...
                </div>
              )}
              {loadingPayments && (
                <div className="text-xs text-purple-600 flex items-center gap-2 mb-2">
                  <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-purple-600"></div>
                  Chargement des méthodes de paiement...
                </div>
              )}

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
                      disabled={loadingPayments}
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
                      disabled={loadingPayments}
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
                <div className="flex items-start" style={{ minHeight: '26px' }}>
                  <RequiredLabel required={false}>Compte suspens entrant</RequiredLabel>
                  <div className="flex-1 ml-2">
                    <div className="border border-gray-300 hover:border-purple-400 transition-colors" style={{ height: '26px' }}>
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
                        loading={loadingAccounts}
                      />
                    </div>
                    <div className="text-xs text-gray-400 mt-1 italic">
                      ⏳ Champ en attente d'implémentation backend
                    </div>
                  </div>
                </div>
                
                <div className="flex items-start" style={{ minHeight: '26px' }}>
                  <RequiredLabel required={false}>Compte suspens sortant</RequiredLabel>
                  <div className="flex-1 ml-2">
                    <div className="border border-gray-300 hover:border-purple-400 transition-colors" style={{ height: '26px' }}>
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
                        loading={loadingAccounts}
                      />
                    </div>
                    <div className="text-xs text-gray-400 mt-1 italic">
                      ⏳ Champ en attente d'implémentation backend
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'numerotation' && (
            <div className="space-y-3">
              {loadingSequences && (
                <div className="text-xs text-purple-600 flex items-center gap-2 mb-2">
                  <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-purple-600"></div>
                  Chargement des séquences...
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-start" style={{ minHeight: '26px' }}>
                  <RequiredLabel required={false}>Séquence de numérotation</RequiredLabel>
                  <div className="flex-1 ml-2">
                    <div className="border border-gray-300 hover:border-purple-400 transition-colors" style={{ height: '26px' }}>
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
                        loading={loadingSequences}
                      />
                    </div>
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
                  <div className="flex items-start" style={{ minHeight: '26px' }}>
                    <RequiredLabel required={false}>Séquence des avoirs</RequiredLabel>
                    <div className="flex-1 ml-2">
                      <div className="border border-gray-300 hover:border-purple-400 transition-colors" style={{ height: '26px' }}>
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
                          loading={loadingSequences}
                        />
                      </div>
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