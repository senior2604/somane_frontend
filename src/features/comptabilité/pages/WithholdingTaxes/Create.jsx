// src/features/comptabilité/pages/WithholdingTaxes/Create.jsx

import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  FiPlus, FiTrash2, FiCheck, FiUploadCloud, FiX, FiAlertCircle,
  FiBriefcase, FiSettings, FiPercent, FiTag, FiCreditCard,
  FiLayers, FiFileText
} from 'react-icons/fi';
import { useEntity } from '../../../../context/EntityContext';
import { apiClient } from '../../../../services/apiClient';

// ==========================================
// CONSTANTES
// ==========================================
const PERCENTAGE_WITHHOLDING_SCOPES = ['percent', 'on_total', 'on_tax'];

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

const generateId = () => `${Date.now()}_${Math.random().toString(36).substr(2, 8)}`;

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
const AutocompleteInput = ({ value, selectedId, onChange, onSelect, options, getOptionLabel, placeholder = "", disabled = false }) => {
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
      setDropdownStyle({ position: 'fixed', top: `${rect.bottom}px`, left: `${rect.left}px`, width: `${rect.width}px`, zIndex: 9999, maxHeight: '200px', overflowY: 'auto' });
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
      if (dropdownRef.current && !dropdownRef.current.contains(event.target) && inputRef.current && !inputRef.current.contains(event.target)) setIsOpen(false);
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
    setInputValue(label);
    setIsOpen(false);
    onSelect(option.id, label);
  };

  const handleKeyDown = (e) => {
    if (disabled) return;
    if (e.key === 'ArrowDown') { e.preventDefault(); setIsOpen(true); setHighlightedIndex(prev => prev < filteredOptions.length - 1 ? prev + 1 : prev); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setHighlightedIndex(prev => prev > 0 ? prev - 1 : 0); }
    else if (e.key === 'Enter' && isOpen && filteredOptions.length > 0) { e.preventDefault(); handleSelectOption(filteredOptions[highlightedIndex]); }
    else if (e.key === 'Escape') setIsOpen(false);
  };

  return (
    <div className="relative w-full h-full">
      <input ref={inputRef} type="text" value={inputValue} onChange={handleInputChange} onKeyDown={handleKeyDown}
        onFocus={() => { if(!disabled) { setIsOpen(true); updateDropdownPosition(); } }} placeholder={placeholder} disabled={disabled}
        className={`w-full px-2 py-1 text-xs focus:ring-1 focus:ring-purple-500 focus:outline-none border-0 ${disabled ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : ''}`}
        style={{ height: '26px', backgroundColor: 'transparent' }} autoComplete="off"
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
    </div>
  );
};

// ==========================================
// COMPOSANT LIGNE DE RÉPARTITION
// ==========================================
const RepartitionLineRow = ({ line, index, accounts, taxGroups, onChange, onRemove, isLast, canDelete, onTabAtLastField, readOnly = false }) => {
  const handleTypeChange = (e) => {
    const newType = e.target.value;
    onChange('repartition_type', newType);
    if (newType === 'base') onChange('factor_percent', 100);
  };

  const isBase = line.repartition_type === 'base';
  const displayValue = isBase ? 100 : Math.abs(line.factor_percent || 0);

  return (
    <tr className="hover:bg-gray-50">
      <td className="border border-gray-300 p-1" style={{ width: '130px', minWidth: '130px' }}>
        <select value={line.repartition_type} onChange={handleTypeChange} disabled={readOnly || isBase}
          className={`w-full px-1 py-1 border-0 text-xs focus:ring-1 focus:ring-purple-500 focus:outline-none bg-transparent ${(readOnly || isBase) ? 'text-gray-500 cursor-not-allowed' : ''}`} style={{ height: '26px' }}>
          <option value="base">Base</option>
          <option value="tax">Taxe</option>
          <option value="delatax">De la taxe</option>
        </select>
      </td>
      <td className="border border-gray-300 p-1" style={{ width: '70px', minWidth: '70px' }}>
        {isBase ? (
          <div className="w-full px-1 py-1 text-xs text-right font-medium text-green-600 bg-gray-50" style={{ height: '26px', lineHeight: '20px' }}>
            {displayValue}%
          </div>
        ) : (
          <div className="relative">
            <input type="number" value={displayValue}
              onChange={(e) => { if (!readOnly) onChange('factor_percent', e.target.value === '' ? 0 : Math.abs(parseFloat(e.target.value))); }}
              min="0" max="100" step="0.01" disabled={readOnly}
              className={`w-full px-1 py-1 border-0 text-xs text-right focus:ring-1 focus:ring-purple-500 focus:outline-none appearance-none ${readOnly ? 'text-gray-400 bg-gray-50' : 'text-gray-900'}`}
              style={{ height: '26px' }} placeholder="100" />
            <span className="absolute right-1 top-1.5 text-xs text-gray-400">%</span>
          </div>
        )}
      </td>
      <td className="border border-gray-300 p-1" style={{ width: '200px', minWidth: '200px' }}>
        <div style={{ height: '26px' }}>
          <AutocompleteInput
            value={line.account_label} selectedId={line.account}
            onChange={(text) => { if (!readOnly) onChange('account_label', text); }}
            onSelect={(id, label) => { if (!readOnly) { onChange('account', id); onChange('account_label', label); } }}
            options={accounts}
            getOptionLabel={(a) => `${a.code} - ${a.name}`}
            placeholder={isBase ? '' : 'Compte'}
            disabled={readOnly || isBase} />
        </div>
      </td>
      <td className="border border-gray-300 p-1" style={{ width: '110px', minWidth: '110px' }}>
        <div style={{ height: '26px' }}>
          <AutocompleteInput
            value={line.tax_group_label} selectedId={line.tax_group}
            onChange={(text) => { if (!readOnly) onChange('tax_group_label', text); }}
            onSelect={(id, label) => { if (!readOnly) { onChange('tax_group', id); onChange('tax_group_label', label); } }}
            options={taxGroups}
            getOptionLabel={(g) => g.name}
            placeholder={isBase ? '' : 'Groupe'}
            disabled={readOnly || isBase}
            onKeyDown={(e) => { if (e.key === 'Tab' && !e.shiftKey && isLast) { e.preventDefault(); onTabAtLastField(); } }}
          />
        </div>
      </td>
      <td className="border border-gray-300 p-1" style={{ width: '35px', minWidth: '35px' }}>
        {canDelete && !readOnly && !isBase ? (
          <button onClick={onRemove} className="w-full flex items-center justify-center p-1 text-gray-400 hover:text-red-600 transition-colors" style={{ height: '26px' }}><FiTrash2 size={12} /></button>
        ) : (
          <div className="w-full flex items-center justify-center" style={{ height: '26px' }}><FiCheck size={12} className="text-green-500" /></div>
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
  let taxMainTotal = 0;
  let taxSplitTotal = 0;
  let missingAccount = 0;
  
  lines.forEach(line => {
    const percent = Math.abs(parseFloat(line.factor_percent) || 0);
    if (line.repartition_type === 'base') baseTotal += percent;
    else if (line.repartition_type === 'tax') taxMainTotal += percent;
    else if (line.repartition_type === 'delatax') taxSplitTotal += percent;
    if (!line.account && line.repartition_type !== 'base') missingAccount++;
  });

  const isSplitUsed = taxSplitTotal > 0;
  const isBalanced = Math.abs(taxMainTotal - taxSplitTotal) <= 0.01;
  const isBaseValid = Math.abs(baseTotal - 100) <= 0.01;

  const bgColor = title === 'Avoir' ? 'bg-green-50' : 'bg-blue-50';
  const borderColor = title === 'Avoir' ? 'border-green-200' : 'border-blue-200';
  const textColor = title === 'Avoir' ? 'text-green-700' : 'text-blue-700';

  return (
    <div className={`${bgColor} border ${borderColor} px-3 py-1.5 flex flex-col gap-1 mt-2`}>
      <div className="flex justify-between items-center">
        <span className={`text-xs font-medium ${textColor}`}>Total {title}</span>
        <div className="flex gap-3 text-xs">
          <span className="text-gray-600">Base: <b className={isBaseValid ? 'text-green-600' : 'text-red-600'}>{baseTotal.toFixed(2)}%</b></span>
          <span className="text-gray-600">Taxe: <b>{taxMainTotal.toFixed(2)}%</b></span>
          {isSplitUsed && <span className="text-gray-600">De la taxe: <b>{taxSplitTotal.toFixed(2)}%</b></span>}
        </div>
      </div>
      {isBaseValid ? (
        <div className="text-xs text-green-600 font-bold">✅ Base = 100%</div>
      ) : (
        <div className="text-xs text-red-600 font-bold">⚠️ Base doit être 100% ({baseTotal.toFixed(2)}%)</div>
      )}
      {isSplitUsed && !isBalanced && (
        <div className="text-xs text-red-600 font-bold">⚠️ Taxe ({taxMainTotal}%) ≠ De la taxe ({taxSplitTotal}%)</div>
      )}
      {missingAccount > 0 && (
        <div className="text-xs text-red-600 font-bold">⚠️ {missingAccount} ligne(s) sans compte</div>
      )}
    </div>
  );
};

// ==========================================
// COMPOSANT PRINCIPAL (CREATE UNIQUEMENT)
// ==========================================
export default function WithholdingTaxesCreate() {
  const navigate = useNavigate();
  const { activeEntity } = useEntity();

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [activeTab, setActiveTab] = useState('comptable');

  const [accounts, setAccounts] = useState([]);
  const [taxes, setTaxes] = useState([]);
  const [journals, setJournals] = useState([]);
  const [taxGroups, setTaxGroups] = useState([]);

  const [formData, setFormData] = useState({
    name: '', amount: '', withholding_type: 'partial', withholding_scope: 'percent',
    withholding_eligibility: 'on_invoice', active: true, is_default: false,
    description: '', tax_id: '', tax_label: '', journal_id: '', journal_label: '',
    analytic_account_id: '', analytic_account_label: '', sequence: 10, note: ''
  });

  const [invoiceLines, setInvoiceLines] = useState([
    { id: generateId(), repartition_type: 'base', factor_percent: 100, account: null, account_label: '', tax_group: null, tax_group_label: '' },
    { id: generateId(), repartition_type: 'tax', factor_percent: 100, account: null, account_label: '', tax_group: null, tax_group_label: '' }
  ]);
  const [refundLines, setRefundLines] = useState([
    { id: generateId(), repartition_type: 'base', factor_percent: 100, account: null, account_label: '', tax_group: null, tax_group_label: '' },
    { id: generateId(), repartition_type: 'tax', factor_percent: 100, account: null, account_label: '', tax_group: null, tax_group_label: '' }
  ]);

  const [manuallyEditedRefundIndexes, setManuallyEditedRefundIndexes] = useState(new Set());

  const invoiceTableRef = useRef(null);
  const refundTableRef = useRef(null);

  const getEntityName = () => activeEntity?.nom || activeEntity?.name || activeEntity?.raison_sociale || 'Non définie';

  // ==========================================
  // SYNCHRONISATION INTELLIGENTE : Facture → Avoir
  // ==========================================
  useEffect(() => {
    setRefundLines(prev =>
      prev.map((refundLine, index) => {
        if (manuallyEditedRefundIndexes.has(index)) return refundLine;
        const invoiceLine = invoiceLines[index];
        if (!invoiceLine) return refundLine;
        return {
          ...refundLine,
          repartition_type: invoiceLine.repartition_type,
          factor_percent: invoiceLine.factor_percent,
          account: invoiceLine.account,
          account_label: invoiceLine.account_label,
          tax_group: invoiceLine.tax_group,
          tax_group_label: invoiceLine.tax_group_label,
        };
      })
    );
  }, [invoiceLines]); // eslint-disable-line react-hooks/exhaustive-deps

  // ==========================================
  // CHARGEMENT DES OPTIONS
  // ==========================================
  useEffect(() => {
    const loadOptions = async () => {
      if (!activeEntity) return;
      setLoading(true);
      try {
        const [accRes, taxRes, jourRes, taxGroupsRes] = await Promise.all([
          apiClient.get('/compta/accounts/', { params: { company: activeEntity.id, exclude_roots: true } }),
          apiClient.get('/compta/taxes/', { params: { company: activeEntity.id } }),
          apiClient.get('/compta/journals/', { params: { company: activeEntity.id } }),
          apiClient.get('/compta/tax-groups/', { params: { company: activeEntity.id } })
        ]);
        
        setAccounts(normalizeData(accRes).filter(acc => acc?.company !== null));
        setTaxes(normalizeData(taxRes));
        setJournals(normalizeData(jourRes));
        setTaxGroups(normalizeData(taxGroupsRes));
      } catch (err) {
        console.error(err);
        setError('Erreur de chargement');
      } finally {
        setLoading(false);
      }
    };
    loadOptions();
  }, [activeEntity]);

  const handleChange = (field, value) => {
    // Cas spécial pour la taxe : forcer le scope si besoin
    if (field === 'withholding_scope' && value !== 'on_tax') {
        // Nettoyer tax_id quand on change de scope
        setFormData(prev => ({ 
            ...prev, 
            [field]: value,
            tax_id: '',
            tax_label: ''
        }));
        return;
    }
    
    setFormData(prev => ({ ...prev, [field]: value }));
};

  // Gestionnaire lignes FACTURE
  const handleInvoiceLineChange = (index, field, value) => {
    setInvoiceLines(prev => {
      const newLines = [...prev];
      const currentLine = newLines[index];
      switch (field) {
        case 'account': newLines[index] = { ...currentLine, account: cleanId(value) }; break;
        case 'account_label': newLines[index] = { ...currentLine, account_label: value }; break;
        case 'tax_group': newLines[index] = { ...currentLine, tax_group: cleanId(value) }; break;
        case 'tax_group_label': newLines[index] = { ...currentLine, tax_group_label: value }; break;
        case 'repartition_type':
          newLines[index] = { ...currentLine, repartition_type: value };
          if (value === 'base') newLines[index].factor_percent = 100;
          break;
        case 'factor_percent': newLines[index] = { ...currentLine, factor_percent: Math.abs(parseFloat(value) || 0) }; break;
        default: newLines[index] = { ...currentLine, [field]: value };
      }
      return newLines;
    });
  };

  // Gestionnaire lignes AVOIR
  const handleRefundLineChange = (index, field, value) => {
    setManuallyEditedRefundIndexes(prev => new Set([...prev, index]));

    setRefundLines(prev => {
      const newLines = [...prev];
      const currentLine = newLines[index];
      switch (field) {
        case 'account': newLines[index] = { ...currentLine, account: cleanId(value) }; break;
        case 'account_label': newLines[index] = { ...currentLine, account_label: value }; break;
        case 'tax_group': newLines[index] = { ...currentLine, tax_group: cleanId(value) }; break;
        case 'tax_group_label': newLines[index] = { ...currentLine, tax_group_label: value }; break;
        case 'repartition_type':
          newLines[index] = { ...currentLine, repartition_type: value };
          if (value === 'base') newLines[index].factor_percent = 100;
          break;
        case 'factor_percent': newLines[index] = { ...currentLine, factor_percent: Math.abs(parseFloat(value) || 0) }; break;
        default: newLines[index] = { ...currentLine, [field]: value };
      }
      return newLines;
    });
  };

  const addLine = () => {
    const newInvoiceLine = { id: generateId(), repartition_type: 'delatax', factor_percent: 0, account: null, account_label: '', tax_group: null, tax_group_label: '' };
    const newRefundLine = { id: generateId(), repartition_type: 'delatax', factor_percent: 0, account: null, account_label: '', tax_group: null, tax_group_label: '' };

    setInvoiceLines(prev => [...prev, newInvoiceLine]);
    setRefundLines(prev => [...prev, newRefundLine]);

    setTimeout(() => {
      const rows = invoiceTableRef.current?.querySelectorAll('tbody tr');
      if (rows?.length) {
        const firstInput = rows[rows.length - 1]?.querySelector('select, input');
        if (firstInput) firstInput.focus();
      }
    }, 50);
  };

  const removeLine = (index) => {
    if (index === 0) return;
    const invoiceTaxLines = invoiceLines.filter(l => l.repartition_type !== 'base');
    if (invoiceTaxLines.length <= 1 && invoiceLines[index].repartition_type !== 'base') {
      setError("❌ Il doit y avoir au moins une ligne de taxe");
      return;
    }
    setInvoiceLines(prev => prev.filter((_, i) => i !== index));
    setRefundLines(prev => prev.filter((_, i) => i !== index));

    setManuallyEditedRefundIndexes(prev => {
      const newSet = new Set();
      prev.forEach(i => {
        if (i < index) newSet.add(i);
        else if (i > index) newSet.add(i - 1);
      });
      return newSet;
    });
  };

  const validate = () => {
    const errors = [];
    if (!formData.name.trim()) errors.push("❌ Le nom est obligatoire");
    const amount = parseFloat(formData.amount);
    if (!formData.amount || isNaN(amount) || amount <= 0) errors.push("❌ La valeur doit être > 0");
    if (PERCENTAGE_WITHHOLDING_SCOPES.includes(formData.withholding_scope) && amount > 100) errors.push("❌ Un pourcentage ne peut pas dépasser 100%");
    if (formData.withholding_scope === 'fixed' && amount <= 0) errors.push("❌ Le montant fixe doit être > 0");
    if (formData.withholding_scope === 'on_tax' && !cleanId(formData.tax_id)) errors.push("❌ La taxe de référence est obligatoire");

    const invoiceBaseTotal = invoiceLines.filter(l => l.repartition_type === 'base').reduce((s, l) => s + (l.factor_percent || 0), 0);
    if (Math.abs(invoiceBaseTotal - 100) > 0.01) errors.push(`❌ Facture : base = 100% (actuel: ${invoiceBaseTotal.toFixed(2)}%)`);

    const invoiceTaxTotal = invoiceLines.filter(l => l.repartition_type === 'tax').reduce((s, l) => s + (l.factor_percent || 0), 0);
    const invoiceDelataxTotal = invoiceLines.filter(l => l.repartition_type === 'delatax').reduce((s, l) => s + (l.factor_percent || 0), 0);
    if (invoiceDelataxTotal > 0 && Math.abs(invoiceTaxTotal - invoiceDelataxTotal) > 0.01) errors.push(`❌ Facture : Taxe (${invoiceTaxTotal}%) ≠ De la taxe (${invoiceDelataxTotal}%)`);

    const invoiceMissing = invoiceLines.filter(l => l.repartition_type !== 'base' && !l.account).length;
    if (invoiceMissing > 0) errors.push(`❌ Facture : ${invoiceMissing} ligne(s) sans compte`);

    const refundBaseTotal = refundLines.filter(l => l.repartition_type === 'base').reduce((s, l) => s + (l.factor_percent || 0), 0);
    if (Math.abs(refundBaseTotal - 100) > 0.01) errors.push(`❌ Avoir : base = 100% (actuel: ${refundBaseTotal.toFixed(2)}%)`);

    const refundTaxTotal = refundLines.filter(l => l.repartition_type === 'tax').reduce((s, l) => s + (l.factor_percent || 0), 0);
    const refundDelataxTotal = refundLines.filter(l => l.repartition_type === 'delatax').reduce((s, l) => s + (l.factor_percent || 0), 0);
    if (refundDelataxTotal > 0 && Math.abs(refundTaxTotal - refundDelataxTotal) > 0.01) errors.push(`❌ Avoir : Taxe (${refundTaxTotal}%) ≠ De la taxe (${refundDelataxTotal}%)`);

    const refundMissing = refundLines.filter(l => l.repartition_type !== 'base' && !l.account).length;
    if (refundMissing > 0) errors.push(`❌ Avoir : ${refundMissing} ligne(s) sans compte`);

    return errors;
  };

const handleSave = async () => {
    if (!activeEntity) { 
        setError('Sélectionnez une entité'); 
        return; 
    }
    
    const errors = validate();
    if (errors.length) { 
        setError(errors.join('\n')); 
        return; 
    }

    setSaving(true);
    setError(null);

    // 🔍 DEBUG - Vérification des valeurs avant envoi
    console.log('🔍 DEBUG SAVE - formData.tax_id:', {
        original: formData.tax_id,
        cleaned: cleanId(formData.tax_id),
        type: typeof formData.tax_id,
        withholding_scope: formData.withholding_scope
    });

    // Validation spécifique pour on_tax
    if (formData.withholding_scope === 'on_tax') {
        const taxIdClean = cleanId(formData.tax_id);
        if (!taxIdClean) {
            setError("❌ La taxe de référence est obligatoire pour le calcul 'Precompte de TVA'");
            setSaving(false);
            return;
        }
        if (!formData.tax_label) {
            setError("❌ Veuillez sélectionner une taxe de référence valide");
            setSaving(false);
            return;
        }
    }

    try {
        // Nettoyage et construction du payload
        const cleanedTaxId = formData.withholding_scope === 'on_tax' 
            ? cleanId(formData.tax_id) 
            : null;
            
        const payload = {
            name: formData.name.trim(),
            amount: parseFloat(formData.amount),
            withholding_type: formData.withholding_type,
            withholding_scope: formData.withholding_scope,
            withholding_eligibility: formData.withholding_eligibility,
            company_id: activeEntity.id,
            active: formData.active,
            is_default: formData.is_default,
            description: formData.description?.trim() || '',
            tax_id: cleanedTaxId,  // ← Envoie null si scope !== 'on_tax'
            journal_id: cleanId(formData.journal_id),
            analytic_account_id: cleanId(formData.analytic_account_id),
            sequence: parseInt(formData.sequence, 10) || 10,
            note: formData.note?.trim() || '',
            repartition_lines_write: [
                ...invoiceLines.map(l => ({
                    repartition_type: l.repartition_type,
                    factor_percent: Math.abs(parseFloat(l.factor_percent) || 0),
                    account_id: cleanId(l.account),
                    tax_group_id: cleanId(l.tax_group),
                    document_type: 'invoice',
                    company_id: activeEntity.id
                })),
                ...refundLines.map(l => ({
                    repartition_type: l.repartition_type,
                    factor_percent: Math.abs(parseFloat(l.factor_percent) || 0),
                    account_id: cleanId(l.account),
                    tax_group_id: cleanId(l.tax_group),
                    document_type: 'refund',
                    company_id: activeEntity.id
                }))
            ]
        };

        // 🔍 DEBUG - Afficher le payload final
        console.log('🔍 DEBUG SAVE - Final payload tax_id:', payload.tax_id);
        console.log('🔍 DEBUG SAVE - Full payload:', JSON.stringify(payload, null, 2));

        const response = await apiClient.post('/compta/withholding-taxes/', payload);
        
        console.log('✅ Succès - Réponse:', response.data);
        setSuccess('Retenue créée avec succès !');
        
        setTimeout(() => navigate('/comptabilite/withholding-taxes'), 1500);
    } catch (err) {
        console.error('❌ Erreur détaillée:', err);
        
        // Afficher les erreurs de validation du backend
        if (err?.response?.data) {
            console.error('Backend error details:', err.response.data);
            
            if (err.response.data.tax_id) {
                setError(`❌ Taxe de référence: ${err.response.data.tax_id.join(', ')}`);
            } else if (err.response.data.detail) {
                setError(`❌ ${err.response.data.detail}`);
            } else if (typeof err.response.data === 'object') {
                const errors = Object.entries(err.response.data)
                    .map(([key, value]) => `${key}: ${value.join?.(', ') || value}`)
                    .join('\n');
                setError(`❌ Erreur de validation:\n${errors}`);
            } else {
                setError(`❌ ${err.response.data}`);
            }
        } else {
            setError(err?.message || 'Erreur lors de la création');
        }
    } finally {
        setSaving(false);
    }
};

  const handleCancel = () => {
    navigate('/comptabilite/withholding-taxes');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div><p className="mt-4 text-gray-600">Chargement...</p></div>
      </div>
    );
  }

  if (!activeEntity) {
    return (
      <div className="min-h-screen bg-gray-50 p-4">
        <div className="max-w-4xl mx-auto bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center">
          <FiAlertCircle className="text-yellow-600 mx-auto mb-3" size={32} />
          <p className="text-yellow-800 font-medium mb-3">Aucune entité sélectionnée</p>
          <button onClick={() => navigate('/select-entite')} className="px-4 py-2 bg-purple-600 text-white rounded-lg">Sélectionner une entité</button>
        </div>
      </div>
    );
  }

  const isFormValid = validate().length === 0;

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-7xl mx-auto bg-white border border-gray-300">

        {/* HEADER */}
        <div className="border-b border-gray-300 px-4 py-3">
          <div className="flex items-start justify-between mb-2">
            <div className="flex items-start gap-3">
              <Tooltip text="Créer une nouvelle retenue">
                <button onClick={() => { navigate('/comptabilite/withholding-taxes/create'); window.location.reload(); }} className="h-12 px-4 bg-purple-600 text-white text-sm hover:bg-purple-700 transition-all duration-200 flex items-center justify-center font-medium" style={{ minWidth: '100px' }}>
                  <FiPlus size={16} className="mr-1" /><span>Nouveau</span>
                </button>
              </Tooltip>
              <div className="flex flex-col h-12 justify-center">
                <div className="text-lg font-bold text-gray-900 cursor-pointer hover:text-purple-600 transition-all duration-200" onClick={handleCancel}>Retenues de la taxe</div>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-xs text-gray-600">Nouvelle retenue</span>
                  <span className="text-xs text-purple-600 bg-purple-50 px-2 py-0.5 rounded flex items-center gap-1"><FiBriefcase size={10} />{getEntityName()}</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <div className="relative">
                <Tooltip text="Menu des actions">
                  <button className="h-8 px-3 border border-gray-300 text-gray-700 text-xs hover:bg-gray-50 hover:scale-105 transition-all duration-200 flex items-center gap-1 rounded">
                    <FiSettings size={12} /><span>Actions</span>
                  </button>
                </Tooltip>
              </div>
              <Tooltip text="Enregistrer">
                <button onClick={handleSave} disabled={saving || !isFormValid} className={`w-8 h-8 rounded-full text-white transition-all duration-200 flex items-center justify-center shadow-sm ${isFormValid && !saving ? 'bg-purple-600 hover:bg-purple-700 hover:scale-110' : 'bg-gray-300 cursor-not-allowed'}`}>
                  <FiUploadCloud size={16} />
                </button>
              </Tooltip>
              <Tooltip text="Annuler">
                <button onClick={handleCancel} className="w-8 h-8 rounded-full bg-black text-white hover:bg-gray-800 hover:scale-110 transition-all duration-200 flex items-center justify-center">
                  <FiX size={16} />
                </button>
              </Tooltip>
            </div>
          </div>
        </div>

        {(error || success) && (
          <div className={`px-4 py-3 text-sm border-b border-gray-300 ${error ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'}`}>
            <div className="flex items-start gap-2">
              {error ? <FiAlertCircle size={14} className="mt-0.5" /> : <FiCheck size={14} className="mt-0.5" />}
              <div className="whitespace-pre-wrap">{error || success}</div>
            </div>
          </div>
        )}

        {/* FORMULAIRE PRINCIPAL */}
        <div className="px-4 py-3 border-b border-gray-300">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <div className="flex items-center" style={{ height: '26px' }}>
                <label className="text-xs text-gray-700 min-w-[140px] font-medium">Nom de la retenue *</label>
                <div className="flex-1 ml-2 relative">
                  <FiTag className="absolute left-2 top-1.5 text-gray-400" size={12} />
                  <input type="text" value={formData.name} onChange={(e) => handleChange('name', e.target.value)} className="w-full pl-7 pr-2 py-1 border border-gray-300 text-xs hover:border-purple-400 focus:border-purple-600 transition-colors" style={{ height: '26px' }} placeholder="Ex: Retenue TVA 50%" />
                </div>
              </div>
              <div className="flex items-center" style={{ height: '26px' }}>
                <label className="text-xs text-gray-700 min-w-[140px] font-medium">Base de calcul *</label>
                <div className="flex-1 ml-2">
                  <select value={formData.withholding_scope} onChange={(e) => { handleChange('withholding_scope', e.target.value); if (e.target.value !== 'on_tax') handleChange('tax_id', ''); }} className="w-full px-2 py-1 border border-gray-300 text-xs hover:border-purple-400 focus:border-purple-600 transition-colors appearance-none" style={{ height: '26px' }}>
                    <option value="percent">Pourcentage du montant HT</option>
                    <option value="on_total">Pourcentage du montant TTC</option>
                    <option value="fixed">Montant fixe (forfaitaire)</option>
                    <option value="on_tax">Precompte de TVA</option>
                  </select>
                </div>
              </div>
              <div className="flex items-center" style={{ height: '26px' }}>
                <label className="text-xs text-gray-700 min-w-[140px] font-medium">{formData.withholding_scope === 'fixed' ? 'Montant fixe *' : 'Taux % *'}</label>
                <div className="flex-1 ml-2 relative flex items-center">
                  {formData.withholding_scope === 'fixed' ? <FiTag className="absolute left-2 top-1.5 text-gray-400" size={12} /> : <FiPercent className="absolute left-2 top-1.5 text-gray-400" size={12} />}
                  <input type="number" min={formData.withholding_scope === 'fixed' ? 1 : 0.01} max={formData.withholding_scope === 'fixed' ? undefined : 100} step="0.01" value={formData.amount} onChange={(e) => handleChange('amount', e.target.value)} className="w-full pl-7 pr-12 py-1 border border-gray-300 text-xs hover:border-purple-400 focus:border-purple-600 transition-colors" style={{ height: '26px' }} placeholder={formData.withholding_scope === 'fixed' ? "500" : "10"} />
                  <span className="absolute right-2 top-1.5 text-xs text-gray-500 font-medium">{formData.withholding_scope === 'fixed' ? 'unité' : '%'}</span>
                </div>
              </div>
              {formData.withholding_scope === 'on_tax' && (
                <div className="flex items-center" style={{ height: '26px' }}>
                  <label className="text-xs text-purple-600 min-w-[140px] font-medium">Taxe de référence *</label>
                  <div className="flex-1 ml-2 border border-gray-300 hover:border-purple-400 transition-colors" style={{ height: '26px' }}>
                    <AutocompleteInput value={formData.tax_label} selectedId={formData.tax_id} onChange={(text) => handleChange('tax_label', text)} onSelect={(id, label) => { handleChange('tax_id', id); handleChange('tax_label', label); }} options={taxes} getOptionLabel={(t) => `${t.name} (${t.amount}%)`} placeholder="Ex: TVA 18%" />
                  </div>
                </div>
              )}
            </div>
            <div className="space-y-2">
              <div className="flex items-center" style={{ height: '26px' }}>
                <label className="text-xs text-gray-700 min-w-[140px] font-medium">Type *</label>
                <div className="flex-1 ml-2 relative">
                  <FiCreditCard className="absolute left-2 top-1.5 text-gray-400" size={12} />
                  <select value={formData.withholding_type} onChange={(e) => handleChange('withholding_type', e.target.value)} className="w-full pl-7 pr-2 py-1 border border-gray-300 text-xs hover:border-purple-400 focus:border-purple-600 transition-colors appearance-none" style={{ height: '26px' }}>
                    <option value="partial">Partielle</option>
                    <option value="full">Totale</option>
                  </select>
                </div>
              </div>
              <div className="flex items-center" style={{ height: '26px' }}>
                <label className="text-xs text-gray-700 min-w-[140px] font-medium">Exigibilité *</label>
                <div className="flex-1 ml-2">
                  <select value={formData.withholding_eligibility} onChange={(e) => handleChange('withholding_eligibility', e.target.value)} className="w-full px-2 py-1 border border-gray-300 text-xs hover:border-purple-400 focus:border-purple-600 transition-colors appearance-none" style={{ height: '26px' }}>
                    <option value="on_invoice">Sur facture</option>
                    <option value="on_payment">Sur paiement</option>
                  </select>
                </div>
              </div>
              <div className="flex items-center" style={{ height: '26px' }}>
                <label className="text-xs text-gray-700 min-w-[140px] font-medium">Description</label>
                <div className="flex-1 ml-2">
                  <input type="text" value={formData.description} onChange={(e) => handleChange('description', e.target.value)} className="w-full px-2 py-1 border border-gray-300 text-xs hover:border-purple-400 focus:border-purple-600 transition-colors" style={{ height: '26px' }} placeholder="Description..." />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ONGLETS */}
        <div className="border-b border-gray-300">
          <div className="px-4 flex gap-4">
            <button onClick={() => setActiveTab('comptable')} className={`px-4 py-2 text-xs font-medium border-b-2 transition-all duration-200 ${activeTab === 'comptable' ? 'border-purple-600 text-purple-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
              <FiLayers size={12} className="inline mr-1" />Paramètres comptables
            </button>
            <button onClick={() => setActiveTab('avance')} className={`px-4 py-2 text-xs font-medium border-b-2 transition-all duration-200 ${activeTab === 'avance' ? 'border-purple-600 text-purple-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
              <FiSettings size={12} className="inline mr-1" />Paramètres avancés
            </button>
            <button onClick={() => setActiveTab('notes')} className={`px-4 py-2 text-xs font-medium border-b-2 transition-all duration-200 ${activeTab === 'notes' ? 'border-purple-600 text-purple-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
              <FiFileText size={12} className="inline mr-1" />Notes
            </button>
          </div>
        </div>

        {/* CONTENU */}
        <div className="p-4">
          {activeTab === 'comptable' && (
            <div className="space-y-4">
              <div className="border border-gray-300">
                <div className="flex">

                  {/* FACTURE */}
                  <div className="w-1/2 border-r border-gray-300">
                    <div className="bg-gray-50 px-3 py-2 border-b border-gray-300">
                      <div className="text-sm font-semibold text-gray-800">Répartition sur une facture</div>
                      <div className="text-xs text-blue-600 mt-0.5">Base = 100% | Taxe = De la taxe</div>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full border-collapse" ref={invoiceTableRef}>
                        <thead>
                          <tr className="bg-gray-100 text-xs">
                            <th className="border border-gray-300 px-2 py-1.5 text-left" style={{ width: '130px' }}>Type</th>
                            <th className="border border-gray-300 px-2 py-1.5 text-left" style={{ width: '70px' }}>%</th>
                            <th className="border border-gray-300 px-2 py-1.5 text-left" style={{ width: '200px' }}>Compte</th>
                            <th className="border border-gray-300 px-2 py-1.5 text-left" style={{ width: '110px' }}>Groupe</th>
                            <th className="border border-gray-300 px-2 py-1.5 text-center" style={{ width: '35px' }}></th>
                          </tr>
                        </thead>
                        <tbody>
                          {invoiceLines.map((line, idx) => (
                            <RepartitionLineRow key={line.id} line={line} index={idx}
                              accounts={accounts} taxGroups={taxGroups}
                              onChange={(f, v) => handleInvoiceLineChange(idx, f, v)}
                              onRemove={() => removeLine(idx)}
                              canDelete={idx >= 2} isLast={idx === invoiceLines.length - 1}
                              onTabAtLastField={addLine} readOnly={false} />
                          ))}
                        </tbody>
                      </table>
                    </div>
                    <div className="px-2 pb-2"><RepartitionSummary lines={invoiceLines} title="Facture" /></div>
                  </div>

                  {/* AVOIR */}
                  <div className="w-1/2">
                    <div className="bg-gray-50 px-3 py-2 border-b border-gray-300">
                      <div className="text-sm font-semibold text-gray-800">Répartition sur un avoir</div>
                      <div className="text-xs text-green-600 mt-0.5">
                        Synchronisé depuis la facture — modifiable indépendamment
                      </div>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full border-collapse" ref={refundTableRef}>
                        <thead>
                          <tr className="bg-gray-100 text-xs">
                            <th className="border border-gray-300 px-2 py-1.5 text-left" style={{ width: '130px' }}>Type</th>
                            <th className="border border-gray-300 px-2 py-1.5 text-left" style={{ width: '70px' }}>%</th>
                            <th className="border border-gray-300 px-2 py-1.5 text-left" style={{ width: '200px' }}>Compte</th>
                            <th className="border border-gray-300 px-2 py-1.5 text-left" style={{ width: '110px' }}>Groupe</th>
                            <th className="border border-gray-300 px-2 py-1.5 text-center" style={{ width: '35px' }}></th>
                          </tr>
                        </thead>
                        <tbody>
                          {refundLines.map((line, idx) => (
                            <RepartitionLineRow key={line.id} line={line} index={idx}
                              accounts={accounts} taxGroups={taxGroups}
                              onChange={(f, v) => handleRefundLineChange(idx, f, v)}
                              onRemove={() => removeLine(idx)}
                              canDelete={idx >= 2} isLast={idx === refundLines.length - 1}
                              onTabAtLastField={addLine} readOnly={false} />
                          ))}
                        </tbody>
                      </table>
                    </div>
                    <div className="px-2 pb-2"><RepartitionSummary lines={refundLines} title="Avoir" /></div>
                  </div>

                </div>
              </div>

              <button onClick={addLine} className="h-7 px-3 bg-purple-600 text-white text-xs hover:bg-purple-700 transition-all duration-200 flex items-center gap-1 rounded">
                <FiPlus size={12} /><span>Ajouter une ligne de répartition</span>
              </button>

              <div className="pt-4 border-t border-gray-200 flex justify-start gap-2">
                <button onClick={handleSave} disabled={saving || !isFormValid} className={`h-7 px-3 text-white text-xs rounded flex items-center gap-1 ${isFormValid && !saving ? 'bg-purple-600 hover:bg-purple-700' : 'bg-gray-300 cursor-not-allowed'}`}>
                  <FiUploadCloud size={12} /><span>Enregistrer</span>
                </button>
                <button onClick={handleCancel} className="h-7 px-3 bg-black text-white text-xs hover:bg-gray-800 rounded flex items-center gap-1">
                  <FiX size={12} /><span>Annuler</span>
                </button>
              </div>
            </div>
          )}

          {activeTab === 'avance' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <div className="flex items-center" style={{ height: '26px' }}>
                    <label className="text-xs text-gray-700 w-[160px] font-medium">Société</label>
                    <div className="flex-1 ml-2 px-2 py-1 bg-gray-100 border border-gray-300 text-xs text-gray-700 flex items-center gap-2 truncate" style={{ height: '26px' }}>
                      <FiBriefcase size={12} className="text-purple-600" /><span className="truncate">{getEntityName()}</span>
                    </div>
                  </div>
                  <div className="flex items-center" style={{ height: '26px' }}>
                    <label className="text-xs text-gray-700 w-[160px] font-medium">Retenue par défaut</label>
                    <div className="flex-1 ml-2"><input type="checkbox" checked={formData.is_default} onChange={(e) => handleChange('is_default', e.target.checked)} className="w-4 h-4 text-purple-600" /></div>
                  </div>
                  <div className="flex items-center" style={{ height: '26px' }}>
                    <label className="text-xs text-gray-700 w-[160px] font-medium">Ordre d'application</label>
                    <div className="flex-1 ml-2"><input type="number" min="1" value={formData.sequence} onChange={(e) => handleChange('sequence', e.target.value)} className="w-full px-2 py-1 border border-gray-300 text-xs hover:border-purple-400 focus:border-purple-600 transition-colors" style={{ height: '26px' }} placeholder="10" /></div>
                  </div>
                  <div className="flex items-center" style={{ height: '26px' }}>
                    <label className="text-xs text-gray-700 w-[160px] font-medium">Journal comptable</label>
                    <div className="flex-1 ml-2 border border-gray-300 hover:border-purple-400 transition-colors" style={{ height: '26px' }}>
                      <AutocompleteInput value={formData.journal_label} selectedId={formData.journal_id} onChange={(text) => handleChange('journal_label', text)} onSelect={(id, label) => { handleChange('journal_id', id); handleChange('journal_label', label); }} options={journals} getOptionLabel={(j) => `${j.code} - ${j.name}`} placeholder="Journal" />
                    </div>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center" style={{ height: '26px' }}>
                    <label className="text-xs text-gray-700 w-[160px] font-medium">Compte analytique</label>
                    <div className="flex-1 ml-2 border border-gray-300 hover:border-purple-400 transition-colors" style={{ height: '26px' }}>
                      <AutocompleteInput value={formData.analytic_account_label} selectedId={formData.analytic_account_id} onChange={(text) => handleChange('analytic_account_label', text)} onSelect={(id, label) => { handleChange('analytic_account_id', id); handleChange('analytic_account_label', label); }} options={[]} getOptionLabel={(a) => `${a.code} - ${a.name}`} placeholder="Non configuré" />
                    </div>
                  </div>
                </div>
              </div>
              <div className="pt-4 border-t border-gray-300 flex justify-start gap-2">
                <button onClick={handleSave} disabled={saving || !isFormValid} className={`h-7 px-3 text-white text-xs rounded flex items-center gap-1 ${isFormValid && !saving ? 'bg-purple-600 hover:bg-purple-700' : 'bg-gray-300 cursor-not-allowed'}`}>
                  <FiUploadCloud size={12} /><span>Enregistrer</span>
                </button>
                <button onClick={handleCancel} className="h-7 px-3 bg-black text-white text-xs hover:bg-gray-800 rounded flex items-center gap-1">
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
      </div>
    </div>
  );
}
