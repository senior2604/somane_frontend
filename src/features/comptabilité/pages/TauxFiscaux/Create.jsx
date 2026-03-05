// C:\Users\IBM\Documents\somane_frontend\src\features\comptabilité\pages\TauxFiscaux\Create.jsx

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
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
  FiCreditCard,
  FiUploadCloud,
  FiDollarSign,
  FiInfo,
  FiTag,
  FiLayers,
  FiPaperclip
} from 'react-icons/fi';
import { useEntity } from '../../../../context/EntityContext';
import { apiClient } from '../../../../services/apiClient';
import { authService } from '../../../../services/authService';

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
// COMPOSANT LIGNE DE RÉPARTITION (Avec tabulation)
// ==========================================
const RepartitionLineRow = ({ line, index, accounts, analyticTags, onChange, onRemove, isLast, onKeyDown }) => (
  <tr className="hover:bg-gray-50">
    {/* Type (Base/Taxe) */}
    <td className="border border-gray-300 p-1" style={{ minWidth: '100px' }}>
      <select
        value={line.repartition_type}
        onChange={(e) => onChange('repartition_type', e.target.value)}
        onKeyDown={(e) => onKeyDown(e, index, 'type')}
        className="w-full px-2 py-1 border-0 text-xs focus:ring-1 focus:ring-purple-500 focus:outline-none bg-transparent"
        style={{ height: '26px' }}
      >
        <option value="base">💰 Base</option>
        <option value="tax">🧾 Taxe</option>
      </select>
    </td>

    {/* Pourcentage */}
    <td className="border border-gray-300 p-1" style={{ minWidth: '100px' }}>
      <div className="relative">
        <input
          type="number"
          value={line.factor_percent}
          onChange={(e) => onChange('factor_percent', parseFloat(e.target.value) || 0)}
          onKeyDown={(e) => onKeyDown(e, index, 'percent')}
          min="-100"
          max="200"
          step="0.01"
          className="w-full px-2 py-1 border-0 text-xs text-right focus:ring-1 focus:ring-purple-500 focus:outline-none"
          style={{ height: '26px' }}
          placeholder="100"
        />
        <span className="absolute right-2 top-1.5 text-xs text-gray-400">%</span>
      </div>
    </td>

    {/* Compte comptable */}
    <td className="border border-gray-300 p-1" style={{ minWidth: '250px' }}>
      <div style={{ height: '26px' }}>
        <AutocompleteInput
          value={line.account_label}
          selectedId={line.account}
          onChange={(text) => onChange('account_label', text)}
          onSelect={(id, label) => {
            onChange('account', id);
            onChange('account_label', label);
          }}
          options={accounts}
          getOptionLabel={(a) => `${a.code} - ${a.name}`}
          placeholder="Sélectionner un compte"
        />
      </div>
    </td>

    {/* Tags analytiques */}
    <td className="border border-gray-300 p-1" style={{ minWidth: '150px' }}>
      <select
        multiple
        value={line.analytic_tags || []}
        onChange={(e) => {
          const selected = Array.from(e.target.selectedOptions, opt => opt.value);
          onChange('analytic_tags', selected);
        }}
        onKeyDown={(e) => onKeyDown(e, index, 'tags')}
        className="w-full px-2 py-1 border-0 text-xs focus:ring-1 focus:ring-purple-500 focus:outline-none bg-transparent"
        style={{ height: '26px' }}
      >
        {analyticTags.map(tag => (
          <option key={tag.id} value={tag.id}>{tag.name}</option>
        ))}
      </select>
    </td>

    {/* Facture */}
    <td className="border border-gray-300 p-1 text-center" style={{ minWidth: '60px' }}>
      <input
        type="checkbox"
        checked={line.use_in_invoice}
        onChange={(e) => onChange('use_in_invoice', e.target.checked)}
        onKeyDown={(e) => onKeyDown(e, index, 'invoice')}
        className="w-4 h-4 text-purple-600 focus:ring-purple-500"
      />
    </td>

    {/* Avoir */}
    <td className="border border-gray-300 p-1 text-center" style={{ minWidth: '60px' }}>
      <input
        type="checkbox"
        checked={line.use_in_refund}
        onChange={(e) => onChange('use_in_refund', e.target.checked)}
        onKeyDown={(e) => onKeyDown(e, index, 'refund')}
        className="w-4 h-4 text-purple-600 focus:ring-purple-500"
      />
    </td>

    {/* Action Supprimer */}
    <td className="border border-gray-300 p-1 w-[40px]">
      {!isLast && (
        <button
          onClick={onRemove}
          onKeyDown={(e) => onKeyDown(e, index, 'delete')}
          className="w-full flex items-center justify-center p-1 text-gray-400 hover:text-red-600 transition-colors"
          style={{ height: '26px' }}
          title="Supprimer cette ligne"
          tabIndex={0}
        >
          <FiTrash2 size={12} />
        </button>
      )}
    </td>
  </tr>
);

// ==========================================
// COMPOSANT RÉCAPITULATIF
// ==========================================
const RepartitionSummary = ({ lines }) => {
  const baseTotal = lines
    .filter(l => l.repartition_type === 'base')
    .reduce((sum, l) => sum + l.factor_percent, 0);
  
  const taxTotal = lines
    .filter(l => l.repartition_type === 'tax')
    .reduce((sum, l) => sum + l.factor_percent, 0);

  return (
    <div className="bg-purple-50 border border-purple-200 px-4 py-2 flex justify-end gap-8 mt-3">
      <div className="text-sm">
        <span className="text-gray-600 mr-2">Total Base:</span>
        <span className={`font-bold ${baseTotal === 100 ? 'text-gray-900' : 'text-yellow-600'}`}>
          {baseTotal.toFixed(2)}%
        </span>
      </div>
      <div className="text-sm">
        <span className="text-gray-600 mr-2">Total Taxe:</span>
        <span className={`font-bold ${taxTotal === 100 ? 'text-gray-900' : 'text-yellow-600'}`}>
          {taxTotal.toFixed(2)}%
        </span>
      </div>
    </div>
  );
};

// ==========================================
// COMPOSANT PRINCIPAL
// ==========================================
export default function TauxFiscauxCreate() {
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
  const [taxId, setTaxId] = useState(null);
  const [activeTab, setActiveTab] = useState('general');
  
  // Données externes
  const [accounts, setAccounts] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [pays, setPays] = useState([]);
  const [analyticTags, setAnalyticTags] = useState([]);
  
  // ========================================
  // ÉTATS POUR LES DEUX TABLES
  // ========================================
  
  // 1. AccountTax (table principale)
  const [formData, setFormData] = useState({
    name: '',
    amount: '',
    amount_type: 'percent',
    tax_used_on: 'sale',
    account: '',
    account_label: '',
    refund_account: '',
    refund_account_label: '',
    fiscal_position: '',
    country: '',
    country_label: '',
    notes: '',
    active: true,
    state: 'draft'
  });

  // 2. AccountTaxRepartitionLine (lignes de répartition)
  const [repartitionLines, setRepartitionLines] = useState([
    {
      id: `temp_${Date.now()}_1`,
      repartition_type: 'base',
      factor_percent: 100,
      account: '',
      account_label: '',
      use_in_invoice: true,
      use_in_refund: true,
      sequence: 10,
      analytic_tags: []
    },
    {
      id: `temp_${Date.now()}_2`,
      repartition_type: 'tax',
      factor_percent: 100,
      account: '',
      account_label: '',
      use_in_invoice: true,
      use_in_refund: true,
      sequence: 20,
      analytic_tags: []
    }
  ]);

  const actionsMenuRef = useRef(null);
  const tableRef = useRef(null);
  const today = new Date().toISOString().split('T')[0];

  // Vérifier l'authentification
  useEffect(() => {
    if (!activeEntity) {
      setError('Vous devez sélectionner une entité pour créer un taux fiscal');
    }
  }, [activeEntity]);

  // Charger les données
  useEffect(() => {
    if (activeEntity) {
      loadOptions();
    }
  }, [activeEntity]);

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

  // ========================================
  // CHARGEMENT DES DONNÉES
  // ========================================
  const loadOptions = async () => {
    setLoading(true);
    setError(null);
    try {
      const [accountsRes, paysRes, companiesRes, tagsRes] = await Promise.all([
        apiClient.get('/compta/accounts/').catch(() => ({ data: [] })),
        apiClient.get('/pays/').catch(() => ({ data: [] })),
        authService.isAuthenticated() 
          ? apiClient.get('/entites/').catch(() => ({ data: [] }))
          : Promise.resolve({ data: [] }),
        apiClient.get('/compta/tags/').catch(() => ({ data: [] }))
      ]);

      const normalizeData = (data) => {
        if (!data) return [];
        if (Array.isArray(data)) return data;
        if (Array.isArray(data.results)) return data.results;
        if (Array.isArray(data.data)) return data.data;
        return [];
      };

      setAccounts(normalizeData(accountsRes));
      setPays(normalizeData(paysRes));
      setCompanies(normalizeData(companiesRes));
      setAnalyticTags(normalizeData(tagsRes));
    } catch (err) {
      console.error('❌ Erreur chargement options:', err);
      setError('Erreur lors du chargement des données');
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

  // ========================================
  // GESTION DES LIGNES DE RÉPARTITION
  // ========================================
  
  // Ajouter une ligne
  const addRepartitionLine = () => {
    setRepartitionLines(prev => [
      ...prev,
      {
        id: `temp_${Date.now()}_${prev.length}`,
        repartition_type: 'tax',
        factor_percent: 100,
        account: '',
        account_label: '',
        use_in_invoice: true,
        use_in_refund: true,
        sequence: (prev.length + 1) * 10,
        analytic_tags: []
      }
    ]);
    markAsModified();
    
    // Focus sur la nouvelle ligne après un court délai
    setTimeout(() => {
      const lastRow = tableRef.current?.querySelector('tbody tr:last-child');
      const firstInput = lastRow?.querySelector('select, input');
      if (firstInput) firstInput.focus();
    }, 50);
  };

  // Modifier une ligne
  const handleLineChange = (index, field, value) => {
    setRepartitionLines(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
    markAsModified();
  };

  // Mise à jour multiple d'une ligne
  const handleLineMultiChange = (index, fields) => {
    setRepartitionLines(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], ...fields };
      return updated;
    });
    markAsModified();
  };

  // Supprimer une ligne
  const removeRepartitionLine = (index) => {
    if (repartitionLines.length <= 1) return;
    setRepartitionLines(prev => prev.filter((_, i) => i !== index));
    markAsModified();
  };

  // ========================================
  // GESTION DE LA TABULATION
  // ========================================
  const handleLineKeyDown = (e, index, field) => {
    if (e.key === 'Tab' && !e.shiftKey) {
      e.preventDefault();
      
      // Définir l'ordre de tabulation
      const fields = ['type', 'percent', 'account', 'tags', 'invoice', 'refund', 'delete'];
      const currentFieldIndex = fields.indexOf(field);
      
      if (currentFieldIndex === fields.length - 1) {
        // Dernier champ de la ligne courante
        if (index === repartitionLines.length - 1) {
          // Dernière ligne : ajouter une nouvelle ligne
          addRepartitionLine();
        } else {
          // Passer à la ligne suivante, premier champ
          focusOnField(index + 1, fields[0]);
        }
      } else {
        // Passer au champ suivant dans la même ligne
        focusOnField(index, fields[currentFieldIndex + 1]);
      }
    } else if (e.key === 'Tab' && e.shiftKey) {
      e.preventDefault();
      
      // Tabulation arrière (Shift+Tab)
      const fields = ['type', 'percent', 'account', 'tags', 'invoice', 'refund', 'delete'];
      const currentFieldIndex = fields.indexOf(field);
      
      if (currentFieldIndex === 0) {
        // Premier champ de la ligne courante
        if (index > 0) {
          // Ligne précédente, dernier champ
          focusOnField(index - 1, fields[fields.length - 1]);
        }
      } else {
        // Champ précédent dans la même ligne
        focusOnField(index, fields[currentFieldIndex - 1]);
      }
    }
  };

  const focusOnField = (rowIndex, fieldName) => {
    setTimeout(() => {
      const row = tableRef.current?.querySelector(`tbody tr:nth-child(${rowIndex + 1})`);
      if (!row) return;
      
      let element = null;
      switch (fieldName) {
        case 'type':
          element = row.querySelector('select');
          break;
        case 'percent':
          element = row.querySelector('input[type="number"]');
          break;
        case 'account':
          element = row.querySelector('.autocomplete-input input, [class*="Autocomplete"] input');
          break;
        case 'tags':
          element = row.querySelector('select[multiple]');
          break;
        case 'invoice':
          element = row.querySelector('input[type="checkbox"]');
          break;
        case 'refund':
          element = row.querySelectorAll('input[type="checkbox"]')[1];
          break;
        case 'delete':
          element = row.querySelector('button');
          break;
      }
      
      if (element) {
        element.focus();
        if (element.type === 'checkbox') {
          // Pour les checkboxes, on peut aussi cliquer avec Espace
        }
      }
    }, 10);
  };

  // ========================================
  // VALIDATION
  // ========================================
  const validateForm = () => {
    const errors = [];

    // Validation AccountTax
    if (!formData.name.trim()) {
      errors.push("Le nom de la taxe est obligatoire");
    }
    
    if (!formData.amount || parseFloat(formData.amount) <= 0) {
      errors.push("Le montant doit être supérieur à 0");
    }

    if (!formData.account) {
      errors.push("Le compte de taxe est obligatoire");
    }

    // Validation des lignes de répartition
    let baseTotal = 0;
    let taxTotal = 0;
    let hasInvalidAccounts = false;

    repartitionLines.forEach((line, idx) => {
      if (!line.account) {
        hasInvalidAccounts = true;
        errors.push(`Ligne ${idx + 1} : veuillez sélectionner un compte comptable`);
      }
      
      if (line.repartition_type === 'base') {
        baseTotal += line.factor_percent;
      } else {
        taxTotal += line.factor_percent;
      }
    });

    // Au moins une ligne de chaque type
    const hasBase = repartitionLines.some(l => l.repartition_type === 'base');
    const hasTax = repartitionLines.some(l => l.repartition_type === 'tax');
    
    if (!hasBase) {
      errors.push("Vous devez avoir au moins une ligne de type 'Base'");
    }
    if (!hasTax) {
      errors.push("Vous devez avoir au moins une ligne de type 'Taxe'");
    }
    
    // Vérification des totaux (tolérance pour arrondis)
    if (Math.abs(baseTotal - 100) > 0.01) {
      errors.push("Le total des pourcentages 'Base' doit être 100%");
    }
    if (Math.abs(taxTotal - 100) > 0.01) {
      errors.push("Le total des pourcentages 'Taxe' doit être 100%");
    }

    return errors;
  };

  // ========================================
  // PRÉPARATION DES DONNÉES POUR L'API
  // ========================================
  const prepareDataForApi = useCallback(() => {
    // Données de AccountTax
    const taxData = {
      name: formData.name,
      amount: parseFloat(formData.amount) || 0,
      amount_type: formData.amount_type,
      type_tax_use: formData.tax_used_on,
      company: activeEntity?.id,
      account: formData.account || null,
      refund_account: formData.refund_account || null,
      country: formData.country || null,
      fiscal_position: formData.fiscal_position || null,
      note: formData.notes || '',
      active: formData.active,
      state: formData.state
    };

    // Données des AccountTaxRepartitionLine
    const repartitionLinesData = repartitionLines.map((line, index) => ({
      repartition_type: line.repartition_type,
      factor_percent: line.factor_percent,
      account: line.account,
      use_in_invoice: line.use_in_invoice,
      use_in_refund: line.use_in_refund,
      sequence: (index + 1) * 10,
      analytic_tag_ids: line.analytic_tags || [],
      company: activeEntity?.id
    }));

    return {
      tax: taxData,
      repartition_lines: repartitionLinesData
    };
  }, [formData, activeEntity, repartitionLines]);

  // ========================================
  // SAUVEGARDE
  // ========================================
  const saveAutoDraft = useCallback(async () => {
    if (!hasUnsavedChanges || isAutoSaving || !activeEntity) return;
    
    setIsAutoSaving(true);
    try {
      const apiData = prepareDataForApi();
      
      let result;
      if (taxId) {
        result = await apiClient.put(`/compta/taxes/${taxId}/`, apiData.tax);
      } else {
        result = await apiClient.post('/compta/taxes/', apiData.tax);
        if (result?.data?.id) {
          setTaxId(result.data.id);
        }
      }
      setHasUnsavedChanges(false);
    } catch (err) {
      console.error('❌ Erreur sauvegarde automatique:', err);
    } finally {
      setIsAutoSaving(false);
    }
  }, [hasUnsavedChanges, isAutoSaving, taxId, activeEntity, prepareDataForApi]);

  // Auto-save timer
  useEffect(() => {
    const timer = setTimeout(() => {
      saveAutoDraft();
    }, 3000);
    return () => clearTimeout(timer);
  }, [formData, repartitionLines, saveAutoDraft]);

  // Sauvegarde manuelle
  const handleSaveDraft = async () => {
    if (!activeEntity) { 
      setError('Vous devez sélectionner une entité'); 
      return; 
    }

    // Validation
    const errors = validateForm();
    if (errors.length > 0) {
      setError(errors.join('\n'));
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const apiData = prepareDataForApi();
      let result;
      
      // Étape 1: Créer/mettre à jour la taxe
      if (taxId) {
        result = await apiClient.put(`/compta/taxes/${taxId}/`, apiData.tax);
      } else {
        result = await apiClient.post('/compta/taxes/', apiData.tax);
        if (result?.data?.id) {
          setTaxId(result.data.id);
        }
      }

      // Étape 2: Créer les lignes de répartition
      if (result?.data?.id) {
        const taxId = result.data.id;
        
        // Supprimer les anciennes lignes (si update)
        if (taxId) {
          await apiClient.delete(`/compta/taxes/${taxId}/repartition_lines/`).catch(() => {});
        }
        
        // Créer les nouvelles lignes
        await Promise.all(
          apiData.repartition_lines.map(line =>
            apiClient.post(`/compta/taxes/${taxId}/repartition_lines/`, {
              ...line,
              tax: taxId
            })
          )
        );
      }

      setSuccess('Taux fiscal et lignes de répartition enregistrés avec succès !');
      setHasUnsavedChanges(false);
      
      setTimeout(() => {
        navigate('/comptabilite/taux-fiscaux');
      }, 1500);
      
    } catch (err) {
      console.error('❌ Erreur enregistrement:', err);
      const detail = err.response?.data 
        ? JSON.stringify(err.response.data, null, 2)
        : err.message;
      setError(`Erreur lors de l'enregistrement : ${detail}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Comptabiliser / remettre en brouillon
  const handleToggleState = async () => {
    if (!activeEntity) { 
      setError('Vous devez sélectionner une entité'); 
      return; 
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const newState = formData.state === 'draft' ? 'posted' : 'draft';
      const apiData = { ...prepareDataForApi().tax, state: newState };

      let result;
      if (taxId) {
        result = await apiClient.put(`/compta/taxes/${taxId}/`, apiData);
      } else {
        result = await apiClient.post('/compta/taxes/', apiData);
        if (result?.data?.id) {
          setTaxId(result.data.id);
        }
      }

      setFormData(prev => ({ ...prev, state: newState }));
      setSuccess(newState === 'posted'
        ? 'Taux fiscal comptabilisé avec succès !'
        : 'Taux fiscal remis en brouillon avec succès !');
      setHasUnsavedChanges(false);
      
      setTimeout(() => {
        navigate('/comptabilite/taux-fiscaux');
      }, 1500);
      
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

  // Annuler les modifications
  const handleDiscardChanges = () => setShowConfirmDialog(true);
  
  const confirmDiscardChanges = () => {
    setFormData({
      name: '',
      amount: '',
      amount_type: 'percent',
      tax_used_on: 'sale',
      account: '',
      account_label: '',
      refund_account: '',
      refund_account_label: '',
      fiscal_position: '',
      country: '',
      country_label: '',
      notes: '',
      active: true,
      state: 'draft'
    });
    setRepartitionLines([
      {
        id: `temp_${Date.now()}_1`,
        repartition_type: 'base',
        factor_percent: 100,
        account: '',
        account_label: '',
        use_in_invoice: true,
        use_in_refund: true,
        sequence: 10,
        analytic_tags: []
      },
      {
        id: `temp_${Date.now()}_2`,
        repartition_type: 'tax',
        factor_percent: 100,
        account: '',
        account_label: '',
        use_in_invoice: true,
        use_in_refund: true,
        sequence: 20,
        analytic_tags: []
      }
    ]);
    setTaxId(null);
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

  const handleDuplicate = () => {
    setSuccess('Fonctionnalité de duplication à implémenter');
    setShowActionsMenu(false);
  };

  const handleDelete = async () => {
    if (!taxId) {
      setError('Aucun taux à supprimer');
      return;
    }

    if (!window.confirm('Êtes-vous sûr de vouloir supprimer ce taux fiscal ?')) {
      return;
    }

    setIsSubmitting(true);
    try {
      await apiClient.delete(`/compta/taxes/${taxId}/`);
      setSuccess('Taux fiscal supprimé avec succès !');
      setTimeout(() => {
        navigate('/comptabilite/taux-fiscaux');
      }, 1500);
    } catch (err) {
      console.error('❌ Erreur suppression:', err);
      setError('Erreur lors de la suppression');
    } finally {
      setIsSubmitting(false);
      setShowActionsMenu(false);
    }
  };

  const handleExtourner = () => {
    setSuccess("Fonctionnalité d'extourne à implémenter");
    setShowActionsMenu(false);
  };

  const isDraft = formData.state === 'draft';

  // Rendu : pas d'entité
  if (!activeEntity) {
    return (
      <div className="min-h-screen bg-gray-50 p-4">
        <div className="max-w-7xl mx-auto bg-white border border-gray-300">
          <div className="border-b border-gray-300 px-4 py-3">
            <div className="text-lg font-bold text-gray-900">Créer un taux fiscal</div>
          </div>
          <div className="p-8">
            <div className="bg-yellow-50 border border-yellow-200 rounded p-6 text-center">
              <FiAlertCircle className="text-yellow-600 mx-auto mb-3" size={32} />
              <p className="text-yellow-800 font-medium text-lg mb-3">Aucune entité sélectionnée</p>
              <p className="text-sm text-gray-600 mb-4">
                Vous devez sélectionner une entité pour créer un taux fiscal.
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

        {/* ── En-tête ligne 1 ── */}
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
                  <span className="text-sm text-gray-700 font-medium">État :</span>
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
                onClick={handleSaveDraft} 
                disabled={isSubmitting}
                className="px-3 py-1.5 bg-purple-600 text-white text-xs flex items-center gap-1 hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <FiSave size={12} /><span>Enregistrer</span>
              </button>
            </div>
          </div>
        </div>

        {/* ── En-tête ligne 2 ── */}
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

        {/* ── Indicateur modifications ── */}
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
            <div className="flex items-center" style={{ height: '26px' }}>
              <label className="text-xs text-gray-700 min-w-[140px] font-medium">Nom de la taxe</label>
              <div className="flex-1 ml-2 relative">
                <FiTag className="absolute left-2 top-1.5 text-gray-400" size={12} />
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => handleChange('name', e.target.value)}
                  className="w-full pl-7 pr-2 py-1 border border-gray-300 text-xs hover:border-purple-400 focus:border-purple-600 transition-colors"
                  style={{ height: '26px' }}
                  placeholder="TVA 18%"
                />
              </div>
            </div>
            {/* Colonne droite */}
            <div className="flex items-center" style={{ height: '26px' }}>
              <label className="text-xs text-gray-700 min-w-[140px] font-medium">Valeur</label>
              <div className="flex-1 ml-2 relative">
                <FiPercent className="absolute left-2 top-1.5 text-gray-400" size={12} />
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.amount}
                  onChange={(e) => handleChange('amount', e.target.value)}
                  className="w-full pl-7 pr-2 py-1 border border-gray-300 text-xs hover:border-purple-400 focus:border-purple-600 transition-colors"
                  style={{ height: '26px' }}
                  placeholder="18"
                />
              </div>
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4 mt-2">
            <div className="flex items-center" style={{ height: '26px' }}>
              <label className="text-xs text-gray-700 min-w-[140px] font-medium">Type de valeur</label>
              <div className="flex-1 ml-2 relative">
                <FiDollarSign className="absolute left-2 top-1.5 text-gray-400" size={12} />
                <select
                  value={formData.amount_type}
                  onChange={(e) => handleChange('amount_type', e.target.value)}
                  className="w-full pl-7 pr-2 py-1 border border-gray-300 text-xs hover:border-purple-400 focus:border-purple-600 transition-colors appearance-none"
                  style={{ height: '26px' }}
                >
                  <option value="percent">Pourcentage (%)</option>
                  <option value="fixed">Montant fixe</option>
                </select>
              </div>
            </div>
            <div className="flex items-center" style={{ height: '26px' }}>
              <label className="text-xs text-gray-700 min-w-[140px] font-medium">Utilisation</label>
              <div className="flex-1 ml-2 relative">
                <FiCreditCard className="absolute left-2 top-1.5 text-gray-400" size={12} />
                <select
                  value={formData.tax_used_on}
                  onChange={(e) => handleChange('tax_used_on', e.target.value)}
                  className="w-full pl-7 pr-2 py-1 border border-gray-300 text-xs hover:border-purple-400 focus:border-purple-600 transition-colors appearance-none"
                  style={{ height: '26px' }}
                >
                  <option value="sale">Ventes</option>
                  <option value="purchase">Achats</option>
                  <option value="both">Ventes et Achats</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* ── Onglets ── */}
        <div className="border-b border-gray-300">
          <div className="px-4 flex">
            {[
              { id: 'general', label: 'Informations générales', icon: FiTag },
              { id: 'comptable', label: 'Paramètres comptables', icon: FiCreditCard },
              { id: 'repartition', label: 'Lignes de répartition', icon: FiLayers },
              { id: 'notes', label: 'Notes', icon: FiPaperclip }
            ].map(tab => (
              <button 
                key={tab.id} 
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-2 text-xs font-medium border-b-2 transition-colors flex items-center gap-1 ${
                  activeTab === tab.id 
                    ? 'border-purple-600 text-purple-600' 
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                <tab.icon size={12} />
                <span>{tab.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* ── Contenu onglets ── */}
        <div className="p-4">
          {/* Onglet Informations générales */}
          {activeTab === 'general' && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center" style={{ height: '26px' }}>
                  <label className="text-xs text-gray-700 min-w-[140px] font-medium">Pays</label>
                  <div className="flex-1 ml-2 border border-gray-300 hover:border-purple-400 transition-colors" style={{ height: '26px' }}>
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
                  <label className="text-xs text-gray-700 min-w-[140px] font-medium">Position fiscale</label>
                  <input
                    type="text"
                    value={formData.fiscal_position}
                    onChange={(e) => handleChange('fiscal_position', e.target.value)}
                    className="flex-1 ml-2 px-2 py-1 border border-gray-300 text-xs hover:border-purple-400 focus:border-purple-600 transition-colors"
                    style={{ height: '26px' }}
                    placeholder="Optionnel"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center" style={{ height: '26px' }}>
                  <label className="text-xs text-gray-700 min-w-[140px] font-medium">Entité connectée</label>
                  <div className="flex-1 ml-2 px-2 py-1 bg-gray-100 border border-gray-300 text-xs text-gray-700 flex items-center gap-2" style={{ height: '26px' }}>
                    <FiBriefcase size={12} className="text-purple-600" />
                    {activeEntity?.nom || activeEntity?.raison_sociale || activeEntity?.name || 'Non définie'}
                  </div>
                </div>

                <div className="flex items-center" style={{ height: '26px' }}>
                  <label className="text-xs text-gray-700 min-w-[140px] font-medium">Actif</label>
                  <div className="flex-1 ml-2">
                    <input
                      type="checkbox"
                      checked={formData.active}
                      onChange={(e) => handleChange('active', e.target.checked)}
                      className="w-4 h-4 text-purple-600 focus:ring-purple-500"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Onglet Paramètres comptables */}
          {activeTab === 'comptable' && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center" style={{ height: '26px' }}>
                  <label className="text-xs text-gray-700 min-w-[140px] font-medium">Compte de taxe</label>
                  <div className="flex-1 ml-2 border border-gray-300 hover:border-purple-400 transition-colors" style={{ height: '26px' }}>
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
                      placeholder="Compte de taxe"
                    />
                  </div>
                </div>

                <div className="flex items-center" style={{ height: '26px' }}>
                  <label className="text-xs text-gray-700 min-w-[140px] font-medium">Compte de remboursement</label>
                  <div className="flex-1 ml-2 border border-gray-300 hover:border-purple-400 transition-colors" style={{ height: '26px' }}>
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
                      placeholder="Compte de remboursement"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Onglet Lignes de répartition - AVEC TABULATION */}
          {activeTab === 'repartition' && (
            <div>
              {/* Tableau des lignes */}
              <div className="border border-gray-300 mb-3 overflow-x-auto">
                <table className="w-full border-collapse" ref={tableRef}>
                  <thead>
                    <tr className="bg-gray-100">
                      <th className="border border-gray-300 px-2 py-1.5 text-xs font-medium text-gray-700 text-left" style={{ minWidth: '100px' }}>Type</th>
                      <th className="border border-gray-300 px-2 py-1.5 text-xs font-medium text-gray-700 text-left" style={{ minWidth: '100px' }}>%</th>
                      <th className="border border-gray-300 px-2 py-1.5 text-xs font-medium text-gray-700 text-left" style={{ minWidth: '250px' }}>Compte comptable</th>
                      <th className="border border-gray-300 px-2 py-1.5 text-xs font-medium text-gray-700 text-left" style={{ minWidth: '150px' }}>Tags analytiques</th>
                      <th className="border border-gray-300 px-2 py-1.5 text-xs font-medium text-gray-700 text-center" style={{ minWidth: '60px' }}>Facture</th>
                      <th className="border border-gray-300 px-2 py-1.5 text-xs font-medium text-gray-700 text-center" style={{ minWidth: '60px' }}>Avoir</th>
                      <th className="border border-gray-300 px-2 py-1.5 text-xs font-medium text-gray-700 text-center" style={{ minWidth: '40px' }}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {repartitionLines.map((line, index) => (
                      <RepartitionLineRow
                        key={line.id}
                        line={line}
                        index={index}
                        accounts={accounts}
                        analyticTags={analyticTags}
                        onChange={(field, value) => handleLineChange(index, field, value)}
                        onRemove={() => removeRepartitionLine(index)}
                        isLast={repartitionLines.length === 1}
                        onKeyDown={handleLineKeyDown}
                      />
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Bouton ajouter */}
              <button
                onClick={addRepartitionLine}
                className="px-3 py-1 bg-purple-600 text-white text-xs flex items-center gap-1 hover:bg-purple-700 transition-colors"
                style={{ height: '26px' }}
              >
                <FiPlus size={10} /><span>Ajouter une ligne</span>
              </button>

              {/* Récapitulatif */}
              <RepartitionSummary lines={repartitionLines} />
            </div>
          )}

          {/* Onglet Notes */}
          {activeTab === 'notes' && (
            <div className="border border-gray-300">
              <textarea
                value={formData.notes}
                onChange={(e) => handleChange('notes', e.target.value)}
                rows={8}
                className="w-full px-3 py-2 border-0 text-xs focus:ring-2 focus:ring-purple-500"
                placeholder="Ajouter des notes…"
              />
            </div>
          )}
        </div>

        {/* ── Messages erreur/succès ── */}
        {(error || success) && (
          <div className={`px-4 py-3 text-sm border-t border-gray-300 ${
            error ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'
          }`}>
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