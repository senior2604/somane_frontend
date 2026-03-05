import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiPlus, FiTrash2, FiCheck, FiPaperclip, FiUpload, FiCopy, FiRotateCcw, FiMoreVertical, FiSave, FiX, FiAlertCircle, FiBriefcase } from 'react-icons/fi';
import { useEntity } from '../../../../context/EntityContext';
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
  const { activeEntity } = useEntity();

  const [loading, setLoading] = useState(false);
  const [journals, setJournals] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [partners, setPartners] = useState([]);
  const [devises, setDevises] = useState([]);
  const [taxes, setTaxes] = useState([]);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [activeTab, setActiveTab] = useState('ecritures');
  const [showActionsMenu, setShowActionsMenu] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [pieceId, setPieceId] = useState(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isAutoSaving, setIsAutoSaving] = useState(false);
  const today = new Date().toISOString().split('T')[0];

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
    taxes: '',
    discount_date: '',
    discount_amount: '',
    tax_id: '',
    tax_label: '',
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

  const loadOptions = async () => {
    setError(null);
    try {
      const [journalsData, accountsData, partnersData, devisesData, taxesData] = await Promise.all([
        piecesService.getJournals(activeEntity.id),
        piecesService.getAccounts(activeEntity.id),
        piecesService.getPartners(activeEntity.id),
        piecesService.getDevises(activeEntity.id),
        piecesService.getTaxes?.(activeEntity.id) || Promise.resolve([]),
      ]);

      const normalizeData = (data) => {
        if (!data) return [];
        if (Array.isArray(data)) return data;
        if (Array.isArray(data.results)) return data.results;
        if (Array.isArray(data.data)) return data.data;
        return [];
      };

      const normalizedJournals  = normalizeData(journalsData);
      const normalizedAccounts  = normalizeData(accountsData);
      const normalizedPartners  = normalizeData(partnersData);
      const normalizedDevises   = normalizeData(devisesData);
      const normalizedTaxes     = normalizeData(taxesData);

      setJournals(normalizedJournals);
      setAccounts(normalizedAccounts);
      setPartners(normalizedPartners);
      setDevises(normalizedDevises);
      setTaxes(normalizedTaxes);

      // Pré-sélection devise XOF/FCFA
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

  // ── Mise à jour d'un champ simple du formulaire ──────────────
  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    markAsModified();
  };

  // ── Mise à jour d'un champ simple d'une ligne ────────────────
  const handleLineChange = (index, field, value) => {
    setFormData(prev => {
      const newLines = [...prev.lines];
      newLines[index] = { ...newLines[index], [field]: value };
      // Effacer le champ opposé si débit/crédit saisi
      if (field === 'debit' && value)  newLines[index].credit = '';
      if (field === 'credit' && value) newLines[index].debit  = '';
      return { ...prev, lines: newLines };
    });
    markAsModified();
  };

  // ✅ CORRECTION PRINCIPALE : mise à jour de PLUSIEURS champs d'une ligne en un seul setState
  // Évite le bug où le 2e appel à handleLineChange écrasait le résultat du 1er
  const handleLineMultiChange = (index, fields) => {
    setFormData(prev => {
      const newLines = [...prev.lines];
      newLines[index] = { ...newLines[index], ...fields };
      return { ...prev, lines: newLines };
    });
    markAsModified();
  };

  const addLine = () => {
    const firstName = formData.lines[0]?.name || '';
    setFormData(prev => ({
      ...prev,
      lines: [...prev.lines, { ...emptyLine(), name: firstName }]
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

  const handleLastFieldTab = (e, lineIndex) => {
    if (e.key === 'Tab' && !e.shiftKey && lineIndex === formData.lines.length - 1) {
      e.preventDefault();
      addLine();
      setTimeout(() => {
        const inputs = document.querySelectorAll(
          `tr:nth-child(${formData.lines.length + 2}) input`
        );
        if (inputs.length > 0) inputs[0].focus();
      }, 10);
    }
  };

  // ── Préparation du payload API ───────────────────────────────
  const prepareDataForApi = useCallback(() => {
    const mainPartner = formData.partner_id ||
      formData.lines.find(l => l.partner_id)?.partner_id ||
      null;

    let totalDebit = 0;
    let totalCredit = 0;
    formData.lines.forEach(line => {
      totalDebit  += parseFloat(line.debit)  || 0;
      totalCredit += parseFloat(line.credit) || 0;
    });

    // 🔍 Debug : vérifie que les account_id sont bien remplis
    console.log('🔍 Lignes avant envoi:', formData.lines.map((l, i) => ({
      index: i,
      account_label: l.account_label,
      account_id: l.account_id,   // ← doit être un nombre, pas ''
      debit: l.debit,
      credit: l.credit,
    })));

    return {
      name:          formData.name || `BROUILLON-${Date.now()}`,
      move_type:     formData.move_type,
      state:         formData.state,
      journal:       formData.journal_id   || null,
      date:          formData.date,
      ref:           formData.ref,
      partner:       mainPartner,
      company_id:    activeEntity.id,
      currency:      formData.currency_id  || null,
      invoice_date:  formData.invoice_date || formData.date,
      amount_total:  Math.max(totalDebit, totalCredit),
      amount_untaxed: 0,
      amount_tax:    0,
      payment_state: 'not_paid',
      notes:         formData.notes,

      lines_write: formData.lines.map(line => {
        const debit  = parseFloat(line.debit)  || 0;
        const credit = parseFloat(line.credit) || 0;
        return {
          name:     line.name    || '',
          date:     formData.date,
          account:  line.account_id  || null,   // ✅ ID du compte (FK)
          partner:  line.partner_id  || null,
          tax_line: line.tax_id      || null,
          debit,
          credit,
          // ❌ Ne pas envoyer : move, journal, company, currency, balance, reconciled
          //    → injectés par le backend dans create()
        };
      }),
    };
  }, [formData, activeEntity]);

  // ── Sauvegarde automatique ───────────────────────────────────
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
    const handleBeforeUnload = () => {
      if (hasUnsavedChanges) saveAutoDraft();
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasUnsavedChanges, saveAutoDraft]);

  // ── Enregistrer brouillon (manuel) ──────────────────────────
  const handleSaveDraft = async () => {
    if (!activeEntity) { setError('Vous devez sélectionner une entité'); return; }

    // Validation minimale côté frontend
    const lignesInvalides = formData.lines.filter(l => !l.account_id);
    if (lignesInvalides.length > 0) {
      setError(`${lignesInvalides.length} ligne(s) sans compte comptable. Veuillez sélectionner un compte pour chaque ligne.`);
      return;
    }
    if (!formData.journal_id) {
      setError('Veuillez sélectionner un journal.');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);
    try {
      const apiData = prepareDataForApi();
      console.log('📤 Envoi API (save draft):', apiData);

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

      setSuccess('Pièce enregistrée comme brouillon avec succès !');
      setHasUnsavedChanges(false);
    } catch (err) {
      console.error('❌ Erreur enregistrement brouillon:', err);
      const detail = err.response?.data
        ? JSON.stringify(err.response.data, null, 2)
        : err.message;
      setError(`Erreur lors de l'enregistrement : ${detail}`);
    } finally {
      setLoading(false);
    }
  };

  // ── Comptabiliser / remettre en brouillon ───────────────────
  const handleToggleState = async () => {
    if (!activeEntity) { setError('Vous devez sélectionner une entité'); return; }

    setLoading(true);
    setError(null);
    setSuccess(null);
    try {
      const newState = formData.state === 'draft' ? 'posted' : 'draft';
      const apiData  = { ...prepareDataForApi(), state: newState };

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
      const detail = err.response?.data
        ? JSON.stringify(err.response.data, null, 2)
        : err.message;
      setError(`Erreur lors du changement d'état : ${detail}`);
    } finally {
      setLoading(false);
    }
  };

  const handleDiscardChanges  = () => setShowConfirmDialog(true);
  const confirmDiscardChanges = () => {
    setFormData(initialFormData);
    setPieceId(null);
    setHasUnsavedChanges(false);
    setShowConfirmDialog(false);
    setSuccess('Modifications annulées.');
  };

  const handleNewPiece = () => {
    if (hasUnsavedChanges) saveAutoDraft();
    navigate('/comptabilite/pieces/create');
  };
  const handleGoToList = () => {
    if (hasUnsavedChanges) saveAutoDraft();
    navigate('/comptabilite/pieces');
  };

  const actionsMenuRef = useRef(null);
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (actionsMenuRef.current && !actionsMenuRef.current.contains(e.target))
        setShowActionsMenu(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleDuplicate  = () => { setSuccess('Fonctionnalité de duplication à implémenter'); setShowActionsMenu(false); };
  const handleDelete     = () => { setSuccess('Fonctionnalité de suppression à implémenter'); setShowActionsMenu(false); };
  const handleExtourner  = () => { setSuccess("Fonctionnalité d'extourne à implémenter");     setShowActionsMenu(false); };

  const isDraft  = formData.state === 'draft';
  const totals   = calculateTotals();

  // ── Rendu : pas d'entité ─────────────────────────────────────
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

  // ── Rendu principal ──────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-7xl mx-auto bg-white border border-gray-300">

        {/* ── En-tête ligne 1 ── */}
        <div className="border-b border-gray-300 px-4 py-3">
          <div className="flex items-start justify-between mb-2">
            <div className="flex items-start gap-3">
              <button onClick={handleNewPiece}
                className="px-3 py-1.5 border border-gray-300 text-gray-700 text-xs hover:bg-gray-50 flex items-center gap-1">
                <FiPlus size={12} /><span>Nouveau</span>
              </button>
              <div className="flex flex-col">
                <div className="text-lg font-bold text-gray-900 cursor-pointer hover:text-purple-600"
                  onClick={handleGoToList}>
                  Pièces comptables
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-sm text-gray-700 font-medium">Etat :</span>
                  <span className={`px-2 py-0.5 text-xs font-medium ${isDraft ? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-800'}`}>
                    {isDraft ? 'Brouillon' : 'Comptabilisé'}
                  </span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="relative" ref={actionsMenuRef}>
                <button onClick={() => setShowActionsMenu(!showActionsMenu)}
                  className="px-3 py-1.5 border border-gray-300 text-gray-700 text-xs hover:bg-gray-50 flex items-center gap-1">
                  <FiMoreVertical size={12} /><span>Actions</span>
                </button>
                {showActionsMenu && (
                  <div className="absolute right-0 mt-1 w-48 bg-white border border-gray-300 shadow-lg rounded-sm z-50">
                    <button onClick={handleDuplicate}
                      className="w-full px-3 py-2 text-xs text-left hover:bg-gray-50 flex items-center gap-2 border-b border-gray-100">
                      <FiCopy size={12} /><span>Dupliquer</span>
                    </button>
                    <button onClick={handleDelete}
                      className="w-full px-3 py-2 text-xs text-left hover:bg-gray-50 flex items-center gap-2 border-b border-gray-100">
                      <FiTrash2 size={12} /><span>Supprimer</span>
                    </button>
                    <button onClick={handleExtourner}
                      className="w-full px-3 py-2 text-xs text-left hover:bg-gray-50 flex items-center gap-2">
                      <FiRotateCcw size={12} /><span>Extourné</span>
                    </button>
                  </div>
                )}
              </div>
              <button onClick={handleDiscardChanges}
                className="px-3 py-1.5 border border-gray-300 text-gray-700 text-xs hover:bg-gray-50 flex items-center gap-1">
                <FiX size={12} /><span>Ignorer les modifications</span>
              </button>
              <button onClick={handleSaveDraft} disabled={loading}
                className="px-3 py-1.5 bg-purple-600 text-white text-xs flex items-center gap-1 hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed">
                <FiSave size={12} /><span>Enregistrer</span>
              </button>
            </div>
          </div>
        </div>

        {/* ── En-tête ligne 2 ── */}
        <div className="border-b border-gray-300 px-4 py-3 flex items-center justify-between">
          <button onClick={handleToggleState} disabled={loading}
            className={`px-4 py-2 font-medium text-xs flex items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed ${
              isDraft ? 'bg-purple-600 text-white hover:bg-purple-700' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}>
            <FiCheck size={12} />
            <span>{isDraft ? 'Comptabiliser (Valider)' : 'Remettre en brouillon'}</span>
          </button>
          <div className="flex items-center gap-2">
            <div className={`px-3 py-1.5 text-xs font-medium border ${isDraft ? 'bg-purple-100 text-purple-700 border-purple-300' : 'bg-gray-100 text-gray-500 border-gray-300'}`}>
              Brouillon
            </div>
            <div className={`px-3 py-1.5 text-xs font-medium border ${!isDraft ? 'bg-purple-100 text-purple-700 border-purple-300' : 'bg-gray-100 text-gray-500 border-gray-300'}`}>
              Comptabilisé
            </div>
          </div>
        </div>

        {/* ── Indicateur modifications ── */}
        {hasUnsavedChanges && (
          <div className="px-4 py-1 bg-blue-50 text-blue-700 text-xs border-b border-blue-200 flex items-center justify-between">
            <span>Modifications non sauvegardées</span>
            {isAutoSaving && <span className="animate-pulse">Sauvegarde en cours…</span>}
          </div>
        )}

        {/* ── Informations pièce ── */}
        <div className="px-4 py-3 border-b border-gray-300">
          <div className="grid grid-cols-2 gap-4">
            {/* Colonne gauche */}
            <div className="space-y-2">
              <div className="flex items-center" style={{ height: '26px' }}>
                <label className="text-xs text-gray-700 min-w-[140px] font-medium">Date comptable</label>
                <input type="date" value={formData.date}
                  onChange={(e) => handleChange('date', e.target.value)}
                  className="flex-1 px-2 py-1 border border-gray-300 text-xs ml-2" style={{ height: '26px' }} />
              </div>
              <div className="flex items-center" style={{ height: '26px' }}>
                <label className="text-xs text-gray-700 min-w-[140px] font-medium">Référence</label>
                <input type="text" value={formData.ref}
                  onChange={(e) => handleChange('ref', e.target.value)}
                  className="flex-1 px-2 py-1 border border-gray-300 text-xs ml-2" style={{ height: '26px' }}
                  placeholder="SCMI/002/2026" />
              </div>
            </div>
            {/* Colonne droite */}
            <div className="space-y-2">
              <div className="flex items-center" style={{ height: '26px' }}>
                <label className="text-xs text-gray-700 min-w-[140px] font-medium">Date enregistrement</label>
                <div className="flex-1 px-2 py-1 border border-gray-300 bg-gray-50 text-xs text-gray-900 ml-2 flex items-center" style={{ height: '26px' }}>
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
                    onSelect={(id, label) => handleLineMultiChange
                      ? setFormData(prev => ({ ...prev, currency_id: id, currency_label: label })) && markAsModified()
                      : null
                    }
                    options={devises}
                    getOptionLabel={(o) => `${o.code}${o.symbole ? ` (${o.symbole})` : ''}`}
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
                      setFormData(prev => ({ ...prev, journal_id: id, journal_label: label }));
                      markAsModified();
                    }}
                    options={journals}
                    getOptionLabel={(o) => `${o.code} - ${o.name}`}
                    placeholder="Sélectionner un journal"
                    className="border border-gray-300"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── Onglets ── */}
        <div className="border-b border-gray-300">
          <div className="px-4 flex">
            {['ecritures', 'notes', 'pieces-jointes'].map(tab => (
              <button key={tab} onClick={() => setActiveTab(tab)}
                className={`px-4 py-2 text-xs font-medium border-b-2 transition-colors ${
                  activeTab === tab ? 'border-purple-600 text-purple-600' : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}>
                {tab === 'ecritures' ? 'Ecritures comptable' : tab === 'notes' ? 'Notes' : 'Pièces jointes'}
              </button>
            ))}
          </div>
        </div>

        {/* ── Contenu onglets ── */}
        <div className="p-4">
          {activeTab === 'ecritures' ? (
            <>
              <div className="border border-gray-300 mb-3 overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-gray-100">
                      {['Compte Général', 'Partenaire', 'Libellé', 'Taxes', 'Débit', 'Crédit', 'Date escompte', 'Montant escompte', '•••'].map(h => (
                        <th key={h} className="border border-gray-300 px-2 py-1.5 text-xs font-medium text-gray-700 text-left">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {formData.lines.map((line, lineIndex) => (
                      <tr key={lineIndex} className="hover:bg-gray-50">

                        {/* ✅ Compte — onSelect groupé via handleLineMultiChange */}
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
                            placeholder="Ex: 60110000"
                          />
                        </td>

                        {/* ✅ Partenaire — onSelect groupé */}
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
                            placeholder="Sélectionner…"
                          />
                        </td>

                        <td className="border border-gray-300 p-1" style={{ minWidth: '150px' }}>
                          <input type="text" value={line.name}
                            onChange={(e) => handleLineChange(lineIndex, 'name', e.target.value)}
                            className="w-full px-2 py-1 border-0 text-xs focus:ring-1 focus:ring-blue-500"
                            style={{ height: '26px' }} placeholder="Libellé de l'écriture" />
                        </td>
                        <td className="border border-gray-300 p-1" style={{ minWidth: '80px' }}>
                          <input type="text" value={line.taxes}
                            onChange={(e) => handleLineChange(lineIndex, 'taxes', e.target.value)}
                            className="w-full px-2 py-1 border-0 text-xs focus:ring-1 focus:ring-blue-500"
                            style={{ height: '26px' }} placeholder="TVA 18%" />
                        </td>
                        <td className="border border-gray-300 p-1" style={{ minWidth: '100px' }}>
                          <input type="number" step="0.01" min="0" value={line.debit}
                            onChange={(e) => handleLineChange(lineIndex, 'debit', e.target.value)}
                            className="w-full px-2 py-1 border-0 text-xs text-right focus:ring-1 focus:ring-blue-500"
                            style={{ height: '26px' }} placeholder="0.00" />
                        </td>
                        <td className="border border-gray-300 p-1" style={{ minWidth: '100px' }}>
                          <input type="number" step="0.01" min="0" value={line.credit}
                            onChange={(e) => handleLineChange(lineIndex, 'credit', e.target.value)}
                            className="w-full px-2 py-1 border-0 text-xs text-right focus:ring-1 focus:ring-blue-500"
                            style={{ height: '26px' }} placeholder="0.00" />
                        </td>
                        <td className="border border-gray-300 p-1" style={{ minWidth: '120px' }}>
                          <input type="date" value={line.discount_date}
                            onChange={(e) => handleLineChange(lineIndex, 'discount_date', e.target.value)}
                            className="w-full px-2 py-1 border-0 text-xs focus:ring-1 focus:ring-blue-500"
                            style={{ height: '26px' }} />
                        </td>
                        <td className="border border-gray-300 p-1" style={{ minWidth: '120px' }}>
                          <input type="number" step="0.01" min="0" value={line.discount_amount}
                            onChange={(e) => handleLineChange(lineIndex, 'discount_amount', e.target.value)}
                            onKeyDown={(e) => handleLastFieldTab(e, lineIndex)}
                            className="w-full px-2 py-1 border-0 text-xs text-right focus:ring-1 focus:ring-blue-500"
                            style={{ height: '26px' }} placeholder="0.00" />
                        </td>
                        <td className="border border-gray-300 p-1 w-[40px]">
                          <button onClick={() => removeLine(lineIndex)} tabIndex="-1"
                            className="w-full flex items-center justify-center p-1 text-gray-400 hover:text-red-600 transition-colors"
                            style={{ height: '26px' }} title="Supprimer cette ligne">
                            <FiTrash2 size={12} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="mb-3">
                <button onClick={addLine}
                  className="px-3 py-1 bg-purple-600 text-white text-xs flex items-center gap-1 hover:bg-purple-700 transition-colors"
                  style={{ height: '26px' }}>
                  <FiPlus size={10} /><span>Ajouter une ligne</span>
                </button>
              </div>

              <div className="bg-green-50 border border-green-200 px-4 py-2 flex justify-end gap-8">
                <div className="text-sm font-bold text-gray-900">{totals.debit.toFixed(2)} XOF</div>
                <div className="text-sm font-bold text-gray-900">{totals.credit.toFixed(2)} XOF</div>
              </div>
            </>
          ) : activeTab === 'notes' ? (
            <div className="border border-gray-300">
              <textarea value={formData.notes}
                onChange={(e) => handleChange('notes', e.target.value)}
                className="w-full h-48 px-3 py-2 border-0 text-xs focus:ring-2 focus:ring-blue-500"
                placeholder="Ajouter des notes…" />
            </div>
          ) : (
            <div className="border border-gray-300 p-6">
              <div className="text-center py-8">
                <FiPaperclip className="w-10 h-10 text-gray-400 mx-auto mb-3" />
                <div className="text-gray-500 text-xs mb-4">Aucune pièce jointe</div>
                <input type="file" id="attachments" className="hidden" multiple
                  onChange={(e) => handleChange('attachments', Array.from(e.target.files))} />
                <label htmlFor="attachments"
                  className="inline-flex items-center gap-2 px-3 py-1 bg-purple-600 text-white text-xs cursor-pointer hover:bg-purple-700 transition-colors"
                  style={{ height: '26px' }}>
                  <FiUpload size={12} /><span>Télécharger des fichiers</span>
                </label>
              </div>
            </div>
          )}
        </div>

        {/* ── Messages erreur/succès ── */}
        {(error || success) && (
          <div className={`px-4 py-3 text-sm border-t border-gray-300 ${error ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'}`}>
            {error || success}
          </div>
        )}
      </div>

      {/* ── Dialogue confirmation ── */}
      {showConfirmDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-sm shadow-lg max-w-md w-full mx-4">
            <h3 className="text-lg font-bold text-gray-900 mb-3">Ignorer les modifications ?</h3>
            <p className="text-sm text-gray-600 mb-6">
              Êtes-vous sûr de vouloir annuler toutes les modifications ? Cette action ne peut pas être annulée.
            </p>
            <div className="flex justify-end gap-3">
              <button onClick={() => setShowConfirmDialog(false)}
                className="px-4 py-2 border border-gray-300 text-gray-700 text-sm hover:bg-gray-50">
                Annuler
              </button>
              <button onClick={confirmDiscardChanges}
                className="px-4 py-2 bg-red-600 text-white text-sm hover:bg-red-700">
                Ignorer les modifications
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}