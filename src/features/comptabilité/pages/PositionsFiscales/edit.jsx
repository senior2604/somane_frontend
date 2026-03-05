import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { 
  FiPlus, FiEdit, FiTrash2, FiX, FiSave,
  FiRefreshCw, FiPrinter, FiCopy, FiMoreVertical,
  FiAlertCircle, FiCheck, FiUploadCloud, FiSettings,
  FiToggleRight, FiPercent, FiGlobe, FiBriefcase,
  FiInfo, FiRotateCcw
} from 'react-icons/fi';
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
export default function EditPositionFiscale() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { activeEntity } = useEntity();

  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [showActionsMenu, setShowActionsMenu] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isAutoSaving, setIsAutoSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('configuration'); // 'configuration', 'notes'
  
  const [pays, setPays] = useState([]);
  const [companies, setCompanies] = useState([]);

  const [formData, setFormData] = useState({
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
  });

  const actionsMenuRef = useRef(null);

  useEffect(() => {
    if (id) {
      loadData();
    }
  }, [id]);

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
  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('📥 Chargement des données pour édition:', id);
      
      // Charger toutes les données en parallèle
      const [positionRes, paysRes] = await Promise.all([
        apiClient.get(`/compta/fiscal-positions/${id}/`),
        apiClient.get('/pays/').catch(() => ({ data: [] }))
      ]);

      const positionData = positionRes.data || positionRes;
      console.log('✅ Position chargée:', positionData);

      const paysData = normalizeApiResponse(paysRes);
      setPays(paysData);

      // Charger les entreprises si authentifié
      if (authService.isAuthenticated()) {
        const companiesRes = await apiClient.get('/entites/').catch(() => ({ data: [] }));
        const companiesData = normalizeApiResponse(companiesRes);
        setCompanies(companiesData);
      }

      // Trouver le libellé du pays
      const pays = paysData.find(p => p.id === positionData.country) ||
                   paysData.find(p => p.id === positionData.country?.id);

      // Trouver le libellé de l'entreprise
      const company = companies.find(c => c.id === positionData.company) ||
                     companies.find(c => c.id === positionData.company?.id);

      // Mettre à jour le formulaire
      setFormData({
        name: positionData.name || '',
        country_id: pays?.id || positionData.country || '',
        country_label: pays ? (pays.emoji ? `${pays.emoji} ${pays.nom_fr || pays.nom}` : (pays.nom_fr || pays.nom)) : '',
        company_id: company?.id || positionData.company || '',
        company_label: company ? (company.raison_sociale || company.nom || company.name || '') : '',
        auto_apply: positionData.auto_apply || false,
        vat_required: positionData.vat_required || false,
        note: positionData.note || positionData.description || '',
        active: positionData.active !== false,
        sequence: positionData.sequence || 10
      });

      setHasUnsavedChanges(false);
      
    } catch (err) {
      console.error('❌ Erreur chargement données:', err);
      if (err.status === 404) {
        setError('Position fiscale non trouvée');
      } else {
        setError(`Erreur de chargement: ${err.message || 'Inconnue'}`);
      }
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
  // PRÉPARATION DES DONNÉES POUR L'API
  // ==========================================
  const prepareDataForApi = useCallback(() => {
    const apiData = {
      name: formData.name,
      country_id: formData.country_id || null,
      company_id: activeEntity?.id || formData.company_id || null,
      auto_apply: formData.auto_apply,
      vat_required: formData.vat_required,
      note: formData.note || '',
      active: formData.active,
      sequence: formData.sequence
    };
    
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
    // Validation des champs obligatoires
    if (!formData.name.trim()) {
      if (!silent) setError('Le nom de la position fiscale est obligatoire');
      return false;
    }

    setIsSubmitting(true);
    if (!silent) setError(null);

    try {
      const apiData = prepareDataForApi();
      console.log('📤 Données envoyées (update):', JSON.stringify(apiData, null, 2));
      
      await apiClient.put(`/compta/fiscal-positions/${id}/`, apiData);
      
      if (!silent) {
        setSuccess('Position fiscale mise à jour avec succès !');
      }
      setHasUnsavedChanges(false);
      
      if (!silent) {
        setTimeout(() => {
          navigate(`/comptabilite/positions-fiscales/${id}`);
        }, 1500);
      }
      
      return true;
      
    } catch (err) {
      console.error('❌ Erreur mise à jour:', err);
      
      if (err.response?.data) {
        console.error('📄 Détails erreur serveur:', err.response.data);
        if (!silent) {
          const errorMsg = typeof err.response.data === 'object' 
            ? JSON.stringify(err.response.data) 
            : err.response.data;
          setError(`Erreur: ${errorMsg}`);
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
    if (!hasUnsavedChanges || isAutoSaving) return;
    setIsAutoSaving(true);
    try {
      await apiClient.put(`/compta/fiscal-positions/${id}/`, prepareDataForApi());
      setHasUnsavedChanges(false);
    } catch (err) {
      console.error('❌ Erreur sauvegarde automatique:', err);
    } finally {
      setIsAutoSaving(false);
    }
  }, [hasUnsavedChanges, isAutoSaving, id, prepareDataForApi]);

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
  const handleToggleActive = async () => {
    setIsSubmitting(true);
    setError(null);
    setSuccess(null);
    
    try {
      const newActive = !formData.active;
      await apiClient.patch(`/compta/fiscal-positions/${id}/`, {
        active: newActive
      });
      
      setFormData(prev => ({ ...prev, active: newActive }));
      setSuccess(newActive ? 'Position activée avec succès !' : 'Position désactivée avec succès !');
      setHasUnsavedChanges(false);
      
    } catch (err) {
      console.error('❌ Erreur changement statut:', err);
      const detail = err.response?.data
        ? JSON.stringify(err.response.data, null, 2)
        : err.message;
      setError(`Erreur lors du changement de statut : ${detail}`);
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

  const handleDuplicate = async () => {
    setIsSubmitting(true);
    try {
      const { id: _, ...data } = formData;
      data.name = `${data.name} (Copie)`;
      const result = await apiClient.post('/compta/fiscal-positions/', data);
      navigate(`/comptabilite/positions-fiscales/${result.id}/edit`);
    } catch (err) {
      setError('Erreur lors de la duplication: ' + err.message);
    } finally {
      setIsSubmitting(false);
      setShowActionsMenu(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm(`Êtes-vous sûr de vouloir supprimer cette position ?`)) return;
    
    setIsSubmitting(true);
    try {
      await apiClient.delete(`/compta/fiscal-positions/${id}/`);
      navigate('/comptabilite/positions-fiscales');
    } catch (err) {
      setError('Erreur lors de la suppression: ' + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatDateForDisplay = (dateString) => {
    if (!dateString) return '—';
    return new Date(dateString).toLocaleDateString('fr-FR', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-4">
        <div className="max-w-7xl mx-auto bg-white border border-gray-300">
          <div className="border-b border-gray-300 px-4 py-3">
            <div className="text-lg font-bold text-gray-900">Modifier la position fiscale</div>
          </div>
          <div className="p-8 flex items-center justify-center">
            <div className="text-center">
              <div className="w-8 h-8 border-2 border-purple-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
              <p className="mt-4 text-gray-600 text-sm">Chargement de la position...</p>
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
                  <span className="text-sm text-gray-900 font-medium">{formData.name || `#${id}`}</span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Tooltip text="Actualiser les données">
                <button
                  onClick={loadData}
                  disabled={loading}
                  className="h-8 px-3 border border-gray-300 text-gray-700 text-xs hover:bg-gray-50 hover:scale-105 hover:shadow-md active:scale-95 transition-all duration-200 flex items-center gap-1 disabled:opacity-50"
                >
                  <FiRefreshCw size={12} className={loading ? 'animate-spin' : ''} />
                  <span>Actualiser</span>
                </button>
              </Tooltip>
              
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
                      disabled={isSubmitting}
                      className="w-full px-3 py-2 text-xs text-left hover:bg-gray-50 hover:pl-4 transition-all duration-200 flex items-center gap-2 border-b border-gray-100 disabled:opacity-50"
                    >
                      <FiCopy size={12} /><span>Dupliquer</span>
                    </button>
                    <button
                      onClick={() => window.print()}
                      className="w-full px-3 py-2 text-xs text-left hover:bg-gray-50 hover:pl-4 transition-all duration-200 flex items-center gap-2 border-b border-gray-100"
                    >
                      <FiPrinter size={12} /><span>Imprimer</span>
                    </button>
                    <button
                      onClick={handleDelete}
                      disabled={isSubmitting}
                      className="w-full px-3 py-2 text-xs text-left hover:bg-red-50 hover:pl-4 transition-all duration-200 flex items-center gap-2 text-red-600 disabled:opacity-50"
                    >
                      <FiTrash2 size={12} /><span>Supprimer</span>
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
                onClick={handleToggleActive}
                disabled={isSubmitting}
                className={`
                  relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent 
                  transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2
                  ${formData.active ? 'bg-purple-600' : 'bg-gray-200'}
                  ${isSubmitting ? 'opacity-50 cursor-not-allowed' : ''}
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
                <AutocompleteInput
                  value={formData.country_label}
                  selectedId={formData.country_id}
                  onChange={(text) => handleChange('country_label', text)}
                  onSelect={(id, label) => handleMultiChange({ country_id: id, country_label: label })}
                  options={pays}
                  getOptionLabel={(o) => o.emoji ? `${o.emoji} ${o.nom_fr || o.nom || o.name}` : (o.nom_fr || o.nom || o.name)}
                  placeholder="Sélectionner un pays"
                />
              </div>
            </div>
            <div className="flex items-center" style={{ height: '26px' }}>
              <label className="text-xs text-gray-700 w-24 font-medium">Société</label>
              <div className="flex-1 ml-2 border border-gray-300 hover:border-purple-400 transition-colors" style={{ height: '26px' }}>
                {companies.length > 0 ? (
                  <AutocompleteInput
                    value={formData.company_label}
                    selectedId={formData.company_id}
                    onChange={(text) => handleChange('company_label', text)}
                    onSelect={(id, label) => handleMultiChange({ company_id: id, company_label: label })}
                    options={companies}
                    getOptionLabel={(o) => o.raison_sociale || o.nom || o.name}
                    placeholder="Sélectionner une entreprise"
                  />
                ) : (
                  <input
                    type="text"
                    value={formData.company_label}
                    onChange={(e) => handleChange('company_label', e.target.value)}
                    className="w-full px-2 py-1 text-xs hover:border-purple-400 focus:border-purple-600 transition-colors"
                    style={{ height: '26px', border: 'none', backgroundColor: 'transparent' }}
                    placeholder="Nom de l'entreprise (saisie manuelle)"
                  />
                )}
              </div>
            </div>
          </div>
        </div>

        {/* ── Onglets (comme dans Create et Show) ── */}
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

        {/* ── Pied de page avec métadonnées et bouton Annuler ── */}
        <div className="border-t border-gray-300 px-4 py-3 flex items-center justify-between">
          <div className="text-xs text-gray-500">
            <span>ID: {id}</span>
          </div>
          
          <div className="flex items-center gap-3">
            <Tooltip text="Recharger les données originales">
              <button
                onClick={loadData}
                disabled={loading}
                className="px-3 py-1.5 border border-gray-300 text-gray-700 text-xs hover:bg-gray-50 hover:scale-105 transition-all duration-200 flex items-center gap-1"
              >
                <FiRefreshCw size={12} className={loading ? 'animate-spin' : ''} />
                <span>Recharger</span>
              </button>
            </Tooltip>
            
            <Link
              to={`/comptabilite/positions-fiscales/${id}`}
              className="px-4 py-2 border border-gray-300 text-gray-700 text-xs hover:bg-gray-50 hover:scale-105 transition-all duration-200"
            >
              Annuler
            </Link>
            
            <button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="px-4 py-2 bg-purple-600 text-white text-xs hover:bg-purple-700 hover:scale-105 active:scale-95 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
            >
              {isSubmitting ? (
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