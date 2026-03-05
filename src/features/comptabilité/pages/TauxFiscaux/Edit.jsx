import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { 
  FiPlus, 
  FiTrash2, 
  FiCheck, 
  FiCopy, 
  FiRotateCcw, 
  FiMoreVertical, 
  FiSave, 
  FiX, 
  FiAlertCircle, 
  FiBriefcase,
  FiPercent,
  FiGlobe,
  FiCreditCard
} from 'react-icons/fi';
import { useEntity } from '../../../../context/EntityContext';
import { apiClient } from '../../../../services/apiClient';
import { authService } from '../../../../services/authService';

// ==========================================
// COMPOSANT AUTOCOMPLETE RÉUTILISABLE (identique au modèle)
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
// COMPOSANT PRINCIPAL - TAUX FISCAUX (édition)
// ==========================================
export default function TauxFiscauxEdit() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { activeEntity } = useEntity();

  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [showActionsMenu, setShowActionsMenu] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isAutoSaving, setIsAutoSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('general');
  
  const [accounts, setAccounts] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [pays, setPays] = useState([]);
  
  const [formData, setFormData] = useState({
    name: '',
    amount: '',
    amount_type: 'percent',
    type_tax_use: 'sale',
    company: '',
    company_label: '',
    account: '',
    account_label: '',
    refund_account: '',
    refund_account_label: '',
    country: '',
    country_label: '',
    manual_company: '',
    notes: '',
    fiscal_position: '',
    state: 'draft'
  });

  const actionsMenuRef = useRef(null);

  // Vérifier l'authentification
  useEffect(() => {
    if (!activeEntity) {
      setError('Vous devez sélectionner une entité pour modifier un taux fiscal');
    }
  }, [activeEntity]);

  // Charger les données
  useEffect(() => {
    if (activeEntity && id) {
      loadData();
    }
  }, [activeEntity, id]);

  // Fermer le menu des actions au clic extérieur
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (actionsMenuRef.current && !actionsMenuRef.current.contains(e.target)) {
        setShowActionsMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      // Charger le taux et les données associées
      const [taxRes, accountsRes, paysRes] = await Promise.all([
        apiClient.get(`/compta/taxes/${id}/`),
        apiClient.get('/compta/accounts/').catch(() => ({ data: [] })),
        apiClient.get('/pays/').catch(() => ({ data: [] }))
      ]);

      const taxData = extractData(taxRes);
      setAccounts(extractData(accountsRes));
      setPays(extractData(paysRes));

      // Charger les entreprises si authentifié
      if (authService.isAuthenticated()) {
        const companiesRes = await apiClient.get('/entites/').catch(() => ({ data: [] }));
        setCompanies(extractData(companiesRes));
      }

      // Remplir le formulaire
      setFormData({
        name: taxData.name || '',
        amount: taxData.amount || '',
        amount_type: taxData.amount_type || 'percent',
        type_tax_use: taxData.type_tax_use || 'sale',
        company: taxData.company?.id || taxData.company || '',
        company_label: getCompanyLabel(taxData.company),
        account: taxData.account?.id || taxData.account || '',
        account_label: getAccountLabel(taxData.account),
        refund_account: taxData.refund_account?.id || taxData.refund_account || '',
        refund_account_label: getAccountLabel(taxData.refund_account),
        country: taxData.country?.id || taxData.country || '',
        country_label: getCountryLabel(taxData.country),
        notes: taxData.notes || '',
        fiscal_position: taxData.fiscal_position || '',
        manual_company: '',
        state: taxData.state || 'draft'
      });

    } catch (err) {
      console.error('❌ Erreur chargement taux:', err);
      setError('Impossible de charger les données du taux fiscal');
    } finally {
      setLoading(false);
    }
  };

  const extractData = (response) => {
    if (!response) return [];
    if (Array.isArray(response)) return response;
    if (response.data && Array.isArray(response.data)) return response.data;
    if (response.results && Array.isArray(response.results)) return response.results;
    return response; // Pour l'objet unique
  };

  const getCompanyLabel = (company) => {
    if (!company) return '';
    if (typeof company === 'object') {
      return company.raison_sociale || company.nom || company.name || '';
    }
    return '';
  };

  const getAccountLabel = (account) => {
    if (!account) return '';
    if (typeof account === 'object') {
      return `${account.code} - ${account.name}`;
    }
    return '';
  };

  const getCountryLabel = (country) => {
    if (!country) return '';
    if (typeof country === 'object') {
      return `${country.emoji || '🌍'} ${country.nom_fr || country.nom}`;
    }
    return '';
  };

  const markAsModified = () => {
    if (!hasUnsavedChanges) setHasUnsavedChanges(true);
  };

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    markAsModified();
  };

  // Préparation des données pour l'API
  const prepareDataForApi = useCallback(() => {
    return {
      name: formData.name,
      amount: parseFloat(formData.amount) || 0,
      amount_type: formData.amount_type,
      type_tax_use: formData.type_tax_use,
      account: formData.account || null,
      refund_account: formData.refund_account || null,
      country: formData.country || null,
      company: formData.company || null,
      company_name: formData.manual_company || null,
      notes: formData.notes || '',
      fiscal_position: formData.fiscal_position || '',
      state: formData.state
    };
  }, [formData]);

  // Sauvegarde automatique
  const saveAutoDraft = useCallback(async () => {
    if (!hasUnsavedChanges || isAutoSaving || !activeEntity || !id) return;
    setIsAutoSaving(true);
    try {
      const apiData = prepareDataForApi();
      await apiClient.put(`/compta/taxes/${id}/`, apiData);
      setHasUnsavedChanges(false);
    } catch (err) {
      console.error('❌ Erreur sauvegarde automatique:', err);
    } finally {
      setIsAutoSaving(false);
    }
  }, [hasUnsavedChanges, isAutoSaving, id, activeEntity, prepareDataForApi]);

  useEffect(() => {
    const handleBeforeUnload = () => {
      if (hasUnsavedChanges) saveAutoDraft();
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasUnsavedChanges, saveAutoDraft]);

  // Mettre à jour le taux
  const handleSubmit = async () => {
    // Validation
    if (!formData.name.trim()) {
      setError('Le nom du taux est obligatoire');
      return;
    }

    if (!formData.amount || parseFloat(formData.amount) <= 0) {
      setError('Le montant doit être supérieur à 0');
      return;
    }

    const companyValue = formData.company || formData.manual_company;
    if (!companyValue) {
      setError('L\'entreprise est obligatoire');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const apiData = prepareDataForApi();
      await apiClient.put(`/compta/taxes/${id}/`, apiData);
      
      setSuccess('Taux fiscal mis à jour avec succès !');
      setHasUnsavedChanges(false);
      
      // Rediriger après un court délai
      setTimeout(() => {
        navigate('/comptabilite/taux-fiscaux');
      }, 1500);

    } catch (err) {
      console.error('❌ Erreur modification taux:', err);
      const detail = err.response?.data 
        ? JSON.stringify(err.response.data, null, 2)
        : err.message;
      setError(`Erreur lors de la modification : ${detail}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Comptabiliser / remettre en brouillon
  const handleToggleState = async () => {
    if (!activeEntity) { setError('Vous devez sélectionner une entité'); return; }

    setIsSubmitting(true);
    setError(null);

    try {
      const newState = formData.state === 'draft' ? 'posted' : 'draft';
      const apiData = { ...prepareDataForApi(), state: newState };

      await apiClient.put(`/compta/taxes/${id}/`, apiData);

      setFormData(prev => ({ ...prev, state: newState }));
      setSuccess(newState === 'posted'
        ? 'Taux fiscal comptabilisé avec succès !'
        : 'Taux fiscal remis en brouillon avec succès !');
      setHasUnsavedChanges(false);
    } catch (err) {
      console.error('❌ Erreur changement état:', err);
      const detail = err.response?.data
        ? JSON.stringify(err.response.data, null, 2)
        : err.message;
      setError(`Erreur lors du changement d'état : ${detail}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDiscardChanges = () => setShowConfirmDialog(true);
  
  const confirmDiscardChanges = () => {
    loadData(); // Recharger les données originales
    setHasUnsavedChanges(false);
    setShowConfirmDialog(false);
    setSuccess('Modifications annulées.');
  };

  const handleNewTax = () => {
    if (hasUnsavedChanges) saveAutoDraft();
    navigate('/comptabilite/taux-fiscaux/create');
  };

  const handleGoToList = () => {
    if (hasUnsavedChanges) saveAutoDraft();
    navigate('/comptabilite/taux-fiscaux');
  };

  const handleDuplicate = async () => {
    try {
      const response = await apiClient.post('/compta/taxes/', {
        name: `${formData.name} (copie)`,
        amount: formData.amount,
        amount_type: formData.amount_type,
        type_tax_use: formData.type_tax_use,
        account: formData.account || null,
        refund_account: formData.refund_account || null,
        country: formData.country || null,
        company: formData.company || null,
        company_name: formData.manual_company || null,
        notes: formData.notes,
        fiscal_position: formData.fiscal_position
      });
      setSuccess('Taux dupliqué avec succès !');
      setTimeout(() => {
        navigate(`/comptabilite/taux-fiscaux/${response.data.id}/edit`);
      }, 1500);
    } catch (err) {
      alert('Erreur duplication: ' + (err.message || 'Erreur inconnue'));
    }
    setShowActionsMenu(false);
  };

  const handleDelete = async () => {
    if (!window.confirm(`Supprimer le taux "${formData.name}" ?`)) return;
    
    try {
      await apiClient.delete(`/compta/taxes/${id}/`);
      navigate('/comptabilite/taux-fiscaux');
    } catch (err) {
      alert('Erreur suppression: ' + (err.message || 'Erreur inconnue'));
    }
    setShowActionsMenu(false);
  };

  const handleExtourner = () => {
    setSuccess("Fonctionnalité d'extourne à implémenter");
    setShowActionsMenu(false);
  };

  const isDraft = formData.state === 'draft';

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-4">
        <div className="max-w-7xl mx-auto bg-white border border-gray-300 p-8">
          <div className="flex justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
          </div>
        </div>
      </div>
    );
  }

  // Rendu : pas d'entité
  if (!activeEntity) {
    return (
      <div className="min-h-screen bg-gray-50 p-4">
        <div className="max-w-7xl mx-auto bg-white border border-gray-300">
          <div className="border-b border-gray-300 px-4 py-3">
            <div className="text-lg font-bold text-gray-900">Modifier un taux fiscal</div>
          </div>
          <div className="p-8">
            <div className="bg-yellow-50 border border-yellow-200 rounded p-6 text-center">
              <FiAlertCircle className="text-yellow-600 mx-auto mb-3" size={32} />
              <p className="text-yellow-800 font-medium text-lg mb-3">Aucune entité sélectionnée</p>
              <p className="text-sm text-gray-600 mb-4">
                Vous devez sélectionner une entité pour modifier un taux fiscal.
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

        {/* ── En-tête ligne 1 (exactement comme le modèle) ── */}
        <div className="border-b border-gray-300 px-4 py-3">
          <div className="flex items-start justify-between mb-2">
            <div className="flex items-start gap-3">
              <button 
                onClick={handleNewTax}
                className="px-3 py-1.5 border border-gray-300 text-gray-700 text-xs hover:bg-gray-50 flex items-center gap-1"
              >
                <FiPlus size={12} /><span>Nouveau</span>
              </button>
              <div className="flex flex-col">
                <div 
                  className="text-lg font-bold text-gray-900 cursor-pointer hover:text-purple-600"
                  onClick={handleGoToList}
                >
                  Taux fiscaux
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
                <button 
                  onClick={() => setShowActionsMenu(!showActionsMenu)}
                  className="px-3 py-1.5 border border-gray-300 text-gray-700 text-xs hover:bg-gray-50 flex items-center gap-1"
                >
                  <FiMoreVertical size={12} /><span>Actions</span>
                </button>
                {showActionsMenu && (
                  <div className="absolute right-0 mt-1 w-48 bg-white border border-gray-300 shadow-lg rounded-sm z-50">
                    <button 
                      onClick={handleDuplicate}
                      className="w-full px-3 py-2 text-xs text-left hover:bg-gray-50 flex items-center gap-2 border-b border-gray-100"
                    >
                      <FiCopy size={12} /><span>Dupliquer</span>
                    </button>
                    <button 
                      onClick={handleDelete}
                      className="w-full px-3 py-2 text-xs text-left hover:bg-gray-50 flex items-center gap-2 border-b border-gray-100"
                    >
                      <FiTrash2 size={12} /><span>Supprimer</span>
                    </button>
                    <button 
                      onClick={handleExtourner}
                      className="w-full px-3 py-2 text-xs text-left hover:bg-gray-50 flex items-center gap-2"
                    >
                      <FiRotateCcw size={12} /><span>Extourné</span>
                    </button>
                  </div>
                )}
              </div>
              <button 
                onClick={handleDiscardChanges}
                className="px-3 py-1.5 border border-gray-300 text-gray-700 text-xs hover:bg-gray-50 flex items-center gap-1"
              >
                <FiX size={12} /><span>Ignorer les modifications</span>
              </button>
              <button 
                onClick={handleSubmit} 
                disabled={isSubmitting}
                className="px-3 py-1.5 bg-purple-600 text-white text-xs flex items-center gap-1 hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <FiSave size={12} /><span>Mettre à jour</span>
              </button>
            </div>
          </div>
        </div>

        {/* ── En-tête ligne 2 (exactement comme le modèle) ── */}
        <div className="border-b border-gray-300 px-4 py-3 flex items-center justify-between">
          <button 
            onClick={handleToggleState} 
            disabled={isSubmitting}
            className={`px-4 py-2 font-medium text-xs flex items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed ${
              isDraft ? 'bg-purple-600 text-white hover:bg-purple-700' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
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

        {/* ── Indicateur modifications (exactement comme le modèle) ── */}
        {hasUnsavedChanges && (
          <div className="px-4 py-1 bg-blue-50 text-blue-700 text-xs border-b border-blue-200 flex items-center justify-between">
            <span>Modifications non sauvegardées</span>
            {isAutoSaving && <span className="animate-pulse">Sauvegarde en cours…</span>}
          </div>
        )}

        {/* ── Informations du taux ── */}
        <div className="px-4 py-3 border-b border-gray-300">
          <div className="grid grid-cols-2 gap-4">
            {/* Colonne gauche */}
            <div className="space-y-2">
              <div className="flex items-center" style={{ height: '26px' }}>
                <label className="text-xs text-gray-700 min-w-[140px] font-medium">Nom de la taxe</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => handleChange('name', e.target.value)}
                  className="flex-1 px-2 py-1 border border-gray-300 text-xs ml-2"
                  style={{ height: '26px' }}
                  placeholder="Ex: TVA 18%"
                />
              </div>
              <div className="flex items-center" style={{ height: '26px' }}>
                <label className="text-xs text-gray-700 min-w-[140px] font-medium">Valeur de la taxe</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.amount}
                  onChange={(e) => handleChange('amount', e.target.value)}
                  className="flex-1 px-2 py-1 border border-gray-300 text-xs ml-2"
                  style={{ height: '26px' }}
                  placeholder="Ex: 18"
                />
              </div>
            </div>
            {/* Colonne droite */}
            <div className="space-y-2">
              <div className="flex items-center" style={{ height: '26px' }}>
                <label className="text-xs text-gray-700 min-w-[140px] font-medium">Type de valeur</label>
                <select
                  value={formData.amount_type}
                  onChange={(e) => handleChange('amount_type', e.target.value)}
                  className="flex-1 px-2 py-1 border border-gray-300 text-xs ml-2"
                  style={{ height: '26px' }}
                >
                  <option value="percent">Pourcentage</option>
                  <option value="fixed">Montant fixe</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* ── Onglets (exactement comme le modèle) ── */}
        <div className="border-b border-gray-300">
          <div className="px-4 flex">
            {['comptable', 'avance', 'notes'].map(tab => (
              <button 
                key={tab} 
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-2 text-xs font-medium border-b-2 transition-colors ${
                  activeTab === tab ? 'border-purple-600 text-purple-600' : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                {tab === 'comptable' ? 'Paramètres comptables' : tab === 'avance' ? 'Paramètres avancés' : 'Notes'}
              </button>
            ))}
          </div>
        </div>

        {/* ── Contenu onglets ── */}
        <div className="p-4">
          {activeTab === 'comptable' && (
            <div className="space-y-2">
              <div className="flex items-center" style={{ height: '26px' }}>
                <label className="text-xs text-gray-700 min-w-[200px] font-medium">Compte de taxe</label>
                <div className="flex-1 ml-2 border border-gray-300">
                  <AutocompleteInput
                    value={formData.account_label}
                    selectedId={formData.account}
                    onChange={(text) => handleChange('account_label', text)}
                    onSelect={(id, label) => {
                      handleChange('account', id);
                      handleChange('account_label', label);
                      markAsModified();
                    }}
                    options={accounts}
                    getOptionLabel={(a) => `${a.code} - ${a.name}`}
                    placeholder="Sélectionnez un compte"
                  />
                </div>
              </div>

              <div className="flex items-center" style={{ height: '26px' }}>
                <label className="text-xs text-gray-700 min-w-[200px] font-medium">Compte de remboursement</label>
                <div className="flex-1 ml-2 border border-gray-300">
                  <AutocompleteInput
                    value={formData.refund_account_label}
                    selectedId={formData.refund_account}
                    onChange={(text) => handleChange('refund_account_label', text)}
                    onSelect={(id, label) => {
                      handleChange('refund_account', id);
                      handleChange('refund_account_label', label);
                      markAsModified();
                    }}
                    options={accounts}
                    getOptionLabel={(a) => `${a.code} - ${a.name}`}
                    placeholder="Sélectionnez un compte"
                  />
                </div>
              </div>

              <div className="flex items-center" style={{ height: '26px' }}>
                <label className="text-xs text-gray-700 min-w-[200px] font-medium">Société</label>
                <div className="flex-1 ml-2 border border-gray-300">
                  {companies.length > 0 ? (
                    <AutocompleteInput
                      value={formData.company_label}
                      selectedId={formData.company}
                      onChange={(text) => handleChange('company_label', text)}
                      onSelect={(id, label) => {
                        handleChange('company', id);
                        handleChange('company_label', label);
                        handleChange('manual_company', '');
                        markAsModified();
                      }}
                      options={companies}
                      getOptionLabel={(c) => c.raison_sociale || c.nom || c.name || 'Sans nom'}
                      placeholder="Sélectionnez une société"
                    />
                  ) : (
                    <input
                      type="text"
                      value={formData.manual_company}
                      onChange={(e) => handleChange('manual_company', e.target.value)}
                      className="w-full px-2 py-1 border-0 text-xs"
                      style={{ height: '26px', backgroundColor: 'transparent' }}
                      placeholder="Nom de la société"
                    />
                  )}
                </div>
              </div>

              <div className="flex items-center" style={{ height: '26px' }}>
                <label className="text-xs text-gray-700 min-w-[200px] font-medium">Taxe utilisée sur</label>
                <select
                  value={formData.type_tax_use}
                  onChange={(e) => handleChange('type_tax_use', e.target.value)}
                  className="flex-1 px-2 py-1 border border-gray-300 text-xs ml-2"
                  style={{ height: '26px' }}
                >
                  <option value="sale">Ventes</option>
                  <option value="purchase">Achats</option>
                  <option value="both">Ventes et Achats</option>
                </select>
              </div>
            </div>
          )}

          {activeTab === 'avance' && (
            <div className="space-y-2">
              <div className="flex items-center" style={{ height: '26px' }}>
                <label className="text-xs text-gray-700 min-w-[200px] font-medium">Pays</label>
                <div className="flex-1 ml-2 border border-gray-300">
                  <AutocompleteInput
                    value={formData.country_label}
                    selectedId={formData.country}
                    onChange={(text) => handleChange('country_label', text)}
                    onSelect={(id, label) => {
                      handleChange('country', id);
                      handleChange('country_label', label);
                      markAsModified();
                    }}
                    options={pays}
                    getOptionLabel={(p) => `${p.emoji || '🌍'} ${p.nom_fr || p.nom} (${p.code_iso})`}
                    placeholder="Sélectionnez un pays"
                  />
                </div>
              </div>

              <div className="flex items-center" style={{ height: '26px' }}>
                <label className="text-xs text-gray-700 min-w-[200px] font-medium">Position fiscale</label>
                <input
                  type="text"
                  value={formData.fiscal_position}
                  onChange={(e) => handleChange('fiscal_position', e.target.value)}
                  className="flex-1 px-2 py-1 border border-gray-300 text-xs ml-2"
                  style={{ height: '26px' }}
                  placeholder="Optionnel"
                />
              </div>
            </div>
          )}

          {activeTab === 'notes' && (
            <div className="border border-gray-300">
              <textarea
                value={formData.notes}
                onChange={(e) => handleChange('notes', e.target.value)}
                rows={8}
                className="w-full px-3 py-2 border-0 text-xs focus:ring-2 focus:ring-blue-500"
                placeholder="Ajouter des notes…"
              />
            </div>
          )}
        </div>

        {/* ── Messages erreur/succès (exactement comme le modèle) ── */}
        {(error || success) && (
          <div className={`px-4 py-3 text-sm border-t border-gray-300 ${error ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'}`}>
            {error || success}
          </div>
        )}
      </div>

      {/* ── Dialogue confirmation (exactement comme le modèle) ── */}
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