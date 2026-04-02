// C:\Users\IBM\Documents\somane_frontend\src\features\comptabilité\pages\TauxFiscaux\Create.jsx

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  FiPlus, FiTrash2, FiCheck, FiUploadCloud, FiX, FiAlertCircle,
  FiBriefcase, FiSettings, FiInfo, FiPercent, FiTag, FiCreditCard,
  FiDollarSign, FiLayers, FiFileText, FiCopy, FiRotateCcw
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
const AutocompleteInput = ({ value, selectedId, onChange, onSelect, options, getOptionLabel, placeholder = "", disabled = false, onKeyDown }) => {
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
    setInputValue(e.target.value);
    setIsOpen(true);
    setHighlightedIndex(0);
    onChange(e.target.value);
    if (selectedId) onSelect(null, '');
  };

  const handleSelectOption = (option) => {
    const label = getOptionLabel(option);
    const id = option.id;
    setInputValue(label);
    setIsOpen(false);
    onSelect(id, label);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setIsOpen(true); setHighlightedIndex(prev => prev < filteredOptions.length - 1 ? prev + 1 : prev); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setHighlightedIndex(prev => prev > 0 ? prev - 1 : 0); }
    else if (e.key === 'Enter' && isOpen && filteredOptions.length > 0) { e.preventDefault(); handleSelectOption(filteredOptions[highlightedIndex]); }
    else if (e.key === 'Escape') setIsOpen(false);
    if (onKeyDown) onKeyDown(e);
  };

  return (
    <>
      <input ref={inputRef} type="text" value={inputValue} onChange={handleInputChange} onKeyDown={handleKeyDown}
        onFocus={() => { setIsOpen(true); updateDropdownPosition(); }} placeholder={placeholder} disabled={disabled}
        className="w-full px-2 py-1 text-xs focus:ring-1 focus:ring-purple-500 focus:outline-none"
        style={{ height: '26px', border: 'none', backgroundColor: 'transparent' }} autoComplete="off"
      />
      {isOpen && filteredOptions.length > 0 && (
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
// COMPOSANT LIGNE DE RÉPARTITION
// ==========================================
const RepartitionLineRow = ({ line, index, accounts, taxGroups, onChange, onRemove, isLast, canDelete, onTabAtLastField }) => {
  const handleTypeChange = (e) => {
    const newType = e.target.value;
    onChange('repartition_type', newType);
    if (newType === 'base') onChange('factor_percent', 100);
  };

  const isBase = line.repartition_type === 'base';

  return (
    <tr className="hover:bg-gray-50">
      <td className="border border-gray-300 p-1" style={{ width: '130px', minWidth: '130px' }}>
        <select value={line.repartition_type} onChange={handleTypeChange} disabled={!canDelete}
          className={`w-full px-1 py-1 border-0 text-xs focus:ring-1 focus:ring-purple-500 focus:outline-none bg-transparent ${!canDelete ? 'text-gray-500 cursor-not-allowed' : ''}`} style={{ height: '26px' }}>
          <option value="base">Base</option>
          <option value="tax_main">Taxe</option>
          <option value="tax_split">De la taxe</option>
        </select>
      </td>
      <td className="border border-gray-300 p-1" style={{ width: '70px', minWidth: '70px' }}>
        {isBase ? (
          <div className="w-full px-1 py-1 text-xs text-right text-gray-600 bg-gray-100 font-medium" style={{ height: '26px', lineHeight: '20px' }}>100%</div>
        ) : (
          <div className="relative">
            <input type="number" value={line.factor_percent}
              onChange={(e) => onChange('factor_percent', e.target.value === '' ? 0 : parseFloat(e.target.value))}
              min="-100" max="100" step="0.01"
              className={`w-full px-1 py-1 border-0 text-xs text-right focus:ring-1 focus:ring-purple-500 focus:outline-none ${line.factor_percent < 0 ? 'text-red-600 bg-red-50' : ''}`}
              style={{ height: '26px' }} placeholder="100"
            />
            <span className="absolute right-1 top-1.5 text-xs text-gray-400">%</span>
          </div>
        )}
      </td>
      <td className="border border-gray-300 p-1" style={{ width: '140px', minWidth: '140px' }}>
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
            placeholder="Compte"
          />
        </div>
      </td>
      <td className="border border-gray-300 p-1" style={{ width: '110px', minWidth: '110px' }}>
        <div style={{ height: '26px' }}>
          <AutocompleteInput 
            value={line.tax_group_label} 
            selectedId={line.tax_group} 
            onChange={(text) => onChange('tax_group_label', text)}
            onSelect={(id, label) => { 
              onChange('tax_group', id); 
              onChange('tax_group_label', label); 
            }}
            options={taxGroups} 
            getOptionLabel={(g) => g.name} 
            placeholder="Groupe"
            onKeyDown={(e) => { if (e.key === 'Tab' && !e.shiftKey && isLast) { e.preventDefault(); onTabAtLastField(); } }}
          />
        </div>
      </td>
      <td className="border border-gray-300 p-1" style={{ width: '35px', minWidth: '35px' }}>
        {canDelete ? (
          <button onClick={onRemove} className="w-full flex items-center justify-center p-1 text-gray-400 hover:text-red-600 transition-colors" style={{ height: '26px' }} title="Supprimer"><FiTrash2 size={12} /></button>
        ) : (
          <div className="w-full flex items-center justify-center" style={{ height: '26px' }}><FiCheck size={12} className="text-green-500" title="Ligne requise" /></div>
        )}
      </td>
    </tr>
  );
};

// ==========================================
// COMPOSANT RÉCAPITULATIF
// ==========================================
const RepartitionSummary = ({ lines, title }) => {
  let baseTotal = 0;
  let taxTotal = 0;
  
  lines.forEach(line => {
    const percent = parseFloat(line.factor_percent) || 0;
    if (line.repartition_type === 'base') baseTotal += percent;
    else taxTotal += percent;
  });

  const isBaseValid = Math.abs(baseTotal - 100) <= 0.01;
  const isTaxValid = Math.abs(taxTotal - 100) <= 0.01;

  const bgColor = title === 'Facture' ? 'bg-blue-50' : 'bg-green-50';
  const borderColor = title === 'Facture' ? 'border-blue-200' : 'border-green-200';
  const textColor = title === 'Facture' ? 'text-blue-700' : 'text-green-700';

  return (
    <div className={`${bgColor} border ${borderColor} px-3 py-1.5 flex justify-between items-center mt-2`}>
      <span className={`text-xs font-medium ${textColor}`}>Total {title}</span>
      <div className="flex gap-4">
        <div className="text-xs">
          <span className="text-gray-600 mr-1">Base:</span>
          <span className={`font-bold ${isBaseValid ? 'text-green-700' : 'text-red-600'}`}>{baseTotal.toFixed(2)}%</span>
          {!isBaseValid && <span className="ml-1 text-red-500">(100%)</span>}
        </div>
        <div className="text-xs">
          <span className="text-gray-600 mr-1">Taxe:</span>
          <span className={`font-bold ${isTaxValid ? 'text-green-700' : 'text-red-600'}`}>{taxTotal.toFixed(2)}%</span>
          {!isTaxValid && <span className="ml-1 text-red-500">(100%)</span>}
        </div>
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

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [showActionsMenu, setShowActionsMenu] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [taxId, setTaxId] = useState(null);
  const [activeTab, setActiveTab] = useState('comptable');
  
  const [accounts, setAccounts] = useState([]);
  const [pays, setPays] = useState([]);
  const [taxGroups, setTaxGroups] = useState([]);
  const [fiscalPositions, setFiscalPositions] = useState([]);
  
  const [formData, setFormData] = useState({
    name: '', amount: '', amount_type: 'percent', type_tax_use: 'sale', tax_scope: '',
    fiscal_position: '', fiscal_position_label: '', country: '', country_label: '',
    active: true, price_include: false, include_base_amount: false, tax_exigibility: 'on_invoice',
    account: '', account_label: '', cash_basis_transition_account: '', cash_basis_transition_account_label: '',
    description: '', tax_group: '', tax_group_label: '', refund_account: '', refund_account_label: '',
    hide_tax_exigibility: false, is_base_affected: true, analytic: false, sequence: 10, note: '',
  });

  // INITIALISATION : 2 LIGNES (Base + Taxe)
  const [invoiceRepartitionLines, setInvoiceRepartitionLines] = useState([
    { id: `inv_${Date.now()}_1`, repartition_type: 'base', factor_percent: 100, account: '', account_label: '', tax_group: '', tax_group_label: '' },
    { id: `inv_${Date.now()}_2`, repartition_type: 'tax_main', factor_percent: 100, account: '', account_label: '', tax_group: '', tax_group_label: '' }
  ]);

  const [refundRepartitionLines, setRefundRepartitionLines] = useState([
    { id: `ref_${Date.now()}_1`, repartition_type: 'base', factor_percent: 100, account: '', account_label: '', tax_group: '', tax_group_label: '' },
    { id: `ref_${Date.now()}_2`, repartition_type: 'tax_main', factor_percent: 100, account: '', account_label: '', tax_group: '', tax_group_label: '' }
  ]);

  const invoiceTableRef = useRef(null);
  const actionsMenuRef = useRef(null);

  // Helper pour obtenir le nom de l'entité (compatible avec différentes structures)
  const getEntityName = useCallback(() => {
    if (!activeEntity) return 'Non définie';
    return activeEntity.nom || activeEntity.name || activeEntity.raison_sociale || 'Non définie';
  }, [activeEntity]);

  useEffect(() => {
    if (!activeEntity) {
      setError('Vous devez sélectionner une entité pour créer un taux fiscal');
    }
  }, [activeEntity]);

  useEffect(() => {
    if (activeEntity) {
      loadOptions();
    }
  }, [activeEntity]);

  useEffect(() => {
    const handleClickOutside = (e) => { if (actionsMenuRef.current && !actionsMenuRef.current.contains(e.target)) setShowActionsMenu(false); };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const loadOptions = async () => {
    if (!activeEntity || !activeEntity.id) {
      setError('Entité non sélectionnée');
      return;
    }

    try {
      const [accountsRes, paysRes, taxGroupsRes, fiscalPositionsRes] = await Promise.all([
        apiClient.get('/compta/accounts/', { 
          params: { company: activeEntity.id }
        }).catch(() => ({ data: [] })),
        apiClient.get('/pays/', { 
          params: { company: activeEntity.id }
        }).catch(() => ({ data: [] })),
        apiClient.get('/compta/tax-groups/', { 
          params: { company: activeEntity.id }
        }).catch(() => ({ data: [] })),
        apiClient.get('/compta/fiscal-positions/', { 
          params: { company: activeEntity.id }
        }).catch(() => ({ data: [] }))
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
      setTaxGroups(normalizeData(taxGroupsRes));
      setFiscalPositions(normalizeData(fiscalPositionsRes));
      
    } catch (err) {
      console.error('❌ Erreur chargement options:', err);
      setError('Erreur lors du chargement des données');
    }
  };

  const markAsModified = () => { if (!hasUnsavedChanges) setHasUnsavedChanges(true); };

  const handleChange = (field, value) => { setFormData(prev => ({ ...prev, [field]: value })); markAsModified(); };

  const syncLines = (newLines) => {
    setInvoiceRepartitionLines(newLines);
    setRefundRepartitionLines(newLines.map((line, index) => ({
      ...line,
      id: `ref_${Date.now()}_${index}`,
    })));
  };

  const addRepartitionLine = () => {
    const newLine = { repartition_type: 'tax_split', factor_percent: 100, account: '', account_label: '', tax_group: '', tax_group_label: '' };
    const newLines = [...invoiceRepartitionLines, { ...newLine, id: `inv_${Date.now()}_${invoiceRepartitionLines.length}` }];
    syncLines(newLines);
    markAsModified();
    setTimeout(() => {
      const row = invoiceTableRef.current?.querySelector(`tbody tr:nth-child(${newLines.length})`);
      const firstInput = row?.querySelector('input');
      if (firstInput) firstInput.focus();
    }, 50);
  };

  const removeRepartitionLine = (index) => {
    if (index === 0) return;
    const newLines = invoiceRepartitionLines.filter((_, i) => i !== index);
    syncLines(newLines);
    markAsModified();
  };

  const handleInvoiceLineChange = (index, field, value) => {
    const newLines = [...invoiceRepartitionLines];
    newLines[index] = { ...newLines[index], [field]: value };
    syncLines(newLines);
    markAsModified();
  };

  const handleRefundLineChange = (index, field, value) => {
    const newLines = [...refundRepartitionLines];
    newLines[index] = { ...newLines[index], [field]: value };
    syncLines(newLines);
    markAsModified();
  };

  const validateForm = () => {
    const errors = [];
    
    if (!formData.name.trim()) errors.push("Le nom de la taxe est obligatoire");
    if (!formData.amount || parseFloat(formData.amount) <= 0) errors.push("La valeur de la taxe doit être supérieure à 0");
    
    const invoiceBase = invoiceRepartitionLines.find(l => l.repartition_type === 'base');
    const invoiceTaxTotal = invoiceRepartitionLines.filter(l => l.repartition_type !== 'base').reduce((sum, l) => sum + (parseFloat(l.factor_percent) || 0), 0);
    
    if (!invoiceBase) errors.push("Facture : Ligne 'Base' requise");
    if (invoiceBase && Math.abs(parseFloat(invoiceBase.factor_percent) - 100) > 0.01) errors.push("Facture : La ligne 'Base' doit être à 100%");
    if (Math.abs(invoiceTaxTotal - 100) > 0.01) errors.push(`Facture : Le total des lignes de taxe doit être 100% (actuel: ${invoiceTaxTotal.toFixed(2)}%)`);
    
    const refundBase = refundRepartitionLines.find(l => l.repartition_type === 'base');
    const refundTaxTotal = refundRepartitionLines.filter(l => l.repartition_type !== 'base').reduce((sum, l) => sum + (parseFloat(l.factor_percent) || 0), 0);
    
    if (!refundBase) errors.push("Avoir : Ligne 'Base' requise");
    if (refundBase && Math.abs(parseFloat(refundBase.factor_percent) - 100) > 0.01) errors.push("Avoir : La ligne 'Base' doit être à 100%");
    if (Math.abs(refundTaxTotal - 100) > 0.01) errors.push(`Avoir : Le total des lignes de taxe doit être 100% (actuel: ${refundTaxTotal.toFixed(2)}%)`);
    
    const invoiceLinesSansCompte = invoiceRepartitionLines.filter(l => !l.account || (l.account_label && l.account_label.trim() === ''));
    if (invoiceLinesSansCompte.length > 0) {
      errors.push(`Facture : ${invoiceLinesSansCompte.length} ligne(s) sans compte comptable`);
    }
    
    const refundLinesSansCompte = refundRepartitionLines.filter(l => !l.account || (l.account_label && l.account_label.trim() === ''));
    if (refundLinesSansCompte.length > 0) {
      errors.push(`Avoir : ${refundLinesSansCompte.length} ligne(s) sans compte comptable`);
    }
    
    return errors;
  };

  const prepareDataForApi = useCallback(() => {
    const taxData = {
      name: formData.name, amount: parseFloat(formData.amount) || 0, amount_type: formData.amount_type,
      type_tax_use: formData.type_tax_use, tax_scope: formData.tax_scope || null, fiscal_position: formData.fiscal_position || null,
      company: activeEntity ? activeEntity.id : null, country: formData.country || null, active: formData.active, price_include: formData.price_include,
      include_base_amount: formData.include_base_amount, tax_exigibility: formData.tax_exigibility, account: formData.account || null,
      cash_basis_transition_account: formData.cash_basis_transition_account || null, description: formData.description || '',
      tax_group: formData.tax_group || null, refund_account: formData.refund_account || null, hide_tax_exigibility: formData.hide_tax_exigibility,
      is_base_affected: formData.is_base_affected, analytic: formData.analytic, sequence: formData.sequence, note: formData.note || '',
    };

    const convertToBackendType = (displayType) => displayType === 'base' ? 'base' : 'tax';

    const invoiceLines = invoiceRepartitionLines.map((line, index) => ({
      repartition_type: convertToBackendType(line.repartition_type), factor_percent: parseFloat(line.factor_percent) || 0,
      factor: (parseFloat(line.factor_percent) || 0) / 100, account: line.account, tax_group: line.tax_group || null,
      document_type: 'invoice', sequence: (index + 1) * 10, company: activeEntity ? activeEntity.id : null
    }));

    const refundLines = refundRepartitionLines.map((line, index) => ({
      repartition_type: convertToBackendType(line.repartition_type), factor_percent: parseFloat(line.factor_percent) || 0,
      factor: (parseFloat(line.factor_percent) || 0) / 100, account: line.account, tax_group: line.tax_group || null,
      document_type: 'refund', sequence: (index + 1) * 10, company: activeEntity ? activeEntity.id : null
    }));

    return { tax: taxData, invoice_lines: invoiceLines, refund_lines: refundLines };
  }, [formData, activeEntity, invoiceRepartitionLines, refundRepartitionLines]);

  const handleSave = async (silent = false) => {
    if (!activeEntity) { setError('Vous devez sélectionner une entité'); return false; }
    
    const errors = validateForm();
    if (errors.length > 0) { setError(errors.join('\n')); return false; }
    
    setIsSubmitting(true);
    if (!silent) setError(null);
    
    try {
      const apiData = prepareDataForApi();
      let result;
      if (taxId) {
        result = await apiClient.put(`/compta/taxes/${taxId}/`, apiData.tax);
      } else {
        result = await apiClient.post('/compta/taxes/', apiData.tax);
        if (result && result.data && result.data.id) setTaxId(result.data.id);
      }
      if (result && result.data && result.data.id) {
        const taxIdValue = result.data.id;
        await apiClient.delete(`/compta/tax-repartition-lines/?tax=${taxIdValue}`).catch(() => {});
        const allLines = [...apiData.invoice_lines, ...apiData.refund_lines];
        await Promise.all(allLines.map(line => apiClient.post('/compta/tax-repartition-lines/', { ...line, tax: taxIdValue })));
      }
      if (!silent) setSuccess('Taux fiscal enregistré avec succès !');
      setHasUnsavedChanges(false);
      return true;
    } catch (err) {
      console.error('❌ Erreur enregistrement:', err);
      const detail = err.response && err.response.data ? JSON.stringify(err.response.data, null, 2) : err.message;
      setError(`Erreur : ${detail}`);
      return false;
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDiscardChanges = () => setShowConfirmDialog(true);
  
  const confirmDiscardChanges = () => {
    setFormData({ name: '', amount: '', amount_type: 'percent', type_tax_use: 'sale', tax_scope: '', fiscal_position: '', fiscal_position_label: '',
      company: '', country: '', country_label: '', active: true, price_include: false, include_base_amount: false, tax_exigibility: 'on_invoice',
      account: '', account_label: '', cash_basis_transition_account: '', cash_basis_transition_account_label: '', description: '',
      tax_group: '', tax_group_label: '', refund_account: '', refund_account_label: '', hide_tax_exigibility: false, is_base_affected: true, analytic: false, sequence: 10, note: '' });
    setInvoiceRepartitionLines([
      { id: `inv_${Date.now()}_1`, repartition_type: 'base', factor_percent: 100, account: '', account_label: '', tax_group: '', tax_group_label: '' },
      { id: `inv_${Date.now()}_2`, repartition_type: 'tax_main', factor_percent: 100, account: '', account_label: '', tax_group: '', tax_group_label: '' }
    ]);
    setRefundRepartitionLines([
      { id: `ref_${Date.now()}_1`, repartition_type: 'base', factor_percent: 100, account: '', account_label: '', tax_group: '', tax_group_label: '' },
      { id: `ref_${Date.now()}_2`, repartition_type: 'tax_main', factor_percent: 100, account: '', account_label: '', tax_group: '', tax_group_label: '' }
    ]);
    setTaxId(null); setHasUnsavedChanges(false); setShowConfirmDialog(false); setSuccess(null); setError(null);
  };

  const handleNewTax = () => { if (hasUnsavedChanges) setShowConfirmDialog(true); else navigate('/comptabilite/taux-fiscaux/create'); };
  const handleGoToList = () => { if (hasUnsavedChanges) setShowConfirmDialog(true); else navigate('/comptabilite/taux-fiscaux'); };
  const handleDuplicate = () => { setSuccess('Duplication à implémenter'); setShowActionsMenu(false); };
  const handleDelete = () => { setSuccess('Suppression à implémenter'); setShowActionsMenu(false); };
  const handleExtourner = () => { setSuccess("Extourne à implémenter"); setShowActionsMenu(false); };

  if (!activeEntity) {
    return (
      <div className="min-h-screen bg-gray-50 p-4">
        <div className="max-w-7xl mx-auto bg-white border border-gray-300">
          <div className="border-b border-gray-300 px-4 py-3"><div className="text-lg font-bold text-gray-900">Créer un taux fiscal</div></div>
          <div className="p-8">
            <div className="bg-yellow-50 border border-yellow-200 rounded p-6 text-center">
              <FiAlertCircle className="text-yellow-600 mx-auto mb-3" size={32} />
              <p className="text-yellow-800 font-medium text-lg mb-3">Aucune entité sélectionnée</p>
              <p className="text-sm text-gray-600 mb-4">Vous devez sélectionner une entité pour créer un taux fiscal.</p>
              <p className="text-xs text-gray-500">Cliquez sur l'icône <FiBriefcase className="inline text-purple-600 mx-1" size={14} /> en haut à droite pour choisir une entité.</p>
            </div>
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
              <Tooltip text="Créer un nouveau taux fiscal">
                <button onClick={handleNewTax} className="h-12 px-4 bg-purple-600 text-white text-sm hover:bg-purple-700 hover:scale-105 hover:shadow-md active:scale-95 transition-all duration-200 flex items-center justify-center font-medium border-0" style={{ minWidth: '100px' }}>
                  <FiPlus size={16} className="mr-1" /><span>Nouveau</span>
                </button>
              </Tooltip>
              <div className="flex flex-col h-12 justify-center">
                <div className="text-lg font-bold text-gray-900 cursor-pointer hover:text-purple-600 hover:scale-105 transition-all duration-200" onClick={handleGoToList}>Taux fiscaux</div>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-xs text-gray-600 font-medium">{formData.name ? `Taxe: ${formData.name}` : 'Nouveau taux fiscal'}</span>
                  {/* ✅ AFFICHAGE DE L'ENTITÉ DANS L'EN-TÊTE */}
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
                    <button onClick={handleDelete} className="w-full px-3 py-2 text-xs text-left hover:bg-gray-50 hover:pl-4 transition-all duration-200 flex items-center gap-2 border-b border-gray-100"><FiTrash2 size={12} /> Supprimer</button>
                    <button onClick={handleExtourner} className="w-full px-3 py-2 text-xs text-left hover:bg-gray-50 hover:pl-4 transition-all duration-200 flex items-center gap-2"><FiRotateCcw size={12} /> Extourné</button>
                  </div>
                )}
              </div>
              <Tooltip text="Enregistrer le taux fiscal">
                <button onClick={() => handleSave().then(success => { if (success) navigate('/comptabilite/taux-fiscaux'); })} disabled={isSubmitting} className="w-8 h-8 rounded-full bg-purple-600 text-white hover:bg-purple-700 hover:scale-110 hover:shadow-lg active:scale-90 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center shadow-sm">
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

        {/* INFORMATIONS GÉNÉRALES */}
        <div className="px-4 py-3 border-b border-gray-300">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <div className="flex items-center" style={{ height: '26px' }}>
                <label className="text-xs text-gray-700 min-w-[140px] font-medium">Nom de la taxe *</label>
                <div className="flex-1 ml-2 relative">
                  <FiTag className="absolute left-2 top-1.5 text-gray-400" size={12} />
                  <input type="text" value={formData.name} onChange={(e) => handleChange('name', e.target.value)} className="w-full pl-7 pr-2 py-1 border border-gray-300 text-xs hover:border-purple-400 focus:border-purple-600 transition-colors" style={{ height: '26px' }} placeholder="TVA 18%" />
                </div>
              </div>
              <div className="flex items-center" style={{ height: '26px' }}>
                <label className="text-xs text-gray-700 min-w-[140px] font-medium">Valeur de la taxe *</label>
                <div className="flex-1 ml-2 relative">
                  <FiPercent className="absolute left-2 top-1.5 text-gray-400" size={12} />
                  <input type="number" min="0" step="0.01" value={formData.amount} onChange={(e) => handleChange('amount', e.target.value)} className="w-full pl-7 pr-2 py-1 border border-gray-300 text-xs hover:border-purple-400 focus:border-purple-600 transition-colors" style={{ height: '26px' }} placeholder="18" />
                </div>
              </div>
              <div className="flex items-center" style={{ height: '26px' }}>
                <label className="text-xs text-gray-700 min-w-[140px] font-medium">Type de valeur *</label>
                <div className="flex-1 ml-2 relative">
                  <FiDollarSign className="absolute left-2 top-1.5 text-gray-400" size={12} />
                  <select value={formData.amount_type} onChange={(e) => handleChange('amount_type', e.target.value)} className="w-full pl-7 pr-2 py-1 border border-gray-300 text-xs hover:border-purple-400 focus:border-purple-600 transition-colors appearance-none" style={{ height: '26px' }}>
                    <option value="percent">Pourcentage du prix</option>
                    <option value="fixed">Montant fixe</option>
                    <option value="division">Pourcentage du prix TTC</option>
                  </select>
                </div>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex items-center" style={{ height: '26px' }}>
                <label className="text-xs text-gray-700 min-w-[140px] font-medium">Taxe appliquée sur *</label>
                <div className="flex-1 ml-2">
                  <select value={formData.type_tax_use} onChange={(e) => handleChange('type_tax_use', e.target.value)} className="w-full px-2 py-1 border border-gray-300 text-xs hover:border-purple-400 focus:border-purple-600 transition-colors appearance-none" style={{ height: '26px' }}>
                    <option value="sale">Ventes</option>
                    <option value="purchase">Achats</option>
                    <option value="none">Aucun</option>
                  </select>
                </div>
              </div>
              <div className="flex items-center" style={{ height: '26px' }}>
                <label className="text-xs text-gray-700 min-w-[140px] font-medium">Portée de la taxe</label>
                <div className="flex-1 ml-2">
                  <select value={formData.tax_scope} onChange={(e) => handleChange('tax_scope', e.target.value)} className="w-full px-2 py-1 border border-gray-300 text-xs hover:border-purple-400 focus:border-purple-600 transition-colors appearance-none" style={{ height: '26px' }}>
                    <option value="">Tous</option>
                    <option value="service">Services</option>
                    <option value="consu">Biens consommables</option>
                  </select>
                </div>
              </div>
              <div className="flex items-center" style={{ height: '26px' }}>
                <label className="text-xs text-gray-700 min-w-[140px] font-medium">Position fiscale</label>
                <div className="flex-1 ml-2 border border-gray-300 hover:border-purple-400 transition-colors" style={{ height: '26px' }}>
                  <AutocompleteInput value={formData.fiscal_position_label} selectedId={formData.fiscal_position} onChange={(text) => handleChange('fiscal_position_label', text)} onSelect={(id, label) => { handleChange('fiscal_position', id); handleChange('fiscal_position_label', label); markAsModified(); }} options={fiscalPositions} getOptionLabel={(f) => f.name} placeholder="Ex: Nationale..." />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Onglets */}
        <div className="border-b border-gray-300">
          <div className="px-4 flex">
            <button onClick={() => setActiveTab('comptable')} className={`px-4 py-2 text-xs font-medium border-b-2 transition-all duration-200 flex items-center gap-1 ${activeTab === 'comptable' ? 'border-purple-600 text-purple-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}><FiLayers size={12} /><span>Paramètres comptables</span></button>
            <button onClick={() => setActiveTab('avance')} className={`px-4 py-2 text-xs font-medium border-b-2 transition-all duration-200 flex items-center gap-1 ${activeTab === 'avance' ? 'border-purple-600 text-purple-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}><FiSettings size={12} /><span>Paramètres avancés</span></button>
            <button onClick={() => setActiveTab('notes')} className={`px-4 py-2 text-xs font-medium border-b-2 transition-all duration-200 flex items-center gap-1 ${activeTab === 'notes' ? 'border-purple-600 text-purple-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}><FiFileText size={12} /><span>Notes</span></button>
          </div>
        </div>

        {/* Contenu onglets */}
        <div className="p-4">
          {activeTab === 'comptable' && (
            <>
              <div className="mb-4 p-3 bg-gray-50 border border-gray-300 rounded">
                <div className="flex items-center gap-2 mb-2">
                  <FiCreditCard className="text-purple-600" size={14} />
                  <h4 className="text-sm font-semibold text-gray-800">Compte de taxe principal</h4>
                  <Tooltip text="Ce compte est utilisé par défaut. Les lignes de répartition priment sur ce compte.">
                    <FiInfo className="text-gray-400 cursor-help" size={14} />
                  </Tooltip>
                </div>
                <div className="flex items-center" style={{ height: '26px' }}>
                  <label className="text-xs text-gray-700 w-[140px] font-medium">Compte de taxe</label>
                  <div className="flex-1 ml-2 border border-gray-300 hover:border-purple-400 transition-colors" style={{ height: '26px' }}>
                    <AutocompleteInput value={formData.account_label} selectedId={formData.account} onChange={(text) => handleChange('account_label', text)} onSelect={(id, label) => { handleChange('account', id); handleChange('account_label', label); markAsModified(); }} options={accounts} getOptionLabel={(a) => `${a.code} - ${a.name}`} placeholder="Sélectionner un compte (optionnel)" />
                  </div>
                </div>
              </div>

              <div className="border border-gray-300">
                <div className="flex">
                  {/* FACTURE */}
                  <div className="w-1/2">
                    <div className="bg-gray-50 px-3 py-2 border-b border-gray-300">
                      <div className="text-sm font-semibold text-gray-800 truncate">Répartition sur une facture</div>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full border-collapse" ref={invoiceTableRef}>
                        <thead>
                          <tr className="bg-gray-100 text-xs">
                            <th className="border border-gray-300 px-2 py-1.5 font-medium text-gray-700 text-left" style={{ width: '130px', minWidth: '130px' }}>Type</th>
                            <th className="border border-gray-300 px-2 py-1.5 font-medium text-gray-700 text-left" style={{ width: '70px', minWidth: '70px' }}>%</th>
                            <th className="border border-gray-300 px-2 py-1.5 font-medium text-gray-700 text-left" style={{ width: '140px', minWidth: '140px' }}>Compte</th>
                            <th className="border border-gray-300 px-2 py-1.5 font-medium text-gray-700 text-left" style={{ width: '110px', minWidth: '110px' }}>Groupe</th>
                            <th className="border border-gray-300 px-2 py-1.5 font-medium text-gray-700 text-center" style={{ width: '35px', minWidth: '35px' }}></th>
                           </tr>
                        </thead>
                        <tbody>
                          {invoiceRepartitionLines.map((line, index) => (
                            <RepartitionLineRow key={line.id} line={line} index={index} accounts={accounts} taxGroups={taxGroups} onChange={(field, value) => handleInvoiceLineChange(index, field, value)} onRemove={() => removeRepartitionLine(index)} isLast={index === invoiceRepartitionLines.length - 1} canDelete={index >= 1} onTabAtLastField={() => addRepartitionLine()} />
                          ))}
                        </tbody>
                       </table>
                    </div>
                    <div className="px-2 pb-2"><RepartitionSummary lines={invoiceRepartitionLines} title="Facture" /></div>
                  </div>

                  {/* AVOIR */}
                  <div className="w-1/2">
                    <div className="bg-gray-50 px-3 py-2 border-b border-gray-300">
                      <div className="text-sm font-semibold text-gray-800 truncate">Répartition sur un avoir</div>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full border-collapse">
                        <thead>
                          <tr className="bg-gray-100 text-xs">
                            <th className="border border-gray-300 px-2 py-1.5 font-medium text-gray-700 text-left" style={{ width: '130px', minWidth: '130px' }}>Type</th>
                            <th className="border border-gray-300 px-2 py-1.5 font-medium text-gray-700 text-left" style={{ width: '70px', minWidth: '70px' }}>%</th>
                            <th className="border border-gray-300 px-2 py-1.5 font-medium text-gray-700 text-left" style={{ width: '140px', minWidth: '140px' }}>Compte</th>
                            <th className="border border-gray-300 px-2 py-1.5 font-medium text-gray-700 text-left" style={{ width: '110px', minWidth: '110px' }}>Groupe</th>
                            <th className="border border-gray-300 px-2 py-1.5 font-medium text-gray-700 text-center" style={{ width: '35px', minWidth: '35px' }}></th>
                           </tr>
                        </thead>
                        <tbody>
                          {refundRepartitionLines.map((line, index) => (
                            <RepartitionLineRow key={line.id} line={line} index={index} accounts={accounts} taxGroups={taxGroups} onChange={(field, value) => handleRefundLineChange(index, field, value)} onRemove={() => removeRepartitionLine(index)} isLast={index === refundRepartitionLines.length - 1} canDelete={index >= 1} onTabAtLastField={() => addRepartitionLine()} />
                          ))}
                        </tbody>
                       </table>
                    </div>
                    <div className="px-2 pb-2"><RepartitionSummary lines={refundRepartitionLines} title="Avoir" /></div>
                  </div>
                </div>
              </div>

              <div className="mt-4 flex justify-start">
                <button onClick={addRepartitionLine} className="h-7 px-3 bg-purple-600 text-white text-xs hover:bg-purple-700 transition-all duration-200 flex items-center gap-1 rounded">
                  <FiPlus size={12} /><span>Ajouter une ligne</span>
                </button>
              </div>
            </>
          )}

          {activeTab === 'avance' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <div className="flex items-center" style={{ height: '26px' }}>
                    <label className="text-xs text-gray-700 w-[160px] font-medium">Société</label>
                    <div className="flex-1 ml-2 px-2 py-1 bg-gray-100 border border-gray-300 text-xs text-gray-700 flex items-center gap-2 truncate" style={{ height: '26px' }}>
                      <FiBriefcase size={12} className="text-purple-600 flex-shrink-0" />
                      {/* ✅ AFFICHAGE CORRIGÉ DE L'ENTITÉ - Compatible nom/name/raison_sociale */}
                      <span className="truncate">{getEntityName()}</span>
                    </div>
                  </div>
                  <div className="flex items-center" style={{ height: '26px' }}>
                    <label className="text-xs text-gray-700 w-[160px] font-medium">Pays</label>
                    <div className="flex-1 ml-2 border border-gray-300 hover:border-purple-400 transition-colors" style={{ height: '26px' }}>
                      <AutocompleteInput value={formData.country_label} selectedId={formData.country} onChange={(text) => handleChange('country_label', text)} onSelect={(id, label) => { handleChange('country', id); handleChange('country_label', label); markAsModified(); }} options={pays} getOptionLabel={(p) => `${p.emoji || '🌍'} ${p.nom_fr || p.nom} (${p.code_iso})`} placeholder="Pays" />
                    </div>
                  </div>
                  <div className="flex items-center" style={{ height: '26px' }}>
                    <label className="text-xs text-gray-700 w-[160px] font-medium">Actif</label>
                    <div className="flex-1 ml-2"><input type="checkbox" checked={formData.active} onChange={(e) => handleChange('active', e.target.checked)} className="w-4 h-4 text-purple-600 focus:ring-purple-500" /></div>
                  </div>
                  <div className="flex items-center" style={{ height: '26px' }}>
                    <label className="text-xs text-gray-700 w-[160px] font-medium">Inclus dans le prix</label>
                    <div className="flex-1 ml-2"><input type="checkbox" checked={formData.price_include} onChange={(e) => handleChange('price_include', e.target.checked)} className="w-4 h-4 text-purple-600 focus:ring-purple-500" /></div>
                  </div>
                  <div className="flex items-center" style={{ height: '26px' }}>
                    <label className="text-xs text-gray-700 w-[160px] font-medium">Impacter la base</label>
                    <div className="flex-1 ml-2"><input type="checkbox" checked={formData.include_base_amount} onChange={(e) => handleChange('include_base_amount', e.target.checked)} className="w-4 h-4 text-purple-600 focus:ring-purple-500" /></div>
                  </div>
                  <div className="flex items-center" style={{ height: '26px' }}>
                    <label className="text-xs text-gray-700 w-[160px] font-medium">Exigibilité</label>
                    <div className="flex-1 ml-2">
                      <select value={formData.tax_exigibility} onChange={(e) => handleChange('tax_exigibility', e.target.value)} className="w-full px-2 py-1 border border-gray-300 text-xs hover:border-purple-400 focus:border-purple-600 transition-colors appearance-none truncate" style={{ height: '26px' }}>
                        <option value="on_invoice">Facturation</option>
                        <option value="on_payment">Paiement</option>
                      </select>
                    </div>
                  </div>
                  <div className="flex items-center" style={{ height: '26px' }}>
                    <label className="text-xs text-gray-700 w-[160px] font-medium">Compte paiement</label>
                    <div className="flex-1 ml-2 border border-gray-300 hover:border-purple-400 transition-colors" style={{ height: '26px' }}>
                      <AutocompleteInput value={formData.cash_basis_transition_account_label} selectedId={formData.cash_basis_transition_account} onChange={(text) => handleChange('cash_basis_transition_account_label', text)} onSelect={(id, label) => { handleChange('cash_basis_transition_account', id); handleChange('cash_basis_transition_account_label', label); markAsModified(); }} options={accounts} getOptionLabel={(a) => `${a.code} - ${a.name}`} placeholder="Transition" />
                    </div>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center" style={{ height: '26px' }}>
                    <label className="text-xs text-gray-700 w-[160px] font-medium">Description</label>
                    <div className="flex-1 ml-2"><input type="text" value={formData.description} onChange={(e) => handleChange('description', e.target.value)} className="w-full px-2 py-1 border border-gray-300 text-xs hover:border-purple-400 focus:border-purple-600 transition-colors truncate" style={{ height: '26px' }} placeholder="Description" /></div>
                  </div>
                  <div className="flex items-center" style={{ height: '26px' }}>
                    <label className="text-xs text-gray-700 w-[160px] font-medium">Groupe taxes</label>
                    <div className="flex-1 ml-2 border border-gray-300 hover:border-purple-400 transition-colors" style={{ height: '26px' }}>
                      <AutocompleteInput value={formData.tax_group_label} selectedId={formData.tax_group} onChange={(text) => handleChange('tax_group_label', text)} onSelect={(id, label) => { handleChange('tax_group', id); handleChange('tax_group_label', label); markAsModified(); }} options={taxGroups} getOptionLabel={(g) => g.name} placeholder="Groupe" />
                    </div>
                  </div>
                  <div className="flex items-center" style={{ height: '26px' }}>
                    <label className="text-xs text-gray-700 w-[160px] font-medium">Compte remboursement</label>
                    <div className="flex-1 ml-2 border border-gray-300 hover:border-purple-400 transition-colors" style={{ height: '26px' }}>
                      <AutocompleteInput value={formData.refund_account_label} selectedId={formData.refund_account} onChange={(text) => handleChange('refund_account_label', text)} onSelect={(id, label) => { handleChange('refund_account', id); handleChange('refund_account_label', label); markAsModified(); }} options={accounts} getOptionLabel={(a) => `${a.code} - ${a.name}`} placeholder="Remboursement" />
                    </div>
                  </div>
                  <div className="flex items-center" style={{ height: '26px' }}>
                    <label className="text-xs text-gray-700 w-[160px] font-medium">Masquer caisse</label>
                    <div className="flex-1 ml-2"><input type="checkbox" checked={formData.hide_tax_exigibility} onChange={(e) => handleChange('hide_tax_exigibility', e.target.checked)} className="w-4 h-4 text-purple-600 focus:ring-purple-500" /></div>
                  </div>
                  <div className="flex items-center" style={{ height: '26px' }}>
                    <label className="text-xs text-gray-700 w-[160px] font-medium">Base affectée</label>
                    <div className="flex-1 ml-2"><input type="checkbox" checked={formData.is_base_affected} onChange={(e) => handleChange('is_base_affected', e.target.checked)} className="w-4 h-4 text-purple-600 focus:ring-purple-500" /></div>
                  </div>
                  <div className="flex items-center" style={{ height: '26px' }}>
                    <label className="text-xs text-gray-700 w-[160px] font-medium">Analytique</label>
                    <div className="flex-1 ml-2"><input type="checkbox" checked={formData.analytic} onChange={(e) => handleChange('analytic', e.target.checked)} className="w-4 h-4 text-purple-600 focus:ring-purple-500" /></div>
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-gray-300 flex justify-start gap-2">
                <button onClick={() => handleSave().then(success => { if (success) navigate('/comptabilite/taux-fiscaux'); })} disabled={isSubmitting} className="h-7 px-3 bg-purple-600 text-white text-xs hover:bg-purple-700 transition-all duration-200 flex items-center gap-1 rounded disabled:opacity-50">
                  <FiUploadCloud size={12} /><span>Enregistrer</span>
                </button>
                <button onClick={handleDiscardChanges} className="h-7 px-3 bg-black text-white text-xs hover:bg-gray-800 transition-all duration-200 flex items-center gap-1 rounded">
                  <FiX size={12} /><span>Annuler</span>
                </button>
              </div>
            </div>
          )}

          {activeTab === 'notes' && (
            <div className="border border-gray-300">
              <textarea value={formData.note} onChange={(e) => handleChange('note', e.target.value)} rows={6} className="w-full px-3 py-2 border-0 text-xs focus:ring-2 focus:ring-purple-500" placeholder="Ajouter des notes complémentaires..." />
            </div>
          )}
        </div>

        {(error || success) && (
          <div className={`px-4 py-3 text-sm border-t border-gray-300 transition-all duration-300 ${error ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'}`}>
            <div className="flex items-center gap-2">
              {error ? <FiAlertCircle size={14} /> : <FiCheck size={14} />}
              <span className="truncate">{error || success}</span>
            </div>
          </div>
        )}
      </div>

      {showConfirmDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-sm shadow-lg max-w-md w-full mx-4">
            <h3 className="text-lg font-bold text-gray-900 mb-3">Modifications non sauvegardées</h3>
            <p className="text-sm text-gray-600 mb-6">Voulez-vous enregistrer les modifications avant de quitter ?</p>
            <div className="flex justify-end gap-3">
              <button onClick={async () => { setShowConfirmDialog(false); const saved = await handleSave(true); if (saved) navigate('/comptabilite/taux-fiscaux'); }} className="px-4 py-2 bg-purple-600 text-white text-sm hover:bg-purple-700 transition-all duration-200">Enregistrer</button>
              <button onClick={() => { confirmDiscardChanges(); }} className="px-4 py-2 bg-red-600 text-white text-sm hover:bg-red-700 transition-all duration-200">Ne pas enregistrer</button>
              <button onClick={() => setShowConfirmDialog(false)} className="px-4 py-2 border border-gray-300 text-gray-700 text-sm hover:bg-gray-50 transition-all duration-200">Annuler</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}