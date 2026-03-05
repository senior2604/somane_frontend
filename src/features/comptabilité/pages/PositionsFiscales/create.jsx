import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { 
  FiPlus, FiX, FiSave, FiUploadCloud,
  FiAlertCircle, FiCheck, FiMoreVertical, FiCopy,
  FiRefreshCw, FiTrash2, FiSettings, FiToggleRight,
  FiPercent, FiGlobe, FiBriefcase, FiInfo
} from "react-icons/fi";
import { apiClient } from '../../../../services/apiClient';
import { authService } from '../../../../services/authService';
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
// COMPOSANT PRINCIPAL
// ==========================================
export default function CreatePositionFiscale() {
  const navigate = useNavigate();
  const { activeEntity } = useEntity();

  const [loading, setLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [showActionsMenu, setShowActionsMenu] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isAutoSaving, setIsAutoSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('configuration'); // 'configuration', 'notes'
  const [positionId, setPositionId] = useState(null);
  
  const [pays, setPays] = useState([]);
  const [companies, setCompanies] = useState([]);

  const initialFormData = {
    name: '',
    country_id: '',
    country_label: '',
    company_id: '',
    company_label: '',
    auto_apply: false,
    vat_required: false,
    note: '',
    active: true,
    sequence: 10
  };

  const [formData, setFormData] = useState(initialFormData);

  const actionsMenuRef = useRef(null);

  useEffect(() => {
    if (!activeEntity) {
      setError('Vous devez sélectionner une entité pour créer une position fiscale');
    }
  }, [activeEntity]);

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

  // ==========================================
  // CHARGEMENT DES DONNÉES
  // ==========================================
  const loadOptions = async () => {
    setLoading(true);
    setError(null);
    
    try {
      console.log('🔍 Chargement des données...');
      
      // Charger les pays
      const paysRes = await apiClient.get('/pays/').catch(() => ({ data: [] }));
      const paysData = normalizeApiResponse(paysRes);
      setPays(paysData);
      console.log('✅ Pays chargés:', paysData.length);
      
      // Charger les entreprises
      if (authService.isAuthenticated()) {
        const companiesRes = await apiClient.get('/entites/').catch(() => ({ data: [] }));
        const companiesData = normalizeApiResponse(companiesRes);
        setCompanies(companiesData);
        console.log('✅ Entreprises chargées:', companiesData.length);
      }
      
    } catch (err) {
      console.error('❌ Erreur critique:', err);
      setError(`Erreur de chargement: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const markAsModified = () => {
    if (!hasUnsavedChanges) setHasUnsavedChanges(true);
  };

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    markAsModified();
  };

  const handleMultiChange = (fields) => {
    setFormData(prev => ({ ...prev, ...fields }));
    markAsModified();
  };

  // ==========================================
  // PRÉPARATION DES DONNÉES POUR L'API (CORRECTION ICI)
  // ==========================================
  const prepareDataForApi = useCallback(() => {
    // Récupérer l'ID de l'entreprise depuis l'entité active ou le formulaire
    const companyId = activeEntity?.id || formData.company_id || null;
    
    if (!companyId) {
      setError('L\'entreprise est obligatoire');
      return null;
    }

    // IMPORTANT: Le backend attend 'country' et 'company' (pas 'country_id'/'company_id')
    const apiData = {
      name: formData.name.trim(),
      country: formData.country_id || null,  // ← 'country' au lieu de 'country_id'
      company: companyId,                     // ← 'company' au lieu de 'company_id'
      auto_apply: formData.auto_apply,
      vat_required: formData.vat_required,
      note: formData.note || '',
      active: formData.active,
      sequence: parseInt(formData.sequence) || 10
    };
    
    // Supprimer les champs vides
    Object.keys(apiData).forEach(key => {
      if (apiData[key] === undefined || apiData[key] === '' || apiData[key] === null) {
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

    // Validation des champs obligatoires
    if (!formData.name.trim()) {
      if (!silent) setError('Le nom de la position fiscale est obligatoire');
      return false;
    }

    setIsSubmitting(true);
    if (!silent) setError(null);

    try {
      const apiData = prepareDataForApi();
      if (!apiData) {
        setIsSubmitting(false);
        return false;
      }
      
      console.log('📤 Données envoyées:', JSON.stringify(apiData, null, 2));
      
      const result = await apiClient.post('/compta/fiscal-positions/', apiData);
      
      if (!silent) {
        setSuccess('Position fiscale créée avec succès !');
      }
      setHasUnsavedChanges(false);
      
      if (result?.id) {
        setPositionId(result.id);
      }
      
      if (!silent) {
        setTimeout(() => {
          navigate('/comptabilite/positions-fiscales');
        }, 1500);
      }
      
      return true;
      
    } catch (err) {
      console.error('❌ Erreur création:', err);
      
      if (err.response?.data) {
        console.error('📄 Détails erreur serveur:', err.response.data);
        if (!silent) {
          // Afficher les erreurs de validation Django
          const errorData = err.response.data;
          if (typeof errorData === 'object') {
            const messages = Object.entries(errorData)
              .map(([field, errors]) => {
                if (Array.isArray(errors)) {
                  return `${field}: ${errors.join(', ')}`;
                } else if (typeof errors === 'object') {
                  return `${field}: ${JSON.stringify(errors)}`;
                }
                return `${field}: ${errors}`;
              })
              .join(' | ');
            setError(`Erreur: ${messages}`);
          } else {
            setError(`Erreur: ${errorData}`);
          }
        }
      } else {
        if (!silent) setError(`Erreur: ${err.message}`);
      }
      return false;
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    await handleSave(false);
  };

  // Sauvegarde automatique
  const saveAutoDraft = useCallback(async () => {
    if (!hasUnsavedChanges || isAutoSaving || !positionId) return;
    setIsAutoSaving(true);
    try {
      const apiData = prepareDataForApi();
      if (apiData) {
        await apiClient.put(`/compta/fiscal-positions/${positionId}/`, apiData);
        setHasUnsavedChanges(false);
      }
    } catch (err) {
      console.error('❌ Erreur sauvegarde automatique:', err);
    } finally {
      setIsAutoSaving(false);
    }
  }, [hasUnsavedChanges, isAutoSaving, positionId, prepareDataForApi]);

  useEffect(() => {
    const handleBeforeUnload = () => {
      if (hasUnsavedChanges) saveAutoDraft();
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasUnsavedChanges, saveAutoDraft]);

  // ==========================================
  // ACTIONS
  // ==========================================
  const handleDiscardChanges = () => setShowConfirmDialog(true);
  
  const confirmDiscardChanges = () => {
    setFormData(initialFormData);
    setPositionId(null);
    setHasUnsavedChanges(false);
    setShowConfirmDialog(false);
    setSuccess('Modifications annulées.');
  };

  const handleNewPosition = () => {
    if (hasUnsavedChanges) {
      handleSave(true);
    }
    navigate('/comptabilite/positions-fiscales/create');
  };

  const handleGoToList = () => {
    if (hasUnsavedChanges) {
      handleSave(true);
    }
    navigate('/comptabilite/positions-fiscales');
  };

  const handleDuplicate = () => {
    setSuccess('Duplication à implémenter');
    setShowActionsMenu(false);
  };

  const handleDelete = () => {
    setSuccess('Suppression à implémenter');
    setShowActionsMenu(false);
  };

  if (!activeEntity) {
    return (
      <div className="min-h-screen bg-gray-50 p-4">
        <div className="max-w-7xl mx-auto bg-white border border-gray-300">
          <div className="border-b border-gray-300 px-4 py-3">
            <div className="text-lg font-bold text-gray-900">Créer une position fiscale</div>
          </div>
          <div className="p-8">
            <div className="bg-yellow-50 border border-yellow-200 rounded p-6 text-center">
              <FiAlertCircle className="text-yellow-600 mx-auto mb-3" size={32} />
              <p className="text-yellow-800 font-medium text-lg mb-3">Aucune entité sélectionnée</p>
              <p className="text-sm text-gray-600 mb-4">
                Vous devez sélectionner une entité pour créer une position fiscale.
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

        {/* ── En-tête ligne 1 ── */}
        <div className="border-b border-gray-300 px-4 py-3">
          <div className="flex items-start justify-between mb-2">
            <div className="flex items-start gap-3">
              <Tooltip text="Créer une nouvelle position fiscale">
                <button 
                  onClick={handleNewPosition}
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
                  Positions Fiscales
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-sm text-gray-700 font-medium">Statut :</span>
                  <span className={`px-2 py-0.5 text-xs font-medium ${formData.active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                    {formData.active ? 'Active' : 'Inactive'}
                  </span>
                  <span className="text-sm text-gray-700 font-medium ml-2">Nom :</span>
                  <span className="text-sm text-gray-900 font-medium">{formData.name || '(Nouveau)'}</span>
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
                    <FiMoreVertical size={12} /><span>Actions</span>
                  </button>
                </Tooltip>
                {showActionsMenu && (
                  <div className="absolute right-0 mt-1 w-48 bg-white border border-gray-300 shadow-lg z-50">
                    <button 
                      onClick={handleDuplicate}
                      className="w-full px-3 py-2 text-xs text-left hover:bg-gray-50 hover:pl-4 transition-all duration-200 flex items-center gap-2 border-b border-gray-100"
                    >
                      <FiCopy size={12} /> Dupliquer
                    </button>
                    <button 
                      onClick={handleDelete}
                      className="w-full px-3 py-2 text-xs text-left hover:bg-red-50 hover:pl-4 transition-all duration-200 flex items-center gap-2 text-red-600"
                    >
                      <FiTrash2 size={12} /> Supprimer
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
              <Tooltip text="Enregistrer la position fiscale">
                <button 
                  onClick={handleSubmit} 
                  disabled={isSubmitting}
                  className="w-8 h-8 rounded-full bg-purple-600 text-white hover:bg-purple-700 hover:scale-110 hover:shadow-lg active:scale-90 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center shadow-sm"
                >
                  <FiUploadCloud size={16} />
                </button>
              </Tooltip>
            </div>
          </div>
        </div>

        {/* ── En-tête ligne 2 - Toggle Switch avec badges Actif/Inactif ── */}
        <div className="border-b border-gray-300 px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Tooltip text={formData.active ? "Désactiver la position" : "Activer la position"}>
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

        {/* ── Indicateur modifications ── */}
        {hasUnsavedChanges && (
          <div className="px-4 py-1 bg-blue-50 text-blue-700 text-xs border-b border-blue-200 flex items-center justify-between">
            <span>Modifications non sauvegardées</span>
            {isAutoSaving && <span className="animate-pulse">Sauvegarde en cours…</span>}
          </div>
        )}

        {/* ── Messages erreur/succès ── */}
        {(error || success) && (
          <div className={`px-4 py-2 text-sm border-b transition-all duration-300 ${
            error ? 'bg-red-50 text-red-700 border-red-200' : 'bg-green-50 text-green-700 border-green-200'
          }`}>
            <div className="flex items-center gap-2">
              {error ? <FiAlertCircle size={14} /> : <FiCheck size={14} />}
              <span>{error || success}</span>
            </div>
          </div>
        )}

        {/* ── INFORMATIONS DE BASE - HORS ONGLETS ── */}
        <div className="px-4 py-3 border-b border-gray-300">
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center" style={{ height: '26px' }}>
              <label className="text-xs text-gray-700 w-24 font-medium">
                Nom <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => handleChange('name', e.target.value)}
                className="flex-1 px-2 py-1 border border-gray-300 text-xs ml-2 hover:border-purple-400 focus:border-purple-600 transition-colors"
                style={{ height: '26px' }}
                placeholder="Ex: Exonération TVA, Export..."
                maxLength="128"
                required
              />
            </div>
            <div className="flex items-center" style={{ height: '26px' }}>
              <label className="text-xs text-gray-700 w-24 font-medium">Priorité</label>
              <input
                type="number"
                value={formData.sequence}
                onChange={(e) => handleChange('sequence', parseInt(e.target.value) || 10)}
                className="flex-1 px-2 py-1 border border-gray-300 text-xs ml-2 hover:border-purple-400 focus:border-purple-600 transition-colors"
                style={{ height: '26px' }}
                min="0"
                step="1"
              />
              <span className="text-xs text-gray-500 ml-2 whitespace-nowrap">Plus petit = plus prioritaire</span>
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4 mt-2">
            <div className="flex items-center" style={{ height: '26px' }}>
              <label className="text-xs text-gray-700 w-24 font-medium">Pays</label>
              <div className="flex-1 ml-2 border border-gray-300 hover:border-purple-400 transition-colors" style={{ height: '26px' }}>
                {loading ? (
                  <div className="h-[26px] px-2 border border-gray-300 bg-gray-50 text-xs flex items-center text-gray-500">
                    Chargement...
                  </div>
                ) : (
                  <AutocompleteInput
                    value={formData.country_label}
                    selectedId={formData.country_id}
                    onChange={(text) => handleChange('country_label', text)}
                    onSelect={(id, label) => handleMultiChange({ country_id: id, country_label: label })}
                    options={pays}
                    getOptionLabel={(o) => o.emoji ? `${o.emoji} ${o.nom_fr || o.nom || o.name}` : (o.nom_fr || o.nom || o.name)}
                    placeholder="Sélectionner un pays"
                  />
                )}
              </div>
            </div>
            <div className="flex items-center" style={{ height: '26px' }}>
              <label className="text-xs text-gray-700 w-24 font-medium">Société</label>
              <div className="flex-1 ml-2 px-2 py-1 bg-gray-100 border border-gray-300 text-xs text-gray-700 flex items-center gap-2" style={{ height: '26px' }}>
                <FiBriefcase size={12} className="text-purple-600" />
                {activeEntity?.raison_sociale || activeEntity?.nom || 'Non définie'}
              </div>
            </div>
          </div>
        </div>

        {/* ── Onglets (2 onglets uniquement) ── */}
        <div className="border-b border-gray-300">
          <div className="px-4 flex">
            <button 
              onClick={() => setActiveTab('configuration')}
              className={`px-4 py-2 text-xs font-medium border-b-2 transition-all duration-200 ${
                activeTab === 'configuration' 
                  ? 'border-purple-600 text-purple-600 hover:text-purple-800' 
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Configuration fiscale
            </button>
            <button 
              onClick={() => setActiveTab('notes')}
              className={`px-4 py-2 text-xs font-medium border-b-2 transition-all duration-200 ${
                activeTab === 'notes' 
                  ? 'border-purple-600 text-purple-600 hover:text-purple-800' 
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Notes
            </button>
          </div>
        </div>

        {/* ── Contenu des onglets ── */}
        <div className="p-4">
          {/* ONGLET 1: CONFIGURATION FISCALE */}
          {activeTab === 'configuration' && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center gap-2 p-2 border border-gray-200 hover:border-purple-300 transition-colors">
                  <input
                    type="checkbox"
                    id="auto_apply"
                    checked={formData.auto_apply}
                    onChange={(e) => handleChange('auto_apply', e.target.checked)}
                    className="w-4 h-4 text-purple-600 rounded focus:ring-purple-500"
                  />
                  <label htmlFor="auto_apply" className="text-sm text-gray-700 cursor-pointer hover:text-purple-600 transition-colors flex items-center gap-1">
                    <FiToggleRight size={16} className={formData.auto_apply ? 'text-purple-600' : 'text-gray-500'} />
                    Auto-application
                  </label>
                  <Tooltip text="Applique automatiquement cette position fiscale quand les conditions sont remplies">
                    <FiInfo size={12} className="text-gray-400 cursor-help" />
                  </Tooltip>
                </div>
                
                <div className="flex items-center gap-2 p-2 border border-gray-200 hover:border-purple-300 transition-colors">
                  <input
                    type="checkbox"
                    id="vat_required"
                    checked={formData.vat_required}
                    onChange={(e) => handleChange('vat_required', e.target.checked)}
                    className="w-4 h-4 text-purple-600 rounded focus:ring-purple-500"
                  />
                  <label htmlFor="vat_required" className="text-sm text-gray-700 cursor-pointer hover:text-purple-600 transition-colors flex items-center gap-1">
                    <FiPercent size={16} className={formData.vat_required ? 'text-purple-600' : 'text-gray-500'} />
                    TVA requise
                  </label>
                  <Tooltip text="La TVA est obligatoire pour cette position fiscale">
                    <FiInfo size={12} className="text-gray-400 cursor-help" />
                  </Tooltip>
                </div>
              </div>
              
            </div>
          )}

          {/* ONGLET 2: NOTES */}
          {activeTab === 'notes' && (
            <div className="border border-gray-300 hover:border-purple-400 transition-colors">
              <textarea
                value={formData.note}
                onChange={(e) => handleChange('note', e.target.value)}
                rows={8}
                className="w-full px-3 py-2 border-0 text-xs focus:ring-2 focus:ring-purple-500"
                placeholder="Ajouter des notes, descriptions, commentaires... (optionnel)"
              />
            </div>
          )}
        </div>    
      </div>

      {/* ── Dialogue confirmation annulation ── */}
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
                className="px-4 py-2 border border-gray-300 text-gray-700 text-sm hover:bg-gray-50 hover:scale-105 active:scale-95 transition-all duration-200"
              >
                Annuler
              </button>
              <button
                onClick={confirmDiscardChanges}
                className="px-4 py-2 bg-red-600 text-white text-sm hover:bg-red-700 hover:scale-105 active:scale-95 transition-all duration-200 flex items-center gap-1"
              >
                <FiX size={12} />
                <span>Ignorer les modifications</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}