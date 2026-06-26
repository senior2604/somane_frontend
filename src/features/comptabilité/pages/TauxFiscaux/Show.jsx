// src/features/comptabilité/pages/TauxFiscaux/Show.jsx

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
        </div>
      )}
    </div>
  );
};

// ==========================================
// COMPOSANT AUTOCOMPLETE
// ==========================================
const AutocompleteInput = ({ value, selectedId, onChange, onSelect, options, getOptionLabel, placeholder = "", onKeyDown, disabled = false }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [inputValue, setInputValue] = useState(value || '');
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const inputRef = useRef(null);
  const dropdownRef = useRef(null);
  const [dropdownStyle, setDropdownStyle] = useState({});

  useEffect(() => { if (value !== undefined) setInputValue(value); }, [value]);

  const filteredOptions = options.filter(option =>
    getOptionLabel(option).toLowerCase().includes(inputValue.toLowerCase())
  );

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
      return () => {
        window.removeEventListener('scroll', handleScroll, true);
        window.removeEventListener('resize', handleResize);
      };
    }
  }, [isOpen]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        dropdownRef.current && !dropdownRef.current.contains(event.target) &&
        inputRef.current && !inputRef.current.contains(event.target)
      ) {
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
    setInputValue(label);
    setIsOpen(false);
    onSelect(option.id, label);
  };

  const handleKeyDown = (e) => {
    if (disabled) return;
    if (e.key === 'ArrowDown') { e.preventDefault(); setIsOpen(true); setHighlightedIndex(prev => Math.min(prev + 1, filteredOptions.length - 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setHighlightedIndex(prev => Math.max(prev - 1, 0)); }
    else if (e.key === 'Enter' && isOpen && filteredOptions.length > 0) { e.preventDefault(); handleSelectOption(filteredOptions[highlightedIndex]); }
    else if (e.key === 'Escape') setIsOpen(false);
    if (onKeyDown) onKeyDown(e);
  };

  return (
    <div className="relative w-full h-full">
      <input
        ref={inputRef} type="text" value={inputValue}
        onChange={handleInputChange} onKeyDown={handleKeyDown}
        onFocus={() => { if (!disabled) { setIsOpen(true); updateDropdownPosition(); } }}
        placeholder={placeholder}
        disabled={disabled}
        className={`w-full px-2 py-1 text-xs focus:ring-1 focus:ring-purple-500 focus:outline-none border-0 bg-transparent ${disabled ? 'text-gray-400 bg-gray-100 cursor-not-allowed' : ''}`}
        style={{ height: '26px' }} autoComplete="off"
      />
      {!disabled && isOpen && filteredOptions.length > 0 && (
        <div ref={dropdownRef} className="bg-white border border-gray-300 shadow-lg" style={dropdownStyle}>
          {filteredOptions.map((option, index) => (
            <div
              key={option.id}
              className={`px-2 py-1 text-xs cursor-pointer ${index === highlightedIndex ? 'bg-purple-100 text-purple-700' : 'hover:bg-purple-50'} ${option.id === selectedId ? 'bg-purple-50' : ''}`}
              onClick={() => handleSelectOption(option)}
              onMouseEnter={() => setHighlightedIndex(index)}
            >
              {getOptionLabel(option)}
            </div>
          ))}
        </div>
      )}
    </div>
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

const formatNumber = (val) => {
  const num = parseFloat(val);
  if (isNaN(num)) return "";
  return Number.isInteger(num) ? num.toString() : num.toFixed(2);
};

// ==========================================
// RÉSOLVEURS DE LABELS
// ==========================================
const resolveAccountLabel = (id, list) => {
  if (!id || !Array.isArray(list) || list.length === 0) return '';
  const found = list.find(item => String(item?.id) === String(id));
  return found ? `${found.code} - ${found.name}` : '';
};

const resolveTaxGroupLabel = (id, list) => {
  if (!id || !Array.isArray(list) || list.length === 0) return '';
  const found = list.find(item => String(item?.id) === String(id));
  return found ? found.name : '';
};

const resolveFiscalPositionLabel = (id, list) => {
  if (!id || !Array.isArray(list) || list.length === 0) return '';
  const found = list.find(item => String(item?.id) === String(id));
  return found ? found.name : '';
};

const resolveCountryLabel = (id, list) => {
  if (!id || !Array.isArray(list) || list.length === 0) return '';
  const found = list.find(item => String(item?.id) === String(id));
  return found ? `${found.emoji || '🌍'} ${found.nom_fr || found.nom} (${found.code_iso})` : '';
};

// ==========================================
// COMPOSANT LIGNE DE RÉPARTITION
// ==========================================
const RepartitionLineRow = ({
  line, index, accounts, taxGroups, onChange, onRemove,
  isLast, canDelete, onTabAtLastField, isReadOnly
}) => {
  const handleTypeChange = (e) => {
    if (isReadOnly || line.repartition_type === 'base') return;
    const newType = e.target.value;
    onChange('repartition_type', newType);
    if (newType === 'base') onChange('factor_percent', 100);
  };

  const isBase = line.repartition_type === 'base';
  const displayValue = isBase ? 100 : Math.abs(line.factor_percent || 0);
  const disableAccountAndGroup = isReadOnly || isBase;

  return (
    <tr className="hover:bg-gray-50">
      <td className="border border-gray-300 p-1" style={{ width: '130px', minWidth: '130px' }}>
        <select
          value={line.repartition_type}
          onChange={handleTypeChange}
          disabled={isReadOnly || isBase}
          className={`w-full px-1 py-1 border-0 text-xs focus:ring-1 focus:ring-purple-500 focus:outline-none bg-transparent ${(isReadOnly || isBase) ? 'text-gray-500 cursor-not-allowed' : ''}`}
          style={{ height: '26px' }}
        >
          <option value="base">Base</option>
          <option value="tax_main">Taxe</option>
          <option value="tax_split">De la taxe</option>
        </select>
      </td>
      <td className="border border-gray-300 p-1" style={{ width: '70px', minWidth: '70px' }}>
        {isBase ? (
          <div className="w-full px-1 py-1 text-xs text-right font-medium text-green-600 bg-gray-50" style={{ height: '26px', lineHeight: '20px' }}>
            {formatNumber(displayValue)}%
          </div>
        ) : (
          <div className="relative">
            <input
              type="number"
              value={formatNumber(displayValue)}
              onChange={(e) => {
                if (!isReadOnly) onChange('factor_percent', e.target.value === '' ? 0 : Math.abs(parseFloat(e.target.value)));
              }}
              min="0" max="100" step="0.01"
              disabled={isReadOnly}
              className={`w-full px-1 py-1 border-0 text-xs text-right focus:ring-1 focus:ring-purple-500 focus:outline-none appearance-none ${isReadOnly ? 'text-gray-400 bg-gray-50' : 'text-gray-900'}`}
              style={{ height: '26px' }} placeholder="100"
            />
            <span className="absolute right-1 top-1.5 text-xs text-gray-400">%</span>
          </div>
        )}
      </td>
      <td className={`border border-gray-300 p-1 ${isBase ? 'bg-gray-100' : ''}`} style={{ width: '140px', minWidth: '140px' }}>
        <div style={{ height: '26px' }}>
          <AutocompleteInput
            value={isBase ? '' : line.account_label}
            selectedId={isBase ? null : line.account}
            onChange={(text) => { if (!disableAccountAndGroup) onChange('account_label', text); }}
            onSelect={(id, label) => { if (!disableAccountAndGroup) { onChange('account', id); onChange('account_label', label); } }}
            options={accounts}
            getOptionLabel={(a) => `${a.code} - ${a.name}`}
            placeholder={isBase ? "Non applicable" : "Compte"}
            disabled={disableAccountAndGroup}
          />
        </div>
      </td>
      <td className={`border border-gray-300 p-1 ${isBase ? 'bg-gray-100' : ''}`} style={{ width: '110px', minWidth: '110px' }}>
        <div style={{ height: '26px' }}>
          <AutocompleteInput
            value={isBase ? '' : line.tax_group_label}
            selectedId={isBase ? null : line.tax_group}
            onChange={(text) => { if (!disableAccountAndGroup) onChange('tax_group_label', text); }}
            onSelect={(id, label) => { if (!disableAccountAndGroup) { onChange('tax_group', id); onChange('tax_group_label', label); } }}
            options={taxGroups}
            getOptionLabel={(g) => g.name}
            placeholder={isBase ? "Non applicable" : "Groupe"}
            disabled={disableAccountAndGroup}
            onKeyDown={(e) => {
              if (e.key === 'Tab' && !e.shiftKey && isLast && !disableAccountAndGroup) {
                e.preventDefault();
                onTabAtLastField();
              }
            }}
          />
        </div>
      </td>
      <td className="border border-gray-300 p-1" style={{ width: '35px', minWidth: '35px' }}>
        {canDelete && !isReadOnly && !isBase ? (
          <button
            onClick={onRemove}
            className="w-full flex items-center justify-center p-1 text-gray-400 hover:text-red-600 transition-colors"
            style={{ height: '26px' }} title="Supprimer"
          >
            <FiTrash2 size={12} />
          </button>
        ) : (
          <div className="w-full flex items-center justify-center" style={{ height: '26px' }}>
            <FiCheck size={12} className="text-green-500" title="Ligne requise" />
          </div>
        )}
      </td>
    </tr>
  );
};

// ==========================================
// COMPOSANT RÉCAPITULATIF
// ==========================================
const RepartitionSummary = ({ lines, title }) => {
  let baseTotal = 0, taxMainTotal = 0, taxSplitTotal = 0;

  lines.forEach(line => {
    const percent = Math.abs(parseFloat(line.factor_percent) || 0);
    if (line.repartition_type === 'base') baseTotal += percent;
    else if (line.repartition_type === 'tax_main') taxMainTotal += percent;
    else if (line.repartition_type === 'tax_split') taxSplitTotal += percent;
  });

  const isSplitUsed = taxSplitTotal > 0;
  const isBalanced = Math.abs(taxMainTotal - taxSplitTotal) <= 0.01;
  const isValid = !isSplitUsed || isBalanced;
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
      {!isBaseValid && <div className="text-xs text-red-600 font-bold">⚠️ La base doit être 100% ({baseTotal.toFixed(2)}%)</div>}
      {isSplitUsed && !isBalanced && <div className="text-xs text-red-600 font-bold">⚠️ Taxe ({taxMainTotal}%) ≠ De la taxe ({taxSplitTotal}%)</div>}
      {isValid && isBaseValid && <div className="text-xs text-green-600 font-bold">✅ Équilibre parfait</div>}
    </div>
  );
};

// ==========================================
// COMPOSANT PRINCIPAL
// ==========================================
export default function TauxFiscauxShow() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { activeEntity } = useEntity();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [hasChanges, setHasChanges] = useState(false);
  const [showActionsMenu, setShowActionsMenu] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
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
  // ① Flag : bloque la synchronisation auto pendant le chargement initial
  const isInitialLoad = useRef(true);

  const getEntityName = useCallback(() => {
    if (!activeEntity) return 'Non définie';
    return activeEntity.nom || activeEntity.name || activeEntity.raison_sociale || 'Non définie';
  }, [activeEntity]);

  // ==========================================
  // CHARGEMENT DES OPTIONS
  // ==========================================
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

  // ==========================================
  // ② CHARGEMENT DES DONNÉES — listes passées en paramètre
  //    pour résoudre les labels immédiatement avec les bonnes valeurs
  // ==========================================
  const loadTaxData = useCallback(async (accountsList = [], taxGroupsList = [], fiscalPositionsList = [], paysList = []) => {
    // Bloquer la synchronisation auto pendant tout le chargement
    isInitialLoad.current = true;
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
      const refundLines  = allLines.filter(l => l.document_type === 'refund');

      // ③ Labels résolus avec les listes fraîches passées en paramètre
      setFormData({
        name:                                  tax.name || '',
        amount:                                tax.amount || '',
        amount_type:                           tax.amount_type || 'percent',
        type_tax_use:                          tax.type_tax_use || 'sale',
        tax_scope:                             tax.tax_scope || '',
        fiscal_position:                       tax.fiscal_position || '',
        fiscal_position_label:                 resolveFiscalPositionLabel(tax.fiscal_position, fiscalPositionsList),
        country:                               tax.country || '',
        country_label:                         resolveCountryLabel(tax.country, paysList),
        active:                                tax.active !== undefined ? tax.active : true,
        price_include:                         tax.price_include || false,
        include_base_amount:                   tax.include_base_amount || false,
        tax_exigibility:                       tax.tax_exigibility || 'on_invoice',
        account:                               tax.account || '',
        account_label:                         resolveAccountLabel(tax.account, accountsList),
        cash_basis_transition_account:         tax.cash_basis_transition_account || '',
        cash_basis_transition_account_label:   resolveAccountLabel(tax.cash_basis_transition_account, accountsList),
        description:                           tax.description || '',
        tax_group:                             tax.tax_group || '',
        tax_group_label:                       resolveTaxGroupLabel(tax.tax_group, taxGroupsList),
        refund_account:                        tax.refund_account || '',
        refund_account_label:                  resolveAccountLabel(tax.refund_account, accountsList),
        hide_tax_exigibility:                  tax.hide_tax_exigibility || false,
        is_base_affected:                      tax.is_base_affected !== undefined ? tax.is_base_affected : true,
        analytic:                              tax.analytic || false,
        sequence:                              tax.sequence || 10,
        note:                                  tax.note || '',
      });

      // ④ Mapper une ligne en résolvant les labels immédiatement
      const mapLine = (l) => {
        let repartitionType = l.repartition_type;
        if (repartitionType === 'tax')     repartitionType = 'tax_main';
        if (repartitionType === 'delatax') repartitionType = 'tax_split';

        const isBaseLine = repartitionType === 'base';
        const accountId  = isBaseLine ? null : (l.account_id  || l.account  || null);
        const taxGroupId = isBaseLine ? null : (l.tax_group_id || l.tax_group || null);

        return {
          id:              l.id || generateId(),
          repartition_type: repartitionType,
          factor_percent:  Math.abs(parseFloat(l.factor_percent) || 0),
          account:         accountId,
          account_label:   resolveAccountLabel(accountId, accountsList),
          tax_group:       taxGroupId,
          tax_group_label: resolveTaxGroupLabel(taxGroupId, taxGroupsList),
        };
      };

      const defaultLines = () => [
        { id: generateId(), repartition_type: 'base',     factor_percent: 100, account: null, account_label: '', tax_group: null, tax_group_label: '' },
        { id: generateId(), repartition_type: 'tax_main', factor_percent: 100, account: null, account_label: '', tax_group: null, tax_group_label: '' },
      ];

      const ensureBaseLine = (lines) => {
        if (!lines.some(l => l.repartition_type === 'base')) {
          return [
            { id: generateId(), repartition_type: 'base', factor_percent: 100, account: null, account_label: '', tax_group: null, tax_group_label: '' },
            ...lines
          ];
        }
        return lines;
      };

      const mappedInvoice = invoiceLines.length > 0 ? ensureBaseLine(invoiceLines.map(mapLine)) : defaultLines();
      const mappedRefund  = refundLines.length  > 0 ? ensureBaseLine(refundLines.map(mapLine))  : defaultLines();

      setInvoiceRepartitionLines(mappedInvoice);
      setRefundRepartitionLines(mappedRefund);

      setHasChanges(false);
    } catch (err) {
      console.error('❌ Erreur chargement:', err);
      setError('❌ Impossible de charger les données');
    } finally {
      setLoading(false);
      // ⑤ Débloquer la synchronisation APRÈS que React ait appliqué les états
      setTimeout(() => { isInitialLoad.current = false; }, 0);
    }
  }, [id]);

  // ==========================================
  // EFFETS
  // ==========================================

  // Étape 1 : charger les listes de référence
  useEffect(() => {
    if (activeEntity && id) {
      loadOptions();
    }
  }, [activeEntity, id, loadOptions]);

  // ⑥ Étape 2 : charger la taxe une fois les listes disponibles, en les passant directement
  useEffect(() => {
    if (activeEntity && id && accounts.length > 0 && taxGroups.length > 0) {
      loadTaxData(accounts, taxGroups, fiscalPositions, pays);
    }
  }, [activeEntity, id, accounts, taxGroups, fiscalPositions, pays, loadTaxData]);

  // Fermer le menu Actions au clic extérieur
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (actionsMenuRef.current && !actionsMenuRef.current.contains(e.target)) setShowActionsMenu(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // ⑦ Synchronisation Facture → Avoir (bloquée pendant le chargement initial)
  useEffect(() => {
    if (isInitialLoad.current) return;
    setRefundRepartitionLines(prev =>
      prev.map((refundLine, index) => {
        const invoiceLine = invoiceRepartitionLines[index];
        if (!invoiceLine) return refundLine;
        return {
          ...refundLine,
          repartition_type: invoiceLine.repartition_type,
          factor_percent:   invoiceLine.factor_percent,
          account:          invoiceLine.account,
          account_label:    invoiceLine.account_label,
          tax_group:        invoiceLine.tax_group,
          tax_group_label:  invoiceLine.tax_group_label,
        };
      })
    );
  }, [invoiceRepartitionLines]);

  // ==========================================
  // HANDLERS
  // ==========================================
  const markAsModified = () => { if (!hasChanges) setHasChanges(true); };

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    markAsModified();
  };

  const addRepartitionLine = () => {
    const newInvoiceLine = {
      id: generateId(), repartition_type: 'tax_split', factor_percent: 0,
      account: null, account_label: '', tax_group: null, tax_group_label: ''
    };
    const newRefundLine = { ...newInvoiceLine, id: generateId() };

    setInvoiceRepartitionLines(prev => [...prev, newInvoiceLine]);
    setRefundRepartitionLines(prev => [...prev, newRefundLine]);
    markAsModified();

    setTimeout(() => {
      const rows = invoiceTableRef.current?.querySelectorAll('tbody tr');
      if (rows?.length) {
        const firstInput = rows[rows.length - 1]?.querySelector('select, input');
        if (firstInput) firstInput.focus();
      }
    }, 50);
  };

  const removeRepartitionLine = (index) => {
    if (invoiceRepartitionLines[index]?.repartition_type === 'base') return;
    const taxLines = invoiceRepartitionLines.filter(l => l.repartition_type !== 'base');
    if (taxLines.length <= 1) {
      setError('❌ Il doit y avoir au moins une ligne de taxe');
      return;
    }
    setInvoiceRepartitionLines(prev => prev.filter((_, i) => i !== index));
    setRefundRepartitionLines(prev => prev.filter((_, i) => i !== index));
    markAsModified();
  };

  const handleInvoiceLineChange = (index, field, value) => {
    setInvoiceRepartitionLines(prevLines => {
      const newLines = [...prevLines];
      const cur = newLines[index];
      switch (field) {
        case 'account':         newLines[index] = { ...cur, account: cleanId(value) }; break;
        case 'account_label':   newLines[index] = { ...cur, account_label: value }; break;
        case 'tax_group':       newLines[index] = { ...cur, tax_group: cleanId(value) }; break;
        case 'tax_group_label': newLines[index] = { ...cur, tax_group_label: value }; break;
        case 'repartition_type':
          newLines[index] = { ...cur, repartition_type: value };
          if (value === 'base') {
            newLines[index] = {
              ...newLines[index],
              factor_percent: 100,
              account: null,
              account_label: '',
              tax_group: null,
              tax_group_label: '',
            };
          }
          break;
        case 'factor_percent':  newLines[index] = { ...cur, factor_percent: Math.abs(parseFloat(value) || 0) }; break;
        default:                newLines[index] = { ...cur, [field]: value };
      }
      return newLines;
    });
    markAsModified();
  };

  const handleRefundLineChange = (index, field, value) => {
    setRefundRepartitionLines(prevLines => {
      const newLines = [...prevLines];
      const cur = newLines[index];
      switch (field) {
        case 'account':         newLines[index] = { ...cur, account: cleanId(value) }; break;
        case 'account_label':   newLines[index] = { ...cur, account_label: value }; break;
        case 'tax_group':       newLines[index] = { ...cur, tax_group: cleanId(value) }; break;
        case 'tax_group_label': newLines[index] = { ...cur, tax_group_label: value }; break;
        case 'repartition_type':
          newLines[index] = { ...cur, repartition_type: value };
          if (value === 'base') {
            newLines[index] = {
              ...newLines[index],
              factor_percent: 100,
              account: null,
              account_label: '',
              tax_group: null,
              tax_group_label: '',
            };
          }
          break;
        case 'factor_percent':  newLines[index] = { ...cur, factor_percent: Math.abs(parseFloat(value) || 0) }; break;
        default:                newLines[index] = { ...cur, [field]: value };
      }
      return newLines;
    });
    markAsModified();
  };

  // ==========================================
  // VALIDATION
  // ==========================================
  const validateForm = () => {
    const errors = [];

    if (!formData.name.trim()) errors.push('❌ Le nom de la taxe est obligatoire');
    if (!formData.amount || parseFloat(formData.amount) <= 0) errors.push('❌ La valeur de la taxe doit être supérieure à 0');

    const check = (lines, label) => {
      const baseLines     = lines.filter(l => l.repartition_type === 'base');
      const taxMainLines  = lines.filter(l => l.repartition_type === 'tax_main');
      const taxSplitLines = lines.filter(l => l.repartition_type === 'tax_split');

      if (baseLines.length === 0)    errors.push(`❌ ${label} : Au moins une ligne de type 'Base' est requise`);
      if (taxMainLines.length === 0) errors.push(`❌ ${label} : Au moins une ligne de type 'Taxe' est requise`);

      const withoutAccount = lines.filter(l => l.repartition_type !== 'base' && (!l.account || l.account === null));
      if (withoutAccount.length > 0) errors.push(`❌ ${label} : ${withoutAccount.length} ligne(s) sans compte comptable`);

      const baseTotal = baseLines.reduce((s, l) => s + Math.abs(parseFloat(l.factor_percent) || 0), 0);
      if (Math.abs(baseTotal - 100) > 0.01) errors.push(`❌ ${label} : La somme des bases doit être 100% (actuel: ${baseTotal}%)`);

      const taxMainTotal  = taxMainLines.reduce((s, l) => s + Math.abs(parseFloat(l.factor_percent) || 0), 0);
      const taxSplitTotal = taxSplitLines.reduce((s, l) => s + Math.abs(parseFloat(l.factor_percent) || 0), 0);
      if (taxSplitTotal > 0 && Math.abs(taxMainTotal - taxSplitTotal) > 0.01) {
        errors.push(`❌ ${label} : Taxe (${taxMainTotal}%) ≠ De la taxe (${taxSplitTotal}%)`);
      }
    };

    check(invoiceRepartitionLines, 'Facture');
    check(refundRepartitionLines, 'Avoir');

    return errors;
  };

  // ==========================================
  // PRÉPARATION DES DONNÉES
  // ==========================================
  const prepareDataForApi = useCallback(() => {
    if (!activeEntity || !activeEntity.id) throw new Error('Aucune entité sélectionnée');
    const companyId = activeEntity.id;

    const taxData = {
      name: formData.name, amount: parseFloat(formData.amount) || 0,
      amount_type: formData.amount_type, type_tax_use: formData.type_tax_use,
      tax_scope: formData.tax_scope || '', fiscal_position: cleanId(formData.fiscal_position),
      company: companyId, country: cleanId(formData.country),
      active: formData.active, price_include: formData.price_include,
      include_base_amount: formData.include_base_amount, tax_exigibility: formData.tax_exigibility,
      account: cleanId(formData.account),
      cash_basis_transition_account: cleanId(formData.cash_basis_transition_account),
      description: formData.description || '', tax_group: cleanId(formData.tax_group),
      refund_account: cleanId(formData.refund_account),
      hide_tax_exigibility: formData.hide_tax_exigibility, is_base_affected: formData.is_base_affected,
      analytic: formData.analytic, sequence: formData.sequence, note: formData.note || '',
    };

    const mapApiLine = (line, index, docType) => ({
      repartition_type: convertToBackendType(line.repartition_type),
      factor_percent: line.repartition_type === 'base' ? 100 : Math.abs(parseFloat(line.factor_percent) || 0),
      account_id_write: line.repartition_type === 'base' ? null : cleanId(line.account),
      company_id: companyId,
      tax_group_id_write: line.repartition_type === 'base' ? null : cleanId(line.tax_group),
      document_type: docType,
      sequence: (index + 1) * 10,
      use_in_invoice: docType === 'invoice',
      use_in_refund: docType === 'refund',
    });

    const invoiceLines = invoiceRepartitionLines
      .filter(l => l.repartition_type === 'base' || l.account)
      .map((l, i) => mapApiLine(l, i, 'invoice'));

    const refundLines = refundRepartitionLines
      .filter(l => l.repartition_type === 'base' || l.account)
      .map((l, i) => mapApiLine(l, i, 'refund'));

    return { tax: taxData, invoice_lines: invoiceLines, refund_lines: refundLines };
  }, [formData, activeEntity, invoiceRepartitionLines, refundRepartitionLines]);

  // ==========================================
  // SAUVEGARDE
  // ==========================================
  const handleSave = async () => {
    if (!activeEntity) { setError('Vous devez sélectionner une entité'); return false; }

    const errors = validateForm();
    if (errors.length > 0) { setError(errors.join('\n')); return false; }

    setSaving(true);
    setError(null);

    try {
      const apiData = prepareDataForApi();

      const hasValidLine = apiData.invoice_lines.some(l => l.repartition_type !== 'base' && l.account_id_write);
      if (!hasValidLine) { setError('❌ Au moins une ligne de taxe avec un compte est requise'); return false; }

      // 1. Mettre à jour la taxe
      const result = await apiClient.put(`/compta/taxes/${id}/`, apiData.tax);

      if (result?.id) {
        const taxIdValue = result.id;

        // 2. Récupérer les lignes existantes
        const existingLines = await apiClient.get(`/compta/tax-repartition-lines/?tax=${taxIdValue}`)
          .then(res => normalizeData(res)).catch(() => []);

        // 3. Supprimer toutes les lignes existantes
        for (const line of existingLines) {
          if (line?.id) {
            try { await apiClient.delete(`/compta/tax-repartition-lines/${line.id}/`); }
            catch (err) { console.warn('⚠️ Échec suppression ligne', line.id, ':', err?.message); }
          }
        }

        // 4. Créer les nouvelles lignes
        const allLines = [...apiData.invoice_lines, ...apiData.refund_lines];
        await Promise.all(allLines.map(line =>
          apiClient.post('/compta/tax-repartition-lines/', { ...line, tax_id: taxIdValue })
        ));
      }

      setSuccess('Taux fiscal modifié avec succès !');
      setHasChanges(false);

      // Recharger avec les listes actuelles pour avoir les IDs à jour
      await loadTaxData(accounts, taxGroups, fiscalPositions, pays);

      return true;
    } catch (err) {
      console.error('❌ Erreur enregistrement:', err);
      const detail = err?.response?.data?.detail || err?.message || JSON.stringify(err);
      setError(`Erreur : ${detail}`);
      return false;
    } finally {
      setSaving(false);
    }
  };

  // ==========================================
  // AUTRES ACTIONS
  // ==========================================
  const handleCancel = () => {
    if (hasChanges && !window.confirm('Modifications non sauvegardées. Annuler ?')) return;
    loadTaxData(accounts, taxGroups, fiscalPositions, pays);
    setHasChanges(false);
    setError(null);
    setSuccess(null);
  };

  const handleGoToList = () => {
    if (hasChanges && !window.confirm('Modifications non sauvegardées. Quitter ?')) return;
    navigate('/comptabilite/taux-fiscaux');
  };

  const handleNewTax    = () => navigate('/comptabilite/taux-fiscaux/create');
  const handleDuplicate = () => { setSuccess('Duplication à implémenter'); setShowActionsMenu(false); };
  const handleDelete    = () => { setSuccess('Suppression à implémenter'); setShowActionsMenu(false); };
  const handleExtourner = () => { setSuccess('Extourne à implémenter'); setShowActionsMenu(false); };

  // ==========================================
  // RENDU — LOADING
  // ==========================================
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

  const isFormValid = validateForm().length === 0;

  // ==========================================
  // RENDU PRINCIPAL
  // ==========================================
  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-7xl mx-auto bg-white border border-gray-300">

        {/* EN-TÊTE */}
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
                  <span className="text-xs text-gray-600 font-medium">{formData.name ? `Taxe: ${formData.name}` : 'Taux fiscal'}</span>
                  {activeEntity && (
                    <span className="text-xs text-purple-600 bg-purple-50 px-2 py-0.5 rounded flex items-center gap-1">
                      <FiBriefcase size={10} />{getEntityName()}
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
                    <button onClick={handleDelete}    className="w-full px-3 py-2 text-xs text-left hover:bg-gray-50 hover:pl-4 transition-all duration-200 flex items-center gap-2 border-b border-gray-100"><FiTrash2 size={12} /> Supprimer</button>
                    <button onClick={handleExtourner} className="w-full px-3 py-2 text-xs text-left hover:bg-gray-50 hover:pl-4 transition-all duration-200 flex items-center gap-2"><FiRotateCcw size={12} /> Extourné</button>
                  </div>
                )}
              </div>
              <Tooltip text="Enregistrer">
                <button onClick={handleSave} disabled={saving || !isFormValid}
                  className={`w-8 h-8 rounded-full text-white transition-all duration-200 flex items-center justify-center shadow-sm ${isFormValid && !saving ? 'bg-purple-600 hover:bg-purple-700 hover:scale-110' : 'bg-gray-300 cursor-not-allowed'}`}>
                  <FiUploadCloud size={16} />
                </button>
              </Tooltip>
              <Tooltip text="Annuler les modifications">
                <button onClick={handleCancel} className="w-8 h-8 rounded-full bg-black text-white hover:bg-gray-800 hover:scale-110 hover:shadow-lg active:scale-90 transition-all duration-200 flex items-center justify-center">
                  <FiX size={16} />
                </button>
              </Tooltip>
            </div>
          </div>
        </div>

        {hasChanges && (
          <div className="px-4 py-1 bg-blue-50 text-blue-700 text-xs border-b border-blue-200">
            Modifications non sauvegardées
          </div>
        )}

        {(error || success) && (
          <div className={`px-4 py-3 text-sm border-b border-gray-300 ${error ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'}`}>
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
                  <input type="text" value={formData.name} onChange={(e) => handleChange('name', e.target.value)}
                    className="w-full pl-7 pr-2 py-1 border border-gray-300 text-xs hover:border-purple-400 focus:border-purple-600 transition-colors"
                    style={{ height: '26px' }} placeholder="TVA 18%" />
                </div>
              </div>
              <div className="flex items-center" style={{ height: '26px' }}>
                <label className="text-xs text-gray-700 min-w-[140px] font-medium">Valeur de la taxe *</label>
                <div className="flex-1 ml-2 relative">
                  <FiPercent className="absolute left-2 top-1.5 text-gray-400" size={12} />
                  <input type="number" min="0" step="0.01"
                    value={isNaN(parseFloat(formData.amount)) ? '' : (Number.isInteger(parseFloat(formData.amount)) ? parseFloat(formData.amount) : parseFloat(formData.amount).toFixed(2))}
                    onChange={(e) => handleChange('amount', e.target.value)}
                    className="w-full pl-7 pr-2 py-1 border border-gray-300 text-xs hover:border-purple-400 focus:border-purple-600 transition-colors"
                    style={{ height: '26px' }} placeholder="18" />
                </div>
              </div>
              <div className="flex items-center" style={{ height: '26px' }}>
                <label className="text-xs text-gray-700 min-w-[140px] font-medium">Type de valeur *</label>
                <div className="flex-1 ml-2 relative">
                  <FiDollarSign className="absolute left-2 top-1.5 text-gray-400" size={12} />
                  <select value={formData.amount_type} onChange={(e) => handleChange('amount_type', e.target.value)}
                    className="w-full pl-7 pr-2 py-1 border border-gray-300 text-xs hover:border-purple-400 focus:border-purple-600 transition-colors appearance-none"
                    style={{ height: '26px' }}>
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
                  <select value={formData.type_tax_use} onChange={(e) => handleChange('type_tax_use', e.target.value)}
                    className="w-full px-2 py-1 border border-gray-300 text-xs hover:border-purple-400 focus:border-purple-600 transition-colors appearance-none"
                    style={{ height: '26px' }}>
                    <option value="sale">Ventes</option>
                    <option value="purchase">Achats</option>
                    <option value="none">Aucun</option>
                  </select>
                </div>
              </div>
              <div className="flex items-center" style={{ height: '26px' }}>
                <label className="text-xs text-gray-700 min-w-[140px] font-medium">Portée de la taxe</label>
                <div className="flex-1 ml-2">
                  <select value={formData.tax_scope} onChange={(e) => handleChange('tax_scope', e.target.value)}
                    className="w-full px-2 py-1 border border-gray-300 text-xs hover:border-purple-400 focus:border-purple-600 transition-colors appearance-none"
                    style={{ height: '26px' }}>
                    <option value="">Tous</option>
                    <option value="service">Services</option>
                    <option value="consu">Biens consommables</option>
                  </select>
                </div>
              </div>
              <div className="flex items-center" style={{ height: '26px' }}>
                <label className="text-xs text-gray-700 min-w-[140px] font-medium">Position fiscale</label>
                <div className="flex-1 ml-2 border border-gray-300 hover:border-purple-400 transition-colors" style={{ height: '26px' }}>
                  <AutocompleteInput
                    value={formData.fiscal_position_label} selectedId={formData.fiscal_position}
                    onChange={(text) => handleChange('fiscal_position_label', text)}
                    onSelect={(id, label) => { handleChange('fiscal_position', id); handleChange('fiscal_position_label', label); markAsModified(); }}
                    options={fiscalPositions} getOptionLabel={(f) => f.name} placeholder="Ex: Nationale..."
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ONGLETS */}
        <div className="border-b border-gray-300">
          <div className="px-4 flex">
            {[
              { key: 'comptable', icon: <FiLayers size={12} />, label: 'Paramètres comptables' },
              { key: 'avance',    icon: <FiSettings size={12} />, label: 'Paramètres avancés' },
              { key: 'notes',     icon: <FiFileText size={12} />, label: 'Notes' },
            ].map(tab => (
              <button key={tab.key} onClick={() => setActiveTab(tab.key)}
                className={`px-4 py-2 text-xs font-medium border-b-2 transition-all duration-200 flex items-center gap-1 ${activeTab === tab.key ? 'border-purple-600 text-purple-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
                {tab.icon}<span>{tab.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* CONTENU ONGLETS */}
        <div className="p-4">

          {/* ——— ONGLET COMPTABLE ——— */}
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
                    <AutocompleteInput
                      value={formData.account_label} selectedId={formData.account}
                      onChange={(text) => handleChange('account_label', text)}
                      onSelect={(id, label) => { handleChange('account', id); handleChange('account_label', label); markAsModified(); }}
                      options={accounts} getOptionLabel={(a) => `${a.code} - ${a.name}`}
                      placeholder="Sélectionner un compte (optionnel)"
                    />
                  </div>
                </div>
              </div>

              <div className="border border-gray-300">
                <div className="flex">
                  {/* FACTURE */}
                  <div className="w-1/2 border-r border-gray-300">
                    <div className="bg-gray-50 px-3 py-2 border-b border-gray-300">
                      <div className="text-sm font-semibold text-gray-800">Répartition sur une facture</div>
                      <div className="text-xs text-green-600 mt-0.5">Équilibre requis : Taxe = De la taxe</div>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full border-collapse" ref={invoiceTableRef}>
                        <thead>
                          <tr className="bg-gray-100 text-xs">
                            <th className="border border-gray-300 px-2 py-1.5 font-medium text-gray-700 text-left" style={{ width: '130px' }}>Type</th>
                            <th className="border border-gray-300 px-2 py-1.5 font-medium text-gray-700 text-left" style={{ width: '70px' }}>%</th>
                            <th className="border border-gray-300 px-2 py-1.5 font-medium text-gray-700 text-left" style={{ width: '140px' }}>Compte</th>
                            <th className="border border-gray-300 px-2 py-1.5 font-medium text-gray-700 text-left" style={{ width: '110px' }}>Groupe</th>
                            <th className="border border-gray-300 px-2 py-1.5 font-medium text-gray-700 text-center" style={{ width: '35px' }}></th>
                          </tr>
                        </thead>
                        <tbody>
                          {invoiceRepartitionLines.map((line, index) => (
                            <RepartitionLineRow
                              key={line.id} line={line} index={index}
                              accounts={accounts} taxGroups={taxGroups}
                              onChange={(field, value) => handleInvoiceLineChange(index, field, value)}
                              onRemove={() => removeRepartitionLine(index)}
                              isLast={index === invoiceRepartitionLines.length - 1}
                              canDelete={true}
                              onTabAtLastField={addRepartitionLine}
                              isReadOnly={false}
                            />
                          ))}
                        </tbody>
                      </table>
                    </div>
                    <div className="px-2 pb-2"><RepartitionSummary lines={invoiceRepartitionLines} title="Facture" /></div>
                  </div>

                  {/* AVOIR */}
                  <div className="w-1/2">
                    <div className="bg-gray-50 px-3 py-2 border-b border-gray-300">
                      <div className="text-sm font-semibold text-gray-800">Répartition sur un avoir</div>
                      <div className="text-xs text-green-600 mt-0.5">Équilibre requis : Taxe = De la taxe</div>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full border-collapse">
                        <thead>
                          <tr className="bg-gray-100 text-xs">
                            <th className="border border-gray-300 px-2 py-1.5 font-medium text-gray-700 text-left" style={{ width: '130px' }}>Type</th>
                            <th className="border border-gray-300 px-2 py-1.5 font-medium text-gray-700 text-left" style={{ width: '70px' }}>%</th>
                            <th className="border border-gray-300 px-2 py-1.5 font-medium text-gray-700 text-left" style={{ width: '140px' }}>Compte</th>
                            <th className="border border-gray-300 px-2 py-1.5 font-medium text-gray-700 text-left" style={{ width: '110px' }}>Groupe</th>
                            <th className="border border-gray-300 px-2 py-1.5 font-medium text-gray-700 text-center" style={{ width: '35px' }}></th>
                          </tr>
                        </thead>
                        <tbody>
                          {refundRepartitionLines.map((line, index) => (
                            <RepartitionLineRow
                              key={line.id} line={line} index={index}
                              accounts={accounts} taxGroups={taxGroups}
                              onChange={(field, value) => handleRefundLineChange(index, field, value)}
                              onRemove={() => removeRepartitionLine(index)}
                              isLast={index === refundRepartitionLines.length - 1}
                              canDelete={true}
                              onTabAtLastField={addRepartitionLine}
                              isReadOnly={false}
                            />
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

          {/* ——— ONGLET AVANCÉ ——— */}
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
                      <AutocompleteInput
                        value={formData.country_label} selectedId={formData.country}
                        onChange={(text) => handleChange('country_label', text)}
                        onSelect={(id, label) => { handleChange('country', id); handleChange('country_label', label); markAsModified(); }}
                        options={pays} getOptionLabel={(p) => `${p.emoji || '🌍'} ${p.nom_fr || p.nom} (${p.code_iso})`} placeholder="Pays"
                      />
                    </div>
                  </div>
                  {[
                    { label: 'Actif',             field: 'active' },
                    { label: 'Inclus dans le prix', field: 'price_include' },
                    { label: 'Impacter la base',   field: 'include_base_amount' },
                  ].map(({ label, field }) => (
                    <div key={field} className="flex items-center" style={{ height: '26px' }}>
                      <label className="text-xs text-gray-700 w-[160px] font-medium">{label}</label>
                      <div className="flex-1 ml-2">
                        <input type="checkbox" checked={formData[field]} onChange={(e) => handleChange(field, e.target.checked)} className="w-4 h-4 text-purple-600 focus:ring-purple-500" />
                      </div>
                    </div>
                  ))}
                  <div className="flex items-center" style={{ height: '26px' }}>
                    <label className="text-xs text-gray-700 w-[160px] font-medium">Exigibilité</label>
                    <div className="flex-1 ml-2">
                      <select value={formData.tax_exigibility} onChange={(e) => handleChange('tax_exigibility', e.target.value)}
                        className="w-full px-2 py-1 border border-gray-300 text-xs hover:border-purple-400 focus:border-purple-600 transition-colors appearance-none truncate" style={{ height: '26px' }}>
                        <option value="on_invoice">Facturation</option>
                        <option value="on_payment">Paiement</option>
                      </select>
                    </div>
                  </div>
                  <div className="flex items-center" style={{ height: '26px' }}>
                    <label className="text-xs text-gray-700 w-[160px] font-medium">Compte paiement</label>
                    <div className="flex-1 ml-2 border border-gray-300 hover:border-purple-400 transition-colors" style={{ height: '26px' }}>
                      <AutocompleteInput
                        value={formData.cash_basis_transition_account_label} selectedId={formData.cash_basis_transition_account}
                        onChange={(text) => handleChange('cash_basis_transition_account_label', text)}
                        onSelect={(id, label) => { handleChange('cash_basis_transition_account', id); handleChange('cash_basis_transition_account_label', label); markAsModified(); }}
                        options={accounts} getOptionLabel={(a) => `${a.code} - ${a.name}`} placeholder="Transition"
                      />
                    </div>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center" style={{ height: '26px' }}>
                    <label className="text-xs text-gray-700 w-[160px] font-medium">Description</label>
                    <div className="flex-1 ml-2">
                      <input type="text" value={formData.description} onChange={(e) => handleChange('description', e.target.value)}
                        className="w-full px-2 py-1 border border-gray-300 text-xs hover:border-purple-400 focus:border-purple-600 transition-colors truncate"
                        style={{ height: '26px' }} placeholder="Description" />
                    </div>
                  </div>
                  <div className="flex items-center" style={{ height: '26px' }}>
                    <label className="text-xs text-gray-700 w-[160px] font-medium">Groupe taxes</label>
                    <div className="flex-1 ml-2 border border-gray-300 hover:border-purple-400 transition-colors" style={{ height: '26px' }}>
                      <AutocompleteInput
                        value={formData.tax_group_label} selectedId={formData.tax_group}
                        onChange={(text) => handleChange('tax_group_label', text)}
                        onSelect={(id, label) => { handleChange('tax_group', id); handleChange('tax_group_label', label); markAsModified(); }}
                        options={taxGroups} getOptionLabel={(g) => g.name} placeholder="Groupe"
                      />
                    </div>
                  </div>
                  <div className="flex items-center" style={{ height: '26px' }}>
                    <label className="text-xs text-gray-700 w-[160px] font-medium">Compte remboursement</label>
                    <div className="flex-1 ml-2 border border-gray-300 hover:border-purple-400 transition-colors" style={{ height: '26px' }}>
                      <AutocompleteInput
                        value={formData.refund_account_label} selectedId={formData.refund_account}
                        onChange={(text) => handleChange('refund_account_label', text)}
                        onSelect={(id, label) => { handleChange('refund_account', id); handleChange('refund_account_label', label); markAsModified(); }}
                        options={accounts} getOptionLabel={(a) => `${a.code} - ${a.name}`} placeholder="Remboursement"
                      />
                    </div>
                  </div>
                  {[
                    { label: 'Masquer caisse', field: 'hide_tax_exigibility' },
                    { label: 'Base affectée',  field: 'is_base_affected' },
                    { label: 'Analytique',     field: 'analytic' },
                  ].map(({ label, field }) => (
                    <div key={field} className="flex items-center" style={{ height: '26px' }}>
                      <label className="text-xs text-gray-700 w-[160px] font-medium">{label}</label>
                      <div className="flex-1 ml-2">
                        <input type="checkbox" checked={formData[field]} onChange={(e) => handleChange(field, e.target.checked)} className="w-4 h-4 text-purple-600 focus:ring-purple-500" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ——— ONGLET NOTES ——— */}
          {activeTab === 'notes' && (
            <div className="border border-gray-300">
              <textarea
                value={formData.note} onChange={(e) => handleChange('note', e.target.value)}
                rows={6} className="w-full px-3 py-2 border-0 text-xs focus:ring-2 focus:ring-purple-500"
                placeholder="Ajouter des notes complémentaires..."
              />
            </div>
          )}
        </div>
      </div>

      {/* DIALOGUE DE CONFIRMATION */}
      {showConfirmDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-sm shadow-lg max-w-md w-full mx-4">
            <h3 className="text-lg font-bold text-gray-900 mb-3">Modifications non sauvegardées</h3>
            <p className="text-sm text-gray-600 mb-6">Voulez-vous enregistrer les modifications avant de quitter ?</p>
            <div className="flex justify-end gap-3">
              <button onClick={async () => { setShowConfirmDialog(false); const saved = await handleSave(); if (saved) navigate('/comptabilite/taux-fiscaux'); }}
                className="px-4 py-2 bg-purple-600 text-white text-sm hover:bg-purple-700 transition-all duration-200">Enregistrer</button>
              <button onClick={() => { handleCancel(); navigate('/comptabilite/taux-fiscaux'); }}
                className="px-4 py-2 bg-red-600 text-white text-sm hover:bg-red-700 transition-all duration-200">Ne pas enregistrer</button>
              <button onClick={() => setShowConfirmDialog(false)}
                className="px-4 py-2 border border-gray-300 text-gray-700 text-sm hover:bg-gray-50 transition-all duration-200">Annuler</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
