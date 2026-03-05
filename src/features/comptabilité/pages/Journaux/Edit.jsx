// C:\Users\IBM\Documents\somane_frontend\src\features\comptabilité\pages\Journaux\Edit.jsx

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { 
  FiPlus,
  // FiEdit,  // Commenté car non utilisé
  FiTrash2, 
  FiX,
  FiBriefcase,
  FiMail,
  FiCreditCard,
  FiDollarSign,
  FiInfo,
  // FiSave,  // Commenté car non utilisé
  FiAlertCircle,
  FiCheck,
  FiUploadCloud,
  FiCopy,
  FiRotateCcw,
  FiSettings
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
  loading = false
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
  loading = false
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
        className={`w-full h-[26px] px-2 border border-gray-300 text-xs flex items-center justify-between cursor-pointer hover:border-purple-400 bg-white ${disabled || loading ? 'bg-gray-100 cursor-not-allowed' : ''}`}
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
  const [loadingPayments, setLoadingPayments] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [showActionsMenu, setShowActionsMenu] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [activeTab, setActiveTab] = useState('comptable');
  
  const [accounts, setAccounts] = useState([]);
  const [journalTypes, setJournalTypes] = useState([]);
  const [bankAccounts, setBankAccounts] = useState([]);
  const [paymentMethods, setPaymentMethods] = useState([]);
  
  // État du formulaire
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
    email: '',
    payment_method_in: [],
    payment_method_out: [],
    note: '',
    active: true
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
      console.log('✅ Comptes chargés:', accounts.length);
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
      console.log('✅ Types de journal chargés:', journalTypes.length);
    } catch (err) {
      console.warn('⚠️ Erreur chargement types:', err);
    } finally {
      setLoadingTypes(false);
    }
  }, [journalTypes.length]);

  const loadBankAccounts = useCallback(async () => {
    if (bankAccounts.length > 0) return;
    
    setLoadingBanks(true);
    try {
      const response = await apiClient.get('/banques-partenaires/');
      setBankAccounts(normalizeApiResponse(response));
      console.log('✅ Banques chargées:', bankAccounts.length);
    } catch (err) {
      console.warn('⚠️ Erreur chargement banques:', err);
    } finally {
      setLoadingBanks(false);
    }
  }, [bankAccounts.length]);

  const loadPaymentMethods = useCallback(async () => {
    if (paymentMethods.length > 0) return;
    
    setLoadingPayments(true);
    try {
      const response = await apiClient.get('/compta/payment-methods/');
      setPaymentMethods(normalizeApiResponse(response));
      console.log('✅ Méthodes de paiement chargées:', paymentMethods.length);
    } catch (err) {
      console.log('ℹ️ Méthodes de paiement non disponibles');
    } finally {
      setLoadingPayments(false);
    }
  }, [paymentMethods.length]);

  // Chargement du journal
  const loadJournal = useCallback(async () => {
    if (!activeEntity) {
      setError('Vous devez sélectionner une entité');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    
    try {
      console.log('🔍 Chargement du journal ID:', id);
      const journalData = await journauxService.getById(id);
      console.log('📋 Journal chargé:', journalData);
      
      // Pré-remplir le formulaire
      setFormData({
        name: journalData.name || '',
        code: journalData.code || '',
        type_id: journalData.type?.id || journalData.type_id || '',
        type_code: journalData.type?.code || journalData.type_code || '',
        default_account_id: journalData.default_account?.id || journalData.default_account_id || '',
        default_account_name: journalData.default_account ? 
          `${journalData.default_account.code || ''} - ${journalData.default_account.name || ''}`.trim() : '',
        profit_account_id: journalData.profit_account?.id || journalData.profit_account_id || journalData.profit_account || '',
        profit_account_name: journalData.profit_account && typeof journalData.profit_account === 'object' ? 
          `${journalData.profit_account.code || ''} - ${journalData.profit_account.name || ''}`.trim() : '',
        loss_account_id: journalData.loss_account?.id || journalData.loss_account_id || journalData.loss_account || '',
        loss_account_name: journalData.loss_account && typeof journalData.loss_account === 'object' ? 
          `${journalData.loss_account.code || ''} - ${journalData.loss_account.name || ''}`.trim() : '',
        suspense_account_id: journalData.suspense_account?.id || journalData.suspense_account_id || journalData.suspense_account || '',
        suspense_account_name: journalData.suspense_account && typeof journalData.suspense_account === 'object' ? 
          `${journalData.suspense_account.code || ''} - ${journalData.suspense_account.name || ''}`.trim() : '',
        suspense_account_in_id: journalData.suspense_in_account?.id || journalData.suspense_in_account_id || '',
        suspense_account_in_name: journalData.suspense_in_account && typeof journalData.suspense_in_account === 'object' ? 
          `${journalData.suspense_in_account.code || ''} - ${journalData.suspense_in_account.name || ''}`.trim() : '',
        suspense_account_out_id: journalData.suspense_out_account?.id || journalData.suspense_out_account_id || '',
        suspense_account_out_name: journalData.suspense_out_account && typeof journalData.suspense_out_account === 'object' ? 
          `${journalData.suspense_out_account.code || ''} - ${journalData.suspense_out_account.name || ''}`.trim() : '',
        bank_account_id: journalData.bank_account?.id || journalData.bank_account_id || '',
        bank_account_name: journalData.bank_account ? getBankAccountLabel(journalData.bank_account) : '',
        email: journalData.email || activeEntity?.email || '',
        payment_method_in: journalData.inbound_payment_methods?.map(m => m.id) || 
                          journalData.inbound_payment_method_ids || [],
        payment_method_out: journalData.outbound_payment_methods?.map(m => m.id) || 
                           journalData.outbound_payment_method_ids || [],
        note: journalData.note || '',
        active: journalData.active !== false
      });

    } catch (err) {
      console.error('❌ Erreur chargement:', err);
      setError(err.message || 'Erreur lors du chargement du journal');
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
      // Charger les autres données en parallèle
      await Promise.all([
        loadAccounts(),
        loadJournalTypes(),
        loadBankAccounts(),
        loadPaymentMethods()
      ]);
    };
    
    loadData();
    
    return () => {
      console.log('🧹 Nettoyage du composant');
    };
  }, [activeEntity, loadJournal, loadAccounts, loadJournalTypes, loadBankAccounts, loadPaymentMethods]);

  const markAsModified = () => {
    if (!hasUnsavedChanges) setHasUnsavedChanges(true);
  };

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    markAsModified();
  };

  // Vérifier si le type est Banque ou Caisse
  const isBankOrCashType = useCallback(() => {
    const typeCode = formData.type_code || '';
    const bankCashCodes = ['BQ', 'CA', 'BN', 'CS'];
    return bankCashCodes.includes(typeCode) || 
           typeCode?.startsWith('B') || 
           typeCode?.startsWith('C');
  }, [formData.type_code]);

  const showFullAccounting = isBankOrCashType();

  // ==========================================
  // PRÉPARATION DES DONNÉES POUR L'API
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
      suspense_in_account_id: formData.suspense_account_in_id || null,
      suspense_out_account_id: formData.suspense_account_out_id || null,
      bank_account_id: formData.bank_account_id || null,
      email: formData.email || null,
      note: formData.note || '',
      active: formData.active,
      use_refund_sequence: false,
      import_bank_statements: false,
      inbound_payment_method_ids: formData.payment_method_in.length ? formData.payment_method_in : [],
      outbound_payment_method_ids: formData.payment_method_out.length ? formData.payment_method_out : []
    };
    
    Object.keys(apiData).forEach(key => {
      if (apiData[key] === undefined || apiData[key] === '' || 
          (Array.isArray(apiData[key]) && apiData[key].length === 0)) {
        delete apiData[key];
      }
    });
    
    return apiData;
  }, [formData, activeEntity]);

  // ==========================================
  // SAUVEGARDE
  // ==========================================
  const handleSave = async (silent = false) => {
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

    // Validation selon le type de journal
    if (showFullAccounting) {
      if (!formData.default_account_id) {
        if (!silent) setError('Le compte d\'achat par défaut est obligatoire pour un journal de type Banque/Caisse');
        return false;
      }
      if (!formData.suspense_account_id) {
        if (!silent) setError('Le compte d\'attente est obligatoire pour un journal de type Banque/Caisse');
        return false;
      }
      if (!formData.profit_account_id) {
        if (!silent) setError('Le compte de profit est obligatoire pour un journal de type Banque/Caisse');
        return false;
      }
      if (!formData.loss_account_id) {
        if (!silent) setError('Le compte de perte est obligatoire pour un journal de type Banque/Caisse');
        return false;
      }
    } else {
      if (!formData.default_account_id) {
        if (!silent) setError('Le compte d\'achat par défaut est obligatoire');
        return false;
      }
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
          navigate(`/comptabilite/journaux/${id}`);
        }, 1500);
      }
      
      return true;
      
    } catch (err) {
      console.error('❌ Erreur mise à jour:', err);
      if (!silent) setError(`Erreur: ${err.message}`);
      return false;
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDiscardChanges = () => setShowConfirmDialog(true);
  
  const confirmDiscardChanges = () => {
    navigate(`/comptabilite/journaux/${id}`);
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

  const handleDuplicate = () => {
    setShowActionsMenu(false);
  };

  const handleDelete = () => {
    setShowActionsMenu(false);
    setShowConfirmDialog(true);
  };

  const handleExtourner = () => {
    setShowActionsMenu(false);
  };

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
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto mb-4"></div>
            <p className="text-sm text-gray-600">Chargement des informations du journal...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-7xl mx-auto bg-white border border-gray-300">

        {/* En-tête ligne 1 */}
        <div className="border-b border-gray-300 px-4 py-3">
          <div className="flex items-start justify-between mb-2">
            <div className="flex items-start gap-3">
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
                  Journaux
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
                    <button onClick={handleExtourner} className="w-full px-3 py-2 text-xs text-left hover:bg-gray-50 hover:pl-4 transition-all duration-200 flex items-center gap-2">
                      <FiRotateCcw size={12} /> Extourné
                    </button>
                  </div>
                )}
              </div>
              <Tooltip text="Annuler les modifications">
                <button 
                  onClick={handleDiscardChanges}
                  className="w-8 h-8 rounded-full bg-black text-white hover:bg-gray-800 hover:scale-110 hover:shadow-lg active:scale-90 transition-all duration-200 flex items-center justify-center"
                >
                  <FiX size={16} />
                </button>
              </Tooltip>
              <Tooltip text="Enregistrer les modifications">
                <button 
                  onClick={() => handleSave(false)} 
                  disabled={isSubmitting}
                  className="w-8 h-8 rounded-full bg-purple-600 text-white hover:bg-purple-700 hover:scale-110 hover:shadow-lg active:scale-90 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center shadow-sm"
                >
                  <FiUploadCloud size={16} />
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
            <span className={`text-sm font-medium ${formData.active ? 'text-green-600' : 'text-gray-500'}`}>
              {formData.active ? 'Activé' : 'Désactivé'}
            </span>
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
          </div>
        )}

        {/* Informations de base */}
        <div className="px-4 py-3 border-b border-gray-300">
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center" style={{ height: '26px' }}>
              <label className="text-xs text-gray-700 w-24 font-medium">Nom</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => handleChange('name', e.target.value)}
                className="flex-1 px-2 py-1 border border-gray-300 text-xs ml-2 hover:border-purple-400 focus:border-purple-600 transition-colors"
                style={{ height: '26px' }}
                placeholder="Journal des achats"
                maxLength="64"
              />
            </div>
            <div className="flex items-center" style={{ height: '26px' }}>
              <label className="text-xs text-gray-700 w-24 font-medium">Code</label>
              <input
                type="text"
                value={formData.code}
                onChange={(e) => handleChange('code', e.target.value.toUpperCase().slice(0, 8))}
                className="flex-1 px-2 py-1 border border-gray-300 text-xs ml-2 hover:border-purple-400 focus:border-purple-600 transition-colors"
                style={{ height: '26px' }}
                placeholder="ACH"
                maxLength="8"
              />
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4 mt-2">
            <div className="flex items-center" style={{ height: '26px' }}>
              <label className="text-xs text-gray-700 w-24 font-medium">Type</label>
              <div className="flex-1 ml-2" style={{ height: '26px' }}>
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
                />
              </div>
            </div>
            <div className="flex items-center" style={{ height: '26px' }}>
              {/* Cellule vide */}
            </div>
          </div>
        </div>

        {/* Onglets */}
        <div className="border-b border-gray-300">
          <div className="px-4 flex">
            {['comptable', 'avance', 'notes'].map(tab => (
              <button 
                key={tab} 
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-2 text-xs font-medium border-b-2 transition-all duration-200 ${
                  activeTab === tab 
                    ? 'border-purple-600 text-purple-600 hover:text-purple-800' 
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {tab === 'comptable' ? 'Paramètres comptables' : tab === 'avance' ? 'Paramètres avancés' : 'Notes'}
              </button>
            ))}
          </div>
        </div>

        {/* Contenu onglets avec affichage conditionnel */}
        <div className="p-4">
          {activeTab === 'comptable' && (
            <div className="space-y-3">
              {/* Indicateur de chargement des comptes */}
              {loadingAccounts && (
                <div className="text-xs text-purple-600 flex items-center gap-2 mb-2">
                  <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-purple-600"></div>
                  Chargement des comptes...
                </div>
              )}

              {/* Première ligne - Compte d'achat par défaut TOUJOURS présent */}
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center" style={{ height: '26px' }}>
                  <label className="text-xs text-gray-700 w-40 font-medium">
                    Compte d'achat par défaut
                    <span className="text-red-500 ml-1">*</span>
                  </label>
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
                      required
                      loading={loadingAccounts}
                    />
                  </div>
                </div>
                
                {/* Deuxième colonne - Affiche le compte d'attente uniquement pour Banque/Caisse */}
                <div className="flex items-center" style={{ height: '26px' }}>
                  {formData.type_id ? (
                    showFullAccounting ? (
                      <>
                        <label className="text-xs text-gray-700 w-40 font-medium">
                          Compte d'attente
                          <span className="text-red-500 ml-1">*</span>
                        </label>
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
                            required
                            loading={loadingAccounts}
                          />
                        </div>
                      </>
                    ) : (
                      <div className="w-full"></div>
                    )
                  ) : (
                    <div className="text-xs text-gray-400 italic ml-2">
                      Sélectionnez un type pour voir les champs supplémentaires
                    </div>
                  )}
                </div>
              </div>
              
              {/* Deuxième ligne - Comptes profit et perte (UNIQUEMENT pour Banque/Caisse) */}
              {formData.type_id && showFullAccounting && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center" style={{ height: '26px' }}>
                    <label className="text-xs text-gray-700 w-40 font-medium">
                      Compte de profit
                      <span className="text-red-500 ml-1">*</span>
                    </label>
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
                        required
                        loading={loadingAccounts}
                      />
                    </div>
                  </div>
                  <div className="flex items-center" style={{ height: '26px' }}>
                    <label className="text-xs text-gray-700 w-40 font-medium">
                      Compte de perte
                      <span className="text-red-500 ml-1">*</span>
                    </label>
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
                        required
                        loading={loadingAccounts}
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Message d'information */}
              {formData.type_id && (
                <div className={`mt-2 p-2 rounded ${showFullAccounting ? 'bg-blue-50 border border-blue-200' : 'bg-gray-50 border border-gray-200'}`}>
                  <p className={`text-xs flex items-center gap-1 ${showFullAccounting ? 'text-blue-700' : 'text-gray-600'}`}>
                    <FiInfo size={12} />
                    {showFullAccounting 
                      ? "Tous les comptes sont obligatoires pour les journaux de type Banque et Caisse."
                      : "Seul le compte d'achat par défaut est requis pour ce type de journal."}
                  </p>
                </div>
              )}
            </div>
          )}

          {activeTab === 'avance' && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center" style={{ height: '26px' }}>
                  <label className="text-xs text-gray-700 w-40 font-medium">Société</label>
                  <div className="flex-1 ml-2 px-2 py-1 bg-gray-100 border border-gray-300 text-xs text-gray-700 flex items-center gap-2" style={{ height: '26px' }}>
                    <FiBriefcase size={12} className="text-purple-600" />
                    {activeEntity?.raison_sociale || activeEntity?.nom || 'Non définie'}
                  </div>
                </div>
                
                <div className="flex items-center" style={{ height: '26px' }}>
                  <label className="text-xs text-gray-700 w-40 font-medium">Compte bancaire</label>
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
                      placeholder="Compte bancaire (optionnel)"
                      loading={loadingBanks}
                    />
                  </div>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center" style={{ height: '26px' }}>
                  <label className="text-xs text-gray-700 w-40 font-medium">E-mail</label>
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
                
                <div className="flex items-center" style={{ height: '26px' }}>
                  <label className="text-xs text-gray-700 w-40 font-medium">Mode de paiement entrant</label>
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
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center" style={{ height: '26px' }}>
                  <label className="text-xs text-gray-700 w-40 font-medium">Mode de paiement sortant</label>
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
                
                <div className="flex items-center" style={{ height: '26px' }}>
                  <label className="text-xs text-gray-700 w-40 font-medium">Compte de paiement entrant en suspens</label>
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
                      loading={loadingAccounts}
                    />
                  </div>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center" style={{ height: '26px' }}>
                  <label className="text-xs text-gray-700 w-40 font-medium">Compte de paiement sortant en suspens</label>
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
                      loading={loadingAccounts}
                    />
                  </div>
                </div>
                
                <div className="flex items-center" style={{ height: '26px' }}>
                  <label className="text-xs text-gray-700 w-40 font-medium"> </label>
                  <div className="flex-1 ml-2"></div>
                </div>
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

        {/* Messages */}
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

      {/* Dialogue confirmation */}
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