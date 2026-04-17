// C:\Users\IBM\Documents\somane_frontend\src\features\comptabilité\pages\Pieces\Create.jsx

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  FiPlus, 
  FiTrash2, 
  FiCheck, 
  FiPaperclip, 
  FiUpload, 
  FiCopy, 
  FiRotateCcw, 
  FiSave, 
  FiX, 
  FiAlertCircle, 
  FiBriefcase,
  FiUploadCloud,
  FiSettings,
  FiInfo
} from 'react-icons/fi';
import { useEntity } from '../../../../context/EntityContext';
import { piecesService } from "../../services";

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
// COMPOSANT AUTOCOMPLETE RÉUTILISABLE
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

  useEffect(() => {
    if (isOpen && dropdownRef.current && filteredOptions.length > 0) {
      const highlightedElement = dropdownRef.current.children[highlightedIndex];
      if (highlightedElement) {
        highlightedElement.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [highlightedIndex, isOpen, filteredOptions.length]);

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
        className={`w-full px-2 py-1 text-xs focus:ring-1 focus:ring-blue-500 focus:outline-none ${className}`}
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
                  ? 'bg-blue-100 text-blue-700'
                  : 'hover:bg-blue-50'
              } ${option.id === selectedId ? 'bg-blue-50' : ''}`}
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
// COMPOSANT PRINCIPAL
// ==========================================
export default function Create() {
  const navigate = useNavigate();
  const { activeEntity } = useEntity();

  const [loading, setLoading] = useState(false);
  const [journals, setJournals] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [partners, setPartners] = useState([]);
  const [devises, setDevises] = useState([]);
  const [taxes, setTaxes] = useState([]);
  const [users, setUsers] = useState([]);
  const [fiscalPositions, setFiscalPositions] = useState([]);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [activeTab, setActiveTab] = useState('ecritures');
  const [showActionsMenu, setShowActionsMenu] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [pieceId, setPieceId] = useState(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isAutoSaving, setIsAutoSaving] = useState(false);
  const today = new Date().toISOString().split('T')[0];
  const tableContainerRef = useRef(null);

  const actionsMenuRef = useRef(null);

  useEffect(() => {
    if (!activeEntity) {
      setError('Vous devez sélectionner une entité pour créer une pièce comptable');
    }
  }, [activeEntity]);

  const emptyLine = () => ({
    name: '',
    account_id: '',
    account_label: '',
    partner_id: '',
    partner_label: '',
    debit: '',
    credit: '',
    tax_id: '',
    tax_label: '',
    tax_base_amount: '',
    date_maturity: '',
    discount_amount_currency: '',
    discount_percentage: '',
    discount_date: '',
  });

  const initialFormData = {
    name: '',
    state: 'draft',
    move_type: 'entry',
    date: today,
    registration_date: today,
    ref: '',
    currency_id: '',
    currency_label: '',
    journal_id: '',
    journal_label: '',
    partner_id: '',
    partner_label: '',
    invoice_date: today,
    invoice_date_due: '',
    invoice_user_id: '',
    invoice_user_label: '',
    invoice_origin: '',
    fiscal_position_id: '',
    fiscal_position_label: '',
    payment_reference: '',
    lines: [emptyLine()],
    notes: '',
    attachments: []
  };

  const [formData, setFormData] = useState(initialFormData);

  useEffect(() => {
    if (activeEntity) {
      loadOptions();
    }
  }, [activeEntity]);

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
    setError(null);
    try {
      const [
        journalsData, 
        accountsData, 
        partnersData, 
        devisesData, 
        taxesData,
        usersData,
        fiscalPositionsData
      ] = await Promise.all([
        piecesService.getJournals(activeEntity.id),
        piecesService.getAccounts(activeEntity.id),
        piecesService.getPartners(activeEntity.id),
        piecesService.getDevises(activeEntity.id),
        piecesService.getTaxes?.(activeEntity.id) || Promise.resolve([]),
        piecesService.getUsers?.(activeEntity.id) || Promise.resolve([]),
        piecesService.getFiscalPositions?.(activeEntity.id) || Promise.resolve([]),
      ]);

      const normalizeData = (data) => {
        if (!data) return [];
        if (Array.isArray(data)) return data;
        if (Array.isArray(data.results)) return data.results;
        if (Array.isArray(data.data)) return data.data;
        return [];
      };

      setJournals(normalizeData(journalsData));
      
      const normalizedAccounts = normalizeData(accountsData);
      console.log('📊 Comptes reçus de l\'API:', normalizedAccounts.length);
      setAccounts(normalizedAccounts);
      
      setPartners(normalizeData(partnersData));
      setDevises(normalizeData(devisesData));
      setTaxes(normalizeData(taxesData));
      setUsers(normalizeData(usersData));
      setFiscalPositions(normalizeData(fiscalPositionsData));

      const normalizedDevises = normalizeData(devisesData);
      let defaultCurrencyId = '';
      let defaultCurrencyLabel = '';
      if (normalizedDevises.length > 0) {
        const fcfaDevise = normalizedDevises.find(d => d.code === 'XOF' || d.code === 'FCFA');
        const defaultCurrency = fcfaDevise || normalizedDevises[0];
        defaultCurrencyId    = defaultCurrency.id;
        defaultCurrencyLabel = `${defaultCurrency.code}${defaultCurrency.symbole ? ` (${defaultCurrency.symbole})` : ''}`;
      }

      setFormData(prev => ({
        ...prev,
        currency_id: defaultCurrencyId,
        currency_label: defaultCurrencyLabel,
      }));
    } catch (err) {
      console.error('❌ Erreur chargement options:', err);
      setError('Erreur lors du chargement des données.');
    }
  };

  const markAsModified = () => {
    if (!hasUnsavedChanges) setHasUnsavedChanges(true);
  };

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    markAsModified();
  };

  const handleLineChange = (index, field, value) => {
    setFormData(prev => {
      const newLines = [...prev.lines];
      newLines[index] = { ...newLines[index], [field]: value };
      return { ...prev, lines: newLines };
    });
    markAsModified();
  };

  // ✅ NOUVELLE FONCTION : Gère la saisie Débit/Crédit (un seul des deux)
  const handleAmountChange = (index, type, value) => {
    const numValue = value === '' ? '' : parseFloat(value);
    
    setFormData(prev => {
      const newLines = [...prev.lines];
      
      if (type === 'debit') {
        // Si on saisit un débit, on met le crédit à 0
        newLines[index] = { 
          ...newLines[index], 
          debit: numValue === '' ? '' : numValue,
          credit: ''  // Vide le crédit
        };
      } else {
        // Si on saisit un crédit, on met le débit à 0
        newLines[index] = { 
          ...newLines[index], 
          credit: numValue === '' ? '' : numValue,
          debit: ''   // Vide le débit
        };
      }
      
      return { ...prev, lines: newLines };
    });
    markAsModified();
  };

  const handleLineMultiChange = (index, fields) => {
    setFormData(prev => {
      const newLines = [...prev.lines];
      newLines[index] = { ...newLines[index], ...fields };
      return { ...prev, lines: newLines };
    });
    markAsModified();
  };

  const addLine = () => {
    const firstName = formData.lines[0]?.name || 'Nouvelle ligne';
    setFormData(prev => ({
      ...prev,
      lines: [...prev.lines, { ...emptyLine(), name: firstName }]
    }));
    markAsModified();
    
    setTimeout(() => {
      if (tableContainerRef.current) {
        tableContainerRef.current.scrollTop = tableContainerRef.current.scrollHeight;
      }
    }, 10);
  };

  const removeLine = (index) => {
    if (formData.lines.length <= 1) {
      setError('Une pièce doit avoir au moins une ligne');
      return;
    }
    setFormData(prev => ({
      ...prev,
      lines: prev.lines.filter((_, i) => i !== index)
    }));
    markAsModified();
  };

  const handleLastFieldTab = (e, lineIndex) => {
    if (e.key === 'Tab' && !e.shiftKey) {
      const isLastLine = lineIndex === formData.lines.length - 1;
      
      if (isLastLine) {
        e.preventDefault();
        addLine();
        
        setTimeout(() => {
          const newRow = document.querySelector(`tbody tr:last-child td:first-child input`);
          if (newRow) {
            newRow.focus();
          }
        }, 50);
      }
    }
  };

  const calculateTotals = () =>
    formData.lines.reduce(
      (acc, line) => ({
        debit:  acc.debit  + (parseFloat(line.debit)  || 0),
        credit: acc.credit + (parseFloat(line.credit) || 0),
      }),
      { debit: 0, credit: 0 }
    );

  const formatDateForDisplay = (dateString) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleDateString('fr-FR', {
      day: 'numeric', month: 'long', year: 'numeric'
    });
  };

  const canSaveDraft = () => {
    if (!formData.journal_id) return false;
    const lignesSansCompte = formData.lines.filter(l => !l.account_id);
    if (lignesSansCompte.length > 0) return false;
    return true;
  };

  const isReadyForValidation = () => {
    if (!formData.journal_id) return false;
    if (formData.lines.length === 0) return false;
    
    const hasValidLines = formData.lines.every(line => 
      line.account_id && line.name?.trim() !== ''
    );
    if (!hasValidLines) return false;
    
    // Vérifier qu'au moins une ligne a un montant (débit ou crédit)
    const hasAmount = formData.lines.some(line => 
      (parseFloat(line.debit) || 0) > 0 || (parseFloat(line.credit) || 0) > 0
    );
    if (!hasAmount) return false;
    
    return true;
  };

  const prepareDataForApi = useCallback(() => {
    const toNumber = (value) => {
      if (!value || value === '') return 0;
      return parseFloat(value) || 0;
    };

    const toNumberOrNull = (value) => {
      if (!value || value === '') return null;
      return parseInt(value) || null;
    };

    const mainPartner = formData.partner_id ||
      formData.lines.find(l => l.partner_id)?.partner_id ||
      null;

    return {
      name: formData.name || `BROUILLON-${Date.now()}`,
      move_type: 'entry',
      state: formData.state,
      journal_id: toNumberOrNull(formData.journal_id),
      date: formData.date,
      ref: formData.ref || '',
      partner_id: mainPartner,
      company_id: activeEntity?.id || null,
      currency_id: toNumberOrNull(formData.currency_id),
      invoice_date: formData.invoice_date || formData.date,
      invoice_date_due: formData.invoice_date_due || null,
      invoice_user_id: toNumberOrNull(formData.invoice_user_id),
      invoice_origin: formData.invoice_origin || '',
      fiscal_position_id: toNumberOrNull(formData.fiscal_position_id),
      payment_reference: formData.payment_reference || '',
      notes: formData.notes || '',
      
      lines_write: formData.lines.map((line, index) => ({
        name: line.name?.trim() || `Ligne ${index + 1}`,
        date: formData.date,
        account_id: toNumberOrNull(line.account_id),
        partner_id: toNumberOrNull(line.partner_id || mainPartner),
        journal_id: toNumberOrNull(formData.journal_id),
        company_id: activeEntity?.id || null,
        currency_id: toNumberOrNull(formData.currency_id),
        tax_ids: line.tax_id ? [toNumberOrNull(line.tax_id)] : [],
        tax_base_amount: toNumber(line.tax_base_amount),
        debit: toNumber(line.debit),
        credit: toNumber(line.credit),
        date_maturity: line.date_maturity || null,
        discount_amount_currency: toNumber(line.discount_amount_currency),
        discount_percentage: toNumber(line.discount_percentage) || null,
        discount_date: line.discount_date || null,
      })),
    };
  }, [formData, activeEntity]);

  const saveAutoDraft = useCallback(async () => {
    if (!hasUnsavedChanges || isAutoSaving || !activeEntity) return;
    setIsAutoSaving(true);
    try {
      const apiData = prepareDataForApi();
      let result;
      if (pieceId) {
        result = await piecesService.update(pieceId, apiData, activeEntity.id);
      } else {
        result = await piecesService.create(apiData, activeEntity.id);
        if (result?.id) {
          setPieceId(result.id);
          if (result.name) setFormData(prev => ({ ...prev, name: result.name }));
        }
      }
      setHasUnsavedChanges(false);
    } catch (err) {
      console.error('❌ Erreur sauvegarde automatique:', err);
    } finally {
      setIsAutoSaving(false);
    }
  }, [hasUnsavedChanges, isAutoSaving, pieceId, activeEntity, prepareDataForApi]);

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

  const handleSave = async (silent = false) => {
    if (!activeEntity) { 
      setError('Vous devez sélectionner une entité'); 
      return false; 
    }

    if (!formData.journal_id) {
      setError('Le journal est obligatoire pour sauvegarder.');
      return false;
    }

    const lignesSansCompte = formData.lines.filter(l => !l.account_id);
    if (lignesSansCompte.length > 0) {
      setError(`${lignesSansCompte.length} ligne(s) sans compte comptable.`);
      return false;
    }

    setLoading(true);
    if (!silent) setError(null);
    
    try {
      const apiData = prepareDataForApi();
      console.log('📤 Données envoyées:', JSON.stringify(apiData, null, 2));

      let result;
      if (pieceId) {
        result = await piecesService.update(pieceId, apiData, activeEntity.id);
      } else {
        result = await piecesService.create(apiData, activeEntity.id);
        if (result?.id) {
          setPieceId(result.id);
          if (result.name) setFormData(prev => ({ ...prev, name: result.name }));
        }
      }

      if (!silent) {
        setSuccess('Pièce enregistrée comme brouillon avec succès !');
      }
      setHasUnsavedChanges(false);
      return true;
      
    } catch (err) {
      console.error('❌ Erreur enregistrement brouillon:', err);
      
      const errorMessage = err.response?.data || err.data || err.message || 'Erreur inconnue';
      setError(`Échec de l'enregistrement : ${JSON.stringify(errorMessage)}`);
      
      return false;
    } finally {
      setLoading(false);
    }
  };

  const handleToggleState = async () => {
    if (!activeEntity) { 
      setError('Vous devez sélectionner une entité'); 
      return; 
    }

    if (!isReadyForValidation()) {
      setError('Champs obligatoires manquants : journal, compte, libellé et montant sont requis pour comptabiliser.');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);
    try {
      const newState = formData.state === 'draft' ? 'posted' : 'draft';
      const apiData  = { ...prepareDataForApi(), state: newState };
      console.log('📤 Données pour changement état:', JSON.stringify(apiData, null, 2));

      let result;
      if (pieceId) {
        result = await piecesService.update(pieceId, apiData, activeEntity.id);
      } else {
        result = await piecesService.create(apiData, activeEntity.id);
        if (result?.id) {
          setPieceId(result.id);
          if (result.name) setFormData(prev => ({ ...prev, name: result.name }));
        }
      }

      setFormData(prev => ({ ...prev, state: newState }));
      setSuccess(newState === 'posted'
        ? 'Pièce comptabilisée avec succès !'
        : 'Pièce remise en brouillon avec succès !');
      setHasUnsavedChanges(false);
    } catch (err) {
      console.error('❌ Erreur changement état:', err);
      
      const errorMessage = err.response?.data || err.data || err.message || 'Erreur inconnue';
      setError(`Échec de la comptabilisation : ${JSON.stringify(errorMessage)}`);
    } finally {
      setLoading(false);
    }
  };

  const handleDiscardChanges = () => {
    setShowConfirmDialog(true);
  };
  
  const confirmDiscardChanges = () => {
    setFormData(initialFormData);
    setPieceId(null);
    setHasUnsavedChanges(false);
    setShowConfirmDialog(false);
    navigate('/comptabilite/pieces');
  };

  const handleNewPiece = () => {
    if (hasUnsavedChanges) {
      setShowConfirmDialog(true);
    } else {
      navigate('/comptabilite/pieces/create');
    }
  };

  const handleGoToList = () => {
    if (hasUnsavedChanges) {
      setShowConfirmDialog(true);
    } else {
      navigate('/comptabilite/pieces');
    }
  };

  const handleDuplicate = () => {
    setSuccess('Duplication à implémenter');
    setShowActionsMenu(false);
  };

  const handleDelete = () => {
    setSuccess('Suppression à implémenter');
    setShowActionsMenu(false);
  };

  const handleExtourner = () => {
    setSuccess("Extourne à implémenter");
    setShowActionsMenu(false);
  };

  const isDraft = formData.state === 'draft';
  const totals = calculateTotals();
  const difference = Math.abs(totals.debit - totals.credit).toFixed(2);
  const isBalanced = difference === '0.00' || difference === '0';
  
  const readyForValidation = isReadyForValidation();

  if (!activeEntity) {
    return (
      <div className="min-h-screen bg-gray-50 p-4">
        <div className="max-w-7xl mx-auto bg-white border border-gray-300">
          <div className="border-b border-gray-300 px-4 py-3">
            <div className="text-lg font-bold text-gray-900">Créer une pièce comptable</div>
          </div>
          <div className="p-8">
            <div className="bg-yellow-50 border border-yellow-200 rounded p-6 text-center">
              <FiAlertCircle className="text-yellow-600 mx-auto mb-3" size={32} />
              <p className="text-yellow-800 font-medium text-lg mb-3">Aucune entité sélectionnée</p>
              <p className="text-sm text-gray-600 mb-4">
                Vous devez sélectionner une entité pour créer une pièce comptable.
              </p>
              <p className="text-xs text-gray-500">
                Cliquez sur l'icône <FiBriefcase className="inline text-purple-600 mx-1" size={14} />
                en haut à droite pour choisir une entité.
              </p>
            </div>
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
              <Tooltip text="Créer une nouvelle pièce">
                <button 
                  onClick={handleNewPiece}
                  className="h-12 px-4 bg-purple-600 text-white text-sm hover:bg-purple-700 hover:scale-105 hover:shadow-md active:scale-95 transition-all duration-200 flex items-center justify-center font-medium border-0"
                  style={{ minWidth: '100px' }}
                >
                  <FiPlus size={16} className="mr-1" />
                  <span>Nouveau</span>
                </button>
              </Tooltip>
              <div className="flex flex-col h-12 justify-center">
                <div 
                  className="text-lg font-bold text-gray-900 cursor-pointer hover:text-purple-600 hover:scale-105 transition-all duration-200"
                  onClick={handleGoToList}
                >
                  Pièces comptables
                </div>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className={`px-2 py-0.5 text-xs font-medium ${isDraft ? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-800'}`}>
                    {isDraft ? 'Brouillon' : 'Comptabilisé'}
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
                    <button onClick={handleExtourner} className="w-full px-3 py-2 text-xs text-left hover:bg-gray-50 hover:pl-4 transition-all duration-200 flex items-center gap-2">
                      <FiRotateCcw size={12} /> Extourné
                    </button>
                  </div>
                )}
              </div>
              <Tooltip text="Enregistrer la pièce">
                <button 
                  onClick={() => handleSave().then(success => {
                    if (success) navigate('/comptabilite/pieces');
                  })} 
                  disabled={loading}
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

        {/* En-tête ligne 2 */}
        <div className="border-b border-gray-300 px-4 py-3">
          <div className="flex flex-col">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Tooltip text={
                  !readyForValidation 
                    ? "Remplissez tous les champs obligatoires (journal, compte, libellé et montant)" 
                    : (isDraft ? "Valider la pièce" : "Déjà comptabilisé")
                }>
                  <button
                    type="button"
                    onClick={handleToggleState}
                    disabled={loading || !isDraft || !readyForValidation}
                    className={`h-8 px-3 text-xs font-medium border transition-all duration-200 flex items-center justify-center ${
                      isDraft && readyForValidation
                        ? 'bg-purple-600 text-white border-purple-600 hover:bg-purple-700 hover:border-purple-700 hover:scale-105 hover:shadow-md active:scale-95 cursor-pointer' 
                        : 'bg-gray-100 text-gray-500 border-gray-300 cursor-not-allowed'
                    }`}
                  >
                    Comptabiliser
                  </button>
                </Tooltip>
                
                {error ? (
                  <div className="flex items-center gap-1 text-xs text-red-600">
                    <FiAlertCircle size={14} />
                    <span>{error}</span>
                  </div>
                ) : !readyForValidation && isDraft ? (
                  <div className="flex items-center gap-1 text-xs text-amber-600">
                    <FiInfo size={14} />
                    <span>Complétez journal, compte, libellé et montant</span>
                  </div>
                ) : null}
              </div>
              
              <div className="flex items-center gap-2">
                <div className={`h-8 px-3 text-xs font-medium border transition-all duration-200 flex items-center ${
                  isDraft 
                    ? 'bg-yellow-100 text-yellow-700 border-yellow-300' 
                    : 'bg-gray-100 text-gray-500 border-gray-300'
                }`}>
                  Brouillon
                </div>
                <div className={`h-8 px-3 text-xs font-medium border transition-all duration-200 flex items-center ${
                  !isDraft 
                    ? 'bg-green-100 text-green-700 border-green-300' 
                    : 'bg-gray-100 text-gray-500 border-gray-300'
                }`}>
                  Comptabilisé
                </div>
              </div>
            </div>
            
            <div className="mt-2 ml-1">
              <span className="text-xs text-gray-600">
                N° {formData.name && formData.name !== `BROUILLON-${Date.now()}` && formData.journal_id 
                  ? formData.name 
                  : formData.journal_id 
                    ? 'Génération en cours...' 
                    : 'Sélectionnez un journal pour générer le numéro'}
              </span>
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

        {/* Informations pièce */}
        <div className="px-4 py-3 border-b border-gray-300">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <div className="flex items-center" style={{ height: '26px' }}>
                <label className="text-xs text-gray-700 min-w-[140px] font-medium">Date comptable</label>
                <input
                  type="date"
                  value={formData.date}
                  onChange={(e) => handleChange('date', e.target.value)}
                  className="flex-1 px-2 py-1 border border-gray-300 text-xs ml-2"
                  style={{ height: '26px' }}
                />
              </div>
              <div className="flex items-center" style={{ height: '26px' }}>
                <label className="text-xs text-gray-700 min-w-[140px] font-medium">Référence</label>
                <input
                  type="text"
                  value={formData.ref}
                  onChange={(e) => handleChange('ref', e.target.value)}
                  className="flex-1 px-2 py-1 border border-gray-300 text-xs ml-2"
                  style={{ height: '26px' }}
                  placeholder="SCMI/002/2026"
                />
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex items-center" style={{ height: '26px' }}>
                <label className="text-xs text-gray-700 min-w-[140px] font-medium">Date enregistrement</label>
                <div className="flex-1 px-2 py-1 border border-gray-300 bg-gray-50 text-xs text-gray-900 ml-2 flex items-center" style={{ height: '26px' }}>
                  {formatDateForDisplay(formData.registration_date)}
                </div>
              </div>
              <div className="flex items-center" style={{ height: '26px' }}>
                <label className="text-xs text-gray-700 min-w-[140px] font-medium">Journal</label>
                <div className="flex-1 ml-2">
                  <AutocompleteInput
                    value={formData.journal_label}
                    selectedId={formData.journal_id}
                    onChange={(text) => handleChange('journal_label', text)}
                    onSelect={(id, label) => {
                      setFormData(prev => ({ ...prev, journal_id: id, journal_label: label }));
                      markAsModified();
                    }}
                    options={journals}
                    getOptionLabel={(o) => `${o.code} - ${o.name}`}
                    placeholder="Sélectionner un journal"
                    required={true}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Onglets */}
        <div className="border-b border-gray-300">
          <div className="px-4 flex">
            {['ecritures', 'notes', 'pieces-jointes'].map(tab => (
              <button 
                key={tab} 
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-2 text-xs font-medium border-b-2 transition-all duration-200 ${
                  activeTab === tab 
                    ? 'border-purple-600 text-purple-600 hover:text-purple-800' 
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {tab === 'ecritures' ? 'Écritures comptables' : 
                 tab === 'notes' ? 'Notes' : 
                 'Pièces jointes'}
              </button>
            ))}
          </div>
        </div>

        {/* Contenu onglets */}
        <div className="p-4">
          {activeTab === 'ecritures' ? (
            <>
              <div className="border border-gray-300 mb-3 overflow-x-auto" ref={tableContainerRef}>
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-gray-100">
                      <th className="border border-gray-300 px-2 py-1.5 text-xs font-medium text-gray-700 text-left">Compte *</th>
                      <th className="border border-gray-300 px-2 py-1.5 text-xs font-medium text-gray-700 text-left">Partenaire</th>
                      <th className="border border-gray-300 px-2 py-1.5 text-xs font-medium text-gray-700 text-left">Libellé *</th>
                      <th className="border border-gray-300 px-2 py-1.5 text-xs font-medium text-gray-700 text-left">Taxe</th>
                      <th className="border border-gray-300 px-2 py-1.5 text-xs font-medium text-gray-700 text-right">Débit</th>
                      <th className="border border-gray-300 px-2 py-1.5 text-xs font-medium text-gray-700 text-right">Crédit</th>
                      <th className="border border-gray-300 px-2 py-1.5 text-xs font-medium text-gray-700 text-left">Date échéance</th>
                      <th className="border border-gray-300 px-2 py-1.5 text-xs font-medium text-gray-700 text-right">Montant remise</th>
                      <th className="border border-gray-300 px-2 py-1.5 text-xs font-medium text-gray-700 text-right">% remise</th>
                      <th className="border border-gray-300 px-2 py-1.5 text-xs font-medium text-gray-700 text-left">Date remise</th>
                      <th className="border border-gray-300 px-2 py-1.5 text-xs font-medium text-gray-700 text-center">•••</th>
                    </tr>
                  </thead>
                  <tbody>
                    {formData.lines.map((line, lineIndex) => (
                      <tr key={lineIndex} className="hover:bg-gray-50">
                        <td className="border border-gray-300 p-1" style={{ minWidth: '150px' }}>
                          <AutocompleteInput
                            value={line.account_label}
                            selectedId={line.account_id}
                            onChange={(text) => handleLineChange(lineIndex, 'account_label', text)}
                            onSelect={(id, label) =>
                              handleLineMultiChange(lineIndex, { account_id: id, account_label: label })
                            }
                            options={accounts}
                            getOptionLabel={(o) => `${o.code} - ${o.name}`}
                            placeholder="Compte"
                            required={true}
                          />
                        </td>
                        <td className="border border-gray-300 p-1" style={{ minWidth: '120px' }}>
                          <AutocompleteInput
                            value={line.partner_label}
                            selectedId={line.partner_id}
                            onChange={(text) => handleLineChange(lineIndex, 'partner_label', text)}
                            onSelect={(id, label) =>
                              handleLineMultiChange(lineIndex, { partner_id: id, partner_label: label })
                            }
                            options={partners}
                            getOptionLabel={(o) => o.nom || o.name || o.raison_sociale || ''}
                            placeholder="Partenaire"
                          />
                        </td>
                        <td className="border border-gray-300 p-1" style={{ minWidth: '150px' }}>
                          <input 
                            type="text" 
                            value={line.name}
                            onChange={(e) => handleLineChange(lineIndex, 'name', e.target.value)}
                            className="w-full px-2 py-1 border-0 text-xs focus:ring-1 focus:ring-blue-500"
                            style={{ height: '26px' }} 
                            placeholder="Libellé"
                          />
                        </td>
                        <td className="border border-gray-300 p-1" style={{ minWidth: '100px' }}>
                          <AutocompleteInput
                            value={line.tax_label}
                            selectedId={line.tax_id}
                            onChange={(text) => handleLineChange(lineIndex, 'tax_label', text)}
                            onSelect={(id, label) =>
                              handleLineMultiChange(lineIndex, { tax_id: id, tax_label: label })
                            }
                            options={taxes}
                            getOptionLabel={(t) => `${t.name} (${t.amount}%)`}
                            placeholder="TVA..."
                          />
                        </td>
                        {/* ✅ DÉBIT - avec gestion d'exclusion mutuelle */}
                        <td className="border border-gray-300 p-1" style={{ minWidth: '100px' }}>
                          <input 
                            type="number" 
                            step="0.01" 
                            min="0" 
                            value={line.debit}
                            onChange={(e) => handleAmountChange(lineIndex, 'debit', e.target.value)}
                            className="w-full px-2 py-1 border-0 text-xs text-right focus:ring-1 focus:ring-blue-500"
                            style={{ height: '26px' }} 
                            placeholder="0.00" 
                          />
                        </td>
                        {/* ✅ CRÉDIT - avec gestion d'exclusion mutuelle */}
                        <td className="border border-gray-300 p-1" style={{ minWidth: '100px' }}>
                          <input 
                            type="number" 
                            step="0.01" 
                            min="0" 
                            value={line.credit}
                            onChange={(e) => handleAmountChange(lineIndex, 'credit', e.target.value)}
                            className="w-full px-2 py-1 border-0 text-xs text-right focus:ring-1 focus:ring-blue-500"
                            style={{ height: '26px' }} 
                            placeholder="0.00" 
                          />
                        </td>
                        <td className="border border-gray-300 p-1" style={{ minWidth: '120px' }}>
                          <input 
                            type="date" 
                            value={line.date_maturity}
                            onChange={(e) => handleLineChange(lineIndex, 'date_maturity', e.target.value)}
                            className="w-full px-2 py-1 border-0 text-xs focus:ring-1 focus:ring-blue-500"
                            style={{ height: '26px' }} 
                          />
                        </td>
                        <td className="border border-gray-300 p-1" style={{ minWidth: '100px' }}>
                          <input 
                            type="number" 
                            step="0.01" 
                            min="0" 
                            value={line.discount_amount_currency || ''}
                            onChange={(e) => handleLineChange(lineIndex, 'discount_amount_currency', e.target.value)}
                            className="w-full px-2 py-1 border-0 text-xs text-right focus:ring-1 focus:ring-blue-500"
                            style={{ height: '26px' }} 
                            placeholder="0.00" 
                          />
                        </td>
                        <td className="border border-gray-300 p-1" style={{ minWidth: '80px' }}>
                          <input 
                            type="number" 
                            step="0.01" 
                            min="0" 
                            max="100" 
                            value={line.discount_percentage || ''}
                            onChange={(e) => handleLineChange(lineIndex, 'discount_percentage', e.target.value)}
                            className="w-full px-2 py-1 border-0 text-xs text-right focus:ring-1 focus:ring-blue-500"
                            style={{ height: '26px' }} 
                            placeholder="0.00" 
                          />
                        </td>
                        <td className="border border-gray-300 p-1" style={{ minWidth: '120px' }}>
                          <input 
                            type="date" 
                            value={line.discount_date || ''}
                            onChange={(e) => handleLineChange(lineIndex, 'discount_date', e.target.value)}
                            onKeyDown={(e) => handleLastFieldTab(e, lineIndex)}
                            className="w-full px-2 py-1 border-0 text-xs focus:ring-1 focus:ring-blue-500"
                            style={{ height: '26px' }} 
                          />
                        </td>
                        <td className="border border-gray-300 p-1 w-[40px]">
                          <button 
                            onClick={() => removeLine(lineIndex)} 
                            tabIndex="-1"
                            className="w-full flex items-center justify-center p-1 text-gray-400 hover:text-red-600 hover:scale-110 active:scale-90 transition-all duration-200"
                            style={{ height: '26px' }} 
                            title="Supprimer"
                          >
                            <FiTrash2 size={14} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="mb-3 flex items-center gap-4">
                <Tooltip text="Ajouter une ligne d'écriture">
                  <button 
                    onClick={addLine}
                    className="h-8 px-3 bg-purple-600 text-white text-xs hover:bg-purple-700 hover:scale-105 hover:shadow-md active:scale-95 transition-all duration-200 flex items-center gap-1"
                  >
                    <FiPlus size={12} /><span>Ajouter une ligne</span>
                  </button>
                </Tooltip>

                {!isBalanced && totals.debit > 0 && (
                  <div className="text-xs text-yellow-700 bg-yellow-50 px-3 py-1 rounded flex items-center gap-1 border border-yellow-200">
                    <FiAlertCircle size={12} />
                    ⚠ Différence de {difference} XOF
                  </div>
                )}
                {isBalanced && totals.debit > 0 && (
                  <div className="text-xs text-green-700 bg-green-50 px-3 py-1 rounded flex items-center gap-1 border border-green-200">
                    <FiCheck size={12} />
                    ✓ Écriture équilibrée
                  </div>
                )}
              </div>

              <div className="bg-green-50 border border-green-200 px-4 py-2 flex justify-end gap-8">
                <div className="text-sm font-bold text-gray-900">Total Débit: {totals.debit.toFixed(2)} XOF</div>
                <div className="text-sm font-bold text-gray-900">Total Crédit: {totals.credit.toFixed(2)} XOF</div>
              </div>
            </>
          ) : activeTab === 'notes' ? (
            <div className="border border-gray-300">
              <div className="grid grid-cols-3 bg-gray-100 border-b border-gray-300">
                <div className="border-r border-gray-300 px-2 py-1.5 text-xs font-medium text-gray-700">Devise</div>
                <div className="border-r border-gray-300 px-2 py-1.5 text-xs font-medium text-gray-700">Position fiscale</div>
                <div className="px-2 py-1.5 text-xs font-medium text-gray-700">Entité</div>
              </div>
              <div className="grid grid-cols-3 border-b border-gray-300">
                <div className="border-r border-gray-300 p-1">
                  <AutocompleteInput
                    value={formData.currency_label}
                    selectedId={formData.currency_id}
                    onChange={(text) => handleChange('currency_label', text)}
                    onSelect={(id, label) => {
                      setFormData(prev => ({ ...prev, currency_id: id, currency_label: label }));
                      markAsModified();
                    }}
                    options={devises}
                    getOptionLabel={(o) => `${o.code}${o.symbole ? ` (${o.symbole})` : ''}`}
                    placeholder="Sélectionner une devise"
                    className="border-0 focus:ring-0"
                  />
                </div>
                <div className="border-r border-gray-300 p-1">
                  <AutocompleteInput
                    value={formData.fiscal_position_label}
                    selectedId={formData.fiscal_position_id}
                    onChange={(text) => handleChange('fiscal_position_label', text)}
                    onSelect={(id, label) => {
                      setFormData(prev => ({ ...prev, fiscal_position_id: id, fiscal_position_label: label }));
                      markAsModified();
                    }}
                    options={fiscalPositions}
                    getOptionLabel={(f) => f.name}
                    placeholder="Sélectionner une position"
                    className="border-0 focus:ring-0"
                  />
                </div>
                <div className="p-1">
                  <div className="w-full px-2 py-1 text-xs text-gray-700 flex items-center" style={{ height: '26px' }}>
                    <FiBriefcase className="mr-1 text-purple-600 flex-shrink-0" size={12} />
                    <span className="truncate">{activeEntity?.nom || activeEntity?.name || activeEntity?.raison_sociale || 'Entité sélectionnée'}</span>
                  </div>
                </div>
              </div>
              <textarea 
                value={formData.notes}
                onChange={(e) => handleChange('notes', e.target.value)}
                className="w-full h-48 px-3 py-2 border-0 text-xs focus:ring-2 focus:ring-blue-500"
                placeholder="Ajouter des notes complémentaires..." 
              />
            </div>
          ) : (
            <div className="border border-gray-300 p-6">
              <div className="text-center py-8">
                <FiPaperclip className="w-10 h-10 text-gray-400 mx-auto mb-3" />
                <div className="text-gray-500 text-xs mb-4">Aucune pièce jointe</div>
                <input type="file" id="attachments" className="hidden" multiple
                  onChange={(e) => handleChange('attachments', Array.from(e.target.files))} />
                <label htmlFor="attachments"
                  className="inline-flex items-center gap-2 h-8 px-3 bg-purple-600 text-white text-xs cursor-pointer hover:bg-purple-700 hover:scale-105 hover:shadow-md active:scale-95 transition-all duration-200"
                  style={{ height: '26px' }}>
                  <FiUpload size={12} /><span>Télécharger</span>
                </label>
              </div>
            </div>
          )}
        </div>

        {/* Messages */}
        {(error && !error.includes('Champs obligatoires')) || success && (
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
            <h3 className="text-lg font-bold text-gray-900 mb-3">Modifications non sauvegardées</h3>
            <p className="text-sm text-gray-600 mb-6">
              Voulez-vous enregistrer les modifications avant de quitter ?
            </p>
            <div className="flex justify-end gap-3">
              <button 
                onClick={async () => {
                  setShowConfirmDialog(false);
                  const saved = await handleSave(true);
                  if (saved) {
                    navigate('/comptabilite/pieces');
                  }
                }} 
                className="px-4 py-2 bg-purple-600 text-white text-sm hover:bg-purple-700 hover:scale-105 active:scale-95 transition-all duration-200"
              >
                Enregistrer
              </button>
              <button 
                onClick={() => {
                  confirmDiscardChanges();
                }} 
                className="px-4 py-2 bg-red-600 text-white text-sm hover:bg-red-700 hover:scale-105 active:scale-95 transition-all duration-200"
              >
                Ne pas enregistrer
              </button>
              <button 
                onClick={() => setShowConfirmDialog(false)} 
                className="px-4 py-2 border border-gray-300 text-gray-700 text-sm hover:bg-gray-50 hover:scale-105 active:scale-95 transition-all duration-200"
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