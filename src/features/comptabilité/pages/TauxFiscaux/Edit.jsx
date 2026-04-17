// C:\Users\IBM\Documents\somane_frontend\src\features\comptabilité\pages\TauxFiscaux\Edit.jsx

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
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

const convertToBackendType = (displayType) => {
  if (displayType === 'base') return 'base';
  if (displayType === 'tax_main') return 'tax';
  if (displayType === 'tax_split') return 'delatax';
  return 'tax';
};

const generateId = () => `${Date.now()}_${Math.random().toString(36).substr(2, 8)}`;

// ==========================================
// COMPOSANT LIGNE DE RÉPARTITION
// ==========================================
const RepartitionLineRow = ({ line, index, accounts, taxGroups, onChange, onRemove, isLast, canDelete, onTabAtLastField, docType }) => {
  const handleTypeChange = (e) => {
    const newType = e.target.value;
    onChange('repartition_type', newType);
    if (docType === 'refund' && newType === 'base') {
      onChange('factor_percent', -100);
    } else if (newType === 'base') {
      onChange('factor_percent', 100);
    }
  };

  const isBase = line.repartition_type === 'base';
  const isRefund = docType === 'refund';

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
          <div className={`w-full px-1 py-1 text-xs text-right font-medium ${isRefund ? 'text-red-600' : 'text-green-600'}`} style={{ height: '26px', lineHeight: '20px' }}>
            {isRefund ? '-100%' : '100%'}
          </div>
        ) : (
          <div className="relative">
            <input type="number" value={line.factor_percent}
              onChange={(e) => onChange('factor_percent', e.target.value === '' ? 0 : parseFloat(e.target.value))}
              min="-100" max="100" step="0.01"
              className={`w-full px-1 py-1 border-0 text-xs text-right focus:ring-1 focus:ring-purple-500 focus:outline-none appearance-none ${(line.factor_percent < 0) ? 'text-red-600 bg-red-50' : 'text-gray-900'}`}
              style={{ height: '26px' }} placeholder={isRefund ? "-100" : "100"}
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
  const isRefund = title === 'Avoir';
  
  let baseTotal = 0;
  let taxMainTotal = 0;
  let taxSplitTotal = 0;
  
  lines.forEach(line => {
    const percent = parseFloat(line.factor_percent) || 0;
    if (line.repartition_type === 'base') {
      baseTotal += percent;
    } else if (line.repartition_type === 'tax_main') {
      taxMainTotal += percent;
    } else if (line.repartition_type === 'tax_split') {
      taxSplitTotal += percent;
    }
  });

  const baseAbs = Math.abs(baseTotal);
  const taxMainAbs = Math.abs(taxMainTotal);
  const taxSplitAbs = Math.abs(taxSplitTotal);

  const isBaseValid = isRefund ? Math.abs(baseTotal + 100) <= 0.01 : Math.abs(baseTotal - 100) <= 0.01;
  const isSplitUsed = taxSplitAbs > 0;
  const isBalanced = !isSplitUsed || Math.abs(taxMainAbs - taxSplitAbs) <= 0.01;
  const isBaseEqualsTax = Math.abs(baseAbs - taxMainAbs) <= 0.01;
  const isValid = isBaseValid && isBalanced && isBaseEqualsTax;

  const bgColor = isRefund ? 'bg-green-50' : 'bg-blue-50';
  const borderColor = isRefund ? 'border-green-200' : 'border-blue-200';
  const textColor = isRefund ? 'text-green-700' : 'text-blue-700';

  return (
    <div className={`${bgColor} border ${borderColor} px-3 py-1.5 flex flex-col gap-1 mt-2`}>
      <div className="flex justify-between items-center">
        <span className={`text-xs font-medium ${textColor}`}>Total {title}</span>
        <div className="flex gap-3 text-xs">
          <span className="text-gray-600">Base: <b>{baseTotal.toFixed(2)}%</b></span>
          <span className="text-gray-600">Taxe: <b>{taxMainAbs.toFixed(2)}%</b></span>
          {isSplitUsed && <span className="text-gray-600">De la taxe: <b>{taxSplitTotal.toFixed(2)}%</b></span>}
        </div>
      </div>
      
      {isValid ? (
        <div className="text-xs text-green-600 font-bold">✅ Équilibre parfait</div>
      ) : (
        <div className="text-xs text-red-600 font-bold">
          {!isBaseValid && <div>⚠️ La base doit être à {isRefund ? '-100%' : '+100%'}</div>}
          {!isBaseEqualsTax && <div>⚠️ La Base n'est pas égale à la Taxe</div>}
          {isSplitUsed && !isBalanced && (
            <div>⚠️ La Taxe n'est pas égale à la somme de "De la taxe"</div>
          )}
        </div>
      )}
    </div>
  );
};

// ==========================================
// COMPOSANT PRINCIPAL
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

  const [invoiceRepartitionLines, setInvoiceRepartitionLines] = useState([]);
  const [refundRepartitionLines, setRefundRepartitionLines] = useState([]);

  const invoiceTableRef = useRef(null);
  const actionsMenuRef = useRef(null);

  const getEntityName = useCallback(() => {
    if (!activeEntity) return 'Non définie';
    return activeEntity.nom || activeEntity.name || activeEntity.raison_sociale || 'Non définie';
  }, [activeEntity]);

  // ==========================================
  // CHARGEMENT DES DONNÉES
  // ==========================================
  const loadTaxData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const tax = await apiClient.get(`/compta/taxes/${id}/`);
      if (!tax || !tax.id) {
        setError('❌ Taux fiscal non trouvé');
        setLoading(false);
        return;
      }

      let allLines = [];
      try {
        const linesData = await apiClient.get(`/compta/tax-repartition-lines/?tax=${id}`);
        allLines = normalizeData(linesData);
      } catch (err) {
        console.warn('⚠️ Erreur chargement lignes:', err);
      }

      const invoiceLines = allLines.filter(l => l.document_type === 'invoice');
      const refundLines = allLines.filter(l => l.document_type === 'refund');

      setFormData({
        name: tax.name || '',
        amount: tax.amount || '',
        amount_type: tax.amount_type || 'percent',
        type_tax_use: tax.type_tax_use || 'sale',
        tax_scope: tax.tax_scope || '',
        fiscal_position: tax.fiscal_position || '',
        fiscal_position_label: tax.fiscal_position_name || tax.fiscal_position_label || '',
        country: tax.country || '',
        country_label: tax.country_name || tax.country_label || '',
        active: tax.active !== undefined ? tax.active : true,
        price_include: tax.price_include || false,
        include_base_amount: tax.include_base_amount || false,
        tax_exigibility: tax.tax_exigibility || 'on_invoice',
        account: tax.account || '',
        account_label: tax.account_name || tax.account_label || '',
        cash_basis_transition_account: tax.cash_basis_transition_account || '',
        cash_basis_transition_account_label: tax.cash_basis_transition_account_name || tax.cash_basis_transition_account_label || '',
        description: tax.description || '',
        tax_group: tax.tax_group || '',
        tax_group_label: tax.tax_group_name || tax.tax_group_label || '',
        refund_account: tax.refund_account || '',
        refund_account_label: tax.refund_account_name || tax.refund_account_label || '',
        hide_tax_exigibility: tax.hide_tax_exigibility || false,
        is_base_affected: tax.is_base_affected !== undefined ? tax.is_base_affected : true,
        analytic: tax.analytic || false,
        sequence: tax.sequence || 10,
        note: tax.note || '',
      });

      const mapLine = (l, docType) => {
        let repartitionType = l.repartition_type;
        if (repartitionType === 'tax') repartitionType = 'tax_main';
        if (repartitionType === 'delatax') repartitionType = 'tax_split';
        
        return {
          id: l.id || generateId(),
          repartition_type: repartitionType,
          factor_percent: parseFloat(l.factor_percent) || (docType === 'refund' ? -100 : 100),
          account: l.account_id || l.account || null,
          account_label: l.account_name || l.account_label || '',
          tax_group: l.tax_group_id || l.tax_group || null,
          tax_group_label: l.tax_group_name || l.tax_group_label || '',
        };
      };

      if (invoiceLines.length === 0) {
        setInvoiceRepartitionLines([
          { id: generateId(), repartition_type: 'base', factor_percent: 100, account: null, account_label: '', tax_group: null, tax_group_label: '' },
          { id: generateId(), repartition_type: 'tax_main', factor_percent: 100, account: null, account_label: '', tax_group: null, tax_group_label: '' }
        ]);
        setRefundRepartitionLines([
          { id: generateId(), repartition_type: 'base', factor_percent: -100, account: null, account_label: '', tax_group: null, tax_group_label: '' },
          { id: generateId(), repartition_type: 'tax_main', factor_percent: -100, account: null, account_label: '', tax_group: null, tax_group_label: '' }
        ]);
      } else {
        setInvoiceRepartitionLines(invoiceLines.map(l => mapLine(l, 'invoice')));
        setRefundRepartitionLines(refundLines.map(l => mapLine(l, 'refund')));
      }

    } catch (err) {
      console.error('❌ Erreur chargement:', err);
      setError('❌ Impossible de charger les données');
    } finally {
      setLoading(false);
    }
  }, [id]);

  const loadOptions = useCallback(async () => {
    if (!activeEntity || !activeEntity.id) return;
    try {
      const [accountsRes, paysRes, taxGroupsRes, fiscalPositionsRes] = await Promise.all([
        apiClient.get('/compta/accounts/', { params: { company: activeEntity.id } }).catch(() => ({ data: [] })),
        apiClient.get('/pays/').catch(() => ({ data: [] })),
        apiClient.get('/compta/tax-groups/', { params: { company: activeEntity.id } }).catch(() => ({ data: [] })),
        apiClient.get('/compta/fiscal-positions/', { params: { company: activeEntity.id } }).catch(() => ({ data: [] }))
      ]);

      const allAccounts = normalizeData(accountsRes);
      const operationalAccounts = allAccounts.filter(acc => acc.company !== null);
      setAccounts(operationalAccounts);
      setPays(normalizeData(paysRes));
      setTaxGroups(normalizeData(taxGroupsRes));
      setFiscalPositions(normalizeData(fiscalPositionsRes));
    } catch (err) {
      console.error('❌ Erreur chargement options:', err);
    }
  }, [activeEntity]);

  // Chargement initial
  useEffect(() => {
    if (activeEntity && id) {
      loadTaxData();
      loadOptions();
    }
  }, [activeEntity, id, loadTaxData, loadOptions]);

  useEffect(() => {
    const handleClickOutside = (e) => { if (actionsMenuRef.current && !actionsMenuRef.current.contains(e.target)) setShowActionsMenu(false); };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Synchronisation des lignes avoir avec les lignes facture
  useEffect(() => {
    setRefundRepartitionLines(prev => 
      prev.map((refundLine, index) => {
        const invoiceLine = invoiceRepartitionLines[index];
        if (!invoiceLine) return refundLine;
        
        let newFactorPercent = invoiceLine.factor_percent;
        
        if (invoiceLine.repartition_type === 'base') {
          newFactorPercent = -100;
        } else {
          newFactorPercent = -Math.abs(invoiceLine.factor_percent);
        }
        
        return {
          ...refundLine,
          repartition_type: invoiceLine.repartition_type,
          factor_percent: newFactorPercent,
          account: invoiceLine.account,
          account_label: invoiceLine.account_label,
          tax_group: invoiceLine.tax_group,
          tax_group_label: invoiceLine.tax_group_label,
        };
      })
    );
  }, [invoiceRepartitionLines]);

  const markAsModified = () => { if (!hasUnsavedChanges) setHasUnsavedChanges(true); };

  const handleChange = (field, value) => { 
    setFormData(prev => ({ ...prev, [field]: value })); 
    markAsModified(); 
  };

  const addRepartitionLine = () => {
    const newInvoiceLine = { 
      id: generateId(),
      repartition_type: 'tax_split', 
      factor_percent: 0,
      account: null, 
      account_label: '', 
      tax_group: null, 
      tax_group_label: '' 
    };
    
    const newRefundLine = { 
      ...newInvoiceLine,
      id: generateId(),
      factor_percent: 0,
    };
    
    setInvoiceRepartitionLines(prev => [...prev, newInvoiceLine]);
    setRefundRepartitionLines(prev => [...prev, newRefundLine]);
    
    markAsModified();
    
    setTimeout(() => {
      const row = invoiceTableRef.current?.querySelector(`tbody tr:nth-child(${invoiceRepartitionLines.length + 2})`);
      const firstInput = row?.querySelector('input');
      if (firstInput) firstInput.focus();
    }, 50);
  };

  const removeRepartitionLine = (index) => {
    if (index === 0) return;
    const taxLines = invoiceRepartitionLines.filter(l => l.repartition_type !== 'base');
    if (taxLines.length <= 1 && invoiceRepartitionLines[index].repartition_type !== 'base') {
      setError("❌ Il doit y avoir au moins une ligne de taxe");
      return;
    }
    setInvoiceRepartitionLines(prev => prev.filter((_, i) => i !== index));
    setRefundRepartitionLines(prev => prev.filter((_, i) => i !== index));
    markAsModified();
  };

  const handleInvoiceLineChange = (index, field, value) => {
    setInvoiceRepartitionLines(prevLines => {
      const newLines = [...prevLines];
      const currentLine = newLines[index];
      
      switch (field) {
        case 'account':
          const accountId = cleanId(value);
          newLines[index] = { ...currentLine, account: accountId };
          break;
        case 'account_label':
          newLines[index] = { ...currentLine, account_label: value };
          break;
        case 'tax_group':
          const taxGroupId = cleanId(value);
          newLines[index] = { ...currentLine, tax_group: taxGroupId };
          break;
        case 'tax_group_label':
          newLines[index] = { ...currentLine, tax_group_label: value };
          break;
        case 'repartition_type':
          newLines[index] = { ...currentLine, repartition_type: value };
          if (value === 'base') newLines[index].factor_percent = 100;
          break;
        case 'factor_percent':
          newLines[index] = { ...currentLine, factor_percent: parseFloat(value) || 0 };
          break;
        default:
          newLines[index] = { ...currentLine, [field]: value };
      }
      return newLines;
    });
    markAsModified();
  };

  const handleRefundLineChange = (index, field, value) => {
    setRefundRepartitionLines(prevLines => {
      const newLines = [...prevLines];
      const currentLine = newLines[index];
      
      switch (field) {
        case 'account':
          const accountId = cleanId(value);
          newLines[index] = { ...currentLine, account: accountId };
          break;
        case 'account_label':
          newLines[index] = { ...currentLine, account_label: value };
          break;
        case 'tax_group':
          const taxGroupId = cleanId(value);
          newLines[index] = { ...currentLine, tax_group: taxGroupId };
          break;
        case 'tax_group_label':
          newLines[index] = { ...currentLine, tax_group_label: value };
          break;
        case 'repartition_type':
          newLines[index] = { ...currentLine, repartition_type: value };
          if (value === 'base') newLines[index].factor_percent = -100;
          break;
        case 'factor_percent':
          let val = parseFloat(value) || 0;
          newLines[index] = { ...currentLine, factor_percent: val };
          break;
        default:
          newLines[index] = { ...currentLine, [field]: value };
      }
      return newLines;
    });
    markAsModified();
  };

  // ========================================
  // VALIDATION
  // ========================================
  const validateForm = () => {
    const errors = [];
    
    if (!formData.name.trim()) errors.push("❌ Le nom de la taxe est obligatoire");
    if (!formData.amount || parseFloat(formData.amount) <= 0) errors.push("❌ La valeur de la taxe doit être supérieure à 0");
    
    const invoiceBaseLines = invoiceRepartitionLines.filter(l => l.repartition_type === 'base');
    const invoiceTaxMainLines = invoiceRepartitionLines.filter(l => l.repartition_type === 'tax_main');
    const invoiceTaxSplitLines = invoiceRepartitionLines.filter(l => l.repartition_type === 'tax_split');
    
    if (invoiceBaseLines.length === 0) errors.push("❌ Facture : Au moins une ligne de type 'Base' est requise");
    if (invoiceTaxMainLines.length === 0) errors.push("❌ Facture : Au moins une ligne de type 'Taxe' est requise");
    
    const invoiceLinesWithoutAccount = invoiceRepartitionLines.filter(l => 
      (!l.account || l.account === '' || l.account === null) && 
      (!l.account_label || l.account_label.trim() === '')
    );
    if (invoiceLinesWithoutAccount.length > 0) {
      errors.push(`❌ Facture : ${invoiceLinesWithoutAccount.length} ligne(s) sans compte comptable`);
    }
    
    const invoiceBaseTotal = invoiceBaseLines.reduce((sum, l) => sum + (parseFloat(l.factor_percent) || 0), 0);
    if (Math.abs(invoiceBaseTotal - 100) > 0.01) {
      errors.push(`❌ Facture : Le total des lignes de base doit être +100% (actuel: ${invoiceBaseTotal.toFixed(2)}%)`);
    }
    
    const invoiceTaxMainTotal = invoiceTaxMainLines.reduce((sum, l) => sum + Math.abs(parseFloat(l.factor_percent) || 0), 0);
    const invoiceTaxSplitTotal = invoiceTaxSplitLines.reduce((sum, l) => sum + Math.abs(parseFloat(l.factor_percent) || 0), 0);
    
    if (invoiceTaxSplitTotal > 0 && Math.abs(invoiceTaxMainTotal - invoiceTaxSplitTotal) > 0.01) {
      errors.push(`❌ Facture : La somme des lignes "Taxe" (${invoiceTaxMainTotal}%) doit être égale à la somme des lignes "De la taxe" (${invoiceTaxSplitTotal}%).`);
    }
    
    const invoiceInvalidSigns = invoiceTaxMainLines.filter(l => l.factor_percent < 0);
    if (invoiceInvalidSigns.length > 0) {
      errors.push(`❌ Facture : Les lignes de taxe doivent avoir des pourcentages positifs`);
    }
    
    const refundBaseLines = refundRepartitionLines.filter(l => l.repartition_type === 'base');
    const refundTaxMainLines = refundRepartitionLines.filter(l => l.repartition_type === 'tax_main');
    const refundTaxSplitLines = refundRepartitionLines.filter(l => l.repartition_type === 'tax_split');
    
    if (refundBaseLines.length === 0) errors.push("❌ Avoir : Au moins une ligne de type 'Base' est requise");
    if (refundTaxMainLines.length === 0) errors.push("❌ Avoir : Au moins une ligne de type 'Taxe' est requise");
    
    const refundLinesWithoutAccount = refundRepartitionLines.filter(l => 
      (!l.account || l.account === '' || l.account === null) && 
      (!l.account_label || l.account_label.trim() === '')
    );
    if (refundLinesWithoutAccount.length > 0) {
      errors.push(`❌ Avoir : ${refundLinesWithoutAccount.length} ligne(s) sans compte comptable`);
    }
    
    const refundBaseTotal = refundBaseLines.reduce((sum, l) => sum + (parseFloat(l.factor_percent) || 0), 0);
    if (Math.abs(refundBaseTotal + 100) > 0.01) {
      errors.push(`❌ Avoir : Le total des lignes de base doit être -100% (actuel: ${refundBaseTotal.toFixed(2)}%)`);
    }
    
    const refundTaxMainTotal = refundTaxMainLines.reduce((sum, l) => sum + Math.abs(parseFloat(l.factor_percent) || 0), 0);
    const refundTaxSplitTotal = refundTaxSplitLines.reduce((sum, l) => sum + Math.abs(parseFloat(l.factor_percent) || 0), 0);
    
    if (refundTaxSplitTotal > 0 && Math.abs(refundTaxMainTotal - refundTaxSplitTotal) > 0.01) {
      errors.push(`❌ Avoir : La somme des lignes "Taxe" (${refundTaxMainTotal}%) doit être égale à la somme des lignes "De la taxe" (${refundTaxSplitTotal}%).`);
    }
    
    const refundInvalidSigns = refundTaxMainLines.filter(l => l.factor_percent > 0);
    if (refundInvalidSigns.length > 0) {
      errors.push(`❌ Avoir : Les lignes de taxe doivent avoir des pourcentages négatifs`);
    }
    
    return errors;
  };

  // ========================================
  // PRÉPARATION DES DONNÉES POUR API
  // ========================================
  const prepareDataForApi = useCallback(() => {
    if (!activeEntity || !activeEntity.id) {
      throw new Error('Aucune entité sélectionnée');
    }
    
    const companyId = activeEntity.id;
    
    const taxData = {
      name: formData.name,
      amount: parseFloat(formData.amount) || 0,
      amount_type: formData.amount_type,
      type_tax_use: formData.type_tax_use,
      tax_scope: formData.tax_scope || '',
      fiscal_position: cleanId(formData.fiscal_position),
      company: companyId,
      country: cleanId(formData.country),
      active: formData.active,
      price_include: formData.price_include,
      include_base_amount: formData.include_base_amount,
      tax_exigibility: formData.tax_exigibility,
      account: cleanId(formData.account),
      cash_basis_transition_account: cleanId(formData.cash_basis_transition_account),
      description: formData.description || '',
      tax_group: cleanId(formData.tax_group),
      refund_account: cleanId(formData.refund_account),
      hide_tax_exigibility: formData.hide_tax_exigibility,
      is_base_affected: formData.is_base_affected,
      analytic: formData.analytic,
      sequence: formData.sequence,
      note: formData.note || '',
    };

    const invoiceLines = invoiceRepartitionLines
      .filter(line => line.account || (line.account_label && line.account_label.trim() !== ''))
      .map((line, index) => {
        let accountId = cleanId(line.account);
        if (!accountId && line.account_label?.trim()) {
          const label = line.account_label.toLowerCase().trim();
          const found = accounts.find(a => {
            const fullLabel = `${a.code} - ${a.name}`.toLowerCase();
            return fullLabel === label || a.name?.toLowerCase() === label || a.code?.toString() === label;
          });
          if (found) accountId = found.id;
        }
        
        const taxGroupId = cleanId(line.tax_group);
        let factorPercent = parseFloat(line.factor_percent);
        if (isNaN(factorPercent)) {
          factorPercent = line.repartition_type === 'base' ? 100 : 0;
        }
        
        return {
          repartition_type: convertToBackendType(line.repartition_type),
          factor_percent: factorPercent,
          account_id: accountId,
          company_id: companyId,
          tax_group_id: taxGroupId,
          document_type: 'invoice',
          sequence: (index + 1) * 10,
        };
      });

    const refundLines = refundRepartitionLines
      .filter(line => line.account || (line.account_label && line.account_label.trim() !== ''))
      .map((line, index) => {
        let accountId = cleanId(line.account);
        if (!accountId && line.account_label?.trim()) {
          const label = line.account_label.toLowerCase().trim();
          const found = accounts.find(a => {
            const fullLabel = `${a.code} - ${a.name}`.toLowerCase();
            return fullLabel === label || a.name?.toLowerCase() === label || a.code?.toString() === label;
          });
          if (found) accountId = found.id;
        }
        
        const taxGroupId = cleanId(line.tax_group);
        let factorPercent = parseFloat(line.factor_percent);
        if (isNaN(factorPercent)) {
          factorPercent = line.repartition_type === 'base' ? -100 : 0;
        }
        
        return {
          repartition_type: convertToBackendType(line.repartition_type),
          factor_percent: factorPercent,
          account_id: accountId,
          company_id: companyId,
          tax_group_id: taxGroupId,
          document_type: 'refund',
          sequence: (index + 1) * 10,
        };
      });

    return { tax: taxData, invoice_lines: invoiceLines, refund_lines: refundLines };
  }, [formData, activeEntity, invoiceRepartitionLines, refundRepartitionLines, accounts]);

  // ========================================
  // HANDLE SAVE
  // ========================================
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
      const apiData = prepareDataForApi();
      
      if (apiData.invoice_lines.length === 0) {
        setError('❌ Au moins une ligne de répartition avec un compte est requise');
        return false;
      }
      
      // 1️⃣ Mettre à jour la taxe
      const result = await apiClient.put(`/compta/taxes/${id}/`, apiData.tax);
      
      if (result?.id) {
        const taxIdValue = result.id;
        
        // 2️⃣ Récupérer les lignes existantes
        const existingLines = await apiClient.get(`/compta/tax-repartition-lines/?tax=${taxIdValue}`)
          .then(res => normalizeData(res))
          .catch(() => []);
        
        console.log('🗑️ Lignes existantes à supprimer:', existingLines.length);
        
        // 3️⃣ Supprimer toutes les lignes existantes
        for (const line of existingLines) {
          if (line?.id) {
            try {
              await apiClient.delete(`/compta/tax-repartition-lines/${line.id}/`);
              console.log('✅ Ligne supprimée:', line.id);
            } catch (err) {
              console.warn('⚠️ Échec suppression ligne', line.id, ':', err?.message);
            }
          }
        }
        
        // 4️⃣ Créer les nouvelles lignes
        const allLines = [...apiData.invoice_lines, ...apiData.refund_lines];
        console.log('📝 Création de', allLines.length, 'nouvelles lignes');
        
        for (const line of allLines) {
          await apiClient.post('/compta/tax-repartition-lines/', { 
            ...line, 
            tax_id: taxIdValue 
          });
        }
      }
      
      if (!silent) setSuccess('Taux fiscal modifié avec succès !');
      setHasUnsavedChanges(false);
      
      // Recharger les données pour afficher les changements
      await loadTaxData();
      
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
    loadTaxData();
    setHasUnsavedChanges(false);
    setShowConfirmDialog(false);
    setSuccess(null);
    setError(null);
  };

  const handleNewTax = () => { navigate('/comptabilite/taux-fiscaux/create'); };
  const handleGoToList = () => { if (hasUnsavedChanges) setShowConfirmDialog(true); else navigate('/comptabilite/taux-fiscaux'); };
  const handleDuplicate = () => { setSuccess('Duplication à implémenter'); setShowActionsMenu(false); };
  const handleDelete = () => { setSuccess('Suppression à implémenter'); setShowActionsMenu(false); };
  const handleExtourner = () => { setSuccess("Extourne à implémenter"); setShowActionsMenu(false); };

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
                  <span className="text-xs text-gray-600 font-medium">{formData.name ? `Taxe: ${formData.name}` : 'Modification taux fiscal'}</span>
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

        {(error || success) && (
          <div className={`px-4 py-3 text-sm border-b border-gray-300 transition-all duration-300 ${error ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'}`}>
            <div className="flex items-start gap-2">
              {error ? <FiAlertCircle size={14} className="mt-0.5 flex-shrink-0" /> : <FiCheck size={14} className="mt-0.5 flex-shrink-0" />}
              <div className="whitespace-pre-wrap text-sm">{error || success}</div>
            </div>
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
                  <div className="w-1/2 border-r border-gray-300">
                    <div className="bg-gray-50 px-3 py-2 border-b border-gray-300">
                      <div className="text-sm font-semibold text-gray-800 truncate">Répartition sur une facture</div>
                      <div className="text-xs text-green-600 mt-0.5">Équilibre requis : Base = Taxe = De la taxe</div>
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
                            <RepartitionLineRow key={line.id} line={line} index={index} accounts={accounts} taxGroups={taxGroups} 
                              onChange={(field, value) => handleInvoiceLineChange(index, field, value)} 
                              onRemove={() => removeRepartitionLine(index)} 
                              isLast={index === invoiceRepartitionLines.length - 1} 
                              canDelete={line.repartition_type !== 'base'}
                              onTabAtLastField={() => addRepartitionLine()}
                              docType="invoice" />
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
                      <div className="text-xs text-red-600 mt-0.5">Équilibre requis : Base = Taxe = De la taxe</div>
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
                            <RepartitionLineRow key={line.id} line={line} index={index} accounts={accounts} taxGroups={taxGroups} 
                              onChange={(field, value) => handleRefundLineChange(index, field, value)} 
                              onRemove={() => removeRepartitionLine(index)} 
                              isLast={index === refundRepartitionLines.length - 1} 
                              canDelete={line.repartition_type !== 'base'}
                              onTabAtLastField={() => addRepartitionLine()}
                              docType="refund" />
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
      </div>

      {showConfirmDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-sm shadow-lg max-w-md w-full mx-4">
            <h3 className="text-lg font-bold text-gray-900 mb-3">Modifications non sauvegardées</h3>
            <p className="text-sm text-gray-600 mb-6">Voulez-vous enregistrer les modifications avant de quitter ?</p>
            <div className="flex justify-end gap-3">
              <button onClick={async () => { setShowConfirmDialog(false); const saved = await handleSave(true); if (saved) navigate('/comptabilite/taux-fiscaux'); }} className="px-4 py-2 bg-purple-600 text-white text-sm hover:bg-purple-700 transition-all duration-200">Enregistrer</button>
              <button onClick={() => { confirmDiscardChanges(); navigate('/comptabilite/taux-fiscaux'); }} className="px-4 py-2 bg-red-600 text-white text-sm hover:bg-red-700 transition-all duration-200">Ne pas enregistrer</button>
              <button onClick={() => setShowConfirmDialog(false)} className="px-4 py-2 border border-gray-300 text-gray-700 text-sm hover:bg-gray-50 transition-all duration-200">Annuler</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}