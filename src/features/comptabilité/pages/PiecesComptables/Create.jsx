import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiPlus, FiTrash2, FiCheck, FiPaperclip, FiUpload, FiCopy, FiRotateCcw, FiMoreVertical, FiSave, FiX } from 'react-icons/fi';
import { piecesService } from "../../services";

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
  disabled = false
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
  const [loading, setLoading] = useState(false);
  const [journals, setJournals] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [partners, setPartners] = useState([]);
  const [devises, setDevises] = useState([]);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [activeTab, setActiveTab] = useState('ecritures');
  const [showActionsMenu, setShowActionsMenu] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [pieceId, setPieceId] = useState(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isAutoSaving, setIsAutoSaving] = useState(false);
  
  const today = new Date().toISOString().split('T')[0];
  
  const initialFormData = {
    name: `ACH/26/${String(Date.now()).slice(-4)}`,
    state: 'draft',
    date: today,
    registration_date: today,
    ref: 'SCMI/002/2026',
    currency_id: '',
    currency_label: '',
    journal_id: '',
    journal_label: '',
    lines: [
      { 
        name: 'Achat de farine', 
        account_id: '', 
        account_label: '',
        partner_id: '', 
        partner_label: '',
        debit: '', 
        credit: '',
        taxes: '',
        discount_date: '',
        discount_amount: '',
      }
    ],
    notes: '',
    attachments: []
  };
  
  const [formData, setFormData] = useState(initialFormData);

  // Chargement des données API
  useEffect(() => {
    loadOptions();
  }, []);

  const loadOptions = async () => {
    setError(null);
    try {
      const [journalsData, accountsData, partnersData, devisesData] = await Promise.all([
        piecesService.getJournals(),
        piecesService.getAccounts(),
        piecesService.getPartners(),
        piecesService.getDevises(),
      ]);
      
      const normalizeData = (data) => {
        if (!data) return [];
        if (Array.isArray(data)) return data;
        if (Array.isArray(data.results)) return data.results;
        if (Array.isArray(data.data)) return data.data;
        return [];
      };
      
      const normalizedJournals = normalizeData(journalsData) || [];
      const normalizedAccounts = normalizeData(accountsData) || [];
      const normalizedPartners = normalizeData(partnersData) || [];
      const normalizedDevises = normalizeData(devisesData) || [];
      
      setJournals(normalizedJournals);
      setAccounts(normalizedAccounts);
      setPartners(normalizedPartners);
      setDevises(normalizedDevises);
      
      let defaultCurrencyId = '';
      let defaultCurrencyLabel = '';
      let defaultJournalId = '';
      let defaultJournalLabel = '';
      
      if (normalizedDevises.length > 0) {
        const fcfaDevise = normalizedDevises.find(d => 
          d.code === 'XOF' || d.code === 'FCFA'
        );
        const defaultCurrency = fcfaDevise || normalizedDevises[0];
        defaultCurrencyId = defaultCurrency.id;
        defaultCurrencyLabel = `${defaultCurrency.code} ${defaultCurrency.symbole ? `(${defaultCurrency.symbole})` : ''}`;
      }
      
      if (normalizedJournals.length > 0) {
        const achJournal = normalizedJournals.find(j => 
          j.code && j.code.toLowerCase().includes('ach')
        );
        const defaultJournal = achJournal || normalizedJournals[0];
        defaultJournalId = defaultJournal.id;
        defaultJournalLabel = `${defaultJournal.code} - ${defaultJournal.name}`;
      }
      
      setFormData(prev => ({
        ...prev,
        currency_id: defaultCurrencyId,
        currency_label: defaultCurrencyLabel,
        journal_id: defaultJournalId,
        journal_label: defaultJournalLabel
      }));

    } catch (err) {
      console.error('Erreur chargement options:', err);
      setError('Erreur lors du chargement des données.');
    }
  };

  // Marquer qu'il y a des modifications non sauvegardées
  const markAsModified = () => {
    if (!hasUnsavedChanges) {
      setHasUnsavedChanges(true);
    }
  };

  // Fonction de sauvegarde automatique
  const saveAutoDraft = useCallback(async () => {
    if (!hasUnsavedChanges || isAutoSaving) return;
    
    setIsAutoSaving(true);
    try {
      const apiData = {
        name: formData.name,
        state: 'draft',
        date: formData.date,
        ref: formData.ref,
        journal: formData.journal_id,
        currency: formData.currency_id,
        lines: formData.lines.map(line => ({
          name: line.name,
          account: line.account_id,
          partner: line.partner_id || null,
          debit: line.debit ? parseFloat(line.debit) : 0,
          credit: line.credit ? parseFloat(line.credit) : 0,
          taxes: line.taxes || '',
          discount_date: line.discount_date || null,
          discount_amount: line.discount_amount ? parseFloat(line.discount_amount) : 0
        }))
      };
      
      let result;
      if (pieceId) {
        result = await piecesService.update(pieceId, apiData);
      } else {
        result = await piecesService.create(apiData);
        if (result && result.id) {
          setPieceId(result.id);
        }
      }
      
      console.log('Sauvegarde automatique réussie');
      setHasUnsavedChanges(false);
      
    } catch (err) {
      console.error('Erreur sauvegarde automatique:', err);
    } finally {
      setIsAutoSaving(false);
    }
  }, [formData, hasUnsavedChanges, isAutoSaving, pieceId]);

  // Gestion de la navigation/quitter la page
  useEffect(() => {
    let isUnmounting = false;
    
    const handleBeforeUnload = (e) => {
      if (hasUnsavedChanges && !isUnmounting) {
        saveAutoDraft();
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    
    return () => {
      isUnmounting = true;
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [hasUnsavedChanges, saveAutoDraft]);

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    markAsModified();
  };

  const handleLineChange = (index, field, value) => {
    const newLines = [...formData.lines];
    newLines[index] = { ...newLines[index], [field]: value };
    
    if (field === 'debit' && value) {
      newLines[index].credit = '';
    } else if (field === 'credit' && value) {
      newLines[index].debit = '';
    }
    
    setFormData(prev => ({ ...prev, lines: newLines }));
    markAsModified();
  };

  const addLine = () => {
    setFormData(prev => ({
      ...prev,
      lines: [...prev.lines, { 
        name: '', 
        account_id: '', 
        account_label: '',
        partner_id: '', 
        partner_label: '',
        debit: '', 
        credit: '',
        taxes: '',
        discount_date: '',
        discount_amount: '',
      }]
    }));
    markAsModified();
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

  const calculateTotals = () => {
    const totals = formData.lines.reduce((acc, line) => ({
      debit: acc.debit + (parseFloat(line.debit) || 0),
      credit: acc.credit + (parseFloat(line.credit) || 0)
    }), { debit: 0, credit: 0 });
    
    return totals;
  };

  const formatDateForDisplay = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  };

  // Gestion du Tab uniquement pour le dernier champ
  const handleLastFieldTab = (e, lineIndex) => {
    if (e.key === 'Tab' && !e.shiftKey) {
      const isLastLine = lineIndex === formData.lines.length - 1;
      
      if (isLastLine) {
        e.preventDefault();
        addLine();
        
        setTimeout(() => {
          const newLineIndex = formData.lines.length;
          const inputsInNewRow = document.querySelectorAll(
            `tr:nth-child(${newLineIndex + 2}) input`
          );
          if (inputsInNewRow.length > 0) {
            inputsInNewRow[0].focus();
          }
        }, 10);
      }
    }
  };

  const totals = calculateTotals();

  // Fonction pour enregistrer comme brouillon (MANUEL)
  const handleSaveDraft = async () => {
    setLoading(true);
    setError(null);
    setSuccess(null);
    
    try {
      const apiData = {
        name: formData.name,
        state: 'draft',
        date: formData.date,
        ref: formData.ref,
        journal: formData.journal_id,
        currency: formData.currency_id,
        lines: formData.lines.map(line => ({
          name: line.name,
          account: line.account_id,
          partner: line.partner_id || null,
          debit: line.debit ? parseFloat(line.debit) : 0,
          credit: line.credit ? parseFloat(line.credit) : 0,
          taxes: line.taxes || '',
          discount_date: line.discount_date || null,
          discount_amount: line.discount_amount ? parseFloat(line.discount_amount) : 0
        }))
      };
      
      let result;
      if (pieceId) {
        result = await piecesService.update(pieceId, apiData);
      } else {
        result = await piecesService.create(apiData);
        if (result && result.id) {
          setPieceId(result.id);
        }
      }
      
      setSuccess('Pièce enregistrée comme brouillon avec succès !');
      setHasUnsavedChanges(false);
      
    } catch (err) {
      console.error('Erreur enregistrement brouillon:', err);
      setError(err.response?.data?.message || 'Erreur lors de l\'enregistrement de la pièce.');
    } finally {
      setLoading(false);
    }
  };

  // Fonction pour comptabiliser ou remettre en brouillon (MANUEL)
  const handleToggleState = async () => {
    setLoading(true);
    setError(null);
    setSuccess(null);
    
    try {
      const newState = formData.state === 'draft' ? 'posted' : 'draft';
      const apiData = {
        name: formData.name,
        state: newState,
        date: formData.date,
        ref: formData.ref,
        journal: formData.journal_id,
        currency: formData.currency_id,
        lines: formData.lines.map(line => ({
          name: line.name,
          account: line.account_id,
          partner: line.partner_id || null,
          debit: line.debit ? parseFloat(line.debit) : 0,
          credit: line.credit ? parseFloat(line.credit) : 0,
          taxes: line.taxes || '',
          discount_date: line.discount_date || null,
          discount_amount: line.discount_amount ? parseFloat(line.discount_amount) : 0
        }))
      };
      
      let result;
      if (pieceId) {
        result = await piecesService.update(pieceId, apiData);
      } else {
        result = await piecesService.create(apiData);
        if (result && result.id) {
          setPieceId(result.id);
        }
      }
      
      setFormData(prev => ({ ...prev, state: newState }));
      
      if (newState === 'posted') {
        setSuccess('Pièce comptabilisée avec succès !');
      } else {
        setSuccess('Pièce remise en brouillon avec succès !');
      }
      
      setHasUnsavedChanges(false);
      
    } catch (err) {
      console.error('Erreur changement état:', err);
      setError(err.response?.data?.message || 'Erreur lors du changement d\'état de la pièce.');
    } finally {
      setLoading(false);
    }
  };

  // Fonction pour ignorer les modifications
  const handleDiscardChanges = () => {
    setShowConfirmDialog(true);
  };

  const confirmDiscardChanges = () => {
    setFormData(initialFormData);
    setPieceId(null);
    setHasUnsavedChanges(false);
    
    setShowConfirmDialog(false);
    setSuccess('Modifications annulées.');
  };

  // Fonction pour créer une nouvelle pièce
  const handleNewPiece = () => {
    if (hasUnsavedChanges) {
      saveAutoDraft();
    }
    navigate('/comptabilite/pieces/create');
  };

  // Fonction pour aller à la liste des pièces
  const handleGoToList = () => {
    if (hasUnsavedChanges) {
      saveAutoDraft();
    }
    navigate('/comptabilite/pieces');
  };

  // Actions menu
  const actionsMenuRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (actionsMenuRef.current && !actionsMenuRef.current.contains(event.target)) {
        setShowActionsMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleDuplicate = () => {
    setSuccess('Fonctionnalité de duplication à implémenter');
    setShowActionsMenu(false);
  };

  const handleDelete = () => {
    setSuccess('Fonctionnalité de suppression à implémenter');
    setShowActionsMenu(false);
  };

  const handleExtourner = () => {
    setSuccess('Fonctionnalité d\'extourne à implémenter');
    setShowActionsMenu(false);
  };

  const isDraft = formData.state === 'draft';

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-7xl mx-auto bg-white border border-gray-300">
        
        {/* Barre d'en-tête - Ligne 1 */}
        <div className="border-b border-gray-300 px-4 py-3">
          {/* Première ligne : Titre et boutons */}
          <div className="flex items-center justify-between mb-2">
            {/* Partie gauche */}
            <div className="flex items-center gap-3">
              <button
                onClick={handleNewPiece}
                className="px-3 py-1.5 border border-gray-300 text-gray-700 text-xs hover:bg-gray-50 flex items-center gap-1"
              >
                <FiPlus size={12} />
                <span>Nouveau</span>
              </button>
              
              <div className="text-lg font-bold text-gray-900 cursor-pointer hover:text-purple-600" 
                   onClick={handleGoToList}>
                Pièces comptables
              </div>
            </div>
            
            {/* Partie droite */}
            <div className="flex items-center gap-2">
              {/* Menu Actions */}
              <div className="relative" ref={actionsMenuRef}>
                <button
                  onClick={() => setShowActionsMenu(!showActionsMenu)}
                  className="px-3 py-1.5 border border-gray-300 text-gray-700 text-xs hover:bg-gray-50 flex items-center gap-1"
                >
                  <FiMoreVertical size={12} />
                  <span>Actions</span>
                </button>
                
                {showActionsMenu && (
                  <div className="absolute right-0 mt-1 w-48 bg-white border border-gray-300 shadow-lg rounded-sm z-50">
                    <button
                      onClick={handleDuplicate}
                      className="w-full px-3 py-2 text-xs text-left hover:bg-gray-50 flex items-center gap-2 border-b border-gray-100"
                    >
                      <FiCopy size={12} />
                      <span>Dupliquer</span>
                    </button>
                    <button
                      onClick={handleDelete}
                      className="w-full px-3 py-2 text-xs text-left hover:bg-gray-50 flex items-center gap-2 border-b border-gray-100"
                    >
                      <FiTrash2 size={12} />
                      <span>Supprimer</span>
                    </button>
                    <button
                      onClick={handleExtourner}
                      className="w-full px-3 py-2 text-xs text-left hover:bg-gray-50 flex items-center gap-2"
                    >
                      <FiRotateCcw size={12} />
                      <span>Extourné</span>
                    </button>
                  </div>
                )}
              </div>
              
              <button
                onClick={handleDiscardChanges}
                className="px-3 py-1.5 border border-gray-300 text-gray-700 text-xs hover:bg-gray-50 flex items-center gap-1"
              >
                <FiX size={12} />
                <span>Ignorer les modifications</span>
              </button>
              
              <button
                onClick={handleSaveDraft}
                disabled={loading}
                className="px-3 py-1.5 bg-purple-600 text-white text-xs flex items-center gap-1 hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <FiSave size={12} />
                <span>Enregistrer</span>
              </button>
            </div>
          </div>
          
          {/* Deuxième ligne : État et N° pièce */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-700 font-medium">Etat:</span>
              <span className={`px-2 py-0.5 text-xs font-medium ${
                isDraft ? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-800'
              }`}>
                {isDraft ? 'Brouillon' : 'Comptabilisé'}
              </span>
            </div>
            
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-700 font-medium">N° pièce:</span>
              <span className="text-sm font-mono text-purple-600">{formData.name}</span>
            </div>
          </div>
        </div>

        {/* Nouvelle ligne de boutons - Ligne 2 */}
        <div className="border-b border-gray-300 px-4 py-3 flex items-center justify-between">
          {/* Partie gauche : Bouton Comptabiliser/Remettre en brouillon */}
          <div>
            <button
              onClick={handleToggleState}
              disabled={loading}
              className={`px-4 py-2 font-medium text-xs flex items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed ${
                isDraft 
                  ? 'bg-purple-600 text-white hover:bg-purple-700' 
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              <FiCheck size={12} />
              <span>{isDraft ? 'Comptabiliser (Valider)' : 'Remettre en brouillon'}</span>
            </button>
          </div>
          
          {/* Partie droite : Badges d'état (non cliquables) */}
          <div className="flex items-center gap-2">
            <div className={`px-3 py-1.5 text-xs font-medium border ${
              isDraft 
                ? 'bg-purple-100 text-purple-700 border-purple-300' 
                : 'bg-gray-100 text-gray-500 border-gray-300'
            }`}>
              Brouillon
            </div>
            
            <div className={`px-3 py-1.5 text-xs font-medium border ${
              !isDraft 
                ? 'bg-purple-100 text-purple-700 border-purple-300' 
                : 'bg-gray-100 text-gray-500 border-gray-300'
            }`}>
              Comptabilisé
            </div>
          </div>
        </div>

        {/* Indicateur de sauvegarde automatique */}
        {hasUnsavedChanges && (
          <div className="px-4 py-1 bg-blue-50 text-blue-700 text-xs border-b border-blue-200">
            <div className="flex items-center justify-between">
              <span>Modifications non sauvegardées</span>
              {isAutoSaving && <span className="animate-pulse">Sauvegarde en cours...</span>}
            </div>
          </div>
        )}

        {/* Informations de la pièce */}
        <div className="px-4 py-3 border-b border-gray-300">
          <div className="text-lg font-bold text-gray-900 mb-3">{formData.name}</div>
          
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
                <div className="flex-1 px-2 py-1 border border-gray-300 bg-gray-50 text-xs text-gray-900 ml-2 flex items-center"
                     style={{ height: '26px' }}>
                  {formatDateForDisplay(formData.registration_date)}
                </div>
              </div>
              
              <div className="flex items-center" style={{ height: '26px' }}>
                <label className="text-xs text-gray-700 min-w-[140px] font-medium">Devise</label>
                <div className="flex-1 ml-2">
                  <AutocompleteInput
                    value={formData.currency_label}
                    selectedId={formData.currency_id}
                    onChange={(text) => handleChange('currency_label', text)}
                    onSelect={(id, label) => {
                      handleChange('currency_id', id);
                      handleChange('currency_label', label);
                    }}
                    options={devises}
                    getOptionLabel={(option) => `${option.code} ${option.symbole ? `(${option.symbole})` : ''}`}
                    placeholder="Sélectionner une devise"
                    className="border border-gray-300"
                  />
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
                      handleChange('journal_id', id);
                      handleChange('journal_label', label);
                    }}
                    options={journals}
                    getOptionLabel={(option) => `${option.code} - ${option.name}`}
                    placeholder="Sélectionner un journal"
                    className="border border-gray-300"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Onglets */}
        <div className="border-b border-gray-300">
          <div className="px-4 flex">
            <button
              onClick={() => setActiveTab('ecritures')}
              className={`px-4 py-2 text-xs font-medium border-b-2 transition-colors ${
                activeTab === 'ecritures' 
                  ? 'border-purple-600 text-purple-600' 
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Ecritures comptable
            </button>
            <button
              onClick={() => setActiveTab('notes')}
              className={`px-4 py-2 text-xs font-medium border-b-2 transition-colors ${
                activeTab === 'notes' 
                  ? 'border-purple-600 text-purple-600' 
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Notes
            </button>
            <button
              onClick={() => setActiveTab('pieces-jointes')}
              className={`px-4 py-2 text-xs font-medium border-b-2 transition-colors ${
                activeTab === 'pieces-jointes' 
                  ? 'border-purple-600 text-purple-600' 
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Pièces jointes
            </button>
          </div>
        </div>

        {/* Contenu des onglets */}
        <div className="p-4">
          {activeTab === 'ecritures' ? (
            <>
              <div className="border border-gray-300 mb-3 overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-gray-100">
                      <th className="border border-gray-300 px-2 py-1.5 text-xs font-medium text-gray-700 text-left min-w-[150px]">
                        Compte Général
                      </th>
                      <th className="border border-gray-300 px-2 py-1.5 text-xs font-medium text-gray-700 text-left min-w-[120px]">
                        Partenaire
                      </th>
                      <th className="border border-gray-300 px-2 py-1.5 text-xs font-medium text-gray-700 text-left min-w-[150px]">
                        Libellé
                      </th>
                      <th className="border border-gray-300 px-2 py-1.5 text-xs font-medium text-gray-700 text-left min-w-[80px]">
                        Taxes
                      </th>
                      <th className="border border-gray-300 px-2 py-1.5 text-xs font-medium text-gray-700 text-left min-w-[100px]">
                        Débit
                      </th>
                      <th className="border border-gray-300 px-2 py-1.5 text-xs font-medium text-gray-700 text-left min-w-[100px]">
                        Crédit
                      </th>
                      <th className="border border-gray-300 px-2 py-1.5 text-xs font-medium text-gray-700 text-left min-w-[120px]">
                        Date escompte
                      </th>
                      <th className="border border-gray-300 px-2 py-1.5 text-xs font-medium text-gray-700 text-left min-w-[120px]">
                        Montant escompte
                      </th>
                      <th className="border border-gray-300 px-2 py-1.5 text-xs font-medium text-gray-700 w-[40px]">
                        •••
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {formData.lines.map((line, lineIndex) => (
                      <tr key={lineIndex} className="hover:bg-gray-50">
                        <td className="border border-gray-300 p-1">
                          <AutocompleteInput
                            value={line.account_label}
                            selectedId={line.account_id}
                            onChange={(text) => handleLineChange(lineIndex, 'account_label', text)}
                            onSelect={(id, label) => {
                              handleLineChange(lineIndex, 'account_id', id);
                              handleLineChange(lineIndex, 'account_label', label);
                            }}
                            options={accounts}
                            getOptionLabel={(option) => `${option.code} - ${option.name}`}
                            placeholder="Ex: 60110000"
                          />
                        </td>
                        
                        <td className="border border-gray-300 p-1">
                          <AutocompleteInput
                            value={line.partner_label}
                            selectedId={line.partner_id}
                            onChange={(text) => handleLineChange(lineIndex, 'partner_label', text)}
                            onSelect={(id, label) => {
                              handleLineChange(lineIndex, 'partner_id', id);
                              handleLineChange(lineIndex, 'partner_label', label);
                            }}
                            options={partners}
                            getOptionLabel={(option) => option.nom || option.name || option.raison_sociale || ''}
                            placeholder="Sélectionner..."
                          />
                        </td>
                        
                        <td className="border border-gray-300 p-1">
                          <input
                            type="text"
                            value={line.name}
                            onChange={(e) => handleLineChange(lineIndex, 'name', e.target.value)}
                            className="w-full px-2 py-1 border-0 text-xs focus:ring-1 focus:ring-blue-500"
                            style={{ height: '26px' }}
                            placeholder="Achat de farine"
                          />
                        </td>
                        
                        <td className="border border-gray-300 p-1">
                          <input
                            type="text"
                            value={line.taxes}
                            onChange={(e) => handleLineChange(lineIndex, 'taxes', e.target.value)}
                            className="w-full px-2 py-1 border-0 text-xs focus:ring-1 focus:ring-blue-500"
                            style={{ height: '26px' }}
                          />
                        </td>
                        
                        <td className="border border-gray-300 p-1">
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            value={line.debit}
                            onChange={(e) => handleLineChange(lineIndex, 'debit', e.target.value)}
                            className="w-full px-2 py-1 border-0 text-xs text-right focus:ring-1 focus:ring-blue-500"
                            style={{ height: '26px' }}
                            placeholder="0.00"
                          />
                        </td>
                        
                        <td className="border border-gray-300 p-1">
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            value={line.credit}
                            onChange={(e) => handleLineChange(lineIndex, 'credit', e.target.value)}
                            className="w-full px-2 py-1 border-0 text-xs text-right focus:ring-1 focus:ring-blue-500"
                            style={{ height: '26px' }}
                            placeholder="0.00"
                          />
                        </td>
                        
                        <td className="border border-gray-300 p-1">
                          <input
                            type="date"
                            value={line.discount_date}
                            onChange={(e) => handleLineChange(lineIndex, 'discount_date', e.target.value)}
                            className="w-full px-2 py-1 border-0 text-xs focus:ring-1 focus:ring-blue-500"
                            style={{ height: '26px' }}
                          />
                        </td>
                        
                        <td className="border border-gray-300 p-1">
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            value={line.discount_amount}
                            onChange={(e) => handleLineChange(lineIndex, 'discount_amount', e.target.value)}
                            onKeyDown={(e) => handleLastFieldTab(e, lineIndex)}
                            className="w-full px-2 py-1 border-0 text-xs text-right focus:ring-1 focus:ring-blue-500"
                            style={{ height: '26px' }}
                            placeholder="0.00"
                          />
                        </td>
                        
                        <td className="border border-gray-300 p-1">
                          <button
                            onClick={() => removeLine(lineIndex)}
                            className="w-full flex items-center justify-center p-1 text-gray-400 hover:text-red-600 transition-colors"
                            style={{ height: '26px' }}
                            title="Supprimer cette ligne"
                            tabIndex="-1"
                          >
                            <FiTrash2 size={12} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              
              <div className="mb-3">
                <button
                  onClick={addLine}
                  className="px-3 py-1 bg-purple-600 text-white text-xs flex items-center gap-1 hover:bg-purple-700 transition-colors"
                  style={{ height: '26px' }}
                >
                  <FiPlus size={10} />
                  <span>Ajouter une ligne</span>
                </button>
              </div>
              
              <div className="bg-green-50 border border-green-200 px-4 py-2 flex justify-end gap-8">
                <div className="text-sm font-bold text-gray-900">
                  {totals.debit.toFixed(2)} XOF
                </div>
                <div className="text-sm font-bold text-gray-900">
                  {totals.credit.toFixed(2)} XOF
                </div>
              </div>
            </>
          ) : activeTab === 'notes' ? (
            <div className="border border-gray-300">
              <textarea
                value={formData.notes}
                onChange={(e) => handleChange('notes', e.target.value)}
                className="w-full h-48 px-3 py-2 border-0 text-xs focus:ring-2 focus:ring-blue-500"
                placeholder="Ajouter des notes..."
              />
            </div>
          ) : (
            <div className="border border-gray-300 p-6">
              <div className="text-center py-8">
                <FiPaperclip className="w-10 h-10 text-gray-400 mx-auto mb-3" />
                <div className="text-gray-500 text-xs mb-4">Aucune pièce jointe</div>
                <input
                  type="file"
                  id="attachments"
                  className="hidden"
                  multiple
                  onChange={(e) => {
                    const files = Array.from(e.target.files);
                    handleChange('attachments', files);
                  }}
                />
                <label
                  htmlFor="attachments"
                  className="inline-flex items-center gap-2 px-3 py-1 bg-purple-600 text-white text-xs cursor-pointer hover:bg-purple-700 transition-colors"
                  style={{ height: '26px' }}
                >
                  <FiUpload size={12} />
                  <span>Télécharger des fichiers</span>
                </label>
              </div>
            </div>
          )}
        </div>

        {/* Messages d'erreur/succès */}
        {(error || success) && (
          <div className={`px-4 py-3 text-sm border-t border-gray-300 ${
            error ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'
          }`}>
            {error || success}
          </div>
        )}
      </div>

      {/* Dialogue de confirmation pour ignorer les modifications */}
      {showConfirmDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-sm shadow-lg max-w-md w-full mx-4">
            <h3 className="text-lg font-bold text-gray-900 mb-3">Ignorer les modifications ?</h3>
            <p className="text-sm text-gray-600 mb-6">
              Êtes-vous sûr de vouloir annuler toutes les modifications ? Cette action ne peut pas être annulée.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowConfirmDialog(false)}
                className="px-4 py-2 border border-gray-300 text-gray-700 text-sm hover:bg-gray-50"
              >
                Annuler
              </button>
              <button
                onClick={confirmDiscardChanges}
                className="px-4 py-2 bg-red-600 text-white text-sm hover:bg-red-700"
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