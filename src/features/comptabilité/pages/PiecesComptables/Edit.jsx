// features/comptabilité/pages/PiecesComptables/Edit.jsx
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { 
  FiArrowLeft, FiSave, FiPlus, FiTrash2, FiDollarSign,
  FiCalendar, FiType, FiBriefcase, FiFileText, FiCheck,
  FiX, FiAlertCircle, FiMoreVertical, FiCopy, FiRotateCcw
} from 'react-icons/fi';
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
export default function Edit() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { activeEntity } = useEntity();

  const [loading, setLoading] = useState(true);
  const [submitLoading, setSubmitLoading] = useState(false);
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
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isAutoSaving, setIsAutoSaving] = useState(false);
  const today = new Date().toISOString().split('T')[0];

  useEffect(() => {
    if (!activeEntity) {
      setError('Vous devez sélectionner une entité pour modifier une pièce comptable');
      setLoading(false);
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

  const [formData, setFormData] = useState({
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
  });

  useEffect(() => {
    if (id && activeEntity) {
      loadData();
    }
  }, [id, activeEntity]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('📥 Chargement des données pour édition:', id);
      
      // Charger toutes les données en parallèle
      const [
        pieceData, 
        journalsData, 
        accountsData, 
        partnersData, 
        devisesData, 
        taxesData
      ] = await Promise.all([
        piecesService.getById(id, activeEntity.id),
        piecesService.getJournals(activeEntity.id),
        piecesService.getAccounts(activeEntity.id),
        piecesService.getPartners(activeEntity.id),
        piecesService.getDevises(activeEntity.id),
        piecesService.getTaxes?.(activeEntity.id) || Promise.resolve([]),
      ]);

      console.log('✅ Pièce chargée:', pieceData);

      const normalizeData = (data) => {
        if (!data) return [];
        if (Array.isArray(data)) return data;
        if (Array.isArray(data.results)) return data.results;
        if (Array.isArray(data.data)) return data.data;
        return [];
      };

      const normalizedJournals = normalizeData(journalsData);
      const normalizedAccounts = normalizeData(accountsData);
      const normalizedPartners = normalizeData(partnersData);
      const normalizedDevises = normalizeData(devisesData);
      const normalizedTaxes = normalizeData(taxesData);

      setJournals(normalizedJournals);
      setAccounts(normalizedAccounts);
      setPartners(normalizedPartners);
      setDevises(normalizedDevises);
      setTaxes(normalizedTaxes);

      // Trouver le libellé du journal
      const journal = normalizedJournals.find(j => j.id === pieceData.journal) || 
                     normalizedJournals.find(j => j.id === pieceData.journal?.id);
      
      // Trouver le libellé de la devise
      const devise = normalizedDevises.find(d => d.id === pieceData.currency) ||
                    normalizedDevises.find(d => d.id === pieceData.currency?.id);
      
      // Trouver le libellé du partenaire principal
      const partner = normalizedPartners.find(p => p.id === pieceData.partner) ||
                     normalizedPartners.find(p => p.id === pieceData.partner?.id);

      // Formater les lignes
      const lines = pieceData.lines && Array.isArray(pieceData.lines) 
        ? pieceData.lines.map(line => {
            // Trouver le compte
            const account = normalizedAccounts.find(a => a.id === line.account) ||
                           normalizedAccounts.find(a => a.id === line.account?.id);
            
            // Trouver le partenaire de la ligne
            const linePartner = normalizedPartners.find(p => p.id === line.partner) ||
                               normalizedPartners.find(p => p.id === line.partner?.id);
            
            // Trouver la taxe
            const tax = normalizedTaxes.find(t => t.id === line.tax_line) ||
                       normalizedTaxes.find(t => t.id === line.tax_line?.id);

            return {
              id: line.id,
              name: line.name || '',
              account_id: account?.id || line.account || '',
              account_label: account ? `${account.code} - ${account.name}` : '',
              partner_id: linePartner?.id || line.partner || '',
              partner_label: linePartner ? (
                linePartner.raison_sociale || 
                (linePartner.nom && linePartner.prenom ? `${linePartner.prenom} ${linePartner.nom}` : linePartner.nom) ||
                linePartner.name || ''
              ) : '',
              debit: line.debit || '',
              credit: line.credit || '',
              taxes: tax?.name || line.tax_line?.name || '',
              discount_date: line.discount_date || '',
              discount_amount: line.discount_amount || '',
              tax_id: tax?.id || line.tax_line?.id || '',
              tax_label: tax?.name || '',
            };
          })
        : [emptyLine()];

      // Mettre à jour le formulaire
      setFormData({
        name: pieceData.name || '',
        state: pieceData.state || 'draft',
        move_type: pieceData.move_type || 'entry',
        date: pieceData.date || today,
        registration_date: pieceData.created_at?.split('T')[0] || today,
        ref: pieceData.ref || '',
        currency_id: devise?.id || pieceData.currency || '',
        currency_label: devise ? `${devise.code}${devise.symbole ? ` (${devise.symbole})` : ''}` : '',
        journal_id: journal?.id || pieceData.journal || '',
        journal_label: journal ? `${journal.code} - ${journal.name}` : '',
        partner_id: partner?.id || pieceData.partner || '',
        partner_label: partner ? (
          partner.raison_sociale || 
          (partner.nom && partner.prenom ? `${partner.prenom} ${partner.nom}` : partner.nom) ||
          partner.name || ''
        ) : '',
        invoice_date: pieceData.invoice_date || pieceData.date || today,
        lines: lines,
        notes: pieceData.notes || '',
        attachments: []
      });

      setHasUnsavedChanges(false);
      
    } catch (err) {
      console.error('❌ Erreur chargement données:', err);
      if (err.status === 404) {
        setError('Pièce comptable non trouvée');
      } else {
        setError(`Erreur de chargement: ${err.message || 'Inconnue'}`);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleNewPiece = () => {
    navigate('/comptabilite/pieces/create');
  };

  const handleGoToList = () => {
    navigate('/comptabilite/pieces');
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
      
      // Effacer le champ opposé si débit/crédit saisi
      if (field === 'debit' && value) newLines[index].credit = '';
      if (field === 'credit' && value) newLines[index].debit = '';
      
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

  const calculateTotals = () => {
    return formData.lines.reduce(
      (acc, line) => ({
        debit: acc.debit + (parseFloat(line.debit) || 0),
        credit: acc.credit + (parseFloat(line.credit) || 0),
      }),
      { debit: 0, credit: 0 }
    );
  };

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

  const prepareDataForApi = useCallback(() => {
    const mainPartner = formData.partner_id ||
      formData.lines.find(l => l.partner_id)?.partner_id ||
      null;

    let totalDebit = 0;
    let totalCredit = 0;
    formData.lines.forEach(line => {
      totalDebit += parseFloat(line.debit) || 0;
      totalCredit += parseFloat(line.credit) || 0;
    });

    console.log('🔍 Lignes avant envoi:', formData.lines.map((l, i) => ({
      index: i,
      account_label: l.account_label,
      account_id: l.account_id,
      debit: l.debit,
      credit: l.credit,
    })));

    return {
      name: formData.name || `BROUILLON-${Date.now()}`,
      move_type: formData.move_type,
      state: formData.state,
      journal: formData.journal_id || null,
      date: formData.date,
      ref: formData.ref,
      partner: mainPartner,
      company_id: activeEntity.id,
      currency: formData.currency_id || null,
      invoice_date: formData.invoice_date || formData.date,
      amount_total: Math.max(totalDebit, totalCredit),
      amount_untaxed: 0,
      amount_tax: 0,
      payment_state: 'not_paid',
      notes: formData.notes,

      lines_write: formData.lines.map(line => {
        const debit = parseFloat(line.debit) || 0;
        const credit = parseFloat(line.credit) || 0;
        return {
          id: line.id, // Garder l'ID pour la mise à jour
          name: line.name || '',
          date: formData.date,
          account: line.account_id || null,
          partner: line.partner_id || null,
          tax_line: line.tax_id || null,
          debit,
          credit,
        };
      }),
    };
  }, [formData, activeEntity]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitLoading(true);
    setError(null);
    setSuccess(null);

    // Validation
    if (!formData.journal_id) {
      setError('Le journal est obligatoire');
      setSubmitLoading(false);
      return;
    }

    if (!formData.date) {
      setError('La date est obligatoire');
      setSubmitLoading(false);
      return;
    }

    const lignesInvalides = formData.lines.filter(l => !l.account_id);
    if (lignesInvalides.length > 0) {
      setError(`${lignesInvalides.length} ligne(s) sans compte comptable. Veuillez sélectionner un compte pour chaque ligne.`);
      setSubmitLoading(false);
      return;
    }

    const totals = calculateTotals();
    const isBalanced = Math.abs(totals.debit - totals.credit) < 0.01;
    
    if (!isBalanced) {
      setError(`La pièce n'est pas équilibrée ! Débit: ${totals.debit.toFixed(2)} XOF, Crédit: ${totals.credit.toFixed(2)} XOF`);
      setSubmitLoading(false);
      return;
    }

    try {
      const apiData = prepareDataForApi();
      console.log('📤 Envoi API (update):', apiData);

      await piecesService.update(id, apiData, activeEntity.id);
      
      setSuccess('Pièce mise à jour avec succès !');
      setHasUnsavedChanges(false);
      
      // Rediriger vers la page de détail après un court délai
      setTimeout(() => {
        navigate(`/comptabilite/pieces/${id}`);
      }, 1500);
      
    } catch (err) {
      console.error('❌ Erreur mise à jour:', err);
      const detail = err.response?.data
        ? JSON.stringify(err.response.data, null, 2)
        : err.message;
      setError(`Erreur lors de la mise à jour : ${detail}`);
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleToggleState = async () => {
    setSubmitLoading(true);
    setError(null);
    setSuccess(null);
    
    try {
      const newState = formData.state === 'draft' ? 'posted' : 'draft';
      const apiData = { ...prepareDataForApi(), state: newState };

      await piecesService.update(id, apiData, activeEntity.id);
      
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
      setSubmitLoading(false);
    }
  };

  const handleDiscardChanges = () => setShowConfirmDialog(true);
  
  const confirmDiscardChanges = () => {
    loadData(); // Recharger les données originales
    setHasUnsavedChanges(false);
    setShowConfirmDialog(false);
    setSuccess('Modifications annulées.');
  };

  const handleDuplicate = async () => {
    setSubmitLoading(true);
    try {
      const newPiece = await piecesService.duplicate(id, activeEntity.id);
      navigate(`/comptabilite/pieces/${newPiece.id}/edit`);
    } catch (err) {
      setError('Erreur lors de la duplication: ' + err.message);
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm(`Êtes-vous sûr de vouloir supprimer cette pièce ?`)) return;
    
    setSubmitLoading(true);
    try {
      await piecesService.delete(id, activeEntity.id);
      navigate('/comptabilite/pieces');
    } catch (err) {
      setError('Erreur lors de la suppression: ' + err.message);
    } finally {
      setSubmitLoading(false);
    }
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

  if (!activeEntity) {
    return (
      <div className="min-h-screen bg-gray-50 p-4">
        <div className="max-w-7xl mx-auto bg-white border border-gray-300">
          <div className="border-b border-gray-300 px-4 py-3">
            <div className="text-lg font-bold text-gray-900">Modifier la pièce comptable</div>
          </div>
          <div className="p-8">
            <div className="bg-yellow-50 border border-yellow-200 rounded p-6 text-center">
              <FiAlertCircle className="text-yellow-600 mx-auto mb-3" size={32} />
              <p className="text-yellow-800 font-medium text-lg mb-3">Aucune entité sélectionnée</p>
              <p className="text-sm text-gray-600 mb-4">
                Vous devez sélectionner une entité pour modifier une pièce comptable.
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
            <div className="text-lg font-bold text-gray-900">Modifier la pièce comptable</div>
          </div>
          <div className="p-8 flex items-center justify-center">
            <div className="text-center">
              <div className="w-8 h-8 border-2 border-violet-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
              <p className="mt-4 text-gray-600 text-sm">Chargement de la pièce...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const isDraft = formData.state === 'draft';
  const totals = calculateTotals();
  const isBalanced = Math.abs(totals.debit - totals.credit) < 0.01;

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-7xl mx-auto bg-white border border-gray-300">

        {/* ── En-tête ligne 1 (comme dans Create et Show) ── */}
        <div className="border-b border-gray-300 px-4 py-3">
          <div className="flex items-start justify-between mb-2">
            <div className="flex items-start gap-3">
              {/* Bouton Nouveau (comme dans Create) */}
              <button
                onClick={handleNewPiece}
                className="px-3 py-1.5 border border-gray-300 text-gray-700 text-xs hover:bg-gray-50 flex items-center gap-1"
              >
                <FiPlus size={12} /><span>Nouveau</span>
              </button>
              <div className="flex flex-col">
                {/* Lien vers la liste (comme dans Create) */}
                <div
                  onClick={handleGoToList}
                  className="text-lg font-bold text-gray-900 cursor-pointer hover:text-purple-600"
                >
                  Pièces comptables
                </div>
                {/* État et numéro de pièce (comme dans Create) */}
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-sm text-gray-700 font-medium">Etat :</span>
                  <span className={`px-2 py-0.5 text-xs font-medium ${isDraft ? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-800'}`}>
                    {isDraft ? 'Brouillon' : 'Comptabilisé'}
                  </span>
                  <span className="text-sm text-gray-700 font-medium ml-2">N° :</span>
                  <span className="text-sm text-gray-900 font-medium">{formData.name || `#${id}`}</span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="relative" ref={actionsMenuRef}>
                <button
                  onClick={() => setShowActionsMenu(!showActionsMenu)}
                  className="px-3 py-1.5 border border-gray-300 text-gray-700 text-xs hover:bg-gray-50 flex items-center gap-1"
                >
                  <FiMoreVertical size={12} /><span>Actions</span>
                </button>
                {showActionsMenu && (
                  <div className="absolute right-0 mt-1 w-48 bg-white border border-gray-300 shadow-lg z-50">
                    <button
                      onClick={handleDuplicate}
                      className="w-full px-3 py-2 text-xs text-left hover:bg-gray-50 flex items-center gap-2 border-b border-gray-100"
                    >
                      <FiCopy size={12} /><span>Dupliquer</span>
                    </button>
                    <button
                      onClick={handleDelete}
                      className="w-full px-3 py-2 text-xs text-left hover:bg-red-50 flex items-center gap-2 text-red-600"
                    >
                      <FiTrash2 size={12} /><span>Supprimer</span>
                    </button>
                  </div>
                )}
              </div>
              <button
                onClick={handleDiscardChanges}
                className="px-3 py-1.5 border border-gray-300 text-gray-700 text-xs hover:bg-gray-50 flex items-center gap-1"
              >
                <FiX size={12} /><span>Ignorer</span>
              </button>
              <button
                onClick={handleSubmit}
                disabled={submitLoading || !isBalanced}
                className="px-3 py-1.5 bg-purple-600 text-white text-xs flex items-center gap-1 hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <FiSave size={12} /><span>Enregistrer</span>
              </button>
            </div>
          </div>
        </div>

        {/* ── En-tête ligne 2 (comme dans Create et Show) ── */}
        <div className="border-b border-gray-300 px-4 py-3 flex items-center justify-between">
          <button
            onClick={handleToggleState}
            disabled={submitLoading || !isBalanced}
            className={`px-4 py-2 font-medium text-xs flex items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed ${
              isDraft 
                ? 'bg-purple-600 text-white hover:bg-purple-700' 
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
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

        {/* ── Messages erreur/succès ── */}
        {(error || success) && (
          <div className={`px-4 py-2 text-xs border-b ${error ? 'bg-red-50 text-red-700 border-red-200' : 'bg-green-50 text-green-700 border-green-200'}`}>
            {error || success}
          </div>
        )}

        {/* ── Informations pièce ── */}
        <div className="px-4 py-3 border-b border-gray-300">
          <div className="grid grid-cols-2 gap-4">
            {/* Colonne gauche */}
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
                    onSelect={(id, label) => {
                      setFormData(prev => ({ ...prev, currency_id: id, currency_label: label }));
                      markAsModified();
                    }}
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
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-2 text-xs font-medium border-b-2 transition-colors ${
                  activeTab === tab 
                    ? 'border-purple-600 text-purple-600' 
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                {tab === 'ecritures' ? 'Écritures comptables' : 
                 tab === 'notes' ? 'Notes' : 'Pièces jointes'}
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
                      <tr key={line.id || lineIndex} className="hover:bg-gray-50">

                        {/* Compte */}
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

                        {/* Partenaire */}
                        <td className="border border-gray-300 p-1" style={{ minWidth: '120px' }}>
                          <AutocompleteInput
                            value={line.partner_label}
                            selectedId={line.partner_id}
                            onChange={(text) => handleLineChange(lineIndex, 'partner_label', text)}
                            onSelect={(id, label) =>
                              handleLineMultiChange(lineIndex, { partner_id: id, partner_label: label })
                            }
                            options={partners}
                            getOptionLabel={(o) => {
                              if (o.raison_sociale) return o.raison_sociale;
                              if (o.nom && o.prenom) return `${o.prenom} ${o.nom}`;
                              if (o.nom) return o.nom;
                              if (o.name) return o.name;
                              return 'Partenaire sans nom';
                            }}
                            placeholder="Sélectionner…"
                          />
                        </td>

                        <td className="border border-gray-300 p-1" style={{ minWidth: '150px' }}>
                          <input
                            type="text"
                            value={line.name}
                            onChange={(e) => handleLineChange(lineIndex, 'name', e.target.value)}
                            className="w-full px-2 py-1 border-0 text-xs focus:ring-1 focus:ring-blue-500"
                            style={{ height: '26px' }}
                            placeholder="Libellé de l'écriture"
                          />
                        </td>

                        <td className="border border-gray-300 p-1" style={{ minWidth: '80px' }}>
                          <input
                            type="text"
                            value={line.taxes}
                            onChange={(e) => handleLineChange(lineIndex, 'taxes', e.target.value)}
                            className="w-full px-2 py-1 border-0 text-xs focus:ring-1 focus:ring-blue-500"
                            style={{ height: '26px' }}
                            placeholder="TVA 18%"
                          />
                        </td>

                        <td className="border border-gray-300 p-1" style={{ minWidth: '100px' }}>
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

                        <td className="border border-gray-300 p-1" style={{ minWidth: '100px' }}>
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

                        <td className="border border-gray-300 p-1" style={{ minWidth: '120px' }}>
                          <input
                            type="date"
                            value={line.discount_date}
                            onChange={(e) => handleLineChange(lineIndex, 'discount_date', e.target.value)}
                            className="w-full px-2 py-1 border-0 text-xs focus:ring-1 focus:ring-blue-500"
                            style={{ height: '26px' }}
                          />
                        </td>

                        <td className="border border-gray-300 p-1" style={{ minWidth: '120px' }}>
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

                        <td className="border border-gray-300 p-1 w-[40px]">
                          <button
                            onClick={() => removeLine(lineIndex)}
                            tabIndex="-1"
                            className="w-full flex items-center justify-center p-1 text-gray-400 hover:text-red-600 transition-colors"
                            style={{ height: '26px' }}
                            title="Supprimer cette ligne"
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
                  <FiPlus size={10} /><span>Ajouter une ligne</span>
                </button>
              </div>

              <div className={`px-4 py-2 flex justify-end gap-8 ${isBalanced ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
                <div>
                  <span className="text-xs text-gray-600 mr-2">Total Débit:</span>
                  <span className="text-sm font-bold text-green-700">
                    {totals.debit.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} XOF
                  </span>
                </div>
                <div>
                  <span className="text-xs text-gray-600 mr-2">Total Crédit:</span>
                  <span className="text-sm font-bold text-red-700">
                    {totals.credit.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} XOF
                  </span>
                </div>
                <div>
                  <span className="text-xs text-gray-600 mr-2">Solde:</span>
                  <span className={`text-sm font-bold ${isBalanced ? 'text-green-700' : 'text-red-700'}`}>
                    {Math.abs(totals.debit - totals.credit).toLocaleString('fr-FR', { minimumFractionDigits: 2 })} XOF
                    {isBalanced ? ' (Équilibré)' : ' (Non équilibré)'}
                  </span>
                </div>
              </div>
            </>
          ) : activeTab === 'notes' ? (
            <div className="border border-gray-300">
              <textarea
                value={formData.notes}
                onChange={(e) => handleChange('notes', e.target.value)}
                className="w-full h-48 px-3 py-2 border-0 text-xs focus:ring-2 focus:ring-blue-500"
                placeholder="Ajouter des notes…"
              />
            </div>
          ) : (
            <div className="border border-gray-300 p-6">
              <div className="text-center py-8">
                <FiFileText className="w-10 h-10 text-gray-400 mx-auto mb-3" />
                <div className="text-gray-500 text-xs mb-4">Aucune pièce jointe</div>
                <p className="text-xs text-gray-400">
                  Gérez les pièces jointes depuis la page de détail
                </p>
              </div>
            </div>
          )}
        </div>

        {/* ── Pied de page avec boutons ── */}
        <div className="border-t border-gray-300 px-4 py-3 flex justify-end gap-2">
          <Link
            to={`/comptabilite/pieces/${id}`}
            className="px-4 py-2 border border-gray-300 text-gray-700 text-xs hover:bg-gray-50"
          >
            Annuler
          </Link>
          <button
            onClick={handleSubmit}
            disabled={submitLoading || !isBalanced}
            className="px-4 py-2 bg-purple-600 text-white text-xs hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
          >
            {submitLoading ? (
              <>
                <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white"></div>
                <span>Mise à jour...</span>
              </>
            ) : (
              <>
                <FiSave size={12} />
                <span>Mettre à jour</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* ── Dialogue confirmation annulation ── */}
      {showConfirmDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 max-w-md w-full mx-4">
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