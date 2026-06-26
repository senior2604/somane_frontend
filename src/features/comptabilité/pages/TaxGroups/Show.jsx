// src/features/comptabilité/pages/TaxGroups/Show.jsx

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { 
  FiPlus, FiTrash2, FiCheck, FiUploadCloud, FiX, FiAlertCircle,
  FiBriefcase, FiSettings, FiInfo, FiTag, FiCreditCard,
  FiFileText, FiCopy, FiRotateCcw, FiGlobe, FiHash
} from 'react-icons/fi';
import { useEntity } from '../../../../context/EntityContext';
import { apiClient } from '../../../../services/apiClient';

// ==========================================
// COMPOSANT TOOLTIP
// ==========================================
const Tooltip = ({ children, text, position = 'top' }) => {
  const [show, setShow] = useState(false);
  return (
    <div className="relative inline-block">
      <div onMouseEnter={() => setShow(true)} onMouseLeave={() => setShow(false)}>{children}</div>
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
const AutocompleteInput = ({ value, selectedId, onChange, onSelect, options, getOptionLabel, placeholder = "", disabled = false, onKeyDown, fieldName = "" }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [inputValue, setInputValue] = useState(value || '');
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const inputRef = useRef(null);
  const dropdownRef = useRef(null);
  const [dropdownStyle, setDropdownStyle] = useState({});

  useEffect(() => { if (value !== undefined) setInputValue(value); }, [value]);

  const filteredOptions = options.filter(option => getOptionLabel(option).toLowerCase().includes(inputValue.toLowerCase()));

  const updateDropdownPosition = () => {
    if (inputRef.current) {
      const rect = inputRef.current.getBoundingClientRect();
      setDropdownStyle({
        position: 'fixed', top: `${rect.bottom}px`, left: `${rect.left}px`,
        width: `${rect.width}px`, zIndex: 9999, maxHeight: '200px', overflowY: 'auto'
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
      return () => { window.removeEventListener('scroll', handleScroll, true); window.removeEventListener('resize', handleResize); };
    }
  }, [isOpen]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target) && inputRef.current && !inputRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleInputChange = (e) => {
    if (disabled) return;
    setInputValue(e.target.value);
    setIsOpen(true);
    setHighlightedIndex(0);
    onChange(e.target.value);
    if (selectedId) onSelect(null, '');
  };

  const handleSelectOption = (option) => {
    if (disabled) return;
    const label = getOptionLabel(option);
    const id = option.id;
    console.log(`🔍 [${fieldName}] Option sélectionnée:`, { id, label });
    setInputValue(label);
    setIsOpen(false);
    onSelect(id, label);
  };

  const handleKeyDown = (e) => {
    if (disabled) return;
    if (e.key === 'ArrowDown') { e.preventDefault(); setIsOpen(true); setHighlightedIndex(prev => prev < filteredOptions.length - 1 ? prev + 1 : prev); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setHighlightedIndex(prev => prev > 0 ? prev - 1 : 0); }
    else if (e.key === 'Enter' && isOpen && filteredOptions.length > 0) { e.preventDefault(); handleSelectOption(filteredOptions[highlightedIndex]); }
    else if (e.key === 'Escape') setIsOpen(false);
    if (onKeyDown) onKeyDown(e);
  };

  return (
    <>
      <input ref={inputRef} type="text" value={inputValue} onChange={handleInputChange} onKeyDown={handleKeyDown}
        onFocus={() => { if(!disabled) { setIsOpen(true); updateDropdownPosition(); } }} placeholder={placeholder} disabled={disabled}
        className={`w-full px-2 py-1 text-xs focus:ring-1 focus:ring-purple-500 focus:outline-none ${disabled ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : ''}`}
        style={{ height: '26px', border: 'none', backgroundColor: 'transparent' }} autoComplete="off"
      />
      {isOpen && !disabled && filteredOptions.length > 0 && (
        <div ref={dropdownRef} className="bg-white border border-gray-300 shadow-lg" style={dropdownStyle}>
          {filteredOptions.map((option, index) => (
            <div key={option.id} className={`px-2 py-1 text-xs cursor-pointer ${index === highlightedIndex ? 'bg-purple-100 text-purple-700' : 'hover:bg-purple-50'} ${option.id === selectedId ? 'bg-purple-50' : ''}`}
              onClick={() => handleSelectOption(option)} onMouseEnter={() => setHighlightedIndex(index)}>
              {getOptionLabel(option)}
            </div>
          ))}
        </div>
      )}
    </>
  );
};

// ==========================================
// UTILITAIRES
// ==========================================
const cleanId = (value) => {
  if (!value || value === '' || value === 'null' || value === 'undefined') return null;
  const parsed = parseInt(value, 10);
  return isNaN(parsed) ? null : parsed;
};

const normalizeData = (data) => {
  if (!data) return [];
  if (Array.isArray(data)) return data;
  if (data.results && Array.isArray(data.results)) return data.results;
  if (data.data && Array.isArray(data.data)) return data.data;
  return [];
};

// ==========================================
// COMPOSANT PRINCIPAL
// ==========================================
export default function TaxGroupsShow() {
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
  const [groupId, setGroupId] = useState(null);
  
  const [accounts, setAccounts] = useState([]);
  const [pays, setPays] = useState([]);
  
  const [formData, setFormData] = useState({
    name: '',
    sequence: 10,
    country: '',
    country_label: '',
    preceding_subtotal: '',
    property_tax_payable_account: '',
    property_tax_payable_account_label: '',
    property_tax_receivable_account: '',
    property_tax_receivable_account_label: '',
    property_advance_tax_payment_account: '',
    property_advance_tax_payment_account_label: '',
  });

  const actionsMenuRef = useRef(null);

  const getEntityName = useCallback(() => {
    if (!activeEntity) return 'Non définie';
    return activeEntity.nom || activeEntity.name || activeEntity.raison_sociale || 'Non définie';
  }, [activeEntity]);

  // Chargement des options
  const loadOptions = useCallback(async () => {
    if (!activeEntity || !activeEntity.id) return;

    try {
      const [accountsRes, paysRes] = await Promise.all([
        apiClient.get('/compta/accounts/', { params: { company: activeEntity.id } }).catch(() => ({ data: [] })),
        apiClient.get('/pays/').catch(() => ({ data: [] }))
      ]);

      const allAccounts = normalizeData(accountsRes);
      const operationalAccounts = allAccounts.filter(acc => acc.company !== null);
      setAccounts(operationalAccounts);
      setPays(normalizeData(paysRes));
      
    } catch (err) {
      console.error('❌ Erreur chargement options:', err);
    }
  }, [activeEntity]);

  // Chargement des données du groupe (OPTIMISÉ)
  const loadGroupData = useCallback(async () => {
    if (!id || !activeEntity) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const group = await apiClient.get(`/compta/tax-groups/${id}/`);
      
      if (!group || !group.id) {
        setError('❌ Groupe de taxes non trouvé');
        setLoading(false);
        return;
      }

      // ✅ Récupération des labels à partir des IDs (avec code + nom)
      let payableLabel = '';
      let receivableLabel = '';
      let advanceLabel = '';
      
      // Chercher le label du compte payable
      if (group.property_tax_payable_account) {
        const foundAccount = accounts.find(a => a.id === group.property_tax_payable_account);
        if (foundAccount) {
          // ✅ Afficher code + nom
          payableLabel = `${foundAccount.code} - ${foundAccount.name}`;
        } else {
          payableLabel = group.property_tax_payable_account_name || '';
        }
      }
      
      // Chercher le label du compte recevable
      if (group.property_tax_receivable_account) {
        const foundAccount = accounts.find(a => a.id === group.property_tax_receivable_account);
        if (foundAccount) {
          receivableLabel = `${foundAccount.code} - ${foundAccount.name}`;
        } else {
          receivableLabel = group.property_tax_receivable_account_name || '';
        }
      }
      
      // Chercher le label du compte acomptes
      if (group.property_advance_tax_payment_account) {
        const foundAccount = accounts.find(a => a.id === group.property_advance_tax_payment_account);
        if (foundAccount) {
          advanceLabel = `${foundAccount.code} - ${foundAccount.name}`;
        } else {
          advanceLabel = group.property_advance_tax_payment_account_name || '';
        }
      }

      setFormData({
        name: group.name || '',
        sequence: group.sequence || 10,
        country: group.country || '',
        country_label: group.country_name || group.country_label || '',
        preceding_subtotal: group.preceding_subtotal || '',
        property_tax_payable_account: group.property_tax_payable_account || '',
        property_tax_payable_account_label: payableLabel,
        property_tax_receivable_account: group.property_tax_receivable_account || '',
        property_tax_receivable_account_label: receivableLabel,
        property_advance_tax_payment_account: group.property_advance_tax_payment_account || '',
        property_advance_tax_payment_account_label: advanceLabel,
      });
      
      setGroupId(group.id);
      setHasUnsavedChanges(false);
      
    } catch (err) {
      console.error('❌ Erreur chargement groupe:', err);
      setError('❌ Impossible de charger les données du groupe');
    } finally {
      setLoading(false);
    }
  }, [id, activeEntity, accounts]);

  // OPTIMISATION : Charger les options PUIS le groupe
  useEffect(() => {
    const init = async () => {
      if (activeEntity && id) {
        await loadOptions();
      }
    };
    init();
  }, [activeEntity, id, loadOptions]);

  // Charger le groupe APRÈS que les comptes sont chargés
  useEffect(() => {
    if (accounts.length > 0 && id && activeEntity) {
      loadGroupData();
    }
  }, [accounts.length, id, activeEntity, loadGroupData]);

  useEffect(() => {
    const handleClickOutside = (e) => { if (actionsMenuRef.current && !actionsMenuRef.current.contains(e.target)) setShowActionsMenu(false); };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const markAsModified = () => { if (!hasUnsavedChanges) setHasUnsavedChanges(true); };

  const handleChange = (field, value) => { 
    setFormData(prev => ({ ...prev, [field]: value })); 
    markAsModified(); 
  };

  // Validation du formulaire
  const validateForm = () => {
    const errors = [];
    
    if (!formData.name.trim()) errors.push("❌ Le nom du groupe est obligatoire");
    if (!formData.sequence || parseInt(formData.sequence) <= 0) errors.push("❌ L'ordre doit être un nombre positif");
    
    return errors;
  };

  // Sauvegarde - CORRIGÉ avec _id
  const handleSave = async (silent = false) => {
    if (!activeEntity) { 
      setError('Vous devez sélectionner une entité'); 
      return false; 
    }
    
    const errors = validateForm();
    if (errors.length > 0) { 
      setError(errors.join('\n')); 
      return false; 
    }
    
    setIsSubmitting(true);
    if (!silent) setError(null);
    
    try {
      // ✅ CORRECTION : Utiliser les champs avec _id
      const payload = {
        name: formData.name,
        sequence: parseInt(formData.sequence) || 10,
        country: cleanId(formData.country),
        preceding_subtotal: formData.preceding_subtotal || '',
        property_tax_payable_account_id: cleanId(formData.property_tax_payable_account),
        property_tax_receivable_account_id: cleanId(formData.property_tax_receivable_account),
        property_advance_tax_payment_account_id: cleanId(formData.property_advance_tax_payment_account),
        company: activeEntity.id
      };
      
      console.log('🚀 PAYLOAD envoyé pour mise à jour:', payload);
      
      await apiClient.put(`/compta/tax-groups/${id}/`, payload);
      
      if (!silent) setSuccess('Groupe modifié avec succès !');
      setHasUnsavedChanges(false);
      
      // Recharger les données
      await loadGroupData();
      
      return true;
    } catch (err) {
      console.error('❌ Erreur enregistrement:', err);
      const detail = err?.response?.data?.detail || err?.message || JSON.stringify(err);
      setError(`Erreur : ${detail}`);
      return false;
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDiscardChanges = () => setShowConfirmDialog(true);
  
  const confirmDiscardChanges = () => {
    loadGroupData();
    setHasUnsavedChanges(false);
    setShowConfirmDialog(false);
    setSuccess(null);
    setError(null);
  };

  const handleNewGroup = () => { navigate('/comptabilite/tax-groups/create'); };
  const handleGoToList = () => { if (hasUnsavedChanges) setShowConfirmDialog(true); else navigate('/comptabilite/tax-groups'); };
  const handleDuplicate = () => { setSuccess('Duplication à implémenter'); setShowActionsMenu(false); };
  
  const handleDelete = async () => {
    if (!groupId) {
      setError('Aucun groupe à supprimer');
      setShowActionsMenu(false);
      return;
    }
    
    if (!window.confirm(`Supprimer définitivement le groupe "${formData.name}" ?`)) {
      setShowActionsMenu(false);
      return;
    }
    
    try {
      await apiClient.delete(`/compta/tax-groups/${groupId}/`);
      setSuccess('Groupe supprimé avec succès !');
      setTimeout(() => {
        navigate('/comptabilite/tax-groups');
      }, 1500);
    } catch (err) {
      console.error('❌ Erreur suppression:', err);
      setError('Impossible de supprimer ce groupe (peut-être utilisé par des taxes)');
    }
    setShowActionsMenu(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-4 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <p className="text-gray-600 text-sm">Chargement...</p>
        </div>
      </div>
    );
  }

  if (!activeEntity) {
    return (
      <div className="min-h-screen bg-gray-50 p-4">
        <div className="max-w-4xl mx-auto">
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center">
            <FiAlertCircle className="text-yellow-600 mx-auto mb-3" size={32} />
            <p className="text-yellow-800 font-medium text-lg mb-3">Aucune entité sélectionnée</p>
            <p className="text-sm text-gray-600 mb-4">Veuillez sélectionner une entité pour modifier un groupe de taxes.</p>
            <button onClick={() => navigate('/select-entite')} className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700">Sélectionner une entité</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-7xl mx-auto bg-white border border-gray-300">

        {/* En-tête */}
        <div className="border-b border-gray-300 px-4 py-3">
          <div className="flex items-start justify-between mb-2">
            <div className="flex items-start gap-3">
              <Tooltip text="Créer un nouveau groupe de taxes">
                <button onClick={handleNewGroup} className="h-12 px-4 bg-purple-600 text-white text-sm hover:bg-purple-700 hover:scale-105 hover:shadow-md active:scale-95 transition-all duration-200 flex items-center justify-center font-medium border-0" style={{ minWidth: '100px' }}>
                  <FiPlus size={16} className="mr-1" /><span>Nouveau</span>
                </button>
              </Tooltip>
              <div className="flex flex-col h-12 justify-center">
                <div className="text-lg font-bold text-gray-900 cursor-pointer hover:text-purple-600 hover:scale-105 transition-all duration-200" onClick={handleGoToList}>Groupes de taxes</div>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-xs text-gray-600 font-medium">{formData.name ? `Groupe: ${formData.name}` : 'Modification groupe de taxes'}</span>
                  {activeEntity && (
                    <span className="text-xs text-purple-600 bg-purple-50 px-2 py-0.5 rounded flex items-center gap-1">
                      <FiBriefcase size={10} />
                      {getEntityName()}
                    </span>
                  )}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="relative" ref={actionsMenuRef}>
                <Tooltip text="Menu des actions">
                  <button onClick={() => setShowActionsMenu(!showActionsMenu)} className="h-8 px-3 border border-gray-300 text-gray-700 text-xs hover:bg-gray-50 hover:scale-105 hover:shadow-md active:scale-95 transition-all duration-200 flex items-center gap-1">
                    <FiSettings size={12} /><span>Actions</span>
                  </button>
                </Tooltip>
                {showActionsMenu && (
                  <div className="absolute right-0 mt-1 w-48 bg-white border border-gray-300 shadow-lg rounded-sm z-50">
                    <button onClick={handleDuplicate} className="w-full px-3 py-2 text-xs text-left hover:bg-gray-50 hover:pl-4 transition-all duration-200 flex items-center gap-2 border-b border-gray-100"><FiCopy size={12} /> Dupliquer</button>
                    <button onClick={handleDelete} className="w-full px-3 py-2 text-xs text-left hover:bg-red-50 hover:text-red-600 hover:pl-4 transition-all duration-200 flex items-center gap-2"><FiTrash2 size={12} /> Supprimer</button>
                  </div>
                )}
              </div>
              <Tooltip text="Enregistrer le groupe">
                <button onClick={() => handleSave().then(success => { if (success) navigate('/comptabilite/tax-groups'); })} disabled={isSubmitting} className="w-8 h-8 rounded-full bg-purple-600 text-white hover:bg-purple-700 hover:scale-110 hover:shadow-lg active:scale-90 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center shadow-sm">
                  <FiUploadCloud size={16} />
                </button>
              </Tooltip>
              <Tooltip text="Annuler les modifications">
                <button onClick={handleDiscardChanges} className="w-8 h-8 rounded-full bg-black text-white hover:bg-gray-800 hover:scale-110 hover:shadow-lg active:scale-90 transition-all duration-200 flex items-center justify-center">
                  <FiX size={16} />
                </button>
              </Tooltip>
            </div>
          </div>
        </div>

        {hasUnsavedChanges && (
          <div className="px-4 py-1 bg-blue-50 text-blue-700 text-xs border-b border-blue-200 flex items-center justify-between">
            <span>Modifications non sauvegardées</span>
          </div>
        )}

        {(error || success) && (
          <div className={`px-4 py-3 text-sm border-b border-gray-300 transition-all duration-300 ${error ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'}`}>
            <div className="flex items-start gap-2">
              {error ? <FiAlertCircle size={14} className="mt-0.5 flex-shrink-0" /> : <FiCheck size={14} className="mt-0.5 flex-shrink-0" />}
              <div className="whitespace-pre-wrap text-sm">{error || success}</div>
            </div>
          </div>
        )}

        {/* Formulaire */}
        <div className="px-4 py-4">
          
          {/* Informations générales */}
          <div className="mb-4 p-3 bg-gray-50 border border-gray-300 rounded">
            <div className="flex items-center gap-2 mb-2">
              <FiTag className="text-purple-600" size={14} />
              <h4 className="text-sm font-semibold text-gray-800">Informations générales</h4>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center" style={{ height: '26px' }}>
                <label className="text-xs text-gray-700 min-w-[140px] font-medium">Nom du groupe *</label>
                <div className="flex-1 ml-2 relative">
                  <FiTag className="absolute left-2 top-1.5 text-gray-400" size={12} />
                  <input type="text" value={formData.name} onChange={(e) => handleChange('name', e.target.value)} className="w-full pl-7 pr-2 py-1 border border-gray-300 text-xs hover:border-purple-400 focus:border-purple-600 transition-colors" style={{ height: '26px' }} placeholder="Ex: TVA, IS, Importations..." />
                </div>
              </div>
              <div className="flex items-center" style={{ height: '26px' }}>
                <label className="text-xs text-gray-700 min-w-[140px] font-medium">Ordre</label>
                <div className="flex-1 ml-2 relative">
                  <FiHash className="absolute left-2 top-1.5 text-gray-400" size={12} />
                  <input type="number" min="1" value={formData.sequence} onChange={(e) => handleChange('sequence', e.target.value)} className="w-full pl-7 pr-2 py-1 border border-gray-300 text-xs hover:border-purple-400 focus:border-purple-600 transition-colors" style={{ height: '26px' }} placeholder="10" />
                </div>
              </div>
            </div>
          </div>

          {/* Comptes fiscaux */}
          <div className="mb-4 p-3 bg-gray-50 border border-gray-300 rounded">
            <div className="flex items-center gap-2 mb-2">
              <FiCreditCard className="text-purple-600" size={14} />
              <h4 className="text-sm font-semibold text-gray-800">Comptes fiscaux</h4>
              <Tooltip text="Ces comptes sont utilisés pour les écritures de clôture fiscale">
                <FiInfo className="text-gray-400 cursor-help" size={12} />
              </Tooltip>
            </div>
            <div className="space-y-3">
              <div className="flex items-center" style={{ height: '26px' }}>
                <label className="text-xs text-gray-700 min-w-[180px] font-medium">Compte payable (favorable autorités)</label>
                <div className="flex-1 ml-2 border border-gray-300 hover:border-purple-400 transition-colors" style={{ height: '26px' }}>
                  <AutocompleteInput 
                    value={formData.property_tax_payable_account_label} 
                    selectedId={formData.property_tax_payable_account} 
                    onChange={(text) => handleChange('property_tax_payable_account_label', text)}
                    onSelect={(id, label) => { 
                      handleChange('property_tax_payable_account', id); 
                      handleChange('property_tax_payable_account_label', label); 
                      markAsModified(); 
                    }} 
                    options={accounts} 
                    getOptionLabel={(a) => `${a.code} - ${a.name}`} // ✅ Code + Nom
                    placeholder="Compte fiscal à payer"
                    fieldName="Compte payable"
                  />
                </div>
              </div>
              <div className="flex items-center" style={{ height: '26px' }}>
                <label className="text-xs text-gray-700 min-w-[180px] font-medium">Compte recevable (favorable société)</label>
                <div className="flex-1 ml-2 border border-gray-300 hover:border-purple-400 transition-colors" style={{ height: '26px' }}>
                  <AutocompleteInput 
                    value={formData.property_tax_receivable_account_label} 
                    selectedId={formData.property_tax_receivable_account} 
                    onChange={(text) => handleChange('property_tax_receivable_account_label', text)}
                    onSelect={(id, label) => { 
                      handleChange('property_tax_receivable_account', id); 
                      handleChange('property_tax_receivable_account_label', label); 
                      markAsModified(); 
                    }} 
                    options={accounts} 
                    getOptionLabel={(a) => `${a.code} - ${a.name}`} // ✅ Code + Nom
                    placeholder="Compte fiscal à recevoir"
                    fieldName="Compte recevable"
                  />
                </div>
              </div>
              <div className="flex items-center" style={{ height: '26px' }}>
                <label className="text-xs text-gray-700 min-w-[180px] font-medium">Compte acomptes sur taxes</label>
                <div className="flex-1 ml-2 border border-gray-300 hover:border-purple-400 transition-colors" style={{ height: '26px' }}>
                  <AutocompleteInput 
                    value={formData.property_advance_tax_payment_account_label} 
                    selectedId={formData.property_advance_tax_payment_account} 
                    onChange={(text) => handleChange('property_advance_tax_payment_account_label', text)}
                    onSelect={(id, label) => { 
                      handleChange('property_advance_tax_payment_account', id); 
                      handleChange('property_advance_tax_payment_account_label', label); 
                      markAsModified(); 
                    }} 
                    options={accounts} 
                    getOptionLabel={(a) => `${a.code} - ${a.name}`} // ✅ Code + Nom
                    placeholder="Compte acomptes"
                    fieldName="Compte acomptes"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Localisation */}
          <div className="mb-4 p-3 bg-gray-50 border border-gray-300 rounded">
            <div className="flex items-center gap-2 mb-2">
              <FiGlobe className="text-purple-600" size={14} />
              <h4 className="text-sm font-semibold text-gray-800">Localisation</h4>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center" style={{ height: '26px' }}>
                <label className="text-xs text-gray-700 min-w-[140px] font-medium">Pays</label>
                <div className="flex-1 ml-2 border border-gray-300 hover:border-purple-400 transition-colors" style={{ height: '26px' }}>
                  <AutocompleteInput 
                    value={formData.country_label} 
                    selectedId={formData.country} 
                    onChange={(text) => handleChange('country_label', text)}
                    onSelect={(id, label) => { handleChange('country', id); handleChange('country_label', label); markAsModified(); }} 
                    options={pays} 
                    getOptionLabel={(p) => `${p.emoji || '🌍'} ${p.nom_fr || p.nom} (${p.code_iso})`} 
                    placeholder="Pays"
                    fieldName="Pays"
                  />
                </div>
              </div>
              <div className="flex items-center" style={{ height: '26px' }}>
                <label className="text-xs text-gray-700 min-w-[140px] font-medium">Sous-total précédent</label>
                <div className="flex-1 ml-2">
                  <input type="text" value={formData.preceding_subtotal} onChange={(e) => handleChange('preceding_subtotal', e.target.value)} className="w-full px-2 py-1 border border-gray-300 text-xs hover:border-purple-400 focus:border-purple-600 transition-colors" style={{ height: '26px' }} placeholder="Ex: Total HT" />
                </div>
              </div>
            </div>
          </div>

          {/* Boutons action */}
          <div className="pt-4 border-t border-gray-200 flex justify-start gap-2">
            <button onClick={() => handleSave().then(success => { if (success) navigate('/comptabilite/tax-groups'); })} disabled={isSubmitting} className="h-7 px-3 bg-purple-600 text-white text-xs hover:bg-purple-700 transition-all duration-200 flex items-center gap-1 rounded disabled:opacity-50">
              <FiUploadCloud size={12} /><span>Enregistrer</span>
            </button>
            <button onClick={handleDiscardChanges} className="h-7 px-3 bg-black text-white text-xs hover:bg-gray-800 transition-all duration-200 flex items-center gap-1 rounded">
              <FiX size={12} /><span>Annuler</span>
            </button>
          </div>
        </div>
      </div>

      {showConfirmDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-sm shadow-lg max-w-md w-full mx-4">
            <h3 className="text-lg font-bold text-gray-900 mb-3">Modifications non sauvegardées</h3>
            <p className="text-sm text-gray-600 mb-6">Voulez-vous enregistrer les modifications avant de quitter ?</p>
            <div className="flex justify-end gap-3">
              <button onClick={async () => { setShowConfirmDialog(false); const saved = await handleSave(true); if (saved) navigate('/comptabilite/tax-groups'); }} className="px-4 py-2 bg-purple-600 text-white text-sm hover:bg-purple-700 transition-all duration-200">Enregistrer</button>
              <button onClick={() => { confirmDiscardChanges(); navigate('/comptabilite/tax-groups'); }} className="px-4 py-2 bg-red-600 text-white text-sm hover:bg-red-700 transition-all duration-200">Ne pas enregistrer</button>
              <button onClick={() => setShowConfirmDialog(false)} className="px-4 py-2 border border-gray-300 text-gray-700 text-sm hover:bg-gray-50 transition-all duration-200">Annuler</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}